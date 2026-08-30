// =====================================================================
//  La sección de Líderes. Solo la ve el Apóstol.
//
//  Aquí arma su equipo —agrega y quita líderes— y les deja encargos:
//  tareas que no salen del seguimiento de una persona sino de él, y que
//  le llegan al líder como aviso apenas abra la app.
// =====================================================================

import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDatos } from '../context/DatosContext';
import { store, MODO_DEMO } from '../lib/store';
import { api } from '../lib/api';
import { normalizarTelefono, mostrarTelefono, enlaceWhatsApp } from '../lib/telefono';
import { elegirLiderConMenosCarga, estaVencida } from '../lib/reglas';
import { PLANTILLAS } from '../lib/plantillas';
import { Aviso, Inicial, Modal, Vacio, hace } from '../components/UI';
import { IconoMas, IconoWhatsApp, IconoCheck, IconoTareas } from '../components/Iconos';
import type { Usuario } from '../lib/types';
import type { Vista } from '../App';

function enDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString();
}

export default function Lideres({
  ir,
  avisar,
}: {
  ir: (v: Vista, id?: string) => void;
  avisar: (m: string) => void;
}) {
  const { usuario, usuarios } = useAuth();
  const { personas, tareas } = useDatos();

  // ---- agregar líder
  const [agregando, setAgregando] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [telNuevo, setTelNuevo] = useState('');
  const [errorLider, setErrorLider] = useState('');

  // ---- quitar líder
  const [quitando, setQuitando] = useState<Usuario | null>(null);

  // ---- encargo
  const [encargando, setEncargando] = useState(false);
  const [textoEncargo, setTextoEncargo] = useState('');
  const [diasEncargo, setDiasEncargo] = useState(3);
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [avisarWhatsApp, setAvisarWhatsApp] = useState(false);
  const [errorEncargo, setErrorEncargo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const lideres = useMemo(
    () => usuarios.filter((u) => u.rol === 'lider').sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [usuarios],
  );

  const encargos = useMemo(
    () =>
      tareas
        .filter((t) => t.tipo === 'especial')
        .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn)),
    [tareas],
  );

  // ------------------------------------------------------ agregar

  async function agregarLider() {
    setErrorLider('');
    if (nombreNuevo.trim().length < 3) {
      setErrorLider('Escribe el nombre completo del líder.');
      return;
    }
    if (lideres.some((l) => l.nombre.toLowerCase() === nombreNuevo.trim().toLowerCase())) {
      setErrorLider('Ya hay un líder con ese nombre. Agrégale el apellido para distinguirlos.');
      return;
    }
    const tel = telNuevo ? normalizarTelefono(telNuevo) : null;
    if (telNuevo && !tel) {
      setErrorLider('Ese celular no se entiende. Escríbelo como 300 123 4567.');
      return;
    }

    await store.crearUsuario({
      nombre: nombreNuevo.trim(),
      rol: 'lider',
      activo: true,
      capacidadSemanal: 5,
      telefono: tel ?? undefined,
      creadoEn: new Date().toISOString(),
    });

    if (usuario) {
      await store.registrarAuditoria({
        uid: usuario.id,
        nombre: usuario.nombre,
        accion: 'agregó líder',
        objetivo: nombreNuevo.trim(),
        detalle: '',
        fecha: new Date().toISOString(),
      });
    }

    avisar(`${nombreNuevo.trim().split(' ')[0]} ya puede entrar con la contraseña de líderes.`);
    setNombreNuevo('');
    setTelNuevo('');
    setAgregando(false);
  }

  // ------------------------------------------------------- quitar

  async function confirmarQuitar() {
    if (!quitando || !usuario) return;

    const suyas = personas.filter((p) => p.liderAsignadoId === quitando.id);
    const otros = usuarios.filter(
      (u) => u.id !== quitando.id && u.activo && u.rol === 'lider',
    );
    const relevo = elegirLiderConMenosCarga(otros, personas) ?? usuario;

    for (const p of suyas) {
      await store.actualizarPersona(p.id, {
        liderAsignadoId: relevo.id,
        liderAsignadoNombre: relevo.nombre,
      });
    }
    for (const t of tareas.filter(
      (t) => t.liderId === quitando.id && t.estado === 'pendiente',
    )) {
      await store.actualizarTarea(t.id, { liderId: relevo.id, liderNombre: relevo.nombre });
    }

    await store.eliminarUsuario(quitando.id);
    await store.registrarAuditoria({
      uid: usuario.id,
      nombre: usuario.nombre,
      accion: 'quitó líder',
      objetivo: quitando.nombre,
      detalle: `Sus ${suyas.length} personas pasaron a ${relevo.nombre}.`,
      fecha: new Date().toISOString(),
    });

    avisar(
      `${quitando.nombre.split(' ')[0]} salió del equipo. Sus ${suyas.length} personas quedaron con ${relevo.nombre}.`,
    );
    setQuitando(null);
  }

  // ------------------------------------------------------ encargo

  function alternarElegido(id: string) {
    setElegidos((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function mandarEncargo() {
    setErrorEncargo('');
    if (textoEncargo.trim().length < 5) {
      setErrorEncargo('Escribe qué es lo que necesitas que hagan.');
      return;
    }
    if (elegidos.length === 0) {
      setErrorEncargo('Escoge al menos un líder.');
      return;
    }
    if (!usuario) return;

    setEnviando(true);
    const ahora = new Date().toISOString();
    let avisados = 0;

    try {
      for (const id of elegidos) {
        const lider = usuarios.find((u) => u.id === id);
        if (!lider) continue;

        await store.crearTarea({
          personaId: '',
          personaNombre: '',
          personaTelefono: '',
          liderId: lider.id,
          liderNombre: lider.nombre,
          tipo: 'especial',
          estado: 'pendiente',
          vence: enDias(diasEncargo),
          creadaEn: ahora,
          completadaEn: null,
          nota: '',
          prioridad: 'normal',
          titulo: textoEncargo.trim(),
          asignadaPor: usuario.nombre,
          leidaEn: null,
        });

        // Aviso por WhatsApp al celular del líder, si lo tiene y el
        // Apóstol lo pidió. En la app real usa una plantilla aprobada.
        if (avisarWhatsApp && lider.telefono) {
          try {
            await api.enviarPlantilla({
              personaId: '',
              telefono: lider.telefono,
              plantilla: PLANTILLAS.oasis_tarea_lider.nombre,
              variables: [lider.nombre.split(' ')[0], textoEncargo.trim()],
            });
            avisados++;
          } catch {
            /* si el aviso falla, el encargo ya quedó creado igual */
          }
        }
      }

      await store.registrarAuditoria({
        uid: usuario.id,
        nombre: usuario.nombre,
        accion: 'dejó un encargo',
        objetivo: `${elegidos.length} ${elegidos.length === 1 ? 'líder' : 'líderes'}`,
        detalle: textoEncargo.trim(),
        fecha: ahora,
      });

      avisar(
        `Encargo enviado a ${elegidos.length} ${elegidos.length === 1 ? 'líder' : 'líderes'}. Les aparece como aviso al abrir la app${avisados > 0 ? `, y a ${avisados} también por WhatsApp` : ''}.`,
      );
      setTextoEncargo('');
      setElegidos([]);
      setAvisarWhatsApp(false);
      setEncargando(false);
    } finally {
      setEnviando(false);
    }
  }

  const sinCelular = elegidos.filter((id) => !usuarios.find((u) => u.id === id)?.telefono).length;

  // ---------------------------------------------------------------------

  return (
    <div style={{ paddingBottom: 24 }}>
      <div className="fila-entre" style={{ marginBottom: 4 }}>
        <h1>Líderes</h1>
        <span className="texto-chico">{lideres.length} en el equipo</span>
      </div>
      <p className="texto-medio" style={{ marginBottom: 16 }}>
        Solo tú ves esta sección.
      </p>

      <div className="fila" style={{ marginBottom: 18 }}>
        <button className="btn crecer" onClick={() => setAgregando(true)}>
          <IconoMas /> Agregar líder
        </button>
        <button
          className="btn secundario crecer"
          onClick={() => setEncargando(true)}
          disabled={lideres.length === 0}
        >
          <IconoTareas /> Dejar un encargo
        </button>
      </div>

      {/* ------------------------------------------------- el equipo */}

      {lideres.length === 0 ? (
        <div className="pila" style={{ gap: 14 }}>
          <Vacio>
            Todavía no hay líderes registrados. Usa el botón &quot;+ Agregar líder&quot; para registrar a los miembros del equipo pastoral o carga el equipo de ejemplo para demostración.
          </Vacio>
          <button
            type="button"
            className="btn secundario ancho"
            onClick={async () => {
              await store.sembrarDatosEjemplo();
              avisar('Líderes y datos de ejemplo cargados.');
            }}
          >
            ✨ Cargar líderes de ejemplo (Carolina, Andrés, Diana, Mateo, Valeria)
          </button>
        </div>
      ) : (
        <div className="pila">
          {lideres.map((l) => {
            const suyas = personas.filter((p) => p.liderAsignadoId === l.id).length;
            const pendientes = tareas.filter(
              (t) => t.liderId === l.id && t.estado === 'pendiente',
            );
            const vencidas = pendientes.filter(estaVencida).length;
            const hechas = tareas.filter(
              (t) => t.liderId === l.id && t.estado === 'hecha',
            ).length;

            return (
              <div key={l.id} className="tarjeta">
                <div className="fila" style={{ marginBottom: 10 }}>
                  <Inicial nombre={l.nombre} />
                  <div className="crecer">
                    <div className="nombre">{l.nombre}</div>
                    <div className="texto-chico">
                      {l.telefono ? mostrarTelefono(l.telefono) : 'sin celular registrado'}
                    </div>
                  </div>
                </div>

                <div className="fila" style={{ gap: 7, marginBottom: 10 }}>
                  <span className="pildora">{suyas} personas</span>
                  <span
                    className={`pildora ${pendientes.length >= l.capacidadSemanal ? 'espera' : ''}`}
                  >
                    {pendientes.length} de {l.capacidadSemanal} tareas
                  </span>
                  {vencidas > 0 && <span className="pildora stop">{vencidas} vencidas</span>}
                  {hechas > 0 && <span className="pildora hecho">{hechas} cumplidas</span>}
                </div>

                <label className="campo" style={{ marginBottom: 10 }}>
                  <span className="etiqueta">Cuántas tareas puede llevar a la vez</span>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={l.capacidadSemanal}
                    onChange={(e) =>
                      store.actualizarUsuario(l.id, {
                        capacidadSemanal: Math.max(1, Math.min(50, Number(e.target.value))),
                      })
                    }
                  />
                </label>

                <div className="fila">
                  {l.telefono && (
                    <a
                      className="btn secundario chico crecer"
                      href={enlaceWhatsApp(l.telefono)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <IconoWhatsApp /> Escribirle
                    </a>
                  )}
                  <button
                    className="btn fantasma chico"
                    onClick={() => setQuitando(l)}
                    style={{ color: 'var(--peligro)' }}
                  >
                    Quitar del equipo
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------- encargos hechos */}

      {encargos.length > 0 && (
        <div className="seccion" style={{ marginTop: 26 }}>
          <div className="rotulo">Encargos que has dejado</div>
          <div className="pila">
            {encargos.slice(0, 12).map((t) => (
              <div key={t.id} className="tarjeta">
                <div className="fila-entre" style={{ marginBottom: 6 }}>
                  <b style={{ fontSize: '0.95rem' }}>{t.titulo}</b>
                  <span className={`pildora ${t.estado === 'hecha' ? 'hecho' : 'espera'}`}>
                    {t.estado === 'hecha' ? 'hecha' : 'pendiente'}
                  </span>
                </div>
                <div className="texto-chico">
                  {t.liderNombre} ·{' '}
                  {t.estado === 'hecha'
                    ? `cumplida ${hace(t.completadaEn)}`
                    : t.leidaEn
                      ? `la vio ${hace(t.leidaEn)}`
                      : 'todavía no la ha visto'}
                </div>
                {t.nota && (
                  <p className="texto-medio" style={{ marginTop: 6, marginBottom: 0 }}>
                    {t.nota}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        className="btn fantasma ancho"
        style={{ marginTop: 20 }}
        onClick={() => ir('privado')}
      >
        Contraseñas, WhatsApp y bitácora
      </button>

      {/* --------------------------------------------------- modales */}

      {agregando && (
        <Modal titulo="Agregar un líder" onCerrar={() => setAgregando(false)}>
          {errorLider && <Aviso tipo="peligro">{errorLider}</Aviso>}
          <label className="campo">
            <span className="etiqueta">Nombre completo</span>
            <input
              type="text"
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
              placeholder="Carolina Méndez"
              autoFocus
            />
          </label>
          <label className="campo">
            <span className="etiqueta">Celular (opcional)</span>
            <input
              type="tel"
              value={telNuevo}
              onChange={(e) => setTelNuevo(e.target.value)}
              placeholder="300 123 4567"
              inputMode="tel"
            />
            <span className="ayuda">
              Con el celular puedes avisarle por WhatsApp cuando le dejes un encargo.
            </span>
          </label>
          <div className="fila">
            <button className="btn secundario crecer" onClick={() => setAgregando(false)}>
              Cancelar
            </button>
            <button className="btn crecer" onClick={agregarLider}>
              Agregar al equipo
            </button>
          </div>
        </Modal>
      )}

      {quitando && (
        <Modal titulo={`¿Quitar a ${quitando.nombre}?`} onCerrar={() => setQuitando(null)}>
          <Aviso tipo="alerta">
            Sus {personas.filter((p) => p.liderAsignadoId === quitando.id).length} personas y
            sus tareas pendientes van a pasar automáticamente al líder que menos carga tenga.
            Nadie se queda sin acompañamiento.
          </Aviso>
          <p className="texto-medio">
            No va a poder volver a entrar. Si además quieres que la contraseña de líderes
            deje de servirle, cámbiala después.
          </p>
          <div className="fila">
            <button className="btn secundario crecer" onClick={() => setQuitando(null)}>
              Cancelar
            </button>
            <button className="btn peligro crecer" onClick={confirmarQuitar}>
              Sí, quitarlo
            </button>
          </div>
        </Modal>
      )}

      {encargando && (
        <Modal titulo="Dejar un encargo" onCerrar={() => setEncargando(false)}>
          {errorEncargo && <Aviso tipo="peligro">{errorEncargo}</Aviso>}

          <label className="campo">
            <span className="etiqueta">¿Qué necesitas que hagan?</span>
            <textarea
              value={textoEncargo}
              onChange={(e) => setTextoEncargo(e.target.value)}
              placeholder="Preparar el salón para el encuentro de nuevos del domingo."
              autoFocus
            />
          </label>

          <label className="campo">
            <span className="etiqueta">¿Para cuándo?</span>
            <select value={diasEncargo} onChange={(e) => setDiasEncargo(Number(e.target.value))}>
              <option value={0}>Hoy mismo</option>
              <option value={1}>Mañana</option>
              <option value={3}>En 3 días</option>
              <option value={7}>En una semana</option>
              <option value={15}>En 15 días</option>
            </select>
          </label>

          <div className="rotulo">¿A quiénes?</div>
          <div className="fila" style={{ gap: 6, marginBottom: 12 }}>
            <button
              className={`pildora ${elegidos.length === lideres.length ? 'etapa' : 'apagada'}`}
              onClick={() =>
                setElegidos(elegidos.length === lideres.length ? [] : lideres.map((l) => l.id))
              }
            >
              Todo el equipo
            </button>
            {lideres.map((l) => (
              <button
                key={l.id}
                className={`pildora ${elegidos.includes(l.id) ? 'etapa' : 'apagada'}`}
                onClick={() => alternarElegido(l.id)}
              >
                {l.nombre}
              </button>
            ))}
          </div>

          <label className={`casilla ${avisarWhatsApp ? 'marcada' : ''}`}>
            <input
              type="checkbox"
              checked={avisarWhatsApp}
              onChange={(e) => setAvisarWhatsApp(e.target.checked)}
            />
            <span className="texto">
              <b>Avisarles también por WhatsApp</b>
              Además del aviso dentro de la app.
              {sinCelular > 0 &&
                ` ${sinCelular} de los escogidos no tiene celular registrado y no lo recibirá.`}
            </span>
          </label>

          {MODO_DEMO && avisarWhatsApp && (
            <Aviso tipo="alerta">
              En la demostración el WhatsApp es simulado. En la app real necesitas la
              plantilla <b>oasis_tarea_lider</b> aprobada en Meta.
            </Aviso>
          )}

          <div className="fila">
            <button
              className="btn secundario crecer"
              onClick={() => setEncargando(false)}
              disabled={enviando}
            >
              Cancelar
            </button>
            <button className="btn crecer" onClick={mandarEncargo} disabled={enviando}>
              {enviando ? 'Enviando…' : <><IconoCheck /> Enviar encargo</>}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
