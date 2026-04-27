import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FiCpu,
  FiGrid,
  FiList,
  FiImage,
  FiShoppingBag,
  FiTruck,
  FiUsers,
  FiClock,
  FiDollarSign,
  FiLogOut,
  FiMenu,
  FiX
} from 'react-icons/fi';
import { useAuth } from '../../context/useAuth';
import Dashboard from './Dashboard';
import GerenciarCardapio from './GerenciarCardapio';
import GerenciarBanners from './GerenciarBanners';
import PedidosAvulsos from './PedidosAvulsos';
import PedidosEmpresas from './PedidosEmpresas';
import CadastroEmpresas from './CadastroEmpresas';
import Historico from './Historico';
import ControleDinheiro from './ControleDinheiro';
import PedidoIA from '../PedidoIA/PedidoIA';
import '../../styles/admin.css';

const PAGINAS = [
  { id: 'dashboard', label: 'Dashboard', icon: <FiGrid />, componente: Dashboard },
  { id: 'cardapio', label: 'Cardápio do Dia', icon: <FiList />, componente: GerenciarCardapio },
  { id: 'banners', label: 'Banners e Promoções', icon: <FiImage />, componente: GerenciarBanners },
  { id: 'divider1', divider: true },
  { id: 'pedido-ia', label: 'Pedido por IA', icon: <FiCpu />, componente: PedidoIA, rota: '/admin/pedido-ia' },
  { id: 'avulsos', label: 'Pedidos Avulsos', icon: <FiShoppingBag />, componente: PedidosAvulsos },
  { id: 'empresas-pedidos', label: 'Pedidos Empresas', icon: <FiTruck />, componente: PedidosEmpresas },
  { id: 'dinheiro', label: 'Controle Dinheiro', icon: <FiDollarSign />, componente: ControleDinheiro },
  { id: 'divider2', divider: true },
  { id: 'empresas', label: 'Cadastro Empresas', icon: <FiUsers />, componente: CadastroEmpresas },
  { id: 'historico', label: 'Histórico', icon: <FiClock />, componente: Historico }
];

export default function AdminLayout({ paginaInicial = 'dashboard' }) {
  const location = useLocation();
  const [paginaPadrao, setPaginaPadrao] = useState(() => paginaInicial || 'dashboard');
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 901px)');

    const sincronizarSidebar = (event) => {
      if (event.matches) {
        setSidebarAberta(false);
      }
    };

    sincronizarSidebar(mediaQuery);
    mediaQuery.addEventListener('change', sincronizarSidebar);

    return () => {
      mediaQuery.removeEventListener('change', sincronizarSidebar);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const paginaAtual = location.pathname === '/admin/pedido-ia'
    ? 'pedido-ia'
    : paginaPadrao;
  const pagina = PAGINAS.find((item) => item.id === paginaAtual);
  const Componente = pagina?.componente || Dashboard;
  const tituloAtual = pagina?.label || 'Dashboard';

  const trocarPagina = (id) => {
    setPaginaPadrao(id);
    setSidebarAberta(false);

    const paginaSelecionada = PAGINAS.find((item) => item.id === id);
    if (paginaSelecionada?.rota) {
      navigate(paginaSelecionada.rota);
      return;
    }

    if (location.pathname !== '/admin') {
      navigate('/admin');
    }
  };

  return (
    <div className="admin-layout" id="admin-layout">
      <div
        className={`sidebar-overlay ${sidebarAberta ? 'show' : ''}`}
        onClick={() => setSidebarAberta(false)}
      />

      <aside className={`admin-sidebar ${sidebarAberta ? 'open' : ''}`} id="admin-sidebar">
        <div className="admin-sidebar-header">
          <div>
            <div className="admin-title">Restaurante Ribeiro</div>
            <div className="admin-subtitle">Painel Administrativo</div>
          </div>
        </div>

        <nav className="admin-nav">
          {PAGINAS.map((item) => {
            if (item.divider) {
              return <div key={item.id} className="admin-nav-divider" />;
            }

            return (
              <button
                key={item.id}
                className={`admin-nav-item ${paginaAtual === item.id ? 'ativo' : ''}`}
                onClick={() => trocarPagina(item.id)}
                id={`nav-${item.id}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <div className="admin-user-avatar">
              {usuario?.nome?.charAt(0) || 'A'}
            </div>
            <div>
              <div className="admin-user-name">{usuario?.nome || 'Admin'}</div>
              <div className="admin-user-role">Administrador</div>
            </div>
          </div>
          <button
            className="admin-nav-item"
            onClick={handleLogout}
            id="btn-logout-admin"
            style={{ marginTop: '8px' }}
          >
            <span className="nav-icon"><FiLogOut /></span>
            Sair
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              className="admin-mobile-menu"
              onClick={() => setSidebarAberta(!sidebarAberta)}
              id="btn-menu-admin"
            >
              {sidebarAberta ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
            <h2>{tituloAtual}</h2>
          </div>
        </header>

        <div className="admin-content">
          <Componente />
        </div>
      </main>
    </div>
  );
}
