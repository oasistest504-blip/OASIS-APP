// El agente de Oasis en Vercel. Un solo archivo atiende todas las rutas.
// Cual de ellas se decide con el parametro r, que asigna vercel.json.
// La logica de verdad sigue viviendo en la carpeta server/.

import type { IncomingMessage, ServerResponse } from 'node:http';
import { verificarSuscripcion, recibirEvento } from '../server/webhook';
import { enviarPlantilla, enviarEnLote, estadoDelNumero } from '../server/whatsapp';
import { correrSecuencia } from '../server/secuencia';
import { db, HAY_DB } from '../server/firebaseAdmin';
import { config as ajustes, WHATSAPP_SIMULADO, HAY_GEMINI } from '../server/config';
import { PLANTILLAS } from '../src/lib/plantillas';

// Vercel no debe tocar el cuerpo: se necesita tal cual llega para
// comprobar la firma de Meta.
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

function texto(res: Respuesta, codigo: number, cuerpo: string) {
  res.statusCode = codigo;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(cuerpo);
}

function primerNombre(nombre: string): string {
  return (nombre ?? '').trim().split(/\s+/)[0] ?? '';
}

function llamadaAutorizada(req: Peticion): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return true;
  return req.headers['authorization'] === 'Bearer ' + secreto;
}

// server/webhook.ts esta escrito para Express. En vez de duplicar esa
// logica, le damos objetos con la forma que espera.
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

// Si no viene el parametro r, se deduce de la direccion, para que la
// funcion tambien responda si se la llama directamente.
function cualRuta(url: URL): string {
  const r = url.searchParams.get('r');
  if (r) return r;
  const p = url.pathname;
  if (p.indexOf('/webhook') === 0) return 'webhook';
  if (p.indexOf('/api/webhook') === 0) return 'webhook';
  if (p.indexOf('/api/secuencia') === 0) return 'secuencia';
  if (p.indexOf('/api/whatsapp/estado') === 0) return 'estado';
  if (p.indexOf('/api/whatsapp/prueba') === 0) return 'prueba';
  if (p.indexOf('/api/whatsapp/enviar') === 0) return 'enviar';
  if (p.indexOf('/api/whatsapp/difundir') === 0) return 'difundir';
  return 'salud';
}

export default async function handler(req: Peticion, res: Respuesta) {
  const url = new URL(req.url ?? '/', 'http://oasis');
  const ruta = cualRuta(url);
  const query: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { query[k] = v; });

  try {
    if (ruta === 'webhook') {
      if (req.method === 'GET') {
        const { objeto, estado } = fingirRespuesta();
        verificarSuscripcion(fingirPeticion(req, query, {}), objeto);
        return texto(res, estado.codigo, estado.cuerpo);
      }
      if (req.method !== 'POST') return responder(res, 405, { mensaje: 'Metodo no permitido.' });

      const { crudo, datos } = await leerCuerpo(req);
      const { objeto, estado } = fingirRespuesta();

      // El servidor de siempre contestaba y procesaba despues. En Vercel
      // la funcion se congela apenas responde, asi que primero se hace el
      // trabajo y solo entonces se contesta.
      await recibirEvento(fingirPeticion(req, query, datos, crudo), objeto);

      return texto(res, estado.codigo, estado.cuerpo);
    }

    if (ruta === 'salud') {
      return responder(res, 200, {
        ok: true,
        whatsapp: WHATSAPP_SIMULADO ? 'simulado' : 'conectado',
        baseDeDatos: HAY_DB ? 'conectada' : 'sin conectar',
        agente: HAY_GEMINI ? 'con Gemini' : 'reglas basicas',
      });
    }

    if (ruta === 'estado') {
      return responder(res, 200, await estadoDelNumero());
    }

    if (ruta === 'secuencia') {
      if (req.method !== 'GET' && req.method !== 'POST') {
        return responder(res, 405, { mensaje: 'Metodo no permitido.' });
      }
      if (!llamadaAutorizada(req)) {
        return responder(res, 401, { mensaje: 'Esta direccion no se puede llamar desde fuera.' });
      }
      return responder(res, 200, await correrSecuencia());
    }

    if (ruta === 'prueba') {
      if (req.method !== 'POST') return responder(res, 405, { mensaje: 'Metodo no permitido.' });
      const { datos } = await leerCuerpo(req);
      const telefono = datos?.telefono;
      const plantilla = datos?.plantilla;
      const variables = datos?.variables;
      if (!telefono || !plantilla) {
        return responder(res, 400, { mensaje: 'Faltan el telefono o la plantilla.' });
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

    if (ruta === 'enviar') {
      if (req.method !== 'POST') return responder(res, 405, { mensaje: 'Metodo no permitido.' });
      const { datos } = await leerCuerpo(req);
      const personaId = datos?.personaId;
      const telefono = datos?.telefono;
      const plantilla = datos?.plantilla;
      const variables = datos?.variables;
      if (!telefono || !plantilla) {
        return responder(res, 400, { mensaje: 'Faltan el telefono o la plantilla.' });
      }

      // El navegador ya comprueba el consentimiento, pero esta es la
      // comprobacion que de verdad protege el numero de la iglesia.
      if (HAY_DB && personaId && db) {
        const doc = await db.collection('personas').doc(personaId).get();
        const p: any = doc.data();
        if (!p) return responder(res, 404, { mensaje: 'Esa persona no existe.' });
        if (!p.consentimiento?.otorgado) {
          return responder(res, 403, { mensaje: 'Esa persona no tiene autorizacion registrada.' });
        }
        if (p.banderas?.includes('No contactar')) {
          return responder(res, 403, { mensaje: 'Esa persona pidio no recibir mas mensajes.' });
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

    if (ruta === 'difundir') {
      if (req.method !== 'POST') return responder(res, 405, { mensaje: 'Metodo no permitido.' });
      const { datos } = await leerCuerpo(req);
      const difusionId = datos?.difusionId;
      const plantilla = datos?.plantilla;
      const urlMedia = datos?.urlMedia;
      const tituloPalabra = datos?.tituloPalabra;
      const destinatarios = datos?.destinatarios;

      if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
        return responder(res, 400, { mensaje: 'No hay destinatarios.' });
      }
      if (destinatarios.length > ajustes.limiteDiario) {
        return responder(res, 400, {
          mensaje: 'El envio supera el limite de ' + ajustes.limiteDiario + ' personas cada 24 horas.',
        });
      }
      const def = PLANTILLAS[plantilla];
      if (!def) return responder(res, 400, { mensaje: 'Esa plantilla no esta registrada en la app.' });

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

      const enviados = resultados.filter((x) => x.estado === 'enviado' || x.estado === 'simulado').length;
      const fallidos = resultados.filter((x) => x.estado === 'fallido').length;
      const omitidos = resultados.filter((x) => x.estado === 'omitido').length;

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

    return responder(res, 404, { mensaje: 'No existe esa ruta.' });
  } catch (e: any) {
    console.error('[api] error en', ruta, e?.message);
    return responder(res, 500, { mensaje: e?.message ?? 'Error inesperado en el servidor.' });
  }
}
