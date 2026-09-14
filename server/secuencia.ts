// =====================================================================
//  La secuencia automática.
//
//  Una vez al día revisa a todas las personas y envía lo que toque
//  según los días que llevan desde que las registraron:
//     día 0  → bienvenida
//     día 3  → ¿deseas oración?
//     día 10 → ¿deseas una visita?
//     día 21 → invitación al encuentro de nuevos
//
//  Nunca le escribe a quien pidió no recibir más, a quien no dio
//  autorización, ni a quien ya lleva tres mensajes sin responder.
// =====================================================================

import { db, guardarInteraccion, crearTarea } from './firebaseAdmin.js';
import { enviarPlantilla } from './whatsapp.js';
import { config } from './config.js';
import { SECUENCIA, PLANTILLAS } from '../src/lib/plantillas.js';

const MAXIMO_SIN_RESPUESTA = 3;

function diasDesde(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function enDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

export async function correrSecuencia(): Promise<{
  revisadas: number;
  enviados: number;
  detalle: string[];
}> {
  const detalle: string[] = [];

  if (!db) {
    return {
      revisadas: 0,
      enviados: 0,
      detalle: ['Sin base de datos conectada: no hay a quién revisar.'],
    };
  }

  const snap = await db.collection('personas').get();
  let enviados = 0;
  let tocadosHoy = 0;

  for (const doc of snap.docs) {
    const p: any = { id: doc.id, ...doc.data() };

    if (tocadosHoy >= config.limiteDiario) {
      detalle.push(
        `Se alcanzó el límite de ${config.limiteDiario} personas en 24 horas. El resto queda para mañana.`,
      );
      break;
    }

    // Filtros de respeto y de seguridad.
    if (p.banderas?.includes('No contactar')) continue;
    if (!p.consentimiento?.otorgado) continue;
    if ((p.sinRespuestaConsecutivos ?? 0) >= MAXIMO_SIN_RESPUESTA) continue;
    if (!p.fechaIngreso) continue;

    const dias = diasDesde(p.fechaIngreso);
    const yaEnviados: string[] = p.pasosEnviados ?? [];

    // El primer paso pendiente que ya le corresponda por fecha.
    const paso = SECUENCIA.find(
      (s) =>
        !yaEnviados.includes(s.clave) &&
        dias >= s.diasDesdeIngreso &&
        s.etapasValidas.includes(p.etapa),
    );
    if (!paso) continue;

    const plantilla = PLANTILLAS[paso.plantilla];
    if (!plantilla) continue;

    const variables =
      plantilla.variables.length > 1
        ? [primerNombre(p.nombre), proximoDomingo()]
        : [primerNombre(p.nombre)];

    const textoMensaje = plantilla.vistaPrevia
      .replace('{{1}}', variables[0] ?? '')
      .replace('{{2}}', variables[1] ?? '');

    const resultado = await enviarPlantilla({
      telefono: p.telefonoE164,
      plantilla: plantilla.nombre,
      idioma: plantilla.idioma,
      variables,
    });

    tocadosHoy++;

    if (resultado.estado === 'fallido') {
      detalle.push(`${p.nombre}: ${resultado.error}`);
      continue;
    }

    enviados++;
    detalle.push(`${p.nombre} → ${plantilla.nombre}`);

    await guardarInteraccion({
      personaId: p.id,
      direccion: 'saliente',
      canal: 'whatsapp',
      plantilla: plantilla.nombre,
      texto: textoMensaje,
      estado: resultado.estado,
      ...(resultado.mensajeId ? { mensajeIdMeta: resultado.mensajeId } : {}),
    });

    const cambios: Record<string, any> = {
      pasosEnviados: [...yaEnviados, paso.clave],
      ultimoContacto: new Date().toISOString(),
    };

    // Contamos los mensajes sin respuesta para no insistir de más.
    const abierta =
      p.ventanaAbiertaHasta && new Date(p.ventanaAbiertaHasta).getTime() > Date.now();
    if (!abierta) {
      const sinRespuesta = (p.sinRespuestaConsecutivos ?? 0) + 1;
      cambios.sinRespuestaConsecutivos = sinRespuesta;
      if (sinRespuesta >= MAXIMO_SIN_RESPUESTA) {
        const banderas = new Set<string>(p.banderas ?? []);
        banderas.add('Sin respuesta');
        cambios.banderas = Array.from(banderas);
        detalle.push(`${p.nombre}: tres mensajes sin respuesta, se deja de insistir.`);

        if (!p.liderAsignadoId) {
          detalle.push(`${p.nombre} se quedó sin respuesta y sin líder que la busque.`);
        } else {
          const yaHayTarea = await db
            .collection('tareas')
            .where('personaId', '==', p.id)
            .where('tipo', '==', 'llamada')
            .where('estado', '==', 'pendiente')
            .limit(1)
            .get();

          if (yaHayTarea.empty) {
            let liderNombre = p.liderAsignadoNombre;
            if (!liderNombre) {
              const snapLider = await db.collection('usuarios').doc(p.liderAsignadoId).get();
              if (snapLider.exists) {
                liderNombre = snapLider.data()?.nombre;
              }
            }

            await crearTarea({
              personaId: p.id,
              personaNombre: p.nombre,
              personaTelefono: p.telefonoE164,
              liderId: p.liderAsignadoId,
              liderNombre: liderNombre || 'Líder asignado',
              tipo: 'llamada',
              prioridad: 'urgente',
              vence: enDias(2),
              estado: 'pendiente',
              creadaEn: new Date().toISOString(),
              completadaEn: null,
              nota: '',
              detalle:
                'La persona recibió tres mensajes de la iglesia sin contestar ninguno y ahora le toca a un ser humano buscarla.',
            });
          }
        }
      }
    }

    // La bienvenida hace avanzar de Nuevo a Contactado.
    if (paso.clave === 'dia0' && p.etapa === 'Nuevo') {
      cambios.etapa = 'Contactado';
    }

    await db.collection('personas').doc(p.id).update(cambios);
  }

  return { revisadas: snap.size, enviados, detalle };
}

function primerNombre(nombre: string): string {
  return (nombre ?? '').trim().split(/\s+/)[0] ?? '';
}

/** Para la invitación al encuentro: la fecha del próximo domingo. */
function proximoDomingo(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
}
