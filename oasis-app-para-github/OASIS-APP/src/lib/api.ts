// =====================================================================
//  Llamadas al servidor.
//
//  El navegador NUNCA habla directamente con WhatsApp: no puede, porque
//  el token es secreto y vive solo en el servidor. Todo pasa por aquí.
// =====================================================================

export interface RespuestaEstadoWhatsApp {
  conectado: boolean;
  modoSimulado: boolean;
  numero?: string;
  nombreVerificado?: string;
  calidad?: string;
  limiteMensajes?: string;
  mensaje?: string;
}

export interface ResultadoEnvio {
  ok: boolean;
  enviados: number;
  omitidos: number;
  fallidos: number;
  detalle: Array<{ telefono: string; estado: string; error?: string }>;
  simulado?: boolean;
}

/**
 * Cuando la app se publica como demostración suelta (sin servidor detrás),
 * las llamadas no salen a ningún lado: se responden aquí mismo con datos
 * simulados, para que todas las pantallas se puedan recorrer igual.
 */
const SIN_SERVIDOR = import.meta.env.VITE_SIN_SERVIDOR === '1';

function simular<T>(respuesta: T): Promise<T> {
  return new Promise((r) => setTimeout(() => r(respuesta), 450));
}

async function pedir<T>(ruta: string, opciones?: RequestInit): Promise<T> {
  const respuesta = await fetch(ruta, {
    headers: { 'Content-Type': 'application/json' },
    ...opciones,
  });
  const texto = await respuesta.text();
  let cuerpo: any = {};
  try {
    cuerpo = texto ? JSON.parse(texto) : {};
  } catch {
    throw new Error(`El servidor respondió algo que no se pudo leer: ${texto.slice(0, 120)}`);
  }
  if (!respuesta.ok) {
    throw new Error(cuerpo.mensaje || `Error del servidor (${respuesta.status})`);
  }
  return cuerpo as T;
}

function envioSimulado(cuantos: number): ResultadoEnvio {
  return {
    ok: true,
    enviados: cuantos,
    omitidos: 0,
    fallidos: 0,
    simulado: true,
    detalle: [],
  };
}

export const api = {
  /** ¿Está conectado el WhatsApp de la iglesia? */
  estadoWhatsApp() {
    if (SIN_SERVIDOR) {
      return simular<RespuestaEstadoWhatsApp>({
        conectado: false,
        modoSimulado: true,
        mensaje:
          'Esta es la demostración de la app, sin servidor detrás. Cuando la corras en tu computador o en AI Studio con las credenciales de Meta, aquí vas a ver el número de la iglesia, su calidad y su cupo de mensajes.',
      });
    }
    return pedir<RespuestaEstadoWhatsApp>('/api/whatsapp/estado');
  },

  /** Manda un solo mensaje de plantilla. Se usa para la prueba de conexión. */
  enviarPrueba(telefono: string, plantilla: string, variables: string[]) {
    if (SIN_SERVIDOR) return simular(envioSimulado(1));
    return pedir<ResultadoEnvio>('/api/whatsapp/prueba', {
      method: 'POST',
      body: JSON.stringify({ telefono, plantilla, variables }),
    });
  },

  /** Manda una plantilla a una persona concreta. */
  enviarPlantilla(datos: {
    personaId: string;
    telefono: string;
    plantilla: string;
    variables: string[];
  }) {
    if (SIN_SERVIDOR) return simular(envioSimulado(1));
    return pedir<ResultadoEnvio>('/api/whatsapp/enviar', {
      method: 'POST',
      body: JSON.stringify(datos),
    });
  },

  /** Envía una difusión a una lista de personas. */
  enviarDifusion(datos: {
    difusionId: string;
    plantilla: string;
    urlMedia?: string;
    tituloPalabra?: string;
    destinatarios: Array<{ personaId: string; telefono: string; nombre: string }>;
  }) {
    if (SIN_SERVIDOR) return simular(envioSimulado(datos.destinatarios.length));
    return pedir<ResultadoEnvio>('/api/whatsapp/difundir', {
      method: 'POST',
      body: JSON.stringify(datos),
    });
  },

  /** Corre la secuencia automática del día (día 0, 3, 10, 21). */
  correrSecuencia() {
    if (SIN_SERVIDOR) {
      return simular({
        revisadas: 12,
        enviados: 3,
        detalle: ['Demostración: en la app real esto envía por WhatsApp.'],
      });
    }
    return pedir<{ revisadas: number; enviados: number; detalle: string[] }>(
      '/api/secuencia/correr',
      { method: 'POST' },
    );
  },
};
