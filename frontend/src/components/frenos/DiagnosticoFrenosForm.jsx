import { useState } from 'react';

/* ── Umbrales de referencia ─────────────────────────────────── */
const BALATA_UMBRALES = { cambio: 3, desgaste: 6 }; // mm

const estadoBalata = (mm) => {
  if (mm === '' || mm === null || mm === undefined) return null;
  const v = parseFloat(mm);
  if (isNaN(v)) return null;
  if (v <= BALATA_UMBRALES.cambio)   return 'cambio';
  if (v <= BALATA_UMBRALES.desgaste) return 'desgaste';
  return 'ok';
};

const ESTADO_COLORS = {
  ok:       { bg: '#f0fdf4', border: '#86efac', text: '#166534', label: '✓ OK' },
  desgaste: { bg: '#fef9c3', border: '#fde68a', text: '#854d0e', label: '⚠ Desgaste' },
  cambio:   { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', label: '🔴 Cambio requerido' },
};

const EST_OPTIONS = ['ok', 'desgaste', 'cambio'];

/* ── Chip selector de estado ────────────────────────────────── */
function EstadoChips({ value, onChange }) {
  return (
    <div className="flex gap-1 flex-wrap mt-1">
      {EST_OPTIONS.map(opt => {
        const c = ESTADO_COLORS[opt];
        const activo = value === opt;
        return (
          <button key={opt} type="button" onClick={() => onChange(opt)}
            style={activo ? { background: c.bg, borderColor: c.border, color: c.text } : {}}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-all
              ${activo ? '' : 'bg-white border-[#e5e5e5] text-[#9ca3af] hover:border-[#d1d5db]'}`}>
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Tarjeta de una rueda ───────────────────────────────────── */
function RuedaCard({ pos, label, data, onChange }) {
  const bEst = estadoBalata(data[`${pos}_balata_mm`]);
  const bColor = bEst ? ESTADO_COLORS[bEst] : null;
  const estActual = data[`${pos}_balata_est`] || 'ok';
  const discEstActual = data[`${pos}_disco_est`] || 'ok';
  const discColor = ESTADO_COLORS[discEstActual];

  const set = (field, val) => onChange({ [`${pos}_${field}`]: val });

  return (
    <div className="bg-white border border-[#e5e5e5] rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-lg">🛞</span>
        <p className="text-sm font-bold text-[#111]">{label}</p>
      </div>

      {/* Balata */}
      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider">Balata</p>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="number" step="0.1" min="0" max="30"
              value={data[`${pos}_balata_mm`] ?? ''}
              onChange={e => {
                const v = e.target.value;
                set('balata_mm', v);
                const autoEst = estadoBalata(v);
                if (autoEst) set('balata_est', autoEst);
              }}
              placeholder="mm"
              className="w-20 border border-[#e5e5e5] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] pr-7"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#9ca3af]">mm</span>
          </div>
          {bColor && (
            <span style={{ background: bColor.bg, color: bColor.text, borderColor: bColor.border }}
              className="text-[10px] font-bold px-2 py-0.5 rounded border">
              {bColor.label}
            </span>
          )}
        </div>
        <EstadoChips value={estActual} onChange={v => set('balata_est', v)} />
      </div>

      {/* Disco */}
      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider">Disco</p>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="number" step="0.1" min="0" max="40"
              value={data[`${pos}_disco_mm`] ?? ''}
              onChange={e => set('disco_mm', e.target.value)}
              placeholder="mm"
              className="w-20 border border-[#e5e5e5] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] pr-7"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#9ca3af]">mm</span>
          </div>
        </div>
        <EstadoChips value={discEstActual} onChange={v => set('disco_est', v)} />
      </div>
    </div>
  );
}

/* ── Calcular ítems para cotizar ────────────────────────────── */
export function calcularItemsFremos(d) {
  const items = [];
  if (!d) return items;

  const delBal = d.di_balata_est === 'cambio' || d.dd_balata_est === 'cambio';
  const trasBal = d.ti_balata_est === 'cambio' || d.td_balata_est === 'cambio';
  const delDisc = d.di_disco_est === 'cambio' || d.dd_disco_est === 'cambio';
  const trasDisc = d.ti_disco_est === 'cambio' || d.td_disco_est === 'cambio';
  const liquido = d.liq_nivel !== 'ok' || d.liq_estado !== 'ok';

  if (delBal)  items.push({ descripcion: 'Balatas delanteras', cantidad: 1, tipo: 'balatas_del' });
  if (trasBal) items.push({ descripcion: 'Balatas traseras',   cantidad: 1, tipo: 'balatas_tras' });
  if (delDisc) items.push({ descripcion: 'Discos delanteros',  cantidad: 1, tipo: 'discos_del' });
  if (trasDisc)items.push({ descripcion: 'Discos traseros',    cantidad: 1, tipo: 'discos_tras' });
  if (liquido) {
    items.push({ descripcion: 'Líquido de frenos DOT 4', cantidad: 1, tipo: 'liquido' });
    items.push({ descripcion: 'Purga del sistema de frenos', cantidad: 1, tipo: 'purga' });
  }
  return items;
}

/* ── Formulario principal ───────────────────────────────────── */
const VACÍO = {
  di_balata_mm: '', di_disco_mm: '', di_balata_est: 'ok', di_disco_est: 'ok',
  dd_balata_mm: '', dd_disco_mm: '', dd_balata_est: 'ok', dd_disco_est: 'ok',
  ti_balata_mm: '', ti_disco_mm: '', ti_balata_est: 'ok', ti_disco_est: 'ok',
  td_balata_mm: '', td_disco_mm: '', td_balata_est: 'ok', td_disco_est: 'ok',
  liq_nivel: 'ok', liq_estado: 'ok', notas: '',
};

export default function DiagnosticoFrenosForm({ initial, onGuardar, onCancelar }) {
  const [data, setData] = useState(() => ({ ...VACÍO, ...(initial || {}) }));
  const [saving, setSaving] = useState(false);

  const merge = (partial) => setData(d => ({ ...d, ...partial }));

  const itemsCotizar = calcularItemsFremos(data);

  const handleGuardar = async (irCotizacion = false) => {
    setSaving(true);
    await onGuardar(data, irCotizacion);
    setSaving(false);
  };

  const LIQ_NIVEL  = ['ok', 'bajo', 'muy_bajo'];
  const LIQ_ESTADO = ['ok', 'contaminado', 'humedad'];
  const LIQ_LABELS = { ok: '✓ OK', bajo: '⚠ Bajo', muy_bajo: '🔴 Muy bajo', contaminado: '⚠ Contaminado', humedad: '🔴 Con humedad' };

  return (
    <div className="space-y-6">

      {/* ── Banner flujo ── */}
      <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl px-4 py-3 flex items-start gap-3">
        <span className="text-xl shrink-0">🛑</span>
        <div>
          <p className="text-sm font-semibold text-[#dc2626]">Diagnóstico de frenos</p>
          <p className="text-xs text-[#9ca3af] mt-0.5">
            Registra las medidas. Los componentes marcados como "Cambio requerido" se generarán
            automáticamente en la cotización para aprobación del cliente.
          </p>
        </div>
      </div>

      {/* ── 4 ruedas ── */}
      <div>
        <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">Medición por posición</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <RuedaCard pos="di" label="Delantera izquierda" data={data} onChange={merge} />
          <RuedaCard pos="dd" label="Delantera derecha"   data={data} onChange={merge} />
          <RuedaCard pos="ti" label="Trasera izquierda"   data={data} onChange={merge} />
          <RuedaCard pos="td" label="Trasera derecha"     data={data} onChange={merge} />
        </div>
      </div>

      {/* ── Líquido de frenos ── */}
      <div className="bg-white border border-[#e5e5e5] rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">Líquido de frenos</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-[#9ca3af] mb-1">Nivel</p>
            <div className="flex gap-2 flex-wrap">
              {LIQ_NIVEL.map(v => (
                <button key={v} type="button" onClick={() => merge({ liq_nivel: v })}
                  className={`text-xs px-3 py-1 rounded border font-medium transition-all
                    ${data.liq_nivel === v
                      ? v === 'ok' ? 'bg-[#f0fdf4] border-[#86efac] text-[#166534]'
                        : v === 'bajo' ? 'bg-[#fef9c3] border-[#fde68a] text-[#854d0e]'
                        : 'bg-[#fef2f2] border-[#fecaca] text-[#dc2626]'
                      : 'bg-white border-[#e5e5e5] text-[#9ca3af] hover:border-[#d1d5db]'}`}>
                  {LIQ_LABELS[v]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-[#9ca3af] mb-1">Condición</p>
            <div className="flex gap-2 flex-wrap">
              {LIQ_ESTADO.map(v => (
                <button key={v} type="button" onClick={() => merge({ liq_estado: v })}
                  className={`text-xs px-3 py-1 rounded border font-medium transition-all
                    ${data.liq_estado === v
                      ? v === 'ok' ? 'bg-[#f0fdf4] border-[#86efac] text-[#166534]'
                        : v === 'contaminado' ? 'bg-[#fef9c3] border-[#fde68a] text-[#854d0e]'
                        : 'bg-[#fef2f2] border-[#fecaca] text-[#dc2626]'
                      : 'bg-white border-[#e5e5e5] text-[#9ca3af] hover:border-[#d1d5db]'}`}>
                  {LIQ_LABELS[v]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Notas ── */}
      <div>
        <label className="text-xs text-[#6b7280] mb-1 block">Notas adicionales</label>
        <textarea
          value={data.notas} rows={2}
          onChange={e => merge({ notas: e.target.value })}
          placeholder="Observaciones, condición visual, ruidos, etc."
          className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] resize-none"
        />
      </div>

      {/* ── Resumen de ítems para cotización ── */}
      <div className={`rounded-xl border p-4 ${itemsCotizar.length > 0
        ? 'bg-[#fef9c3] border-[#fde68a]' : 'bg-[#f0fdf4] border-[#bbf7d0]'}`}>
        <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${itemsCotizar.length > 0 ? 'text-[#854d0e]' : 'text-[#166534]'}`}>
          {itemsCotizar.length > 0
            ? `${itemsCotizar.length} ítem${itemsCotizar.length !== 1 ? 's' : ''} para cotizar`
            : 'Sin reemplazos — todo en buen estado'}
        </p>
        {itemsCotizar.length > 0 ? (
          <ul className="space-y-1">
            {itemsCotizar.map(i => (
              <li key={i.tipo} className="flex items-center gap-2 text-sm text-[#854d0e]">
                <span className="text-[#f59e0b]">→</span> {i.descripcion}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-[#166534]">Frenos en buen estado. Se puede cerrar o guardar el diagnóstico.</p>
        )}
      </div>

      {/* ── Botones ── */}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => handleGuardar(false)} disabled={saving}
          className="bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold">
          {saving ? 'Guardando…' : 'Guardar diagnóstico'}
        </button>
        {itemsCotizar.length > 0 && (
          <button type="button" onClick={() => handleGuardar(true)} disabled={saving}
            className="bg-[#dc2626] hover:bg-[#b91c1c] disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold">
            {saving ? '…' : `Generar cotización (${itemsCotizar.length} ítems)`}
          </button>
        )}
        {onCancelar && (
          <button type="button" onClick={onCancelar}
            className="bg-white border border-[#e5e5e5] text-[#374151] px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
