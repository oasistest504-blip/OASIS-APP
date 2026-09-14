// =====================================================================
//  Juego de datos ficticios para pruebas de la aplicación (Modo Prueba).
//  Todos los registros llevan esPrueba: true, nombres con terminación (prueba)
//  y teléfonos que inician por +57 300 000 seguido de números correlativos.
// =====================================================================

import type {
  Usuario,
  Persona,
  Tarea,
  Interaccion,
} from './types';

/**
 * Genera una fecha ISO calculada de forma dinámica a partir del momento actual.
 * @param dias Desplazamiento en días (positivo para el futuro, negativo para el pasado, 0 para hoy)
 * @param horas Desplazamiento adicional en horas
 */
export function diasRelativos(dias: number, horas: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setHours(d.getHours() + horas);
  return d.toISOString();
}

/**
 * Genera una fecha ISO calculada de forma dinámica para una ventana de horas.
 * @param horas Desplazamiento en horas a partir de ahora
 */
export function horasRelativas(horas: number): string {
  const d = new Date();
  d.setHours(d.getHours() + horas);
  return d.toISOString();
}

// ---------------------------------------------------------------------
// 1. USUARIOS (5 Líderes con cargas diversas + 1 Apóstol)
// ---------------------------------------------------------------------
export const USUARIOS_PRUEBA: Usuario[] = [
  {
    id: 'usr-prueba-apostol',
    nombre: 'Pastor Pedro Ramos (prueba)',
    telefono: '+57 300 000 0006',
    rol: 'apostol',
    activo: true,
    capacidadSemanal: 10,
    creadoEn: diasRelativos(-90),
    esPrueba: true,
  },
  {
    // Líder sobrecargado: 6 personas asignadas con capacidad de 5
    id: 'usr-prueba-lider-1',
    nombre: 'Carlos Gómez (prueba)',
    telefono: '+57 300 000 0001',
    rol: 'lider',
    activo: true,
    capacidadSemanal: 5,
    creadoEn: diasRelativos(-60),
    esPrueba: true,
  },
  {
    // Líder con 4 personas asignadas
    id: 'usr-prueba-lider-2',
    nombre: 'Marta Lucía (prueba)',
    telefono: '+57 300 000 0002',
    rol: 'lider',
    activo: true,
    capacidadSemanal: 5,
    creadoEn: diasRelativos(-45),
    esPrueba: true,
  },
  {
    // Líder con 2 personas asignadas
    id: 'usr-prueba-lider-3',
    nombre: 'David Torres (prueba)',
    telefono: '+57 300 000 0003',
    rol: 'lider',
    activo: true,
    capacidadSemanal: 5,
    creadoEn: diasRelativos(-30),
    esPrueba: true,
  },
  {
    // Líder con 1 persona asignada
    id: 'usr-prueba-lider-4',
    nombre: 'Sara Morales (prueba)',
    telefono: '+57 300 000 0004',
    rol: 'lider',
    activo: true,
    capacidadSemanal: 5,
    creadoEn: diasRelativos(-20),
    esPrueba: true,
  },
  {
    // Líder con 0 personas asignadas (ninguna)
    id: 'usr-prueba-lider-5',
    nombre: 'Felipe Ríos (prueba)',
    telefono: '+57 300 000 0005',
    rol: 'lider',
    activo: true,
    capacidadSemanal: 5,
    creadoEn: diasRelativos(-10),
    esPrueba: true,
  },
];

// ---------------------------------------------------------------------
// 2. PERSONAS (16 registros representativos)
// ---------------------------------------------------------------------
export const PERSONAS_PRUEBA: Persona[] = [
  // --- Asignadas a Carlos Gómez (prueba) (Total: 6 personas -> Sobrecargado) ---
  {
    id: 'per-prueba-01',
    nombre: 'Andrés Felipe Mejía (prueba)',
    telefonoE164: '+57 300 000 0011',
    etapa: 'Nuevo',
    // Tiene dos banderas al mismo tiempo
    banderas: ['Espera llamada de oración', 'Espera visita'],
    origen: 'Servicio dominical',
    liderAsignadoId: 'usr-prueba-lider-1',
    liderAsignadoNombre: 'Carlos Gómez (prueba)',
    consentimiento: {
      otorgado: true,
      fecha: diasRelativos(-2),
      medio: 'Formulario de bienvenida firmado',
      registradoPorUid: 'usr-prueba-lider-1',
    },
    notas: 'Llegó por primera vez el domingo acompañado de su familia.',
    motivoOracion: 'Por salud de su hija menor que tiene quebrantos.',
    fechaIngreso: diasRelativos(-2),
    ultimoContacto: diasRelativos(0), // hoy
    ventanaAbiertaHasta: horasRelativas(20), // ventana de 24h abierta
    sinRespuestaConsecutivos: 0,
    pasosEnviados: ['dia0'], // solo día 0
    creadoPorUid: 'usr-prueba-lider-1',
    esPrueba: true,
  },
  {
    id: 'per-prueba-02',
    nombre: 'Claudia Patricia Ruiz (prueba)',
    telefonoE164: '+57 300 000 0012',
    etapa: 'Nuevo',
    banderas: ['Espera llamada de oración'],
    origen: 'Invitación de un miembro',
    liderAsignadoId: 'usr-prueba-lider-1',
    liderAsignadoNombre: 'Carlos Gómez (prueba)',
    consentimiento: {
      otorgado: true,
      fecha: diasRelativos(-4),
      medio: 'Autorización verbal ante el líder',
      registradoPorUid: 'usr-prueba-lider-1',
    },
    notas: 'Vecina invitada por doña Carmen.',
    motivoOracion: 'Por empleo y estabilidad laboral.',
    fechaIngreso: diasRelativos(-4),
    ultimoContacto: diasRelativos(0), // hoy
    ventanaAbiertaHasta: horasRelativas(14), // ventana de 24h abierta
    sinRespuestaConsecutivos: 0,
    pasosEnviados: ['dia0', 'dia3'], // día 0 y 3
    creadoPorUid: 'usr-prueba-lider-1',
    esPrueba: true,
  },
  {
    id: 'per-prueba-03',
    nombre: 'Daniel Alejandro Soto (prueba)',
    telefonoE164: '+57 300 000 0013',
    etapa: 'Nuevo',
    banderas: ['Espera visita'],
    origen: 'Célula o grupo',
    liderAsignadoId: 'usr-prueba-lider-1',
    liderAsignadoNombre: 'Carlos Gómez (prueba)',
    consentimiento: {
      otorgado: true,
      fecha: diasRelativos(-8),
      medio: 'Formulario en línea',
      registradoPorUid: 'usr-prueba-lider-1',
    },
    notas: 'Desea que lo visiten en su negocio para orar por la inauguración.',
    motivoOracion: 'Apertura de nuevo emprendimiento familiar.',
    fechaIngreso: diasRelativos(-8),
    ultimoContacto: diasRelativos(-5), // hace 5 días
    ventanaAbiertaHasta: null,
    sinRespuestaConsecutivos: 0,
    pasosEnviados: ['dia0', 'dia3', 'dia10'], // día 0, 3 y 10
    creadoPorUid: 'usr-prueba-lider-1',
    esPrueba: true,
  },
  {
    id: 'per-prueba-04',
    nombre: 'Elena Marcela Castro (prueba)',
    telefonoE164: '+57 300 000 0014',
    etapa: 'Nuevo',
    banderas: ['Sin respuesta'],
    origen: 'Redes sociales',
    liderAsignadoId: 'usr-prueba-lider-1',
    liderAsignadoNombre: 'Carlos Gómez (prueba)',
    consentimiento: {
      otorgado: true,
      fecha: diasRelativos(-12),
      medio: 'Escribió primero por WhatsApp',
      registradoPorUid: 'usr-prueba-lider-1',
    },
    notas: 'Vio transmisión de Instagram y solicitó información.',
    motivoOracion: null,
    fechaIngreso: diasRelativos(-12),
    ultimoContacto: diasRelativos(-5), // hace 5 días
    ventanaAbiertaHasta: null,
    sinRespuestaConsecutivos: 1, // contador en 1
    pasosEnviados: ['dia0'],
    creadoPorUid: 'usr-prueba-lider-1',
    esPrueba: true,
  },
  {
    id: 'per-prueba-05',
    nombre: 'Fernando José Herrera (prueba)',
    telefonoE164: '+57 300 000 0015',
    etapa: 'Nuevo',
    banderas: ['Sin respuesta'],
    origen: 'Escribió por WhatsApp',
    liderAsignadoId: 'usr-prueba-lider-1',
    liderAsignadoNombre: 'Carlos Gómez (prueba)',
    consentimiento: {
      otorgado: true,
      fecha: diasRelativos(-16),
      medio: 'Escribió primero por WhatsApp',
      registradoPorUid: 'usr-prueba-lider-1',
    },
    notas: 'Escribió preguntando horarios de la reunión juvenil.',
    motivoOracion: null,
    fechaIngreso: diasRelativos(-16),
    ultimoContacto: diasRelativos(-30), // hace 30 días
    ventanaAbiertaHasta: null,
    sinRespuestaConsecutivos: 2, // contador en 2
    pasosEnviados: ['dia0', 'dia3'],
    creadoPorUid: 'usr-prueba-lider-1',
    esPrueba: true,
  },
  {
    id: 'per-prueba-06',
    nombre: 'Gabriela Sofía Vargas (prueba)',
    telefonoE164: '+57 300 000 0016',
    etapa: 'Contactado',
    banderas: ['No contactar'],
    origen: 'Otro',
    liderAsignadoId: 'usr-prueba-lider-1',
    liderAsignadoNombre: 'Carlos Gómez (prueba)',
    consentimiento: {
      otorgado: true,
      fecha: diasRelativos(-20),
      medio: 'Formulario de bienvenida firmado',
      registradoPorUid: 'usr-prueba-lider-1',
    },
    notas: 'Indicó que por motivos de trabajo no puede recibir llamadas en horas laborales.',
    motivoOracion: null,
    fechaIngreso: diasRelativos(-20),
    ultimoContacto: diasRelativos(-30), // hace 30 días
    ventanaAbiertaHasta: null,
    sinRespuestaConsecutivos: 0,
    pasosEnviados: ['dia0'],
    creadoPorUid: 'usr-prueba-lider-1',
    esPrueba: true,
  },

  // --- Asignadas a Marta Lucía (prueba) (Total: 4 personas) ---
  {
    id: 'per-prueba-07',
    nombre: 'Hugo Armando Moreno (prueba)',
    telefonoE164: '+57 300 000 0017',
    etapa: 'Contactado',
    banderas: [],
    origen: 'Servicio dominical',
    liderAsignadoId: 'usr-prueba-lider-2',
    liderAsignadoNombre: 'Marta Lucía (prueba)',
    consentimiento: {
      otorgado: true,
      fecha: diasRelativos(-25),
      medio: 'Formulario de bienvenida firmado',
      registradoPorUid: 'usr-prueba-lider-2',
    },
    notas: 'Muy dispuesto, asistió al segundo servicio.',
    motivoOracion: 'Por salud de su esposa.',
    fechaIngreso: diasRelativos(-25),
    ultimoContacto: diasRelativos(-3),
    ventanaAbiertaHasta: null,
    sinRespuestaConsecutivos: 3, // contador en 3
    pasosEnviados: ['dia0', 'dia3', 'dia10', 'dia21'],
    creadoPorUid: 'usr-prueba-lider-2',
    esPrueba: true,
  },
  {
    id: 'per-prueba-08',
    nombre: 'Isabel Cristina Pardo (prueba)',
    telefonoE164: '+57 300 000 0018',
    etapa: 'Contactado',
    banderas: [],
    origen: 'Invitación de un miembro',
    liderAsignadoId: 'usr-prueba-lider-2',
    liderAsignadoNombre: 'Marta Lucía (prueba)',
    consentimiento: {
      otorgado: true,
      fecha: diasRelativos(-30),
      medio: 'Autorización verbal ante el líder',
      registradoPorUid: 'usr-prueba-lider-2',
    },
    notas: 'Asiste a las clases de bienvenida.',
    motivoOracion: null,
    fechaIngreso: diasRelativos(-30),
    ultimoContacto: diasRelativos(-7),
    ventanaAbiertaHasta: null,
    sinRespuestaConsecutivos: 0,
    pasosEnviados: ['dia0', 'dia3', 'dia10'],
    creadoPorUid: 'usr-prueba-lider-2',
    esPrueba: true,
  },
  {
    id: 'per-prueba-09',
    nombre: 'Javier Enrique Lozano (prueba)',
    telefonoE164: '+57 300 000 0019',
    etapa: 'Contactado',
    banderas: [],
    origen: 'Célula o grupo',
    liderAsignadoId: 'usr-prueba-lider-2',
    liderAsignadoNombre: 'Marta Lucía (prueba)',
    consentimiento: {
      otorgado: true,
      fecha: diasRelativos(-34),
      medio: 'Formulario de bienvenida firmado',
      registradoPorUid: 'usr-prueba-lider-2',
    },
    notas: 'Participa con entusiasmo en el grupo de oración.',
    motivoOracion: 'Por restauración familiar.',
    fechaIngreso: diasRelativos(-34),
    ultimoContacto: diasRelativos(-4),
    ventanaAbiertaHasta: null,
    sinRespuestaConsecutivos: 0,
    pasosEnviados: ['dia0', 'dia3', 'dia10', 'dia21'],
    creadoPorUid: 'usr-prueba-lider-2',
    esPrueba: true,
  },
  {
    id: 'per-prueba-10',
    nombre: 'Karen Julieth Navarro (prueba)',
    telefonoE164: '+57 300 000 0020',
    etapa: 'En seguimiento',
    banderas: [],
    origen: 'Redes sociales',
    liderAsignadoId: 'usr-prueba-lider-2',
    liderAsignadoNombre: 'Marta Lucía (prueba)',
    consentimiento: {
      otorgado: true,
      fecha: diasRelativos(-38),
      medio: 'Formulario en línea',
      registradoPorUid: 'usr-prueba-lider-2',
    },
    notas: 'Comenzó taller de fundamentos de fe.',
    motivoOracion: null,
    fechaIngreso: diasRelativos(-38),
    ultimoContacto: diasRelativos(-6),
    ventanaAbiertaHasta: null,
    sinRespuestaConsecutivos: 0,
    pasosEnviados: ['dia0', 'dia3', 'dia10', 'dia21'],
    creadoPorUid: 'usr-prueba-lider-2',
    esPrueba: true,
  },

  // --- Asignadas a David Torres (prueba) (Total: 2 personas) ---
  {
    id: 'per-prueba-11',
    nombre: 'Luis Alfonso Medina (prueba)',
    telefonoE164: '+57 300 000 0021',
    etapa: 'En seguimiento',
    banderas: [],
    origen: 'Escribió por WhatsApp',
    liderAsignadoId: 'usr-prueba-lider-3',
    liderAsignadoNombre: 'David Torres (prueba)',
    consentimiento: {
      otorgado: true,
      fecha: diasRelativos(-42),
      medio: 'Escribió primero por WhatsApp',
      registradoPorUid: 'usr-prueba-lider-3',
    },
    notas: 'Participa regularmente en reuniones semanales.',
    motivoOracion: 'Por viaje y trámites de visa.',
    fechaIngreso: diasRelativos(-42),
    ultimoContacto: diasRelativos(-10),
    ventanaAbiertaHasta: null,
    sinRespuestaConsecutivos: 0,
    pasosEnviados: ['dia0', 'dia3', 'dia10', 'dia21'],
    creadoPorUid: 'usr-prueba-lider-3',
    esPrueba: true,
  },
  {
    id: 'per-prueba-12',
    nombre: 'Mónica Andrea Vega (prueba)',
    telefonoE164: '+57 300 000 0022',
    etapa: 'En seguimiento',
    banderas: [],
    origen: 'Servicio dominical',
    liderAsignadoId: 'usr-prueba-lider-3',
    liderAsignadoNombre: 'David Torres (prueba)',
    consentimiento: {
      otorgado: true,
      fecha: diasRelativos(-46),
      medio: 'Formulario de bienvenida firmado',
      registradoPorUid: 'usr-prueba-lider-3',
    },
    notas: 'Interesada en integrarse al ministerio de alabanza.',
    motivoOracion: null,
    fechaIngreso: diasRelativos(-46),
    ultimoContacto: diasRelativos(-12),
    ventanaAbiertaHasta: null,
    sinRespuestaConsecutivos: 0,
    pasosEnviados: ['dia0', 'dia3', 'dia10', 'dia21'],
    creadoPorUid: 'usr-prueba-lider-3',
    esPrueba: true,
  },

  // --- Asignada a Sara Morales (prueba) (Total: 1 persona) ---
  {
    id: 'per-prueba-13',
    nombre: 'Néstor Raúl Cárdenas (prueba)',
    telefonoE164: '+57 300 000 0023',
    etapa: 'Visitado',
    banderas: [],
    origen: 'Invitación de un miembro',
    liderAsignadoId: 'usr-prueba-lider-4',
    liderAsignadoNombre: 'Sara Morales (prueba)',
    consentimiento: {
      otorgado: true,
      fecha: diasRelativos(-50),
      medio: 'Autorización verbal ante el líder',
      registradoPorUid: 'usr-prueba-lider-4',
    },
    notas: 'Recibió visita pastoral en su hogar el mes pasado.',
    motivoOracion: 'Por salud de sus abuelos.',
    fechaIngreso: diasRelativos(-50),
    ultimoContacto: diasRelativos(-8),
    ventanaAbiertaHasta: null,
    sinRespuestaConsecutivos: 0,
    pasosEnviados: ['dia0', 'dia3', 'dia10', 'dia21'],
    creadoPorUid: 'usr-prueba-lider-4',
    esPrueba: true,
  },

  // --- Asignada al Apóstol (Total: 1 persona) ---
  {
    id: 'per-prueba-14',
    nombre: 'Olga Lucía Benítez (prueba)',
    telefonoE164: '+57 300 000 0024',
    etapa: 'Visitado',
    banderas: [],
    origen: 'Célula o grupo',
    liderAsignadoId: 'usr-prueba-apostol',
    liderAsignadoNombre: 'Pastor Pedro Ramos (prueba)',
    consentimiento: {
      otorgado: true,
      fecha: diasRelativos(-54),
      medio: 'Formulario de bienvenida firmado',
      registradoPorUid: 'usr-prueba-apostol',
    },
    notas: 'Caso de acompañamiento pastoral directo.',
    motivoOracion: 'Por fortaleza espiritual tras pérdida reciente.',
    fechaIngreso: diasRelativos(-54),
    ultimoContacto: diasRelativos(-3),
    ventanaAbiertaHasta: null,
    sinRespuestaConsecutivos: 0,
    pasosEnviados: ['dia0', 'dia3', 'dia10', 'dia21'],
    creadoPorUid: 'usr-prueba-apostol',
    esPrueba: true,
  },

  // --- Sin líder asignado (Total: 2 personas) y Sin consentimiento (Total: 2 personas) ---
  {
    id: 'per-prueba-15',
    nombre: 'Pablo César Rincón (prueba)',
    telefonoE164: '+57 300 000 0025',
    etapa: 'Consolidado',
    banderas: [],
    origen: 'Otro',
    liderAsignadoId: null, // Sin líder asignado
    liderAsignadoNombre: null,
    consentimiento: undefined, // Sin consentimiento registrado (1 de 2)
    notas: 'Llegó en servicio de milagros, no completó el formulario de consentimiento.',
    motivoOracion: null,
    fechaIngreso: diasRelativos(-58),
    ultimoContacto: null,
    ventanaAbiertaHasta: null,
    sinRespuestaConsecutivos: 0,
    pasosEnviados: [],
    creadoPorUid: 'usr-prueba-apostol',
    esPrueba: true,
  },
  {
    id: 'per-prueba-16',
    nombre: 'Rosa María Duarte (prueba)',
    telefonoE164: '+57 300 000 0026',
    etapa: 'Discípulo',
    banderas: [],
    origen: 'Servicio dominical',
    liderAsignadoId: null, // Sin líder asignado
    liderAsignadoNombre: null,
    consentimiento: undefined, // Sin consentimiento registrado (2 de 2)
    notas: 'Miembro activa graduada del discipulado esperando reasignación de ministerio.',
    motivoOracion: 'Por dirección para abrir una nueva célula.',
    fechaIngreso: diasRelativos(-60),
    ultimoContacto: diasRelativos(-15),
    ventanaAbiertaHasta: null,
    sinRespuestaConsecutivos: 0,
    pasosEnviados: ['dia0', 'dia3', 'dia10', 'dia21'],
    creadoPorUid: 'usr-prueba-apostol',
    esPrueba: true,
  },
];

// ---------------------------------------------------------------------
// 3. TAREAS (12 tareas representativas)
// Cubren: 4 tipos ('llamada', 'visita', 'oracion', 'especial'),
// 2 prioridades ('normal', 'urgente'), 3 estados ('pendiente', 'hecha', 'cancelada').
// Fechas: 2 vencidas, 3 vencen hoy, el resto en los próximos días.
// 1 encargo del Apóstol aún sin leer (leidaEn: null).
// ---------------------------------------------------------------------
export const TAREAS_PRUEBA: Tarea[] = [
  // --- 2 Tareas Vencidas ---
  {
    id: 'tar-prueba-01',
    personaId: 'per-prueba-01',
    personaNombre: 'Andrés Felipe Mejía (prueba)',
    personaTelefono: '+57 300 000 0011',
    liderId: 'usr-prueba-lider-1',
    liderNombre: 'Carlos Gómez (prueba)',
    tipo: 'llamada',
    prioridad: 'normal',
    titulo: 'Llamada de bienvenida',
    detalle: 'Confirmar si pudo revisar la guía devocional enviada.',
    vence: diasRelativos(-3), // Vencida
    estado: 'pendiente',
    creadaEn: diasRelativos(-5),
    completadaEn: null,
    esPrueba: true,
  },
  {
    id: 'tar-prueba-02',
    personaId: 'per-prueba-03',
    personaNombre: 'Daniel Alejandro Soto (prueba)',
    personaTelefono: '+57 300 000 0013',
    liderId: 'usr-prueba-lider-1',
    liderNombre: 'Carlos Gómez (prueba)',
    tipo: 'visita',
    prioridad: 'urgente',
    titulo: 'Coordinar visita en su negocio',
    detalle: 'Agendar fecha exacta para visitar su local comercial.',
    vence: diasRelativos(-1), // Vencida
    estado: 'pendiente',
    creadaEn: diasRelativos(-6),
    completadaEn: null,
    esPrueba: true,
  },

  // --- 3 Tareas que Vencen Hoy ---
  {
    id: 'tar-prueba-03',
    personaId: 'per-prueba-02',
    personaNombre: 'Claudia Patricia Ruiz (prueba)',
    personaTelefono: '+57 300 000 0012',
    liderId: 'usr-prueba-lider-1',
    liderNombre: 'Carlos Gómez (prueba)',
    tipo: 'oracion',
    prioridad: 'normal',
    titulo: 'Llamada de oración por empleo',
    detalle: 'Orar junto a ella antes de su entrevista de trabajo.',
    vence: diasRelativos(0), // Vence hoy
    estado: 'pendiente',
    creadaEn: diasRelativos(-1),
    completadaEn: null,
    esPrueba: true,
  },
  {
    id: 'tar-prueba-04',
    personaId: 'per-prueba-07',
    personaNombre: 'Hugo Armando Moreno (prueba)',
    personaTelefono: '+57 300 000 0017',
    liderId: 'usr-prueba-lider-2',
    liderNombre: 'Marta Lucía (prueba)',
    tipo: 'llamada',
    prioridad: 'normal',
    titulo: 'Reconexión con Hugo',
    detalle: 'Intentar contacto telefónico en horario de almuerzo.',
    vence: diasRelativos(0), // Vence hoy
    estado: 'pendiente',
    creadaEn: diasRelativos(-2),
    completadaEn: null,
    esPrueba: true,
  },
  {
    id: 'tar-prueba-05',
    personaId: 'per-prueba-08',
    personaNombre: 'Isabel Cristina Pardo (prueba)',
    personaTelefono: '+57 300 000 0018',
    liderId: 'usr-prueba-lider-2',
    liderNombre: 'Marta Lucía (prueba)',
    tipo: 'oracion',
    prioridad: 'normal',
    titulo: 'Oración de agradecimiento',
    detalle: 'Llamar y orar por el inicio del taller de fe.',
    vence: diasRelativos(0), // Vence hoy
    estado: 'hecha',
    creadaEn: diasRelativos(-2),
    completadaEn: diasRelativos(0),
    nota: 'Hablamos 15 minutos, muy receptiva y bendecida.',
    esPrueba: true,
  },

  // --- 7 Tareas en los Próximos Días ---
  {
    // Encargo especial del Apóstol todavía sin leer
    id: 'tar-prueba-06',
    personaId: 'per-prueba-01',
    personaNombre: 'Andrés Felipe Mejía (prueba)',
    personaTelefono: '+57 300 000 0011',
    liderId: 'usr-prueba-lider-1',
    liderNombre: 'Carlos Gómez (prueba)',
    tipo: 'especial',
    prioridad: 'urgente',
    titulo: 'Encargo del Apóstol: Oración urgente por salud de hija',
    detalle: 'Por favor llamar hoy mismo a la familia para confirmar estado de salud.',
    vence: diasRelativos(1),
    estado: 'pendiente',
    creadaEn: diasRelativos(0),
    completadaEn: null,
    asignadaPor: 'Pastor Pedro Ramos (prueba)',
    leidaEn: null, // Sin leer por el líder
    esPrueba: true,
  },
  {
    id: 'tar-prueba-07',
    personaId: 'per-prueba-09',
    personaNombre: 'Javier Enrique Lozano (prueba)',
    personaTelefono: '+57 300 000 0019',
    liderId: 'usr-prueba-lider-2',
    liderNombre: 'Marta Lucía (prueba)',
    tipo: 'visita',
    prioridad: 'normal',
    titulo: 'Visita pastoral a célula',
    detalle: 'Acompañar la célula donde asiste Javier este jueves.',
    vence: diasRelativos(2),
    estado: 'pendiente',
    creadaEn: diasRelativos(-1),
    completadaEn: null,
    esPrueba: true,
  },
  {
    id: 'tar-prueba-08',
    personaId: 'per-prueba-10',
    personaNombre: 'Karen Julieth Navarro (prueba)',
    personaTelefono: '+57 300 000 0020',
    liderId: 'usr-prueba-lider-2',
    liderNombre: 'Marta Lucía (prueba)',
    tipo: 'llamada',
    prioridad: 'normal',
    titulo: 'Seguimiento clase de fundamentos',
    detalle: 'Enviar recordatorio del material de estudio para la sesión.',
    vence: diasRelativos(3),
    estado: 'pendiente',
    creadaEn: diasRelativos(0),
    completadaEn: null,
    esPrueba: true,
  },
  {
    id: 'tar-prueba-09',
    personaId: 'per-prueba-11',
    personaNombre: 'Luis Alfonso Medina (prueba)',
    personaTelefono: '+57 300 000 0021',
    liderId: 'usr-prueba-lider-3',
    liderNombre: 'David Torres (prueba)',
    tipo: 'oracion',
    prioridad: 'normal',
    titulo: 'Orar por trámite de viaje',
    detalle: 'Confirmar fecha de la cita consular y orar juntos.',
    vence: diasRelativos(4),
    estado: 'pendiente',
    creadaEn: diasRelativos(-1),
    completadaEn: null,
    esPrueba: true,
  },
  {
    id: 'tar-prueba-10',
    personaId: 'per-prueba-12',
    personaNombre: 'Mónica Andrea Vega (prueba)',
    personaTelefono: '+57 300 000 0022',
    liderId: 'usr-prueba-lider-3',
    liderNombre: 'David Torres (prueba)',
    tipo: 'llamada',
    prioridad: 'normal',
    titulo: 'Integración al grupo de alabanza',
    detalle: 'Conectar con el director de música de la iglesia.',
    vence: diasRelativos(5),
    estado: 'hecha',
    creadaEn: diasRelativos(-3),
    completadaEn: diasRelativos(-1),
    nota: 'Ya se reunió con el equipo de música y empieza ensayos.',
    esPrueba: true,
  },
  {
    id: 'tar-prueba-11',
    personaId: 'per-prueba-13',
    personaNombre: 'Néstor Raúl Cárdenas (prueba)',
    personaTelefono: '+57 300 000 0023',
    liderId: 'usr-prueba-lider-4',
    liderNombre: 'Sara Morales (prueba)',
    tipo: 'visita',
    prioridad: 'urgente',
    titulo: 'Segunda visita pastoral familiar',
    detalle: 'La familia canceló el compromiso por viaje imprevisto.',
    vence: diasRelativos(6),
    estado: 'cancelada',
    creadaEn: diasRelativos(-2),
    completadaEn: null,
    nota: 'Reagendada para el siguiente mes a solicitud de la persona.',
    esPrueba: true,
  },
  {
    id: 'tar-prueba-12',
    personaId: 'per-prueba-14',
    personaNombre: 'Olga Lucía Benítez (prueba)',
    personaTelefono: '+57 300 000 0024',
    liderId: 'usr-prueba-apostol',
    liderNombre: 'Pastor Pedro Ramos (prueba)',
    tipo: 'especial',
    prioridad: 'urgente',
    titulo: 'Acompañamiento pastoral personal',
    detalle: 'Seguimiento al proceso de duelo.',
    vence: diasRelativos(2),
    estado: 'pendiente',
    creadaEn: diasRelativos(-1),
    completadaEn: null,
    asignadaPor: 'Pastor Pedro Ramos (prueba)',
    leidaEn: diasRelativos(0),
    esPrueba: true,
  },
];

// ---------------------------------------------------------------------
// 4. INTERACCIONES (20 registros)
// Mezclan canales (whatsapp, llamada, visita, manual),
// direcciones (entrante, saliente) y estados (enviado, entregado, leido, fallido).
// ---------------------------------------------------------------------
export const INTERACCIONES_PRUEBA: Interaccion[] = [
  // 1. WhatsApp Saliente Entregado
  {
    id: 'int-prueba-01',
    personaId: 'per-prueba-01',
    direccion: 'saliente',
    canal: 'whatsapp',
    plantilla: 'oasis_bienvenida',
    texto: 'Hola Andrés Felipe (prueba), qué gran alegría haberte tenido este domingo en el Centro de Alabanza Oasis. Queremos darte una cálida bienvenida a nuestra familia.',
    estado: 'entregado',
    fecha: diasRelativos(-2),
    esPrueba: true,
  },
  // 2. WhatsApp Saliente Leído
  {
    id: 'int-prueba-02',
    personaId: 'per-prueba-01',
    direccion: 'saliente',
    canal: 'whatsapp',
    plantilla: 'oasis_oracion',
    texto: 'Hola Andrés Felipe, nuestro equipo pastoral está orando esta semana. ¿Tienes alguna petición especial de oración?',
    estado: 'leido',
    fecha: diasRelativos(-1),
    esPrueba: true,
  },
  // 3. WhatsApp Entrante
  {
    id: 'int-prueba-03',
    personaId: 'per-prueba-01',
    direccion: 'entrante',
    canal: 'whatsapp',
    texto: 'Buenas tardes pastor, sí por favor. Mi hija menor ha estado con fiebre y quebrantos de salud.',
    estado: null,
    fecha: diasRelativos(0, -6),
    esPrueba: true,
  },
  // 4. WhatsApp Saliente Leído
  {
    id: 'int-prueba-04',
    personaId: 'per-prueba-01',
    direccion: 'saliente',
    canal: 'whatsapp',
    texto: 'Cuenta con nuestras oraciones Andrés Felipe. Estaremos clamando por su pronta y completa recuperación. Un líder te contactará.',
    estado: 'leido',
    fecha: diasRelativos(0, -4),
    esPrueba: true,
  },
  // 5. Llamada Saliente Leída/Registrada
  {
    id: 'int-prueba-05',
    personaId: 'per-prueba-01',
    direccion: 'saliente',
    canal: 'llamada',
    texto: 'Llamada telefónica por Carlos Gómez (prueba). Oramos juntos por la salud de la niña.',
    estado: 'leido',
    fecha: diasRelativos(0, -2),
    esPrueba: true,
  },
  // 6. WhatsApp Saliente Leído
  {
    id: 'int-prueba-06',
    personaId: 'per-prueba-02',
    direccion: 'saliente',
    canal: 'whatsapp',
    plantilla: 'oasis_bienvenida',
    texto: 'Hola Claudia Patricia (prueba), bienvenida a Oasis. Esperamos verte pronto de nuevo.',
    estado: 'leido',
    fecha: diasRelativos(-4),
    esPrueba: true,
  },
  // 7. WhatsApp Entrante
  {
    id: 'int-prueba-07',
    personaId: 'per-prueba-02',
    direccion: 'entrante',
    canal: 'whatsapp',
    texto: 'Muchas gracias hermanos, me sentí muy bendecida en la reunión.',
    estado: null,
    fecha: diasRelativos(-3),
    esPrueba: true,
  },
  // 8. Manual Saliente Entregado
  {
    id: 'int-prueba-08',
    personaId: 'per-prueba-02',
    direccion: 'saliente',
    canal: 'manual',
    texto: 'Entrega de devocional impreso de bienvenida al finalizar el servicio.',
    estado: 'entregado',
    fecha: diasRelativos(-4),
    esPrueba: true,
  },
  // 9. Visita Saliente Leída
  {
    id: 'int-prueba-09',
    personaId: 'per-prueba-03',
    direccion: 'saliente',
    canal: 'visita',
    texto: 'Visita previa al local comercial de Daniel Alejandro (prueba). Se acordó día para la oración.',
    estado: 'leido',
    fecha: diasRelativos(-5),
    esPrueba: true,
  },
  // 10. WhatsApp Saliente Fallido
  {
    id: 'int-prueba-10',
    personaId: 'per-prueba-04',
    direccion: 'saliente',
    canal: 'whatsapp',
    plantilla: 'oasis_bienvenida',
    texto: 'Hola Elena Marcela (prueba), gracias por escribirnos por Instagram. ¿Te gustaría conocer los horarios?',
    estado: 'fallido',
    fecha: diasRelativos(-12),
    esPrueba: true,
  },
  // 11. WhatsApp Saliente Enviado
  {
    id: 'int-prueba-11',
    personaId: 'per-prueba-04',
    direccion: 'saliente',
    canal: 'whatsapp',
    texto: 'Hola Elena Marcela, te reenviamos la información de las reuniones de jóvenes.',
    estado: 'enviado',
    fecha: diasRelativos(-5),
    esPrueba: true,
  },
  // 12. Llamada Saliente Fallida
  {
    id: 'int-prueba-12',
    personaId: 'per-prueba-05',
    direccion: 'saliente',
    canal: 'llamada',
    texto: 'Intento de llamada de seguimiento a Fernando José (prueba). Línea ocupada.',
    estado: 'fallido',
    fecha: diasRelativos(-30),
    esPrueba: true,
  },
  // 13. WhatsApp Saliente Entregado
  {
    id: 'int-prueba-13',
    personaId: 'per-prueba-06',
    direccion: 'saliente',
    canal: 'whatsapp',
    texto: 'Agradecemos tu visita a Oasis, Gabriela Sofía (prueba). Quedamos atentos cuando desees volver.',
    estado: 'entregado',
    fecha: diasRelativos(-30),
    esPrueba: true,
  },
  // 14. Llamada Entrante Leída
  {
    id: 'int-prueba-14',
    personaId: 'per-prueba-07',
    direccion: 'entrante',
    canal: 'llamada',
    texto: 'Llamada de Hugo Armando (prueba) confirmando que asistirá al próximo servicio dominical.',
    estado: 'leido',
    fecha: diasRelativos(-3),
    esPrueba: true,
  },
  // 15. Manual Entrante Leído
  {
    id: 'int-prueba-15',
    personaId: 'per-prueba-08',
    direccion: 'entrante',
    canal: 'manual',
    texto: 'Inscripción presencial en la mesa de discipulado.',
    estado: 'leido',
    fecha: diasRelativos(-7),
    esPrueba: true,
  },
  // 16. WhatsApp Saliente Leído
  {
    id: 'int-prueba-16',
    personaId: 'per-prueba-09',
    direccion: 'saliente',
    canal: 'whatsapp',
    plantilla: 'oasis_visita',
    texto: 'Hola Javier Enrique (prueba), este jueves pasaremos a saludarte en tu grupo.',
    estado: 'leido',
    fecha: diasRelativos(-4),
    esPrueba: true,
  },
  // 17. WhatsApp Entrante
  {
    id: 'int-prueba-17',
    personaId: 'per-prueba-09',
    direccion: 'entrante',
    canal: 'whatsapp',
    texto: 'Excelente líderes, allá los esperamos con un refrigerio.',
    estado: null,
    fecha: diasRelativos(-4, 2),
    esPrueba: true,
  },
  // 18. Visita Saliente Entregada
  {
    id: 'int-prueba-18',
    personaId: 'per-prueba-13',
    direccion: 'saliente',
    canal: 'visita',
    texto: 'Visita pastoral en el hogar de Néstor Raúl (prueba) por la líder Sara Morales.',
    estado: 'entregado',
    fecha: diasRelativos(-8),
    esPrueba: true,
  },
  // 19. Llamada Saliente Leída
  {
    id: 'int-prueba-19',
    personaId: 'per-prueba-14',
    direccion: 'saliente',
    canal: 'llamada',
    texto: 'Llamada personal del Pastor Pedro Ramos (prueba) a Olga Lucía.',
    estado: 'leido',
    fecha: diasRelativos(-3),
    esPrueba: true,
  },
  // 20. WhatsApp Saliente Fallido
  {
    id: 'int-prueba-20',
    personaId: 'per-prueba-16',
    direccion: 'saliente',
    canal: 'whatsapp',
    texto: 'Hola Rosa María (prueba), te compartimos la fecha de la próxima reunión ministerial.',
    estado: 'fallido',
    fecha: diasRelativos(-15),
    esPrueba: true,
  },
];

// ---------------------------------------------------------------------
// 5. OBJETO CONSOLIDADO PARA FÁCIL IMPORTACIÓN
// ---------------------------------------------------------------------
export const DATOS_PRUEBA = {
  usuarios: USUARIOS_PRUEBA,
  personas: PERSONAS_PRUEBA,
  tareas: TAREAS_PRUEBA,
  interacciones: INTERACCIONES_PRUEBA,
};
