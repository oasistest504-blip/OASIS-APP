// =====================================================================
//  La cara de la app: registrar a una persona nueva.
//
//  Es lo primero que ve un líder al entrar, porque es lo que va a hacer
//  el 90% de las veces: acaba de conocer a alguien el domingo y quiere
//  dejarlo anotado antes de que se le olvide.
// =====================================================================

import { useMemo, useState } from 'react';
import { Aviso } from '../components/UI';
import { IconoWhatsApp, IconoCheck } from '../components/Iconos';
import { useAuth } from '../context/AuthContext';
import { useDatos } from '../context/DatosContext';
import { store, MODO_DEMO } from '../lib/store';
import { api } from '../lib/api';
import { normalizarTelefono, mostrarTelefono } from '../lib/telefono';
import { elegirLiderConMenosCarga } from '../lib/reglas';
import { PLANTILLAS } from '../lib/plantillas';
import { ORIGENES, type Origen } from '../lib/types';
import type { Vista } from '../App';

const MEDIOS = [
  'Formulario de bienvenida firmado',
  'Autorización verbal ante el líder',
  'Escribió primero por WhatsApp',
  'Formulario en línea',
];

const BIENVENIDA = PLANTILLAS.oasis_bienvenida;

function primerNombre(completo: string): string {
  return completo.trim().split(/\s+/)[0] ?? '';
}

function textoBienvenida(solo: string): string {
  return BIENVENIDA.vistaPrevia.replace('{{1}}', solo || 'amigo');
}

export default function Inicio({
  ir,
  avisar,
}: {
  ir: (v: Vista, id?: string) => void;
  avisar: (m: string) => void;
}) {
  const { usuario, usuarios, esApostol } = useAuth();
  const { personas } = useDatos();

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [origen, setOrigen] = useState<Origen>('Servicio dominical');
  const [autorizo, setAutorizo] = useState(false);
  const [medio, setMedio] = useState(MEDIOS[0]);
  const [notas, setNotas] = useState('');
  const [enviarBienvenida, setEnviarBienvenida] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const e164 = normalizarTelefono(telefono);
  const yaExiste = e164 ? personas.find((p) => p.telefonoE164 === e164) : undefined;

  const registradasHoy = useMemo(() => {
    const hoy = new Date().toDateString();
    return personas
      .filter((p) => new Date(p.fechaIngreso).toDateString() === hoy)
      .sort((a, b) => b.fechaIngreso.localeCompare(a.fechaIngreso));
  }, [personas]);

  function limpiarFormulario() {
    setNombre('');
    setTelefono('');
    setNotas('');
    setAutorizo(false);
    setOrigen('Servicio dominical');
    setEnviarBienvenida(true);
    setError('');
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (nombre.trim().length < 3) {
      setError('Escribe el nombre completo de la persona.');
      return;
    }
    if (!e164) {
      setError('Ese número no se entiende. Escríbelo como 300 123 4567.');
      return;
    }
    if (yaExiste) {
      setError(`Ese número ya está registrado a nombre de ${yaExiste.nombre}.`);
      return;
    }
    if (!autorizo) {
      setError(
        'Sin la autorización de la persona no podemos escribirle. Es la ley, y también lo que protege el número de la iglesia.',
      );
      return;
    }
    if (!usuario) return;

    setGuardando(true);
    try {
      // Quien registra se queda con la persona. El Apóstol la reparte
      // entre los líderes con menos carga.
      const elegido =
        usuario.rol === 'lider'
          ? usuario
          : (elegirLiderConMenosCarga(usuarios, personas) ?? usuario);

      const ahora = new Date().toISOString();
      const personaId = await store.crearPersona({
        nombre: nombre.trim(),
        telefonoE164: e164,
        etapa: 'Nuevo',
        banderas: [],
        origen,
        liderAsignadoId: elegido.id,
        liderAsignadoNombre: elegido.nombre,
        consentimiento: {
          otorgado: true,
          fecha: ahora,
          medio,
          registradoPorUid: usuario.id,
        },
        notas: notas.trim(),
        fechaIngreso: ahora,
        ultimoContacto: null,
        ventanaAbiertaHasta: null,
        sinRespuestaConsecutivos: 0,
        pasosEnviados: [],
        creadoPorUid: usuario.id,
      });

      await store.registrarAuditoria({
        uid: usuario.id,
        nombre: usuario.nombre,
        accion: 'registró persona',
        objetivo: nombre.trim(),
        detalle: `La acompaña ${elegido.nombre}. Autorización: ${medio}.`,
        fecha: ahora,
      });

      const solo = primerNombre(nombre);

      if (!enviarBienvenida) {
        limpiarFormulario();
        avisar(`${solo} quedó registrada. No se le envió la bienvenida.`);
        setGuardando(false);
        return;
      }

      // El mensaje sale ya. Si falla, la persona queda registrada igual.
      try {
        await api.enviarPlantilla({
          personaId,
          telefono: e164,
          plantilla: BIENVENIDA.nombre,
          variables: [solo],
        });

        if (MODO_DEMO) {
          await store.agregarInteraccionLocal({
            personaId,
            direccion: 'saliente',
            canal: 'whatsapp',
            plantilla: BIENVENIDA.nombre,
            texto: textoBienvenida(solo),
            estado: 'enviado',
            fecha: new Date().toISOString(),
          });
        }

        await store.actualizarPersona(personaId, {
          etapa: 'Contactado',
          ultimoContacto: new Date().toISOString(),
          pasosEnviados: ['dia0'],
        });

        limpiarFormulario();
        avisar(`${solo} quedó registrada y ya le salió la bienvenida por WhatsApp.`);
      } catch (errorEnvio: any) {
        limpiarFormulario();
        avisar(
          `${solo} quedó registrada, pero la bienvenida no salió: ${errorEnvio?.message ?? 'error de conexión'}`,
        );
      }
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo guardar. Intenta otra vez.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={{ paddingBottom: 20 }}>
      <h1 style={{ marginBottom: 4 }}>Registrar persona nueva</h1>
      <p className="texto-medio" style={{ marginBottom: 18 }}>
        {esApostol
          ? 'Se le asigna al líder con menos personas a cargo.'
          : `Queda a tu cargo, ${primerNombre(usuario?.nombre ?? '')}.`}
      </p>

      {error && <Aviso tipo="peligro">{error}</Aviso>}

      <form onSubmit={guardar}>
        <label className="campo">
          <span className="etiqueta">Nombre completo</span>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="María Fernanda Ríos"
            autoComplete="off"
          />
        </label>

        <label className="campo">
          <span className="etiqueta">Celular</span>
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="300 123 4567"
            inputMode="tel"
          />
          <span className="ayuda">
            {e164
              ? yaExiste
                ? `Ya está registrado a nombre de ${yaExiste.nombre}.`
                : `Se guardará como ${mostrarTelefono(e164)}`
              : 'Escríbelo como quieras: la app lo acomoda al formato que WhatsApp acepta.'}
          </span>
        </label>

        <label className="campo">
          <span className="etiqueta">¿Cómo llegó?</span>
          <select value={origen} onChange={(e) => setOrigen(e.target.value as Origen)}>
            {ORIGENES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>

        <label className={`casilla ${autorizo ? 'marcada' : ''}`}>
          <input
            type="checkbox"
            checked={autorizo}
            onChange={(e) => setAutorizo(e.target.checked)}
          />
          <span className="texto">
            <b>Autorizó recibir mensajes de WhatsApp de la iglesia</b>
            Sin esto no se puede guardar.
          </span>
        </label>

        {autorizo && (
          <label className="campo">
            <span className="etiqueta">¿Cómo lo autorizó?</span>
            <select value={medio} onChange={(e) => setMedio(e.target.value)}>
              {MEDIOS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="campo">
          <span className="etiqueta">Notas (opcional)</span>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Vino con su hermana. Trabaja de noche, mejor llamarla en la tarde."
          />
        </label>

        <div className="rotulo">El mensaje que va a recibir ahora</div>
        <div className="tarjeta" style={{ marginBottom: 12 }}>
          <div className="chat">
            <div className="burbuja saliente" style={{ maxWidth: '100%' }}>
              {textoBienvenida(primerNombre(nombre))}
            </div>
          </div>
          <p className="texto-chico" style={{ marginTop: 9, marginBottom: 0 }}>
            Sale del número oficial de la iglesia, no del tuyo. A los 3 días la app le
            pregunta sola si desea oración, y a los 10 si desea una visita.
          </p>
        </div>

        <label className={`casilla ${enviarBienvenida ? 'marcada' : ''}`}>
          <input
            type="checkbox"
            checked={enviarBienvenida}
            onChange={(e) => setEnviarBienvenida(e.target.checked)}
          />
          <span className="texto">
            <b>Enviar la bienvenida apenas guarde</b>
            Desmárcalo si prefieres escribirle tú.
          </span>
        </label>

        <button className="btn ancho" type="submit" disabled={guardando}>
          {guardando ? (
            'Guardando…'
          ) : enviarBienvenida ? (
            <>
              <IconoWhatsApp /> Guardar y dar la bienvenida
            </>
          ) : (
            <>
              <IconoCheck /> Guardar
            </>
          )}
        </button>
      </form>

      {registradasHoy.length > 0 && (
        <div className="seccion" style={{ marginTop: 26 }}>
          <div className="rotulo">Registradas hoy · {registradasHoy.length}</div>
          <div className="pila">
            {registradasHoy.map((p) => (
              <button key={p.id} className="item" onClick={() => ir('ficha', p.id)}>
                <div className="crecer">
                  <div className="nombre">{p.nombre}</div>
                  <div className="sub">{mostrarTelefono(p.telefonoE164)}</div>
                </div>
                <span className="pildora etapa">{p.etapa}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
