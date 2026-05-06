const express = require('express');
const router = express.Router();
const { criar, listarPorEmpresa, listarTodos, autorizar, marcarImpresso, deletar, historico } = require('../controllers/pedidoEmpresaController');
const { autenticar, apenasAdmin } = require('../middleware/auth');

// Funcionário empresa
router.post('/', autenticar, criar);
router.get('/empresa/:empresaId', autenticar, listarPorEmpresa);

// Admin
router.get('/', autenticar, apenasAdmin, listarTodos);
router.put('/:id/autorizar', autenticar, apenasAdmin, autorizar);
router.put('/:id/imprimir', autenticar, apenasAdmin, marcarImpresso);
router.delete('/:id', autenticar, apenasAdmin, deletar);
router.get('/historico', autenticar, apenasAdmin, historico);

module.exports = router;
