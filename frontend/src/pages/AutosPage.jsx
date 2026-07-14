import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAutos, createAuto, updateAuto, deleteAuto } from '../api/autos';
import { getClientes, crearCliente } from '../api/clientes';
import VehiculoSelector from '../components/autos/VehiculoSelector';
import { MOTORES } from '../data/autosData';

/* ── Estilos base ─────────────────────────────────────────────── */
const INPUT = 'w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]';
const LABEL = 'text-xs text-[#6b7280] mb-1 block';

/* ── Estado vacío del formulario ──────────────────────────────── */
const FORM_VACÍO = {
  placa: '', marca: '', modelo: '', anio: '', motor: '',
  vin: '', color: '', cliente_id: '', notas: '', notas_danos: ''
};

const fotoVacía = () => ({ file: null, preview: null, existingUrl: null });

const fotosVacías = () => ({
  foto_vin:        fotoVacía(),
  foto_frente:     fotoVacía(),
  foto_lateral_der: fotoVacía(),
  foto_lateral_izq: fotoVacía(),
  foto_trasero:    fotoVacía(),
  fotos_danos:     [],
});

/* ── Componente FotoInput ─────────────────────────────────────── */
function FotoInput({ label, value, onChange }) {
  const inputRef = useRef(null);
  const url = value.preview || value.existingUrl;

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    onChange({ file, preview: URL.createObjectURL(file), existingUrl: null });
    e.target.value = '';
  };

  const quitar = () => {
    if (value.preview) URL.revokeObjectURL(value.preview);
    onChange(fotoVacía());
  };

  return (
    <div className="border border-[#e5e5e5] rounded-xl p-3 bg-[#fafafa] flex flex-col gap-2">
      <span className={LABEL} style={{ margin: 0 }}>{label}</span>
      {url ? (
        <div className="relative">
          <img src={url} alt={label} className="w-full h-32 object-cover rounded-lg" />
          <button
            type="button" onClick={quitar}
            className="absolute top-1 right-1 bg-[#dc2626] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700"
          >✕</button>
        </div>
      ) : (
        <div
          className="flex items-center justify-center h-24 border-2 border-dashed border-[#d1d5db] rounded-lg cursor-pointer hover:border-[#1d4ed8] hover:bg-blue-50 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <span className="text-[#9ca3af] text-xs">📷 Seleccionar foto</span>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {!url && (
        <button type="button" onClick={() => inputRef.current?.click()} className="text-xs text-[#1d4ed8] hover:underline text-left">
          📷 Seleccionar foto
        </button>
      )}
    </div>
  );
}

/* ── Tarjeta colapsable de auto ───────────────────────────────── */
function AutoCard({ auto, nombreCliente, onEditar, onEliminar }) {
  const [abierto, setAbierto] = useState(false);

  const titulo = [auto.marca, auto.modelo, auto.anio].filter(Boolean).join(' ') || '—';

  const fotosDanos = (() => {
    try { return auto.fotos_danos ? JSON.parse(auto.fotos_danos) : []; }
    catch { return []; }
  })();

  const fotosCar = ['foto_frente','foto_lateral_der','foto_lateral_izq','foto_trasero','foto_vin']
    .map(k => auto[k]).filter(Boolean);

  return (
    <div className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden">
      {/* ── Cabecera siempre visible ── */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#f9fafb] transition-colors select-none"
        onClick={() => setAbierto(a => !a)}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Placa */}
          <span className="bg-[#111] text-white text-xs font-bold px-2.5 py-1 rounded-md tracking-wider shrink-0">
            {auto.placa ?? '—'}
          </span>
          {/* Vehículo */}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#111] truncate">{titulo}</p>
            {auto.color && (
              <p className="text-[11px] text-[#9ca3af]">{auto.color}</p>
            )}
          </div>
          {/* Cliente */}
          <span className="hidden sm:inline text-xs text-[#6b7280] bg-[#f3f4f6] px-2 py-0.5 rounded-full shrink-0">
            {nombreCliente(auto.cliente_id)}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-3">
          <button
            onClick={e => { e.stopPropagation(); onEditar(auto); }}
            className="bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] px-3 py-1 rounded text-xs hover:bg-[#dbeafe]"
          >
            Editar
          </button>
          <button
            onClick={e => { e.stopPropagation(); onEliminar(auto.id); }}
            className="bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] px-3 py-1 rounded text-xs hover:bg-[#fee2e2]"
          >
            Eliminar
          </button>
          {/* Chevron */}
          <span className={`text-[#9ca3af] transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </div>
      </div>

      {/* ── Detalle colapsable ── */}
      {abierto && (
        <div className="border-t border-[#f3f4f6] px-4 py-4 space-y-4">
          {/* Grid de datos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
            {[
              ['Motor', auto.motor],
              ['VIN', auto.vin],
              ['Color', auto.color],
              ['Cliente', nombreCliente(auto.cliente_id)],
              ['Año', auto.anio],
            ].map(([k, v]) => v ? (
              <div key={k}>
                <span className="text-[10px] text-[#9ca3af] uppercase tracking-wider block">{k}</span>
                <span className="font-medium text-[#111] break-all">{v}</span>
              </div>
            ) : null)}
          </div>

          {/* Fotos del vehículo */}
          {fotosCar.length > 0 && (
            <div>
              <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider mb-2">Fotos del vehículo</p>
              <div className="flex gap-2 flex-wrap">
                {fotosCar.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="" className="h-20 w-20 object-cover rounded-lg border border-[#e5e5e5] hover:opacity-80 transition-opacity" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Fotos de daños */}
          {fotosDanos.length > 0 && (
            <div>
              <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider mb-2">Fotos de daños</p>
              <div className="flex gap-2 flex-wrap">
                {fotosDanos.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="" className="h-20 w-20 object-cover rounded-lg border border-[#fecaca] hover:opacity-80 transition-opacity" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Notas de daños */}
          {auto.notas_danos && (
            <div>
              <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider mb-1">Descripción de daños</p>
              <p className="text-sm text-[#374151] bg-[#fff7ed] border border-[#fed7aa] rounded-lg px-3 py-2">{auto.notas_danos}</p>
            </div>
          )}

          {/* Notas generales */}
          {auto.notas && (
            <div>
              <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider mb-1">Notas</p>
              <p className="text-sm text-[#374151]">{auto.notas}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Mini-modal nuevo cliente ─────────────────────────────────── */
function NuevoClienteModal({ onCreado, onCerrar }) {
  const [nombre, setNombre]   = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail]     = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError]     = useState('');

  const handleGuardar = async () => {
    if (!nombre.trim()) { setError('El nombre es requerido'); return; }
    setError(''); setGuardando(true);
    try {
      const fd = new FormData();
      fd.append('nombre', nombre.trim());
      fd.append('telefono', telefono);
      fd.append('email', email);
      const nuevo = await crearCliente(fd);
      onCreado(nuevo);
    } catch {
      setError('Error al guardar cliente');
    } finally { setGuardando(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#111]">Nuevo cliente</h3>
          <button onClick={onCerrar} className="text-[#9ca3af] hover:text-[#374151] text-lg leading-none">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className={LABEL}>Nombre *</label>
            <input autoFocus value={nombre} onChange={e => setNombre(e.target.value)}
              className={INPUT} placeholder="Nombre completo" />
          </div>
          <div>
            <label className={LABEL}>Teléfono</label>
            <input value={telefono} onChange={e => setTelefono(e.target.value)}
              className={INPUT} placeholder="442 123 4567" />
          </div>
          <div>
            <label className={LABEL}>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)}
              className={INPUT} placeholder="correo@ejemplo.com" type="email" />
          </div>
        </div>
        {error && <p className="text-xs text-[#dc2626]">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={onCerrar}
            className="flex-1 border border-[#e5e5e5] text-[#374151] py-2 rounded-lg text-sm hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={guardando}
            className="flex-1 bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-60 text-white py-2 rounded-lg text-sm font-semibold">
            {guardando ? 'Guardando…' : 'Guardar cliente'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Motor combobox ───────────────────────────────────────────── */
function MotorInput({ value, onChange, sugerenciaNhtsa }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const ref = useRef();

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const opciones = MOTORES.filter(m => m.toLowerCase().includes(query.toLowerCase()));

  // Si hay sugerencia NHTSA y no está ya en la lista filtrada, la ponemos primero
  const nhtsa = sugerenciaNhtsa && sugerenciaNhtsa !== value ? sugerenciaNhtsa : null;

  const select = v => { setQuery(v); onChange(v); setOpen(false); };

  return (
    <div ref={ref} className="relative">
      <label className="text-xs text-[#6b7280] mb-1 block">Motor</label>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="2.0L, 1.5L Turbo, Diesel…"
        className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]"
      />
      {open && (nhtsa || opciones.length > 0) && (
        <div
          className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-[#e5e5e5] rounded-lg shadow-xl overflow-hidden"
          style={{ maxHeight: '220px', overflowY: 'auto' }}
        >
          {nhtsa && (
            <>
              <div className="px-3 pt-2 pb-1">
                <span className="text-[10px] text-[#1d4ed8] font-semibold uppercase tracking-wider">Sugerencia NHTSA</span>
              </div>
              <button
                type="button"
                onClick={() => select(nhtsa)}
                className="w-full text-left px-3 py-2 text-sm bg-[#eff6ff] text-[#1d4ed8] font-semibold hover:bg-[#dbeafe] transition-colors flex items-center gap-2"
              >
                <span>🔍</span> {nhtsa}
              </button>
              {opciones.length > 0 && <div className="border-t border-[#f3f4f6]" />}
            </>
          )}
          {opciones.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => select(m)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-[#eff6ff] transition-colors
                ${m === value ? 'bg-[#eff6ff] text-[#1d4ed8] font-semibold' : 'text-[#111]'}`}
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Página principal ─────────────────────────────────────────── */
export default function AutosPage() {
  const [autos, setAutos]       = useState([]);
  const [clientes, setClientes] = useState([]);
  const [form, setForm]         = useState(FORM_VACÍO);
  const [fotos, setFotos]       = useState(fotosVacías());
  const [editandoId, setEditandoId]   = useState(null);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [error, setError]       = useState('');
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [modoBusqueda, setModoBusqueda] = useState('placa'); // 'placa' | 'vin'
  const [modalCliente, setModalCliente] = useState(false);
  const [listaAbierta, setListaAbierta] = useState(false);
  const [vinDecodificando, setVinDecodificando] = useState(false);
  const [vinData, setVinData] = useState(null);
  const [vinError, setVinError] = useState('');
  const danosInputRef = useRef(null);

  const [searchParams, setSearchParams] = useSearchParams();

  const cargar = () => getAutos().then(r => setAutos(r.data?.data ?? []));

  useEffect(() => {
    cargar();
    getClientes().then(data => setClientes(Array.isArray(data) ? data : []));
  }, []);

  /* Llegada desde Clientes: /autos?nuevo=1&cliente_id=X abre form con cliente preseleccionado */
  useEffect(() => {
    if (searchParams.get('nuevo') === '1') {
      setForm({ ...FORM_VACÍO, cliente_id: searchParams.get('cliente_id') ?? '' });
      setFotos(fotosVacías());
      setEditandoId(null); setError(''); setPanelAbierto(true);
      setVinData(null); setVinError('');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  /* Filtrado por placa o VIN según modo */
  const autosFiltrados = busqueda.trim()
    ? autos.filter(a => {
        const q = busqueda.trim().toUpperCase();
        const campo = modoBusqueda === 'vin' ? (a.vin ?? '') : (a.placa ?? '');
        return campo.toUpperCase().includes(q);
      })
    : autos;

  const handle = e => {
    const val = e.target.name === 'placa' ? e.target.value.toUpperCase() : e.target.value;
    if (e.target.name === 'vin') { setVinData(null); setVinError(''); }
    setForm(f => ({ ...f, [e.target.name]: val }));
  };

  const toTitleCase = s => s
    ? s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    : s;

  const decodificarVin = async () => {
    const vin = form.vin.trim().toUpperCase();
    if (vin.length !== 17) { setVinError('El VIN debe tener 17 caracteres'); return; }
    setVinDecodificando(true); setVinError(''); setVinData(null);
    try {
      const r = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${encodeURIComponent(vin)}?format=json`);
      const d = await r.json();
      const get = v => {
        const found = d.Results?.find(x => x.Variable === v);
        const val = found?.Value;
        return (val && val !== 'Not Applicable' && val !== 'null' && val !== null) ? val : '';
      };
      const info = {
        make:      get('Make'),
        model:     get('Model'),
        year:      get('Model Year'),
        series:    get('Series'),
        trim:      get('Trim'),
        bodyClass: get('Body Class'),
        engineL:   get('Displacement (L)'),
        cylinders: get('Engine Number of Cylinders'),
        fuelType:  get('Fuel Type - Primary'),
      };
      if (!info.make && !info.model) {
        setVinError('No se encontró información para este VIN en NHTSA');
        return;
      }
      setVinData(info);
    } catch {
      setVinError('Error al consultar NHTSA');
    } finally { setVinDecodificando(false); }
  };

  const aplicarSugerencia = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }));

  const aplicarTodoVin = () => {
    if (!vinData) return;
    const cambios = {};
    if (vinData.make)    cambios.marca  = toTitleCase(vinData.make);
    if (vinData.model)   cambios.modelo = toTitleCase(vinData.model);
    if (vinData.year)    cambios.anio   = vinData.year;
    if (vinData.engineL) cambios.motor  = `${parseFloat(vinData.engineL).toFixed(1)}L`;
    setForm(f => ({ ...f, ...cambios }));
  };

  const handleFoto = (campo, valor) => setFotos(f => ({ ...f, [campo]: valor }));

  const agregarFotoDano = (e) => {
    const files = Array.from(e.target.files);
    setFotos(f => {
      const actuales = f.fotos_danos;
      const disponibles = 5 - actuales.length;
      const nuevas = files.slice(0, disponibles).map(file => ({
        file, preview: URL.createObjectURL(file), existingUrl: null,
      }));
      return { ...f, fotos_danos: [...actuales, ...nuevas] };
    });
    e.target.value = '';
  };

  const quitarFotoDano = (idx) => {
    setFotos(f => {
      const arr = [...f.fotos_danos];
      const item = arr.splice(idx, 1)[0];
      if (item.preview) URL.revokeObjectURL(item.preview);
      return { ...f, fotos_danos: arr };
    });
  };

  const abrirNuevo = () => {
    setForm(FORM_VACÍO); setFotos(fotosVacías());
    setEditandoId(null); setError(''); setPanelAbierto(true);
    setVinData(null); setVinError('');
  };

  const handleEditar = (auto) => {
    setEditandoId(auto.id);
    setForm({
      placa: auto.placa ?? '', marca: auto.marca ?? '', modelo: auto.modelo ?? '',
      anio: auto.anio ?? '', motor: auto.motor ?? '', vin: auto.vin ?? '',
      color: auto.color ?? '', cliente_id: auto.cliente_id ?? '',
      notas: auto.notas ?? '', notas_danos: auto.notas_danos ?? '',
    });
    const campos = ['foto_vin','foto_frente','foto_lateral_der','foto_lateral_izq','foto_trasero'];
    const fotoState = fotosVacías();
    campos.forEach(k => { if (auto[k]) fotoState[k] = { file: null, preview: null, existingUrl: auto[k] }; });
    if (auto.fotos_danos) {
      try {
        const arr = JSON.parse(auto.fotos_danos);
        fotoState.fotos_danos = arr.map(url => ({ file: null, preview: null, existingUrl: url }));
      } catch {}
    }
    setFotos(fotoState); setError(''); setPanelAbierto(true);
    setVinData(null); setVinError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGuardar = async () => {
    if (!form.placa) { setError('La placa es requerida'); return; }
    if (!form.cliente_id) { setError('El cliente es requerido — todo auto pertenece a un cliente'); return; }
    setError(''); setGuardando(true);
    try {
      const fd = new FormData();
      ['placa','marca','modelo','color','motor','vin','notas','notas_danos'].forEach(k => fd.append(k, form[k] || ''));
      if (form.anio) fd.append('anio', form.anio);
      if (form.cliente_id) fd.append('cliente_id', form.cliente_id);
      ['foto_vin','foto_frente','foto_lateral_der','foto_lateral_izq','foto_trasero'].forEach(k => {
        if (fotos[k]?.file) fd.append(k, fotos[k].file);
      });
      fotos.fotos_danos.forEach(f => { if (f.file) fd.append('fotos_danos', f.file); });

      if (editandoId) await updateAuto(editandoId, fd);
      else await createAuto(fd);

      setForm(FORM_VACÍO); setFotos(fotosVacías());
      setEditandoId(null); setPanelAbierto(false); cargar();
    } catch (e) {
      setError(e?.response?.data?.error || 'Error al guardar');
    } finally { setGuardando(false); }
  };

  const handleEliminar = async id => {
    if (!confirm('¿Eliminar este auto?')) return;
    await deleteAuto(id); cargar();
  };

  const handleCancelar = () => {
    setForm(FORM_VACÍO); setFotos(fotosVacías());
    setEditandoId(null); setError(''); setPanelAbierto(false);
    setVinData(null); setVinError('');
  };

  const nombreCliente = clienteId => {
    if (!clienteId) return 'Sin cliente';
    const c = clientes.find(cl => cl.id === clienteId || cl.id === Number(clienteId));
    return c ? c.nombre : 'Sin cliente';
  };

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-base font-bold text-[#111] mr-2">Catálogo de autos</h1>

        {/* Toggle Placa / VIN */}
        <div className="flex rounded-lg border border-[#e5e5e5] overflow-hidden shrink-0">
          <button
            onClick={() => { setModoBusqueda('placa'); setBusqueda(''); }}
            className={`px-3 py-2 text-xs font-semibold transition-colors ${modoBusqueda === 'placa' ? 'bg-[#1d4ed8] text-white' : 'bg-white text-[#6b7280] hover:bg-[#f3f4f6]'}`}
          >Placa</button>
          <button
            onClick={() => { setModoBusqueda('vin'); setBusqueda(''); }}
            className={`px-3 py-2 text-xs font-semibold transition-colors border-l border-[#e5e5e5] ${modoBusqueda === 'vin' ? 'bg-[#1d4ed8] text-white' : 'bg-white text-[#6b7280] hover:bg-[#f3f4f6]'}`}
          >VIN</button>
        </div>

        {/* Input búsqueda */}
        <div className="relative flex-1 min-w-[160px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af] text-sm">🔍</span>
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder={modoBusqueda === 'placa' ? 'Buscar placa…' : 'Buscar VIN…'}
            className="w-full border border-[#e5e5e5] rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] bg-white"
            style={{ textTransform: 'uppercase' }}
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#374151] text-sm">✕</button>
          )}
        </div>

        <button
          onClick={abrirNuevo}
          className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white px-4 py-2 rounded-lg text-sm font-semibold shrink-0 ml-auto"
        >
          + Nuevo auto
        </button>
      </div>

      {/* Panel formulario */}
      {panelAbierto && (
        <div className="bg-white rounded-xl border border-[#e5e5e5] p-5 space-y-6">
          <h2 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
            {editandoId ? 'Editar auto' : 'Nuevo auto'}
          </h2>

          {/* Datos del vehículo */}
          <section>
            <h3 className="text-xs font-semibold text-[#111] uppercase tracking-wider mb-3 pb-1 border-b border-[#f3f4f6]">
              Datos del vehículo
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Placa *</label>
                <input name="placa" value={form.placa} onChange={handle} className={INPUT} placeholder="ABC-1234" style={{ textTransform: 'uppercase' }} />
              </div>
              <div className="md:col-span-2">
                <label className={LABEL}>VIN</label>
                <div className="flex gap-2">
                  <input name="vin" value={form.vin} onChange={handle} className={INPUT} placeholder="1HGCM82633A004352" maxLength={17} style={{ textTransform: 'uppercase' }} />
                  <button
                    type="button"
                    onClick={decodificarVin}
                    disabled={vinDecodificando || form.vin.trim().length !== 17}
                    className="shrink-0 bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] px-3 py-2 rounded-lg text-xs font-semibold hover:bg-[#dbeafe] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {vinDecodificando ? '⟳ Consultando…' : '🔍 Decodificar'}
                  </button>
                </div>
                {vinError && <p className="text-xs text-[#dc2626] mt-1">{vinError}</p>}

                {/* Tarjeta de resultado NHTSA */}
                {vinData && (() => {
                  const sugerencias = [
                    { campo: 'marca',  label: 'Marca',  valor: toTitleCase(vinData.make),                          actual: form.marca  },
                    { campo: 'modelo', label: 'Modelo', valor: toTitleCase(vinData.model),                         actual: form.modelo },
                    { campo: 'anio',   label: 'Año',    valor: vinData.year,                                       actual: form.anio   },
                    { campo: 'motor',  label: 'Motor',  valor: vinData.engineL ? `${parseFloat(vinData.engineL).toFixed(1)}L` : '', actual: form.motor },
                  ].filter(s => s.valor && s.valor.toLowerCase() !== (s.actual || '').toLowerCase());

                  return (
                    <div className="mt-3 border border-[#bfdbfe] rounded-xl bg-[#eff6ff] p-4 space-y-3">
                      {/* Resumen info */}
                      <div>
                        <p className="text-[10px] text-[#1d4ed8] font-semibold uppercase tracking-wider mb-1">Resultado NHTSA</p>
                        <p className="text-sm font-bold text-[#111]">
                          {[toTitleCase(vinData.make), toTitleCase(vinData.model), vinData.year].filter(Boolean).join(' ')}
                        </p>
                        <p className="text-xs text-[#6b7280] mt-0.5">
                          {[vinData.series, vinData.trim, vinData.bodyClass].filter(Boolean).join(' · ')}
                        </p>
                        {(vinData.engineL || vinData.cylinders || vinData.fuelType) && (
                          <p className="text-xs text-[#6b7280]">
                            Motor: {[
                              vinData.engineL ? `${parseFloat(vinData.engineL).toFixed(1)}L` : null,
                              vinData.cylinders ? `${vinData.cylinders} cil.` : null,
                              vinData.fuelType || null,
                            ].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>

                      {/* Sugerencias de cambio */}
                      {sugerencias.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-[10px] text-[#374151] font-semibold uppercase tracking-wider">Sugerencias de cambio</p>
                          {sugerencias.map(s => (
                            <div key={s.campo} className="flex items-center justify-between gap-3 bg-white border border-[#e5e5e5] rounded-lg px-3 py-2">
                              <div className="min-w-0">
                                <span className="text-[10px] text-[#9ca3af] uppercase tracking-wider block">{s.label}</span>
                                <span className="text-sm font-semibold text-[#111]">{s.valor}</span>
                                {s.actual && (
                                  <span className="text-xs text-[#9ca3af] ml-2">← actual: {s.actual}</span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => aplicarSugerencia(s.campo, s.valor)}
                                className="shrink-0 bg-[#dcfce7] border border-[#bbf7d0] text-[#166534] px-3 py-1 rounded-lg text-xs font-semibold hover:bg-[#bbf7d0]"
                              >
                                Aplicar
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={aplicarTodoVin}
                            className="w-full bg-[#1d4ed8] hover:bg-[#1e40af] text-white py-2 rounded-lg text-xs font-semibold"
                          >
                            Aplicar todo
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-[#059669] font-medium">Los datos del formulario ya coinciden con NHTSA</p>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div className="md:col-span-2">
                <VehiculoSelector
                  form={form}
                  onChange={fields => setForm(f => ({ ...f, ...fields }))}
                />
              </div>
              <div>
                <MotorInput
                  value={form.motor}
                  onChange={v => setForm(f => ({ ...f, motor: v }))}
                  sugerenciaNhtsa={vinData?.engineL ? `${parseFloat(vinData.engineL).toFixed(1)}L` : null}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={LABEL} style={{ margin: 0 }}>Cliente *</label>
                  <button type="button" onClick={() => setModalCliente(true)}
                    className="text-[10px] text-[#1d4ed8] hover:underline font-medium">
                    + Nuevo cliente
                  </button>
                </div>
                <select name="cliente_id" value={form.cliente_id} onChange={handle} className={INPUT}>
                  <option value="">Seleccionar cliente…</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                {!form.cliente_id && (
                  <p className="text-[11px] text-[#9ca3af] mt-1">
                    ¿Cliente nuevo?{' '}
                    <button type="button" onClick={() => setModalCliente(true)}
                      className="text-[#1d4ed8] hover:underline">
                      Regístralo aquí
                    </button>
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Fotos del vehículo */}
          <section>
            <h3 className="text-xs font-semibold text-[#111] uppercase tracking-wider mb-3 pb-1 border-b border-[#f3f4f6]">
              Inspección visual — Fotos del vehículo
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FotoInput label="Foto VIN"         value={fotos.foto_vin}         onChange={v => handleFoto('foto_vin', v)} />
              <FotoInput label="Frente"            value={fotos.foto_frente}      onChange={v => handleFoto('foto_frente', v)} />
              <FotoInput label="Lateral derecho"   value={fotos.foto_lateral_der} onChange={v => handleFoto('foto_lateral_der', v)} />
              <FotoInput label="Lateral izquierdo" value={fotos.foto_lateral_izq} onChange={v => handleFoto('foto_lateral_izq', v)} />
              <FotoInput label="Trasero"           value={fotos.foto_trasero}     onChange={v => handleFoto('foto_trasero', v)} />
            </div>
          </section>

          {/* Daños */}
          <section>
            <h3 className="text-xs font-semibold text-[#111] uppercase tracking-wider mb-3 pb-1 border-b border-[#f3f4f6]">
              Daños y observaciones
            </h3>
            <div className="space-y-4">
              <div>
                <label className={LABEL}>Descripción de daños</label>
                <textarea name="notas_danos" value={form.notas_danos} onChange={handle} className={INPUT} rows={3} placeholder="Describe golpes, rayones u otros daños..." />
              </div>
              <div>
                <label className={LABEL}>Fotos de daños ({fotos.fotos_danos.length}/5)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {fotos.fotos_danos.map((f, idx) => (
                    <div key={idx} className="relative">
                      <img src={f.preview || f.existingUrl} alt={`Daño ${idx + 1}`} className="w-full h-24 object-cover rounded-lg border border-[#e5e5e5]" />
                      <button type="button" onClick={() => quitarFotoDano(idx)} className="absolute top-1 right-1 bg-[#dc2626] text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-red-700">✕</button>
                    </div>
                  ))}
                  {fotos.fotos_danos.length < 5 && (
                    <div className="flex items-center justify-center h-24 border-2 border-dashed border-[#d1d5db] rounded-lg cursor-pointer hover:border-[#1d4ed8] hover:bg-blue-50 transition-colors" onClick={() => danosInputRef.current?.click()}>
                      <span className="text-[#9ca3af] text-xs text-center leading-tight px-1">+ Foto daño</span>
                    </div>
                  )}
                </div>
                <input ref={danosInputRef} type="file" accept="image/*" multiple className="hidden" onChange={agregarFotoDano} />
                {fotos.fotos_danos.length < 5 && (
                  <button type="button" onClick={() => danosInputRef.current?.click()} className="mt-2 text-xs text-[#1d4ed8] hover:underline">
                    + Agregar foto de daño
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Notas generales */}
          <section>
            <h3 className="text-xs font-semibold text-[#111] uppercase tracking-wider mb-3 pb-1 border-b border-[#f3f4f6]">
              Notas generales
            </h3>
            <textarea name="notas" value={form.notas} onChange={handle} className={INPUT} rows={2} placeholder="Observaciones adicionales..." />
          </section>

          {error && <p className="text-[#dc2626] text-sm">{error}</p>}

          <div className="flex gap-2">
            <button onClick={handleGuardar} disabled={guardando} className="bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-semibold">
              {guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Agregar'}
            </button>
            <button onClick={handleCancelar} className="bg-white border border-[#e5e5e5] text-[#374151] px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Sección autos existentes (colapsable) ── */}
      <div className="bg-white rounded-xl border border-[#e5e5e5] overflow-hidden">

        {/* Cabecera toggle */}
        <button
          onClick={() => setListaAbierta(a => !a)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#f9fafb] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#111]">Autos registrados</span>
            <span className="bg-[#f3f4f6] text-[#6b7280] text-xs font-medium px-2 py-0.5 rounded-full">
              {autos.length}
            </span>
          </div>
          <span className={`text-[#9ca3af] transition-transform duration-200 ${listaAbierta ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {/* Contenido colapsable */}
        {listaAbierta && (
          <div className="border-t border-[#f3f4f6] p-4 space-y-3">

            {/* Contador resultados */}
            {busqueda && (
              <p className="text-xs text-[#6b7280]">
                {autosFiltrados.length === 0
                  ? 'Sin resultados'
                  : `${autosFiltrados.length} auto${autosFiltrados.length !== 1 ? 's' : ''} encontrado${autosFiltrados.length !== 1 ? 's' : ''}`}
              </p>
            )}

            {/* Lista */}
            {autos.length === 0 ? (
              <p className="text-sm text-[#9ca3af] text-center py-4">Sin autos registrados</p>
            ) : autosFiltrados.length === 0 ? (
              <p className="text-sm text-[#9ca3af] text-center py-4">Sin resultados para "{busqueda}"</p>
            ) : (
              <div className="space-y-2">
                {autosFiltrados.map(auto => (
                  <AutoCard
                    key={auto.id}
                    auto={auto}
                    nombreCliente={nombreCliente}
                    onEditar={handleEditar}
                    onEliminar={handleEliminar}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal nuevo cliente */}
      {modalCliente && (
        <NuevoClienteModal
          onCreado={nuevo => {
            setClientes(cs => [...cs, nuevo]);
            setForm(f => ({ ...f, cliente_id: nuevo.id }));
            setModalCliente(false);
          }}
          onCerrar={() => setModalCliente(false)}
        />
      )}
    </div>
  );
}
