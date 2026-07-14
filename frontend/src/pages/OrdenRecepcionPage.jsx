import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClientes, crearCliente } from '../api/clientes';
import { getAutos, createAuto } from '../api/autos';
import { createOrden } from '../api/ordenes';

const INPUT =
  'w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]';

const CAMPO = ({ label, children, required }) => (
  <div>
    <label className="block text-xs font-medium text-[#6b7280] mb-1">
      {label}
      {required && <span className="text-[#dc2626] ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const STEPS = ['Cliente', 'Auto', 'Recepción'];

export default function OrdenRecepcionPage() {
  const navigate = useNavigate();
  const [paso, setPaso] = useState(1);

  // Paso 1 – cliente
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', telefono: '', email: '' });
  const [loadingCliente, setLoadingCliente] = useState(false);
  const [errorCliente, setErrorCliente] = useState('');

  // Paso 2 – auto
  const [autos, setAutos] = useState([]);
  const [autoSeleccionado, setAutoSeleccionado] = useState(null);
  const [mostrarNuevoAuto, setMostrarNuevoAuto] = useState(false);
  const [nuevoAuto, setNuevoAuto] = useState({ placa: '', marca: '', modelo: '', anio: '', motor: '', color: '' });
  const [loadingAuto, setLoadingAuto] = useState(false);
  const [errorAuto, setErrorAuto] = useState('');

  // Paso 3 – recepción
  const [recepcion, setRecepcion] = useState({
    odometro: '',
    fecha_entrega_estimada: '',
    notas_recepcion: '',
  });
  const [tipoServicio, setTipoServicio] = useState('');
  const [loadingOrden, setLoadingOrden] = useState(false);
  const [errorOrden, setErrorOrden] = useState('');

  useEffect(() => {
    getClientes().then(setClientes);
  }, []);

  const clientesFiltrados = busqueda.trim()
    ? clientes.filter(c =>
        c.nombre?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : clientes;

  // ---------- Paso 1 ----------
  const handleSeleccionarCliente = async (cliente) => {
    setClienteSeleccionado(cliente);
    const res = await getAutos();
    const data = res.data?.data ?? [];
    setAutos(data.filter(a => String(a.cliente_id) === String(cliente.id)));
    setPaso(2);
  };

  const handleCrearCliente = async () => {
    if (!nuevoCliente.nombre.trim()) {
      setErrorCliente('El nombre es requerido');
      return;
    }
    setErrorCliente('');
    setLoadingCliente(true);
    try {
      const creado = await crearCliente(nuevoCliente);
      setClientes(prev => [...prev, creado]);
      await handleSeleccionarCliente(creado);
      setMostrarNuevoCliente(false);
      setNuevoAuto(v => ({ ...v }));
    } catch (err) {
      setErrorCliente(err.response?.data?.error || 'Error al crear cliente');
    } finally {
      setLoadingCliente(false);
    }
  };

  // ---------- Paso 2 ----------
  const handleSeleccionarAuto = (auto) => {
    setAutoSeleccionado(auto);
    setPaso(3);
  };

  const handleCrearAuto = async () => {
    if (!nuevoAuto.placa.trim()) {
      setErrorAuto('La placa es requerida');
      return;
    }
    setErrorAuto('');
    setLoadingAuto(true);
    try {
      const payload = { ...nuevoAuto, cliente_id: clienteSeleccionado.id };
      const res = await createAuto(payload);
      const creado = res.data?.data ?? res.data;
      setAutos(prev => [...prev, creado]);
      handleSeleccionarAuto(creado);
      setMostrarNuevoAuto(false);
    } catch (err) {
      setErrorAuto(err.response?.data?.error || 'Error al crear auto');
    } finally {
      setLoadingAuto(false);
    }
  };

  // ---------- Paso 3 ----------
  const handleCrearOrden = async () => {
    if (!tipoServicio) { setErrorOrden('Selecciona el tipo de servicio'); return; }
    setErrorOrden('');
    setLoadingOrden(true);
    try {
      const res = await createOrden({
        auto_id: autoSeleccionado.id,
        cliente_id: clienteSeleccionado.id,
        odometro: recepcion.odometro || null,
        fecha_entrega_estimada: recepcion.fecha_entrega_estimada || null,
        notas_recepcion: recepcion.notas_recepcion || null,
        tipo_servicio: tipoServicio,
      });
      const orden = res.data?.data ?? res.data;
      navigate(`/ordenes/${orden.id}/diagnostico`);
    } catch (err) {
      setErrorOrden(err.response?.data?.error || 'Error al crear orden');
    } finally {
      setLoadingOrden(false);
    }
  };

  const card = 'bg-white rounded-xl border border-[#e5e5e5] p-5';

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/ordenes')}
          className="text-[#9ca3af] hover:text-[#374151] text-sm"
        >
          ← Volver
        </button>
        <h1 className="text-base font-bold text-[#111]">Nueva orden de trabajo</h1>
      </div>

      {/* Indicador de pasos */}
      <div className="flex items-center gap-0">
        {STEPS.map((label, idx) => {
          const num = idx + 1;
          const activo = paso === num;
          const completado = paso > num;
          return (
            <div key={num} className="flex items-center">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                    ${activo ? 'bg-[#1d4ed8] text-white' : completado ? 'bg-[#1d4ed8] text-white opacity-60' : 'bg-[#e5e5e5] text-[#9ca3af]'}`}
                >
                  {completado ? '✓' : num}
                </span>
                <span
                  className={`text-sm font-medium ${activo ? 'text-[#1d4ed8]' : 'text-[#9ca3af]'}`}
                >
                  {label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <span className="mx-3 text-[#d1d5db] text-sm select-none">→</span>
              )}
            </div>
          );
        })}
      </div>

      {/* ====== PASO 1 – CLIENTE ====== */}
      {paso === 1 && (
        <div className={card}>
          <h2 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-4">
            Seleccionar cliente
          </h2>

          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className={INPUT + ' mb-3'}
          />

          <div className="space-y-1 max-h-60 overflow-y-auto mb-4">
            {clientesFiltrados.length === 0 && (
              <p className="text-sm text-[#9ca3af] py-2">No se encontraron clientes.</p>
            )}
            {clientesFiltrados.map(c => (
              <button
                key={c.id}
                onClick={() => handleSeleccionarCliente(c)}
                className="w-full text-left px-4 py-3 rounded-lg border border-[#e5e5e5] hover:border-[#1d4ed8] hover:bg-[#eff6ff] transition-colors"
              >
                <p className="text-sm font-medium text-[#111]">{c.nombre}</p>
                {c.telefono && <p className="text-xs text-[#6b7280]">{c.telefono}</p>}
              </button>
            ))}
          </div>

          {/* Nuevo cliente inline */}
          {!mostrarNuevoCliente ? (
            <button
              onClick={() => setMostrarNuevoCliente(true)}
              className="text-[#1d4ed8] text-sm font-medium hover:underline"
            >
              + Cliente nuevo
            </button>
          ) : (
            <div className="border border-[#e5e5e5] rounded-xl p-4 space-y-3 mt-2">
              <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">Nuevo cliente</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CAMPO label="Nombre" required>
                  <input
                    value={nuevoCliente.nombre}
                    onChange={e => setNuevoCliente(v => ({ ...v, nombre: e.target.value }))}
                    placeholder="Nombre completo"
                    className={INPUT}
                  />
                </CAMPO>
                <CAMPO label="Teléfono">
                  <input
                    value={nuevoCliente.telefono}
                    onChange={e => setNuevoCliente(v => ({ ...v, telefono: e.target.value }))}
                    placeholder="55 1234 5678"
                    className={INPUT}
                  />
                </CAMPO>
                <CAMPO label="Email">
                  <input
                    value={nuevoCliente.email}
                    onChange={e => setNuevoCliente(v => ({ ...v, email: e.target.value }))}
                    placeholder="correo@ejemplo.com"
                    type="email"
                    className={INPUT}
                  />
                </CAMPO>
              </div>
              {errorCliente && <p className="text-[#dc2626] text-xs">{errorCliente}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleCrearCliente}
                  disabled={loadingCliente}
                  className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white px-4 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {loadingCliente ? 'Guardando...' : 'Guardar cliente'}
                </button>
                <button
                  onClick={() => { setMostrarNuevoCliente(false); setErrorCliente(''); }}
                  className="bg-white border border-[#e5e5e5] text-[#374151] px-4 py-1.5 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====== PASO 2 – AUTO ====== */}
      {paso === 2 && (
        <div className={card}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
              Seleccionar auto
            </h2>
            <button onClick={() => setPaso(1)} className="text-xs text-[#9ca3af] hover:text-[#374151]">
              ← Cambiar cliente
            </button>
          </div>

          {/* Resumen cliente */}
          <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-lg px-4 py-2 mb-4 text-sm text-[#1d4ed8] font-medium">
            Cliente: {clienteSeleccionado?.nombre}
          </div>

          <div className="space-y-1 max-h-60 overflow-y-auto mb-4">
            {autos.length === 0 && (
              <p className="text-sm text-[#9ca3af] py-2">Este cliente no tiene autos registrados.</p>
            )}
            {autos.map(a => (
              <button
                key={a.id}
                onClick={() => handleSeleccionarAuto(a)}
                className="w-full text-left px-4 py-3 rounded-lg border border-[#e5e5e5] hover:border-[#1d4ed8] hover:bg-[#eff6ff] transition-colors"
              >
                <p className="text-sm font-bold text-[#111] uppercase">{a.placa}</p>
                <p className="text-xs text-[#6b7280]">
                  {[a.marca, a.modelo, a.anio].filter(Boolean).join(' ')}
                </p>
              </button>
            ))}
          </div>

          {/* Nuevo auto inline */}
          {!mostrarNuevoAuto ? (
            <button
              onClick={() => setMostrarNuevoAuto(true)}
              className="text-[#1d4ed8] text-sm font-medium hover:underline"
            >
              + Auto nuevo
            </button>
          ) : (
            <div className="border border-[#e5e5e5] rounded-xl p-4 space-y-3 mt-2">
              <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">Nuevo auto</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <CAMPO label="Placa" required>
                  <input
                    value={nuevoAuto.placa}
                    onChange={e => setNuevoAuto(v => ({ ...v, placa: e.target.value.toUpperCase() }))}
                    placeholder="ABC-1234"
                    className={INPUT + ' uppercase'}
                  />
                </CAMPO>
                <CAMPO label="Marca">
                  <input
                    value={nuevoAuto.marca}
                    onChange={e => setNuevoAuto(v => ({ ...v, marca: e.target.value }))}
                    placeholder="Nissan"
                    className={INPUT}
                  />
                </CAMPO>
                <CAMPO label="Modelo">
                  <input
                    value={nuevoAuto.modelo}
                    onChange={e => setNuevoAuto(v => ({ ...v, modelo: e.target.value }))}
                    placeholder="Versa"
                    className={INPUT}
                  />
                </CAMPO>
                <CAMPO label="Año">
                  <input
                    value={nuevoAuto.anio}
                    onChange={e => setNuevoAuto(v => ({ ...v, anio: e.target.value }))}
                    placeholder="2020"
                    type="number"
                    className={INPUT}
                  />
                </CAMPO>
                <CAMPO label="Motor">
                  <input
                    value={nuevoAuto.motor}
                    onChange={e => setNuevoAuto(v => ({ ...v, motor: e.target.value }))}
                    placeholder="1.6L"
                    className={INPUT}
                  />
                </CAMPO>
                <CAMPO label="Color">
                  <input
                    value={nuevoAuto.color}
                    onChange={e => setNuevoAuto(v => ({ ...v, color: e.target.value }))}
                    placeholder="Blanco"
                    className={INPUT}
                  />
                </CAMPO>
              </div>
              {errorAuto && <p className="text-[#dc2626] text-xs">{errorAuto}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleCrearAuto}
                  disabled={loadingAuto}
                  className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white px-4 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {loadingAuto ? 'Guardando...' : 'Guardar auto'}
                </button>
                <button
                  onClick={() => { setMostrarNuevoAuto(false); setErrorAuto(''); }}
                  className="bg-white border border-[#e5e5e5] text-[#374151] px-4 py-1.5 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====== PASO 3 – RECEPCIÓN ====== */}
      {paso === 3 && (
        <div className={card}>
          <h2 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-4">
            Datos de recepción
          </h2>

          {/* Resumen cliente + auto */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-lg px-4 py-3">
              <p className="text-xs text-[#6b7280] font-medium mb-0.5">Cliente</p>
              <p className="text-sm font-bold text-[#1d4ed8]">{clienteSeleccionado?.nombre}</p>
              {clienteSeleccionado?.telefono && (
                <p className="text-xs text-[#6b7280]">{clienteSeleccionado.telefono}</p>
              )}
            </div>
            <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-lg px-4 py-3">
              <p className="text-xs text-[#6b7280] font-medium mb-0.5">Auto</p>
              <p className="text-sm font-bold text-[#1d4ed8] uppercase">{autoSeleccionado?.placa}</p>
              <p className="text-xs text-[#6b7280]">
                {[autoSeleccionado?.marca, autoSeleccionado?.modelo, autoSeleccionado?.anio]
                  .filter(Boolean)
                  .join(' ')}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Tipo de servicio */}
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-2">
                Tipo de servicio <span className="text-[#dc2626]">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {[
                  { codigo: 'cambio_aceite', icono: '🛢️', label: 'Cambio de aceite' },
                  { codigo: 'afinacion',     icono: '🔧', label: 'Afinación' },
                  { codigo: 'frenos',        icono: '🛑', label: 'Frenos' },
                  { codigo: 'escaneo',       icono: '📡', label: 'Escaneo y diagnóstico' },
                  { codigo: 'reparacion',    icono: '⚙️', label: 'Reparación' },
                ].map(t => (
                  <button key={t.codigo} type="button"
                    onClick={() => setTipoServicio(t.codigo)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left
                      ${tipoServicio === t.codigo
                        ? 'bg-[#1d4ed8] border-[#1d4ed8] text-white shadow-sm'
                        : 'bg-white border-[#e5e5e5] text-[#374151] hover:border-[#1d4ed8] hover:bg-[#eff6ff]'}`}>
                    <span>{t.icono}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CAMPO label="Odómetro (km)">
                <input
                  type="number"
                  value={recepcion.odometro}
                  onChange={e => setRecepcion(v => ({ ...v, odometro: e.target.value }))}
                  placeholder="85000"
                  className={INPUT}
                />
              </CAMPO>
              <CAMPO label="Fecha estimada de entrega">
                <input
                  type="date"
                  value={recepcion.fecha_entrega_estimada}
                  onChange={e => setRecepcion(v => ({ ...v, fecha_entrega_estimada: e.target.value }))}
                  className={INPUT}
                />
              </CAMPO>
            </div>
            <CAMPO label="Notas de recepción">
              <textarea
                rows={3}
                value={recepcion.notas_recepcion}
                onChange={e => setRecepcion(v => ({ ...v, notas_recepcion: e.target.value }))}
                placeholder="Descripción del problema, observaciones del cliente..."
                className={INPUT + ' resize-none'}
              />
            </CAMPO>
          </div>

          {errorOrden && <p className="text-[#dc2626] text-sm mt-3">{errorOrden}</p>}

          <div className="flex gap-3 justify-between mt-5">
            <button
              onClick={() => setPaso(2)}
              className="bg-white border border-[#e5e5e5] text-[#374151] px-5 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              ← Cambiar auto
            </button>
            <button
              onClick={handleCrearOrden}
              disabled={loadingOrden}
              className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white px-6 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {loadingOrden ? 'Creando...' : 'Crear orden de trabajo'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
