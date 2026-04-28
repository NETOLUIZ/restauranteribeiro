export const SELF_SERVICE_TAXA = 0.2;

export const SELF_SERVICE_OPTIONS = [
  {
    tipoPrato: 'SELF_SERVICE_18',
    titulo: 'Prato Self-service R$ 18,00',
    resumo: 'R$ 18,00',
    valorPrato: 18
  },
  {
    tipoPrato: 'SELF_SERVICE_15',
    titulo: 'Prato Self-service R$ 15,00',
    resumo: 'R$ 15,00',
    valorPrato: 15
  }
];

export function obterOpcaoSelfService(tipoPrato = '') {
  return SELF_SERVICE_OPTIONS.find((opcao) => opcao.tipoPrato === String(tipoPrato || '').trim().toUpperCase()) || null;
}

export function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

export function normalizarNome(valor = '') {
  return String(valor || '').trim().replace(/\s+/g, ' ');
}

export function normalizarWhatsApp(valor = '') {
  return String(valor || '')
    .replace(/\D/g, '')
    .slice(0, 11);
}

export function formatarWhatsApp(valor = '') {
  const digitos = normalizarWhatsApp(valor);

  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 7) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;

  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

export function formatarDataHora(valor) {
  if (!valor) return '-';
  return new Date(valor).toLocaleString('pt-BR');
}

export function calcularTotalSelfService(valorPrato, taxaServico = SELF_SERVICE_TAXA) {
  return Number((Number(valorPrato || 0) + Number(taxaServico || 0)).toFixed(2));
}

export function obterClasseStatusSelfService(status = '') {
  const statusNormalizado = String(status || '').trim().toUpperCase();

  if (statusNormalizado === 'PAGO') return 'success';
  if (statusNormalizado === 'RETIRADO') return 'info';
  if (statusNormalizado === 'CANCELADO') return 'danger';
  return 'warning';
}

export function obterTextoStatusSelfService(status = '') {
  const statusNormalizado = String(status || '').trim().toUpperCase();

  if (statusNormalizado === 'PAGO') return 'Pago';
  if (statusNormalizado === 'RETIRADO') return 'Retirado';
  if (statusNormalizado === 'CANCELADO') return 'Cancelado';
  return 'Aguardando pagamento';
}
