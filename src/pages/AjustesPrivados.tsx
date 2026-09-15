import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { store } from '../lib/store';
import { db } from '../lib/firebase';
import { doc, setDoc, deleteField } from 'firebase/firestore';
import type { RegistroAuditoria, Configuracion } from '../lib/types';
import { cifrarClave } from '../lib/claves';
import { CampoClave, hace } from '../components/UI';
import {
  IconoAjustes,
  IconoAtras,
  IconoCheck,
  IconoEscudo,
  IconoWhatsApp,
} from '../components/Iconos';
import { GeneradorIconosPWA } from '../components/GeneradorIconosPWA';
import type { Vista } from '../App';

export default function AjustesPrivados({
  ir,
  avisar,
}: {
  ir: (v: Vista, id?: string) => void;
  avisar: (m: string) => void;
}) {
  const { usuario, esApostol, config } = useAuth();
  const [nuevaClaveLideres, setNuevaClaveLideres] = useState('');
  const [repetirClaveLideres, setRepetirClaveLideres] = useState('');
  const [nuevaClaveApostol, setNuevaClaveApostol] = useState('');
  const [repetirClaveApostol, setRepetirClaveApostol] = useState('');
  const [nombreIglesia, setNombreIglesia] = useState(
    config?.nombreIglesia || 'Centro de Alabanza Oasis',
  );

  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [auditorias, setAuditorias] = useState<RegistroAuditoria[]>([]);

  useEffect(() => {
    if (config?.nombreIglesia) {
      setNombreIglesia(config.nombreIglesia);
    }
  }, [config]);

  useEffect(() => {
    const cancel = store.observarAuditoria(setAuditorias);
    return () => cancel();
  }, []);

  async function guardarClaves(e: React.FormEvent) {
    e.preventDefault();

    const quiereCambiarLideres =
      nuevaClaveLideres.length > 0 || repetirClaveLideres.length > 0;
    const quiereCambiarApostol =
      nuevaClaveApostol.length > 0 || repetirClaveApostol.length > 0;

    if (quiereCambiarLideres && nuevaClaveLideres !== repetirClaveLideres) {
      avisar('Las contraseñas de Líderes no coinciden.');
      return;
    }

    if (quiereCambiarApostol && nuevaClaveApostol !== repetirClaveApostol) {
      avisar('Las contraseñas del Apóstol no coinciden.');
      return;
    }

    setGuardandoConfig(true);
    try {
      const cambiosStore: Partial<Configuracion> = {
        nombreIglesia: nombreIglesia.trim(),
      };
      const cambiosFirestore: Record<string, any> = {
        nombreIglesia: nombreIglesia.trim(),
      };

      if (quiereCambiarLideres) {
        const hash = await cifrarClave(nuevaClaveLideres);
        cambiosStore.hashLideres = hash;
        delete (cambiosStore as any).claveLideres;
        cambiosFirestore.hashLideres = hash;
        cambiosFirestore.claveLideres = deleteField();
      }

      if (quiereCambiarApostol) {
        const hash = await cifrarClave(nuevaClaveApostol);
        cambiosStore.hashApostol = hash;
        delete (cambiosStore as any).claveApostol;
        cambiosFirestore.hashApostol = hash;
        cambiosFirestore.claveApostol = deleteField();
      }

      if (db) {
        try {
          await setDoc(doc(db, 'configuracion', 'acceso'), cambiosFirestore, {
            merge: true,
          });
        } catch (err) {
          console.warn('Error al guardar configuración en Firestore:', err);
        }
      }

      await store.guardarConfiguracion(cambiosStore);

      try {
        const clavesLocalStorage = [
          'oasis-datos-demo',
          'oasis-seguimiento-demo-v1',
        ];
        for (const k of clavesLocalStorage) {
          const crudo = localStorage.getItem(k);
          if (crudo) {
            const d = JSON.parse(crudo);
            if (d?.configuracion) {
              d.configuracion.nombreIglesia = nombreIglesia.trim();
              if (cambiosStore.hashLideres) {
                d.configuracion.hashLideres = cambiosStore.hashLideres;
                delete d.configuracion.claveLideres;
              }
              if (cambiosStore.hashApostol) {
                d.configuracion.hashApostol = cambiosStore.hashApostol;
                delete d.configuracion.claveApostol;
              }
              localStorage.setItem(k, JSON.stringify(d));
            }
          }
        }
      } catch {
        /* sin almacenamiento */
      }

      if (usuario) {
        await store.registrarAuditoria({
          uid: usuario.id,
          nombre: usuario.nombre,
          accion: 'actualizó configuración y contraseñas',
          objetivo: 'Configuración general',
          fecha: new Date().toISOString(),
        });
      }

      setNuevaClaveLideres('');
      setRepetirClaveLideres('');
      setNuevaClaveApostol('');
      setRepetirClaveApostol('');

      avisar('Configuración y contraseñas guardadas con éxito.');
    } catch (err: any) {
      avisar(`Error al guardar: ${err?.message ?? 'error'}`);
    } finally {
      setGuardandoConfig(false);
    }
  }

  return (
    <div style={{ paddingBottom: 30 }}>
      <div className="fila-entre" style={{ marginBottom: 10 }}>
        <button className="btn fantasma chico" onClick={() => ir('panel')}>
          <IconoAtras /> Volver al panel
        </button>
      </div>

      <h1 style={{ marginBottom: 4 }}>Ajustes Privados del Apóstol</h1>
      <p className="texto-medio" style={{ marginBottom: 18 }}>
        Administración de accesos, seguridad de la congregación y registro de auditoría.
      </p>

      {/* Tarjeta de contraseñas */}
      <div className="tarjeta" style={{ marginBottom: 20 }}>
        <div className="fila" style={{ gap: 8, marginBottom: 12 }}>
          <IconoEscudo size={20} className="texto-alerta" />
          <h2 style={{ fontSize: '1.15rem', margin: 0 }}>Contraseñas de acceso rápido</h2>
        </div>

        <form onSubmit={guardarClaves}>
          <div className="campo">
            <label className="etiqueta">Nombre de la iglesia o congregación</label>
            <input
              type="text"
              value={nombreIglesia}
              onChange={(e) => setNombreIglesia(e.target.value)}
              placeholder="Centro de Alabanza Oasis"
            />
          </div>

          <p
            style={{
              margin: '0 0 16px',
              fontSize: '0.88rem',
              color: 'var(--tinta-2, #64748b)',
              lineHeight: 1.4,
            }}
          >
            Los campos vacíos significan que esa contraseña se queda como está. Solo se cambia lo que se escriba.
          </p>

          <CampoClave
            etiqueta="Contraseña para Líderes"
            valor={nuevaClaveLideres}
            onChange={setNuevaClaveLideres}
            placeholder="Escribe la nueva contraseña"
            ayuda="Los líderes ingresan con su nombre y esta contraseña compartida."
          />

          <CampoClave
            etiqueta="Repite la nueva contraseña"
            valor={repetirClaveLideres}
            onChange={setRepetirClaveLideres}
            placeholder="Repite la nueva contraseña"
          />

          <CampoClave
            etiqueta="Contraseña privada del Apóstol"
            valor={nuevaClaveApostol}
            onChange={setNuevaClaveApostol}
            placeholder="Escribe la nueva contraseña"
            ayuda="Tu contraseña maestra para acceder a métricas, líderes y ajustes."
          />

          <CampoClave
            etiqueta="Repite la nueva contraseña"
            valor={repetirClaveApostol}
            onChange={setRepetirClaveApostol}
            placeholder="Repite la nueva contraseña"
          />

          <button
            type="submit"
            className="btn ancho"
            style={{ marginTop: 8 }}
            disabled={guardandoConfig}
          >
            <IconoCheck /> {guardandoConfig ? 'Guardando…' : 'Guardar contraseñas'}
          </button>
        </form>
      </div>

      {/* Enlaces de administración */}
      <div className="tarjeta" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.1rem', margin: '0 0 10px' }}>Integraciones y Datos</h2>
        <div className="pila" style={{ gap: 8 }}>
          <button
            type="button"
            className="btn secundario ancho"
            onClick={() => ir('whatsapp')}
          >
            <IconoWhatsApp /> Ver estado y pruebas de WhatsApp
          </button>
        </div>

        {/* Bloque de datos ficticios de prueba visible solo para el Apóstol */}
        {esApostol && (
          <div
            style={{
              marginTop: 16,
              padding: '14px 16px',
              backgroundColor: '#fff7ed',
              border: '1.5px solid #f97316',
              borderRadius: 10,
            }}
          >
            <h3
              style={{
                fontSize: '0.92rem',
                fontWeight: 700,
                color: '#9a3412',
                margin: '0 0 8px',
                letterSpacing: '0.02em',
              }}
            >
              DATOS FICTICIOS DE PRUEBA — NO TOCAR
            </h3>

            <p
              style={{
                fontSize: '0.86rem',
                color: '#7c2d12',
                margin: '0 0 14px',
                lineHeight: 1.45,
              }}
            >
              Estos datos son inventados y sirven para probar el funcionamiento de la app. No corresponden a ninguna persona real de la congregación.
            </p>

            <button
              type="button"
              className="btn ancho"
              style={{
                backgroundColor: '#ea580c',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
              }}
              onClick={() => {}}
            >
              Colocar datos de prueba
            </button>
          </div>
        )}
      </div>

      {/* Descarga de App e Iconos PWA */}
      <GeneradorIconosPWA />

      {/* Registro de Auditoría */}
      <div className="seccion">
        <div className="rotulo">Registro de auditoría ({auditorias.length})</div>
        <p className="texto-chico" style={{ marginTop: -4, marginBottom: 10 }}>
          Historial inmutable de acciones realizadas por el equipo.
        </p>

        {auditorias.length === 0 ? (
          <p className="texto-chico">No hay registros de auditoría todavía.</p>
        ) : (
          <div className="pila">
            {auditorias.slice(0, 15).map((a) => (
              <div key={a.id} className="tarjeta" style={{ padding: '8px 12px' }}>
                <div className="fila-entre">
                  <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                    {a.nombre} &bull; <span style={{ color: 'var(--azul-profundo)' }}>{a.accion}</span>
                  </span>
                  <span className="texto-chico">{hace(a.fecha)}</span>
                </div>
                <div className="texto-chico" style={{ marginTop: 2 }}>
                  <b>Objetivo:</b> {a.objetivo}
                  {a.detalle && ` — ${a.detalle}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
