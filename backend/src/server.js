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

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🍽️  Ribeiro Restaurante API rodando na porta ${PORT}`);
});
