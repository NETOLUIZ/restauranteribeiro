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
  FiCheckCircle
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
    const totalProteinasSelecionadas = itensSelecionados.filter(i => i.tipo === 'PROTEINA').length;

    if (!marmitaSelecionada.tamanho) return setMensagem({ tipo: 'error', texto: 'Selecione Marmita Grande ou Pequena.' });
    if (!itensSelecionados.length) return setMensagem({ tipo: 'error', texto: 'Selecione pelo menos um item' });
    if (!dados.nomeCliente || !dados.telefone || !dados.endereco) return setMensagem({ tipo: 'error', texto: 'Preencha todos os campos obrigatorios' });
    if (!formaPagamento) return setMensagem({ tipo: 'error', texto: 'Selecione a forma de pagamento' });
    if (marmitaSelecionada.tamanho === 'PEQUENA' && totalProteinasSelecionadas !== 1) {
      return setMensagem({
        tipo: 'error',
        texto: `${marmitaSelecionada.titulo || 'Esta marmita'} exige 1 proteina.`
      });
    }

    if (marmitaSelecionada.tamanho === 'GRANDE' && totalProteinasSelecionadas > 2) {
      return setMensagem({
        tipo: 'error',
        texto: `${marmitaSelecionada.titulo || 'Esta marmita'} permite ate 2 proteinas.`
      });
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
  const selecionarMarmita = (opcao) => {
    setMarmitaSelecionada({
      tamanho: opcao.tamanho,
      titulo: opcao.titulo,
      valorUnitario: opcao.valorUnitario
    });
    setItensSelecionados([]);
    setMensagem(null);
  };

  return (
    <>
      <Navbar />
      {mensagem && (
        <div className={`toast toast-${mensagem.tipo}`} onAnimationEnd={() => setTimeout(() => setMensagem(null), 100)}>
          {mensagem.texto}
        </div>
      )}

      <div className="pedido-page">
        <div className="container">
          <h1>Fazer Pedido</h1>
          <p className="subtitulo">Selecione os itens desejados e finalize seu pedido</p>

          <div className="pedido-layout">
            <div className="pedido-form">
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
            </div>

            <div className="pedido-resumo">
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

                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleSubmit}
                  disabled={enviando || !itensSelecionados.length || !marmitaSelecionada.tamanho}
                  id="btn-enviar-pedido"
                  style={{ width: '100%' }}
                >
                  {enviando ? (
                    <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></span>
                  ) : (
                    <>
                      <FiSend size={18} /> Enviar Pedido
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <WhatsAppButton />
    </>
  );
}
