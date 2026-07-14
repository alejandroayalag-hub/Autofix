import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrden } from '../api/ordenes';
import { getRemision } from '../api/remisiones';

const fmtFecha = iso => iso
  ? new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
  : '—';
const fmt = n => (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 });

export default function OrdenSalidaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [orden, setOrden] = useState(null);
  const [remision, setRemision] = useState(null);

  useEffect(() => {
    getOrden(id).then(r => setOrden(r.data.data));
    getRemision(id).then(r => setRemision(r.data?.data ?? null));
  }, [id]);

  if (!orden || !remision) return <div className="py-20 text-center text-[#9ca3af]">Cargando…</div>;

  if (!remision.pagada) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-[#dc2626] font-semibold">La remisión no está pagada — no se puede autorizar la salida</p>
        <button onClick={() => navigate(`/ordenes/${id}/cierre`)} className="text-sm text-[#1d4ed8] hover:underline">Ir al cierre</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <button onClick={() => navigate(`/ordenes/${id}/cierre`)} className="text-sm text-[#9ca3af] hover:text-[#374151]">← Volver</button>
        <button onClick={() => window.print()}
          className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white px-5 py-2 rounded-lg text-sm font-semibold">
          🖨 Imprimir
        </button>
      </div>

      {/* Documento */}
      <div className="bg-white border border-[#e5e5e5] rounded-xl p-8 print:border-0 print:rounded-none">
        <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-4 mb-6">
          <div>
            <p className="text-xl font-bold text-[#111]">🔧 AutoFix Querétaro</p>
            <p className="text-xs text-[#6b7280]">Bitácora de servicios automotrices</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-[#111]">ORDEN DE SALIDA</p>
            <p className="text-sm text-[#6b7280]">OT #{orden.id} · Remisión {remision.numero_folio}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm mb-8">
          {[
            ['Cliente', orden.cliente_nombre],
            ['Teléfono', orden.cliente_telefono],
            ['Placa', orden.placa],
            ['Vehículo', [orden.marca, orden.modelo, orden.anio].filter(Boolean).join(' ')],
            ['Total pagado', `$${fmt(remision.total)} (${remision.forma_pago})`],
            ['Fecha de pago', fmtFecha(remision.fecha_pago)],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-semibold">{k}</p>
              <p className="font-medium text-[#111]">{v || '—'}</p>
            </div>
          ))}
        </div>

        <p className="text-sm text-[#374151] mb-12">
          Se autoriza la salida del vehículo descrito, habiendo cubierto el total de los
          servicios realizados conforme a la remisión {remision.numero_folio}.
        </p>

        <div className="grid grid-cols-2 gap-12 pt-8">
          <div className="border-t border-[#111] pt-2 text-center text-xs text-[#6b7280]">Entrega — AutoFix Querétaro</div>
          <div className="border-t border-[#111] pt-2 text-center text-xs text-[#6b7280]">Recibe — Cliente</div>
        </div>
      </div>
    </div>
  );
}
