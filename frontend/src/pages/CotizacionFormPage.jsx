import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCotizacion, createCotizacion, updateCotizacion } from '../api/cotizaciones';
import { getCatalogo } from '../api/catalogo';
import { getClientes, crearCliente } from '../api/clientes';
import { getAutos, createAuto } from '../api/autos';
import { getPaquetesCompuestos, getPaqueteArbol } from '../api/paquetes';

const ESTATUS = ['borrador','enviada','aprobada','rechazada'];

const emptyItem = () => ({
  _key: Math.random(),
  paquete_id: '', actividad: '', descripcion: '', cantidad: 1,
  costo_unitario: 0, precio_unitario: 0,
  subtotal_costo: 0, subtotal_precio: 0,
});

/* Convierte el árbol de un paquete (actividades → insumos + mano de obra) en líneas de cotización */
const itemsDesdeArbol = (paq) => {
  const lineas = [];
  for (const a of paq.actividades) {
    for (const ins of a.insumos) {
      const cant = ins.config_default || 1;
      lineas.push({
        _key: Math.random(), paquete_id: '', actividad: a.nombre,
        descripcion: `${ins.nombre}${ins.unidad ? ` (${ins.unidad})` : ''}`,
        cantidad: cant,
        costo_unitario: ins.costo_unitario || 0,
        precio_unitario: ins.precio_unitario || 0,
        subtotal_costo: cant * (ins.costo_unitario || 0),
        subtotal_precio: cant * (ins.precio_unitario || 0),
      });
    }
    if ((a.horas_mano_obra || 0) > 0) {
      lineas.push({
        _key: Math.random(), paquete_id: '', actividad: a.nombre,
        descripcion: 'Mano de obra (hrs)',
        cantidad: a.horas_mano_obra,
        costo_unitario: 0,
        precio_unitario: a.tarifa_hora || 0,
        subtotal_costo: 0,
        subtotal_precio: (a.horas_mano_obra || 0) * (a.tarifa_hora || 0),
      });
    }
  }
  return lineas;
};

const fmtMXN = v => `$${Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

export default function CotizacionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    cliente_id: '', cliente_nombre: '', auto_id: '', placa: '', marca: '', modelo: '', anio: '',
    fecha: new Date().toISOString().slice(0,10), estatus: 'borrador', notas: '',
  });
  const [items, setItems] = useState([emptyItem()]);
  const [catalogoItems, setCatalogoItems] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [autos, setAutos] = useState([]);
  const [paquetes, setPaquetes] = useState([]);
  const [paqueteId, setPaqueteId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Altas rápidas desde el cotizador
  const [modalCliente, setModalCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', telefono: '', email: '' });
  const [modalAuto, setModalAuto] = useState(false);
  const [nuevoAuto, setNuevoAuto] = useState({ placa: '', marca: '', modelo: '', anio: '' });
  const [guardandoAlta, setGuardandoAlta] = useState(false);
  const [errorAlta, setErrorAlta] = useState('');

  const handleCrearCliente = async () => {
    if (!nuevoCliente.nombre.trim()) { setErrorAlta('El nombre es requerido'); return; }
    setErrorAlta(''); setGuardandoAlta(true);
    try {
      const creado = await crearCliente(nuevoCliente);
      setClientes(prev => [...prev, creado]);
      setForm(f => ({ ...f, cliente_id: String(creado.id), cliente_nombre: creado.nombre, auto_id: '' }));
      setModalCliente(false);
      setNuevoCliente({ nombre: '', telefono: '', email: '' });
    } catch (err) {
      setErrorAlta(err.response?.data?.error || 'Error al crear cliente');
    } finally { setGuardandoAlta(false); }
  };

  const handleCrearAuto = async () => {
    if (!nuevoAuto.placa.trim()) { setErrorAlta('La placa es requerida'); return; }
    setErrorAlta(''); setGuardandoAlta(true);
    try {
      const res = await createAuto({ ...nuevoAuto, cliente_id: form.cliente_id });
      const creado = res.data?.data ?? res.data;
      setAutos(prev => [...prev, creado]);
      setForm(f => ({
        ...f, auto_id: String(creado.id),
        placa: creado.placa || '', marca: creado.marca || '', modelo: creado.modelo || '', anio: creado.anio || '',
      }));
      setModalAuto(false);
      setNuevoAuto({ placa: '', marca: '', modelo: '', anio: '' });
    } catch (err) {
      setErrorAlta(err.response?.data?.error || 'Error al crear auto');
    } finally { setGuardandoAlta(false); }
  };

  useEffect(() => {
    getCatalogo().then(data => setCatalogoItems(data));
    getClientes().then(data => setClientes(data));
    getAutos().then(r => setAutos(r.data?.data ?? []));
    getPaquetesCompuestos().then(r => setPaquetes(r.data?.data ?? []));
    if (isEdit) {
      getCotizacion(id).then(r => {
        const c = r.data;
        setForm({
          cliente_id: c.cliente_id || '', cliente_nombre: c.cliente_nombre || '',
          auto_id: c.auto_id || '',
          placa: c.placa || '', marca: c.marca || '', modelo: c.modelo || '', anio: c.anio || '',
          fecha: c.fecha, estatus: c.estatus, notas: c.notas || '',
        });
        setItems(c.items.length ? c.items.map(i => ({ ...i, _key: Math.random() })) : [emptyItem()]);
      });
    }
  }, [id]);

  const handleForm = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleClienteChange = e => {
    const cid = e.target.value;
    const cl = clientes.find(c => String(c.id) === cid);
    // Cambiar de cliente resetea el auto seleccionado
    setForm(f => ({ ...f, cliente_id: cid, cliente_nombre: cl ? cl.nombre : f.cliente_nombre, auto_id: '' }));
  };

  const autosDelCliente = form.cliente_id
    ? autos.filter(a => String(a.cliente_id) === String(form.cliente_id))
    : [];

  const handleAutoChange = e => {
    const aid = e.target.value;
    const a = autos.find(x => String(x.id) === aid);
    setForm(f => a
      ? { ...f, auto_id: aid, placa: a.placa || '', marca: a.marca || '', modelo: a.modelo || '', anio: a.anio || '' }
      : { ...f, auto_id: '' });
  };

  const handleItem = (key, field, value) => {
    setItems(prev => prev.map(it => {
      if (it._key !== key) return it;
      const updated = { ...it, [field]: value };
      if (field === 'paquete_id') {
        const item = catalogoItems.find(i => String(i.id) === String(value));
        if (item) {
          updated.descripcion     = item.nombre;
          updated.precio_unitario = item.precio_unitario || 0;
          updated.costo_unitario  = item.costo_unitario  || 0;
          updated.subtotal_precio = (updated.cantidad || 1) * (item.precio_unitario || 0);
          updated.subtotal_costo  = (updated.cantidad || 1) * (item.costo_unitario  || 0);
        }
      }
      if (field === 'cantidad' || field === 'precio_unitario' || field === 'costo_unitario') {
        const qty  = field === 'cantidad'         ? parseFloat(value) || 0 : parseFloat(updated.cantidad) || 0;
        const prec = field === 'precio_unitario'  ? parseFloat(value) || 0 : parseFloat(updated.precio_unitario) || 0;
        const cost = field === 'costo_unitario'   ? parseFloat(value) || 0 : parseFloat(updated.costo_unitario) || 0;
        updated.subtotal_precio = qty * prec;
        updated.subtotal_costo  = qty * cost;
      }
      return updated;
    }));
  };

  const handlePaquete = async e => {
    const pid = e.target.value;
    setPaqueteId(pid);
    if (!pid) return;
    const hayCaptura = items.some(i => i.descripcion?.trim());
    if (hayCaptura && !confirm('Cargar el paquete reemplaza las líneas actuales. ¿Continuar?')) {
      setPaqueteId(''); return;
    }
    const r = await getPaqueteArbol(pid);
    const lineas = itemsDesdeArbol(r.data.data);
    setItems(lineas.length ? lineas : [emptyItem()]);
  };

  const addItem  = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = key => setItems(prev => prev.filter(it => it._key !== key));

  const total_precio = items.reduce((s, i) => s + (parseFloat(i.subtotal_precio) || 0), 0);
  const total_costo  = items.reduce((s, i) => s + (parseFloat(i.subtotal_costo)  || 0), 0);
  const utilidad     = total_precio - total_costo;

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      ...form,
      cliente_id: form.cliente_id || null,
      auto_id: form.auto_id || null,
      anio: form.anio ? parseInt(form.anio) : null,
      items: items.map(({ _key, ...it }) => ({
        ...it,
        cantidad:        parseFloat(it.cantidad)        || 1,
        costo_unitario:  parseFloat(it.costo_unitario)  || 0,
        precio_unitario: parseFloat(it.precio_unitario) || 0,
        subtotal_costo:  parseFloat(it.subtotal_costo)  || 0,
        subtotal_precio: parseFloat(it.subtotal_precio) || 0,
        paquete_id:      it.paquete_id || null,
      })),
    };
    try {
      if (isEdit) await updateCotizacion(id, payload);
      else        await createCotizacion(payload);
      navigate('/cotizaciones');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar la cotización');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/cotizaciones')}
          className="text-[#9ca3af] hover:text-[#374151] text-sm">← Regresar</button>
        <h1 className="text-base font-bold text-[#111]">{isEdit ? 'Editar cotización' : 'Nueva cotización'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Cliente y auto */}
        <div className="bg-white rounded-xl border border-[#e5e5e5] p-5">
          <h2 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-4">Cliente y auto</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[#6b7280]">Cliente *</label>
                <button type="button" onClick={() => { setErrorAlta(''); setModalCliente(true); }}
                  className="text-[10px] text-[#1d4ed8] hover:underline font-semibold">+ Agregar cliente</button>
              </div>
              <select value={form.cliente_id} onChange={handleClienteChange}
                className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]">
                <option value="">Seleccionar cliente…</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.numero_cliente ? `${c.numero_cliente} — ` : ''}{c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[#6b7280]">Auto del cliente</label>
                {form.cliente_id && (
                  <button type="button" onClick={() => { setErrorAlta(''); setModalAuto(true); }}
                    className="text-[10px] text-[#1d4ed8] hover:underline font-semibold">+ Agregar auto</button>
                )}
              </div>
              <select value={form.auto_id} onChange={handleAutoChange} disabled={!form.cliente_id}
                className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] disabled:bg-[#f9fafb] disabled:text-[#9ca3af]">
                <option value="">{form.cliente_id ? 'Seleccionar auto…' : 'Primero elige cliente'}</option>
                {autosDelCliente.map(a => (
                  <option key={a.id} value={a.id}>
                    {[a.placa || 'S/P', a.marca, a.modelo, a.anio].filter(Boolean).join(' — ')}
                  </option>
                ))}
              </select>
              {form.cliente_id && autosDelCliente.length === 0 && (
                <p className="text-[11px] text-[#9ca3af] mt-1">
                  Este cliente no tiene autos —{' '}
                  <button type="button" onClick={() => { setErrorAlta(''); setModalAuto(true); }}
                    className="text-[#1d4ed8] hover:underline">agregar auto</button>
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[['placa','Placa'],['marca','Marca'],['modelo','Modelo'],['anio','Año']].map(([n,l]) => (
              <div key={n}>
                <label className="block text-xs font-medium text-[#6b7280] mb-1">{l}</label>
                <input name={n} value={form[n]} onChange={handleForm}
                  className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" />
              </div>
            ))}
          </div>
        </div>

        {/* Datos generales */}
        <div className="bg-white rounded-xl border border-[#e5e5e5] p-5">
          <h2 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-4">Datos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1">Nombre cliente</label>
              <input name="cliente_nombre" value={form.cliente_nombre} onChange={handleForm}
                className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1">Fecha</label>
              <input name="fecha" type="date" value={form.fecha} onChange={handleForm}
                className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1">Estatus</label>
              <select name="estatus" value={form.estatus} onChange={handleForm}
                className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]">
                {ESTATUS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[#6b7280] mb-1">Notas</label>
              <input name="notas" value={form.notas} onChange={handleForm}
                className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" />
            </div>
          </div>
        </div>

        {/* Ítems */}
        <div className="bg-white rounded-xl border border-[#e5e5e5] p-5">
          <div className="flex items-center justify-between mb-4 border-b pb-2 gap-3 flex-wrap">
            <h2 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">Servicios / Ítems</h2>
            <div className="flex items-center gap-3">
              {paquetes.length > 0 && (
                <select value={paqueteId} onChange={handlePaquete}
                  className="border border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8] rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]">
                  <option value="">⚡ Cargar paquete…</option>
                  {paquetes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              )}
              <button type="button" onClick={addItem}
                className="text-[#1d4ed8] hover:text-[#1e40af] text-sm font-semibold">+ Agregar</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[#9ca3af] text-xs" style={{ background: '#111111' }}>
                <tr>
                  <th className="text-left px-2 py-2 w-32">Actividad</th>
                  <th className="text-left px-2 py-2">Paquete (opcional)</th>
                  <th className="text-left px-2 py-2">Descripción *</th>
                  <th className="text-center px-2 py-2 w-16">Cant.</th>
                  <th className="text-right px-2 py-2 w-28">Costo unit.</th>
                  <th className="text-right px-2 py-2 w-28">Precio unit.</th>
                  <th className="text-right px-2 py-2 w-28">Subtotal</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3f4f6]">
                {items.map(it => (
                  <tr key={it._key}>
                    <td className="px-2 py-2">
                      <input value={it.actividad || ''} onChange={e => handleItem(it._key, 'actividad', e.target.value)}
                        placeholder="—" className="w-full border border-[#e5e5e5] rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#1d4ed8]" />
                    </td>
                    <td className="px-2 py-2">
                      <select value={it.paquete_id || ''} onChange={e => handleItem(it._key, 'paquete_id', e.target.value)}
                        className="w-full border border-[#e5e5e5] rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#1d4ed8]">
                        <option value="">— captura libre —</option>
                        {[
                          { codigo: 'cambio_aceite', label: '🛢️ Cambio de aceite' },
                          { codigo: 'afinacion',     label: '🔧 Afinación' },
                          { codigo: 'frenos',        label: '🛑 Frenos' },
                          { codigo: 'escaneo',       label: '📡 Escaneo' },
                        ].map(t => {
                          const grupo = catalogoItems.filter(i => i.tipo_servicio === t.codigo && i.activo !== 0);
                          if (grupo.length === 0) return null;
                          return (
                            <optgroup key={t.codigo} label={t.label}>
                              {grupo.sort((a,b) => a.orden - b.orden).map(i => (
                                <option key={i.id} value={i.id}>{i.nombre}</option>
                              ))}
                            </optgroup>
                          );
                        })}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input value={it.descripcion} onChange={e => handleItem(it._key, 'descripcion', e.target.value)}
                        required className="w-full border border-[#e5e5e5] rounded px-2 py-1 text-xs min-w-[140px] focus:outline-none focus:ring-1 focus:ring-[#1d4ed8]" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min="0.01" step="any" value={it.cantidad}
                        onChange={e => handleItem(it._key, 'cantidad', e.target.value)}
                        className="w-full border border-[#e5e5e5] rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-[#1d4ed8]" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" step="0.01" value={it.costo_unitario}
                        onChange={e => handleItem(it._key, 'costo_unitario', e.target.value)}
                        className="w-full border border-[#e5e5e5] rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-[#1d4ed8]" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" step="0.01" value={it.precio_unitario}
                        onChange={e => handleItem(it._key, 'precio_unitario', e.target.value)}
                        className="w-full border border-[#e5e5e5] rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-[#1d4ed8]" />
                    </td>
                    <td className="px-2 py-2 text-right text-[#059669] font-medium whitespace-nowrap">
                      {fmtMXN(it.subtotal_precio)}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(it._key)}
                          className="text-[#dc2626] hover:text-[#b91c1c] text-base leading-none">×</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-[#e5e5e5] bg-[#fafafa] text-sm font-semibold">
                <tr>
                  <td colSpan={5} className="px-2 py-3 text-right text-[#6b7280] text-xs">
                    Costo total: <span className="text-[#374151]">{fmtMXN(total_costo)}</span>
                  </td>
                  <td className="px-2 py-3 text-right text-[#374151]">Total precio:</td>
                  <td className="px-2 py-3 text-right text-[#059669]">{fmtMXN(total_precio)}</td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={6} className="px-2 pb-2 text-right text-[#6b7280] text-xs">Utilidad estimada:</td>
                  <td className={`px-2 pb-2 text-right font-bold ${utilidad >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'}`}>
                    {fmtMXN(utilidad)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {error && <p className="text-[#dc2626] text-sm">{error}</p>}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/cotizaciones')}
            className="bg-white border border-[#e5e5e5] text-[#374151] px-5 py-2 rounded-lg text-sm hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-semibold px-8 py-2 rounded-lg disabled:opacity-60">
            {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear cotización'}
          </button>
        </div>
      </form>

      {/* Modal alta rápida de cliente */}
      {modalCliente && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-sm space-y-3">
            <h3 className="text-sm font-bold text-[#111]">Nuevo cliente</h3>
            <input autoFocus value={nuevoCliente.nombre} onChange={e => setNuevoCliente(v => ({ ...v, nombre: e.target.value }))}
              placeholder="Nombre *" className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" />
            <input value={nuevoCliente.telefono} onChange={e => setNuevoCliente(v => ({ ...v, telefono: e.target.value }))}
              placeholder="Teléfono" className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" />
            <input value={nuevoCliente.email} onChange={e => setNuevoCliente(v => ({ ...v, email: e.target.value }))}
              placeholder="Email" type="email" className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" />
            {errorAlta && <p className="text-[#dc2626] text-xs">{errorAlta}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setModalCliente(false)}
                className="bg-white border border-[#e5e5e5] text-[#374151] px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button type="button" onClick={handleCrearCliente} disabled={guardandoAlta}
                className="bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold">
                {guardandoAlta ? 'Guardando…' : 'Guardar cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal alta rápida de auto */}
      {modalAuto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-sm space-y-3">
            <h3 className="text-sm font-bold text-[#111]">Nuevo auto de {form.cliente_nombre || 'cliente'}</h3>
            <input autoFocus value={nuevoAuto.placa} onChange={e => setNuevoAuto(v => ({ ...v, placa: e.target.value.toUpperCase() }))}
              placeholder="Placa *" className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" />
            <div className="grid grid-cols-3 gap-2">
              <input value={nuevoAuto.marca} onChange={e => setNuevoAuto(v => ({ ...v, marca: e.target.value }))}
                placeholder="Marca" className="border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" />
              <input value={nuevoAuto.modelo} onChange={e => setNuevoAuto(v => ({ ...v, modelo: e.target.value }))}
                placeholder="Modelo" className="border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" />
              <input value={nuevoAuto.anio} onChange={e => setNuevoAuto(v => ({ ...v, anio: e.target.value }))}
                placeholder="Año" type="number" className="border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" />
            </div>
            <p className="text-[11px] text-[#9ca3af]">Fotos, VIN y demás datos se pueden completar después en Autos.</p>
            {errorAlta && <p className="text-[#dc2626] text-xs">{errorAlta}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setModalAuto(false)}
                className="bg-white border border-[#e5e5e5] text-[#374151] px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button type="button" onClick={handleCrearAuto} disabled={guardandoAlta}
                className="bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold">
                {guardandoAlta ? 'Guardando…' : 'Guardar auto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
