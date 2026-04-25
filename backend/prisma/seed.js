const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed do banco de dados...');

  // Criar admin
  const senhaAdmin = await bcrypt.hash('admin123', 10);
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@ribeirorestaurante.com' },
    update: {
      senha: senhaAdmin,
      role: 'ADMIN',
      ativo: true
    },
    create: {
      nome: 'Administrador',
      email: 'admin@ribeirorestaurante.com',
      senha: senhaAdmin,
      role: 'ADMIN'
    }
  });
  console.log('Admin criado:', admin.email);

  // Criar itens do cardapio
  const itens = [
    { nome: 'Carne de Sol', tipo: 'PROTEINA' },
    { nome: 'Frango Grelhado', tipo: 'PROTEINA' },
    { nome: 'Carne de Porco', tipo: 'PROTEINA' },
    { nome: 'Peixe Frito', tipo: 'PROTEINA' },
    { nome: 'Calabresa', tipo: 'PROTEINA' },
    { nome: 'Bife Acebolado', tipo: 'PROTEINA' },
    { nome: 'Arroz Branco', tipo: 'COMPLEMENTO' },
    { nome: 'Feijao', tipo: 'COMPLEMENTO' },
    { nome: 'Macarrao', tipo: 'COMPLEMENTO' },
    { nome: 'Farofa', tipo: 'COMPLEMENTO' },
    { nome: 'Salada', tipo: 'COMPLEMENTO' },
    { nome: 'Ovo Cozido', tipo: 'COMPLEMENTO' },
    { nome: 'Pirao', tipo: 'COMPLEMENTO' },
    { nome: 'Vinagrete', tipo: 'COMPLEMENTO' },
    { nome: 'Batata Frita', tipo: 'COMPLEMENTO' },
    { nome: 'Pure de Batata', tipo: 'COMPLEMENTO' }
  ];

  for (const item of itens) {
    const existente = await prisma.itemCardapio.findFirst({
      where: { nome: item.nome, tipo: item.tipo }
    });
    if (!existente) {
      await prisma.itemCardapio.create({ data: item });
    }
  }
  console.log('Itens do cardapio criados');

  // Criar empresa de exemplo com acesso por sigla/senha
  const senhaEmpresa = await bcrypt.hash('empresa123', 10);
  let empresa = await prisma.empresa.findUnique({ where: { sigla: 'EXEMPLO' } });

  if (!empresa) {
    empresa = await prisma.empresa.create({
      data: {
        nome: 'Empresa Exemplo Ltda',
        sigla: 'EXEMPLO',
        senha: senhaEmpresa,
        totalPedidos: 40
      }
    });
  } else {
    empresa = await prisma.empresa.update({
      where: { id: empresa.id },
      data: {
        nome: 'Empresa Exemplo Ltda',
        sigla: 'EXEMPLO',
        senha: senhaEmpresa,
        totalPedidos: 40,
        ativo: true
      }
    });
  }
  console.log('Empresa exemplo criada:', empresa.nome);
  console.log('Login empresa exemplo: sigla=EXEMPLO senha=empresa123');

  // Funcionario de exemplo (fluxo antigo, opcional)
  const senhaFunc = await bcrypt.hash('func123', 10);
  await prisma.usuario.upsert({
    where: { email: 'funcionario@empresa.com' },
    update: {
      senha: senhaFunc,
      empresaId: empresa.id,
      ativo: true
    },
    create: {
      nome: 'Funcionario Teste',
      email: 'funcionario@empresa.com',
      senha: senhaFunc,
      role: 'EMPRESA_FUNC',
      empresaId: empresa.id
    }
  });
  console.log('Funcionario exemplo criado');

  // Cards de marmita (home)
  const marmitaGrande = await prisma.marmitaCard.findUnique({
    where: { tamanho: 'GRANDE' }
  });

  if (!marmitaGrande) {
    await prisma.marmitaCard.create({
      data: {
        tamanho: 'GRANDE',
        titulo: 'Marmita Grande',
        preco: 20,
        ativo: true
      }
    });
  }

  const marmitaPequena = await prisma.marmitaCard.findUnique({
    where: { tamanho: 'PEQUENA' }
  });

  if (!marmitaPequena) {
    await prisma.marmitaCard.create({
      data: {
        tamanho: 'PEQUENA',
        titulo: 'Marmita Pequena',
        preco: 16,
        ativo: true
      }
    });
  }
  console.log('Cards de marmita criados');

  console.log('Seed concluido com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
