import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getCotizacionPublica, aprobarCotizacion, rechazarCotizacion } from '../api/ordenes';

export default function CotizacionPublicaPage() {
  const { token } = useParams();
  const [cotizacion, setCotizacion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // acción aprobación/rechazo
  const [accion, setAccion] = useState(null); // 'aprobando' | 'rechazando' | 'done_aprobada' | 'done_rechazada'
  const [motivo, setMotivo] = useState('');
  const [motivoError, setMotivoError] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    getCotizacionPublica(token)
      .then((res) => {
        setCotizacion(res.data);
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleAprobar = async () => {
    setActionLoading(true);
    try {
      await aprobarCotizacion(token);
      setAccion('done_aprobada');
      setCotizacion((prev) => ({ ...prev, estatus: 'aprobada' }));
    } catch {
      // silencio — podrías mostrar un toast si quisieras
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmarRechazo = async () => {
    if (!motivo.trim()) {
      setMotivoError(true);
      return;
    }
    setMotivoError(false);
    setActionLoading(true);
    try {
      await rechazarCotizacion(token, motivo.trim());
      setAccion('done_rechazada');
      setCotizacion((prev) => ({ ...prev, estatus: 'rechazada' }));
    } catch {
      // silencio
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val ?? 0);

  const formatFecha = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  // datos derivados
  const servicios = cotizacion?.servicios ?? cotizacion?.items ?? [];
  const total =
    cotizacion?.total ??
    servicios.reduce((acc, s) => acc + (s.subtotal ?? (s.cantidad ?? 1) * (s.precio_unitario ?? s.precio ?? 0)), 0);
  const estatus = accion === 'done_aprobada' ? 'aprobada' : accion === 'done_rechazada' ? 'rechazada' : cotizacion?.estatus;
  const puedeActuar = (estatus === 'enviada' || estatus === 'borrador') && !accion;

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* ── Header ── */}
      <header className="bg-[#111111] text-white">
        {/* Franja racing */}
        <div className="flex h-2">
          <div className="flex-1 bg-[#dc2626]" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-[#1d4ed8]" />
        </div>
        <div className="px-6 py-4 flex items-center gap-3">
          <span className="text-3xl">🔧</span>
          <span className="text-xl font-bold tracking-wide">AutoFix Querétaro</span>
        </div>
      </header>

      {/* ── Contenido ── */}
      <main className="max-w-2xl mx-auto mt-8 px-4 pb-16">

        {/* Estado: cargando */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-4 border-[#1d4ed8] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Cargando cotización...</p>
          </div>
        )}

        {/* Estado: error */}
        {!loading && error && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <p className="text-2xl mb-2">🔗</p>
            <p className="text-gray-700 font-medium">Esta cotización no existe o el enlace ha expirado.</p>
          </div>
        )}

        {/* Estado: data cargada */}
        {!loading && !error && cotizacion && (
          <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">

            {/* ── Datos del vehículo y cliente ── */}
            <div>
              <h2 className="text-lg font-bold text-[#111111] mb-3 border-b pb-2">Detalle de cotización</h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <dt className="text-gray-500">Cliente</dt>
                <dd className="font-medium text-gray-900">
                  {cotizacion.cliente?.nombre ?? cotizacion.cliente_nombre ?? '—'}
                </dd>

                {(cotizacion.vehiculo?.placa ?? cotizacion.placa) && (
                  <>
                    <dt className="text-gray-500">Placa</dt>
                    <dd className="font-medium text-gray-900 uppercase">
                      {cotizacion.vehiculo?.placa ?? cotizacion.placa}
                    </dd>
                  </>
                )}

                {(cotizacion.vehiculo?.marca ?? cotizacion.marca) && (
                  <>
                    <dt className="text-gray-500">Vehículo</dt>
                    <dd className="font-medium text-gray-900">
                      {[
                        cotizacion.vehiculo?.marca ?? cotizacion.marca,
                        cotizacion.vehiculo?.modelo ?? cotizacion.modelo,
                        cotizacion.vehiculo?.anio ?? cotizacion.anio,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    </dd>
                  </>
                )}

                <dt className="text-gray-500">Fecha</dt>
                <dd className="font-medium text-gray-900">
                  {formatFecha(cotizacion.fecha ?? cotizacion.created_at)}
                </dd>
              </dl>
            </div>

            {/* ── Tabla de servicios ── */}
            <div>
              <h3 className="text-base font-semibold text-[#111111] mb-3">Servicios cotizados</h3>
              {servicios.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Sin servicios registrados.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#111111] text-white">
                        <th className="text-left px-4 py-2 font-semibold">Servicio</th>
                        <th className="text-center px-3 py-2 font-semibold">Cant.</th>
                        <th className="text-right px-3 py-2 font-semibold">Precio Unit.</th>
                        <th className="text-right px-4 py-2 font-semibold">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {servicios.map((s, i) => {
                        const cantidad = s.cantidad ?? 1;
                        const precio = s.precio_unitario ?? s.precio ?? 0;
                        const subtotal = s.subtotal ?? cantidad * precio;
                        return (
                          <tr
                            key={i}
                            className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                          >
                            <td className="px-4 py-2 text-gray-800">
                              {s.nombre ?? s.descripcion ?? s.servicio ?? '—'}
                            </td>
                            <td className="px-3 py-2 text-center text-gray-700">{cantidad}</td>
                            <td className="px-3 py-2 text-right text-gray-700">{formatCurrency(precio)}</td>
                            <td className="px-4 py-2 text-right text-gray-800 font-medium">{formatCurrency(subtotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200">
                        <td colSpan={3} className="px-4 py-3 text-right font-semibold text-gray-700">Total:</td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-2xl font-bold text-[#1d4ed8]">{formatCurrency(total)}</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* ── Banners de estatus final ── */}
            {estatus === 'aprobada' && (
              <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4 text-green-800">
                <span className="text-xl mt-0.5">✅</span>
                <p className="text-sm font-medium">
                  Cotización aprobada — el equipo de AutoFix se pondrá en contacto contigo a la brevedad.
                </p>
              </div>
            )}

            {estatus === 'rechazada' && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-800">
                <span className="text-xl mt-0.5">❌</span>
                <p className="text-sm font-medium">Cotización rechazada.</p>
              </div>
            )}

            {estatus && estatus !== 'aprobada' && estatus !== 'rechazada' && estatus !== 'enviada' && estatus !== 'borrador' && (
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-[#1d4ed8]">
                <span className="text-xl mt-0.5">ℹ️</span>
                <p className="text-sm font-medium capitalize">Estatus: {estatus}</p>
              </div>
            )}

            {/* ── Botones de acción ── */}
            {puedeActuar && (
              <div className="space-y-4 pt-2">
                {/* Botones principales */}
                {accion !== 'rechazando' && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleAprobar}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                    >
                      {actionLoading ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span>✅</span>
                      )}
                      Aprobar cotización
                    </button>
                    <button
                      onClick={() => setAccion('rechazando')}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-red-50 disabled:opacity-60 text-[#dc2626] border-2 border-[#dc2626] font-semibold py-3 px-6 rounded-xl transition-colors"
                    >
                      <span>❌</span>
                      Rechazar
                    </button>
                  </div>
                )}

                {/* Panel de rechazo */}
                {accion === 'rechazando' && (
                  <div className="space-y-3 bg-red-50 border border-red-200 rounded-xl p-4">
                    <label className="block text-sm font-semibold text-red-800">
                      Motivo del rechazo <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={motivo}
                      onChange={(e) => {
                        setMotivo(e.target.value);
                        if (e.target.value.trim()) setMotivoError(false);
                      }}
                      placeholder="Describe el motivo del rechazo..."
                      className={`w-full rounded-lg px-3 py-2 text-sm text-gray-800 bg-white resize-none outline-none transition-colors ${
                        motivoError
                          ? 'border-2 border-red-500 focus:border-red-500'
                          : 'border-2 border-red-300 focus:border-[#dc2626]'
                      }`}
                    />
                    {motivoError && (
                      <p className="text-xs text-red-600">Por favor escribe un motivo antes de confirmar.</p>
                    )}
                    <div className="flex gap-3">
                      <button
                        onClick={handleConfirmarRechazo}
                        disabled={actionLoading}
                        className="flex items-center gap-2 bg-[#dc2626] hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-2 px-5 rounded-lg text-sm transition-colors"
                      >
                        {actionLoading && (
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                        Confirmar rechazo
                      </button>
                      <button
                        onClick={() => { setAccion(null); setMotivo(''); setMotivoError(false); }}
                        disabled={actionLoading}
                        className="text-gray-600 hover:text-gray-800 font-medium text-sm py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
