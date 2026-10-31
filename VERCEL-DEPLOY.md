# 🚀 Deploy Starpad su Vercel

## Parte 1: Frontend su Vercel (Gratis!)

### Step 1: Prepara il Progetto

```powershell
# Sei già nella cartella giusta
cd C:\Users\ahmet\Desktop\MC

# Verifica che ci sia vercel.json
ls vercel.json
```

### Step 2: Crea Account Vercel

1. Vai su: https://vercel.com
2. Clicca "Sign Up"
3. Scegli "Continue with GitHub" (consigliato)
4. Autorizza Vercel

### Step 3: Installa Vercel CLI (Opzionale ma consigliato)

```powershell
# Installa globalmente
npm install -g vercel

# Login
vercel login

# Segui le istruzioni nel browser
```

### Step 4A: Deploy via CLI (Veloce)

```powershell
# Nella cartella del progetto
cd C:\Users\ahmet\Desktop\MC

# Deploy
vercel

# Rispondi alle domande:
# ? Set up and deploy? Yes
# ? Which scope? [Il tuo account]
# ? Link to existing project? No
# ? What's your project's name? starpad
# ? In which directory is your code located? ./
# ? Want to override the settings? No

# Deploy production
vercel --prod
```

### Step 4B: Deploy via Dashboard (Più semplice)

1. Vai su: https://vercel.com/new
2. Clicca "Import Git Repository"
3. Se non hai repo GitHub:
   - Clicca "Import" → "Deploy from any Git repository"
   - Oppure segui Step 5 per creare repo prima

4. Una volta connesso il repo:
   - Framework Preset: Other
   - Root Directory: ./
   - Build Command: (lascia vuoto)
   - Output Directory: website
   - Clicca "Deploy"

5. Aspetta 1-2 minuti
6. Done! 🎉

### Step 5: Crea Repo GitHub (Se necessario)

```powershell
# Inizializza git
git init

# Aggiungi tutto
git add .

# Primo commit
git commit -m "Initial commit - Starpad platform"

# Vai su GitHub.com
# Clicca "+" → "New repository"
# Nome: starpad
# Visibilità: Public o Private
# NON aggiungere README (già ce l'hai)
# Clicca "Create repository"

# Collega e pusha
git remote add origin https://github.com/TUO_USERNAME/starpad.git
git branch -M main
git push -u origin main
```

### Step 6: Configura Variabili Ambiente su Vercel

⚠️ **IMPORTANTE**: Backend ha bisogno di queste!

1. Vai su Vercel Dashboard
2. Seleziona progetto "starpad"
3. Settings → Environment Variables
4. Aggiungi:

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJhbGc...
PROGRAM_ID=TuoProgramIDQuando...
PLATFORM_WALLET=TuoWalletAddress...
```

### Step 7: Verifica Deployment

```
Il tuo sito sarà su:
https://starpad.vercel.app
o
https://starpad-xxxx.vercel.app
```

Apri e testa:
- Landing page funziona?
- Link "Launch App" funziona?
- Stili caricano?

---

## Parte 2: Backend API (Serve Server Separato)

⚠️ **Vercel non può hostare il backend completo** (WebSocket + Express)

### Opzioni per Backend:

#### Opzione A: Railway (Consigliato - Free tier)

1. Vai su: https://railway.app
2. Sign up with GitHub
3. New Project → Deploy from GitHub repo
4. Seleziona "starpad"
5. Add variables:
   ```
   SUPABASE_URL=...
   SUPABASE_KEY=...
   PROGRAM_ID=...
   PLATFORM_WALLET=...
   PORT=3000
   WS_PORT=8080
   ```
6. Deploy!

Costo: $5/mese dopo free tier

#### Opzione B: Render (Free tier disponibile)

1. Vai su: https://render.com
2. Sign up
3. New → Web Service
4. Connect repository
5. Settings:
   - Build Command: `npm install`
   - Start Command: `npm run api`
6. Add Environment Variables
7. Deploy

Costo: Free tier disponibile

#### Opzione C: Heroku (Pagamento)

1. https://heroku.com
2. Create app
3. Connect GitHub
4. Deploy

Costo: $7/mese (Eco Dyno)

#### Opzione D: DigitalOcean App Platform

1. https://www.digitalocean.com/products/app-platform
2. Deploy from GitHub
3. $5/mese

---

## Architettura Finale

```
Frontend (Vercel - Gratis)
    ↓
https://starpad.vercel.app
    ↓
    ├─→ Solana RPC (Devnet/Mainnet)
    │   ↓
    │   Smart Contract
    │
    └─→ Backend API (Railway/Render)
        ↓
        https://starpad-api.railway.app
        ↓
        Database (Supabase - Gratis)
```

---

## Configurazione API URL nel Frontend

Dopo aver deployato il backend, aggiorna:

**website/platform.js:**
```javascript
// Alla riga 1, aggiungi:
const API_URL = 'https://starpad-api.railway.app'; // Il tuo URL backend
const WS_URL = 'wss://starpad-api.railway.app'; // WebSocket

// Poi in tutte le fetch:
fetch(`${API_URL}/api/tokens`)
// invece di:
fetch('http://localhost:3000/api/tokens')
```

Poi:
```powershell
git add .
git commit -m "Update API URLs for production"
git push
```

Vercel auto-redeploya! ✨

---

## Testing Completo

### 1. Test Frontend
```
✓ Apri: https://starpad.vercel.app
✓ Landing page carica
✓ Click "Launch App"
✓ Platform.html carica
✓ Stili corretti
✓ No errori console
```

### 2. Test Wallet Connection
```
✓ Install Phantom (se non hai)
✓ Switch to Devnet
✓ Click "Connect Wallet"
✓ Phantom popup appare
✓ Approve
✓ Button mostra address
```

### 3. Test Backend API
```
✓ Apri: https://TUO-BACKEND.railway.app/api/tokens
✓ Dovrebbe tornare JSON (anche se vuoto)
✓ No errori
```

### 4. Test Smart Contract
```
✓ Deploy contract su devnet (se non fatto)
✓ Update PROGRAM_ID in Vercel env vars
✓ Try create token
✓ Sign with Phantom
✓ Wait for confirmation
```

---

## Domini Custom (Opzionale)

### Su Vercel:
1. Compra dominio (Namecheap, GoDaddy, etc.)
2. Vercel Dashboard → Settings → Domains
3. Add domain: `starpad.io`
4. Segui istruzioni DNS
5. Aspetta propagazione (24-48h)

### Su Railway/Render:
1. Settings → Custom Domain
2. Add domain: `api.starpad.io`
3. Update DNS records
4. SSL automatico

---

## Monitoraggio

### Vercel Analytics (Gratis)
1. Vercel Dashboard → Analytics
2. Vedi traffico, performance, etc.

### Sentry (Errori - Free tier)
1. https://sentry.io
2. Create project
3. Add to frontend:
```html
<script src="https://cdn.sentry.io/..."></script>
```

### Uptime Monitoring
- https://uptimerobot.com (Free)
- Check ogni 5 minuti se sito è up

---

## Troubleshooting

### "Page not found"
- Verifica vercel.json
- Check build logs
- Assicurati che website/index.html esista

### "API connection failed"
- Check API_URL in frontend
- Verify backend is running
- Check CORS settings in backend

### "Wallet not connecting"
- Clear browser cache
- Reinstall Phantom
- Check if on correct network (devnet)

### Build fails
- Check Node version (18+)
- Verify all dependencies in package.json
- Check build logs in Vercel

---

## Costi Mensili

**Free Tier Setup:**
- Vercel Frontend: $0
- Supabase Database: $0
- Railway Backend: $5 (dopo free credit)
- **Total: $5/mese**

**Con Domini Custom:**
- Domain .io: ~$30/anno
- Total: ~$7.50/mese

**Scalabile:** Se cresci, puoi upgradare!

---

## Pronto per Testare!

```powershell
# 1. Deploy frontend su Vercel
vercel --prod

# 2. Deploy backend su Railway
# (Via dashboard)

# 3. Update URLs nel frontend
# Edit website/platform.js

# 4. Push changes
git push

# 5. Apri e testa!
start https://starpad.vercel.app
```

🎉 **Il tuo Starpad è live!**

---

## Next Steps

1. ✅ Test su devnet
2. ✅ Get feedback
3. ✅ Fix bugs
4. 🔒 Professional audit
5. 🚀 Deploy to mainnet
6. 📢 Marketing & launch!

Buon lancio! 🚀⭐
