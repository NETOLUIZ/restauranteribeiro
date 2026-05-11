import { useState, useEffect, useRef, useCallback } from 'react';
import { FiPrinter, FiCheck, FiFilter, FiTrash2 } from 'react-icons/fi';
import { pedidoAvulsoAPI } from '../../services/api';
import {
  COMANDA_PRINT_CSS,
  NOME_EMPRESA_COMANDA,
  SITE_RESTAURANTE,
  TELEFONE_RESTAURANTE,
  escapeHtml,
  formatarTelefoneComanda,
  imprimirHtml
} from '../../utils/comandaPrint';

function formatarTamanhoMarmita(tamanhoMarmita) {
  if (tamanhoMarmita === 'GRANDE') return 'G';
  if (tamanhoMarmita === 'PEQUENA') return 'P';
  return '-';
}

function deveImprimirAutomaticamente(pedido) {
  if (!pedido || pedido.impresso || pedido.statusPagamento === 'CANCELADO') return false;
  if (pedido.formaPagamento === 'DINHEIRO') return true;
  return pedido.formaPagamento === 'PIX' && pedido.statusPagamento === 'CONFIRMADO';
}

const COMANDA_AVULSO_PRINT_CSS = `
  .comanda-topo-linha {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2mm;
    padding: 0.2mm 0.6mm 0;
  }

  .pedido-numero-topo {
    font-size: 3.9mm;
    font-weight: 900;
    line-height: 1;
  }

  .pedido-tamanho-topo {
    font-size: 5.2mm;
    font-weight: 900;
    line-height: 1;
    letter-spacing: 0.15mm;
    text-transform: uppercase;
  }
`;

function limparCepEndereco(endereco = '') {
  const texto = String(endereco || '').trim();

  return texto
    .replace(/\s*,?\s*CEP[:\s-]*\d{5}-?\d{3}\s*$/i, '')
    .replace(/\s*,?\s*\d{5}-?\d{3}\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*,\s*$/, '')
    .trim();
}

function gerarHtmlComanda(pedido) {
  const telefoneComanda = formatarTelefoneComanda(TELEFONE_RESTAURANTE);
  const itensHtml = Array.isArray(pedido.itens) && pedido.itens.length
    ? pedido.itens.map((item) => `<li>${escapeHtml(item?.nome || '-')}</li>`).join('')
    : '<li>-</li>';
  const tamanhoMarmita = formatarTamanhoMarmita(pedido.tamanhoMarmita);
  const enderecoSemCep = limparCepEndereco(pedido.endereco || '-');

  return `
    <html>
      <head>
        <title>Comanda Pedido #${pedido.id}</title>
        <style>
          ${COMANDA_PRINT_CSS}
          ${COMANDA_AVULSO_PRINT_CSS}
        </style>
      </head>
      <body>
        <div class="print-area">
          <article class="comanda">
            <div class="comanda-conteudo">
              <div class="comanda-topo-linha">
                <div class="pedido-numero-topo">#${escapeHtml(pedido.id)}</div>
                <div class="pedido-tamanho-topo">TAM: ${escapeHtml(tamanhoMarmita)}</div>
              </div>

              <header class="comanda-topo">
                <div class="marca-destaque">${escapeHtml(NOME_EMPRESA_COMANDA)}</div>
                <div class="fone-destaque">WhatsApp: ${escapeHtml(telefoneComanda)}</div>
                <div class="site-destaque">Delivery: ${escapeHtml(SITE_RESTAURANTE)}</div>
                <hr class="linha-divisoria" />
              </header>

              <section class="identificacao-card">
                <div class="ident-linha">
                  <span class="ident-label">&#128100; NOME</span>
                  <div class="ident-valor ident-nome">${escapeHtml(pedido.nomeCliente || 'SEM NOME')}</div>
                </div>
                <div class="ident-linha">
                  <span class="ident-label">&#128205; ENDERECO</span>
                  <div class="ident-valor ident-endereco">${escapeHtml(enderecoSemCep || '-')}</div>
                </div>
              </section>

              <section class="itens-bloco">
                <div class="itens-faixa">ITENS:</div>
                <ul class="itens-lista">${itensHtml}</ul>
              </section>

              <section class="info-extra">
                <p><strong>Pagamento:</strong> ${escapeHtml(pedido.formaPagamento || '-')}</p>
                <p><strong>Quantidade:</strong> ${escapeHtml(pedido.quantidade || '-')}</p>
                <p><strong>Telefone:</strong> ${escapeHtml(pedido.telefone || '-')}</p>
                ${pedido.observacao ? `<p class="info-obs"><strong>Obs:</strong> ${escapeHtml(pedido.observacao)}</p>` : ''}
              </section>

              <footer class="comanda-rodape">
                <hr class="linha-divisoria" />
                <div class="data-hora">${escapeHtml(new Date(pedido.createdAt).toLocaleString('pt-BR'))}</div>
              </footer>
            </div>
          </article>
        </div>
      </body>
    </html>
  `;
}

export default function PedidosAvulsos() {
  const [pedidos, setPedidos] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroDiaSemana, setFiltroDiaSemana] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const imprimindoRef = useRef(new Set());
  const carregandoPedidosRef = useRef(false);
  const componenteMontadoRef = useRef(false);

  useEffect(() => {
    componenteMontadoRef.current = true;

    return () => {
      componenteMontadoRef.current = false;
    };
  }, []);

  const marcarImpressoLocal = useCallback((id) => {
    setPedidos((anterior) => anterior.map((pedido) =>
      pedido.id === id ? { ...pedido, impresso: true } : pedido
    ));
  }, []);

  const imprimirComanda = useCallback(async (pedido, reimpressao = false) => {
    if (imprimindoRef.current.has(pedido.id)) return;

    imprimindoRef.current.add(pedido.id);
    try {
      imprimirHtml(gerarHtmlComanda(pedido));

      if (!reimpressao) {
        await pedidoAvulsoAPI.imprimir(pedido.id);
        marcarImpressoLocal(pedido.id);
      }
    } catch (err) {
      console.error('Erro ao imprimir comanda:', err);
      alert('Nao foi possivel iniciar a impressao. Tente novamente.');
    } finally {
      imprimindoRef.current.delete(pedido.id);
    }
  }, [marcarImpressoLocal]);

  const carregar = useCallback(async (silencioso = false) => {
    if (carregandoPedidosRef.current) return;

    carregandoPedidosRef.current = true;
    if (!silencioso && componenteMontadoRef.current) {
      setCarregando(true);
    }

    try {
      const params = {};
      if (filtroStatus) params.status = filtroStatus;
      const { data } = await pedidoAvulsoAPI.listar(params);

      if (!componenteMontadoRef.current) return;

      setPedidos(data);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      if (!silencioso && componenteMontadoRef.current) {
        setCarregando(false);
      }
      carregandoPedidosRef.current = false;
    }
  }, [filtroStatus]);

  useEffect(() => {
    carregar();
    const intervalo = window.setInterval(() => {
      carregar(true);
    }, 5000);

    return () => {
      window.clearInterval(intervalo);
    };
  }, [carregar]);

  useEffect(() => {
    pedidos
      .filter((pedido) => deveImprimirAutomaticamente(pedido))
      .forEach((pedido) => {
        void imprimirComanda(pedido);
      });
  }, [pedidos, imprimirComanda]);

  const confirmarPagamentoDinheiro = async (id) => {
    try {
      await pedidoAvulsoAPI.atualizarStatus(id, { statusPagamento: 'CONFIRMADO' });
      carregar();
    } catch (err) {
      console.error('Erro:', err);
    }
  };

  const excluirPedido = async (id) => {
    const confirmar = window.confirm(`Excluir o pedido #${id}? Essa acao nao pode ser desfeita.`);
    if (!confirmar) return;

    try {
      await pedidoAvulsoAPI.deletar(id);
      setPedidos((anterior) => anterior.filter((pedido) => pedido.id !== id));
    } catch (err) {
      console.error('Erro ao excluir pedido avulso:', err);
      alert(err.response?.data?.erro || 'Nao foi possivel excluir o pedido.');
    }
  };

  const opcoesDiaSemana = [
    { sigla: 'SEG', dia: 1 },
    { sigla: 'TER', dia: 2 },
    { sigla: 'QUA', dia: 3 },
    { sigla: 'QUI', dia: 4 },
    { sigla: 'SEX', dia: 5 }
  ];

  const pedidosFiltrados = pedidos.filter((pedido) => {
    if (filtroDiaSemana === null) return true;
    return new Date(pedido.createdAt).getDay() === filtroDiaSemana;
  });

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {opcoesDiaSemana.map((opcao) => (
            <button
              key={opcao.sigla}
              type="button"
              className={`btn btn-sm ${filtroDiaSemana === opcao.dia ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFiltroDiaSemana(opcao.dia)}
              id={`filtro-dia-avulso-${opcao.sigla.toLowerCase()}`}
            >
              {opcao.sigla}
            </button>
          ))}
          <button
            type="button"
            className={`btn btn-sm ${filtroDiaSemana === null ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFiltroDiaSemana(null)}
            id="filtro-dia-avulso-todos"
          >
            Todos
          </button>
        </div>
      </div>

      <p style={{ color: 'var(--cinza-600)', marginBottom: '16px' }}>
        Impressao automatica: dinheiro imprime assim que chega; Pix imprime apos confirmacao. Reimpressao continua disponivel.
      </p>

      <div className="pedido-avulso-legenda" aria-label="Legenda de status visual dos pedidos avulsos">
        <span className="pedido-avulso-legenda-item">
          <span className="pedido-avulso-legenda-ponto novo" aria-hidden="true"></span>
          Novo
        </span>
        <span className="pedido-avulso-legenda-item">
          <span className="pedido-avulso-legenda-ponto processado" aria-hidden="true"></span>
          Processado (Impresso/Autorizado)
        </span>
        <span className="pedido-avulso-legenda-item">
          <span className="pedido-avulso-legenda-ponto cancelado" aria-hidden="true"></span>
          Cancelado
        </span>
      </div>

      {pedidosFiltrados.map(pedido => {
        const pedidoConfirmado = pedido.statusPagamento === 'CONFIRMADO';
        const pedidoProcessado = pedido.impresso || (pedido.formaPagamento === 'DINHEIRO' && pedidoConfirmado);
        const classeVisualCard =
          pedido.statusPagamento === 'CANCELADO'
            ? 'avulso-cancelado'
            : pedidoProcessado
              ? 'avulso-processado'
              : 'avulso-novo';
        const podeImprimirManual =
          (pedido.formaPagamento === 'DINHEIRO' && pedido.statusPagamento !== 'CANCELADO') || pedidoConfirmado;

        return (
        <div key={pedido.id} className={`pedido-admin-card ${pedido.statusPagamento.toLowerCase()} ${classeVisualCard}`} id={`pedido-avulso-${pedido.id}`}>
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
            <p><strong>Marmita:</strong> {formatarTamanhoMarmita(pedido.tamanhoMarmita)}</p>
            <p><strong>Quantidade:</strong> {pedido.quantidade}</p>
            <p><strong>Itens:</strong> {Array.isArray(pedido.itens) ? pedido.itens.map(i => i.nome).join(', ') : '-'}</p>
            {pedido.observacao && <p><strong>Observacao:</strong> {pedido.observacao}</p>}
            {pedido.motoqueiro && <p><strong>Motoqueiro:</strong> {pedido.motoqueiro}</p>}
            {pedido.valorTroco != null && <p><strong>Troco para:</strong> R$ {pedido.valorTroco?.toFixed(2)}</p>}
          </div>

          <div className="pedido-admin-card-actions">
            {pedido.statusPagamento === 'PENDENTE' && pedido.formaPagamento === 'DINHEIRO' && (
              <button className="btn btn-sm btn-primary" onClick={() => confirmarPagamentoDinheiro(pedido.id)}>
                <FiCheck size={14} /> Autorizar Pagamento
              </button>
            )}

            {pedido.statusPagamento === 'PENDENTE' && pedido.formaPagamento !== 'DINHEIRO' && (
              <span className="badge badge-warning">Aguardando Mercado Pago</span>
            )}

            {podeImprimirManual && !pedido.impresso && (
              <button className="btn btn-sm btn-secondary" onClick={() => imprimirComanda(pedido)}>
                <FiPrinter size={14} /> Imprimir Comanda
              </button>
            )}

            {podeImprimirManual && (
              <>
                {pedido.impresso && (
                  <span className="badge badge-success">Impresso</span>
                )}
                {!pedido.impresso && (
                  <span className="badge badge-warning">Aguardando impressao automatica</span>
                )}
                {pedido.impresso && (
                  <button className="btn btn-sm btn-warning" onClick={() => imprimirComanda(pedido, true)}>
                    <FiPrinter size={14} /> Reimprimir Comanda
                  </button>
                )}
              </>
            )}

            <button className="btn btn-sm btn-danger" onClick={() => excluirPedido(pedido.id)}>
              <FiTrash2 size={14} /> Excluir Pedido
            </button>
          </div>
        </div>
        );
      })}

      {pedidosFiltrados.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--cinza-400)' }}>
          <FiFilter size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
          <p>Nenhum pedido encontrado</p>
        </div>
      )}
    </div>
  );
}



