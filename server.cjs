// Chronica - Server di Produzione Node.js con WebSockets, Salvataggi su Disco, IA Gemini e Voce Neurale HD
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { WebSocketServer, WebSocket } = require('ws');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const mammoth = require('mammoth');
const xlsx = require('xlsx');

// Carica variabili d'ambiente da .env locale se presente
const envFilePath = path.join(__dirname, '.env');
if (fs.existsSync(envFilePath)) {
  try {
    const envLines = fs.readFileSync(envFilePath, 'utf8').split('\n');
    for (const line of envLines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        if (!process.env[k.trim()]) {
          process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    }
  } catch {}
}

const PORT = process.env.PORT || 5173;
const DIST_DIR = path.join(__dirname, 'dist');
const SAVES_DIR = path.join(__dirname, 'saves');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

if (!fs.existsSync(SAVES_DIR)) {
  fs.mkdirSync(SAVES_DIR, { recursive: true });
}

// Gestione Profili con PIN / Password (stile console/Netflix)
const PROFILES_FILE = path.join(SAVES_DIR, 'profiles.json');

function getProfiles() {
  if (!fs.existsSync(PROFILES_FILE)) {
    const defaultProfiles = [
      {
        id: 'master',
        name: 'Master / Creatore',
        pin: '1234',
        isMaster: true,
        avatar: 'crown',
        createdAt: Date.now(),
      },
    ];
    try {
      fs.writeFileSync(PROFILES_FILE, JSON.stringify(defaultProfiles, null, 2), 'utf-8');
    } catch {}
    return defaultProfiles;
  }
  try {
    const raw = fs.readFileSync(PROFILES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveProfiles(profiles) {
  fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2), 'utf-8');
}

// Cache in memoria per audio TTS (chiave: hash MD5 del testo, valore: Buffer MP3)
const ttsCache = new Map();
const inFlightTts = new Map(); // hash -> Promise<Buffer>

// Pool di Client Microsoft Edge TTS (Multi-Voce Neurale HD: Giuseppe, Diego, Elsa, Isabella)
const ttsClients = new Map();
const DEFAULT_TTS_VOICE = 'it-IT-GiuseppeMultilingualNeural';

async function getTtsClientForVoice(voiceName = DEFAULT_TTS_VOICE) {
  const allowed = [
    'it-IT-GiuseppeMultilingualNeural',
    'it-IT-DiegoNeural',
    'it-IT-IsabellaNeural',
    'it-IT-ElsaNeural',
  ];
  const safeVoice = allowed.includes(voiceName) ? voiceName : DEFAULT_TTS_VOICE;

  if (ttsClients.has(safeVoice)) {
    return ttsClients.get(safeVoice);
  }

  const client = new MsEdgeTTS();
  await client.setMetadata(safeVoice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  ttsClients.set(safeVoice, client);
  return client;
}

// Pre-riscaldamento voce principale
getTtsClientForVoice(DEFAULT_TTS_VOICE)
  .then(() => console.log(`🎙️ Voce Neurale HD Narratore pronta: ${DEFAULT_TTS_VOICE} (96 kbps)`))
  .catch((err) => console.warn('Avviso inizializzazione TTS:', err.message));

// Trova l'IP locale della rete Wi-Fi / LAN
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Funzione helper per chiamare le API di Google Gemini con fallback automatico tra modelli
const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
];

function safeParseJsonArray(raw) {
  if (!raw) return [];
  let cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();

  // 1. Prova parsing diretto
  try {
    const res = JSON.parse(cleaned);
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.characters)) return res.characters;
  } catch (err) {
    // Continua
  }

  // 2. Pulizia preliminare: rimuovi virgole finali prima di } o ]
  try {
    const cleanedTrailing = cleaned.replace(/,\s*([}\]])/g, '$1');
    const res = JSON.parse(cleanedTrailing);
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.characters)) return res.characters;
  } catch (err) {
    // Continua
  }

  // 3. State-machine per estrarre tutti gli oggetti bilanciati { ... }
  // Gestisce qualsiasi profondità di annidamento e stringhe con escape
  const objects = [];
  let inString = false;
  let escape = false;
  let depth = 0;
  let objStart = -1;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (char === '\\') {
        escape = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      if (depth === 0) {
        objStart = i;
      }
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0 && objStart !== -1) {
        const candidateStr = cleaned.substring(objStart, i + 1);
        try {
          const cleanedCandidate = candidateStr.replace(/,\s*([}\]])/g, '$1');
          const parsed = JSON.parse(cleanedCandidate);
          if (parsed && (parsed.name || parsed.concept || parsed.factionOrClan)) {
            objects.push(parsed);
          }
        } catch (itemErr) {
          try {
            const sanitized = candidateStr
              .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
              .replace(/,\s*([}\]])/g, '$1');
            const parsed = JSON.parse(sanitized);
            if (parsed && (parsed.name || parsed.concept)) {
              objects.push(parsed);
            }
          } catch {}
        }
        objStart = -1;
      } else if (depth < 0) {
        depth = 0;
        objStart = -1;
      }
    }
  }

  if (objects.length > 0) {
    return objects;
  }

  // Tentativo di emergenza: troncamento all'ultimo '}'
  const lastObjectEnd = cleaned.lastIndexOf('}');
  if (lastObjectEnd !== -1) {
    const candidate = cleaned.substring(0, lastObjectEnd + 1);
    const firstBracket = candidate.indexOf('[');
    const sliceStart = firstBracket !== -1 ? firstBracket : 0;
    const jsonCandidate = candidate.substring(sliceStart).trim() + ']';
    try {
      const res = JSON.parse(jsonCandidate.replace(/,\s*([}\]])/g, '$1'));
      if (Array.isArray(res) && res.length > 0) return res;
    } catch {}
  }

  throw new Error('Impossibile estrarre personaggi validi dal formato restituito.');
}

async function callGemini(promptText, systemInstruction, options = {}) {
  const maxTokens = options.maxTokens || 4000;
  const temp = options.temperature !== undefined ? options.temperature : 0.82;
  const isJson = !!options.isJson;

  let lastError = null;

  for (const model of GEMINI_MODELS) {
    try {
      const text = await new Promise((resolve, reject) => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        const genConfig = {
          temperature: temp,
          maxOutputTokens: maxTokens,
        };
        // thinkingConfig va impostato ESCLUSIVAMENTE per i modelli che lo supportano
        if (model.includes('gemini-3.7') || model.includes('gemini-3.8') || model.includes('thinking')) {
          genConfig.thinkingConfig = {
            thinkingBudget: 0,
          };
        }
        if (isJson) {
          genConfig.responseMimeType = 'application/json';
        }

        const payload = {
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction ? systemInstruction + '\n\n' : ''}${promptText}` }],
            },
          ],
          generationConfig: genConfig,
        };

        const req = https.request(
          url,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            timeout: 55000,
          },
          (res) => {
            let raw = '';
            res.on('data', (chunk) => (raw += chunk));
            res.on('end', () => {
              try {
                const data = JSON.parse(raw);
                if (res.statusCode >= 200 && res.statusCode < 300) {
                  const candidate = data.candidates?.[0];
                  // Concatena tutti i parts testuali (evita che chunks multipli vengano tagliati)
                  const candidateText = candidate?.content?.parts
                    ? candidate.content.parts.filter((p) => !p.thought).map((p) => p.text || '').join('')
                    : '';
                  if (candidateText) {
                    resolve(candidateText);
                  } else {
                    reject(new Error('Nessun testo generato'));
                  }
                } else {
                  reject(new Error(data.error?.message || `Errore HTTP ${res.statusCode}`));
                }
              } catch (e) {
                reject(e);
              }
            });
          }
        );

        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Timeout richiesta Gemini'));
        });
        req.on('error', reject);
        req.write(JSON.stringify(payload));
        req.end();
      });

      return text;
    } catch (err) {
      console.warn(`Modello ${model} non disponibile (${err.message}), provo modello alternativo...`);
      lastError = err;
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  throw lastError || new Error('Nessun modello Gemini ha risposto');
}

function parseAIResponse(rawText, defaultSuggestions) {
  let suggestions = defaultSuggestions;
  let cleanedText = rawText;
  let requiredRoll = undefined;
  let xpAward = undefined;
  let obstacleSpawn = undefined;
  let enemySpawns = [];

  const rollMatch = rawText.match(/\[\[TIRO:\s*(\{.*?\})\s*\]\]/s);
  if (rollMatch) {
    try {
      requiredRoll = JSON.parse(rollMatch[1]);
      cleanedText = cleanedText.replace(rollMatch[0], '').trim();
    } catch {}
  }

  // Fallback: se l'IA non ha inserito il JSON [[TIRO:]] ma ha scritto "[Tiro Richiesto: Prontezza + Esaminare Scena • Soglia 8+]" nel testo
  if (!requiredRoll) {
    const textRollMatch = rawText.match(/(?:(?:🎲|\uD83C\uDFB2)\s*)?\[(?:Tiro\s+Richiesto|Tiro|Roll):\s*([A-Za-zÀ-ÿ\s]+?)(?:\s*\+\s*([A-Za-zÀ-ÿ\s]+?))?(?:\s*[-•·|–—]\s*(?:Soglia|Difficolt[àa]|Diff)\s*(\d+)\+?)?(?:\s*\((.*?)\))?\]/i);
    if (textRollMatch) {
      const rawAttr = textRollMatch[1].trim();
      const rawAbil = textRollMatch[2]?.trim();
      const diff = textRollMatch[3] ? parseInt(textRollMatch[3], 10) : 8;
      const extra = textRollMatch[4]?.trim() || '';

      let mod = undefined;
      const modMatch = extra.match(/([+-]\d+)/);
      if (modMatch) {
        mod = parseInt(modMatch[1], 10);
      }

      requiredRoll = {
        attribute: rawAttr,
        ability: rawAbil || undefined,
        difficulty: diff,
        reason: extra || `Azione richiesta dal Narratore (${rawAttr}${rawAbil ? ` + ${rawAbil}` : ''})`,
        modifier: mod,
      };
      cleanedText = cleanedText.replace(textRollMatch[0], '').trim();
    }
  }

  // Estrazione automatica del Modificatore Situazionale (es. "Modificatore bersaglio specifico: -5" o "(-5)")
  if (requiredRoll) {
    if (requiredRoll.modifier === undefined) {
      const modMatch = rawText.match(/(?:modificatore|penalit[àa]|bonus|bersaglio\s+specifico)[^:\d+-]*:\s*([+-]?\d+)/i) ||
                       rawText.match(/\[Tiro\s+Richiesto:[^\]]*?\([^\)]*?([+-]?\d+)[^\)]*?\)/i) ||
                       (requiredRoll.reason && requiredRoll.reason.match(/([+-]\d+)/));
      if (modMatch) {
        requiredRoll.modifier = parseInt(modMatch[1], 10);
      }
    }
  }

  // Rimuovi ogni residuo del testo grezzo del tiro richiesto per pulire la narrazione
  cleanedText = cleanedText.replace(/(?:(?:🎲|\uD83C\uDFB2)\s*)?\[(?:Tiro\s+Richiesto|Tiro|Roll):[^\]]+\]/gi, '').trim();

  const obstacleMatch = rawText.match(/\[\[OSTACOLO:\s*(\{.*?\})\s*\]\]/s);
  if (obstacleMatch) {
    try {
      obstacleSpawn = JSON.parse(obstacleMatch[1]);
      cleanedText = cleanedText.replace(obstacleMatch[0], '').trim();
    } catch {}
  }

  const enemyRegex = /\[\[NEMICO:\s*(\{.*?\})\s*\]\]/gs;
  let eMatch;
  while ((eMatch = enemyRegex.exec(rawText)) !== null) {
    try {
      enemySpawns.push(JSON.parse(eMatch[1]));
      cleanedText = cleanedText.replace(eMatch[0], '').trim();
    } catch {}
  }

  const xpMatch = rawText.match(/\[\[XP:\s*(\d+)(?:\s*\|\s*"([^"]*)")?\s*\]\]/s);
  if (xpMatch) {
    try {
      xpAward = {
        amount: parseInt(xpMatch[1], 10),
        reason: xpMatch[2] ? xpMatch[2].trim() : 'Avanzamento Capitolo',
      };
      cleanedText = cleanedText.replace(xpMatch[0], '').trim();
    } catch {}
  }

  let itemAward = undefined;
  const itemMatch = rawText.match(/\[\[OGGETTO:\s*"([^"]+)"(?:\s*\|\s*"([^"]*)")?\s*\]\]/s);
  if (itemMatch) {
    try {
      itemAward = {
        name: itemMatch[1].trim(),
        description: itemMatch[2] ? itemMatch[2].trim() : 'Raccolto durante la scena',
      };
      cleanedText = cleanedText.replace(itemMatch[0], '').trim();
    } catch {}
  }

  // Estrazione Danno al Giocatore
  let playerDamage = undefined;
  const dmgMatch = rawText.match(/\[\[DANNO_GIOCATORE:\s*(\{.*?\})\s*\]\]/s);
  if (dmgMatch) {
    try {
      const parsed = JSON.parse(dmgMatch[1]);
      const rawPts = parseInt(parsed.points, 10);
      const points = isNaN(rawPts) ? 1 : Math.max(1, rawPts);
      const rawType = String(parsed.type || '').toLowerCase();
      const type = rawType === 'aggravated' || rawType === 'bashing' ? rawType : 'lethal';
      playerDamage = {
        points,
        type,
        reason: parsed.reason || 'Danno subito',
      };
      cleanedText = cleanedText.replace(dmgMatch[0], '').trim();
    } catch {}
  }

  // Estrazione Cura al Giocatore
  let playerHeal = undefined;
  const healMatch = rawText.match(/\[\[CURA_GIOCATORE:\s*(\{.*?\})\s*\]\]/s);
  if (healMatch) {
    try {
      const parsed = JSON.parse(healMatch[1]);
      const rawPts = parseInt(parsed.points, 10);
      const points = isNaN(rawPts) ? 1 : Math.max(1, rawPts);
      playerHeal = {
        points,
        type: parsed.type || 'bashing',
        reason: parsed.reason || 'Cura / Riposo',
      };
      cleanedText = cleanedText.replace(healMatch[0], '').trim();
    } catch {}
  }

  // Fallback testuale: se l'IA descrive danni o cure al protagonista senza i blocchi JSON
  if (!playerDamage) {
    const textDmgMatch =
      rawText.match(/(?:subisci|ricevi|incassi|prendi|ti infligge|ti arreca)\s+(\d+)\s+dann[io](?:\s+(contudent[ie]|letali?|aggravat[ie]))?/i) ||
      rawText.match(/perdi\s+(\d+)\s+(?:punti?\s+salute|casell[ae]\s+(?:di\s+)?salute)/i);
    if (textDmgMatch) {
      const pts = parseInt(textDmgMatch[1], 10);
      const rawType = (textDmgMatch[2] || '').toLowerCase();
      const type = rawType.includes('aggravat')
        ? 'aggravated'
        : rawType.includes('contudent')
        ? 'bashing'
        : 'lethal';
      playerDamage = {
        points: isNaN(pts) ? 1 : Math.max(1, pts),
        type,
        reason: 'Danno subito nella narrazione',
      };
    }
  }

  if (!playerHeal) {
    const textHealMatch =
      rawText.match(/(?:recuperi|guarisci(?:\s+da)?|ti curi(?:\s+di)?|ripristini)\s+(\d+)\s+(?:punti?\s+salute|ferit[ea]|dann[io]|casell[ae])/i) ||
      rawText.match(/(?:kit medico|la benda|la pozione)\s+(?:ti fa recuperare|rimargina|cura|ripristina)\s+(\d+)\s+(?:ferit[ea]|punti?\s+salute|dann[io])/i);
    if (textHealMatch) {
      const pts = parseInt(textHealMatch[1], 10);
      playerHeal = {
        points: isNaN(pts) ? 1 : Math.max(1, pts),
        type: 'bashing',
        reason: 'Cura / Riposo',
      };
    }
  }

  // Estrazione Suggerimento Cambio Mappa
  let suggestedMapName = undefined;
  const mapMatch = rawText.match(/\[\[(?:MAPPA|MAP):\s*"([^"]+)"\s*\]\]/i);
  if (mapMatch) {
    suggestedMapName = mapMatch[1].trim();
    cleanedText = cleanedText.replace(mapMatch[0], '').trim();
  }

  // Estrazione Schizzo Tattico Minimale (Battlemap Blueprint)
  let battlemap = undefined;
  const battlemapMatch = rawText.match(/\[\[(?:BATTLEMAP|SCHIZZO_TATTICO):\s*(\{.*?\})\s*\]\]/s);
  if (battlemapMatch) {
    try {
      battlemap = JSON.parse(battlemapMatch[1]);
      cleanedText = cleanedText.replace(battlemapMatch[0], '').trim();
    } catch {}
  }

  // Estrazione Reperto Visivo / Documento Antico (Handout)
  let handout = undefined;
  const handoutMatch = rawText.match(/\[\[(?:REPERTO|HANDOUT|DOCUMENTO):\s*(\{.*?\})\s*\]\]/s);
  if (handoutMatch) {
    try {
      handout = JSON.parse(handoutMatch[1]);
      if (!handout.id) {
        handout.id = `handout_${Date.now()}`;
      }
      cleanedText = cleanedText.replace(handoutMatch[0], '').trim();
    } catch {}
  }

  const optionsMatch = rawText.match(/\[\[OPZIONI:\s*(\[.*?\])\s*\]\]/s);
  if (optionsMatch) {
    try {
      suggestions = JSON.parse(optionsMatch[1]);
      cleanedText = cleanedText.replace(optionsMatch[0], '').trim();
    } catch {}
  }

  return {
    text: cleanedText,
    suggestions,
    requiredRoll,
    xpAward,
    itemAward,
    obstacleSpawn,
    enemySpawns: enemySpawns.length > 0 ? enemySpawns : undefined,
    playerDamage,
    playerHeal,
    suggestedMapName,
    battlemap,
    handout,
  };
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// 1. Server HTTP (Static files + API)
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // API 1: Informazioni IP e Stato
  if (pathname === '/api/server-info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'online',
        ip: getLocalIpAddress(),
        port: PORT,
        hasGeminiKey: Boolean(GEMINI_API_KEY),
        timestamp: Date.now(),
      })
    );
    return;
  }

  // API 1.2: URL pubblico del Tunnel Cloudflare (per connessione 4G / fuori casa)
  if (pathname === '/api/public-tunnel-url') {
    const tunnelFile = path.join(SAVES_DIR, 'tunnel_url.txt');
    if (req.method === 'GET') {
      let tunnelUrl = process.env.PUBLIC_TUNNEL_URL || '';
      if (!tunnelUrl && fs.existsSync(tunnelFile)) {
        try {
          tunnelUrl = fs.readFileSync(tunnelFile, 'utf8').trim();
        } catch {}
      }
      if (!tunnelUrl) {
        // Fallback al tunnel attivo configurato in docker-compose
        tunnelUrl = 'https://fitting-oct-managed-britannica.trycloudflare.com';
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ tunnelUrl }));
      return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        try {
          const { url } = JSON.parse(body);
          if (url) {
            fs.writeFileSync(tunnelFile, url.trim(), 'utf8');
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, tunnelUrl: url ? url.trim() : '' }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }
  }

  // API 1.5: Gestione Profili Protetti con PIN (stile Netflix / Console)
  if (pathname === '/api/profiles' && req.method === 'GET') {
    const list = getProfiles().map((p) => ({
      id: p.id,
      name: p.name,
      isMaster: !!p.isMaster,
      avatar: p.avatar || 'user',
      createdAt: p.createdAt,
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(list));
    return;
  }

  if (pathname === '/api/profiles/verify' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { profileId, pin } = JSON.parse(body);
        const profiles = getProfiles();
        const match = profiles.find((p) => p.id === profileId && String(p.pin).trim() === String(pin).trim());
        if (match) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: true,
              profile: {
                id: match.id,
                name: match.name,
                isMaster: !!match.isMaster,
                avatar: match.avatar || 'user',
              },
            })
          );
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'PIN non corretto' }));
        }
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (pathname === '/api/profiles/admin-list' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { masterPin } = JSON.parse(body);
        const profiles = getProfiles();
        const master = profiles.find((p) => p.isMaster);

        if (!master || String(master.pin).trim() !== String(masterPin).trim()) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'PIN Master non valido.' }));
          return;
        }

        // Restituisce la lista completa inclusi i PIN per la gestione da parte del Master
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(profiles));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (pathname === '/api/profiles/manage' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { masterPin, action, profileData } = JSON.parse(body);
        const profiles = getProfiles();
        const master = profiles.find((p) => p.isMaster);

        if (!master || String(master.pin).trim() !== String(masterPin).trim()) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'PIN Master non valido. Accesso negato.' }));
          return;
        }

        if (action === 'create') {
          const newProfile = {
            id: `p_${Date.now()}_${Math.floor(Math.random() * 100)}`,
            name: profileData.name.trim(),
            pin: String(profileData.pin).trim(),
            isMaster: false,
            avatar: profileData.avatar || 'user',
            createdAt: Date.now(),
          };
          profiles.push(newProfile);
          saveProfiles(profiles);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, profile: newProfile }));
          return;
        }

        if (action === 'update_pin') {
          const target = profiles.find((p) => p.id === profileData.id);
          if (target) {
            target.pin = String(profileData.newPin).trim();
            if (profileData.newName) target.name = profileData.newName.trim();
            if (profileData.newAvatar) target.avatar = profileData.newAvatar;
            saveProfiles(profiles);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              profile: {
                id: target.id,
                name: target.name,
                isMaster: !!target.isMaster,
                avatar: target.avatar,
              },
            }));
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Profilo non trovato' }));
          }
          return;
        }

        if (action === 'delete') {
          if (profileData.id === 'master' || profileData.id === master.id) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Impossibile eliminare il profilo Master' }));
            return;
          }
          const filtered = profiles.filter((p) => p.id !== profileData.id);
          saveProfiles(filtered);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
          return;
        }

        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Azione non riconosciuta' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API 2: Lista Salvataggi su Disco (Filtrata per Profilo)
  if (pathname === '/api/saves' && req.method === 'GET') {
    try {
      const targetProfileId = parsedUrl.searchParams.get('profileId');
      const files = fs.readdirSync(SAVES_DIR).filter((f) => f.endsWith('.json') && f !== 'profiles.json');
      const list = [];

      for (const file of files) {
        const filePath = path.join(SAVES_DIR, file);
        const stats = fs.statSync(filePath);
        try {
          const raw = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(raw);

          // Se è specificato un profilo, mostra solo le sue cronache (a meno che non sia richiesto tutto con 'all')
          const saveProfileId = data.profileId || 'master';
          if (targetProfileId && targetProfileId !== 'all' && saveProfileId !== targetProfileId) {
            continue;
          }

          list.push({
            id: file.replace('.json', ''),
            fileName: file,
            title: data.campaign?.title || file,
            era: data.campaign?.era || 'Non specificata',
            city: data.campaign?.city || 'Sconosciuta',
            characterName: data.character?.name || 'Senza Nome',
            messagesCount: data.messages?.length || 0,
            updatedAt: stats.mtimeMs,
            profileId: saveProfileId,
            authorName: data.authorName || (saveProfileId === 'master' ? 'Al Bocia' : 'Giocatore'),
          });
        } catch {
          list.push({ id: file, fileName: file, updatedAt: stats.mtimeMs });
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(list));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API 2.5: Restituisce l'ultima stanza attiva del tavolo (per auto-riconnessione smartphone)
  if (pathname === '/api/active-room' && req.method === 'GET') {
    let activeCode = null;
    let activeCampaign = null;
    let activeMessagesCount = 0;
    let playersCount = 0;

    for (const [code, r] of rooms) {
      if (r.campaign || r.messages?.length > 0 || r.players?.size > 0 || r.hostWs) {
        activeCode = code;
        activeCampaign = r.campaign;
        activeMessagesCount = r.messages?.length || 0;
        playersCount = r.players?.size || 0;
        break;
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      activeRoom: activeCode,
      campaign: activeCampaign,
      messagesCount: activeMessagesCount,
      playersCount,
    }));
    return;
  }

  // API 2.6: Informazioni sulla stanza specifica e cast per la schermata di selezione mobile
  if (pathname === '/api/room-info' && req.method === 'GET') {
    const code = parsedUrl.searchParams.get('roomCode');
    const room = code ? rooms.get(code) : null;
    if (room) {
      const playersList = Array.from(room.players.values()).map((p) => ({
        id: p.player?.id,
        name: p.player?.name,
        characterName: p.player?.character?.name,
      }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          roomCode: code,
          campaign: room.campaign,
          players: playersList,
        })
      );
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Stanza non trovata' }));
    }
    return;
  }

  // API 2.7: Estrazione Testo Pulito da File Word (.docx/.doc), Excel (.xlsx/.xls/.csv) o Testo
  if (pathname === '/api/extract-text' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const { fileBase64, fileName, text } = JSON.parse(body);
        let extractedText = text || '';

        if (fileBase64) {
          const buffer = Buffer.from(fileBase64, 'base64');
          const ext = path.extname(fileName || '').toLowerCase();

          if (ext === '.docx' || ext === '.doc') {
            try {
              const res = await mammoth.extractRawText({ buffer });
              extractedText = res.value || '';
            } catch (docErr) {
              console.warn('Errore lettura con Mammoth:', docErr.message);
              extractedText = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t\u00A0-\u024F]/g, ' ');
            }
          } else if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
            try {
              const workbook = xlsx.read(buffer, { type: 'buffer' });
              const sheetTexts = [];
              for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                const csv = xlsx.utils.sheet_to_csv(sheet);
                if (csv && csv.trim()) {
                  sheetTexts.push(`=== FOGLIO: ${sheetName} ===\n` + csv);
                }
              }
              extractedText = sheetTexts.join('\n\n');
            } catch (xlErr) {
              console.warn('Errore lettura con XLSX:', xlErr.message);
              extractedText = buffer.toString('utf-8');
            }
          } else {
            extractedText = buffer.toString('utf-8');
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, text: extractedText.trim(), fileName }));
      } catch (err) {
        console.error('Errore /api/extract-text:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API 2.8: Analisi Intelligente Bozza / Trama per Dedurre Titolo, Epoca e Luogo
  if (pathname === '/api/ai/analyze-story-outline' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const { outlineText } = JSON.parse(body);
        if (!outlineText || outlineText.trim().length < 20) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Testo bozza troppo breve' }));
          return;
        }

        const systemPrompt = `Sei un esperto Master di giochi di ruolo e sceneggiatore per il motore narrativo Chronica D10 Engine.
Analizza il canovaccio o la bozza della trama fornita dall'autore ed estrai:
1. title: Un titolo evocativo per la cronaca (massimo 5-6 parole).
2. location: La città, regno, continente o luogo geografico principale in cui è ambientata la storia (es. "Regno di Aethelgard", "Kyoto", "Londra", ecc. MAI inventare o lasciare Tombstone se non si tratta di un western!).
3. era: Una delle seguenti opzioni esatte:
   - "wild_west" (se ambientato nel Far West, frontiera americana, cowboy, 1800)
   - "feudal_japan" (se ambientato in Giappone feudale, samurai, Sengoku)
   - "imperial_china" (se ambientato nella Cina imperiale)
   - "high_fantasy" (se ambientato in mondo fantasy, elfi, magia medievale, regni fantastici)
   - "pirates" (se ambientato sui mari del sud, pirati, 1700)
   - "ancient" (se ambientato nell'antichità romana, greca o egizia)
   - "modern" (se ambientato nell'epoca contemporanea / moderna)
   - "cyberpunk" (se ambientato in futuro distopico, megacorporazioni, neon)
   - "victorian" (se ambientato nell'epoca vittoriana 1880-1900)
   - "custom" (se l'ambientazione non rientra perfettamente in quelle sopra, ad es. Noir anni '30, Corsa all'oro, Post-apocalittico, o regni fantastici originali)
4. customEraDescription: Breve descrizione dell'epoca storica/ambientazione (es. "Regno di Aethelgard - Mondo minacciato dalle Maree Oscure", "Corsa all'Oro in California 1849", "Chicago Anni '20").
5. initialLight: Uno tra "noon", "sunset", "dawn", "night", "dynamic".

Rispondi ESCLUSIVAMENTE con un JSON valido con questa struttura esatta:
{
  "title": "...",
  "location": "...",
  "era": "...",
  "customEraDescription": "...",
  "initialLight": "..."
}`;

        const rawRes = await callGemini(
          `BOZZA DELLA TRAMA DELL'AUTORE:\n"""\n${outlineText.substring(0, 50000)}\n"""`,
          systemPrompt
        );
        let parsed = {};
        try {
          const cleaned = rawRes.replace(/```json/gi, '').replace(/```/g, '').trim();
          parsed = JSON.parse(cleaned);
        } catch {
          const m = rawRes.match(/\{[\s\S]*\}/);
          if (m) parsed = JSON.parse(m[0]);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(parsed));
      } catch (err) {
        console.error('Errore /api/ai/analyze-story-outline:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API 3: Salva Cronaca su Disco
  if (pathname === '/api/saves' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const saveId = payload.id || `save_${Date.now()}`;
        const filePath = path.join(SAVES_DIR, `${saveId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, id: saveId }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API 4: Carica Singolo Salvataggio da Disco
  if (pathname.startsWith('/api/saves/') && req.method === 'GET') {
    const saveId = pathname.replace('/api/saves/', '');
    const filePath = path.join(SAVES_DIR, `${saveId}.json`);
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Salvataggio non trovato' }));
    }
    return;
  }

  // API 5: Elimina Salvataggio
  if (pathname.startsWith('/api/saves/') && req.method === 'DELETE') {
    const saveId = pathname.replace('/api/saves/', '');
    const filePath = path.join(SAVES_DIR, `${saveId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File non trovato' }));
    }
    return;
  }

  // Helper per la formattazione coerente dei dati della scheda per l'IA
  const WOD_ABILITY_LABELS = {
    academics: 'Accademiche',
    computer: 'Informatica',
    investigation: 'Investigare',
    medicine: 'Medicina',
    occult: 'Occulto',
    politics: 'Politica',
    science: 'Scienze',
    crafts: 'Manualità',
    athletics: 'Atletica',
    brawl: 'Lotta',
    drive: 'Guidare',
    firearms: 'Armi da Fuoco',
    larceny: 'Criminalità',
    stealth: 'Furtività',
    survival: 'Sopravvivenza',
    weaponry: 'Armi da Mischia',
    animal_ken: 'Affinità Animale',
    empathy: 'Empatia',
    expression: 'Espressività',
    intimidation: 'Intimidire',
    persuasion: 'Persuasione',
    socialize: 'Socializzare',
    streetwise: 'Bassifondi',
    subterfuge: 'Sotterfugio',
  };

  function formatCharacterDetailsForAI(char) {
    if (!char) return { invDesc: 'Nessun oggetto.', powersDesc: 'Nessun potere.', trainedAbilitiesDesc: 'Nessuna.', meritsDesc: 'Nessun merito.' };

    let invDesc = 'Nessun oggetto (solo mani nude).';
    if (char.structuredInventory && char.structuredInventory.length > 0) {
      invDesc = char.structuredInventory
        .map((i) => {
          let cleanName = i.name;
          if (/doppia katana/i.test(i.name) || (/katana/i.test(i.name) && (i.quantity === 2 || /zanne/i.test(i.name)))) {
            cleanName = `Due Katane Gemelle (coppia di 2 spade distinte, una per mano con Ambidestro)`;
          } else if (/doppi[ae]/i.test(i.name) && i.category === 'weapon') {
            cleanName = `Coppia di ${i.name.replace(/doppi[ae]\s*/i, '')} (2 armi distinte per combattimento a due armi)`;
          }
          return `${cleanName} [${i.category ? i.category.toUpperCase() : 'OGGETTO'}: q.tà ${i.quantity}${i.quantity === 0 ? ' - ESAURITA ⚠' : ''}${i.damageOrEffect ? ` | ${i.damageOrEffect}` : ''}]`;
        })
        .join(', ');
    } else if (char.inventory && char.inventory.length > 0) {
      invDesc = char.inventory
        .map((it) => {
          if (/doppia katana/i.test(it)) return 'Due Katane Gemelle (coppia di 2 spade, una per mano con Ambidestro)';
          return it;
        })
        .join(', ');
    }

    // Filtra RIGOROSAMENTE solo i poteri con Livello > 0 (esclude quelli a 0 pallini)
    const activePowers = (char.powers || []).filter((p) => Number(p.level || 0) > 0);
    const powersDesc = activePowers.length > 0
      ? activePowers.map((p) => `${p.name} (Livello ${p.level}${p.description ? ': ' + p.description : ''})`).join(', ')
      : 'Nessun potere o disciplina attiva (LIVELLO 0 = NON POSSEDUTO: VIETATO PROPORRE L\'USO DI POTERI O DISCIPLINE)';

    // Filtra RIGOROSAMENTE solo le abilità addestrate con valore > 0
    const trainedList = [];
    if (char.abilities) {
      for (const [k, v] of Object.entries(char.abilities)) {
        if (typeof v === 'number' && v > 0 && WOD_ABILITY_LABELS[k]) {
          trainedList.push(`${WOD_ABILITY_LABELS[k]} (${v})`);
        }
      }
    }
    const trainedAbilitiesDesc = trainedList.length > 0
      ? trainedList.join(', ')
      : 'Nessuna abilità con pallini positivi (tutte non addestrate)';

    // Meriti e Difetti reali registrati
    const meritsDesc = char.meritsFlaws && char.meritsFlaws.length > 0
      ? char.meritsFlaws.map((m) => `${m.name} (${m.type === 'merit' ? 'Merito' : 'Difetto'}${m.description ? ': ' + m.description : ''})`).join('; ')
      : 'Nessun merito specifico';

    return { invDesc, powersDesc, trainedAbilitiesDesc, meritsDesc };
  }

  // API 6: IA Prologo Iniziale (Centralizzata sul Server con Gemini 2.5 Flash)
  if (pathname === '/api/ai/prologue' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const { campaign, character, party } = JSON.parse(body);

        // Identifica tutti i protagonisti effettivi (dai giocatori connessi o dal cast)
        const hasParty = Array.isArray(party) && party.length > 0;
        const effectiveProtagonists = hasParty
          ? party
          : (character ? [character] : (campaign.rosterCharacters || []));
        const hasMultiplePlayers = effectiveProtagonists.length > 1;

        // Raggruppamento per Fazione / Schieramento
        const factionMap = {};
        effectiveProtagonists.forEach((p) => {
          const faction = (p.factionOrClan || p.concept || 'Indipendente').trim();
          if (!factionMap[faction]) factionMap[faction] = [];
          factionMap[faction].push(p.name);
        });

        const distinctFactions = Object.keys(factionMap);
        const isMultiFaction = distinctFactions.length > 1;

        const partyListText = effectiveProtagonists
          .map((p) => `${p.name} (${p.creatureType || 'Avventuriero'} - ${p.factionOrClan || p.concept || 'Protagonista'})`)
          .join(', ');

        const mainChar = character || effectiveProtagonists[0] || null;
        const charName = mainChar?.name || 'Avventuriero';
        const charCreature = mainChar?.creatureType || 'hunter';
        const charFaction = mainChar?.factionOrClan || 'Indipendente';
        const charConcept = mainChar?.concept || 'Sopravvissuto';

        const { invDesc, powersDesc, trainedAbilitiesDesc, meritsDesc } = formatCharacterDetailsForAI(mainChar);

        let calibrationSection = '';
        if (isMultiFaction) {
          const factionListLines = distinctFactions
            .map((f) => `• Fazione "${f}": ${factionMap[f].join(', ')}`)
            .join('\n');

          calibrationSection = `
CALIBRAZIONE TRAMA MULTI-FAZIONE E DESTINI INCROCIATI (MONTAGGIO PARALLELO CINEMATOGRAFICO):
I personaggi appartengono a fazioni diverse o schieramenti indipendenti:
${factionListLines}

DIRETTIVA ASSOLUTA DEL MONTAGGIO PARALLELO (DIVIETO DI RADUNARLI FORZATAMENTE TUTTI INSIEME):
1. NON forzare tutti i personaggi nello stesso gruppo, taverna o stanza all'inizio! Ciascuna fazione o personaggio comincia nel proprio ambiente naturale (es. chi nel proprio covo/quartier generale, chi in perlustrazione solitaria, chi a colloquio coi propri contatti).
2. MONTAGGIO CINEMATOGRAFICO A SCENE ALTERNATE:
   - Apri con l'atmosfera globale e sensoriale di ${campaign.city} (${campaign.eraLabel || campaign.era}).
   - Inquadra la prima fazione/protagonista nella sua situazione e nei suoi obiettivi immediati.
   - Taglio di scena ("Nel frattempo, su un altro versante di ${campaign.city}..."): inquadra la seconda fazione/protagonista e il loro punto di vista.
3. L'INCIDENTE SCATENANTE CONVERGENTE:
   Un evento sconvolgente o un pericolo imminente (legato a ${campaign.enemies.join(', ')}) si manifesta all'improvviso. Questo evento colpisce ENTRAMBE le fazioni, creando fili invisibili e obiettivi che porteranno le loro indagini o percorsi a incrociarsi.
4. DESTINI INCROCIATI E CONSEGUENZE:
   Le scelte e le azioni compiute da ciascun gruppo influenzeranno il mondo circostante e lasceranno tracce per l'altra fazione, guidandoli verso momenti di confronto, negoziazione, rivalità o alleanza decisi esclusivamente dalle scelte dei giocatori!
`.trim();
        } else if (hasMultiplePlayers) {
          calibrationSection = `- Sono presenti ${effectiveProtagonists.length} protagonisti alleati: ${partyListText}. La storia deve introdurre la loro coterie/squadra e la loro missione comune a ${campaign.city}.`;
        } else {
          calibrationSection = `- È presente 1 singolo protagonista: ${charName} (${charCreature} - ${charFaction}, ${charConcept}). La storia deve focalizzarsi sul suo destino personale e sulle sue abilità.`;
        }

        const structureSection = isMultiFaction
          ? `
STRUTTURA DEL PROLOGO (SCENE ALTERNATE & MONTAGGIO PARALLELO):
1. Paragrafo 1: L'Atmosfera sensoriale del luogo (${campaign.city}) e dell'epoca (${campaign.eraLabel || campaign.era}), con il clima e il momento della giornata (${campaign.timeOfDay || 'dinamico'}).
2. Paragrafi 2 e 3: MONTAGGIO ALTERNATO TRA LE FAZIONI. Introduci brevemente ciascuna fazione nel suo ambiente specifico (chi indaga, chi ordisce, chi pattuglia), dando voce al carattere e al ruolo di ciascun protagonista.
3. Paragrafo 4: L'INCIDENTE SCATENANTE CONVERGENTE legato a ${campaign.enemies.join(', ')} che scuote l'equilibrio della città e mette in allarme entrambe le parti.
4. Concludi lasciando aperta la prima mossa per il tavolo.
5. Includi SEMPRE alla fine il blocco JSON con 3 o 4 opzioni suggerite d'azione. Se un'opzione comporta rischio, combattimento, prove fisiche o indagine, aggiungi SEMPRE tra parentesi quadre i tratti da tirare (es. [Destrezza + Armi da Fuoco] o [Prontezza + Investigare]):
[[OPZIONI: ["Opzione narrativa senza rischio", "Azione di combattimento o prova [Attributo + Abilità]", "Azione tattica rischiosa [Attributo + Abilità]"]]]
`
          : `
STRUTTURA DEL PROLOGO:
1. Paragrafo 1: L'Atmosfera viva e sensoriale del luogo (${campaign.city}) e dell'epoca (${campaign.eraLabel || campaign.era}), con il clima e il momento della giornata (${campaign.timeOfDay || 'dinamico'}).
2. Paragrafo 2: ${hasMultiplePlayers ? `La presenza e l'unione della Compagnia di protagonisti (${partyListText}) giunti a ${campaign.city}.` : `Chi è il protagonista (${charName}, ${charCreature} - ${charFaction}, ${charConcept}), la sua dotazione e la sua posizione in questo mondo.`}
3. Paragrafo 3: L'INCIDENTE SCATENANTE / INCONTRO INIZIALE: Se è presente un Canovaccio/Trama personalizzata, questo paragrafo DEVE corrispondere al punto di partenza assoluto (es. l'incontro con il committente, l'udienza con il Re che formula la sua proposta, o la chiamata alle armi), SENZA anticipare gli eventi futuri o i tradimenti. Se non c'è trama personalizzata, è legato all'apparizione della minaccia di ${campaign.enemies.join(', ')}.
4. Concludi calando ${hasMultiplePlayers ? "il tavolo" : "il giocatore"} nel momento esatto della prima scelta e della prima risposta da dare ai presenti.
5. Includi SEMPRE alla fine della risposta il blocco JSON con 3 o 4 opzioni suggerite d'azione. Se un'opzione comporta rischio, combattimento, prove fisiche o indagine, aggiungi SEMPRE tra parentesi quadre i tratti da tirare (es. [Destrezza + Armi da Fuoco] o [Prontezza + Investigare]):
[[OPZIONI: ["Opzione narrativa senza rischio", "Azione di combattimento o prova [Attributo + Abilità]", "Azione tattica rischiosa [Attributo + Abilità]"]]]
`;

        const systemPrompt = `
Sei il NARRATORE supremo di un gioco di ruolo aperto basato sul Chronica D10 Engine (riserva di dadi D10, soglia 8+, combattimenti tattici cinematografici).
Hai COMPLETA LIBERTÀ CREATIVA e FANTASIA SENZA LIMITI sull'ambientazione, ma DEVI RISPETTARE AL 100% LA SCHEDA REALE DEL PERSONAGGIO:
- Se l'ambientazione è il FAR WEST: sabbia infuocata, sole di mezzogiorno, saloon fumosi, sceriffi, duelli alla pistola e misteri di frontiera. Armi coerenti con l'epoca storica (es. Colt Peacemaker .45, fucili a ripetizione Winchester, S&W .44 American/Russian, mai armi degli anni '50 come .44 Magnum!).
- Se l'ambientazione è il GIAPPONE FEUDALE: spade katana, onore, spiriti Kami, clan samurai e demoni delle foreste.
- Se è la CINA IMPERIALE: dinastie leggendarie, arti marziali wuxia, corti di giada, alchimia taoista e filosofie mistiche.
- Se è un FANTASY CLASSICO alla D&D: fortezze, dungeon, magia runica, mostri ancestrali e taverne.
- Se sono PIRATI, CYBERPUNK, ANTICHITÀ o QUALSIASI EPOCA PERSONALIZZATA: adotta fedelmente il linguaggio, l'orario del giorno e i costumi di quel mondo.

CALIBRAZIONE IN BASE AI GIOCATORI E ALLE NATURE DEL PERSONAGGIO:
${calibrationSection}
- REGOLA SUL PERSONAGGIO DEL GIOCATORE: Applica al protagonista le meccaniche speciali della sua natura (Vampiro: Sangue/Sete/Luce Solare; Lupo Mannaro: Forme/Furia/Argento; Mago: Sapienza Arcana/Mana/Risonanza) SOLO SE la scheda del giocatore appartiene effettivamente a quella natura (${charCreature}).
- LIBERTÀ TOTALE SUI PNG E SUL MONDO DI GIOCO: Anche se il giocatore interpreta un Mortale, un Cacciatore o una specifica natura, HAI COMPLETA LIBERTÀ di inserire nella trama, negli incontri e nei conflitti qualsiasi PNG o creatura fantastica, applicando a ciascuno i suoi veri poteri e le sue vulnerabilità logiche!

VINCOLO TASSATIVO SU EQUIPAGGIAMENTO, ABILITÀ E OPZIONI [[OPZIONI: [...]]]:
1. OGGETTI REALI: Nel testo e soprattutto nelle opzioni suggerite, cita e usa SOLO ED ESCLUSIVAMENTE armi, consumabili e oggetti realmente elencati in "Inventario & Munizioni Reali". VIETATO inventare armi moderne o anacronistiche fuori epoca.
2. ABILITÀ ADDESTRATE (VALORE > 0): Le scelte tattiche d'azione DEVONO basarsi sulle abilità con valore > 0 elencate in "Abilità Addestrate Reali" (o azioni generiche di buon senso come osservare, ripararsi o dialogare). È RIGIDAMENTE VIETATO proporre azioni basate su abilità a 0 pallini (es. NON suggerire "Intimidire" se Intimidire ha valore 0)!
3. POTERI ATTIVI (LIVELLO > 0): Se un potere o disciplina ha Livello 0 o non compare in lista, il personaggio NON lo possiede. È TASSATIVAMENTE VIETATO proporre o narrare l'attivazione di "Addestramento Tattico Avanzato", "Fede Incrollabile" o qualunque altro potere a 0 pallini!
4. COERENZA LOGICA DELLE AZIONI (DIVIETO DI RICARICA PREMATURA): NON proporre MAI di "ricaricare il revolver/arma" se il personaggio non ha ancora sparato colpi o si trova all'inizio del conflitto con l'arma già carica!
5. MERITI SPECIALI: Puoi valorizzare i Meriti registrati sulla scheda del personaggio (es. "Estrazione Rapida" per estrarre l'arma e sparare all'istante come azione gratuita senza penalità; "Ambidestro" per maneggiare con pari letalità due armi contemporaneamente).
6. DUE ARMI & MERITO AMBIDESTRO (DIVIETO ASSOLUTO DI SINGOLARE): Se un personaggio possiede due katane (o due spade/pistole) o ha il merito Ambidestro, NON narrare MAI al singolare ("la doppia katana" è un errore grammaticale e concettuale!). Narra SEMPRE al plurale: "le due katane gemelle", "le sue due spade", descrivendo come le impugna entrambe, una per mano!

${structureSection}
`.trim();

        const storyOutlineBlock = campaign.customStoryOutline?.content?.trim()
          ? `
========================================================================
📜 CANOVACCIO UFFICIALE DELLA CRONACA (DIRETTIVA ASSOLUTA DELL'AUTORE/MASTER):
Il Master ha stabilito questa specifica bozza/trama per l'intera cronaca:
"""
${campaign.customStoryOutline.content}
"""

REGOLE TASSATIVE DI INCIPIT E DIVIETO ASSOLUTO DI SPOILER PER QUALSIASI TRAMA:
1. SCENA INIZIALE ASSOLUTA (LIVELLO ZERO): Il Prologo NON deve riassumere, comprimere o anticipare gli eventi della trama! DEVE iniziare rigorosamente dalla PRIMISSIMA SCENA o situazione cronologica descritta nella trama (es. la convocazione iniziale, l'udienza con il committente/sovrano/PNG, l'incontro d'ingaggio o la partenza).
2. NESSUNO SPOILER O ANTICIPAZIONE DI COMPLOTTI: È TASSATIVAMENTE VIETATO accennare, predire o rivelare tradimenti futuri, doppi giochi dei committenti, segreti occulti, trappole o colpi di scena descritti nelle fasi avanzate del canovaccio! I protagonisti NON SANNO cosa accadrà nel futuro. Per loro, all'inizio, la situazione deve apparire autentica, credibile e priva di premonizioni artificiali.
3. FAI GIOCARE IL MOMENTO INIZIALE IN TEMPO REALE: Il Prologo deve descrivere l'atmosfera della scena d'apertura, presentare l'interlocutore o la situazione iniziale, e fermarsi ESATTAMENTE nel momento in cui viene formulata la proposta, l'ingaggio o l'evento scatenante primario.
4. IL MOMENTO DELLA SCELTA: La scena deve concludersi dando la parola ai protagonisti, lasciando loro decidere come rispondere, negoziare le condizioni, imporre le proprie richieste o agire per la prima volta!
========================================================================
`
          : '';

        const chosenPlayerNames = effectiveProtagonists.map((p) => (p.name || '').toLowerCase().trim());

        const unchosenCast = Array.isArray(campaign.rosterCharacters)
          ? campaign.rosterCharacters.filter((rc) => !chosenPlayerNames.includes((rc.name || '').toLowerCase().trim()))
          : [];

        const unchosenCastBlock = unchosenCast.length > 0
          ? `
========================================================================
👥 PERSONAGGI DEL CAST GESTITI ESCLUSIVAMENTE DALL'IA NARRATORE (${unchosenCast.length} COMPRIMARI/PNG):
I seguenti personaggi appartengono alla cronaca dell'autore ma NON sono stati scelti da giocatori umani:
${unchosenCast
  .map(
    (c) =>
      `- ${c.name} (${c.concept} - ${c.creatureType}${c.factionOrClan ? `, ${c.factionOrClan}` : ''}): Virtù ${c.virtue || 'Giustizia'}, Vizio ${c.vice || 'Ira'}. Dotazione: ${c.inventory?.map((i) => i.name).join(', ') || 'Oggetti base'}. ${c.backgroundNotes ? `[Note: ${c.backgroundNotes}]` : ''}`
  )
  .join('\n')}

DIRETTIVA ASSOLUTA DI GESTIONE PNG DEL CAST:
L'IA Narratore DEVE dare vita attivamente a questi personaggi nel mondo di gioco:
1. Falli interagire, dialogare e agire in scena in accordo con la loro personalità, stirpe e fazione.
2. Possono essere compagni d'armi al fianco dei giocatori, figure neutrali con obiettivi personali, o rivali a seconda della trama.
3. Non ignorarli né lasciarli indietro: sono personaggi ufficiali creati dall'autore per popolare la storia!
========================================================================
`
          : '';

        const userPrompt = `
CONTESTO AVVENTURA:
- Mondo / Luogo: ${campaign.city} (Epoca: ${campaign.eraLabel || campaign.era})
- Orario / Momento: ${campaign.timeOfDay || 'Dinamico'}
- Minacce: ${campaign.enemies.join(', ')}
- Tono: ${campaign.tone} | Difficoltà: ${campaign.difficulty}
- Gancio opzionale del giocatore: ${campaign.customPlotHook || 'Nessuno, scatena la tua immaginazione!'}

${storyOutlineBlock}

${unchosenCastBlock}

${
  isMultiFaction
    ? `PROTAGONISTI E FAZIONI AL TAVOLO:\n${distinctFactions.map((f) => `- Fazione "${f}": ${factionMap[f].join(', ')}`).join('\n')}\n\nApplica il montaggio parallelo a scene alternate!`
    : hasMultiplePlayers
    ? `PROTAGONISTI AL TAVOLO (${effectiveProtagonists.length} GIOCATORI):\n${effectiveProtagonists.map((p) => `- ${p.name}: ${p.creatureType || 'Eroe'} (${p.factionOrClan || p.concept})`).join('\n')}`
    : `SCHEDA REALE DEL PROTAGONISTA:\n- Nome: ${charName}\n- Tipo creatura / stirpe: ${charCreature} (${charFaction})\n- Concetto: ${charConcept}\n- Inventario & Munizioni Reali (SOLO QUESTI OGGETTI ESISTONO): ${invDesc}\n- Abilità Addestrate Reali (VALORE > 0): ${trainedAbilitiesDesc}\n- Poteri / Discipline Attive (LIVELLO > 0): ${powersDesc}\n- Meriti & Difetti Reali: ${meritsDesc}`
}

Scrivi il Prologo Iniziale in lingua ITALIANA con stile narrativo profondo ed evocativo, rispettando rigorosamente l'inventario reale, le abilità addestrate, i meriti effettivi, l'eventuale canovaccio dell'autore e i comprimari del cast.
`.trim();

        const rawText = await callGemini(userPrompt, systemPrompt);
        const result = parseAIResponse(rawText, [
          'Valuti la situazione con attenzione e cerchi una via tattica vantaggiosa.',
          'Sfodera la tua arma o il tuo potere per fronteggiare subito il pericolo.',
          'Cerchi di carpire maggiori informazioni prima che chiunque ti noti.',
        ]);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error('Errore /api/ai/prologue:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API 7: IA Risposta Narratore (Centralizzata sul Server con Memoria e Regole WoD)
  if (pathname === '/api/ai/narrate' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const { campaign, character, history, latestAction, latestRoll, party } = JSON.parse(body);

        const actingChar = character || (Array.isArray(party) && party[0]?.character) || null;
        const actingName = actingChar?.name || 'Giocatore';
        const actingFaction = (actingChar?.factionOrClan || 'Indipendente').trim();

        const activeTablePlayers = Array.isArray(party) && party.length > 0
          ? party
          : (actingChar ? [actingChar] : []);
        const hasMultiplePlayers = activeTablePlayers.length > 1;

        const factionMap = {};
        activeTablePlayers.forEach((p) => {
          const charObj = p.character || p;
          const faction = (charObj.factionOrClan || charObj.concept || 'Indipendente').trim();
          if (!factionMap[faction]) factionMap[faction] = [];
          const name = charObj.name || p.name;
          if (name && !factionMap[faction].includes(name)) {
            factionMap[faction].push(name);
          }
        });

        const distinctFactions = Object.keys(factionMap);
        const isMultiFaction = distinctFactions.length > 1;

        const systemPrompt = `
Sei il NARRATORE ONNISCENTE di CHRONICA, una piattaforma di gioco di ruolo universale basata sul "Chronica D10 Engine" (un sistema universale e flessibile adattabile a qualsiasi epoca e genere: Fantasy, Cyberpunk, Western, Noir, Storico o Sovrannaturale).
Il tuo compito è far vivere una storia cinematografica, fluida, ricca di dialoghi e conseguenze reali in base all'epoca e all'ambientazione scelta.

REGOLE ESSENZIALI DI GIOCO:
1. RITMO SERRATO E VELOCITÀ: Nelle fasi decisive (combattimento, sparatorie, fughe, agguati o tensione immediata), sii RAPIDO, ASCIUTTO E INCISIVO. Limita la narrazione a massimo 2 brevi paragrafi d'impatto visivo (circa 80-130 parole in tutto). Niente descrizioni prolisse o divagazioni filosofiche sotto tiro: ritmo cinematografico serrato e passa subito la palla al giocatore.
2. ELENCO UFFICIALE DELLE PROVE DEL REGOLAMENTO (CHRONICA D10 ENGINE):
   Usa ESCLUSIVAMENTE i 9 Attributi ufficiali (Intelligenza, Prontezza, Fermezza, Forza, Destrezza, Costituzione, Presenza, Ascendente, Autocontrollo) e le 24 Abilità ufficiali:
   - Combattimento disarmato: Forza + Lotta (meno Difesa e Armatura del bersaglio)
   - Combattimento con armi da mischia: Forza + Armi da Mischia + Bonus Arma (meno Difesa e Armatura)
   - Combattimento a distanza (armi da fuoco / archi): Destrezza + Armi da Fuoco + Bonus Arma (meno Armatura)
   - Armi da lancio / Esplosivi lanciati: Destrezza + Atletica + Mod. Lancio (meno Difesa e Armatura)
   - Prese (Afferrare): Forza + Lotta - Difesa; Liberarsi o fare Manovra: Forza + Lotta - Forza avversario
   - Memorizzare / Ricordare: Intelligenza + Autocontrollo
   - Percezione / Reagire alla Sorpresa: Prontezza + Autocontrollo
   - Resistere alla Coercizione: Fermezza + Prontezza (contro Intimidazione)
   - Sollevare / Spostare Oggetti: Forza + Costituzione
   - Ricerche Accademiche: Intelligenza + Accademiche
   - Pirateria Informatica: Intelligenza + Informatica
   - Investigare / Esaminare Scena: Prontezza + Investigare (Risolvere Enigmi: Intelligenza + Investigare)
   - Creare / Riparare Oggetti: Intelligenza (o Destrezza) + Manualità
   - Curare Ferite: Destrezza (o Intelligenza) + Medicina
   - Arrampicarsi / Saltare: Forza + Atletica (Inseguimento a piedi: Costituzione + Atletica)
   - Eludere Sicurezza / Scassinare / Borseggiare: Destrezza + Criminalità
   - Muoversi Silenziosamente / Pedinare: Prontezza (o Destrezza) + Furtività (contro Prontezza + Autocontrollo)
   - Inseguimento o Pedinamento in Macchina: Destrezza (o Prontezza) + Guidare
   - Foraggiamento / Sopravvivenza: Prontezza + Sopravvivenza
   - Intimidire: Presenza (o Forza) + Intimidire | Raggirare: Ascendente + Sotterfugio | Convincere: Presenza + Persuasione
3. SE L'AZIONE DEL GIOCATORE È UN TENTATIVO RISCHIOSO O DI CONFLITTO (REGOLA DADI COMPENDIO SEZ. 1.1):
   - Nel motore Chronica D10 la soglia di successo è FISSA a 8+ (8, 9, 10 = successo; 10-Again esplode; riserva <= 0 = Tiro di Fortuna dove solo il 10 è successo e l'1 è Fallimento Drammatico; 5+ successi = Successo Eccezionale).
   - Se ci sono modificatori situazionali o bersaglio specifico (es. -5 per mirare alla testa/punto debole, -2 per oscurità, +2 per sorpresa/vantaggio):
     Segnalalo nel testo: "🎲 [Tiro Richiesto: Destrezza + Armi da Fuoco • Soglia 8+ (Modificatore bersaglio specifico: -5)]"
     E inserisci SEMPRE il campo "modifier" nel blocco JSON:
     [[TIRO: {"attribute": "Destrezza", "ability": "Armi da Fuoco", "difficulty": 8, "modifier": -5, "reason": "Colpire il punto debole del medaglione"}]]
   - Se non ci sono modificatori particolari:
     [[TIRO: {"attribute": "Destrezza", "ability": "Armi da Fuoco", "difficulty": 8, "reason": "Centrare il bersaglio in movimento"}]]
4. CONSEGUENZE DEI TIRI E COMBATTIMENTO A TIRO UNICO (COMPENDIO SEZ. 1.3):
   - Fallimento Drammatico (1 sul Tiro di Fortuna) / Fallimento Semplice (0 successi): descrivi tu la complicazione, l'arma inceppata o il contrattacco nemico.
   - Successo (1-4 successi) / Successo Eccezionale (5+ successi): basta 1 solo successo per superare un'azione standard! SE IL GIOCATORE HA OTTENUTO SUCCESSI E HA FORNITO UNA "Narrazione del Giocatore", ACCETTA E CONFERMA AL 100% QUANTO NARRATO DAL GIOCATORE!
   - COMBATTIMENTO IN UN SOLO TIRO: Nel Chronica Engine NON esiste un secondo tiro per i danni né un tiro di assorbimento! Difesa e Armatura vengono sottratte direttamente dalla riserva d'attacco e OGNI SUCCESSO OTTENUTO INFLIGGE DIRETTAMENTE 1 PUNTO SALUTE DI DANNO (Contundente /, Letale X o Aggravato *).
5. PREMIO PUNTI ESPERIENZA (XP) E COSTI DELLO SCHERMO:
   Quando il protagonista supera una prova critica, sconfigge un nemico o conclude una scena chiave, premialo con 1, 2 o 3 XP inserendo:
   [[XP: 2 | "Motivo del premio di esperienza"]]
   (Costi XP ufficiali: Attributo = nuovo pallino x5, Abilità = nuovo pallino x3, Specializzazione = 3, Pregio = nuovo pallino x2, Moralità = nuovo pallino x3).
6. BOTTINO E OGGETTI TROVATI (LOOT NARRATIVO):
   I giocatori non possono aggiungere oggetti o armi dal nulla sulla scheda durante il gioco. Se il protagonista perquisisce un nemico sconfitto, apre una cassa, trova un nascondiglio o compra in un negozio, premialo con l'oggetto trovato inserendo:
   [[OGGETTO: "Nome Oggetto" | "Descrizione o contesto di ritrovamento"]]
7. REGOLE RIGOROSE SU MUNIZIONI ED EQUIPAGGIAMENTO:
   Tieni sempre conto delle armi e delle munizioni attualmente possedute dal personaggio. Se il giocatore tenta di sparare con frecce o proiettili e le sue munizioni sono a 0 (ESAURITE), l'arma NON spara: scatta a vuoto ('click') o la faretra è desolatamente vuota! Il narratore DEVE evidenziare la mancanza di colpi e costringere il giocatore al corpo a corpo, al riparo o alla ritirata.
7.5. CONTROLLO FERREO SU CURE E KIT MEDICI (DIVIETO DI CURE FANTASMA):
   Se il giocatore non possiede bende, kit medico o pozioni nell'elenco 'Inventario & Munizioni Reali', è TASSATIVAMENTE VIETATO permettergli di curarsi con essi o proporli in [[OPZIONI:]]! Se il giocatore dichiara o tenta di usare un kit medico o bende senza averli, il Narratore DEVE narrare che fruga nelle tasche/zaino ma scopre di esserne completamente sprovvisto, e che la ferita continua a sanguinare senza cure!
7.6. AGGIORNAMENTO SALUTE PROTAGONISTA (DANNI E CURE IN TEMPO REALE):
   Se durante la narrazione il protagonista subisce ferite (colpi d'arma da fuoco, artigli, trappole, cadute, fuoco) o riceve cure/riposo, inserisci SEMPRE a fine risposta il blocco JSON per aggiornare la sua scheda Salute:
   [[DANNO_GIOCATORE: {"points": 1, "type": "lethal", "reason": "Colpo subito"}]] (type: 'bashing', 'lethal', 'aggravated')
   oppure
   [[CURA_GIOCATORE: {"points": 1, "type": "bashing", "reason": "Bendaggio o riposo"}]]
8. TABELLE DELLO SCHERMO DEL NARRATORE (ARMI, ARMATURE, ESPLOSIVI, PERICOLI E MORALITÀ):
   - Iniziativa: 1d10 + Destrezza + Autocontrollo. Difesa: min(Destrezza, Prontezza). Schivare raddoppia la Difesa. Attacco Impetuoso dà +2 ma toglie la Difesa.
   - Occultamento: Scarso -1, Parziale -2, Considerevole -3, Copertura Piena blocca i colpi. Bersaglio Specifico: Torso -1, Arto -2, Testa -3, Mano -4, Occhio -5. Gittata: Media -2, Lunga -4.
   - Armi da Mischia: Coltello/Manganello/Tirapugni +1, Stocco/Randello/Accetta +2, Spada/Katana/Mazza/Ascia/Lancia +3, Spadone +4, Ascia Grande +5.
   - Armi da Fuoco: Pistola/Revolver leggero/Mitra piccolo +2, Pistola/Revolver pesante (.44)/Mitra grande/Balestra +3, Fucile d'assalto/Shotgun +4, Fucile di precisione +5. Contro i vampiri le armi da fuoco convenzionali infliggono danni contundenti!
   - Esplosivi: Molotov 2 (C + fuoco L), Granata concussione 4C, Frammentazione 4L, Dinamite 4+L, Plastico 6+L.
   - Pericoli: Elettricità da 4C (presa) a 10C (alta tensione); Fuoco da 1L (torcia) a 3L (incendio) + calore (+1..+3); Veleni (Tossicità 2-8, si resiste con Fermezza + Autocontrollo).
   - Guarigione: Contundenti 15 min, Letali 2 giorni, Aggravati 1 settimana.
   - Gerarchia dei Peccati (Moralità/Umanità/Armonia/Saggezza 10-1): quando un personaggio commette atti contro la Moralità (da furto a livello 7 fino a omicidio premeditato a livello 3 o strage a livello 1), fai pesare il rimorso e la degenerazione morale.
8.5. ARCHETIPI E NATURE SPECIALI DEL CHRONICA ENGINE:
   - SUL PROTAGONISTA: Adatta i tratti e le risorse speciali alla sua Natura registrata sulla scheda (${actingChar?.creatureType || 'hunter'}):
     • Mortale / Esperto ('mortal'): Essere umano senza poteri innati; conta su ingegno, strumenti ed esperienza.
     • Veterano / Tattico ('hunter'): Addestramento d'élite, fermezza morale, uso professionale di armi e coperture.
     • Potenziato / Notturno ('vampire'): Fisiologia alterata o sovrannaturale; spende Riserva Vitale per curarsi o potenziare attributi fisici; teme vulnerabilità d'ambientazione (es. fuoco/luce per vampiri, blackout per biomacchine).
     • Mutaforma / Primordiale ('werewolf'): Istinto primordiale ed energia ferina; può assumere forme di guerra/predazione, rigenera danni fisici e risente di debolezze specifiche (es. metalli rari, legami totemici).
     • Canalizzatore / Arcano ('mage'): Manipola correnti invisibili della realtà, energie o forze psioniche/arcane attraverso formule, innesti o concentrazione.
   - SUI PNG E NEMICI: Modella gli avversari in piena coerenza con l'ambientazione e l'epoca storica della cronaca (che sia Fantasy, Far West, Cyberpunk, Noir o Horror). Non forzare elementi gotici se l'ambientazione è Western, Sci-Fi o Storica!
8.6. SISTEMA DI SCONTRO E NEMICI A 2 MODALITÀ (OSTACOLO IN CORSA vs COMBATTIMENTO TATTICO CON SALUTE REALE):
   - MODALITÀ A — OSTACOLO RAPIDO IN CORSA (Tira i dadi SOLO il Giocatore):
     Quando il giocatore sta inseguendo qualcuno o fuggendo e incontra guardie di sbarramento, scagnozzi che coprono una ritirata o un blocco da sfondare al volo senza fermarsi in un combattimento turno per turno, attiva l'Ostacolo inserendo a fine risposta:
     [[OSTACOLO: {"name": "Guardie del Sotterraneo", "successesNeeded": 2, "penaltyDamageOnFail": 1, "attribute": "Forza", "ability": "Lotta"}]]
     REGOLA FERREA DELL'OSTACOLO: Finché il giocatore non accumula tutti i successi richiesti (ti verrà segnalato nel prompt), VIETATO FARLO PASSARE OLTRE! Se ottiene 0 successi o successi parziali, le guardie/ostacolo lo tengono ancora bloccato lì finché non supera la soglia!
   - MODALITÀ B — COMBATTIMENTO TATTICO COMPLETO (Iniziativa, Barra Salute Nemico e Tiri del Narratore):
     Quando inizia un vero combattimento diretto contro un avversario importante, un mostro o un Boss (e non è già presente in campo), genera la sua Mini-Scheda inserendo a fine risposta:
     [[NEMICO: {"name": "Nome Avversario", "creatureType": "vampire", "maxHealth": 8, "defense": 3, "armor": 1, "initiativeMod": 6, "attackPool": 8, "attackName": "Artigli / Pistola", "damageType": "lethal"}]]
     DIVIETO ASSOLUTO DI UCCIDERE UN NEMICO CON UN SOLO COLPO: I nemici hanno da 7 a 12 caselle Salute! Quando il giocatore colpisce un nemico, ti verrà comunicata la sua Salute residua esatta (es. "5/8 caselle integre"). Finché la Salute del nemico è > 0, È TASSATIVAMENTE VIETATO NARRARE CHE IL NEMICO MUORE O VIENE SCONFITTO! Descrivi il colpo andato a segno e il sangue, ma il nemico resta in piedi a combattere finché le sue caselle Salute non scendono a 0!
9. CHIUSURA COMPLETA DELLA FRASE:
   Termina SEMPRE l'ultimo paragrafo con una frase compiuta e un punto fermo prima dei tag speciali.
10. Includi SEMPRE alla fine il blocco con 3 o 4 opzioni contestuali per la prossima mossa:
    - REQUISITO FONDAMENTALE DI GIOCO: Ogni opzione che comporta rischio, uso di armi, acrobazie, prove fisiche, furtività, inganno o sfide DEVE avere al suo fianco i tratti tra parentesi quadre [Attributo + Abilità], così che il giocatore possa lanciare i dadi cliccandoci sopra! (Es. "Sparare alla lanterna sopra il vampiro [Destrezza + Armi da Fuoco]", "Scavalcare la barricata [Forza + Atletica]", "Fingere la resa per distrarli [Ascendente + Sotterfugio]").
    - Solo per scelte puramente passive o contemplative senza pericolo (es. "Rimanere in silenzio e ascoltare", "Ordinare da bere") non servono i tratti tra parentesi.
[[OPZIONI: ["Azione con tiro [Attributo + Abilità]", "Azione tattica [Attributo + Abilità]", "Azione cauta senza tiro"]]]
11. RIGIDO DIVIETO DI AUTORISOLUZIONE & DIVIETO ASSOLUTO DI OGGETTI, ABILITÀ E POTERI FANTASMA:
    - SE IL GIOCATORE SCRIVE UN'AZIONE CHE COMPORTA RISCHIO, COMBATTIMENTO O PROVE (es. "gli sparo in testa e muore", "salto il canyon", "tiro una coltellata al cuore", "lo decapito", "scassino la serratura"): È TASSATIVAMENTE VIETATO AUTORISOLVERE L'AZIONE NARRANDO CHE HA AVUTO SUCCESSO O CHE IL NEMICO MUORE!
      Tratta l'input ESCLUSIVAMENTE come una dichiarazione d'intenti. Ferma la narrazione all'istante all'apice della tensione (mentre prende la mira, mentre corre per il balzo, mentre sferra il fendente) e RICHIEDI OBBLIGATORIAMENTE IL TIRO DI DADO EMETTENDO IL TAG [[TIRO: {"attribute": "...", "ability": "...", "difficulty": 8, "reason": "..."}]]! Solo nel turno successivo, in base ai successi dei dadi, narrerai l'esito reale!
    - CONTROLLO ARMI & OGGETTI REALI: Nelle 3-4 scelte di [[OPZIONI:]], cita e usa SOLO ED ESCLUSIVAMENTE armi o oggetti presenti in "Inventario & Munizioni Reali". VIETATO inventare armi moderne o anacronistiche (es. nel West usa Colt/Peacemaker .45 o S&W, mai Magnum '50).
    - ABILITÀ ADDESTRATE (VALORE > 0): Le scelte tattiche suggerite DEVONO basarsi esclusivamente sulle abilità con valore > 0 elencate in "Abilità Addestrate Reali". Se un'abilità non è elencata o è a 0 pallini (es. Intimidire a 0), è VIETATO proporla!
    - POTERI ATTIVI (LIVELLO > 0): Se un potere o disciplina ha Livello 0 o non è presente, il personaggio NON lo possiede. È TASSATIVAMENTE VIETATO proporre o attivare "Addestramento Tattico Avanzato", "Fede Incrollabile" o altri tratti a 0 pallini!
    - COERENZA LOGICA DELLE AZIONI (DIVIETO DI RICARICA A VUOTO): NON proporre MAI di ricaricare un'arma se il personaggio non ha ancora sparato!
    - MERITI: Puoi valorizzare i Meriti reali registrati sulla scheda (es. "Estrazione Rapida" per estrarre e sparare all'istante; "Ambidestro" per colpire con due armi senza penalità).
    - DUE ARMI & AMBIDESTRO (DIVIETO DI SINGOLARE): Se il personaggio combatte con due spade o due katane, narra SEMPRE al plurale: "le sue due katane gemelle", "le due lame", descrivendo come le impugna entrambe (una per mano)!
    - INDIVIDUALITÀ DEL TURNO: Rivolgiti per nome al personaggio attualmente attivo ("${actingName}").
12. MAPPE GEOGRAFICHE E CAMBIO AMBIENTAZIONE:
    Quando la scena o il viaggio dei personaggi si sposta in una specifica città, fortezza, regione o luogo chiave presente nell'ambientazione della cronaca, o se il giocatore chiede dove si trova sulla mappa geografica, segnala il cambio ambientazione per aggiornare il pannello visivo inserendo a fine risposta:
    [[MAPPA: "Nome del Luogo o della Mappa"]]
13. SCHIZZO TATTICO MINIMALE DELLA SCENA (BATTLEMAP BLUEPRINT):
    Quando scoppia un combattimento, un'imboscata o quando un giocatore chiede informazioni sulla posizione tattica (es. "dove siamo?", "cosa ho attorno?", "dov'è un riparo?", "dove sono i nemici?", "fammi uno schizzo della stanza/zona"), genera la mappa tattica minimale a griglia inserendo a fine risposta:
    [[BATTLEMAP: {"title": "Nome Scena", "locationName": "Luogo", "entities": [{"id": "p1", "name": "${actingName}", "type": "player", "x": 3, "y": 7}], "terrain": [{"type": "cover", "x": 4, "y": 6, "label": "Muretto / Tavolo / Riparo"}, {"type": "wall", "x": 0, "y": 0, "w": 10, "h": 1, "label": "Parete"}]}]]
14. REPERTI VISIVI E DOCUMENTI D'EPOCA (PERGAMENE, LETTERE, RUNE, DISPACCI):
    Quando i giocatori scoprono un documento fisico d'epoca coerente con l'ambientazione (una lettera sigillata con cera lacca, un tomo o pietra runica con simboli occulti, un bando di taglia nel West, un dispaccio militare o una nota cifrata), genera il reperto visivo per il tavolo PC inserendo a fine risposta:
    [[REPERTO: {"type": "parchment", "title": "Titolo Documento", "subtitle": "Contesto di ritrovamento", "content": "Testo d'epoca del documento...", "authorOrSeal": "Firma o Sigillo", "secretHint": "Dettaglio nascosto rivelabile"}]]
    (type ammessi: "parchment", "runic_stone", "military_dispatch", "bounty_poster")
${
  isMultiFaction
    ? `
15. REGIA A SCENE ALTERNATE & PARALLELE PER PIÙ FAZIONI / GRUPPI SEPARATI (UNIVERSALE PER OGNI EPOCA):
    Nella cronaca sono presenti giocatori appartenenti a fazioni, gruppi o luoghi diversi:
    ${distinctFactions.map((f) => `• Fazione / Squadra "${f}": ${factionMap[f].join(', ')}`).join('\n')}
    L'azione attuale è compiuta da: ${actingName} (Fazione: ${actingFaction}).

    REGOLA FONDAMENTALE DI REGIA CINEMATOGRAFICA A SCENE PARALLELE:
    - RISOLUZIONE COMPLETA DELLA SCENA ATTUALE:
      Narra l'esito dell'azione per ${actingName} e per la sua squadra/fazione (${actingFaction}), descrivendo l'impatto ambientale, le reazioni dei PNG presenti e le conseguenze tattiche immediate.
    - PASSAGGIO DI TESTIMONE E SCENA DEDICATA ALL'ALTRA FAZIONE:
      Quando la scena o lo scambio di battute di ${actingName} trova un punto di svolta, di stallo o di respiro, NON limitarti a una fugace frase di sfondo! Effettua uno STACCO NARRATIVO CHIARO E DEDICATO aprendo una vera scena giocabile per i personaggi dell'altra fazione (es. ${distinctFactions.filter((f) => f !== actingFaction).join(', ')}) chiamando per nome i loro interpreti.
      Descrivi la situazione reale in cui si trovano, l'ambiente, la minaccia o l'opportunità immediata, e fornisci loro pieno spazio d'azione, decisioni e protagonismo!
    - DESTINI INCROCIATI E CONVERGENZA:
      Le azioni, le scoperte, i rumori o gli esiti provocati da una fazione modificano in tempo reale la situazione dell'altra (es. allarmi scattati, pattuglie richiamate altrove, blackout, spari uditi in lontananza, alleanze possibili, agguati incrociati). Le storie corrono parallele per poi intrecciarsi in modo dinamico e naturale!
    - OPZIONI DEDICATE A ENTRAMBE LE PARTI:
      Nelle 3-4 opzioni finali, proponi scelte concrete per chi ha appena agito E/O una mossa d'apertura per i personaggi della fazione parallela!
`
    : ''
}
`.trim();

        // Estrai gli ultimi messaggi per la memoria narrativa
        const recentHistory = (history || [])
          .slice(-6)
          .map((m) => `${m.sender === 'narrator' ? 'NARRATORE' : m.senderName || 'GIOCATORE'}: ${m.text}`)
          .join('\n\n');

        let rollDesc = 'Nessun tiro di dado effettuato in questo turno.';
        if (latestRoll) {
          const diceStr = Array.isArray(latestRoll.dice) ? latestRoll.dice.join(', ') : '';
          rollDesc = `Tiro d10 Chronica Engine (${latestRoll.attributeName || 'Azione'}${latestRoll.abilityName ? ' + ' + latestRoll.abilityName : ''}${latestRoll.weaponName ? ' con ' + latestRoll.weaponName : ''}): Dadi [${diceStr}], ${latestRoll.isChanceDie ? 'TIRO DI FORTUNA (Solo 10 = successo, 1 = Fallimento Drammatico)' : 'Soglia Fissa 8+ (10-Again)'}, Successi Totali: ${Math.max(0, latestRoll.netSuccesses || 0)}, Esito: ${(latestRoll.outcome || 'successo').toUpperCase()}${latestRoll.damageInflicted !== undefined ? `, Danni Diretti Inflitti (Tiro Unico): ${latestRoll.damageInflicted} [${(latestRoll.damageType || 'lethal').toUpperCase()}]` : ''}`;
        }

        const { invDesc, powersDesc, trainedAbilitiesDesc, meritsDesc } = formatCharacterDetailsForAI(actingChar);

        const storyOutlineBlock = campaign.customStoryOutline?.content?.trim()
          ? `
========================================================================
📜 CANOVACCIO UFFICIALE DELLA CRONACA (GUIDA NARRATIVA DELL'AUTORE/MASTER):
La cronaca deve svilupparsi seguendo rigorosamente questa bozza/trama stabilita dal Master:
"""
${campaign.customStoryOutline.content}
"""

DIRETTIVE NARRATIVE VINCOLANTI PER LA PROGRESSIONE DELLA CRONACA:
1. PROGRESSIONE PASSO-PASSO DELLA TRAMA: Fai progredire la storia rigorosamente un momento alla volta lungo gli snodi, i dialoghi e le decisioni del gruppo. Se i personaggi stanno affrontando una conversazione, un'udienza o una trattativa, gioca ORA quella scena, senza compiere salti temporali arbitrari o teletrasportarli alle scene successive!
2. RIVELAZIONI GRADUALI E ZERO SPOILER PREMATURI: È TASSATIVAMENTE VIETATO rivelare tradimenti futuri, doppi giochi di committenti/PNG o colpi di scena prima che i giocatori abbiano effettivamente raggiunto quelle fasi o scoperto gli indizi sul campo! Fai recitare i PNG in modo credibile, persuasivo e coerente col loro ruolo apparente, senza che la voce narrante anticipi o tradisca i loro secondi fini.
3. CONSEGUENZE COERENTI: Se i giocatori compiono scelte inaspettate o deviano dal percorso previsto, adatta la reazione del mondo mantenendo la rotta verso i temi, le fazioni e gli obiettivi descritti nella bozza.
========================================================================
`
          : '';

        const chosenPlayerNames = activeTablePlayers.map((p) => (p.name || p.character?.name || '').toLowerCase().trim());

        const unchosenCast = Array.isArray(campaign.rosterCharacters)
          ? campaign.rosterCharacters.filter((rc) => !chosenPlayerNames.includes((rc.name || '').toLowerCase().trim()))
          : [];

        const unchosenCastBlock = unchosenCast.length > 0
          ? `
========================================================================
👥 PERSONAGGI DEL CAST GESTITI ESCLUSIVAMENTE DALL'IA NARRATORE (${unchosenCast.length} COMPRIMARI/PNG):
I seguenti personaggi appartengono alla cronaca dell'autore ma NON sono stati scelti da giocatori umani:
${unchosenCast
  .map(
    (c) =>
      `- ${c.name} (${c.concept} - ${c.creatureType}${c.factionOrClan ? `, ${c.factionOrClan}` : ''}): Virtù ${c.virtue || 'Giustizia'}, Vizio ${c.vice || 'Ira'}. Dotazione: ${c.inventory?.map((i) => i.name).join(', ') || 'Oggetti base'}. ${c.backgroundNotes ? `[Note: ${c.backgroundNotes}]` : ''}`
  )
  .join('\n')}

DIRETTIVA ASSOLUTA DI GESTIONE PNG DEL CAST:
L'IA Narratore DEVE dare vita attivamente a questi personaggi nel mondo di gioco:
1. Falli interagire, dialogare e agire in scena in accordo con la loro personalità, stirpe e fazione.
2. Possono essere compagni d'armi al fianco dei giocatori, figure neutrali con obiettivi personali, o rivali a seconda della trama.
3. Non ignorarli né lasciarli indietro: sono personaggi ufficiali creati dall'autore per popolare la storia!
========================================================================
`
          : '';

        const userPrompt = `
CONTESTO CRONACA:
- Titolo: ${campaign.title} | Epoca: ${campaign.eraLabel || campaign.era} | Luogo: ${campaign.city}
- Personaggio attivo: ${actingName} (${actingChar?.creatureType || 'hunter'} - ${actingFaction}) | Concetto: ${actingChar?.concept || 'Avventuriero'}

${storyOutlineBlock}

${unchosenCastBlock}
- Salute: ${actingChar?.healthLevels ? actingChar.healthLevels.filter((h) => !h.marked).length + '/' + actingChar.healthLevels.length : 'Buona'}
- Psicologia: Virtù ${actingChar?.virtue || actingChar?.nature || 'Prudenza'}, Vizio ${actingChar?.vice || actingChar?.demeanor || 'Orgoglio'} | Moralità: ${actingChar?.morality ?? 7}
- Attributi (3x3): Mentali [Intelligenza ${actingChar?.attributes?.intelligence || 2}, Prontezza ${actingChar?.attributes?.wits || 2}, Fermezza ${actingChar?.attributes?.resolve || 2}] | Fisici [Forza ${actingChar?.attributes?.strength || 2}, Destrezza ${actingChar?.attributes?.dexterity || 2}, Costituzione ${actingChar?.attributes?.stamina || 2}] | Sociali [Presenza ${actingChar?.attributes?.presence || 2}, Ascendente ${actingChar?.attributes?.manipulation || 2}, Autocontrollo ${actingChar?.attributes?.composure || 2}]
- Tratti Derivati: Difesa ${actingChar?.defense || 2}, Iniziativa +${actingChar?.initiativeMod || 4}, Velocità ${actingChar?.speed || 9}, Armatura ${actingChar?.armor || 0}
- Inventario & Munizioni Reali (SOLO QUESTI OGGETTI ESISTONO): ${invDesc}
- Abilità Addestrate Reali (VALORE > 0): ${trainedAbilitiesDesc}
- Poteri / Discipline Attive (LIVELLO > 0): ${powersDesc}
- Meriti & Difetti Reali: ${meritsDesc}

${
  isMultiFaction
    ? `CALIBRAZIONE TAVOLO MULTI-FAZIONE (${activeTablePlayers.length} GIOCATORI DI DIVERSE FAZIONI):\n- Turno attivo: ${actingName} (${actingFaction})\n- Altre fazioni in gioco: ${distinctFactions.filter((f) => f !== actingFaction).join(', ') || 'Nessuna'}\n- Regia: applica il montaggio parallelo e destini incrociati!`
    : hasMultiplePlayers
    ? `CALIBRAZIONE TAVOLO SQUADRA (${activeTablePlayers.length} GIOCATORI AL TAVOLO):\n- Eroi presenti: ${activeTablePlayers.map((p) => `${p.name} (${p.factionOrClan || p.concept})`).join(', ')}\n- MODELLAZIONE DELLA SCENA: Gestisci la scena per un gruppo di ${activeTablePlayers.length} avventurieri. Modella le minacce, gli avversari e le opportunità affinché tutti abbiano un ruolo.\n- TURNO ATTIVO: L'azione attuale è di ${actingName}. Rispondi alla sua azione, ma tieni conto della presenza dei compagni.`
    : `CALIBRAZIONE AVVENTURA SOLITARIA (1 GIOCATORE):\n- Protagonista unico: ${actingName}. Modella la tensione e le sfide su misura per un singolo eroe.`
}

ULTIMI SCAMBI RECENTI:
${recentHistory || 'Inizio della cronaca.'}

AZIONE ATTUALE DEL GIOCATORE:
"${latestAction}"

ESITO TIRO DADI:
${rollDesc}

Scrivi la narrazione della scena successiva in lingua ITALIANA.
`.trim();

        const rawText = await callGemini(userPrompt, systemPrompt);
        const result = parseAIResponse(rawText, [
          'Valuti attentamente la reazione del tuo avversario.',
          'Sfrutti la conformazione del luogo a tuo vantaggio.',
          'Incalzi con una domanda o una minaccia diretta.',
        ]);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error('Errore /api/ai/narrate:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API 7b: Domande di Chiarimento Scena al Narratore (Fuori Gioco / OOC - Senza avanzare la storia)
  if (pathname === '/api/ai/ask-narrator' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const { campaign, character, history, question, party } = JSON.parse(body);

        const actingChar = character || (Array.isArray(party) && party[0]?.character) || null;
        const actingName = actingChar?.name || 'Giocatore';

        const recentHistory = (history || [])
          .slice(-6)
          .map((m) => {
            const senderTag = m.sender === 'narrator' ? 'NARRATORE' : m.senderName || 'GIOCATORE';
            return `[${senderTag}]: ${m.text}`;
          })
          .join('\n\n');

        const isSketchReq = /schizzo|mappa|tattic|battlemap|disposizion|posizion|dove siamo|campo di battaglia/i.test(question);

        const systemPrompt = `
Sei il NARRATORE di una sessione di gioco di ruolo guidata dal Chronica D10 Engine.
Il giocatore ti sta ponendo una DOMANDA FUORI GIOCO (OOC) o chiedendo un CHIARIMENTO sulla scena attuale (ad esempio: disposizione nemici, coperture balistiche o fisiche, vie di fuga, illuminazione, distanze, ambiente circostante o dettagli visibili).

REGOLA TASSATIVA DI CONGELAMENTO DELLA SCENA:
1. Rispondi in modo sintetico, preciso e descrittivo (2-4 frasi chiare) come farebbe un Dungeon Master al tavolo quando un giocatore chiede informazioni prima di dichiarare la mossa.
2. DIVIETO ASSOLUTO: È severamente vietato far avanzare il tempo, far agire o attaccare i nemici, infliggere ferite o cambiare la situazione narrativa!
3. La scena deve rimanere esattamente nello stato in cui si trova, fornendo solo le informazioni ambientali richieste per aiutare il giocatore a scegliere la sua prossima azione.
4. Non inserire tag come [[TIRO:]], [[OPZIONI:]] o [[DANNO_GIOCATORE:]].
5. SCHIZZO TATTICO SU RICHIESTA (BATTLEMAP BLUEPRINT):
   Se il giocatore chiede esplicitamente uno schizzo tattico, la mappa della zona, le posizioni dei presenti o le coperture (es. "fammi uno schizzo tattico", "dove siamo disposti?", "dove sono i nemici?"), genera SEMPRE a fine risposta il blocco JSON per la griglia tattica:
   [[BATTLEMAP: {"title": "Titolo Scena", "locationName": "Luogo", "entities": [{"id": "p1", "name": "${actingName}", "type": "player", "x": 50, "y": 75}, {"id": "e1", "name": "Nome Nemico/PNG", "type": "enemy", "x": 50, "y": 30}], "terrain": [{"type": "cover", "x": 45, "y": 55, "w": 20, "h": 8, "label": "Copertura / Riparo"}]}]]
   (usa coordinate x, y in percentuale da 10 a 90; type entità: "player", "enemy", "boss"; type terreno: "cover", "wall", "door", "hazard").
`.trim();

        const userPrompt = `
CRONACA: ${campaign.title} | Epoca: ${campaign.eraLabel || campaign.era} | Luogo: ${campaign.city}
PERSONAGGIO: ${actingName} (${actingChar?.creatureType || 'hunter'})

STATO ATTUALE DELLA SCENA (ULTIMI SCAMBI):
${recentHistory || 'Inizio della scena.'}

DOMANDA FUORI GIOCO DEL GIOCATORE:
"${question}"
${
  isSketchReq
    ? `\n⚠️ RICHIESTA ESPLICITA DI SCHIZZO TATTICO:\nIl giocatore richiede espressamente uno SCHIZZO TATTICO del campo di battaglia o della disposizione! È TASSATIVO concludere la risposta con il blocco JSON coerente con la scena descritta:\n[[BATTLEMAP: {"title": "Schizzo Tattico: ${campaign.city}", "locationName": "${campaign.city}", "entities": [{"id": "p1", "name": "${actingName}", "type": "player", "x": 45, "y": 75}], "terrain": [{"type": "cover", "x": 40, "y": 50, "w": 20, "h": 10, "label": "Copertura / Obiettivo"}]}]]\nIncludi tutti i presenti e gli elementi cardine (PNG, compagni, nemici, ostacoli) nelle entities e terrain!`
    : ''
}

Fornisci il chiarimento della scena in lingua ITALIANA.
`.trim();

        const rawAnswer = await callGemini(userPrompt, systemPrompt);
        let battlemap = undefined;
        let answerText = rawAnswer.trim();
        const battlemapMatch = answerText.match(/\[\[(?:BATTLEMAP|SCHIZZO_TATTICO):\s*(\{.*?\})\s*\]\]/s);
        if (battlemapMatch) {
          try {
            battlemap = JSON.parse(battlemapMatch[1]);
            answerText = answerText.replace(battlemapMatch[0], '').trim();
          } catch (e) {
            console.warn('Errore parsing BATTLEMAP in ask-narrator:', e);
          }
        }

        // Se l'utente ha chiesto espressamente uno schizzo tattico ma l'IA non ha emesso il tag JSON, costruisci una battlemap automatica contestuale intelligente
        if (!battlemap && isSketchReq) {
          const autoEntities = [
            { id: 'p_main', name: actingName, type: 'player', x: 45, y: 75, label: actingName.charAt(0), hp: 'Attivo' }
          ];

          // Cerca comprimari o personaggi del cast citati nel testo della risposta
          if (Array.isArray(campaign.rosterCharacters)) {
            campaign.rosterCharacters.forEach((rc, idx) => {
              if (rc.name && rc.name.toLowerCase() !== actingName.toLowerCase() && answerText.toLowerCase().includes(rc.name.toLowerCase())) {
                const isHostile = /nemico|ostile|colosso|minaccia|furia|predatore/i.test(rc.concept || '') || answerText.toLowerCase().includes('presa di ' + rc.name.toLowerCase());
                autoEntities.push({
                  id: `roster_${rc.id || idx}`,
                  name: rc.name,
                  type: isHostile ? 'boss' : 'player',
                  x: 30 + (autoEntities.length * 20),
                  y: isHostile ? 35 : 65,
                  label: rc.name.charAt(0).toUpperCase(),
                  hp: 'Presente',
                  threat: rc.concept || (isHostile ? 'Avversario' : 'Compagno')
                });
              }
            });
          }

          // Riconosci elementi scenici citati nel testo
          const autoTerrain = [];
          if (/cassa/i.test(answerText)) {
            autoTerrain.push({ id: 't_cassa', type: 'cover', x: 42, y: 52, w: 16, h: 8, label: 'Cassa della Paga (Centro)' });
          }
          if (/tende?/i.test(answerText)) {
            autoTerrain.push({ id: 't_tende', type: 'cover', x: 15, y: 40, w: 22, h: 10, label: 'Tende da Campo Squarciate' });
          }
          if (/trincea/i.test(answerText)) {
            autoTerrain.push({ id: 't_trincea', type: 'hazard', x: 25, y: 15, w: 50, h: 7, label: 'Trincea Fangosa (Uscita Nord)' });
          }
          if (/guardie?/i.test(answerText)) {
            autoTerrain.push({ id: 't_guardie', type: 'hazard', x: 70, y: 45, w: 18, h: 8, label: 'Guardie Tramortite a Terra' });
          }
          if (autoTerrain.length === 0) {
            autoTerrain.push({ id: 't_cover1', type: 'cover', x: 40, y: 50, w: 20, h: 8, label: 'Riparo Principale' });
          }

          battlemap = {
            title: `Schizzo Tattico: ${campaign.city}`,
            locationName: campaign.city,
            gridSize: 10,
            entities: autoEntities,
            terrain: autoTerrain,
            notes: 'Schizzo ricavato dall\'analisi dell\'ambiente e delle posizioni dei presenti.'
          };
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ answer: answerText, battlemap }));
      } catch (err) {
        console.error('Errore /api/ai/ask-narrator:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API 7b: Importazione Documenti Cronaca (Word .docx/.doc, Excel .xlsx/.xls/.csv, Testo) ed Estrazione Cast con IA
  if (pathname === '/api/ai/import-cast-file' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const { fileBase64, fileName, text } = JSON.parse(body);
        let extractedText = text || '';

        if (fileBase64) {
          const buffer = Buffer.from(fileBase64, 'base64');
          const ext = path.extname(fileName || '').toLowerCase();

          if (ext === '.docx' || ext === '.doc') {
            try {
              const res = await mammoth.extractRawText({ buffer });
              extractedText = res.value || '';
            } catch (docErr) {
              console.warn('Errore lettura con Mammoth, fallback a testo grezzo:', docErr.message);
              extractedText = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t\u00A0-\u024F]/g, ' ');
            }
          } else if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
            try {
              const workbook = xlsx.read(buffer, { type: 'buffer' });
              const sheetTexts = [];
              for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                const csv = xlsx.utils.sheet_to_csv(sheet);
                if (csv && csv.trim()) {
                  sheetTexts.push(`=== FOGLIO: ${sheetName} ===\n` + csv);
                }
              }
              extractedText = sheetTexts.join('\n\n');
            } catch (xlErr) {
              console.warn('Errore lettura con XLSX, fallback a buffer:', xlErr.message);
              extractedText = buffer.toString('utf-8');
            }
          } else {
            extractedText = buffer.toString('utf-8');
          }
        }

        if (!extractedText || extractedText.trim().length < 15) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Nessun contenuto testuale estratto o file troppo breve/non leggibile.' }));
          return;
        }

        const systemPrompt = `Sei un esperto Master e Archivista per il motore di gioco di ruolo Chronica D10 Engine.
Il tuo compito è analizzare cronache, schede, appunti o tabelle (Word, Excel o Testo) ed estrarre TUTTI i personaggi (protagonisti, comprimari, antagonisti, PNG di fazione).
Per ogni personaggio trovato, devi restituire un oggetto JSON completo con le regole D10. Se alcuni dati numerici (attributi, abilità) non sono indicati esplicitamente, deducili con intelligenza e coerenza dal concetto, dalla professione e dal background.
Rispondi ESCLUSIVAMENTE con un array JSON valido [...] e nessun commento o testo extra.`;

        const userPrompt = `Analizza questo documento ed estrai tutti i personaggi del Cast:

"""
${extractedText.substring(0, 120000)}
"""

Restituisci un array JSON di oggetti personaggio con questa struttura:
[
  {
    "name": "Nome Personaggio",
    "concept": "Concetto o Ruolo (es. Ex Investigatore, Protagonista, Boss)",
    "creatureType": "hunter" | "vampire" | "werewolf" | "mage" | "mortal",
    "factionOrClan": "Clan, Tribù o Fazione di appartenenza",
    "isProtagonistSlot": true | false,
    "virtue": "Virtù (es. Giustizia, Fortezza, Prudenza, Speranza)",
    "vice": "Vizio (es. Ira, Orgoglio, Avarizia, Superbia)",
    "morality": 7,
    "attributes": {
      "intelligence": 2, "wits": 2, "resolve": 2,
      "strength": 2, "dexterity": 2, "stamina": 2,
      "presence": 2, "manipulation": 2, "composure": 2
    },
    "abilities": {
      "firearms": 3, "athletics": 2
    },
    "inventory": [
      {
        "id": "item_1",
        "name": "Nome Oggetto o Arma",
        "category": "weapon" | "armor" | "ammo" | "item",
        "damage": 2,
        "quantity": 1,
        "description": "Descrizione arma/oggetto"
      }
    ],
    "meritsFlaws": [
      { "id": "m1", "name": "Nome Merito o Difetto", "type": "merit", "dots": 2, "description": "Effetto descritto" }
    ],
    "backgroundNotes": "Testo completo e fedele di Origini, Pregi, Difetti, Carattere e indicazioni di interpretazione..."
  }
]
REGOLE SPECIALI E UNIVERSALI:
1. 'isProtagonistSlot': imposta 'true' SOLO se nel documento il personaggio ha esclusivamente il nome o è esplicitamente indicato come protagonista/slot giocatore senza descrizione; imposta 'false' per tutti gli altri comprimari, specialisti o PNG con un ruolo.
2. DEDUZIONE OBBLIGATORIA DELL'EQUIPAGGIAMENTO IN BASE AL RUOLO E ALL'EPOCA:
   Per OGNI personaggio con un ruolo definito (eccetto gli slot protagonista vuoti), genera SEMPRE in 'inventory' da 3 a 5 oggetti specialistici realistici coerenti con la sua mansione e con l'ambientazione storica/tecnologica della storia:
   - Mitragliere di Supporto / Heavy Gunner: Mitragliatrice Pesante (es. M60 / Minimi), Nastri munizioni (100 colpi), Giubbotto tattico rinforzato, Pistola ausiliaria.
   - Tiratore Scelto / Cecchino: Fucile di Precisione con Ottica Telemetrica Avanzata, Munizioni di precisione, Pistola ausiliaria, Giacca tattica kevlar.
   - Medico di Squadra: Kit Medico di Pronto Soccorso Avanzato per traumi da campo, Stimolanti/analgesici, Pistola di difesa.
   - Granatiere / Esperto Esplosivi: Cariche di Plastico C4 con detonatori, Granate a frammentazione, Fucile compatto d'assalto.
   - Capitano / Leader: Fucile d'assalto militare, Pistola pesante, Giubbotto tattico, Radio da campo.
   - Cavaliere / Guerriero Medievale: Spada da guerra, Scudo rinforzato, Cotta di maglia o Corazza a piastre, Pugnale.
   - Arciere / Esploratore: Arco da guerra composito, Faretra con 20 frecce, Daga, Abiti di cuoio.
   - Samurai / Shinobi: Katana magistrale, Wakizashi o Shuriken, Armatura laccata o abiti da infiltrazione.
   - Pistolero Far West: Revolver pesante (.45 Peacemaker), Fucile a ripetizione Winchester, Giberna cartucce, Spolverino di cuoio.
3. PRESERVAZIONE INTEGRALE DELLE NOTE BIOGRAFICHE E GUIDA DI RUOLO:
   Estrai e conserva in 'backgroundNotes' TUTTI i dettagli presenti nel documento per ciascun personaggio senza tagliarli o riassumerli:
   - Le Origini e la storia personale;
   - I Pregi e punti di forza tattici/psicologici;
   - I Difetti, debolezze fisiche e limiti caratteriali;
   - Carattere, Temperamento e stile di interpretazione al tavolo.
   Formatta il testo in modo chiaro e leggibile con paragrafi distinti. I giocatori useranno questo testo integrale sulla loro scheda per interpretare fedelmente il proprio personaggio!
4. COERENZA CRITICA TRA EQUIPAGGIAMENTO E ABILITÀ (DA 1 A 5 PALLINI):
   È TASSATIVAMENTE VIETATO lasciare a 0 le abilità di combattimento di un personaggio che possiede armi o combatte:
   - Se possiede armi da mischia (spade, katane, pugnali, asce) o combatte all'arma bianca: assegna OBBLIGATORIAMENTE da 3 a 5 pallini a 'weaponry' (es. "weaponry": 4 per mercenari e spadaccini a due armi come Kael "Lupo di Ferro")!
   - Se possiede archi, fucili o pistole: assegna OBBLIGATORIAMENTE da 3 a 5 pallini a 'firearms' (es. "firearms": 4 per arcieri o cecchini come Silas "Occhio del Corvo")!
   - Se è un colosso o lottatore potente: assegna OBBLIGATORIAMENTE 4 o 5 a 'strength', e 3 o 4 a 'brawl' o 'weaponry' (es. Grom "Montagna Pensante")!
   - In 'abilities' elenca SOLO le abilità con punteggio > 0 (da 1 a 5).`;

        const rawAiRes = await callGemini(userPrompt, systemPrompt, {
          maxTokens: 16000,
          temperature: 0.2,
          isJson: true,
        });

        const parsedChars = safeParseJsonArray(rawAiRes);

        if (!Array.isArray(parsedChars) || parsedChars.length === 0) {
          throw new Error('Nessun personaggio valido estratto dal documento.');
        }

        const finalizedCharacters = parsedChars.map((raw, idx) => {
          const creature = ['hunter', 'vampire', 'werewolf', 'mage', 'mortal'].includes((raw.creatureType || '').toLowerCase())
            ? raw.creatureType.toLowerCase()
            : 'mortal';

          const isProtagonistSlot = Boolean(
            raw.isProtagonistSlot === true ||
              (!raw.backgroundNotes && (!raw.abilities || Object.keys(raw.abilities).length === 0)) ||
              (raw.concept && /protagonista|giocatore|pg/i.test(raw.concept))
          );

          const energyName = creature === 'vampire' ? 'Vitae' : creature === 'werewolf' ? 'Essenza' : creature === 'mage' ? 'Mana' : 'Risorsa';

          const attrs = {
            intelligence: Number(raw.attributes?.intelligence) || 2,
            wits: Number(raw.attributes?.wits) || 2,
            resolve: Number(raw.attributes?.resolve) || 2,
            strength: Number(raw.attributes?.strength) || 2,
            dexterity: Number(raw.attributes?.dexterity) || 2,
            stamina: Number(raw.attributes?.stamina) || 2,
            presence: Number(raw.attributes?.presence) || 2,
            manipulation: Number(raw.attributes?.manipulation) || 2,
            composure: Number(raw.attributes?.composure) || 2,
          };

          const getVal = (obj, keys, defaultVal = 0) => {
            if (!obj) return defaultVal;
            for (const k of keys) {
              if (obj[k] !== undefined && obj[k] !== null && !isNaN(Number(obj[k]))) {
                return Number(obj[k]);
              }
            }
            return defaultVal;
          };

          const rawAbils = raw.abilities || {};
          const abils = {
            academics: getVal(rawAbils, ['academics', 'accademiche', 'cultura', 'istruzione']),
            computer: getVal(rawAbils, ['computer', 'informatica', 'tecnologia', 'hacking']),
            investigation: getVal(rawAbils, ['investigation', 'investigare', 'indagare', 'investigazione']),
            crafts: getVal(rawAbils, ['crafts', 'artigianato', 'fabbro', 'riparare']),
            medicine: getVal(rawAbils, ['medicine', 'medicina', 'prontoSoccorso', 'curare']),
            occult: getVal(rawAbils, ['occult', 'occulto', 'esoterismo', 'misticismo']),
            politics: getVal(rawAbils, ['politics', 'politica', 'diplomazia', 'legge']),
            science: getVal(rawAbils, ['science', 'scienza', 'alchimia']),
            firearms: getVal(rawAbils, ['firearms', 'armiDaFuoco', 'armi_da_fuoco', 'tiro', 'shooting', 'arco', 'balestra', 'fucili', 'pistole']),
            weaponry: getVal(rawAbils, ['weaponry', 'armiDaMischia', 'armi_da_mischia', 'mischia', 'melee', 'spada', 'spade', 'katana', 'scherma', 'lame']),
            athletics: getVal(rawAbils, ['athletics', 'atletica', 'corsa', 'acrobazia']),
            larceny: getVal(rawAbils, ['larceny', 'furto', 'scassinare', 'borseggio']),
            stealth: getVal(rawAbils, ['stealth', 'furtivita', 'furtività', 'nascondersi']),
            drive: getVal(rawAbils, ['drive', 'guidare', 'equitazione', 'cavalcare', 'pilotare']),
            brawl: getVal(rawAbils, ['brawl', 'rissa', 'lotta', 'pugilato', 'artiMarziali']),
            survival: getVal(rawAbils, ['survival', 'sopravvivenza', 'esplorazione', 'natura']),
            animalKen: getVal(rawAbils, ['animalKen', 'addestrareAnimali', 'animali', 'empatiaAnimale']),
            streetwise: getVal(rawAbils, ['streetwise', 'strada', 'sottobosco', 'bassifondi']),
            empathy: getVal(rawAbils, ['empathy', 'empatia', 'intuizione', 'psicologia']),
            expression: getVal(rawAbils, ['expression', 'espressione', 'espressivita', 'espressività', 'oratoria', 'arte']),
            intimidation: getVal(rawAbils, ['intimidation', 'intimidire', 'intimidazione', 'minacciare']),
            persuasion: getVal(rawAbils, ['persuasion', 'persuasione', 'eloquenza', 'negoziare', 'trattare']),
            socialize: getVal(rawAbils, ['socialize', 'socializzare', 'etichetta', 'sociale']),
            subterfuge: getVal(rawAbils, ['subterfuge', 'sotterfugio', 'inganno', 'raggirare', 'dissimulazione']),
          };

          // Sanity check logico equipaggiamento/ruolo: chi combatte con armi NON può avere abilità a 0
          const charBioScan = `${raw.name || ''} ${raw.concept || ''} ${raw.backgroundNotes || ''} ${(Array.isArray(raw.inventory) ? raw.inventory.map(i => typeof i === 'string' ? i : i.name).join(' ') : '')}`.toLowerCase();
          const usesMelee = /katana|spada|daga|pugnale|ascia|lancia|lama|mischia|claymore|zanne|spadaccin|guerrier|mercenari/i.test(charBioScan);
          const usesRanged = /fucil|pistol|revolver|arco|balestr|cecchin|tirator|frecc|munizion|ottica|occhio del corvo/i.test(charBioScan);
          const isPowerhouse = /gigante|colosso|montagna|forza titanica|lottatore|berserk|grom/i.test(charBioScan);

          if (usesMelee && abils.weaponry < 2) {
            abils.weaponry = /doppi|gemell|zanne|lupo di ferro|maestro|letale/i.test(charBioScan) ? 4 : 3;
          }
          if (usesRanged && abils.firearms < 2) {
            abils.firearms = /cecchin|tirator|occhio del corvo|maestro/i.test(charBioScan) ? 4 : 3;
          }
          if (isPowerhouse) {
            if (attrs.strength < 3) attrs.strength = 4;
            if (attrs.stamina < 3) attrs.stamina = 4;
            if (abils.brawl < 2 && abils.weaponry < 2) abils.brawl = 3;
          }

          let structuredInventory = Array.isArray(raw.inventory) && raw.inventory.length > 0
            ? raw.inventory.map((inv, i) => {
                let itemName = inv.name || 'Oggetto';
                let itemQty = inv.quantity || 1;
                if (/doppia katana/i.test(itemName)) {
                  itemName = 'Due Katane Gemelle';
                  itemQty = 2;
                }
                return {
                  id: inv.id || `inv_${Date.now()}_${idx}_${i}`,
                  name: itemName,
                  category: inv.category || 'item',
                  quantity: itemQty,
                  damage: inv.damage,
                  armorBonus: inv.armorBonus,
                  description: inv.description || '',
                };
              })
            : [];

          // Deduzione di emergenza se l'inventario è vuoto per comprimari/specialisti
          if (structuredInventory.length === 0 && !isProtagonistSlot) {
            const roleScan = `${raw.name || ''} ${raw.concept || ''}`.toLowerCase();
            if (/mitragliere|supporto|heavy|gunner/i.test(roleScan)) {
              structuredInventory = [
                { id: `inv_${Date.now()}_${idx}_0`, name: 'Mitragliatrice Pesante di Supporto M60', category: 'weapon', quantity: 1, damage: 5, description: 'Mitragliatrice pesante di squadra con fuoco automatico.' },
                { id: `inv_${Date.now()}_${idx}_1`, name: 'Nastro Munizioni Pesanti (x100 colpi)', category: 'ammo', quantity: 100, description: 'Nastro a maglie metalliche calibro 7.62mm.' },
                { id: `inv_${Date.now()}_${idx}_2`, name: 'Giubbotto Antiproiettile Tattico', category: 'armor', quantity: 1, armorBonus: 2, description: 'Protezione balistica pesante.' },
                { id: `inv_${Date.now()}_${idx}_3`, name: 'Pistola Pesante Colt .45', category: 'weapon', quantity: 1, damage: 3, description: 'Arma corta di supporto.' }
              ];
            } else if (/cecchino|tiratore|sniper|precisione/i.test(roleScan)) {
              structuredInventory = [
                { id: `inv_${Date.now()}_${idx}_0`, name: 'Fucile da Cecchino di Precisione Barrett / L96', category: 'weapon', quantity: 1, damage: 5, description: 'Fucile con ottica balistica ad alta gittata.' },
                { id: `inv_${Date.now()}_${idx}_1`, name: 'Munizioni da Cecchino ad Alta Precisione (x10)', category: 'ammo', quantity: 10, description: 'Cartucce perforanti.' },
                { id: `inv_${Date.now()}_${idx}_2`, name: 'Pistola Silenziata', category: 'weapon', quantity: 1, damage: 2, description: 'Pistola per eliminazioni silenziose.' },
                { id: `inv_${Date.now()}_${idx}_3`, name: 'Giacca Tattica in Kevlar', category: 'armor', quantity: 1, armorBonus: 1, description: 'Protezione leggera per tiratori.' }
              ];
            } else if (/medico|sanitario|dottore/i.test(roleScan)) {
              structuredInventory = [
                { id: `inv_${Date.now()}_${idx}_0`, name: 'Kit Medico da Campo Avanzato', category: 'item', quantity: 1, description: 'Bende emostatiche, siringhe e strumenti chirurgici.' },
                { id: `inv_${Date.now()}_${idx}_1`, name: 'Pistola Compatta 9mm', category: 'weapon', quantity: 1, damage: 2, description: 'Arma corta di difesa.' },
                { id: `inv_${Date.now()}_${idx}_2`, name: 'Giacca Tattica in Kevlar', category: 'armor', quantity: 1, armorBonus: 1, description: 'Protezione balistica.' }
              ];
            } else if (/granatiere|esplosiv|c4/i.test(roleScan)) {
              structuredInventory = [
                { id: `inv_${Date.now()}_${idx}_0`, name: 'Cariche di Plastico C4 con Innesco', category: 'weapon', quantity: 2, damage: 6, description: 'Esplosivo ad alto potenziale di demolizione.' },
                { id: `inv_${Date.now()}_${idx}_1`, name: 'Granate a Frammentazione', category: 'weapon', quantity: 2, damage: 4, description: 'Granate tattiche a schegge.' },
                { id: `inv_${Date.now()}_${idx}_2`, name: 'Fucile d\'Assalto Compatto', category: 'weapon', quantity: 1, damage: 4, description: 'Arma da fuoco automatica per scontri a medio raggio.' },
                { id: `inv_${Date.now()}_${idx}_3`, name: 'Giubbotto Antiproiettile', category: 'armor', quantity: 1, armorBonus: 2, description: 'Protezione balistica.' }
              ];
            }
          }

          const inventoryStrings = structuredInventory.map((i) => i.name);

          const defaultHealth = [
            { label: 'Salute (1)', penalty: 0, damage: 'none' },
            { label: 'Salute (2)', penalty: 0, damage: 'none' },
            { label: 'Salute (3)', penalty: 0, damage: 'none' },
            { label: 'Salute (4)', penalty: 0, damage: 'none' },
            { label: 'Ferito (-1)', penalty: -1, damage: 'none' },
            { label: 'Ferito Grave (-2)', penalty: -2, damage: 'none' },
            { label: 'Incapacitato (-3)', penalty: -3, damage: 'none' },
          ];

          return {
            id: `cast_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
            name: raw.name || `Personaggio ${idx + 1}`,
            concept: raw.concept || 'Avventuriero',
            creatureType: creature,
            factionOrClan: raw.factionOrClan || '',
            virtue: raw.virtue || 'Giustizia',
            vice: raw.vice || 'Ira',
            morality: Number(raw.morality) || 7,
            humanity: Number(raw.morality) || 7,
            attributes: attrs,
            abilities: abils,
            size: 5,
            defense: Math.min(attrs.dexterity, attrs.wits),
            speed: attrs.strength + attrs.dexterity + 5,
            initiativeMod: attrs.dexterity + attrs.composure,
            armor: 0,
            willpower: {
              current: attrs.resolve + attrs.composure,
              max: attrs.resolve + attrs.composure,
            },
            bloodOrEnergy: {
              name: energyName,
              current: 10,
              max: 10,
            },
            powers: [],
            meritsFlaws: Array.isArray(raw.meritsFlaws) ? raw.meritsFlaws : [],
            health: defaultHealth,
            inventory: inventoryStrings,
            structuredInventory,
            notes: raw.backgroundNotes || '',
            backgroundNotes: raw.backgroundNotes || '',
            isProtagonistSlot,
          };
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            fileName: fileName || 'documento',
            count: finalizedCharacters.length,
            characters: finalizedCharacters,
          })
        );
      } catch (err) {
        console.error('Errore /api/ai/import-cast-file:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API 8: Voce Neurale HD (Streaming MP3 da Microsoft Edge Neural Voice)
  if (pathname === '/api/tts') {
    const textToSpeak = parsedUrl.searchParams.get('text');
    if (!textToSpeak) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Parametro text mancante' }));
      return;
    }

    // Pulisci il testo da formule dadi, bracket tecnici, markdown e caratteri non pronunciabili
    const cleanText = textToSpeak
      .replace(/\[\[.*?\]\]/gs, '')
      .replace(/\[.*?\]/gs, '')
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/`{1,3}.*?`{1,3}/g, '')
      .replace(/^#+\s+/gm, '')
      .replace(/>\s*/gm, '')
      .replace(/^\s*[-*•]\s+/gm, '')
      .replace(/[🎲⚡🛡️🗡️⚔️💥🩸💀✨🎁]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Testo vuoto' }));
      return;
    }

    // Ampio supporto per scene complete (fino a 5000 caratteri)
    const truncatedText = cleanText.length > 5000 ? cleanText.substring(0, 5000) + '...' : cleanText;
    const requestedVoice = parsedUrl.searchParams.get('voice') || DEFAULT_TTS_VOICE;
    const customRate = parsedUrl.searchParams.get('rate') || '+15%';
    const textHash = crypto.createHash('md5').update(truncatedText + requestedVoice + customRate).digest('hex');

    // 1. Risposta istantanea se già in cache memoria (Latenza 0ms)
    if (ttsCache.has(textHash)) {
      const cachedBuffer = ttsCache.get(textHash);
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': cachedBuffer.length,
        'Cache-Control': 'public, max-age=86400',
      });
      res.end(cachedBuffer);
      return;
    }

    // 2. Se una richiesta per lo stesso audio è già in corso (es. prefetch in background), attendi il buffer
    if (inFlightTts.has(textHash)) {
      inFlightTts
        .get(textHash)
        .then((buf) => {
          if (!res.headersSent) {
            res.writeHead(200, {
              'Content-Type': 'audio/mpeg',
              'Content-Length': buf.length,
              'Cache-Control': 'public, max-age=86400',
            });
            res.end(buf);
          }
        })
        .catch((err) => {
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      return;
    }

    // 3. Genera nuovo audio con Edge Neural Voice
    (async () => {
      try {
        const client = await getTtsClientForVoice(requestedVoice);
        const { audioStream } = client.toStream(truncatedText, {
          rate: customRate,
          pitch: '+0Hz',
        });

        const chunks = [];
        res.writeHead(200, {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=86400',
        });

        // Registra promessa in volo per evitare chiamate duplicate
        const completionPromise = new Promise((resolve, reject) => {
          audioStream.on('data', (chunk) => {
            chunks.push(chunk);
            if (!res.writableEnded) {
              res.write(chunk);
            }
          });

          audioStream.on('end', () => {
            const fullBuffer = Buffer.concat(chunks);
            if (ttsCache.size > 250) {
              const firstKey = ttsCache.keys().next().value;
              ttsCache.delete(firstKey);
            }
            ttsCache.set(textHash, fullBuffer);
            inFlightTts.delete(textHash);
            if (!res.writableEnded) {
              res.end();
            }
            resolve(fullBuffer);
          });

          audioStream.on('error', (err) => {
            inFlightTts.delete(textHash);
            console.error('Errore stream TTS:', err);
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            } else if (!res.writableEnded) {
              res.end();
            }
            reject(err);
          });
        });

        inFlightTts.set(textHash, completionPromise);
      } catch (err) {
        inFlightTts.delete(textHash);
        console.error('Errore creazione audio TTS:', err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      }
    })();
    return;
  }

  // SERVIZIO FILE STATICI (dist/)
  let filePath = path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Errore lettura file');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

// 2. Server WebSockets per il Tavolo Condiviso (Stanze Multiplayer)
const wss = new WebSocketServer({ server, path: '/ws' });
const rooms = new Map();

wss.on('connection', (ws) => {
  let currentRoomCode = null;
  let currentPlayerId = null;
  let isHost = false;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG' }));
        return;
      }

      if (msg.type === 'CREATE_ROOM') {
        const { roomCode, campaign } = msg;
        currentRoomCode = roomCode;
        isHost = true;

        let room = rooms.get(roomCode);
        if (!room) {
          room = { roomCode, hostWs: ws, campaign, messages: [], players: new Map() };
          rooms.set(roomCode, room);
        } else {
          room.hostWs = ws;
          if (campaign) room.campaign = campaign;
        }

        const playersList = Array.from(room.players.values()).map((p) => p.player);
        ws.send(
          JSON.stringify({
            type: 'ROOM_STATE',
            roomCode,
            players: playersList,
            campaign: room.campaign,
            messages: room.messages,
            claimedLoot: room.claimedLoot || {},
            activeTurnPlayerId: room.activeTurnPlayerId,
            activeTurnPlayerName: room.activeTurnPlayerName,
            roundNumber: room.roundNumber || 1,
            combatState: room.combatState,
          })
        );
        return;
      }

      if (msg.type === 'JOIN_ROOM') {
        const { roomCode, player } = msg;
        currentRoomCode = roomCode;
        currentPlayerId = player.id;
        isHost = false;

        let room = rooms.get(roomCode);
        if (!room) {
          room = {
            roomCode,
            hostWs: null,
            campaign: undefined,
            messages: [],
            players: new Map(),
            claimedLoot: {},
            roundNumber: 1,
          };
          rooms.set(roomCode, room);
        }

        const isReconnecting = room.players.has(player.id);
        room.players.set(player.id, { player, ws, lastSeen: Date.now() });

        const playersList = Array.from(room.players.values()).map((p) => p.player);
        ws.send(
          JSON.stringify({
            type: 'ROOM_STATE',
            roomCode,
            players: playersList,
            campaign: room.campaign,
            messages: room.messages,
            claimedLoot: room.claimedLoot || {},
            activeTurnPlayerId: room.activeTurnPlayerId,
            activeTurnPlayerName: room.activeTurnPlayerName,
            roundNumber: room.roundNumber || 1,
            combatState: room.combatState,
          })
        );

        // Notifica l'host solo se è un giocatore che entra per la prima volta (MAI su riconnessioni da stand-by!)
        if (!isReconnecting && room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
          room.hostWs.send(JSON.stringify({ type: 'PLAYER_JOINED', player, isReconnecting: false }));
        }
        return;
      }

      if (msg.type === 'UPDATE_CHARACTER') {
        const { roomCode, playerId, character } = msg;
        const room = rooms.get(roomCode);
        if (room && room.players.has(playerId)) {
          const entry = room.players.get(playerId);
          entry.player.character = character;
          if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
            room.hostWs.send(JSON.stringify({ type: 'UPDATE_CHARACTER', roomCode, playerId, character }));
          }
        }
        return;
      }

      if (msg.type === 'PLAYER_ACTION' || msg.type === 'PLAYER_QUESTION') {
        const { roomCode } = msg;
        const room = rooms.get(roomCode);
        if (room) {
          if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
            room.hostWs.send(JSON.stringify(msg));
          }
          for (const [id, pEntry] of room.players) {
            if (pEntry.ws && pEntry.ws.readyState === WebSocket.OPEN && pEntry.ws !== ws) {
              pEntry.ws.send(JSON.stringify(msg));
            }
          }
        }
        return;
      }

      if (msg.type === 'DICE_ROLL') {
        const { roomCode } = msg;
        const room = rooms.get(roomCode);
        if (room) {
          if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
            room.hostWs.send(JSON.stringify(msg));
          }
          for (const [id, pEntry] of room.players) {
            if (pEntry.ws && pEntry.ws.readyState === WebSocket.OPEN && pEntry.ws !== ws) {
              pEntry.ws.send(JSON.stringify(msg));
            }
          }
        }
        return;
      }

      if (msg.type === 'STORY_UPDATE') {
        const { roomCode, message } = msg;
        const room = rooms.get(roomCode);
        if (room) {
          room.messages.push(message);
          for (const [, pEntry] of room.players) {
            if (pEntry.ws && pEntry.ws.readyState === WebSocket.OPEN) {
              pEntry.ws.send(JSON.stringify({ type: 'STORY_UPDATE', roomCode, message }));
            }
          }
        }
        return;
      }

      if (msg.type === 'UPDATE_CAMPAIGN') {
        const { roomCode, campaign } = msg;
        const room = rooms.get(roomCode);
        if (room) {
          room.campaign = campaign;
          for (const [, pEntry] of room.players) {
            if (pEntry.ws && pEntry.ws.readyState === WebSocket.OPEN) {
              pEntry.ws.send(JSON.stringify({ type: 'CAMPAIGN_UPDATED', campaign }));
            }
          }
        }
        return;
      }

      // GESTIONE BOTTINO / LOOT UNICO (Niente duplicazioni a 50 click!)
      if (msg.type === 'CLAIM_LOOT') {
        const { roomCode, lootId, playerId, playerName, itemName } = msg;
        const room = rooms.get(roomCode);
        if (room) {
          if (!room.claimedLoot) room.claimedLoot = {};
          if (room.claimedLoot[lootId]) {
            // Già preso da qualcun altro!
            ws.send(JSON.stringify({ type: 'LOOT_ALREADY_CLAIMED', lootId, claimedInfo: room.claimedLoot[lootId] }));
            return;
          }

          room.claimedLoot[lootId] = { playerId, playerName, itemName, timestamp: Date.now() };
          const broadcastMsg = {
            type: 'LOOT_CLAIMED',
            roomCode,
            lootId,
            playerId,
            playerName,
            itemName,
          };

          if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
            room.hostWs.send(JSON.stringify(broadcastMsg));
          }
          for (const [, pEntry] of room.players) {
            if (pEntry.ws && pEntry.ws.readyState === WebSocket.OPEN) {
              pEntry.ws.send(JSON.stringify(broadcastMsg));
            }
          }
        }
        return;
      }

      // GESTIONE COMBATTIMENTO, NEMICI E OSTACOLI MULTIPLAYER CONDIVISI
      if (msg.type === 'SYNC_COMBAT_STATE') {
        const { roomCode, combatState } = msg;
        const room = rooms.get(roomCode);
        if (room) {
          room.combatState = combatState;
          const broadcastMsg = {
            type: 'COMBAT_STATE_CHANGED',
            roomCode,
            combatState,
          };
          for (const [, pEntry] of room.players) {
            if (pEntry.ws && pEntry.ws.readyState === WebSocket.OPEN && pEntry.ws !== ws) {
              pEntry.ws.send(JSON.stringify(broadcastMsg));
            }
          }
        }
        return;
      }

      if (msg.type === 'RESOLVE_ENEMY_DEFENSE') {
        const { roomCode } = msg;
        const room = rooms.get(roomCode);
        if (room && room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
          room.hostWs.send(JSON.stringify(msg));
        }
        return;
      }

      // GESTIONE TURNI SEQUENZIALI (Un giocatore alla volta!)
      if (msg.type === 'SET_ACTIVE_TURN') {
        const { roomCode, activeTurnPlayerId, activeTurnPlayerName, roundNumber } = msg;
        const room = rooms.get(roomCode);
        if (room) {
          room.activeTurnPlayerId = activeTurnPlayerId;
          room.activeTurnPlayerName = activeTurnPlayerName;
          if (roundNumber !== undefined) room.roundNumber = roundNumber;

          const broadcastMsg = {
            type: 'TURN_CHANGED',
            roomCode,
            activeTurnPlayerId,
            activeTurnPlayerName,
            roundNumber: room.roundNumber || 1,
          };

          if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
            room.hostWs.send(JSON.stringify(broadcastMsg));
          }
          for (const [, pEntry] of room.players) {
            if (pEntry.ws && pEntry.ws.readyState === WebSocket.OPEN) {
              pEntry.ws.send(JSON.stringify(broadcastMsg));
            }
          }
        }
        return;
      }
    } catch (err) {
      console.error('Errore gestione messaggio WS:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoomCode) {
      const room = rooms.get(currentRoomCode);
      if (room) {
        if (isHost) {
          room.hostWs = null;
        } else if (currentPlayerId && room.players.has(currentPlayerId)) {
          // Marca il socket come scollegato senza cancellare la scheda del giocatore!
          const pEntry = room.players.get(currentPlayerId);
          pEntry.ws = null;
          pEntry.disconnectedAt = Date.now();
        }
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIpAddress();
  console.log('\n========================================================');
  console.log('       🌑 CHRONICA SERVER - PRONTO PER IL TAVOLO        ');
  console.log('========================================================');
  console.log(`➜ Accesso Locale:    http://localhost:${PORT}`);
  console.log(`➜ Dal Cellulare:     http://${localIp}:${PORT}`);
  console.log(`➜ Salvataggi disco:  ${SAVES_DIR}`);
  console.log(`➜ IA Narratore:      Gemini 3.8 Flash Attivo`);
  console.log(`➜ Voce Neurale HD:   it-IT-DiegoNeural Attiva`);
  console.log('========================================================\n');
});
