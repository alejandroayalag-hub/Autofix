import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getOrdenes } from '../api/ordenes';

const Icon = ({ d, d2 }) => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="flex-shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    {d2 && <path strokeLinecap="round" strokeLinejoin="round" d={d2} />}
  </svg>
);

const OPERACIONES = [
  { to: '/clientes', label: 'Clientes',
    icon: <Icon d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" /> },
  { to: '/autos', label: 'Autos',
    icon: <Icon d="M8 7h12m0 0l-4-4m4 4l-4 4m0 5H4m0 0l4 4m-4-4l4-4" /> },
  { to: '/cotizaciones', label: 'Cotizador',
    icon: <Icon d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
  { to: '/ordenes', label: 'Órdenes',
    icon: <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /> },
];

const TALLER = [
  { to: '/pipeline', label: 'Pipeline', badge: true,
    icon: <Icon d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /> },
  { to: '/inventario', label: 'Inventario', placeholder: true,
    icon: <Icon d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /> },
  { to: '/paquetes', label: 'Catálogo',
    icon: <Icon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /> },
  { to: '/', label: 'Bitácora', end: true,
    icon: <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /> },
  { to: '/financiero', label: 'Financiero',
    icon: <Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
];

const EMPRESA = [
  { to: '/cultura', label: 'Cultura', placeholder: true,
    icon: <Icon d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /> },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const nombre = localStorage.getItem('nombre') || 'Usuario';
  const initials = nombre.slice(0, 2).toUpperCase();
  const [otActivas, setOtActivas] = useState(0);

  useEffect(() => {
    getOrdenes({ activas: 1 })
      .then(r => setOtActivas(r.data?.data?.length || 0))
      .catch(() => {});
  }, []);

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

  const Section = ({ label, items }) => (
    <div className="mb-2">
      <p className="text-[#4b5563] text-[9px] font-bold uppercase tracking-widest px-2 pb-1">{label}</p>
      {items.map(({ to, end, label: l, icon, badge, placeholder }) => (
        placeholder
          ? <div key={to} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#4b5563] cursor-default select-none">
              {icon}{l}
              <span className="ml-auto text-[9px] text-[#4b5563] border border-[#333] rounded px-1">Pronto</span>
            </div>
          : <NavLink key={to} to={to} end={end} className={cls}>
              {icon}
              <span className="flex-1">{l}</span>
              {badge && otActivas > 0 && (
                <span className="bg-[#dc2626] text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                  {otActivas > 99 ? '99+' : otActivas}
                </span>
              )}
            </NavLink>
      ))}
    </div>
  );

  return (
    <aside style={{ width: 210, background: '#111111' }} className="flex flex-col h-screen flex-shrink-0">
      {/* Franja racing Herbie — h-3 = 12px */}
      <div className="flex h-3 flex-shrink-0">
        <div className="flex-1 bg-[#dc2626]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#1d4ed8]" />
      </div>

      {/* Brand */}
      <div className="flex items-center gap-2.5 px-3.5 py-4 border-b border-[#222]">
        <div className="w-9 h-9 rounded-full bg-white border-2 border-[#dc2626] flex items-center justify-center text-base flex-shrink-0">🔧</div>
        <div className="min-w-0">
          <p className="text-white text-xs font-bold leading-tight truncate">AutoFix Querétaro</p>
          <p className="text-[#6b7280] text-[10px] mt-0.5">Bitácora de servicios</p>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <Section label="Operaciones" items={OPERACIONES} />
        <Section label="Taller" items={TALLER} />
        <Section label="Empresa" items={EMPRESA} />
      </nav>

      {/* Footer */}
      <div className="flex items-center gap-2 px-3 py-3 border-t border-[#222]">
        <div className="w-7 h-7 rounded-full bg-[#374151] flex items-center justify-center text-[#9ca3af] text-xs font-bold flex-shrink-0">{initials}</div>
        <span className="text-[#9ca3af] text-xs flex-1 truncate">{nombre}</span>
        <button onClick={logout} className="text-[#ef4444] text-[10px] border border-[#7f1d1d] rounded px-1.5 py-0.5 hover:bg-[#7f1d1d33]">Salir</button>
      </div>
    </aside>
  );
}
