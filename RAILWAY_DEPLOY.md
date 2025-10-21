# 🚀 Deploy Backend su Railway

## PROBLEMA ATTUALE
Il backend NON è deployato correttamente. `innoverai-production.up.railway.app` sta servendo il FRONTEND invece del backend Express.

## SOLUZIONE: Deploy Backend Separato

### Passo 1: Crea Nuovo Servizio Railway per Backend

1. Vai su [Railway](https://railway.app)
2. Crea un **NUOVO progetto** chiamato `innoverai-backend`
3. Clicca su "New" → "GitHub Repo"
4. Seleziona questo repo `innoverai`
5. **IMPORTANTE**: Imposta "Root Directory" = `server/`
6. Railway rileverà automaticamente Node.js

### Passo 2: Aggiungi Database PostgreSQL

1. Nel progetto Railway, clicca "New" → "Database" → "PostgreSQL"
2. Railway creerà automaticamente il database e imposterà `DATABASE_URL`

### Passo 3: Imposta Variabili d'Ambiente

Nel servizio backend, vai su "Variables" e aggiungi:

```
JWT_SECRET=tua_stringa_casuale_sicura_qui
PORT=8080
```

`DATABASE_URL` è già impostato automaticamente da Railway.

### Passo 4: Esegui Migration Tabella `calls`

1. Nel progetto Railway, clicca sul database PostgreSQL
2. Vai su "Data" → "Query"
3. Copia e incolla il contenuto di `server/migrations/001_create_calls_table.sql`
4. Esegui la query

**Oppure** via CLI (se hai psql installato):

```bash
# Copia DATABASE_URL da Railway
psql "$DATABASE_URL" -f server/migrations/001_create_calls_table.sql
```

### Passo 5: Verifica Deploy

1. Railway ti darà un URL tipo `innoverai-backend-production.up.railway.app`
2. Testa:
   ```bash
   curl https://innoverai-backend-production.up.railway.app/health
   ```
   Deve rispondere: `{"ok":true}` (JSON, non HTML!)

3. Testa login:
   ```bash
   curl -X POST https://innoverai-backend-production.up.railway.app/api/login \
     -H "Content-Type: application/json" \
     -d '{"username":"marco","password":"esposito2025"}'
   ```
   Deve rispondere con un token JWT.

### Passo 6: Aggiorna Frontend

Nel file `dashboard/index.html`, cambia la riga 55:

```javascript
// PRIMA (SBAGLIATO):
: 'https://innoverai-production.up.railway.app';

// DOPO (CORRETTO):
: 'https://innoverai-backend-production.up.railway.app';
```

Sostituisci con l'URL effettivo del tuo backend.

### Passo 7: Commit e Push

```bash
git add .
git commit -m "fix: backend configuration for Railway deploy"
git push origin main
```

### Passo 8: Ricarica Frontend

1. Vai su `https://innoverai.com/dashboard/`
2. Fai login
3. Clicca "Sync Retell"
4. Le chiamate dovrebbero essere salvate (niente più 405!)

---

## ✅ CHECKLIST

- [ ] Creato nuovo progetto Railway `innoverai-backend`
- [ ] Aggiunto database PostgreSQL
- [ ] Impostato `JWT_SECRET` nelle variabili
- [ ] Eseguito migration `001_create_calls_table.sql`
- [ ] Verificato `/health` risponde JSON `{"ok":true}`
- [ ] Aggiornato `dashboard/index.html` con URL backend corretto
- [ ] Fatto commit e push
- [ ] Testato Sync Retell dalla dashboard

---

## 🔧 TROUBLESHOOTING

### Backend ritorna HTML invece di JSON
- **Causa**: Railway sta servendo il frontend invece del backend
- **Soluzione**: Assicurati di aver impostato "Root Directory" = `server/` nelle impostazioni del servizio

### Errore "DATABASE_URL not found"
- **Causa**: Database non collegato
- **Soluzione**: Aggiungi PostgreSQL dal tab "New" → "Database"

### Tabella `calls` non esiste
- **Causa**: Migration non eseguita
- **Soluzione**: Esegui `001_create_calls_table.sql` sul database

### CORS errors
- **Causa**: Dominio non nella whitelist
- **Soluzione**: Il server.js già include `innoverai.com` nella lista CORS

---

## 📞 DOPO IL DEPLOY

Il tuo backend sarà raggiungibile su:
- `https://innoverai-backend-production.up.railway.app/health`
- `https://innoverai-backend-production.up.railway.app/api/login`
- `https://innoverai-backend-production.up.railway.app/api/calls`

E il frontend su `https://innoverai.com` chiamerà correttamente il backend! 🎉

