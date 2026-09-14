import { WHATSAPP_SIMULADO } from '../server/config.js';
import { PLANTILLAS } from '../src/lib/plantillas.js';

export default function handler(_req: any, res: any) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    ok: true,
    simulado: WHATSAPP_SIMULADO,
    plantillas: Object.keys(PLANTILLAS),
    node: process.version,
  }));
}
