# 🍽️ Restaurante Ribeiro

Sistema web responsivo para gerenciamento de pedidos avulsos e empresariais.

## Tecnologias

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Banco de Dados**: PostgreSQL + Prisma ORM
- **Pagamentos**: Mercado Pago API
- **Autenticação**: JWT

## Estrutura do Projeto

```
ribeirorestaurante/
├── backend/          # API REST (Express + Prisma)
├── frontend/         # SPA React (Vite)
└── README.md
```

## Como Rodar

### 1. Pré-requisitos

- Node.js 18+
- PostgreSQL instalado e rodando

### 2. Backend

```bash
cd backend

# Configurar banco de dados
# Edite o arquivo .env com suas credenciais do PostgreSQL

# Instalar dependências
npm install

# Gerar o Prisma Client (obrigatório)
npx prisma generate

# Gerar o Prisma Client e criar as tabelas
npx prisma db push

# Popular o banco com dados iniciais
node prisma/seed.js

# Iniciar o servidor
npm run dev
```

#### Variáveis de ambiente importantes (backend/.env)

- `DATABASE_URL`: conexão PostgreSQL
- `JWT_SECRET`: segredo do token JWT
- `FRONTEND_URL`: URL do frontend em produção
- `MERCADO_PAGO_ACCESS_TOKEN`: token da conta Mercado Pago
- `MERCADO_PAGO_WEBHOOK_URL`: URL pública do webhook (`https://SEU_DOMINIO/api/pedidos-avulsos/webhook`)
- `PEDIDO_AVULSO_VALOR_UNITARIO`: valor unitário da refeição avulsa (ex.: `18.5`)

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend estará em `http://localhost:5173` e o backend em `http://localhost:3001`.

## Acesso

### Admin
- **E-mail**: admin@ribeirorestaurante.com
- **Senha**: admin123

### Funcionário Empresa (teste)
- **E-mail**: funcionario@empresa.com
- **Senha**: func123

## Funcionalidades

- 🏠 Landing page com carrossel e cardápio do dia
- 🛒 Pedidos avulsos (Pix, Crédito, Débito, Dinheiro)
- 🏢 Pedidos empresariais em lote
- 📊 Painel administrativo completo
- 🖨️ Sistema de impressão de comandas individuais
- 💰 Controle de pagamentos em dinheiro (motoqueiro + troco)
- 📱 100% responsivo (mobile-first)
