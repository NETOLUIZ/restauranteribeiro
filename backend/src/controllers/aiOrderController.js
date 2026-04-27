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

async function organizarTexto(req, res) {
  try {
    const pedido = await organizarPedidoTexto(req.body?.mensagem);
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
