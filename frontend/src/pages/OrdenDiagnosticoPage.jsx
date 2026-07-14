import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrden, getDiagnostico, saveDiagnostico, generarCotizacion,
         getDiagnosticoFremos, saveDiagnosticoFremos } from '../api/ordenes';
import DiagnosticoFrenosForm, { calcularItemsFremos } from '../components/frenos/DiagnosticoFrenosForm';

// ─── Checklist predefinido ────────────────────────────────────────────────────
const CHECKLIST_DEFAULT = {
  motor:      ['Nivel de aceite', 'Nivel de refrigerante', 'Correa de distribución', 'Filtro de aire', 'Bujías'],
  frenos:     ['Pastillas delanteras', 'Pastillas traseras', 'Discos delanteros', 'Discos traseros', 'Líquido de frenos'],
  suspension: ['Amortiguadores delanteros', 'Amortiguadores traseros', 'Rótulas', 'Terminales', 'Resortes'],
  electrico:  ['Batería', 'Alternador', 'Arranque', 'Fusibles', 'Luces'],
  carroceria: ['Parabrisas', 'Espejos', 'Limpiaparabrisas', 'Puertas', 'Escape'],
};

const SECTION_LABELS = {
  motor:      'Motor',
  frenos:     'Frenos',
  suspension: 'Suspensión',
  electrico:  'Eléctrico',
  carroceria: 'Carrocería',
};

// ─── Estado inicial de checklist ─────────────────────────────────────────────
const buildDefaultChecklist = () => {
  const result = {};
  for (const [sec, items] of Object.entries(CHECKLIST_DEFAULT)) {
    result[sec] = items.map((nombre) => ({ nombre, estado: null, nota: '' }));
  }
  return result;
};

// ─── Ícono chevron ────────────────────────────────────────────────────────────
const Chevron = ({ open }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s' }}
  >
    <path d="M4 6l4 4 4-4" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Radio de estado ──────────────────────────────────────────────────────────
const ESTADOS = [
  { value: 'ok',      label: '✓ Ok',      color: '#059669' },
  { value: 'revisar', label: '⚠ Revisar', color: '#d97706' },
  { value: 'urgente', label: '🔴 Urgente', color: '#dc2626' },
];

const EstadoRadios = ({ value, onChange }) => (
  <div className="flex items-center gap-3 flex-wrap">
    {ESTADOS.map((e) => (
      <label
        key={e.value}
        className="flex items-center gap-1 cursor-pointer select-none text-sm font-medium"
        style={{ color: value === e.value ? e.color : '#6b7280' }}
      >
        <input
          type="radio"
          name={undefined}
          checked={value === e.value}
          onChange={() => onChange(e.value)}
          className="sr-only"
        />
        <span
          style={{
            display: 'inline-block',
            width: 14,
            height: 14,
            borderRadius: '50%',
            border: `2px solid ${value === e.value ? e.color : '#d1d5db'}`,
            background: value === e.value ? e.color : 'transparent',
            flexShrink: 0,
          }}
        />
        {e.label}
      </label>
    ))}
  </div>
);

// ─── Sección colapsable del checklist ────────────────────────────────────────
const ChecklistSection = ({ secKey, items, onChange, onAddItem }) => {
  const [open, setOpen] = useState(true);

  const updateItem = (idx, field, val) => {
    const next = items.map((it, i) => (i === idx ? { ...it, [field]: val } : it));
    onChange(secKey, next);
  };

  return (
    <div className="bg-white rounded-xl border border-[#e5e5e5]">
      {/* Header colapsable */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between bg-[#f9fafb] px-4 py-3 border-b border-[#e5e5e5] rounded-t-xl"
      >
        <span className="text-sm font-semibold text-[#111]">{SECTION_LABELS[secKey]}</span>
        <Chevron open={open} />
      </button>

      {open && (
        <div className="divide-y divide-[#f3f4f6]">
          {items.map((item, idx) => (
            <div key={idx} className="px-4 py-3 space-y-2">
              <div className="flex items-start gap-3 flex-wrap">
                {/* Nombre */}
                <input
                  type="text"
                  value={item.nombre}
                  onChange={(e) => updateItem(idx, 'nombre', e.target.value)}
                  className="flex-1 min-w-40 text-sm text-[#111] bg-transparent border-b border-transparent hover:border-[#d1d5db] focus:border-[#1d4ed8] focus:outline-none py-0.5"
                />
                {/* Radios */}
                <EstadoRadios
                  value={item.estado}
                  onChange={(val) => updateItem(idx, 'estado', val)}
                />
              </div>
              {/* Nota opcional */}
              <input
                type="text"
                value={item.nota}
                onChange={(e) => updateItem(idx, 'nota', e.target.value)}
                placeholder="Nota (opcional)"
                className="w-full text-xs text-[#6b7280] placeholder-[#9ca3af] bg-[#f9fafb] border border-[#e5e5e5] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#1d4ed8]"
              />
            </div>
          ))}

          {/* Botón agregar ítem */}
          <div className="px-4 py-2">
            <button
              type="button"
              onClick={() => onAddItem(secKey)}
              className="text-xs text-[#1d4ed8] hover:underline font-semibold"
            >
              + Agregar ítem
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Fila de problema ─────────────────────────────────────────────────────────
const ProblemaRow = ({ problema, idx, onChange, onRemove }) => (
  <div className="flex items-center gap-3 flex-wrap py-2 border-b border-[#f3f4f6] last:border-0">
    <input
      type="text"
      value={problema.descripcion}
      onChange={(e) => onChange(idx, 'descripcion', e.target.value)}
      placeholder="Descripción del problema"
      className="flex-1 min-w-40 text-sm text-[#111] border border-[#e5e5e5] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#1d4ed8]"
    />
    <select
      value={problema.urgencia}
      onChange={(e) => onChange(idx, 'urgencia', e.target.value)}
      className="text-sm border border-[#e5e5e5] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#1d4ed8] bg-white text-[#374151]"
    >
      <option value="normal">Normal</option>
      <option value="urgente">Urgente</option>
    </select>
    <label className="flex items-center gap-2 text-sm text-[#374151] cursor-pointer select-none">
      <input
        type="checkbox"
        checked={problema.incluir}
        onChange={(e) => onChange(idx, 'incluir', e.target.checked)}
        className="w-4 h-4 rounded"
        style={{ accentColor: '#1d4ed8' }}
      />
      Incluir en cotización
    </label>
    <button
      type="button"
      onClick={() => onRemove(idx)}
      className="text-xs text-[#9ca3af] hover:text-[#dc2626] transition-colors"
      aria-label="Eliminar"
    >
      ✕
    </button>
  </div>
);

// ─── Página principal ─────────────────────────────────────────────────────────
export default function OrdenDiagnosticoPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [generando, setGenerando] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  // Tipo de servicio de la orden
  const [tipoServicio, setTipoServicio] = useState(null);

  // Estado del formulario genérico
  const [checklist, setChecklist] = useState(buildDefaultChecklist);
  const [problemas, setProblemas] = useState([]);
  const [notas,     setNotas]     = useState('');

  // Estado del diagnóstico de frenos
  const [diagFremos, setDiagFremos] = useState(null);

  // ── Carga inicial ──
  useEffect(() => {
    setLoading(true);

    // Cargar la orden para saber el tipo de servicio
    getOrden(id)
      .then(res => {
        const orden = res.data?.data ?? res.data;
        setTipoServicio(orden?.tipo_servicio || null);

        if (orden?.tipo_servicio === 'frenos') {
          return getDiagnosticoFremos(id).then(setDiagFremos).catch(() => {});
        } else {
          return getDiagnostico(id)
            .then((data) => {
              if (data) {
                if (data.checklist && Object.keys(data.checklist).length > 0) setChecklist(data.checklist);
                if (Array.isArray(data.items)) setProblemas(data.items);
                if (data.notas_libres != null) setNotas(data.notas_libres);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  // ── Helpers checklist ──
  const updateChecklist = (secKey, items) => {
    setChecklist((prev) => ({ ...prev, [secKey]: items }));
  };

  const addItem = (secKey) => {
    setChecklist((prev) => ({
      ...prev,
      [secKey]: [...prev[secKey], { nombre: '', estado: null, nota: '' }],
    }));
  };

  // ── Helpers problemas ──
  const addProblema = () => {
    setProblemas((prev) => [...prev, { descripcion: '', urgencia: 'normal', incluir: true }]);
  };

  const updateProblema = (idx, field, val) => {
    setProblemas((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: val } : p)));
  };

  const removeProblema = (idx) => {
    setProblemas((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Guardar diagnóstico de frenos ──
  const handleGuardarFremos = async (data, irCotizacion = false) => {
    setError(''); setSuccess('');
    try {
      const saved = await saveDiagnosticoFremos(id, data);
      setDiagFremos(saved);
      if (irCotizacion) {
        // Pre-cargar ítems a cotizar en sessionStorage para que los levante la cotización
        const items = calcularItemsFremos(saved);
        sessionStorage.setItem(`frenos_items_${id}`, JSON.stringify(items));
        navigate(`/ordenes/${id}/cotizacion`);
      } else {
        setSuccess('Diagnóstico guardado.');
      }
    } catch {
      setError('Error al guardar el diagnóstico de frenos.');
    }
  };

  // ── Guardar diagnóstico genérico ──
  const handleGuardar = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await saveDiagnostico(id, {
        notas_libres: notas,
        checklist,
        items: problemas,
      });
      setSuccess('Diagnóstico guardado correctamente.');
    } catch {
      setError('Error al guardar el diagnóstico.');
    } finally {
      setSaving(false);
    }
  };

  // ── Generar cotización ──
  const handleGenerarCotizacion = async () => {
    setGenerando(true);
    setError('');
    setSuccess('');
    try {
      // Primero guarda
      await saveDiagnostico(id, {
        notas_libres: notas,
        checklist,
        items: problemas,
      });
      // Luego genera
      await generarCotizacion(id);
      navigate(`/ordenes/${id}/cotizacion`);
    } catch {
      setError('Error al generar la cotización.');
      setGenerando(false);
    }
  };

  // ── Render ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#9ca3af] text-sm">
        Cargando diagnóstico...
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-base font-bold text-[#111]">
          Diagnóstico — Orden #{id}
        </h1>
        <button
          type="button"
          onClick={() => navigate(`/ordenes/${id}`)}
          className="text-sm text-[#1d4ed8] hover:underline"
        >
          ← Volver a OT
        </button>
      </div>

      {/* ── Mensajes ── */}
      {error && (
        <div className="bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-[#f0fdf4] border border-[#86efac] text-[#166534] text-sm px-4 py-3 rounded-xl">
          {success}
        </div>
      )}

      {/* ── Modo FRENOS ── */}
      {tipoServicio === 'frenos' ? (
        <DiagnosticoFrenosForm
          initial={diagFremos}
          onGuardar={handleGuardarFremos}
        />
      ) : (
        <>
          {/* ── Sección 1: Checklist ── */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-[#374151] uppercase tracking-wide">Checklist</h2>
            {Object.keys(CHECKLIST_DEFAULT).map((secKey) => (
              <ChecklistSection
                key={secKey}
                secKey={secKey}
                items={checklist[secKey] || []}
                onChange={updateChecklist}
                onAddItem={addItem}
              />
            ))}
          </div>

          {/* ── Sección 2: Problemas encontrados ── */}
          <div className="bg-white rounded-xl border border-[#e5e5e5]">
            <div className="bg-[#f9fafb] px-4 py-3 border-b border-[#e5e5e5] rounded-t-xl">
              <span className="text-sm font-semibold text-[#111]">Problemas encontrados</span>
            </div>
            <div className="px-4 py-3">
              {problemas.length === 0 ? (
                <p className="text-xs text-[#9ca3af] py-2">Sin problemas registrados aún.</p>
              ) : (
                <div>
                  {problemas.map((p, idx) => (
                    <ProblemaRow key={idx} problema={p} idx={idx} onChange={updateProblema} onRemove={removeProblema} />
                  ))}
                </div>
              )}
              <button type="button" onClick={addProblema} className="mt-3 text-xs text-[#1d4ed8] hover:underline font-semibold">
                + Agregar problema
              </button>
            </div>
          </div>

          {/* ── Sección 3: Notas del mecánico ── */}
          <div className="bg-white rounded-xl border border-[#e5e5e5]">
            <div className="bg-[#f9fafb] px-4 py-3 border-b border-[#e5e5e5] rounded-t-xl">
              <span className="text-sm font-semibold text-[#111]">Notas del mecánico</span>
            </div>
            <div className="px-4 py-3">
              <textarea
                value={notas} onChange={(e) => setNotas(e.target.value)} rows={4}
                placeholder="Observaciones generales, recomendaciones..."
                className="w-full text-sm text-[#374151] placeholder-[#9ca3af] border border-[#e5e5e5] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1d4ed8] resize-y"
              />
            </div>
          </div>

          {/* ── Botones ── */}
          <div className="flex items-center gap-3 flex-wrap pt-1">
            <button type="button" onClick={handleGuardar} disabled={saving || generando}
              className="bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-semibold">
              {saving ? 'Guardando...' : 'Guardar diagnóstico'}
            </button>
            <button type="button" onClick={handleGenerarCotizacion} disabled={saving || generando}
              className="bg-white hover:bg-[#f9fafb] disabled:opacity-50 border border-[#1d4ed8] text-[#1d4ed8] px-6 py-2.5 rounded-lg text-sm font-semibold">
              {generando ? 'Generando...' : 'Generar cotización'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
