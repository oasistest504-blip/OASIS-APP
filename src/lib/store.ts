// =====================================================================
//  La capa de datos.
//
//  Toda la app pide y guarda datos a través de este archivo. Por dentro
//  hay dos implementaciones:
//
//    - MODO DEMO: datos de ejemplo en la memoria del navegador. Se usa
//      cuando no hay configuración de Firebase en el .env.
//    - MODO REAL: Cloud Firestore.
//
//  Las pantallas no saben cuál está activa, y eso es a propósito: el día
//  que conectes Firebase no hay que tocar ni una pantalla.
// =====================================================================

import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  deleteDoc,
} from 'firebase/firestore';
import { db, HAY_FIREBASE } from './firebase';
import {
  USUARIOS_DEMO,
  PERSONAS_DEMO,
  TAREAS_DEMO,
  INTERACCIONES_DEMO,
} from './datosDemo';
import type {
  Configuracion,
  Difusion,
  Interaccion,
  Persona,
  RegistroAuditoria,
  Tarea,
  Usuario,
} from './types';

/** Las contraseñas con las que arranca la app. El Apóstol las cambia. */
export const CONFIGURACION_INICIAL: Configuracion = {
  claveLideres: 'oasis',
  claveApostol: 'apostol',
  nombreIglesia: 'Centro de Alabanza Oasis',
};

type Escucha<T> = (datos: T[], error?: Error | unknown) => void;
type Cancelar = () => void;

export const MODO_DEMO = !HAY_FIREBASE;

// ---------------------------------------------------------------------
//  Almacén en memoria para el modo demo
// ---------------------------------------------------------------------

const LLAVE_GUARDADO = 'oasis-seguimiento-demo-v1';

interface EstadoDemo {
  usuarios: Usuario[];
  personas: Persona[];
  tareas: Tarea[];
  interacciones: Interaccion[];
  difusiones: Difusion[];
  auditoria: RegistroAuditoria[];
  configuracion: Configuracion;
}

function estadoInicial(): EstadoDemo {
  return {
    usuarios: structuredClone(USUARIOS_DEMO),
    personas: structuredClone(PERSONAS_DEMO),
    tareas: structuredClone(TAREAS_DEMO),
    interacciones: structuredClone(INTERACCIONES_DEMO),
    difusiones: [],
    auditoria: [],
    configuracion: { ...CONFIGURACION_INICIAL },
  };
}

function cargar(): EstadoDemo {
  try {
    const crudo = localStorage.getItem(LLAVE_GUARDADO);
    if (crudo) return JSON.parse(crudo) as EstadoDemo;
  } catch {
    // Navegador en modo privado o almacenamiento bloqueado: no pasa nada,
    // simplemente arrancamos con los datos de ejemplo.
  }
  return estadoInicial();
}

const demo: EstadoDemo = MODO_DEMO ? cargar() : estadoInicial();

function guardar() {
  try {
    localStorage.setItem(LLAVE_GUARDADO, JSON.stringify(demo));
  } catch {
    /* sin almacenamiento: los cambios viven solo mientras la pestaña esté abierta */
  }
}

/** Vuelve a los datos de ejemplo originales. */
export function reiniciarDemo() {
  const fresco = estadoInicial();
  demo.usuarios = fresco.usuarios;
  demo.personas = fresco.personas;
  demo.tareas = fresco.tareas;
  demo.interacciones = fresco.interacciones;
  demo.difusiones = [];
  demo.auditoria = [];
  demo.configuracion = { ...CONFIGURACION_INICIAL };
  guardar();
  avisar('usuarios');
  avisar('personas');
  avisar('tareas');
  avisar('interacciones');
  avisar('difusiones');
}

type Coleccion = 'usuarios' | 'personas' | 'tareas' | 'interacciones' | 'difusiones' | 'auditoria';
const oyentes: Record<string, Set<Escucha<any>>> = {};
let oyentesConfig: Set<(c: Configuracion) => void> | null = null;

function avisar(col: Coleccion) {
  const set = oyentes[col];
  if (!set) return;
  const datos = demo[col];
  set.forEach((fn) => fn(structuredClone(datos)));
}

function suscribirDemo<T>(col: Coleccion, cb: Escucha<T>): Cancelar {
  if (!oyentes[col]) oyentes[col] = new Set();
  oyentes[col].add(cb);
  cb(structuredClone(demo[col]) as T[]);
  return () => {
    oyentes[col].delete(cb);
  };
}

function nuevoId(prefijo: string) {
  return `${prefijo}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------
//  Utilidades compartidas
// ---------------------------------------------------------------------

/** Quita los campos con valor `undefined`, que Firestore rechaza. */
function limpiar<T extends Record<string, any>>(objeto: T): T {
  const salida: Record<string, any> = {};
  for (const [k, v] of Object.entries(objeto)) {
    if (v !== undefined) salida[k] = v;
  }
  return salida as T;
}

const observadoresErrorInteracciones = new Map<string, MutationObserver>();

function mostrarAvisoErrorInteracciones(personaId: string) {
  if (typeof document === 'undefined') return;

  const aplicar = () => {
    const rotulos = Array.from(document.querySelectorAll('.rotulo'));
    const rotulo = rotulos.find((r) =>
      r.textContent?.toLowerCase().includes('registro de mensajes e interacciones'),
    );
    if (!rotulo) return;

    const seccion = rotulo.closest('.seccion');
    if (!seccion) return;

    // Ocultar el texto por defecto de "no hay mensajes"
    const parrafos = seccion.querySelectorAll('p.texto-chico');
    parrafos.forEach((p) => {
      if (p.textContent?.toLowerCase().includes('no hay mensajes')) {
        (p as HTMLElement).style.display = 'none';
      }
    });

    // Ocultar pila de mensajes si existiera
    const pila = seccion.querySelector('.pila') as HTMLElement | null;
    if (pila) {
      pila.style.display = 'none';
    }

    // Insertar o mostrar el aviso rojo de peligro
    let aviso = seccion.querySelector('.aviso-error-interacciones') as HTMLElement | null;
    if (!aviso) {
      aviso = document.createElement('div');
      aviso.className = 'aviso peligro aviso-error-interacciones';
      aviso.id = 'aviso-error-interacciones';
      aviso.style.marginTop = '8px';
      aviso.innerHTML = '<div class="aviso-cuerpo">No se pudieron cargar los mensajes de esta persona.</div>';
      rotulo.insertAdjacentElement('afterend', aviso);
    } else {
      aviso.style.display = 'block';
    }
  };

  aplicar();

  if (!observadoresErrorInteracciones.has(personaId)) {
    const observer = new MutationObserver(() => {
      aplicar();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    observadoresErrorInteracciones.set(personaId, observer);
  }
}

function limpiarAvisoErrorInteracciones(personaId: string) {
  if (typeof document === 'undefined') return;

  const obs = observadoresErrorInteracciones.get(personaId);
  if (obs) {
    obs.disconnect();
    observadoresErrorInteracciones.delete(personaId);
  }

  const aviso = document.getElementById('aviso-error-interacciones');
  if (aviso) aviso.remove();

  const rotulos = Array.from(document.querySelectorAll('.rotulo'));
  const rotulo = rotulos.find((r) =>
    r.textContent?.toLowerCase().includes('registro de mensajes e interacciones'),
  );
  const seccion = rotulo?.closest('.seccion');
  if (seccion) {
    const parrafos = seccion.querySelectorAll('p.texto-chico');
    parrafos.forEach((p) => {
      (p as HTMLElement).style.display = '';
    });
    const pila = seccion.querySelector('.pila') as HTMLElement | null;
    if (pila) pila.style.display = '';
  }
}

// ---------------------------------------------------------------------
//  API pública
// ---------------------------------------------------------------------

export const store = {
  modoDemo: MODO_DEMO,

  // ---------------- configuración: las dos contraseñas ----------------

  observarConfiguracion(cb: (c: Configuracion) => void): Cancelar {
    if (MODO_DEMO) {
      cb({ ...demo.configuracion });
      if (!oyentesConfig) oyentesConfig = new Set();
      oyentesConfig.add(cb);
      return () => oyentesConfig?.delete(cb);
    }
    return onSnapshot(
      doc(db!, 'configuracion', 'acceso'),
      (snap) => {
        cb(snap.exists() ? ({ ...CONFIGURACION_INICIAL, ...snap.data() } as Configuracion) : { ...CONFIGURACION_INICIAL });
      },
      (error) => {
        console.warn('Error al leer configuracion en Firestore:', error);
        cb({ ...CONFIGURACION_INICIAL });
      }
    );
  },

  async guardarConfiguracion(cambios: Partial<Configuracion>): Promise<void> {
    if (MODO_DEMO) {
      demo.configuracion = { ...demo.configuracion, ...cambios };
      guardar();
      oyentesConfig?.forEach((fn) => fn({ ...demo.configuracion }));
      return;
    }
    await setDoc(doc(db!, 'configuracion', 'acceso'), limpiar(cambios), { merge: true });
  },

  /** Inserta líderes, personas y tareas de ejemplo en Firestore o modo local para demostración. */
  async sembrarDatosEjemplo(): Promise<void> {
    if (MODO_DEMO) {
      reiniciarDemo();
      return;
    }

    if (!db) return;

    // Asegurar configuración base
    await setDoc(doc(db, 'configuracion', 'acceso'), {
      nombreIglesia: 'Centro de Alabanza Oasis',
      claveApostol: 'apostol',
      claveLideres: 'oasis',
    }, { merge: true });

    // Crear usuario Apóstol
    await addDoc(collection(db, 'usuarios'), limpiar({
      nombre: 'Pastor Ramos',
      telefono: '573001234567',
      rol: 'apostol',
      activo: true,
      capacidadSemanal: 10,
      creadoEn: new Date().toISOString(),
    }));

    // Crear líderes de ejemplo
    const lider1Ref = await addDoc(collection(db, 'usuarios'), limpiar({
      nombre: 'Carolina Méndez',
      telefono: '573112223344',
      rol: 'lider',
      activo: true,
      capacidadSemanal: 5,
      creadoEn: new Date().toISOString(),
    }));

    const lider2Ref = await addDoc(collection(db, 'usuarios'), limpiar({
      nombre: 'Andrés Quiroga',
      telefono: '573123334455',
      rol: 'lider',
      activo: true,
      capacidadSemanal: 5,
      creadoEn: new Date().toISOString(),
    }));

    const lider3Ref = await addDoc(collection(db, 'usuarios'), limpiar({
      nombre: 'Diana Osorio',
      telefono: '573145556677',
      rol: 'lider',
      activo: true,
      capacidadSemanal: 5,
      creadoEn: new Date().toISOString(),
    }));

    const lider4Ref = await addDoc(collection(db, 'usuarios'), limpiar({
      nombre: 'Mateo Morales',
      telefono: '573156667788',
      rol: 'lider',
      activo: true,
      capacidadSemanal: 5,
      creadoEn: new Date().toISOString(),
    }));

    const lider5Ref = await addDoc(collection(db, 'usuarios'), limpiar({
      nombre: 'Valeria Gómez',
      telefono: '573167778899',
      rol: 'lider',
      activo: true,
      capacidadSemanal: 5,
      creadoEn: new Date().toISOString(),
    }));

    const lideresMap: Record<string, { id: string; nombre: string }> = {
      'demo-lider-1': { id: lider1Ref.id, nombre: 'Carolina Méndez' },
      'demo-lider-2': { id: lider2Ref.id, nombre: 'Andrés Quiroga' },
      'demo-lider-3': { id: lider3Ref.id, nombre: 'Diana Osorio' },
      'demo-lider-4': { id: lider4Ref.id, nombre: 'Mateo Morales' },
      'demo-lider-5': { id: lider5Ref.id, nombre: 'Valeria Gómez' },
    };

    // Crear personas de ejemplo
    const personaIdsMap: Record<string, string> = {};
    for (const pDemo of PERSONAS_DEMO) {
      const lid = pDemo.liderAsignadoId ? lideresMap[pDemo.liderAsignadoId] : null;
      const docRef = await addDoc(collection(db, 'personas'), limpiar({
        nombre: pDemo.nombre,
        telefonoE164: pDemo.telefonoE164,
        etapa: pDemo.etapa,
        banderas: pDemo.banderas,
        origen: pDemo.origen,
        liderAsignadoId: lid ? lid.id : null,
        liderAsignadoNombre: lid ? lid.nombre : null,
        consentimiento: pDemo.consentimiento,
        notas: pDemo.notas || '',
        motivoOracion: pDemo.motivoOracion || null,
        fechaIngreso: pDemo.fechaIngreso,
        ultimoContacto: pDemo.ultimoContacto,
        ventanaAbiertaHasta: pDemo.ventanaAbiertaHasta,
        sinRespuestaConsecutivos: pDemo.sinRespuestaConsecutivos,
        pasosEnviados: pDemo.pasosEnviados,
        creadoPorUid: lid ? lid.id : 'sistema',
      }));
      personaIdsMap[pDemo.id] = docRef.id;
    }

    // Crear tareas de ejemplo
    for (const tDemo of TAREAS_DEMO) {
      const personaRealId = personaIdsMap[tDemo.personaId] || tDemo.personaId;
      const lid = tDemo.liderId ? lideresMap[tDemo.liderId] : null;
      await addDoc(collection(db, 'tareas'), limpiar({
        personaId: personaRealId,
        personaNombre: tDemo.personaNombre,
        personaTelefono: tDemo.personaTelefono,
        liderId: lid ? lid.id : tDemo.liderId,
        liderNombre: lid ? lid.nombre : tDemo.liderNombre,
        tipo: tDemo.tipo,
        estado: tDemo.estado,
        vence: tDemo.vence,
        creadaEn: tDemo.creadaEn,
        completadaEn: tDemo.completadaEn,
        nota: tDemo.nota,
        prioridad: tDemo.prioridad,
      }));
    }

    // Crear interacciones de ejemplo
    for (const iDemo of INTERACCIONES_DEMO) {
      const personaRealId = personaIdsMap[iDemo.personaId] || iDemo.personaId;
      await addDoc(collection(db, 'interacciones'), limpiar({
        personaId: personaRealId,
        direccion: iDemo.direccion,
        canal: iDemo.canal,
        plantilla: iDemo.plantilla || null,
        texto: iDemo.texto,
        estado: iDemo.estado || 'entregado',
        fecha: iDemo.fecha,
      }));
    }
  },

  // ---------------- usuarios ----------------

  /** El Apóstol agrega un líder desde su panel privado. */
  async crearUsuario(datos: Omit<Usuario, 'id'>): Promise<string> {
    if (MODO_DEMO) {
      const id = nuevoId('u');
      demo.usuarios.push({ ...datos, id });
      guardar();
      avisar('usuarios');
      return id;
    }
    const ref = await addDoc(collection(db!, 'usuarios'), limpiar(datos));
    return ref.id;
  },

  /** El Apóstol quita a un líder. */
  async eliminarUsuario(id: string): Promise<void> {
    if (MODO_DEMO) {
      demo.usuarios = demo.usuarios.filter((u) => u.id !== id);
      guardar();
      avisar('usuarios');
      return;
    }
    await deleteDoc(doc(db!, 'usuarios', id));
  },

  observarUsuarios(
    cb: Escucha<Usuario>,
    onError?: (error: Error | unknown) => void,
  ): Cancelar {
    if (MODO_DEMO) return suscribirDemo<Usuario>('usuarios', cb);
    return onSnapshot(
      collection(db!, 'usuarios'),
      (snap) => {
        cb(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Usuario),
          undefined,
        );
      },
      (error) => {
        console.warn('Error al leer usuarios en Firestore:', error);
        if (onError) onError(error);
        cb([], error);
      },
    );
  },

  async actualizarUsuario(id: string, cambios: Partial<Usuario>): Promise<void> {
    if (MODO_DEMO) {
      const i = demo.usuarios.findIndex((u) => u.id === id);
      if (i >= 0) demo.usuarios[i] = { ...demo.usuarios[i], ...cambios };
      guardar();
      avisar('usuarios');
      return;
    }
    await updateDoc(doc(db!, 'usuarios', id), limpiar(cambios));
  },

  // ---------------- personas ----------------

  observarPersonas(cb: Escucha<Persona>): Cancelar {
    if (MODO_DEMO) return suscribirDemo<Persona>('personas', cb);
    return onSnapshot(
      collection(db!, 'personas'),
      (snap) => {
        cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Persona));
      },
      (error) => {
        console.warn('Error al leer personas en Firestore:', error);
        cb([]);
      }
    );
  },

  /** Solo las personas asignadas a un líder. Es lo que las reglas permiten. */
  observarPersonasDeLider(liderId: string, cb: Escucha<Persona>): Cancelar {
    if (MODO_DEMO) {
      return suscribirDemo<Persona>('personas', (todas) =>
        cb(todas.filter((p) => p.liderAsignadoId === liderId)),
      );
    }
    return onSnapshot(
      query(collection(db!, 'personas'), where('liderAsignadoId', '==', liderId)),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Persona)),
      (error) => {
        console.warn('Error al leer personas de lider en Firestore:', error);
        cb([]);
      }
    );
  },

  async crearPersona(persona: Omit<Persona, 'id'>): Promise<string> {
    if (MODO_DEMO) {
      const id = nuevoId('p');
      demo.personas.push({ ...persona, id });
      guardar();
      avisar('personas');
      return id;
    }
    const ref = await addDoc(collection(db!, 'personas'), limpiar(persona));
    return ref.id;
  },

  async actualizarPersona(id: string, cambios: Partial<Persona>): Promise<void> {
    if (MODO_DEMO) {
      const i = demo.personas.findIndex((p) => p.id === id);
      if (i >= 0) demo.personas[i] = { ...demo.personas[i], ...cambios };
      guardar();
      avisar('personas');
      return;
    }
    await updateDoc(doc(db!, 'personas', id), limpiar(cambios));
  },

  // ---------------- tareas ----------------

  observarTareas(cb: Escucha<Tarea>): Cancelar {
    if (MODO_DEMO) return suscribirDemo<Tarea>('tareas', cb);
    return onSnapshot(
      collection(db!, 'tareas'),
      (snap) => {
        cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Tarea));
      },
      (error) => {
        console.warn('Error al leer tareas en Firestore:', error);
        cb([]);
      }
    );
  },

  observarTareasDeLider(liderId: string, cb: Escucha<Tarea>): Cancelar {
    if (MODO_DEMO) {
      return suscribirDemo<Tarea>('tareas', (todas) =>
        cb(todas.filter((t) => t.liderId === liderId)),
      );
    }
    return onSnapshot(
      query(collection(db!, 'tareas'), where('liderId', '==', liderId)),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Tarea)),
      (error) => {
        console.warn('Error al leer tareas de lider en Firestore:', error);
        cb([]);
      }
    );
  },

  async crearTarea(tarea: Omit<Tarea, 'id'>): Promise<string> {
    if (MODO_DEMO) {
      const id = nuevoId('t');
      demo.tareas.push({ ...tarea, id });
      guardar();
      avisar('tareas');
      return id;
    }
    const ref = await addDoc(collection(db!, 'tareas'), limpiar(tarea));
    return ref.id;
  },

  async actualizarTarea(id: string, cambios: Partial<Tarea>): Promise<void> {
    if (MODO_DEMO) {
      const i = demo.tareas.findIndex((t) => t.id === id);
      if (i >= 0) demo.tareas[i] = { ...demo.tareas[i], ...cambios };
      guardar();
      avisar('tareas');
      return;
    }
    await updateDoc(doc(db!, 'tareas', id), limpiar(cambios));
  },

  // ---------------- interacciones ----------------

  erroresInteracciones: {} as Record<string, any>,
  ultimoErrorInteracciones: null as any,

  observarInteracciones(personaId: string, cb: Escucha<Interaccion>): Cancelar {
    if (MODO_DEMO) {
      return suscribirDemo<Interaccion>('interacciones', (todas) =>
        cb(
          todas
            .filter((i) => i.personaId === personaId)
            .sort((a, b) => a.fecha.localeCompare(b.fecha)),
        ),
      );
    }

    const unsub = onSnapshot(
      query(
        collection(db!, 'interacciones'),
        where('personaId', '==', personaId),
      ),
      (snap) => {
        limpiarAvisoErrorInteracciones(personaId);
        delete store.erroresInteracciones[personaId];
        const interacciones = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Interaccion,
        );
        interacciones.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
        cb(interacciones);
      },
      (error) => {
        console.error('Error al leer interacciones en Firestore:', error);
        store.ultimoErrorInteracciones = error;
        store.erroresInteracciones[personaId] = error;
        cb([]);
        mostrarAvisoErrorInteracciones(personaId);
      },
    );

    return () => {
      unsub();
      limpiarAvisoErrorInteracciones(personaId);
    };
  },

  /**
   * Solo el modo demo escribe interacciones desde el navegador. En modo
   * real las escribe el servidor, porque las reglas de Firestore no
   * dejan que el cliente toque esa colección.
   */
  async agregarInteraccionLocal(interaccion: Omit<Interaccion, 'id'>): Promise<void> {
    if (!MODO_DEMO) return;
    demo.interacciones.push({ ...interaccion, id: nuevoId('i') });
    guardar();
    avisar('interacciones');
  },

  // ---------------- difusiones ----------------

  observarDifusiones(cb: Escucha<Difusion>): Cancelar {
    if (MODO_DEMO) return suscribirDemo<Difusion>('difusiones', cb);
    return onSnapshot(
      collection(db!, 'difusiones'),
      (snap) => {
        cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Difusion));
      },
      (error) => {
        console.warn('Error al leer difusiones en Firestore:', error);
        cb([]);
      }
    );
  },

  async crearDifusionLocal(difusion: Omit<Difusion, 'id'>): Promise<string> {
    const id = nuevoId('d');
    if (MODO_DEMO) {
      demo.difusiones.push({ ...difusion, id });
      guardar();
      avisar('difusiones');
    }
    return id;
  },

  // ---------------- auditoría ----------------

  async registrarAuditoria(registro: Omit<RegistroAuditoria, 'id'>): Promise<void> {
    if (MODO_DEMO) {
      demo.auditoria.push({ ...registro, id: nuevoId('a') });
      guardar();
      return;
    }
    await addDoc(collection(db!, 'auditoria'), limpiar(registro));
  },

  observarAuditoria(cb: Escucha<RegistroAuditoria>): Cancelar {
    if (MODO_DEMO) return suscribirDemo<RegistroAuditoria>('auditoria', cb);
    return onSnapshot(
      query(collection(db!, 'auditoria'), orderBy('fecha', 'desc')),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RegistroAuditoria)),
      (error) => {
        console.warn('Error al leer auditoria en Firestore:', error);
        cb([]);
      }
    );
  },
};
