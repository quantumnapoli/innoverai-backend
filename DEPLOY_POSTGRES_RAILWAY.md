# 🚀 Deploy Backend con PostgreSQL su Railway - Guida Veloce

## 🎯 Passi Rapidissimi (5 minuti)

### 1️⃣ **Aggiungi PostgreSQL al tuo progetto Railway**

1. Vai su **Railway Dashboard**: https://railway.app/dashboard
2. Apri il tuo progetto (quello con il frontend già deployato)
3. Click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
4. Railway crea automaticamente il database e la variabile `DATABASE_URL` ✅

### 2️⃣ **Crea il Service Backend**

1. Nello stesso progetto → Click **"+ New"** → **"GitHub Repo"**
2. Scegli il repo: `quantumnapoli/innoverai`
3. Railway crea un nuovo service

### 3️⃣ **Configura il Service Backend**

1. Click sul service appena creato
2. **Settings** → **Source**:
   - **Root Directory**: `server` ⚠️ IMPORTANTE
   - **Start Command**: `npm start` (dovrebbe rilevarlo auto)
3. **Settings** → **Variables** → Aggiungi:
   ```
   JWT_SECRET=your_super_secret_jwt_key_12345678901234567890
   PORT=8080
   ```
   ⚠️ **Nota**: `DATABASE_URL` viene aggiunto automaticamente da Railway quando colleghi il database!

### 4️⃣ **Collega Database al Backend**

1. Nel tuo progetto Railway, dovresti vedere:
   - 📦 **Service Frontend** (già deployato)
   - 📦 **Service Backend** (nuovo)
   - 🗄️ **PostgreSQL** (database)
2. Vai sul **Service Backend**
3. Tab **"Variables"** → Verifica che ci sia `DATABASE_URL` (Railway lo aggiunge auto)
4. Se non c'è:
   - Click **"+ New Variable"** → **"Add Reference"**
   - Scegli: PostgreSQL → `DATABASE_URL`

### 5️⃣ **Deploy & Verifica**

Railway fa il deploy automaticamente. Verifica:

1. **Logs del backend**:
   - Service Backend → **Deployments** → Click sull'ultimo deploy → **View Logs**
   - Dovresti vedere:
     ```
     ✅ Database tables initialized
     Created/Updated user demo
     Created/Updated user admin  
     Created/Updated user marco
     🚀 Server listening on port 8080
     ```

2. **Ottieni URL del backend**:
   - Service Backend → **Settings** → **Networking**
   - Copia il dominio (es: `backend-production-xxxx.up.railway.app`)

3. **Testa Health Endpoint**:
   ```bash
   curl https://your-backend-url.up.railway.app/health
   ```
   Risposta: `{"ok":true}` ✅

---

## 🔗 Aggiorna Frontend con URL Backend

### Modifica `dashboard/login.html` linea 103:

```javascript
: 'https://YOUR-BACKEND-URL.up.railway.app';
```

**Commit & Push**:
```bash
git add dashboard/login.html
git commit -m "chore: update backend URL"
git push origin main
```

---

## 🧪 Test Completo

1. **Login**: https://innoverai.com/dashboard/login.html
2. **Credenziali**: `admin` / `jament78#@`
3. **Console (F12)**: Dovresti vedere `✅ Login successful via backend`
4. **Admin Panel**: In fondo alla dashboard, crea un nuovo utente
5. **Verifica DB**: Il nuovo utente dovrebbe apparire nella lista

---

## 🐛 Troubleshooting Veloce

### Errore: "Cannot connect to database"
- Verifica che `DATABASE_URL` sia presente nelle Variables del backend
- Railway → PostgreSQL → Variables → Copia `DATABASE_URL`
- Incolla nelle Variables del service backend

### Errore: "Module not found: pg"
- Root Directory impostato male (deve essere `server`)
- O Railway non ha eseguito `npm install`
- Forza rebuild: Settings → Redeploy

### Backend non risponde
```bash
# Verifica logs
railway logs --service backend
```

### CORS Error nel browser
Il codice ha già `app.use(cors())`, dovrebbe funzionare. Se persiste:
```javascript
app.use(cors({ origin: 'https://innoverai.com' }));
```

---

## ✅ Checklist Finale

- ✅ PostgreSQL aggiunto al progetto
- ✅ Service Backend creato con Root Directory = `server`
- ✅ `DATABASE_URL` presente nelle Variables
- ✅ `JWT_SECRET` e `PORT` configurati
- ✅ Deploy completato (logs OK)
- ✅ Health endpoint risponde
- ✅ Frontend aggiornato con URL backend
- ✅ Login admin funziona
- ✅ Admin Panel visibile e funzionante

---

## 🎉 Fatto!

Il tuo backend PostgreSQL è live su Railway! Ora puoi:
- Creare utenti dall'Admin Panel
- Assegnare agent_id agli utenti
- Tutto viene salvato su PostgreSQL persistente

**Pro Tip**: Backup automatico del DB è incluso in Railway. Puoi anche fare snapshot manuali da PostgreSQL → Data → Backups.

