import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDatos } from '../context/DatosContext';
import { ETAPAS, BANDERAS, type Etapa, type Bandera } from '../lib/types';
import { mostrarTelefono } from '../lib/telefono';
import { ChipLider, Inicial, Vacio, Aviso } from '../components/UI';
import { IconoBuscar, IconoMas, IconoExcel, IconoAtras } from '../components/Iconos';
import { descargarPersonasExcel } from '../lib/exportar';
import type { Vista } from '../App';

export default function Personas({
  ir,
}: {
  ir: (v: Vista, id?: string) => void;
}) {
  const { esApostol, usuario, usuarios } = useAuth();
  const { personas } = useDatos();
  const [aviso, setAviso] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const [etapaFiltro, setEtapaFiltro] = useState<string>('todas');
  const [banderaFiltro, setBanderaFiltro] = useState<string>('todas');
  const [liderFiltro, setLiderFiltro] = useState<string>('todos');

  function exportarLista() {
    const dataAExportar = listaFiltrada.length > 0 ? listaFiltrada : personas;
    if (dataAExportar.length === 0) {
      setAviso('No hay personas para exportar.');
      return;
    }
    descargarPersonasExcel(dataAExportar);
    setAviso(`¡Libro de Excel (.xlsx) generado con ${dataAExportar.length} personas en columnas organizadas!`);
    setTimeout(() => setAviso(null), 5000);
  }

  const listaFiltrada = useMemo(() => {
    return personas.filter((p) => {
      // Líder solo ve las suyas si no es apóstol
      if (!esApostol && usuario && p.liderAsignadoId !== usuario.id) {
        return false;
      }

      // Filtro por líder seleccionado (si es Apóstol)
      if (esApostol && liderFiltro !== 'todos' && p.liderAsignadoId !== liderFiltro) {
        return false;
      }

      // Filtro por etapa
      if (etapaFiltro !== 'todas' && p.etapa !== etapaFiltro) {
        return false;
      }

      // Filtro por bandera
      if (banderaFiltro !== 'todas' && !p.banderas.includes(banderaFiltro as Bandera)) {
        return false;
      }

      // Búsqueda por texto
      if (busqueda.trim()) {
        const q = busqueda.trim().toLowerCase();
        const coincideNombre = p.nombre.toLowerCase().includes(q);
        const coincideTel = p.telefonoE164.includes(q);
        const coincideNotas = p.notas.toLowerCase().includes(q);
        if (!coincideNombre && !coincideTel && !coincideNotas) {
          return false;
        }
      }

      return true;
    });
  }, [personas, esApostol, usuario, liderFiltro, etapaFiltro, banderaFiltro, busqueda]);

  const lideres = useMemo(() => {
    return usuarios.filter((u) => u.rol === 'lider' && u.activo);
  }, [usuarios]);

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

      <div className="fila-entre" style={{ marginBottom: 4, alignItems: 'center' }}>
        <h1>Personas</h1>
        <div className="fila" style={{ gap: 8 }}>
          {esApostol && (
            <button
              type="button"
              className="btn secundario chico"
              onClick={exportarLista}
              title="Descargar en Excel (CSV)"
            >
              <IconoExcel size={15} /> Exportar
            </button>
          )}
          <button className="btn chico" onClick={() => ir('inicio')}>
            <IconoMas /> Registrar
          </button>
        </div>
      </div>
      <p className="texto-medio" style={{ marginBottom: 16 }}>
        {esApostol
          ? `${personas.length} personas registradas en la iglesia.`
          : `Tus personas en seguimiento pastoral.`}
      </p>

      {aviso && (
        <div style={{ marginBottom: 14 }}>
          <Aviso tipo="exito" titulo="Exportación">{aviso}</Aviso>
        </div>
      )}

      {/* Buscador y filtros */}
      <div className="tarjeta" style={{ marginBottom: 16, padding: '12px 14px' }}>
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, teléfono o nota…"
            style={{ width: '100%', paddingLeft: 34 }}
          />
          <span
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--tinta-3)',
            }}
          >
            <IconoBuscar size={16} />
          </span>
        </div>

        <div className="fila" style={{ gap: 8, flexWrap: 'wrap' }}>
          <select
            value={etapaFiltro}
            onChange={(e) => setEtapaFiltro(e.target.value)}
            style={{ flex: '1 1 140px' }}
          >
            <option value="todas">Todas las etapas</option>
            {ETAPAS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>

          <select
            value={banderaFiltro}
            onChange={(e) => setBanderaFiltro(e.target.value)}
            style={{ flex: '1 1 160px' }}
          >
            <option value="todas">Todas las banderas</option>
            {BANDERAS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {esApostol && (
            <select
              value={liderFiltro}
              onChange={(e) => setLiderFiltro(e.target.value)}
              style={{ flex: '1 1 140px' }}
            >
              <option value="todos">Todos los líderes</option>
              {lideres.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Lista de personas */}
      {listaFiltrada.length === 0 ? (
        <Vacio>
          {busqueda || etapaFiltro !== 'todas' || banderaFiltro !== 'todas'
            ? 'No se encontraron personas con esos filtros.'
            : 'No hay personas registradas todavía.'}
        </Vacio>
      ) : (
        <div className="pila">
          {listaFiltrada.map((p) => {
            const esperaOracion = p.banderas.includes('Espera llamada de oración');
            const esperaVisita = p.banderas.includes('Espera visita');
            const sinRespuesta = p.banderas.includes('Sin respuesta');
            const noContactar = p.banderas.includes('No contactar');

            return (
              <button
                key={p.id}
                type="button"
                className="item"
                onClick={() => ir('ficha', p.id)}
              >
                <Inicial nombre={p.nombre} />
                <div className="crecer">
                  <div className="fila-entre" style={{ alignItems: 'baseline' }}>
                    <span className="nombre">{p.nombre}</span>
                    <span className="pildora etapa">{p.etapa}</span>
                  </div>
                  <div className="texto-chico" style={{ marginTop: 2 }}>
                    {mostrarTelefono(p.telefonoE164)}
                  </div>
                  <div className="marcas" style={{ marginTop: 6, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {p.liderAsignadoNombre && <ChipLider nombre={p.liderAsignadoNombre} />}
                    {esperaOracion && <span className="pildora espera">Oración</span>}
                    {esperaVisita && <span className="pildora espera">Visita</span>}
                    {sinRespuesta && <span className="pildora stop">Sin resp.</span>}
                    {noContactar && <span className="pildora stop">No contactar</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
