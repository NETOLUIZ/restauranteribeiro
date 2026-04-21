import { useState, useEffect } from 'react';
import { FiPrinter, FiCheck, FiFilter, FiSearch } from 'react-icons/fi';
import { pedidoEmpresaAPI } from '../../services/api';
import logoComanda from '../../assets/logo-comanda.png';
import { COMANDA_PRINT_CSS, TELEFONE_RESTAURANTE, escapeHtml } from '../../utils/comandaPrint';

const LOGO_MARKUP = `<img class="logo-img" src="${logoComanda}" alt="Logo Restaurante Ribeiro" />`;

const gerarHtmlComandas = (comandas) => {
  const cards = comandas.map((comanda) => {
    const itensHtml = Array.isArray(comanda.itens) && comanda.itens.length
      ? comanda.itens.map((item) => `<li>${escapeHtml(item?.nome || '-')}</li>`).join('')
      : '<li>-</li>';

    return `
      <section class="pagina-impressao">
        <article class="comanda-impressao">
          <header class="comanda-topo">
            ${LOGO_MARKUP}
            <div class="fone-destaque">${TELEFONE_RESTAURANTE}</div>
            <hr class="linha-divisoria" />
          </header>

          <section class="pedido-faixa">
            <span class="pedido-titulo">PEDIDO:</span>
            <strong class="pedido-numero">${comanda.numero}/${comandas.length}</strong>
          </section>

          <section class="identificacao-card">
            <div class="ident-linha">
              <span class="ident-label">&#127970; EMPRESA</span>
              <div class="ident-valor ident-empresa">${escapeHtml(comanda.empresa || 'SEM EMPRESA')}</div>
            </div>
            <div class="ident-linha">
              <span class="ident-label">&#128100; NOME</span>
              <div class="ident-valor ident-nome">${escapeHtml(comanda.nome || 'SEM NOME')}</div>
            </div>
            <div class="ident-linha">
              <span class="ident-label">&#128205; ENDERECO</span>
              <div class="ident-valor ident-endereco">${escapeHtml(comanda.endereco || '-')}</div>
            </div>
          </section>

          <section class="itens-bloco">
            <div class="itens-faixa">ITENS:</div>
            <ul class="itens-lista">
              ${itensHtml}
            </ul>
          </section>

          <footer class="comanda-rodape">
            <hr class="linha-divisoria" />
            <div class="data-hora">${escapeHtml(new Date().toLocaleString('pt-BR'))}</div>
          </footer>
        </article>
      </section>
    `;
  }).join('');

  return `
    <html>
      <head>
        <title>Comandas</title>
        <style>
          ${COMANDA_PRINT_CSS}
        </style>
      </head>
      <body>
        <div class="print-area">
          ${cards}
        </div>
      </body>
    </html>
  `;
};

export default function PedidosEmpresas() {
  const [pedidos, setPedidos] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    try {
      const params = {};
      if (filtroStatus) params.status = filtroStatus;
      const { data } = await pedidoEmpresaAPI.listarTodos(params);
      setPedidos(data);
    } catch (err) { console.error('Erro:', err); }
    setCarregando(false);
  }

  useEffect(() => {
    let ativo = true;
    const params = {};

    if (filtroStatus) params.status = filtroStatus;

    pedidoEmpresaAPI.listarTodos(params)
      .then(({ data }) => {
        if (!ativo) return;
        setPedidos(data);
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
  }, [filtroStatus]);

  const autorizar = async (id) => {
    try {
      await pedidoEmpresaAPI.autorizar(id);
      carregar();
    } catch (err) { console.error('Erro:', err); }
  };

  const imprimir = async (pedido) => {
    try {
      await pedidoEmpresaAPI.imprimir(pedido.id);
      carregar();

      const comandas = [];
      pedido.lotes.forEach((lote) => {
        for (let i = 0; i < lote.quantidade; i++) {
          comandas.push({
            empresa: pedido.empresa.nome,
            itens: lote.itens,
            endereco: lote.endereco,
            nome: lote.nomes?.[i] || null,
            numero: comandas.length + 1
          });
        }
      });

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Bloqueador de pop-up ativo');
      }

      printWindow.document.write(gerarHtmlComandas(comandas));
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } catch (err) {
      console.error('Erro:', err);
    }
  };

  if (carregando) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const termoEmpresa = filtroEmpresa.trim().toLowerCase();
  const pedidosFiltrados = pedidos.filter((pedido) => {
    if (!termoEmpresa) return true;
    const nomeEmpresa = (pedido.empresa?.nome || '').toLowerCase();
    const siglaEmpresa = (pedido.empresa?.sigla || '').toLowerCase();
    return nomeEmpresa.includes(termoEmpresa) || siglaEmpresa.includes(termoEmpresa);
  });

  return (
    <div id="pedidos-empresas-admin">
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <select className="form-select" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ maxWidth: '200px' }} id="filtro-status-empresa">
          <option value="">Todos os status</option>
          <option value="ENVIADO">Enviado</option>
          <option value="AUTORIZADO">Autorizado</option>
          <option value="IMPRESSO">Impresso</option>
        </select>
        <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
          <FiSearch
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--cinza-500)'
            }}
          />
          <input
            className="form-input"
            type="text"
            placeholder="Pesquisar empresa (nome/sigla)"
            value={filtroEmpresa}
            onChange={(e) => setFiltroEmpresa(e.target.value)}
            id="filtro-busca-empresa"
            style={{ paddingLeft: '36px' }}
          />
        </div>
      </div>

      {pedidosFiltrados.map(pedido => {
        const totalMarmitas = pedido.lotes.reduce((s, l) => s + l.quantidade, 0);

        return (
          <div key={pedido.id} className={`pedido-admin-card ${pedido.status.toLowerCase()}`} id={`pedido-empresa-${pedido.id}`}>
            <div className="pedido-admin-card-header">
              <div>
                <strong style={{ fontSize: '1rem' }}>Pedido #{pedido.id} - {pedido.empresa?.nome}</strong>
                <span style={{ marginLeft: '12px', fontSize: '0.85rem', color: 'var(--cinza-500)' }}>
                  {new Date(pedido.createdAt).toLocaleString('pt-BR')}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className={`badge badge-${pedido.status === 'IMPRESSO' ? 'success' : pedido.status === 'AUTORIZADO' ? 'info' : 'warning'}`}>
                  {pedido.status}
                </span>
                <span className="badge badge-info">{totalMarmitas} refeicoes</span>
              </div>
            </div>

            <div className="pedido-admin-card-body">
              {pedido.lotes.map((lote, i) => (
                <div key={lote.id} style={{ padding: '10px', margin: '8px 0', background: 'var(--cinza-50)', borderRadius: '8px' }}>
                  <p><strong>Lote {i + 1}:</strong> {lote.quantidade}x para {lote.endereco}</p>
                  <p style={{ fontSize: '0.85rem' }}><strong>Itens:</strong> {Array.isArray(lote.itens) ? lote.itens.map(it => it.nome).join(', ') : '-'}</p>
                  {lote.nomes && Array.isArray(lote.nomes) && lote.nomes.length > 0 && (
                    <p style={{ fontSize: '0.85rem' }}><strong>Nomes:</strong> {lote.nomes.join(', ')}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="pedido-admin-card-actions">
              {pedido.status === 'ENVIADO' && (
                <button className="btn btn-sm btn-primary" onClick={() => autorizar(pedido.id)}>
                  <FiCheck size={14} /> Autorizar
                </button>
              )}
              {pedido.status === 'AUTORIZADO' && (
                <button className="btn btn-sm btn-secondary" onClick={() => imprimir(pedido)}>
                  <FiPrinter size={14} /> Imprimir Comandas ({totalMarmitas}x)
                </button>
              )}
              {pedido.status === 'IMPRESSO' && (
                <span className="badge badge-success">Impresso</span>
              )}
            </div>
          </div>
        );
      })}

      {pedidosFiltrados.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--cinza-400)' }}>
          <FiFilter size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
          <p>Nenhum pedido de empresa encontrado para esse filtro</p>
        </div>
      )}
    </div>
  );
}



