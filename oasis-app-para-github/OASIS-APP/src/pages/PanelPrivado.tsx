// =====================================================================
//  El panel privado del Apóstol.
//
//  Solo se llega aquí entrando con la contraseña del Apóstol, que es
//  distinta de la que usan los líderes. Aquí se agregan y se quitan
//  líderes, se cambian las dos contraseñas y se ve la bitácora.
// =====================================================================

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDatos } from '../context/DatosContext';
import { store } from '../lib/store';
import { CampoClave, Vacio, fechaHora } from '../components/UI';
import { IconoAtras, IconoDescargar, IconoWhatsApp } from '../components/Iconos';
import type { RegistroAuditoria } from '../lib/types';
import type { Vista } from '../App';

/**
 * La demostración publicada en la web corre dentro de un visor que no
 * permite descargas. Ahí el botón de exportar explica en vez de fallar
 * en silencio.
 */
const SIN_DESCARGAS = import.meta.env.VITE_SIN_SERVIDOR === '1';

export default function PanelPrivado({
  ir,
  avisar,
}: {
  ir: (v: Vista, id?: string) => void;
  avisar: (m: string) => void;
}) {
  const { configuracion } = useAuth();
  const { personas } = useDatos();

  const [claveLideres, setClaveLideres] = useState(configuracion.claveLideres);
  const [claveApostol, setClaveApostol] = useState(configuracion.claveApostol);

  const [auditoria, setAuditoria] = useState<RegistroAuditoria[]>([]);
  const [verBitacora, setVerBitacora] = useState(false);

  useEffect(() => {
    setClaveLideres(configuracion.claveLideres);
    setClaveApostol(configuracion.claveApostol);
  }, [configuracion.claveLideres, configuracion.claveApostol]);

  useEffect(() => {
    if (!verBitacora) return;
    return store.observarAuditoria(setAuditoria);
  }, [verBitacora]);

  // --------------------------------------------------- cambiar claves

  async function guardarClaves() {
    const a = claveLideres.trim();
    const b = claveApostol.trim();
    if (a.length < 4 || b.length < 4) {
      avisar('Cada contraseña necesita al menos 4 caracteres.');
      return;
    }
    if (a.toLowerCase() === b.toLowerCase()) {
      avisar('Las dos contraseñas tienen que ser distintas. Ese es el punto.');
      return;
    }
    await store.guardarConfiguracion({ claveLideres: a, claveApostol: b });
    avisar('Contraseñas actualizadas. Avísale la nueva a tus líderes.');
  }

  // ------------------------------------------------------------ exportar

  function exportarCSV() {
    if (SIN_DESCARGAS) {
      avisar('La descarga funciona cuando corres la app en tu computador o publicada.');
      return;
    }
    const encabezados = [
      'Persona',
      'Telefono',
      'Etapa',
      'Banderas',
      'Lider que la acompaña',
      'Origen',
      'Ingreso',
      'Ultimo contacto',
      'Autorizacion',
    ];
    const filas = personas.map((p) => [
      p.nombre,
      p.telefonoE164,
      p.etapa,
      p.banderas.join(' | '),
      p.liderAsignadoNombre ?? '',
      p.origen,
      p.fechaIngreso.slice(0, 10),
      p.ultimoContacto?.slice(0, 10) ?? '',
      p.consentimiento?.otorgado ? p.consentimiento.medio : 'SIN AUTORIZACION',
    ]);
    const csv = [encabezados, ...filas]
      .map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    try {
      const enlace = document.createElement('a');
      enlace.href = URL.createObjectURL(
        new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }),
      );
      enlace.download = `oasis-personas-${new Date().toISOString().slice(0, 10)}.csv`;
      enlace.click();
      URL.revokeObjectURL(enlace.href);
      avisar('Archivo descargado.');
    } catch {
      avisar('La descarga funciona cuando corres la app en tu computador o publicada.');
    }
  }

  // ---------------------------------------------------------------------

  return (
    <div style={{ paddingBottom: 24 }}>
      <button
        className="btn fantasma chico"
        onClick={() => ir('lideres')}
        style={{ marginBottom: 12 }}
      >
        <IconoAtras /> Volver a Líderes
      </button>

      <h1 style={{ marginBottom: 4 }}>Ajustes</h1>
      <p className="texto-medio" style={{ marginBottom: 18 }}>
        Esta pantalla solo la abre tu contraseña de Apóstol. Los líderes no la ven ni
        sabiendo la suya.
      </p>

      {/* --------------------------------------------- contraseñas */}
      <div className="seccion">
        <div className="rotulo">Contraseñas</div>
        <div className="tarjeta">
          <CampoClave
            etiqueta="Contraseña de los líderes"
            valor={claveLideres}
            onChange={setClaveLideres}
            ayuda="La que le das a todo el equipo. Cámbiala cuando alguien salga de la iglesia."
          />

          <CampoClave
            etiqueta="Tu contraseña de Apóstol"
            valor={claveApostol}
            onChange={setClaveApostol}
            ayuda="Esta es solo tuya. Es la única que abre este panel. No la compartas con nadie."
          />

          <button className="btn ancho" onClick={guardarClaves}>
            Guardar contraseñas
          </button>
        </div>
      </div>

      {/* ------------------------------------------ herramientas */}
      <div className="seccion">
        <div className="rotulo">Herramientas</div>
        <div className="pila">
          <button className="btn secundario" onClick={() => ir('whatsapp')}>
            <IconoWhatsApp /> Conexión de WhatsApp
          </button>
          <button className="btn secundario" onClick={exportarCSV}>
            <IconoDescargar /> Exportar todas las personas (CSV)
          </button>
          <button className="btn fantasma" onClick={() => setVerBitacora((v) => !v)}>
            {verBitacora ? 'Ocultar bitácora' : 'Ver quién cambió qué'}
          </button>
        </div>

        {verBitacora && (
          <div className="pila" style={{ marginTop: 10 }}>
            {auditoria.length === 0 ? (
              <Vacio>Todavía no hay movimientos registrados.</Vacio>
            ) : (
              auditoria
                .slice()
                .sort((a, b) => b.fecha.localeCompare(a.fecha))
                .slice(0, 60)
                .map((r) => (
                  <div key={r.id} className="tarjeta">
                    <div className="texto-medio">
                      <b>{r.nombre}</b> {r.accion} <b>{r.objetivo}</b>
                    </div>
                    {r.detalle && <div className="texto-chico">{r.detalle}</div>}
                    <div className="texto-chico">{fechaHora(r.fecha)}</div>
                  </div>
                ))
            )}
          </div>
        )}
      </div>

    </div>
  );
}
