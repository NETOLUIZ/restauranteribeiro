const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function dataIsoValida(dataIso) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(dataIso || ''));
}

function mapControle(controle) {
  if (!controle) return null;
  return {
    data: controle.data,
    updatedAt: controle.updatedAt,
    secoes: controle.secoes && typeof controle.secoes === 'object' ? controle.secoes : {}
  };
}

async function obterPorData(req, res) {
  try {
    const data = String(req.params.data || '').trim();
    if (!dataIsoValida(data)) {
      return res.status(400).json({ erro: 'Data invalida. Use YYYY-MM-DD.' });
    }

    const controle = await prisma.controleDiario.findUnique({
      where: { data }
    });

    return res.json({ controle: mapControle(controle) });
  } catch (err) {
    console.error('Erro ao buscar controle diario por data:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

async function obterMaisRecente(req, res) {
  try {
    const controle = await prisma.controleDiario.findFirst({
      orderBy: { data: 'desc' }
    });

    return res.json({ controle: mapControle(controle) });
  } catch (err) {
    console.error('Erro ao buscar controle diario mais recente:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

async function salvar(req, res) {
  try {
    const data = String(req.params.data || '').trim();
    const secoes = req.body?.secoes;

    if (!dataIsoValida(data)) {
      return res.status(400).json({ erro: 'Data invalida. Use YYYY-MM-DD.' });
    }

    if (!secoes || typeof secoes !== 'object' || Array.isArray(secoes)) {
      return res.status(400).json({ erro: 'Secoes invalidas.' });
    }

    const controle = await prisma.controleDiario.upsert({
      where: { data },
      update: { secoes },
      create: { data, secoes }
    });

    return res.json({ controle: mapControle(controle) });
  } catch (err) {
    console.error('Erro ao salvar controle diario:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

module.exports = {
  obterPorData,
  obterMaisRecente,
  salvar
};
