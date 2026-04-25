const { MercadoPagoConfig, Payment } = require('mercadopago');

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

function montarItensTexto(itens) {
  return Array.isArray(itens) && itens.length
    ? itens.map((item) => item.nome).join(', ')
    : 'Pedido avulso';
}

function obterEmailPayer(pedidoId) {
  const emailConfigurado = String(process.env.MERCADO_PAGO_PAYER_EMAIL || '').trim();
  return emailConfigurado || `pedido-${pedidoId}@ribeirorestaurante.com`;
}

function montarTelefonePayer(telefone) {
  const digitos = String(telefone || '').replace(/\D/g, '');
  if (digitos.length < 10) return undefined;

  return {
    area_code: digitos.slice(0, 2),
    number: digitos.slice(2)
  };
}

async function criarPagamentoPixPedidoAvulso({
  pedidoId,
  nomeCliente,
  telefone,
  endereco,
  itens,
  quantidade,
  valorUnitario,
  webhookUrl
}) {
  const client = getClient();
  if (!client) {
    throw new Error('Mercado Pago nao configurado');
  }

  const itensTexto = montarItensTexto(itens);
  const quantidadeFinal = Math.max(1, Number(quantidade) || 1);
  const valorUnitarioFinal = Number(valorUnitario);
  if (!Number.isFinite(valorUnitarioFinal) || valorUnitarioFinal <= 0) {
    throw new Error('Valor unitario invalido para Pix');
  }

  const valorTotal = Number((valorUnitarioFinal * quantidadeFinal).toFixed(2));
  const payment = new Payment(client);
  const telefonePayer = montarTelefonePayer(telefone);

  const body = {
    transaction_amount: valorTotal,
    description: `Pedido Avulso #${pedidoId} - ${itensTexto}`,
    // Pix direto: sem Checkout Pro e sem boleto/cartoes no fluxo de pagamento.
    payment_method_id: 'pix',
    external_reference: `PEDIDO_AVULSO_${pedidoId}`,
    payer: {
      email: obterEmailPayer(pedidoId),
      first_name: nomeCliente || 'Cliente',
      ...(telefonePayer ? { phone: telefonePayer } : {})
    },
    additional_info: {
      items: [
        {
          id: `pedido-${pedidoId}`,
          title: `Pedido Avulso #${pedidoId}`,
          description: itensTexto,
          quantity: quantidadeFinal,
          unit_price: valorUnitarioFinal
        }
      ],
      payer: {
        first_name: nomeCliente || 'Cliente',
        ...(telefonePayer ? { phone: telefonePayer } : {})
      },
      ...(endereco
        ? {
            shipments: {
              receiver_address: {
                street_name: endereco
              }
            }
          }
        : {})
    }
  };

  if (isHttpsPublico(webhookUrl)) {
    body.notification_url = webhookUrl;
  }

  const resposta = await payment.create({
    body,
    requestOptions: {
      idempotencyKey: `pedido-avulso-pix-${pedidoId}`
    }
  });

  const dadosPix = resposta.point_of_interaction?.transaction_data || {};

  return {
    pagamentoId: String(resposta.id),
    status: resposta.status,
    qrCode: dadosPix.qr_code || null,
    qrCodeBase64: dadosPix.qr_code_base64 || null,
    copiaecola: dadosPix.qr_code || null,
    valor: resposta.transaction_amount,
    pedidoId
  };
}

async function consultarPagamento(paymentId) {
  const client = getClient();
  if (!client) {
    throw new Error('Mercado Pago nao configurado');
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

async function buscarPagamentoPorReferenciaExterna(externalReference) {
  const client = getClient();
  if (!client) {
    throw new Error('Mercado Pago nao configurado');
  }

  if (!externalReference) {
    return null;
  }

  const payment = new Payment(client);
  const dados = await payment.search({
    options: {
      external_reference: String(externalReference),
      sort: 'date_created',
      criteria: 'desc'
    }
  });

  const encontrado = Array.isArray(dados.results) ? dados.results[0] : null;
  if (!encontrado?.id) {
    return null;
  }

  return {
    id: String(encontrado.id),
    status: encontrado.status,
    valorPago: encontrado.transaction_amount,
    externalReference: encontrado.external_reference
  };
}

module.exports = {
  mercadoPagoConfigurado,
  obterStatusMercadoPago,
  criarPagamentoPixPedidoAvulso,
  consultarPagamento,
  buscarPagamentoPorReferenciaExterna
};
