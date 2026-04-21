import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FiMapPin,
  FiUser,
  FiPhone,
  FiCreditCard,
  FiMinus,
  FiPlus,
  FiSend,
  FiZap,
  FiDollarSign,
  FiCheckCircle,
  FiArrowLeft,
  FiArrowRight
} from 'react-icons/fi';
import Navbar from '../components/Navbar';
import CheckboxVerde from '../components/CheckboxVerde';
import WhatsAppButton from '../components/WhatsAppButton';
import { cardapioAPI, pedidoAvulsoAPI, marmitaAPI } from '../services/api';
import '../styles/pedido.css';

function extrairMensagemCheckout(search = '') {
  const params = new URLSearchParams(search);
  const status = params.get('status');

  if (status === 'success') {
    return { tipo: 'success', texto: 'Pagamento concluido no Mercado Pago. Aguarde a confirmacao no sistema.' };
  }
  if (status === 'pending') {
    return { tipo: 'success', texto: 'Pagamento em analise. Atualizaremos automaticamente.' };
  }
  if (status === 'failure') {
    return { tipo: 'error', texto: 'Pagamento nao concluido. Tente novamente.' };
  }

  return null;
}

function extrairSelecaoMarmita(locationObj, listaMarmitas = []) {
  const params = new URLSearchParams(locationObj.search || '');

  const tamanhoQuery = String(params.get('tamanho') || '').toUpperCase();
  const tituloQuery = String(params.get('titulo') || '');
  const valorQuery = Number(params.get('valor') || 0);

  const tamanhoState = String(locationObj.state?.tamanho || '').toUpperCase();
  const tituloState = String(locationObj.state?.titulo || '');
  const valorState = Number(locationObj.state?.valorUnitario || 0);

  const tamanho = tamanhoState || tamanhoQuery;
  if (!tamanho) return { tamanho: '', titulo: '', valorUnitario: 0 };

  const marmitaDoTamanho = listaMarmitas.find((m) => String(m.tamanho || '').toUpperCase() === tamanho);
  const tituloPadrao = tamanho === 'GRANDE' ? 'Marmita Grande' : tamanho === 'PEQUENA' ? 'Marmita Pequena' : '';
  const valorPadrao = tamanho === 'GRANDE' ? 24.9 : tamanho === 'PEQUENA' ? 19.9 : 0;
  const titulo = tituloState || tituloQuery || marmitaDoTamanho?.titulo || tituloPadrao;
  const valorUnitario =
    valorState > 0
      ? valorState
      : valorQuery > 0
        ? valorQuery
        : Number(marmitaDoTamanho?.preco || valorPadrao);

  return { tamanho, titulo, valorUnitario };
}

export default function PedidoAvulso() {
  const location = useLocation();

  const [cardapio, setCardapio] = useState([]);
  const [marmitas, setMarmitas] = useState([]);
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [quantidade, setQuantidade] = useState(1);
  const [marmitaSelecionada, setMarmitaSelecionada] = useState(() => extrairSelecaoMarmita(location));
  const [formaPagamento, setFormaPagamento] = useState('');
  const [dados, setDados] = useState({ nomeCliente: '', telefone: '', endereco: '', observacao: '' });
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState(() => extrairMensagemCheckout(location.search));
  const [etapaAtual, setEtapaAtual] = useState(1);

  useEffect(() => {
    Promise.allSettled([
      cardapioAPI.listarAtivos(),
      marmitaAPI.listarAtivos()
    ]).then(([cardapioRes, marmitasRes]) => {
      if (cardapioRes.status === 'fulfilled') setCardapio(cardapioRes.value.data);
      if (marmitasRes.status === 'fulfilled') {
        const listaMarmitas = marmitasRes.value.data || [];
        setMarmitas(listaMarmitas);
        setMarmitaSelecionada((atual) => {
          if (!atual.tamanho) return atual;
          return extrairSelecaoMarmita(location, listaMarmitas);
        });
      }
    }).catch(() => {});
  }, [location]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('status')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location.search]);

  useEffect(() => {
    document.getElementById('checkout-avulso')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [etapaAtual]);

  const toggleItem = (item) => {
    if (!marmitaSelecionada.tamanho) {
      setMensagem({ tipo: 'error', texto: 'Escolha primeiro o tamanho da marmita (Grande ou Pequena).' });
      return;
    }

    const jaSelecionado = !!itensSelecionados.find(i => i.id === item.id);
    const selecionando = !jaSelecionado;
    const totalProteinasSelecionadas = itensSelecionados.filter(i => i.tipo === 'PROTEINA').length;
    const limiteProteinas = marmitaSelecionada.tamanho === 'GRANDE'
      ? 2
      : marmitaSelecionada.tamanho === 'PEQUENA'
        ? 1
        : null;

    if (item.tipo === 'PROTEINA' && selecionando && limiteProteinas !== null && totalProteinasSelecionadas >= limiteProteinas) {
      setMensagem({
        tipo: 'error',
        texto: `${marmitaSelecionada.titulo || 'Esta marmita'} permite ${limiteProteinas} proteina(s).`
      });
      return;
    }

    setItensSelecionados(prev =>
      prev.find(i => i.id === item.id)
        ? prev.filter(i => i.id !== item.id)
        : [...prev, item]
    );
  };

  const handleSubmit = async () => {
    if (!validarEtapa(1)) {
      setEtapaAtual(1);
      return;
    }
    if (!validarEtapa(2)) {
      setEtapaAtual(2);
      return;
    }
    if (!validarEtapa(3)) {
      setEtapaAtual(3);
      return;
    }

    setEnviando(true);
    try {
      const { data } = await pedidoAvulsoAPI.criar({
        ...dados,
        itens: itensSelecionados.map(i => ({ id: i.id, nome: i.nome, tipo: i.tipo })),
        quantidade,
        formaPagamento,
        valorUnitario: marmitaSelecionada.valorUnitario > 0 ? marmitaSelecionada.valorUnitario : undefined
      });

      if (data.requiresPayment && data.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
        setMensagem({
          tipo: 'success',
          texto: 'Pedido criado. Finalize o pagamento na nova aba do Mercado Pago.'
        });
      } else {
        setMensagem({
          tipo: 'success',
          texto: 'Pedido enviado! Tenha o valor em maos para o entregador.'
        });
      }

      setItensSelecionados([]);
      setQuantidade(1);
      setFormaPagamento('');
      setDados({ nomeCliente: '', telefone: '', endereco: '', observacao: '' });
      setEtapaAtual(1);
    } catch (err) {
      setMensagem({ tipo: 'error', texto: err.response?.data?.erro || 'Erro ao enviar pedido' });
    }
    setEnviando(false);
  };

  const proteinas = cardapio.filter(i => i.tipo === 'PROTEINA');
  const complementos = cardapio.filter(i => i.tipo === 'COMPLEMENTO');
  const opcoesMarmita = [
    {
      tamanho: 'GRANDE',
      titulo: marmitas.find((m) => String(m.tamanho || '').toUpperCase() === 'GRANDE')?.titulo || 'Marmita Grande',
      valorUnitario: Number(marmitas.find((m) => String(m.tamanho || '').toUpperCase() === 'GRANDE')?.preco || 24.9),
      proteinas: 2,
      proteinasTexto: 'Ate 2 proteina(s)'
    },
    {
      tamanho: 'PEQUENA',
      titulo: marmitas.find((m) => String(m.tamanho || '').toUpperCase() === 'PEQUENA')?.titulo || 'Marmita Pequena',
      valorUnitario: Number(marmitas.find((m) => String(m.tamanho || '').toUpperCase() === 'PEQUENA')?.preco || 19.9),
      proteinas: 1,
      proteinasTexto: '1 proteina'
    }
  ];
  const opcoesPagamento = [
    {
      valor: 'PIX',
      sigla: 'PIX',
      label: 'Pix',
      descricao: 'Aprovacao instantanea',
      Icone: FiZap,
      classe: 'pag-pix'
    },
    {
      valor: 'CREDITO',
      sigla: 'CR',
      label: 'Cartao de Credito',
      descricao: 'Pagamento online seguro',
      Icone: FiCreditCard,
      classe: 'pag-credito'
    },
    {
      valor: 'DEBITO',
      sigla: 'DB',
      label: 'Cartao de Debito',
      descricao: 'Pagamento online rapido',
      Icone: FiCreditCard,
      classe: 'pag-debito'
    },
    {
      valor: 'DINHEIRO',
      sigla: 'DIN',
      label: 'Dinheiro',
      descricao: 'Pagamento na entrega',
      Icone: FiDollarSign,
      classe: 'pag-dinheiro'
    }
  ];
  const totalProteinasSelecionadas = itensSelecionados.filter(i => i.tipo === 'PROTEINA').length;
  const limiteProteinas = marmitaSelecionada.tamanho === 'GRANDE'
    ? 2
    : marmitaSelecionada.tamanho === 'PEQUENA'
      ? 1
      : null;
  const valorTotal = marmitaSelecionada.valorUnitario > 0 ? Number((marmitaSelecionada.valorUnitario * quantidade).toFixed(2)) : 0;
  const formatarMoeda = (valor) => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const etapaItensValida =
    !!marmitaSelecionada.tamanho &&
    itensSelecionados.length > 0 &&
    (marmitaSelecionada.tamanho !== 'PEQUENA' || totalProteinasSelecionadas === 1) &&
    (marmitaSelecionada.tamanho !== 'GRANDE' || totalProteinasSelecionadas <= 2);
  const dadosEntregaValidos = !!dados.nomeCliente.trim() && !!dados.telefone.trim() && !!dados.endereco.trim();
  const pagamentoValido = !!formaPagamento;
  const etapaAtualCompleta =
    etapaAtual === 1 ? etapaItensValida : etapaAtual === 2 ? dadosEntregaValidos : pagamentoValido;
  const etapasCheckout = [
    { numero: 1, titulo: 'Marmita' },
    { numero: 2, titulo: 'Entrega' },
    { numero: 3, titulo: 'Pagamento' }
  ];

  const selecionarMarmita = (opcao) => {
    setMarmitaSelecionada({
      tamanho: opcao.tamanho,
      titulo: opcao.titulo,
      valorUnitario: opcao.valorUnitario
    });
    setItensSelecionados([]);
    setMensagem(null);
  };

  function validarEtapa(etapa, mostrarErro = true) {
    if (etapa === 1) {
      if (!marmitaSelecionada.tamanho) {
        if (mostrarErro) setMensagem({ tipo: 'error', texto: 'Selecione Marmita Grande ou Pequena.' });
        return false;
      }
      if (!itensSelecionados.length) {
        if (mostrarErro) setMensagem({ tipo: 'error', texto: 'Selecione pelo menos um item.' });
        return false;
      }
      if (marmitaSelecionada.tamanho === 'PEQUENA' && totalProteinasSelecionadas !== 1) {
        if (mostrarErro) {
          setMensagem({
            tipo: 'error',
            texto: `${marmitaSelecionada.titulo || 'Esta marmita'} exige 1 proteina.`
          });
        }
        return false;
      }
      if (marmitaSelecionada.tamanho === 'GRANDE' && totalProteinasSelecionadas > 2) {
        if (mostrarErro) {
          setMensagem({
            tipo: 'error',
            texto: `${marmitaSelecionada.titulo || 'Esta marmita'} permite ate 2 proteinas.`
          });
        }
        return false;
      }
      return true;
    }

    if (etapa === 2) {
      if (!dadosEntregaValidos) {
        if (mostrarErro) setMensagem({ tipo: 'error', texto: 'Preencha nome, telefone e endereco.' });
        return false;
      }
      return true;
    }

    if (etapa === 3) {
      if (!formaPagamento) {
        if (mostrarErro) setMensagem({ tipo: 'error', texto: 'Selecione a forma de pagamento.' });
        return false;
      }
      return true;
    }

    return true;
  }

  const avancarEtapa = () => {
    if (!validarEtapa(etapaAtual)) return;
    setMensagem(null);
    setEtapaAtual((atual) => Math.min(3, atual + 1));
  };

  const voltarEtapa = () => {
    setMensagem(null);
    setEtapaAtual((atual) => Math.max(1, atual - 1));
  };

  return (
    <>
      <Navbar />
      {mensagem && (
        <div className={`toast toast-${mensagem.tipo}`} onAnimationEnd={() => setTimeout(() => setMensagem(null), 100)}>
          {mensagem.texto}
        </div>
      )}

      <div className="pedido-page" id="checkout-avulso">
        <div className="container">
          <h1>Fazer Pedido</h1>
          <p className="subtitulo">Selecione os itens desejados e finalize seu pedido</p>

          <div className="checkout-steps" aria-label="Etapas do checkout">
            {etapasCheckout.map((etapa) => {
              const ativa = etapaAtual === etapa.numero;
              const completa = etapaAtual > etapa.numero;

              return (
                <button
                  type="button"
                  key={etapa.numero}
                  className={`checkout-step ${ativa ? 'ativa' : ''} ${completa ? 'completa' : ''}`}
                  onClick={() => {
                    if (etapa.numero < etapaAtual) setEtapaAtual(etapa.numero);
                  }}
                  disabled={etapa.numero > etapaAtual}
                  aria-current={ativa ? 'step' : undefined}
                >
                  <span className="checkout-step-number">
                    {completa ? <FiCheckCircle size={16} /> : etapa.numero}
                  </span>
                  <span className="checkout-step-text">{etapa.titulo}</span>
                </button>
              );
            })}
          </div>

          <div className="pedido-layout checkout-layout">
            <div className="pedido-form">
              {etapaAtual === 1 && (
                <>
                  <div className="pedido-section" id="secao-marmita">
                    <h3><span className="icon">MC</span> Escolha o Tamanho da Marmita</h3>
                    <div className="marmita-opcoes">
                      {opcoesMarmita.map((opcao) => {
                        const selecionada = marmitaSelecionada.tamanho === opcao.tamanho;
                        return (
                          <button
                            type="button"
                            key={opcao.tamanho}
                            className={`marmita-opcao-card ${selecionada ? 'selecionada' : ''}`}
                            onClick={() => selecionarMarmita(opcao)}
                            id={`marmita-${opcao.tamanho.toLowerCase()}`}
                          >
                            <div className="marmita-opcao-topo">
                              <span className="marmita-opcao-tag">{opcao.tamanho}</span>
                              {selecionada && <FiCheckCircle size={18} />}
                            </div>
                            <strong>{opcao.titulo}</strong>
                            <span>{opcao.proteinasTexto}</span>
                            <span className="marmita-opcao-preco">{formatarMoeda(opcao.valorUnitario)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className={`pedido-section ${!marmitaSelecionada.tamanho ? 'pedido-section-bloqueada' : ''}`} id="secao-itens">
                    <h3><span className="icon">IT</span> Escolha seus itens</h3>
                    {!marmitaSelecionada.tamanho && (
                      <p className="hint-bloqueio">Selecione primeiro a marmita para liberar os itens.</p>
                    )}
                    {limiteProteinas !== null && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--verde-escuro)', marginBottom: '10px', fontWeight: '700' }}>
                        Regra: {marmitaSelecionada.tamanho === 'GRANDE' ? 'Quentinha Grande = ate 2 proteinas' : 'Quentinha Pequena = 1 proteina'} ({totalProteinasSelecionadas}/{limiteProteinas})
                      </p>
                    )}

                    {proteinas.length > 0 && (
                      <>
                        <p style={{ fontSize: '0.85rem', color: 'var(--cinza-500)', marginBottom: '10px', fontWeight: '600' }}>PROTEINAS</p>
                        <div className="itens-grid">
                          {proteinas.map(item => (
                            <CheckboxVerde
                              key={item.id}
                              id={`item-${item.id}`}
                              label={item.nome}
                              selecionado={!!itensSelecionados.find(i => i.id === item.id)}
                              onChange={() => toggleItem(item)}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    {complementos.length > 0 && (
                      <>
                        <p style={{ fontSize: '0.85rem', color: 'var(--cinza-500)', margin: '20px 0 10px', fontWeight: '600' }}>COMPLEMENTOS</p>
                        <div className="itens-grid">
                          {complementos.map(item => (
                            <CheckboxVerde
                              key={item.id}
                              id={`item-${item.id}`}
                              label={item.nome}
                              selecionado={!!itensSelecionados.find(i => i.id === item.id)}
                              onChange={() => toggleItem(item)}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {etapaAtual === 2 && (
                <div className="pedido-section" id="secao-dados">
                  <h3><span className="icon"><FiMapPin /></span> Dados de Entrega</h3>
                  <div className="dados-grid">
                    <div className="form-group">
                      <label className="form-label"><FiUser size={14} /> Nome</label>
                      <input
                        className="form-input"
                        placeholder="Seu nome completo"
                        value={dados.nomeCliente}
                        onChange={e => setDados({ ...dados, nomeCliente: e.target.value })}
                        id="input-nome"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label"><FiPhone size={14} /> Telefone</label>
                      <input
                        className="form-input"
                        placeholder="(00) 00000-0000"
                        value={dados.telefone}
                        onChange={e => setDados({ ...dados, telefone: e.target.value })}
                        id="input-telefone"
                      />
                    </div>
                    <div className="form-group full">
                      <label className="form-label"><FiMapPin size={14} /> Endereco</label>
                      <input
                        className="form-input"
                        placeholder="Rua, numero, bairro"
                        value={dados.endereco}
                        onChange={e => setDados({ ...dados, endereco: e.target.value })}
                        id="input-endereco"
                      />
                    </div>
                    <div className="form-group full">
                      <label className="form-label">Observacao (opcional)</label>
                      <input
                        className="form-input"
                        placeholder="Ex: sem cebola, ponto da carne..."
                        value={dados.observacao}
                        onChange={e => setDados({ ...dados, observacao: e.target.value })}
                        id="input-observacao"
                      />
                    </div>
                  </div>
                </div>
              )}

              {etapaAtual === 3 && (
                <div className="pedido-section" id="secao-pagamento">
                  <h3><span className="icon"><FiCreditCard /></span> Forma de Pagamento</h3>
                  <div className="pagamento-opcoes">
                    {opcoesPagamento.map(opcao => {
                      const selecionada = formaPagamento === opcao.valor;

                      return (
                      <div
                        key={opcao.valor}
                        className={`pagamento-opcao ${opcao.classe} ${selecionada ? 'selecionada' : ''}`}
                        onClick={() => setFormaPagamento(opcao.valor)}
                        role="button"
                        tabIndex={0}
                        aria-pressed={selecionada}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setFormaPagamento(opcao.valor);
                          }
                        }}
                        id={`pagamento-${opcao.valor.toLowerCase()}`}
                      >
                        <div className="pag-topo">
                          <span className="pag-icon"><opcao.Icone size={18} /></span>
                          <span className="pag-sigla">{opcao.sigla}</span>
                          {selecionada && (
                            <span className="pag-check">
                              <FiCheckCircle size={16} />
                            </span>
                          )}
                        </div>
                        <div className="pag-textos">
                          <span className="pag-label">{opcao.label}</span>
                          <span className="pag-desc">{opcao.descricao}</span>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                  <p className="pagamento-hint">
                    Pix, credito e debito abrem o checkout do Mercado Pago.
                  </p>
                </div>
              )}
            </div>

            <div className={`pedido-resumo checkout-resumo ${etapaAtual === 3 ? 'checkout-resumo-final' : ''}`}>
              <div className="resumo-card" id="resumo-pedido">
                <h3>Resumo do Pedido</h3>

                {marmitaSelecionada.valorUnitario > 0 && (
                  <div style={{ marginBottom: '14px', padding: '10px', borderRadius: '8px', background: 'var(--verde-bg)', border: '1px solid var(--verde-light)' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--cinza-700)', fontWeight: 600 }}>
                      {marmitaSelecionada.titulo || 'Marmita Selecionada'}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--verde-escuro)' }}>
                      Valor unitario: {formatarMoeda(marmitaSelecionada.valorUnitario)}
                    </div>
                  </div>
                )}

                {itensSelecionados.length > 0 ? (
                  <div className="resumo-itens">
                    {itensSelecionados.map(item => (
                      <div key={item.id} className="resumo-item">
                        <span className="dot"></span>
                        {item.nome}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="resumo-vazio">Nenhum item selecionado</div>
                )}

                <div className="resumo-total">
                  <span>Quantidade:</span>
                  <div className="quantidade-control">
                    <button
                      className="quantidade-btn"
                      onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                      id="btn-menos"
                    >
                      <FiMinus />
                    </button>
                    <span className="quantidade-valor">{quantidade}</span>
                    <button
                      className="quantidade-btn"
                      onClick={() => setQuantidade(quantidade + 1)}
                      id="btn-mais"
                    >
                      <FiPlus />
                    </button>
                  </div>
                </div>

                {marmitaSelecionada.valorUnitario > 0 && (
                  <div className="resumo-total">
                    <span>Total:</span>
                    <strong style={{ color: 'var(--verde-escuro)' }}>{formatarMoeda(valorTotal)}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="checkout-actions">
            {etapaAtual > 1 ? (
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={voltarEtapa}
                id="btn-checkout-voltar"
              >
                <FiArrowLeft size={18} /> Voltar
              </button>
            ) : (
              <span className="checkout-actions-spacer" aria-hidden="true"></span>
            )}

            {etapaAtual < 3 ? (
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={avancarEtapa}
                disabled={!etapaAtualCompleta}
                id="btn-checkout-continuar"
              >
                Continuar <FiArrowRight size={18} />
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={handleSubmit}
                disabled={enviando || !etapaAtualCompleta}
                id="btn-enviar-pedido"
              >
                {enviando ? (
                  <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></span>
                ) : (
                  <>
                    <FiSend size={18} /> Enviar Pedido
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <WhatsAppButton />
    </>
  );
}
