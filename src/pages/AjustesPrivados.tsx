import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDatos } from '../context/DatosContext';
import { store, MODO_DEMO } from '../lib/store';
import { db } from '../lib/firebase';
import { collection, doc, deleteDoc, getDocs, addDoc } from 'firebase/firestore';
import type { RegistroAuditoria } from '../lib/types';
import {
  USUARIOS_PRUEBA,
  PERSONAS_PRUEBA,
  TAREAS_PRUEBA,
  INTERACCIONES_PRUEBA,
} from '../lib/datosPrueba';
import { Aviso, CampoClave, Cargando, hace, Modal } from '../components/UI';
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
  const [claveLideres, setClaveLideres] = useState(config?.claveLideres || 'oasis');
  const [claveApostol, setClaveApostol] = useState(config?.claveApostol || 'apostol');
  const [nombreIglesia, setNombreIglesia] = useState(
    config?.nombreIglesia || 'Centro de Alabanza Oasis',
  );

  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [sembrando, setSembrando] = useState(false);
  const [cargandoPrueba, setCargandoPrueba] = useState(false);
  const [borrandoPrueba, setBorrandoPrueba] = useState(false);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
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

  async function cargarDatosPrueba() {
    setCargandoPrueba(true);
    try {
      let uCreados = 0;
      let pCreadas = 0;
      let tCreadas = 0;
      let iCreadas = 0;

      const mapaUsuarios: Record<string, string> = {};
      const mapaPersonas: Record<string, string> = {};

      // 1. Guardar líderes y apóstol
      for (const u of USUARIOS_PRUEBA) {
        const { id, ...restoUsuario } = u;
        const nuevoId = await store.crearUsuario({
          ...restoUsuario,
          esPrueba: true,
        });
        mapaUsuarios[id] = nuevoId;
        uCreados++;
      }

      // 2. Guardar personas
      for (const p of PERSONAS_PRUEBA) {
        const { id, ...restoPersona } = p;
        const liderIdReal = restoPersona.liderAsignadoId
          ? (mapaUsuarios[restoPersona.liderAsignadoId] || restoPersona.liderAsignadoId)
          : null;
        const nuevoId = await store.crearPersona({
          ...restoPersona,
          liderAsignadoId: liderIdReal,
          creadoPorUid: liderIdReal || (usuario?.id ?? 'sistema'),
          esPrueba: true,
        });
        mapaPersonas[id] = nuevoId;
        pCreadas++;
      }

      // 3. Guardar tareas
      for (const t of TAREAS_PRUEBA) {
        const { id, ...restoTarea } = t;
        const personaIdReal = mapaPersonas[restoTarea.personaId] || restoTarea.personaId;
        const liderIdReal = restoTarea.liderId
          ? (mapaUsuarios[restoTarea.liderId] || restoTarea.liderId)
          : restoTarea.liderId;
        await store.crearTarea({
          ...restoTarea,
          personaId: personaIdReal,
          liderId: liderIdReal,
          esPrueba: true,
        });
        tCreadas++;
      }

      // 4. Guardar interacciones
      for (const i of INTERACCIONES_PRUEBA) {
        const { id, ...restoInteraccion } = i;
        const personaIdReal = mapaPersonas[restoInteraccion.personaId] || restoInteraccion.personaId;
        const interaccionFinal = {
          ...restoInteraccion,
          personaId: personaIdReal,
          esPrueba: true,
        };

        if (store.modoDemo) {
          await store.agregarInteraccionLocal(interaccionFinal);
        } else if (db) {
          const limpia: Record<string, any> = {};
          for (const [k, v] of Object.entries(interaccionFinal)) {
            if (v !== undefined) limpia[k] = v;
          }
          await addDoc(collection(db, 'interacciones'), limpia);
        }
        iCreadas++;
      }

      const total = uCreados + pCreadas + tCreadas + iCreadas;
      if (usuario) {
        await store.registrarAuditoria({
          uid: usuario.id,
          nombre: usuario.nombre,
          accion: 'cargó datos de prueba',
          objetivo: 'Datos de prueba',
          detalle: `Se crearon ${total} registros ficticios (${uCreados} líderes, ${pCreadas} personas, ${tCreadas} tareas y ${iCreadas} interacciones).`,
          fecha: new Date().toISOString(),
        });
      }

      avisar(
        `Se crearon exitosamente ${total} registros de prueba (${uCreados} líderes, ${pCreadas} personas, ${tCreadas} tareas y ${iCreadas} interacciones).`,
      );
    } catch (err: any) {
      avisar(`Error al cargar datos de prueba: ${err?.message ?? 'error'}`);
    } finally {
      setCargandoPrueba(false);
    }
  }

  async function borrarDatosPrueba() {
    setBorrandoPrueba(true);
    try {
      let borradosTotal = 0;

      // 1. Borrar en Firestore si está conectado
      if (!store.modoDemo && db) {
        const colecciones = ['tareas', 'personas', 'usuarios', 'interacciones'];
        for (const col of colecciones) {
          try {
            const snap = await getDocs(collection(db, col));
            for (const d of snap.docs) {
              const data = d.data();
              if (data.esPrueba === true) {
                await deleteDoc(d.ref);
                borradosTotal++;
              }
            }
          } catch (colErr) {
            console.warn(`Error al borrar en colección ${col}:`, colErr);
          }
        }
      }

      // 2. Borrar en almacenamiento local para modo demo
      try {
        const crudo = localStorage.getItem('oasis-seguimiento-demo-v1');
        if (crudo) {
          const d = JSON.parse(crudo);
          const uAntes = (d.usuarios || []).length;
          const pAntes = (d.personas || []).length;
          const tAntes = (d.tareas || []).length;
          const iAntes = (d.interacciones || []).length;

          d.usuarios = (d.usuarios || []).filter((u: any) => u.esPrueba !== true);
          d.personas = (d.personas || []).filter((p: any) => p.esPrueba !== true);
          d.tareas = (d.tareas || []).filter((t: any) => t.esPrueba !== true);
          d.interacciones = (d.interacciones || []).filter((i: any) => i.esPrueba !== true);

          const delta =
            uAntes - d.usuarios.length +
            (pAntes - d.personas.length) +
            (tAntes - d.tareas.length) +
            (iAntes - d.interacciones.length);

          if (delta > 0 && borradosTotal === 0) {
            borradosTotal = delta;
          }
          localStorage.setItem('oasis-seguimiento-demo-v1', JSON.stringify(d));
        }
      } catch {}

      if (usuario) {
        await store.registrarAuditoria({
          uid: usuario.id,
          nombre: usuario.nombre,
          accion: 'borró datos de prueba',
          objetivo: 'Datos de prueba',
          detalle: `Se eliminaron ${borradosTotal} registros ficticios con esPrueba en true.`,
          fecha: new Date().toISOString(),
        });
      }

      avisar(`Se borraron todos los datos de prueba exitosamente (${borradosTotal} registros eliminados).`);

      if (store.modoDemo) {
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
    } catch (err: any) {
      avisar(`Error al borrar datos de prueba: ${err?.message ?? 'error'}`);
    } finally {
      setBorrandoPrueba(false);
      setConfirmandoBorrado(false);
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

        {/* Sección nueva: Datos de prueba (visible únicamente para el Apóstol) */}
        {esApostol && (
          <div
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTop: '1px solid var(--borde, #e2e8f0)',
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 10px' }}>
              Datos de prueba
            </h3>

            <div className="pila" style={{ gap: 8 }}>
              <button
                type="button"
                className="btn ancho"
                onClick={cargarDatosPrueba}
                disabled={cargandoPrueba || borrandoPrueba}
              >
                {cargandoPrueba ? 'Cargando datos de prueba…' : 'Cargar datos de prueba'}
              </button>

              <button
                type="button"
                className="btn peligro ancho"
                onClick={() => setConfirmandoBorrado(true)}
                disabled={cargandoPrueba || borrandoPrueba}
              >
                {borrandoPrueba ? 'Borrando…' : 'Borrar todos los datos de prueba'}
              </button>
            </div>

            <p
              className="texto-chico"
              style={{ marginTop: 10, marginBottom: 0, color: 'var(--texto-medio)' }}
            >
              Estos datos son ficticios, sirven para probar el funcionamiento, y deben borrarse antes de conectar el WhatsApp real.
            </p>
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

      {/* Modal de confirmación para borrar datos de prueba */}
      {confirmandoBorrado && (
        <Modal
          titulo="¿Borrar todos los datos de prueba?"
          onCerrar={() => !borrandoPrueba && setConfirmandoBorrado(false)}
        >
          <Aviso tipo="alerta">
            Esta acción eliminará de la base de datos únicamente los registros que tengan el campo
            esPrueba en true, sin tocar absolutamente nada más.
          </Aviso>
          <p className="texto-medio" style={{ marginTop: 12, marginBottom: 16 }}>
            ¿Estás seguro de que deseas eliminar permanentemente todos los registros ficticios de prueba?
          </p>
          <div className="fila" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn secundario crecer"
              onClick={() => setConfirmandoBorrado(false)}
              disabled={borrandoPrueba}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn peligro crecer"
              onClick={borrarDatosPrueba}
              disabled={borrandoPrueba}
            >
              {borrandoPrueba ? 'Borrando…' : 'Sí, borrar datos de prueba'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
