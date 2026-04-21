const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TAMANHOS = ['GRANDE', 'PEQUENA'];

function normalizarPreco(preco) {
  const numero = typeof preco === 'string' ? Number(preco.replace(',', '.')) : Number(preco);
  if (!Number.isFinite(numero) || numero < 0) return null;
  return Number(numero.toFixed(2));
}

function montarImagemUrl(req) {
  if (req.file) return `/uploads/${req.file.filename}`;
  if (req.body.imagemUrl) return req.body.imagemUrl;
  return undefined;
}

async function listarAtivos(req, res) {
  try {
    const cards = await prisma.marmitaCard.findMany({
      where: { ativo: true },
      orderBy: { tamanho: 'asc' }
    });
    res.json(cards);
  } catch (err) {
    console.error('Erro ao listar cards de marmita:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

async function listarTodos(req, res) {
  try {
    const cards = await prisma.marmitaCard.findMany({
      orderBy: { tamanho: 'asc' }
    });
    res.json(cards);
  } catch (err) {
    console.error('Erro ao listar cards de marmita (admin):', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

async function salvarPorTamanho(req, res) {
  try {
    const tamanho = String(req.params.tamanho || '').toUpperCase();
    if (!TAMANHOS.includes(tamanho)) {
      return res.status(400).json({ erro: 'Tamanho invalido. Use GRANDE ou PEQUENA' });
    }

    const titulo = String(req.body.titulo || '').trim();
    const preco = normalizarPreco(req.body.preco);
    const ativo = req.body.ativo === undefined ? undefined : req.body.ativo === 'true' || req.body.ativo === true;

    if (!titulo) {
      return res.status(400).json({ erro: 'Titulo e obrigatorio' });
    }

    if (preco === null) {
      return res.status(400).json({ erro: 'Preco invalido' });
    }

    const data = { titulo, preco };
    const imagemUrl = montarImagemUrl(req);
    if (imagemUrl !== undefined) data.imagemUrl = imagemUrl;
    if (ativo !== undefined) data.ativo = ativo;

    const existente = await prisma.marmitaCard.findUnique({ where: { tamanho } });

    const card = existente
      ? await prisma.marmitaCard.update({ where: { tamanho }, data })
      : await prisma.marmitaCard.create({ data: { tamanho, ...data } });

    res.json(card);
  } catch (err) {
    console.error('Erro ao salvar card de marmita:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

module.exports = { listarAtivos, listarTodos, salvarPorTamanho };
