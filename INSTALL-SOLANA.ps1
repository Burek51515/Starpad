# Script per installare Solana CLI su Windows
# Esegui come Amministratore

Write-Host "🚀 Installazione Solana CLI..." -ForegroundColor Green

# Download installer
$url = "https://github.com/solana-labs/solana/releases/download/v1.17.0/solana-install-init-x86_64-pc-windows-msvc.exe"
$output = "$env:TEMP\solana-install.exe"

Write-Host "📥 Download installer..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $url -OutFile $output

Write-Host "⚙️ Esecuzione installer..." -ForegroundColor Yellow
Start-Process -FilePath $output -Wait

Write-Host "✅ Installazione completata!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️ IMPORTANTE: Chiudi e riapri PowerShell, poi esegui:" -ForegroundColor Red
Write-Host "   solana --version" -ForegroundColor Cyan

# Aggiungi al PATH (potrebbe richiedere riavvio)
$solanaBinPath = "$env:USERPROFILE\.local\share\solana\install\active_release\bin"
Write-Host ""
Write-Host "📁 Solana installato in: $solanaBinPath" -ForegroundColor Yellow

Read-Host -Prompt "Premi Enter per chiudere"
