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

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** true cuando hay configuración real de Firebase; false en modo demo. */
export const HAY_FIREBASE = Boolean(config.apiKey && config.projectId);

let app: FirebaseApp | null = null;
let authInstancia: Auth | null = null;
let dbInstancia: Firestore | null = null;

if (HAY_FIREBASE) {
  app = initializeApp(config);
  authInstancia = getAuth(app);
  dbInstancia = getFirestore(app);

  // Los líderes entran con la contraseña de la iglesia, no con una
  // cuenta personal. Aun así la app se identifica anónimamente ante
  // Firebase: es lo que permite que las reglas exijan `request.auth`
  // y la base de datos no quede abierta a cualquiera en internet.
  signInAnonymously(authInstancia).catch((e) => {
    console.error(
      '[firebase] no se pudo abrir la sesión anónima. Actívala en Authentication > Métodos de acceso > Anónimo.',
      e?.message,
    );
  });
}

export const auth = authInstancia;
export const db = dbInstancia;
