const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resumo(req, res) {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    
    // Pedidos avulsos de hoje
    const pedidosAvulsosHoje = await prisma.pedidoAvulso.findMany({
      where: { createdAt: { gte: hoje, lt: amanha } }
    });
    
    // Pedidos empresa de hoje
    const pedidosEmpresaHoje = await prisma.pedidoEmpresa.findMany({
      where: { createdAt: { gte: hoje, lt: amanha } },
      include: { lotes: true, empresa: true }
    });
    
    // Pedidos em dinheiro abertos
    const dinheiroAberto = await prisma.pedidoAvulso.count({
      where: { formaPagamento: 'DINHEIRO', statusPagamento: 'PENDENTE' }
    });
    
    // Pedidos empresa pendentes
    const empresaPendentes = await prisma.pedidoEmpresa.count({
      where: { status: 'ENVIADO' }
    });
    
    // Total marmitas empresa hoje
    const totalMarmitasEmpresa = pedidosEmpresaHoje.reduce((sum, p) => 
      sum + p.lotes.reduce((s, l) => s + l.quantidade, 0), 0
    );
    
    // Receita do dia (pedidos confirmados)
    const pedidosConfirmados = pedidosAvulsosHoje.filter(p => p.statusPagamento === 'CONFIRMADO');
    const receitaDia = pedidosConfirmados.reduce((total, pedido) => {
      if (typeof pedido.valorPago === 'number') return total + pedido.valorPago;
      if (typeof pedido.valorTotal === 'number') return total + pedido.valorTotal;
      return total;
    }, 0);
    
    res.json({
      pedidosAvulsosHoje: pedidosAvulsosHoje.length,
      pedidosEmpresaHoje: pedidosEmpresaHoje.length,
      totalMarmitasEmpresa,
      dinheiroAberto,
      empresaPendentes,
      pedidosConfirmados: pedidosConfirmados.length,
      receitaDia,
      pedidosAvulsos: pedidosAvulsosHoje,
      pedidosEmpresas: pedidosEmpresaHoje
    });
  } catch (err) {
    console.error('Erro no dashboard:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

module.exports = { resumo };
