import { useState, useMemo } from 'react';
import { useDatos } from '../context/DatosContext';
import { useAuth } from '../context/AuthContext';
import { estaVencida } from '../lib/reglas';
import { ETAPAS, ETAPA_PLURAL } from '../lib/types';
import { GRUPOS } from '../lib/grupos';
import { Aviso, ChipLider, Vacio } from '../components/UI';
import { IconoDifundir, IconoEquipo, IconoMas, IconoDescargar, IconoExcel, IconoDocumento } from '../components/Iconos';
import { descargarPersonasCSV, descargarRespaldoJSON } from '../lib/exportar';
import type { Vista } from '../App';

export default function PanelApostol({
  ir,
  vencidas,
}: {
  ir: (v: Vista, id?: string, grupo?: string) => void;
  vencidas: number;
}) {
  const { personas, tareas } = useDatos();
  const { usuarios } = useAuth();
  const [avisoExportacion, setAvisoExportacion] = useState<string | null>(null);

  function manejarDescargaCSV() {
    if (personas.length === 0) {
      setAvisoExportacion('No hay personas registradas para exportar.');
      return;
    }
    descargarPersonasCSV(personas);
    setAvisoExportacion(`¡Archivo Excel (CSV) descargado con éxito con ${personas.length} personas!`);
    setTimeout(() => setAvisoExportacion(null), 5000);
  }

  function manejarDescargaJSON() {
    if (personas.length === 0) {
      setAvisoExportacion('No hay personas registradas para exportar.');
      return;
    }
    descargarRespaldoJSON(personas, tareas);
    setAvisoExportacion(`¡Respaldo completo descargado con éxito!`);
    setTimeout(() => setAvisoExportacion(null), 5000);
  }

  const m = useMemo(() => {
    const hace7 = Date.now() - 7 * 86400000;

    // Cuánto lleva esperando cada quien. El reloj arranca cuando se creó
    // la tarea de oración; si no hay tarea, desde el último contacto.
    const esperanOracion = personas
      .filter((p) => p.banderas.includes('Espera llamada de oración'))
      .map((p) => {
        const tarea = tareas.find(
          (t) =>
            t.personaId === p.id &&
            (t.tipo === 'oracion' || t.tipo === 'llamada') &&
            t.estado === 'pendiente',
        );
        const desde = tarea?.creadaEn ?? p.ultimoContacto ?? p.fechaIngreso;
        return {
          persona: p,
          dias: Math.max(0, Math.floor((Date.now() - new Date(desde).getTime()) / 86400000)),
        };
      })
      // El que más lleva esperando va de primero. Nunca al final de una
      // lista que nadie termina de leer.
      .sort((a, b) => b.dias - a.dias);

    const esperanVisita = personas.filter((p) => p.banderas.includes('Espera visita'));

    // El promedio dice cómo va la iglesia en general. La espera más larga
    // dice si alguien se está quedando por fuera, que es lo que de verdad
    // importa: un promedio bueno puede esconder a una persona olvidada.
    const cerradas = tareas.filter(
      (t) => t.tipo === 'oracion' && t.estado === 'hecha' && t.completadaEn,
    );
    const demoras = cerradas.map(
      (t) => (new Date(t.completadaEn!).getTime() - new Date(t.creadaEn).getTime()) / 86400000,
    );
    const demoraMedia =
      demoras.length > 0 ? demoras.reduce((a, b) => a + b, 0) / demoras.length : null;

    return {
      nuevosSemana: personas.filter((p) => new Date(p.fechaIngreso).getTime() > hace7).length,
      esperanOracion,
      esperanVisita,
      peorEspera: esperanOracion[0] ?? null,
      demoraMedia,
      cuantasLlamadas: demoras.length,
      sinRespuesta: personas.filter((p) => p.banderas.includes('Sin respuesta')).length,
      noContactar: personas.filter((p) => p.banderas.includes('No contactar')).length,
    };
  }, [personas, tareas]);

  const porLider = useMemo(() => {
    return usuarios
      .filter(
        (u) =>
          u.activo &&
          (u.rol === 'lider' || tareas.some((t) => t.liderId === u.id)),
      )
      .map((u) => {
        const suyas = tareas.filter((t) => t.liderId === u.id);
        const hechas = suyas.filter((t) => t.estado === 'hecha').length;
        const pend = suyas.filter((t) => t.estado === 'pendiente');
        const venc = pend.filter(estaVencida).length;
        const total = suyas.length;
        return {
          id: u.id,
          nombre: u.nombre,
          personas: personas.filter((p) => p.liderAsignadoId === u.id).length,
          total,
          hechas,
          pendientes: pend.length,
          vencidas: venc,
          cumplimiento: total > 0 ? Math.round((hechas / total) * 100) : null,
        };
      })
      .sort((a, b) => (b.cumplimiento ?? -1) - (a.cumplimiento ?? -1));
  }, [usuarios, tareas, personas]);

  const porEtapa = useMemo(
    () => ETAPAS.map((e) => ({ etapa: e, cuantos: personas.filter((p) => p.etapa === e).length })),
    [personas],
  );

  const maximo = Math.max(1, ...porEtapa.map((e) => e.cuantos));

  return (
    <div style={{ paddingBottom: 20 }}>
      <div className="fila-entre" style={{ marginBottom: 14, alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Panel del Apóstol</h1>
        <button
          type="button"
          className="btn chico"
          onClick={manejarDescargaCSV}
          title="Descargar datos en Excel (CSV)"
          style={{ background: 'var(--azul-brillante)', color: '#fff' }}
        >
          <IconoExcel size={16} /> Exportar Excel
        </button>
      </div>

      {avisoExportacion && (
        <div style={{ marginBottom: 14 }}>
          <Aviso tipo="exito" titulo="Descarga de Datos">
            {avisoExportacion}
          </Aviso>
        </div>
      )}

      {/* El indicador que manda: no el promedio, sino quién lleva más
          tiempo esperando. Un promedio bueno puede esconder a alguien
          olvidado hace tres semanas; esta cifra no esconde a nadie. */}
      <div style={{ marginBottom: 14 }}>
        {m.peorEspera === null ? (
          <Aviso tipo="exito" titulo="Nadie está esperando llamada de oración">
            Todos los que pidieron oración ya fueron atendidos.
            {m.demoraMedia !== null &&
              ` En las últimas ${m.cuantasLlamadas} llamadas, el promedio fue de ${m.demoraMedia.toFixed(1)} días.`}
          </Aviso>
        ) : (
          <Aviso
            tipo={m.peorEspera.dias <= 2 ? 'exito' : m.peorEspera.dias <= 6 ? 'alerta' : 'peligro'}
            titulo="La persona que más lleva esperando oración"
          >
            <span
              style={{ fontSize: '1.6rem', fontWeight: 750, display: 'block', lineHeight: 1.1 }}
            >
              {m.peorEspera.dias === 0
                ? 'Desde hoy'
                : `${m.peorEspera.dias} ${m.peorEspera.dias === 1 ? 'día' : 'días'}`}
            </span>
            <b style={{ display: 'block', marginTop: 2 }}>{m.peorEspera.persona.nombre}</b>
            {(() => {
              const detras = m.esperanOracion.length - 1;
              if (m.peorEspera.dias <= 2) {
                return m.esperanOracion.length === 1
                  ? 'Van bien: es la única en espera y no lleva más de dos días.'
                  : `Van bien: ninguna de las ${m.esperanOracion.length} en espera lleva más de dos días.`;
              }
              if (detras === 0) return 'Hay que llamarla hoy.';
              if (detras === 1)
                return 'Hay que llamarla hoy. Hay una persona más esperando detrás de ella.';
              return `Hay que llamarla hoy. Hay ${detras} personas más esperando detrás de ella.`;
            })()}
            {m.demoraMedia !== null && (
              <span className="texto-chico" style={{ display: 'block', marginTop: 6 }}>
                Promedio de las últimas {m.cuantasLlamadas}{' '}
                {m.cuantasLlamadas === 1 ? 'llamada' : 'llamadas'} cumplidas:{' '}
                {m.demoraMedia.toFixed(1)} días.
              </span>
            )}
          </Aviso>
        )}
      </div>

      <div className="metricas" style={{ marginBottom: 18 }}>
        <div className="metrica">
          <div className="valor">{m.nuevosSemana}</div>
          <div className="nombre">Personas nuevas esta semana</div>
        </div>
        <div className="metrica alerta">
          <div className="valor">{m.esperanOracion.length}</div>
          <div className="nombre">Esperan llamada de oración</div>
        </div>
        <div className="metrica alerta">
          <div className="valor">{m.esperanVisita.length}</div>
          <div className="nombre">Esperan visita</div>
        </div>
        <div className={`metrica ${vencidas > 0 ? 'peligro' : 'exito'}`}>
          <div className="valor">{vencidas}</div>
          <div className="nombre">Tareas vencidas</div>
        </div>
      </div>

      {m.esperanOracion.length > 0 && (
        <div className="seccion">
          <div className="rotulo">
            Esperando llamada de oración · de la que más lleva a la que menos
          </div>
          <div className="pila">
            {m.esperanOracion.slice(0, 6).map(({ persona: p, dias }) => (
              <button key={p.id} className="item" onClick={() => ir('ficha', p.id)}>
                <div className="crecer">
                  <div className="nombre">{p.nombre}</div>
                  {p.motivoOracion && <div className="sub">{p.motivoOracion}</div>}
                  <div className="marcas">
                    <ChipLider nombre={p.liderAsignadoNombre} />
                  </div>
                </div>
                <span
                  id="badge-espera-oracion"
                  className={`pildora ${dias <= 2 ? 'espera' : 'stop'}`}
                  title="Tiempo esperando llamada de oración"
                  style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, padding: '4px 10px' }}
                >
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.85, fontWeight: 700 }}>
                    Esperando
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                    {dias === 0 ? 'Desde hoy' : `${dias} ${dias === 1 ? 'día' : 'días'}`}
                  </span>
                </span>
              </button>
            ))}
          </div>
          {m.esperanOracion.length > 6 && (
            <p className="texto-chico" style={{ marginTop: 8 }}>
              Y {m.esperanOracion.length - 6} más. Están todas en Personas, filtrando por
              «Espera llamada de oración».
            </p>
          )}
        </div>
      )}

      <div className="seccion">
        <div className="rotulo">Cómo va la iglesia por etapas</div>
        <div className="tarjeta">
          <div className="pila" style={{ gap: 9 }}>
            {porEtapa.map((e) => (
              <div key={e.etapa}>
                <div className="fila-entre" style={{ marginBottom: 3 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {ETAPA_PLURAL[e.etapa]}
                  </span>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontVariantNumeric: 'tabular-nums',
                      color: 'var(--tinta-3)',
                    }}
                  >
                    {e.cuantos}
                  </span>
                </div>
                <div
                  style={{
                    height: 7,
                    background: 'var(--tarjeta-2)',
                    borderRadius: 99,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${(e.cuantos / maximo) * 100}%`,
                      height: '100%',
                      background: 'var(--azul-brillante)',
                      borderRadius: 99,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="seccion">
        <div className="rotulo">Cumplimiento por líder</div>
        {porLider.length === 0 ? (
          <Vacio>Todavía no hay líderes activos.</Vacio>
        ) : (
          <div className="tabla-envoltura">
            <table>
              <thead>
                <tr>
                  <th>Líder</th>
                  <th className="num">Personas</th>
                  <th className="num">Hechas</th>
                  <th className="num">Pend.</th>
                  <th className="num">Venc.</th>
                  <th className="num">Cumpl.</th>
                </tr>
              </thead>
              <tbody>
                {porLider.map((l) => (
                  <tr key={l.id}>
                    <td>{l.nombre}</td>
                    <td className="num">{l.personas}</td>
                    <td className="num">{l.hechas}</td>
                    <td className="num">{l.pendientes}</td>
                    <td className="num" style={l.vencidas > 0 ? { color: 'var(--peligro)', fontWeight: 700 } : undefined}>
                      {l.vencidas}
                    </td>
                    <td className="num">{l.cumplimiento === null ? '—' : `${l.cumplimiento}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------- difundir */}
      <div className="seccion">
        <div className="rotulo">Difundir un mensaje</div>
        <p className="texto-chico" style={{ marginTop: -4, marginBottom: 10 }}>
          Escoge el grupo y la app arma el envío. Sale del número oficial de la iglesia.
        </p>
        <div className="pila">
          {GRUPOS.map((g) => {
            const cuantos = personas.filter((p) => g.etapas.includes(p.etapa)).length;
            return (
              <button
                key={g.clave}
                className="item"
                onClick={() => ir('difundir', undefined, g.clave)}
                disabled={cuantos === 0}
                style={cuantos === 0 ? { opacity: 0.55 } : undefined}
              >
                <div className="crecer">
                  <div className="nombre">{g.nombre}</div>
                  <div className="sub">{g.descripcion}</div>
                </div>
                <span className="pildora etapa">
                  {cuantos} {cuantos === 1 ? 'persona' : 'personas'}
                </span>
              </button>
            );
          })}
        </div>
        <button
          className="btn secundario ancho"
          style={{ marginTop: 10 }}
          onClick={() => ir('difundir')}
        >
          <IconoDifundir /> Abrir la pantalla de difusión
        </button>
      </div>

      <div className="seccion">
        <div className="rotulo">Exportar y respaldar datos</div>
        <div className="tarjeta" style={{ padding: '16px 18px' }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--tinta-1)', marginBottom: 4 }}>
              Base de datos de personas ({personas.length} registradas)
            </div>
            <p className="texto-chico" style={{ margin: 0 }}>
              Descarga la lista completa con nombres, números de contacto, líderes pastorales asignados, etapas, motivos de oración y notas.
            </p>
          </div>

          <div className="fila" style={{ gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn secundario"
              onClick={manejarDescargaCSV}
              style={{ flex: '1 1 180px', justifyContent: 'center' }}
            >
              <IconoExcel size={18} /> Descargar en Excel (CSV)
            </button>

            <button
              type="button"
              className="btn secundario"
              onClick={manejarDescargaJSON}
              style={{ flex: '1 1 180px', justifyContent: 'center' }}
            >
              <IconoDescargar size={18} /> Respaldo Completo (JSON)
            </button>
          </div>
        </div>
      </div>

      <div className="seccion">
        <div className="rotulo">Más</div>
        <div className="pila">
          <button className="btn secundario" onClick={() => ir('inicio')}>
            <IconoMas /> Registrar una persona
          </button>
          <button className="btn secundario" onClick={() => ir('lideres')}>
            <IconoEquipo /> Líderes y encargos
          </button>
        </div>
        <p className="texto-chico" style={{ marginTop: 8 }}>
          {m.sinRespuesta === 1 ? '1 persona sin respuesta' : `${m.sinRespuesta} personas sin respuesta`} ·{' '}
          {m.noContactar === 1
            ? '1 pidió no recibir más mensajes'
            : `${m.noContactar} pidieron no recibir más mensajes`}
          .
        </p>
      </div>
    </div>
  );
}
