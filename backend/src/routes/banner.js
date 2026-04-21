const express = require('express');
const router = express.Router();
const { listarAtivos, listarTodos, criar, atualizar, deletar } = require('../controllers/bannerController');
const { autenticar, apenasAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Público
router.get('/', listarAtivos);

// Admin
router.get('/todos', autenticar, apenasAdmin, listarTodos);
router.post('/', autenticar, apenasAdmin, upload.single('imagem'), criar);
router.put('/:id', autenticar, apenasAdmin, upload.single('imagem'), atualizar);
router.delete('/:id', autenticar, apenasAdmin, deletar);

module.exports = router;
