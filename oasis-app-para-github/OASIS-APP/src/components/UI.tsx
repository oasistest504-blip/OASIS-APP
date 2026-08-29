// Piezas de interfaz que se repiten en toda la app.

import { useEffect, useState, type ReactNode } from 'react';
import { IconoOjo, IconoOjoTachado } from './Iconos';
import type { Bandera, Etapa } from '../lib/types';

// ------------------------------------------------------------ píldoras

export function PildoraEtapa({ etapa }: { etapa: Etapa }) {
  return <span className="pildora etapa">{etapa}</span>;
}

const ESTILO_BANDERA: Record<Bandera, string> = {
  'Espera llamada de oración': 'espera',
  'Espera visita': 'espera',
  'Sin respuesta': '',
  'No contactar': 'stop',
};

export function PildoraBandera({ bandera }: { bandera: Bandera }) {
  return <span className={`pildora ${ESTILO_BANDERA[bandera] ?? ''}`}>{bandera}</span>;
}

// ------------------------------------------------------------ avisos

export function Aviso({
  tipo = 'info',
  titulo,
  children,
}: {
  tipo?: 'info' | 'alerta' | 'peligro' | 'exito';
  titulo?: string;
  children: ReactNode;
}) {
  const clase = tipo === 'info' ? '' : tipo;
  return (
    <div className={`aviso ${clase}`}>
      {titulo && <b>{titulo}</b>}
      {children}
    </div>
  );
}

// ------------------------------------------------------------ vacío

export function Vacio({ emoji = '·', children }: { emoji?: string; children: ReactNode }) {
  return (
    <div className="vacio">
      <span className="emoji" aria-hidden="true">
        {emoji}
      </span>
      <p>{children}</p>
    </div>
  );
}

// ------------------------------------------------------------ cargando

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="cargando">
      <div>
        <div className="brinco" />
        <div>{texto}</div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ modal

export function Modal({
  titulo,
  onCerrar,
  children,
}: {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);

  return (
    <div
      className="velo"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div className="modal">
        <h2>{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

// --------------------------------------------------------- contraseñas

/**
 * Campo de contraseña con el ojo para verla.
 *
 * Escribir a ciegas en un celular, de pie y a la carrera, es la forma
 * más rápida de que alguien crea que la contraseña está mala cuando lo
 * que pasó fue un dedazo. El ojo arranca cerrado y se abre solo mientras
 * la persona lo quiera.
 */
export function CampoClave({
  etiqueta,
  valor,
  onChange,
  ayuda,
  placeholder,
  autoFocus,
  autoComplete,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  ayuda?: ReactNode;
  placeholder?: string;
  autoFocus?: boolean;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="campo">
      <span className="etiqueta">{etiqueta}</span>
      <span className="campo-clave">
        <input
          type={visible ? 'text' : 'password'}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="ojo"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar la contraseña' : 'Ver la contraseña'}
          title={visible ? 'Ocultar' : 'Ver'}
          aria-pressed={visible}
        >
          {visible ? <IconoOjoTachado /> : <IconoOjo />}
        </button>
      </span>
      {ayuda && <span className="ayuda">{ayuda}</span>}
    </label>
  );
}

// --------------------------------------------- quién acompaña a quién

/**
 * La etiqueta del líder responsable.
 *
 * En una lista de personas hay dos nombres propios: el de la persona a
 * la que se acompaña y el del líder que la acompaña. Esto existe para
 * que nunca se confundan: el de la persona va grande y sólido, el del
 * líder va aquí, en una etiqueta con borde punteado.
 */
export function ChipLider({ nombre }: { nombre?: string | null }) {
  return (
    <span className="chip-lider">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      {nombre ? (
        <>
          Líder:&nbsp;<b>{nombre}</b>
        </>
      ) : (
        'Sin líder asignado'
      )}
    </span>
  );
}

// ------------------------------------------------------------ inicial

export function Inicial({ nombre }: { nombre: string }) {
  const letras = nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  return <div className="inicial">{letras || '?'}</div>;
}

// ------------------------------------------------------------ fechas

export function fechaCorta(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

export function fechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function hace(iso: string | null): string {
  if (!iso) return 'sin contacto';
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? 'hace 1 mes' : `hace ${meses} meses`;
}
