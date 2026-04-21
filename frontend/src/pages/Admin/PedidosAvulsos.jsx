import { useState, useEffect, useRef, useCallback } from 'react';
import { FiPrinter, FiCheck, FiFilter } from 'react-icons/fi';
import { pedidoAvulsoAPI } from '../../services/api';
import logoComanda from '../../assets/logo-comanda.png';
import { COMANDA_PRINT_CSS, TELEFONE_RESTAURANTE, escapeHtml } from '../../utils/comandaPrint';

const LOGO_MARKUP = `<img class="logo-img" src="${logoComanda}" alt="Logo Restaurante Ribeiro" />`;

function gerarHtmlComanda(pedido) {
  const itensHtml = Array.isArray(pedido.itens) && pedido.itens.length
    ? pedido.itens.map((item) => `<li>${escapeHtml(item?.nome || '-')}</li>`).join('')
    : '<li>-</li>';

  return `
    <html>
      <head>
        <title>Comanda Pedido #${pedido.id}</title>
        <style>
          ${COMANDA_PRINT_CSS}
        </style>
      </head>
      <body>
        <div class="print-area">
          <section class="pagina-impressao">
            <article class="comanda-impressao">
              <header class="comanda-topo">
                ${LOGO_MARKUP}
                <div class="fone-destaque">${TELEFONE_RESTAURANTE}</div>
                <hr class="linha-divisoria" />
              </header>

              <section class="pedido-faixa">
                <span class="pedido-titulo">PEDIDO:</span>
                <strong class="pedido-numero">#${escapeHtml(pedido.id)}</strong>
              </section>

              <section class="identificacao-card">
                <div class="ident-linha">
                  <span class="ident-label">&#127970; EMPRESA</span>
                  <div class="ident-valor ident-empresa">PEDIDO AVULSO</div>
                </div>
                <div class="ident-linha">
                  <span class="ident-label">&#128100; NOME</span>
                  <div class="ident-valor ident-nome">${escapeHtml(pedido.nomeCliente || 'SEM NOME')}</div>
                </div>
                <div class="ident-linha">
                  <span class="ident-label">&#128205; ENDERECO</span>
                  <div class="ident-valor ident-endereco">${escapeHtml(pedido.endereco || '-')}</div>
                </div>
              </section>

              <section class="itens-bloco">
                <div class="itens-faixa">ITENS:</div>
                <ul class="itens-lista">${itensHtml}</ul>
              </section>

              <section class="info-extra">
                <p><strong>Pagamento:</strong> ${escapeHtml(pedido.formaPagamento || '-')}</p>
                <p><strong>Qtd:</strong> ${escapeHtml(pedido.quantidade || '-')}</p>
                <p><strong>Telefone:</strong> ${escapeHtml(pedido.telefone || '-')}</p>
                ${pedido.observacao ? `<p class="info-obs"><strong>Obs:</strong> ${escapeHtml(pedido.observacao)}</p>` : ''}
              </section>

              <footer class="comanda-rodape">
                <hr class="linha-divisoria" />
                <div class="data-hora">${escapeHtml(new Date(pedido.createdAt).toLocaleString('pt-BR'))}</div>
              </footer>
            </article>
          </section>
        </div>
      </body>
    </html>
  `;
}

export default function PedidosAvulsos() {
  const [pedidos, setPedidos] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [carregando, setCarregando] = useState(true);
  const imprimindoRef = useRef(new Set());

  const marcarImpressoLocal = useCallback((id) => {
    setPedidos((anterior) => anterior.map((pedido) =>
      pedido.id === id ? { ...pedido, impresso: true } : pedido
    ));
  }, []);

  const imprimirComanda = useCallback(async (pedido, automatico = false, reimpressao = false) => {
    if (imprimindoRef.current.has(pedido.id)) return;

    imprimindoRef.current.add(pedido.id);
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Bloqueador de pop-up ativo');
      }

      printWindow.document.write(gerarHtmlComanda(pedido));
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();

      if (!reimpressao) {
        await pedidoAvulsoAPI.imprimir(pedido.id);
        marcarImpressoLocal(pedido.id);
      }
    } catch (err) {
      console.error('Erro ao imprimir comanda:', err);
      if (!automatico) {
        alert('Nao foi possivel imprimir. Verifique o bloqueador de pop-up do navegador.');
      }
    } finally {
      imprimindoRef.current.delete(pedido.id);
    }
  }, [marcarImpressoLocal]);

  const autoImprimirPendentesOnline = useCallback(async (lista) => {
    const pendentesOnline = lista.filter(
      (pedido) =>
        pedido.statusPagamento === 'CONFIRMADO' &&
        !pedido.impresso &&
        pedido.formaPagamento !== 'DINHEIRO'
    );

    for (const pedido of pendentesOnline) {
      await imprimirComanda(pedido, true);
    }
  }, [imprimirComanda]);

  async function carregar() {
    setCarregando(true);
    try {
      const params = {};
      if (filtroStatus) params.status = filtroStatus;
      const { data } = await pedidoAvulsoAPI.listar(params);
      setPedidos(data);
      await autoImprimirPendentesOnline(data);
    } catch (err) {
      console.error('Erro:', err);
    }
    setCarregando(false);
  }

  useEffect(() => {
    let ativo = true;
    const params = {};

    if (filtroStatus) params.status = filtroStatus;

    pedidoAvulsoAPI.listar(params)
      .then(async ({ data }) => {
        if (!ativo) return;
        setPedidos(data);
        await autoImprimirPendentesOnline(data);
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
  }, [filtroStatus, autoImprimirPendentesOnline]);

  const confirmarPagamentoDinheiro = async (id) => {
    try {
      await pedidoAvulsoAPI.atualizarStatus(id, { statusPagamento: 'CONFIRMADO' });
      carregar();
    } catch (err) {
      console.error('Erro:', err);
    }
  };

  if (carregando) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div id="pedidos-avulsos-admin">
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <select className="form-select" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ maxWidth: '200px' }} id="filtro-status-avulso">
          <option value="">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="CONFIRMADO">Confirmado</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </div>

      {pedidos.map(pedido => (
        <div key={pedido.id} className={`pedido-admin-card ${pedido.statusPagamento.toLowerCase()}`} id={`pedido-avulso-${pedido.id}`}>
          <div className="pedido-admin-card-header">
            <div>
              <strong style={{ fontSize: '1rem' }}>Pedido #{pedido.id}</strong>
              <span style={{ marginLeft: '12px', fontSize: '0.85rem', color: 'var(--cinza-500)' }}>
                {new Date(pedido.createdAt).toLocaleString('pt-BR')}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className={`badge badge-${pedido.statusPagamento === 'CONFIRMADO' ? 'success' : pedido.statusPagamento === 'PENDENTE' ? 'warning' : 'danger'}`}>
                {pedido.statusPagamento}
              </span>
              <span className="badge badge-info">{pedido.formaPagamento}</span>
            </div>
          </div>

          <div className="pedido-admin-card-body">
            <p><strong>Cliente:</strong> {pedido.nomeCliente}</p>
            <p><strong>Telefone:</strong> {pedido.telefone}</p>
            <p><strong>Endereco:</strong> {pedido.endereco}</p>
            <p><strong>Quantidade:</strong> {pedido.quantidade}</p>
            <p><strong>Itens:</strong> {Array.isArray(pedido.itens) ? pedido.itens.map(i => i.nome).join(', ') : '-'}</p>
            {pedido.observacao && <p><strong>Observacao:</strong> {pedido.observacao}</p>}
            {pedido.motoqueiro && <p><strong>Motoqueiro:</strong> {pedido.motoqueiro}</p>}
            {pedido.valorTroco != null && <p><strong>Troco:</strong> R$ {pedido.valorTroco?.toFixed(2)}</p>}
          </div>

          <div className="pedido-admin-card-actions">
            {pedido.statusPagamento === 'PENDENTE' && pedido.formaPagamento === 'DINHEIRO' && (
              <button className="btn btn-sm btn-primary" onClick={() => confirmarPagamentoDinheiro(pedido.id)}>
                <FiCheck size={14} /> Confirmar Pagamento
              </button>
            )}

            {pedido.statusPagamento === 'PENDENTE' && pedido.formaPagamento !== 'DINHEIRO' && (
              <span className="badge badge-warning">Aguardando Mercado Pago</span>
            )}

            {pedido.statusPagamento === 'CONFIRMADO' && !pedido.impresso && (
              <button className="btn btn-sm btn-secondary" onClick={() => imprimirComanda(pedido)}>
                <FiPrinter size={14} /> Imprimir Comanda
              </button>
            )}

            {pedido.impresso && (
              <>
                <span className="badge badge-success">Impresso</span>
                <button className="btn btn-sm btn-warning" onClick={() => imprimirComanda(pedido, false, true)}>
                  <FiPrinter size={14} /> Reimprimir Comanda
                </button>
              </>
            )}
          </div>
        </div>
      ))}

      {pedidos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--cinza-400)' }}>
          <FiFilter size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
          <p>Nenhum pedido encontrado</p>
        </div>
      )}
    </div>
  );
}



