#!/usr/bin/env bash
# ==========================================================
# CHRONICA - Script di avvio per server Linux / Portatile
# ==========================================================

echo "🌑 Avvio di Chronica Server..."

# Controlla se Node.js è installato
if ! command -v node &> /dev/null; then
    echo "❌ Node.js non trovato! Installalo con: sudo apt install nodejs npm"
    exit 1
fi

# Crea cartella saves se non esiste
mkdir -p saves

# Se la cartella dist non esiste, compila il progetto
if [ ! -d "dist" ]; then
    echo "📦 Compilazione frontend in corso..."
    npm install
    npm run build
fi

# Avvia il server di produzione su porta 5173
echo "🚀 Avvio server su http://0.0.0.0:5173 ..."
node server.cjs

