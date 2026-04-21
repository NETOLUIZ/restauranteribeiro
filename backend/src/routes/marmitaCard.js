const express = require('express');
const router = express.Router();
const { listarAtivos, listarTodos, salvarPorTamanho } = require('../controllers/marmitaCardController');
const { autenticar, apenasAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', listarAtivos);
router.get('/todos', autenticar, apenasAdmin, listarTodos);
router.put('/:tamanho', autenticar, apenasAdmin, upload.single('imagem'), salvarPorTamanho);

module.exports = router;
