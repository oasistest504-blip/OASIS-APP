// =====================================================================
//  Modelo de datos de Oasis Seguimiento
//  Este archivo lo usan tanto el navegador como el servidor, para que
//  los dos hablen exactamente del mismo idioma.
// =====================================================================

/** Los dos únicos roles que existen en la app. */
export type Rol = 'apostol' | 'lider';

/**
 * La etapa dice DÓNDE VA la persona en el camino. Cada persona tiene
 * una sola, y avanza en este orden.
 */
export const ETAPAS = [
  'Nuevo',
  'Contactado',
  'En seguimiento',
  'Visitado',
  'Consolidado',
  'Discípulo',
] as const;
export type Etapa = (typeof ETAPAS)[number];

/**
 * La etapa en plural.
 *
 * En la ficha de una persona la etapa la describe a ella y va en
 * singular: «María es Nueva». Pero donde se cuentan personas —el gráfico
 * del panel, los grupos de difusión— la etiqueta nombra a un grupo y
 * tiene que ir en plural: «Nuevos: 3», no «Nuevo: 3».
 */
export const ETAPA_PLURAL: Record<Etapa, string> = {
  Nuevo: 'Nuevos',
  Contactado: 'Contactados',
  'En seguimiento': 'En seguimiento',
  Visitado: 'Visitados',
  Consolidado: 'Consolidados',
  Discípulo: 'Discípulos',
};

/**
 * Las banderas dicen QUÉ NECESITA la persona ahora mismo. Puede tener
 * varias a la vez, o ninguna.
 */
export const BANDERAS = [
  'Espera llamada de oración',
  'Espera visita',
  'Sin respuesta',
  'No contactar',
] as const;
export type Bandera = (typeof BANDERAS)[number];

/**
 * Tipos de tarea que un líder puede tener asignada.
 *
 * Las tres primeras nacen del seguimiento y van pegadas a una persona.
 * La "especial" la escribe el Apóstol a mano y puede ser cualquier cosa:
 * preparar el encuentro de nuevos, pasar por la papelería, llamar a los
 * de la célula del norte. Esas no tienen persona asociada.
 */
export type TipoTarea = 'llamada' | 'visita' | 'oracion' | 'especial';
export type EstadoTarea = 'pendiente' | 'hecha' | 'cancelada';

/** Cómo se llama cada tarea en pantalla. */
export const NOMBRE_TAREA: Record<TipoTarea, string> = {
  llamada: 'Llamada',
  visita: 'Visita',
  oracion: 'Oración',
  especial: 'Encargo del Apóstol',
};

/** El verbo, para el botón: "Llamar a María". */
export const VERBO_TAREA: Record<TipoTarea, string> = {
  llamada: 'Llamar',
  visita: 'Visitar',
  oracion: 'Orar y llamar',
  especial: 'Encargo del Apóstol',
};

/** Cómo llegó la persona a la iglesia. */
export const ORIGENES = [
  'Servicio dominical',
  'Invitación de un miembro',
  'Célula o grupo',
  'Redes sociales',
  'Escribió por WhatsApp',
  'Otro',
] as const;
export type Origen = (typeof ORIGENES)[number];

/** Un líder o el Apóstol. El documento vive en la colección `usuarios`. */
export interface Usuario {
  id: string;
  nombre: string;
  /** Opcional: no hay cuentas de correo, se entra con la clave de la iglesia. */
  correo?: string;
  rol: Rol;
  /** El Apóstol puede desactivar a alguien sin borrar su historial. */
  activo: boolean;
  /** Cuántas tareas pendientes puede tener al mismo tiempo. */
  capacidadSemanal: number;
  telefono?: string;
  creadoEn: string; // ISO
}

/** El registro del permiso que la persona dio para recibir mensajes. */
export interface Consentimiento {
  otorgado: boolean;
  fecha: string | null; // ISO
  /** Cómo lo dio: papelito firmado, verbal ante el líder, formulario web… */
  medio: string;
  /** Quién lo registró. */
  registradoPorUid: string;
}

/** Una persona en seguimiento. Colección `personas`. */
export interface Persona {
  id: string;
  nombre: string;
  /** SIEMPRE en formato internacional sin signos: 573001234567 */
  telefonoE164: string;
  etapa: Etapa;
  banderas: Bandera[];
  origen: Origen;
  liderAsignadoId: string | null;
  liderAsignadoNombre?: string | null;
  consentimiento: Consentimiento;
  notas: string;
  /** Motivo de oración que la persona compartió, si lo hizo. Es dato sensible. */
  motivoOracion?: string;
  fechaIngreso: string; // ISO
  ultimoContacto: string | null; // ISO
  /** Hasta cuándo se le puede escribir texto libre sin plantilla. */
  ventanaAbiertaHasta: string | null; // ISO
  /** Cuántos mensajes automáticos seguidos lleva sin responder. */
  sinRespuestaConsecutivos: number;
  /** Qué pasos de la secuencia automática ya se enviaron: ['dia0','dia3'…] */
  pasosEnviados: string[];
  creadoPorUid: string;
}

/** Una tarea asignada a un líder. Colección `tareas`. */
export interface Tarea {
  id: string;
  /** Vacío en los encargos del Apóstol, que no van pegados a nadie. */
  personaId: string;
  personaNombre: string;
  personaTelefono: string;
  liderId: string;
  liderNombre: string;
  tipo: TipoTarea;
  estado: EstadoTarea;
  vence: string; // ISO
  creadaEn: string; // ISO
  completadaEn: string | null;
  nota: string;
  /** Las tareas de crisis se muestran de primeras y en rojo. */
  prioridad: 'normal' | 'urgente';
  /** Lo que el Apóstol escribió, solo en los encargos. */
  titulo?: string;
  /** Quién lo mandó, solo en los encargos. */
  asignadaPor?: string;
  /**
   * Cuándo el líder la vio por primera vez. Mientras sea null, la app
   * la muestra como aviso nuevo arriba de todo.
   */
  leidaEn?: string | null;
}

/** Cada mensaje que entró o salió. Colección `interacciones`. */
export interface Interaccion {
  id: string;
  personaId: string;
  direccion: 'saliente' | 'entrante';
  canal: 'whatsapp' | 'manual' | 'sistema';
  /** Nombre de la plantilla de Meta, si aplica. */
  plantilla?: string;
  texto: string;
  /** El id que devuelve Meta, para rastrear la entrega. */
  mensajeIdMeta?: string;
  estado?: 'enviado' | 'entregado' | 'leido' | 'fallido' | 'omitido';
  error?: string;
  fecha: string; // ISO
}

/** Un envío masivo hecho por el Apóstol. Colección `difusiones`. */
export interface Difusion {
  id: string;
  autorId: string;
  autorNombre: string;
  etapas: Etapa[];
  banderas: Bandera[];
  tipo: 'texto' | 'imagen' | 'video';
  plantilla: string;
  texto: string;
  urlMedia?: string;
  destinatarios: number;
  excluidos: number;
  enviados: number;
  fallidos: number;
  estado: 'borrador' | 'programada' | 'enviando' | 'completada';
  programadaPara: string | null;
  creadaEn: string;
}

/** Quién cambió qué. Colección `auditoria`. */
export interface RegistroAuditoria {
  id: string;
  uid: string;
  nombre: string;
  accion: string;
  objetivo: string;
  detalle: string;
  fecha: string;
}

/** Lo que el agente de Gemini devuelve al leer un mensaje. */
export interface LecturaAgente {
  intencion:
    | 'pide_oracion'
    | 'acepta_visita'
    | 'rechaza'
    | 'pregunta_horarios'
    | 'agradece'
    | 'crisis'
    | 'otro';
  motivo: string;
  urgencia: 'alta' | 'media' | 'baja';
}


/**
 * Las dos contraseñas de la iglesia.
 *
 * - claveLideres: la que se les da a los líderes para entrar.
 * - claveApostol: la del Apóstol. Además de entrar, abre el panel
 *   privado donde se agregan y se quitan líderes.
 *
 * Vive en la colección `configuracion`, documento `acceso`.
 */
export interface Configuracion {
  claveLideres: string;
  claveApostol: string;
  nombreIglesia: string;
}
