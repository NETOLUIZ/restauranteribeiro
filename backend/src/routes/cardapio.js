const express = require('express');
const router = express.Router();
const { listarAtivos, listarTodos, criar, atualizar, deletar } = require('../controllers/cardapioController');
const { autenticar, apenasAdmin } = require('../middleware/auth');

// Público
router.get('/', listarAtivos);

// Admin
router.get('/todos', autenticar, apenasAdmin, listarTodos);
router.post('/', autenticar, apenasAdmin, criar);
router.put('/:id', autenticar, apenasAdmin, atualizar);
router.delete('/:id', autenticar, apenasAdmin, deletar);

module.exports = router;
