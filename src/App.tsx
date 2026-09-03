import { useState, useMemo, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useDatos } from './context/DatosContext';
import { estaVencida } from './lib/reglas';

// Páginas
import Login from './pages/Login';
import PrimeraVez from './pages/PrimeraVez';
import PanelApostol from './pages/PanelApostol';
import Lideres from './pages/Lideres';
import RegistrarPersona from './pages/RegistrarPersona';
import Personas from './pages/Personas';
import Tareas from './pages/Tareas';
import FichaPersona from './pages/FichaPersona';
import Difundir from './pages/Difundir';
import WhatsAppAjustes from './pages/WhatsAppAjustes';
import AjustesPrivados from './pages/AjustesPrivados';

import { Cargando } from './components/UI';
import { LogoOasis } from './components/LogoOasis';
import { BannerInstalacionPWA, BotonInstalarPWA } from './components/BannerInstalacionPWA';
import {
  IconoAjustes,
  IconoAtras,
  IconoCapas,
  IconoEquipo,
  IconoMas,
  IconoSalir,
  IconoTareas,
  IconoUsuario,
} from './components/Iconos';

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
  const { usuario, esApostol, primeraVez, cargando, salir, config } = useAuth();
  const { personas, tareas } = useDatos();

  const [vista, setVista] = useState<Vista>(esApostol ? 'panel' : 'inicio');
  const [historialVistas, setHistorialVistas] = useState<Vista[]>([]);
  const [personaIdSeleccionada, setPersonaIdSeleccionada] = useState<string | undefined>(undefined);
  const [grupoDifusion, setGrupoDifusion] = useState<string | undefined>(undefined);
  const [mensajeAviso, setMensajeAviso] = useState<string | null>(null);

  // Asegurar que al iniciar sesión como Apóstol siempre abra en Panel, y como Líder en Registrar/Tareas
  useEffect(() => {
    if (usuario) {
      setVista(esApostol ? 'panel' : 'inicio');
      setHistorialVistas([]);
      try {
        localStorage.setItem('oasis_accion_completada', 'true');
      } catch {}
    }
  }, [usuario?.id, esApostol]);

  function ir(v: Vista, id?: string, grupo?: string) {
    if (v !== vista) {
      setHistorialVistas((prev) => [...prev, vista]);
    }
    setVista(v);
    if (id !== undefined) setPersonaIdSeleccionada(id);
    if (grupo !== undefined) setGrupoDifusion(grupo);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function retroceder() {
    if (historialVistas.length > 0) {
      const nuevoHistorial = [...historialVistas];
      const vistaAnterior = nuevoHistorial.pop();
      setHistorialVistas(nuevoHistorial);
      if (vistaAnterior) {
        setVista(vistaAnterior);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
    // Si no hay historial previo, volver a la pantalla principal correspondiente al rol
    setVista(esApostol ? 'panel' : 'inicio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const vistaPrincipal = esApostol ? 'panel' : 'inicio';
  const mostrarBotonAtras = vista !== vistaPrincipal || historialVistas.length > 0;

  function avisar(mensaje: string) {
    setMensajeAviso(mensaje);
    setTimeout(() => {
      setMensajeAviso((prev) => (prev === mensaje ? null : prev));
    }, 4500);
  }

  // Tareas pendientes y vencidas para insignias
  const misTareasPendientes = useMemo(() => {
    if (!usuario) return [];
    return tareas.filter((t) => t.liderId === usuario.id && t.estado === 'pendiente');
  }, [tareas, usuario]);

  const totalVencidas = useMemo(() => {
    return tareas.filter((t) => t.estado === 'pendiente' && estaVencida(t)).length;
  }, [tareas]);

  const itemsNavegacion = useMemo(() => {
    if (esApostol) {
      return [
        { id: 'panel' as Vista, nombre: 'Panel', Icono: IconoCapas },
        {
          id: 'tareas' as Vista,
          nombre: 'Seguimiento',
          Icono: IconoTareas,
          globo: totalVencidas > 0 ? totalVencidas : undefined,
        },
        { id: 'lideres' as Vista, nombre: 'Líderes', Icono: IconoUsuario },
        { id: 'personas' as Vista, nombre: 'Personas', Icono: IconoEquipo },
      ];
    }
    return [
      { id: 'inicio' as Vista, nombre: 'Registrar', Icono: IconoMas },
      {
        id: 'tareas' as Vista,
        nombre: 'Tareas',
        Icono: IconoTareas,
        globo: misTareasPendientes.length > 0 ? misTareasPendientes.length : undefined,
      },
      { id: 'personas' as Vista, nombre: 'Personas', Icono: IconoEquipo },
    ];
  }, [esApostol, totalVencidas, misTareasPendientes.length]);

  if (cargando) {
    return <Cargando texto="Iniciando Oasis Seguimiento…" />;
  }

  if (!usuario) {
    return <Login />;
  }

  return (
    <div className="app-envoltura">
      {/* Barra de cabecera */}
      <header className="cabecera">
        <div className="fila-entre max-ancho">
          <div className="fila" style={{ gap: 8, alignItems: 'center' }}>
            {mostrarBotonAtras && (
              <button
                type="button"
                className="btn fantasma chico"
                onClick={retroceder}
                title="Volver a la sección anterior"
                aria-label="Volver atrás"
                style={{
                  padding: '6px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                <IconoAtras size={18} />
                <span>Atrás</span>
              </button>
            )}

            <div
              onClick={() => ir(esApostol ? 'panel' : 'inicio')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <LogoOasis tamano={32} />
              <span className="logo-pastoral" style={{ margin: 0 }}>
                OASIS
              </span>
            </div>
            <span className="texto-chico" style={{ fontWeight: 600 }}>
              {config?.nombreIglesia || 'Centro de Alabanza Oasis'}
            </span>
          </div>

          <div className="fila" style={{ gap: 6, alignItems: 'center' }}>
            <BotonInstalarPWA />

            <span className="pildora lider" style={{ fontSize: '0.8rem' }}>
              {usuario.nombre.split(' ')[0]} ({esApostol ? 'Apóstol' : 'Líder'})
            </span>

            {esApostol && (
              <button
                type="button"
                className="btn fantasma chico"
                onClick={() => ir('privado')}
                title="Ajustes y contraseñas"
                aria-label="Ajustes y contraseñas"
              >
                <IconoAjustes size={18} />
              </button>
            )}

            <button
              type="button"
              className="btn fantasma chico"
              onClick={salir}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <IconoSalir size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Alerta flotante */}
      {mensajeAviso && (
        <div className="alerta-flotante" onClick={() => setMensajeAviso(null)}>
          {mensajeAviso}
        </div>
      )}

      {/* Contenido principal */}
      <main className="principal max-ancho">
        <BannerInstalacionPWA />
        {vista === 'panel' && <PanelApostol ir={ir} vencidas={totalVencidas} />}
        {vista === 'lideres' && <Lideres ir={ir} avisar={avisar} />}
        {vista === 'inicio' && <RegistrarPersona ir={ir} avisar={avisar} />}
        {vista === 'personas' && <Personas ir={ir} />}
        {vista === 'tareas' && <Tareas ir={ir} avisar={avisar} />}
        {vista === 'ficha' && personaIdSeleccionada && (
          <FichaPersona personaId={personaIdSeleccionada} ir={ir} avisar={avisar} />
        )}
        {vista === 'difundir' && (
          <Difundir ir={ir} avisar={avisar} grupoInicial={grupoDifusion} />
        )}
        {vista === 'whatsapp' && <WhatsAppAjustes ir={ir} avisar={avisar} />}
        {vista === 'privado' && <AjustesPrivados ir={ir} avisar={avisar} />}
      </main>

      {/* Navegación inferior */}
      <nav className="nav-inferior">
        <div className="nav-inferior-grid max-ancho">
          {itemsNavegacion.map((item) => {
            const activo = vista === item.id;
            const Icono = item.Icono;
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-boton ${activo ? 'activo' : ''}`}
                onClick={() => ir(item.id)}
              >
                <div style={{ position: 'relative', display: 'inline-flex' }}>
                  <Icono size={20} />
                  {item.globo !== undefined && item.globo > 0 && (
                    <span className="globo-contador">{item.globo}</span>
                  )}
                </div>
                <span>{item.nombre}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
