import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClientes, crearCliente, actualizarCliente, eliminarCliente } from '../api/clientes';
import { getAutos } from '../api/autos';

const INPUT = 'w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]';
const LABEL = 'text-xs text-[#6b7280] mb-1 block';

const VACÍO = {
  nombre: '', telefono: '', email: '', notas: '',
  rfc: '', razon_social: '', calle_numero: '', colonia: '',
  codigo_postal: '', correo_facturacion: '', regimen_fiscal: '',
  nombre_contacto: '', telefono_contacto: '',
};

const REGIMENES = [
  '601 - General de Ley Personas Morales',
  '603 - Personas Morales con Fines no Lucrativos',
  '605 - Sueldos y Salarios e Ingresos Asimilados a Salarios',
  '606 - Arrendamiento',
  '607 - Régimen de Enajenación o Adquisición de Bienes',
  '608 - Demás ingresos',
  '610 - Residentes en el Extranjero sin Establecimiento Permanente en México',
  '611 - Ingresos por Dividendos (socios y accionistas)',
  '612 - Personas Físicas con Actividades Empresariales y Profesionales',
  '614 - Ingresos por intereses',
  '615 - Régimen de los ingresos por obtención de premios',
  '616 - Sin obligaciones fiscales',
  '620 - Sociedades Cooperativas de Producción que optan por diferir sus ingresos',
  '621 - Incorporación Fiscal',
  '622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
  '623 - Opcional para Grupos de Sociedades',
  '624 - Coordinados',
  '625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas',
  '626 - Régimen Simplificado de Confianza',
];

/* ── Tarjeta colapsable ───────────────────────────────────────── */
function ClienteCard({ c, autos, onEditar, onEliminar, onAgregarAuto }) {
  const [abierto, setAbierto] = useState(false);

  const datosContacto = [c.telefono, c.email].filter(Boolean).join(' · ') || null;
  const tieneFacturacion = c.rfc || c.razon_social || c.regimen_fiscal;

  return (
    <div className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden">
      {/* Cabecera */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#f9fafb] transition-colors select-none"
        onClick={() => setAbierto(a => !a)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#eff6ff] border border-[#bfdbfe] flex items-center justify-center shrink-0">
            <span className="text-[#1d4ed8] text-xs font-bold">{(c.nombre?.[0] ?? '?').toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#111] truncate">{c.nombre}</p>
            {c.razon_social && <p className="text-[11px] text-[#6b7280] truncate">{c.razon_social}</p>}
            {!c.razon_social && datosContacto && <p className="text-[11px] text-[#9ca3af] truncate">{datosContacto}</p>}
          </div>
          {c.rfc && (
            <span className="hidden sm:inline text-[10px] font-mono text-[#6b7280] bg-[#f3f4f6] px-2 py-0.5 rounded shrink-0">
              {c.rfc}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <button onClick={e => { e.stopPropagation(); onEditar(c); }}
            className="bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] px-3 py-1 rounded text-xs hover:bg-[#dbeafe]">
            Editar
          </button>
          <button onClick={e => { e.stopPropagation(); onEliminar(c.id); }}
            className="bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] px-3 py-1 rounded text-xs hover:bg-[#fee2e2]">
            Eliminar
          </button>
          <span className={`text-[#9ca3af] transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}>▾</span>
        </div>
      </div>

      {/* Detalle */}
      {abierto && (
        <div className="border-t border-[#f3f4f6] px-4 py-4 space-y-4">
          {/* Autos del cliente */}
          <div>
            <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider mb-2">
              Autos {autos.length > 0 && `(${autos.length})`}
            </p>
            {autos.length === 0 ? (
              <p className="text-sm text-[#9ca3af] mb-2">Sin autos registrados</p>
            ) : (
              <div className="space-y-1.5 mb-2">
                {autos.map(a => (
                  <div key={a.id} className="flex items-center gap-3 bg-[#f9fafb] border border-[#f3f4f6] rounded-lg px-3 py-2 text-sm">
                    <span>🚗</span>
                    <span className="font-mono font-semibold text-[#111]">{a.placa || 'S/P'}</span>
                    <span className="text-[#374151]">{[a.marca, a.modelo, a.anio].filter(Boolean).join(' ')}</span>
                    {a.color && <span className="text-[#9ca3af] text-xs">{a.color}</span>}
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => onAgregarAuto(c.id)}
              className="bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#dcfce7]">
              🚗 + Agregar auto
            </button>
          </div>

          {/* Contacto */}
          <div>
            <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider mb-2">Contacto</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
              {[
                ['Teléfono', c.telefono],
                ['Email', c.email],
                ['Nombre contacto', c.nombre_contacto],
                ['Tel. contacto', c.telefono_contacto],
              ].map(([k, v]) => v ? (
                <div key={k}>
                  <span className="text-[10px] text-[#9ca3af] uppercase tracking-wider block">{k}</span>
                  <span className="font-medium text-[#111]">{v}</span>
                </div>
              ) : null)}
            </div>
          </div>

          {/* Datos fiscales */}
          {tieneFacturacion && (
            <div>
              <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider mb-2">Datos fiscales</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                {[
                  ['RFC', c.rfc],
                  ['Razón social', c.razon_social],
                  ['Régimen fiscal', c.regimen_fiscal],
                  ['Correo facturación', c.correo_facturacion],
                ].map(([k, v]) => v ? (
                  <div key={k} className={k === 'Razón social' || k === 'Régimen fiscal' ? 'col-span-2 sm:col-span-3' : ''}>
                    <span className="text-[10px] text-[#9ca3af] uppercase tracking-wider block">{k}</span>
                    <span className="font-medium text-[#111]">{v}</span>
                  </div>
                ) : null)}
              </div>
            </div>
          )}

          {/* Dirección */}
          {(c.calle_numero || c.colonia || c.codigo_postal) && (
            <div>
              <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider mb-1">Dirección</p>
              <p className="text-sm text-[#374151]">
                {[c.calle_numero, c.colonia, c.codigo_postal].filter(Boolean).join(', ')}
              </p>
            </div>
          )}

          {/* CSF PDF */}
          {c.csf_pdf && (
            <div>
              <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider mb-1">Constancia de Situación Fiscal</p>
              <a href={c.csf_pdf} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[#1d4ed8] hover:underline">
                <span>📄</span> Ver PDF
              </a>
            </div>
          )}

          {/* Notas */}
          {c.notas && (
            <div>
              <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider mb-1">Notas</p>
              <p className="text-sm text-[#374151]">{c.notas}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Página principal ─────────────────────────────────────────── */
export default function ClientesPage() {
  const [clientes, setClientes]       = useState([]);
  const [autos, setAutos]             = useState([]);
  const [form, setForm]               = useState(VACÍO);
  const [csfFile, setCsfFile]         = useState(null);
  const [csfExistente, setCsfExistente] = useState(null);
  const [editandoId, setEditandoId]   = useState(null);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [listaAbierta, setListaAbierta] = useState(false);
  const [busqueda, setBusqueda]       = useState('');
  const [error, setError]             = useState('');
  const [guardando, setGuardando]     = useState(false);
  const csfRef = useRef(null);
  const navigate = useNavigate();

  const irAgregarAuto = clienteId => navigate(`/autos?nuevo=1&cliente_id=${clienteId}`);

  const cargar = () => getClientes().then(setClientes);
  useEffect(() => {
    cargar();
    getAutos().then(r => setAutos(r.data?.data ?? []));
  }, []);

  const autosDe = clienteId => autos.filter(a => a.cliente_id === clienteId || a.cliente_id === Number(clienteId));

  const clientesFiltrados = busqueda.trim()
    ? clientes.filter(c => {
        const q = busqueda.trim().toLowerCase();
        return (c.nombre ?? '').toLowerCase().includes(q)
          || (c.razon_social ?? '').toLowerCase().includes(q);
      })
    : clientes;

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const abrirNuevo = () => {
    setForm(VACÍO); setCsfFile(null); setCsfExistente(null);
    setEditandoId(null); setError(''); setPanelAbierto(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditar = c => {
    setEditandoId(c.id);
    setForm({
      nombre: c.nombre || '', telefono: c.telefono || '', email: c.email || '', notas: c.notas || '',
      rfc: c.rfc || '', razon_social: c.razon_social || '', calle_numero: c.calle_numero || '',
      colonia: c.colonia || '', codigo_postal: c.codigo_postal || '',
      correo_facturacion: c.correo_facturacion || '', regimen_fiscal: c.regimen_fiscal || '',
      nombre_contacto: c.nombre_contacto || '', telefono_contacto: c.telefono_contacto || '',
    });
    setCsfFile(null);
    setCsfExistente(c.csf_pdf || null);
    setError(''); setPanelAbierto(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGuardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return; }
    setError(''); setGuardando(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v || ''));
      if (csfFile) fd.append('csf_pdf', csfFile);
      else if (csfExistente) fd.append('csf_pdf_existing', csfExistente);

      let nuevoId = null;
      if (editandoId) await actualizarCliente(editandoId, fd);
      else { const nuevo = await crearCliente(fd); nuevoId = nuevo?.id; }

      setForm(VACÍO); setCsfFile(null); setCsfExistente(null);
      setEditandoId(null); setPanelAbierto(false); cargar();

      if (nuevoId && confirm('Cliente guardado. ¿Registrar su auto ahora?')) {
        irAgregarAuto(nuevoId);
      }
    } catch {
      setError('Error al guardar');
    } finally { setGuardando(false); }
  };

  const handleEliminar = async id => {
    if (!confirm('¿Eliminar este cliente?')) return;
    await eliminarCliente(id); cargar();
  };

  const handleCancelar = () => {
    setForm(VACÍO); setCsfFile(null); setCsfExistente(null);
    setEditandoId(null); setError(''); setPanelAbierto(false);
  };

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-base font-bold text-[#111] mr-2">Catálogo de clientes</h1>

        {/* Input búsqueda */}
        <div className="relative flex-1 min-w-[160px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af] text-sm">🔍</span>
          <input
            type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o razón social…"
            className="w-full border border-[#e5e5e5] rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] bg-white"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#374151] text-sm">✕</button>
          )}
        </div>

        <button onClick={abrirNuevo}
          className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white px-4 py-2 rounded-lg text-sm font-semibold shrink-0 ml-auto">
          + Nuevo cliente
        </button>
      </div>

      {/* ── Formulario ── */}
      {panelAbierto && (
        <div className="bg-white rounded-xl border border-[#e5e5e5] p-5 space-y-6">
          <h2 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
            {editandoId ? 'Editar cliente' : 'Nuevo cliente'}
          </h2>

          {/* Datos generales */}
          <section>
            <h3 className="text-xs font-semibold text-[#111] uppercase tracking-wider mb-3 pb-1 border-b border-[#f3f4f6]">
              Datos generales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={LABEL}>Nombre *</label>
                <input name="nombre" value={form.nombre} onChange={handle} className={INPUT} placeholder="Nombre del cliente" />
              </div>
              <div>
                <label className={LABEL}>Teléfono</label>
                <input name="telefono" value={form.telefono} onChange={handle} className={INPUT} placeholder="442 123 4567" />
              </div>
              <div>
                <label className={LABEL}>Email</label>
                <input name="email" value={form.email} onChange={handle} className={INPUT} placeholder="correo@ejemplo.com" type="email" />
              </div>
            </div>
          </section>

          {/* Contacto */}
          <section>
            <h3 className="text-xs font-semibold text-[#111] uppercase tracking-wider mb-3 pb-1 border-b border-[#f3f4f6]">
              Datos de contacto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Nombre del contacto</label>
                <input name="nombre_contacto" value={form.nombre_contacto} onChange={handle} className={INPUT} placeholder="Responsable de pagos" />
              </div>
              <div>
                <label className={LABEL}>Teléfono de contacto</label>
                <input name="telefono_contacto" value={form.telefono_contacto} onChange={handle} className={INPUT} placeholder="442 987 6543" />
              </div>
            </div>
          </section>

          {/* Datos fiscales */}
          <section>
            <h3 className="text-xs font-semibold text-[#111] uppercase tracking-wider mb-3 pb-1 border-b border-[#f3f4f6]">
              Datos fiscales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>RFC</label>
                <input name="rfc" value={form.rfc} onChange={handle} className={INPUT} placeholder="XAXX010101000"
                  style={{ textTransform: 'uppercase' }} />
              </div>
              <div>
                <label className={LABEL}>Correo de facturación</label>
                <input name="correo_facturacion" value={form.correo_facturacion} onChange={handle} className={INPUT} placeholder="facturas@empresa.com" type="email" />
              </div>
              <div className="md:col-span-2">
                <label className={LABEL}>Razón social (como aparece en el RFC)</label>
                <input name="razon_social" value={form.razon_social} onChange={handle} className={INPUT} placeholder="EMPRESA SA DE CV" style={{ textTransform: 'uppercase' }} />
              </div>
              <div className="md:col-span-2">
                <label className={LABEL}>Régimen fiscal</label>
                <select name="regimen_fiscal" value={form.regimen_fiscal} onChange={handle} className={INPUT}>
                  <option value="">Seleccionar régimen...</option>
                  {REGIMENES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Dirección */}
          <section>
            <h3 className="text-xs font-semibold text-[#111] uppercase tracking-wider mb-3 pb-1 border-b border-[#f3f4f6]">
              Dirección
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={LABEL}>Calle y número</label>
                <input name="calle_numero" value={form.calle_numero} onChange={handle} className={INPUT} placeholder="Av. Constitución 123" />
              </div>
              <div>
                <label className={LABEL}>Colonia</label>
                <input name="colonia" value={form.colonia} onChange={handle} className={INPUT} placeholder="Centro" />
              </div>
              <div>
                <label className={LABEL}>Código postal</label>
                <input name="codigo_postal" value={form.codigo_postal} onChange={handle} className={INPUT} placeholder="76000" maxLength={5} />
              </div>
            </div>
          </section>

          {/* CSF PDF */}
          <section>
            <h3 className="text-xs font-semibold text-[#111] uppercase tracking-wider mb-3 pb-1 border-b border-[#f3f4f6]">
              Constancia de Situación Fiscal (CSF)
            </h3>
            <div className="flex flex-col gap-2">
              {(csfFile || csfExistente) ? (
                <div className="flex items-center gap-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg px-4 py-3">
                  <span className="text-lg">📄</span>
                  <div className="flex-1 min-w-0">
                    {csfFile
                      ? <p className="text-sm font-medium text-[#166534] truncate">{csfFile.name}</p>
                      : <a href={csfExistente} target="_blank" rel="noreferrer" className="text-sm font-medium text-[#166534] hover:underline">Ver CSF actual</a>
                    }
                    <p className="text-xs text-[#4ade80]">PDF listo</p>
                  </div>
                  <button type="button" onClick={() => { setCsfFile(null); setCsfExistente(null); if (csfRef.current) csfRef.current.value = ''; }}
                    className="text-[#dc2626] hover:text-red-700 text-sm">✕</button>
                </div>
              ) : (
                <div
                  className="flex items-center justify-center h-20 border-2 border-dashed border-[#d1d5db] rounded-lg cursor-pointer hover:border-[#1d4ed8] hover:bg-blue-50 transition-colors"
                  onClick={() => csfRef.current?.click()}
                >
                  <span className="text-[#9ca3af] text-sm">📄 Seleccionar PDF de CSF</span>
                </div>
              )}
              <input ref={csfRef} type="file" accept="application/pdf" className="hidden"
                onChange={e => { const f = e.target.files[0]; if (f) { setCsfFile(f); setCsfExistente(null); } e.target.value = ''; }} />
              <button type="button" onClick={() => csfRef.current?.click()}
                className="text-xs text-[#1d4ed8] hover:underline text-left">
                {csfFile || csfExistente ? '📄 Cambiar PDF' : '📄 Seleccionar PDF'}
              </button>
            </div>
          </section>

          {/* Notas */}
          <section>
            <h3 className="text-xs font-semibold text-[#111] uppercase tracking-wider mb-3 pb-1 border-b border-[#f3f4f6]">
              Notas
            </h3>
            <textarea name="notas" value={form.notas} onChange={handle} className={INPUT} rows={2} placeholder="Observaciones adicionales..." />
          </section>

          {error && <p className="text-[#dc2626] text-sm">{error}</p>}

          <div className="flex gap-2">
            <button onClick={handleGuardar} disabled={guardando}
              className="bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-semibold">
              {guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Agregar'}
            </button>
            <button onClick={handleCancelar}
              className="bg-white border border-[#e5e5e5] text-[#374151] px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Lista colapsable ── */}
      <div className="bg-white rounded-xl border border-[#e5e5e5] overflow-hidden">

        {/* Cabecera toggle */}
        <button
          onClick={() => setListaAbierta(a => !a)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#f9fafb] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#111]">Clientes registrados</span>
            <span className="bg-[#f3f4f6] text-[#6b7280] text-xs font-medium px-2 py-0.5 rounded-full">{clientes.length}</span>
          </div>
          <span className={`text-[#9ca3af] transition-transform duration-200 ${listaAbierta ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {/* Contenido */}
        {listaAbierta && (
          <div className="border-t border-[#f3f4f6] p-4 space-y-3">

              {busqueda && (
              <p className="text-xs text-[#6b7280]">
                {clientesFiltrados.length === 0 ? 'Sin resultados' : `${clientesFiltrados.length} cliente${clientesFiltrados.length !== 1 ? 's' : ''} encontrado${clientesFiltrados.length !== 1 ? 's' : ''}`}
              </p>
            )}

            {clientes.length === 0 ? (
              <p className="text-sm text-[#9ca3af] text-center py-4">Sin clientes registrados</p>
            ) : clientesFiltrados.length === 0 ? (
              <p className="text-sm text-[#9ca3af] text-center py-4">Sin resultados para "{busqueda}"</p>
            ) : (
              <div className="space-y-2">
                {clientesFiltrados.map(c => (
                  <ClienteCard key={c.id} c={c} autos={autosDe(c.id)} onEditar={handleEditar} onEliminar={handleEliminar} onAgregarAuto={irAgregarAuto} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
