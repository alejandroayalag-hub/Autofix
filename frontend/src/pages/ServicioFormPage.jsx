import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { crearServicio, actualizarServicio, getServicio } from '../api/servicios';
import { getClientes } from '../api/clientes';

const INPUT = 'w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]';

const CAMPO = ({ label, children, required }) => (
  <div>
    <label className="block text-xs font-medium text-[#6b7280] mb-1">
      {label}{required && <span className="text-[#dc2626] ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

export default function ServicioFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const esEdicion = Boolean(id);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    placa: '', marca: '', modelo: '', anio: '', motor: '', vin: '',
    cliente_id: '', cliente_nombre: '',
    odometro: '', fecha: new Date().toISOString().slice(0, 10), tipo_servicio: '',
    cotizacion: '', costo: '', precio: '', notas: '',
  });

  useEffect(() => {
    getClientes().then(setClientes);
    if (esEdicion) getServicio(id).then(s => setForm({
      placa: s.placa || '', marca: s.marca || '', modelo: s.modelo || '',
      anio: s.anio || '', motor: s.motor || '', vin: s.vin || '',
      cliente_id: s.cliente_id || '', cliente_nombre: s.cliente_nombre || '',
      odometro: s.odometro || '', fecha: s.fecha || new Date().toISOString().slice(0, 10),
      tipo_servicio: s.tipo_servicio || '',
      cotizacion: s.cotizacion || '', costo: s.costo || '',
      precio: s.precio || '', notas: s.notas || '',
    }));
  }, [id]);

  const set = (name, value) => setForm(f => ({ ...f, [name]: value }));
  const handle = e => set(e.target.name, e.target.value);

  const utilidad = (parseFloat(form.precio) || 0) - (parseFloat(form.costo) || 0);

  const handleClienteChange = e => {
    const clienteId = e.target.value;
    const cliente = clientes.find(c => String(c.id) === clienteId);
    setForm(f => ({ ...f, cliente_id: clienteId, cliente_nombre: cliente ? cliente.nombre : f.cliente_nombre }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.placa) { setError('La placa es requerida'); return; }
    setError(''); setLoading(true);
    try {
      if (esEdicion) await actualizarServicio(id, form);
      else await crearServicio(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally { setLoading(false); }
  };

  const seccion = 'bg-white rounded-xl border border-[#e5e5e5] p-5';

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-[#9ca3af] hover:text-[#374151] text-sm">← Volver</button>
        <h1 className="text-base font-bold text-[#111]">
          {esEdicion ? 'Editar servicio' : 'Nuevo servicio'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className={seccion}>
          <h2 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-4">Vehículo</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <CAMPO label="Placa" required>
              <input name="placa" value={form.placa} onChange={handle}
                placeholder="ABC-1234"
                className={INPUT + ' uppercase'} />
            </CAMPO>
            <CAMPO label="Marca"><input name="marca" value={form.marca} onChange={handle} className={INPUT} placeholder="Nissan" /></CAMPO>
            <CAMPO label="Modelo"><input name="modelo" value={form.modelo} onChange={handle} className={INPUT} placeholder="Versa" /></CAMPO>
            <CAMPO label="Año"><input name="anio" value={form.anio} onChange={handle} className={INPUT} placeholder="2020" type="number" /></CAMPO>
            <CAMPO label="Motor"><input name="motor" value={form.motor} onChange={handle} className={INPUT} placeholder="1.6L" /></CAMPO>
            <CAMPO label="VIN"><input name="vin" value={form.vin} onChange={handle} className={INPUT} placeholder="Número de serie..." /></CAMPO>
          </div>
        </div>

        <div className={seccion}>
          <h2 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-4">Cliente y servicio</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <CAMPO label="Cliente (catálogo)">
              <select name="cliente_id" value={form.cliente_id} onChange={handleClienteChange} className={INPUT}>
                <option value="">— Seleccionar —</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </CAMPO>
            <CAMPO label="Nombre del cliente">
              <input name="cliente_nombre" value={form.cliente_nombre} onChange={handle} className={INPUT} placeholder="O escribe el nombre..." />
            </CAMPO>
            <CAMPO label="Fecha" required>
              <input name="fecha" value={form.fecha} onChange={handle} type="date" className={INPUT} />
            </CAMPO>
            <CAMPO label="Odómetro (km)">
              <input name="odometro" value={form.odometro} onChange={handle} type="number" className={INPUT} placeholder="85000" />
            </CAMPO>
            <CAMPO label="Tipo de servicio">
              <input name="tipo_servicio" value={form.tipo_servicio} onChange={handle} className={INPUT} placeholder="Afinación, frenos, aceite..." />
            </CAMPO>
          </div>
        </div>

        <div className={seccion}>
          <h2 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-4">Costos</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <CAMPO label="Cotización">
              <input name="cotizacion" value={form.cotizacion} onChange={handle} type="number" step="0.01" className={INPUT} placeholder="0.00" />
            </CAMPO>
            <CAMPO label="Costo">
              <input name="costo" value={form.costo} onChange={handle} type="number" step="0.01" className={INPUT} placeholder="0.00" />
            </CAMPO>
            <CAMPO label="Precio cobrado">
              <input name="precio" value={form.precio} onChange={handle} type="number" step="0.01" className={INPUT} placeholder="0.00" />
            </CAMPO>
            <CAMPO label="Utilidad (auto)">
              <div className={`border rounded-lg px-3 py-2 text-sm font-bold ${utilidad >= 0 ? 'bg-[#dcfce7] border-[#86efac] text-[#166534]' : 'bg-[#fef2f2] border-[#fca5a5] text-[#dc2626]'}`}>
                ${utilidad.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
            </CAMPO>
          </div>
        </div>

        <div className={seccion}>
          <CAMPO label="Notas / Observaciones">
            <textarea name="notas" value={form.notas} onChange={handle} rows={3}
              className={INPUT + ' resize-none'}
              placeholder="Observaciones adicionales..." />
          </CAMPO>
        </div>

        {error && <p className="text-[#dc2626] text-sm">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/')}
            className="bg-white border border-[#e5e5e5] text-[#374151] px-5 py-2 rounded-lg text-sm hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white px-6 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
            {loading ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear servicio'}
          </button>
        </div>
      </form>
    </div>
  );
}
