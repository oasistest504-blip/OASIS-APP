// =====================================================================
//  Normalización de números de teléfono.
//
//  La API de WhatsApp solo acepta el número en formato internacional
//  sin espacios, guiones, paréntesis ni el signo +. Ejemplo válido para
//  Colombia:  573001234567
//
//  Este es el error que más tiempo hace perder, así que la app normaliza
//  el número al escribirlo y nunca guarda otro formato.
// =====================================================================

const INDICATIVO_POR_DEFECTO = '57'; // Colombia

/**
 * Convierte lo que sea que el líder escriba en un número E.164 sin el +.
 * Devuelve null si no logra formar un número creíble.
 *
 *   "300 123 4567"      -> "573001234567"
 *   "+57 300-123-4567"  -> "573001234567"
 *   "(300) 1234567"     -> "573001234567"
 *   "3001234567"        -> "573001234567"
 */
export function normalizarTelefono(entrada: string): string | null {
  if (!entrada) return null;

  // Nos quedamos solo con los dígitos.
  let d = entrada.replace(/\D/g, '');
  if (!d) return null;

  // Un 00 al principio es la forma internacional antigua: 0057... -> 57...
  if (d.startsWith('00')) d = d.slice(2);

  // Celular colombiano suelto: 10 dígitos que empiezan por 3.
  if (d.length === 10 && d.startsWith('3')) {
    d = INDICATIVO_POR_DEFECTO + d;
  }

  // Fijo colombiano con indicativo de ciudad: 60 + 1 + 7 dígitos.
  else if (d.length === 10 && d.startsWith('60')) {
    d = INDICATIVO_POR_DEFECTO + d;
  }

  // Alguien escribió el 57 pero también un 0 de larga distancia: 570300...
  else if (d.length === 13 && d.startsWith('570')) {
    d = INDICATIVO_POR_DEFECTO + d.slice(3);
  }

  // Un número internacional válido tiene entre 10 y 15 dígitos.
  if (d.length < 10 || d.length > 15) return null;

  return d;
}

/** Cómo se le muestra al líder en pantalla: +57 300 123 4567 */
export function mostrarTelefono(e164: string): string {
  if (!e164) return '';
  if (e164.startsWith('57') && e164.length === 12) {
    const n = e164.slice(2);
    return `+57 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
  }
  return `+${e164}`;
}

/** Enlace para abrir el chat de WhatsApp con esa persona desde el celular. */
export function enlaceWhatsApp(e164: string): string {
  return `https://wa.me/${e164}`;
}

/** Enlace para llamar desde el celular. */
export function enlaceLlamada(e164: string): string {
  return `tel:+${e164}`;
}
