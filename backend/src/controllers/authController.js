const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

function mapEmpresaPublic(empresa) {
  if (!empresa) return null;
  return {
    id: empresa.id,
    nome: empresa.nome,
    sigla: empresa.sigla,
    totalPedidos: empresa.totalPedidos,
    ativo: empresa.ativo
  };
}

// Login (admin/funcionario por email e empresa por sigla)
async function login(req, res) {
  try {
    const { email, sigla, senha } = req.body;

    if (!senha || (!email && !sigla)) {
      return res.status(400).json({ erro: 'Informe credenciais validas' });
    }

    // Fluxo padrao: usuario por e-mail
    if (email) {
      const emailNormalizado = String(email).trim().toLowerCase();
      const usuario = await prisma.usuario.findUnique({
        where: { email: emailNormalizado },
        include: { empresa: true }
      });

      if (!usuario || !usuario.ativo) {
        return res.status(401).json({ erro: 'Credenciais invalidas' });
      }

      const senhaValida = await bcrypt.compare(senha, usuario.senha);
      if (!senhaValida) {
        return res.status(401).json({ erro: 'Credenciais invalidas' });
      }

      const token = jwt.sign(
        {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          role: usuario.role,
          empresaId: usuario.empresaId
        },
        process.env.JWT_SECRET,
        { expiresIn: '12h' }
      );

      return res.json({
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          role: usuario.role,
          empresaId: usuario.empresaId,
          empresa: mapEmpresaPublic(usuario.empresa)
        }
      });
    }

    // Novo fluxo: empresa por sigla + senha
    const siglaNormalizada = String(sigla).trim().toUpperCase();
    const empresa = await prisma.empresa.findUnique({ where: { sigla: siglaNormalizada } });

    if (!empresa || !empresa.ativo || !empresa.senha) {
      return res.status(401).json({ erro: 'Credenciais invalidas' });
    }

    const senhaValidaEmpresa = await bcrypt.compare(senha, empresa.senha);
    if (!senhaValidaEmpresa) {
      return res.status(401).json({ erro: 'Credenciais invalidas' });
    }

    const token = jwt.sign(
      {
        id: `empresa-${empresa.id}`,
        nome: empresa.nome,
        role: 'EMPRESA_FUNC',
        empresaId: empresa.id,
        empresaSigla: empresa.sigla,
        tipoAcesso: 'EMPRESA'
      },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    return res.json({
      token,
      usuario: {
        id: `empresa-${empresa.id}`,
        nome: empresa.nome,
        email: null,
        role: 'EMPRESA_FUNC',
        empresaId: empresa.id,
        empresa: mapEmpresaPublic(empresa)
      }
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// Registrar usuario (apenas admin)
async function registrar(req, res) {
  try {
    const { nome, email, senha, role, empresaId } = req.body;

    const emailNormalizado = String(email).trim().toLowerCase();
    const existente = await prisma.usuario.findUnique({ where: { email: emailNormalizado } });
    if (existente) {
      return res.status(400).json({ erro: 'E-mail ja cadastrado' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email: emailNormalizado,
        senha: senhaHash,
        role: role || 'EMPRESA_FUNC',
        empresaId
      },
      include: { empresa: true }
    });

    res.status(201).json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
      empresaId: usuario.empresaId,
      empresa: mapEmpresaPublic(usuario.empresa)
    });
  } catch (err) {
    console.error('Erro ao registrar:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// Obter perfil do usuario logado
async function perfil(req, res) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      include: { empresa: true }
    });

    if (!usuario) {
      return res.status(404).json({ erro: 'Usuario nao encontrado' });
    }

    res.json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
      empresaId: usuario.empresaId,
      empresa: mapEmpresaPublic(usuario.empresa)
    });
  } catch (err) {
    console.error('Erro ao buscar perfil:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

module.exports = { login, registrar, perfil };
