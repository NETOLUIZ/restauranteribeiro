import {
  formatarDataHora,
  formatarMoeda,
  formatarWhatsApp,
  obterOpcaoSelfService
} from '../utils/selfService';

export default function SelfServiceReceipt({ reserva, className = '' }) {
  const comprovante = reserva?.comprovante || null;
  const opcao = obterOpcaoSelfService(reserva?.tipoPrato);

  if (!comprovante) {
    return null;
  }

  return (
    <article className={`self-service-ticket ${className}`.trim()}>
      <div className="self-service-ticket-header">
        <span>Comprovante de retirada</span>
        <strong>{comprovante.codigoRetirada}</strong>
      </div>

      <div className="self-service-ticket-grid">
        <div>
          <span className="self-service-ticket-label">Nome</span>
          <strong>{comprovante.nomeCliente}</strong>
        </div>
        <div>
          <span className="self-service-ticket-label">WhatsApp</span>
          <strong>{formatarWhatsApp(comprovante.whatsapp)}</strong>
        </div>
        <div>
          <span className="self-service-ticket-label">Prato</span>
          <strong>{comprovante.pratoEscolhido || opcao?.titulo || '-'}</strong>
        </div>
        <div>
          <span className="self-service-ticket-label">Data e hora</span>
          <strong>{formatarDataHora(comprovante.dataHora)}</strong>
        </div>
      </div>

      <div className="self-service-ticket-values">
        <div>
          <span>Valor do prato</span>
          <strong>{formatarMoeda(comprovante.valorPrato)}</strong>
        </div>
        <div>
          <span>Taxa de servico</span>
          <strong>{formatarMoeda(comprovante.taxaServico)}</strong>
        </div>
        <div className="is-total">
          <span>Total pago</span>
          <strong>{formatarMoeda(comprovante.totalPago)}</strong>
        </div>
      </div>
    </article>
  );
}
