const express = require('express');
const router = express.Router();
const { login, registrar, perfil } = require('../controllers/authController');
const { autenticar, apenasAdmin } = require('../middleware/auth');

router.post('/login', login);
router.post('/registrar', autenticar, apenasAdmin, registrar);
router.get('/perfil', autenticar, perfil);

module.exports = router;
