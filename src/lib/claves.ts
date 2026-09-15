// =====================================================================
//  Cifrado y verificación de contraseñas usando Web Crypto (PBKDF2).
//  Sin librerías externas. Compatible con navegadores modernos y Node.js.
// =====================================================================

const REPETICIONES_DEFECTO = 310000;
const LONGITUD_BYTES = 32;
const SAL_BYTES = 16;

/**
 * Normaliza la contraseña quitando espacios extremos y pasándola a minúsculas,
 * igual a como se procesa en el resto de la aplicación.
 */
export function normalizarClave(clave: string): string {
  return (clave ?? '').trim().toLowerCase();
}

function obtenerCrypto(): Crypto {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    return crypto;
  }
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto;
  }
  throw new Error('Web Crypto no está disponible en este entorno.');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binario = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binario += String.fromCharCode(bytes[i]);
  }
  return btoa(binario);
}

function base64ToBytes(base64: string): Uint8Array {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) {
    bytes[i] = binario.charCodeAt(i);
  }
  return bytes;
}

async function derivarClave(
  claveNormalizada: string,
  sal: Uint8Array,
  repeticiones: number,
  longitudBytes: number = LONGITUD_BYTES,
): Promise<Uint8Array> {
  const c = obtenerCrypto();
  const encoder = new TextEncoder();
  const claveBytes = encoder.encode(claveNormalizada);

  const claveMaterial = await c.subtle.importKey(
    'raw',
    claveBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );

  const buffer = await c.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: sal as unknown as BufferSource,
      iterations: repeticiones,
      hash: 'SHA-256',
    },
    claveMaterial,
    longitudBytes * 8, // en bits: 32 bytes * 8 = 256 bits
  );

  return new Uint8Array(buffer);
}

/**
 * Recibe una contraseña en texto y devuelve una cadena cifrada.
 * Genera una sal aleatoria de 16 bytes, deriva la clave con PBKDF2 y SHA-256
 * usando 310000 repeticiones y una longitud de 32 bytes.
 *
 * Formato resultante: pbkdf2$<repeticiones>$<sal_base64>$<hash_base64>
 */
export async function cifrarClave(claveEnTexto: string): Promise<string> {
  const c = obtenerCrypto();
  const sal = new Uint8Array(SAL_BYTES);
  c.getRandomValues(sal);

  const claveNormalizada = normalizarClave(claveEnTexto);
  const hashBytes = await derivarClave(
    claveNormalizada,
    sal,
    REPETICIONES_DEFECTO,
    LONGITUD_BYTES,
  );

  const salB64 = bytesToBase64(sal);
  const hashB64 = bytesToBase64(hashBytes);

  return `pbkdf2$${REPETICIONES_DEFECTO}$${salB64}$${hashB64}`;
}

/**
 * Recibe una contraseña en texto y una cadena cifrada, y devuelve verdadero
 * o falso según coincidan. Lee las repeticiones y la sal desde la propia cadena,
 * vuelve a derivar y compara el resultado.
 */
export async function verificarClave(
  claveEnTexto: string,
  cadenaCifrada: string,
): Promise<boolean> {
  try {
    if (!cadenaCifrada || typeof cadenaCifrada !== 'string') {
      return false;
    }

    const partes = cadenaCifrada.split('$');
    if (partes.length !== 4) {
      return false;
    }

    const [algoritmo, strRepeticiones, salB64, hashB64Esperado] = partes;
    if (algoritmo !== 'pbkdf2') {
      return false;
    }

    const repeticiones = parseInt(strRepeticiones, 10);
    if (isNaN(repeticiones) || repeticiones <= 0) {
      return false;
    }

    const sal = base64ToBytes(salB64);
    const hashEsperadoBytes = base64ToBytes(hashB64Esperado);

    const claveNormalizada = normalizarClave(claveEnTexto);
    const hashDerivadoBytes = await derivarClave(
      claveNormalizada,
      sal,
      repeticiones,
      hashEsperadoBytes.length || LONGITUD_BYTES,
    );

    if (hashDerivadoBytes.length !== hashEsperadoBytes.length) {
      return false;
    }

    // Comparación segura en tiempo constante
    let diff = 0;
    for (let i = 0; i < hashDerivadoBytes.length; i++) {
      diff |= hashDerivadoBytes[i] ^ hashEsperadoBytes[i];
    }

    return diff === 0;
  } catch (err) {
    console.error('Error al verificar la clave:', err);
    return false;
  }
}

// Alias de conveniencia
export const hashearClave = cifrarClave;
export const comprobarClave = verificarClave;
