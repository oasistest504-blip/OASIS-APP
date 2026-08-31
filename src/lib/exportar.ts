import { Persona, Tarea } from './types';
import { mostrarTelefono } from './telefono';

/**
 * Escapa y formatea una celda para CSV.
 */
function escaparCSV(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return '""';
  const texto = String(valor).replace(/"/g, '""');
  return `"${texto}"`;
}

/**
 * Genera y descarga un archivo CSV con las personas registradas,
 * listo para abrir directamente en Microsoft Excel o Google Sheets con acentos y formato correcto.
 */
export function descargarPersonasCSV(
  personas: Persona[],
  nombreArchivo = `oasis_personas_${new Date().toISOString().slice(0, 10)}.csv`,
) {
  const encabezados = [
    'Nombre Completo',
    'Teléfono (Formato)',
    'Teléfono (Internacional)',
    'Etapa Pastoral',
    'Líder Asignado',
    'Banderas / Alertas',
    'Motivo de Oración',
    'Origen / Cómo Llegó',
    'Fecha de Ingreso',
    'Último Contacto',
    'Consentimiento',
    'Medio Consentimiento',
    'Notas / Observaciones',
  ];

  const filas = personas.map((p) => {
    const consent = p.consentimiento?.otorgado ? 'Sí' : 'No';
    const medioConsent = p.consentimiento?.medio || 'No registrado';
    const banderas = p.banderas.length > 0 ? p.banderas.join('; ') : 'Ninguna';
    const fechaIngreso = p.fechaIngreso
      ? new Date(p.fechaIngreso).toLocaleDateString('es-CO')
      : '';
    const ultimoContacto = p.ultimoContacto
      ? new Date(p.ultimoContacto).toLocaleDateString('es-CO')
      : 'Sin contacto';

    return [
      escaparCSV(p.nombre),
      escaparCSV(mostrarTelefono(p.telefonoE164)),
      escaparCSV(p.telefonoE164),
      escaparCSV(p.etapa),
      escaparCSV(p.liderAsignadoNombre || 'Sin asignar'),
      escaparCSV(banderas),
      escaparCSV(p.motivoOracion || ''),
      escaparCSV(p.origen || 'No especificado'),
      escaparCSV(fechaIngreso),
      escaparCSV(ultimoContacto),
      escaparCSV(consent),
      escaparCSV(medioConsent),
      escaparCSV(p.notas || ''),
    ].join(',');
  });

  // \uFEFF añade el Byte Order Mark (BOM) para que Excel detecte UTF-8 automáticamente
  const contenidoCSV = '\uFEFF' + [encabezados.map(escaparCSV).join(','), ...filas].join('\r\n');

  const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.setAttribute('href', url);
  enlace.setAttribute('download', nombreArchivo);
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

/**
 * Genera y descarga un archivo JSON estructurado con la base de datos de personas y seguimiento.
 */
export function descargarRespaldoJSON(
  personas: Persona[],
  tareas: Tarea[] = [],
  nombreArchivo = `oasis_respaldo_${new Date().toISOString().slice(0, 10)}.json`,
) {
  const datos = {
    exportadoEn: new Date().toISOString(),
    iglesia: 'Centro de Alabanza Oasis',
    totalPersonas: personas.length,
    totalTareas: tareas.length,
    personas,
    tareas,
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
