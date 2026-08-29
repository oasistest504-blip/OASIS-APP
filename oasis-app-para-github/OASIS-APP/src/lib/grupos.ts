// =====================================================================
//  Los grupos de difusión.
//
//  Las etapas son el detalle fino del seguimiento —seis casillas que un
//  líder mueve persona por persona—. Pero cuando el Apóstol va a mandar
//  un mensaje no piensa en seis casillas: piensa en cuatro grupos.
//
//  Esto traduce lo uno en lo otro. Si mañana la iglesia llama distinto a
//  alguno de sus grupos, se cambia aquí y cambia en toda la app.
// =====================================================================

import { ETAPAS, type Etapa } from './types';

export interface GrupoDifusion {
  clave: string;
  nombre: string;
  /** Una línea que explica a quién le va a llegar, en cristiano. */
  descripcion: string;
  etapas: Etapa[];
}

export const GRUPOS: GrupoDifusion[] = [
  {
    clave: 'nuevas',
    nombre: 'Personas nuevas',
    descripcion: 'Llegaron hace poco y apenas nos están conociendo',
    etapas: ['Nuevo', 'Contactado'],
  },
  {
    clave: 'simpatizantes',
    nombre: 'Simpatizantes',
    descripcion: 'Ya vienen con cierta frecuencia, todavía no dan el paso',
    etapas: ['En seguimiento', 'Visitado'],
  },
  {
    clave: 'consolidados',
    nombre: 'Consolidados',
    descripcion: 'Asisten con regularidad y son parte de la casa',
    etapas: ['Consolidado'],
  },
  {
    clave: 'discipulos',
    nombre: 'Discípulos',
    descripcion: 'En formación para servir y llevar a otros',
    etapas: ['Discípulo'],
  },
  {
    clave: 'todos',
    nombre: 'Toda la iglesia',
    descripcion: 'Todas las personas registradas',
    etapas: [...ETAPAS],
  },
];

export function grupoPorClave(clave?: string): GrupoDifusion | undefined {
  return GRUPOS.find((g) => g.clave === clave);
}

/** Si las etapas escogidas coinciden exactas con un grupo, cuál es. */
export function grupoDeEtapas(etapas: Etapa[]): GrupoDifusion | undefined {
  return GRUPOS.find(
    (g) =>
      g.etapas.length === etapas.length && g.etapas.every((e) => etapas.includes(e)),
  );
}
