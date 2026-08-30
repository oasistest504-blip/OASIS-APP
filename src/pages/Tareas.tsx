import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDatos } from '../context/DatosContext';
import { estaVencida, completarTarea } from '../lib/reglas';
import { TIPO_TAREA_LABEL, type Tarea, type TipoTarea } from '../lib/types';
import { mostrarTelefono, enlaceWhatsApp, enlaceLlamada } from '../lib/telefono';
import { Aviso, ChipLider, Modal, Vacio, hace } from '../components/UI';
import { IconoCheck, IconoMas, IconoTelefono, IconoWhatsApp } from '../components/Iconos';
import type { Vista } from '../App';

export default function Tareas({
  ir,
  avisar,
}: {
  ir: (v: Vista, id?: string) => void;
  avisar: (m: string) => void;
}) {
  const { usuario, esApostol, usuarios } = useAuth();
  const { tareas, personas } = useDatos();

  const [filtroEstado, setFiltroEstado] = useState<'pendientes' | 'vencidas' | 'hechas'>('pendientes');
  const [liderFiltro, setLiderFiltro] = useState<string>('todos');

  // Modal para completar tarea
  const [tareaACompletar, setTareaACompletar] = useState<Tarea | null>(null);
  const [notaCierre, setNotaCierre] = useState('');
  const [guardando, setGuardando] = useState(false);

  const lista = useMemo(() => {
    return tareas
      .filter((t) => {
        if (!esApostol && usuario && t.liderId !== usuario.id) {
          return false;
        }
        if (esApostol && liderFiltro !== 'todos' && t.liderId !== liderFiltro) {
          return false;
        }
        if (filtroEstado === 'pendientes') {
          return t.estado === 'pendiente';
        }
        if (filtroEstado === 'vencidas') {
          return t.estado === 'pendiente' && estaVencida(t);
        }
        if (filtroEstado === 'hechas') {
          return t.estado === 'hecha';
        }
        return true;
      })
      .sort((a, b) => {
        if (a.prioridad === 'urgente' && b.prioridad !== 'urgente') return -1;
        if (b.prioridad === 'urgente' && a.prioridad !== 'urgente') return 1;
        return a.vence.localeCompare(b.vence);
      });
  }, [tareas, esApostol, usuario, liderFiltro, filtroEstado]);

  const lideres = useMemo(() => {
    return usuarios.filter((u) => u.rol === 'lider' && u.activo);
  }, [usuarios]);

  async function confirmarCierre() {
    if (!tareaACompletar || !usuario) return;
    setGuardando(true);
    try {
      const persona = personas.find((p) => p.id === tareaACompletar.personaId);
      await completarTarea(tareaACompletar, usuario, notaCierre, persona);
      avisar(`Tarea marcada como cumplida.`);
      setTareaACompletar(null);
      setNotaCierre('');
    } catch (err: any) {
      avisar(`Error al completar la tarea: ${err?.message ?? 'error desconocido'}`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      <div className="fila-entre" style={{ marginBottom: 4 }}>
        <h1>{esApostol ? 'Seguimiento y Tareas' : 'Mis Tareas'}</h1>
        {esApostol && (
          <button className="btn chico secundario" onClick={() => ir('lideres')}>
            <IconoMas /> Dejar encargo
          </button>
        )}
      </div>
      <p className="texto-medio" style={{ marginBottom: 16 }}>
        {esApostol
          ? 'Supervisión de encargos pastorales y llamadas asignadas.'
          : 'Llamadas, visitas y compromisos asignados para esta semana.'}
      </p>

      {/* Selector de pestañas */}
      <div className="tarjeta" style={{ marginBottom: 16, padding: '10px 12px' }}>
        <div className="fila" style={{ gap: 8, flexWrap: 'wrap' }}>
          <div className="fila" style={{ gap: 4, flex: '1 1 auto' }}>
            <button
              type="button"
              className={`btn chico ${filtroEstado === 'pendientes' ? '' : 'fantasma'}`}
              onClick={() => setFiltroEstado('pendientes')}
            >
              Pendientes
            </button>
            <button
              type="button"
              className={`btn chico ${filtroEstado === 'vencidas' ? 'peligro' : 'fantasma'}`}
              onClick={() => setFiltroEstado('vencidas')}
            >
              Vencidas
            </button>
            <button
              type="button"
              className={`btn chico ${filtroEstado === 'hechas' ? 'secundario' : 'fantasma'}`}
              onClick={() => setFiltroEstado('hechas')}
            >
              Cumplidas
            </button>
          </div>

          {esApostol && (
            <select
              value={liderFiltro}
              onChange={(e) => setLiderFiltro(e.target.value)}
              style={{ minWidth: 160 }}
            >
              <option value="todos">Todos los líderes</option>
              {lideres.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Lista de tareas */}
      {lista.length === 0 ? (
        <Vacio>
          {filtroEstado === 'vencidas'
            ? '¡Excelente! No hay ninguna tarea vencida.'
            : filtroEstado === 'pendientes'
              ? 'No tienes tareas pendientes por ahora.'
              : 'No hay historial de tareas cumplidas todavía.'}
        </Vacio>
      ) : (
        <div className="pila">
          {lista.map((t) => {
            const vencida = estaVencida(t);
            const persona = personas.find((p) => p.id === t.personaId);
            const telefono = t.personaTelefono || persona?.telefonoE164;

            return (
              <div key={t.id} className="tarjeta">
                <div className="fila-entre" style={{ marginBottom: 6, alignItems: 'flex-start' }}>
                  <div>
                    <span
                      className={`pildora ${
                        t.prioridad === 'urgente'
                          ? 'stop'
                          : t.tipo === 'especial'
                            ? 'alerta'
                            : 'etapa'
                      }`}
                      style={{ marginRight: 6 }}
                    >
                      {TIPO_TAREA_LABEL[t.tipo] ?? t.tipo}
                    </span>
                    {vencida && <span className="pildora stop">Vencida</span>}
                    {t.estado === 'hecha' && <span className="pildora hecho">Cumplida</span>}
                  </div>
                  <span className="texto-chico">
                    Vence: {new Date(t.vence).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                  </span>
                </div>

                <div style={{ marginBottom: 8 }}>
                  {t.personaId && persona ? (
                    <button
                      type="button"
                      className="enlace"
                      style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: 'var(--azul-profundo)',
                        textAlign: 'left',
                        padding: 0,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      onClick={() => ir('ficha', persona.id)}
                    >
                      {persona.nombre}
                    </button>
                  ) : (
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                      {t.titulo || t.personaNombre || 'Encargo'}
                    </div>
                  )}

                  {t.titulo && t.personaId && (
                    <div className="texto-medio" style={{ marginTop: 2 }}>
                      {t.titulo}
                    </div>
                  )}

                  {t.detalle && (
                    <p className="texto-chico" style={{ marginTop: 4, color: 'var(--tinta-2)' }}>
                      {t.detalle}
                    </p>
                  )}
                </div>

                <div className="fila-entre" style={{ alignItems: 'center', marginTop: 10 }}>
                  <div className="fila" style={{ gap: 6, alignItems: 'center' }}>
                    <ChipLider nombre={t.liderNombre} />
                    {telefono && (
                      <>
                        <a
                          href={enlaceWhatsApp(telefono)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn fantasma chico"
                          style={{ color: '#16a34a', padding: '4px 8px' }}
                          title="Escribir por WhatsApp"
                        >
                          <IconoWhatsApp size={16} />
                        </a>
                        <a
                          href={enlaceLlamada(telefono)}
                          className="btn fantasma chico"
                          style={{ color: '#0284c7', padding: '4px 8px' }}
                          title="Llamar"
                        >
                          <IconoTelefono size={16} />
                        </a>
                      </>
                    )}
                  </div>

                  {t.estado === 'pendiente' && (
                    <button
                      type="button"
                      className="btn chico hecho"
                      onClick={() => {
                        setTareaACompletar(t);
                        setNotaCierre('');
                      }}
                    >
                      <IconoCheck /> Marcar hecha
                    </button>
                  )}
                </div>

                {t.estado === 'hecha' && t.nota && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '8px 10px',
                      background: 'var(--tarjeta-2)',
                      borderRadius: 6,
                      fontSize: '0.82rem',
                    }}
                  >
                    <b>Nota de cierre:</b> {t.nota}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal completar tarea */}
      <Modal
        abierto={!!tareaACompletar}
        onCerrar={() => setTareaACompletar(null)}
        titulo="Marcar tarea como hecha"
      >
        <div style={{ padding: '4px 0' }}>
          <p className="texto-medio" style={{ marginBottom: 12 }}>
            ¿Cómo te fue con {tareaACompletar?.personaNombre || 'el encargo'}? Agrega una breve nota
            para que el Apóstol y el equipo sepan el resultado.
          </p>

          <div className="campo">
            <label className="etiqueta">Nota de seguimiento</label>
            <textarea
              value={notaCierre}
              onChange={(e) => setNotaCierre(e.target.value)}
              placeholder="Ej: Hablamos por 15 minutos, oramos por su familia y quedó contenta. Vendrá el domingo."
              rows={3}
              autoFocus
            />
          </div>

          <div className="fila" style={{ gap: 8, marginTop: 14 }}>
            <button
              type="button"
              className="btn secundario crecer"
              onClick={() => setTareaACompletar(null)}
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn crecer hecho"
              onClick={confirmarCierre}
              disabled={guardando}
            >
              {guardando ? 'Guardando…' : 'Completar tarea'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
