// =====================================================================
//  El webhook: lo que llega desde WhatsApp.
//
//  Meta manda aquí cada mensaje que una persona le escribe al número de
//  la iglesia, y cada cambio de estado de los mensajes que enviamos.
//
//  SEGURIDAD: se verifica SIEMPRE la firma X-Hub-Signature-256. Sin eso,
//  cualquiera que conozca la dirección podría escribir en la base de
//  datos de la iglesia haciéndose pasar por Meta.
// =====================================================================

import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { config, WHATSAPP_SIMULADO } from './config';
import {
  db,
  buscarPersonaPorTelefono,
  guardarInteraccion,
  actualizarPersona,
  crearTarea,
} from './firebaseAdmin';
import { leerMensaje, redactarRespuesta } from './agente';
import { enviarTextoLibre } from './whatsapp';
import { BOTONES } from '../src/lib/plantillas';

/** Verificación inicial: Meta llama con GET una sola vez. */
export function verificarSuscripcion(req: Request, res: Response) {
  const modo = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const reto = req.query['hub.challenge'];

  if (modo === 'subscribe' && token === config.whatsapp.verifyToken) {
    console.log('[webhook] Meta verificó el webhook correctamente.');
    return res.status(200).send(reto);
  }

  console.warn('[webhook] intento de verificación con token incorrecto.');
  return res.sendStatus(403);
}

/** ¿Este mensaje viene de verdad de Meta? */
export function firmaValida(req: Request): boolean {
  // Sin appSecret no se puede verificar. Solo lo permitimos en modo
  // simulado, para poder probar el flujo en el computador.
  if (!config.whatsapp.appSecret) return WHATSAPP_SIMULADO;

  const firma = req.get('x-hub-signature-256');
  if (!firma) return false;

  const crudo = (req as any).rawBody as Buffer | undefined;
  if (!crudo) return false;

  const esperada =
    'sha256=' +
    crypto.createHmac('sha256', config.whatsapp.appSecret).update(crudo).digest('hex');

  const a = Buffer.from(firma);
  const b = Buffer.from(esperada);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function normalizarBoton(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes, para que "si" y "sí" sean lo mismo
    .trim();
}

function coincide(texto: string, lista: string[]): boolean {
  const t = normalizarBoton(texto);
  return lista.some((opcion) => normalizarBoton(opcion) === t || t.includes(normalizarBoton(opcion)));
}

function enDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

/**
 * Recibe el evento. Responde 200 de inmediato y procesa después, para
 * que Meta no crea que fallamos y reintente.
 */
export async function recibirEvento(req: Request, res: Response) {
  if (!firmaValida(req)) {
    console.warn('[webhook] firma inválida: petición rechazada.');
    return res.sendStatus(401);
  }

  res.sendStatus(200);

  try {
    await procesar(req.body);
  } catch (e: any) {
    console.error('[webhook] error procesando el evento:', e?.message);
  }
}

async function procesar(cuerpo: any) {
  const entradas = cuerpo?.entry ?? [];

  for (const entrada of entradas) {
    for (const cambio of entrada.changes ?? []) {
      const valor = cambio.value ?? {};

      // 1. Estados de entrega de lo que nosotros enviamos.
      for (const estado of valor.statuses ?? []) {
        await actualizarEstadoMensaje(estado);
      }

      // 2. Mensajes que nos escribieron.
      for (const mensaje of valor.messages ?? []) {
        const nombrePerfil =
          valor.contacts?.find((c: any) => c.wa_id === mensaje.from)?.profile?.name ?? '';
        await procesarMensaje(mensaje, nombrePerfil);
      }
    }
  }
}

async function actualizarEstadoMensaje(estado: any) {
  if (!db) return;
  const id = estado.id;
  if (!id) return;
  const snap = await db
    .collection('interacciones')
    .where('mensajeIdMeta', '==', id)
    .limit(1)
    .get();
  if (snap.empty) return;

  const traduccion: Record<string, string> = {
    sent: 'enviado',
    delivered: 'entregado',
    read: 'leido',
    failed: 'fallido',
  };
  await snap.docs[0].ref.update({
    estado: traduccion[estado.status] ?? estado.status,
    ...(estado.errors?.[0]?.title ? { error: estado.errors[0].title } : {}),
  });
}

async function procesarMensaje(mensaje: any, nombrePerfil: string) {
  const telefono: string = mensaje.from;
  const ahora = new Date().toISOString();

  // ¿Qué escribió? Puede ser texto libre o el toque de un botón.
  let texto = '';
  let esBoton = false;

  if (mensaje.type === 'text') {
    texto = mensaje.text?.body ?? '';
  } else if (mensaje.type === 'button') {
    texto = mensaje.button?.text ?? '';
    esBoton = true;
  } else if (mensaje.type === 'interactive') {
    texto =
      mensaje.interactive?.button_reply?.title ??
      mensaje.interactive?.list_reply?.title ??
      '';
    esBoton = true;
  } else {
    texto = `[${mensaje.type}]`;
  }

  // 1. Encontrar o crear a la persona.
  let persona = await buscarPersonaPorTelefono(telefono);

  if (!persona && db) {
    const nueva = {
      nombre: nombrePerfil || `Contacto ${telefono.slice(-4)}`,
      telefonoE164: telefono,
      etapa: 'Nuevo',
      banderas: [],
      origen: 'Escribió por WhatsApp',
      liderAsignadoId: null,
      liderAsignadoNombre: null,
      consentimiento: {
        // Escribir primero es una forma válida de consentimiento: la
        // persona inició la conversación con la iglesia.
        otorgado: true,
        fecha: ahora,
        medio: 'Escribió primero por WhatsApp',
        registradoPorUid: 'sistema',
      },
      notas: '',
      fechaIngreso: ahora,
      ultimoContacto: ahora,
      ventanaAbiertaHasta: enDias(1),
      sinRespuestaConsecutivos: 0,
      pasosEnviados: [],
      creadoPorUid: 'sistema',
    };
    const ref = await db.collection('personas').add(nueva);
    persona = { id: ref.id, ...nueva };
    console.log('[webhook] persona nueva creada desde WhatsApp:', telefono);
  }

  if (!persona) {
    console.log('[webhook] sin base de datos: mensaje recibido de', telefono, '->', texto);
    return;
  }

  // 2. Guardar el mensaje y abrir la ventana de 24 horas.
  await guardarInteraccion({
    personaId: persona.id,
    direccion: 'entrante',
    canal: 'whatsapp',
    texto,
    mensajeIdMeta: mensaje.id,
  });

  await actualizarPersona(persona.id, {
    ultimoContacto: ahora,
    ventanaAbiertaHasta: enDias(1),
    sinRespuestaConsecutivos: 0,
  });

  const banderas: string[] = Array.isArray(persona.banderas) ? [...persona.banderas] : [];

  function marcar(b: string) {
    if (!banderas.includes(b)) banderas.push(b);
  }
  function desmarcar(b: string) {
    const i = banderas.indexOf(b);
    if (i >= 0) banderas.splice(i, 1);
  }

  // 3a. Si tocó un botón, la regla es directa. No hace falta la IA.
  if (esBoton) {
    if (coincide(texto, BOTONES.bajaLista)) {
      await actualizarPersona(persona.id, { banderas: ['No contactar'] });
      await enviarTextoLibre({
        personaId: persona.id,
        telefono,
        texto:
          'Listo, no volverás a recibir mensajes nuestros. Si alguna vez quieres retomar, escríbenos por aquí. Que Dios te bendiga.',
        ventanaAbiertaHasta: enDias(1),
      });
      return;
    }

    if (coincide(texto, BOTONES.siOracion)) {
      marcar('Espera llamada de oración');
      await actualizarPersona(persona.id, { banderas });
      await crearTareaSeguimiento(persona, 'oracion', 2, 'normal');
      await enviarTextoLibre({
        personaId: persona.id,
        telefono,
        texto: `Con mucho gusto, ${primerNombre(persona.nombre)}. ¿Por qué motivo te gustaría que oráramos?`,
        ventanaAbiertaHasta: enDias(1),
      });
      return;
    }

    if (coincide(texto, BOTONES.siVisita)) {
      marcar('Espera visita');
      await actualizarPersona(persona.id, { banderas });
      await crearTareaSeguimiento(persona, 'visita', 7, 'normal');
      await enviarTextoLibre({
        personaId: persona.id,
        telefono,
        texto: `Qué bueno, ${primerNombre(persona.nombre)}. Un líder te escribe para acordar el día que a ti te sirva.`,
        ventanaAbiertaHasta: enDias(1),
      });
      return;
    }

    if (coincide(texto, BOTONES.noPorAhora)) {
      await enviarTextoLibre({
        personaId: persona.id,
        telefono,
        texto: 'Con gusto. Aquí estamos cuando lo necesites.',
        ventanaAbiertaHasta: enDias(1),
      });
      return;
    }
  }

  // 3b. Texto libre: que lo lea el agente.
  const lectura = await leerMensaje(texto);

  console.log(`[agente] ${telefono}: ${lectura.intencion} (${lectura.urgencia})`);

  if (lectura.intencion === 'crisis' || lectura.urgencia === 'alta') {
    // No se improvisa nada. Se escala a un humano el mismo día.
    marcar('Espera llamada de oración');
    await actualizarPersona(persona.id, {
      banderas,
      motivoOracion: lectura.motivo || 'Mensaje con señales de riesgo',
    });
    await crearTareaSeguimiento(persona, 'llamada', 0, 'urgente');
  } else if (lectura.intencion === 'pide_oracion') {
    marcar('Espera llamada de oración');
    await actualizarPersona(persona.id, {
      banderas,
      ...(lectura.motivo ? { motivoOracion: lectura.motivo } : {}),
    });
    await crearTareaSeguimiento(persona, 'oracion', 2, 'normal');
  } else if (lectura.intencion === 'acepta_visita') {
    marcar('Espera visita');
    await actualizarPersona(persona.id, { banderas });
    await crearTareaSeguimiento(persona, 'visita', 7, 'normal');
  } else if (lectura.intencion === 'rechaza') {
    // Solo se registra. "Rechaza" no es lo mismo que pedir la baja.
    await actualizarPersona(persona.id, { banderas });
  } else if (persona.motivoOracion === undefined && lectura.motivo) {
    await actualizarPersona(persona.id, { motivoOracion: lectura.motivo });
  }

  // 4. Responderle.
  const respuesta = await redactarRespuesta({
    nombre: persona.nombre,
    texto,
    lectura,
  });

  await enviarTextoLibre({
    personaId: persona.id,
    telefono,
    texto: respuesta,
    ventanaAbiertaHasta: enDias(1),
  });
}

function primerNombre(nombre: string): string {
  return (nombre ?? '').trim().split(/\s+/)[0] ?? '';
}

/**
 * Crea la tarea y elige quién la atiende: el líder de la persona si lo
 * tiene, y si no, el que menos tareas pendientes tenga.
 *
 * También las urgentes. El Apóstol supervisa —no llama ni visita— y las
 * ve de primeras, en rojo, en su pantalla de Seguimiento.
 */
async function crearTareaSeguimiento(
  persona: any,
  tipo: 'llamada' | 'visita' | 'oracion',
  diasParaVencer: number,
  prioridad: 'normal' | 'urgente',
) {
  if (!db) return;

  // ¿Ya hay una igual pendiente? No duplicar.
  const yaHay = await db
    .collection('tareas')
    .where('personaId', '==', persona.id)
    .where('tipo', '==', tipo)
    .where('estado', '==', 'pendiente')
    .limit(1)
    .get();
  if (!yaHay.empty) return;

  const usuarios = await db.collection('usuarios').where('activo', '==', true).get();
  // Solo líderes: el Apóstol supervisa, no ejecuta.
  const activos = usuarios.docs
    .map((d) => ({ id: d.id, ...d.data() }) as any)
    .filter((u) => u.rol === 'lider');
  if (activos.length === 0) {
    console.warn('[webhook] no hay líderes activos para asignar la tarea.');
    return;
  }

  let elegido: any = activos.find((u) => u.id === persona.liderAsignadoId);
  if (!elegido) {
    const pendientes = await db.collection('tareas').where('estado', '==', 'pendiente').get();
    const carga = new Map<string, number>();
    activos.forEach((u) => carga.set(u.id, 0));
    pendientes.docs.forEach((d) => {
      const l = d.data().liderId;
      if (carga.has(l)) carga.set(l, (carga.get(l) ?? 0) + 1);
    });
    elegido = activos
      .slice()
      .sort((a, b) => (carga.get(a.id) ?? 0) - (carga.get(b.id) ?? 0))[0];
  }

  await crearTarea({
    personaId: persona.id,
    personaNombre: persona.nombre,
    personaTelefono: persona.telefonoE164,
    liderId: elegido.id,
    liderNombre: elegido.nombre,
    tipo,
    estado: 'pendiente',
    vence: enDias(diasParaVencer),
    creadaEn: new Date().toISOString(),
    completadaEn: null,
    nota: '',
    prioridad,
  });

  console.log(
    `[webhook] tarea de ${tipo} (${prioridad}) creada para ${elegido.nombre} sobre ${persona.nombre}`,
  );
}
