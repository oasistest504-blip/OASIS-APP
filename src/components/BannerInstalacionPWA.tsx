import React, { useEffect, useState } from 'react';
import { usePWAInstall } from '../lib/usePWAInstall';
import { IconoDescargar } from './Iconos';
import { Modal } from './UI';

export function BannerInstalacionPWA() {
  const { puedeInstalar, estaInstalada, esIOS, esAndroid, instalar } = usePWAInstall();
  const [descartado, setDescartado] = useState(false);
  const [guiaIOSAbierta, setGuiaIOSAbierta] = useState(false);
  const [guiaAndroidAbierta, setGuiaAndroidAbierta] = useState(false);

  useEffect(() => {
    try {
      const fueDescartado = sessionStorage.getItem('oasis_banner_instalacion_descartado') === 'true';
      setDescartado(fueDescartado);
    } catch {}
  }, []);

  // Si la app ya está corriendo instalada (standalone), no mostramos el banner
  if (estaInstalada) {
    return null;
  }

  // Se muestra de inmediato si no está instalada y no ha sido descartada en esta sesión
  const deberiaMostrarBanner = !descartado;

  function descartar() {
    setDescartado(true);
    try {
      sessionStorage.setItem('oasis_banner_instalacion_descartado', 'true');
    } catch {}
  }

  async function handleInstalarClick() {
    if (puedeInstalar) {
      const exito = await instalar();
      if (exito) return;
    }

    // Si el navegador no permite disparo directo (Safari iOS o Chrome sin evento directo)
    if (esIOS) {
      setGuiaIOSAbierta(true);
    } else {
      setGuiaAndroidAbierta(true);
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
            margin: '10px 0 16px',
            background: 'linear-gradient(135deg, #1F4E70 0%, #2B5B84 100%)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 14,
            padding: '12px 16px',
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
            <div className="fila" style={{ gap: 12, alignItems: 'center', flex: '1 1 220px' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
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
                  style={{ width: 26, height: 26, objectFit: 'contain' }}
                />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem', color: '#FFFFFF', lineHeight: 1.2 }}>
                  Instalar Oasis en tu celular
                </strong>
                <span style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.85)' }}>
                  Agrégala a tu pantalla de inicio como una aplicación nativa.
                </span>
              </div>
            </div>

            <div className="fila" style={{ gap: 8, flexShrink: 0, alignItems: 'center' }}>
              <button
                type="button"
                className="btn chico"
                onClick={handleInstalarClick}
                style={{
                  background: '#FFFFFF',
                  color: '#1F4E70',
                  fontWeight: 700,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
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
            En iOS (Safari), sigue estos 3 sencillos pasos para instalarla en tu celular:
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
              Toca el botón <strong>Compartir</strong> en la barra inferior de Safari (el ícono del cuadro con flecha hacia arriba <strong>⎋</strong>).
            </li>
            <li>
              Desplázate hacia abajo y selecciona <strong>"Añadir a pantalla de inicio"</strong>.
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

      {/* Modal explicativo para dispositivos Android / Chrome */}
      <Modal
        abierto={guiaAndroidAbierta}
        onCerrar={() => setGuiaAndroidAbierta(false)}
        titulo="Instalar en tu celular Android"
      >
        <div className="pila" style={{ gap: 14 }}>
          <p className="texto-medio" style={{ margin: 0 }}>
            Para tener Oasis Seguimiento como app en tu pantalla de inicio:
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
              Toca los <strong>tres puntos (⋮)</strong> en la esquina superior derecha de tu navegador Chrome.
            </li>
            <li>
              Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.
            </li>
            <li>
              Confirma tocando <strong>"Instalar"</strong>.
            </li>
          </ol>

          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
            Una vez instalada, la app abrirá a pantalla completa sin barra de navegación.
          </p>

          <button
            type="button"
            className="btn primario"
            onClick={() => setGuiaAndroidAbierta(false)}
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
  const [guiaAndroidAbierta, setGuiaAndroidAbierta] = useState(false);

  if (estaInstalada) return null;

  async function handleClick() {
    if (puedeInstalar) {
      const exito = await instalar();
      if (exito) return;
    }
    if (esIOS) {
      setGuiaIOSAbierta(true);
    } else {
      setGuiaAndroidAbierta(true);
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
              Toca el botón <strong>Compartir</strong> en la barra de Safari (ícono del cuadro con flecha hacia arriba <strong>⎋</strong>).
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

      <Modal
        abierto={guiaAndroidAbierta}
        onCerrar={() => setGuiaAndroidAbierta(false)}
        titulo="Instalar en tu celular Android"
      >
        <div className="pila" style={{ gap: 14 }}>
          <p className="texto-medio" style={{ margin: 0 }}>
            Para instalar la app en tu celular:
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
              Toca los <strong>tres puntos (⋮)</strong> arriba a la derecha en Chrome.
            </li>
            <li>
              Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.
            </li>
            <li>
              Confirma tocando <strong>"Instalar"</strong>.
            </li>
          </ol>
          <button
            type="button"
            className="btn primario"
            onClick={() => setGuiaAndroidAbierta(false)}
            style={{ width: '100%', marginTop: 6 }}
          >
            Entendido
          </button>
        </div>
      </Modal>
    </>
  );
}
