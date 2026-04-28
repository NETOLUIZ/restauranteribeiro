const fs = require('fs/promises');
const {
  AiOrderError,
  organizarPedidoTexto,
  transcreverEOrganizarPedidoAudio
} = require('../services/aiOrderService');

const removerArquivoSilenciosamente = async (arquivoPath) => {
  if (!arquivoPath) return;

  try {
    await fs.unlink(arquivoPath);
  } catch (err) {
    if (err?.code !== 'ENOENT') {
      console.error('Erro ao remover arquivo temporario de audio:', err);
    }
  }
};

const responderErro = (res, err) => {
  if (err instanceof AiOrderError) {
    res.status(err.statusCode || 500).json({ erro: err.message });
    return;
  }

  console.error('Erro na funcionalidade Pedido por IA:', err);
  res.status(500).json({ erro: 'Erro interno do servidor' });
};

const resolverMensagemTexto = (body) => {
  if (typeof body === 'string') {
    return body;
  }

  return body?.mensagem
    || body?.texto
    || body?.pedido
    || body?.input_text
    || body?.user_message
    || '';
};

async function organizarTexto(req, res) {
  try {
    const pedido = await organizarPedidoTexto(resolverMensagemTexto(req.body));
    res.json(pedido);
  } catch (err) {
    responderErro(res, err);
  }
}

async function transcreverAudio(req, res) {
  try {
    const pedido = await transcreverEOrganizarPedidoAudio(req.file);
    res.json(pedido);
  } catch (err) {
    responderErro(res, err);
  } finally {
    await removerArquivoSilenciosamente(req.file?.path);
  }
}

module.exports = {
  organizarTexto,
  transcreverAudio
};
