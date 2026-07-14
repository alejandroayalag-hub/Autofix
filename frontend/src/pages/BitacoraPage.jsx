import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getServicios, getResumen, eliminarServicio } from '../api/servicios';
import { getOrdenes } from '../api/ordenes';

const otComoServicio = ot => ({
  id: `OT-${ot.id}`,
  fecha: ot.fecha_cierre || ot.fecha_recepcion,
  placa: ot.auto?.placa || '—',
  marca: ot.auto?.marca || '',
  modelo: ot.auto?.modelo || '',
  anio: ot.auto?.anio || '',
  cliente_nombre: ot.cliente?.nombre || ot.cliente_nombre || '—',
  odometro: ot.odometro,
  tipo_servicio: ot.notas_recepcion || 'Orden de trabajo',
  cotizacion: null,
  costo: ot.costo_real,
  precio: ot.precio_real,
  utilidad: ot.precio_real != null && ot.costo_real != null
    ? ot.precio_real - ot.costo_real
    : null,
  _es_ot: true,
});

const fmt = n => n != null ? `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—';

const KPI = ({ label, value, gradient, sub }) => (
  <div style={{ background: gradient }} className="rounded-xl p-4 text-white relative overflow-hidden">
    <div style={{ position:'absolute', top:-16, right:-16, width:72, height:72, borderRadius:'50%', background:'rgba(255,255,255,0.07)' }} />
    <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70 mb-1.5">{label}</p>
    <p className="text-2xl font-extrabold leading-none mb-1">{value}</p>
    {sub && <p className="text-[10px] opacity-60">{sub}</p>}
  </div>
);

export default function BitacoraPage() {
  const [serviciosBase, setServiciosBase] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [q, setQ] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const fetchData = async (searchDesde, searchHasta) => {
    const params = {};
    if (searchDesde) params.desde = searchDesde;
    if (searchHasta) params.hasta = searchHasta;
    const [data, res, otResp] = await Promise.all([
      getServicios(params),
      getResumen(),
      getOrdenes({ entregadas: 1 }),
    ]);
    const ots = (otResp.data || []).map(otComoServicio);
    const combinado = [...data, ...ots].sort((a, b) => {
      const fa = a.fecha || '';
      const fb = b.fecha || '';
      return fb.localeCompare(fa);
    });
    setServiciosBase(combinado);
    setResumen(res);
  };

  const cargar = () => fetchData(desde, hasta);

  useEffect(() => { fetchData('', ''); }, []);

  const servicios = q.trim()
    ? serviciosBase.filter(s => {
        const term = q.trim().toLowerCase();
        return (
          (s.placa || '').toLowerCase().includes(term) ||
          (s.cliente_nombre || '').toLowerCase().includes(term) ||
          (s.tipo_servicio || '').toLowerCase().includes(term)
        );
      })
    : serviciosBase;

  const handleEliminar = async id => {
    if (!confirm('¿Eliminar este servicio?')) return;
    await eliminarServicio(id);
    cargar();
  };

  const utilColor = u => u == null ? 'text-[#9ca3af]' : u >= 0 ? 'text-[#059669]' : 'text-[#dc2626]';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-base font-bold text-[#111] mr-2">Bitácora de servicios</h1>

        {/* Input búsqueda */}
        <div className="relative flex-1 min-w-[160px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af] text-sm">🔍</span>
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar por placa, cliente, servicio…"
            className="w-full border border-[#e5e5e5] rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] bg-white"
          />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#374151] text-sm">✕</button>
          )}
        </div>

        <Link to="/servicios/nuevo"
          className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 shrink-0 ml-auto">
          + Nuevo servicio
        </Link>
      </div>

      {resumen && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI label="Servicios" value={resumen.total_servicios} sub="registros totales"
            gradient="linear-gradient(135deg, #111111 0%, #374151 100%)" />
          <KPI label="Cotizado" value={fmt(resumen.total_cotizacion)} sub="monto presupuestado"
            gradient="linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)" />
          <KPI label="Precio cobrado" value={fmt(resumen.total_precio)} sub="ingresos por servicios"
            gradient="linear-gradient(135deg, #374151 0%, #1f2937 100%)" />
          <KPI label="Utilidad total" value={fmt(resumen.total_utilidad)} sub="ganancia acumulada"
            gradient="linear-gradient(135deg, #059669 0%, #047857 100%)" />
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#e5e5e5] p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-[10px] text-[#6b7280] mb-1 block font-medium">Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            className="border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" />
        </div>
        <div>
          <label className="text-[10px] text-[#6b7280] mb-1 block font-medium">Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            className="border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" />
        </div>
        <button onClick={cargar}
          className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white px-4 py-2 rounded-lg text-sm font-semibold">
          Filtrar
        </button>
        <button onClick={() => { setDesde(''); setHasta(''); fetchData('', ''); }}
          className="bg-white border border-[#e5e5e5] text-[#374151] px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
          Limpiar
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#e5e5e5] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#111111' }}>
              {['#','Fecha','Placa','Vehículo','Cliente','Km','Servicio','Cotización','Costo','Precio','Utilidad',''].map((h, i) => (
                <th key={i} className={`text-[#9ca3af] text-[10px] font-semibold uppercase tracking-wider px-4 py-3 ${i >= 7 && i <= 10 ? 'text-right' : 'text-left'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f3f4f6]">
            {servicios.length === 0 ? (
              <tr><td colSpan={12} className="px-4 py-8 text-center text-[#9ca3af]">Sin registros</td></tr>
            ) : servicios.map((s, idx) => (
              <tr key={s.id} className={`hover:bg-[#eff6ff] transition-colors ${idx % 2 === 1 ? 'bg-[#fafafa]' : 'bg-white'}`}>
                <td className="px-4 py-3 font-mono text-xs">
                  <span className="text-[#9ca3af]">{s._es_ot ? s.id.replace('OT-', '') : s.id}</span>
                  {s._es_ot && (
                    <span className="ml-1.5 inline-block bg-[#dbeafe] text-[#1d4ed8] text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">OT</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[#374151] whitespace-nowrap">{s.fecha}</td>
                <td className="px-4 py-3 font-bold text-[#111] uppercase tracking-wide">{s.placa}</td>
                <td className="px-4 py-3 text-[#6b7280]">{[s.marca,s.modelo,s.anio].filter(Boolean).join(' ')}</td>
                <td className="px-4 py-3 text-[#374151]">{s.cliente_nombre || s.cliente_nombre_cat || '—'}</td>
                <td className="px-4 py-3 text-[#6b7280]">{s.odometro ? `${s.odometro.toLocaleString()} km` : '—'}</td>
                <td className="px-4 py-3 max-w-48 truncate text-[#374151]" title={s.tipo_servicio}>{s.tipo_servicio || '—'}</td>
                <td className="px-4 py-3 text-right text-[#6b7280]">{fmt(s.cotizacion)}</td>
                <td className="px-4 py-3 text-right text-[#6b7280]">{fmt(s.costo)}</td>
                <td className="px-4 py-3 text-right font-semibold text-[#111]">{fmt(s.precio)}</td>
                <td className={`px-4 py-3 text-right font-semibold ${utilColor(s.utilidad)}`}>{fmt(s.utilidad)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    {s._es_ot ? (
                      <Link to={`/ordenes/${s.id.replace('OT-', '')}`}
                        className="bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] px-3 py-1 rounded text-xs">
                        Ver OT
                      </Link>
                    ) : (
                      <>
                        <Link to={`/servicios/${s.id}/editar`}
                          className="bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] px-3 py-1 rounded text-xs">
                          Editar
                        </Link>
                        <button onClick={() => handleEliminar(s.id)}
                          className="bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] px-3 py-1 rounded text-xs">
                          Eliminar
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
