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

            {error && <Aviso tipo="peligro">{error}</Aviso>}

            <div className="pila" style={{ textAlign: 'left', gap: 16 }}>
              {/* Acceso Apóstol */}
              <div className="tarjeta" style={{ padding: '16px', borderColor: 'var(--azul-borde)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.96rem', color: 'var(--azul-profundo)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>👤</span> Acceso del Apóstol
                </div>
                <form onSubmit={ingresarComoApostol}>
                  <CampoClave
                    etiqueta="Contraseña de Apóstol"
                    valor={claveApostol}
                    onChange={setClaveApostol}
                    autoComplete="current-password"
                    placeholder="Contraseña"
                  />
                  <div style={{ marginTop: 10 }}>
                    <button className="btn ancho" type="submit">
                      Entrar como Apóstol
                    </button>
                  </div>
                </form>
              </div>

              {/* Acceso Líderes */}
              <div className="tarjeta" style={{ padding: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.96rem', color: 'var(--tinta)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>👥</span> Acceso de los Líderes
                </div>
                <form onSubmit={ingresarComoLider}>
                  <CampoClave
                    etiqueta="Contraseña de Líderes"
                    valor={claveLider}
                    onChange={setClaveLider}
                    autoComplete="current-password"
                    placeholder="Contraseña"
                  />
                  <div style={{ marginTop: 10 }}>
                    <button className="btn secundario ancho" type="submit">
                      Entrar como Líder
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', marginBottom: 16 }}>
              <button className="btn fantasma chico" onClick={volverAClave}>
                <IconoAtras /> Volver
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
