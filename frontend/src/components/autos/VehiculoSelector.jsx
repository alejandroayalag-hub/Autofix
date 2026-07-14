import { useState, useRef, useEffect, useCallback } from 'react';
import { MARCAS_MODELOS, COLORES, AÑOS } from '../../data/autosData';

const NHTSA = 'https://vpic.nhtsa.dot.gov/api/vehicles';

// Cache módulo para no re-descargar las 9 000+ marcas
let _nhtsaMakesCache = null;
const getNhtsaMakes = async () => {
  if (_nhtsaMakesCache) return _nhtsaMakesCache;
  const r = await fetch(`${NHTSA}/getallmakes?format=json`);
  const d = await r.json();
  _nhtsaMakesCache = d.Results.map(m => m.Make_Name);
  return _nhtsaMakesCache;
};

const getNhtsaModelos = async (marca) => {
  const r = await fetch(`${NHTSA}/getmodelsformake/${encodeURIComponent(marca)}?format=json`);
  const d = await r.json();
  return d.Results.map(m => m.Model_Name).sort();
};

/* ── Hook click-outside ─────────────────────────────────────── */
function useClickOutside(ref, cb) {
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) cb(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, cb]);
}

/* ── Combobox genérico ─────────────────────────────────────── */
function Combobox({ label, value, onChange, options, placeholder, disabled, extra }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState(value || '');
  const ref = useRef();

  useEffect(() => { setQuery(value || ''); }, [value]);
  useClickOutside(ref, useCallback(() => setOpen(false), []));

  const filtered = options
    .filter(o => o.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 50);

  const select = v => { setQuery(v); onChange(v); setOpen(false); };

  return (
    <div ref={ref} className="relative">
      {label && <label className="text-xs text-[#6b7280] mb-1 block">{label}</label>}
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] disabled:bg-[#f9fafb] disabled:text-[#9ca3af]"
      />
      {open && (filtered.length > 0 || extra) && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-[#e5e5e5] rounded-lg shadow-xl overflow-hidden"
          style={{ maxHeight: '220px', overflowY: 'auto' }}>
          {filtered.map(o => (
            <button key={o} type="button" onClick={() => select(o)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-[#eff6ff] transition-colors
                ${o === value ? 'bg-[#eff6ff] text-[#1d4ed8] font-semibold' : 'text-[#111]'}`}>
              {o}
            </button>
          ))}
          {extra && (
            <div className="border-t border-[#f0f0f0] sticky bottom-0 bg-white">
              {extra}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Selector principal ─────────────────────────────────────── */
export default function VehiculoSelector({ form, onChange }) {
  const staticMarcas  = MARCAS_MODELOS.map(m => m.marca);
  const marcaObj      = MARCAS_MODELOS.find(m => m.marca.toLowerCase() === (form.marca || '').toLowerCase());

  // Modelos: estáticos si hay marcaObj, NHTSA si el usuario lo buscó
  const [nhtsaModelos, setNhtsaModelos] = useState(null); // null = usar estáticos
  const [modelosLoading, setModelosLoading] = useState(false);

  // Panel NHTSA para marcas
  const [nhtsaPanel, setNhtsaPanel]   = useState(false);
  const [nhtsaQuery, setNhtsaQuery]   = useState('');
  const [nhtsaResults, setNhtsaResults] = useState([]);
  const [nhtsaLoading, setNhtsaLoading] = useState(false);
  const [nhtsaError, setNhtsaError]   = useState('');

  const modelos = nhtsaModelos !== null
    ? nhtsaModelos
    : (marcaObj ? marcaObj.modelos : []);

  const set = useCallback((fields) => onChange({ ...form, ...fields }), [form, onChange]);

  /* Cuando cambia la marca, resetear modelo y modelos NHTSA */
  const handleMarca = (v) => {
    const esEstatica = MARCAS_MODELOS.some(m => m.marca.toLowerCase() === v.toLowerCase());
    setNhtsaModelos(esEstatica ? null : nhtsaModelos); // si cambia a estática, volver a estáticos
    set({ marca: v, modelo: '' });
  };

  /* Buscar marcas en NHTSA */
  const buscarNhtsaMarcas = async (q) => {
    setNhtsaQuery(q);
    if (!q.trim()) { setNhtsaResults([]); return; }
    setNhtsaLoading(true); setNhtsaError('');
    try {
      const todas = await getNhtsaMakes();
      const filtradas = todas.filter(m => m.toLowerCase().includes(q.toLowerCase())).slice(0, 30);
      setNhtsaResults(filtradas);
    } catch {
      setNhtsaError('Error al conectar con NHTSA');
    } finally { setNhtsaLoading(false); }
  };

  /* Seleccionar marca NHTSA y cargar sus modelos */
  const seleccionarNhtsaMarca = async (marca) => {
    set({ marca, modelo: '' });
    setNhtsaPanel(false); setNhtsaQuery(''); setNhtsaResults([]);
    setModelosLoading(true); setNhtsaModelos([]);
    try {
      const mods = await getNhtsaModelos(marca);
      setNhtsaModelos(mods);
    } catch { setNhtsaModelos([]); }
    finally { setModelosLoading(false); }
  };

  /* Color: "Otro" */
  const [colorOtro, setColorOtro] = useState(
    !!form.color && !COLORES.includes(form.color)
  );
  const handleColor = (v) => {
    if (v === '__otro__') { setColorOtro(true); set({ color: '' }); }
    else { setColorOtro(false); set({ color: v }); }
  };

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <div className="space-y-4">

      {/* Marca */}
      <div className="md:col-span-2">
        <Combobox
          label="Marca"
          value={form.marca}
          onChange={handleMarca}
          options={staticMarcas}
          placeholder="Toyota, Nissan, VW…"
          extra={
            <button type="button" onClick={() => setNhtsaPanel(p => !p)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#1d4ed8] hover:bg-[#eff6ff] transition-colors">
              <span>🔍</span>
              <span>Buscar otra marca en NHTSA…</span>
            </button>
          }
        />

        {/* Panel NHTSA marcas */}
        {nhtsaPanel && (
          <div className="mt-2 border border-[#bfdbfe] rounded-lg bg-[#eff6ff] p-3 space-y-2">
            <p className="text-[10px] text-[#1d4ed8] font-semibold uppercase tracking-wider">Buscar en base NHTSA (EUA / mundial)</p>
            <input
              autoFocus
              value={nhtsaQuery}
              onChange={e => buscarNhtsaMarcas(e.target.value)}
              placeholder="Escribe la marca…"
              className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] bg-white"
            />
            {nhtsaLoading && <p className="text-xs text-[#6b7280]">Buscando…</p>}
            {nhtsaError && <p className="text-xs text-[#dc2626]">{nhtsaError}</p>}
            {nhtsaResults.length > 0 && (
              <div className="bg-white border border-[#e5e5e5] rounded-lg overflow-hidden" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                {nhtsaResults.map(m => (
                  <button key={m} type="button" onClick={() => seleccionarNhtsaMarca(m)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[#eff6ff] text-[#111] transition-colors">
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modelo */}
      <div>
        {modelosLoading ? (
          <div>
            <label className="text-xs text-[#6b7280] mb-1 block">Modelo</label>
            <div className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-[#9ca3af] bg-[#f9fafb] flex items-center gap-2">
              <span className="animate-spin">⟳</span> Cargando modelos de NHTSA…
            </div>
          </div>
        ) : (
          <Combobox
            label={
              nhtsaModelos !== null
                ? `Modelo ${nhtsaModelos.length > 0 ? `(${nhtsaModelos.length} desde NHTSA)` : ''}`
                : 'Modelo'
            }
            value={form.modelo}
            onChange={v => set({ modelo: v })}
            options={modelos}
            placeholder={form.marca ? `Modelo de ${form.marca}…` : 'Selecciona marca primero…'}
          />
        )}
      </div>

      {/* Año */}
      <div>
        <label className="text-xs text-[#6b7280] mb-1 block">Año</label>
        <select
          value={form.anio}
          onChange={e => set({ anio: e.target.value })}
          className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]"
        >
          <option value="">Seleccionar año…</option>
          {AÑOS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Color */}
      <div>
        <label className="text-xs text-[#6b7280] mb-1 block">Color</label>
        {colorOtro ? (
          <div className="flex gap-2">
            <input
              value={form.color}
              onChange={e => set({ color: e.target.value })}
              placeholder="Color personalizado"
              className="flex-1 border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]"
            />
            <button type="button" onClick={() => { setColorOtro(false); set({ color: '' }); }}
              className="border border-[#e5e5e5] rounded-lg px-3 py-2 text-xs text-[#6b7280] hover:bg-gray-50">
              ↩ Lista
            </button>
          </div>
        ) : (
          <select
            value={form.color}
            onChange={e => handleColor(e.target.value)}
            className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]"
          >
            <option value="">Seleccionar color…</option>
            {COLORES.map(c => <option key={c} value={c}>{c}</option>)}
            <option value="__otro__">Otro…</option>
          </select>
        )}
      </div>

    </div>
  );
}
