import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOrdenes } from '../api/ordenes';

const ESTATUS_STYLE = {
  recepcion:            { bg: '#f3f4f6', text: '#374151',  label: 'Recepción' },
  diagnostico:          { bg: '#fef3c7', text: '#92400e',  label: 'Diagnóstico' },
  cotizacion_pendiente: { bg: '#eff6ff', text: '#1d4ed8',  label: 'Cotización pendiente' },
  cotizacion_enviada:   { bg: '#dbeafe', text: '#1e40af',  label: 'Cotización enviada' },
  aprobada:             { bg: '#dcfce7', text: '#166534',  label: 'Aprobada' },
  rechazada:            { bg: '#fef2f2', text: '#dc2626',  label: 'Rechazada' },
  en_taller:            { bg: '#fef3c7', text: '#d97706',  label: 'En taller' },
  listo_entrega:        { bg: '#dcfce7', text: '#059669',  label: 'Listo para entrega' },
  entregado:            { bg: '#f3f4f6', text: '#6b7280',  label: 'Entregado' },
};

const EstatusBadge = ({ estatus }) => {
  const s = ESTATUS_STYLE[estatus] || { bg: '#f3f4f6', text: '#374151', label: estatus };
  return (
    <span
      style={{ background: s.bg, color: s.text }}
      className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
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

export default function OrdenesPage() {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    setLoading(true);
    getOrdenes({ activas: 1 })
      .then(data => setOrdenes(data.data?.data ?? []))
      .catch(() => setOrdenes([]))
      .finally(() => setLoading(false));
  }, []);

  const ordenesFiltradas = busqueda.trim()
    ? ordenes.filter(o => {
        const q = busqueda.trim().toLowerCase();
        return (o.placa ?? '').toLowerCase().includes(q)
          || (o.cliente_nombre ?? '').toLowerCase().includes(q)
          || (o.marca ?? '').toLowerCase().includes(q)
          || (o.modelo ?? '').toLowerCase().includes(q);
      })
    : ordenes;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-base font-bold text-[#111] mr-2">Órdenes de trabajo</h1>
        {!loading && (
          <span className="bg-[#eff6ff] text-[#1d4ed8] text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0">
            {ordenesFiltradas.length}
          </span>
        )}

        {/* Input búsqueda */}
        <div className="relative flex-1 min-w-[160px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af] text-sm">🔍</span>
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por placa, cliente, vehículo…"
            className="w-full border border-[#e5e5e5] rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] bg-white"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#374151] text-sm">✕</button>
          )}
        </div>

        <Link
          to="/ordenes/nueva"
          className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 shrink-0 ml-auto"
        >
          + Nueva OT
        </Link>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-[#e5e5e5] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#111111' }}>
              {['#', 'Fecha recepción', 'Auto', 'Cliente', 'Estatus', 'Entrega estimada', 'Acciones'].map((h, i) => (
                <th
                  key={i}
                  className="text-[#9ca3af] text-[10px] font-semibold uppercase tracking-wider px-4 py-3 text-left"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f3f4f6]">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#9ca3af]">
                  Cargando...
                </td>
              </tr>
            ) : ordenesFiltradas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#9ca3af]">
                  {busqueda ? `Sin resultados para "${busqueda}"` : 'Sin órdenes activas'}
                </td>
              </tr>
            ) : (
              ordenesFiltradas.map((o, idx) => (
                <tr
                  key={o.id}
                  className={`hover:bg-[#eff6ff] transition-colors cursor-pointer ${idx % 2 === 1 ? 'bg-[#fafafa]' : 'bg-white'}`}
                >
                  <td className="px-4 py-3 text-[#9ca3af] font-mono text-xs">{o.id}</td>
                  <td className="px-4 py-3 text-[#374151] whitespace-nowrap">{fmtFecha(o.fecha_recepcion)}</td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-[#111] uppercase tracking-wide">{o.placa}</span>
                    <span className="text-[#6b7280] ml-1 text-xs">
                      {[o.marca, o.modelo].filter(Boolean).join(' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#374151]">{o.cliente_nombre || '—'}</td>
                  <td className="px-4 py-3">
                    <EstatusBadge estatus={o.estatus} />
                  </td>
                  <td className="px-4 py-3 text-[#6b7280] whitespace-nowrap">{fmtFecha(o.fecha_entrega_estimada)}</td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/ordenes/${o.id}`}
                      className="bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] px-3 py-1 rounded text-xs font-medium hover:bg-[#dbeafe]"
                      onClick={e => e.stopPropagation()}
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
