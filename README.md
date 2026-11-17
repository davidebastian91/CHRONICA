# 🌑 CHRONICA — D10 Engine & Virtual Tabletop

Piattaforma e motore di gioco di ruolo digitale basato sul **Chronica D10 Engine**, con IA Narratore (Gemini) e voce neurale HD.

---

## 🌐 Architettura di Produzione & Cloud (Online 24/7)

Il sistema è completamente autonomo e slegato da server casalinghi:

1. **Web Hosting & API (Node.js)**:
   * **Piattaforma:** [Render](https://render.com)
   * **URL di Gioco:** `https://chronica.onrender.com`
   * **Distribuzione Continua:** Ogni `git push origin main` attiva automaticamente il build e il deploy su Render.

2. **Database Cloud Persistente**:
   * **Piattaforma:** [Supabase](https://supabase.com) (PostgreSQL gestito su AWS EU-West)
   * **Tabelle:** `chronica_profiles` (profili e PIN) e `chronica_saves` (cronache e schede personaggi).
   * I dati e i salvataggi sono al sicuro in cloud indipendentemente da riavvii o aggiornamenti del server Render.

3. **Intelligenza Artificiale**:
   * **Modello:** Google Gemini Flash (tramite API Key centralizzata)
   * **Sintesi Vocale:** Microsoft Neural TTS (Edge HD, voce Diego/Elsa)

---

## 💻 Sviluppo Locale & Avvio

### Per avviare in locale:
```bash
npm install
npm run dev   # Solo interfaccia Vite
npm start     # Server completo Node + WebSockets su http://localhost:5173
```

### Launcher Desktop:
Su Windows, fare doppio clic su `Chronica.bat` (o il collegamento sul desktop) per aprire l'applicazione a schermo pulito tramite Edge/Chrome collegato a `https://chronica.onrender.com`.
