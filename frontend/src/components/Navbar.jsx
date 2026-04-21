import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { FiMenu, FiX, FiLogOut } from 'react-icons/fi';

export default function Navbar() {
  const [menuAberto, setMenuAberto] = useState(false);
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuAberto(false);
  };

  return (
    <nav className="navbar" id="navbar-principal">
      <div className="container">
        <Link to="/" className="navbar-logo">
          <span>Restaurante Ribeiro</span>
        </Link>
        
        <div className="navbar-links">
          <Link to="/">Início</Link>
          <Link to="/pedido">Fazer Pedido</Link>
          {!usuario && <Link to="/empresa/login">Área da Empresa</Link>}
          {usuario && usuario.role === 'ADMIN' && <Link to="/admin">Painel Admin</Link>}
          {usuario && usuario.role === 'EMPRESA_FUNC' && <Link to="/empresa/pedidos">Meus Pedidos</Link>}
          {usuario && (
            <button onClick={handleLogout} className="btn btn-sm btn-secondary">
              <FiLogOut size={16} /> Sair
            </button>
          )}
        </div>
        
        <button 
          className="navbar-menu-btn" 
          onClick={() => setMenuAberto(!menuAberto)}
          id="btn-menu-mobile"
        >
          {menuAberto ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </div>
      
      {menuAberto && (
        <div className="navbar-mobile">
          <Link to="/" onClick={() => setMenuAberto(false)}>Início</Link>
          <Link to="/pedido" onClick={() => setMenuAberto(false)}>Fazer Pedido</Link>
          {!usuario && <Link to="/empresa/login" onClick={() => setMenuAberto(false)}>Área da Empresa</Link>}
          {usuario && usuario.role === 'ADMIN' && <Link to="/admin" onClick={() => setMenuAberto(false)}>Painel Admin</Link>}
          {usuario && usuario.role === 'EMPRESA_FUNC' && <Link to="/empresa/pedidos" onClick={() => setMenuAberto(false)}>Meus Pedidos</Link>}
          {usuario && (
            <button onClick={handleLogout}>
              <FiLogOut size={16} /> Sair
            </button>
          )}
        </div>
      )}
    </nav>
  );
}

