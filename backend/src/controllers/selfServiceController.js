const { PrismaClient } = require('@prisma/client');
const {
  mercadoPagoConfigurado,
  obterStatusMercadoPago,
  criarPagamentoPixSelfService,
  consultarPagamento,
  buscarPagamentoPorReferenciaExterna
} = require('../services/mercadoPagoService');

const prisma = new PrismaClient();

const SELF_SERVICE_TAXA = 0.2;
const STATUS_SELF_SERVICE_VALIDOS = new Set(['AGUARDANDO_PAGAMENTO', 'PAGO', 'RETIRADO', 'CANCELADO']);
const STATUS_SELF_SERVICE_PAGAVEIS = new Set(['AGUARDANDO_PAGAMENTO', 'PAGO']);

const OPCOES_SELF_SERVICE = {
  SELF_SERVICE_18: {
    tipoPrato: 'SELF_SERVICE_18',
    titulo: 'Prato Self-service R$ 18,00',
    resumo: 'R$ 18,00',
    valorPrato: 18
  },
  SELF_SERVICE_15: {
    tipoPrato: 'SELF_SERVICE_15',
    titulo: 'Prato Self-service R$ 15,00',
    resumo: 'R$ 15,00',
    valorPrato: 15
  }
};

function obterWebhookUrl(req) {
  if (process.env.SELF_SERVICE_WEBHOOK_URL) {
    return process.env.SELF_SERVICE_WEBHOOK_URL;
  }

  return `${req.protocol}://${req.get('host')}/api/self-service/webhook`;
}

function normalizarNomeCliente(valor = '') {
  return String(valor || '').trim().replace(/\s+/g, ' ');
}

function normalizarWhatsApp(valor = '') {
  let digitos = String(valor || '').replace(/\D/g, '');

  if (digitos.startsWith('55') && digitos.length > 11) {
    digitos = digitos.slice(2);
  }

  return digitos.slice(0, 11);
}

function obterOpcaoSelfService(valor = '') {
  return OPCOES_SELF_SERVICE[String(valor || '').trim().toUpperCase()] || null;
}

function criarIntervaloData(dataInformada) {
  if (!dataInformada) {
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + 1);
    return { inicio, fim };
  }

  const partes = String(dataInformada).split('-').map((item) => Number.parseInt(item, 10));
  const [ano, mes, dia] = partes;

  if (!ano || !mes || !dia) {
    return null;
  }

  const inicio = new Date(ano, mes - 1, dia, 0, 0, 0, 0);
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);

  return { inicio, fim };
}

function extrairReservaIdDaReferencia(externalReference) {
  if (!externalReference) return null;

  const match = String(externalReference).match(/SELF_SERVICE_(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function formatarDataCodigo(data) {
  const dataBase = data instanceof Date ? data : new Date(data || Date.now());
  const dia = String(dataBase.getDate()).padStart(2, '0');
  const mes = String(dataBase.getMonth() + 1).padStart(2, '0');
  const ano = String(dataBase.getFullYear());
  return `${dia}${mes}${ano}`;
}

function formatarNomeCodigo(nome = '') {
  const primeiroNome = normalizarNomeCliente(nome)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)[0];

  return (primeiroNome || 'CLIENTE').toUpperCase().slice(0, 16);
}

async function gerarCodigoRetirada(tx, reserva) {
  const base = `RIBEIRO-${formatarDataCodigo(reserva.pagoEm || reserva.createdAt || new Date())}-${formatarNomeCodigo(reserva.nomeCliente)}`;
  const digitosBase = String(reserva.mercadoPagoId || reserva.id || '')
    .replace(/\D/g, '')
    .slice(-4)
    .padStart(4, '0');

  const candidatos = [digitosBase];
  while (candidatos.length < 20) {
    candidatos.push(String(Math.floor(1000 + Math.random() * 9000)));
  }

  for (const sufixo of candidatos) {
    const codigo = `${base}-${sufixo}`;
    const existente = await tx.reservaSelfService.findFirst({
      where: {
        codigoRetirada: codigo,
        id: { not: reserva.id }
      },
      select: { id: true }
    });

    if (!existente) {
      return codigo;
    }
  }

  throw new Error('Nao foi possivel gerar um codigo de retirada unico');
}

function montarDadosAtualizacaoPagamento(pagamento, reservaAtual = null) {
  const dadosAtualizacao = {
    mercadoPagoId: String(pagamento.id)
  };

  if (pagamento.externalReference) {
    dadosAtualizacao.referenciaExterna = pagamento.externalReference;
  }

  if (pagamento.status === 'approved') {
    dadosAtualizacao.status = 'PAGO';
    dadosAtualizacao.valorPago = typeof pagamento.valorPago === 'number' ? pagamento.valorPago : undefined;
    dadosAtualizacao.pagoEm = reservaAtual?.pagoEm || new Date();
    dadosAtualizacao.canceladoEm = null;
  } else if (['cancelled', 'rejected', 'refunded', 'charged_back'].includes(pagamento.status)) {
    dadosAtualizacao.status = 'CANCELADO';
    dadosAtualizacao.canceladoEm = reservaAtual?.canceladoEm || new Date();
  } else if (reservaAtual?.status !== 'RETIRADO') {
    dadosAtualizacao.status = 'AGUARDANDO_PAGAMENTO';
  }

  return dadosAtualizacao;
}

async function localizarPagamentoReserva(reserva) {
  if (reserva.mercadoPagoId) {
    try {
      return await consultarPagamento(reserva.mercadoPagoId);
    } catch (err) {
      console.error(`Erro ao consultar pagamento self-service ${reserva.mercadoPagoId}:`, err);
    }
  }

  if (reserva.referenciaExterna) {
    try {
      return await buscarPagamentoPorReferenciaExterna(reserva.referenciaExterna);
    } catch (err) {
      console.error(`Erro ao buscar pagamento self-service por referencia ${reserva.referenciaExterna}:`, err);
    }
  }

  return null;
}

async function atualizarReservaComPagamento(reserva, pagamento) {
  const dadosAtualizacao = montarDadosAtualizacaoPagamento(pagamento, reserva);
  const statusMudou = reserva.status !== dadosAtualizacao.status;
  const mercadoPagoIdMudou = reserva.mercadoPagoId !== dadosAtualizacao.mercadoPagoId;
  const referenciaMudou = dadosAtualizacao.referenciaExterna && reserva.referenciaExterna !== dadosAtualizacao.referenciaExterna;
  const pagoEmMudou = dadosAtualizacao.status === 'PAGO' && !reserva.pagoEm;
  const canceladoEmMudou = dadosAtualizacao.status === 'CANCELADO' && !reserva.canceladoEm;
  const valorPagoMudou = typeof dadosAtualizacao.valorPago === 'number' && reserva.valorPago !== dadosAtualizacao.valorPago;
  const precisaGerarCodigo = dadosAtualizacao.status === 'PAGO' && !reserva.codigoRetirada;

  if (!statusMudou && !mercadoPagoIdMudou && !referenciaMudou && !pagoEmMudou && !canceladoEmMudou && !valorPagoMudou && !precisaGerarCodigo) {
    return {
      ...reserva,
      ...dadosAtualizacao
    };
  }

  return prisma.$transaction(async (tx) => {
    const reservaAtualizada = await tx.reservaSelfService.update({
      where: { id: reserva.id },
      data: dadosAtualizacao
    });

    if (dadosAtualizacao.status !== 'PAGO' || reservaAtualizada.codigoRetirada) {
      return reservaAtualizada;
    }

    const codigoRetirada = await gerarCodigoRetirada(tx, reservaAtualizada);

    return tx.reservaSelfService.update({
      where: { id: reservaAtualizada.id },
      data: { codigoRetirada }
    });
  });
}

async function sincronizarStatusPagamentoSelfService(reserva) {
  if (
    !reserva ||
    !mercadoPagoConfigurado() ||
    !STATUS_SELF_SERVICE_PAGAVEIS.has(reserva.status)
  ) {
    return reserva;
  }

  const pagamento = await localizarPagamentoReserva(reserva);
  if (!pagamento) {
    return reserva;
  }

  return atualizarReservaComPagamento(reserva, pagamento);
}

function montarComprovante(reserva) {
  if (!reserva?.codigoRetirada || !['PAGO', 'RETIRADO'].includes(reserva.status)) {
    return null;
  }

  const opcao = obterOpcaoSelfService(reserva.tipoPrato);

  return {
    nomeCliente: reserva.nomeCliente,
    whatsapp: reserva.whatsapp,
    pratoEscolhido: opcao?.titulo || reserva.tipoPrato,
    valorPrato: reserva.valorPrato,
    taxaServico: reserva.taxaServico,
    totalPago: typeof reserva.valorPago === 'number' ? reserva.valorPago : reserva.valorTotal,
    dataHora: reserva.pagoEm || reserva.createdAt,
    codigoRetirada: reserva.codigoRetirada
  };
}

function serializarReserva(reserva) {
  const opcao = obterOpcaoSelfService(reserva.tipoPrato);

  return {
    id: reserva.id,
    nomeCliente: reserva.nomeCliente,
    whatsapp: reserva.whatsapp,
    tipoPrato: reserva.tipoPrato,
    pratoEscolhido: opcao?.titulo || reserva.tipoPrato,
    resumoPrato: opcao?.resumo || '',
    valorPrato: reserva.valorPrato,
    taxaServico: reserva.taxaServico,
    valorTotal: reserva.valorTotal,
    valorPago: reserva.valorPago,
    status: reserva.status,
    pagoEm: reserva.pagoEm,
    codigoRetirada: ['PAGO', 'RETIRADO'].includes(reserva.status) ? reserva.codigoRetirada : null,
    retiradoEm: reserva.retiradoEm,
    canceladoEm: reserva.canceladoEm,
    createdAt: reserva.createdAt,
    updatedAt: reserva.updatedAt,
    comprovante: montarComprovante(reserva)
  };
}

function statusMercadoPago(req, res) {
  res.json(obterStatusMercadoPago());
}

async function criar(req, res) {
  try {
    if (!mercadoPagoConfigurado()) {
      return res.status(503).json({
        erro: 'Pagamento Pix indisponivel no momento. Configure o Mercado Pago.'
      });
    }

    const nomeCliente = normalizarNomeCliente(req.body?.nomeCliente);
    const whatsapp = normalizarWhatsApp(req.body?.whatsapp);
    const opcao = obterOpcaoSelfService(req.body?.tipoPrato || req.body?.opcao);

    if (!nomeCliente || whatsapp.length < 10 || !opcao) {
      return res.status(400).json({
        erro: 'Informe nome, WhatsApp e o prato self-service desejado.'
      });
    }

    const valorPrato = opcao.valorPrato;
    const taxaServico = Number(SELF_SERVICE_TAXA.toFixed(2));
    const valorTotal = Number((valorPrato + taxaServico).toFixed(2));

    const reserva = await prisma.reservaSelfService.create({
      data: {
        nomeCliente,
        whatsapp,
        tipoPrato: opcao.tipoPrato,
        valorPrato,
        taxaServico,
        valorTotal,
        status: 'AGUARDANDO_PAGAMENTO'
      }
    });

    try {
      const pagamentoPix = await criarPagamentoPixSelfService({
        reservaId: reserva.id,
        nomeCliente,
        whatsapp,
        descricaoPrato: opcao.titulo,
        valorTotal,
        webhookUrl: obterWebhookUrl(req)
      });

      const reservaAtualizada = await prisma.reservaSelfService.update({
        where: { id: reserva.id },
        data: {
          mercadoPagoId: pagamentoPix.pagamentoId,
          referenciaExterna: `SELF_SERVICE_${reserva.id}`
        }
      });

      return res.status(201).json({
        ...serializarReserva(reservaAtualizada),
        requiresPayment: true,
        pagamentoPix,
        pagamentoId: pagamentoPix.pagamentoId,
        qrCode: pagamentoPix.qrCode,
        qrCodeBase64: pagamentoPix.qrCodeBase64,
        copiaecola: pagamentoPix.copiaecola
      });
    } catch (errorMercadoPago) {
      await prisma.reservaSelfService.delete({ where: { id: reserva.id } });
      console.error('Erro ao criar Pix do self-service no Mercado Pago:', errorMercadoPago);
      return res.status(502).json({ erro: 'Nao foi possivel gerar o Pix do self-service.' });
    }
  } catch (err) {
    console.error('Erro ao criar reserva self-service:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

async function statusPagamentoPublico(req, res) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: 'Reserva invalida' });
    }

    const reserva = await prisma.reservaSelfService.findUnique({ where: { id } });
    if (!reserva) {
      return res.status(404).json({ erro: 'Reserva nao encontrada' });
    }

    const reservaSincronizada = await sincronizarStatusPagamentoSelfService(reserva);
    res.json(serializarReserva(reservaSincronizada));
  } catch (err) {
    console.error('Erro ao consultar status do self-service:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

async function listar(req, res) {
  try {
    const intervalo = criarIntervaloData(req.query?.data);
    if (!intervalo) {
      return res.status(400).json({ erro: 'Data invalida para filtro' });
    }

    const status = String(req.query?.status || '').trim().toUpperCase();
    const busca = String(req.query?.busca || '').trim();
    const buscaNumerica = busca.replace(/\D/g, '');

    if (status && !STATUS_SELF_SERVICE_VALIDOS.has(status)) {
      return res.status(400).json({ erro: 'Status invalido para filtro' });
    }

    const filtros = [
      { createdAt: { gte: intervalo.inicio, lt: intervalo.fim } }
    ];

    if (status) {
      filtros.push({ status });
    }

    if (busca) {
      const orBusca = [
        { nomeCliente: { contains: busca, mode: 'insensitive' } },
        { codigoRetirada: { contains: busca.toUpperCase(), mode: 'insensitive' } }
      ];

      if (buscaNumerica) {
        orBusca.push({ whatsapp: { contains: buscaNumerica } });
      }

      filtros.push({ OR: orBusca });
    }

    const reservas = await prisma.reservaSelfService.findMany({
      where: { AND: filtros },
      orderBy: { createdAt: 'desc' }
    });

    const reservasSincronizadas = await Promise.all(
      reservas.map((reserva) => sincronizarStatusPagamentoSelfService(reserva))
    );

    res.json(reservasSincronizadas.map(serializarReserva));
  } catch (err) {
    console.error('Erro ao listar reservas self-service:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

async function marcarComoRetirado(req, res) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: 'Reserva invalida' });
    }

    const reservaAtual = await prisma.reservaSelfService.findUnique({ where: { id } });
    if (!reservaAtual) {
      return res.status(404).json({ erro: 'Reserva nao encontrada' });
    }

    const reservaSincronizada = await sincronizarStatusPagamentoSelfService(reservaAtual);

    if (reservaSincronizada.status === 'RETIRADO') {
      return res.json(serializarReserva(reservaSincronizada));
    }

    if (reservaSincronizada.status !== 'PAGO') {
      return res.status(400).json({
        erro: 'Somente reservas pagas podem ser marcadas como retiradas.'
      });
    }

    const reserva = await prisma.reservaSelfService.update({
      where: { id },
      data: {
        status: 'RETIRADO',
        retiradoEm: new Date()
      }
    });

    res.json(serializarReserva(reserva));
  } catch (err) {
    console.error('Erro ao marcar reserva self-service como retirada:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

async function webhookMercadoPago(req, res) {
  try {
    const bodyType = req.body?.type;
    const queryType = req.query?.type || req.query?.topic;
    const type = bodyType || queryType;
    const paymentId = req.body?.data?.id || req.query?.id || req.query?.['data.id'];

    if (type && type !== 'payment') {
      return res.sendStatus(200);
    }

    if (!paymentId || !mercadoPagoConfigurado()) {
      return res.sendStatus(200);
    }

    const pagamento = await consultarPagamento(paymentId);
    const reservaIdReferencia = extrairReservaIdDaReferencia(pagamento.externalReference);

    let reserva = null;

    if (reservaIdReferencia) {
      reserva = await prisma.reservaSelfService.findUnique({
        where: { id: reservaIdReferencia }
      });
    }

    if (!reserva) {
      reserva = await prisma.reservaSelfService.findFirst({
        where: { mercadoPagoId: String(pagamento.id) }
      });
    }

    if (!reserva) {
      return res.sendStatus(200);
    }

    await atualizarReservaComPagamento(reserva, pagamento);
    res.sendStatus(200);
  } catch (err) {
    console.error('Erro no webhook do self-service:', err);
    res.sendStatus(200);
  }
}

module.exports = {
  SELF_SERVICE_TAXA,
  OPCOES_SELF_SERVICE,
  criar,
  listar,
  marcarComoRetirado,
  statusPagamentoPublico,
  statusMercadoPago,
  webhookMercadoPago
};
