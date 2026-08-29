// =====================================================================
//  Datos de ejemplo para el MODO DEMO.
//  Personas ficticias para poder recorrer toda la app sin configurar
//  nada. En cuanto conectes Firebase, estos datos desaparecen.
// =====================================================================

import type { Persona, Tarea, Usuario, Interaccion } from './types';

const hoy = new Date();
function haceDias(n: number): string {
  const d = new Date(hoy);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
function enDias(n: number): string {
  const d = new Date(hoy);
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

export const USUARIOS_DEMO: Usuario[] = [
  {
    id: 'demo-apostol',
    nombre: 'Pastor Ramos',
    telefono: '573001234567',
    rol: 'apostol',
    activo: true,
    capacidadSemanal: 10,
    creadoEn: haceDias(120),
  },
  {
    id: 'demo-lider-1',
    nombre: 'Carolina Méndez',
    telefono: '573112223344',
    rol: 'lider',
    activo: true,
    capacidadSemanal: 5,
    creadoEn: haceDias(90),
  },
  {
    id: 'demo-lider-2',
    nombre: 'Andrés Quiroga',
    telefono: '573123334455',
    rol: 'lider',
    activo: true,
    capacidadSemanal: 5,
    creadoEn: haceDias(60),
  },
  {
    id: 'demo-lider-3',
    nombre: 'Diana Osorio',
    rol: 'lider',
    activo: true,
    capacidadSemanal: 5,
    telefono: '573145556677',
    creadoEn: haceDias(2),
  },
];

interface SemillaPersona {
  nombre: string;
  tel: string;
  etapa: Persona['etapa'];
  banderas: Persona['banderas'];
  origen: Persona['origen'];
  lider: string;
  dias: number;
  ultimo: number | null;
  motivo?: string;
}

const SEMILLAS: SemillaPersona[] = [
  { nombre: 'María Fernanda Ríos', tel: '573001112233', etapa: 'Nuevo', banderas: ['Espera llamada de oración'], origen: 'Servicio dominical', lider: 'demo-lider-1', dias: 3, ultimo: 3, motivo: 'Su mamá está enferma' },
  { nombre: 'Jorge Alberto Peña', tel: '573012223344', etapa: 'Nuevo', banderas: [], origen: 'Invitación de un miembro', lider: 'demo-lider-2', dias: 1, ultimo: 1 },
  { nombre: 'Luz Dary Camacho', tel: '573023334455', etapa: 'Contactado', banderas: ['Espera visita'], origen: 'Servicio dominical', lider: 'demo-lider-1', dias: 11, ultimo: 1 },
  { nombre: 'Wilson Gutiérrez', tel: '573034445566', etapa: 'Contactado', banderas: ['Sin respuesta'], origen: 'Redes sociales', lider: 'demo-lider-2', dias: 14, ultimo: 12 },
  { nombre: 'Sandra Milena Ospina', tel: '573045556677', etapa: 'En seguimiento', banderas: ['Espera llamada de oración'], origen: 'Célula o grupo', lider: 'demo-lider-1', dias: 20, ultimo: 2, motivo: 'Está buscando trabajo' },
  { nombre: 'Héctor Fabio Zapata', tel: '573056667788', etapa: 'En seguimiento', banderas: [], origen: 'Escribió por WhatsApp', lider: 'demo-lider-2', dias: 25, ultimo: 4 },
  { nombre: 'Yenny Paola Cárdenas', tel: '573067778899', etapa: 'Visitado', banderas: [], origen: 'Servicio dominical', lider: 'demo-lider-1', dias: 38, ultimo: 5 },
  { nombre: 'Óscar Iván Bedoya', tel: '573078889900', etapa: 'Visitado', banderas: [], origen: 'Invitación de un miembro', lider: 'demo-lider-2', dias: 45, ultimo: 7 },
  { nombre: 'Rosa Elena Marín', tel: '573089990011', etapa: 'Consolidado', banderas: [], origen: 'Servicio dominical', lider: 'demo-lider-1', dias: 90, ultimo: 6 },
  { nombre: 'Camilo Andrés Rueda', tel: '573090001122', etapa: 'Consolidado', banderas: ['Espera visita'], origen: 'Célula o grupo', lider: 'demo-lider-2', dias: 110, ultimo: 3 },
  { nombre: 'Gloria Patricia Vélez', tel: '573101112244', etapa: 'Discípulo', banderas: [], origen: 'Servicio dominical', lider: 'demo-lider-1', dias: 200, ultimo: 8 },
  { nombre: 'Néstor Julio Ariza', tel: '573112223355', etapa: 'Nuevo', banderas: ['No contactar'], origen: 'Redes sociales', lider: 'demo-lider-2', dias: 6, ultimo: 5 },
];

export const PERSONAS_DEMO: Persona[] = SEMILLAS.map((s, i) => ({
  id: `demo-p-${i + 1}`,
  nombre: s.nombre,
  telefonoE164: s.tel,
  etapa: s.etapa,
  banderas: s.banderas,
  origen: s.origen,
  liderAsignadoId: s.lider,
  liderAsignadoNombre: USUARIOS_DEMO.find((u) => u.id === s.lider)?.nombre ?? null,
  consentimiento: {
    otorgado: true,
    fecha: haceDias(s.dias),
    medio: 'Formulario de bienvenida firmado',
    registradoPorUid: s.lider,
  },
  notas: '',
  motivoOracion: s.motivo,
  fechaIngreso: haceDias(s.dias),
  ultimoContacto: s.ultimo === null ? null : haceDias(s.ultimo),
  ventanaAbiertaHasta: s.ultimo !== null && s.ultimo < 1 ? enDias(1) : null,
  sinRespuestaConsecutivos: s.banderas.includes('Sin respuesta') ? 3 : 0,
  pasosEnviados: s.dias >= 21 ? ['dia0', 'dia3', 'dia10', 'dia21'] : s.dias >= 10 ? ['dia0', 'dia3', 'dia10'] : s.dias >= 3 ? ['dia0', 'dia3'] : ['dia0'],
  creadoPorUid: s.lider,
}));

export const TAREAS_DEMO: Tarea[] = [
  {
    id: 'demo-t-1',
    personaId: 'demo-p-1',
    personaNombre: 'María Fernanda Ríos',
    personaTelefono: '573001112233',
    liderId: 'demo-lider-1',
    liderNombre: 'Carolina Méndez',
    tipo: 'oracion',
    estado: 'pendiente',
    vence: enDias(1),
    creadaEn: haceDias(1),
    completadaEn: null,
    nota: '',
    prioridad: 'normal',
  },
  {
    id: 'demo-t-2',
    personaId: 'demo-p-3',
    personaNombre: 'Luz Dary Camacho',
    personaTelefono: '573023334455',
    liderId: 'demo-lider-1',
    liderNombre: 'Carolina Méndez',
    tipo: 'visita',
    estado: 'pendiente',
    vence: haceDias(2),
    creadaEn: haceDias(9),
    completadaEn: null,
    nota: '',
    prioridad: 'normal',
  },
  {
    id: 'demo-t-3',
    personaId: 'demo-p-5',
    personaNombre: 'Sandra Milena Ospina',
    personaTelefono: '573045556677',
    liderId: 'demo-lider-1',
    liderNombre: 'Carolina Méndez',
    tipo: 'oracion',
    estado: 'pendiente',
    vence: enDias(2),
    creadaEn: haceDias(0),
    completadaEn: null,
    nota: '',
    prioridad: 'normal',
  },
  {
    id: 'demo-t-4',
    personaId: 'demo-p-10',
    personaNombre: 'Camilo Andrés Rueda',
    personaTelefono: '573090001122',
    liderId: 'demo-lider-2',
    liderNombre: 'Andrés Quiroga',
    tipo: 'visita',
    estado: 'pendiente',
    vence: enDias(4),
    creadaEn: haceDias(3),
    completadaEn: null,
    nota: '',
    prioridad: 'normal',
  },
  {
    id: 'demo-t-5',
    personaId: 'demo-p-7',
    personaNombre: 'Yenny Paola Cárdenas',
    personaTelefono: '573067778899',
    liderId: 'demo-lider-1',
    liderNombre: 'Carolina Méndez',
    tipo: 'visita',
    estado: 'hecha',
    vence: haceDias(6),
    creadaEn: haceDias(12),
    completadaEn: haceDias(5),
    nota: 'La visitamos con su esposo. Muy receptiva, quedó de venir el domingo.',
    prioridad: 'normal',
  },
  {
    id: 'demo-t-6',
    personaId: 'demo-p-8',
    personaNombre: 'Óscar Iván Bedoya',
    personaTelefono: '573078889900',
    liderId: 'demo-lider-2',
    liderNombre: 'Andrés Quiroga',
    tipo: 'oracion',
    estado: 'hecha',
    vence: haceDias(8),
    creadaEn: haceDias(10),
    completadaEn: haceDias(8),
    nota: 'Conversamos 20 minutos. Pidió oración por su hijo.',
    prioridad: 'normal',
  },
  {
    id: 'demo-t-7',
    personaId: 'demo-p-9',
    personaNombre: 'Rosa Elena Marín',
    personaTelefono: '573089990011',
    liderId: 'demo-lider-1',
    liderNombre: 'Carolina Méndez',
    tipo: 'oracion',
    estado: 'hecha',
    vence: haceDias(5),
    creadaEn: haceDias(7),
    completadaEn: haceDias(6),
    nota: 'Oramos juntas por teléfono. Está mucho más animada.',
    prioridad: 'normal',
  },
];

export const INTERACCIONES_DEMO: Interaccion[] = [
  { id: 'demo-i-1', personaId: 'demo-p-1', direccion: 'saliente', canal: 'whatsapp', plantilla: 'oasis_bienvenida', texto: 'Hola María Fernanda, qué alegría que nos visitaras en el Centro de Alabanza Oasis...', estado: 'entregado', fecha: haceDias(3) },
  { id: 'demo-i-2', personaId: 'demo-p-1', direccion: 'saliente', canal: 'whatsapp', plantilla: 'oasis_oracion', texto: 'Hola María Fernanda, esta semana nuestro equipo está orando por las personas de la iglesia...', estado: 'leido', fecha: haceDias(1) },
  { id: 'demo-i-3', personaId: 'demo-p-1', direccion: 'entrante', canal: 'whatsapp', texto: 'Sí, oren por mí', fecha: haceDias(1) },
  { id: 'demo-i-4', personaId: 'demo-p-1', direccion: 'saliente', canal: 'whatsapp', texto: '¿Por qué motivo te gustaría que oráramos, María Fernanda?', estado: 'leido', fecha: haceDias(1) },
  { id: 'demo-i-5', personaId: 'demo-p-1', direccion: 'entrante', canal: 'whatsapp', texto: 'Por mi mamá que está enferma, lleva dos semanas hospitalizada', fecha: haceDias(1) },
  { id: 'demo-i-6', personaId: 'demo-p-1', direccion: 'saliente', canal: 'whatsapp', texto: 'Gracias por confiarnos algo tan importante. Estaremos orando por la salud de tu mamá, y un líder te va a llamar en estos días.', estado: 'entregado', fecha: haceDias(1) },
  { id: 'demo-i-7', personaId: 'demo-p-3', direccion: 'saliente', canal: 'whatsapp', plantilla: 'oasis_visita', texto: 'Hola Luz Dary, uno de nuestros líderes puede pasar a saludarte...', estado: 'leido', fecha: haceDias(1) },
  { id: 'demo-i-8', personaId: 'demo-p-3', direccion: 'entrante', canal: 'whatsapp', texto: 'Sí, con gusto', fecha: haceDias(1) },
];
