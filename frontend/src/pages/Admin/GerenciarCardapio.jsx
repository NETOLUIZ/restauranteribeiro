import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiPrinter } from 'react-icons/fi';
import { cardapioAPI } from '../../services/api';
import { abrirImpressaoComandaChecklist } from '../../utils/comandaChecklistPrint';
import { COMPLEMENTOS_COMANDA, PROTEINAS_COMANDA, ordenarItensComanda } from '../../constants/comandaOrder';

export default function GerenciarCardapio() {
  const [itens, setItens] = useState([]);
  const [novoItem, setNovoItem] = useState({ nome: '', tipo: 'PROTEINA' });
  const [editando, setEditando] = useState(null);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    try {
      const { data } = await cardapioAPI.listarTodos();
      setItens(data);
    } catch (err) {
      console.error('Erro:', err);
    }
    setCarregando(false);
  }

  useEffect(() => {
    let ativo = true;

    cardapioAPI.listarTodos()
      .then(({ data }) => {
        if (!ativo) return;
        setItens(data);
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
  }, []);

  const adicionar = async () => {
    if (!novoItem.nome.trim()) return;
    try {
      await cardapioAPI.criar(novoItem);
      setNovoItem({ nome: '', tipo: 'PROTEINA' });
      carregar();
    } catch (err) {
      console.error('Erro:', err);
    }
  };

  const toggleAtivo = async (item) => {
    try {
      await cardapioAPI.atualizar(item.id, { ...item, ativo: !item.ativo });
      carregar();
    } catch (err) {
      console.error('Erro:', err);
    }
  };

  const salvarEdicao = async () => {
    if (!editando) return;
    try {
      await cardapioAPI.atualizar(editando.id, editando);
      setEditando(null);
      carregar();
    } catch (err) {
      console.error('Erro:', err);
    }
  };

  const deletar = async (id) => {
    try {
      await cardapioAPI.deletar(id);
      carregar();
    } catch (err) {
      console.error('Erro:', err);
    }
  };

  const imprimirComandaVazia = () => {
    const itensAtivos = itens.filter((item) => item.ativo);
    const proteinasAtivas = ordenarItensComanda(
      itensAtivos.filter((item) => item.tipo === 'PROTEINA'),
      PROTEINAS_COMANDA
    );
    const complementosAtivos = ordenarItensComanda(
      itensAtivos.filter((item) => item.tipo === 'COMPLEMENTO'),
      COMPLEMENTOS_COMANDA
    );

    if (!proteinasAtivas.length && !complementosAtivos.length) {
      alert('Nenhum item ativo no cardapio para imprimir na comanda.');
      return;
    }

    try {
      abrirImpressaoComandaChecklist({
        tituloJanela: 'Comanda Vazia',
        itensProteina: proteinasAtivas,
        itensComplemento: complementosAtivos
      });
    } catch {
      alert('Nao foi possivel abrir a impressao. Verifique o bloqueador de pop-up do navegador.');
    }
  };

  if (carregando) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const proteinas = ordenarItensComanda(
    itens.filter((item) => item.tipo === 'PROTEINA'),
    PROTEINAS_COMANDA
  );
  const complementos = ordenarItensComanda(
    itens.filter((item) => item.tipo === 'COMPLEMENTO'),
    COMPLEMENTOS_COMANDA
  );

  return (
    <div id="gerenciar-cardapio">
      <div className="admin-form-card">
        <div className="admin-form-card-header">
          <h3>Adicionar Item ao Cardápio</h3>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={imprimirComandaVazia}
            id="btn-comanda-vazia"
          >
            <FiPrinter size={18} /> Comanda Vazia
          </button>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Nome do Item</label>
            <input
              className="form-input"
              placeholder="Ex: Frango Grelhado"
              value={novoItem.nome}
              onChange={e => setNovoItem({ ...novoItem, nome: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && adicionar()}
              id="input-novo-item"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <select
              className="form-select"
              value={novoItem.tipo}
              onChange={e => setNovoItem({ ...novoItem, tipo: e.target.value })}
              id="select-tipo-item"
            >
              <option value="PROTEINA">Proteína</option>
              <option value="COMPLEMENTO">Complemento</option>
            </select>
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-primary" onClick={adicionar} id="btn-adicionar-item">
              <FiPlus size={18} /> Adicionar
            </button>
          </div>
        </div>
      </div>

      {editando && (
        <div className="modal-overlay" onClick={() => setEditando(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar Item</h3>
              <button onClick={() => setEditando(null)} style={{ fontSize: '1.2rem', color: 'var(--cinza-500)' }}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nome</label>
                <input
                  className="form-input"
                  value={editando.nome}
                  onChange={e => setEditando({ ...editando, nome: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select
                  className="form-select"
                  value={editando.tipo}
                  onChange={e => setEditando({ ...editando, tipo: e.target.value })}
                >
                  <option value="PROTEINA">Proteína</option>
                  <option value="COMPLEMENTO">Complemento</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarEdicao}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-table-wrapper">
        <div className="admin-table-header">
          <h3>Proteínas ({proteinas.length})</h3>
        </div>
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {proteinas.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 500 }}>{item.nome}</td>
                  <td>
                    <span className={`badge ${item.ativo ? 'badge-success' : 'badge-danger'}`}>
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        className={`table-action-btn table-action-toggle ${item.ativo ? 'is-active' : 'is-inactive'}`}
                        onClick={() => toggleAtivo(item)}
                        title={item.ativo ? 'Desativar' : 'Ativar'}
                      >
                        {item.ativo ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />}
                        <span>{item.ativo ? 'Ativo' : 'Inativo'}</span>
                      </button>
                      <button className="table-action-btn table-action-edit" onClick={() => setEditando({ ...item })}>
                        <FiEdit2 size={16} />
                        <span>Editar</span>
                      </button>
                      <button className="table-action-btn table-action-delete" onClick={() => deletar(item.id)}>
                        <FiTrash2 size={16} />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-table-wrapper" style={{ marginTop: '24px' }}>
        <div className="admin-table-header">
          <h3>Complementos ({complementos.length})</h3>
        </div>
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {complementos.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 500 }}>{item.nome}</td>
                  <td>
                    <span className={`badge ${item.ativo ? 'badge-success' : 'badge-danger'}`}>
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        className={`table-action-btn table-action-toggle ${item.ativo ? 'is-active' : 'is-inactive'}`}
                        onClick={() => toggleAtivo(item)}
                        title={item.ativo ? 'Desativar' : 'Ativar'}
                      >
                        {item.ativo ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />}
                        <span>{item.ativo ? 'Ativo' : 'Inativo'}</span>
                      </button>
                      <button className="table-action-btn table-action-edit" onClick={() => setEditando({ ...item })}>
                        <FiEdit2 size={16} />
                        <span>Editar</span>
                      </button>
                      <button className="table-action-btn table-action-delete" onClick={() => deletar(item.id)}>
                        <FiTrash2 size={16} />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
