const express = require('express');
const router = express.Router();
const { resumo } = require('../controllers/dashboardController');
const { autenticar, apenasAdmin } = require('../middleware/auth');

router.get('/', autenticar, apenasAdmin, resumo);

module.exports = router;
