import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout y Login
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import RegisterTenant from './pages/RegisterTenant';

// Importación Lazy correcta para el Dashboard completo (Exportación por defecto)
const Dashboard = lazy(() => import('./pages/Dashboard'));

// Importaciones Lazy para los módulos en construcción (Exportaciones nombradas)
const Ventas = lazy(() => import('./pages/Ventas'));
const Caja = lazy(() => import('./pages/Caja'));
const InvoicesManager = lazy(() => import('./pages/InvoicesManager'));
const Reportes = lazy(() => import('./pages/Reportes'));
const Inventario = lazy(() => import('./pages/Inventario'));
const Compras = lazy(() => import('./pages/Compras'));
const Usuarios = lazy(() => import('./pages/UsersManager'));
const CustomersManager = lazy(() => import('./pages/CustomersManager'));
const SuppliersManager = lazy(() => import('./pages/SuppliersManager'));
const Configuracion = lazy(() => import('./pages/Configuracion'));
const SaasDashboard = lazy(() => import('./pages/SaasDashboard'));
const StoreFront = lazy(() => import('./pages/StoreFront'));
const StoreOrdersManager = lazy(() => import('./pages/StoreOrdersManager'));
const Cocina = lazy(() => import('./pages/Cocina'));
const Produccion = lazy(() => import('./pages/Production/ProductionManager'));

const LoadingFallback = () => (
  <div className="flex justify-center items-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/" replace />;
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/registro" element={<PublicRoute><RegisterTenant /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterTenant /></PublicRoute>} />
        <Route path="/tienda/:slug" element={<Suspense fallback={<LoadingFallback />}><StoreFront /></Suspense>} />

        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Suspense fallback={<LoadingFallback />}><Dashboard /></Suspense>} />
          <Route path="ventas" element={<Suspense fallback={<LoadingFallback />}><Ventas /></Suspense>} />
          <Route path="cocina" element={<Suspense fallback={<LoadingFallback />}><Cocina /></Suspense>} />
          <Route path="pedidos-tienda" element={<Suspense fallback={<LoadingFallback />}><StoreOrdersManager /></Suspense>} />
          <Route path="caja" element={<Suspense fallback={<LoadingFallback />}><Caja /></Suspense>} />
          <Route path="facturas" element={<Suspense fallback={<LoadingFallback />}><InvoicesManager /></Suspense>} />
          <Route path="reportes" element={<Suspense fallback={<LoadingFallback />}><Reportes /></Suspense>} />
          <Route path="inventario" element={<Suspense fallback={<LoadingFallback />}><Inventario /></Suspense>} />
          <Route path="produccion" element={<Suspense fallback={<LoadingFallback />}><Produccion /></Suspense>} />
          <Route path="compras" element={<Suspense fallback={<LoadingFallback />}><Compras /></Suspense>} />
          <Route path="proveedores" element={<Suspense fallback={<LoadingFallback />}><SuppliersManager /></Suspense>} />
          <Route path="usuarios" element={<Suspense fallback={<LoadingFallback />}><Usuarios /></Suspense>} />
          <Route path="clientes" element={<Suspense fallback={<LoadingFallback />}><CustomersManager /></Suspense>} />
          <Route path="configuracion" element={<Suspense fallback={<LoadingFallback />}><Configuracion /></Suspense>} />
          <Route path="saas" element={<Suspense fallback={<LoadingFallback />}><SaasDashboard /></Suspense>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;