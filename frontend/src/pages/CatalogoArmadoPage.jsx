import { useEffect, useState } from 'react';
import PaquetesPage from './PaquetesPage';
import { getActividades, crearActividad, updateActividad, deleteActividad, crearInsumo, updateInsumo, deleteInsumo } from '../api/actividades';
import { getPaquetesCompuestos, getPaqueteArbol, crearPaqueteCompuesto, setPaqueteActividades, updatePaquete, deletePaquete } from '../api/paquetes';

const INPUT = 'w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]';
const fmt = n => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

const precioActividad = a =>
  (a.insumos ?? []).reduce((s, i) => s + (i.precio_unitario || 0) * (i.config_default || 1), 0)
  + (a.horas_mano_obra || 0) * (a.tarifa_hora || 0);

export default function CatalogoArmadoPage() {
  const [tab, setTab] = useState('armado');

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-[#f3f4f6] rounded-lg p-1 w-fit">
        {[['armado', 'Paquetes armados'], ['sueltos', 'Precios sueltos']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${tab === k ? 'bg-white text-[#111] shadow-sm' : 'text-[#6b7280]'}`}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'armado' ? <Armado /> : <PaquetesPage />}
    </div>
  );
}

function Armado() {
  const [paquetes, setPaquetes] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [paqueteSel, setPaqueteSel] = useState(null);      // árbol completo
  const [actividadSel, setActividadSel] = useState(null);  // actividad (col 3)

  const cargarPaquetes = () => getPaquetesCompuestos().then(r => setPaquetes(r.data?.data ?? []));
  const cargarActividades = () => getActividades().then(r => {
    const acts = r.data?.data ?? [];
    setActividades(acts);
    setActividadSel(s => s ? acts.find(a => a.id === s.id) ?? null : s);
  });
  useEffect(() => { cargarPaquetes(); cargarActividades(); }, []);

  const abrirPaquete = async (p) => {
    const r = await getPaqueteArbol(p.id);
    setPaqueteSel(r.data.data);
  };

  const refrescarPaquete = async () => {
    if (paqueteSel) { const r = await getPaqueteArbol(paqueteSel.id); setPaqueteSel(r.data.data); }
    cargarPaquetes();
  };

  /* ── Col 1: paquetes ── */
  const nuevoPaquete = async () => {
    const nombre = prompt('Nombre del paquete (ej. Servicio 30,000 km):');
    if (!nombre?.trim()) return;
    const r = await crearPaqueteCompuesto({ nombre: nombre.trim() });
    await cargarPaquetes();
    setPaqueteSel(r.data.data);
  };

  const borrarPaquete = async (p) => {
    if (!confirm(`¿Eliminar el paquete "${p.nombre}"?`)) return;
    await deletePaquete(p.id);
    if (paqueteSel?.id === p.id) setPaqueteSel(null);
    cargarPaquetes();
  };

  /* ── Col 2: actividades ── */
  const nuevaActividad = async () => {
    const nombre = prompt('Nombre de la actividad (ej. Cambio de bujías):');
    if (!nombre?.trim()) return;
    const r = await crearActividad({ nombre: nombre.trim() });
    await cargarActividades();
    setActividadSel(r.data.data);
  };

  const agregarAlPaquete = async (act) => {
    if (!paqueteSel) return;
    const ids = [...paqueteSel.actividades.map(a => a.id), act.id];
    await setPaqueteActividades(paqueteSel.id, ids);
    refrescarPaquete();
  };

  const quitarDelPaquete = async (act) => {
    const ids = paqueteSel.actividades.filter(a => a.id !== act.id).map(a => a.id);
    await setPaqueteActividades(paqueteSel.id, ids);
    refrescarPaquete();
  };

  const editarManoObra = async (act) => {
    const horas = prompt('Horas de mano de obra:', act.horas_mano_obra || 0);
    if (horas === null) return;
    const tarifa = prompt('Tarifa por hora ($):', act.tarifa_hora || 0);
    if (tarifa === null) return;
    await updateActividad(act.id, { horas_mano_obra: horas, tarifa_hora: tarifa });
    cargarActividades(); refrescarPaquete();
  };

  const borrarActividad = async (act) => {
    if (!confirm(`¿Eliminar la actividad "${act.nombre}"? Se quitará de todos los paquetes.`)) return;
    await deleteActividad(act.id);
    if (actividadSel?.id === act.id) setActividadSel(null);
    cargarActividades(); refrescarPaquete();
  };

  /* ── Col 3: insumos ── */
  const [nuevoIns, setNuevoIns] = useState({ nombre: '', tipo: 'refaccion', unidad: 'pza', config_default: 1, precio_unitario: '', costo_unitario: '' });

  const agregarInsumo = async () => {
    if (!actividadSel || !nuevoIns.nombre.trim()) return;
    await crearInsumo(actividadSel.id, nuevoIns);
    setNuevoIns({ nombre: '', tipo: 'refaccion', unidad: 'pza', config_default: 1, precio_unitario: '', costo_unitario: '' });
    cargarActividades(); refrescarPaquete();
  };

  const editarInsumo = async (ins) => {
    const cantidad = prompt(`Cantidad default (${ins.unidad}):`, ins.config_default || 1);
    if (cantidad === null) return;
    const precio = prompt('Precio unitario ($):', ins.precio_unitario);
    if (precio === null) return;
    const costo = prompt('Costo unitario ($):', ins.costo_unitario);
    if (costo === null) return;
    await updateInsumo(actividadSel.id, ins.id, { config_default: cantidad, precio_unitario: precio, costo_unitario: costo });
    cargarActividades(); refrescarPaquete();
  };

  const borrarInsumo = async (ins) => {
    await deleteInsumo(actividadSel.id, ins.id);
    cargarActividades(); refrescarPaquete();
  };

  const idsEnPaquete = new Set(paqueteSel?.actividades.map(a => a.id) ?? []);
  const totalPaquete = paqueteSel ? paqueteSel.actividades.reduce((s, a) => s + precioActividad(a), 0) : 0;
  const COL = 'bg-white rounded-xl border border-[#e5e5e5] p-4 space-y-2 min-h-[300px]';
  const HDR = 'text-[10px] uppercase tracking-wider font-semibold';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* ── Col 1: Paquetes ── */}
      <div className={COL}>
        <div className="flex items-center justify-between">
          <p className={`${HDR} text-[#1d4ed8]`}>1 · Paquetes</p>
          <button onClick={nuevoPaquete} className="text-xs text-[#1d4ed8] font-semibold hover:underline">+ Nuevo</button>
        </div>
        {paquetes.length === 0 && <p className="text-sm text-[#9ca3af]">Sin paquetes armados. Crea el primero (ej. Servicio 10,000 km).</p>}
        {paquetes.map(p => (
          <div key={p.id}
            onClick={() => abrirPaquete(p)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border ${paqueteSel?.id === p.id ? 'border-[#1d4ed8] bg-[#eff6ff]' : 'border-transparent hover:bg-[#f9fafb]'}`}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#111] truncate">{p.nombre}</p>
              <p className="text-[11px] text-[#6b7280]">{p.num_actividades} actividad{p.num_actividades !== 1 ? 'es' : ''}</p>
            </div>
            <button onClick={e => { e.stopPropagation(); borrarPaquete(p); }} className="text-[#dc2626] text-xs">✕</button>
          </div>
        ))}
        {paqueteSel && (
          <p className="text-sm font-bold text-[#111] pt-2 border-t border-[#f3f4f6]">
            Total {paqueteSel.nombre}: {fmt(totalPaquete)}
          </p>
        )}
      </div>

      {/* ── Col 2: Actividades ── */}
      <div className={COL}>
        <div className="flex items-center justify-between">
          <p className={`${HDR} text-[#059669]`}>2 · Actividades {paqueteSel ? `de "${paqueteSel.nombre}"` : ''}</p>
          <button onClick={nuevaActividad} className="text-xs text-[#059669] font-semibold hover:underline">+ Nueva</button>
        </div>

        {paqueteSel && paqueteSel.actividades.map(a => (
          <div key={a.id}
            onClick={() => setActividadSel(actividades.find(x => x.id === a.id) ?? a)}
            className={`px-3 py-2 rounded-lg cursor-pointer border ${actividadSel?.id === a.id ? 'border-[#059669] bg-[#f0fdf4]' : 'border-[#e5e5e5] hover:bg-[#f9fafb]'}`}>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-[#111] flex-1 truncate">{a.nombre}</p>
              <span className="text-xs font-bold text-[#059669]">{fmt(precioActividad(a))}</span>
              <button onClick={e => { e.stopPropagation(); quitarDelPaquete(a); }} title="Quitar del paquete"
                className="text-[#dc2626] text-xs">✕</button>
            </div>
            <p className="text-[11px] text-[#6b7280]">
              {a.insumos.length} insumo{a.insumos.length !== 1 ? 's' : ''} · MO {a.horas_mano_obra || 0}h × {fmt(a.tarifa_hora)}
            </p>
          </div>
        ))}
        {paqueteSel && paqueteSel.actividades.length === 0 && (
          <p className="text-sm text-[#9ca3af]">Paquete vacío — agrega actividades de la lista de abajo.</p>
        )}

        <p className={`${HDR} text-[#9ca3af] pt-2 border-t border-[#f3f4f6]`}>
          {paqueteSel ? 'Disponibles (click + para agregar)' : 'Todas las actividades'}
        </p>
        {actividades.filter(a => !idsEnPaquete.has(a.id)).map(a => (
          <div key={a.id}
            onClick={() => setActividadSel(a)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer border ${actividadSel?.id === a.id ? 'border-[#059669] bg-[#f0fdf4]' : 'border-transparent hover:bg-[#f9fafb]'}`}>
            <p className="text-sm text-[#374151] flex-1 truncate">{a.nombre}</p>
            <span className="text-[11px] text-[#9ca3af]">{fmt(precioActividad(a))}</span>
            {paqueteSel && (
              <button onClick={e => { e.stopPropagation(); agregarAlPaquete(a); }} title="Agregar al paquete"
                className="text-[#059669] font-bold text-sm">+</button>
            )}
            <button onClick={e => { e.stopPropagation(); borrarActividad(a); }} className="text-[#dc2626] text-xs">✕</button>
          </div>
        ))}
      </div>

      {/* ── Col 3: Insumos ── */}
      <div className={COL}>
        <p className={`${HDR} text-[#c2410c]`}>3 · Insumos {actividadSel ? `de "${actividadSel.nombre}"` : ''}</p>
        {!actividadSel && <p className="text-sm text-[#9ca3af]">Selecciona una actividad para ver sus insumos.</p>}

        {actividadSel && (
          <>
            <button onClick={() => editarManoObra(actividadSel)}
              className="w-full text-left px-3 py-2 rounded-lg bg-[#fefce8] border border-[#fde68a] hover:bg-[#fef9c3]">
              <p className="text-sm font-semibold text-[#111]">🔧 Mano de obra</p>
              <p className="text-[11px] text-[#92400e]">
                {actividadSel.horas_mano_obra || 0} hrs × {fmt(actividadSel.tarifa_hora)} = {fmt((actividadSel.horas_mano_obra || 0) * (actividadSel.tarifa_hora || 0))} — click para editar
              </p>
            </button>

            {(actividadSel.insumos ?? []).map(ins => (
              <div key={ins.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#fff7ed] border border-[#fed7aa]">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => editarInsumo(ins)}>
                  <p className="text-sm text-[#111] truncate">{ins.nombre}</p>
                  <p className="text-[11px] text-[#6b7280]">
                    {ins.config_default || 1} {ins.unidad} × {fmt(ins.precio_unitario)} = {fmt((ins.config_default || 1) * ins.precio_unitario)}
                  </p>
                </div>
                <button onClick={() => borrarInsumo(ins)} className="text-[#dc2626] text-xs">✕</button>
              </div>
            ))}

            <div className="pt-2 border-t border-[#f3f4f6] space-y-2">
              <input value={nuevoIns.nombre} onChange={e => setNuevoIns(v => ({ ...v, nombre: e.target.value }))}
                placeholder="Nuevo insumo (ej. Aceite 5W-30)" className={INPUT} />
              <div className="grid grid-cols-4 gap-2">
                <select value={nuevoIns.tipo} onChange={e => setNuevoIns(v => ({ ...v, tipo: e.target.value }))} className={INPUT}>
                  <option value="refaccion">Refacción</option>
                  <option value="consumible">Consumible</option>
                </select>
                <input value={nuevoIns.config_default} onChange={e => setNuevoIns(v => ({ ...v, config_default: e.target.value }))}
                  placeholder="Cant." type="number" className={INPUT} />
                <input value={nuevoIns.unidad} onChange={e => setNuevoIns(v => ({ ...v, unidad: e.target.value }))}
                  placeholder="Unidad" className={INPUT} />
                <input value={nuevoIns.precio_unitario} onChange={e => setNuevoIns(v => ({ ...v, precio_unitario: e.target.value }))}
                  placeholder="Precio $" type="number" className={INPUT} />
              </div>
              <div className="flex gap-2">
                <input value={nuevoIns.costo_unitario} onChange={e => setNuevoIns(v => ({ ...v, costo_unitario: e.target.value }))}
                  placeholder="Costo $ (opcional)" type="number" className={INPUT} />
                <button onClick={agregarInsumo} disabled={!nuevoIns.nombre.trim()}
                  className="bg-[#c2410c] hover:bg-[#9a3412] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold shrink-0">
                  + Agregar
                </button>
              </div>
            </div>

            <p className="text-sm font-bold text-[#111] pt-2 border-t border-[#f3f4f6]">
              Total actividad: {fmt(precioActividad(actividadSel))}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
