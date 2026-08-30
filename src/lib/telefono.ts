const CODIGO_COLOMBIA = '57';

/** Normaliza un número telefónico al formato E.164 (por defecto Colombia +57). */
export function normalizarTelefono(numero: string): string | null {
  if (!numero) return null;
  let limpio = numero.replace(/\D/g, '');
  if (!limpio) return null;

  if (limpio.startsWith('00')) {
    limpio = limpio.slice(2);
  }

  if (limpio.length === 10 && (limpio.startsWith('3') || limpio.startsWith('60'))) {
    limpio = CODIGO_COLOMBIA + limpio;
  } else if (limpio.length === 13 && limpio.startsWith('570')) {
    limpio = CODIGO_COLOMBIA + limpio.slice(3);
  }

  if (limpio.length < 10 || limpio.length > 15) {
    return null;
  }

  return limpio;
}

/** Muestra el teléfono con espaciado legible. */
export function mostrarTelefono(telefono: string): string {
  if (!telefono) return '';
  if (telefono.startsWith('57') && telefono.length === 12) {
    const resto = telefono.slice(2);
    return `+57 ${resto.slice(0, 3)} ${resto.slice(3, 6)} ${resto.slice(6)}`;
  }
  return `+${telefono}`;
}

export function enlaceWhatsApp(telefono: string): string {
  return `https://wa.me/${telefono}`;
}

export function enlaceLlamada(telefono: string): string {
  return `tel:+${telefono}`;
}
