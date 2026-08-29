import { useEffect, useMemo, useState } from 'react';
import { useDatos } from '../context/DatosContext';
import { useAuth } from '../context/AuthContext';
import { completarTarea, estaVencida } from '../lib/reglas';
import { store } from '../lib/store';
import { mostrarTelefono, enlaceLlamada, enlaceWhatsApp } from '../lib/telefono';
import { Aviso, ChipLider, Modal, Vacio, hace } from '../components/UI';
import { IconoCheck, IconoTelefono, IconoWhatsApp, IconoAlerta } from '../components/Iconos';
import { NOMBRE_TAREA, VERBO_TAREA, type Tarea } from '../lib/types';
import type { Vista } from '../App';

export default function MisTareas({
  ir,
  avisar,
}: {
  ir: (v: Vista, id?: string) => void;
  avisar: (m: string) => void;
}) {
  const { tareas, personas } = useDatos();
  const { usuario, esApostol } = useAuth();
  const [cerrando, setCerrando] = useState<Tarea | null>(null);
  const [nota, setNota] = useState('');
  const [verHechas, setVerHechas] = useState(false);

  const { urgentes, encargosNuevos, pendientes, hechas } = useMemo(() => {
    const p = tareas.filter((t) => t.estado === 'pendiente');
    const nuevos = p.filter((t) => t.tipo === 'especial' && !t.leidaEn);
    const idsNuevos = new Set(nuevos.map((t) => t.id));
    return {
      urgentes: p.filter((t) => t.prioridad === 'urgente'),
      encargosNuevos: nuevos,
      pendientes: p
        .filter((t) => t.prioridad !== 'urgente' && !idsNuevos.has(t.id))
        .sort((a, b) => a.vence.localeCompare(b.vence)),
      hechas: tareas
        .filter((t) => t.estado === 'hecha')
        .sort((a, b) => (b.completadaEn ?? '').localeCompare(a.completadaEn ?? '')),
    };
  }, [tareas]);

  // Un encargo se marca como visto en cuanto el líder abre esta pantalla.
  // Así el Apóstol sabe si ya se enteró o si todavía no ha entrado.
  useEffect(() => {
    if (esApostol || encargosNuevos.length === 0) return;
    const ahora = new Date().toISOString();
    const t = setTimeout(() => {
      encargosNuevos.forEach((tarea) => {
        store.actualizarTarea(tarea.id, { leidaEn: ahora });
      });
    }, 2500);
    return () => clearTimeout(t);
  }, [encargosNuevos, esApostol]);

  async function confirmarCierre() {
    if (!cerrando || !usuario) return;
    const persona = personas.find((p) => p.id === cerrando.personaId);
    await completarTarea({ tarea: cerrando, persona, nota, quien: usuario });
    avisar(
      cerrando.tipo === 'especial'
        ? 'Encargo marcado como hecho.'
        : `Tarea de ${cerrando.personaNombre.split(' ')[0]} marcada como hecha.`,
    );
    setCerrando(null);
    setNota('');
  }

  const Tarjeta = ({ t, nuevo }: { t: Tarea; nuevo?: boolean }) => {
    const vencida = estaVencida(t);
    return (
      <div
        className="tarjeta"
        style={
          t.prioridad === 'urgente'
            ? { borderColor: 'var(--peligro)', borderWidth: 2 }
            : nuevo
              ? { borderColor: 'var(--azul-brillante)', borderWidth: 2 }
              : vencida
                ? { borderColor: 'var(--alerta)' }
                : undefined
        }
      >
        <div className="fila-entre" style={{ marginBottom: 8 }}>
          <div className="crecer">
            <div className="fila" style={{ gap: 7, marginBottom: 2 }}>
              {t.prioridad === 'urgente' && (
                <span className="pildora stop">
                  <IconoAlerta style={{ width: 12, height: 12 }} /> Urgente
                </span>
              )}
              {nuevo && <span className="pildora etapa">Nuevo</span>}
              {t.tipo !== 'especial' && <b>{VERBO_TAREA[t.tipo] ?? t.tipo}</b>}
            </div>
            {t.tipo === 'especial' ? (
              <>
                <span className="rotulo-fila">Encargo del Apóstol</span>
                <div style={{ fontWeight: 650, fontSize: '1rem', lineHeight: 1.3 }}>
                  {t.titulo}
                </div>
                {t.asignadaPor && (
                  <div className="texto-chico">De parte de {t.asignadaPor}</div>
                )}
                {esApostol && (
                  <div style={{ marginTop: 6 }}>
                    <ChipLider nombre={t.liderNombre} />
                  </div>
                )}
              </>
            ) : (
              <>
                <span className="rotulo-fila">Persona a atender</span>
                <button
                  onClick={() => ir('ficha', t.personaId)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    font: 'inherit',
                    color: 'var(--azul-brillante)',
                    fontWeight: 700,
                    fontSize: '1.02rem',
                    textAlign: 'left',
                  }}
                >
                  {t.personaNombre}
                </button>
                <div className="texto-chico">{mostrarTelefono(t.personaTelefono)}</div>
                {esApostol && (
                  <div style={{ marginTop: 6 }}>
                    <ChipLider nombre={t.liderNombre} />
                  </div>
                )}
              </>
            )}
          </div>
          <span className={`pildora ${vencida ? 'stop' : 'espera'}`}>
            {vencida
              ? `vencida ${hace(t.vence)}`
              : new Date(t.vence).toDateString() === new Date().toDateString()
                ? 'vence hoy'
                : `vence ${fechaCorta(t.vence)}`}
          </span>
        </div>

        {t.tipo !== 'especial' && (
          <div className="fila">
            <a className="btn secundario chico crecer" href={enlaceLlamada(t.personaTelefono)}>
              <IconoTelefono /> Llamar
            </a>
            <a
              className="btn secundario chico crecer"
              href={enlaceWhatsApp(t.personaTelefono)}
              target="_blank"
              rel="noreferrer"
            >
              <IconoWhatsApp /> WhatsApp
            </a>
          </div>
        )}

        <button
          className="btn exito ancho"
          style={{ marginTop: 9 }}
          onClick={() => {
            setCerrando(t);
            setNota('');
          }}
        >
          <IconoCheck /> Marcar como hecha
        </button>
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: 20 }}>
      <div className="fila-entre" style={{ marginBottom: 14 }}>
        <h1>Mis tareas</h1>
        <span className="texto-chico">
          {(() => {
            const n = urgentes.length + pendientes.length + encargosNuevos.length;
            return n === 1 ? '1 pendiente' : `${n} pendientes`;
          })()}
        </span>
      </div>

      {urgentes.length > 0 && (
        <div className="seccion">
          <Aviso tipo="peligro" titulo="Atención inmediata">
            El agente detectó un mensaje que necesita que llames hoy mismo.
          </Aviso>
          <div className="pila">
            {urgentes.map((t) => (
              <Tarjeta key={t.id} t={t} />
            ))}
          </div>
        </div>
      )}

      {encargosNuevos.length > 0 && (
        <div className="seccion">
          <Aviso tipo="info" titulo={`Tienes ${encargosNuevos.length === 1 ? 'un encargo nuevo' : encargosNuevos.length + ' encargos nuevos'}`}>
            El Apóstol te dejó esto directamente.
          </Aviso>
          <div className="pila">
            {encargosNuevos.map((t) => (
              <Tarjeta key={t.id} t={t} nuevo />
            ))}
          </div>
        </div>
      )}

      {pendientes.length === 0 && urgentes.length === 0 && encargosNuevos.length === 0 ? (
        <Vacio emoji="·">
          No tienes tareas pendientes. Buen momento para orar por las personas que ya
          acompañaste.
        </Vacio>
      ) : (
        <div className="pila">
          {pendientes.map((t) => (
            <Tarjeta key={t.id} t={t} />
          ))}
        </div>
      )}

      {hechas.length > 0 && (
        <div className="seccion" style={{ marginTop: 24 }}>
          <button
            className="btn fantasma ancho"
            onClick={() => setVerHechas((v) => !v)}
          >
            {verHechas
              ? 'Ocultar'
              : hechas.length === 1
                ? 'Ver 1 tarea ya cumplida'
                : `Ver ${hechas.length} tareas ya cumplidas`}
          </button>
          {verHechas && (
            <div className="pila" style={{ marginTop: 10 }}>
              {hechas.map((t) => (
                <div key={t.id} className="tarjeta">
                  <div className="fila-entre">
                    <div>
                      <b>{NOMBRE_TAREA[t.tipo]}</b>
                      {t.tipo === 'especial' ? ` · ${t.titulo}` : ` · ${t.personaNombre}`}
                      <div className="texto-chico">
                        La cumplió {t.liderNombre} · {hace(t.completadaEn)}
                      </div>
                    </div>
                    <span className="pildora hecho">hecha</span>
                  </div>
                  {t.nota && (
                    <p className="texto-medio" style={{ marginTop: 8, marginBottom: 0 }}>
                      {t.nota}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {cerrando && (
        <Modal
          titulo={
            cerrando.tipo === 'especial'
              ? '¿Ya está el encargo?'
              : `¿Cómo te fue con ${cerrando.personaNombre.split(' ')[0]}?`
          }
          onCerrar={() => setCerrando(null)}
        >
          <label className="campo">
            <span className="etiqueta">Cuenta brevemente (opcional)</span>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Oramos por la salud de su mamá. Quedó de venir el domingo."
              autoFocus
            />
            <span className="ayuda">
              Esta nota queda en la ficha de la persona para que el próximo que la acompañe
              sepa por dónde va.
            </span>
          </label>
          <div className="fila">
            <button className="btn secundario crecer" onClick={() => setCerrando(null)}>
              Cancelar
            </button>
            <button className="btn exito crecer" onClick={confirmarCierre}>
              <IconoCheck /> Confirmar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}
