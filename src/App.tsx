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
        <div className="cabecera-fila max-ancho">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flexShrink: 1 }}>
            {mostrarBotonAtras && (
              <button
                type="button"
                className="btn fantasma chico"
                onClick={retroceder}
                title="Volver a la sección anterior"
                aria-label="Volver atrás"
                style={{
                  padding: '5px 8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  flexShrink: 0,
                  borderRadius: '8px',
                  background: 'rgba(0, 0, 0, 0.04)',
                }}
              >
                <IconoAtras size={16} />
                <span className="texto-atras-btn">Atrás</span>
              </button>
            )}

            <div
              onClick={() => ir(esApostol ? 'panel' : 'inicio')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
            >
              <LogoOasis tamano={26} conTexto={false} />
              <span className="logo-pastoral" style={{ margin: 0, padding: '3px 7px', fontSize: '0.72rem' }}>
                OASIS
              </span>
            </div>
            <span className="texto-chico nombre-iglesia-cabecera" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
              {config?.nombreIglesia || 'Centro de Alabanza Oasis'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, marginLeft: 'auto' }}>
            <BotonInstalarPWA />

            <span
              className="pildora lider"
              style={{
                fontSize: '0.75rem',
                padding: '3px 7px',
                whiteSpace: 'nowrap',
                maxWidth: '90px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.2,
              }}
            >
              {esApostol ? 'Apóstol' : usuario.nombre.split(' ')[0]}
            </span>

            {esApostol && (
              <button
                type="button"
                className="btn fantasma chico"
                onClick={() => ir('privado')}
                title="Ajustes y contraseñas"
                aria-label="Ajustes y contraseñas"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  padding: 0,
                  borderRadius: '8px',
                  flexShrink: 0,
                  background: 'rgba(0, 0, 0, 0.03)',
                }}
              >
                <IconoAjustes size={17} />
              </button>
            )}

            <button
              type="button"
              onClick={salir}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 34,
                height: 34,
                padding: 0,
                borderRadius: '8px',
                color: '#b91c1c',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                flexShrink: 0,
                cursor: 'pointer',
              }}
            >
              <IconoSalir size={17} />
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
