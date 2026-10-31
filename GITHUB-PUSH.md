# 🚀 Push su GitHub - Guida Rapida

## Il tuo repo è pronto qui:
https://github.com/Burek51515/Starpad

## Comandi da eseguire:

```powershell
# 1. Vai nella cartella
cd C:\Users\ahmet\Desktop\MC

# 2. Verifica che tutto sia pronto
git status

# 3. Pusha su GitHub
git push -u origin main
```

Se richiede username/password:
- Username: Burek51515
- Password: usa Personal Access Token (vedi sotto)

## Se non riesci a pushare - GitHub ti chiede login

### Opzione 1: GitHub Desktop (PIÙ FACILE)

1. Scarica: https://desktop.github.com/
2. Installa e login
3. File → Add Local Repository
4. Scegli: C:\Users\ahmet\Desktop\MC
5. Click "Publish repository"
6. Done! ✅

### Opzione 2: Personal Access Token

Se git chiede password nel terminale:

1. Vai su: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Note: "Starpad Deploy"
4. Expiration: 90 days
5. Scopes: seleziona "repo" (tutto)
6. Click "Generate token"
7. COPIA IL TOKEN (non lo vedrai più!)
8. Nel terminale, quando chiede password, incolla il token

### Opzione 3: GitHub CLI

```powershell
# Installa GitHub CLI
winget install GitHub.cli

# Login
gh auth login

# Segui le istruzioni nel browser

# Poi pusha
git push -u origin main
```

## Verifica che ha funzionato

Apri: https://github.com/Burek51515/Starpad

Dovresti vedere:
- ✅ 37 files
- ✅ README.md visibile
- ✅ Tutti i file caricati

---

## Dopo il push - Deploy su Vercel

### Metodo Automatico (Consigliato)

1. Vai su: https://vercel.com/new
2. Click "Import Git Repository"
3. Autorizza Vercel ad accedere a GitHub
4. Seleziona "Starpad"
5. Settings:
   - Framework Preset: Other
   - Root Directory: ./
   - Build Command: (lascia vuoto)
   - Output Directory: website
6. Click "Deploy"
7. Aspetta 1-2 minuti
8. Done! 🎉

Il tuo sito sarà live su: `https://starpad.vercel.app`

### Metodo Veloce (Via CLI)

```powershell
# Installa Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

---

## Problemi Comuni

### "failed to push"
- Verifica di essere autenticato
- Usa GitHub Desktop (opzione 1)
- O genera Personal Access Token

### "remote: Repository not found"
- Verifica il nome repo: Starpad (con S maiuscola)
- Verifica URL: https://github.com/Burek51515/Starpad.git

### "rejected - non-fast-forward"
```powershell
git pull origin main --rebase
git push -u origin main
```

---

## Prossimi Passi

1. ✅ Push su GitHub
2. 🚀 Deploy su Vercel
3. 🧪 Test dal vivo
4. 📱 Condividi link con amici
5. 🎉 Raccogli feedback!

Buona fortuna! ⭐
