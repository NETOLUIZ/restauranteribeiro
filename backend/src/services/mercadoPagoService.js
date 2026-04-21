const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

let cachedToken = null;
let cachedClient = null;

function getClient() {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken || accessToken === 'SEU_TOKEN_MERCADO_PAGO') {
    return null;
  }

  if (!cachedClient || cachedToken !== accessToken) {
    cachedToken = accessToken;
    cachedClient = new MercadoPagoConfig({ accessToken });
  }

  return cachedClient;
}

function mercadoPagoConfigurado() {
  return !!getClient();
}

async function criarCheckoutPedidoAvulso({ pedidoId, nomeCliente, itens, quantidade, valorUnitario, webhookUrl }) {
  const client = getClient();
  if (!client) {
    throw new Error('Mercado Pago não configurado');
  }

  const itensTexto = Array.isArray(itens) && itens.length
    ? itens.map((item) => item.nome).join(', ')
    : 'Pedido avulso';

  const preference = new Preference(client);
  const body = {
    items: [
      {
        id: `pedido-${pedidoId}`,
        title: `Pedido Avulso #${pedidoId}`,
        description: itensTexto,
        quantity: quantidade,
        currency_id: 'BRL',
        unit_price: valorUnitario
      }
    ],
    external_reference: `PEDIDO_AVULSO_${pedidoId}`,
    notification_url: webhookUrl,
    back_urls: {
      success: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pedido?status=success&pedidoId=${pedidoId}`,
      failure: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pedido?status=failure&pedidoId=${pedidoId}`,
      pending: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pedido?status=pending&pedidoId=${pedidoId}`
    },
    auto_return: 'approved',
    payer: {
      name: nomeCliente || 'Cliente'
    }
  };

  const resposta = await preference.create({ body });

  return {
    preferenceId: resposta.id,
    checkoutUrl: resposta.init_point || resposta.sandbox_init_point
  };
}

async function consultarPagamento(paymentId) {
  const client = getClient();
  if (!client) {
    throw new Error('Mercado Pago não configurado');
  }

  const payment = new Payment(client);
  const dados = await payment.get({ id: paymentId });

  return {
    id: String(dados.id),
    status: dados.status,
    valorPago: dados.transaction_amount,
    externalReference: dados.external_reference
  };
}

module.exports = {
  mercadoPagoConfigurado,
  criarCheckoutPedidoAvulso,
  consultarPagamento
};
