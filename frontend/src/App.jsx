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
import AutosPage from './pages/AutosPage';
import OrdenesPage from './pages/OrdenesPage';
import OrdenRecepcionPage from './pages/OrdenRecepcionPage';
import OrdenDetallePage from './pages/OrdenDetallePage';
import OrdenDiagnosticoPage from './pages/OrdenDiagnosticoPage';
import OrdenCotizacionPage from './pages/OrdenCotizacionPage';
import OrdenCierrePage from './pages/OrdenCierrePage';
import OrdenSalidaPage from './pages/OrdenSalidaPage';
import CotizacionPublicaPage from './pages/CotizacionPublicaPage';
import PipelinePage from './pages/PipelinePage';

function Layout() {
  return (
    <div className="flex h-screen bg-[#fafafa] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route path="/" element={<BitacoraPage />} />
            <Route path="/servicios/nuevo" element={<ServicioFormPage />} />
            <Route path="/servicios/:id/editar" element={<ServicioFormPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/paquetes" element={<PaquetesPage />} />
            <Route path="/cotizaciones" element={<CotizacionesPage />} />
            <Route path="/cotizaciones/nueva" element={<CotizacionFormPage />} />
            <Route path="/cotizaciones/:id/editar" element={<CotizacionFormPage />} />
            <Route path="/financiero" element={<FinancieroPage />} />
            <Route path="/autos" element={<AutosPage />} />
            <Route path="/ordenes" element={<OrdenesPage />} />
            <Route path="/ordenes/nueva" element={<OrdenRecepcionPage />} />
            <Route path="/ordenes/:id" element={<OrdenDetallePage />} />
            <Route path="/ordenes/:id/diagnostico" element={<OrdenDiagnosticoPage />} />
            <Route path="/ordenes/:id/cotizacion" element={<OrdenCotizacionPage />} />
            <Route path="/ordenes/:id/cierre" element={<OrdenCierrePage />} />
            <Route path="/ordenes/:id/salida" element={<OrdenSalidaPage />} />
            <Route path="/inventario" element={<div className="p-8 text-center text-[#6b7280]"><p className="text-2xl mb-2">🔧</p><p className="font-semibold text-[#111]">Inventario</p><p className="text-sm mt-1">Próximamente</p></div>} />
            <Route path="/cultura" element={<div className="p-8 text-center text-[#6b7280]"><p className="text-2xl mb-2">🏢</p><p className="font-semibold text-[#111]">Cultura empresarial</p><p className="text-sm mt-1">Próximamente</p></div>} />
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
        <Route path="/c/:token" element={<CotizacionPublicaPage />} />
        <Route path="/*" element={<ProtectedRoute><Layout /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
