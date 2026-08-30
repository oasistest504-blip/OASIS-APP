import type { Etapa } from './types';

export interface GrupoDifusion {
  clave: string;
  nombre: string;
  descripcion: string;
  etapas: Etapa[];
}

export const GRUPOS: GrupoDifusion[] = [
  {
    clave: 'todos',
    nombre: 'Toda la congregación',
    descripcion: 'Personas en cualquier etapa del proceso.',
    etapas: ['Nuevo', 'Contactado', 'En seguimiento', 'Visitado', 'Consolidado', 'Discípulo'],
  },
  {
    clave: 'nuevos',
    nombre: 'Personas nuevas',
    descripcion: 'Nuevos, Contactados y En seguimiento.',
    etapas: ['Nuevo', 'Contactado', 'En seguimiento'],
  },
  {
    clave: 'visitados',
    nombre: 'Personas visitadas',
    descripcion: 'Quienes ya recibieron visita pastoral.',
    etapas: ['Visitado'],
  },
  {
    clave: 'consolidados',
    nombre: 'Consolidados y discípulos',
    descripcion: 'Miembros firmes y servidores en formación.',
    etapas: ['Consolidado', 'Discípulo'],
  },
];
