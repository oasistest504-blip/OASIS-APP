// =====================================================================
//  Los datos que toda la app necesita a la mano.
//
//  Un líder solo recibe sus personas y sus tareas. El Apóstol recibe
//  todo. Esa separación se hace aquí y además en las reglas de
//  Firestore, para que no dependa solo del navegador.
// =====================================================================

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { store } from '../lib/store';
import { useAuth } from './AuthContext';
import type { Difusion, Persona, Tarea } from '../lib/types';

interface ValorDatos {
  personas: Persona[];
  tareas: Tarea[];
  difusiones: Difusion[];
  listo: boolean;
}

const Contexto = createContext<ValorDatos>({
  personas: [],
  tareas: [],
  difusiones: [],
  listo: false,
});

export function ProveedorDatos({ children }: { children: ReactNode }) {
  const { usuario, esApostol } = useAuth();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [difusiones, setDifusiones] = useState<Difusion[]>([]);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (!usuario || !usuario.activo) {
      setPersonas([]);
      setTareas([]);
      setDifusiones([]);
      setListo(true);
      return;
    }

    setListo(false);
    const cancelar: Array<() => void> = [];

    if (esApostol) {
      let sembradoIniciado = false;
      cancelar.push(
        store.observarPersonas((p) => {
          if (p.length === 0 && !sembradoIniciado) {
            sembradoIniciado = true;
            store.sembrarDatosEjemplo().catch(() => {});
          }
          setPersonas(p);
          setListo(true);
        }),
      );
      cancelar.push(store.observarTareas(setTareas));
      cancelar.push(store.observarDifusiones(setDifusiones));
    } else {
      cancelar.push(
        store.observarPersonasDeLider(usuario.id, (p) => {
          setPersonas(p);
          setListo(true);
        }),
      );
      cancelar.push(store.observarTareasDeLider(usuario.id, setTareas));
    }

    return () => cancelar.forEach((fn) => fn());
  }, [usuario?.id, usuario?.activo, esApostol]);

  return (
    <Contexto.Provider value={{ personas, tareas, difusiones, listo }}>
      {children}
    </Contexto.Provider>
  );
}

export function useDatos(): ValorDatos {
  return useContext(Contexto);
}
