const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

function caminhoUpload(imagemUrl = '') {
  if (!imagemUrl.startsWith('/uploads/')) return null;
  return path.join(uploadsDir, path.basename(imagemUrl));
}

function hashArquivo(caminho) {
  try {
    if (!fs.existsSync(caminho)) return null;
    return crypto.createHash('sha1').update(fs.readFileSync(caminho)).digest('hex');
  } catch {
    return null;
  }
}

function chaveImagem(imagemUrl = '') {
  const url = String(imagemUrl || '').trim();
  if (!url) return null;

  const local = caminhoUpload(url);
  if (local) {
    const hash = hashArquivo(local);
    if (hash) return `hash:${hash}`;
  }

  return `url:${url.toLowerCase()}`;
}

function removerUpload(imagemUrl = '') {
  const local = caminhoUpload(imagemUrl);
  if (!local) return;
  fs.promises.unlink(local).catch(() => {});
}

function filtrarDuplicadosPorImagem(banners) {
  const vistas = new Set();

  return banners.filter((banner) => {
    const chave = chaveImagem(banner.imagemUrl);
    if (!chave || vistas.has(chave)) return false;
    vistas.add(chave);
    return true;
  });
}

async function buscarBannerComMesmaImagem(imagemUrl) {
  const chave = chaveImagem(imagemUrl);
  if (!chave) return null;

  const banners = await prisma.banner.findMany({
    where: { ativo: true },
    orderBy: [{ ordem: 'asc' }, { id: 'asc' }]
  });

  return banners.find((banner) => chaveImagem(banner.imagemUrl) === chave) || null;
}

// Listar banners ativos (publico)
async function listarAtivos(req, res) {
  try {
    const banners = await prisma.banner.findMany({
      where: { ativo: true },
      orderBy: [{ ordem: 'asc' }, { id: 'asc' }]
    });

    res.json(filtrarDuplicadosPorImagem(banners));
  } catch (err) {
    console.error('Erro ao listar banners:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// Listar todos os banners (admin)
async function listarTodos(req, res) {
  try {
    const banners = await prisma.banner.findMany({
      orderBy: [{ ordem: 'asc' }, { id: 'asc' }]
    });
    res.json(banners);
  } catch (err) {
    console.error('Erro ao listar banners:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// Criar banner
async function criar(req, res) {
  try {
    const { titulo, texto } = req.body;
    let imagemUrl = '';

    if (req.file) {
      imagemUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.imagemUrl) {
      imagemUrl = req.body.imagemUrl;
    }

    if (!imagemUrl) {
      return res.status(400).json({ erro: 'Informe uma imagem para o banner' });
    }

    const existente = await buscarBannerComMesmaImagem(imagemUrl);
    if (existente) {
      if (req.file) removerUpload(imagemUrl);
      return res.json(existente);
    }

    const banner = await prisma.banner.create({
      data: { titulo, texto, imagemUrl }
    });
    res.status(201).json(banner);
  } catch (err) {
    console.error('Erro ao criar banner:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// Atualizar banner
async function atualizar(req, res) {
  try {
    const { id } = req.params;
    const { titulo, texto, ativo, ordem } = req.body;
    const data = { titulo, texto, ativo, ordem };

    if (req.file) {
      data.imagemUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.imagemUrl) {
      data.imagemUrl = req.body.imagemUrl;
    }

    Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);

    const banner = await prisma.banner.update({
      where: { id: parseInt(id, 10) },
      data
    });
    res.json(banner);
  } catch (err) {
    console.error('Erro ao atualizar banner:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// Deletar banner
async function deletar(req, res) {
  try {
    const { id } = req.params;
    await prisma.banner.delete({
      where: { id: parseInt(id, 10) }
    });
    res.json({ mensagem: 'Banner removido com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar banner:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

module.exports = { listarAtivos, listarTodos, criar, atualizar, deletar };
