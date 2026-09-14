export default async function handler(_req: any, res: any) {
  const salida: any = { node: process.version, piezas: {} };
  const piezas: Record<string, () => Promise<any>> = {
    config: () => import('../server/config.js'),
    plantillas: () => import('../src/lib/plantillas.js'),
    firebase: () => import('../server/firebaseAdmin.js'),
    whatsapp: () => import('../server/whatsapp.js'),
    agente: () => import('../server/agente.js'),
    webhook: () => import('../server/webhook.js'),
    secuencia: () => import('../server/secuencia.js'),
  };
  for (const nombre of Object.keys(piezas)) {
    try {
      await piezas[nombre]();
      salida.piezas[nombre] = 'ok';
    } catch (e: any) {
      salida.piezas[nombre] = 'FALLA: ' + (e?.message ?? String(e));
    }
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(salida, null, 2));
}
