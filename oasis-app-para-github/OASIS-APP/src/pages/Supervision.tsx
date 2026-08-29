// =====================================================================
//  Seguimiento: lo que ve el Apóstol donde el líder ve sus tareas.
//
//  El Apóstol no llama ni visita. Supervisa. Así que aquí no hay ningún
//  botón de «marcar como hecha»: hay visibilidad de qué está pendiente,
//  qué se venció, quién lo tiene, y la única acción que sí le compete,
//  que es pasarle una tarea a otro líder cuando alguien se está quedando.
// =====================================================================

import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDatos } from '../context/DatosContext';
import { store } from '../lib/store';
import { estaVencida } from '../lib/reglas';
import { mostrarTelefono } from '../lib/telefono';
import { Aviso, ChipLider, Modal, Vacio, hace } from '../components/UI';
import { IconoAlerta } from '../components/Iconos';
import { NOMBRE_TAREA, type Tarea } from '../lib/types';
import type { Vista } from '../App';

type Filtro = 'pendientes' | 'vencidas' | 'cumplidas';

export default function Supervision({
  ir,
  avisar,
}: {
  ir: (v: Vista, id?: string) => void;
  avisar: (m: string) => void;
}) {
  const { usuario, usuarios } = useAuth();
  const { tareas } = useDatos();
  const [filtro, setFiltro] = useState<Filtro>('pendientes');
  const [reasignando, setReasignando] = useState<Tarea | null>(null);

  const lideres = useMemo(
    () => usuarios.filter((u) => u.rol === 'lider' && u.activo),
    [usuarios],
  );

  const { urgentes, listadas, conteos } = useMemo(() => {
    const pendientes = tareas.filter((t) => t.estado === 'pendiente');
    const vencidas = pendientes.filter(estaVencida);
    const cumplidas = tareas.filter((t) => t.estado === 'hecha');
    const urgentes = pendientes.filter((t) => t.prioridad === 'urgente');

    const base =
      filtro === 'vencidas' ? vencidas : filtro === 'cumplidas' ? cumplidas : pendientes;

    const listadas = base
      .filter((t) => t.prioridad !== 'urgente' || filtro !== 'pendientes')
      .sort((a, b) =>
        filtro === 'cumplidas'
          ? (b.completadaEn ?? '').localeCompare(a.completadaEn ?? '')
          : a.vence.localeCompare(b.vence),
      );

    return {
      urgentes,
      listadas,
      conteos: {
        pendientes: pendientes.length,
        vencidas: vencidas.length,
        cumplidas: cumplidas.length,
      },
    };
  }, [tareas, filtro]);

  async function reasignar(liderId: string) {
    if (!reasignando || !usuario) return;
    const lider = usuarios.find((u) => u.id === liderId);
    if (!lider) return;

    await store.actualizarTarea(reasignando.id, {
      liderId: lider.id,
      liderNombre: lider.nombre,
    });
    await store.registrarAuditoria({
      uid: usuario.id,
      nombre: usuario.nombre,
      accion: 'reasignó una tarea',
      objetivo: reasignando.tipo === 'especial' ? (reasignando.titulo ?? 'encargo') : reasignando.personaNombre,
      detalle: `De ${reasignando.liderNombre} a ${lider.nombre}.`,
      fecha: new Date().toISOString(),
    });
    avisar(`La tarea pasó a ${lider.nombre}.`);
    setReasignando(null);
  }

  const Tarjeta = ({ t }: { t: Tarea }) => {
    const vencida = estaVencida(t);
    const finDelDia = new Date(t.vence);
    finDelDia.setHours(23, 59, 59, 999);
    const dias = Math.max(1, Math.ceil((Date.now() - finDelDia.getTime()) / 86400000));
    const venceHoy = new Date(t.vence).toDateString() === new Date().toDateString();

    return (
      <div
        className="tarjeta"
        style={
          t.prioridad === 'urgente'
            ? { borderColor: 'var(--peligro)', borderWidth: 2 }
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
              <b>{NOMBRE_TAREA[t.tipo]}</b>
            </div>

            {t.tipo === 'especial' ? (
              <div style={{ fontWeight: 650, fontSize: '0.98rem', lineHeight: 1.3 }}>
                {t.titulo}
              </div>
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
              </>
            )}

            <div style={{ marginTop: 6 }}>
              <ChipLider nombre={t.liderNombre} />
            </div>
          </div>

          <span
            className={`pildora ${t.estado === 'hecha' ? 'hecho' : vencida ? 'stop' : 'espera'}`}
          >
            {t.estado === 'hecha'
              ? hace(t.completadaEn)
              : vencida
                ? `vencida hace ${dias} ${dias === 1 ? 'día' : 'días'}`
                : venceHoy
                  ? 'vence hoy'
                  : `vence ${new Date(t.vence).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}`}
          </span>
        </div>

        {t.nota && (
          <p className="texto-medio" style={{ marginTop: 4, marginBottom: 8 }}>
            {t.nota}
          </p>
        )}

        {t.estado === 'pendiente' && (
          <button className="btn secundario chico ancho" onClick={() => setReasignando(t)}>
            Pasársela a otro líder
          </button>
        )}
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: 20 }}>
      <h1 style={{ marginBottom: 4 }}>Seguimiento</h1>
      <p className="texto-medio" style={{ marginBottom: 14 }}>
        Todo lo que el equipo tiene entre manos. Tú no ejecutas estas tareas: las miras y,
        si alguien se está quedando, se las pasas a otro.
      </p>

      {urgentes.length > 0 && (
        <div className="seccion">
          <Aviso tipo="peligro" titulo="Atención inmediata">
            {urgentes.length === 1
              ? 'El agente detectó un mensaje que necesita que alguien llame hoy mismo.'
              : `El agente detectó ${urgentes.length} mensajes que necesitan llamada hoy mismo.`}
          </Aviso>
          <div className="pila">
            {urgentes.map((t) => (
              <Tarjeta key={t.id} t={t} />
            ))}
          </div>
        </div>
      )}

      <div className="fila" style={{ gap: 6, marginBottom: 14 }}>
        {(
          [
            ['pendientes', `Pendientes · ${conteos.pendientes}`],
            ['vencidas', `Vencidas · ${conteos.vencidas}`],
            ['cumplidas', `Cumplidas · ${conteos.cumplidas}`],
          ] as Array<[Filtro, string]>
        ).map(([clave, texto]) => (
          <button
            key={clave}
            className={`pildora ${filtro === clave ? 'etapa' : 'apagada'}`}
            onClick={() => setFiltro(clave)}
          >
            {texto}
          </button>
        ))}
      </div>

      {listadas.length === 0 ? (
        <Vacio emoji="·">
          {filtro === 'vencidas'
            ? 'Ninguna tarea vencida. El equipo va al día.'
            : filtro === 'cumplidas'
              ? 'Todavía no hay tareas cumplidas.'
              : 'No hay tareas pendientes en todo el equipo.'}
        </Vacio>
      ) : (
        <div className="pila">
          {listadas.map((t) => (
            <Tarjeta key={t.id} t={t} />
          ))}
        </div>
      )}

      {reasignando && (
        <Modal titulo="¿A quién se la pasas?" onCerrar={() => setReasignando(null)}>
          <p className="texto-medio">
            Ahora la tiene <b>{reasignando.liderNombre}</b>.
          </p>
          <div className="pila">
            {lideres
              .filter((l) => l.id !== reasignando.liderId)
              .map((l) => {
                const carga = tareas.filter(
                  (t) => t.liderId === l.id && t.estado === 'pendiente',
                ).length;
                return (
                  <button key={l.id} className="item" onClick={() => reasignar(l.id)}>
                    <div className="crecer">
                      <div className="nombre">{l.nombre}</div>
                      <div className="sub">
                        {carga} de {l.capacidadSemanal} tareas pendientes
                      </div>
                    </div>
                    <span className={`pildora ${carga >= l.capacidadSemanal ? 'espera' : ''}`}>
                      {carga >= l.capacidadSemanal ? 'en su tope' : 'con espacio'}
                    </span>
                  </button>
                );
              })}
          </div>
          <button
            className="btn secundario ancho"
            style={{ marginTop: 12 }}
            onClick={() => setReasignando(null)}
          >
            Cancelar
          </button>
        </Modal>
      )}
    </div>
  );
}
