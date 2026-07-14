import { useEffect, useState } from 'react';
import { getCatalogo, crearItem, actualizarItem, eliminarItem } from '../api/catalogo';

const INPUT = 'w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]';
const LABEL = 'text-xs text-[#6b7280] mb-1 block';
const fmtMXN = v => v != null ? `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—';

const TIPOS = [
  {
    codigo: 'cambio_aceite',
    label:  'Cambio de aceite',
    icono:  '🛢️',
    color:  '#f59e0b',
    bg:     '#fffbeb',
    border: '#fde68a',
    desc:   'Siempre incluye aceite, filtro y arandela. Flush opcional.',
  },
  {
    codigo: 'afinacion',
    label:  'Afinación',
    icono:  '🔧',
    color:  '#1d4ed8',
    bg:     '#eff6ff',
    border: '#bfdbfe',
    desc:   'Lavado de cuerpo aceleración, bujías, filtros de aire y cabina. Filtro gasolina si aplica.',
  },
  {
    codigo: 'frenos',
    label:  'Frenos',
    icono:  '🛑',
    color:  '#dc2626',
    bg:     '#fef2f2',
    border: '#fecaca',
    desc:   'Diagnóstico base: desmontaje 4 ruedas, limpieza/ajuste y medición de balatas y discos. Los reemplazos se generan como cotización para aprobación del cliente.',
    flujo:  ['Desmontaje 4 ruedas', 'Limpieza y ajuste', 'Medición balatas y discos', 'Reporte', 'Cotización para aprobación', 'Reparación aprobada'],
  },
  {
    codigo: 'escaneo',
    label:  'Escaneo y diagnóstico',
    icono:  '📡',
    color:  '#059669',
    bg:     '#f0fdf4',
    border: '#bbf7d0',
    desc:   'Escaneo OBD2 y reporte siempre incluidos. Borrado y prueba en carretera opcionales.',
  },
  {
    codigo: 'reparacion',
    label:  'Reparaciones',
    icono:  '⚙️',
    color:  '#7c3aed',
    bg:     '#faf5ff',
    border: '#ddd6fe',
    desc:   'Servicio libre — los conceptos se capturan al crear la orden según el trabajo a realizar.',
  },
];

const UNIDADES = ['pza', 'pzas', 'par', 'L', 'litro', 'servicio', 'km', 'juego'];
const CONFIGURABLES = ['', 'litros', 'piezas'];

const ITEM_VACÍO = {
  nombre: '', descripcion: '', es_opcional: false,
  configurable: '', config_min: '', config_max: '', config_default: '',
  unidad: 'pza', precio_unitario: '', costo_unitario: '', orden: '',
};

/* ── Badge tipo ─────────────────────────────────────────────── */
function Badge({ opcional }) {
  return opcional
    ? <span className="text-[10px] bg-[#f3f4f6] text-[#6b7280] px-2 py-0.5 rounded font-medium">Opcional</span>
    : <span className="text-[10px] bg-[#dcfce7] text-[#166534] px-2 py-0.5 rounded font-medium">Siempre</span>;
}

/* ── Config badge ───────────────────────────────────────────── */
function ConfigBadge({ item }) {
  if (!item.configurable) return <span className="text-[#9ca3af] text-xs">—</span>;
  return (
    <span className="text-xs text-[#1d4ed8] bg-[#eff6ff] px-2 py-0.5 rounded font-mono">
      {item.config_min}–{item.config_max} {item.configurable === 'litros' ? 'L' : 'pzas'}
      {item.config_default ? ` (def. ${item.config_default})` : ''}
    </span>
  );
}

/* ── Formulario inline ──────────────────────────────────────── */
function ItemForm({ tipo, initial, onGuardar, onCancelar }) {
  const [form, setForm] = useState(initial || ITEM_VACÍO);
  const [saving, setSaving] = useState(false);

  const h = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const guardar = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    await onGuardar({ ...form, tipo_servicio: tipo });
    setSaving(false);
  };

  const tieneConfig = !!form.configurable;

  return (
    <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-xl p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className={LABEL}>Nombre del concepto *</label>
          <input name="nombre" value={form.nombre} onChange={h} className={INPUT} placeholder="Ej. Aceite motor" />
        </div>
        <div className="md:col-span-2">
          <label className={LABEL}>Descripción</label>
          <input name="descripcion" value={form.descripcion} onChange={h} className={INPUT} placeholder="Descripción corta (opcional)" />
        </div>
        <div>
          <label className={LABEL}>Precio unitario (MXN)</label>
          <input name="precio_unitario" type="number" step="0.01" min="0" value={form.precio_unitario} onChange={h} className={INPUT} placeholder="0.00" />
        </div>
        <div>
          <label className={LABEL}>Costo unitario (MXN)</label>
          <input name="costo_unitario" type="number" step="0.01" min="0" value={form.costo_unitario} onChange={h} className={INPUT} placeholder="0.00" />
        </div>
        <div>
          <label className={LABEL}>Unidad</label>
          <select name="unidad" value={form.unidad} onChange={h} className={INPUT}>
            {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Orden</label>
          <input name="orden" type="number" min="0" value={form.orden} onChange={h} className={INPUT} placeholder="0" />
        </div>
        <div>
          <label className={LABEL}>Cantidad configurable</label>
          <select name="configurable" value={form.configurable} onChange={h} className={INPUT}>
            <option value="">Cantidad fija</option>
            <option value="litros">Por litros (aceite)</option>
            <option value="piezas">Por piezas (bujías, etc.)</option>
          </select>
        </div>
        {tieneConfig && (
          <>
            <div className="grid grid-cols-3 gap-2 md:col-span-2">
              <div>
                <label className={LABEL}>Mín.</label>
                <input name="config_min" type="number" min="1" value={form.config_min} onChange={h} className={INPUT} placeholder="3" />
              </div>
              <div>
                <label className={LABEL}>Máx.</label>
                <input name="config_max" type="number" min="1" value={form.config_max} onChange={h} className={INPUT} placeholder="8" />
              </div>
              <div>
                <label className={LABEL}>Defecto</label>
                <input name="config_default" type="number" min="1" value={form.config_default} onChange={h} className={INPUT} placeholder="4" />
              </div>
            </div>
          </>
        )}
        <div className="md:col-span-2 flex items-center gap-2">
          <input type="checkbox" id="es_opcional" name="es_opcional"
            checked={!!form.es_opcional} onChange={h}
            className="w-4 h-4 accent-[#1d4ed8]" />
          <label htmlFor="es_opcional" className="text-sm text-[#374151]">
            Ítem opcional (se añade según el diagnóstico, no siempre incluido)
          </label>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={guardar} disabled={saving || !form.nombre.trim()}
          className="bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button onClick={onCancelar}
          className="bg-white border border-[#e5e5e5] text-[#374151] px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* ── Tabla de ítems por servicio ────────────────────────────── */
function TablaServicio({ tipo, items, onRecargar }) {
  const [modoNuevo, setModoNuevo] = useState(false);
  const [editId, setEditId]       = useState(null);

  const handleGuardar = async (data) => {
    if (editId) {
      await actualizarItem(editId, data);
      setEditId(null);
    } else {
      await crearItem(data);
      setModoNuevo(false);
    }
    onRecargar();
  };

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar este concepto del catálogo?')) return;
    await eliminarItem(id);
    onRecargar();
  };

  const fijarItem = (item) => ({
    nombre: item.nombre, descripcion: item.descripcion || '',
    es_opcional: !!item.es_opcional,
    configurable: item.configurable || '',
    config_min: item.config_min ?? '', config_max: item.config_max ?? '',
    config_default: item.config_default ?? '',
    unidad: item.unidad || 'pza',
    precio_unitario: item.precio_unitario ?? '',
    costo_unitario:  item.costo_unitario ?? '',
    orden: item.orden ?? '',
  });

  const esFrenos = tipo.codigo === 'frenos';

  if (tipo.codigo === 'reparacion') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
        <span className="text-4xl">⚙️</span>
        <p className="text-sm font-semibold text-[#374151]">Servicio libre</p>
        <p className="text-xs text-[#9ca3af] max-w-xs">
          Las reparaciones no tienen un listado fijo de conceptos. Los ítems se capturan directamente
          al crear la orden de trabajo según el diagnóstico y la labor requerida.
        </p>
      </div>
    );
  }

  const fijos    = items.filter(i => !i.es_opcional);
  const opcionales = items.filter(i => i.es_opcional);

  return (
    <div className="space-y-4">
      {/* Flujo de frenos */}
      {esFrenos && tipo.flujo && (
        <div className="flex flex-wrap items-center gap-1">
          {tipo.flujo.map((paso, idx) => (
            <div key={paso} className="flex items-center gap-1">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                idx < 4 ? 'bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]'
                : idx === 4 ? 'bg-[#fef9c3] text-[#854d0e] border border-[#fde68a]'
                : 'bg-[#dcfce7] text-[#166534] border border-[#bbf7d0]'
              }`}>{paso}</span>
              {idx < tipo.flujo.length - 1 && <span className="text-[#d1d5db] text-xs">→</span>}
            </div>
          ))}
        </div>
      )}

      {/* Resumen de lo que siempre incluye */}
      {!esFrenos && (
        <div className="flex flex-wrap gap-2">
          {fijos.map(i => (
            <span key={i.id} className="flex items-center gap-1 text-xs bg-[#dcfce7] text-[#166534] px-3 py-1 rounded-full font-medium">
              ✓ {i.nombre}{i.configurable ? ` (${i.config_min}–${i.config_max} ${i.configurable === 'litros' ? 'L' : 'pzas'})` : ''}
            </span>
          ))}
          {opcionales.map(i => (
            <span key={i.id} className="flex items-center gap-1 text-xs bg-[#f3f4f6] text-[#6b7280] px-3 py-1 rounded-full">
              + {i.nombre}
            </span>
          ))}
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-[#e5e5e5]">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#111' }}>
              {['Concepto','Descripción','Configurable','Precio unit.','Costo unit.','Tipo',''].map((h, i) => (
                <th key={i} className={`text-[#9ca3af] text-[10px] font-semibold uppercase tracking-wider px-4 py-3 ${i >= 3 && i <= 4 ? 'text-right' : 'text-left'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f3f4f6]">
            {items.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#9ca3af]">Sin conceptos en este servicio</td></tr>
            )}
            {(() => {
              const rows = [];
              let separadorOpcionalMostrado = false;
              if (esFrenos && fijos.length > 0) {
                rows.push(
                  <tr key="sep-diag">
                    <td colSpan={7} className="px-4 py-2 bg-[#fef2f2]">
                      <span className="text-[10px] font-bold text-[#dc2626] uppercase tracking-wider">Diagnóstico base — siempre incluido</span>
                    </td>
                  </tr>
                );
              }
              items.forEach((item, idx) => {
                if (esFrenos && item.es_opcional && !separadorOpcionalMostrado) {
                  separadorOpcionalMostrado = true;
                  rows.push(
                    <tr key="sep-cotiz">
                      <td colSpan={7} className="px-4 py-2 bg-[#fef9c3]">
                        <span className="text-[10px] font-bold text-[#854d0e] uppercase tracking-wider">
                          Reemplazos según diagnóstico → generan cotización para aprobación del cliente
                        </span>
                      </td>
                    </tr>
                  );
                }
                rows.push(editId === item.id ? (
                  <tr key={item.id}>
                    <td colSpan={7} className="px-4 py-3">
                      <ItemForm tipo={tipo.codigo} initial={fijarItem(item)} onGuardar={handleGuardar} onCancelar={() => setEditId(null)} />
                    </td>
                  </tr>
                ) : (
                  <tr key={item.id} className={`hover:bg-[#fafafa] transition-colors ${idx % 2 === 1 ? 'bg-[#fafafa]' : 'bg-white'}`}>
                    <td className="px-4 py-3 font-semibold text-[#111]">{item.nombre}</td>
                    <td className="px-4 py-3 text-[#6b7280] text-xs max-w-[200px]">{item.descripcion || '—'}</td>
                    <td className="px-4 py-3"><ConfigBadge item={item} /></td>
                    <td className="px-4 py-3 text-right font-semibold text-[#1d4ed8]">
                      {fmtMXN(item.precio_unitario)}
                      {item.unidad && <span className="text-[10px] text-[#9ca3af] ml-1">/{item.unidad}</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-[#6b7280]">{fmtMXN(item.costo_unitario)}</td>
                    <td className="px-4 py-3"><Badge opcional={item.es_opcional} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditId(item.id)}
                          className="bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] px-3 py-1 rounded text-xs hover:bg-[#dbeafe]">
                          Editar
                        </button>
                        <button onClick={() => handleEliminar(item.id)}
                          className="bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] px-3 py-1 rounded text-xs hover:bg-[#fee2e2]">
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ));
              });
              return rows;
            })()}
          </tbody>
        </table>
      </div>

      {/* Agregar nuevo */}
      {modoNuevo ? (
        <ItemForm
          tipo={tipo.codigo}
          onGuardar={handleGuardar}
          onCancelar={() => setModoNuevo(false)}
        />
      ) : (
        <button onClick={() => setModoNuevo(true)}
          className="flex items-center gap-2 text-sm text-[#1d4ed8] hover:underline font-medium">
          <span>+</span> Agregar concepto
        </button>
      )}
    </div>
  );
}

/* ── Página principal ───────────────────────────────────────── */
export default function PaquetesPage() {
  const [items, setItems]     = useState([]);
  const [tabActual, setTab]   = useState('cambio_aceite');

  const cargar = () => getCatalogo().then(setItems);
  useEffect(() => { cargar(); }, []);

  const tipoActual  = TIPOS.find(t => t.codigo === tabActual);
  const itemsActuales = items
    .filter(i => i.tipo_servicio === tabActual)
    .sort((a, b) => a.orden - b.orden || a.id - b.id);

  const countPorTipo = (cod) => items.filter(i => i.tipo_servicio === cod).length;

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-base font-bold text-[#111]">Catálogo de servicios</h1>
        <p className="text-xs text-[#9ca3af] mt-0.5">Conceptos y precios por tipo de servicio</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TIPOS.map(t => {
          const activo = tabActual === t.codigo;
          const n = countPorTipo(t.codigo);
          return (
            <button
              key={t.codigo}
              onClick={() => setTab(t.codigo)}
              style={activo ? { background: t.color, borderColor: t.color } : {}}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all
                ${activo
                  ? 'text-white shadow-sm'
                  : 'bg-white border-[#e5e5e5] text-[#374151] hover:border-[#d1d5db] hover:bg-[#fafafa]'
                }`}
            >
              <span>{t.icono}</span>
              <span>{t.label}</span>
              {n > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
                  ${activo ? 'bg-white/20 text-white' : 'bg-[#f3f4f6] text-[#6b7280]'}`}>
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Panel del tipo seleccionado */}
      {tipoActual && (
        <div className="bg-white rounded-xl border border-[#e5e5e5] overflow-hidden">
          {/* Cabecera del servicio */}
          <div className="px-5 py-4 border-b border-[#f3f4f6]" style={{ background: tipoActual.bg, borderBottomColor: tipoActual.border }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{tipoActual.icono}</span>
              <div>
                <h2 className="text-sm font-bold" style={{ color: tipoActual.color }}>{tipoActual.label}</h2>
                <p className="text-xs text-[#6b7280] mt-0.5">{tipoActual.desc}</p>
              </div>
            </div>
          </div>

          {/* Contenido */}
          <div className="p-5">
            <TablaServicio
              key={tabActual}
              tipo={tipoActual}
              items={itemsActuales}
              onRecargar={cargar}
            />
          </div>
        </div>
      )}
    </div>
  );
}
