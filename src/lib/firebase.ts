// =====================================================================
//  Conexión con Firebase.
//
//  Si el archivo .env no tiene las claves de Firebase, la app arranca
//  igual en MODO DEMO: usa datos de ejemplo guardados en el navegador,
//  para que puedas verla funcionando sin configurar nada.
// =====================================================================

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
};

/** true cuando hay configuración real de Firebase; false en modo demo. */
export const HAY_FIREBASE = Boolean(config.apiKey && config.projectId);

let app: FirebaseApp | null = null;
let authInstancia: Auth | null = null;
let dbInstancia: Firestore | null = null;

if (HAY_FIREBASE) {
  app = initializeApp(config);
  authInstancia = getAuth(app);
  const idBase = (firebaseConfigJson as Record<string, string>).firestoreDatabaseId;
  dbInstancia = idBase ? getFirestore(app, idBase) : getFirestore(app);

  // Los líderes entran con la contraseña de la iglesia, no con una
  // cuenta personal. Aun así la app intenta identificarse anónimamente ante
  // Firebase. Si no está habilitado en la consola, la base de datos sigue operando
  // protegida por las reglas de validación de Firestore.
  signInAnonymously(authInstancia).catch((_e) => {
    // Modo sin autenticación anónima activa en consola: no bloquea el funcionamiento.
  });
}

export const auth = authInstancia;
export const db = dbInstancia;
