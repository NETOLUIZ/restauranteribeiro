const express = require('express');
const router = express.Router();
const {
  listar,
  criar,
  atualizar,
  excluir,
  adicionarFuncionario,
  removerFuncionario,
  listarFuncionariosMinhaEmpresa,
  salvarFuncionarioMinhaEmpresa
} = require('../controllers/empresaController');
const { autenticar, apenasAdmin } = require('../middleware/auth');

router.get('/minha/funcionarios', autenticar, listarFuncionariosMinhaEmpresa);
router.post('/minha/funcionarios', autenticar, salvarFuncionarioMinhaEmpresa);
router.get('/', autenticar, apenasAdmin, listar);
router.post('/', autenticar, apenasAdmin, criar);
router.put('/:id', autenticar, apenasAdmin, atualizar);
router.delete('/:id', autenticar, apenasAdmin, excluir);
router.post('/:id/funcionarios', autenticar, apenasAdmin, adicionarFuncionario);
router.delete('/:id/funcionarios/:funcId', autenticar, apenasAdmin, removerFuncionario);

module.exports = router;
