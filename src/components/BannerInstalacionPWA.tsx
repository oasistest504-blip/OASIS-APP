import React, { useEffect, useState } from 'react';
import { usePWAInstall } from '../lib/usePWAInstall';
import { IconoDescargar } from './Iconos';
import { Modal } from './UI';

export function BannerInstalacionPWA() {
  const { puedeInstalar, estaInstalada, esIOS, instalar } = usePWAInstall();
  const [descartado, setDescartado] = useState(false);
  const [accionCompletada, setAccionCompletada] = useState(false);
  const [guiaIOSAbierta, setGuiaIOSAbierta] = useState(false);

  useEffect(() => {
    try {
      const fueDescartado = localStorage.getItem('oasis_banner_instalacion_descartado') === 'true';
      const completoAccion = localStorage.getItem('oasis_accion_completada') === 'true';
      setDescartado(fueDescartado);
      setAccionCompletada(completoAccion);
    } catch {}
  }, []);

  // Si la app ya está corriendo instalada, no mostramos el banner
  if (estaInstalada) {
    return null;
  }

  // Regla PWA: No mostrar en la primera visita inmediata sin acción previa, a menos que el usuario interactúe
  // Solo se muestra si hubo alguna acción o si el usuario puede instalarlo y no lo ha descartado
  const deberiaMostrarBanner = (puedeInstalar || esIOS) && !descartado && accionCompletada;

  function descartar() {
    setDescartado(true);
    try {
      localStorage.setItem('oasis_banner_instalacion_descartado', 'true');
    } catch {}
  }

  function handleInstalarClick() {
    if (esIOS && !puedeInstalar) {
      setGuiaIOSAbierta(true);
    } else {
      instalar().then((exito) => {
        if (!exito && esIOS) {
          setGuiaIOSAbierta(true);
        }
      });
    }
  }

  return (
    <>
      {deberiaMostrarBanner && (
        <aside
          role="region"
          aria-label="Instalación de la aplicación"
          className="tarjeta"
          style={{
            margin: '12px 0 16px',
            background: 'linear-gradient(135deg, #1F4E70 0%, #2B5B84 100%)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 14,
            padding: '14px 16px',
            boxShadow: '0 4px 14px rgba(31, 78, 112, 0.25)',
          }}
        >
          <div
            className="fila-entre"
            style={{
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div className="fila" style={{ gap: 12, alignItems: 'center', flex: '1 1 240px' }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <img
                  src="/logo.svg"
                  alt="Oasis"
                  style={{ width: 28, height: 28, objectFit: 'contain' }}
                />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem', color: '#FFFFFF' }}>
                  Instalar Oasis Seguimiento
                </strong>
                <span style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.85)' }}>
                  Acceso rápido en tu pantalla de inicio como una aplicación nativa.
                </span>
              </div>
            </div>

            <div className="fila" style={{ gap: 8, flexShrink: 0 }}>
              <button
                type="button"
                className="btn chico"
                onClick={handleInstalarClick}
                style={{
                  background: '#FFFFFF',
                  color: '#1F4E70',
                  fontWeight: 600,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <IconoDescargar size={16} />
                <span>Instalar</span>
              </button>
              <button
                type="button"
                className="btn fantasma chico"
                onClick={descartar}
                style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  padding: '6px 8px',
                  fontSize: '0.82rem',
                }}
              >
                Ahora no
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Modal explicativo para dispositivos Apple iOS */}
      <Modal
        abierto={guiaIOSAbierta}
        onCerrar={() => setGuiaIOSAbierta(false)}
        titulo="Instalar en iPhone o iPad"
      >
        <div className="pila" style={{ gap: 14 }}>
          <p className="texto-medio" style={{ margin: 0 }}>
            En iOS (Safari), sigue estos 3 sencillos pasos para tener la app en tu pantalla de inicio:
          </p>

          <ol
            style={{
              paddingLeft: 20,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              fontSize: '0.9rem',
              color: 'var(--tinta-1, #1e293b)',
            }}
          >
            <li>
              Toca el botón <strong>Compartir</strong> en la barra inferior de Safari (el ícono de
              un cuadro con flecha hacia arriba <strong>⎋</strong>).
            </li>
            <li>
              Desplázate hacia abajo en el menú y selecciona{' '}
              <strong>"Añadir a pantalla de inicio"</strong>.
            </li>
            <li>
              Toca <strong>"Añadir"</strong> en la esquina superior derecha para finalizar.
            </li>
          </ol>

          <button
            type="button"
            className="btn primario"
            onClick={() => setGuiaIOSAbierta(false)}
            style={{ width: '100%', marginTop: 6 }}
          >
            Entendido
          </button>
        </div>
      </Modal>
    </>
  );
}

/**
 * Botón discreto para montar en la cabecera o ajustes
 */
export function BotonInstalarPWA() {
  const { puedeInstalar, estaInstalada, esIOS, instalar } = usePWAInstall();
  const [guiaIOSAbierta, setGuiaIOSAbierta] = useState(false);

  if (estaInstalada) return null;

  function handleClick() {
    if (esIOS && !puedeInstalar) {
      setGuiaIOSAbierta(true);
    } else {
      instalar().then((exito) => {
        if (!exito && esIOS) setGuiaIOSAbierta(true);
      });
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn fantasma chico"
        onClick={handleClick}
        title="Descargar o instalar app en tu dispositivo"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          color: 'var(--color-primario, #2B5B84)',
          fontWeight: 600,
          padding: '5px 9px',
        }}
      >
        <IconoDescargar size={16} />
        <span>Instalar</span>
      </button>

      <Modal
        abierto={guiaIOSAbierta}
        onCerrar={() => setGuiaIOSAbierta(false)}
        titulo="Instalar en iPhone o iPad"
      >
        <div className="pila" style={{ gap: 14 }}>
          <p className="texto-medio" style={{ margin: 0 }}>
            Para instalar en tu iPhone / iPad desde Safari:
          </p>
          <ol
            style={{
              paddingLeft: 20,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              fontSize: '0.9rem',
              color: 'var(--tinta-1, #1e293b)',
            }}
          >
            <li>
              Toca el botón <strong>Compartir</strong> en la barra de Safari (el ícono del cuadro con
              flecha hacia arriba <strong>⎋</strong>).
            </li>
            <li>
              Baja en las opciones y presiona <strong>"Añadir a pantalla de inicio"</strong>.
            </li>
            <li>
              Confirma tocando <strong>"Añadir"</strong> arriba a la derecha.
            </li>
          </ol>
          <button
            type="button"
            className="btn primario"
            onClick={() => setGuiaIOSAbierta(false)}
            style={{ width: '100%', marginTop: 6 }}
          >
            Entendido
          </button>
        </div>
      </Modal>
    </>
  );
}
