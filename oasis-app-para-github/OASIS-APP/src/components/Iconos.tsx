import type React from 'react';

// Íconos simples dibujados a mano, sin librerías externas.
// Trazo de 1.8 para que se vean bien en pantallas de celular.

type Props = {
  className?: string;
  style?: React.CSSProperties;
  'aria-hidden'?: boolean;
};

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const IconoPersonas = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1" />
    <circle cx="9" cy="7" r="3.2" />
    <path d="M22 19v-1a4 4 0 0 0-3-3.87M16.5 4.2a4 4 0 0 1 0 7.6" />
  </svg>
);

export const IconoTareas = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M9 5h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1" />
    <rect x="8" y="3" width="8" height="4" rx="1.2" />
    <path d="M9 12.5l2 2 4-4" />
  </svg>
);

export const IconoPanel = (p: Props) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="7.5" height="8" rx="1.6" />
    <rect x="13.5" y="3" width="7.5" height="5" rx="1.6" />
    <rect x="3" y="14" width="7.5" height="7" rx="1.6" />
    <rect x="13.5" y="11" width="7.5" height="10" rx="1.6" />
  </svg>
);

export const IconoDifundir = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M4 10v4a1 1 0 0 0 1 1h2.6l5.2 3.9a.8.8 0 0 0 1.2-.65V5.75a.8.8 0 0 0-1.2-.65L7.6 9H5a1 1 0 0 0-1 1Z" />
    <path d="M18 9.2a4 4 0 0 1 0 5.6M20.5 6.5a7.5 7.5 0 0 1 0 11" />
  </svg>
);

export const IconoEquipo = (p: Props) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="7.5" r="3.5" />
    <path d="M5 20.5a7 7 0 0 1 14 0" />
    <path d="M17.5 3.5l1.2 1.2 2.3-2.3" />
  </svg>
);

export const IconoMas = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconoAtras = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M15 19l-7-7 7-7" />
  </svg>
);

export const IconoTelefono = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M6.5 3h3l1.5 4-2 1.4a12 12 0 0 0 5.6 5.6L16 12l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3.5 5.2 2 2 0 0 1 5.5 3Z" />
  </svg>
);

export const IconoWhatsApp = (p: Props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.34 5L2 22l5.2-1.36a9.9 9.9 0 0 0 4.84 1.24h.01c5.5 0 9.96-4.46 9.96-9.96S17.54 2 12.04 2Zm0 18.2c-1.5 0-2.98-.4-4.27-1.17l-.3-.18-3.09.81.82-3.01-.2-.31a8.24 8.24 0 1 1 7.04 3.86Zm4.52-6.17c-.25-.12-1.47-.72-1.7-.8-.22-.09-.39-.13-.55.12s-.63.8-.77.96c-.14.17-.28.19-.53.06a6.77 6.77 0 0 1-3.38-2.95c-.25-.44.25-.4.72-1.36.08-.17.04-.31-.02-.43-.06-.13-.55-1.34-.76-1.83-.2-.47-.4-.41-.55-.42h-.47c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.06s.89 2.39 1.01 2.56c.13.17 1.75 2.67 4.24 3.74 1.58.68 2.2.74 2.99.62.48-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.15-1.18-.06-.11-.23-.17-.48-.29Z" />
  </svg>
);

export const IconoCheck = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export const IconoAlerta = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20.2h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

export const IconoSalir = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);

export const IconoBuscar = (p: Props) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const IconoOjo = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconoOjoTachado = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M9.9 5.2A9.8 9.8 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.2 6.2A17.7 17.7 0 0 0 2 12s3.6 7 10 7c2 0 3.7-.7 5.1-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="m3 3 18 18" />
  </svg>
);

export const IconoDescargar = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M12 3v12M7 11l5 5 5-5M4 20h16" />
  </svg>
);
