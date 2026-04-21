import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import Home from './pages/Home';
import PedidoAvulso from './pages/PedidoAvulso';
import EmpresaLogin from './pages/EmpresaLogin';
import EmpresaPedidos from './pages/EmpresaPedidos';
import AdminLayout from './pages/Admin/AdminLayout';
import './styles/global.css';

function ProtectedRoute({ children, role, loginPath = '/empresa/login' }) {
  const { usuario, carregando } = useAuth();
  
  if (carregando) {
    return (
      <div className="loading-spinner loading-spinner-full">
        <div className="spinner"></div>
      </div>
    );
  }
  
  if (!usuario) {
    return <Navigate to={loginPath} replace />;
  }
  
  if (role && usuario.role !== role) {
    if (usuario.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (usuario.role === 'EMPRESA_FUNC') return <Navigate to="/empresa/pedidos" replace />;
    return <Navigate to="/" replace />;
  }
  
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pedido" element={<PedidoAvulso />} />
          <Route path="/empresa/login" element={<EmpresaLogin modo="empresa" />} />
          <Route path="/admin/login" element={<EmpresaLogin modo="admin" />} />
          <Route 
            path="/empresa/pedidos" 
            element={
              <ProtectedRoute role="EMPRESA_FUNC" loginPath="/empresa/login">
                <EmpresaPedidos />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute role="ADMIN" loginPath="/admin/login">
                <AdminLayout />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

