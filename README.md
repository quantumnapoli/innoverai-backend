# 🚀 INNOVERAI Backend - API + Dashboard

Express.js backend con dashboard integrata, autenticazione JWT, integrazione Retell AI, e database PostgreSQL.

## 📋 Struttura

```
innoverai-backend/
├── server.js                 # Express server principale
├── package.json              # Dependencies
├── migrations/
│   ├── 001_create_calls_table.sql      # Schema database
│   └── 002_add_call_summaries.sql      # Call summaries columns
├── scripts/
│   ├── import_retell.sh      # Import dati da Retell
│   ├── sync_retell.js        # Sync script
│   └── update_summaries_from_retell.sh # Patch summaries
├── public/                   # Dashboard statica
│   ├── index.html           # Dashboard main page
│   ├── login.html           # Login page
│   ├── config.js            # Client config
│   ├── js/
│   │   ├── dashboard.js     # Dashboard logic
│   │   ├── charts.js        # Chart.js integration
│   │   ├── retell-connector.js
│   │   ├── utils.js         # Utility functions
│   │   └── ...
│   ├── css/
│   │   └── style.css        # Styles
│   └── assets/              # Loghi
├── node_modules/            # Dependencies installed
└── .gitignore              # Git ignore rules
```

## ✨ Caratteristiche

- **Express.js REST API** - Endpoints per autenticazione, chiamate, dati
- **JWT Authentication** - Secure token-based auth
- **PostgreSQL Database** - Data persistence con migrations
- **Dashboard Integrata** - Servita da `/` quando `SERVE_STATIC=true`
- **Retell AI Integration** - Sync automatico chiamate da Retell
- **CSP Headers** - Content Security Policy configurabile
- **CORS** - Cross-origin resource sharing configurato

## 🛠️ Setup Locale

### Prerequisiti

- Node.js 14+
- PostgreSQL 12+ (oppure Docker)
- npm o yarn

### Installazione

```bash
# Clona il repo
git clone https://github.com/quantumnapoli/innoverai-backend.git
cd innoverai-backend

# Installa dipendenze
npm install

# Crea .env (vedi sotto)
cat > .env << 'EOF'
NODE_ENV=development
PORT=8080
JWT_SECRET=dev_secret_change_in_production
DATABASE_URL=postgresql://postgres:password@localhost:5432/innoverai
SERVE_STATIC=true
EOF

# Start server
npm start
```

### Setup Database con Docker

```bash
# Start PostgreSQL container
docker run --name innoverai-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=innoverai \
  -p 5432:5432 \
  -d postgres:14

# Run migrations
psql postgresql://postgres:password@localhost:5432/innoverai < migrations/001_create_calls_table.sql
psql postgresql://postgres:password@localhost:5432/innoverai < migrations/002_add_call_summaries.sql
```

## 🔑 Environment Variables

| Variabile | Valore | Note |
|-----------|--------|------|
| `NODE_ENV` | `production` \| `development` | Mode |
| `PORT` | `8080` | Server port |
| `JWT_SECRET` | `your-secret-key` | JWT signing secret |
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection |
| `SERVE_STATIC` | `true` \| `false` | Serve dashboard from `/` |
| `RETELL_API_KEY` | `key_...` | Retell AI API key |
| `CSP_CONNECT_SRC` | `https://...` | CSP connect-src directive |

## 📡 API Endpoints

### Authentication

```bash
# Login
POST /api/login
Content-Type: application/json

{
  "username": "marco",
  "password": "esposito2025"
}

# Response
{
  "token": "eyJhbGc...",
  "user": { "username": "marco", "role": "client", "agent_id": "agent_..." }
}
```

### Calls

```bash
# Get all calls (with JWT auth)
GET /api/calls?limit=100
Authorization: Bearer <token>

# Response
[
  {
    "id": 1,
    "call_id": "call_...",
    "from_number": "+39...",
    "to_number": "+39...",
    "start_time": "2025-10-26T12:00:00Z",
    "end_time": "2025-10-26T12:03:00Z",
    "duration_seconds": 180,
    "status": "completed",
    "call_summary": "...",
    "detailed_call_summary": "...",
    "retell_transcript": "..."
  }
]
```

### Sync

```bash
# Manual sync from Retell
POST /api/sync-retell
Authorization: Bearer <token>

# Response
{
  "message": "Synced X calls from Retell",
  "synced": 42
}
```

### Health

```bash
# Health check
GET /health

# Response
{
  "status": "ok",
  "uptime": 12345
}
```

## 🚀 Deployment su Railway

### 1. Crea Progetto

```bash
# Effettua login a Railway
railway login

# Crea nuovo progetto collegato a GitHub
railway init
# Seleziona quantumnapoli/innoverai-backend
```

### 2. Configura Variabili di Ambiente

```bash
railway variables set NODE_ENV production
railway variables set SERVE_STATIC true
railway variables set JWT_SECRET your-production-secret-key-here
```

### 3. Collega PostgreSQL

```bash
# Aggiungi PostgreSQL al progetto
railway add
# Seleziona PostgreSQL

# Railway automaticamente imposta DATABASE_URL
```

### 4. Deploy

```bash
# Push ai repo automaticamente avvia deploy
git push origin main

# Oppure deploy manuale
railway deploy
```

### 5. Configurazione Dominio

Vai su Railway dashboard:
1. Seleziona il servizio backend
2. Settings → Domain
3. Aggiungi dominio custom: `api.innoverai.com` o `dashboard.innoverai.com`

## 📊 Database Schema

### calls table

```sql
CREATE TABLE calls (
  id SERIAL PRIMARY KEY,
  call_id TEXT UNIQUE NOT NULL,
  retell_call_id TEXT UNIQUE,
  agent_id TEXT,
  from_number TEXT,
  to_number TEXT,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  duration_seconds INT,
  status TEXT,
  call_summary TEXT,
  detailed_call_summary TEXT,
  retell_transcript TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔄 Import Dati da Retell

### Script Import

```bash
# Imposta credenziali
export RETELL_API_KEY="key_..."
export DATABASE_URL="postgresql://..."

# Importa tutte le chiamate
chmod +x scripts/import_retell.sh
./scripts/import_retell.sh
```

### Sync Automatico

Durante login, il backend automaticamente sincronizza le chiamate dell'utente da Retell.

## 🔐 Sicurezza

### JWT Tokens

- **Scadenza**: 24 ore
- **Secret**: Memorizzato in `JWT_SECRET`
- **Algoritmo**: HS256

### CORS

Origins consentiti:
- `https://innoverai.com`
- `https://dashboard.innoverai.com`
- `https://api.innoverai.com`
- `http://localhost:8000`
- `http://localhost:8080`

### Content Security Policy

```
default-src 'self'
script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
connect-src 'self' https://api.retellai.com
```

## 🧪 Testing Locale

### Test API

```bash
# Health check
curl http://localhost:8080/health

# Login
curl -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"demo"}'

# Get calls (con token)
curl http://localhost:8080/api/calls \
  -H "Authorization: Bearer <token>"
```

### Test Dashboard

Apri browser a `http://localhost:8080`

## 🐛 Troubleshooting

### Port already in use

```bash
# Trova processo su porta 8080
lsof -i :8080

# Kill processo
kill -9 <PID>

# Oppure usa porta diversa
PORT=8081 npm start
```

### Database connection error

```bash
# Verifica DATABASE_URL
echo $DATABASE_URL

# Test connessione
psql $DATABASE_URL -c "SELECT NOW();"
```

### Dashboard non carica

```bash
# Verifica SERVE_STATIC
echo $SERVE_STATIC

# Assicurati che public/index.html esiste
test -f public/index.html && echo "EXISTS" || echo "MISSING"
```

## 📝 Git Workflow

```bash
# Crea branch per feature
git checkout -b feat/new-feature

# Fai cambiamenti e commit
git add .
git commit -m "feat: description"

# Push a GitHub
git push origin feat/new-feature

# Crea Pull Request e mergia a main
# Railway automaticamente fa deploy
```

## 🔗 Link Importante

- **Backend Repo**: https://github.com/quantumnapoli/innoverai-backend
- **Frontend Repo**: https://github.com/quantumnapoli/innoverai
- **API Live**: https://innoverai-backend-production.up.railway.app
- **Dashboard Live**: https://dashboard.innoverai.com
- **Landing Page**: https://innoverai.com

## ✅ Checklist Pre-Launch

- [ ] Database migrations executed
- [ ] JWT_SECRET configurato in production
- [ ] RETELL_API_KEY impostata
- [ ] CORS origins configurati
- [ ] CSP headers corretti
- [ ] Health endpoint test
- [ ] Login test
- [ ] Calls endpoint test
- [ ] Dashboard carica correttamente
- [ ] Retell sync funziona

## 📞 Support

Per problemi o domande:
1. Controlla i log di Railway
2. Verifica le variabili di ambiente
3. Testa localmente con npm start
4. Consulta la documentazione Retell AI

---

✨ **Backend Ready for Production!**


