import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDatos } from '../context/DatosContext';
import { store, MODO_DEMO } from '../lib/store';
import { api } from '../lib/api';
import { normalizarTelefono, mostrarTelefono } from '../lib/telefono';
import { elegirLiderConMenosCarga } from '../lib/reglas';
import { PLANTILLAS } from '../lib/plantillas';
import { ORIGENES, MEDIOS_CONSENTIMIENTO, type Persona } from '../lib/types';
import { Aviso, ChipLider, Inicial } from '../components/UI';
import { IconoCheck, IconoMas, IconoWhatsApp, IconoAtras } from '../components/Iconos';
import type { Vista } from '../App';

const PLANTILLA_BIENVENIDA = PLANTILLAS.oasis_bienvenida;

function primerNombre(nombreCompleto: string): string {
  return nombreCompleto.trim().split(/\s+/)[0] ?? '';
}

function mensajeBienvenidaVista(nombre: string): string {
  return PLANTILLA_BIENVENIDA.vistaPrevia.replace('{{1}}', nombre || 'amigo');
}

export default function RegistrarPersona({
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
  const [origen, setOrigen] = useState<string>(ORIGENES[0]);
  const [autorizacion, setAutorizacion] = useState(false);
  const [medioConsentimiento, setMedioConsentimiento] = useState<string>(MEDIOS_CONSENTIMIENTO[0]);
  const [notas, setNotas] = useState('');
  const [enviarBienvenida, setEnviarBienvenida] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const telefonoLimpio = normalizarTelefono(telefono);
  const personaExistente = telefonoLimpio
    ? personas.find((p) => p.telefonoE164 === telefonoLimpio)
    : undefined;

  const registradasHoy = useMemo(() => {
    const hoyStr = new Date().toDateString();
    return personas
      .filter((p) => new Date(p.fechaIngreso).toDateString() === hoyStr)
      .sort((a, b) => b.fechaIngreso.localeCompare(a.fechaIngreso));
  }, [personas]);

  function limpiarFormulario() {
    setNombre('');
    setTelefono('');
    setNotas('');
    setAutorizacion(false);
    setOrigen(ORIGENES[0]);
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
    if (!telefonoLimpio) {
      setError('Ese número no se entiende. Escríbelo como 300 123 4567.');
      return;
    }
    if (personaExistente) {
      setError(`Ese número ya está registrado a nombre de ${personaExistente.nombre}.`);
      return;
    }
    if (!autorizacion) {
      setError(
        'Sin la autorización de la persona no podemos escribirle. Es la ley, y también lo que protege el número de la iglesia.',
      );
      return;
    }
    if (!usuario) return;

    setGuardando(true);

    try {
      const liderAsignado =
        usuario.rol === 'lider'
          ? usuario
          : elegirLiderConMenosCarga(usuarios, personas) ?? usuario;

      const ahora = new Date().toISOString();

      const nuevaPersonaId = await store.crearPersona({
        nombre: nombre.trim(),
        telefonoE164: telefonoLimpio,
        etapa: 'Nuevo',
        banderas: [],
        origen,
        liderAsignadoId: liderAsignado.id,
        liderAsignadoNombre: liderAsignado.nombre,
        consentimiento: {
          otorgado: true,
          fecha: ahora,
          medio: medioConsentimiento,
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
        detalle: `La acompaña ${liderAsignado.nombre}. Autorización: ${medioConsentimiento}.`,
        fecha: ahora,
      });

      const pNom = primerNombre(nombre);

      if (!enviarBienvenida) {
        limpiarFormulario();
        avisar(`${pNom} quedó registrada. No se le envió la bienvenida.`);
        setGuardando(false);
        return;
      }

      try {
        await api.enviarPlantilla({
          personaId: nuevaPersonaId,
          telefono: telefonoLimpio,
          plantilla: PLANTILLA_BIENVENIDA.nombre,
          variables: [pNom],
        });

        if (MODO_DEMO) {
          await store.agregarInteraccionLocal({
            personaId: nuevaPersonaId,
            direccion: 'saliente',
            canal: 'whatsapp',
            plantilla: PLANTILLA_BIENVENIDA.nombre,
            texto: mensajeBienvenidaVista(pNom),
            estado: 'enviado',
            fecha: new Date().toISOString(),
          });
        }

        await store.actualizarPersona(nuevaPersonaId, {
          etapa: 'Contactado',
          ultimoContacto: new Date().toISOString(),
          pasosEnviados: ['dia0'],
        });

        limpiarFormulario();
        avisar(`${pNom} quedó registrada y ya le salió la bienvenida por WhatsApp.`);
      } catch (err: any) {
        limpiarFormulario();
        avisar(
          `${pNom} quedó registrada, pero hubo un problema enviando el WhatsApp: ${err?.message ?? 'error desconocido'}.`,
        );
      }
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo guardar la persona.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      {esApostol && (
        <div className="fila-entre" style={{ marginBottom: 10 }}>
          <button
            type="button"
            className="btn fantasma chico"
            onClick={() => ir('panel')}
          >
            <IconoAtras /> Volver al panel
          </button>
        </div>
      )}

      <h1 style={{ marginBottom: 4 }}>Registrar persona</h1>
      <p className="texto-medio" style={{ marginBottom: 18 }}>
        Para personas que visitan la iglesia por primera vez o dejaron sus datos.
      </p>

      {error && <Aviso tipo="peligro">{error}</Aviso>}

      <form onSubmit={guardar} className="tarjeta" style={{ marginBottom: 24 }}>
        <div className="campo">
          <label className="etiqueta">Nombre completo</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: María Fernanda Ríos"
            required
            autoFocus
          />
        </div>

        <div className="campo">
          <label className="etiqueta">Número de celular (WhatsApp)</label>
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="300 123 4567"
            inputMode="tel"
            required
          />
          {telefonoLimpio && (
            <small className="texto-chico" style={{ marginTop: 4, display: 'block', color: 'var(--azul-profundo)' }}>
              Se guardará como: {mostrarTelefono(telefonoLimpio)}
            </small>
          )}
        </div>

        <div className="campo">
          <label className="etiqueta">¿Cómo llegó o de dónde viene?</label>
          <select value={origen} onChange={(e) => setOrigen(e.target.value)}>
            {ORIGENES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label className="etiqueta">Medio de autorización (Habeas Data)</label>
          <select
            value={medioConsentimiento}
            onChange={(e) => setMedioConsentimiento(e.target.value)}
          >
            {MEDIOS_CONSENTIMIENTO.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="campo" style={{ marginTop: 8 }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            <input
              type="checkbox"
              checked={autorizacion}
              onChange={(e) => setAutorizacion(e.target.checked)}
              style={{ marginTop: 3 }}
            />
            <span>
              <b>Autorizó el contacto:</b> La persona autorizó explícitamente ser contactada por la
              iglesia mediante el medio seleccionado.
            </span>
          </label>
        </div>

        <div className="campo" style={{ marginTop: 8 }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            <input
              type="checkbox"
              checked={enviarBienvenida}
              onChange={(e) => setEnviarBienvenida(e.target.checked)}
              style={{ marginTop: 3 }}
            />
            <span>
              <b>Enviar WhatsApp de bienvenida automáticamente</b> ahora mismo.
            </span>
          </label>
        </div>

        {enviarBienvenida && (
          <div
            style={{
              background: 'var(--tarjeta-2, #f8fafc)',
              padding: 12,
              borderRadius: 8,
              fontSize: '0.85rem',
              color: 'var(--tinta-2)',
              marginBottom: 16,
              border: '1px solid var(--borde)',
            }}
          >
            <b style={{ display: 'block', marginBottom: 4 }}>Vista previa del mensaje:</b>
            &ldquo;{mensajeBienvenidaVista(primerNombre(nombre))}&rdquo;
          </div>
        )}

        <div className="campo">
          <label className="etiqueta">Notas iniciales o petición de oración (opcional)</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej: Vive en el barrio Prados, vino con su hermana. Pidió oración por la salud de su mamá."
            rows={3}
          />
        </div>

        <button type="submit" className="btn ancho" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Registrar persona'}
        </button>
      </form>

      {/* Registradas hoy */}
      <div className="seccion">
        <div className="rotulo">Registradas hoy ({registradasHoy.length})</div>
        {registradasHoy.length === 0 ? (
          <p className="texto-chico">Todavía no has registrado personas el día de hoy.</p>
        ) : (
          <div className="pila">
            {registradasHoy.map((p) => (
              <button
                key={p.id}
                type="button"
                className="item"
                onClick={() => ir('ficha', p.id)}
              >
                <Inicial nombre={p.nombre} tamano={34} />
                <div className="crecer">
                  <div className="nombre">{p.nombre}</div>
                  <div className="texto-chico">{mostrarTelefono(p.telefonoE164)}</div>
                </div>
                <ChipLider nombre={p.liderAsignadoNombre} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
