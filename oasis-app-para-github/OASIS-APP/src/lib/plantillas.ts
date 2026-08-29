// =====================================================================
//  Las plantillas de WhatsApp aprobadas por Meta.
//
//  IMPORTANTE: los nombres de aquí (`nombre`) deben coincidir EXACTAMENTE
//  con los nombres de las plantillas que creaste en el Administrador de
//  WhatsApp dentro de Meta Business. Si no coinciden, Meta rechaza el
//  envío con el error 132001.
// =====================================================================

import type { Etapa } from './types';

export interface PlantillaWhatsApp {
  /** Nombre exacto registrado en Meta. */
  nombre: string;
  /** Categoría con la que la registraste. Define el precio. */
  categoria: 'utility' | 'marketing';
  /** Idioma registrado en Meta. */
  idioma: string;
  /** Qué es cada {{1}}, {{2}}… en orden. */
  variables: string[];
  /** Texto de referencia, para mostrar la vista previa en la app. */
  vistaPrevia: string;
  /** Botones de respuesta rápida, en el mismo orden que en Meta. */
  botones: string[];
  descripcion: string;
}

export const PLANTILLAS: Record<string, PlantillaWhatsApp> = {
  oasis_bienvenida: {
    nombre: 'oasis_bienvenida',
    categoria: 'utility',
    idioma: 'es',
    variables: ['nombre de la persona'],
    vistaPrevia:
      'Hola {{1}}, qué alegría que nos visitaras en el Centro de Alabanza Oasis. Somos el equipo de acompañamiento y queremos estar pendientes de ti. Si en algún momento necesitas oración o quieres saber de nuestras reuniones, escríbenos por aquí con confianza.',
    botones: ['No deseo recibir más mensajes'],
    descripcion: 'Se envía el mismo día del registro.',
  },
  oasis_oracion: {
    nombre: 'oasis_oracion',
    categoria: 'utility',
    idioma: 'es',
    variables: ['nombre de la persona'],
    vistaPrevia:
      'Hola {{1}}, esta semana nuestro equipo está orando por las personas de la iglesia. ¿Te gustaría que oráramos por ti por algo en particular?',
    botones: ['Sí, oren por mí', 'Ahora no', 'No deseo recibir más'],
    descripcion: 'Se envía 3 días después del registro.',
  },
  oasis_visita: {
    nombre: 'oasis_visita',
    categoria: 'utility',
    idioma: 'es',
    variables: ['nombre de la persona'],
    vistaPrevia:
      'Hola {{1}}, uno de nuestros líderes puede pasar a saludarte y orar contigo en tu casa, el día que a ti te quede bien. ¿Te gustaría recibir esa visita?',
    botones: ['Sí, con gusto', 'Ahora no', 'No deseo recibir más'],
    descripcion: 'Se envía 10 días después del registro.',
  },
  oasis_encuentro: {
    nombre: 'oasis_encuentro',
    categoria: 'utility',
    idioma: 'es',
    variables: ['nombre de la persona', 'fecha del encuentro'],
    vistaPrevia:
      'Hola {{1}}, el {{2}} tenemos nuestro encuentro para personas nuevas. Nos encantaría verte allí y presentarte a la familia de la iglesia.',
    botones: ['Allá estaré', 'Esta vez no puedo', 'No deseo recibir más'],
    descripcion: 'Se envía 21 días después del registro.',
  },
  oasis_tarea_lider: {
    nombre: 'oasis_tarea_lider',
    categoria: 'utility',
    idioma: 'es',
    variables: ['nombre del líder', 'el encargo'],
    vistaPrevia:
      '{{1}}, el Apóstol te dejó un encargo en Oasis Seguimiento: {{2}}. Puedes verlo y marcarlo como hecho desde la app.',
    botones: [],
    descripcion: 'Le avisa a un líder que tiene un encargo nuevo.',
  },
  oasis_palabra: {
    nombre: 'oasis_palabra',
    categoria: 'marketing',
    idioma: 'es',
    variables: ['nombre de la persona', 'título de la palabra'],
    vistaPrevia:
      '{{1}}, te compartimos la palabra de esta semana: {{2}}. Que sea de bendición para tu vida.',
    botones: ['No deseo recibir más'],
    descripcion: 'La usa el Apóstol para difundir. Admite video o imagen.',
  },
};

/** Los pasos automáticos, en días desde el registro. */
export interface PasoSecuencia {
  clave: string;
  diasDesdeIngreso: number;
  plantilla: string;
  /** Solo se envía si la persona está en alguna de estas etapas. */
  etapasValidas: Etapa[];
}

export const SECUENCIA: PasoSecuencia[] = [
  {
    clave: 'dia0',
    diasDesdeIngreso: 0,
    plantilla: 'oasis_bienvenida',
    etapasValidas: ['Nuevo'],
  },
  {
    clave: 'dia3',
    diasDesdeIngreso: 3,
    plantilla: 'oasis_oracion',
    etapasValidas: ['Nuevo', 'Contactado', 'En seguimiento'],
  },
  {
    clave: 'dia10',
    diasDesdeIngreso: 10,
    plantilla: 'oasis_visita',
    etapasValidas: ['Contactado', 'En seguimiento'],
  },
  {
    clave: 'dia21',
    diasDesdeIngreso: 21,
    plantilla: 'oasis_encuentro',
    etapasValidas: ['Contactado', 'En seguimiento', 'Visitado'],
  },
];

/**
 * Los textos exactos de los botones que significan "sí" o "no".
 * El webhook los compara con esto para saber qué bandera poner.
 */
export const BOTONES = {
  siOracion: ['sí, oren por mí', 'si, oren por mi', 'sí oren por mí'],
  siVisita: ['sí, con gusto', 'si, con gusto', 'sí con gusto'],
  noPorAhora: ['ahora no', 'esta vez no puedo'],
  bajaLista: ['no deseo recibir más', 'no deseo recibir mas', 'no deseo recibir más mensajes'],
  asistira: ['allá estaré', 'alla estare'],
};

/** Precios de referencia en Colombia, en dólares por mensaje entregado. */
export const PRECIO_USD = {
  utility: 0.0008,
  marketing: 0.0125,
};
