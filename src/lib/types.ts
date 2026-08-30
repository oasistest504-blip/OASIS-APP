export type Etapa =
  | 'Nuevo'
  | 'Contactado'
  | 'En seguimiento'
  | 'Visitado'
  | 'Consolidado'
  | 'Discípulo';

export const ETAPAS: Etapa[] = [
  'Nuevo',
  'Contactado',
  'En seguimiento',
  'Visitado',
  'Consolidado',
  'Discípulo',
];

export const ETAPA_PLURAL: Record<Etapa, string> = {
  Nuevo: 'Nuevos',
  Contactado: 'Contactados',
  'En seguimiento': 'En seguimiento',
  Visitado: 'Visitados',
  Consolidado: 'Consolidados',
  Discípulo: 'Discípulos',
};

export type Bandera =
  | 'Espera llamada de oración'
  | 'Espera visita'
  | 'Sin respuesta'
  | 'No contactar';

export const BANDERAS: Bandera[] = [
  'Espera llamada de oración',
  'Espera visita',
  'Sin respuesta',
  'No contactar',
];

export type TipoTarea = 'llamada' | 'visita' | 'oracion' | 'especial';
export type PrioridadTarea = 'normal' | 'urgente';
export type EstadoTarea = 'pendiente' | 'hecha' | 'cancelada';

export const TIPO_TAREA_LABEL: Record<TipoTarea, string> = {
  llamada: 'Llamada',
  visita: 'Visita',
  oracion: 'Oración',
  especial: 'Encargo del Apóstol',
};

export const TIPO_TAREA_ACCION: Record<TipoTarea, string> = {
  llamada: 'Llamar',
  visita: 'Visitar',
  oracion: 'Orar y llamar',
  especial: 'Encargo del Apóstol',
};

export const ORIGENES = [
  'Servicio dominical',
  'Invitación de un miembro',
  'Célula o grupo',
  'Redes sociales',
  'Escribió por WhatsApp',
  'Otro',
] as const;

export const MEDIOS_CONSENTIMIENTO = [
  'Formulario de bienvenida firmado',
  'Autorización verbal ante el líder',
  'Escribió primero por WhatsApp',
  'Formulario en línea',
] as const;

export type Rol = 'apostol' | 'lider';

export interface Usuario {
  id: string;
  nombre: string;
  telefono?: string;
  rol: Rol;
  activo: boolean;
  capacidadSemanal: number;
  creadoEn: string;
}

export interface Consentimiento {
  otorgado: boolean;
  fecha: string;
  medio: string;
  registradoPorUid: string;
}

export interface Persona {
  id: string;
  nombre: string;
  telefonoE164: string;
  etapa: Etapa;
  banderas: Bandera[];
  origen: string;
  liderAsignadoId: string | null;
  liderAsignadoNombre: string | null;
  consentimiento?: Consentimiento;
  notas: string;
  motivoOracion?: string | null;
  fechaIngreso: string;
  ultimoContacto: string | null;
  ventanaAbiertaHasta: string | null;
  sinRespuestaConsecutivos: number;
  pasosEnviados: string[];
  creadoPorUid: string;
}

export interface Tarea {
  id: string;
  personaId: string;
  personaNombre: string;
  personaTelefono?: string;
  liderId: string;
  liderNombre: string;
  tipo: TipoTarea;
  prioridad: PrioridadTarea;
  titulo?: string;
  detalle?: string;
  vence: string;
  estado: EstadoTarea;
  creadaEn: string;
  completadaEn?: string | null;
  nota?: string;
  asignadaPor?: string;
  leidaEn?: string | null;
}

export interface Interaccion {
  id: string;
  personaId: string;
  direccion: 'entrante' | 'saliente';
  canal: 'whatsapp' | 'manual' | 'llamada' | 'visita';
  plantilla?: string | null;
  texto: string;
  estado?: 'enviado' | 'entregado' | 'leido' | 'fallido' | null;
  fecha: string;
}

export interface Difusion {
  id: string;
  plantilla: string;
  grupo: string;
  totalDestinatarios: number;
  totalEnviados: number;
  totalFallidos: number;
  enviadoPorUid: string;
  enviadoPorNombre: string;
  fecha: string;
}

export interface RegistroAuditoria {
  id: string;
  uid: string;
  nombre: string;
  accion: string;
  objetivo: string;
  detalle?: string;
  fecha: string;
}

export interface Configuracion {
  claveLideres: string;
  claveApostol: string;
  nombreIglesia: string;
}

export interface LecturaAgente {
  intencion:
    | 'crisis'
    | 'pide_oracion'
    | 'acepta_visita'
    | 'pregunta_horarios'
    | 'rechaza'
    | 'agradece'
    | 'otro';
  motivo: string;
  urgencia: 'alta' | 'media' | 'baja';
}
