# BL-CRM

A multi-tenant SaaS CRM/ERP platform built for import-export businesses. Manage parties, invoices, inventory, trade documents, HR, sales, and more — all in one place.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, TypeScript, Tailwind v4, Zustand |
| Backend | Node.js 20, Express 5, TypeScript, Prisma v5 |
| Database | PostgreSQL 16 |
| Auth | JWT (access + refresh tokens), bcrypt |
| Email | Nodemailer (SMTP) |
| Deployment | Docker + nginx |

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- PostgreSQL 16 running locally
- npm 9+

### 1. Clone and install

```bash
git clone <repo-url>
cd BL-CRM

# Install backend deps
cd backend && npm install && cd ..

# Install frontend deps
cd frontend && npm install && cd ..
```

### 2. Configure backend environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
- Set `DATABASE_URL` to your local PostgreSQL connection string
- Generate JWT secrets:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- Set SMTP credentials if you want email to work (optional for local dev)

### 3. Set up the database

```bash
cd backend
npx prisma migrate dev      # runs migrations + generates Prisma client
npx prisma db seed          # optional: seed demo data
cd ..
```

### 4. Start development servers

Open two terminals:

```bash
# Terminal 1 — Backend (runs on :5000)
cd backend && npm run dev

# Terminal 2 — Frontend (runs on :5173, proxies /api to :5000)
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Production Deployment (Docker)

### Prerequisites
- Docker Engine 24+
- Docker Compose v2+

### 1. Set environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
POSTGRES_PASSWORD=your_strong_db_password

# Generate each secret with:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=<64-char random hex>
JWT_REFRESH_SECRET=<different 64-char random hex>

FRONTEND_URL=https://yourdomain.com   # or http://your-server-ip
APP_PORT=80                            # or 443 if using SSL termination

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your_gmail_app_password
EMAIL_FROM=BL-CRM <noreply@yourdomain.com>
```

> **Gmail App Password**: Go to Google Account → Security → 2-Step Verification → App Passwords. Generate one for "Mail".

### 2. Build and start

```bash
docker compose up -d --build
```

This starts:
- `blcrm-db` — PostgreSQL on internal network
- `blcrm-api` — Express API (auto-runs `prisma migrate deploy` on start)
- `blcrm-web` — nginx serving the React frontend + proxying `/api` to backend

### 3. Verify everything is running

```bash
docker compose ps
docker compose logs backend   # check for "Server running on port 5000"
curl http://localhost/api/health
```

Expected health response:
```json
{ "status": "ok", "db": "connected", "uptime": 12.3 }
```

### 4. Create your first account

1. Open `http://your-server-ip` in a browser
2. Click **Register** and create a user account
3. Create your organization when prompted
4. Enable modules from **Settings → Modules**

---

## Updating

```bash
git pull
docker compose up -d --build
```

Migrations run automatically when the backend container restarts.

---

## Deployment with SSL (HTTPS)

For production with a domain name, add nginx reverse proxy + Let's Encrypt in front of the Docker stack.

**Option A — Nginx Proxy Manager (easiest)**

1. Add [Nginx Proxy Manager](https://nginxproxymanager.com/) as an additional Docker service
2. Point your domain's A record to your server IP
3. Create a proxy host: domain → `blcrm-web:80`, enable SSL with Let's Encrypt

**Option B — Certbot on host**

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Change APP_PORT to 8080 in .env to free up port 80
# Add nginx vhost that proxies to localhost:8080
sudo certbot --nginx -d yourdomain.com
```

---

## Backup & Restore

### Backup database

```bash
docker exec blcrm-db pg_dump -U postgres blcrm > backup-$(date +%Y%m%d).sql
```

### Restore database

```bash
cat backup-20260101.sql | docker exec -i blcrm-db psql -U postgres -d blcrm
```

---

## Architecture Overview

```
Browser
  │
  ▼
nginx (port 80)
  ├── /api/*  → proxy → Express backend (:5000)
  └── /*      → React SPA (static files)
                    │
              Prisma ORM
                    │
               PostgreSQL
```

### Multi-tenancy

Every resource in the database has an `organizationId` column. The backend middleware (`requireOrgContext`) reads the `x-organization-id` header from every request and enforces that queries only return data belonging to that organization. Users can belong to multiple organizations and switch between them.

### Auth Flow

1. Register / Login → receive `accessToken` (15m) + `refreshToken` (7d)
2. Access token sent as `Authorization: Bearer <token>` header
3. Refresh token stored in DB; used to rotate tokens silently
4. Logout revokes the refresh token in DB

---

## Modules

| Module | Description |
|---|---|
| CRM | Parties (customers/suppliers), contacts, communications |
| Finance | Invoices, purchase bills, credit notes, payments |
| Inventory | Products, stock, warehouse management |
| Sales | Sales orders, pipeline |
| Purchase | Purchase orders |
| HR | Employees, attendance, payroll, leaves |
| Projects | Projects and tasks |
| Trade | Import/export documents, LC, BL, certificates |
| Support | Customer support tickets |
| Reports | Cross-module CSV exports and KPI summaries |

Modules can be enabled/disabled per organization from **Settings → Modules**.

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `PORT` | No | API port (default: 5000) |
| `NODE_ENV` | No | `development` or `production` |
| `JWT_ACCESS_SECRET` | Yes | Secret for signing access tokens (64+ chars) |
| `JWT_REFRESH_SECRET` | Yes | Secret for signing refresh tokens (64+ chars, different) |
| `JWT_ACCESS_EXPIRES_IN` | No | Access token TTL (default: 15m) |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh token TTL (default: 7d) |
| `FRONTEND_URL` | Yes | Allowed CORS origin(s), comma-separated |
| `SMTP_HOST` | No | SMTP server hostname |
| `SMTP_PORT` | No | 587 (STARTTLS) or 465 (SSL) |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASS` | No | SMTP password / app password |
| `EMAIL_FROM` | No | Sender display name + address |

### Docker Compose (`.env` at project root)

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_PASSWORD` | changeme | PostgreSQL password |
| `JWT_ACCESS_SECRET` | — | Must be set |
| `JWT_REFRESH_SECRET` | — | Must be set |
| `FRONTEND_URL` | http://localhost | Public app URL |
| `APP_PORT` | 80 | Host port for the web container |
| `SMTP_*` / `EMAIL_FROM` | — | Email config (optional) |

---

## Troubleshooting

**Backend container keeps restarting**
```bash
docker compose logs backend
```
Most likely cause: `DATABASE_URL` is wrong or JWT secrets are missing.

**"Cannot connect to database" in health check**
```bash
docker compose logs postgres
```
The database may still be initializing. Wait 10–15s and try again.

**Emails not sending**
- Check `SMTP_*` values in `.env`
- For Gmail, ensure you're using an **App Password**, not your account password
- Check `docker compose logs backend | grep -i smtp`

**Port 80 already in use**
Set `APP_PORT=8080` in `.env` and access the app on `http://your-ip:8080`.

**Reset everything (destructive)**
```bash
docker compose down -v   # removes containers AND the postgres_data volume
docker compose up -d --build
```
