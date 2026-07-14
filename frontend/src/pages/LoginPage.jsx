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
