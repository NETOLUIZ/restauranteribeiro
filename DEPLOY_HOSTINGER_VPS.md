# Deploy na Hostinger VPS (do zero)

Este guia publica o projeto completo (frontend + backend + PostgreSQL) em uma VPS Ubuntu da Hostinger.

## 1) Pré-requisitos na Hostinger

- VPS ativa com Ubuntu 22.04+.
- Domínio apontado para o IP da VPS (`A` para `@` e `www`).
- Repositório no GitHub:
  - `https://github.com/NETOLUIZ/restauranteribeiro.git`

## 2) Acessar VPS e preparar sistema

```bash
ssh root@SEU_IP_DA_VPS
apt update && apt upgrade -y
apt install -y curl git nginx postgresql postgresql-contrib
```

## 3) Instalar Node.js 22 + PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g pm2
node -v
npm -v
```

## 4) Criar banco PostgreSQL

```bash
sudo -u postgres psql
```

No `psql`:

```sql
CREATE DATABASE ribeiro_restaurante;
CREATE USER ribeiro_user WITH ENCRYPTED PASSWORD 'TROQUE_POR_SENHA_FORTE';
GRANT ALL PRIVILEGES ON DATABASE ribeiro_restaurante TO ribeiro_user;
\q
```

## 5) Clonar projeto e instalar dependências

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/NETOLUIZ/restauranteribeiro.git
cd ribeirorestaurante

cd backend && npm ci && cd ..
cd frontend && npm ci && cd ..
```

## 6) Configurar variáveis de ambiente

Backend:

```bash
cp /var/www/ribeirorestaurante/backend/.env.example /var/www/ribeirorestaurante/backend/.env
nano /var/www/ribeirorestaurante/backend/.env
```

Preencher no `backend/.env`:

- `DATABASE_URL=postgresql://ribeiro_user:SUA_SENHA@127.0.0.1:5432/ribeiro_restaurante`
- `JWT_SECRET=<segredo forte>`
- `PORT=3001`
- `MERCADO_PAGO_ACCESS_TOKEN=<token real>`
- `FRONTEND_URL=https://seudominio.com`
- `MERCADO_PAGO_WEBHOOK_URL=https://seudominio.com/api/pedidos-avulsos/webhook`
- `PEDIDO_AVULSO_VALOR_UNITARIO=24.9`

Frontend:

```bash
cp /var/www/ribeirorestaurante/frontend/.env.example /var/www/ribeirorestaurante/frontend/.env
nano /var/www/ribeirorestaurante/frontend/.env
```

Preencher no `frontend/.env`:

- `VITE_API_URL=https://seudominio.com/api`
- `VITE_WHATSAPP_NUMERO=5585996586824`

## 7) Migrar banco e seed

```bash
cd /var/www/ribeirorestaurante/backend
npx prisma generate
npx prisma db push
node prisma/seed.js
```

## 8) Build do frontend

```bash
cd /var/www/ribeirorestaurante/frontend
npm run build
```

## 9) Subir backend com PM2

```bash
cd /var/www/ribeirorestaurante/backend
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd
```

Copie e rode o comando final que o PM2 mostrar na tela (como root) para iniciar no boot.

## 10) Configurar Nginx (frontend + proxy API)

```bash
cp /var/www/ribeirorestaurante/deploy/nginx/ribeirorestaurante.conf /etc/nginx/sites-available/ribeirorestaurante.conf
nano /etc/nginx/sites-available/ribeirorestaurante.conf
```

Trocar `server_name seudominio.com www.seudominio.com;` para seu domínio real.

Ativar site:

```bash
ln -s /etc/nginx/sites-available/ribeirorestaurante.conf /etc/nginx/sites-enabled/ribeirorestaurante.conf
nginx -t
systemctl reload nginx
```

## 11) SSL (Let's Encrypt)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d seudominio.com -d www.seudominio.com
```

Testar renovação automática:

```bash
certbot renew --dry-run
```

## 12) Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status
```

## 13) Validação final

```bash
curl -I https://seudominio.com
curl https://seudominio.com/api/health
pm2 status
pm2 logs ribeiro-backend --lines 100
```

Se estiver tudo certo:

- Home abre no domínio.
- `/api/health` retorna `{"status":"ok"...}`.
- Login admin funciona.
- Login empresa funciona.

## 14) Atualização de versão (deploy contínuo manual)

```bash
cd /var/www/ribeirorestaurante
git pull origin main

cd backend
npm ci
npx prisma generate
npx prisma db push
pm2 restart ribeiro-backend

cd ../frontend
npm ci
npm run build

systemctl reload nginx
```
