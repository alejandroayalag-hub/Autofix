import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getOrden, updateOrdenEstatus } from '../api/ordenes';

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

  const cargar = () => {
    setLoading(true);
    getOrden(id)
      .then(data => setOrden(data.data?.data ?? data.data))
      .catch(() => setError('No se pudo cargar la orden'))
      .finally(() => setLoading(false));
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
          <button
            onClick={() => avanzarEstatus('listo_entrega')}
            disabled={saving}
            className="bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold"
          >
            {saving ? 'Actualizando...' : 'Marcar listo'}
          </button>
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
