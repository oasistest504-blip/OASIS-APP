// =====================================================================
//  La primera vez que se abre la app con una base de datos vacía.
//
//  En vez de obligar a alguien a crear registros a mano en la consola
//  de Firebase, la app se instala sola: se pregunta quién es el Apóstol
//  y cuáles van a ser las dos contraseñas.
// =====================================================================

import { useState } from 'react';
import { store } from '../lib/store';
import { Aviso, CampoClave } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { LogoOasis } from '../components/LogoOasis';

export default function PrimeraVez({ onListo }: { onListo?: () => void }) {
  const { entrarConClave } = useAuth();
  const [claveApostol, setClaveApostol] = useState('');
  const [claveLideres, setClaveLideres] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function empezar(rolDestino: 'apostol' | 'lider') {
    setError('');

    const finalApostol = claveApostol.trim();
    const finalLideres = claveLideres.trim();

    if (finalApostol.length < 4 || finalLideres.length < 4) {
      setError('Cada contraseña necesita al menos 4 caracteres.');
      return;
    }
    if (finalApostol.toLowerCase() === finalLideres.toLowerCase()) {
      setError('Las dos contraseñas tienen que ser distintas.');
      return;
    }

    setGuardando(true);
    try {
      await store.guardarConfiguracion({
        claveApostol: finalApostol,
        claveLideres: finalLideres,
      });
      
      if (rolDestino === 'apostol') {
        entrarConClave(finalApostol);
      } else {
        entrarConClave(finalLideres);
      }
      onListo?.();
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo guardar. Intenta otra vez.');
      setGuardando(false);
    }
  }

  return (
    <div className="pantalla-entrada">
      <div className="caja-entrada" style={{ maxWidth: 480 }}>
        <div className="placa-entrada" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 14 }}>
          <LogoOasis tamano={72} conTexto={true} />
        </div>

        <h1 style={{ marginBottom: 8, fontSize: '1.4rem' }}>Vamos a dejar la app lista</h1>
        <p className="texto-medio" style={{ marginBottom: 20 }}>
          Configura las contraseñas y elige por cuál de los dos accesos deseas empezar:
        </p>

        {error && <Aviso tipo="peligro">{error}</Aviso>}

        <div className="pila" style={{ textAlign: 'left', gap: 18 }}>
          {/* Bloque 1: Apóstol */}
          <div className="tarjeta" style={{ padding: '16px 18px', background: 'var(--tarjeta)', borderColor: 'var(--azul-borde)' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--azul-profundo)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>👤</span> Acceso del Apóstol
            </div>
            <CampoClave
              etiqueta="Contraseña del Apóstol"
              valor={claveApostol}
              onChange={setClaveApostol}
              placeholder="Contraseña del Apóstol"
              autoFocus
              ayuda="Acceso privado con control total de supervisión, líderes y ajustes."
            />
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn ancho"
                disabled={guardando}
                onClick={() => empezar('apostol')}
              >
                {guardando ? 'Iniciando…' : 'Empezar como Apóstol'}
              </button>
            </div>
          </div>

          {/* Bloque 2: Líderes */}
          <div className="tarjeta" style={{ padding: '16px 18px', background: 'var(--tarjeta)' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--tinta)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>👥</span> Acceso de los Líderes
            </div>
            <CampoClave
              etiqueta="Contraseña para los líderes"
              valor={claveLideres}
              onChange={setClaveLideres}
              placeholder="Contraseña para los líderes"
              ayuda="Clave compartida con el equipo para registrar personas y atender tareas."
            />
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn secundario ancho"
                disabled={guardando}
                onClick={() => empezar('lider')}
              >
                {guardando ? 'Iniciando…' : 'Empezar como Líder'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
