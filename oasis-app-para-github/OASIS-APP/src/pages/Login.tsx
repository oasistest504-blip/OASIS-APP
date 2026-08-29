import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { MODO_DEMO } from '../lib/store';
import { Aviso, CampoClave, Inicial } from '../components/UI';
import { IconoAtras } from '../components/Iconos';

export default function Login() {
  const { paso, entrarConClave, elegirQuienSoy, volverAClave, lideres, configuracion } =
    useAuth();
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');

  function intentar(e: React.FormEvent) {
    e.preventDefault();
    const problema = entrarConClave(clave);
    setError(problema);
    if (!problema) setClave('');
  }

  return (
    <div className="pantalla-entrada">
      <div className="caja-entrada">
        <div className="placa-entrada">
          <img src="/logo.png" alt={configuracion.nombreIglesia} />
        </div>

        {paso === 'clave' ? (
          <>
            <h1>Oasis Seguimiento</h1>
            <p className="texto-medio" style={{ marginBottom: 22 }}>
              Para que ninguna persona que llega a la iglesia se quede sin que alguien la
              busque.
            </p>

            {error && <Aviso tipo="peligro">{error}</Aviso>}

            <form onSubmit={intentar}>
              <CampoClave
                etiqueta="Contraseña de la iglesia"
                valor={clave}
                onChange={setClave}
                placeholder="Escríbela aquí"
                autoFocus
                autoComplete="current-password"
              />
              <button className="btn ancho" type="submit">
                Entrar
              </button>
            </form>

            {MODO_DEMO && (
              <div style={{ marginTop: 20 }}>
                <Aviso tipo="alerta" titulo="Estás en la demostración">
                  Contraseña de líder: <b>oasis</b>
                  <br />
                  Contraseña del Apóstol: <b>apostol</b>
                </Aviso>
              </div>
            )}
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
              <Aviso tipo="alerta" titulo="Todavía no hay líderes">
                El Apóstol tiene que agregarlos desde su panel privado antes de que alguien
                pueda entrar.
              </Aviso>
            ) : (
              <div className="pila">
                {lideres.map((l) => (
                  <button key={l.id} className="item" onClick={() => elegirQuienSoy(l.id)}>
                    <Inicial nombre={l.nombre} />
                    <div className="crecer">
                      <div className="nombre">{l.nombre}</div>
                      <div className="sub">Líder</div>
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
