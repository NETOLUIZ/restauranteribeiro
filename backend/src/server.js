require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const cardapioRoutes = require('./routes/cardapio');
const pedidoAvulsoRoutes = require('./routes/pedidoAvulso');
const pedidoEmpresaRoutes = require('./routes/pedidoEmpresa');
const empresaRoutes = require('./routes/empresa');
const bannerRoutes = require('./routes/banner');
const marmitaCardRoutes = require('./routes/marmitaCard');
const dashboardRoutes = require('./routes/dashboard');
const aiOrderRoutes = require('./routes/aiOrderRoutes');
const selfServiceRoutes = require('./routes/selfService');
const controleDiarioRoutes = require('./routes/controleDiario');
const { webhookMercadoPago } = require('./controllers/pedidoAvulsoController');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
const frontendUrlsEnv = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

const allowedOrigins = new Set();

function registrarOrigem(origem) {
  const valor = String(origem || '').trim();
  if (!valor) return;
  allowedOrigins.add(valor);

  try {
    const url = new URL(valor);
    const { protocol, hostname, port } = url;
    if (!hostname) return;

    const hostAlternativo = hostname.startsWith('www.')
      ? hostname.slice(4)
      : `www.${hostname}`;

    const porta = port ? `:${port}` : '';
    allowedOrigins.add(`${protocol}//${hostAlternativo}${porta}`);
  } catch {
    // Ignora origem invalida de configuracao.
  }
}

frontendUrlsEnv.forEach(registrarOrigem);
[
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5175'
].forEach(registrarOrigem);

app.use(cors({
  origin(origin, callback) {
    // Permite chamadas sem Origin (curl, server-to-server) e os origins permitidos
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    // Para origem nao autorizada, nao quebra API com 500; o navegador bloqueia pelo CORS.
    return callback(null, false);
  },
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cardapio', cardapioRoutes);
app.use('/api/pedidos-avulsos', pedidoAvulsoRoutes);
app.use('/api/pedidos-empresa', pedidoEmpresaRoutes);
app.use('/api/empresas', empresaRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/marmitas', marmitaCardRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai-order', aiOrderRoutes);
app.use('/api/self-service', selfServiceRoutes);
app.use('/api/controle-diario', controleDiarioRoutes);
app.post('/api/webhook/mercadopago', webhookMercadoPago);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🍽️  Ribeiro Restaurante API rodando na porta ${PORT}`);
});
