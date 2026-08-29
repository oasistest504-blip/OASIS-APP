// =====================================================================
//  Las reglas de trabajo de la iglesia.
//
//  Aquí vive la lógica que hace que la app trabaje sola: a quién se le
//  asigna una persona nueva, qué tarea se crea cuando alguien dice que
//  sí a oración, y qué pasa cuando un líder marca una tarea como hecha.
// =====================================================================

import { store } from './store';
import type { Bandera, Persona, Tarea, TipoTarea, Usuario } from './types';

/** Qué tarea corresponde a cada bandera, y en cuántos días vence. */
const BANDERA_A_TAREA: Partial<Record<Bandera, { tipo: TipoTarea; dias: number }>> = {
  'Espera llamada de oración': { tipo: 'oracion', dias: 2 },
  'Espera visita': { tipo: 'visita', dias: 7 },
};

export function enDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString();
}

/**
 * Elige el líder que debe recibir a la próxima persona: el activo que
 * menos personas tenga a cargo. Si hay empate, el que lleve más tiempo
 * sin recibir a nadie.
 *
 * Solo entran líderes. El Apóstol supervisa: no acompaña personas ni
 * hace visitas, así que el reparto automático nunca lo toca.
 */
export function elegirLiderConMenosCarga(
  lideres: Usuario[],
  personas: Persona[],
): Usuario | null {
  const disponibles = lideres.filter((u) => u.activo && u.rol === 'lider');
  if (disponibles.length === 0) return null;

  const conteo = new Map<string, number>();
  disponibles.forEach((l) => conteo.set(l.id, 0));
  personas.forEach((p) => {
    if (p.liderAsignadoId && conteo.has(p.liderAsignadoId)) {
      conteo.set(p.liderAsignadoId, (conteo.get(p.liderAsignadoId) ?? 0) + 1);
    }
  });

  return disponibles.slice().sort((a, b) => {
    const diferencia = (conteo.get(a.id) ?? 0) - (conteo.get(b.id) ?? 0);
    if (diferencia !== 0) return diferencia;
    return a.creadoEn.localeCompare(b.creadoEn);
  })[0];
}

/**
 * Elige quién atiende una tarea nueva. Respeta la capacidad de cada
 * líder: si el asignado ya está lleno, la tarea pasa al siguiente con
 * menos carga. Devuelve también si hubo desvío, para poder avisarlo.
 */
export function elegirLiderParaTarea(
  liderPreferidoId: string | null,
  lideres: Usuario[],
  tareas: Tarea[],
): { lider: Usuario | null; desviada: boolean } {
  const activos = lideres.filter((u) => u.activo && u.rol === 'lider');
  if (activos.length === 0) return { lider: null, desviada: false };

  const pendientes = new Map<string, number>();
  activos.forEach((l) => pendientes.set(l.id, 0));
  tareas
    .filter((t) => t.estado === 'pendiente')
    .forEach((t) => {
      if (pendientes.has(t.liderId)) {
        pendientes.set(t.liderId, (pendientes.get(t.liderId) ?? 0) + 1);
      }
    });

  const preferido = activos.find((l) => l.id === liderPreferidoId);
  if (preferido && (pendientes.get(preferido.id) ?? 0) < preferido.capacidadSemanal) {
    return { lider: preferido, desviada: false };
  }

  const alternativa = activos
    .slice()
    .sort((a, b) => (pendientes.get(a.id) ?? 0) - (pendientes.get(b.id) ?? 0))[0];

  return { lider: alternativa ?? null, desviada: Boolean(preferido) };
}

/**
 * Pone o quita una bandera y hace todo lo que esa bandera implica:
 * crear la tarea, avisar al líder, dejar el rastro.
 */
export async function cambiarBandera(opciones: {
  persona: Persona;
  bandera: Bandera;
  activar: boolean;
  lideres: Usuario[];
  tareas: Tarea[];
  quien: Usuario;
  prioridad?: 'normal' | 'urgente';
}): Promise<{ mensaje: string }> {
  const { persona, bandera, activar, lideres, tareas, quien } = opciones;

  const banderas = new Set(persona.banderas);
  if (activar) banderas.add(bandera);
  else banderas.delete(bandera);

  // "No contactar" manda sobre todo lo demás: se limpia el resto.
  if (activar && bandera === 'No contactar') {
    banderas.clear();
    banderas.add('No contactar');
  }

  await store.actualizarPersona(persona.id, { banderas: Array.from(banderas) });

  await store.registrarAuditoria({
    uid: quien.id,
    nombre: quien.nombre,
    accion: activar ? 'agregó bandera' : 'quitó bandera',
    objetivo: persona.nombre,
    detalle: bandera,
    fecha: new Date().toISOString(),
  });

  if (!activar) return { mensaje: `Se quitó "${bandera}".` };

  const receta = BANDERA_A_TAREA[bandera];
  if (!receta) return { mensaje: `Se marcó "${bandera}".` };

  // ¿Ya hay una tarea pendiente de ese tipo para esta persona? No dupliques.
  const yaExiste = tareas.some(
    (t) => t.personaId === persona.id && t.tipo === receta.tipo && t.estado === 'pendiente',
  );
  if (yaExiste) return { mensaje: `Ya había una tarea de ${receta.tipo} pendiente.` };

  const { lider, desviada } = elegirLiderParaTarea(persona.liderAsignadoId, lideres, tareas);
  if (!lider) {
    return {
      mensaje: 'Se marcó la bandera, pero no hay líderes activos para asignar la tarea.',
    };
  }

  await store.crearTarea({
    personaId: persona.id,
    personaNombre: persona.nombre,
    personaTelefono: persona.telefonoE164,
    liderId: lider.id,
    liderNombre: lider.nombre,
    tipo: receta.tipo,
    estado: 'pendiente',
    vence: enDias(receta.dias),
    creadaEn: new Date().toISOString(),
    completadaEn: null,
    nota: '',
    prioridad: opciones.prioridad ?? 'normal',
  });

  return {
    mensaje: desviada
      ? `Tarea de ${receta.tipo} asignada a ${lider.nombre}, porque el líder de la persona ya está en su tope.`
      : `Tarea de ${receta.tipo} asignada a ${lider.nombre}.`,
  };
}

/** Un líder marca su tarea como hecha. */
export async function completarTarea(opciones: {
  tarea: Tarea;
  persona: Persona | undefined;
  nota: string;
  quien: Usuario;
}): Promise<void> {
  const { tarea, persona, nota, quien } = opciones;
  const ahora = new Date().toISOString();

  await store.actualizarTarea(tarea.id, {
    estado: 'hecha',
    completadaEn: ahora,
    nota,
  });

  if (persona) {
    const banderas = persona.banderas.filter((b) => {
      if (tarea.tipo === 'oracion') return b !== 'Espera llamada de oración';
      if (tarea.tipo === 'visita') return b !== 'Espera visita';
      return true;
    });
    const cambios: Partial<Persona> = { banderas, ultimoContacto: ahora };

    // Una visita cumplida hace avanzar la etapa.
    if (tarea.tipo === 'visita' && persona.etapa !== 'Consolidado' && persona.etapa !== 'Discípulo') {
      cambios.etapa = 'Visitado';
    } else if (persona.etapa === 'Nuevo') {
      cambios.etapa = 'Contactado';
    }

    if (nota.trim()) {
      const encabezado = `[${new Date().toLocaleDateString('es-CO')} · ${quien.nombre}]`;
      cambios.notas = `${persona.notas ? persona.notas + '\n\n' : ''}${encabezado} ${nota.trim()}`;
    }

    await store.actualizarPersona(persona.id, cambios);
    await store.agregarInteraccionLocal({
      personaId: persona.id,
      direccion: 'saliente',
      canal: 'manual',
      texto: `${quien.nombre} completó la tarea de ${tarea.tipo}.${nota.trim() ? ' Nota: ' + nota.trim() : ''}`,
      fecha: ahora,
    });
  }

  await store.registrarAuditoria({
    uid: quien.id,
    nombre: quien.nombre,
    accion: tarea.tipo === 'especial' ? 'cumplió un encargo' : 'completó tarea',
    objetivo: tarea.tipo === 'especial' ? (tarea.titulo ?? 'encargo') : tarea.personaNombre,
    detalle: `${tarea.tipo}${nota.trim() ? ' — ' + nota.trim() : ''}`,
    fecha: ahora,
  });
}

/** ¿Se le puede escribir a esta persona? */
export function puedeRecibirMensajes(persona: Persona): { puede: boolean; razon: string } {
  if (persona.banderas.includes('No contactar')) {
    return { puede: false, razon: 'La persona pidió no recibir más mensajes.' };
  }
  if (!persona.consentimiento?.otorgado) {
    return { puede: false, razon: 'No hay autorización registrada.' };
  }
  return { puede: true, razon: '' };
}

/** ¿Está abierta la ventana de 24 horas para escribir texto libre? */
export function ventanaAbierta(persona: Persona): boolean {
  if (!persona.ventanaAbiertaHasta) return false;
  return new Date(persona.ventanaAbiertaHasta).getTime() > Date.now();
}

export function diasDesde(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / 86400000);
}

/**
 * Una tarea que vence hoy NO está vencida: está a tiempo hasta que
 * termine el día. Comparar contra el instante exacto hacía que algo
 * creado para hoy apareciera «vencido hace 0 días» a los dos segundos.
 */
export function estaVencida(tarea: Tarea): boolean {
  if (tarea.estado !== 'pendiente') return false;
  const finDelDia = new Date(tarea.vence);
  finDelDia.setHours(23, 59, 59, 999);
  return finDelDia.getTime() < Date.now();
}
