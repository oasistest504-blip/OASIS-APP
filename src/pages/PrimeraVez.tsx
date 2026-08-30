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

export default function PrimeraVez({ onListo }: { onListo: () => void }) {
  const [claveApostol, setClaveApostol] = useState('apostol');
  const [claveLideres, setClaveLideres] = useState('oasis');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function instalar(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (claveApostol.trim().length < 4 || claveLideres.trim().length < 4) {
      setError('Cada contraseña necesita al menos 4 caracteres.');
      return;
    }
    if (claveApostol.trim().toLowerCase() === claveLideres.trim().toLowerCase()) {
      setError('Las dos contraseñas tienen que ser distintas. Ese es todo el punto.');
      return;
    }

    setGuardando(true);
    try {
      await store.crearUsuario({
        nombre: 'Apóstol',
        rol: 'apostol',
        activo: true,
        capacidadSemanal: 10,
        creadoEn: new Date().toISOString(),
      });
      await store.guardarConfiguracion({
        claveApostol: claveApostol.trim(),
        claveLideres: claveLideres.trim(),
      });
      onListo();
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo guardar. Intenta otra vez.');
      setGuardando(false);
    }
  }

  return (
    <div className="pantalla-entrada">
      <div className="caja-entrada">
        <div className="placa-entrada">
          <img src="/logo.png" alt="Centro de Alabanza Oasis" />
        </div>

        <h1 style={{ marginBottom: 8 }}>Vamos a dejar la app lista</h1>
        <p className="texto-medio" style={{ marginBottom: 22 }}>
          Solo se hace una vez. Después los líderes entran con una contraseña y tú con la
          tuya.
        </p>

        {error && <Aviso tipo="peligro">{error}</Aviso>}

        <form onSubmit={instalar} style={{ textAlign: 'left' }}>
          <CampoClave
            etiqueta="Tu contraseña de Apóstol"
            valor={claveApostol}
            onChange={setClaveApostol}
            placeholder="Solo tuya"
            autoFocus
            ayuda="Es la única que abre el panel donde se agregan y se quitan líderes. No la compartas."
          />

          <CampoClave
            etiqueta="Contraseña para los líderes"
            valor={claveLideres}
            onChange={setClaveLideres}
            placeholder="La que le das al equipo"
            ayuda="Esta la comparte todo el equipo. Cámbiala cuando alguien salga de la iglesia."
          />

          <button className="btn ancho" type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Empezar'}
          </button>
        </form>
      </div>
    </div>
  );
}
