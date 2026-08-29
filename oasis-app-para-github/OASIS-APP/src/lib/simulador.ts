// =====================================================================
//  El simulador de respuestas. SOLO funciona en modo demostración.
//
//  En la app real, cuando una persona contesta por WhatsApp, el mensaje
//  llega al servidor por /webhook/whatsapp y ahí se decide todo. En la
//  demostración no hay servidor ni WhatsApp, así que este archivo hace
//  exactamente lo mismo desde el navegador: pone la bandera, crea la
//  tarea, escala las crisis y escribe la respuesta del agente.
//
//  Es la misma lógica que server/webhook.ts, para que lo que pruebes
//  aquí sea lo que va a pasar de verdad.
// =====================================================================

import { store, MODO_DEMO } from './store';
import { leerBasico, respuestaBasica } from './agenteBasico';
import { elegirLiderParaTarea, enDias } from './reglas';
import { BOTONES } from './plantillas';
import type { Bandera, Persona, Tarea, TipoTarea, Usuario } from './types';

export interface RespuestaSimulada {
  /** Lo que aparece como texto del botón o del mensaje. */
  etiqueta: string;
  /** El texto que "escribe" la persona. */
  texto: string;
  /** true si viene de tocar un botón de la plantilla. */
  esBoton: boolean;
}

/** Las respuestas típicas, para probar el flujo con un toque. */
export const RESPUESTAS_DE_PRUEBA: RespuestaSimulada[] = [
  { etiqueta: 'Sí, oren por mí', texto: 'Sí, oren por mí', esBoton: true },
  { etiqueta: 'Sí, con gusto (visita)', texto: 'Sí, con gusto', esBoton: true },
  { etiqueta: 'Ahora no', texto: 'Ahora no', esBoton: true },
  {
    etiqueta: 'Escribe un motivo',
    texto: 'Por favor oren por mi mamá, lleva dos semanas hospitalizada',
    esBoton: false,
  },
  {
    etiqueta: 'Pregunta horarios',
    texto: '¿A qué hora es el servicio del domingo?',
    esBoton: false,
  },
  {
    etiqueta: 'Mensaje de crisis',
    texto: 'Ya no aguanto más, siento que no puedo seguir',
    esBoton: false,
  },
  { etiqueta: 'No deseo recibir más', texto: 'No deseo recibir más', esBoton: true },
];

function sinTildes(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function coincide(texto: string, opciones: string[]): boolean {
  const t = sinTildes(texto);
  return opciones.some((o) => {
    const limpio = sinTildes(o);
    return t === limpio || t.includes(limpio);
  });
}

/** Crea la tarea, sin duplicar si ya hay una igual pendiente. */
async function crearTareaSi(opciones: {
  persona: Persona;
  tipo: TipoTarea;
  dias: number;
  prioridad: 'normal' | 'urgente';
  lideres: Usuario[];
  tareas: Tarea[];
}): Promise<string | null> {
  const { persona, tipo, dias, prioridad, lideres, tareas } = opciones;

  const yaHay = tareas.some(
    (t) => t.personaId === persona.id && t.tipo === tipo && t.estado === 'pendiente',
  );
  if (yaHay) return null;

  // Toda tarea la hace un líder; el Apóstol supervisa. Una crisis va al
  // líder de esa persona —urgente y para hoy— y le aparece al Apóstol
  // de primeras en su pantalla de Seguimiento.
  const elegido = elegirLiderParaTarea(persona.liderAsignadoId, lideres, tareas).lider;
  if (!elegido) return null;

  await store.crearTarea({
    personaId: persona.id,
    personaNombre: persona.nombre,
    personaTelefono: persona.telefonoE164,
    liderId: elegido.id,
    liderNombre: elegido.nombre,
    tipo,
    estado: 'pendiente',
    vence: enDias(dias),
    creadaEn: new Date().toISOString(),
    completadaEn: null,
    nota: '',
    prioridad,
  });

  return elegido.nombre;
}

/**
 * Simula que la persona contestó por WhatsApp.
 * Devuelve un resumen de lo que ocurrió, para mostrárselo al líder.
 */
export async function simularRespuesta(opciones: {
  persona: Persona;
  respuesta: RespuestaSimulada;
  lideres: Usuario[];
  tareas: Tarea[];
}): Promise<string> {
  if (!MODO_DEMO) return 'El simulador solo existe en la demostración.';

  const { persona, respuesta, lideres, tareas } = opciones;
  const ahora = new Date().toISOString();

  // 1. El mensaje entra y abre la ventana de 24 horas.
  await store.agregarInteraccionLocal({
    personaId: persona.id,
    direccion: 'entrante',
    canal: 'whatsapp',
    texto: respuesta.texto,
    fecha: ahora,
  });

  const banderas = new Set<Bandera>(persona.banderas);
  const cambios: Partial<Persona> = {
    ultimoContacto: ahora,
    ventanaAbiertaHasta: enDias(1),
    sinRespuestaConsecutivos: 0,
  };

  let resumen = '';
  let textoRespuesta = '';

  // 2. Baja de la lista: manda sobre todo lo demás.
  if (coincide(respuesta.texto, BOTONES.bajaLista)) {
    cambios.banderas = ['No contactar'];
    textoRespuesta =
      'Listo, no volverás a recibir mensajes nuestros. Si alguna vez quieres retomar, escríbenos por aquí. Que Dios te bendiga.';
    resumen = `${primerNombre(persona.nombre)} quedó marcada como «No contactar». La app no le vuelve a escribir.`;
  }

  // 3. Botones de sí.
  else if (coincide(respuesta.texto, BOTONES.siOracion)) {
    banderas.add('Espera llamada de oración');
    cambios.banderas = Array.from(banderas);
    const quien = await crearTareaSi({
      persona,
      tipo: 'oracion',
      dias: 2,
      prioridad: 'normal',
      lideres,
      tareas,
    });
    textoRespuesta = `Con mucho gusto, ${primerNombre(persona.nombre)}. ¿Por qué motivo te gustaría que oráramos?`;
    resumen = quien
      ? `Bandera «Espera llamada de oración» puesta. Tarea de oración asignada a ${quien}.`
      : 'Bandera «Espera llamada de oración» puesta. Ya había una tarea pendiente.';
  } else if (coincide(respuesta.texto, BOTONES.siVisita)) {
    banderas.add('Espera visita');
    cambios.banderas = Array.from(banderas);
    const quien = await crearTareaSi({
      persona,
      tipo: 'visita',
      dias: 7,
      prioridad: 'normal',
      lideres,
      tareas,
    });
    textoRespuesta = `Qué bueno, ${primerNombre(persona.nombre)}. Un líder te escribe para acordar el día que a ti te sirva.`;
    resumen = quien
      ? `Bandera «Espera visita» puesta. Tarea de visita asignada a ${quien}.`
      : 'Bandera «Espera visita» puesta. Ya había una tarea pendiente.';
  } else if (coincide(respuesta.texto, BOTONES.noPorAhora)) {
    textoRespuesta = 'Con gusto. Aquí estamos cuando lo necesites.';
    resumen = 'Se registró la respuesta. No se creó ninguna tarea.';
  }

  // 4. Texto libre: lo lee el agente.
  else {
    const lectura = leerBasico(respuesta.texto);
    textoRespuesta = respuestaBasica(lectura);

    if (lectura.intencion === 'crisis' || lectura.urgencia === 'alta') {
      banderas.add('Espera llamada de oración');
      cambios.banderas = Array.from(banderas);
      cambios.motivoOracion = lectura.motivo || 'Mensaje con señales de riesgo';
      const quien = await crearTareaSi({
        persona,
        tipo: 'llamada',
        dias: 0,
        prioridad: 'urgente',
        lideres,
        tareas,
      });
      resumen = `CRISIS detectada. El agente no aconsejó: solo dijo que un pastor se comunica hoy, y creó una tarea urgente${quien ? ` para ${quien}` : ''} que vence hoy. El Apóstol la ve de primeras en Seguimiento.`;
    } else if (lectura.intencion === 'pide_oracion') {
        banderas.add('Espera llamada de oración');
      cambios.banderas = Array.from(banderas);
      cambios.motivoOracion = 'Su mamá está hospitalizada';
      const quien = await crearTareaSi({
        persona,
        tipo: 'oracion',
        dias: 2,
        prioridad: 'normal',
        lideres,
        tareas,
      });
      resumen = quien
        ? `El agente entendió que pide oración. Tarea asignada a ${quien}, y el motivo quedó en la ficha.`
        : 'El agente entendió que pide oración. Ya había una tarea pendiente.';
    } else if (lectura.intencion === 'acepta_visita') {
      banderas.add('Espera visita');
      cambios.banderas = Array.from(banderas);
      const quien = await crearTareaSi({
        persona,
        tipo: 'visita',
        dias: 7,
        prioridad: 'normal',
        lideres,
        tareas,
      });
      resumen = quien
        ? `El agente entendió que acepta la visita. Tarea asignada a ${quien}.`
        : 'El agente entendió que acepta la visita.';
    } else {
      resumen = `El agente lo leyó como «${lectura.intencion}». Se registró, sin crear tarea.`;
    }
  }

  await store.actualizarPersona(persona.id, cambios);

  // 5. La respuesta del agente, dentro de la ventana de 24 horas.
  if (textoRespuesta) {
    await store.agregarInteraccionLocal({
      personaId: persona.id,
      direccion: 'saliente',
      canal: 'whatsapp',
      texto: textoRespuesta,
      estado: 'enviado',
      fecha: new Date(Date.now() + 1000).toISOString(),
    });
  }

  return resumen;
}

function primerNombre(nombre: string): string {
  return (nombre ?? '').trim().split(/\s+/)[0] ?? '';
}
