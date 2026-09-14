// El agente de Oasis en Vercel. Un solo archivo atiende todas las rutas.
// Cual de ellas se decide con el parametro r, que asigna vercel.json.
// La logica de verdad sigue viviendo en la carpeta server/.
//
// Vercel puede llamar una funcion de dos formas distintas segun la version
// de su plataforma: a la antigua, con (req, res) de Node, o a la moderna,
// con Request y Response. Este archivo entiende las dos, para no depender
// de cual le toque.

import { verificarSuscripcion, recibirEvento } from '../server/webhook';
import { enviarPlantilla, enviarEnLote, estadoDelNumero } from '../server/whatsapp';
import { correrSecuencia } from '../server/secuencia';
import { db, HAY_DB } from '../server/firebaseAdmin';
import { config as ajustes, WHATSAPP_SIMULADO, HAY_GEMINI } from '../server/config';
import { PLANTILLAS } from '../src/lib/plantillas';

function json(obj: unknown, codigo = 200): Response {
  return new Response(JSON.stringify(obj), {
    status: codigo,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function plano(cuerpo: string, codigo = 200): Response {
  return new Response(cuerpo, {
    status: codigo,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

function primerNombre(nombre: string): string {
  return (nombre ?? '').trim().split(/\s+/)[0] ?? '';
}

function llamadaAutorizada(peticion: Request): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return true;
  return peticion.headers.get('authorization') === 'Bearer ' + secreto;
}

function leerJson(crudo: string): any {
  if (!crudo) return {};
  try {
    return JSON.parse(crudo);
  } catch {
    return {};
  }
}

function fingirPeticion(
  peticion: Request,
  query: Record<string, string>,
  body: any,
  crudo?: string,
) {
  return {
    query,
    body,
    rawBody: crudo === undefined ? undefined : Buffer.from(crudo, 'utf8'),
    get(nombre: string) {
      return peticion.headers.get(nombre) ?? undefined;
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

function cualRuta(url: URL): string {
  const r = url.searchParams.get('r');
  if (r) return r;
  const p = url.pathname;
  if (p.indexOf('/webhook') === 0 || p.indexOf('/api/webhook') === 0) return 'webhook';
  if (p.indexOf('/api/secuencia') === 0) return 'secuencia';
  if (p.indexOf('/api/whatsapp/estado') === 0) return 'estado';
  if (p.indexOf('/api/whatsapp/prueba') === 0) return 'prueba';
  if (p.indexOf('/api/whatsapp/enviar') === 0) return 'enviar';
  if (p.indexOf('/api/whatsapp/difundir') === 0) return 'difundir';
  return 'salud';
}

async function atender(peticion: Request): Promise<Response> {
  const url = new URL(peticion.url);
  const ruta = cualRuta(url);
  const metodo = peticion.method;
  const query: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { query[k] = v; });

  try {
    if (ruta === 'webhook') {
      if (metodo === 'GET') {
        const { objeto, estado } = fingirRespuesta();
        verificarSuscripcion(fingirPeticion(peticion, query, {}), objeto);
        return plano(estado.cuerpo, estado.codigo);
      }
      if (metodo !== 'POST') return json({ mensaje: 'Metodo no permitido.' }, 405);

      const crudo = await peticion.text();
      const { objeto, estado } = fingirRespuesta();

      await recibirEvento(fingirPeticion(peticion, query, leerJson(crudo), crudo), objeto);

      return plano(estado.cuerpo, estado.codigo);
    }

    if (ruta === 'salud') {
      return json({
        ok: true,
        whatsapp: WHATSAPP_SIMULADO ? 'simulado' : 'conectado',
        baseDeDatos: HAY_DB ? 'conectada' : 'sin conectar',
        agente: HAY_GEMINI ? 'con Gemini' : 'reglas basicas',
      });
    }

    if (ruta === 'estado') {
      return json(await estadoDelNumero());
    }

    if (ruta === 'secuencia') {
      if (metodo !== 'GET' && metodo !== 'POST') {
        return json({ mensaje: 'Metodo no permitido.' }, 405);
      }
      if (!llamadaAutorizada(peticion)) {
        return json({ mensaje: 'Esta direccion no se puede llamar desde fuera.' }, 401);
      }
      return json(await correrSecuencia());
    }

    if (ruta === 'prueba') {
      if (metodo !== 'POST') return json({ mensaje: 'Metodo no permitido.' }, 405);
      const datos = leerJson(await peticion.text());
      const telefono = datos?.telefono;
      const plantilla = datos?.plantilla;
      const variables = datos?.variables;
      if (!telefono || !plantilla) {
        return json({ mensaje: 'Faltan el telefono o la plantilla.' }, 400);
      }
      const def = PLANTILLAS[plantilla];
      const r = await enviarPlantilla({
        telefono: String(telefono),
        plantilla,
        idioma: def?.idioma ?? 'es',
        variables: Array.isArray(variables) ? variables : [],
      });
      return json({
        ok: r.estado !== 'fallido',
        enviados: r.estado === 'fallido' || r.estado === 'omitido' ? 0 : 1,
        omitidos: r.estado === 'omitido' ? 1 : 0,
        fallidos: r.estado === 'fallido' ? 1 : 0,
        simulado: r.estado === 'simulado',
        detalle: [r],
      });
    }

    if (ruta === 'enviar') {
      if (metodo !== 'POST') return json({ mensaje: 'Metodo no permitido.' }, 405);
      const datos = leerJson(await peticion.text());
      const personaId = datos?.personaId;
      const telefono = datos?.telefono;
      const plantilla = datos?.plantilla;
      const variables = datos?.variables;
      if (!telefono || !plantilla) {
        return json({ mensaje: 'Faltan el telefono o la plantilla.' }, 400);
      }

      if (HAY_DB && personaId && db) {
        const doc = await db.collection('personas').doc(personaId).get();
        const p: any = doc.data();
        if (!p) return json({ mensaje: 'Esa persona no existe.' }, 404);
        if (!p.consentimiento?.otorgado) {
          return json({ mensaje: 'Esa persona no tiene autorizacion registrada.' }, 403);
        }
        if (p.banderas?.includes('No contactar')) {
          return json({ mensaje: 'Esa persona pidio no recibir mas mensajes.' }, 403);
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
      return json({
        ok: r.estado !== 'fallido',
        enviados: r.estado === 'enviado' || r.estado === 'simulado' ? 1 : 0,
        omitidos: r.estado === 'omitido' ? 1 : 0,
        fallidos: r.estado === 'fallido' ? 1 : 0,
        simulado: r.estado === 'simulado',
        detalle: [r],
      });
    }

    if (ruta === 'difundir') {
      if (metodo !== 'POST') return json({ mensaje: 'Metodo no permitido.' }, 405);
      const datos = leerJson(await peticion.text());
      const difusionId = datos?.difusionId;
      const plantilla = datos?.plantilla;
      const urlMedia = datos?.urlMedia;
      const tituloPalabra = datos?.tituloPalabra;
      const destinatarios = datos?.destinatarios;

      if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
        return json({ mensaje: 'No hay destinatarios.' }, 400);
      }
      if (destinatarios.length > ajustes.limiteDiario) {
        return json({
          mensaje: 'El envio supera el limite de ' + ajustes.limiteDiario + ' personas cada 24 horas.',
        }, 400);
      }
      const def = PLANTILLAS[plantilla];
      if (!def) return json({ mensaje: 'Esa plantilla no esta registrada en la app.' }, 400);

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

      return json({
        ok: fallidos === 0,
        total: destinatarios.length,
        enviados,
        fallidos,
        omitidos,
        simulado: WHATSAPP_SIMULADO,
        detalle: resultados,
      });
    }

    return json({ mensaje: 'No existe esa ruta.' }, 404);
  } catch (e: any) {
    console.error('[api] error en', ruta, e?.message);
    return json({ mensaje: e?.message ?? 'Error inesperado en el servidor.' }, 500);
  }
}

function leerFlujo(req: any): Promise<string> {
  return new Promise((resolver) => {
    const partes: Buffer[] = [];
    try {
      req.on('data', (t: any) => partes.push(typeof t === 'string' ? Buffer.from(t) : t));
      req.on('end', () => resolver(Buffer.concat(partes).toString('utf8')));
      req.on('error', () => resolver(''));
    } catch {
      resolver('');
    }
  });
}

async function desdeNode(req: any): Promise<Request> {
  const anfitrion = req.headers['x-forwarded-host'] || req.headers.host || 'oasis.local';
  const protocolo = req.headers['x-forwarded-proto'] || 'https';
  const direccion = protocolo + '://' + anfitrion + (req.url || '/');

  const cabeceras = new Headers();
  const crudas = req.headers || {};
  Object.keys(crudas).forEach((clave) => {
    const valor = crudas[clave];
    if (typeof valor === 'string') cabeceras.set(clave, valor);
    else if (Array.isArray(valor)) cabeceras.set(clave, valor.join(','));
  });

  const metodo = (req.method || 'GET').toUpperCase();
  let cuerpo: string | undefined;
  if (metodo !== 'GET' && metodo !== 'HEAD') {
    cuerpo = await leerFlujo(req);
    if (!cuerpo && req.body != null) {
      if (typeof req.body === 'string') cuerpo = req.body;
      else if (Buffer.isBuffer(req.body)) cuerpo = req.body.toString('utf8');
      else cuerpo = JSON.stringify(req.body);
    }
  }

  return new Request(direccion, { method: metodo, headers: cabeceras, body: cuerpo });
}

async function haciaNode(respuesta: Response, res: any) {
  res.statusCode = respuesta.status;
  respuesta.headers.forEach((valor: string, clave: string) => {
    try { res.setHeader(clave, valor); } catch { }
  });
  res.end(await respuesta.text());
}

export async function GET(peticion: Request) {
  return atender(peticion);
}

export async function POST(peticion: Request) {
  return atender(peticion);
}

export default async function handler(a: any, b?: any) {
  if (b && typeof b.setHeader === 'function') {
    const respuesta = await atender(await desdeNode(a));
    return haciaNode(respuesta, b);
  }
  return atender(a as Request);
}
