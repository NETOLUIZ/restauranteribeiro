const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

let cachedToken = null;
let cachedClient = null;

function getAccessToken() {
  const accessToken = String(process.env.MERCADO_PAGO_ACCESS_TOKEN || '').trim();
  const placeholders = new Set([
    'SEU_TOKEN_MERCADO_PAGO',
    'SEU_ACCESS_TOKEN_MERCADO_PAGO',
    '<token real>'
  ]);

  if (!accessToken || placeholders.has(accessToken)) {
    return null;
  }

  return accessToken;
}

function getClient() {
  const accessToken = getAccessToken();
  if (!accessToken) {
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

function obterStatusMercadoPago() {
  const accessToken = getAccessToken();
  return {
    configurado: !!accessToken,
    ambiente: accessToken?.startsWith('TEST-') ? 'teste' : accessToken?.startsWith('APP_USR-') ? 'producao' : 'desconhecido'
  };
}

function isHttpsPublico(url) {
  return /^https:\/\/[^/\s]+/i.test(String(url || ''));
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
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
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
    back_urls: {
      success: `${frontendUrl}/pedido?status=success&pedidoId=${pedidoId}`,
      failure: `${frontendUrl}/pedido?status=failure&pedidoId=${pedidoId}`,
      pending: `${frontendUrl}/pedido?status=pending&pedidoId=${pedidoId}`
    },
    payer: {
      name: nomeCliente || 'Cliente'
    }
  };

  if (isHttpsPublico(frontendUrl)) {
    body.auto_return = 'approved';
  }

  if (isHttpsPublico(webhookUrl)) {
    body.notification_url = webhookUrl;
  }

  const resposta = await preference.create({ body });

  return {
    preferenceId: resposta.id,
    checkoutUrl: cachedToken?.startsWith('TEST-')
      ? resposta.sandbox_init_point || resposta.init_point
      : resposta.init_point || resposta.sandbox_init_point
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
  obterStatusMercadoPago,
  criarCheckoutPedidoAvulso,
  consultarPagamento
};
