const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Listar itens ativos do cardápio (público)
async function listarAtivos(req, res) {
  try {
    const itens = await prisma.itemCardapio.findMany({
      where: { ativo: true },
      distinct: ['nome', 'tipo'],
      orderBy: [{ tipo: 'asc' }, { nome: 'asc' }]
    });
    res.json(itens);
  } catch (err) {
    console.error('Erro ao listar cardápio:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// Listar todos os itens (admin)
async function listarTodos(req, res) {
  try {
    const itens = await prisma.itemCardapio.findMany({
      distinct: ['nome', 'tipo'],
      orderBy: [{ tipo: 'asc' }, { nome: 'asc' }]
    });
    res.json(itens);
  } catch (err) {
    console.error('Erro ao listar cardápio:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// Criar item
async function criar(req, res) {
  try {
    const { nome, tipo } = req.body;
    const item = await prisma.itemCardapio.create({
      data: { nome, tipo }
    });
    res.status(201).json(item);
  } catch (err) {
    console.error('Erro ao criar item:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// Atualizar item
async function atualizar(req, res) {
  try {
    const { id } = req.params;
    const { nome, tipo, ativo } = req.body;
    const item = await prisma.itemCardapio.update({
      where: { id: parseInt(id) },
      data: { nome, tipo, ativo }
    });
    res.json(item);
  } catch (err) {
    console.error('Erro ao atualizar item:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// Deletar item
async function deletar(req, res) {
  try {
    const { id } = req.params;
    await prisma.itemCardapio.delete({
      where: { id: parseInt(id) }
    });
    res.json({ mensagem: 'Item removido com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar item:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

module.exports = { listarAtivos, listarTodos, criar, atualizar, deletar };
