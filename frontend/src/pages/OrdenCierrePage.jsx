import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getOrden, updateOrden } from '../api/ordenes';
import { getRemision, crearRemision, pagarRemision } from '../api/remisiones';

const INPUT = 'w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]';
const SECCION = 'bg-white rounded-xl border border-[#e5e5e5] p-5';

const TIPOS = [
  { value: 'mano_de_obra', label: 'Mano de obra' },
  { value: 'refaccion',    label: 'Refacción' },
];

const fmt = (n) =>
  (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtFecha = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

function LineaVacia() {
  return { id: Date.now(), tipo: 'mano_de_obra', descripcion: '', cantidad: 1, precio_unit: 0 };
}

export default function OrdenCierrePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Líneas de costos reales
  const [lineas, setLineas] = useState([LineaVacia()]);

  // Campos finales
  const [precioReal, setPrecioReal] = useState('');
  const [costoReal, setCostoReal] = useState('');

  // Remisión y pago
  const [remision, setRemision] = useState(null);
  const [formaPago, setFormaPago] = useState('efectivo');

  useEffect(() => {
    getOrden(id)
      .then((res) => {
        const ot = res.data.data;
        setOrden(ot);

        // Pre-llenar precio_real con total precio cotizado
        const totalCot = ot.cotizacion?.total_precio ?? 0;
        setPrecioReal(totalCot > 0 ? String(totalCot) : '');
      })
      .catch(() => setError('No se pudo cargar la orden'))
      .finally(() => setLoading(false));
    getRemision(id).then(r => {
      const rem = r.data?.data;
      if (rem) { setRemision(rem); if (rem.forma_pago) setFormaPago(rem.forma_pago); }
    });
  }, [id]);

  // Calcular totales de líneas
  const subtotalLinea = (l) => (parseFloat(l.cantidad) || 0) * (parseFloat(l.precio_unit) || 0);

  const totalCostoLineas = lineas.reduce((s, l) => s + subtotalLinea(l), 0);
  const totalPrecioLineas = totalCostoLineas; // precio real = suma de costos en tabla

  // Sincronizar costoReal con suma de líneas
  useEffect(() => {
    setCostoReal(totalCostoLineas > 0 ? String(totalCostoLineas.toFixed(2)) : '');
  }, [totalCostoLineas]);

  const cotizadoTotal = orden?.cotizacion?.total_precio ?? 0;
  const diferencia = (parseFloat(precioReal) || 0) - cotizadoTotal;

  // Handlers de líneas
  const setLinea = (idx, field, value) => {
    setLineas((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l))
    );
  };

  const addLinea = () => setLineas((prev) => [...prev, LineaVacia()]);

  const removeLinea = (idx) => {
    if (lineas.length === 1) return;
    setLineas((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleGenerarRemision = async () => {
    if (!orden) return;
    if (!parseFloat(precioReal)) { setError('Captura el precio cobrado al cliente antes de generar la remisión'); return; }
    setError('');
    setSaving(true);
    try {
      await updateOrden(id, {
        costo_real: parseFloat(costoReal) || 0,
        precio_real: parseFloat(precioReal) || 0,
      });
      const r = await crearRemision(id, formaPago);
      setRemision(r.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al generar la remisión');
    } finally {
      setSaving(false);
    }
  };

  const handlePagar = async () => {
    setError('');
    setSaving(true);
    try {
      const r = await pagarRemision(id);
      setRemision(r.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar el pago');
    } finally {
      setSaving(false);
    }
  };

  const pdfUrl = remision?.pdf_path ? `${window.location.origin}${remision.pdf_path}` : null;
  const waLink = () => {
    const tel = (orden?.cliente_telefono || '').replace(/\D/g, '');
    const msg = encodeURIComponent(
      `Hola${orden?.cliente_nombre ? ' ' + orden.cliente_nombre : ''}, tu vehículo está listo. ` +
      `Remisión ${remision.numero_folio} por $${fmt(remision.total)}: ${pdfUrl}`
    );
    return `https://wa.me/${tel ? '52' + tel : ''}?text=${msg}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[#9ca3af]">
        Cargando orden…
      </div>
    );
  }

  if (!orden) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[#dc2626]">
        {error || 'Orden no encontrada'}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/ordenes/${id}`)}
          className="text-[#9ca3af] hover:text-[#374151] text-sm"
        >
          ← Volver a OT
        </button>
        <h1 className="text-base font-bold text-[#111]">
          Cierre — Orden #{orden.id}
        </h1>
      </div>

      {/* Card resumen */}
      <div className={SECCION}>
        <h2 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-4">
          Resumen de la orden
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoItem label="Placa" value={orden.placa} />
          <InfoItem label="Vehículo" value={[orden.marca, orden.modelo].filter(Boolean).join(' ') || '—'} />
          <InfoItem label="Cliente" value={orden.cliente_nombre} />
          <InfoItem label="Fecha recepción" value={fmtFecha(orden.created_at)} />
          <InfoItem
            label="Cotización total"
            value={cotizadoTotal > 0 ? `$${fmt(cotizadoTotal)}` : '—'}
          />
        </div>
      </div>

      {/* Card costos reales */}
      <div className={SECCION}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
            Costos reales
          </h2>
          <button
            type="button"
            onClick={addLinea}
            className="text-xs text-[#1d4ed8] hover:text-[#1e40af] font-semibold border border-[#1d4ed8] hover:border-[#1e40af] rounded-lg px-3 py-1"
          >
            + Agregar línea
          </button>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] text-[#9ca3af] uppercase tracking-wider border-b border-[#e5e5e5]">
                <th className="pb-2 font-semibold w-36">Tipo</th>
                <th className="pb-2 font-semibold">Descripción</th>
                <th className="pb-2 font-semibold w-20 text-right">Cantidad</th>
                <th className="pb-2 font-semibold w-28 text-right">Precio Unit.</th>
                <th className="pb-2 font-semibold w-28 text-right">Subtotal</th>
                <th className="pb-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {lineas.map((l, idx) => (
                <tr key={l.id} className="border-b border-[#f3f4f6]">
                  <td className="py-2 pr-2">
                    <select
                      value={l.tipo}
                      onChange={(e) => setLinea(idx, 'tipo', e.target.value)}
                      className={INPUT}
                    >
                      {TIPOS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      value={l.descripcion}
                      onChange={(e) => setLinea(idx, 'descripcion', e.target.value)}
                      placeholder="Descripción del trabajo o refacción"
                      className={INPUT}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={l.cantidad}
                      onChange={(e) => setLinea(idx, 'cantidad', e.target.value)}
                      className={INPUT + ' text-right'}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={l.precio_unit}
                      onChange={(e) => setLinea(idx, 'precio_unit', e.target.value)}
                      className={INPUT + ' text-right'}
                    />
                  </td>
                  <td className="py-2 pr-2 text-right font-medium text-[#111]">
                    ${fmt(subtotalLinea(l))}
                  </td>
                  <td className="py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeLinea(idx)}
                      disabled={lineas.length === 1}
                      className="text-[#9ca3af] hover:text-[#dc2626] disabled:opacity-30 text-base leading-none"
                      title="Eliminar línea"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="pt-3 text-right text-xs font-semibold text-[#6b7280] uppercase">
                  Costo total real
                </td>
                <td className="pt-3 text-right font-bold text-[#111]">
                  ${fmt(totalCostoLineas)}
                </td>
                <td />
              </tr>
              <tr>
                <td colSpan={4} className="pt-1 text-right text-xs font-semibold text-[#6b7280] uppercase">
                  Precio total real
                </td>
                <td className="pt-1 text-right font-bold text-[#111]">
                  ${fmt(totalPrecioLineas)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Comparativa cotizado vs real */}
        <div className="mt-4 pt-4 border-t border-[#e5e5e5] flex flex-wrap gap-6 text-sm">
          <span className="text-[#6b7280]">
            Cotizado:{' '}
            <span className="font-semibold text-[#111]">${fmt(cotizadoTotal)}</span>
          </span>
          <span className="text-[#6b7280]">
            Real:{' '}
            <span className="font-semibold text-[#111]">${fmt(precioReal)}</span>
          </span>
          <span className="text-[#6b7280]">
            Diferencia:{' '}
            <span
              className={`font-bold ${diferencia >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'}`}
            >
              {diferencia >= 0 ? '+' : ''}${fmt(diferencia)}
            </span>
          </span>
        </div>
      </div>

      {/* Campos finales */}
      <div className={SECCION}>
        <h2 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-4">
          Montos de cierre
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-[#6b7280] mb-1">
              Precio cobrado al cliente{' '}
              <span className="text-[#dc2626]">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={precioReal}
              onChange={(e) => setPrecioReal(e.target.value)}
              placeholder="0.00"
              className={INPUT}
            />
            <p className="text-[10px] text-[#9ca3af] mt-1">
              Pre-llenado con el total cotizado. Ajusta si el monto final difiere.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6b7280] mb-1">
              Costo real
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={costoReal}
              onChange={(e) => setCostoReal(e.target.value)}
              placeholder="0.00"
              className={INPUT}
            />
            <p className="text-[10px] text-[#9ca3af] mt-1">
              Calculado automáticamente de la tabla de costos.
            </p>
          </div>
        </div>
      </div>

      {/* Remisión */}
      <div className={SECCION}>
        <h2 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-4">
          Remisión
        </h2>

        {!remision ? (
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1">Forma de pago *</label>
              <select value={formaPago} onChange={e => setFormaPago(e.target.value)} className={INPUT + ' w-48'}>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleGenerarRemision}
              disabled={saving}
              className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {saving ? 'Generando…' : '📄 Generar remisión PDF'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-4 bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg px-4 py-3">
              <span className="text-lg">📄</span>
              <div className="flex-1 min-w-[180px]">
                <p className="text-sm font-semibold text-[#166534]">
                  Remisión {remision.numero_folio} — ${fmt(remision.total)} ({remision.forma_pago})
                </p>
                <p className="text-xs text-[#4ade80]">
                  {remision.pagada ? `Pagada el ${fmtFecha(remision.fecha_pago)}` : 'Pendiente de pago'}
                </p>
              </div>
              <a href={remision.pdf_path} target="_blank" rel="noreferrer"
                className="text-sm text-[#1d4ed8] hover:underline font-semibold">Ver PDF</a>
              <a href={waLink()} target="_blank" rel="noreferrer"
                className="bg-[#25D366] hover:bg-[#1ebe5b] text-white px-4 py-2 rounded-lg text-sm font-semibold">
                📱 Enviar por WhatsApp
              </a>
            </div>

            {!remision.pagada ? (
              <button
                type="button"
                onClick={handlePagar}
                disabled={saving}
                className="bg-[#059669] hover:bg-[#047857] text-white px-6 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {saving ? 'Guardando…' : '✓ Marcar pagada y cerrar orden'}
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-[#059669]">Orden cerrada — vehículo autorizado para salida</span>
                <Link
                  to={`/ordenes/${id}/salida`}
                  className="bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#dbeafe]"
                >
                  🖨 Orden de salida
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-[#dc2626] text-sm">{error}</p>}

      <div className="flex justify-end gap-3 pb-8">
        <button
          type="button"
          onClick={() => navigate(`/ordenes/${id}`)}
          className="bg-white border border-[#e5e5e5] text-[#374151] px-5 py-2 rounded-lg text-sm hover:bg-gray-50"
        >
          {remision?.pagada ? 'Volver a la OT' : 'Cancelar'}
        </button>
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-semibold mb-0.5">
        {label}
      </p>
      <p className="text-sm text-[#111] font-medium">{value || '—'}</p>
    </div>
  );
}
