import { useState, useEffect } from 'react';
import { FiCalendar, FiSearch } from 'react-icons/fi';
import { pedidoEmpresaAPI, empresaAPI } from '../../services/api';

export default function Historico() {
  const [historico, setHistorico] = useState({});
  const [empresas, setEmpresas] = useState([]);
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('mes');
  const [filtroMes, setFiltroMes] = useState(new Date().toISOString().slice(0, 7));
  const [filtroSemana, setFiltroSemana] = useState(new Date().toISOString().slice(0, 10));
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    empresaAPI.listar().then(res => setEmpresas(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    let ativo = true;
    const params = {};

    if (filtroTipo === 'semana') {
      params.semana = filtroSemana;
    } else {
      params.mes = filtroMes;
    }
    if (filtroEmpresa) params.empresaId = filtroEmpresa;

    pedidoEmpresaAPI.historico(params)
      .then(({ data }) => {
        if (!ativo) return;
        setHistorico(data);
      })
      .catch((err) => {
        console.error('Erro:', err);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [filtroEmpresa, filtroMes, filtroSemana, filtroTipo]);

  if (carregando) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div id="historico-admin">
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ margin: 0, minWidth: '180px' }}>
          <label className="form-label"><FiCalendar size={14} /> Período</label>
          <select
            className="form-select"
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
            id="filtro-tipo-periodo"
          >
            <option value="mes">Mês</option>
            <option value="semana">Semana</option>
          </select>
        </div>

        {filtroTipo === 'mes' ? (
        <div className="form-group" style={{ margin: 0, minWidth: '200px' }}>
          <label className="form-label"><FiCalendar size={14} /> Mês</label>
          <input
            className="form-input"
            type="month"
            value={filtroMes}
            onChange={e => setFiltroMes(e.target.value)}
            id="filtro-mes"
          />
        </div>
        ) : (
          <div className="form-group" style={{ margin: 0, minWidth: '220px' }}>
            <label className="form-label"><FiCalendar size={14} /> Início da Semana</label>
            <input
              className="form-input"
              type="date"
              value={filtroSemana}
              onChange={e => setFiltroSemana(e.target.value)}
              id="filtro-semana"
            />
          </div>
        )}

        <div className="form-group" style={{ margin: 0, minWidth: '200px' }}>
          <label className="form-label"><FiSearch size={14} /> Empresa</label>
          <select
            className="form-select"
            value={filtroEmpresa}
            onChange={e => setFiltroEmpresa(e.target.value)}
            id="filtro-empresa"
          >
            <option value="">Todas as empresas</option>
            {empresas.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {Object.keys(historico).length > 0 ? (
        Object.entries(historico).map(([nomeEmpresa, dados]) => (
          <div key={nomeEmpresa} className="admin-table-wrapper" style={{ marginBottom: '24px' }}>
            <div className="admin-table-header" style={{ background: 'var(--verde-bg)' }}>
              <h3>{nomeEmpresa}</h3>
              <span className="badge badge-success" style={{ fontSize: '0.9rem', padding: '8px 16px' }}>
                Total: {dados.total} refeições
              </span>
            </div>
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Data</th>
                    <th>Lotes</th>
                    <th>Refeições</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.pedidos.map(pedido => (
                    <tr key={pedido.id}>
                      <td>#{pedido.id}</td>
                      <td>{new Date(pedido.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td>{pedido.lotes.length}</td>
                      <td>{pedido.lotes.reduce((s, l) => s + l.quantidade, 0)}</td>
                      <td>
                        <span className={`badge badge-${pedido.status === 'IMPRESSO' ? 'success' : pedido.status === 'AUTORIZADO' ? 'info' : 'warning'}`}>
                          {pedido.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      ) : (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--cinza-400)' }}>
          <FiCalendar size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
          <p>Nenhum registro encontrado para o período</p>
        </div>
      )}
    </div>
  );
}
