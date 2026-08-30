import { useState } from 'react';
import { IconoAlerta, IconoCheck, IconoOjo, IconoOjoCerrado, IconoUsuario } from './Iconos';

export function Aviso({
  tipo = 'info',
  titulo,
  children,
}: {
  tipo?: 'info' | 'exito' | 'alerta' | 'peligro';
  titulo?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`aviso ${tipo}`}>
      {titulo && <div className="aviso-titulo">{titulo}</div>}
      <div className="aviso-cuerpo">{children}</div>
    </div>
  );
}

export function Inicial({
  nombre,
  tamano = 38,
}: {
  nombre: string;
  tamano?: number;
}) {
  const inicial = (nombre.trim()[0] || '?').toUpperCase();
  return (
    <div
      className="avatar-inicial"
      style={{
        width: tamano,
        height: tamano,
        minWidth: tamano,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: tamano * 0.44,
        background: 'var(--azul-fondo, #e0f2fe)',
        color: 'var(--azul-profundo, #0369a1)',
      }}
    >
      {inicial}
    </div>
  );
}

export function Modal({
  abierto = true,
  onCerrar,
  titulo,
  children,
}: {
  abierto?: boolean;
  onCerrar: () => void;
  titulo?: string;
  children: React.ReactNode;
}) {
  if (!abierto) return null;

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div
        className="modal-caja tarjeta"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480, width: '92%', margin: 'auto' }}
      >
        {titulo && (
          <div className="fila-entre" style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: '1.15rem', margin: 0 }}>{titulo}</h2>
            <button
              type="button"
              className="btn fantasma chico"
              onClick={onCerrar}
              style={{ fontSize: '1.1rem', padding: '2px 8px' }}
            >
              &times;
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function Vacio({
  icono,
  children,
}: {
  icono?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="vacio tarjeta" style={{ textAlign: 'center', padding: '36px 16px' }}>
      {icono && <div style={{ marginBottom: 10, fontSize: '1.8rem' }}>{icono}</div>}
      <p className="texto-medio" style={{ color: 'var(--tinta-3, #64748b)', margin: 0 }}>
        {children}
      </p>
    </div>
  );
}

export function ChipLider({ nombre }: { nombre?: string | null }) {
  if (!nombre) return null;
  return (
    <span className="pildora lider" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <IconoUsuario size={12} /> {nombre}
    </span>
  );
}

export function CampoClave({
  etiqueta,
  valor,
  onChange,
  placeholder,
  autoFocus,
  ayuda,
  autoComplete,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  ayuda?: string;
  autoComplete?: string;
}) {
  const [mostrar, setMostrar] = useState(false);

  return (
    <div className="campo" style={{ marginBottom: 12 }}>
      <label className="etiqueta" style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.88rem' }}>
        {etiqueta}
      </label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type={mostrar ? 'text' : 'password'}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          style={{ width: '100%', paddingRight: 40 }}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setMostrar((prev) => !prev)}
          className="btn fantasma chico"
          style={{
            position: 'absolute',
            right: 4,
            top: '50%',
            transform: 'translateY(-50%)',
            padding: 6,
            color: 'var(--tinta-3, #64748b)',
          }}
          aria-label={mostrar ? 'Ocultar contraseña' : 'Ver contraseña'}
        >
          {mostrar ? <IconoOjoCerrado size={16} /> : <IconoOjo size={16} />}
        </button>
      </div>
      {ayuda && (
        <small className="texto-chico" style={{ display: 'block', marginTop: 4, color: 'var(--tinta-3, #64748b)' }}>
          {ayuda}
        </small>
      )}
    </div>
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--tinta-3, #64748b)' }}>
      <div className="spinner" style={{ marginBottom: 12 }} />
      <div>{texto}</div>
    </div>
  );
}

export function hace(fechaIso?: string | null): string {
  if (!fechaIso) return '';
  const diffMs = Date.now() - new Date(fechaIso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHoras = Math.floor(diffMs / 3600000);
  const diffDias = Math.floor(diffMs / 86400000);

  if (diffMin < 2) return 'hace un momento';
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffHoras < 24) return `hace ${diffHoras} h`;
  if (diffDias === 1) return 'ayer';
  if (diffDias < 30) return `hace ${diffDias} días`;
  return new Date(fechaIso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
  });
}
