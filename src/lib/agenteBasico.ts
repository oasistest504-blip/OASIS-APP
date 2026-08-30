// =====================================================================
//  El agente sin inteligencia artificial.
//
//  Es la red de seguridad: reglas de palabras que funcionan aunque
//  Gemini no esté configurado, se caiga o devuelva algo raro.
//
//  Vive aquí, en la carpeta compartida, porque lo usan los dos lados:
//  el servidor cuando le llega un mensaje de verdad, y el navegador
//  cuando estás probando el flujo en modo demostración.
// =====================================================================

import type { LecturaAgente } from './types';

/**
 * Señales de que alguien puede estar en peligro.
 *
 * Esta lista se revisa SIEMPRE, antes que la IA. La detección de crisis
 * no puede depender de que un modelo la entienda: si aparece alguna de
 * estas frases, el mensaje escala a un ser humano el mismo día.
 */
export const SENALES_CRISIS = [
  'matarme',
  'me quiero morir',
  'quiero morirme',
  'quitarme la vida',
  'suicid',
  'no quiero vivir',
  'me va a matar',
  'me pega',
  'me golpea',
  'me maltrata',
  'abus',
  'violencia',
  'amenaz',
  'emergencia',
  'hacerme daño',
  'hacerme dano',
  'no aguanto mas',
  'no aguanto más',
  'estoy en peligro',
];

export function pareceCrisis(texto: string): boolean {
  const t = texto.toLowerCase();
  return SENALES_CRISIS.some((s) => t.includes(s));
}

/** Qué quiso decir la persona, usando solo reglas de palabras. */
export function leerBasico(texto: string): LecturaAgente {
  const t = texto.toLowerCase();

  if (pareceCrisis(t)) {
    return { intencion: 'crisis', motivo: 'Mensaje con señales de riesgo', urgencia: 'alta' };
  }
  if (/(or[eé]n|oraci[oó]n|ruego|necesito a dios|pido oraci)/.test(t)) {
    return { intencion: 'pide_oracion', motivo: '', urgencia: 'media' };
  }
  if (/(visit|vengan|pasen por|los espero en mi casa)/.test(t)) {
    return { intencion: 'acepta_visita', motivo: '', urgencia: 'media' };
  }
  if (/(horario|a qu[eé] hora|cu[aá]ndo se re[uú]nen|d[oó]nde queda|direcci[oó]n)/.test(t)) {
    return { intencion: 'pregunta_horarios', motivo: '', urgencia: 'baja' };
  }
  // El rechazo se revisa ANTES del agradecimiento: "no gracias" es un no,
  // no un gracias.
  if (/(no gracias|ahora no|esta vez no|d[eé]jenme|no me escriban|no me interesa)/.test(t)) {
    return { intencion: 'rechaza', motivo: '', urgencia: 'baja' };
  }
  if (/(gracias|bendiciones|am[eé]n|dios les pague)/.test(t)) {
    return { intencion: 'agradece', motivo: '', urgencia: 'baja' };
  }
  return { intencion: 'otro', motivo: '', urgencia: 'baja' };
}

/**
 * Las respuestas escritas a mano.
 *
 * La de crisis NO la improvisa nunca un modelo: es siempre esta, y
 * detrás de ella hay una tarea urgente para un pastor.
 */
export const RESPUESTAS_FIJAS: Record<LecturaAgente['intencion'], string> = {
  crisis: 'Gracias por contarnos. Un pastor de la iglesia se va a comunicar contigo hoy mismo.',
  pide_oracion:
    'Gracias por confiarnos eso. Vamos a estar orando por ti y un líder te va a llamar en estos días.',
  acepta_visita:
    'Qué bueno. Un líder te va a escribir para acordar el día y la hora que a ti te sirvan.',
  rechaza: 'Con gusto, gracias por avisarnos. Aquí estamos cuando lo necesites.',
  agradece: 'Con mucho gusto. Que Dios te bendiga.',
  pregunta_horarios:
    'Con gusto te confirmamos: un líder te escribe en un momento con los horarios y la dirección.',
  otro: 'Gracias por escribirnos. Estamos pendientes de ti.',
};

export function respuestaBasica(lectura: LecturaAgente): string {
  if (lectura.intencion === 'crisis' || lectura.urgencia === 'alta') {
    return RESPUESTAS_FIJAS.crisis;
  }
  return RESPUESTAS_FIJAS[lectura.intencion] ?? RESPUESTAS_FIJAS.otro;
}
