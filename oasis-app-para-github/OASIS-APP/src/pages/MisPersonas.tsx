import { useMemo, useState } from 'react';
import { useDatos } from '../context/DatosContext';
import { useAuth } from '../context/AuthContext';
import { ChipLider, Inicial, PildoraBandera, PildoraEtapa, Vacio, hace } from '../components/UI';
import { IconoBuscar } from '../components/Iconos';
import { ETAPAS, BANDERAS, type Bandera, type Etapa } from '../lib/types';
import type { Vista } from '../App';

export default function MisPersonas({ ir }: { ir: (v: Vista, id?: string) => void }) {
  const { personas } = useDatos();
  const { esApostol } = useAuth();
  const [texto, setTexto] = useState('');
  const [etapa, setEtapa] = useState<Etapa | ''>('');
  const [bandera, setBandera] = useState<Bandera | ''>('');

  const filtradas = useMemo(() => {
    const t = texto.trim().toLowerCase();
    return personas
      .filter((p) => {
        if (t && !p.nombre.toLowerCase().includes(t) && !p.telefonoE164.includes(t.replace(/\D/g, ''))) {
          return false;
        }
        if (etapa && p.etapa !== etapa) return false;
        if (bandera && !p.banderas.includes(bandera)) return false;
        return true;
      })
      .sort((a, b) => {
        // Primero quienes esperan algo, después por fecha de ingreso.
        const esperaA = a.banderas.some((x) => x.startsWith('Espera')) ? 0 : 1;
        const esperaB = b.banderas.some((x) => x.startsWith('Espera')) ? 0 : 1;
        if (esperaA !== esperaB) return esperaA - esperaB;
        return b.fechaIngreso.localeCompare(a.fechaIngreso);
      });
  }, [personas, texto, etapa, bandera]);

  const hayFiltro = Boolean(texto || etapa || bandera);

  return (
    <div>
      <div className="fila-entre" style={{ marginBottom: 14 }}>
        <h1>{esApostol ? 'Todas las personas' : 'Mis personas'}</h1>
        <span className="texto-chico">{filtradas.length} de {personas.length}</span>
      </div>

      <div style={{ position: 'relative', marginBottom: 10 }}>
        <IconoBuscar
          className="icono-busqueda"
        />
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar por nombre o celular"
          style={{ paddingLeft: 40 }}
          aria-label="Buscar persona"
        />
        <style>{`.icono-busqueda{position:absolute;left:13px;top:50%;transform:translateY(-50%);width:19px;height:19px;color:var(--tinta-3);pointer-events:none}`}</style>
      </div>

      <div className="fila" style={{ gap: 6, marginBottom: 8 }}>
        {ETAPAS.map((e) => (
          <button
            key={e}
            className={`pildora ${etapa === e ? 'etapa' : 'apagada'}`}
            onClick={() => setEtapa(etapa === e ? '' : e)}
          >
            {e}
          </button>
        ))}
      </div>

      <div className="fila" style={{ gap: 6, marginBottom: 16 }}>
        {BANDERAS.map((b) => (
          <button
            key={b}
            className={`pildora ${bandera === b ? 'espera' : 'apagada'}`}
            onClick={() => setBandera(bandera === b ? '' : b)}
          >
            {b}
          </button>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <Vacio emoji="·">
          {hayFiltro
            ? 'Ninguna persona coincide con ese filtro.'
            : 'Todavía no tienes personas a cargo. Ve a Registrar y anota a la primera.'}
        </Vacio>
      ) : (
        <div className="pila">
          {filtradas.map((p) => (
            <button key={p.id} className="item" onClick={() => ir('ficha', p.id)}>
              <Inicial nombre={p.nombre} />
              <div className="crecer">
                <div className="nombre">{p.nombre}</div>
                <div className="sub">Último contacto: {hace(p.ultimoContacto)}</div>
                <div className="marcas">
                  <PildoraEtapa etapa={p.etapa} />
                  {p.banderas.map((b) => (
                    <PildoraBandera key={b} bandera={b} />
                  ))}
                </div>
                {esApostol && (
                  <div className="marcas">
                    <ChipLider nombre={p.liderAsignadoNombre} />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
