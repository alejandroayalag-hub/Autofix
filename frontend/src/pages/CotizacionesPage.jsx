import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCotizaciones, deleteCotizacion, convertirCotizacion } from '../api/cotizaciones';

const ESTATUS_STYLE = {
  borrador:   'bg-[#f3f4f6] text-[#6b7280]',
  enviada:    'bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]',
  aprobada:   'bg-[#dcfce7] text-[#166534]',
  rechazada:  'bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]',
  convertida: 'bg-[#f3e8ff] text-[#7e22ce]',
};

const fmtMXN = v => v != null ? `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—';

export default function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [filtro, setFiltro] = useState('');

  const cargar = () => getCotizaciones().then(r => setCotizaciones(r.data));
  useEffect(() => { cargar(); }, []);

  const handleDelete = async id => {
    if (!confirm('¿Eliminar cotización?')) return;
    await deleteCotizacion(id); cargar();
  };

  const handleConvertir = async cot => {
    if (!confirm(`¿Convertir cotización #${cot.id} en servicio?`)) return;
    const r = await convertirCotizacion(cot.id);
    alert(`Servicio creado con ID: ${r.data.servicio_id}`);
    cargar();
  };

  const visible = cotizaciones.filter(c =>
    (c.placa || '').toLowerCase().includes(filtro.toLowerCase()) ||
    (c.cliente_nombre || c.cliente_nombre_cat || '').toLowerCase().includes(filtro.toLowerCase()) ||
    (c.marca || '').toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-[#111]">Cotizaciones</h1>
        <Link to="/cotizaciones/nueva"
          className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-semibold px-4 py-2 rounded-lg">
          + Nueva cotización
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-[#e5e5e5]">
        <div className="p-4 border-b border-[#f3f4f6] flex items-center gap-3">
          <input value={filtro} onChange={e => setFiltro(e.target.value)}
            placeholder="Buscar por placa, cliente, marca..."
            className="border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] w-72" />
          <span className="ml-auto text-xs text-[#9ca3af]">{visible.length} cotizaciones</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#111111' }}>
                {['#','Fecha','Placa','Vehículo','Cliente','Estatus','Costo','Precio',''].map((h, i) => (
                  <th key={i} className={`text-[#9ca3af] text-[10px] font-semibold uppercase tracking-wider px-4 py-3 ${i >= 6 && i <= 7 ? 'text-right' : 'text-left'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f4f6]">
              {visible.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-[#9ca3af]">Sin cotizaciones</td></tr>
              ) : visible.map((c, idx) => (
                <tr key={c.id} className={`hover:bg-[#eff6ff] transition-colors ${idx % 2 === 1 ? 'bg-[#fafafa]' : 'bg-white'}`}>
                  <td className="px-4 py-3 text-[#9ca3af] font-mono text-xs">{c.id}</td>
                  <td className="px-4 py-3 text-[#374151] whitespace-nowrap">{c.fecha}</td>
                  <td className="px-4 py-3 font-bold text-[#111] uppercase">{c.placa || '—'}</td>
                  <td className="px-4 py-3 text-[#6b7280]">{[c.marca,c.modelo,c.anio].filter(Boolean).join(' ') || '—'}</td>
                  <td className="px-4 py-3 text-[#374151]">{c.cliente_nombre || c.cliente_nombre_cat || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${ESTATUS_STYLE[c.estatus] || ''}`}>
                      {c.estatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-[#6b7280]">{fmtMXN(c.total_costo)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-[#1d4ed8]">{fmtMXN(c.total_precio)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 justify-end flex-wrap">
                      <Link to={`/cotizaciones/${c.id}/editar`}
                        className="bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] px-2.5 py-1 rounded text-xs">
                        Editar
                      </Link>
                      {c.estatus !== 'convertida' && (
                        <button onClick={() => handleConvertir(c)}
                          className="bg-[#f3e8ff] border border-[#e9d5ff] text-[#7e22ce] px-2.5 py-1 rounded text-xs">
                          → Servicio
                        </button>
                      )}
                      <button onClick={() => handleDelete(c.id)}
                        className="bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] px-2.5 py-1 rounded text-xs">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
