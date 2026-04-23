import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FiMapPin,
  FiUser,
  FiPhone,
  FiMinus,
  FiPlus,
  FiSend,
  FiZap,
  FiDollarSign,
  FiCheckCircle,
  FiCopy,
  FiClock,
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

function criarDadosEntregaVazios() {
  return {
    nomeCliente: '',
    telefone: '',
    rua: '',
    numero: '',
    bairro: '',
    complemento: '',
    observacao: ''
  };
}

function normalizarCampo(valor = '') {
  return String(valor).trim().replace(/\s+/g, ' ');
}

function montarEnderecoEntrega(dados) {
  const rua = normalizarCampo(dados.rua);
  const numero = normalizarCampo(dados.numero);
  const bairro = normalizarCampo(dados.bairro);
  const complemento = normalizarCampo(dados.complemento);

  return `${rua}, ${numero} - ${bairro}${complemento ? ` - Compl.: ${complemento}` : ''}`;
}

export default function PedidoAvulso() {
  const location = useLocation();

  const [cardapio, setCardapio] = useState([]);
  const [marmitas, setMarmitas] = useState([]);
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [quantidade, setQuantidade] = useState(1);
  const [marmitaSelecionada, setMarmitaSelecionada] = useState(() => extrairSelecaoMarmita(location));
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [dados, setDados] = useState(() => criarDadosEntregaVazios());
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState(() => extrairMensagemCheckout(location.search));
  const [etapaAtual, setEtapaAtual] = useState(1);
  const [pixPagamento, setPixPagamento] = useState(null);
  const [pedidoDinheiro, setPedidoDinheiro] = useState(null);

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

  useEffect(() => {
    if (!pixPagamento?.pedidoId || pixPagamento.statusPedido === 'CONFIRMADO' || pixPagamento.statusPedido === 'CANCELADO') {
      return undefined;
    }

    const consultarStatus = async () => {
      try {
        const { data } = await pedidoAvulsoAPI.statusPagamento(pixPagamento.pedidoId);
        setPixPagamento((atual) => {
          if (!atual || atual.pedidoId !== pixPagamento.pedidoId) return atual;
          return { ...atual, statusPedido: data.statusPagamento };
        });

        if (data.statusPagamento === 'CONFIRMADO') {
          setMensagem({ tipo: 'success', texto: 'Pagamento confirmado. Pedido enviado com sucesso!' });
        } else if (data.statusPagamento === 'CANCELADO') {
          setMensagem({ tipo: 'error', texto: 'Pagamento cancelado. Gere um novo pedido se necessario.' });
        }
      } catch {
        // Mantem a tela em aguardando pagamento se a consulta temporaria falhar.
      }
    };

    const intervalo = window.setInterval(consultarStatus, 6000);
    consultarStatus();

    return () => window.clearInterval(intervalo);
  }, [pixPagamento?.pedidoId, pixPagamento?.statusPedido]);

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
    if (pixPagamento) {
      setMensagem({ tipo: 'success', texto: 'Pix ja gerado. Aguarde a confirmacao do pagamento.' });
      return;
    }

    if (pedidoDinheiro) {
      setMensagem({ tipo: 'success', texto: 'Pedido em dinheiro ja enviado. Aguarde a confirmacao da entrega.' });
      return;
    }

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
      const enderecoEntrega = montarEnderecoEntrega(dados);
      const { data } = await pedidoAvulsoAPI.criar({
        nomeCliente: normalizarCampo(dados.nomeCliente),
        telefone: normalizarCampo(dados.telefone),
        endereco: enderecoEntrega,
        observacao: normalizarCampo(dados.observacao),
        itens: itensSelecionados.map(i => ({ id: i.id, nome: i.nome, tipo: i.tipo })),
        quantidade,
        formaPagamento,
        valorUnitario: marmitaSelecionada.valorUnitario > 0 ? marmitaSelecionada.valorUnitario : undefined
      });

      if (formaPagamento === 'PIX') {
        const pagamentoPix = data.pagamentoPix || {
          pagamentoId: data.pagamentoId,
          status: data.status,
          qrCode: data.qrCode,
          qrCodeBase64: data.qrCodeBase64,
          copiaecola: data.copiaecola,
          valor: data.valor,
          pedidoId: data.pedidoId || data.id
        };

        setPixPagamento({
          ...pagamentoPix,
          statusPedido: data.statusPagamento || 'PENDENTE'
        });
        setPedidoDinheiro(null);
        setMensagem({
          tipo: 'success',
          texto: 'Pedido enviado com sucesso! Aguardando pagamento via Pix.'
        });
      } else {
        setPedidoDinheiro({
          id: data.id || data.pedidoId,
          statusPagamento: data.statusPagamento || 'PENDENTE'
        });
        setPixPagamento(null);
        setMensagem({
          tipo: 'success',
          texto: 'Pedido enviado com sucesso! O pagamento em dinheiro ficara pendente para confirmacao.'
        });
      }
      setEtapaAtual(3);
    } catch (err) {
      setMensagem({ tipo: 'error', texto: err.response?.data?.erro || 'Erro ao enviar pedido' });
    }
    setEnviando(false);
  };

  const resetarPedido = () => {
    setItensSelecionados([]);
    setQuantidade(1);
    setFormaPagamento('PIX');
    setDados(criarDadosEntregaVazios());
    setPixPagamento(null);
    setPedidoDinheiro(null);
    setMensagem(null);
    setEtapaAtual(1);
  };

  const copiarCodigoPix = async () => {
    if (!pixPagamento?.copiaecola) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(pixPagamento.copiaecola);
      } else {
        const campo = document.createElement('textarea');
        campo.value = pixPagamento.copiaecola;
        campo.setAttribute('readonly', '');
        campo.style.position = 'fixed';
        campo.style.opacity = '0';
        document.body.appendChild(campo);
        campo.select();
        document.execCommand('copy');
        document.body.removeChild(campo);
      }
      setMensagem({ tipo: 'success', texto: 'Codigo Pix copiado.' });
    } catch {
      setMensagem({ tipo: 'error', texto: 'Nao foi possivel copiar o codigo Pix.' });
    }
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
      descricao: 'QR Code e copia e cola',
      Icone: FiZap,
      classe: 'pag-pix'
    },
    {
      valor: 'DINHEIRO',
      sigla: 'CASH',
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
  const dadosEntregaValidos =
    !!normalizarCampo(dados.nomeCliente) &&
    !!normalizarCampo(dados.telefone) &&
    !!normalizarCampo(dados.rua) &&
    !!normalizarCampo(dados.numero) &&
    !!normalizarCampo(dados.bairro);
  const pagamentoValido = ['PIX', 'DINHEIRO'].includes(formaPagamento);
  const etapaAtualCompleta =
    etapaAtual === 1 ? etapaItensValida : etapaAtual === 2 ? dadosEntregaValidos : pagamentoValido;
  const etapasCheckout = [
    { numero: 1, titulo: 'Marmita' },
    { numero: 2, titulo: 'Entrega' },
    { numero: 3, titulo: 'Pagamento' }
  ];
  const statusPedidoPix = pixPagamento?.statusPedido || (pixPagamento?.status === 'approved' ? 'CONFIRMADO' : 'PENDENTE');
  const statusPixTexto =
    statusPedidoPix === 'CONFIRMADO'
      ? 'Pagamento confirmado'
      : statusPedidoPix === 'CANCELADO'
        ? 'Pagamento cancelado'
        : 'Aguardando pagamento';

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
        if (mostrarErro) setMensagem({ tipo: 'error', texto: 'Preencha nome, telefone, rua, numero e bairro.' });
        return false;
      }
      return true;
    }

    if (etapa === 3) {
      if (!pagamentoValido) {
        if (mostrarErro) setMensagem({ tipo: 'error', texto: 'Selecione uma forma de pagamento.' });
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
                    if (!pixPagamento && etapa.numero < etapaAtual) setEtapaAtual(etapa.numero);
                  }}
                  disabled={!!pixPagamento || etapa.numero > etapaAtual}
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
                        required
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
                        required
                      />
                    </div>
                    <div className="form-group full">
                      <label className="form-label"><FiMapPin size={14} /> Rua</label>
                      <input
                        className="form-input"
                        placeholder="Nome da rua"
                        value={dados.rua}
                        onChange={e => setDados({ ...dados, rua: e.target.value })}
                        id="input-rua"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Numero</label>
                      <input
                        className="form-input"
                        placeholder="Ex: 123"
                        value={dados.numero}
                        onChange={e => setDados({ ...dados, numero: e.target.value })}
                        id="input-numero"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Bairro</label>
                      <input
                        className="form-input"
                        placeholder="Seu bairro"
                        value={dados.bairro}
                        onChange={e => setDados({ ...dados, bairro: e.target.value })}
                        id="input-bairro"
                        required
                      />
                    </div>
                    <div className="form-group full">
                      <label className="form-label">Complemento (opcional)</label>
                      <input
                        className="form-input"
                        placeholder="Apto, bloco, referencia..."
                        value={dados.complemento}
                        onChange={e => setDados({ ...dados, complemento: e.target.value })}
                        id="input-complemento"
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
                  <h3><span className="icon">{formaPagamento === 'DINHEIRO' ? <FiDollarSign /> : <FiZap />}</span> Forma de pagamento</h3>
                  <div className="pagamento-opcoes">
                    {opcoesPagamento.map(opcao => {
                      const selecionada = formaPagamento === opcao.valor;

                      return (
                      <div
                        key={opcao.valor}
                        className={`pagamento-opcao ${opcao.classe} ${selecionada ? 'selecionada' : ''}`}
                        onClick={() => {
                          if (!pixPagamento && !pedidoDinheiro) setFormaPagamento(opcao.valor);
                        }}
                        role="button"
                        tabIndex={0}
                        aria-pressed={selecionada}
                        aria-disabled={!!pixPagamento || !!pedidoDinheiro}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (!pixPagamento && !pedidoDinheiro) setFormaPagamento(opcao.valor);
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
                    {formaPagamento === 'PIX'
                      ? 'Ao enviar o pedido, o QR Code Pix aparece aqui para pagamento.'
                      : 'Ao enviar o pedido, ele ficara pendente para pagamento em dinheiro na entrega.'}
                  </p>

                  {pixPagamento && (
                    <div className="pix-pagamento-card" aria-live="polite">
                      <div className={`pix-status pix-status-${statusPedidoPix.toLowerCase()}`}>
                        {statusPedidoPix === 'CONFIRMADO' ? <FiCheckCircle size={18} /> : <FiClock size={18} />}
                        <span>{statusPixTexto}</span>
                      </div>

                      {pixPagamento.qrCodeBase64 && (
                        <img
                          className="pix-qrcode"
                          src={`data:image/png;base64,${pixPagamento.qrCodeBase64}`}
                          alt="QR Code Pix para pagamento"
                        />
                      )}

                      <div className="pix-copia">
                        <label htmlFor="pix-copia-codigo">Pix copia e cola</label>
                        <textarea
                          id="pix-copia-codigo"
                          value={pixPagamento.copiaecola || ''}
                          readOnly
                          rows={4}
                        />
                      </div>

                      <div className="pix-acoes">
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={copiarCodigoPix}
                          disabled={!pixPagamento.copiaecola}
                        >
                          <FiCopy size={16} /> Copiar codigo Pix
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={resetarPedido}
                        >
                          Novo pedido
                        </button>
                      </div>
                    </div>
                  )}

                  {pedidoDinheiro && (
                    <div className="pix-pagamento-card" aria-live="polite">
                      <div className="pix-status">
                        <FiDollarSign size={18} />
                        <span>Pagamento em dinheiro pendente</span>
                      </div>

                      <div className="pag-textos">
                        <span className="pag-label">Pedido #{pedidoDinheiro.id} enviado</span>
                        <span className="pag-desc">A equipe vai confirmar o recebimento do dinheiro na entrega.</span>
                      </div>

                      <div className="pix-acoes">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={resetarPedido}
                        >
                          Novo pedido
                        </button>
                      </div>
                    </div>
                  )}
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
            {etapaAtual > 1 && !pixPagamento && !pedidoDinheiro ? (
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
                disabled={enviando || !!pixPagamento || !!pedidoDinheiro || !etapaAtualCompleta}
                id="btn-enviar-pedido"
              >
                {enviando ? (
                  <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></span>
                ) : pixPagamento ? (
                  <>
                    <FiClock size={18} /> Pix gerado
                  </>
                ) : pedidoDinheiro ? (
                  <>
                    <FiCheckCircle size={18} /> Pedido enviado
                  </>
                ) : (
                  <>
                    <FiSend size={18} /> {formaPagamento === 'PIX' ? 'Gerar Pix' : 'Enviar pedido'}
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
