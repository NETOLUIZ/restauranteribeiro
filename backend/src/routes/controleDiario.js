const express = require('express');
const router = express.Router();
const {
  obterPorData,
  obterMaisRecente,
  salvar
} = require('../controllers/controleDiarioController');
const { autenticar, apenasAdmin } = require('../middleware/auth');

router.get('/mais-recente', obterMaisRecente);
router.get('/:data', obterPorData);
router.put('/:data', autenticar, apenasAdmin, salvar);

module.exports = router;
