// =====================================================================
//  Firebase visto desde el servidor.
//
//  El servidor sí puede escribir en todas las colecciones, porque no lo
//  limitan las reglas de firestore.rules: esas protegen al navegador.
//  Por eso las interacciones y las banderas que pone el agente se
//  escriben desde aquí y no desde el celular del líder.
// =====================================================================

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { config, HAY_FIREBASE_ADMIN } from './config';

let app: App | null = null;
let firestore: Firestore | null = null;

if (HAY_FIREBASE_ADMIN) {
  try {
    const credenciales = JSON.parse(config.firebase.cuentaServicio);
    app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(credenciales) });
    firestore = getFirestore(app);
    console.log('[firebase] conectado al proyecto', credenciales.project_id);
  } catch (e: any) {
    console.error(
      '[firebase] No se pudo leer FIREBASE_SERVICE_ACCOUNT. Revisa que el JSON esté completo y en una sola línea.',
      e?.message,
    );
  }
} else {
  console.log('[firebase] sin credenciales de servidor: el servidor no escribirá en Firestore.');
}

export const db = firestore;
export const HAY_DB = Boolean(firestore);

// ---------------------------------------------------------------------
//  Ayudas cortas, para no repetir el mismo código en cada archivo.
// ---------------------------------------------------------------------

export async function buscarPersonaPorTelefono(telefonoE164: string) {
  if (!db) return null;
  const snap = await db
    .collection('personas')
    .where('telefonoE164', '==', telefonoE164)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
}

export async function guardarInteraccion(datos: {
  personaId: string;
  direccion: 'saliente' | 'entrante';
  canal: 'whatsapp' | 'manual' | 'sistema';
  texto: string;
  plantilla?: string;
  mensajeIdMeta?: string;
  estado?: string;
  error?: string;
}) {
  if (!db) return;
  const limpio: Record<string, any> = { ...datos, fecha: new Date().toISOString() };
  Object.keys(limpio).forEach((k) => limpio[k] === undefined && delete limpio[k]);
  await db.collection('interacciones').add(limpio);
}

export async function actualizarPersona(id: string, cambios: Record<string, any>) {
  if (!db) return;
  const limpio: Record<string, any> = { ...cambios };
  Object.keys(limpio).forEach((k) => limpio[k] === undefined && delete limpio[k]);
  await db.collection('personas').doc(id).update(limpio);
}

export async function crearTarea(datos: Record<string, any>) {
  if (!db) return null;
  const ref = await db.collection('tareas').add(datos);
  return ref.id;
}
