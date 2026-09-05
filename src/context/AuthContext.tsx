// =====================================================================
//  Quién está usando la app.
//
//  Hay dos contraseñas, y la que escribas decide quién eres:
//
//    - La clave de líderes te deja entrar, y después escoges tu nombre
//      de la lista que armó el Apóstol.
//    - La clave del Apóstol te deja entrar como Apóstol, y solo ella
//      abre el panel privado donde se agregan y se quitan líderes.
//
//  Es a propósito así de simple: los líderes de una iglesia no deberían
//  necesitar crear cuentas para poder servir.
// =====================================================================

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { store } from '../lib/store';
import { CONFIGURACION_INICIAL } from '../lib/store';
import type { Configuracion, Usuario } from '../lib/types';

/** En qué punto de la entrada va la persona. */
export type PasoEntrada = 'clave' | 'elegirNombre' | 'dentro';

/** 1 hora de inactividad antes de cerrar la sesión automáticamente (en milisegundos) */
export const TIEMPO_INACTIVIDAD_MS = 60 * 60 * 1000;

interface ValorAuth {
  usuario: Usuario | null;
  usuarios: Usuario[];
  lideres: Usuario[];
  configuracion: Configuracion;
  config?: Configuracion;
  cargando: boolean;
  paso: PasoEntrada;
  /** true cuando no hay ningún usuario todavía: hay que instalar la app. */
  sinInstalar: boolean;
  primeraVez?: boolean;
  esApostol: boolean;
  sesionExpirada: boolean;
  limpiarSesionExpirada: () => void;
  /** Inicializa la app por primera vez creando la configuración y los usuarios iniciales */
  inicializarApp: (
    claveApostol: string,
    claveLideres: string,
    rolDestino: 'apostol' | 'lider',
  ) => Promise<void>;
  /** Devuelve el error, o cadena vacía si la clave era correcta. */
  entrarConClave: (clave: string, rol?: 'apostol' | 'lider') => string;
  entrarComoApostol: (clave: string) => string;
  entrarComoLider: (clave: string) => string;
  elegirQuienSoy: (id: string) => void;
  volverAClave: () => void;
  salir: () => void;
}

const Contexto = createContext<ValorAuth | null>(null);

const LLAVE_SESION = 'oasis-sesion';

interface SesionGuardada {
  usuarioId: string;
  esApostol: boolean;
  ultimaActividad: number;
}

function leerSesion(): { sesion: SesionGuardada | null; expirada: boolean } {
  try {
    const crudo = localStorage.getItem(LLAVE_SESION);
    if (!crudo) return { sesion: null, expirada: false };
    const sesion = JSON.parse(crudo) as Partial<SesionGuardada>;
    if (!sesion || !sesion.usuarioId) return { sesion: null, expirada: false };

    const ahora = Date.now();
    const ultima = typeof sesion.ultimaActividad === 'number' ? sesion.ultimaActividad : 0;

    // Si la sesión no tiene fecha o ya pasaron más de 60 minutos de inactividad:
    if (!ultima || ahora - ultima > TIEMPO_INACTIVIDAD_MS) {
      localStorage.removeItem(LLAVE_SESION);
      return { sesion: null, expirada: true };
    }

    return {
      sesion: {
        usuarioId: sesion.usuarioId,
        esApostol: !!sesion.esApostol,
        ultimaActividad: ultima,
      },
      expirada: false,
    };
  } catch {
    return { sesion: null, expirada: false };
  }
}

function guardarSesion(sesion: { usuarioId: string; esApostol: boolean; ultimaActividad?: number } | null) {
  try {
    if (sesion) {
      const datos: SesionGuardada = {
        usuarioId: sesion.usuarioId,
        esApostol: sesion.esApostol,
        ultimaActividad: sesion.ultimaActividad ?? Date.now(),
      };
      localStorage.setItem(LLAVE_SESION, JSON.stringify(datos));
    } else {
      localStorage.removeItem(LLAVE_SESION);
    }
  } catch {
    /* sin almacenamiento: la sesión dura mientras la pestaña esté abierta */
  }
}

function normalizar(clave: string): string {
  return clave.trim().toLowerCase();
}

export function ProveedorAuth({ children }: { children: ReactNode }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [configuracion, setConfiguracion] = useState<Configuracion>({
    ...CONFIGURACION_INICIAL,
  });
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [paso, setPaso] = useState<PasoEntrada>('clave');
  const [cargando, setCargando] = useState(true);
  const [usuariosLeidos, setUsuariosLeidos] = useState(false);
  const [sesionExpirada, setSesionExpirada] = useState(false);

  useEffect(() => {
    return store.observarUsuarios((lista) => {
      setUsuarios(lista);
      setUsuariosLeidos(true);
    });
  }, []);
  useEffect(() => store.observarConfiguracion(setConfiguracion), []);

  // Recuperar la sesión anterior (verificando que no haya expirado por inactividad de 1 hora).
  useEffect(() => {
    const { sesion, expirada } = leerSesion();
    if (sesion?.usuarioId) {
      setUsuarioId(sesion.usuarioId);
      setPaso('dentro');
      setSesionExpirada(false);
    } else if (expirada) {
      setSesionExpirada(true);
    }
    setCargando(false);
  }, []);

  // Monitor de inactividad de 1 hora mientras el usuario está dentro de la app
  useEffect(() => {
    if (paso !== 'dentro' || !usuarioId) return;

    let ultimaActualizacionLocal = Date.now();

    function registrarActividad() {
      const ahora = Date.now();
      // Throttle a 15 segundos para no saturar llamadas a localStorage
      if (ahora - ultimaActualizacionLocal > 15000) {
        ultimaActualizacionLocal = ahora;
        try {
          const crudo = localStorage.getItem(LLAVE_SESION);
          if (crudo) {
            const ses = JSON.parse(crudo) as SesionGuardada;
            if (ses && ses.usuarioId) {
              ses.ultimaActividad = ahora;
              localStorage.setItem(LLAVE_SESION, JSON.stringify(ses));
            }
          }
        } catch {}
      }
    }

    function verificarExpiracion() {
      const { sesion, expirada } = leerSesion();
      if (expirada || !sesion) {
        setUsuarioId(null);
        setPaso('clave');
        guardarSesion(null);
        setSesionExpirada(true);
      }
    }

    const eventos = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    eventos.forEach((ev) => window.addEventListener(ev, registrarActividad, { passive: true }));

    // Chequeo periódico cada 30 segundos mientras la app esté abierta
    const intervalo = setInterval(verificarExpiracion, 30000);

    // Chequeo inmediato cuando la persona regresa al navegador o cambia a esta pestaña
    function alEnfocar() {
      if (document.visibilityState === 'visible') {
        verificarExpiracion();
      }
    }
    document.addEventListener('visibilitychange', alEnfocar);
    window.addEventListener('focus', alEnfocar);

    return () => {
      eventos.forEach((ev) => window.removeEventListener(ev, registrarActividad));
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', alEnfocar);
      window.removeEventListener('focus', alEnfocar);
    };
  }, [paso, usuarioId]);

  const usuario = useMemo(() => {
    if (!usuarioId) return null;
    const encontrado = usuarios.find((u) => u.id === usuarioId);
    if (encontrado) return encontrado;
    // Si la sesión guardada es de Apóstol, vincular automáticamente con el apóstol existente
    const { sesion } = leerSesion();
    if (sesion?.esApostol) {
      const apostol = usuarios.find((u) => u.rol === 'apostol' && u.activo) || usuarios.find((u) => u.rol === 'apostol');
      if (apostol) return apostol;
    }
    return null;
  }, [usuarios, usuarioId]);

  // Si el Apóstol elimina a un líder mientras está adentro, se le cierra
  // la sesión sola en su próximo movimiento (solo si los usuarios ya terminaron de cargar).
  useEffect(() => {
    if (paso === 'dentro' && usuarioId && usuariosLeidos && usuarios.length > 0 && !usuario) {
      setUsuarioId(null);
      setPaso('clave');
      guardarSesion(null);
    }
  }, [paso, usuarioId, usuariosLeidos, usuarios.length, usuario]);

  const lideres = useMemo(
    () => usuarios.filter((u) => u.rol === 'lider' && u.activo),
    [usuarios],
  );

  const valor: ValorAuth = {
    usuario,
    usuarios,
    lideres,
    configuracion,
    config: configuracion,
    cargando: cargando || (!!usuarioId && !usuariosLeidos),
    paso,
    sinInstalar: usuariosLeidos && usuarios.length === 0,
    primeraVez: usuariosLeidos && usuarios.length === 0,
    esApostol: usuario?.rol === 'apostol',
    sesionExpirada,
    limpiarSesionExpirada: () => setSesionExpirada(false),

    async inicializarApp(
      claveApostol: string,
      claveLideres: string,
      rolDestino: 'apostol' | 'lider',
    ) {
      setSesionExpirada(false);
      const apostolClave = claveApostol.trim();
      const lideresClave = claveLideres.trim();

      await store.guardarConfiguracion({
        claveApostol: apostolClave,
        claveLideres: lideresClave,
        nombreIglesia: 'Centro de Alabanza Oasis',
      });

      setConfiguracion((prev) => ({
        ...prev,
        claveApostol: apostolClave,
        claveLideres: lideresClave,
      }));

      const apostolId = await store.crearUsuario({
        nombre: 'Apóstol',
        rol: 'apostol',
        activo: true,
        capacidadSemanal: 10,
        creadoEn: new Date().toISOString(),
      });

      if (rolDestino === 'apostol') {
        setUsuarioId(apostolId);
        setPaso('dentro');
        guardarSesion({ usuarioId: apostolId, esApostol: true });
      } else {
        const liderId = await store.crearUsuario({
          nombre: 'Líder Pastoral',
          rol: 'lider',
          activo: true,
          capacidadSemanal: 5,
          creadoEn: new Date().toISOString(),
        });
        setUsuarioId(liderId);
        setPaso('dentro');
        guardarSesion({ usuarioId: liderId, esApostol: false });
      }
    },

    entrarComoApostol(clave: string): string {
      setSesionExpirada(false);
      const c = normalizar(clave);
      if (!c) return 'Escribe la contraseña de Apóstol.';

      if (c === normalizar(configuracion.claveApostol)) {
        const apostol =
          usuarios.find((u) => u.rol === 'apostol' && u.activo) ||
          usuarios.find((u) => u.rol === 'apostol');
        if (apostol) {
          setUsuarioId(apostol.id);
          setPaso('dentro');
          guardarSesion({ usuarioId: apostol.id, esApostol: true });
          return '';
        }
        store
          .crearUsuario({
            nombre: 'Apóstol',
            rol: 'apostol',
            activo: true,
            capacidadSemanal: 10,
            creadoEn: new Date().toISOString(),
          })
          .then((id) => {
            setUsuarioId(id);
            setPaso('dentro');
            guardarSesion({ usuarioId: id, esApostol: true });
          });
        return '';
      }

      // Si por error escribió la clave de líderes en la casilla del Apóstol:
      if (c === normalizar(configuracion.claveLideres)) {
        setPaso('elegirNombre');
        return '';
      }

      return 'Contraseña de Apóstol incorrecta.';
    },

    entrarComoLider(clave: string): string {
      setSesionExpirada(false);
      const c = normalizar(clave);
      if (!c) return 'Escribe la contraseña de Líderes.';

      // Si por error escribió la clave del Apóstol en la casilla de líderes:
      if (c === normalizar(configuracion.claveApostol)) {
        return valor.entrarComoApostol(clave);
      }

      if (c === normalizar(configuracion.claveLideres)) {
        setPaso('elegirNombre');
        return '';
      }

      return 'Contraseña de Líderes incorrecta.';
    },

    entrarConClave(clave: string, rol?: 'apostol' | 'lider'): string {
      if (rol === 'apostol') return valor.entrarComoApostol(clave);
      if (rol === 'lider') return valor.entrarComoLider(clave);

      const c = normalizar(clave);
      if (!c) return 'Escribe la contraseña.';

      if (c === normalizar(configuracion.claveApostol)) {
        return valor.entrarComoApostol(clave);
      }

      if (c === normalizar(configuracion.claveLideres)) {
        return valor.entrarComoLider(clave);
      }

      return 'Esa contraseña no es. Pídesela al Apóstol.';
    },

    elegirQuienSoy(id: string) {
      setSesionExpirada(false);
      setUsuarioId(id);
      setPaso('dentro');
      guardarSesion({ usuarioId: id, esApostol: false });
    },

    volverAClave() {
      setPaso('clave');
      setUsuarioId(null);
      guardarSesion(null);
    },

    salir() {
      setUsuarioId(null);
      setPaso('clave');
      guardarSesion(null);
    },
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth(): ValorAuth {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useAuth debe usarse dentro de ProveedorAuth');
  return valor;
}
