import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getPipeline } from '../api/ordenes';

const COLUMNAS = [
  { key: 'en_cotizacion',        label: 'En cotización',    color: '#1d4ed8' },
  { key: 'recepcion',            label: 'Recepción',        color: '#374151' },
  { key: 'diagnostico',          label: 'Diagnóstico',      color: '#92400e' },
  { key: 'cotizacion_pendiente', label: 'Cotiz. pendiente', color: '#d97706' },
  { key: 'cotizacion_enviada',   label: 'Cotiz. enviada',   color: '#1e40af' },
  { key: 'aprobada',             label: 'Aprobada',         color: '#166534' },
  { key: 'unidad_recibida',      label: 'Unidad recibida',  color: '#0369a1' },
  { key: 'en_taller',            label: 'En taller',        color: '#d97706' },
  { key: 'pausado_consulta',     label: 'Consulta cliente', color: '#dc2626' },
  { key: 'listo_entrega',        label: 'Listo entrega',    color: '#059669' },
  { key: 'en_cierre',            label: 'En cierre',        color: '#7c3aed' },
];

const FLUJO_BADGE = {
  flujo_1: { label: 'F1', bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  flujo_2: { label: 'F2', bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
  flujo_3: { label: 'F3', bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
};

const tiempoEnEstado = (updatedAt) => {
  if (!updatedAt) return '—';
  const diff = Date.now() - new Date(updatedAt).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

function OrdenCard({ orden }) {
  const badge = FLUJO_BADGE[orden.tipo_flujo] || FLUJO_BADGE.flujo_2;
  const titulo = [orden.marca, orden.modelo].filter(Boolean).join(' ') || '—';

  return (
    <Link
      to={`/ordenes/${orden.id}`}
      className="block bg-white border border-[#e5e5e5] rounded-xl p-3 hover:border-[#1d4ed8] hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="bg-[#111] text-white text-[10px] font-bold px-2 py-0.5 rounded tracking-wider">
          {orden.placa || '—'}
        </span>
        <span
          style={{ background: badge.bg, color: badge.text, borderColor: badge.border }}
          className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
        >
          {badge.label}
        </span>
      </div>
      <p className="text-xs font-semibold text-[#111] truncate">{titulo}</p>
      <p className="text-[11px] text-[#6b7280] truncate mt-0.5">{orden.cliente_nombre || '—'}</p>
      <p className="text-[10px] text-[#9ca3af] mt-2 flex items-center gap-1">
        <span>⏱</span>
        <span>{tiempoEnEstado(orden.updated_at)}</span>
      </p>
    </Link>
  );
}

function Columna({ col, ordenes }) {
  if (!ordenes || ordenes.length === 0) return null;
  return (
    <div className="flex-shrink-0 w-48">
      <div
        className="flex items-center gap-2 mb-3 px-1"
        style={{ borderBottom: `2px solid ${col.color}`, paddingBottom: 6 }}
      >
        <span className="text-[11px] font-bold text-[#111] uppercase tracking-wider leading-tight">
          {col.label}
        </span>
        <span
          className="text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center"
          style={{ background: col.color, color: '#fff' }}
        >
          {ordenes.length}
        </span>
      </div>
      <div className="space-y-2">
        {ordenes.map(o => <OrdenCard key={o.id} orden={o} />)}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [agrupado, setAgrupado] = useState({});
  const [loading, setLoading] = useState(true);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const r = await getPipeline();
      setAgrupado(r.data?.data ?? {});
      setUltimaActualizacion(new Date());
    } catch {
      // silencioso — no interrumpir el polling
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 30000);
    return () => clearInterval(interval);
  }, [cargar]);

  const total = Object.values(agrupado).reduce((s, arr) => s + arr.length, 0);
  const fmtHora = d => d ? d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-[#111]">Pipeline</h1>
          {!loading && (
            <span className="bg-[#eff6ff] text-[#1d4ed8] text-xs font-bold px-2.5 py-0.5 rounded-full">
              {total} activas
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {ultimaActualizacion && (
            <span className="text-[11px] text-[#9ca3af]">
              Actualizado {fmtHora(ultimaActualizacion)} · refresca cada 30s
            </span>
          )}
          <button
            onClick={cargar}
            className="text-xs text-[#1d4ed8] border border-[#bfdbfe] bg-[#eff6ff] px-3 py-1.5 rounded-lg hover:bg-[#dbeafe]"
          >
            ↻ Actualizar
          </button>
          <Link
            to="/ordenes/nueva"
            className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white px-4 py-2 rounded-lg text-sm font-semibold"
          >
            + Nueva OT
          </Link>
        </div>
      </div>

      {/* Leyenda de flujos */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {Object.entries(FLUJO_BADGE).map(([k, v]) => (
          <span
            key={k}
            style={{ background: v.bg, color: v.text, borderColor: v.border }}
            className="text-[10px] font-semibold px-2 py-0.5 rounded border"
          >
            {v.label} — {k === 'flujo_1' ? 'Cotización previa' : k === 'flujo_2' ? 'Diagnóstico' : 'Progresivo'}
          </span>
        ))}
      </div>

      {/* Tablero */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#9ca3af]">Cargando pipeline…</div>
      ) : total === 0 ? (
        <div className="flex items-center justify-center py-20 text-[#9ca3af]">
          <div className="text-center">
            <p className="text-2xl mb-2">✅</p>
            <p className="font-semibold text-[#111]">Sin órdenes activas</p>
            <p className="text-sm mt-1">Todas las órdenes han sido entregadas</p>
          </div>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {COLUMNAS.map(col => (
            <Columna key={col.key} col={col} ordenes={agrupado[col.key]} />
          ))}
        </div>
      )}
    </div>
  );
}
