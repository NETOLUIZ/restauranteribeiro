import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiPrinter } from 'react-icons/fi';
import { cardapioAPI } from '../../services/api';
import { COMANDA_PRINT_CSS, escapeHtml } from '../../utils/comandaPrint';

const gerarItensComandaVazia = (itens) => {
  if (!itens.length) {
    return '<div class="comanda-vazia-item comanda-vazia-item-vazio"><span class="comanda-vazia-check"></span><span class="comanda-vazia-nome">&nbsp;</span></div>';
  }

  return itens.map((item) => `
    <div class="comanda-vazia-item">
      <span class="comanda-vazia-check"></span>
      <span class="comanda-vazia-nome">${escapeHtml(item.nome || '-')}</span>
    </div>
  `).join('');
};

const gerarHtmlComandaVazia = (proteinas, complementos) => {
  const totalLinhas = Math.max(proteinas.length, complementos.length);
  const densidade = totalLinhas > 10 ? 'micro' : totalLinhas > 8 ? 'compacta' : totalLinhas > 6 ? 'media' : '';

  return `
    <html>
      <head>
        <title>Comanda Vazia</title>
        <style>
          ${COMANDA_PRINT_CSS}

          .comanda-vazia-conteudo {
            width: 101mm;
            height: 66mm;
            margin: 0 auto;
            padding: 2mm 2.5mm;
            overflow: hidden;
            background: var(--branco);
            border: 0.45mm solid var(--preto-termico);
            border-radius: 1.5mm;
            color: var(--preto-termico);
            font-family: Arial, Helvetica, sans-serif;
            display: flex;
            flex-direction: column;
            gap: 1.45mm;
            box-shadow: none;
          }

          .comanda-vazia-topo {
            flex: 0 0 auto;
            display: grid;
            grid-template-columns: minmax(16mm, 1fr) auto minmax(16mm, 1fr);
            align-items: center;
            gap: 2mm;
          }

          .comanda-vazia-topo::before,
          .comanda-vazia-topo::after {
            content: '';
            border-top: 0.35mm solid var(--preto-termico);
          }

          .comanda-vazia-titulo {
            font-size: 9.4mm;
            font-weight: 900;
            line-height: 0.95;
            letter-spacing: 1.2mm;
            text-transform: uppercase;
            white-space: nowrap;
          }

          .comanda-vazia-campos {
            flex: 0 0 auto;
            display: grid;
            gap: 2.2mm;
          }

          .comanda-vazia-campo {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            align-items: end;
            gap: 3mm;
          }

          .comanda-vazia-label {
            font-size: 4.9mm;
            font-weight: 900;
            line-height: 1;
          }

          .comanda-vazia-linha {
            height: 4.2mm;
            border-bottom: 0.3mm solid var(--preto-termico);
          }

          .comanda-vazia-colunas {
            flex: 1 1 auto;
            min-height: 0;
            display: grid;
            grid-template-columns: minmax(0, 1fr) 0.35mm minmax(0, 1fr);
            gap: 1.7mm;
          }

          .comanda-vazia-divisor {
            background: var(--preto-termico);
            width: 0.35mm;
            min-height: 100%;
          }

          .comanda-vazia-coluna {
            min-width: 0;
            min-height: 0;
            display: flex;
            flex-direction: column;
          }

          .comanda-vazia-coluna-titulo {
            flex: 0 0 auto;
            min-height: 6.6mm;
            border: 0.35mm solid var(--preto-termico);
            border-radius: 0.9mm;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 3.9mm;
            font-weight: 900;
            line-height: 1;
            letter-spacing: 0.8mm;
            text-transform: uppercase;
            text-align: center;
          }

          .comanda-vazia-lista {
            flex: 1 1 auto;
            min-height: 0;
            display: flex;
            flex-direction: column;
            padding: 1.2mm 0.8mm 0;
          }

          .comanda-vazia-item {
            flex: 1 1 0;
            min-height: 5.4mm;
            display: grid;
            grid-template-columns: 5.4mm minmax(0, 1fr);
            align-items: center;
            gap: 2mm;
            border-bottom: 0.28mm dotted var(--preto-termico);
          }

          .comanda-vazia-check {
            width: 5mm;
            height: 5mm;
            border: 0.35mm solid var(--preto-termico);
            border-radius: 0.45mm;
            display: block;
          }

          .comanda-vazia-nome {
            min-width: 0;
            overflow: hidden;
            color: var(--preto-termico);
            font-size: 4mm;
            font-weight: 900;
            line-height: 1;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          .comanda-vazia.media .comanda-vazia-titulo {
            font-size: 8.6mm;
          }

          .comanda-vazia.media .comanda-vazia-label {
            font-size: 4.4mm;
          }

          .comanda-vazia.media .comanda-vazia-coluna-titulo {
            min-height: 6mm;
            font-size: 3.5mm;
            letter-spacing: 0.55mm;
          }

          .comanda-vazia.media .comanda-vazia-item {
            min-height: 4.8mm;
            grid-template-columns: 4.8mm minmax(0, 1fr);
            gap: 1.5mm;
          }

          .comanda-vazia.media .comanda-vazia-check {
            width: 4.4mm;
            height: 4.4mm;
          }

          .comanda-vazia.media .comanda-vazia-nome {
            font-size: 3.45mm;
          }

          .comanda-vazia.compacta .comanda-vazia-conteudo {
            gap: 1mm;
          }

          .comanda-vazia.compacta .comanda-vazia-titulo {
            font-size: 7.6mm;
            letter-spacing: 0.85mm;
          }

          .comanda-vazia.compacta .comanda-vazia-campos {
            gap: 1.25mm;
          }

          .comanda-vazia.compacta .comanda-vazia-label {
            font-size: 3.9mm;
          }

          .comanda-vazia.compacta .comanda-vazia-linha {
            height: 3.4mm;
          }

          .comanda-vazia.compacta .comanda-vazia-coluna-titulo {
            min-height: 5.2mm;
            font-size: 3mm;
            letter-spacing: 0.35mm;
          }

          .comanda-vazia.compacta .comanda-vazia-lista {
            padding-top: 0.8mm;
          }

          .comanda-vazia.compacta .comanda-vazia-item {
            min-height: 4mm;
            grid-template-columns: 4mm minmax(0, 1fr);
            gap: 1.2mm;
          }

          .comanda-vazia.compacta .comanda-vazia-check {
            width: 3.6mm;
            height: 3.6mm;
          }

          .comanda-vazia.compacta .comanda-vazia-nome {
            font-size: 2.9mm;
          }

          .comanda-vazia.micro .comanda-vazia-conteudo {
            padding: 1.6mm 2mm;
            gap: 0.75mm;
          }

          .comanda-vazia.micro .comanda-vazia-topo {
            gap: 1.5mm;
          }

          .comanda-vazia.micro .comanda-vazia-titulo {
            font-size: 6.8mm;
            letter-spacing: 0.7mm;
          }

          .comanda-vazia.micro .comanda-vazia-campos {
            gap: 0.8mm;
          }

          .comanda-vazia.micro .comanda-vazia-label {
            font-size: 3.45mm;
          }

          .comanda-vazia.micro .comanda-vazia-linha {
            height: 2.9mm;
          }

          .comanda-vazia.micro .comanda-vazia-colunas {
            gap: 1.2mm;
          }

          .comanda-vazia.micro .comanda-vazia-coluna-titulo {
            min-height: 4.5mm;
            font-size: 2.55mm;
            letter-spacing: 0.18mm;
          }

          .comanda-vazia.micro .comanda-vazia-lista {
            padding: 0.55mm 0.4mm 0;
          }

          .comanda-vazia.micro .comanda-vazia-item {
            min-height: 0;
            grid-template-columns: 3.2mm minmax(0, 1fr);
            gap: 0.9mm;
          }

          .comanda-vazia.micro .comanda-vazia-check {
            width: 2.9mm;
            height: 2.9mm;
            border-width: 0.28mm;
          }

          .comanda-vazia.micro .comanda-vazia-nome {
            font-size: 2.35mm;
          }

          @media print {
            .comanda-vazia-conteudo {
              width: 101mm !important;
              height: 66mm !important;
              margin: 0 auto !important;
              overflow: hidden !important;
              border-color: var(--preto-termico) !important;
              background: var(--branco) !important;
              box-shadow: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-area">
          <article class="comanda comanda-vazia ${densidade}">
            <div class="comanda-vazia-conteudo">
              <header class="comanda-vazia-topo">
                <div class="comanda-vazia-titulo">COMANDA</div>
              </header>

              <section class="comanda-vazia-campos">
                <div class="comanda-vazia-campo">
                  <span class="comanda-vazia-label">Nome:</span>
                  <span class="comanda-vazia-linha"></span>
                </div>
                <div class="comanda-vazia-campo">
                  <span class="comanda-vazia-label">Endere&ccedil;o:</span>
                  <span class="comanda-vazia-linha"></span>
                </div>
              </section>

              <section class="comanda-vazia-colunas">
                <div class="comanda-vazia-coluna">
                  <div class="comanda-vazia-coluna-titulo">PROTE&Iacute;NAS</div>
                  <div class="comanda-vazia-lista">
                    ${gerarItensComandaVazia(proteinas)}
                  </div>
                </div>
                <div class="comanda-vazia-divisor"></div>
                <div class="comanda-vazia-coluna">
                  <div class="comanda-vazia-coluna-titulo">COMPLEMENTOS</div>
                  <div class="comanda-vazia-lista">
                    ${gerarItensComandaVazia(complementos)}
                  </div>
                </div>
              </section>
            </div>
          </article>
        </div>
      </body>
    </html>
  `;
};

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
    const ordenarPorNome = (lista) =>
      [...lista].sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
    const itensAtivos = itens.filter((item) => item.ativo);
    const proteinasAtivas = ordenarPorNome(itensAtivos.filter((item) => item.tipo === 'PROTEINA'));
    const complementosAtivos = ordenarPorNome(itensAtivos.filter((item) => item.tipo === 'COMPLEMENTO'));

    if (!proteinasAtivas.length && !complementosAtivos.length) {
      alert('Nenhum item ativo no cardapio para imprimir na comanda.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Nao foi possivel abrir a impressao. Verifique o bloqueador de pop-up do navegador.');
      return;
    }

    printWindow.document.write(gerarHtmlComandaVazia(proteinasAtivas, complementosAtivos));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (carregando) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const proteinas = itens.filter(i => i.tipo === 'PROTEINA');
  const complementos = itens.filter(i => i.tipo === 'COMPLEMENTO');

  return (
    <div id="gerenciar-cardapio">
      {/* ADICIONAR ITEM */}
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

      {/* MODAL DE EDIÇÃO */}
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

      {/* LISTA DE ITENS */}
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
                      <button className="table-action-btn table-action-edit" onClick={() => setEditando({...item})}>
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
                      <button className="table-action-btn table-action-edit" onClick={() => setEditando({...item})}>
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
