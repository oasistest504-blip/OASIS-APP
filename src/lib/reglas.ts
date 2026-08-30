import type { Persona, Tarea, Usuario } from './types';
import { store } from './store';

export function estaVencida(tarea: Tarea): boolean {
  if (tarea.estado !== 'pendiente') return false;
  const fecha = new Date(tarea.vence);
  fecha.setHours(23, 59, 59, 999);
  return fecha.getTime() < Date.now();
}

export function elegirLiderConMenosCarga(
  lideres: Usuario[],
  personas: Persona[],
): Usuario | null {
  const activos = lideres.filter((l) => l.activo && l.rol === 'lider');
  if (activos.length === 0) return null;

  const ordenados = [...activos].sort((a, b) => {
    const cuentaA = personas.filter((p) => p.liderAsignadoId === a.id).length;
    const cuentaB = personas.filter((p) => p.liderAsignadoId === b.id).length;
    return cuentaA - cuentaB;
  });

  return ordenados[0] ?? null;
}

export function puedeEnviarMensaje(persona: Persona): { puede: boolean; razon: string } {
  if (persona.banderas.includes('No contactar')) {
    return { puede: false, razon: 'La persona pidió no recibir más mensajes.' };
  }
  if (persona.consentimiento && persona.consentimiento.otorgado) {
    return { puede: true, razon: '' };
  }
  return { puede: false, razon: 'No hay autorización registrada.' };
}

export function tieneVentanaAbierta(persona: Persona): boolean {
  if (!persona.ventanaAbiertaHasta) return false;
  return new Date(persona.ventanaAbiertaHasta).getTime() > Date.now();
}

export async function completarTarea(
  tarea: Tarea,
  usuario: Usuario,
  nota = '',
  persona?: Persona,
): Promise<void> {
  const ahora = new Date().toISOString();

  await store.actualizarTarea(tarea.id, {
    estado: 'hecha',
    completadaEn: ahora,
    nota: nota.trim() || undefined,
  });

  if (persona) {
    const cambios: Partial<Persona> = {
      ultimoContacto: ahora,
    };
    if (tarea.tipo === 'oracion' && persona.banderas.includes('Espera llamada de oración')) {
      cambios.banderas = persona.banderas.filter((b) => b !== 'Espera llamada de oración');
    }
    if (tarea.tipo === 'visita' && persona.banderas.includes('Espera visita')) {
      cambios.banderas = persona.banderas.filter((b) => b !== 'Espera visita');
      if (persona.etapa === 'Nuevo' || persona.etapa === 'Contactado' || persona.etapa === 'En seguimiento') {
        cambios.etapa = 'Visitado';
      }
    }
    if (nota.trim()) {
      const fechaCorta = new Date().toLocaleDateString('es-CO', {
        month: 'short',
        day: 'numeric',
      });
      const prefijo = `[${fechaCorta} · ${usuario.nombre}]`;
      cambios.notas = `${persona.notas ? persona.notas + '\n' : ''}${prefijo} ${nota.trim()}`;
    }

    await store.actualizarPersona(persona.id, cambios);
    await store.agregarInteraccionLocal({
      personaId: persona.id,
      direccion: 'saliente',
      canal: 'manual',
      texto: `${usuario.nombre} completó la tarea de ${tarea.tipo}.${nota.trim() ? ' Nota: ' + nota.trim() : ''}`,
      fecha: ahora,
    });
  }

  await store.registrarAuditoria({
    uid: usuario.id,
    nombre: usuario.nombre,
    accion: tarea.tipo === 'especial' ? 'cumplió un encargo' : 'completó tarea',
    objetivo: tarea.tipo === 'especial' ? tarea.titulo ?? 'encargo' : tarea.personaNombre,
    detalle: `${tarea.tipo}${nota.trim() ? ' — ' + nota.trim() : ''}`,
    fecha: ahora,
  });
}
