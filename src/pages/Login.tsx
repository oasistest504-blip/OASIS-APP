import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Aviso, CampoClave, Inicial } from '../components/UI';
import { IconoAtras } from '../components/Iconos';
import { LogoOasis } from '../components/LogoOasis';
import { store } from '../lib/store';

export default function Login() {
  const { paso, entrarConClave, elegirQuienSoy, volverAClave, lideres, configuracion } =
    useAuth();
  const [claveApostol, setClaveApostol] = useState('');
  const [claveLider, setClaveLider] = useState('');
  const [error, setError] = useState('');
  const [sembrando, setSembrando] = useState(false);

  function ingresarComoApostol(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError('');
    const claveAProbar = claveApostol.trim() || 'apostol';
    const problema = entrarConClave(claveAProbar);
    if (problema) {
      setError(problema);
    } else {
      setClaveApostol('');
    }
  }

  function ingresarComoLider(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError('');
    const claveAProbar = claveLider.trim() || 'oasis';
    const problema = entrarConClave(claveAProbar);
    if (problema) {
      setError(problema);
    } else {
      setClaveLider('');
    }
  }

  async function cargarLideresEjemplo() {
    setSembrando(true);
    setError('');
    try {
      await store.sembrarDatosEjemplo();
    } catch (e) {
      console.error(e);
      setError('No se pudieron cargar los datos de ejemplo.');
    } finally {
      setSembrando(false);
    }
  }

  return (
    <div className="pantalla-entrada">
      <div className="caja-entrada" style={{ maxWidth: 460 }}>
        <div className="placa-entrada" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 14 }}>
          <LogoOasis tamano={72} conTexto={true} />
        </div>

        {paso === 'clave' ? (
          <>
            <h1 style={{ fontSize: '1.4rem', marginTop: 4 }}>Oasis Seguimiento</h1>
            <p className="texto-medio" style={{ marginBottom: 20 }}>
              Para que ninguna persona que llega a la iglesia se quede sin que alguien la
              busque.
            </p>

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
                    placeholder="Ej: apostol"
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
                    placeholder="Ej: oasis"
                  />
                  <div style={{ marginTop: 10 }}>
                    <button className="btn secundario ancho" type="submit">
                      Entrar como Líder
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Accesos rápidos y carga de líderes */}
            <div
              style={{
                marginTop: 20,
                padding: '12px 14px',
                background: 'var(--fondo-suave, #f8fafc)',
                borderRadius: 10,
                border: '1px dashed var(--borde, #cbd5e1)',
                textAlign: 'center',
                fontSize: '0.82rem',
                color: 'var(--tinta-2, #475569)',
              }}
            >
              <div style={{ marginBottom: 6 }}>
                💡 <strong>Claves por defecto:</strong> Apóstol: <code>apostol</code> &bull; Líderes: <code>oasis</code>
              </div>
              <button
                type="button"
                className="btn fantasma chico"
                style={{ fontSize: '0.78rem', color: 'var(--azul-profundo)' }}
                disabled={sembrando}
                onClick={cargarLideresEjemplo}
              >
                {sembrando ? 'Cargando datos...' : '✨ Cargar / restaurar líderes y datos de ejemplo'}
              </button>
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
                  Aún no se han registrado líderes en el sistema. Puedes cargar los líderes de ejemplo para mostrar la app o ingresar como Apóstol.
                </Aviso>
                <button
                  type="button"
                  className="btn primario ancho"
                  disabled={sembrando}
                  onClick={cargarLideresEjemplo}
                >
                  {sembrando ? 'Cargando líderes...' : '✨ Cargar líderes de ejemplo (Carolina, Andrés, Diana...)'}
                </button>
                <button
                  type="button"
                  className="btn secundario ancho"
                  onClick={() => ingresarComoApostol()}
                >
                  Entrar como Apóstol
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
