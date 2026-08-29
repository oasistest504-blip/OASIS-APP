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

interface ValorAuth {
  usuario: Usuario | null;
  usuarios: Usuario[];
  lideres: Usuario[];
  configuracion: Configuracion;
  cargando: boolean;
  paso: PasoEntrada;
  /** true cuando no hay ningún usuario todavía: hay que instalar la app. */
  sinInstalar: boolean;
  esApostol: boolean;
  /** Devuelve el error, o cadena vacía si la clave era correcta. */
  entrarConClave: (clave: string) => string;
  elegirQuienSoy: (id: string) => void;
  volverAClave: () => void;
  salir: () => void;
}

const Contexto = createContext<ValorAuth | null>(null);

const LLAVE_SESION = 'oasis-sesion';

interface SesionGuardada {
  usuarioId: string;
  esApostol: boolean;
}

function leerSesion(): SesionGuardada | null {
  try {
    const crudo = localStorage.getItem(LLAVE_SESION);
    return crudo ? (JSON.parse(crudo) as SesionGuardada) : null;
  } catch {
    return null;
  }
}

function guardarSesion(sesion: SesionGuardada | null) {
  try {
    if (sesion) localStorage.setItem(LLAVE_SESION, JSON.stringify(sesion));
    else localStorage.removeItem(LLAVE_SESION);
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

  useEffect(
    () =>
      store.observarUsuarios((lista) => {
        setUsuarios(lista);
        setUsuariosLeidos(true);
      }),
    [],
  );
  useEffect(() => store.observarConfiguracion(setConfiguracion), []);

  // Recuperar la sesión anterior.
  useEffect(() => {
    const sesion = leerSesion();
    if (sesion?.usuarioId) {
      setUsuarioId(sesion.usuarioId);
      setPaso('dentro');
    }
    setCargando(false);
  }, []);

  const usuario = useMemo(
    () => usuarios.find((u) => u.id === usuarioId) ?? null,
    [usuarios, usuarioId],
  );

  // Si el Apóstol elimina a un líder mientras está adentro, se le cierra
  // la sesión sola en su próximo movimiento.
  useEffect(() => {
    if (paso === 'dentro' && usuarioId && usuarios.length > 0 && !usuario) {
      setUsuarioId(null);
      setPaso('clave');
      guardarSesion(null);
    }
  }, [paso, usuarioId, usuarios, usuario]);

  const lideres = useMemo(
    () => usuarios.filter((u) => u.rol === 'lider' && u.activo),
    [usuarios],
  );

  const valor: ValorAuth = {
    usuario,
    usuarios,
    lideres,
    configuracion,
    cargando,
    paso,
    sinInstalar: usuariosLeidos && usuarios.length === 0,
    esApostol: usuario?.rol === 'apostol',

    entrarConClave(clave: string): string {
      const c = normalizar(clave);
      if (!c) return 'Escribe la contraseña.';

      // La del Apóstol primero: si por accidente las dos fueran iguales,
      // manda la que da más permisos a quien de verdad la conoce.
      if (c === normalizar(configuracion.claveApostol)) {
        const apostol = usuarios.find((u) => u.rol === 'apostol');
        if (!apostol) return 'No hay ningún Apóstol registrado en la app.';
        setUsuarioId(apostol.id);
        setPaso('dentro');
        guardarSesion({ usuarioId: apostol.id, esApostol: true });
        return '';
      }

      if (c === normalizar(configuracion.claveLideres)) {
        setPaso('elegirNombre');
        return '';
      }

      return 'Esa contraseña no es. Pídesela al Apóstol.';
    },

    elegirQuienSoy(id: string) {
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
