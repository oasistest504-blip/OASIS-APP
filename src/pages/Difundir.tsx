import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDatos } from '../context/DatosContext';
import { GRUPOS, type GrupoDifusion } from '../lib/grupos';
import { PLANTILLAS, PRECIO_USD } from '../lib/plantillas';
import { api } from '../lib/api';
import { store } from '../lib/store';
import { Aviso, Modal, Vacio, hace } from '../components/UI';
import { IconoAtras, IconoDifundir, IconoEnviar } from '../components/Iconos';
import type { Vista } from '../App';

export default function Difundir({
  ir,
  avisar,
  grupoInicial,
}: {
  ir: (v: Vista, id?: string) => void;
  avisar: (m: string) => void;
  grupoInicial?: string;
}) {
  const { usuario } = useAuth();
  const { personas, difusiones } = useDatos();

  const [grupoClave, setGrupoClave] = useState<string>(grupoInicial || GRUPOS[0].clave);
  const [plantillaClave, setPlantillaClave] = useState<string>('oasis_palabra');
  const [tituloPalabra, setTituloPalabra] = useState('');
  const [fechaEncuentro, setFechaEncuentro] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const grupoSeleccionado = GRUPOS.find((g) => g.clave === grupoClave) || GRUPOS[0];
  const plantillaSeleccionada = PLANTILLAS[plantillaClave] || PLANTILLAS.oasis_palabra;

  const destinatarios = useMemo(() => {
    return personas
      .filter((p) => {
        if (!grupoSeleccionado.etapas.includes(p.etapa)) return false;
        if (p.banderas.includes('No contactar')) return false;
        if (!p.consentimiento?.otorgado) return false;
        return true;
      })
      .map((p) => ({
        id: p.id,
        nombre: p.nombre,
        telefono: p.telefonoE164,
      }));
  }, [personas, grupoSeleccionado]);

  const costoEstimadoUsd = useMemo(() => {
    const tarifa =
      plantillaSeleccionada.categoria === 'utility'
        ? PRECIO_USD.utility
        : PRECIO_USD.marketing;
    return (destinatarios.length * tarifa).toFixed(2);
  }, [destinatarios, plantillaSeleccionada]);

  function vistaPreviaTexto(nombre = 'Hermano/a'): string {
    let t = plantillaSeleccionada.vistaPrevia.replace('{{1}}', nombre);
    if (plantillaClave === 'oasis_palabra') {
      t = t.replace('{{2}}', tituloPalabra || '[Título de la palabra]');
    } else if (plantillaClave === 'oasis_encuentro') {
      t = t.replace('{{2}}', fechaEncuentro || '[Fecha del encuentro]');
    }
    return t;
  }

  async function ejecutarDifusion() {
    if (!usuario) return;
    setEnviando(true);

    try {
      const res = await api.enviarDifusion({
        plantilla: plantillaSeleccionada.nombre,
        grupo: grupoSeleccionado.nombre,
        destinatarios,
      });

      await store.crearDifusionLocal({
        plantilla: plantillaSeleccionada.nombre,
        grupo: grupoSeleccionado.nombre,
        totalDestinatarios: destinatarios.length,
        totalEnviados: res.enviados,
        totalFallidos: res.fallidos,
        enviadoPorUid: usuario.id,
        enviadoPorNombre: usuario.nombre,
        fecha: new Date().toISOString(),
      });

      await store.registrarAuditoria({
        uid: usuario.id,
        nombre: usuario.nombre,
        accion: 'envió difusión masiva',
        objetivo: grupoSeleccionado.nombre,
        detalle: `${res.enviados} enviados de ${destinatarios.length}. Plantilla: ${plantillaSeleccionada.nombre}`,
        fecha: new Date().toISOString(),
      });

      avisar(
        `Difusión completada: ${res.enviados} mensajes enviados exitosamente${res.simulado ? ' (modo simulado)' : ''}.`,
      );
      setConfirmando(false);
      setTituloPalabra('');
      setFechaEncuentro('');
    } catch (err: any) {
      avisar(`Error en la difusión: ${err?.message ?? 'error desconocido'}`);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={{ paddingBottom: 30 }}>
      <div className="fila-entre" style={{ marginBottom: 10 }}>
        <button className="btn fantasma chico" onClick={() => ir('panel')}>
          <IconoAtras /> Volver al panel
        </button>
      </div>

      <h1 style={{ marginBottom: 4 }}>Difusión masiva por WhatsApp</h1>
      <p className="texto-medio" style={{ marginBottom: 18 }}>
        Envía mensajes oficiales aprobados por Meta a grupos segmentados de la iglesia.
      </p>

      {/* Formulario de difusión */}
      <div className="tarjeta" style={{ marginBottom: 20 }}>
        <div className="campo">
          <label className="etiqueta">1. Escoge el grupo destinatario</label>
          <select value={grupoClave} onChange={(e) => setGrupoClave(e.target.value)}>
            {GRUPOS.map((g) => (
              <option key={g.clave} value={g.clave}>
                {g.nombre}
              </option>
            ))}
          </select>
          <small className="texto-chico" style={{ display: 'block', marginTop: 4 }}>
            {grupoSeleccionado.descripcion} &bull; <b>{destinatarios.length} personas elegibles</b>
          </small>
        </div>

        <div className="campo">
          <label className="etiqueta">2. Escoge la plantilla de mensaje</label>
          <select
            value={plantillaClave}
            onChange={(e) => setPlantillaClave(e.target.value)}
          >
            <option value="oasis_palabra">Palabra semanal / Devocional (Marketing)</option>
            <option value="oasis_encuentro">Invitación a Encuentro de Nuevos (Utility)</option>
            <option value="oasis_oracion">Pregunta de oración (Utility)</option>
            <option value="oasis_visita">Ofrecimiento de visita pastoral (Utility)</option>
          </select>
        </div>

        {plantillaClave === 'oasis_palabra' && (
          <div className="campo">
            <label className="etiqueta">Título del devocional o palabra</label>
            <input
              type="text"
              value={tituloPalabra}
              onChange={(e) => setTituloPalabra(e.target.value)}
              placeholder="Ej: Caminando sobre las aguas (Domingo 10am)"
            />
          </div>
        )}

        {plantillaClave === 'oasis_encuentro' && (
          <div className="campo">
            <label className="etiqueta">Fecha y hora del encuentro</label>
            <input
              type="text"
              value={fechaEncuentro}
              onChange={(e) => setFechaEncuentro(e.target.value)}
              placeholder="Ej: este sábado a las 4:00 PM"
            />
          </div>
        )}

        {/* Vista previa */}
        <div
          style={{
            background: 'var(--tarjeta-2, #f8fafc)',
            border: '1px solid var(--borde)',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <div className="texto-chico" style={{ fontWeight: 700, marginBottom: 4 }}>
            Vista previa del mensaje (así le llegará a cada persona):
          </div>
          <div style={{ fontSize: '0.88rem', color: 'var(--tinta)' }}>
            &ldquo;{vistaPreviaTexto('María')}&rdquo;
          </div>
        </div>

        {/* Resumen y botón */}
        <div className="fila-entre" style={{ alignItems: 'center', marginBottom: 14 }}>
          <span className="texto-chico">
            Costo estimado: <b>~${costoEstimadoUsd} USD</b>
          </span>
          <button
            type="button"
            className="btn"
            onClick={() => setConfirmando(true)}
            disabled={destinatarios.length === 0}
          >
            <IconoEnviar /> Preparar envío ({destinatarios.length})
          </button>
        </div>
      </div>

      {/* Historial de difusiones */}
      <div className="seccion">
        <div className="rotulo">Historial de difusiones</div>
        {difusiones.length === 0 ? (
          <Vacio>No se han realizado difusiones todavía.</Vacio>
        ) : (
          <div className="pila">
            {difusiones.map((d) => (
              <div key={d.id} className="tarjeta" style={{ padding: '10px 14px' }}>
                <div className="fila-entre">
                  <span className="nombre" style={{ fontSize: '0.95rem' }}>{d.grupo}</span>
                  <span className="texto-chico">{hace(d.fecha)}</span>
                </div>
                <div className="fila" style={{ gap: 8, marginTop: 6, fontSize: '0.82rem' }}>
                  <span className="pildora hecho">{d.totalEnviados} enviados</span>
                  {d.totalFallidos > 0 && (
                    <span className="pildora stop">{d.totalFallidos} fallidos</span>
                  )}
                  <span className="texto-chico">Por {d.enviadoPorNombre}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal confirmación */}
      <Modal
        abierto={confirmando}
        onCerrar={() => setConfirmando(false)}
        titulo="Confirmar difusión masiva"
      >
        <div style={{ padding: '4px 0' }}>
          <Aviso tipo="alerta" titulo="¿Estás seguro de iniciar este envío?">
            Se enviará el mensaje a <b>{destinatarios.length} personas</b> del grupo &ldquo;
            {grupoSeleccionado.nombre}&rdquo; con la plantilla <code>{plantillaSeleccionada.nombre}</code>.
          </Aviso>

          <div className="fila" style={{ gap: 8, marginTop: 16 }}>
            <button
              type="button"
              className="btn secundario crecer"
              onClick={() => setConfirmando(false)}
              disabled={enviando}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn crecer"
              onClick={ejecutarDifusion}
              disabled={enviando}
            >
              {enviando ? 'Enviando…' : 'Sí, enviar ahora'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
