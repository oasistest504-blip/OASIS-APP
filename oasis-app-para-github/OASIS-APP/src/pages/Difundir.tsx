import { useMemo, useState } from 'react';
import { useDatos } from '../context/DatosContext';
import { useAuth } from '../context/AuthContext';
import { store } from '../lib/store';
import { api } from '../lib/api';
import { puedeRecibirMensajes } from '../lib/reglas';
import { PLANTILLAS, PRECIO_USD } from '../lib/plantillas';
import { ETAPAS, type Etapa } from '../lib/types';
import { GRUPOS, grupoDeEtapas, grupoPorClave } from '../lib/grupos';
import { Aviso, Modal, fechaHora } from '../components/UI';
import { IconoAtras, IconoDifundir } from '../components/Iconos';
import type { Vista } from '../App';

const LIMITE_LOTE = 250;

export default function Difundir({
  avisar,
  ir,
  grupoInicial,
}: {
  avisar: (m: string) => void;
  ir: (v: Vista, id?: string, grupo?: string) => void;
  grupoInicial?: string;
}) {
  const { personas, difusiones } = useDatos();
  const { usuario } = useAuth();

  const [etapas, setEtapas] = useState<Etapa[]>(
    () => grupoPorClave(grupoInicial)?.etapas ?? ['Nuevo', 'Contactado'],
  );
  const [verEtapas, setVerEtapas] = useState(false);
  const [plantilla, setPlantilla] = useState('oasis_palabra');
  const [titulo, setTitulo] = useState('');
  const [urlMedia, setUrlMedia] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const def = PLANTILLAS[plantilla];

  const { destinatarios, excluidos, razones } = useMemo(() => {
    const enSegmento = personas.filter((p) => etapas.includes(p.etapa));
    const buenos = [];
    const malos: Record<string, number> = {};
    for (const p of enSegmento) {
      const r = puedeRecibirMensajes(p);
      if (r.puede) buenos.push(p);
      else malos[r.razon] = (malos[r.razon] ?? 0) + 1;
    }
    return {
      destinatarios: buenos,
      excluidos: enSegmento.length - buenos.length,
      razones: malos,
    };
  }, [personas, etapas]);

  const grupoActual = grupoDeEtapas(etapas);
  const tandas = Math.ceil(destinatarios.length / LIMITE_LOTE) || 0;
  const costo = destinatarios.length * PRECIO_USD[def.categoria];

  function alternarEtapa(e: Etapa) {
    setEtapas((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  }

  async function enviar() {
    if (!usuario) return;
    setEnviando(true);
    try {
      const lote = destinatarios.slice(0, LIMITE_LOTE);
      const difusionId = await store.crearDifusionLocal({
        autorId: usuario.id,
        autorNombre: usuario.nombre,
        etapas,
        banderas: [],
        tipo: urlMedia ? 'video' : 'texto',
        plantilla,
        texto: def.vistaPrevia,
        urlMedia: urlMedia || undefined,
        destinatarios: lote.length,
        excluidos,
        enviados: 0,
        fallidos: 0,
        estado: 'enviando',
        programadaPara: null,
        creadaEn: new Date().toISOString(),
      });

      const resultado = await api.enviarDifusion({
        difusionId,
        plantilla,
        urlMedia: urlMedia || undefined,
        tituloPalabra: titulo || undefined,
        destinatarios: lote.map((p) => ({
          personaId: p.id,
          telefono: p.telefonoE164,
          nombre: p.nombre,
        })),
      });

      avisar(
        resultado.simulado
          ? `Simulación: se habrían enviado ${resultado.enviados} mensajes. Conecta WhatsApp para enviar de verdad.`
          : `Enviados ${resultado.enviados}. Fallidos ${resultado.fallidos}.`,
      );
      setConfirmando(false);
    } catch (e: any) {
      avisar(e?.message ?? 'No se pudo enviar.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      <button
        className="btn fantasma chico"
        onClick={() => ir('panel')}
        style={{ marginBottom: 12 }}
      >
        <IconoAtras /> Volver al panel
      </button>

      <h1 style={{ marginBottom: 4 }}>Difundir</h1>
      <p className="texto-medio">
        Un mensaje a un grupo de la iglesia, desde el número oficial.
      </p>

      <div className="seccion">
        <div className="rotulo">1 · ¿A qué grupo?</div>
        <div className="pila">
          {GRUPOS.map((g) => {
            const cuantos = personas.filter((p) => g.etapas.includes(p.etapa)).length;
            const activo = grupoActual?.clave === g.clave;
            return (
              <button
                key={g.clave}
                className="item"
                onClick={() => setEtapas(g.etapas)}
                style={
                  activo
                    ? { borderColor: 'var(--azul-brillante)', borderWidth: 2 }
                    : undefined
                }
              >
                <div className="crecer">
                  <div className="nombre">{g.nombre}</div>
                  <div className="sub">{g.descripcion}</div>
                </div>
                <span className={`pildora ${activo ? 'etapa' : ''}`}>{cuantos}</span>
              </button>
            );
          })}
        </div>

        <button
          className="btn fantasma ancho"
          style={{ marginTop: 10 }}
          onClick={() => setVerEtapas((v) => !v)}
        >
          {verEtapas ? 'Ocultar las etapas' : 'Escoger por etapa exacta'}
        </button>

        {verEtapas && (
          <div className="fila" style={{ gap: 6, marginTop: 10 }}>
            {ETAPAS.map((e) => (
              <button
                key={e}
                className={`pildora ${etapas.includes(e) ? 'etapa' : 'apagada'}`}
                onClick={() => alternarEtapa(e)}
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="seccion">
        <div className="rotulo">2 · ¿Qué mensaje?</div>
        <label className="campo">
          <span className="etiqueta">Plantilla aprobada por Meta</span>
          <select value={plantilla} onChange={(e) => setPlantilla(e.target.value)}>
            {Object.values(PLANTILLAS)
              .filter((p) => p.nombre !== 'oasis_tarea_lider')
              .map((p) => (
                <option key={p.nombre} value={p.nombre}>
                  {p.nombre} ({p.categoria})
                </option>
              ))}
          </select>
          <span className="ayuda">{def.descripcion}</span>
        </label>

        {def.variables.length > 1 && (
          <label className="campo">
            <span className="etiqueta">{def.variables[1]}</span>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="El poder de la fe en tiempos difíciles"
            />
          </label>
        )}

        <label className="campo">
          <span className="etiqueta">Enlace del video o la imagen (opcional)</span>
          <input
            type="text"
            value={urlMedia}
            onChange={(e) => setUrlMedia(e.target.value)}
            placeholder="https://…"
          />
          <span className="ayuda">
            Debe ser un enlace público y directo al archivo. Si lo subes a Firebase Storage,
            pega aquí la URL que te da.
          </span>
        </label>

        <div className="rotulo">Vista previa</div>
        <div className="tarjeta">
          <div className="chat">
            <div className="burbuja saliente" style={{ maxWidth: '100%' }}>
              {urlMedia && (
                <div className="texto-chico" style={{ marginBottom: 6 }}>
                  [ {urlMedia.match(/\.(mp4|mov)$/i) ? 'video' : 'imagen'} adjunto ]
                </div>
              )}
              {def.vistaPrevia
                .replace('{{1}}', 'María Fernanda')
                .replace('{{2}}', titulo || '[título]')}
            </div>
          </div>
          <div className="fila" style={{ gap: 6, marginTop: 8 }}>
            {def.botones.map((b) => (
              <span key={b} className="pildora">
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="seccion">
        <div className="rotulo">3 · Confirmar</div>
        <div className="metricas">
          <div className="metrica">
            <div className="valor">{destinatarios.length}</div>
            <div className="nombre">Recibirán el mensaje</div>
          </div>
          <div className="metrica alerta">
            <div className="valor">{excluidos}</div>
            <div className="nombre">Excluidos por la app</div>
          </div>
          <div className="metrica">
            <div className="valor">{tandas || 0}</div>
            <div className="nombre">Tandas de {LIMITE_LOTE}</div>
          </div>
          <div className="metrica">
            <div className="valor" style={{ fontSize: '1.4rem' }}>
              US${costo.toFixed(2)}
            </div>
            <div className="nombre">Costo aproximado</div>
          </div>
        </div>

        {excluidos > 0 && (
          <div style={{ marginTop: 12 }}>
            <Aviso tipo="alerta" titulo="Personas que la app dejó por fuera">
              {Object.entries(razones).map(([razon, cuantos]) => (
                <div key={razon}>
                  {cuantos} · {razon}
                </div>
              ))}
            </Aviso>
          </div>
        )}

        {tandas > 1 && (
          <Aviso tipo="alerta" titulo="Se enviará solo la primera tanda">
            Meta permite tocar {LIMITE_LOTE} personas distintas cada 24 horas mientras tu
            número esté en el cupo inicial. La app envía {LIMITE_LOTE} hoy y tú repites
            mañana. No subas este límite hasta que Meta te amplíe el cupo.
          </Aviso>
        )}

        <button
          className="btn ancho"
          style={{ marginTop: 10 }}
          disabled={destinatarios.length === 0}
          onClick={() => setConfirmando(true)}
        >
          <IconoDifundir /> Enviar a {Math.min(destinatarios.length, LIMITE_LOTE)} personas
        </button>
      </div>

      {difusiones.length > 0 && (
        <div className="seccion">
          <div className="rotulo">Difusiones anteriores</div>
          <div className="pila">
            {difusiones
              .slice()
              .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn))
              .map((d) => (
                <div key={d.id} className="tarjeta">
                  <div className="fila-entre">
                    <div>
                      <b>{d.plantilla}</b>
                      <div className="texto-chico">
                        {grupoDeEtapas(d.etapas)?.nombre ?? d.etapas.join(', ')} ·{' '}
                        {fechaHora(d.creadaEn)}
                      </div>
                    </div>
                    <span className="pildora hecho">{d.enviados} enviados</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {confirmando && (
        <Modal titulo="Confirmar el envío" onCerrar={() => setConfirmando(false)}>
          <p className="texto-medio">
            Vas a enviar la plantilla <b>{plantilla}</b> a{' '}
            <b>
              {Math.min(destinatarios.length, LIMITE_LOTE)} personas
              {grupoActual ? ` de ${grupoActual.nombre}` : ''}
            </b>
            . Costo aproximado:{' '}
            <b>US${(Math.min(destinatarios.length, LIMITE_LOTE) * PRECIO_USD[def.categoria]).toFixed(2)}</b>.
          </p>
          <p className="texto-medio">
            Todas dieron su autorización y ninguna pidió salir de la lista. Esto no se puede
            deshacer.
          </p>
          <div className="fila">
            <button
              className="btn secundario crecer"
              onClick={() => setConfirmando(false)}
              disabled={enviando}
            >
              Cancelar
            </button>
            <button className="btn crecer" onClick={enviar} disabled={enviando}>
              {enviando ? 'Enviando…' : 'Sí, enviar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
