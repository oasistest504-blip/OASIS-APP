// =====================================================================
//  El agente de seguimiento.
//
//  Lee lo que la persona escribió y decide dos cosas: qué intención hay
//  detrás, y qué responderle.
//
//  REGLA QUE NO SE NEGOCIA: si el mensaje suena a crisis —alguien que
//  habla de hacerse daño, de violencia, de una emergencia— el agente NO
//  aconseja. Responde una sola frase diciendo que un pastor se comunica
//  pronto, y el sistema crea una tarea urgente para el Apóstol el mismo
//  día. Una IA no puede ser lo único entre una persona en riesgo y un
//  ser humano.
// =====================================================================

import { GoogleGenAI } from '@google/genai';
import { config, HAY_GEMINI } from './config';
import type { LecturaAgente } from '../src/lib/types';
import {
  pareceCrisis,
  leerBasico,
  respuestaBasica,
  RESPUESTAS_FIJAS,
} from '../src/lib/agenteBasico';

const ia = HAY_GEMINI ? new GoogleGenAI({ apiKey: config.gemini.apiKey }) : null;

const INSTRUCCIONES_LECTURA = `Eres el asistente de seguimiento del ${config.iglesia}.
Lee el mensaje de una persona y devuelve ÚNICAMENTE un JSON con esta forma exacta:
{ "intencion": "pide_oracion" | "acepta_visita" | "rechaza" | "pregunta_horarios" | "agradece" | "crisis" | "otro", "motivo": "resumen en menos de 15 palabras o cadena vacía", "urgencia": "alta" | "media" | "baja" }

Marca intencion "crisis" y urgencia "alta" si el mensaje menciona pensamientos de hacerse daño, violencia intrafamiliar, abuso, una emergencia médica, o cualquier situación donde la persona pueda estar en peligro.
No inventes datos. No respondas nada fuera del JSON.`;

const INSTRUCCIONES_RESPUESTA = `Eres el asistente de seguimiento del ${config.iglesia}, escribiendo por WhatsApp en español de Colombia.

Reglas:
- Máximo 2 frases. Cálido, cercano, respetuoso.
- Nada de emojis salvo que la persona haya usado uno primero, y máximo uno.
- No prometas nada que la iglesia no pueda cumplir. No des cita, hora ni dirección que no te hayan dado.
- No des consejo médico, legal, financiero ni psicológico.
- No cites versículos largos.
- Si la persona compartió algo difícil, agradece la confianza y dile que un líder se va a comunicar.
- Nunca digas que eres una inteligencia artificial a menos que te lo pregunten directamente.`;

/** Qué quiso decir la persona. */
export async function leerMensaje(texto: string): Promise<LecturaAgente> {
  // La revisión por palabras corre SIEMPRE, antes que la IA. Si hay
  // señales de riesgo no dependemos de que el modelo las detecte.
  if (pareceCrisis(texto)) {
    return { intencion: 'crisis', motivo: 'Mensaje con señales de riesgo', urgencia: 'alta' };
  }

  if (!ia) return leerBasico(texto);

  try {
    const respuesta = await ia.models.generateContent({
      model: config.gemini.modelo,
      contents: texto,
      config: {
        systemInstruction: INSTRUCCIONES_LECTURA,
        temperature: 0,
        responseMimeType: 'application/json',
      },
    });

    const crudo = (respuesta.text ?? '').trim();
    const lectura = JSON.parse(crudo) as LecturaAgente;

    if (!lectura.intencion) return leerBasico(texto);
    return {
      intencion: lectura.intencion,
      motivo: (lectura.motivo ?? '').slice(0, 120),
      urgencia: lectura.urgencia ?? 'baja',
    };
  } catch (e: any) {
    console.error('[agente] no se pudo leer con Gemini, uso el respaldo:', e?.message);
    return leerBasico(texto);
  }
}

/** Qué le respondemos. */
export async function redactarRespuesta(opciones: {
  nombre: string;
  texto: string;
  lectura: LecturaAgente;
}): Promise<string> {
  const { nombre, texto, lectura } = opciones;

  // En crisis la respuesta NUNCA la improvisa el modelo.
  if (lectura.intencion === 'crisis' || lectura.urgencia === 'alta') {
    return RESPUESTAS_FIJAS.crisis;
  }

  if (!ia) return respuestaBasica(lectura);

  try {
    const respuesta = await ia.models.generateContent({
      model: config.gemini.modelo,
      contents: `La persona se llama ${nombre.split(' ')[0]}. Escribió: "${texto}". La intención detectada es "${lectura.intencion}". Responde.`,
      config: {
        systemInstruction: INSTRUCCIONES_RESPUESTA,
        temperature: 0.6,
        maxOutputTokens: 160,
      },
    });

    const salida = (respuesta.text ?? '').trim();
    if (!salida) throw new Error('respuesta vacía');
    return salida.slice(0, 700);
  } catch (e: any) {
    console.error('[agente] no se pudo redactar con Gemini:', e?.message);
    return respuestaBasica(lectura);
  }
}
