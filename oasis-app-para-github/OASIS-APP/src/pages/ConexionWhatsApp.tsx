import { useEffect, useState } from 'react';
import { api, type RespuestaEstadoWhatsApp } from '../lib/api';
import { normalizarTelefono, mostrarTelefono } from '../lib/telefono';
import { PLANTILLAS } from '../lib/plantillas';
import { Aviso, Cargando } from '../components/UI';
import { IconoWhatsApp } from '../components/Iconos';

export default function ConexionWhatsApp({ avisar }: { avisar: (m: string) => void }) {
  const [estado, setEstado] = useState<RespuestaEstadoWhatsApp | null>(null);
  const [error, setError] = useState('');
  const [telefono, setTelefono] = useState('');
  const [probando, setProbando] = useState(false);
  const [corriendo, setCorriendo] = useState(false);

  useEffect(() => {
    api
      .estadoWhatsApp()
      .then(setEstado)
      .catch((e) => setError(e?.message ?? 'No se pudo consultar el estado.'));
  }, []);

  async function probar() {
    const e164 = normalizarTelefono(telefono);
    if (!e164) {
      avisar('Ese número no se entiende. Escríbelo como 300 123 4567.');
      return;
    }
    setProbando(true);
    try {
      const r = await api.enviarPrueba(e164, 'oasis_bienvenida', ['Prueba']);
      avisar(
        r.simulado
          ? 'Simulación correcta. Conecta WhatsApp en el .env para enviar de verdad.'
          : r.enviados > 0
            ? `Mensaje enviado a ${mostrarTelefono(e164)}. Revisa ese celular.`
            : `No se pudo enviar: ${r.detalle[0]?.error ?? 'error desconocido'}`,
      );
    } catch (e: any) {
      avisar(e?.message ?? 'No se pudo enviar la prueba.');
    } finally {
      setProbando(false);
    }
  }

  async function correrSecuencia() {
    setCorriendo(true);
    try {
      const r = await api.correrSecuencia();
      avisar(`Revisadas ${r.revisadas} personas. Enviados ${r.enviados} mensajes.`);
    } catch (e: any) {
      avisar(e?.message ?? 'No se pudo correr la secuencia.');
    } finally {
      setCorriendo(false);
    }
  }

  if (error) return <Aviso tipo="peligro">{error}</Aviso>;
  if (!estado) return <Cargando texto="Consultando la conexión…" />;

  return (
    <div style={{ paddingBottom: 24 }}>
      <h1 style={{ marginBottom: 14 }}>Conexión de WhatsApp</h1>

      {estado.modoSimulado ? (
        <Aviso tipo="alerta" titulo="Modo simulado">
          {estado.mensaje ??
            'Todavía no hay credenciales de WhatsApp en el archivo .env, así que la app hace como si enviara pero no sale ningún mensaje. Todo lo demás funciona igual: puedes probar los flujos sin gastar ni un peso.'}
        </Aviso>
      ) : estado.conectado ? (
        <Aviso tipo="exito" titulo="Conectado">
          El número de la iglesia está listo para enviar.
        </Aviso>
      ) : (
        <Aviso tipo="peligro" titulo="Hay un problema con la conexión">
          {estado.mensaje ?? 'Meta no aceptó las credenciales. Revisa el token en el .env.'}
        </Aviso>
      )}

      <div className="seccion">
        <div className="rotulo">Estado del número</div>
        <div className="tabla-envoltura">
          <table>
            <tbody>
              <tr>
                <th style={{ width: '45%' }}>Número</th>
                <td>{estado.numero ?? '—'}</td>
              </tr>
              <tr>
                <th>Nombre verificado</th>
                <td>{estado.nombreVerificado ?? '—'}</td>
              </tr>
              <tr>
                <th>Calidad</th>
                <td>{estado.calidad ?? '—'}</td>
              </tr>
              <tr>
                <th>Cupo de mensajes</th>
                <td>{estado.limiteMensajes ?? '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="texto-chico" style={{ marginTop: 8 }}>
          Si la calidad baja a rojo, deja de difundir unos días y revisa a quién le estás
          escribiendo. La calidad se recupera sola cuando dejas de recibir bloqueos.
        </p>
      </div>

      <div className="seccion">
        <div className="rotulo">Enviar un mensaje de prueba</div>
        <div className="tarjeta">
          <p className="texto-medio">
            Manda la plantilla de bienvenida a tu propio celular para verificar la conexión,
            sin tocar a ninguna persona real.
          </p>
          <label className="campo">
            <span className="etiqueta">Tu celular</span>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="300 123 4567"
              inputMode="tel"
            />
          </label>
          <button className="btn ancho" onClick={probar} disabled={probando}>
            <IconoWhatsApp /> {probando ? 'Enviando…' : 'Enviar prueba'}
          </button>
        </div>
      </div>

      <div className="seccion">
        <div className="rotulo">Secuencia automática</div>
        <div className="tarjeta">
          <p className="texto-medio">
            Revisa a todas las personas y envía lo que corresponda según los días que llevan:
            bienvenida el día 0, oración el día 3, visita el día 10, encuentro el día 21.
            Normalmente corre sola una vez al día; este botón la ejecuta ahora.
          </p>
          <button className="btn secundario ancho" onClick={correrSecuencia} disabled={corriendo}>
            {corriendo ? 'Revisando…' : 'Correr ahora'}
          </button>
        </div>
      </div>

      <div className="seccion">
        <div className="rotulo">Plantillas que debe haber en Meta</div>
        <div className="pila">
          {Object.values(PLANTILLAS).map((p) => (
            <div key={p.nombre} className="tarjeta">
              <div className="fila-entre" style={{ marginBottom: 6 }}>
                <b style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.88rem' }}>
                  {p.nombre}
                </b>
                <span className={`pildora ${p.categoria === 'utility' ? 'hecho' : 'espera'}`}>
                  {p.categoria}
                </span>
              </div>
              <p className="texto-medio" style={{ marginBottom: 6 }}>
                {p.vistaPrevia}
              </p>
              <div className="fila" style={{ gap: 5 }}>
                {p.botones.map((b) => (
                  <span key={b} className="pildora">
                    {b}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="texto-chico" style={{ marginTop: 8 }}>
          Los nombres tienen que coincidir exactamente con los que registraste en el
          Administrador de WhatsApp, o Meta rechaza el envío.
        </p>
      </div>
    </div>
  );
}
