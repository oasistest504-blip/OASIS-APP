import React, { useState } from 'react';
import { IconoDescargar, IconoCheck } from './Iconos';
import { Aviso } from './UI';

export function GeneradorIconosPWA() {
  const [generando, setGenerando] = useState(false);
  const [descargados, setDescargados] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generarYDescargarIconos() {
    setGenerando(true);
    setError(null);

    try {
      // 1. Cargar el logo SVG oficial como imagen
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('No se pudo cargar /logo.svg'));
        img.src = '/logo.svg';
      });

      // Definición de los 4 tamaños exactos solicitados
      const configuraciones = [
        {
          nombre: 'icon-192.png',
          ancho: 192,
          alto: 192,
          maskable: false,
          fondo: '#F8FAFC',
        },
        {
          nombre: 'icon-512.png',
          ancho: 512,
          alto: 512,
          maskable: false,
          fondo: '#F8FAFC',
        },
        {
          nombre: 'icon-maskable-512.png',
          ancho: 512,
          alto: 512,
          maskable: true,
          fondo: '#2B5B84',
        },
        {
          nombre: 'apple-touch-icon.png',
          ancho: 180,
          alto: 180,
          maskable: false,
          fondo: '#2B5B84',
        },
      ];

      for (const config of configuraciones) {
        const canvas = document.createElement('canvas');
        canvas.width = config.ancho;
        canvas.height = config.alto;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        // Fondo
        if (config.fondo) {
          ctx.fillStyle = config.fondo;
          ctx.fillRect(0, 0, config.ancho, config.alto);
        }

        // Si es maskable o apple-touch-icon, dejamos un margen de seguridad del 15% (zona segura del 80%)
        const escalaSegura = config.maskable || config.nombre === 'apple-touch-icon.png' ? 0.75 : 0.88;
        const aspect = img.width / img.height;

        let dibAncho = config.ancho * escalaSegura;
        let dibAlto = dibAncho / aspect;
        if (dibAlto > config.alto * escalaSegura) {
          dibAlto = config.alto * escalaSegura;
          dibAncho = dibAlto * aspect;
        }

        const x = (config.ancho - dibAncho) / 2;
        const y = (config.alto - dibAlto) / 2;

        ctx.drawImage(img, x, y, dibAncho, dibAlto);

        // Convertir a blob PNG binario nativo generado por el motor del navegador
        await new Promise<void>((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const enlace = document.createElement('a');
              enlace.href = url;
              enlace.download = config.nombre;
              document.body.appendChild(enlace);
              enlace.click();
              document.body.removeChild(enlace);
              setTimeout(() => {
                URL.revokeObjectURL(url);
                resolve();
              }, 350);
            } else {
              resolve();
            }
          }, 'image/png');
        });
      }

      setDescargados(true);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Error al generar los iconos');
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="tarjeta" style={{ marginBottom: 20 }}>
      <div className="fila" style={{ gap: 8, marginBottom: 8 }}>
        <IconoDescargar size={20} className="texto-primario" />
        <h2 style={{ fontSize: '1.15rem', margin: 0 }}>Iconos PWA de la Aplicación</h2>
      </div>

      <p className="texto-medio" style={{ marginBottom: 12 }}>
        Para que la aplicación sea 100% instalable en celulares Android y iPhone, el sistema
        requiere los 4 iconos PNG en la carpeta <code>/public/icons/</code>.
      </p>

      <div
        style={{
          background: 'var(--fondo-suave, #f1f5f9)',
          padding: '12px 14px',
          borderRadius: 8,
          marginBottom: 14,
          fontSize: '0.85rem',
        }}
      >
        <strong style={{ display: 'block', marginBottom: 6 }}>Nombres y rutas exactas:</strong>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li>
            <code>/public/icons/icon-192.png</code> (192 &times; 192 px - Estándar Android)
          </li>
          <li>
            <code>/public/icons/icon-512.png</code> (512 &times; 512 px - Alta resolución)
          </li>
          <li>
            <code>/public/icons/icon-maskable-512.png</code> (512 &times; 512 px - Adaptativo con margen seguro)
          </li>
          <li>
            <code>/public/icons/apple-touch-icon.png</code> (180 &times; 180 px - Pantalla de inicio iOS / Safari)
          </li>
        </ul>
      </div>

      {error && <Aviso tipo="peligro">{error}</Aviso>}

      {descargados && (
        <div style={{ marginBottom: 12 }}>
          <Aviso tipo="exito">
            ¡Los 4 archivos PNG se generaron y descargaron correctamente en tu dispositivo!
            Ahora solo debes subirlos a la carpeta <code>public/icons/</code> de tu proyecto.
          </Aviso>
        </div>
      )}

      <button
        type="button"
        className="btn primario ancho"
        onClick={generarYDescargarIconos}
        disabled={generando}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        {descargados ? <IconoCheck size={18} /> : <IconoDescargar size={18} />}
        <span>
          {generando
            ? 'Generando archivos PNG nativos…'
            : descargados
              ? 'Volver a descargar los 4 iconos PNG'
              : 'Generar y descargar los 4 iconos PNG oficiales'}
        </span>
      </button>
    </div>
  );
}
