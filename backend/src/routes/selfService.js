const express = require('express');
const {
  criar,
  listar,
  marcarComoRetirado,
  statusPagamentoPublico,
  statusMercadoPago,
  webhookMercadoPago
} = require('../controllers/selfServiceController');
const { autenticar, apenasAdmin } = require('../middleware/auth');

const router = express.Router();

// Publico
router.get('/mercado-pago/status', statusMercadoPago);
router.get('/:id/status-pagamento', statusPagamentoPublico);
router.post('/', criar);
router.post('/webhook', webhookMercadoPago);
router.post('/webhook/mercadopago', webhookMercadoPago);

// Admin
router.get('/', autenticar, apenasAdmin, listar);
router.put('/:id/retirar', autenticar, apenasAdmin, marcarComoRetirado);

module.exports = router;
