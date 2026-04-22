const express = require('express');
const router = express.Router();
const {
  criar,
  listarTodos,
  atualizarStatus,
  marcarImpresso,
  webhookMercadoPago,
  statusMercadoPago
} = require('../controllers/pedidoAvulsoController');
const { autenticar, apenasAdmin } = require('../middleware/auth');

// Publico
router.get('/mercado-pago/status', statusMercadoPago);
router.post('/', criar);
router.post('/webhook', webhookMercadoPago);

// Admin
router.get('/', autenticar, apenasAdmin, listarTodos);
router.put('/:id/status', autenticar, apenasAdmin, atualizarStatus);
router.put('/:id/imprimir', autenticar, apenasAdmin, marcarImpresso);

module.exports = router;
