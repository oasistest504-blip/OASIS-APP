import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { PLANTILLAS } from '../lib/plantillas';
import { normalizarTelefono } from '../lib/telefono';
import { Aviso, Cargando } from '../components/UI';
import { IconoAtras, IconoCheck, IconoEnviar, IconoWhatsApp } from '../components/Iconos';
import type { Vista } from '../App';

export default function WhatsAppAjustes({
  ir,
  avisar,
}: {
  ir: (v: Vista, id?: string) => void;
  avisar: (m: string) => void;
}) {
  const [cargando, setCargando] = useState(true);
  const [estado, setEstado] = useState<{
    conectado: boolean;
    modoSimulado: boolean;
    numero?: string;
    nombreVerificado?: string;
    calidad?: string;
    limiteMensajes?: string;
    mensaje?: string;
  } | null>(null);

  // Formulario de prueba
  const [telefonoPrueba, setTelefonoPrueba] = useState('');
  const [plantillaPrueba, setPlantillaPrueba] = useState('oasis_bienvenida');
  const [probando, setProbando] = useState(false);
  const [corriendoSecuencia, setCorriendoSecuencia] = useState(false);

  useEffect(() => {
    cargarEstado();
  }, []);

  async function cargarEstado() {
    setCargando(true);
    try {
      const res = await api.estadoWhatsApp();
      setEstado(res);
    } catch (err: any) {
      setEstado({
        conectado: false,
        modoSimulado: true,
        mensaje: err?.message,
      });
    } finally {
      setCargando(false);
    }
  }

  async function enviarMensajePrueba(e: React.FormEvent) {
    e.preventDefault();
    const tel = normalizarTelefono(telefonoPrueba);
    if (!tel) {
      avisar('Escribe un número válido como 300 123 4567.');
      return;
    }

    setProbando(true);
    try {
      const res = await api.enviarPrueba(tel, plantillaPrueba, ['Hermano(a)']);
      avisar(
        `Mensaje de prueba enviado${res.simulado ? ' en modo simulado' : ' por WhatsApp real'}.`,
      );
    } catch (err: any) {
      avisar(`Error al enviar prueba: ${err?.message ?? 'error'}`);
    } finally {
      setProbando(false);
    }
  }

  async function ejecutarSecuenciaManual() {
    setCorriendoSecuencia(true);
    try {
      const res = await api.correrSecuencia();
      avisar(
        `Secuencia ejecutada: ${res.revisadas} personas revisadas, ${res.enviados} mensajes enviados.`,
      );
    } catch (err: any) {
      avisar(`Error al ejecutar secuencia: ${err?.message ?? 'error'}`);
    } finally {
      setCorriendoSecuencia(false);
    }
  }

  return (
    <div style={{ paddingBottom: 30 }}>
      <div className="fila-entre" style={{ marginBottom: 10 }}>
        <button className="btn fantasma chico" onClick={() => ir('panel')}>
          <IconoAtras /> Volver al panel
        </button>
      </div>

      <h1 style={{ marginBottom: 4 }}>Conexión de WhatsApp</h1>
      <p className="texto-medio" style={{ marginBottom: 18 }}>
        Estado de la integración oficial con WhatsApp Business Cloud API (Meta).
      </p>

      {cargando ? (
        <Cargando texto="Consultando estado de WhatsApp…" />
      ) : (
        <div className="pila" style={{ gap: 16 }}>
          {/* Tarjeta de estado */}
          <div className="tarjeta">
            <div className="fila-entre" style={{ marginBottom: 12 }}>
              <div className="fila" style={{ gap: 8 }}>
                <IconoWhatsApp size={22} className="texto-exito" />
                <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Estado del servicio</h2>
              </div>
              <span className={`pildora ${estado?.conectado ? 'hecho' : 'espera'}`}>
                {estado?.conectado ? 'Conectado a Meta' : 'Modo Demostración / Simulado'}
              </span>
            </div>

            {estado?.conectado ? (
              <div className="pila" style={{ gap: 6, fontSize: '0.88rem' }}>
                <div><b>Número:</b> {estado.numero || 'No disponible'}</div>
                <div><b>Nombre verificado:</b> {estado.nombreVerificado || 'Centro de Alabanza Oasis'}</div>
                <div><b>Calidad del número:</b> {estado.calidad || 'Verde (Alta)'}</div>
                <div><b>Límite de mensajes:</b> {estado.limiteMensajes || '250 / 24h'}</div>
              </div>
            ) : (
              <Aviso tipo="info" titulo="Modo Simulado Activo">
                La app está funcionando con el simulador local de WhatsApp. Los mensajes se procesan
                y quedan guardados en el historial para demostración. Para conectar el número real,
                configura <code>WHATSAPP_API_TOKEN</code> y <code>WHATSAPP_PHONE_NUMBER_ID</code> en
                las variables de entorno.
              </Aviso>
            )}
          </div>

          {/* Enviar prueba */}
          <div className="tarjeta">
            <h2 style={{ fontSize: '1.1rem', margin: '0 0 10px' }}>Enviar mensaje de prueba</h2>
            <form onSubmit={enviarMensajePrueba}>
              <div className="campo">
                <label className="etiqueta">Número de celular destinatario</label>
                <input
                  type="tel"
                  value={telefonoPrueba}
                  onChange={(e) => setTelefonoPrueba(e.target.value)}
                  placeholder="300 123 4567"
                  required
                />
              </div>

              <div className="campo">
                <label className="etiqueta">Plantilla</label>
                <select
                  value={plantillaPrueba}
                  onChange={(e) => setPlantillaPrueba(e.target.value)}
                >
                  {Object.entries(PLANTILLAS).map(([k, p]) => (
                    <option key={k} value={k}>
                      {p.nombre} ({p.categoria})
                    </option>
                  ))}
                </select>
              </div>

              <button type="submit" className="btn ancho" disabled={probando}>
                <IconoEnviar /> {probando ? 'Enviando…' : 'Enviar mensaje de prueba'}
              </button>
            </form>
          </div>

          {/* Ejecutar secuencia automática */}
          <div className="tarjeta">
            <h2 style={{ fontSize: '1.1rem', margin: '0 0 6px' }}>Secuencia automática de seguimiento</h2>
            <p className="texto-chico" style={{ marginBottom: 12 }}>
              Evalúa qué personas registradas han cumplido 3, 10 o 21 días para enviarles los siguientes
              pasos correspondientes (oración, visita o encuentro).
            </p>
            <button
              type="button"
              className="btn secundario ancho"
              onClick={ejecutarSecuenciaManual}
              disabled={corriendoSecuencia}
            >
              <IconoCheck /> {corriendoSecuencia ? 'Evaluando…' : 'Correr secuencia ahora'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
