# AutoFix UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar el frontend de AutoFix reemplazando el top navbar naranja por un sidebar negro con franja racing Herbie (rojo·blanco·azul), paleta azul/rojo/negro y KPI cards con gradiente.

**Architecture:** Nuevo componente `Sidebar.jsx` reemplaza el `<nav>` en `App.jsx`. Cada página actualiza colores, headers de tabla y botones. Sin cambios al backend ni a la lógica de negocio.

**Tech Stack:** React 18, Vite, Tailwind CSS v4, React Router v6.

---

## Patrones reutilizables

Estos patrones se repiten en todas las páginas — referenciarlos aquí para no duplicar:

**Input:**
```
border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]
```

**Botón primario:**
```
bg-[#1d4ed8] hover:bg-[#1e40af] text-white px-4 py-2 rounded-lg text-sm font-semibold
```

**Botón destructivo:**
```
bg-[#dc2626] hover:bg-[#b91c1c] text-white px-4 py-2 rounded-lg text-sm font-semibold
```

**Botón secundario:**
```
bg-white border border-[#e5e5e5] text-[#374151] px-4 py-2 rounded-lg text-sm hover:bg-gray-50
```

**Ghost editar (tabla):**
```
bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] px-3 py-1 rounded text-xs
```

**Ghost eliminar (tabla):**
```
bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] px-3 py-1 rounded text-xs
```

**Header de tabla:**
```jsx
<thead>
  <tr style={{ background: '#111111' }}>
    <th className="text-[#9ca3af] text-[10px] font-semibold uppercase tracking-wider px-4 py-3 text-left">
```

**KPI card (inline style):**
```jsx
// azul:  { background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)' }
// rojo:  { background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' }
// verde: { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }
// oscuro:{ background: 'linear-gradient(135deg, #111111 0%, #374151 100%)' }
```

---

## Task 1: Crear componente Sidebar

**Files:**
- Create: `frontend/src/components/Sidebar.jsx`

- [ ] **Step 1: Crear el archivo**

```jsx
// frontend/src/components/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';

const Icon = ({ d, d2 }) => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="flex-shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    {d2 && <path strokeLinecap="round" strokeLinejoin="round" d={d2} />}
  </svg>
);

const NAV = [
  { to: '/', end: true, label: 'Bitácora',
    icon: <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /> },
  { to: '/clientes', label: 'Clientes',
    icon: <Icon d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" /> },
  { to: '/paquetes', label: 'Paquetes',
    icon: <Icon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /> },
  { to: '/cotizaciones', label: 'Cotizaciones',
    icon: <Icon d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
];

const FIN = [
  { to: '/financiero', label: 'Financiero',
    icon: <Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const nombre = localStorage.getItem('nombre') || 'Usuario';
  const initials = nombre.slice(0, 2).toUpperCase();

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('nombre');
    navigate('/login');
  };

  const cls = ({ isActive }) =>
    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ' +
    (isActive
      ? 'bg-[#1d4ed8] text-white font-semibold'
      : 'text-[#6b7280] hover:bg-[#1c1c1c] hover:text-[#d1d5db]');

  return (
    <aside style={{ width: 210, background: '#111111' }} className="flex flex-col h-screen flex-shrink-0">
      {/* Franja racing Herbie */}
      <div className="flex h-1.5 flex-shrink-0">
        <div className="flex-1 bg-[#dc2626]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#1d4ed8]" />
      </div>

      {/* Brand */}
      <div className="flex items-center gap-2.5 px-3.5 py-4 border-b border-[#222]">
        <div className="w-9 h-9 rounded-full bg-white border-2 border-[#dc2626] flex items-center justify-center text-base flex-shrink-0">
          🔧
        </div>
        <div className="min-w-0">
          <p className="text-white text-xs font-bold leading-tight truncate">AutoFix Querétaro</p>
          <p className="text-[#6b7280] text-[10px] mt-0.5">Bitácora de servicios</p>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto">
        <p className="text-[#4b5563] text-[9px] font-bold uppercase tracking-widest px-2 pb-1">Principal</p>
        {NAV.map(({ to, end, label, icon }) => (
          <NavLink key={to} to={to} end={end} className={cls}>
            {icon}{label}
          </NavLink>
        ))}
        <p className="text-[#4b5563] text-[9px] font-bold uppercase tracking-widest px-2 pb-1 mt-3">Finanzas</p>
        {FIN.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} className={cls}>
            {icon}{label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="flex items-center gap-2 px-3 py-3 border-t border-[#222]">
        <div className="w-7 h-7 rounded-full bg-[#374151] flex items-center justify-center text-[#9ca3af] text-xs font-bold flex-shrink-0">
          {initials}
        </div>
        <span className="text-[#9ca3af] text-xs flex-1 truncate">{nombre}</span>
        <button onClick={logout}
          className="text-[#ef4444] text-[10px] border border-[#7f1d1d] rounded px-1.5 py-0.5 hover:bg-[#7f1d1d33]">
          Salir
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Verificar que el archivo existe**

```bash
ls ~/autofix/frontend/src/components/
```
Esperado: `ProtectedRoute.jsx  Sidebar.jsx`

---

## Task 2: Actualizar App.jsx — layout con Sidebar

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Reemplazar contenido completo de App.jsx**

```jsx
// frontend/src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import BitacoraPage from './pages/BitacoraPage';
import ServicioFormPage from './pages/ServicioFormPage';
import ClientesPage from './pages/ClientesPage';
import PaquetesPage from './pages/PaquetesPage';
import CotizacionesPage from './pages/CotizacionesPage';
import CotizacionFormPage from './pages/CotizacionFormPage';
import FinancieroPage from './pages/FinancieroPage';

function Layout() {
  return (
    <div className="flex h-screen bg-[#fafafa] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<BitacoraPage />} />
            <Route path="/servicios/nuevo" element={<ServicioFormPage />} />
            <Route path="/servicios/:id/editar" element={<ServicioFormPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/paquetes" element={<PaquetesPage />} />
            <Route path="/cotizaciones" element={<CotizacionesPage />} />
            <Route path="/cotizaciones/nueva" element={<CotizacionFormPage />} />
            <Route path="/cotizaciones/:id/editar" element={<CotizacionFormPage />} />
            <Route path="/financiero" element={<FinancieroPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedRoute><Layout /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Build de verificación**

```bash
cd ~/autofix/frontend && npm run build 2>&1 | tail -8
```
Esperado: `✓ built in X.XXs` sin errores.

- [ ] **Step 3: Commit**

```bash
cd ~/autofix && git init && git add frontend/src/components/Sidebar.jsx frontend/src/App.jsx && git commit -m "feat: sidebar navigation con franja racing Herbie"
```
Si no hay git init previo, ignorar el `git init`.

---

## Task 3: Actualizar LoginPage

**Files:**
- Modify: `frontend/src/pages/LoginPage.jsx`

- [ ] **Step 1: Reemplazar contenido**

```jsx
// frontend/src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function LoginPage() {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { usuario, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('nombre', data.nombre);
      navigate('/');
    } catch {
      setError('Usuario o contraseña incorrectos');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ background: '#111111' }} className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Franja racing */}
        <div className="flex h-2">
          <div className="flex-1 bg-[#dc2626]" />
          <div className="flex-1 bg-white border-t border-b border-[#e5e5e5]" />
          <div className="flex-1 bg-[#1d4ed8]" />
        </div>
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-full bg-white border-2 border-[#dc2626] flex items-center justify-center text-3xl mx-auto mb-3 shadow-sm">
              🔧
            </div>
            <h1 className="text-2xl font-bold text-[#111]">AutoFix Querétaro</h1>
            <p className="text-[#6b7280] text-sm mt-1">Sistema de bitácora de servicios</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">Usuario</label>
              <input value={usuario} onChange={e => setUsuario(e.target.value)}
                className="w-full border border-[#e5e5e5] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]"
                placeholder="JAYALA" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border border-[#e5e5e5] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]"
                placeholder="••••••••" />
            </div>
            {error && <p className="text-[#dc2626] text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-50">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build**

```bash
cd ~/autofix/frontend && npm run build 2>&1 | tail -5
```
Esperado: `✓ built in X.XXs`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/LoginPage.jsx && git commit -m "feat: login con paleta Herbie y franja racing"
```

---

## Task 4: Actualizar BitacoraPage

**Files:**
- Modify: `frontend/src/pages/BitacoraPage.jsx`

- [ ] **Step 1: Reemplazar contenido**

```jsx
// frontend/src/pages/BitacoraPage.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getServicios, getResumen, eliminarServicio } from '../api/servicios';

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
  const [servicios, setServicios] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [q, setQ] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const fetchData = async (searchQ, searchDesde, searchHasta) => {
    const params = {};
    if (searchQ) params.q = searchQ;
    if (searchDesde) params.desde = searchDesde;
    if (searchHasta) params.hasta = searchHasta;
    const [data, res] = await Promise.all([getServicios(params), getResumen()]);
    setServicios(data);
    setResumen(res);
  };

  const cargar = () => fetchData(q, desde, hasta);

  useEffect(() => { fetchData('', '', ''); }, []);

  const handleEliminar = async id => {
    if (!confirm('¿Eliminar este servicio?')) return;
    await eliminarServicio(id);
    cargar();
  };

  const utilColor = u => u == null ? 'text-[#9ca3af]' : u >= 0 ? 'text-[#059669]' : 'text-[#dc2626]';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-[#111]">Bitácora de servicios</h1>
        <Link to="/servicios/nuevo"
          className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5">
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
        <div className="flex-1 min-w-40">
          <label className="text-[10px] text-[#6b7280] mb-1 block font-medium">Buscar</label>
          <input value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && cargar()}
            className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]"
            placeholder="Placa, cliente, servicio..." />
        </div>
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
          Buscar
        </button>
        <button onClick={() => { setQ(''); setDesde(''); setHasta(''); fetchData('', '', ''); }}
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
                <td className="px-4 py-3 text-[#9ca3af] font-mono text-xs">{s.id}</td>
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
                    <Link to={`/servicios/${s.id}/editar`}
                      className="bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] px-3 py-1 rounded text-xs">
                      Editar
                    </Link>
                    <button onClick={() => handleEliminar(s.id)}
                      className="bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] px-3 py-1 rounded text-xs">
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
  );
}
```

- [ ] **Step 2: Build**

```bash
cd ~/autofix/frontend && npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/BitacoraPage.jsx && git commit -m "feat: bitácora con KPIs gradiente y tabla header negro"
```

---

## Task 5: Actualizar ClientesPage

**Files:**
- Modify: `frontend/src/pages/ClientesPage.jsx`

- [ ] **Step 1: Reemplazar contenido**

```jsx
// frontend/src/pages/ClientesPage.jsx
import { useEffect, useState } from 'react';
import { getClientes, crearCliente, actualizarCliente, eliminarCliente } from '../api/clientes';

const vacío = { nombre: '', telefono: '', email: '', notas: '' };
const INPUT = 'w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]';

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState(vacío);
  const [editandoId, setEditandoId] = useState(null);
  const [error, setError] = useState('');

  const cargar = () => getClientes().then(setClientes);
  useEffect(() => { cargar(); }, []);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleGuardar = async () => {
    if (!form.nombre) { setError('El nombre es requerido'); return; }
    setError('');
    if (editandoId) await actualizarCliente(editandoId, form);
    else await crearCliente(form);
    setForm(vacío); setEditandoId(null);
    cargar();
  };

  const handleEditar = c => {
    setEditandoId(c.id);
    setForm({ nombre: c.nombre, telefono: c.telefono || '', email: c.email || '', notas: c.notas || '' });
  };

  const handleEliminar = async id => {
    if (!confirm('¿Eliminar este cliente?')) return;
    await eliminarCliente(id);
    cargar();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <h1 className="text-base font-bold text-[#111]">Catálogo de clientes</h1>

      <div className="bg-white rounded-xl border border-[#e5e5e5] p-5 space-y-4">
        <h2 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
          {editandoId ? 'Editar cliente' : 'Agregar cliente'}
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-[#6b7280] mb-1 block">Nombre *</label>
            <input name="nombre" value={form.nombre} onChange={handle} className={INPUT} placeholder="Nombre del cliente" />
          </div>
          <div>
            <label className="text-xs text-[#6b7280] mb-1 block">Teléfono</label>
            <input name="telefono" value={form.telefono} onChange={handle} className={INPUT} placeholder="442 000 0000" />
          </div>
          <div>
            <label className="text-xs text-[#6b7280] mb-1 block">Email</label>
            <input name="email" value={form.email} onChange={handle} className={INPUT} placeholder="correo@ejemplo.com" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-[#6b7280] mb-1 block">Notas</label>
            <input name="notas" value={form.notas} onChange={handle} className={INPUT} placeholder="Observaciones..." />
          </div>
        </div>
        {error && <p className="text-[#dc2626] text-sm">{error}</p>}
        <div className="flex gap-2">
          <button onClick={handleGuardar}
            className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white px-5 py-2 rounded-lg text-sm font-semibold">
            {editandoId ? 'Guardar cambios' : 'Agregar'}
          </button>
          {editandoId && (
            <button onClick={() => { setEditandoId(null); setForm(vacío); setError(''); }}
              className="bg-white border border-[#e5e5e5] text-[#374151] px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              Cancelar
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e5e5e5] overflow-hidden">
        {clientes.length === 0 ? (
          <p className="p-5 text-sm text-[#9ca3af]">Sin clientes registrados</p>
        ) : clientes.map(c => (
          <div key={c.id} className="flex items-center justify-between px-5 py-3 border-b border-[#f3f4f6] last:border-0 hover:bg-[#fafafa]">
            <div>
              <p className="font-semibold text-[#111] text-sm">{c.nombre}</p>
              <p className="text-xs text-[#9ca3af] mt-0.5">{[c.telefono, c.email].filter(Boolean).join(' · ') || 'Sin contacto'}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEditar(c)}
                className="bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] px-3 py-1 rounded text-xs">
                Editar
              </button>
              <button onClick={() => handleEliminar(c.id)}
                className="bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] px-3 py-1 rounded text-xs">
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build y commit**

```bash
cd ~/autofix/frontend && npm run build 2>&1 | tail -5
git add frontend/src/pages/ClientesPage.jsx && git commit -m "feat: clientes con paleta Herbie"
```

---

## Task 6: Actualizar PaquetesPage

**Files:**
- Modify: `frontend/src/pages/PaquetesPage.jsx`

- [ ] **Step 1: Reemplazar contenido**

```jsx
// frontend/src/pages/PaquetesPage.jsx
import { useEffect, useState } from 'react';
import { getPaquetes, createPaquete, updatePaquete, deletePaquete } from '../api/paquetes';

const CATEGORIAS = ['general','mantenimiento','afinacion','inyectores','frenos','suspension','electrico','otro'];
const empty = { nombre:'', categoria:'general', descripcion:'', precio_lista:'', costo_estimado:'', activo:1 };
const INPUT = 'w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]';
const fmtMXN = v => v != null ? `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—';

export default function PaquetesPage() {
  const [paquetes, setPaquetes]     = useState([]);
  const [form, setForm]             = useState(empty);
  const [editId, setEditId]         = useState(null);
  const [showForm, setShowForm]     = useState(false);
  const [filtro, setFiltro]         = useState('');
  const [soloActivos, setSoloActivos] = useState(false);
  const [loading, setLoading]       = useState(false);

  const cargar = () => getPaquetes(soloActivos).then(r => setPaquetes(r.data));
  useEffect(() => { cargar(); }, [soloActivos]);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? (checked ? 1 : 0) : value }));
  };

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true);
    try {
      if (editId) await updatePaquete(editId, form);
      else        await createPaquete(form);
      setForm(empty); setEditId(null); setShowForm(false); cargar();
    } finally { setLoading(false); }
  };

  const handleEdit = p => {
    setForm({ nombre: p.nombre, categoria: p.categoria, descripcion: p.descripcion || '',
              precio_lista: p.precio_lista || '', costo_estimado: p.costo_estimado || '', activo: p.activo });
    setEditId(p.id); setShowForm(true);
  };

  const handleDelete = async id => {
    if (!confirm('¿Eliminar paquete?')) return;
    await deletePaquete(id); cargar();
  };

  const visible = paquetes.filter(p =>
    p.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
    p.categoria.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-[#111]">Paquetes / Servicios</h1>
        <button onClick={() => { setForm(empty); setEditId(null); setShowForm(true); }}
          className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-semibold px-4 py-2 rounded-lg">
          + Nuevo paquete
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-[#e5e5e5] p-5">
          <h2 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-4">
            {editId ? 'Editar paquete' : 'Nuevo paquete'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-[#6b7280] mb-1 block">Nombre *</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} required className={INPUT} placeholder="Ej. Cambio de aceite sintético" />
            </div>
            <div>
              <label className="text-xs text-[#6b7280] mb-1 block">Categoría</label>
              <select name="categoria" value={form.categoria} onChange={handleChange} className={INPUT}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#6b7280] mb-1 block">Precio lista</label>
              <input name="precio_lista" type="number" step="0.01" value={form.precio_lista} onChange={handleChange} className={INPUT} placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs text-[#6b7280] mb-1 block">Costo estimado</label>
              <input name="costo_estimado" type="number" step="0.01" value={form.costo_estimado} onChange={handleChange} className={INPUT} placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs text-[#6b7280] mb-1 block">Descripción</label>
              <input name="descripcion" value={form.descripcion} onChange={handleChange} className={INPUT} placeholder="Opcional..." />
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <input type="checkbox" name="activo" id="activo" checked={form.activo === 1} onChange={handleChange}
                className="w-4 h-4 accent-[#1d4ed8]" />
              <label htmlFor="activo" className="text-sm text-[#374151]">Activo</label>
            </div>
            <div className="col-span-2 flex gap-2">
              <button type="submit" disabled={loading}
                className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
                {loading ? 'Guardando...' : editId ? 'Guardar cambios' : 'Crear paquete'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm(empty); }}
                className="bg-white border border-[#e5e5e5] text-[#374151] px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#e5e5e5]">
        <div className="p-4 border-b border-[#f3f4f6] flex items-center gap-3 flex-wrap">
          <input value={filtro} onChange={e => setFiltro(e.target.value)}
            placeholder="Filtrar por nombre o categoría..."
            className="border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] w-64" />
          <label className="flex items-center gap-2 text-sm text-[#374151] cursor-pointer">
            <input type="checkbox" checked={soloActivos} onChange={e => setSoloActivos(e.target.checked)}
              className="w-4 h-4 accent-[#1d4ed8]" />
            Solo activos
          </label>
          <span className="ml-auto text-xs text-[#9ca3af]">{visible.length} paquetes</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#111111' }}>
                {['Nombre','Categoría','Precio lista','Costo est.','Estado',''].map((h, i) => (
                  <th key={i} className={`text-[#9ca3af] text-[10px] font-semibold uppercase tracking-wider px-4 py-3 ${i >= 2 && i <= 3 ? 'text-right' : 'text-left'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f4f6]">
              {visible.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[#9ca3af]">Sin paquetes</td></tr>
              ) : visible.map((p, idx) => (
                <tr key={p.id} className={`hover:bg-[#eff6ff] transition-colors ${idx % 2 === 1 ? 'bg-[#fafafa]' : 'bg-white'}`}>
                  <td className="px-4 py-3 font-semibold text-[#111]">{p.nombre}</td>
                  <td className="px-4 py-3">
                    <span className="bg-[#f3f4f6] text-[#374151] text-xs px-2 py-0.5 rounded">{p.categoria}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-[#1d4ed8]">{fmtMXN(p.precio_lista)}</td>
                  <td className="px-4 py-3 text-right text-[#6b7280]">{fmtMXN(p.costo_estimado)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${p.activo ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#f3f4f6] text-[#6b7280]'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => handleEdit(p)}
                        className="bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] px-3 py-1 rounded text-xs">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(p.id)}
                        className="bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] px-3 py-1 rounded text-xs">
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
```

- [ ] **Step 2: Build y commit**

```bash
cd ~/autofix/frontend && npm run build 2>&1 | tail -5
git add frontend/src/pages/PaquetesPage.jsx && git commit -m "feat: paquetes con paleta Herbie"
```

---

## Task 7: Actualizar CotizacionesPage

**Files:**
- Modify: `frontend/src/pages/CotizacionesPage.jsx`

- [ ] **Step 1: Reemplazar contenido**

```jsx
// frontend/src/pages/CotizacionesPage.jsx
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
```

- [ ] **Step 2: Build y commit**

```bash
cd ~/autofix/frontend && npm run build 2>&1 | tail -5
git add frontend/src/pages/CotizacionesPage.jsx && git commit -m "feat: cotizaciones con paleta Herbie y badges de estatus"
```

---

## Task 8: Actualizar ServicioFormPage y CotizacionFormPage

**Files:**
- Modify: `frontend/src/pages/ServicioFormPage.jsx`
- Modify: `frontend/src/pages/CotizacionFormPage.jsx`

- [ ] **Step 1: Reemplazar ServicioFormPage.jsx**

```jsx
// frontend/src/pages/ServicioFormPage.jsx
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
```

- [ ] **Step 2: Reemplazar CotizacionFormPage.jsx** — actualizar solo los colores (la lógica no cambia)

Buscar y reemplazar todas las ocurrencias de estos patrones en `frontend/src/pages/CotizacionFormPage.jsx`:

| Buscar | Reemplazar con |
|--------|---------------|
| `focus:ring-orange-400` | `focus:ring-[#1d4ed8]` |
| `bg-orange-500 hover:bg-orange-600` | `bg-[#1d4ed8] hover:bg-[#1e40af]` |
| `border border-gray-300 rounded` | `border border-[#e5e5e5] rounded` |
| `text-gray-500` (labels) | `text-[#6b7280]` |
| `text-gray-800` (títulos) | `text-[#111]` |
| `text-gray-700` | `text-[#374151]` |
| `border-gray-300 rounded px-3 py-2 text-sm` | `border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]` |
| `px-5 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50` | `bg-white border border-[#e5e5e5] text-[#374151] px-5 py-2 rounded-lg text-sm hover:bg-gray-50` |
| `bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-8 py-2 rounded` | `bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-semibold px-8 py-2 rounded-lg` |
| `text-gray-500 hover:text-gray-700 text-sm` | `text-[#9ca3af] hover:text-[#374151] text-sm` |

- [ ] **Step 3: Build y commit**

```bash
cd ~/autofix/frontend && npm run build 2>&1 | tail -5
git add frontend/src/pages/ServicioFormPage.jsx frontend/src/pages/CotizacionFormPage.jsx
git commit -m "feat: formularios con paleta Herbie"
```

---

## Task 9: Actualizar FinancieroPage

**Files:**
- Modify: `frontend/src/pages/FinancieroPage.jsx`

- [ ] **Step 1: Actualizar constantes y helpers al inicio del archivo**

Reemplazar las líneas 1-15 actuales con:

```jsx
import { useEffect, useState } from 'react';
import {
  getGastos, createGasto, updateGasto, deleteGasto,
  getIngresos, createIngreso, updateIngreso, deleteIngreso,
  getFacturas, createFactura, updateFactura, deleteFactura,
  getResumen,
} from '../api/financiero';

const fmtMXN = v => `$${Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
const today  = () => new Date().toISOString().slice(0,10);
const INPUT  = 'w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]';

const GASTO_CATS = ['general','herramientas','refacciones','renta','servicios','nomina','impuestos','otro'];
const METODOS    = ['efectivo','transferencia','tarjeta','cheque'];
const FACT_TIPOS = ['ingreso','egreso'];
const FACT_ESTATUS = ['pendiente','pagada','cancelada'];
```

- [ ] **Step 2: Actualizar el componente Modal**

Reemplazar el componente `Modal` existente con:

```jsx
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
```

- [ ] **Step 3: Actualizar GastosTab — reemplazar solo las clases de estilo**

En `GastosTab`, aplicar estos cambios:

- Botón `+ Nuevo gasto`: `bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-semibold px-4 py-2 rounded-lg`
- `totalGastos`: `rows.reduce((s, r) => s + (Number(r.monto) || 0), 0)` (ya corregido en fixes anteriores)
- Header tabla: `<tr style={{ background: '#111111' }}>` con th `text-[#9ca3af] text-[10px] font-semibold uppercase tracking-wider px-4 py-3 text-left`
- Filas alternas: `hover:bg-[#eff6ff]`, pares `bg-[#fafafa]`
- Botones acciones: ghost azul/rojo (mismos patrones de tareas anteriores)
- Inputs en modal: usar constante `INPUT`
- Botón guardar modal: `bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-semibold px-6 py-2 rounded-lg disabled:opacity-50`
- Botón cancelar modal: `bg-white border border-[#e5e5e5] text-[#374151] px-4 py-2 text-sm rounded hover:bg-gray-50`

- [ ] **Step 4: Aplicar mismo patrón a IngresosTab y FacturasTab**

Mismos cambios que GastosTab: header negro, filas alternas, botones ghost, inputs con `INPUT`, botones de modal azul/cancelar gris.

- [ ] **Step 5: Actualizar GananciasTab — KPI cards con gradiente**

Reemplazar el bloque de cards en `GananciasTab`:

```jsx
// Reemplazar la sección de `cards.map(...)` con:
const KPI_CARDS = [
  { label: 'Ingresos servicios', value: data.ingresos_servicios, gradient: 'linear-gradient(135deg,#1d4ed8,#1e40af)' },
  { label: 'Ingresos manuales',  value: data.ingresos_manuales,  gradient: 'linear-gradient(135deg,#374151,#1f2937)' },
  { label: 'Total ingresos',     value: data.total_ingresos,     gradient: 'linear-gradient(135deg,#059669,#047857)', big: true },
  { label: 'Costo servicios',    value: data.costo_servicios,    gradient: 'linear-gradient(135deg,#374151,#111111)' },
  { label: 'Total gastos',       value: data.total_gastos,       gradient: 'linear-gradient(135deg,#dc2626,#b91c1c)' },
  { label: 'Ganancia bruta',     value: data.ganancia_bruta,     gradient: data.ganancia_bruta >= 0 ? 'linear-gradient(135deg,#1d4ed8,#1e40af)' : 'linear-gradient(135deg,#dc2626,#b91c1c)' },
  { label: 'Ganancia neta',      value: data.ganancia_neta,      gradient: data.ganancia_neta >= 0  ? 'linear-gradient(135deg,#059669,#047857)' : 'linear-gradient(135deg,#dc2626,#b91c1c)', big: true },
];

// En el JSX, reemplazar el grid de cards con:
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
  {KPI_CARDS.map(({ label, value, gradient, big }) => (
    <div key={label} style={{ background: gradient }} className={`rounded-xl p-4 text-white relative overflow-hidden ${big ? 'md:col-span-2' : ''}`}>
      <div style={{ position:'absolute', top:-16, right:-16, width:72, height:72, borderRadius:'50%', background:'rgba(255,255,255,0.07)' }} />
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70 mb-1.5">{label}</p>
      <p className={`font-extrabold leading-none ${big ? 'text-2xl' : 'text-xl'}`}>{fmtMXN(value)}</p>
    </div>
  ))}
</div>
```

- [ ] **Step 6: Actualizar botones de filtro en GananciasTab**

```jsx
// Botón Aplicar:
className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm px-4 py-1.5 rounded-lg"

// Botón Limpiar:
className="text-sm text-[#9ca3af] hover:text-[#374151]"
```

- [ ] **Step 7: Actualizar tabs de navegación en FinancieroPage**

Reemplazar el componente de tabs (donde se selecciona Ganancias/Gastos/Ingresos/Facturas) con:

```jsx
// Buscar el div con los botones de tab y reemplazar clases:
// Tab activo:    bg-[#1d4ed8] text-white font-semibold
// Tab inactivo:  text-[#6b7280] hover:text-[#374151] hover:bg-[#f3f4f6]
```

- [ ] **Step 8: Build y commit**

```bash
cd ~/autofix/frontend && npm run build 2>&1 | tail -5
git add frontend/src/pages/FinancieroPage.jsx && git commit -m "feat: financiero con KPIs gradiente y paleta Herbie"
```

---

## Task 10: Build final y verificación completa

**Files:** ninguno nuevo

- [ ] **Step 1: Build de producción limpio**

```bash
cd ~/autofix/frontend && npm run build 2>&1
```
Esperado: `✓ built in X.XXs`, 0 errores, 0 warnings de tipo.

- [ ] **Step 2: Reiniciar backend con el nuevo dist**

```bash
kill $(cat /tmp/autofix.pid 2>/dev/null) 2>/dev/null; pkill -f "node src/index.js" 2>/dev/null
cd ~/autofix/backend && node src/index.js &> /tmp/autofix-server.log &
echo $! > /tmp/autofix.pid
sleep 2 && curl -s http://localhost:3002/api/health
```
Esperado: `{"ok":true}`

- [ ] **Step 3: Verificar que el frontend se sirve**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/
```
Esperado: `200`

- [ ] **Step 4: Verificar que no hay naranja en el código**

```bash
grep -r "orange" ~/autofix/frontend/src/ --include="*.jsx" --include="*.css"
```
Esperado: sin resultados (0 líneas).

- [ ] **Step 5: Commit final**

```bash
cd ~/autofix && git add -A && git commit -m "feat: rediseño UI completo — paleta Herbie, sidebar, KPIs gradiente"
```
