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
import { doc, setDoc, deleteField } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { store } from '../lib/store';
import { CONFIGURACION_INICIAL } from '../lib/store';
import type { Configuracion, Usuario } from '../lib/types';
import { cifrarClave, verificarClave } from '../lib/claves';
import { LogoOasis } from '../components/LogoOasis';

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
  /** true solo cuando la lectura terminó exitosamente y de verdad no hay ningún usuario */
  sinInstalar: boolean;
  primeraVez?: boolean;
  esApostol: boolean;
  sesionExpirada: boolean;
  limpiarSesionExpirada: () => void;
  errorUsuarios?: boolean;
  errorConexion?: boolean;
  /** Inicializa la app por primera vez creando la configuración y los usuarios iniciales */
  inicializarApp: (
    claveApostol: string,
    claveLideres: string,
    rolDestino: 'apostol' | 'lider',
  ) => Promise<void>;
  /** Devuelve el error, o cadena vacía si la clave era correcta. */
  entrarConClave: (clave: string, rol?: 'apostol' | 'lider') => Promise<string>;
  entrarComoApostol: (clave: string) => Promise<string>;
  entrarComoLider: (clave: string) => Promise<string>;
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
  const [errorUsuarios, setErrorUsuarios] = useState(false);

  // Límite de espera de 10 segundos: si hay una sesión guardada pero los usuarios
  // no han llegado desde la base de datos, dejamos de esperar y avisamos al usuario.
  useEffect(() => {
    if (!usuarioId || usuariosLeidos) {
      return;
    }

    const temporizador = setTimeout(() => {
      if (!usuariosLeidos) {
        setErrorUsuarios(true);
      }
    }, 10000);

    return () => clearTimeout(temporizador);
  }, [usuarioId, usuariosLeidos]);

  useEffect(() => {
    return store.observarUsuarios((lista, error) => {
      if (error) {
        setErrorUsuarios(true);
        return;
      }
      setErrorUsuarios(false);
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

  async function migrarClaveApostol(clave: string): Promise<string> {
    const nuevoHash = await cifrarClave(clave);
    if (db) {
      try {
        await setDoc(
          doc(db, 'configuracion', 'acceso'),
          {
            hashApostol: nuevoHash,
            claveApostol: deleteField(),
          },
          { merge: true },
        );
      } catch (err) {
        console.warn('Error al migrar hashApostol en Firestore:', err);
      }
    }
    await store.guardarConfiguracion({
      hashApostol: nuevoHash,
    });
    try {
      const crudo = localStorage.getItem('oasis-datos-demo');
      if (crudo) {
        const d = JSON.parse(crudo);
        if (d?.configuracion) {
          d.configuracion.hashApostol = nuevoHash;
          delete d.configuracion.claveApostol;
          localStorage.setItem('oasis-datos-demo', JSON.stringify(d));
        }
      }
    } catch {
      /* sin almacenamiento */
    }
    setConfiguracion((prev) => {
      const copia = { ...prev, hashApostol: nuevoHash };
      delete (copia as any).claveApostol;
      return copia;
    });
    return nuevoHash;
  }

  async function migrarClaveLideres(clave: string): Promise<string> {
    const nuevoHash = await cifrarClave(clave);
    if (db) {
      try {
        await setDoc(
          doc(db, 'configuracion', 'acceso'),
          {
            hashLideres: nuevoHash,
            claveLideres: deleteField(),
          },
          { merge: true },
        );
      } catch (err) {
        console.warn('Error al migrar hashLideres en Firestore:', err);
      }
    }
    await store.guardarConfiguracion({
      hashLideres: nuevoHash,
    });
    try {
      const crudo = localStorage.getItem('oasis-datos-demo');
      if (crudo) {
        const d = JSON.parse(crudo);
        if (d?.configuracion) {
          d.configuracion.hashLideres = nuevoHash;
          delete d.configuracion.claveLideres;
          localStorage.setItem('oasis-datos-demo', JSON.stringify(d));
        }
      }
    } catch {
      /* sin almacenamiento */
    }
    setConfiguracion((prev) => {
      const copia = { ...prev, hashLideres: nuevoHash };
      delete (copia as any).claveLideres;
      return copia;
    });
    return nuevoHash;
  }

  const valor: ValorAuth = {
    usuario,
    usuarios,
    lideres,
    configuracion,
    config: configuracion,
    cargando: cargando || (!!usuarioId && !usuariosLeidos && !errorUsuarios),
    paso,
    sinInstalar: !errorUsuarios && usuariosLeidos && usuarios.length === 0,
    primeraVez: !errorUsuarios && usuariosLeidos && usuarios.length === 0,
    esApostol: usuario?.rol === 'apostol',
    sesionExpirada,
    limpiarSesionExpirada: () => setSesionExpirada(false),
    errorUsuarios,
    errorConexion: errorUsuarios,

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

    async entrarComoApostol(clave: string): Promise<string> {
      setSesionExpirada(false);
      const c = normalizar(clave);
      if (!c) return 'Escribe la contraseña de Apóstol.';

      let acertoApostol = false;
      if (configuracion.hashApostol) {
        acertoApostol = await verificarClave(clave, configuracion.hashApostol);
      } else if (configuracion.claveApostol && c === normalizar(configuracion.claveApostol)) {
        acertoApostol = true;
        await migrarClaveApostol(clave);
      }

      if (acertoApostol) {
        const apostol =
          usuarios.find((u) => u.rol === 'apostol' && u.activo) ||
          usuarios.find((u) => u.rol === 'apostol');
        if (apostol) {
          setUsuarioId(apostol.id);
          setPaso('dentro');
          guardarSesion({ usuarioId: apostol.id, esApostol: true });
          return '';
        }
        const id = await store.crearUsuario({
          nombre: 'Apóstol',
          rol: 'apostol',
          activo: true,
          capacidadSemanal: 10,
          creadoEn: new Date().toISOString(),
        });
        setUsuarioId(id);
        setPaso('dentro');
        guardarSesion({ usuarioId: id, esApostol: true });
        return '';
      }

      // Si por error escribió la clave de líderes en la casilla del Apóstol:
      let acertoLider = false;
      if (configuracion.hashLideres) {
        acertoLider = await verificarClave(clave, configuracion.hashLideres);
      } else if (configuracion.claveLideres && c === normalizar(configuracion.claveLideres)) {
        acertoLider = true;
        await migrarClaveLideres(clave);
      }

      if (acertoLider) {
        setPaso('elegirNombre');
        return '';
      }

      return 'Contraseña de Apóstol incorrecta.';
    },

    async entrarComoLider(clave: string): Promise<string> {
      setSesionExpirada(false);
      const c = normalizar(clave);
      if (!c) return 'Escribe la contraseña de Líderes.';

      // Si por error escribió la clave del Apóstol en la casilla de líderes:
      let acertoApostol = false;
      if (configuracion.hashApostol) {
        acertoApostol = await verificarClave(clave, configuracion.hashApostol);
      } else if (configuracion.claveApostol && c === normalizar(configuracion.claveApostol)) {
        acertoApostol = true;
      }
      if (acertoApostol) {
        return await valor.entrarComoApostol(clave);
      }

      let acertoLider = false;
      if (configuracion.hashLideres) {
        acertoLider = await verificarClave(clave, configuracion.hashLideres);
      } else if (configuracion.claveLideres && c === normalizar(configuracion.claveLideres)) {
        acertoLider = true;
        await migrarClaveLideres(clave);
      }

      if (acertoLider) {
        setPaso('elegirNombre');
        return '';
      }

      return 'Contraseña de Líderes incorrecta.';
    },

    async entrarConClave(clave: string, rol?: 'apostol' | 'lider'): Promise<string> {
      if (rol === 'apostol') return await valor.entrarComoApostol(clave);
      if (rol === 'lider') return await valor.entrarComoLider(clave);

      const c = normalizar(clave);
      if (!c) return 'Escribe la contraseña.';

      let acertoApostol = false;
      if (configuracion.hashApostol) {
        acertoApostol = await verificarClave(clave, configuracion.hashApostol);
      } else if (configuracion.claveApostol && c === normalizar(configuracion.claveApostol)) {
        acertoApostol = true;
      }
      if (acertoApostol) {
        return await valor.entrarComoApostol(clave);
      }

      let acertoLider = false;
      if (configuracion.hashLideres) {
        acertoLider = await verificarClave(clave, configuracion.hashLideres);
      } else if (configuracion.claveLideres && c === normalizar(configuracion.claveLideres)) {
        acertoLider = true;
      }
      if (acertoLider) {
        return await valor.entrarComoLider(clave);
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

  // Si ocurrió un error al obtener usuarios de la base de datos
  if (errorUsuarios) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
          background: 'var(--fondo, #f8fafc)',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: '100%',
            background: 'var(--blanco, #ffffff)',
            borderRadius: 16,
            padding: '28px 24px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid var(--borde, #e2e8f0)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 18,
          }}
        >
          <LogoOasis tamano={56} conTexto={true} />

          <div
            className="aviso peligro"
            style={{
              width: '100%',
              textAlign: 'left',
              margin: 0,
            }}
          >
            <div className="aviso-titulo" style={{ fontWeight: 700, marginBottom: 4 }}>
              Sin conexión con la base de datos
            </div>
            <div className="aviso-cuerpo" style={{ fontSize: '0.9rem', lineHeight: 1.45 }}>
              No se pudo conectar con la base de datos. Por favor revisa tu conexión a internet e intenta nuevamente.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
            <button
              type="button"
              className="btn primario"
              onClick={() => window.location.reload()}
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 20px',
                fontSize: '0.95rem',
                fontWeight: 600,
              }}
            >
              Reintentar
            </button>

            {usuarioId && (
              <button
                type="button"
                className="btn secundario chico"
                onClick={() => {
                  guardarSesion(null);
                  setUsuarioId(null);
                  setPaso('clave');
                  setErrorUsuarios(false);
                }}
                style={{
                  width: '100%',
                  padding: '8px 14px',
                }}
              >
                Volver a ingresar con contraseña
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth(): ValorAuth {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useAuth debe usarse dentro de ProveedorAuth');
  return valor;
}
