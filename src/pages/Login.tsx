import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Aviso, CampoClave, Inicial } from '../components/UI';
import { IconoAtras } from '../components/Iconos';
import { LogoOasis } from '../components/LogoOasis';
import { BannerInstalacionPWA } from '../components/BannerInstalacionPWA';

export default function Login() {
  const {
    paso,
    entrarComoApostol,
    entrarComoLider,
    elegirQuienSoy,
    volverAClave,
    lideres,
    sesionExpirada,
    limpiarSesionExpirada,
  } = useAuth();
  const [rolSeleccionado, setRolSeleccionado] = useState<'apostol' | 'lider'>('apostol');
  const [claveApostol, setClaveApostol] = useState('');
  const [claveLider, setClaveLider] = useState('');
  const [error, setError] = useState('');

  function ingresarComoApostol(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError('');
    limpiarSesionExpirada();
    const claveAProbar = claveApostol.trim();
    if (!claveAProbar) {
      setError('Escribe la contraseña de Apóstol.');
      return;
    }
    const problema = entrarComoApostol(claveAProbar);
    if (problema) {
      setError(problema);
    } else {
      setClaveApostol('');
    }
  }

  function ingresarComoLider(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError('');
    limpiarSesionExpirada();
    const claveAProbar = claveLider.trim();
    if (!claveAProbar) {
      setError('Escribe la contraseña de Líderes.');
      return;
    }
    const problema = entrarComoLider(claveAProbar);
    if (problema) {
      setError(problema);
    } else {
      setClaveLider('');
    }
  }

  return (
    <div className="pantalla-entrada">
      <div className="caja-entrada" style={{ maxWidth: 460 }}>
        <BannerInstalacionPWA />

        <div className="placa-entrada" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 14 }}>
          <LogoOasis tamano={72} conTexto={true} />
        </div>

        {paso === 'clave' ? (
          <>
            <h1 style={{ fontSize: '1.4rem', marginTop: 4 }}>Oasis Seguimiento</h1>
            <p className="texto-medio" style={{ marginBottom: 16 }}>
              Para que ninguna persona que llega a la iglesia se quede sin que alguien la
              busque.
            </p>

            {sesionExpirada && (
              <div style={{ marginBottom: 16, textAlign: 'left' }}>
                <Aviso tipo="info" titulo="Sesión cerrada por inactividad">
                  Por seguridad, la sesión se cierra automáticamente después de 1 hora sin actividad. Por favor ingresa tu contraseña nuevamente.
                </Aviso>
              </div>
            )}

            {/* Selector claro de Rol para evitar confusiones en celular */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 6,
                padding: 4,
                background: 'rgba(43, 91, 132, 0.08)',
                borderRadius: 10,
                marginBottom: 16,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setRolSeleccionado('apostol');
                  setError('');
                }}
                style={{
                  padding: '10px 8px',
                  borderRadius: 8,
                  fontWeight: rolSeleccionado === 'apostol' ? 700 : 500,
                  fontSize: '0.9rem',
                  border: 'none',
                  cursor: 'pointer',
                  background: rolSeleccionado === 'apostol' ? '#FFFFFF' : 'transparent',
                  color: rolSeleccionado === 'apostol' ? 'var(--azul-profundo, #1F4E70)' : 'var(--tinta-2, #64748b)',
                  boxShadow: rolSeleccionado === 'apostol' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <span>👤</span> Soy el Apóstol
              </button>

              <button
                type="button"
                onClick={() => {
                  setRolSeleccionado('lider');
                  setError('');
                }}
                style={{
                  padding: '10px 8px',
                  borderRadius: 8,
                  fontWeight: rolSeleccionado === 'lider' ? 700 : 500,
                  fontSize: '0.9rem',
                  border: 'none',
                  cursor: 'pointer',
                  background: rolSeleccionado === 'lider' ? '#FFFFFF' : 'transparent',
                  color: rolSeleccionado === 'lider' ? 'var(--azul-profundo, #1F4E70)' : 'var(--tinta-2, #64748b)',
                  boxShadow: rolSeleccionado === 'lider' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <span>👥</span> Soy un Líder
              </button>
            </div>

            {error && <Aviso tipo="peligro">{error}</Aviso>}

            <div className="pila" style={{ textAlign: 'left', gap: 16 }}>
              {rolSeleccionado === 'apostol' ? (
                /* Formulario del Apóstol */
                <div className="tarjeta" style={{ padding: '18px', borderColor: 'var(--azul-borde)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.96rem', color: 'var(--azul-profundo)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>👤</span> Acceso del Apóstol
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--tinta-2, #64748b)', margin: '0 0 12px 0' }}>
                    Panel general, métricas de seguimiento y administración de líderes.
                  </p>
                  <form onSubmit={ingresarComoApostol}>
                    <CampoClave
                      etiqueta="Contraseña de Apóstol"
                      valor={claveApostol}
                      onChange={setClaveApostol}
                      autoComplete="current-password"
                      placeholder="Contraseña del Apóstol"
                    />
                    <div style={{ marginTop: 14 }}>
                      <button className="btn ancho" type="submit">
                        Entrar al Panel General
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* Formulario de Líderes */
                <div className="tarjeta" style={{ padding: '18px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.96rem', color: 'var(--tinta)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>👥</span> Acceso de los Líderes
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--tinta-2, #64748b)', margin: '0 0 12px 0' }}>
                    Registro de nuevas personas y tareas pastorales asignadas.
                  </p>
                  <form onSubmit={ingresarComoLider}>
                    <CampoClave
                      etiqueta="Contraseña de Líderes"
                      valor={claveLider}
                      onChange={setClaveLider}
                      autoComplete="current-password"
                      placeholder="Contraseña del equipo"
                    />
                    <div style={{ marginTop: 14 }}>
                      <button className="btn secundario ancho" type="submit">
                        Continuar como Líder
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <button className="btn fantasma chico" onClick={volverAClave}>
                <IconoAtras /> Volver
              </button>

              {/* Botón rápido por si el apóstol cayó aquí por accidente */}
              <button
                type="button"
                className="btn fantasma chico"
                style={{ fontSize: '0.8rem', color: 'var(--azul-profundo)' }}
                onClick={() => {
                  volverAClave();
                  setRolSeleccionado('apostol');
                }}
              >
                ¿Eres el Apóstol? Entra aquí
              </button>
            </div>

            <h1 style={{ marginBottom: 6 }}>¿Quién eres?</h1>
            <p className="texto-medio" style={{ marginBottom: 18 }}>
              Toca tu nombre para que la app sepa a quién asignarle las personas y las
              tareas.
            </p>

            {lideres.length === 0 ? (
              <div className="pila" style={{ gap: 14 }}>
                <Aviso tipo="alerta" titulo="No hay líderes registrados">
                  Aún no se han registrado líderes en el sistema. El Apóstol debe agregarlos desde el panel de administración.
                </Aviso>
                <button
                  type="button"
                  className="btn primario"
                  onClick={() => {
                    volverAClave();
                    setRolSeleccionado('apostol');
                  }}
                >
                  Entrar como Apóstol para agregar líderes
                </button>
              </div>
            ) : (
              <div className="pila">
                {lideres.map((l) => (
                  <button key={l.id} className="item" onClick={() => elegirQuienSoy(l.id)}>
                    <Inicial nombre={l.nombre} />
                    <div className="crecer">
                      <div className="nombre" style={{ fontWeight: 600 }}>{l.nombre}</div>
                      <div className="sub">Líder pastoral &bull; {l.telefono || 'Sin teléfono'}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
