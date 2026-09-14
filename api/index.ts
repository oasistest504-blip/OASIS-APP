// El agente de Oasis en Vercel. Un solo archivo atiende todas las rutas:
// /webhook/whatsapp, /api/secuencia/correr, /api/whatsapp/estado,
// /api/whatsapp/prueba, /api/whatsapp/enviar, /api/whatsapp/difundir y /api/salud.
// La lógica sigue viviendo en server/; aquí solo se reparte cada llamada.

import type { IncomingMessage, ServerResponse } from 'node:http';
import { verificarSuscripcion, recibirEvento } from '../server/webhook';
import { enviarPlantilla, enviarEnLote, estadoDelNumero } from '../server/whatsapp';
import { correrSecuencia } from '../server/secuencia';
import { db, HAY_DB } from '../server/firebaseAdmin';
import { config as ajustes, WHATSAPP_SIMULADO, HAY_GEMINI } from '../server/config';
import { PLANTILLAS } from '../src/lib/plantillas';

// Vercel no debe tocar el cuerpo: se necesita tal cual llega para
// comprobar la firma de Meta. Si se convierte y se vuelve a convertir,
// las comas cambian y la firma deja de cuadrar.
export const config = { api: { bodyParser: false } };

type Peticion = IncomingMessage;
type Respuesta = ServerResponse;

async function leerCuerpo(req: Peticion): Promise<{ crudo: Buffer; datos: any }> {
  const partes: Buffer[] = [];
  for await (const parte of req) {
    partes.push(typeof parte === 'string' ? Buffer.from(parte) : (parte as Buffer));
  }
  const crudo = Buffer.concat(partes);
  let datos: any = {};
  if (crudo.length) {
    try {
      datos = JSON.parse(crudo.toString('utf8'));
    } catch {
      datos = {};
    }
  }
  return { crudo, datos };
}

function responder(res: Respuesta, codigo: number, obj: unknown) {
  res.statusCode = codigo;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

function primerNombre(nombre: string): string {
  return (nombre ?? '').trim().split(/\s+/)[0] ?? '';
}

// Si hay palabra secreta configurada se exige, para que nadie de fuera
// pueda hacer que la iglesia mande mensajes llamando esta dirección.
function llamadaAutorizada(req: Peticion): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return true;
  return req.headers['authorization'] === `Bearer ${secreto}`;
}

// server/webhook.ts está escrito para Express. En vez de duplicar esa
// lógica, le damos objetos con la forma que espera.
function fingirPeticion(base: Peticion, query: Record<string, string>, body: any, crudo?: Buffer) {
  return {
    query,
    body,
    rawBody: crudo,
    get(nombre: string) {
      const valor = base.headers[nombre.toLowerCase()];
      return Array.isArray(valor) ? valor[0] : valor;
    },
  } as any;
}

function fingirRespuesta() {
  const estado = { codigo: 200, cuerpo: '' };
  const objeto: any = {
    status(c: number) { estado.codigo = c; return objeto; },
    send(t: unknown) { estado.cuerpo = t == null ? '' : String(t); return objeto; },
    json(o: unknown) { estado.cuerpo = JSON.stringify(o); return objeto; },
    sendStatus(c: number) { estado.codigo = c; estado.cuerpo = String(c); return objeto; },
  };
  return { objeto, estado };
}

export default async function handler(req: Peticion, res: Respuesta) {
  const url = new URL(req.url ?? '/', 'http://oasis');
  const ruta = url.pathname.replace(/^\/api/, '').replace(/\/+$/, '') || '/';
  const query: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { query[k] = v; });

  try {
    if (ruta === '/webhook/whatsapp') {
      if (req.method === 'GET') {
        const { objeto, estado } = fingirRespuesta();
        verificarSuscripcion(fingirPeticion(req, query, {}), objeto);
        res.statusCode = estado.codigo;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.end(estado.cuerpo);
      }
      if (req.method !== 'POST') return responder(res, 405, { mensaje: 'Método no permitido.' });

      const { crudo, datos } = await leerCuerpo(req);
      const { objeto, estado } = fingirRespuesta();

      // El servidor de siempre contestaba «recibido» y procesaba después.
      // En Vercel la función se congela apenas responde, así que primero
      // se hace el trabajo —guardar, etiquetar, crear la tarea— y solo
      // entonces se contesta. Si tarda de más, Meta reintenta.
      await recibirEvento(fingirPeticion(req, query, datos, crudo), objeto);

      res.statusCode = estado.codigo;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.end(estado.cuerpo);
    }

    if (ruta === '/salud') {
      return responder(res, 200, {
        ok: true,
        whatsapp: WHATSAPP_SIMULADO ? 'simulado' : 'conectado',
        baseDeDatos: HAY_DB ? 'conectada' : 'sin conectar',
        agente: HAY_GEMINI ? 'con Gemini' : 'reglas básicas',
      });
    }

    if (ruta === '/whatsapp/estado') {
      return responder(res, 200, await estadoDelNumero());
    }

    if (ruta === '/secuencia/correr') {
      if (req.method !== 'GET' && req.method !== 'POST') {
        return responder(res, 405, { mensaje: 'Método no permitido.' });
      }
      if (!llamadaAutorizada(req)) {
        return responder(res, 401, { mensaje: 'Esta dirección no se puede llamar desde fuera.' });
      }
      return responder(res, 200, await correrSecuencia());
    }

    if (ruta === '/whatsapp/prueba') {
      if (req.method !== 'POST') return responder(res, 405, { mensaje: 'Método no permitido.' });
      const { datos } = await leerCuerpo(req);
      const { telefono, plantilla, variables } = datos ?? {};
      if (!telefono || !plantilla) {
        return responder(res, 400, { mensaje: 'Faltan el teléfono o la plantilla.' });
      }
      const def = PLANTILLAS[plantilla];
      const r = await enviarPlantilla({
        telefono: String(telefono),
        plantilla,
        idioma: def?.idioma ?? 'es',
        variables: Array.isArray(variables) ? variables : [],
      });
      return responder(res, 200, {
        ok: r.estado !== 'fallido',
        enviados: r.estado === 'fallido' || r.estado === 'omitido' ? 0 : 1,
        omitidos: r.estado === 'omitido' ? 1 : 0,
        fallidos: r.estado === 'fallido' ? 1 : 0,
        simulado: r.estado === 'simulado',
        detalle: [r],
      });
    }

    if (ruta === '/whatsapp/enviar') {
      if (req.method !== 'POST') return responder(res, 405, { mensaje: 'Método no permitido.' });
      const { datos } = await leerCuerpo(req);
      const { personaId, telefono, plantilla, variables } = datos ?? {};
      if (!telefono || !plantilla) {
        return responder(res, 400, { mensaje: 'Faltan el teléfono o la plantilla.' });
      }

      // El navegador ya comprueba el consentimiento, pero esta es la
      // comprobación que de verdad protege el número de la iglesia.
      if (HAY_DB && personaId && db) {
        const doc = await db.collection('personas').doc(personaId).get();
        const p: any = doc.data();
        if (!p) return responder(res, 404, { mensaje: 'Esa persona no existe.' });
        if (!p.consentimiento?.otorgado) {
          return responder(res, 403, { mensaje: 'Esa persona no tiene autorización registrada.' });
        }
        if (p.banderas?.includes('No contactar')) {
          return responder(res, 403, { mensaje: 'Esa persona pidió no recibir más mensajes.' });
        }
      }

      const def = PLANTILLAS[plantilla];
      const r = await enviarPlantilla({
        personaId,
        telefono: String(telefono),
        plantilla,
        idioma: def?.idioma ?? 'es',
        variables: Array.isArray(variables) ? variables : [],
      });
      return responder(res, 200, {
        ok: r.estado !== 'fallido',
        enviados: r.estado === 'enviado' || r.estado === 'simulado' ? 1 : 0,
        omitidos: r.estado === 'omitido' ? 1 : 0,
        fallidos: r.estado === 'fallido' ? 1 : 0,
        simulado: r.estado === 'simulado',
        detalle: [r],
      });
    }

    if (ruta === '/whatsapp/difundir') {
      if (req.method !== 'POST') return responder(res, 405, { mensaje: 'Método no permitido.' });
      const { datos } = await leerCuerpo(req);
      const { difusionId, plantilla, urlMedia, tituloPalabra, destinatarios } = datos ?? {};

      if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
        return responder(res, 400, { mensaje: 'No hay destinatarios.' });
      }
      if (destinatarios.length > ajustes.limiteDiario) {
        return responder(res, 400, {
          mensaje: `El envío supera el límite de ${ajustes.limiteDiario} personas cada 24 horas.`,
        });
      }
      const def = PLANTILLAS[plantilla];
      if (!def) return responder(res, 400, { mensaje: 'Esa plantilla no está registrada en la app.' });

      const resultados = await enviarEnLote(destinatarios, (d: any) => ({
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

      const enviados = resultados.filter((r) => r.estado === 'enviado' || r.estado === 'simulado').length;
      const fallidos = resultados.filter((r) => r.estado === 'fallido').length;
      const omitidos = resultados.filter((r) => r.estado === 'omitido').length;

      if (HAY_DB && difusionId && db) {
        await db
          .collection('difusiones')
          .doc(difusionId)
          .set({ enviados, fallidos, estado: 'completada' }, { merge: true })
          .catch(() => undefined);
      }

      return responder(res, 200, {
        ok: fallidos === 0,
        total: destinatarios.length,
        enviados,
        fallidos,
        omitidos,
        simulado: WHATSAPP_SIMULADO,
        detalle: resultados,
      });
    }

    return responder(res, 404, { mensaje: `No existe la ruta ${ruta}.` });
  } catch (e: any) {
    console.error('[api] error en', ruta, e?.message);
    return responder(res, 500, { mensaje: e?.message ?? 'Error inesperado en el servidor.' });
  }
}
