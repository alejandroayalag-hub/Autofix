import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getOrden, generarCotizacion, enviarCotizacion } from '../api/ordenes';
import { updateCotizacion } from '../api/cotizaciones';
import { getCatalogo } from '../api/catalogo';

const fmtMXN = v =>
  `$${Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const emptyItem = () => ({
  _key: Math.random(),
  paquete_id: '',
  descripcion: '',
  cantidad: 1,
  precio_unitario: 0,
  costo_unitario: 0,
  subtotal_precio: 0,
  subtotal_costo: 0,
});

export default function OrdenCotizacionPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [orden, setOrden]       = useState(null);
  const [cotizacion, setCotizacion] = useState(null);
  const [items, setItems]       = useState([]);
  const [catalogoItems, setCatalogoItems] = useState([]);
  const [catalogoTab, setCatalogoTab]     = useState('cambio_aceite');
  const [itemConfig, setItemConfig]       = useState(null); // ítem configurable pendiente
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [sending, setSending]   = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState(null);
  const [showPaqueteModal, setShowPaqueteModal] = useState(false);

  const loadOrden = async () => {
    setLoading(true);
    setError('');
    try {
      const [ordenRes, paqRes] = await Promise.all([
        getOrden(id),
        getCatalogo(),
      ]);
      const ot = ordenRes.data.data;
      setOrden(ot);
      setCatalogoItems(paqRes);
      if (ot.cotizacion) {
        setCotizacion(ot.cotizacion);
        setItems(
          ot.cotizacion.items.length
            ? ot.cotizacion.items.map(i => ({ ...i, _key: Math.random() }))
            : [emptyItem()]
        );
      } else {
        setCotizacion(null);
        // Si viene del diagnóstico de frenos, pre-cargar ítems detectados
        const key = `frenos_items_${id}`;
        const frenosItems = sessionStorage.getItem(key);
        if (frenosItems) {
          sessionStorage.removeItem(key);
          const parsed = JSON.parse(frenosItems);
          setItems(parsed.length > 0
            ? parsed.map(fi => ({ ...emptyItem(), descripcion: fi.descripcion, cantidad: fi.cantidad || 1, _key: Math.random() }))
            : []
          );
        } else {
          setItems([]);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar la orden');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrden(); }, [id]);

  // ── Manejo de ítems ──────────────────────────────────────────────────────
  const recalc = (item) => {
    const qty  = parseFloat(item.cantidad)        || 0;
    const prec = parseFloat(item.precio_unitario) || 0;
    const cost = parseFloat(item.costo_unitario)  || 0;
    return { ...item, subtotal_precio: qty * prec, subtotal_costo: qty * cost };
  };

  const handleItem = (key, field, value) => {
    setItems(prev => prev.map(it => {
      if (it._key !== key) return it;
      const updated = { ...it, [field]: value };
      if (field === 'cantidad' || field === 'precio_unitario' || field === 'costo_unitario') {
        return recalc(updated);
      }
      return updated;
    }));
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);

  const removeItem = key =>
    setItems(prev => prev.filter(it => it._key !== key));

  const addCatalogoItem = (item, cantidad) => {
    const newItem = recalc({
      ...emptyItem(),
      descripcion:     item.configurable
        ? `${item.nombre} (${cantidad} ${item.configurable === 'litros' ? 'L' : 'pzas'})`
        : item.nombre,
      precio_unitario: item.precio_unitario || 0,
      costo_unitario:  item.costo_unitario  || 0,
      cantidad:        cantidad || 1,
    });
    setItems(prev => [...prev, newItem]);
    setShowPaqueteModal(false);
    setItemConfig(null);
  };

  const handleClickCatalogoItem = (item) => {
    if (item.configurable) {
      setItemConfig({ item, cantidad: item.config_default || item.config_min || 1 });
    } else {
      addCatalogoItem(item, 1);
    }
  };

  // ── Totales ───────────────────────────────────────────────────────────────
  const total_precio = items.reduce((s, i) => s + (parseFloat(i.subtotal_precio) || 0), 0);
  const total_costo  = items.reduce((s, i) => s + (parseFloat(i.subtotal_costo)  || 0), 0);
  const utilidad     = total_precio - total_costo;

  // ── Generar cotización desde diagnóstico ──────────────────────────────────
  const handleGenerar = async () => {
    setGenerating(true);
    setError('');
    try {
      await generarCotizacion(id);
      setSuccess('Cotización generada');
      await loadOrden();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al generar la cotización');
    } finally {
      setGenerating(false);
    }
  };

  // ── Guardar ítems ─────────────────────────────────────────────────────────
  const handleGuardar = async () => {
    if (!cotizacion) return;
    setSaving(true);
    setError('');
    setSuccess('');
    const payload = {
      cliente_id:     cotizacion.cliente_id      || null,
      cliente_nombre: cotizacion.cliente_nombre  || null,
      placa:          orden?.placa               || null,
      marca:          orden?.marca               || null,
      modelo:         orden?.modelo              || null,
      anio:           orden?.anio                || null,
      fecha:          cotizacion.fecha           || new Date().toISOString().slice(0, 10),
      estatus:        cotizacion.estatus         || 'borrador',
      notas:          cotizacion.notas           || null,
      items: items.map(({ _key, ...it }) => ({
        ...it,
        paquete_id:      it.paquete_id      || null,
        cantidad:        parseFloat(it.cantidad)        || 1,
        precio_unitario: parseFloat(it.precio_unitario) || 0,
        costo_unitario:  parseFloat(it.costo_unitario)  || 0,
        subtotal_precio: parseFloat(it.subtotal_precio) || 0,
        subtotal_costo:  parseFloat(it.subtotal_costo)  || 0,
      })),
    };
    try {
      await updateCotizacion(cotizacion.id, payload);
      setSuccess('Cotización guardada correctamente');
      await loadOrden();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar la cotización');
    } finally {
      setSaving(false);
    }
  };

  // ── Enviar al cliente ─────────────────────────────────────────────────────
  const handleEnviar = async () => {
    setSending(true);
    setError('');
    setSuccess('');
    setWhatsappUrl(null);
    try {
      const res = await enviarCotizacion(id);
      const { whatsapp_url, email_enviado } = res.data.data;
      if (whatsapp_url) setWhatsappUrl(whatsapp_url);
      setSuccess(
        email_enviado
          ? 'Cotización enviada por email al cliente.'
          : 'Cotización marcada como enviada.'
      );
      await loadOrden();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar la cotización');
    } finally {
      setSending(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-[#6b7280] text-sm">
        Cargando…
      </div>
    );
  }

  if (!orden) {
    return (
      <div className="text-[#dc2626] text-sm p-4">
        {error || 'Orden no encontrada'}
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/ordenes/${id}`)}
          className="text-[#6b7280] hover:text-[#374151] text-sm"
        >
          ← Volver a OT
        </button>
        <h1 className="text-base font-bold text-[#111111]">
          Cotización — Orden #{id}
        </h1>
      </div>

      {/* ── Resumen vehículo ── */}
      <div className="bg-white rounded-xl border border-[#e5e5e5] p-5">
        <h2 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
          Vehículo
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-[#9ca3af] mb-0.5">Placa</p>
            <p className="font-semibold text-[#111111]">{orden.placa || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-[#9ca3af] mb-0.5">Vehículo</p>
            <p className="font-semibold text-[#111111]">
              {[orden.marca, orden.modelo, orden.anio].filter(Boolean).join(' ') || '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#9ca3af] mb-0.5">Cliente</p>
            <p className="font-semibold text-[#111111]">{orden.cliente_nombre || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-[#9ca3af] mb-0.5">Odómetro</p>
            <p className="font-semibold text-[#111111]">
              {orden.odometro ? `${Number(orden.odometro).toLocaleString('es-MX')} km` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Sin cotización ── */}
      {!cotizacion && (
        <div className="bg-white rounded-xl border border-[#e5e5e5] p-8 text-center space-y-4">
          <p className="text-[#6b7280] text-sm">
            Esta orden aún no tiene cotización activa.
          </p>
          <button
            onClick={handleGenerar}
            disabled={generating}
            className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-semibold px-6 py-2 rounded-lg disabled:opacity-60"
          >
            {generating ? 'Generando…' : 'Generar cotización desde diagnóstico'}
          </button>
          {error && <p className="text-[#dc2626] text-sm">{error}</p>}
        </div>
      )}

      {/* ── Tabla de ítems ── */}
      {cotizacion && (
        <>
          <div className="bg-white rounded-xl border border-[#e5e5e5] p-5">
            {/* Cabecera sección */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
                Ítems de cotización
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaqueteModal(true)}
                  className="text-xs font-semibold text-[#6b7280] border border-[#e5e5e5] hover:border-[#1d4ed8] hover:text-[#1d4ed8] px-3 py-1.5 rounded-lg transition-colors"
                >
                  Desde catálogo
                </button>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-xs font-semibold text-[#1d4ed8] border border-[#1d4ed8] hover:bg-[#1d4ed8] hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  + Agregar ítem
                </button>
              </div>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#111111' }}>
                    {['Descripción', 'Cantidad', 'Precio Unit.', 'Costo Unit.', 'Total', ''].map((h, i) => (
                      <th
                        key={i}
                        className={`text-xs font-semibold text-white px-3 py-2.5 ${
                          i === 0 ? 'text-left' :
                          i === 5 ? 'w-8' :
                          'text-right'
                        } ${i === 1 ? 'w-20' : ''} ${i >= 2 && i <= 4 ? 'w-32' : ''}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr
                      key={it._key}
                      className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#f9fafb]'} hover:bg-[#eff6ff] transition-colors`}
                    >
                      {/* Descripción */}
                      <td className="px-3 py-2">
                        <input
                          value={it.descripcion}
                          onChange={e => handleItem(it._key, 'descripcion', e.target.value)}
                          placeholder="Descripción del servicio"
                          className="w-full min-w-[160px] bg-transparent border-b border-transparent focus:border-[#1d4ed8] focus:outline-none text-[#111111] text-sm py-0.5 transition-colors"
                        />
                      </td>
                      {/* Cantidad */}
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={it.cantidad}
                          onChange={e => handleItem(it._key, 'cantidad', e.target.value)}
                          className="w-full text-right bg-transparent border-b border-transparent focus:border-[#1d4ed8] focus:outline-none text-[#111111] text-sm py-0.5 transition-colors"
                        />
                      </td>
                      {/* Precio unit */}
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={it.precio_unitario}
                          onChange={e => handleItem(it._key, 'precio_unitario', e.target.value)}
                          className="w-full text-right bg-transparent border-b border-transparent focus:border-[#1d4ed8] focus:outline-none text-[#111111] text-sm py-0.5 transition-colors"
                        />
                      </td>
                      {/* Costo unit */}
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={it.costo_unitario}
                          onChange={e => handleItem(it._key, 'costo_unitario', e.target.value)}
                          className="w-full text-right bg-transparent border-b border-transparent focus:border-[#1d4ed8] focus:outline-none text-[#111111] text-sm py-0.5 transition-colors"
                        />
                      </td>
                      {/* Total */}
                      <td className="px-3 py-2 text-right font-medium text-[#059669] whitespace-nowrap">
                        {fmtMXN(it.subtotal_precio)}
                      </td>
                      {/* Acciones */}
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(it._key)}
                          className="text-[#dc2626] hover:text-[#b91c1c] text-lg leading-none font-bold"
                          title="Eliminar ítem"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-[#9ca3af] text-sm">
                        Sin ítems. Agrega uno o importa desde catálogo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totales */}
            <div className="mt-4 pt-4 border-t border-[#e5e5e5] flex flex-col items-end gap-1.5">
              <div className="flex gap-6 text-sm">
                <span className="text-[#6b7280]">Total precio:</span>
                <span className="text-2xl font-bold text-[#1d4ed8] leading-none">
                  {fmtMXN(total_precio)}
                </span>
              </div>
              <div className="flex gap-6 text-sm">
                <span className="text-[#6b7280]">Total costo:</span>
                <span className="font-semibold text-[#374151]">{fmtMXN(total_costo)}</span>
              </div>
              <div className="flex gap-6 text-sm">
                <span className="text-[#6b7280]">Utilidad:</span>
                <span className={`font-bold text-base ${utilidad >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'}`}>
                  {fmtMXN(utilidad)}
                </span>
              </div>
            </div>
          </div>

          {/* ── Mensajes ── */}
          {error   && <p className="text-[#dc2626] text-sm">{error}</p>}
          {success && <p className="text-[#059669] text-sm">{success}</p>}

          {/* ── Botón WhatsApp ── */}
          {whatsappUrl && (
            <div className="bg-[#dcfce7] border border-[#86efac] rounded-xl p-4 flex items-center gap-3">
              <span className="text-sm text-[#166534]">
                Cotización enviada. Abre WhatsApp para notificar al cliente:
              </span>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-semibold px-4 py-2 rounded-lg"
              >
                Abrir WhatsApp
              </a>
            </div>
          )}

          {/* ── Botones inferiores ── */}
          <div className="flex gap-3 justify-end pb-8">
            <button
              type="button"
              onClick={handleGuardar}
              disabled={saving}
              className="bg-white border border-[#1d4ed8] text-[#1d4ed8] hover:bg-[#eff6ff] text-sm font-semibold px-6 py-2 rounded-lg disabled:opacity-60 transition-colors"
            >
              {saving ? 'Guardando…' : 'Guardar cotización'}
            </button>
            <button
              type="button"
              onClick={handleEnviar}
              disabled={sending}
              className="bg-[#dc2626] hover:bg-[#b91c1c] text-white text-sm font-semibold px-6 py-2 rounded-lg disabled:opacity-60 transition-colors"
            >
              {sending ? 'Enviando…' : 'Enviar al cliente'}
            </button>
          </div>
        </>
      )}

      {/* ── Modal catálogo de servicios ── */}
      {showPaqueteModal && (() => {
        const TABS = [
          { codigo: 'cambio_aceite', icono: '🛢️', label: 'Aceite' },
          { codigo: 'afinacion',     icono: '🔧', label: 'Afinación' },
          { codigo: 'frenos',        icono: '🛑', label: 'Frenos' },
          { codigo: 'escaneo',       icono: '📡', label: 'Escaneo' },
          { codigo: 'reparacion',    icono: '⚙️', label: 'Reparación' },
        ];
        const itemsTab = catalogoItems
          .filter(i => i.tipo_servicio === catalogoTab && i.activo !== 0)
          .sort((a, b) => a.orden - b.orden);

        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => { setShowPaqueteModal(false); setItemConfig(null); }}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col"
              style={{ maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e5e5]">
                <h3 className="font-semibold text-[#111] text-sm">Agregar concepto del catálogo</h3>
                <button onClick={() => { setShowPaqueteModal(false); setItemConfig(null); }}
                  className="text-[#9ca3af] hover:text-[#374151] text-xl leading-none font-bold">×</button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 px-4 pt-3 pb-2 overflow-x-auto shrink-0">
                {TABS.map(t => (
                  <button key={t.codigo} type="button" onClick={() => { setCatalogoTab(t.codigo); setItemConfig(null); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all
                      ${catalogoTab === t.codigo
                        ? 'bg-[#1d4ed8] text-white'
                        : 'bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb]'}`}>
                    <span>{t.icono}</span><span>{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Panel configurable */}
              {itemConfig && (
                <div className="mx-4 mb-2 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl px-4 py-3 space-y-2">
                  <p className="text-xs font-semibold text-[#1d4ed8]">
                    {itemConfig.item.nombre} — ¿Cuántos {itemConfig.item.configurable === 'litros' ? 'litros' : 'piezas'}?
                  </p>
                  <div className="flex items-center gap-3">
                    <input type="number"
                      min={itemConfig.item.config_min} max={itemConfig.item.config_max}
                      value={itemConfig.cantidad}
                      onChange={e => setItemConfig(ic => ({ ...ic, cantidad: parseInt(e.target.value) || ic.item.config_default }))}
                      className="w-20 border border-[#bfdbfe] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] text-center"
                    />
                    <span className="text-xs text-[#6b7280]">
                      {itemConfig.item.configurable === 'litros' ? 'L' : 'pzas'}
                      &nbsp;(rango {itemConfig.item.config_min}–{itemConfig.item.config_max})
                    </span>
                    <button type="button" onClick={() => addCatalogoItem(itemConfig.item, itemConfig.cantidad)}
                      className="ml-auto bg-[#1d4ed8] text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#1e40af]">
                      Agregar
                    </button>
                    <button type="button" onClick={() => setItemConfig(null)}
                      className="text-[#9ca3af] hover:text-[#374151] text-xs">Cancelar</button>
                  </div>
                  <p className="text-xs text-[#6b7280]">
                    Subtotal estimado: {fmtMXN((itemConfig.item.precio_unitario || 0) * itemConfig.cantidad)}
                    {itemConfig.item.unidad ? ` (${fmtMXN(itemConfig.item.precio_unitario)}/${itemConfig.item.unidad})` : ''}
                  </p>
                </div>
              )}

              {/* Lista de ítems */}
              <div className="overflow-y-auto flex-1 divide-y divide-[#f3f4f6]">
                {catalogoTab === 'reparacion' ? (
                  <p className="text-center text-[#9ca3af] text-sm py-8 px-4">
                    Las reparaciones no tienen conceptos fijos.<br />
                    Agrega los ítems manualmente en la tabla de cotización.
                  </p>
                ) : itemsTab.length === 0 ? (
                  <p className="text-center text-[#9ca3af] text-sm py-8">Sin conceptos en este servicio</p>
                ) : itemsTab.map(item => (
                  <button key={item.id} type="button" onClick={() => handleClickCatalogoItem(item)}
                    className="w-full text-left px-5 py-3 hover:bg-[#eff6ff] transition-colors group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[#111] truncate">{item.nombre}</p>
                          {item.es_opcional
                            ? <span className="text-[10px] bg-[#f3f4f6] text-[#6b7280] px-1.5 py-0.5 rounded shrink-0">Opcional</span>
                            : <span className="text-[10px] bg-[#dcfce7] text-[#166534] px-1.5 py-0.5 rounded shrink-0">Incluido</span>}
                          {item.configurable && (
                            <span className="text-[10px] bg-[#eff6ff] text-[#1d4ed8] px-1.5 py-0.5 rounded font-mono shrink-0">
                              {item.config_min}–{item.config_max} {item.configurable === 'litros' ? 'L' : 'pzas'}
                            </span>
                          )}
                        </div>
                        {item.descripcion && <p className="text-xs text-[#9ca3af] mt-0.5 truncate">{item.descripcion}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-[#1d4ed8]">
                          {fmtMXN(item.precio_unitario)}
                          {item.unidad && <span className="text-[10px] text-[#9ca3af] ml-0.5">/{item.unidad}</span>}
                        </p>
                        <p className="text-[10px] text-[#9ca3af]">costo {fmtMXN(item.costo_unitario)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
