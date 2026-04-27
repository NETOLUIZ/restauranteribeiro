const express = require('express');
const { autenticar, apenasAdmin } = require('../middleware/auth');
const audioUpload = require('../middleware/audioUpload');
const { organizarTexto, transcreverAudio } = require('../controllers/aiOrderController');

const router = express.Router();

router.use(autenticar, apenasAdmin);

router.post('/text', organizarTexto);
router.post('/audio', audioUpload.single('audio'), transcreverAudio);

module.exports = router;
