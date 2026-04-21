const express = require('express');
const router = express.Router();
const { listar, criar, atualizar, adicionarFuncionario, removerFuncionario } = require('../controllers/empresaController');
const { autenticar, apenasAdmin } = require('../middleware/auth');

router.get('/', autenticar, apenasAdmin, listar);
router.post('/', autenticar, apenasAdmin, criar);
router.put('/:id', autenticar, apenasAdmin, atualizar);
router.post('/:id/funcionarios', autenticar, apenasAdmin, adicionarFuncionario);
router.delete('/:id/funcionarios/:funcId', autenticar, apenasAdmin, removerFuncionario);

module.exports = router;
