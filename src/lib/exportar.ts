import * as XLSX from 'xlsx';
import { Persona, Tarea } from './types';
import { mostrarTelefono } from './telefono';

/**
 * Formatea fechas a formato legible y amigable en español (DD/MM/AAAA)
 */
function formatearFecha(fechaStr?: string | null): string {
  if (!fechaStr) return '';
  const d = new Date(fechaStr);
  if (isNaN(d.getTime())) return fechaStr;
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const anio = d.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

/**
 * Calcula el ancho óptimo para cada columna según el contenido
 */
function calcularAnchosColumnas(filas: (string | number)[][]): { wch: number }[] {
  if (filas.length === 0) return [];
  const totalCols = filas[0].length;
  const anchos: number[] = new Array(totalCols).fill(12);

  for (const fila of filas) {
    for (let c = 0; c < totalCols; c++) {
      const valor = fila[c] !== undefined && fila[c] !== null ? String(fila[c]) : '';
      if (valor.length > anchos[c]) {
        anchos[c] = Math.min(valor.length + 3, 50); // Límite máximo para legibilidad
      }
    }
  }

  return anchos.map((w) => ({ wch: w }));
}

/**
 * Genera y descarga un libro de cálculo nativo de Microsoft Excel (.xlsx)
 * con las personas ordenadas, organizadas por columnas y con anchos adaptados.
 */
export function descargarPersonasExcel(
  personas: Persona[],
  nombreArchivo = `oasis_directorio_personas_${new Date().toISOString().slice(0, 10)}.xlsx`,
) {
  const encabezados = [
    'Nombre Completo',
    'Teléfono WhatsApp',
    'Teléfono Internacional',
    'Etapa de Crecimiento',
    'Líder Pastoral Asignado',
    'Fecha de Ingreso',
    'Último Contacto',
    'Alertas y Banderas',
    'Motivo de Oración',
    'Origen / Cómo Llegó',
    'Consentimiento',
    'Fecha Consentimiento',
    'Medio Consentimiento',
    'Notas y Observaciones',
  ];

  // Ordenar alfabéticamente
  const personasOrdenadas = [...personas].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  );

  const datosFilas = personasOrdenadas.map((p) => {
    const consent = p.consentimiento?.otorgado ? 'AUTORIZADO' : 'PENDIENTE';
    const consentFecha = p.consentimiento?.fecha ? formatearFecha(p.consentimiento.fecha) : 'N/D';
    const medioConsent = p.consentimiento?.medio || 'No registrado';
    const banderas = p.banderas && p.banderas.length > 0 ? p.banderas.join(', ') : 'Al día';
    const fechaIngreso = formatearFecha(p.fechaIngreso);
    const ultimoContacto = p.ultimoContacto ? formatearFecha(p.ultimoContacto) : 'Sin contacto aún';

    return [
      p.nombre,
      mostrarTelefono(p.telefonoE164),
      p.telefonoE164,
      p.etapa,
      p.liderAsignadoNombre || 'Por Asignar',
      fechaIngreso,
      ultimoContacto,
      banderas,
      p.motivoOracion || 'Ninguno',
      p.origen || 'No especificado',
      consent,
      consentFecha,
      medioConsent,
      p.notas || '',
    ];
  });

  const todasLasFilas = [encabezados, ...datosFilas];

  // Crear Hoja de Cálculo
  const hoja = XLSX.utils.aoa_to_sheet(todasLasFilas);
  hoja['!cols'] = calcularAnchosColumnas(todasLasFilas);

  // Crear Libro de Excel
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Directorio Personas');

  // Descargar archivo .xlsx nativo
  XLSX.writeFile(libro, nombreArchivo);
}

/**
 * Genera y descarga un libro de Excel (.xlsx) con el reporte de seguimiento pastoral
 */
export function descargarTareasExcel(
  tareas: Tarea[],
  nombreArchivo = `oasis_reporte_tareas_${new Date().toISOString().slice(0, 10)}.xlsx`,
) {
  const encabezados = [
    'Persona en Seguimiento',
    'Líder Responsable',
    'Tipo de Tarea',
    'Prioridad',
    'Estado',
    'Fecha de Vencimiento',
    'Fecha de Creación',
    'Fecha de Cumplimiento',
    'Detalle de la Tarea',
    'Notas del Líder',
  ];

  const datosFilas = tareas.map((t) => {
    return [
      t.personaNombre,
      t.liderNombre,
      t.tipo.toUpperCase(),
      t.prioridad === 'urgente' ? 'URGENTE' : 'Normal',
      t.estado.toUpperCase(),
      formatearFecha(t.vence),
      formatearFecha(t.creadaEn),
      t.completadaEn ? formatearFecha(t.completadaEn) : 'Pendiente',
      t.detalle || t.titulo || '',
      t.nota || '',
    ];
  });

  const todasLasFilas = [encabezados, ...datosFilas];

  const hoja = XLSX.utils.aoa_to_sheet(todasLasFilas);
  hoja['!cols'] = calcularAnchosColumnas(todasLasFilas);

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Tareas y Seguimiento');

  XLSX.writeFile(libro, nombreArchivo);
}

/**
 * Genera y descarga un libro de Excel integral (.xlsx) con TODAS las pestañas:
 * 1. Directorio de Personas
 * 2. Tareas de Seguimiento
 * 3. Resumen y Estadísticas Pastorales
 */
export function descargarLibroCompletoExcel(
  personas: Persona[],
  tareas: Tarea[],
  nombreArchivo = `oasis_reporte_pastoral_completo_${new Date().toISOString().slice(0, 10)}.xlsx`,
) {
  const libro = XLSX.utils.book_new();

  // 1. Hoja Directorio Personas
  const encabezadosPersonas = [
    'Nombre Completo',
    'Teléfono WhatsApp',
    'Teléfono Internacional',
    'Etapa de Crecimiento',
    'Líder Pastoral Asignado',
    'Fecha de Ingreso',
    'Último Contacto',
    'Alertas y Banderas',
    'Motivo de Oración',
    'Origen / Cómo Llegó',
    'Consentimiento',
    'Fecha Consentimiento',
    'Medio Consentimiento',
    'Notas y Observaciones',
  ];

  const personasOrdenadas = [...personas].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  );

  const filasPersonas = personasOrdenadas.map((p) => [
    p.nombre,
    mostrarTelefono(p.telefonoE164),
    p.telefonoE164,
    p.etapa,
    p.liderAsignadoNombre || 'Por Asignar',
    formatearFecha(p.fechaIngreso),
    p.ultimoContacto ? formatearFecha(p.ultimoContacto) : 'Sin contacto aún',
    p.banderas && p.banderas.length > 0 ? p.banderas.join(', ') : 'Al día',
    p.motivoOracion || 'Ninguno',
    p.origen || 'No especificado',
    p.consentimiento?.otorgado ? 'AUTORIZADO' : 'PENDIENTE',
    p.consentimiento?.fecha ? formatearFecha(p.consentimiento.fecha) : 'N/D',
    p.consentimiento?.medio || 'No registrado',
    p.notas || '',
  ]);

  const tablaPersonas = [encabezadosPersonas, ...filasPersonas];
  const hojaPersonas = XLSX.utils.aoa_to_sheet(tablaPersonas);
  hojaPersonas['!cols'] = calcularAnchosColumnas(tablaPersonas);
  XLSX.utils.book_append_sheet(libro, hojaPersonas, 'Directorio Personas');

  // 2. Hoja Tareas de Seguimiento
  const encabezadosTareas = [
    'Persona en Seguimiento',
    'Líder Responsable',
    'Tipo de Tarea',
    'Prioridad',
    'Estado',
    'Fecha de Vencimiento',
    'Fecha de Creación',
    'Fecha de Cumplimiento',
    'Detalle de la Tarea',
    'Notas del Líder',
  ];

  const filasTareas = tareas.map((t) => [
    t.personaNombre,
    t.liderNombre,
    t.tipo.toUpperCase(),
    t.prioridad === 'urgente' ? 'URGENTE' : 'Normal',
    t.estado.toUpperCase(),
    formatearFecha(t.vence),
    formatearFecha(t.creadaEn),
    t.completadaEn ? formatearFecha(t.completadaEn) : 'Pendiente',
    t.detalle || t.titulo || '',
    t.nota || '',
  ]);

  const tablaTareas = [encabezadosTareas, ...filasTareas];
  const hojaTareas = XLSX.utils.aoa_to_sheet(tablaTareas);
  hojaTareas['!cols'] = calcularAnchosColumnas(tablaTareas);
  XLSX.utils.book_append_sheet(libro, hojaTareas, 'Seguimiento y Tareas');

  // 3. Hoja Resumen Estadístico
  const conteoEtapas = personas.reduce((acc, p) => {
    acc[p.etapa] = (acc[p.etapa] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const conteoLideres = personas.reduce((acc, p) => {
    const lider = p.liderAsignadoNombre || 'Sin Asignar';
    acc[lider] = (acc[lider] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filasResumen: (string | number)[][] = [
    ['REPORTE GENERAL PASTORAL - CENTRO DE ALABANZA OASIS'],
    ['Fecha de Exportación', new Date().toLocaleString('es-CO')],
    ['Total de Personas Registradas', personas.length],
    ['Total de Tareas Registradas', tareas.length],
    [''],
    ['DISTRIBUCIÓN POR ETAPAS DE CRECIMIENTO', 'CANTIDAD'],
    ...Object.entries(conteoEtapas).map(([etapa, cant]) => [etapa, cant]),
    [''],
    ['DISTRIBUCIÓN POR LÍDER PASTORAL', 'PERSONAS ASIGNADAS'],
    ...Object.entries(conteoLideres).map(([lider, cant]) => [lider, cant]),
  ];

  const hojaResumen = XLSX.utils.aoa_to_sheet(filasResumen);
  hojaResumen['!cols'] = [{ wch: 45 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(libro, hojaResumen, 'Resumen Estadístico');

  // Descargar archivo .xlsx
  XLSX.writeFile(libro, nombreArchivo);
}

/**
 * Genera y descarga un archivo JSON estructurado para respaldo completo del sistema
 */
export function descargarRespaldoJSON(
  personas: Persona[],
  tareas: Tarea[] = [],
  nombreArchivo = `oasis_respaldo_completo_${new Date().toISOString().slice(0, 10)}.json`,
) {
  const datos = {
    institucion: 'Centro de Alabanza Oasis',
    fechaGeneracion: new Date().toLocaleString('es-CO'),
    totalPersonas: personas.length,
    totalTareas: tareas.length,
    directorioPersonas: personas,
    tareasSeguimiento: tareas,
  };

  const jsonString = JSON.stringify(datos, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.setAttribute('href', url);
  enlace.setAttribute('download', nombreArchivo);
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

// Aliases para retrocompatibilidad
export const descargarPersonasCSV = descargarPersonasExcel;
export const descargarTareasCSV = descargarTareasExcel;
