import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getOrden, updateOrdenEstatus, updateOrdenTipoFlujo } from '../api/ordenes';
import { getChecklist, addChecklistItem, toggleChecklistItem, deleteChecklistItem } from '../api/checklist';
import { getProgresos, addProgreso, deleteProgreso } from '../api/progresos';
import { getGastos, addGasto, deleteGasto } from '../api/gastos';

const ESTADOS_TALLER = ['en_taller', 'pausado_consulta', 'listo_entrega', 'en_cierre', 'entregado'];
const fmtMonto = n => Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 });

const ESTATUS_STYLE = {
  en_cotizacion:    { bg: '#eff6ff', text: '#1d4ed8',  label: 'En cotización' },
  recepcion:            { bg: '#f3f4f6', text: '#374151',  label: 'Recepción' },
  diagnostico:          { bg: '#fef3c7', text: '#92400e',  label: 'Diagnóstico' },
  cotizacion_pendiente: { bg: '#eff6ff', text: '#1d4ed8',  label: 'Cotización pendiente' },
  cotizacion_enviada:   { bg: '#dbeafe', text: '#1e40af',  label: 'Cotización enviada' },
  aprobada:             { bg: '#dcfce7', text: '#166534',  label: 'Aprobada' },
  unidad_recibida:  { bg: '#e0f2fe', text: '#0369a1',  label: 'Unidad recibida' },
  rechazada:            { bg: '#fef2f2', text: '#dc2626',  label: 'Rechazada' },
  en_taller:            { bg: '#fef3c7', text: '#d97706',  label: 'En taller' },
  pausado_consulta: { bg: '#fef2f2', text: '#dc2626',  label: 'Consulta cliente' },
  listo_entrega:        { bg: '#dcfce7', text: '#059669',  label: 'Listo para entrega' },
  en_cierre:        { bg: '#f5f3ff', text: '#7c3aed',  label: 'En cierre' },
  entregado:            { bg: '#f3f4f6', text: '#6b7280',  label: 'Entregado' },
};

const PROGRESO = [
  { key: 'en_cotizacion',    label: 'En cotización' },
  { key: 'recepcion',            label: 'Recepción' },
  { key: 'diagnostico',          label: 'Diagnóstico' },
  { key: 'cotizacion_pendiente', label: 'Cotiz. Pendiente' },
  { key: 'cotizacion_enviada',   label: 'Cotiz. Enviada' },
  { key: 'aprobada',             label: 'Aprobada' },
  { key: 'unidad_recibida',  label: 'Unidad recibida' },
  { key: 'en_taller',            label: 'En taller' },
  { key: 'pausado_consulta', label: 'Consulta cliente' },
  { key: 'listo_entrega',        label: 'Listo' },
  { key: 'en_cierre',        label: 'En cierre' },
  { key: 'entregado',            label: 'Entregado' },
];

const EstatusBadge = ({ estatus }) => {
  const s = ESTATUS_STYLE[estatus] || { bg: '#f3f4f6', text: '#374151', label: estatus };
  return (
    <span
      style={{ background: s.bg, color: s.text }}
      className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
    >
      {s.label}
    </span>
  );
};

const fmtFecha = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

/* ── Checklist del trabajo realizado ──────────────────────────── */
function ChecklistSection({ ordenId }) {
  const [items, setItems] = useState([]);
  const [nuevo, setNuevo] = useState('');

  const cargar = () => getChecklist(ordenId).then(r => setItems(r.data?.data ?? []));
  useEffect(() => { cargar(); }, [ordenId]);

  const agregar = async () => {
    if (!nuevo.trim()) return;
    await addChecklistItem(ordenId, nuevo);
    setNuevo(''); cargar();
  };

  const toggle = async (it) => {
    await toggleChecklistItem(ordenId, it.id, !it.hecho);
    cargar();
  };

  const borrar = async (it) => {
    await deleteChecklistItem(ordenId, it.id);
    cargar();
  };

  const hechos = items.filter(i => i.hecho).length;

  return (
    <div className="bg-white rounded-xl border border-[#e5e5e5] p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-semibold">Checklist del trabajo</p>
        {items.length > 0 && (
          <span className={`text-xs font-semibold ${hechos === items.length ? 'text-[#059669]' : 'text-[#6b7280]'}`}>
            {hechos}/{items.length} completado{hechos !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {items.length === 0 && (
        <p className="text-sm text-[#9ca3af] mb-3">Sin items — agrega los trabajos a realizar</p>
      )}

      <div className="space-y-1.5 mb-3">
        {items.map(it => (
          <div key={it.id} className="flex items-center gap-3 group">
            <input type="checkbox" checked={!!it.hecho} onChange={() => toggle(it)}
              className="w-4 h-4 accent-[#059669] cursor-pointer shrink-0" />
            <span className={`text-sm flex-1 ${it.hecho ? 'line-through text-[#9ca3af]' : 'text-[#111]'}`}>
              {it.descripcion}
            </span>
            <button onClick={() => borrar(it)}
              className="text-[#dc2626] text-xs opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input value={nuevo} onChange={e => setNuevo(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && agregar()}
          placeholder="Agregar trabajo… (Enter)"
          className="flex-1 border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" />
        <button onClick={agregar}
          className="bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#dbeafe]">
          Agregar
        </button>
      </div>
    </div>
  );
}

const InfoRow = ({ label, value }) => (
  <div>
    <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-semibold mb-0.5">{label}</p>
    <p className="text-sm text-[#111] font-medium">{value || '—'}</p>
  </div>
);

export default function OrdenDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Progreso y gastos F3
  const [progresos, setProgresos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [totalGastos, setTotalGastos] = useState(0);
  const [nuevoProgreso, setNuevoProgreso] = useState('');
  const [nuevoGasto, setNuevoGasto] = useState({ descripcion: '', monto: '', tipo: 'refaccion' });
  const [guardandoProg, setGuardandoProg] = useState(false);
  const [guardandoGasto, setGuardandoGasto] = useState(false);

  const cargar = () => {
    setLoading(true);
    getOrden(id)
      .then(data => {
        const o = data.data?.data ?? data.data;
        setOrden(o);
        if (ESTADOS_TALLER.includes(o?.estatus)) {
          getProgresos(id).then(r => setProgresos(r.data?.data ?? [])).catch(() => {});
          getGastos(id).then(r => { setGastos(r.data?.data ?? []); setTotalGastos(r.data?.total ?? 0); }).catch(() => {});
        }
      })
      .catch(() => setError('No se pudo cargar la orden'))
      .finally(() => setLoading(false));
  };

  const handleAddProgreso = async () => {
    if (!nuevoProgreso.trim()) return;
    setGuardandoProg(true);
    try {
      await addProgreso(id, nuevoProgreso.trim());
      setNuevoProgreso('');
      const r = await getProgresos(id);
      setProgresos(r.data?.data ?? []);
    } finally { setGuardandoProg(false); }
  };

  const handleDeleteProgreso = async (progId) => {
    await deleteProgreso(id, progId);
    const r = await getProgresos(id);
    setProgresos(r.data?.data ?? []);
  };

  const handleAddGasto = async () => {
    if (!nuevoGasto.descripcion.trim() || !nuevoGasto.monto) return;
    setGuardandoGasto(true);
    try {
      await addGasto(id, { descripcion: nuevoGasto.descripcion.trim(), monto: Number(nuevoGasto.monto), tipo: nuevoGasto.tipo });
      setNuevoGasto({ descripcion: '', monto: '', tipo: 'refaccion' });
      const r = await getGastos(id);
      setGastos(r.data?.data ?? []);
      setTotalGastos(r.data?.total ?? 0);
    } finally { setGuardandoGasto(false); }
  };

  const handleDeleteGasto = async (gastoId) => {
    await deleteGasto(id, gastoId);
    const r = await getGastos(id);
    setGastos(r.data?.data ?? []);
    setTotalGastos(r.data?.total ?? 0);
  };

  const handleConvertirF3 = async () => {
    if (!confirm('¿Convertir esta orden a Flujo 3 (reparación progresiva)? Se habilitará el registro de gastos en tiempo real.')) return;
    setSaving(true);
    try {
      await updateOrdenTipoFlujo(id, 'flujo_3');
      await cargar();
    } catch { setError('Error al convertir a Flujo 3'); }
    finally { setSaving(false); }
  };

  useEffect(() => { cargar(); }, [id]);

  const avanzarEstatus = async (nuevoEstatus) => {
    setSaving(true);
    try {
      await updateOrdenEstatus(id, nuevoEstatus);
      await cargar();
    } catch {
      setError('Error al actualizar el estatus');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#9ca3af]">Cargando...</div>
    );
  }

  if (error || !orden) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(-1)} className="text-sm text-[#1d4ed8] hover:underline">← Volver</button>
        <p className="text-[#dc2626]">{error || 'Orden no encontrada'}</p>
      </div>
    );
  }

  const estatusActual = orden.estatus;
  const idxActual = PROGRESO.findIndex(p => p.key === estatusActual);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-[#6b7280] hover:text-[#111] transition-colors"
            aria-label="Volver"
          >
            ←
          </button>
          <h1 className="text-base font-bold text-[#111]">Orden #{orden.id}</h1>
          <EstatusBadge estatus={estatusActual} />
        </div>
        <Link
          to="/ordenes"
          className="text-sm text-[#1d4ed8] hover:underline"
        >
          Ver todas las OT
        </Link>
      </div>

      {/* Barra de progreso */}
      <div className="bg-white rounded-xl border border-[#e5e5e5] p-4">
        <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-semibold mb-3">Progreso</p>
        <div className="flex items-center gap-0 overflow-x-auto pb-1">
          {PROGRESO.map((paso, idx) => {
            const isPast    = idx < idxActual;
            const isCurrent = idx === idxActual;
            const isFuture  = idx > idxActual;
            const isLast    = idx === PROGRESO.length - 1;

            let dotBg = '#e5e7eb';       // futuro: gris
            let dotBorder = '#d1d5db';
            let labelColor = '#9ca3af';
            if (isPast)    { dotBg = '#16a34a'; dotBorder = '#15803d'; labelColor = '#16a34a'; }
            if (isCurrent) { dotBg = '#1d4ed8'; dotBorder = '#1e40af'; labelColor = '#1d4ed8'; }

            return (
              <div key={paso.key} className="flex items-center flex-shrink-0">
                <div className="flex flex-col items-center">
                  <div
                    style={{ background: dotBg, borderColor: dotBorder, width: 20, height: 20 }}
                    className="rounded-full border-2 flex items-center justify-center"
                  >
                    {isPast && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {isCurrent && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />
                    )}
                  </div>
                  <span
                    style={{ color: labelColor }}
                    className="text-[9px] font-semibold mt-1 text-center max-w-14 leading-tight"
                  >
                    {paso.label}
                  </span>
                </div>
                {!isLast && (
                  <div
                    style={{ background: isPast ? '#16a34a' : '#e5e7eb', height: 2, width: 24, marginBottom: 14 }}
                    className="flex-shrink-0"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Datos de la OT */}
      <div className="bg-white rounded-xl border border-[#e5e5e5] p-5">
        <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-semibold mb-4">Datos del vehículo y servicio</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <InfoRow label="Placa" value={orden.placa} />
          <InfoRow label="Marca / Modelo" value={[orden.marca, orden.modelo].filter(Boolean).join(' ') || '—'} />
          <InfoRow label="Año" value={orden.anio} />
          <InfoRow label="Odómetro" value={orden.odometro ? `${Number(orden.odometro).toLocaleString('es-MX')} km` : null} />
          <InfoRow label="Cliente" value={orden.cliente_nombre} />
          <InfoRow label="Teléfono" value={orden.cliente_telefono} />
          <InfoRow label="Fecha recepción" value={fmtFecha(orden.fecha_recepcion)} />
          <InfoRow label="Entrega estimada" value={fmtFecha(orden.fecha_entrega_estimada)} />
        </div>
        {orden.notas && (
          <div className="mt-4 pt-4 border-t border-[#f3f4f6]">
            <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-semibold mb-1">Notas</p>
            <p className="text-sm text-[#374151] whitespace-pre-wrap">{orden.notas}</p>
          </div>
        )}
      </div>

      {/* Checklist del trabajo realizado */}
      <ChecklistSection ordenId={id} />

      {/* Bitácora de progreso */}
      {ESTADOS_TALLER.includes(estatusActual) && (
        <div className="bg-white rounded-xl border border-[#e5e5e5] p-5 space-y-4">
          <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-semibold">Bitácora de progreso</p>

          {progresos.length === 0 && (
            <p className="text-sm text-[#9ca3af]">Sin registros de progreso aún.</p>
          )}
          <div className="space-y-2">
            {progresos.map(p => (
              <div key={p.id} className="flex items-start gap-3 bg-[#f9fafb] rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#111]">{p.descripcion}</p>
                  <p className="text-[10px] text-[#9ca3af] mt-0.5">
                    {new Date(p.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {estatusActual === 'en_taller' && (
                  <button onClick={() => handleDeleteProgreso(p.id)} className="text-[#dc2626] text-xs hover:text-red-700 shrink-0">✕</button>
                )}
              </div>
            ))}
          </div>

          {estatusActual === 'en_taller' && (
            <div className="flex gap-2">
              <input
                value={nuevoProgreso}
                onChange={e => setNuevoProgreso(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddProgreso()}
                placeholder="Ej: Cambio de aceite completado, esperando refacción..."
                className="flex-1 border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]"
              />
              <button
                onClick={handleAddProgreso}
                disabled={guardandoProg || !nuevoProgreso.trim()}
                className="bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold"
              >
                + Agregar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Gastos progresivos — solo Flujo 3 */}
      {orden?.tipo_flujo === 'flujo_3' && ESTADOS_TALLER.includes(estatusActual) && (
        <div className="bg-white rounded-xl border border-[#fed7aa] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-[#c2410c] uppercase tracking-wider font-semibold">Gastos progresivos (Flujo 3)</p>
            <span className="text-sm font-bold text-[#111]">Total: ${fmtMonto(totalGastos)}</span>
          </div>

          {gastos.length === 0 && <p className="text-sm text-[#9ca3af]">Sin gastos registrados.</p>}
          <div className="space-y-2">
            {gastos.map(g => (
              <div key={g.id} className="flex items-center gap-3 bg-[#fff7ed] rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#111]">{g.descripcion}</p>
                  <span className="text-[10px] text-[#9ca3af]">
                    {g.tipo === 'refaccion' ? 'Refacción' : g.tipo === 'mano_obra' ? 'Mano de obra' : 'Otro'}
                  </span>
                </div>
                <span className="text-sm font-bold text-[#c2410c] shrink-0">${fmtMonto(g.monto)}</span>
                {estatusActual === 'en_taller' && (
                  <button onClick={() => handleDeleteGasto(g.id)} className="text-[#dc2626] text-xs shrink-0">✕</button>
                )}
              </div>
            ))}
          </div>

          {estatusActual === 'en_taller' && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                value={nuevoGasto.descripcion}
                onChange={e => setNuevoGasto(g => ({ ...g, descripcion: e.target.value }))}
                placeholder="Descripción"
                className="sm:col-span-2 border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c2410c]"
              />
              <input
                type="number"
                value={nuevoGasto.monto}
                onChange={e => setNuevoGasto(g => ({ ...g, monto: e.target.value }))}
                placeholder="Monto $"
                className="border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c2410c]"
              />
              <select
                value={nuevoGasto.tipo}
                onChange={e => setNuevoGasto(g => ({ ...g, tipo: e.target.value }))}
                className="border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                <option value="refaccion">Refacción</option>
                <option value="mano_obra">Mano de obra</option>
                <option value="otro">Otro</option>
              </select>
              <button
                onClick={handleAddGasto}
                disabled={guardandoGasto || !nuevoGasto.descripcion.trim() || !nuevoGasto.monto}
                className="sm:col-span-4 bg-[#c2410c] hover:bg-[#9a3412] disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold"
              >
                + Agregar gasto
              </button>
            </div>
          )}
        </div>
      )}

      {/* Acciones según estatus */}
      <div className="bg-white rounded-xl border border-[#e5e5e5] p-5">
        <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-semibold mb-4">Acciones</p>

        {error && (
          <p className="text-sm text-[#dc2626] mb-3">{error}</p>
        )}

        {estatusActual === 'recepcion' && (
          <Link
            to={`/ordenes/${id}/diagnostico`}
            className="inline-block bg-[#1d4ed8] hover:bg-[#1e40af] text-white px-5 py-2 rounded-lg text-sm font-semibold"
          >
            Ir a diagnóstico
          </Link>
        )}

        {estatusActual === 'diagnostico' && (
          <Link
            to={`/ordenes/${id}/diagnostico`}
            className="inline-block bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#dbeafe]"
          >
            Ver diagnóstico
          </Link>
        )}

        {estatusActual === 'cotizacion_pendiente' && (
          <Link
            to={`/ordenes/${id}/cotizacion`}
            className="inline-block bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#dbeafe]"
          >
            Ver cotización
          </Link>
        )}

        {estatusActual === 'cotizacion_enviada' && (
          <Link
            to={`/ordenes/${id}/cotizacion`}
            className="inline-block bg-[#dbeafe] border border-[#93c5fd] text-[#1e40af] px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#bfdbfe]"
          >
            Ver cotización enviada
          </Link>
        )}

        {estatusActual === 'rechazada' && (
          <Link
            to={`/ordenes/${id}/cotizacion`}
            className="inline-block bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#fee2e2]"
          >
            Revisar cotización
          </Link>
        )}

        {estatusActual === 'aprobada' && (
          <button
            onClick={() => avanzarEstatus('en_taller')}
            disabled={saving}
            className="bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold"
          >
            {saving ? 'Actualizando...' : 'Iniciar trabajo'}
          </button>
        )}

        {estatusActual === 'en_taller' && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => avanzarEstatus('listo_entrega')}
              disabled={saving}
              className="bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold"
            >
              {saving ? 'Actualizando...' : 'Marcar listo'}
            </button>
            {orden?.tipo_flujo !== 'flujo_3' ? (
              <button
                onClick={handleConvertirF3}
                disabled={saving}
                className="border border-[#fed7aa] bg-[#fff7ed] text-[#c2410c] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#ffedd5] disabled:opacity-50"
              >
                ↗ Convertir a Flujo 3
              </button>
            ) : (
              <button
                onClick={() => avanzarEstatus('pausado_consulta')}
                disabled={saving}
                className="bg-[#dc2626] hover:bg-[#b91c1c] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold"
              >
                {saving ? '...' : '⚠ Problema mayor — consultar cliente'}
              </button>
            )}
          </div>
        )}

        {estatusActual === 'pausado_consulta' && (
          <div className="space-y-3">
            <div className="bg-[#fef2f2] border border-[#fecaca] rounded-lg px-4 py-3">
              <p className="text-sm font-semibold text-[#dc2626] mb-1">⚠ Orden pausada — esperando decisión del cliente</p>
              <p className="text-xs text-[#374151]">
                Gastos acumulados: <strong>${fmtMonto(totalGastos)}</strong>
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => avanzarEstatus('en_taller')}
                disabled={saving}
                className="bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold"
              >
                {saving ? '...' : '✓ Cliente aprobó — continuar trabajo'}
              </button>
              <button
                onClick={() => avanzarEstatus('listo_entrega')}
                disabled={saving}
                className="bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold"
              >
                {saving ? '...' : '✓ Cliente pidió cerrar — ir a entrega'}
              </button>
            </div>
          </div>
        )}

        {estatusActual === 'listo_entrega' && (
          <Link
            to={`/ordenes/${id}/cierre`}
            className="inline-block bg-[#dcfce7] border border-[#86efac] text-[#166534] px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#bbf7d0]"
          >
            Registrar cierre
          </Link>
        )}

        {estatusActual === 'entregado' && (
          <span className="text-sm font-semibold text-[#059669]">OT completada</span>
        )}
      </div>
    </div>
  );
}
