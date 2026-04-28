import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FiCheckCircle,
  FiClipboard,
  FiClock,
  FiCopy,
  FiRefreshCw,
  FiShoppingBag,
  FiSmartphone
} from 'react-icons/fi';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import WhatsAppButton from '../components/WhatsAppButton';
import SelfServiceReceipt from '../components/SelfServiceReceipt';
import { selfServiceAPI } from '../services/api';
import {
  SELF_SERVICE_OPTIONS,
  SELF_SERVICE_TAXA,
  calcularTotalSelfService,
  formatarMoeda,
  normalizarNome,
  normalizarWhatsApp,
  formatarWhatsApp,
  obterClasseStatusSelfService,
  obterOpcaoSelfService,
  obterTextoStatusSelfService
} from '../utils/selfService';
import '../styles/selfService.css';

function obterTipoPratoInicial(search = '') {
  const params = new URLSearchParams(search);
  const tipoPrato = String(params.get('tipo') || '').trim().toUpperCase();
  return obterOpcaoSelfService(tipoPrato)?.tipoPrato || SELF_SERVICE_OPTIONS[0].tipoPrato;
}

export default function SelfService() {
  const location = useLocation();
  const [tipoPrato, setTipoPrato] = useState(() => obterTipoPratoInicial(location.search));
  const [nomeCliente, setNomeCliente] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [pixPagamento, setPixPagamento] = useState(null);
  const [reserva, setReserva] = useState(null);

  useEffect(() => {
    setTipoPrato(obterTipoPratoInicial(location.search));
  }, [location.search]);

  useEffect(() => {
    if (!reserva?.id || !['AGUARDANDO_PAGAMENTO', 'PAGO'].includes(reserva.status)) {
      return undefined;
    }

    if (reserva.status === 'PAGO' || reserva.status === 'RETIRADO') {
      return undefined;
    }

    const consultarStatus = async () => {
      try {
        const { data } = await selfServiceAPI.statusPagamento(reserva.id);
        setReserva(data);

        if (data.status === 'PAGO' || data.status === 'RETIRADO') {
          setFeedback({
            tipo: 'success',
            texto: 'Pagamento aprovado! Apresente este comprovante no restaurante.'
          });
        } else if (data.status === 'CANCELADO') {
          setFeedback({
            tipo: 'error',
            texto: 'Pagamento cancelado. Gere uma nova reserva para continuar.'
          });
        }
      } catch {
        // Mantem a tela em aguardando pagamento enquanto a consulta falhar temporariamente.
      }
    };

    const intervalo = window.setInterval(consultarStatus, 5000);
    consultarStatus();

    return () => window.clearInterval(intervalo);
  }, [reserva?.id, reserva?.status]);

  const opcaoSelecionada = useMemo(
    () => obterOpcaoSelfService(tipoPrato) || SELF_SERVICE_OPTIONS[0],
    [tipoPrato]
  );

  const valorPrato = opcaoSelecionada?.valorPrato || 0;
  const totalPagar = calcularTotalSelfService(valorPrato, SELF_SERVICE_TAXA);
  const podeEnviar = !!normalizarNome(nomeCliente) && normalizarWhatsApp(whatsapp).length >= 10 && !enviando && !pixPagamento;
  const statusAtual = reserva?.status || 'AGUARDANDO_PAGAMENTO';

  const copiarTexto = async (texto, mensagemSucesso) => {
    if (!texto) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(texto);
      } else {
        const campo = document.createElement('textarea');
        campo.value = texto;
        campo.setAttribute('readonly', '');
        campo.style.position = 'fixed';
        campo.style.opacity = '0';
        document.body.appendChild(campo);
        campo.select();
        document.execCommand('copy');
        document.body.removeChild(campo);
      }

      setFeedback({ tipo: 'success', texto: mensagemSucesso });
    } catch {
      setFeedback({ tipo: 'error', texto: 'Nao foi possivel copiar o conteudo.' });
    }
  };

  const criarReserva = async () => {
    if (!normalizarNome(nomeCliente) || normalizarWhatsApp(whatsapp).length < 10) {
      setFeedback({
        tipo: 'error',
        texto: 'Informe nome e WhatsApp validos para continuar.'
      });
      return;
    }

    setEnviando(true);
    setFeedback(null);

    try {
      const { data } = await selfServiceAPI.criar({
        nomeCliente: normalizarNome(nomeCliente),
        whatsapp: normalizarWhatsApp(whatsapp),
        tipoPrato
      });

      setReserva(data);
      setPixPagamento({
        pagamentoId: data.pagamentoId,
        qrCode: data.qrCode,
        qrCodeBase64: data.qrCodeBase64,
        copiaecola: data.copiaecola
      });
      setFeedback({
        tipo: 'warning',
        texto: 'Aguardando pagamento. Finalize o Pix para liberar o comprovante.'
      });
    } catch (err) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.erro || 'Nao foi possivel iniciar o pagamento do self-service.'
      });
    } finally {
      setEnviando(false);
    }
  };

  const novaReserva = () => {
    setNomeCliente('');
    setWhatsapp('');
    setPixPagamento(null);
    setReserva(null);
    setFeedback(null);
    setTipoPrato(SELF_SERVICE_OPTIONS[0].tipoPrato);
  };

  return (
    <>
      <Navbar />

      <main className="self-service-page" id="self-service-page">
        <div className="container self-service-container">
          <section className="self-service-hero">
            <div>
              <span className="self-service-badge">
                <FiClipboard size={14} /> Retirada no balcao
              </span>
              <h1>Self-service Ribeiro</h1>
              <p>
                Escolha o prato, informe nome e WhatsApp, pague via Pix e apresente o comprovante no restaurante.
              </p>
            </div>

            <div className="self-service-hero-summary">
              <span>Total a pagar</span>
              <strong>{formatarMoeda(totalPagar)}</strong>
              <small>Prato + taxa fixa de servico</small>
            </div>
          </section>

          {feedback && (
            <div className={`self-service-feedback ${feedback.tipo}`}>
              {feedback.texto}
            </div>
          )}

          <div className="self-service-layout">
            <section className="self-service-card">
              <div className="self-service-card-header">
                <h2><FiShoppingBag size={18} /> Escolha seu prato</h2>
                <span>Fluxo rapido e sem montagem</span>
              </div>

              <div className="self-service-options">
                {SELF_SERVICE_OPTIONS.map((opcao) => {
                  const selecionada = tipoPrato === opcao.tipoPrato;

                  return (
                    <button
                      key={opcao.tipoPrato}
                      type="button"
                      className={`self-service-option ${selecionada ? 'is-selected' : ''}`}
                      onClick={() => setTipoPrato(opcao.tipoPrato)}
                      disabled={!!pixPagamento}
                      id={`self-service-option-${opcao.tipoPrato.toLowerCase()}`}
                    >
                      <span>{opcao.titulo}</span>
                      <strong>{formatarMoeda(opcao.valorPrato)}</strong>
                    </button>
                  );
                })}
              </div>

              <div className="self-service-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="self-service-nome">Nome do cliente</label>
                  <input
                    id="self-service-nome"
                    className="form-input"
                    value={nomeCliente}
                    onChange={(event) => setNomeCliente(event.target.value)}
                    placeholder="Digite seu nome"
                    disabled={!!pixPagamento}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="self-service-whatsapp">WhatsApp</label>
                  <input
                    id="self-service-whatsapp"
                    className="form-input"
                    value={formatarWhatsApp(whatsapp)}
                    onChange={(event) => setWhatsapp(normalizarWhatsApp(event.target.value))}
                    placeholder="(00) 00000-0000"
                    inputMode="numeric"
                    disabled={!!pixPagamento}
                  />
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary self-service-submit"
                onClick={criarReserva}
                disabled={!podeEnviar}
                id="btn-self-service-gerar-pix"
              >
                {enviando ? <FiRefreshCw className="spin" size={16} /> : <FiSmartphone size={16} />}
                {enviando ? 'Gerando Pix...' : 'Gerar Pix do self-service'}
              </button>
            </section>

            <aside className="self-service-card self-service-summary-card">
              <div className="self-service-card-header">
                <h2>Resumo</h2>
                <span>Pagamento via Pix</span>
              </div>

              <div className="self-service-summary-row">
                <span>Prato escolhido</span>
                <strong>{opcaoSelecionada.titulo}</strong>
              </div>
              <div className="self-service-summary-row">
                <span>Valor do prato</span>
                <strong>{formatarMoeda(valorPrato)}</strong>
              </div>
              <div className="self-service-summary-row">
                <span>Taxa de servico</span>
                <strong>{formatarMoeda(SELF_SERVICE_TAXA)}</strong>
              </div>
              <div className="self-service-summary-row is-total">
                <span>Total a pagar</span>
                <strong>{formatarMoeda(totalPagar)}</strong>
              </div>

              {pixPagamento && (
                <div className="self-service-payment-box" aria-live="polite">
                  <div className={`self-service-status status-${obterClasseStatusSelfService(statusAtual)}`}>
                    {statusAtual === 'PAGO' || statusAtual === 'RETIRADO' ? <FiCheckCircle size={16} /> : <FiClock size={16} />}
                    <span>{obterTextoStatusSelfService(statusAtual)}</span>
                  </div>

                  {(statusAtual === 'AGUARDANDO_PAGAMENTO' || statusAtual === 'PAGO' || statusAtual === 'RETIRADO') && pixPagamento.qrCodeBase64 && (
                    <img
                      className="self-service-qr"
                      src={`data:image/png;base64,${pixPagamento.qrCodeBase64}`}
                      alt="QR Code Pix do self-service"
                    />
                  )}

                  {statusAtual === 'AGUARDANDO_PAGAMENTO' && (
                    <>
                      <textarea
                        className="self-service-pix-code"
                        value={pixPagamento.copiaecola || ''}
                        readOnly
                        rows={4}
                      />

                      <div className="self-service-inline-actions">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => copiarTexto(pixPagamento.copiaecola, 'Codigo Pix copiado.')}
                        >
                          <FiCopy size={16} /> Copiar Pix
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={novaReserva}
                        >
                          Nova reserva
                        </button>
                      </div>
                    </>
                  )}

                  {(statusAtual === 'PAGO' || statusAtual === 'RETIRADO') && reserva?.comprovante && (
                    <div className="self-service-approved-box">
                      <strong>Pagamento aprovado!</strong>
                      <p>Apresente este comprovante no restaurante.</p>
                    </div>
                  )}

                  {statusAtual === 'CANCELADO' && (
                    <div className="self-service-inline-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={novaReserva}
                      >
                        Nova reserva
                      </button>
                    </div>
                  )}
                </div>
              )}
            </aside>
          </div>

          {reserva?.comprovante && (
            <section className="self-service-card self-service-ticket-section">
              <div className="self-service-card-header">
                <h2>Comprovante liberado</h2>
                <span>Valido somente para pagamento aprovado</span>
              </div>

              <SelfServiceReceipt reserva={reserva} />

              <div className="self-service-inline-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => copiarTexto(reserva.comprovante?.codigoRetirada, 'Codigo de retirada copiado.')}
                >
                  <FiCopy size={16} /> Copiar codigo
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={novaReserva}
                >
                  Nova reserva
                </button>
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
      <WhatsAppButton />
    </>
  );
}
