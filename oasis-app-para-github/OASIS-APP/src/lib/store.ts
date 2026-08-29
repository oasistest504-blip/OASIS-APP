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

type Escucha<T> = (datos: T[]) => void;
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
    return onSnapshot(doc(db!, 'configuracion', 'acceso'), (snap) => {
      cb(snap.exists() ? ({ ...CONFIGURACION_INICIAL, ...snap.data() } as Configuracion) : { ...CONFIGURACION_INICIAL });
    });
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

  observarUsuarios(cb: Escucha<Usuario>): Cancelar {
    if (MODO_DEMO) return suscribirDemo<Usuario>('usuarios', cb);
    return onSnapshot(collection(db!, 'usuarios'), (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Usuario));
    });
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
    return onSnapshot(collection(db!, 'personas'), (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Persona));
    });
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
    return onSnapshot(collection(db!, 'tareas'), (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Tarea));
    });
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
    return onSnapshot(
      query(
        collection(db!, 'interacciones'),
        where('personaId', '==', personaId),
        orderBy('fecha', 'asc'),
      ),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Interaccion)),
    );
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
    return onSnapshot(collection(db!, 'difusiones'), (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Difusion));
    });
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
    );
  },
};
