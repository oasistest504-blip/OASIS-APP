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

import { db } from './firebaseAdmin';
import { enviarPlantilla } from './whatsapp';
import { config } from './config';
import { SECUENCIA, PLANTILLAS } from '../src/lib/plantillas';

const MAXIMO_SIN_RESPUESTA = 3;

function diasDesde(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
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

    const resultado = await enviarPlantilla({
      personaId: p.id,
      telefono: p.telefonoE164,
      plantilla: plantilla.nombre,
      idioma: plantilla.idioma,
      variables,
      textoParaHistorial: plantilla.vistaPrevia
        .replace('{{1}}', variables[0] ?? '')
        .replace('{{2}}', variables[1] ?? ''),
    });

    tocadosHoy++;

    if (resultado.estado === 'fallido') {
      detalle.push(`${p.nombre}: ${resultado.error}`);
      continue;
    }

    enviados++;
    detalle.push(`${p.nombre} → ${plantilla.nombre}`);

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
