import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDatos } from '../context/DatosContext';
import { store, MODO_DEMO } from '../lib/store';
import { ETAPAS, BANDERAS, type Etapa, type Bandera, type Interaccion, type TipoTarea } from '../lib/types';
import { normalizarTelefono, mostrarTelefono, enlaceWhatsApp, enlaceLlamada } from '../lib/telefono';
import { puedeEnviarMensaje, estaVencida, completarTarea } from '../lib/reglas';
import { PLANTILLAS } from '../lib/plantillas';
import { api } from '../lib/api';
import { Aviso, ChipLider, Inicial, Modal, Vacio, hace } from '../components/UI';
import {
  IconoAtras,
  IconoCheck,
  IconoEditar,
  IconoMas,
  IconoTelefono,
  IconoWhatsApp,
} from '../components/Iconos';
import type { Vista } from '../App';

export default function FichaPersona({
  personaId,
  ir,
  avisar,
}: {
  personaId: string;
  ir: (v: Vista, id?: string) => void;
  avisar: (m: string) => void;
}) {
  const { usuario, usuarios, esApostol } = useAuth();
  const { personas, tareas } = useDatos();

  const persona = personas.find((p) => p.id === personaId);

  const [interacciones, setInteracciones] = useState<Interaccion[]>([]);
  const [nuevaNota, setNuevaNota] = useState('');
  const [guardandoNota, setGuardandoNota] = useState(false);

  // Modal para agregar tarea
  const [creandoTarea, setCreandoTarea] = useState(false);
  const [tipoTarea, setTipoTarea] = useState<TipoTarea>('llamada');
  const [detalleTarea, setDetalleTarea] = useState('');
  const [diasVence, setDiasVence] = useState(3);
  const [guardandoTarea, setGuardandoTarea] = useState(false);

  // Modal para cambiar líder
  const [cambiandoLider, setCambiandoLider] = useState(false);
  const [liderElegidoId, setLiderElegidoId] = useState(persona?.liderAsignadoId || '');

  // Suscribir a interacciones de la persona
  useEffect(() => {
    if (!personaId) return;
    const cancel = store.observarInteracciones(personaId, setInteracciones);
    return () => cancel();
  }, [personaId]);

  const tareasDePersona = useMemo(() => {
    return tareas
      .filter((t) => t.personaId === personaId)
      .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn));
  }, [tareas, personaId]);

  const lideresActivos = useMemo(() => {
    return usuarios.filter((u) => u.activo && (u.rol === 'lider' || u.rol === 'apostol'));
  }, [usuarios]);

  if (!persona) {
    return (
      <div style={{ paddingBottom: 24 }}>
        <button className="btn fantasma chico" onClick={() => ir('personas')}>
          <IconoAtras /> Volver a personas
        </button>
        <Vacio>No se encontró la información de esta persona.</Vacio>
      </div>
    );
  }

  async function cambiarEtapa(nueva: Etapa) {
    if (!persona || !usuario) return;
    await store.actualizarPersona(persona.id, { etapa: nueva });
    await store.registrarAuditoria({
      uid: usuario.id,
      nombre: usuario.nombre,
      accion: 'cambió etapa',
      objetivo: persona.nombre,
      detalle: `Pasa a: ${nueva}`,
      fecha: new Date().toISOString(),
    });
    avisar(`${persona.nombre} ahora está en etapa: ${nueva}`);
  }

  async function alternarBandera(b: Bandera) {
    if (!persona || !usuario) return;
    const nuevas = persona.banderas.includes(b)
      ? persona.banderas.filter((x) => x !== b)
      : [...persona.banderas, b];

    await store.actualizarPersona(persona.id, { banderas: nuevas });
    await store.registrarAuditoria({
      uid: usuario.id,
      nombre: usuario.nombre,
      accion: 'actualizó banderas',
      objetivo: persona.nombre,
      detalle: nuevas.join(', ') || 'Sin banderas',
      fecha: new Date().toISOString(),
    });
  }

  async function guardarNuevaNota(e: React.FormEvent) {
    e.preventDefault();
    if (!persona || !nuevaNota.trim() || !usuario) return;

    setGuardandoNota(true);
    const ahora = new Date().toISOString();
    const fechaCorta = new Date().toLocaleDateString('es-CO', {
      month: 'short',
      day: 'numeric',
    });
    const prefijo = `[${fechaCorta} · ${usuario.nombre}]`;
    const notasActualizadas = `${persona.notas ? persona.notas + '\n' : ''}${prefijo} ${nuevaNota.trim()}`;

    try {
      await store.actualizarPersona(persona.id, {
        notas: notasActualizadas,
        ultimoContacto: ahora,
      });

      await store.agregarInteraccionLocal({
        personaId: persona.id,
        direccion: 'saliente',
        canal: 'manual',
        texto: `${usuario.nombre}: ${nuevaNota.trim()}`,
        fecha: ahora,
      });

      await store.registrarAuditoria({
        uid: usuario.id,
        nombre: usuario.nombre,
        accion: 'agregó nota pastoral',
        objetivo: persona.nombre,
        detalle: nuevaNota.trim(),
        fecha: ahora,
      });

      setNuevaNota('');
      avisar('Nota agregada.');
    } finally {
      setGuardandoNota(false);
    }
  }

  async function guardarTarea(e: React.FormEvent) {
    e.preventDefault();
    if (!persona || !usuario) return;

    setGuardandoTarea(true);
    const ahora = new Date().toISOString();
    const venceFecha = new Date();
    venceFecha.setDate(venceFecha.getDate() + diasVence);

    const liderObj = usuarios.find((u) => u.id === persona.liderAsignadoId) ?? usuario;

    try {
      await store.crearTarea({
        personaId: persona.id,
        personaNombre: persona.nombre,
        personaTelefono: persona.telefonoE164,
        liderId: liderObj.id,
        liderNombre: liderObj.nombre,
        tipo: tipoTarea,
        prioridad: 'normal',
        detalle: detalleTarea.trim(),
        vence: venceFecha.toISOString(),
        estado: 'pendiente',
        creadaEn: ahora,
      });

      await store.registrarAuditoria({
        uid: usuario.id,
        nombre: usuario.nombre,
        accion: 'creó tarea',
        objetivo: persona.nombre,
        detalle: `${tipoTarea} — ${detalleTarea.trim() || 'Sin detalle'}`,
        fecha: ahora,
      });

      avisar('Tarea programada.');
      setCreandoTarea(false);
      setDetalleTarea('');
    } finally {
      setGuardandoTarea(false);
    }
  }

  async function guardarReasignacion() {
    if (!persona || !liderElegidoId || !usuario) return;
    const nuevoLider = usuarios.find((u) => u.id === liderElegidoId);
    if (!nuevoLider) return;

    await store.actualizarPersona(persona.id, {
      liderAsignadoId: nuevoLider.id,
      liderAsignadoNombre: nuevoLider.nombre,
    });

    // Reasignar tareas pendientes
    const pendientes = tareas.filter((t) => t.personaId === persona.id && t.estado === 'pendiente');
    for (const t of pendientes) {
      await store.actualizarTarea(t.id, {
        liderId: nuevoLider.id,
        liderNombre: nuevoLider.nombre,
      });
    }

    await store.registrarAuditoria({
      uid: usuario.id,
      nombre: usuario.nombre,
      accion: 'reasignó persona',
      objetivo: persona.nombre,
      detalle: `Acompaña ahora: ${nuevoLider.nombre}`,
      fecha: new Date().toISOString(),
    });

    avisar(`${persona.nombre} fue reasignada a ${nuevoLider.nombre}`);
    setCambiandoLider(false);
  }

  return (
    <div style={{ paddingBottom: 30 }}>
      <div className="fila-entre" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className="btn fantasma chico"
          onClick={() => ir('personas')}
        >
          <IconoAtras /> Personas
        </button>
        <span className="pildora etapa">{persona.etapa}</span>
      </div>

      {/* Cabecera persona */}
      <div className="tarjeta" style={{ marginBottom: 16 }}>
        <div className="fila" style={{ marginBottom: 12 }}>
          <Inicial nombre={persona.nombre} tamano={46} />
          <div className="crecer">
            <h2 style={{ fontSize: '1.25rem', margin: 0, lineHeight: 1.2 }}>{persona.nombre}</h2>
            <div className="texto-chico" style={{ marginTop: 2 }}>
              {mostrarTelefono(persona.telefonoE164)} &bull; Origen: {persona.origen}
            </div>
          </div>
        </div>

        {/* Acciones directas de contacto */}
        <div className="fila" style={{ gap: 8, marginBottom: 14 }}>
          <a
            href={enlaceWhatsApp(persona.telefonoE164)}
            target="_blank"
            rel="noreferrer"
            className="btn crecer hecho"
            style={{ textDecoration: 'none' }}
          >
            <IconoWhatsApp /> WhatsApp
          </a>
          <a
            href={enlaceLlamada(persona.telefonoE164)}
            className="btn secundario crecer"
            style={{ textDecoration: 'none' }}
          >
            <IconoTelefono /> Llamar
          </a>
        </div>

        {/* Líder asignado */}
        <div className="fila-entre" style={{ paddingTop: 10, borderTop: '1px solid var(--borde)' }}>
          <div>
            <span className="texto-chico" style={{ display: 'block' }}>
              Líder encargado:
            </span>
            <ChipLider nombre={persona.liderAsignadoNombre || 'Sin asignar'} />
          </div>
          {esApostol && (
            <button
              type="button"
              className="btn fantasma chico"
              onClick={() => {
                setLiderElegidoId(persona.liderAsignadoId || '');
                setCambiandoLider(true);
              }}
            >
              <IconoEditar size={14} /> Cambiar
            </button>
          )}
        </div>
      </div>

      {/* Etapa pastoral */}
      <div className="seccion">
        <div className="rotulo">Etapa en el proceso</div>
        <div className="tarjeta" style={{ padding: '10px 12px' }}>
          <div className="fila" style={{ gap: 6, flexWrap: 'wrap' }}>
            {ETAPAS.map((e) => (
              <button
                key={e}
                type="button"
                className={`btn chico ${persona.etapa === e ? '' : 'fantasma'}`}
                onClick={() => cambiarEtapa(e)}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Banderas de estado */}
      <div className="seccion">
        <div className="rotulo">Banderas y marcas</div>
        <div className="tarjeta" style={{ padding: '10px 12px' }}>
          <div className="fila" style={{ gap: 6, flexWrap: 'wrap' }}>
            {BANDERAS.map((b) => {
              const activa = persona.banderas.includes(b);
              return (
                <button
                  key={b}
                  type="button"
                  className={`btn chico ${activa ? (b === 'No contactar' ? 'peligro' : 'alerta') : 'fantasma'}`}
                  onClick={() => alternarBandera(b)}
                >
                  {activa ? '✓ ' : '+ '}
                  {b}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tareas de seguimiento */}
      <div className="seccion">
        <div className="fila-entre" style={{ marginBottom: 6 }}>
          <div className="rotulo" style={{ margin: 0 }}>
            Tareas y compromisos ({tareasDePersona.length})
          </div>
          <button className="btn chico secundario" onClick={() => setCreandoTarea(true)}>
            <IconoMas /> Nueva tarea
          </button>
        </div>

        {tareasDePersona.length === 0 ? (
          <p className="texto-chico">No hay tareas programadas para esta persona.</p>
        ) : (
          <div className="pila">
            {tareasDePersona.map((t) => (
              <div key={t.id} className="tarjeta" style={{ padding: '10px 12px' }}>
                <div className="fila-entre">
                  <span className={`pildora ${t.estado === 'hecha' ? 'hecho' : 'espera'}`}>
                    {t.tipo}
                  </span>
                  <span className="texto-chico">
                    {t.estado === 'hecha'
                      ? 'Cumplida'
                      : `Vence: ${new Date(t.vence).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}`}
                  </span>
                </div>
                {t.detalle && <p className="texto-medio" style={{ margin: '6px 0' }}>{t.detalle}</p>}
                {t.nota && (
                  <div className="texto-chico" style={{ color: 'var(--tinta-2)' }}>
                    <b>Nota:</b> {t.nota}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notas pastorales */}
      <div className="seccion">
        <div className="rotulo">Notas pastorales e historial</div>
        <form onSubmit={guardarNuevaNota} style={{ marginBottom: 14 }}>
          <div className="campo">
            <textarea
              value={nuevaNota}
              onChange={(e) => setNuevaNota(e.target.value)}
              placeholder="Escribe una nota pastoral sobre la llamada, visita o necesidad…"
              rows={3}
            />
          </div>
          <button
            type="submit"
            className="btn secundario chico"
            disabled={guardandoNota || !nuevaNota.trim()}
          >
            {guardandoNota ? 'Guardando…' : 'Guardar nota'}
          </button>
        </form>

        {persona.notas && (
          <div
            className="tarjeta"
            style={{
              whiteSpace: 'pre-wrap',
              fontSize: '0.88rem',
              lineHeight: 1.5,
              background: 'var(--tarjeta-2)',
            }}
          >
            {persona.notas}
          </div>
        )}
      </div>

      {/* Interacciones y mensajes */}
      <div className="seccion">
        <div className="rotulo">Registro de mensajes e interacciones</div>
        {interacciones.length === 0 ? (
          <p className="texto-chico">No hay mensajes registrados aún.</p>
        ) : (
          <div className="pila">
            {interacciones.map((i) => (
              <div key={i.id} className="tarjeta" style={{ padding: '8px 12px' }}>
                <div className="fila-entre" style={{ marginBottom: 4 }}>
                  <span className="pildora">
                    {i.direccion === 'saliente' ? 'Enviado' : 'Recibido'} &bull; {i.canal}
                  </span>
                  <span className="texto-chico">{hace(i.fecha)}</span>
                </div>
                <div className="texto-medio" style={{ fontSize: '0.88rem' }}>
                  {i.texto}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Nueva Tarea */}
      <Modal abierto={creandoTarea} onCerrar={() => setCreandoTarea(false)} titulo="Nueva tarea">
        <form onSubmit={guardarTarea}>
          <div className="campo">
            <label className="etiqueta">Tipo de tarea</label>
            <select
              value={tipoTarea}
              onChange={(e) => setTipoTarea(e.target.value as TipoTarea)}
            >
              <option value="llamada">Llamada</option>
              <option value="visita">Visita</option>
              <option value="oracion">Oración</option>
            </select>
          </div>

          <div className="campo">
            <label className="etiqueta">Detalle o instrucción</label>
            <textarea
              value={detalleTarea}
              onChange={(e) => setDetalleTarea(e.target.value)}
              placeholder="Ej: Llamar para saber cómo siguió su mamá del tratamiento."
              rows={3}
            />
          </div>

          <div className="campo">
            <label className="etiqueta">Plazo</label>
            <select
              value={diasVence}
              onChange={(e) => setDiasVence(Number(e.target.value))}
            >
              <option value={1}>1 día</option>
              <option value={3}>3 días</option>
              <option value={7}>1 semana</option>
              <option value={14}>2 semanas</option>
            </select>
          </div>

          <div className="fila" style={{ gap: 8, marginTop: 14 }}>
            <button
              type="button"
              className="btn secundario crecer"
              onClick={() => setCreandoTarea(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn crecer" disabled={guardandoTarea}>
              {guardandoTarea ? 'Guardando…' : 'Crear tarea'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Cambiar Líder */}
      <Modal abierto={cambiandoLider} onCerrar={() => setCambiandoLider(false)} titulo="Reasignar persona">
        <div style={{ padding: '4px 0' }}>
          <div className="campo">
            <label className="etiqueta">Selecciona el nuevo líder encargado</label>
            <select
              value={liderElegidoId}
              onChange={(e) => setLiderElegidoId(e.target.value)}
            >
              <option value="">Selecciona un líder…</option>
              {lideresActivos.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre} ({l.rol})
                </option>
              ))}
            </select>
          </div>

          <div className="fila" style={{ gap: 8, marginTop: 14 }}>
            <button
              type="button"
              className="btn secundario crecer"
              onClick={() => setCambiandoLider(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn crecer"
              onClick={guardarReasignacion}
              disabled={!liderElegidoId}
            >
              Guardar cambio
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
