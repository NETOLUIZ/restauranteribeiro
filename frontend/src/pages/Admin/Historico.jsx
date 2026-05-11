import { useState, useEffect } from 'react';
import { FiCalendar, FiSearch } from 'react-icons/fi';
import { pedidoEmpresaAPI, empresaAPI } from '../../services/api';

function formatarDataInput(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function primeiroDiaMes(data = new Date()) {
  return formatarDataInput(new Date(data.getFullYear(), data.getMonth(), 1));
}

function ultimoDiaMes(data = new Date()) {
  return formatarDataInput(new Date(data.getFullYear(), data.getMonth() + 1, 0));
}

export default function Historico() {
  const [historico, setHistorico] = useState({});
  const [empresas, setEmpresas] = useState([]);
  const [erroHistorico, setErroHistorico] = useState('');
  const [valoresMarmita, setValoresMarmita] = useState({});
  const [salvandoEmpresaId, setSalvandoEmpresaId] = useState(null);
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState(() => primeiroDiaMes(new Date()));
  const [filtroDataFim, setFiltroDataFim] = useState(() => ultimoDiaMes(new Date()));
  const [filtrosAplicados, setFiltrosAplicados] = useState(() => ({
    dataInicio: primeiroDiaMes(new Date()),
    dataFim: ultimoDiaMes(new Date()),
    empresaId: ''
  }));
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    empresaAPI.listar().then(res => setEmpresas(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    let ativo = true;
    const params = {};

    if (filtrosAplicados.dataInicio) {
      params.dataInicio = filtrosAplicados.dataInicio;
    }
    if (filtrosAplicados.dataFim) {
      params.dataFim = filtrosAplicados.dataFim;
    }
    if (filtrosAplicados.empresaId) params.empresaId = filtrosAplicados.empresaId;

    pedidoEmpresaAPI.historico(params)
      .then(({ data }) => {
        if (!ativo) return;
        setErroHistorico('');

        setHistorico(data || {});

        const mapaValores = {};
        Object.entries(data || {}).forEach(([empresaId, dados]) => {
          mapaValores[empresaId] = String(dados?.valorMarmita ?? 0);
        });
        setValoresMarmita(mapaValores);
      })
      .catch((err) => {
        console.error('Erro:', err);
        if (!ativo) return;
        setHistorico({});
        setErroHistorico(err.response?.data?.erro || 'Erro ao carregar historico. Verifique o backend.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [filtrosAplicados]);

  const buscarHistorico = () => {
    if (filtroDataInicio && filtroDataFim && filtroDataInicio > filtroDataFim) {
      alert('A data inicial nao pode ser maior que a data final.');
      return;
    }

    setCarregando(true);
    setFiltrosAplicados({
      dataInicio: filtroDataInicio,
      dataFim: filtroDataFim,
      empresaId: filtroEmpresa
    });
  };

  const limparFiltros = () => {
    const dataInicioPadrao = primeiroDiaMes(new Date());
    const dataFimPadrao = ultimoDiaMes(new Date());

    setFiltroDataInicio(dataInicioPadrao);
    setFiltroDataFim(dataFimPadrao);
    setFiltroEmpresa('');
    setCarregando(true);
    setFiltrosAplicados({
      dataInicio: dataInicioPadrao,
      dataFim: dataFimPadrao,
      empresaId: ''
    });
  };

  const formatarMoeda = (valor) => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const salvarValorMarmita = async (empresaId) => {
    const valorDigitado = Number(String(valoresMarmita[empresaId] || '').replace(',', '.'));

    if (!Number.isFinite(valorDigitado) || valorDigitado < 0) {
      alert('Informe um valor valido para a marmita.');
      return;
    }

    setSalvandoEmpresaId(empresaId);
    try {
      const valorFinal = Number(valorDigitado.toFixed(2));
      await empresaAPI.atualizar(empresaId, { valorMarmita: valorFinal });

      setHistorico((anterior) => {
        const atual = anterior?.[empresaId];
        if (!atual) return anterior;

        return {
          ...anterior,
          [empresaId]: {
            ...atual,
            valorMarmita: valorFinal,
            totalValor: Number((Number(atual.total || 0) * valorFinal).toFixed(2))
          }
        };
      });
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao salvar valor da marmita');
    } finally {
      setSalvandoEmpresaId(null);
    }
  };

  if (carregando) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div id="historico-admin">
      {erroHistorico && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 14px',
            borderRadius: '8px',
            background: 'var(--vermelho-light)',
            color: 'var(--vermelho)',
            fontWeight: 600
          }}
        >
          {erroHistorico}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ margin: 0, minWidth: '220px' }}>
          <label className="form-label"><FiCalendar size={14} /> Data inicial</label>
          <input
            className="form-input"
            type="date"
            value={filtroDataInicio}
            onChange={e => setFiltroDataInicio(e.target.value)}
            id="filtro-data-inicial"
          />
        </div>

        <div className="form-group" style={{ margin: 0, minWidth: '220px' }}>
          <label className="form-label"><FiCalendar size={14} /> Data final</label>
          <input
            className="form-input"
            type="date"
            value={filtroDataFim}
            min={filtroDataInicio || undefined}
            onChange={e => setFiltroDataFim(e.target.value)}
            id="filtro-data-final"
          />
        </div>

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

        <div className="form-group" style={{ margin: 0, alignSelf: 'end' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={buscarHistorico}
              id="btn-buscar-historico"
            >
              <FiSearch size={16} /> Buscar
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={limparFiltros}
              id="btn-limpar-historico"
            >
              Limpar filtros
            </button>
          </div>
        </div>
      </div>

      {Object.keys(historico).length > 0 ? (
        Object.entries(historico).map(([empresaId, dados]) => {
          const idNumerico = Number(empresaId);

          return (
            <div key={empresaId} className="admin-table-wrapper" style={{ marginBottom: '24px' }}>
              <div className="admin-table-header" style={{ background: 'var(--verde-bg)' }}>
                <div style={{ display: 'grid', gap: '8px' }}>
                  <h3>{dados.nomeEmpresa}</h3>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="badge badge-success" style={{ fontSize: '0.9rem', padding: '8px 16px' }}>
                      Total: {dados.total} marmitas
                    </span>
                    <span className="badge badge-info" style={{ fontSize: '0.9rem', padding: '8px 16px' }}>
                      Valor unitario: {formatarMoeda(dados.valorMarmita)}
                    </span>
                    <span className="badge badge-warning" style={{ fontSize: '0.9rem', padding: '8px 16px' }}>
                      Valor total: {formatarMoeda(dados.totalValor)}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'end' }}>
                  <div className="form-group" style={{ margin: 0, minWidth: '190px' }}>
                    <label className="form-label">Valor da Marmita (R$)</label>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={valoresMarmita[empresaId] ?? ''}
                      onChange={(e) => setValoresMarmita((anterior) => ({ ...anterior, [empresaId]: e.target.value }))}
                      id={`input-valor-marmita-historico-${empresaId}`}
                    />
                  </div>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => salvarValorMarmita(idNumerico)}
                    disabled={salvandoEmpresaId === idNumerico}
                    id={`btn-salvar-valor-marmita-${empresaId}`}
                  >
                    {salvandoEmpresaId === idNumerico ? 'Salvando...' : 'Salvar valor'}
                  </button>
                </div>
              </div>

              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Data</th>
                      <th>Lotes</th>
                      <th>Marmitas</th>
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
          );
        })
      ) : (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--cinza-400)' }}>
          <FiCalendar size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
          <p>Nenhum registro encontrado para o periodo</p>
        </div>
      )}
    </div>
  );
}
