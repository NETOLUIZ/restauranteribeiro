import { useState, useEffect } from 'react';
import { FiShoppingBag, FiTruck, FiDollarSign, FiClock, FiPackage, FiAlertCircle } from 'react-icons/fi';
import { dashboardAPI } from '../../services/api';

export default function Dashboard() {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const formatarMoeda = (valor = 0) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  useEffect(() => {
    let ativo = true;

    dashboardAPI.resumo()
      .then(({ data }) => {
        if (!ativo) return;
        setDados(data);
      })
      .catch((err) => {
        console.error('Erro ao carregar dashboard:', err);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  if (carregando) {
    return <div className="loading-spinner"><div className="spinner"></div></div>;
  }

  return (
    <div id="dashboard-admin">
      <div className="dashboard-cards">
        <div className="dash-card" id="card-avulsos-hoje">
          <div className="dash-card-header">
            <div className="dash-card-icon verde"><FiShoppingBag /></div>
          </div>
          <div className="dash-value">{dados?.pedidosAvulsosHoje || 0}</div>
          <div className="dash-label">Pedidos Avulsos Hoje</div>
        </div>
        
        <div className="dash-card" id="card-empresa-hoje">
          <div className="dash-card-header">
            <div className="dash-card-icon azul"><FiTruck /></div>
          </div>
          <div className="dash-value">{dados?.totalMarmitasEmpresa || 0}</div>
          <div className="dash-label">Refeições Empresa Hoje</div>
        </div>
        
        <div className="dash-card" id="card-dinheiro-aberto">
          <div className="dash-card-header">
            <div className="dash-card-icon amarelo"><FiDollarSign /></div>
          </div>
          <div className="dash-value">{dados?.dinheiroAberto || 0}</div>
          <div className="dash-label">Pagamentos em Dinheiro Abertos</div>
        </div>
        
        <div className="dash-card" id="card-empresa-pendente">
          <div className="dash-card-header">
            <div className="dash-card-icon vermelho"><FiAlertCircle /></div>
          </div>
          <div className="dash-value">{dados?.empresaPendentes || 0}</div>
          <div className="dash-label">Pedidos Empresa Pendentes</div>
        </div>
        
        <div className="dash-card" id="card-confirmados">
          <div className="dash-card-header">
            <div className="dash-card-icon verde"><FiPackage /></div>
          </div>
          <div className="dash-value" style={{ fontSize: '1.7rem' }}>{formatarMoeda(dados?.receitaDia || 0)}</div>
          <div className="dash-label">Receita Confirmada Hoje</div>
        </div>
      </div>

      {/* PEDIDOS RECENTES */}
      <div className="admin-table-wrapper" style={{ marginBottom: '24px' }}>
        <div className="admin-table-header">
          <h3>Últimos Pedidos Avulsos</h3>
        </div>
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Pagamento</th>
                <th>Status</th>
                <th>Hora</th>
              </tr>
            </thead>
            <tbody>
              {dados?.pedidosAvulsos?.slice(0, 5).map(p => (
                <tr key={p.id}>
                  <td>#{p.id}</td>
                  <td>{p.nomeCliente}</td>
                  <td>{p.formaPagamento}</td>
                  <td>
                    <span className={`badge badge-${p.statusPagamento === 'CONFIRMADO' ? 'success' : p.statusPagamento === 'PENDENTE' ? 'warning' : 'danger'}`}>
                      {p.statusPagamento}
                    </span>
                  </td>
                  <td>{new Date(p.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
              {(!dados?.pedidosAvulsos || dados.pedidosAvulsos.length === 0) && (
                <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--cinza-400)' }}>Nenhum pedido hoje</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
