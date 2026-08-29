import { useEffect, useState } from 'react';
import { useDatos } from '../context/DatosContext';
import { useAuth } from '../context/AuthContext';
import { store, MODO_DEMO } from '../lib/store';
import { api } from '../lib/api';
import { PLANTILLAS } from '../lib/plantillas';
import { RESPUESTAS_DE_PRUEBA, simularRespuesta } from '../lib/simulador';
import {
  cambiarBandera,
  puedeRecibirMensajes,
  ventanaAbierta,
} from '../lib/reglas';
import { mostrarTelefono, enlaceLlamada, enlaceWhatsApp } from '../lib/telefono';
import {
  BANDERAS,
  ETAPAS,
  NOMBRE_TAREA,
  type Bandera,
  type Etapa,
  type Interaccion,
} from '../lib/types';

/** Cómo se llama cada plantilla en un botón, en lenguaje de pastor. */
const ETIQUETAS_PLANTILLA: Record<string, string> = {
  oasis_bienvenida: 'Darle la bienvenida',
  oasis_oracion: 'Preguntarle si desea oración',
  oasis_visita: 'Ofrecerle una visita',
  oasis_encuentro: 'Invitarla al encuentro de nuevos',
};

function etiquetaPlantilla(nombre: string): string {
  return ETIQUETAS_PLANTILLA[nombre] ?? nombre;
}

/** "vence hoy", "vence en 3 días", "vencida hace 2 días". */
function vencimiento(iso: string): string {
  const dias = Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
  if (dias < 0) return `vencida hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`;
  if (dias === 0) return 'vence hoy';
  if (dias === 1) return 'vence mañana';
  return `vence en ${dias} días`;
}
import { Aviso, ChipLider, PildoraBandera, PildoraEtapa, Vacio, fechaHora, hace } from '../components/UI';
import { IconoAtras, IconoTelefono, IconoWhatsApp } from '../components/Iconos';
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
  const { personas, tareas } = useDatos();
  const { usuario, usuarios, esApostol } = useAuth();
  const [interacciones, setInteracciones] = useState<Interaccion[]>([]);
  const [notaNueva, setNotaNueva] = useState('');
  const [enviando, setEnviando] = useState('');
  const [simulando, setSimulando] = useState(false);

  const persona = personas.find((p) => p.id === personaId);

  useEffect(() => {
    if (!personaId) return;
    return store.observarInteracciones(personaId, setInteracciones);
  }, [personaId]);

  if (!persona) {
    return (
      <div>
        <button className="btn fantasma chico" onClick={() => ir('personas')}>
          <IconoAtras /> Volver
        </button>
        <Vacio>Esa persona ya no está en tu lista.</Vacio>
      </div>
    );
  }

  const contacto = puedeRecibirMensajes(persona);
  const abierta = ventanaAbierta(persona);
  const tareasDeEsta = tareas.filter((t) => t.personaId === persona.id);

  async function alternarBandera(b: Bandera) {
    if (!usuario || !persona) return;
    const activar = !persona.banderas.includes(b);
    const { mensaje } = await cambiarBandera({
      persona,
      bandera: b,
      activar,
      lideres: usuarios,
      tareas,
      quien: usuario,
    });
    avisar(mensaje);
  }

  async function cambiarEtapa(nueva: Etapa) {
    if (!usuario || !persona) return;
    await store.actualizarPersona(persona.id, { etapa: nueva });
    await store.registrarAuditoria({
      uid: usuario.id,
      nombre: usuario.nombre,
      accion: 'cambió etapa',
      objetivo: persona.nombre,
      detalle: `${persona.etapa} → ${nueva}`,
      fecha: new Date().toISOString(),
    });
    avisar(`${persona.nombre.split(' ')[0]} pasó a ${nueva}.`);
  }

  async function agregarNota() {
    if (!usuario || !persona || !notaNueva.trim()) return;
    const encabezado = `[${new Date().toLocaleDateString('es-CO')} · ${usuario.nombre}]`;
    await store.actualizarPersona(persona.id, {
      notas: `${persona.notas ? persona.notas + '\n\n' : ''}${encabezado} ${notaNueva.trim()}`,
      ultimoContacto: new Date().toISOString(),
    });
    await store.agregarInteraccionLocal({
      personaId: persona.id,
      direccion: 'saliente',
      canal: 'manual',
      texto: notaNueva.trim(),
      fecha: new Date().toISOString(),
    });
    setNotaNueva('');
    avisar('Nota guardada.');
  }

  /** El líder manda una de las plantillas aprobadas, cuando él quiere. */
  async function enviarPlantilla(clave: string) {
    if (!persona || !contacto.puede) return;
    const def = PLANTILLAS[clave];
    if (!def) return;

    setEnviando(clave);
    const solo = persona.nombre.trim().split(/\s+/)[0] ?? '';
    const variables = def.variables.length > 1 ? [solo, ''] : [solo];

    try {
      await api.enviarPlantilla({
        personaId: persona.id,
        telefono: persona.telefonoE164,
        plantilla: def.nombre,
        variables,
      });

      if (MODO_DEMO) {
        await store.agregarInteraccionLocal({
          personaId: persona.id,
          direccion: 'saliente',
          canal: 'whatsapp',
          plantilla: def.nombre,
          texto: def.vistaPrevia.replace('{{1}}', solo).replace('{{2}}', ''),
          estado: 'enviado',
          fecha: new Date().toISOString(),
        });
      }

      await store.actualizarPersona(persona.id, {
        ultimoContacto: new Date().toISOString(),
      });
      avisar(`Mensaje enviado a ${solo}.`);
    } catch (e: any) {
      avisar(`No se pudo enviar: ${e?.message ?? 'error de conexión'}`);
    } finally {
      setEnviando('');
    }
  }

  /** Solo en la demostración: hace de cuenta que la persona contestó. */
  async function probarRespuesta(indice: number) {
    if (!persona) return;
    setSimulando(true);
    try {
      const resumen = await simularRespuesta({
        persona,
        respuesta: RESPUESTAS_DE_PRUEBA[indice],
        lideres: usuarios,
        tareas,
      });
      avisar(resumen);
    } finally {
      setSimulando(false);
    }
  }

  async function reasignar(liderId: string) {
    if (!usuario || !persona) return;
    const lider = usuarios.find((u) => u.id === liderId);
    if (!lider) return;
    await store.actualizarPersona(persona.id, {
      liderAsignadoId: lider.id,
      liderAsignadoNombre: lider.nombre,
    });
    // Las tareas pendientes se van con la persona.
    await Promise.all(
      tareasDeEsta
        .filter((t) => t.estado === 'pendiente')
        .map((t) =>
          store.actualizarTarea(t.id, { liderId: lider.id, liderNombre: lider.nombre }),
        ),
    );
    await store.registrarAuditoria({
      uid: usuario.id,
      nombre: usuario.nombre,
      accion: 'reasignó persona',
      objetivo: persona.nombre,
      detalle: `Ahora la acompaña ${lider.nombre}`,
      fecha: new Date().toISOString(),
    });
    avisar(`${persona.nombre.split(' ')[0]} quedó con ${lider.nombre}.`);
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      <button
        className="btn fantasma chico"
        onClick={() => ir('personas')}
        style={{ marginBottom: 12 }}
      >
        <IconoAtras /> Volver
      </button>

      <div className="tarjeta">
        <span className="rotulo-fila">Persona en seguimiento</span>
        <h1 style={{ marginBottom: 4 }}>{persona.nombre}</h1>
        <div className="texto-chico" style={{ marginBottom: 10 }}>
          {mostrarTelefono(persona.telefonoE164)} · {persona.origen} · llegó{' '}
          {hace(persona.fechaIngreso)}
        </div>

        <div className="fila" style={{ marginBottom: 12 }}>
          <ChipLider nombre={persona.liderAsignadoNombre} />
        </div>

        <div className="fila" style={{ gap: 6, marginBottom: 14 }}>
          <PildoraEtapa etapa={persona.etapa} />
          {persona.banderas.map((b) => (
            <PildoraBandera key={b} bandera={b} />
          ))}
        </div>

        <div className="fila">
          <a className="btn secundario crecer" href={enlaceLlamada(persona.telefonoE164)}>
            <IconoTelefono /> Llamar
          </a>
          <a
            className="btn secundario crecer"
            href={enlaceWhatsApp(persona.telefonoE164)}
            target="_blank"
            rel="noreferrer"
          >
            <IconoWhatsApp /> Escribir
          </a>
        </div>
      </div>

      {!contacto.puede && (
        <div style={{ marginTop: 12 }}>
          <Aviso tipo="peligro" titulo="Esta persona no debe recibir mensajes">
            {contacto.razon}
          </Aviso>
        </div>
      )}

      {persona.motivoOracion && (
        <div style={{ marginTop: 12 }}>
          <Aviso tipo="alerta" titulo="Motivo de oración que compartió">
            {persona.motivoOracion}
          </Aviso>
        </div>
      )}

      {/* ---------------------------------------------------- etapa */}
      <div className="seccion" style={{ marginTop: 18 }}>
        <div className="rotulo">Etapa del camino</div>
        <div className="fila" style={{ gap: 6 }}>
          {ETAPAS.map((e) => (
            <button
              key={e}
              className={`pildora ${persona.etapa === e ? 'etapa' : 'apagada'}`}
              onClick={() => cambiarEtapa(e)}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------- banderas */}
      <div className="seccion">
        <div className="rotulo">Qué necesita ahora</div>
        <div className="fila" style={{ gap: 6 }}>
          {BANDERAS.map((b) => (
            <button
              key={b}
              className={`pildora ${persona.banderas.includes(b) ? (b === 'No contactar' ? 'stop' : 'espera') : 'apagada'}`}
              onClick={() => alternarBandera(b)}
            >
              {b}
            </button>
          ))}
        </div>
        <p className="texto-chico" style={{ marginTop: 8 }}>
          Al marcar «Espera llamada de oración» o «Espera visita» la app crea sola la tarea y
          se la asigna a un líder.
        </p>
      </div>

      {/* -------------------------------------------------- reasignar */}
      {esApostol && (
        <div className="seccion">
          <div className="rotulo">Cambiar el líder que la acompaña</div>
          <select
            value={persona.liderAsignadoId ?? ''}
            onChange={(e) => reasignar(e.target.value)}
          >
            <option value="" disabled>
              Sin asignar
            </option>
            {usuarios
              .filter((u) => u.activo)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* ------------------------------------------------------ tareas */}
      {tareasDeEsta.length > 0 && (
        <div className="seccion">
          <div className="rotulo">Tareas</div>
          <div className="pila">
            {tareasDeEsta.map((t) => (
              <div key={t.id} className="tarjeta">
                <div className="fila-entre">
                  <div>
                    <b>{NOMBRE_TAREA[t.tipo]}</b>
                    <div className="texto-chico">
                      {t.estado === 'hecha'
                        ? `hecha ${hace(t.completadaEn)} por ${t.liderNombre}`
                        : `${vencimiento(t.vence)} · la atiende ${t.liderNombre}`}
                    </div>
                  </div>
                  <span className={`pildora ${t.estado === 'hecha' ? 'hecho' : 'espera'}`}>
                    {t.estado}
                  </span>
                </div>
                {t.nota && <p className="texto-medio" style={{ marginTop: 8, marginBottom: 0 }}>{t.nota}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------ enviar mensaje */}
      {contacto.puede && (
        <div className="seccion">
          <div className="rotulo">Enviarle un mensaje ahora</div>
          <div className="pila">
            {Object.values(PLANTILLAS)
              .filter((p) => p.categoria === 'utility')
              .map((p) => (
                <button
                  key={p.nombre}
                  className="btn secundario"
                  style={{ justifyContent: 'flex-start', textAlign: 'left', height: 'auto', padding: '11px 14px' }}
                  onClick={() => enviarPlantilla(p.nombre)}
                  disabled={Boolean(enviando)}
                >
                  <IconoWhatsApp />
                  <span>
                    <b style={{ display: 'block' }}>
                      {enviando === p.nombre ? 'Enviando…' : etiquetaPlantilla(p.nombre)}
                    </b>
                    <span className="texto-chico">{p.descripcion}</span>
                  </span>
                </button>
              ))}
          </div>
          <p className="texto-chico" style={{ marginTop: 8 }}>
            La app ya los manda sola en los días que corresponden. Estos botones son para
            cuando quieras adelantarte.
          </p>
        </div>
      )}

      {/* --------------------------------- simulador de respuestas */}
      {MODO_DEMO && (
        <div className="seccion">
          <div className="rotulo">Probar el flujo</div>
          <div className="tarjeta">
            <p className="texto-medio">
              Estás en la demostración, así que nadie te va a contestar de verdad. Toca una de
              estas respuestas para ver qué pasaría si {persona.nombre.split(' ')[0]}{' '}
              contestara eso por WhatsApp: la etiqueta cambia sola, se crea la tarea y el
              agente responde.
            </p>
            <div className="fila" style={{ gap: 6 }}>
              {RESPUESTAS_DE_PRUEBA.map((r, i) => (
                <button
                  key={r.etiqueta}
                  className={`pildora ${r.etiqueta.includes('crisis') ? 'stop' : 'apagada'}`}
                  onClick={() => probarRespuesta(i)}
                  disabled={simulando}
                >
                  {r.etiqueta}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------- conversación */}
      <div className="seccion">
        <div className="rotulo">
          Conversación {abierta && '· ventana abierta, se puede escribir libre'}
        </div>
        {interacciones.length === 0 ? (
          <Vacio>Todavía no hay mensajes con esta persona.</Vacio>
        ) : (
          <div className="tarjeta">
            <div className="chat">
              {interacciones.map((i) => (
                <div key={i.id} className={`burbuja ${i.direccion}`}>
                  {i.texto}
                  <span className="pie">
                    {i.plantilla ? `plantilla ${i.plantilla} · ` : ''}
                    {i.canal === 'manual' ? 'registro del líder · ' : ''}
                    {fechaHora(i.fecha)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --------------------------------------------------- notas */}
      <div className="seccion">
        <div className="rotulo">Notas del acompañamiento</div>
        {persona.notas && (
          <div className="tarjeta" style={{ marginBottom: 10, whiteSpace: 'pre-wrap' }}>
            <div className="texto-medio">{persona.notas}</div>
          </div>
        )}
        <textarea
          value={notaNueva}
          onChange={(e) => setNotaNueva(e.target.value)}
          placeholder="La llamé, está pasando por una situación difícil en la casa. Quedamos de vernos el domingo."
        />
        <button
          className="btn ancho"
          style={{ marginTop: 8 }}
          onClick={agregarNota}
          disabled={!notaNueva.trim()}
        >
          Guardar nota y marcar contacto
        </button>
      </div>

      {/* ------------------------------------------- consentimiento */}
      <div className="seccion">
        <div className="rotulo">Autorización de datos</div>
        <div className="tarjeta">
          <div className="texto-medio">
            {persona.consentimiento?.otorgado ? (
              <>
                Autorizó el{' '}
                {persona.consentimiento.fecha
                  ? new Date(persona.consentimiento.fecha).toLocaleDateString('es-CO')
                  : '—'}
                <br />
                <span className="texto-chico">{persona.consentimiento.medio}</span>
              </>
            ) : (
              'No hay autorización registrada.'
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
