// =====================================================================
//  El servidor de Oasis Seguimiento.
//
//  Hace tres cosas:
//   1. Guarda los secretos (token de WhatsApp, clave de Gemini) para que
//      nunca lleguen al navegador.
//   2. Envía los mensajes de WhatsApp.
//   3. Recibe las respuestas de las personas en /webhook/whatsapp.
// =====================================================================

import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, WHATSAPP_SIMULADO, HAY_GEMINI } from './config';
import { db, HAY_DB } from './firebaseAdmin';
import { enviarPlantilla, enviarEnLote, estadoDelNumero } from './whatsapp';
import { verificarSuscripcion, recibirEvento } from './webhook';
import { correrSecuencia } from './secuencia';
import { PLANTILLAS } from '../src/lib/plantillas';

const app = express();

// Guardamos el cuerpo tal cual llega: se necesita para verificar la
// firma de Meta. Si se lee ya convertido a objeto, la firma no cuadra.
app.use(
  express.json({
    limit: '2mb',
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  }),
);
app.use(cors());

// ---------------------------------------------------------------------
//  Webhook de WhatsApp
// ---------------------------------------------------------------------

app.get('/webhook/whatsapp', verificarSuscripcion);
app.post('/webhook/whatsapp', recibirEvento);

// ---------------------------------------------------------------------
//  Estado
// ---------------------------------------------------------------------

app.get('/api/salud', (_req, res) => {
  res.json({
    ok: true,
    whatsapp: WHATSAPP_SIMULADO ? 'simulado' : 'conectado',
    baseDeDatos: HAY_DB ? 'conectada' : 'sin conectar',
    agente: HAY_GEMINI ? 'con Gemini' : 'reglas básicas',
  });
});

app.get('/api/whatsapp/estado', async (_req, res) => {
  res.json(await estadoDelNumero());
});

// ---------------------------------------------------------------------
//  Envíos
// ---------------------------------------------------------------------

app.post('/api/whatsapp/prueba', async (req, res) => {
  const { telefono, plantilla, variables } = req.body ?? {};

  if (!telefono || !plantilla) {
    return res.status(400).json({ mensaje: 'Faltan el teléfono o la plantilla.' });
  }

  const def = PLANTILLAS[plantilla];
  const resultado = await enviarPlantilla({
    telefono: String(telefono),
    plantilla,
    idioma: def?.idioma ?? 'es',
    variables: Array.isArray(variables) ? variables : [],
  });

  res.json({
    ok: resultado.estado !== 'fallido',
    enviados: resultado.estado === 'fallido' || resultado.estado === 'omitido' ? 0 : 1,
    omitidos: resultado.estado === 'omitido' ? 1 : 0,
    fallidos: resultado.estado === 'fallido' ? 1 : 0,
    simulado: resultado.estado === 'simulado',
    detalle: [resultado],
  });
});

app.post('/api/whatsapp/enviar', async (req, res) => {
  const { personaId, telefono, plantilla, variables } = req.body ?? {};

  if (!telefono || !plantilla) {
    return res.status(400).json({ mensaje: 'Faltan el teléfono o la plantilla.' });
  }

  // Comprobación de consentimiento del lado del servidor. El navegador
  // ya la hace, pero esta es la que de verdad protege el número.
  if (HAY_DB && personaId && db) {
    const doc = await db.collection('personas').doc(personaId).get();
    const p: any = doc.data();
    if (!p) return res.status(404).json({ mensaje: 'Esa persona no existe.' });
    if (!p.consentimiento?.otorgado) {
      return res.status(403).json({ mensaje: 'Esa persona no tiene autorización registrada.' });
    }
    if (p.banderas?.includes('No contactar')) {
      return res.status(403).json({ mensaje: 'Esa persona pidió no recibir más mensajes.' });
    }
  }

  const def = PLANTILLAS[plantilla];
  const resultado = await enviarPlantilla({
    personaId,
    telefono: String(telefono),
    plantilla,
    idioma: def?.idioma ?? 'es',
    variables: Array.isArray(variables) ? variables : [],
  });

  res.json({
    ok: resultado.estado !== 'fallido',
    enviados: resultado.estado === 'enviado' || resultado.estado === 'simulado' ? 1 : 0,
    omitidos: resultado.estado === 'omitido' ? 1 : 0,
    fallidos: resultado.estado === 'fallido' ? 1 : 0,
    simulado: resultado.estado === 'simulado',
    detalle: [resultado],
  });
});

app.post('/api/whatsapp/difundir', async (req, res) => {
  const { difusionId, plantilla, urlMedia, tituloPalabra, destinatarios } = req.body ?? {};

  if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
    return res.status(400).json({ mensaje: 'No hay destinatarios.' });
  }
  if (destinatarios.length > config.limiteDiario) {
    return res.status(400).json({
      mensaje: `El envío supera el límite de ${config.limiteDiario} personas cada 24 horas.`,
    });
  }

  const def = PLANTILLAS[plantilla];
  if (!def) return res.status(400).json({ mensaje: 'Esa plantilla no está registrada en la app.' });

  const resultados = await enviarEnLote(destinatarios, (d) => ({
    plantilla: def.nombre,
    variables:
      def.variables.length > 1
        ? [primerNombre(d.nombre), tituloPalabra ?? '']
        : [primerNombre(d.nombre)],
    urlMedia,
    textoParaHistorial: def.vistaPrevia
      .replace('{{1}}', primerNombre(d.nombre))
      .replace('{{2}}', tituloPalabra ?? ''),
  }));

  const enviados = resultados.filter(
    (r) => r.estado === 'enviado' || r.estado === 'simulado',
  ).length;
  const fallidos = resultados.filter((r) => r.estado === 'fallido').length;
  const omitidos = resultados.filter((r) => r.estado === 'omitido').length;

  if (HAY_DB && difusionId && db) {
    await db
      .collection('difusiones')
      .doc(difusionId)
      .set({ enviados, fallidos, estado: 'completada' }, { merge: true })
      .catch(() => undefined);
  }

  res.json({
    ok: fallidos === 0,
    enviados,
    fallidos,
    omitidos,
    simulado: WHATSAPP_SIMULADO,
    detalle: resultados,
  });
});

// ---------------------------------------------------------------------
//  Secuencia automática
// ---------------------------------------------------------------------

app.post('/api/secuencia/correr', async (_req, res) => {
  res.json(await correrSecuencia());
});

// ---------------------------------------------------------------------
//  La app compilada, cuando corre en producción
// ---------------------------------------------------------------------

const aqui = path.dirname(fileURLToPath(import.meta.url));
const carpetaCompilada = path.join(aqui, '..', 'dist');

app.use(express.static(carpetaCompilada));
app.get('*', (req, res, siguiente) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/webhook')) return siguiente();
  res.sendFile(path.join(carpetaCompilada, 'index.html'), (error) => {
    if (error) res.status(404).send('La app todavía no está compilada. Ejecuta: npm run build');
  });
});

// ---------------------------------------------------------------------

app.listen(config.puerto, () => {
  console.log('');
  console.log(`  Oasis Seguimiento — servidor en http://localhost:${config.puerto}`);
  console.log(`  WhatsApp:        ${WHATSAPP_SIMULADO ? 'MODO SIMULADO (no sale ningún mensaje)' : 'conectado'}`);
  console.log(`  Base de datos:   ${HAY_DB ? 'Firestore conectado' : 'sin conectar'}`);
  console.log(`  Agente:          ${HAY_GEMINI ? 'Gemini activo' : 'reglas básicas (sin Gemini)'}`);
  console.log('');
});

function primerNombre(nombre: string): string {
  return (nombre ?? '').trim().split(/\s+/)[0] ?? '';
}
