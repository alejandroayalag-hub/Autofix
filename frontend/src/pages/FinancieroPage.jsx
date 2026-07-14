import { useEffect, useState } from 'react';
import {
  getGastos, createGasto, updateGasto, deleteGasto,
  getIngresos, createIngreso, updateIngreso, deleteIngreso,
  getFacturas, createFactura, updateFactura, deleteFactura,
  getResumen,
} from '../api/financiero';

const fmtMXN = v => `$${Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
const today  = () => new Date().toISOString().slice(0,10);

const GASTO_CATS = ['general','herramientas','refacciones','renta','servicios','nomina','impuestos','otro'];
const METODOS    = ['efectivo','transferencia','tarjeta','cheque'];
const FACT_TIPOS = ['ingreso','egreso'];
const FACT_ESTATUS = ['pendiente','pagada','cancelada'];

/* ─── MINI MODALES (shared) ─────────────────────────────────── */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e5e5]">
          <h2 className="font-semibold text-[#111] text-sm">{title}</h2>
          <button onClick={onClose} className="text-[#9ca3af] hover:text-[#374151] text-xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#6b7280] mb-1">{label}</label>
      {children}
    </div>
  );
}

/* ─── GASTOS TAB ─────────────────────────────────────────────── */
function GastosTab() {
  const [rows, setRows]     = useState([]);
  const [modal, setModal]   = useState(null); // null | 'new' | row
  const [form, setForm]     = useState({});
  const [loading, setLoading] = useState(false);

  const cargar = () => getGastos().then(r => setRows(r.data));
  useEffect(() => { cargar(); }, []);

  const openNew = () => {
    setForm({ fecha: today(), categoria:'general', descripcion:'', monto:'', proveedor:'', tiene_factura:0, notas:'' });
    setModal('new');
  };
  const openEdit = row => { setForm({ ...row, tiene_factura: row.tiene_factura || 0 }); setModal(row.id); };
  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? (checked ? 1 : 0) : value }));
  };
  const handleSave = async e => {
    e.preventDefault(); setLoading(true);
    try {
      if (modal === 'new') await createGasto(form);
      else                 await updateGasto(modal, form);
      setModal(null); cargar();
    } finally { setLoading(false); }
  };
  const handleDelete = async id => { if (!confirm('¿Eliminar gasto?')) return; await deleteGasto(id); cargar(); };

  const totalGastos = rows.reduce((s, r) => s + (Number(r.monto) || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-[#6b7280]">Total: <span className="text-[#dc2626] font-bold">{fmtMXN(totalGastos)}</span></p>
        <button onClick={openNew} className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-semibold px-4 py-2 rounded-lg">
          + Nuevo gasto
        </button>
      </div>
      <div className="bg-white rounded-xl border border-[#e5e5e5] overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ background: '#111111' }} className="text-[#9ca3af] text-[10px] uppercase">
            <tr>
              <th className="text-left px-4 py-3">Fecha</th>
              <th className="text-left px-4 py-3">Categoría</th>
              <th className="text-left px-4 py-3">Descripción</th>
              <th className="text-left px-4 py-3">Proveedor</th>
              <th className="text-right px-4 py-3">Monto</th>
              <th className="text-center px-4 py-3">Factura</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f3f4f6]">
            {rows.length === 0 && <tr><td colSpan={7} className="text-center text-[#9ca3af] py-8">Sin gastos</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-[#eff6ff] transition-colors">
                <td className="px-4 py-3">{r.fecha}</td>
                <td className="px-4 py-3"><span className="bg-[#f3f4f6] text-[#374151] text-xs px-2 py-0.5 rounded">{r.categoria}</span></td>
                <td className="px-4 py-3">{r.descripcion}</td>
                <td className="px-4 py-3 text-[#6b7280]">{r.proveedor || '—'}</td>
                <td className="px-4 py-3 text-right font-medium text-[#dc2626]">{fmtMXN(r.monto)}</td>
                <td className="px-4 py-3 text-center text-xs">{r.tiene_factura ? '✓' : '—'}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(r)} className="bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] px-3 py-1 rounded text-xs mr-1">Editar</button>
                  <button onClick={() => handleDelete(r.id)} className="bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] px-3 py-1 rounded text-xs">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <Modal title={modal === 'new' ? 'Nuevo gasto' : 'Editar gasto'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
            <Field label="Fecha"><input type="date" name="fecha" value={form.fecha} onChange={handleChange} required className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" /></Field>
            <Field label="Categoría">
              <select name="categoria" value={form.categoria} onChange={handleChange} className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]">
                {GASTO_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Descripción *"><input name="descripcion" value={form.descripcion} onChange={handleChange} required className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" /></Field>
            <Field label="Monto *"><input type="number" step="0.01" name="monto" value={form.monto} onChange={handleChange} required className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" /></Field>
            <Field label="Proveedor"><input name="proveedor" value={form.proveedor || ''} onChange={handleChange} className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" /></Field>
            <Field label="Notas"><input name="notas" value={form.notas || ''} onChange={handleChange} className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" /></Field>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="tiene_factura" name="tiene_factura" checked={form.tiene_factura === 1} onChange={handleChange} className="w-4 h-4 accent-[#1d4ed8]" />
              <label htmlFor="tiene_factura" className="text-sm text-[#374151]">Tiene factura</label>
            </div>
            <div className="col-span-2 flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setModal(null)} className="bg-white border border-[#e5e5e5] text-[#374151] px-4 py-2 text-sm rounded hover:bg-[#f9fafb]">Cancelar</button>
              <button type="submit" disabled={loading} className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-semibold px-6 py-2 rounded-lg disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ─── INGRESOS TAB ───────────────────────────────────────────── */
function IngresosTab() {
  const [rows, setRows]     = useState([]);
  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState({});
  const [loading, setLoading] = useState(false);

  const cargar = () => getIngresos().then(r => setRows(r.data));
  useEffect(() => { cargar(); }, []);

  const openNew  = () => { setForm({ fecha: today(), descripcion:'', monto:'', metodo_pago:'efectivo', notas:'' }); setModal('new'); };
  const openEdit = row => { setForm({ ...row }); setModal(row.id); };
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const handleSave = async e => {
    e.preventDefault(); setLoading(true);
    try {
      if (modal === 'new') await createIngreso(form);
      else                 await updateIngreso(modal, form);
      setModal(null); cargar();
    } finally { setLoading(false); }
  };
  const handleDelete = async id => { if (!confirm('¿Eliminar ingreso?')) return; await deleteIngreso(id); cargar(); };

  const total = rows.reduce((s, r) => s + (Number(r.monto) || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-[#6b7280]">Total: <span className="text-[#059669] font-bold">{fmtMXN(total)}</span></p>
        <button onClick={openNew} className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-semibold px-4 py-2 rounded-lg">
          + Nuevo ingreso
        </button>
      </div>
      <div className="bg-white rounded-xl border border-[#e5e5e5] overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ background: '#111111' }} className="text-[#9ca3af] text-[10px] uppercase">
            <tr>
              <th className="text-left px-4 py-3">Fecha</th>
              <th className="text-left px-4 py-3">Descripción</th>
              <th className="text-left px-4 py-3">Método pago</th>
              <th className="text-right px-4 py-3">Monto</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f3f4f6]">
            {rows.length === 0 && <tr><td colSpan={5} className="text-center text-[#9ca3af] py-8">Sin ingresos manuales</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-[#eff6ff] transition-colors">
                <td className="px-4 py-3">{r.fecha}</td>
                <td className="px-4 py-3">{r.descripcion}</td>
                <td className="px-4 py-3"><span className="bg-[#eff6ff] text-[#1d4ed8] text-xs px-2 py-0.5 rounded">{r.metodo_pago}</span></td>
                <td className="px-4 py-3 text-right font-medium text-[#059669]">{fmtMXN(r.monto)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(r)} className="bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] px-3 py-1 rounded text-xs mr-1">Editar</button>
                  <button onClick={() => handleDelete(r.id)} className="bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] px-3 py-1 rounded text-xs">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <Modal title={modal === 'new' ? 'Nuevo ingreso' : 'Editar ingreso'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
            <Field label="Fecha"><input type="date" name="fecha" value={form.fecha} onChange={handleChange} required className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" /></Field>
            <Field label="Método pago">
              <select name="metodo_pago" value={form.metodo_pago} onChange={handleChange} className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]">
                {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Descripción *"><input name="descripcion" value={form.descripcion} onChange={handleChange} required className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" /></Field>
            <Field label="Monto *"><input type="number" step="0.01" name="monto" value={form.monto} onChange={handleChange} required className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" /></Field>
            <Field label="Notas"><input name="notas" value={form.notas || ''} onChange={handleChange} className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] col-span-2" /></Field>
            <div className="col-span-2 flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setModal(null)} className="bg-white border border-[#e5e5e5] text-[#374151] px-4 py-2 text-sm rounded hover:bg-[#f9fafb]">Cancelar</button>
              <button type="submit" disabled={loading} className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-semibold px-6 py-2 rounded-lg disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ─── FACTURAS TAB ───────────────────────────────────────────── */
function FacturasTab() {
  const [rows, setRows]     = useState([]);
  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState({});
  const [loading, setLoading] = useState(false);

  const cargar = () => getFacturas().then(r => setRows(r.data));
  useEffect(() => { cargar(); }, []);

  const openNew  = () => { setForm({ fecha: today(), numero:'', tipo:'ingreso', cliente_nombre:'', concepto:'', subtotal:'', iva:'', total:'', estatus:'pendiente', notas:'' }); setModal('new'); };
  const openEdit = row => { setForm({ ...row }); setModal(row.id); };
  const handleChange = e => {
    const f2 = { ...form, [e.target.name]: e.target.value };
    if (e.target.name === 'subtotal' || e.target.name === 'iva') {
      f2.total = String((parseFloat(f2.subtotal) || 0) + (parseFloat(f2.iva) || 0));
    }
    setForm(f2);
  };
  const handleSave = async e => {
    e.preventDefault(); setLoading(true);
    try {
      if (modal === 'new') await createFactura(form);
      else                 await updateFactura(modal, form);
      setModal(null); cargar();
    } finally { setLoading(false); }
  };
  const handleDelete = async id => { if (!confirm('¿Eliminar factura?')) return; await deleteFactura(id); cargar(); };

  const ESTATUS_COLOR = { pendiente:'bg-[#fef9c3] text-[#a16207]', pagada:'bg-[#dcfce7] text-[#166534]', cancelada:'bg-[#f3f4f6] text-[#6b7280]' };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-[#6b7280]">{rows.length} facturas</p>
        <button onClick={openNew} className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-semibold px-4 py-2 rounded-lg">
          + Nueva factura
        </button>
      </div>
      <div className="bg-white rounded-xl border border-[#e5e5e5] overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ background: '#111111' }} className="text-[#9ca3af] text-[10px] uppercase">
            <tr>
              <th className="text-left px-4 py-3">Fecha</th>
              <th className="text-left px-4 py-3">Número</th>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-left px-4 py-3">Cliente</th>
              <th className="text-left px-4 py-3">Concepto</th>
              <th className="text-right px-4 py-3">Total</th>
              <th className="text-center px-4 py-3">Estatus</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f3f4f6]">
            {rows.length === 0 && <tr><td colSpan={8} className="text-center text-[#9ca3af] py-8">Sin facturas</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-[#eff6ff] transition-colors">
                <td className="px-4 py-3">{r.fecha}</td>
                <td className="px-4 py-3 font-mono text-[#9ca3af]">{r.numero || '—'}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded ${r.tipo === 'ingreso' ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fef2f2] text-[#dc2626]'}`}>{r.tipo}</span></td>
                <td className="px-4 py-3">{r.cliente_nombre || '—'}</td>
                <td className="px-4 py-3">{r.concepto}</td>
                <td className="px-4 py-3 text-right font-medium">{fmtMXN(r.total)}</td>
                <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-0.5 rounded ${ESTATUS_COLOR[r.estatus] || ''}`}>{r.estatus}</span></td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(r)} className="bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] px-3 py-1 rounded text-xs mr-1">Editar</button>
                  <button onClick={() => handleDelete(r.id)} className="bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] px-3 py-1 rounded text-xs">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <Modal title={modal === 'new' ? 'Nueva factura' : 'Editar factura'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
            <Field label="Fecha"><input type="date" name="fecha" value={form.fecha} onChange={handleChange} required className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" /></Field>
            <Field label="Número"><input name="numero" value={form.numero || ''} onChange={handleChange} className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" /></Field>
            <Field label="Tipo">
              <select name="tipo" value={form.tipo} onChange={handleChange} className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]">
                {FACT_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Estatus">
              <select name="estatus" value={form.estatus} onChange={handleChange} className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]">
                {FACT_ESTATUS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Cliente"><input name="cliente_nombre" value={form.cliente_nombre || ''} onChange={handleChange} className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" /></Field>
            <Field label="Concepto *"><input name="concepto" value={form.concepto} onChange={handleChange} required className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" /></Field>
            <Field label="Subtotal"><input type="number" step="0.01" name="subtotal" value={form.subtotal || ''} onChange={handleChange} className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" /></Field>
            <Field label="IVA"><input type="number" step="0.01" name="iva" value={form.iva || ''} onChange={handleChange} className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" /></Field>
            <Field label="Total"><input type="number" step="0.01" name="total" value={form.total || ''} onChange={handleChange} className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" /></Field>
            <Field label="Notas"><input name="notas" value={form.notas || ''} onChange={handleChange} className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" /></Field>
            <div className="col-span-2 flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setModal(null)} className="bg-white border border-[#e5e5e5] text-[#374151] px-4 py-2 text-sm rounded hover:bg-[#f9fafb]">Cancelar</button>
              <button type="submit" disabled={loading} className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-semibold px-6 py-2 rounded-lg disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ─── GANANCIAS / DASHBOARD TAB ──────────────────────────────── */
function GananciasTab() {
  const [data, setData]   = useState(null);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const fetchResumen = (d, h) => {
    const params = {};
    if (d && h) { params.desde = d; params.hasta = h; }
    else if (d) { params.desde = d; }
    else if (h) { params.hasta = h; }
    getResumen(params).then(r => setData(r.data));
  };

  const cargar = () => fetchResumen(desde, hasta);

  useEffect(() => { fetchResumen('', ''); }, []);

  if (!data) return <p className="text-[#9ca3af] text-sm py-8 text-center">Cargando...</p>;

  const KPI_CARDS = [
    { label: 'Ingresos servicios', value: data.ingresos_servicios, gradient: 'linear-gradient(135deg,#1d4ed8,#1e40af)' },
    { label: 'Ingresos manuales',  value: data.ingresos_manuales,  gradient: 'linear-gradient(135deg,#374151,#1f2937)' },
    { label: 'Total ingresos',     value: data.total_ingresos,     gradient: 'linear-gradient(135deg,#059669,#047857)', big: true },
    { label: 'Costo servicios',    value: data.costo_servicios,    gradient: 'linear-gradient(135deg,#374151,#111111)' },
    { label: 'Total gastos',       value: data.total_gastos,       gradient: 'linear-gradient(135deg,#dc2626,#b91c1c)' },
    { label: 'Ganancia bruta',     value: data.ganancia_bruta,     gradient: data.ganancia_bruta >= 0 ? 'linear-gradient(135deg,#1d4ed8,#1e40af)' : 'linear-gradient(135deg,#dc2626,#b91c1c)' },
    { label: 'Ganancia neta',      value: data.ganancia_neta,      gradient: data.ganancia_neta >= 0  ? 'linear-gradient(135deg,#059669,#047857)' : 'linear-gradient(135deg,#dc2626,#b91c1c)', big: true },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <label className="text-[#6b7280]">Desde:</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            className="border border-[#e5e5e5] rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-[#6b7280]">Hasta:</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            className="border border-[#e5e5e5] rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]" />
        </div>
        <button onClick={cargar}
          className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm px-4 py-1.5 rounded-lg">
          Aplicar
        </button>
        {(desde || hasta) && (
          <button onClick={() => { setDesde(''); setHasta(''); fetchResumen('', ''); }}
            className="text-sm text-[#9ca3af] hover:text-[#374151]">Limpiar</button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {KPI_CARDS.map(({ label, value, gradient, big }) => (
          <div key={label} style={{ background: gradient }} className={`rounded-xl p-4 text-white relative overflow-hidden ${big ? 'md:col-span-2' : ''}`}>
            <div style={{ position:'absolute', top:-16, right:-16, width:72, height:72, borderRadius:'50%', background:'rgba(255,255,255,0.07)' }} />
            <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70 mb-1.5">{label}</p>
            <p className={`font-extrabold leading-none ${big ? 'text-2xl' : 'text-xl'}`}>{fmtMXN(value)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Gastos por categoría */}
        <div className="bg-white rounded-xl border border-[#e5e5e5] p-4">
          <h3 className="font-semibold text-[#374151] mb-3 text-sm">Gastos por categoría</h3>
          {data.gastos_por_categoria.length === 0
            ? <p className="text-[#9ca3af] text-sm">Sin datos</p>
            : <div className="space-y-2">
                {data.gastos_por_categoria.map(g => (
                  <div key={g.categoria} className="flex items-center gap-2">
                    <span className="text-xs text-[#6b7280] w-28 truncate">{g.categoria}</span>
                    <div className="flex-1 bg-[#f3f4f6] rounded-full h-2">
                      <div className="bg-[#1d4ed8] h-2 rounded-full"
                        style={{ width: `${Math.min(100, (g.total / data.total_gastos) * 100)}%` }} />
                    </div>
                    <span className="text-xs font-medium text-[#374151] w-24 text-right">{fmtMXN(g.total)}</span>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Servicios por mes */}
        <div className="bg-white rounded-xl border border-[#e5e5e5] p-4">
          <h3 className="font-semibold text-[#374151] mb-3 text-sm">Servicios por mes</h3>
          {data.servicios_por_mes.length === 0
            ? <p className="text-[#9ca3af] text-sm">Sin datos</p>
            : <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-[#9ca3af] uppercase">
                    <tr>
                      <th className="text-left py-1">Mes</th>
                      <th className="text-center py-1">Svcs</th>
                      <th className="text-right py-1">Ingresos</th>
                      <th className="text-right py-1">Utilidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f3f4f6]">
                    {data.servicios_por_mes.map(m => (
                      <tr key={m.mes}>
                        <td className="py-1">{m.mes}</td>
                        <td className="py-1 text-center text-[#6b7280]">{m.qty}</td>
                        <td className="py-1 text-right text-[#059669]">{fmtMXN(m.ingresos)}</td>
                        <td className={`py-1 text-right font-medium ${m.utilidad >= 0 ? 'text-[#1d4ed8]' : 'text-[#dc2626]'}`}>{fmtMXN(m.utilidad)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          }
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ──────────────────────────────────────────────── */
const TABS = [
  { id: 'ganancias', label: 'Ganancias' },
  { id: 'gastos',    label: 'Gastos' },
  { id: 'ingresos',  label: 'Ingresos' },
  { id: 'facturas',  label: 'Facturas' },
];

export default function FinancieroPage() {
  const [tab, setTab] = useState('ganancias');

  return (
    <div>
      <h1 className="text-base font-bold text-[#111] mb-4">Módulo Financiero</h1>
      <div className="flex gap-1 mb-5 border-b border-[#e5e5e5]">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-[#1d4ed8] text-white font-semibold rounded-t-lg'
                : 'text-[#6b7280] hover:text-[#374151] hover:bg-[#f3f4f6] rounded-t-lg'
            }`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'ganancias' && <GananciasTab />}
      {tab === 'gastos'    && <GastosTab />}
      {tab === 'ingresos'  && <IngresosTab />}
      {tab === 'facturas'  && <FacturasTab />}
    </div>
  );
}
