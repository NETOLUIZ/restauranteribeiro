const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseDataLocal(dataString) {
  const [ano, mes, dia] = String(dataString || '').split('-').map((parte) => parseInt(parte, 10));
  if (!ano || !mes || !dia) return null;
  return new Date(ano, mes - 1, dia, 0, 0, 0, 0);
}

async function criar(req, res) {
  try {
    const isEmpresa = req.usuario.role === 'EMPRESA_FUNC';
    const isAdmin = req.usuario.role === 'ADMIN';

    if (!isEmpresa && !isAdmin) {
      return res.status(403).json({ erro: 'Acesso negado para criar pedido de empresa' });
    }

    const empresaId = isAdmin
      ? parseInt(req.body.empresaId, 10)
      : req.usuario.empresaId;

    const { lotes, observacao } = req.body;

    if (!Number.isInteger(empresaId) || empresaId < 1) {
      return res.status(400).json({ erro: 'Empresa invalida para o pedido' });
    }

    if (!Array.isArray(lotes) || !lotes.length) {
      return res.status(400).json({ erro: 'Informe pelo menos um lote para o pedido' });
    }

    const observacaoNormalizada = typeof observacao === 'string' ? observacao.trim().replace(/\s+/g, ' ') : '';

    const lotesNormalizados = lotes.map((lote) => ({
      itens: lote.itens,
      quantidade: parseInt(lote.quantidade, 10),
      endereco: typeof lote.endereco === 'string' ? lote.endereco.trim() : '',
      nomes: Array.isArray(lote.nomes) && lote.nomes.length ? lote.nomes : null
    }));

    const loteInvalido = lotesNormalizados.some(
      (lote) =>
        !Array.isArray(lote.itens) ||
        !lote.itens.length ||
        !lote.endereco ||
        !Number.isInteger(lote.quantidade) ||
        lote.quantidade < 1
    );

    if (loteInvalido) {
      return res.status(400).json({ erro: 'Existe lote invalido no pedido enviado' });
    }

    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!empresa) {
      return res.status(404).json({ erro: 'Empresa nao encontrada' });
    }

    const totalMarmitas = lotesNormalizados.reduce((sum, lote) => sum + lote.quantidade, 0);

    if (totalMarmitas <= 0) {
      return res.status(400).json({ erro: 'Quantidade total de marmitas invalida' });
    }

    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);

    const pedidosExistentes = await prisma.pedidoEmpresa.findMany({
      where: {
        empresaId,
        createdAt: { gte: inicioDia }
      },
      include: { lotes: true }
    });

    const totalJaPedido = pedidosExistentes.reduce(
      (sum, p) => sum + p.lotes.reduce((s, l) => s + l.quantidade, 0),
      0
    );

    if (totalJaPedido + totalMarmitas > empresa.totalPedidos) {
      return res.status(400).json({
        erro: `Limite excedido. Total permitido: ${empresa.totalPedidos}. Ja pedido: ${totalJaPedido}. Restante: ${empresa.totalPedidos - totalJaPedido}`
      });
    }

    const pedido = await prisma.pedidoEmpresa.create({
      data: {
        empresaId,
        observacao: observacaoNormalizada || null,
        status: 'ENVIADO',
        lotes: {
          create: lotesNormalizados.map((lote) => ({
            itens: lote.itens,
            quantidade: lote.quantidade,
            endereco: lote.endereco,
            nomes: lote.nomes
          }))
        }
      },
      include: {
        lotes: true,
        empresa: true
      }
    });

    res.status(201).json(pedido);
  } catch (err) {
    console.error('Erro ao criar pedido empresa:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

async function listarPorEmpresa(req, res) {
  try {
    const empresaId = parseInt(req.params.empresaId, 10);
    const { data } = req.query;

    if (!Number.isInteger(empresaId)) {
      return res.status(400).json({ erro: 'Empresa invalida' });
    }

    if (req.usuario.role !== 'ADMIN' && req.usuario.empresaId !== empresaId) {
      return res.status(403).json({ erro: 'Acesso negado para esta empresa' });
    }

    const where = { empresaId };

    if (data) {
      const inicio = new Date(data);
      const fim = new Date(data);
      fim.setDate(fim.getDate() + 1);
      where.createdAt = { gte: inicio, lt: fim };
    }

    const pedidos = await prisma.pedidoEmpresa.findMany({
      where,
      include: { lotes: true, empresa: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(pedidos);
  } catch (err) {
    console.error('Erro ao listar pedidos:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

async function listarTodos(req, res) {
  try {
    const { status, empresaId, data } = req.query;
    const where = {};

    if (status) where.status = status;
    if (empresaId) where.empresaId = parseInt(empresaId, 10);
    if (data) {
      const inicio = new Date(data);
      const fim = new Date(data);
      fim.setDate(fim.getDate() + 1);
      where.createdAt = { gte: inicio, lt: fim };
    }

    const pedidos = await prisma.pedidoEmpresa.findMany({
      where,
      include: { lotes: true, empresa: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(pedidos);
  } catch (err) {
    console.error('Erro ao listar pedidos:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

async function autorizar(req, res) {
  try {
    const { id } = req.params;
    const pedido = await prisma.pedidoEmpresa.update({
      where: { id: parseInt(id, 10) },
      data: { status: 'AUTORIZADO' },
      include: { lotes: true, empresa: true }
    });
    res.json(pedido);
  } catch (err) {
    console.error('Erro ao autorizar pedido:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

async function marcarImpresso(req, res) {
  try {
    const { id } = req.params;
    const pedido = await prisma.pedidoEmpresa.update({
      where: { id: parseInt(id, 10) },
      data: { status: 'IMPRESSO', impresso: true },
      include: { lotes: true, empresa: true }
    });
    res.json(pedido);
  } catch (err) {
    console.error('Erro ao marcar impresso:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

async function deletar(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ erro: 'Pedido invalido' });
    }

    const pedidoExistente = await prisma.pedidoEmpresa.findUnique({ where: { id } });
    if (!pedidoExistente) {
      return res.status(404).json({ erro: 'Pedido nao encontrado' });
    }

    await prisma.pedidoEmpresa.delete({ where: { id } });
    return res.sendStatus(204);
  } catch (err) {
    console.error('Erro ao deletar pedido empresa:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

async function historico(req, res) {
  try {
    const { empresaId, semana, mes, dataInicio, dataFim } = req.query;
    const where = {};

    if (empresaId) where.empresaId = parseInt(empresaId, 10);

    if (dataInicio || dataFim) {
      const inicioPeriodo = dataInicio ? parseDataLocal(dataInicio) : null;
      const fimPeriodo = dataFim ? parseDataLocal(dataFim) : null;

      if ((dataInicio && !inicioPeriodo) || (dataFim && !fimPeriodo)) {
        return res.status(400).json({ erro: 'Datas invalidas para o filtro do historico' });
      }

      const createdAt = {};
      if (inicioPeriodo) {
        createdAt.gte = inicioPeriodo;
      }
      if (fimPeriodo) {
        const fimExclusivo = new Date(fimPeriodo);
        fimExclusivo.setDate(fimExclusivo.getDate() + 1);
        createdAt.lt = fimExclusivo;
      }

      where.createdAt = createdAt;
    }

    if (!where.createdAt && semana) {
      const inicioSemana = new Date(semana);
      const fimSemana = new Date(semana);
      fimSemana.setDate(fimSemana.getDate() + 7);
      where.createdAt = { gte: inicioSemana, lt: fimSemana };
    } else if (!where.createdAt && mes) {
      const [ano, mesNum] = mes.split('-');
      const inicioMes = new Date(parseInt(ano, 10), parseInt(mesNum, 10) - 1, 1);
      const fimMes = new Date(parseInt(ano, 10), parseInt(mesNum, 10), 1);
      where.createdAt = { gte: inicioMes, lt: fimMes };
    }

    const pedidos = await prisma.pedidoEmpresa.findMany({
      where,
      select: {
        id: true,
        createdAt: true,
        status: true,
        lotes: {
          select: {
            quantidade: true
          }
        },
        empresa: {
          select: {
            id: true,
            nome: true,
            valorMarmita: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const porEmpresa = {};
    pedidos.forEach((p) => {
      const empresaId = String(p.empresa.id);
      if (!porEmpresa[empresaId]) {
        porEmpresa[empresaId] = {
          empresaId: p.empresa.id,
          nomeEmpresa: p.empresa.nome,
          valorMarmita: Number(p.empresa.valorMarmita || 0),
          total: 0,
          totalValor: 0,
          pedidos: []
        };
      }

      const qtd = p.lotes.reduce((s, l) => s + l.quantidade, 0);
      porEmpresa[empresaId].total += qtd;
      porEmpresa[empresaId].totalValor = Number(
        (porEmpresa[empresaId].total * porEmpresa[empresaId].valorMarmita).toFixed(2)
      );
      porEmpresa[empresaId].pedidos.push({
        id: p.id,
        createdAt: p.createdAt,
        status: p.status,
        lotes: p.lotes
      });
    });

    res.json(porEmpresa);
  } catch (err) {
    console.error('Erro ao buscar historico:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

module.exports = { criar, listarPorEmpresa, listarTodos, autorizar, marcarImpresso, deletar, historico };
