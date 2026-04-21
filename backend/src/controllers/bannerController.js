const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Listar banners ativos (público)
async function listarAtivos(req, res) {
  try {
    const banners = await prisma.banner.findMany({
      where: { ativo: true },
      orderBy: { ordem: 'asc' }
    });
    res.json(banners);
  } catch (err) {
    console.error('Erro ao listar banners:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// Listar todos os banners (admin)
async function listarTodos(req, res) {
  try {
    const banners = await prisma.banner.findMany({
      orderBy: { ordem: 'asc' }
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
    
    // Remove undefined values
    Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);
    
    const banner = await prisma.banner.update({
      where: { id: parseInt(id) },
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
      where: { id: parseInt(id) }
    });
    res.json({ mensagem: 'Banner removido com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar banner:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

module.exports = { listarAtivos, listarTodos, criar, atualizar, deletar };
