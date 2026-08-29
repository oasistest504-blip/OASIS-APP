// =====================================================================
//  Toda la configuración secreta en un solo lugar.
//  Nada de esto llega nunca al navegador.
// =====================================================================

import 'dotenv/config';

export const config = {
  puerto: Number(process.env.PORT ?? 8080),
  iglesia: process.env.IGLESIA_NOMBRE ?? 'Centro de Alabanza Oasis',
  limiteDiario: Number(process.env.LIMITE_DIARIO_WHATSAPP ?? 250),

  whatsapp: {
    token: process.env.WHATSAPP_TOKEN ?? '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? '',
    appSecret: process.env.WHATSAPP_APP_SECRET ?? '',
    version: process.env.GRAPH_API_VERSION ?? 'v23.0',
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? '',
    modelo: process.env.GEMINI_MODELO ?? 'gemini-2.5-flash',
  },

  firebase: {
    cuentaServicio: process.env.FIREBASE_SERVICE_ACCOUNT ?? '',
  },
};

/**
 * Si no hay credenciales de WhatsApp, el servidor no falla: entra en
 * MODO SIMULADO. Registra en consola lo que habría enviado. Así se puede
 * probar toda la app sin haber terminado la verificación con Meta.
 */
export const WHATSAPP_SIMULADO =
  !config.whatsapp.token || !config.whatsapp.phoneNumberId;

export const HAY_FIREBASE_ADMIN = Boolean(config.firebase.cuentaServicio);

export const HAY_GEMINI = Boolean(config.gemini.apiKey);

export function urlGraph(ruta: string): string {
  return `https://graph.facebook.com/${config.whatsapp.version}/${ruta}`;
}
