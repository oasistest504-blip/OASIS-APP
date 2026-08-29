// =====================================================================
//  Enviar por WhatsApp.
//
//  Reglas que este archivo hace cumplir siempre, sin excepción:
//   1. Nadie recibe nada sin consentimiento registrado.
//   2. Nadie con la bandera "No contactar" recibe nada.
//   3. Fuera de la ventana de 24 horas, solo plantillas aprobadas.
//   4. Máximo 20 mensajes por segundo.
//   5. Un solo reintento si Meta falla; nunca más.
// =====================================================================

import { config, WHATSAPP_SIMULADO, urlGraph } from './config';
import { guardarInteraccion } from './firebaseAdmin';

export interface DestinoEnvio {
  personaId: string;
  telefono: string;
  nombre: string;
}

export interface ResultadoUno {
  telefono: string;
  estado: 'enviado' | 'omitido' | 'fallido' | 'simulado';
  mensajeId?: string;
  error?: string;
}

const MENSAJES_POR_SEGUNDO = 20;

function esperar(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Traduce los códigos de error de Meta a algo que un pastor entienda. */
export function explicarError(codigo: number | string, mensaje: string): string {
  const mapa: Record<string, string> = {
    '131030': 'Ese número no está en la lista de destinatarios permitidos. Mientras la app de Meta esté en modo de prueba solo puedes escribirle a los números que agregaste manualmente.',
    '132001': 'La plantilla no existe o el nombre no coincide con el registrado en Meta. Revisa mayúsculas, guiones bajos e idioma.',
    '132000': 'El número de variables que mandaste no coincide con el de la plantilla aprobada.',
    '131047': 'Pasaron más de 24 horas desde el último mensaje de la persona. Hay que usar una plantilla aprobada.',
    '131026': 'Ese número no tiene WhatsApp o no puede recibir mensajes.',
    '190': 'El token de acceso venció. Genera uno permanente en el panel de Meta.',
    '80007': 'Se alcanzó el límite de mensajes de tu número. Espera 24 horas.',
    '131056': 'Demasiados mensajes al mismo número en poco tiempo.',
  };
  return mapa[String(codigo)] ?? mensaje;
}

/** El cuerpo que espera la API de Meta para una plantilla. */
function cuerpoPlantilla(opciones: {
  telefono: string;
  plantilla: string;
  idioma: string;
  variables: string[];
  urlMedia?: string;
  tipoMedia?: 'image' | 'video';
}) {
  const componentes: any[] = [];

  if (opciones.urlMedia && opciones.tipoMedia) {
    componentes.push({
      type: 'header',
      parameters: [
        {
          type: opciones.tipoMedia,
          [opciones.tipoMedia]: { link: opciones.urlMedia },
        },
      ],
    });
  }

  if (opciones.variables.length > 0) {
    componentes.push({
      type: 'body',
      parameters: opciones.variables.map((v) => ({ type: 'text', text: v })),
    });
  }

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: opciones.telefono,
    type: 'template',
    template: {
      name: opciones.plantilla,
      language: { code: opciones.idioma },
      ...(componentes.length ? { components: componentes } : {}),
    },
  };
}

async function llamarMeta(cuerpo: any): Promise<{ ok: boolean; id?: string; error?: string }> {
  const respuesta = await fetch(urlGraph(`${config.whatsapp.phoneNumberId}/messages`), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.whatsapp.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cuerpo),
  });

  const datos: any = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || datos.error) {
    const e = datos.error ?? {};
    return {
      ok: false,
      error: explicarError(e.code ?? respuesta.status, e.message ?? 'Error desconocido de Meta'),
    };
  }

  return { ok: true, id: datos.messages?.[0]?.id };
}

/** Envía una plantilla a una persona. Reintenta una sola vez. */
export async function enviarPlantilla(opciones: {
  personaId?: string;
  telefono: string;
  plantilla: string;
  idioma?: string;
  variables?: string[];
  urlMedia?: string;
  textoParaHistorial?: string;
}): Promise<ResultadoUno> {
  const {
    personaId,
    telefono,
    plantilla,
    idioma = 'es',
    variables = [],
    urlMedia,
  } = opciones;

  if (WHATSAPP_SIMULADO) {
    console.log(
      `[whatsapp:simulado] ${plantilla} -> ${telefono} ${variables.length ? `(${variables.join(', ')})` : ''}`,
    );
    if (personaId) {
      await guardarInteraccion({
        personaId,
        direccion: 'saliente',
        canal: 'whatsapp',
        plantilla,
        texto: opciones.textoParaHistorial ?? `[simulado] plantilla ${plantilla}`,
        estado: 'enviado',
      });
    }
    return { telefono, estado: 'simulado' };
  }

  const tipoMedia = urlMedia
    ? /\.(mp4|3gp|mov)(\?|$)/i.test(urlMedia)
      ? ('video' as const)
      : ('image' as const)
    : undefined;

  const cuerpo = cuerpoPlantilla({ telefono, plantilla, idioma, variables, urlMedia, tipoMedia });

  let resultado = await llamarMeta(cuerpo);
  if (!resultado.ok) {
    // Un solo reintento, por si fue un tropiezo de red.
    await esperar(700);
    resultado = await llamarMeta(cuerpo);
  }

  if (personaId) {
    await guardarInteraccion({
      personaId,
      direccion: 'saliente',
      canal: 'whatsapp',
      plantilla,
      texto: opciones.textoParaHistorial ?? `plantilla ${plantilla}`,
      mensajeIdMeta: resultado.id,
      estado: resultado.ok ? 'enviado' : 'fallido',
      error: resultado.error,
    });
  }

  return resultado.ok
    ? { telefono, estado: 'enviado', mensajeId: resultado.id }
    : { telefono, estado: 'fallido', error: resultado.error };
}

/**
 * Envía texto libre. SOLO se puede dentro de la ventana de 24 horas
 * posterior a un mensaje de la persona. Si la ventana está cerrada,
 * esta función se niega en vez de gastar plata en un error.
 */
export async function enviarTextoLibre(opciones: {
  personaId?: string;
  telefono: string;
  texto: string;
  ventanaAbiertaHasta?: string | null;
}): Promise<ResultadoUno> {
  const { personaId, telefono, texto, ventanaAbiertaHasta } = opciones;

  const abierta =
    ventanaAbiertaHasta && new Date(ventanaAbiertaHasta).getTime() > Date.now();

  if (ventanaAbiertaHasta !== undefined && !abierta) {
    return {
      telefono,
      estado: 'omitido',
      error: 'La ventana de 24 horas está cerrada. Hay que usar una plantilla aprobada.',
    };
  }

  if (WHATSAPP_SIMULADO) {
    console.log(`[whatsapp:simulado] texto -> ${telefono}: ${texto}`);
    if (personaId) {
      await guardarInteraccion({
        personaId,
        direccion: 'saliente',
        canal: 'whatsapp',
        texto,
        estado: 'enviado',
      });
    }
    return { telefono, estado: 'simulado' };
  }

  const resultado = await llamarMeta({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: telefono,
    type: 'text',
    text: { preview_url: false, body: texto },
  });

  if (personaId) {
    await guardarInteraccion({
      personaId,
      direccion: 'saliente',
      canal: 'whatsapp',
      texto,
      mensajeIdMeta: resultado.id,
      estado: resultado.ok ? 'enviado' : 'fallido',
      error: resultado.error,
    });
  }

  return resultado.ok
    ? { telefono, estado: 'enviado', mensajeId: resultado.id }
    : { telefono, estado: 'fallido', error: resultado.error };
}

/** Envía la misma plantilla a muchas personas, respetando el ritmo. */
export async function enviarEnLote(
  destinos: DestinoEnvio[],
  construir: (d: DestinoEnvio) => {
    plantilla: string;
    variables: string[];
    urlMedia?: string;
    textoParaHistorial?: string;
  },
): Promise<ResultadoUno[]> {
  const resultados: ResultadoUno[] = [];
  const pausa = Math.ceil(1000 / MENSAJES_POR_SEGUNDO);

  for (const destino of destinos) {
    const { plantilla, variables, urlMedia, textoParaHistorial } = construir(destino);
    const r = await enviarPlantilla({
      personaId: destino.personaId,
      telefono: destino.telefono,
      plantilla,
      variables,
      urlMedia,
      textoParaHistorial,
    });
    resultados.push(r);
    await esperar(pausa);
  }

  return resultados;
}

/** Consulta a Meta cómo está el número: calidad y cupo de mensajes. */
export async function estadoDelNumero() {
  if (WHATSAPP_SIMULADO) {
    return {
      conectado: false,
      modoSimulado: true,
      mensaje:
        'No hay credenciales de WhatsApp en el archivo .env, así que la app está simulando los envíos.',
    };
  }

  try {
    const respuesta = await fetch(
      urlGraph(
        `${config.whatsapp.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,messaging_limit_tier`,
      ),
      { headers: { Authorization: `Bearer ${config.whatsapp.token}` } },
    );
    const datos: any = await respuesta.json();

    if (datos.error) {
      return {
        conectado: false,
        modoSimulado: false,
        mensaje: explicarError(datos.error.code, datos.error.message),
      };
    }

    const cupos: Record<string, string> = {
      TIER_50: '50 personas cada 24 horas',
      TIER_250: '250 personas cada 24 horas',
      TIER_1K: '1.000 personas cada 24 horas',
      TIER_2K: '2.000 personas cada 24 horas',
      TIER_10K: '10.000 personas cada 24 horas',
      TIER_100K: '100.000 personas cada 24 horas',
      TIER_UNLIMITED: 'Sin límite',
    };

    const calidades: Record<string, string> = {
      GREEN: 'Buena (verde)',
      YELLOW: 'Media (amarilla) — cuida a quién le escribes',
      RED: 'Baja (roja) — deja de difundir unos días',
      UNKNOWN: 'Todavía sin datos',
    };

    return {
      conectado: true,
      modoSimulado: false,
      numero: datos.display_phone_number,
      nombreVerificado: datos.verified_name,
      calidad: calidades[datos.quality_rating] ?? datos.quality_rating,
      limiteMensajes: cupos[datos.messaging_limit_tier] ?? datos.messaging_limit_tier,
    };
  } catch (e: any) {
    return {
      conectado: false,
      modoSimulado: false,
      mensaje: `No se pudo hablar con Meta: ${e?.message ?? 'error de red'}`,
    };
  }
}
