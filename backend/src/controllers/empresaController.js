const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

function mapEmpresaPublic(empresa) {
  return {
    id: empresa.id,
    nome: empresa.nome,
    sigla: empresa.sigla,
    totalPedidos: empresa.totalPedidos,
    ativo: empresa.ativo,
    createdAt: empresa.createdAt,
    updatedAt: empresa.updatedAt
  };
}

// Listar empresas
async function listar(req, res) {
  try {
    const empresas = await prisma.empresa.findMany({
      select: {
        id: true,
        nome: true,
        sigla: true,
        totalPedidos: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
        funcionarios: {
          select: { id: true, nome: true, email: true, ativo: true }
        },
        _count: { select: { pedidos: true } }
      },
      orderBy: { nome: 'asc' }
    });
    res.json(empresas);
  } catch (err) {
    console.error('Erro ao listar empresas:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// Criar empresa
async function criar(req, res) {
  try {
    const { nome, sigla, senha, totalPedidos } = req.body;

    if (!nome || !sigla || !senha) {
      return res.status(400).json({ erro: 'Informe nome, sigla e senha da empresa' });
    }

    const siglaNormalizada = String(sigla).trim().toUpperCase();
    const nomeNormalizado = String(nome).trim();
    const totalPedidosFinal = parseInt(totalPedidos, 10) || 40;

    const existente = await prisma.empresa.findUnique({ where: { sigla: siglaNormalizada } });
    if (existente) {
      return res.status(400).json({ erro: 'Sigla ja cadastrada' });
    }

    const senhaHash = await bcrypt.hash(String(senha), 10);

    const empresa = await prisma.empresa.create({
      data: {
        nome: nomeNormalizado,
        sigla: siglaNormalizada,
        senha: senhaHash,
        totalPedidos: totalPedidosFinal
      }
    });

    res.status(201).json(mapEmpresaPublic(empresa));
  } catch (err) {
    console.error('Erro ao criar empresa:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// Atualizar empresa
async function atualizar(req, res) {
  try {
    const { id } = req.params;
    const { nome, totalPedidos, ativo, sigla, senha } = req.body;

    const data = {};
    if (nome !== undefined) data.nome = String(nome).trim();
    if (totalPedidos !== undefined) data.totalPedidos = parseInt(totalPedidos, 10) || 0;
    if (ativo !== undefined) data.ativo = !!ativo;
    if (sigla !== undefined) data.sigla = String(sigla).trim().toUpperCase();
    if (senha) data.senha = await bcrypt.hash(String(senha), 10);

    const empresa = await prisma.empresa.update({
      where: { id: parseInt(id, 10) },
      data
    });

    res.json(mapEmpresaPublic(empresa));
  } catch (err) {
    console.error('Erro ao atualizar empresa:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// Adicionar funcionario a uma empresa
async function adicionarFuncionario(req, res) {
  try {
    const { id } = req.params;
    const { nome, email, senha } = req.body;

    const emailNormalizado = String(email).trim().toLowerCase();
    const existente = await prisma.usuario.findUnique({ where: { email: emailNormalizado } });
    if (existente) {
      return res.status(400).json({ erro: 'E-mail ja cadastrado' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const funcionario = await prisma.usuario.create({
      data: {
        nome,
        email: emailNormalizado,
        senha: senhaHash,
        role: 'EMPRESA_FUNC',
        empresaId: parseInt(id, 10)
      }
    });

    res.status(201).json({
      id: funcionario.id,
      nome: funcionario.nome,
      email: funcionario.email,
      role: funcionario.role
    });
  } catch (err) {
    console.error('Erro ao adicionar funcionario:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// Remover funcionario
async function removerFuncionario(req, res) {
  try {
    const { funcId } = req.params;
    await prisma.usuario.update({
      where: { id: parseInt(funcId, 10) },
      data: { ativo: false }
    });
    res.json({ mensagem: 'Funcionario desativado com sucesso' });
  } catch (err) {
    console.error('Erro ao remover funcionario:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

module.exports = { listar, criar, atualizar, adicionarFuncionario, removerFuncionario };
