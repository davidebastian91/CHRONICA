# 🌑 CHRONICA — GUIDA SERVER & GIOCARE FUORI CASA

Questa guida spiega come usare **Chronica** sia quando porti il tuo PC a casa di un amico, sia quando lo installi sul vecchio portatile Linux di casa per usarlo come server H24.

---

## 🎯 SCENARIO 1: Domani vai a giocare a casa di un amico

Non serve configurare server complicati: il tuo computer portatile è già un server completo e autonomo!

### I 3 Passaggi per giocare al tavolo:
1. **Connettiti al Wi-Fi:**
   * Collega il tuo PC al **Wi-Fi di casa del tuo amico** (oppure attiva l'**Hotspot del tuo cellulare** e fai connettere tutti a quell'hotspot).
2. **Avvia Chronica:**
   * Apri il terminale nella cartella `Gioco` e scrivi:
     ```bash
     npm start
     ```
   * Il terminale ti mostrerà il link locale, ad esempio: `http://192.168.1.50:5173`.
   * Apri il browser sul tuo PC all'indirizzo `http://localhost:5173`.
3. **Fai connettere gli amici:**
   * Clicca sul pulsante **`Stanza Tavolo`** in alto: apparirà il grande **QR Code**.
   * Gli amici aprono la fotocamera del cellulare, inquadrano lo schermo e... **fatto!**
   * Sul loro telefono avranno la loro scheda personale del Mondo di Tenebra e potranno lanciare i dadi d10 direttamente sullo schermo del tuo PC.

> **Salvataggio della serata:** A fine sessione, apri *Impostazioni* e clicca **"Scarica File Backup (.json)"** per salvare l'intera cronaca in una copia di sicurezza sul tuo portatile.

---

## 🖥️ SCENARIO 2: Installare Chronica sul vecchio portatile Linux di casa (Server H24)

Così il server resta acceso a casa e tu ti colleghi da qualsiasi posto dal cellulare o dal PC.

### Metodo A: Avvio Diretto con Node.js (Il più semplice)
1. Copia l'intera cartella `Gioco` sul portatile Linux (via chiavetta USB o rete locale).
2. Sul portatile Linux, apri il terminale nella cartella ed esegui:
   ```bash
   chmod +x start.sh
   ./start.sh
   ```
3. Il server è subito attivo su `http://0.0.0.0:5173`.

### Metodo B: Con Docker (Un solo comando)
Se hai Docker installato sul portatile Linux:
```bash
docker compose up -d
```
Tutto girerà in background in modo silenzioso, riavviandosi automaticamente se riavvii il computer.

### Metodo C: Come Servizio di Sistema (Avvio automatico all'accensione)
Se vuoi che Chronica si accenda da solo ogni volta che accendi il portatile Linux senza dover fare nulla:
```bash
sudo cp -r /percorso/della/cartella /opt/chronica
sudo cp /opt/chronica/chronica.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now chronica
```

---

## 🌐 Come accedere al Server di Casa quando sei fuori (da rete 4G/5G o dal Wi-Fi degli amici)

Non serve aprire porte sul router di casa (che è pericoloso). Usa uno di questi due strumenti gratuiti al 100%:

### Opzione 1: Tailscale (Consigliata per te e i tuoi amici)
1. Installa [Tailscale](https://tailscale.com/) sul portatile Linux e sul tuo telefono/laptop portatile.
2. Ti assegnerà un indirizzo privato sicuro (es. `http://100.x.y.z:5173`).
3. Da casa dell'amico o in 4G digiti quell'indirizzo e sei connesso al tuo server di casa ovunque ti trovi nel mondo!

### Opzione 2: Cloudflare Tunnels (Zero installazione per gli amici)
1. Con un account gratuito su Cloudflare puoi esporre la porta 5173 del portatile Linux su un dominio o indirizzo web protetto con HTTPS (es. `https://chronica.iltuonome.org`).
2. Gli amici possono collegarsi anche da fuori casa digitando il link web o inquadrando il QR code.

---

## 💾 Dove vengono salvate le partite sul Server?
Tutti i file `.json` delle partite vengono archiviati nella cartella:
```
saves/
```
Puoi copiarli, farne backup, o aprirli con un qualsiasi editor di testo!

