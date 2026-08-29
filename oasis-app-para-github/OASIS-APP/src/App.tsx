import { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';
import { ProveedorDatos, useDatos } from './context/DatosContext';
import { MODO_DEMO } from './lib/store';
import { Cargando } from './components/UI';
import {
  IconoMas,
  IconoPersonas,
  IconoTareas,
  IconoPanel,
  IconoEquipo,
  IconoSalir,
} from './components/Iconos';
import { estaVencida } from './lib/reglas';

import Login from './pages/Login';
import PrimeraVez from './pages/PrimeraVez';
import Inicio from './pages/Inicio';
import MisPersonas from './pages/MisPersonas';
import FichaPersona from './pages/FichaPersona';
import MisTareas from './pages/MisTareas';
import Supervision from './pages/Supervision';
import PanelApostol from './pages/PanelApostol';
import PanelPrivado from './pages/PanelPrivado';
import Lideres from './pages/Lideres';
import Difundir from './pages/Difundir';
import ConexionWhatsApp from './pages/ConexionWhatsApp';

export type Vista =
  | 'inicio'
  | 'personas'
  | 'tareas'
  | 'panel'
  | 'lideres'
  | 'privado'
  | 'difundir'
  | 'whatsapp'
  | 'ficha';

export default function App() {
  const { usuario, cargando, paso, sinInstalar } = useAuth();
  const [instalado, setInstalado] = useState(false);

  if (cargando) return <Cargando texto="Abriendo Oasis Seguimiento…" />;
  if (sinInstalar && !instalado) return <PrimeraVez onListo={() => setInstalado(true)} />;
  if (paso !== 'dentro' || !usuario) return <Login />;

  return (
    <ProveedorDatos>
      <Interior />
    </ProveedorDatos>
  );
}

function Interior() {
  const { usuario, esApostol, salir, configuracion } = useAuth();
  const { tareas, listo } = useDatos();
  // El Apóstol abre en su panel, porque lo primero que necesita es ver
  // cómo va la iglesia. El líder abre en Registrar, que es lo que hace.
  const [nav, setNav] = useState<{ vista: Vista; personaId?: string; grupo?: string }>({
    vista: esApostol ? 'panel' : 'inicio',
  });
  const [tostada, setTostada] = useState('');

  useEffect(() => {
    if (!tostada) return;
    const duracion = Math.min(9000, Math.max(3500, tostada.length * 55));
    const t = setTimeout(() => setTostada(''), duracion);
    return () => clearTimeout(t);
  }, [tostada]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [nav.vista, nav.personaId]);

  const pendientes = tareas.filter((t) => t.estado === 'pendiente');
  const vencidas = pendientes.filter(estaVencida).length;
  const urgentes = pendientes.filter((t) => t.prioridad === 'urgente').length;

  const ir = (v: Vista, personaId?: string, grupo?: string) =>
    setNav({ vista: v, personaId, grupo });

  // Cuatro pestañas para cada rol, distintas según lo que hace cada uno.
  // El líder registra y acompaña; el Apóstol mira, dirige y reparte.
  //
  // Por eso su cuarta pestaña no es «Tareas» sino «Seguimiento»: él no
  // llama ni visita, y el número rojo cuenta lo que necesita su atención
  // —lo urgente y lo vencido—, no una lista de pendientes suyos.
  const pestanas: Array<{ id: Vista; nombre: string; Icono: any; globo?: number }> = esApostol
    ? [
        { id: 'panel', nombre: 'Panel', Icono: IconoPanel },
        { id: 'personas', nombre: 'Personas', Icono: IconoPersonas },
        { id: 'lideres', nombre: 'Líderes', Icono: IconoEquipo },
        {
          id: 'tareas',
          nombre: 'Seguimiento',
          Icono: IconoTareas,
          globo: urgentes + vencidas,
        },
      ]
    : [
        { id: 'inicio', nombre: 'Registrar', Icono: IconoMas },
        { id: 'personas', nombre: 'Personas', Icono: IconoPersonas },
        { id: 'tareas', nombre: 'Tareas', Icono: IconoTareas, globo: pendientes.length },
      ];

  return (
    <div className="app">
      <header className="cabecera">
        <span className="placa-logo">
          <img src="/logo.png" alt={configuracion.nombreIglesia} />
        </span>
        <div className="titulo">
          <span>Oasis Seguimiento</span>
          {/* El Apóstol es uno solo: el cargo basta. Los líderes sí llevan
              su nombre, para confirmar de quién es la sesión. */}
          <small>{esApostol ? 'Apóstol' : `${usuario?.nombre} · Líder`}</small>
        </div>
        {MODO_DEMO && <span className="chip-modo">Demo</span>}
        <button
          className="btn fantasma chico"
          onClick={salir}
          aria-label="Salir"
          title="Salir"
          style={{ padding: '7px 9px' }}
        >
          <IconoSalir />
        </button>
      </header>

      <nav className="barra-nav" aria-label="Secciones">
        {pestanas.map(({ id, nombre, Icono, globo }) => (
          <button
            key={id}
            className={nav.vista === id ? 'activo' : ''}
            onClick={() => ir(id)}
            aria-current={nav.vista === id ? 'page' : undefined}
          >
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <Icono />
              {globo ? <span className="globo">{globo}</span> : null}
            </span>
            <span>{nombre}</span>
          </button>
        ))}
      </nav>

      <div className="contenido">
        {!listo && <Cargando />}

        {listo && nav.vista === 'inicio' && <Inicio ir={ir} avisar={setTostada} />}
        {listo && nav.vista === 'personas' && <MisPersonas ir={ir} />}
        {listo &&
          nav.vista === 'tareas' &&
          (esApostol ? (
            <Supervision ir={ir} avisar={setTostada} />
          ) : (
            <MisTareas ir={ir} avisar={setTostada} />
          ))}
        {listo && nav.vista === 'panel' && <PanelApostol ir={ir} vencidas={vencidas} />}
        {listo && nav.vista === 'lideres' && <Lideres ir={ir} avisar={setTostada} />}
        {listo && nav.vista === 'privado' && <PanelPrivado ir={ir} avisar={setTostada} />}
        {listo && nav.vista === 'difundir' && (
          <Difundir avisar={setTostada} ir={ir} grupoInicial={nav.grupo} />
        )}
        {listo && nav.vista === 'whatsapp' && <ConexionWhatsApp avisar={setTostada} />}
        {listo && nav.vista === 'ficha' && nav.personaId && (
          <FichaPersona personaId={nav.personaId} ir={ir} avisar={setTostada} />
        )}
      </div>

      {esApostol && nav.vista === 'personas' && (
        <button className="btn btn-flotante" onClick={() => ir('inicio')}>
          <IconoMas /> Registrar persona
        </button>
      )}

      {tostada && <div className="tostada">{tostada}</div>}
    </div>
  );
}
