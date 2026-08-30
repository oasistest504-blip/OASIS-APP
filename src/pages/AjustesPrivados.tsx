import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDatos } from '../context/DatosContext';
import { store, MODO_DEMO } from '../lib/store';
import type { RegistroAuditoria } from '../lib/types';
import { Aviso, CampoClave, Cargando, hace } from '../components/UI';
import {
  IconoAjustes,
  IconoAtras,
  IconoCheck,
  IconoEscudo,
  IconoWhatsApp,
} from '../components/Iconos';
import type { Vista } from '../App';

export default function AjustesPrivados({
  ir,
  avisar,
}: {
  ir: (v: Vista, id?: string) => void;
  avisar: (m: string) => void;
}) {
  const { usuario, esApostol, config } = useAuth();
  const [claveLideres, setClaveLideres] = useState(config?.claveLideres || 'oasis');
  const [claveApostol, setClaveApostol] = useState(config?.claveApostol || 'apostol');
  const [nombreIglesia, setNombreIglesia] = useState(
    config?.nombreIglesia || 'Centro de Alabanza Oasis',
  );

  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [sembrando, setSembrando] = useState(false);
  const [auditorias, setAuditorias] = useState<RegistroAuditoria[]>([]);

  useEffect(() => {
    if (config) {
      setClaveLideres(config.claveLideres || 'oasis');
      setClaveApostol(config.claveApostol || 'apostol');
      setNombreIglesia(config.nombreIglesia || 'Centro de Alabanza Oasis');
    }
  }, [config]);

  useEffect(() => {
    const cancel = store.observarAuditoria(setAuditorias);
    return () => cancel();
  }, []);

  async function guardarClaves(e: React.FormEvent) {
    e.preventDefault();
    if (!claveLideres.trim() || !claveApostol.trim()) {
      avisar('Las contraseñas no pueden estar vacías.');
      return;
    }

    setGuardandoConfig(true);
    try {
      await store.guardarConfiguracion({
        claveLideres: claveLideres.trim(),
        claveApostol: claveApostol.trim(),
        nombreIglesia: nombreIglesia.trim(),
      });

      if (usuario) {
        await store.registrarAuditoria({
          uid: usuario.id,
          nombre: usuario.nombre,
          accion: 'actualizó configuración y contraseñas',
          objetivo: 'Configuración general',
          fecha: new Date().toISOString(),
        });
      }

      avisar('Configuración y contraseñas guardadas con éxito.');
    } catch (err: any) {
      avisar(`Error al guardar: ${err?.message ?? 'error'}`);
    } finally {
      setGuardandoConfig(false);
    }
  }

  async function sembrarDatos() {
    setSembrando(true);
    try {
      await store.sembrarDatosEjemplo();
      avisar('Líderes y datos de ejemplo restaurados con éxito.');
    } catch (err: any) {
      avisar(`Error: ${err?.message ?? 'error'}`);
    } finally {
      setSembrando(false);
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

          <CampoClave
            etiqueta="Contraseña para Líderes"
            valor={claveLideres}
            onChange={setClaveLideres}
            ayuda="Los líderes ingresan con su nombre y esta contraseña compartida."
          />

          <CampoClave
            etiqueta="Contraseña privada del Apóstol"
            valor={claveApostol}
            onChange={setClaveApostol}
            ayuda="Tu contraseña maestra para acceder a métricas, líderes y ajustes."
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

          <button
            type="button"
            className="btn fantasma ancho"
            onClick={sembrarDatos}
            disabled={sembrando}
          >
            {sembrando ? 'Restaurando…' : 'Restaurar datos de prueba / demo'}
          </button>
        </div>
      </div>

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
