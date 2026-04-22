const { PrismaClient } = require('@prisma/client');
const {
  mercadoPagoConfigurado,
  obterStatusMercadoPago,
  criarCheckoutPedidoAvulso,
  consultarPagamento
} = require('../services/mercadoPagoService');

const prisma = new PrismaClient();

function obterWebhookUrl(req) {
  if (process.env.MERCADO_PAGO_WEBHOOK_URL) {
    return process.env.MERCADO_PAGO_WEBHOOK_URL;
  }
  return `${req.protocol}://${req.get('host')}/api/pedidos-avulsos/webhook`;
}

function extrairPedidoIdDaReferencia(externalReference) {
  if (!externalReference) return null;
  const match = String(externalReference).match(/PEDIDO_AVULSO_(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function statusMercadoPago(req, res) {
  res.json(obterStatusMercadoPago());
}

// Criar pedido avulso
async function criar(req, res) {
  try {
    const {
      nomeCliente,
      telefone,
      endereco,
      itens,
      quantidade,
      observacao,
      formaPagamento,
      valorUnitario
    } = req.body;

    if (!nomeCliente || !telefone || !endereco || !Array.isArray(itens) || !itens.length || !formaPagamento) {
      return res.status(400).json({ erro: 'Dados obrigatorios nao informados' });
    }

    const quantidadeFinal = Math.max(1, parseInt(quantidade, 10) || 1);
    const valorPadrao = Number(process.env.PEDIDO_AVULSO_VALOR_UNITARIO || 0);
    const valorUnitarioFinal = Number(valorUnitario) > 0 ? Number(valorUnitario) : valorPadrao;
    const valorTotal = Number((valorUnitarioFinal * quantidadeFinal).toFixed(2));

    if (formaPagamento !== 'DINHEIRO' && valorUnitarioFinal <= 0) {
      return res.status(400).json({
        erro: 'Defina PEDIDO_AVULSO_VALOR_UNITARIO maior que zero para pagamentos online'
      });
    }

    const pedido = await prisma.pedidoAvulso.create({
      data: {
        nomeCliente,
        telefone,
        endereco,
        itens,
        quantidade: quantidadeFinal,
        valorUnitario: valorUnitarioFinal,
        valorTotal,
        observacao,
        formaPagamento,
        statusPagamento: 'PENDENTE'
      }
    });

    // Pagamento online (PIX/Credito/Debito) via checkout Mercado Pago
    if (formaPagamento !== 'DINHEIRO') {
      if (!mercadoPagoConfigurado()) {
        await prisma.pedidoAvulso.delete({ where: { id: pedido.id } });
        return res.status(503).json({
          erro: 'Pagamento online indisponivel no momento. Configure o Mercado Pago.'
        });
      }

      try {
        const checkout = await criarCheckoutPedidoAvulso({
          pedidoId: pedido.id,
          nomeCliente,
          itens,
          quantidade: quantidadeFinal,
          valorUnitario: valorUnitarioFinal,
          webhookUrl: obterWebhookUrl(req)
        });

        const pedidoAtualizado = await prisma.pedidoAvulso.update({
          where: { id: pedido.id },
          data: {
            mercadoPagoPreferenceId: checkout.preferenceId,
            referenciaExterna: `PEDIDO_AVULSO_${pedido.id}`
          }
        });

        return res.status(201).json({
          ...pedidoAtualizado,
          checkoutUrl: checkout.checkoutUrl,
          requiresPayment: true
        });
      } catch (errorMercadoPago) {
        await prisma.pedidoAvulso.delete({ where: { id: pedido.id } });
        console.error('Erro ao criar checkout no Mercado Pago:', errorMercadoPago);
        return res.status(502).json({ erro: 'Nao foi possivel iniciar o pagamento no Mercado Pago' });
      }
    }

    res.status(201).json({ ...pedido, requiresPayment: false });
  } catch (err) {
    console.error('Erro ao criar pedido avulso:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// Listar todos os pedidos avulsos (admin)
async function listarTodos(req, res) {
  try {
    const { status, data } = req.query;
    const where = {};

    if (status) where.statusPagamento = status;
    if (data) {
      const inicio = new Date(data);
      const fim = new Date(data);
      fim.setDate(fim.getDate() + 1);
      where.createdAt = { gte: inicio, lt: fim };
    }

    const pedidos = await prisma.pedidoAvulso.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    res.json(pedidos);
  } catch (err) {
    console.error('Erro ao listar pedidos:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// Atualizar status de pagamento (admin)
async function atualizarStatus(req, res) {
  try {
    const { id } = req.params;
    const { statusPagamento, motoqueiro, valorTroco } = req.body;

    const pedidoAtual = await prisma.pedidoAvulso.findUnique({
      where: { id: parseInt(id, 10) }
    });

    if (!pedidoAtual) {
      return res.status(404).json({ erro: 'Pedido nao encontrado' });
    }

    if (
      pedidoAtual.formaPagamento !== 'DINHEIRO' &&
      statusPagamento === 'CONFIRMADO'
    ) {
      return res.status(400).json({
        erro: 'Pedidos online sao confirmados automaticamente pelo Mercado Pago'
      });
    }

    const dadosAtualizacao = {
      statusPagamento,
      motoqueiro,
      valorTroco
    };

    if (statusPagamento === 'CONFIRMADO') {
      dadosAtualizacao.pagoEm = new Date();
      if (pedidoAtual.formaPagamento === 'DINHEIRO' && pedidoAtual.valorTotal > 0) {
        dadosAtualizacao.valorPago = pedidoAtual.valorTotal;
      }
    }

    const pedido = await prisma.pedidoAvulso.update({
      where: { id: parseInt(id, 10) },
      data: dadosAtualizacao
    });
    res.json(pedido);
  } catch (err) {
    console.error('Erro ao atualizar pedido:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// Marcar como impresso
async function marcarImpresso(req, res) {
  try {
    const { id } = req.params;
    const pedido = await prisma.pedidoAvulso.update({
      where: { id: parseInt(id, 10) },
      data: { impresso: true }
    });
    res.json(pedido);
  } catch (err) {
    console.error('Erro ao marcar pedido:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// Webhook do Mercado Pago
async function webhookMercadoPago(req, res) {
  try {
    const bodyType = req.body?.type;
    const queryType = req.query?.type || req.query?.topic;
    const type = bodyType || queryType;

    // Eventos antigos/IPN e novos webhooks possuem formatos diferentes
    const paymentId = req.body?.data?.id || req.query?.id || req.query?.['data.id'];

    if (type && type !== 'payment') {
      return res.sendStatus(200);
    }

    if (!paymentId || !mercadoPagoConfigurado()) {
      return res.sendStatus(200);
    }

    const pagamento = await consultarPagamento(paymentId);
    const pedidoIdReferencia = extrairPedidoIdDaReferencia(pagamento.externalReference);

    let pedido;
    if (pedidoIdReferencia) {
      pedido = await prisma.pedidoAvulso.findUnique({
        where: { id: pedidoIdReferencia }
      });
    } else {
      pedido = await prisma.pedidoAvulso.findFirst({
        where: { mercadoPagoId: String(pagamento.id) }
      });
    }

    if (!pedido) {
      return res.sendStatus(200);
    }

    const dadosAtualizacao = {
      mercadoPagoId: String(pagamento.id),
      valorPago: typeof pagamento.valorPago === 'number' ? pagamento.valorPago : undefined
    };

    if (pagamento.externalReference) {
      dadosAtualizacao.referenciaExterna = pagamento.externalReference;
    }

    if (pagamento.status === 'approved') {
      dadosAtualizacao.statusPagamento = 'CONFIRMADO';
      dadosAtualizacao.pagoEm = new Date();
    } else if (['cancelled', 'rejected', 'refunded', 'charged_back'].includes(pagamento.status)) {
      dadosAtualizacao.statusPagamento = 'CANCELADO';
    } else {
      dadosAtualizacao.statusPagamento = 'PENDENTE';
    }

    await prisma.pedidoAvulso.update({
      where: { id: pedido.id },
      data: dadosAtualizacao
    });

    res.sendStatus(200);
  } catch (err) {
    console.error('Erro no webhook:', err);
    res.sendStatus(500);
  }
}

module.exports = { criar, listarTodos, atualizarStatus, marcarImpresso, webhookMercadoPago, statusMercadoPago };

