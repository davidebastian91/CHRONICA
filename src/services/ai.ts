import type {
  CampaignConfig,
  Character,
  DiceRollResult,
  StoryMessage,
  RequiredRoll,
  DynamicObstacle,
  EnemySpawnSpec,
  DamageType,
  BattlemapSpec,
  HandoutSpec,
} from '../types';
import { createDefaultCharacter } from '../utils/characterTemplates';

export interface AISettings {
  apiKey: string;
  model: string;
  customEndpoint?: string;
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  apiKey: localStorage.getItem('chronica_gemini_key') || '',
  model: 'gemini-3.5-flash-lite',
};

export function saveAISettings(settings: AISettings) {
  localStorage.setItem('chronica_gemini_key', settings.apiKey);
}

/**
 * Pulisce i payload pesanti (come le immagini Base64 delle mappe) prima di inviarli all'IA
 * mantenendo solo i metadati (id, nome, categoria) per non intasare la rete o superare i limiti HTTP.
 */
export function sanitizeCampaignForAI(campaign: CampaignConfig): CampaignConfig {
  if (!campaign) return campaign;
  return {
    ...campaign,
    maps: campaign.maps
      ? campaign.maps.map((m) => ({ id: m.id, name: m.name, category: m.category, imageUrl: '', createdAt: m.createdAt }))
      : undefined,
  };
}

// 1. GENERATORE DEL GRANDE PROLOGO INIZIALE
export async function generateGrandPrologue(
  campaign: CampaignConfig,
  character?: Character | null,
  party?: { id: string; name: string; creatureType?: string; factionOrClan?: string; concept?: string }[],
  settings: AISettings = DEFAULT_AI_SETTINGS
): Promise<{ text: string; suggestions: string[]; requiredRoll?: RequiredRoll; xpAward?: { amount: number; reason: string }; itemAward?: { name: string; description: string } }> {
  // 1. Tenta la chiamata centralizzata al Server con retry per resistere a brevi interruzioni
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch('/api/ai/prologue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign: sanitizeCampaignForAI(campaign), character, party }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          return data;
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
    } catch (err) {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1200));
        continue;
      }
      console.warn('Endpoint server /api/ai/prologue non raggiungibile dopo 3 tentativi:', err);
    }
  }

  // 2. Se il server non risponde ma il client ha una chiave API locale
  const safeChar = character || createDefaultCharacter('hunter');
  if (settings.apiKey) {
    const hasMultiplePlayers = Array.isArray(party) && party.length > 1;
    const invDesc =
      safeChar.structuredInventory && safeChar.structuredInventory.length > 0
        ? safeChar.structuredInventory.map((i) => `${i.name} (x${i.quantity})`).join(', ')
        : safeChar.inventory?.join(', ') || 'Nessun oggetto';
    const powersDesc =
      safeChar.powers && safeChar.powers.length > 0
        ? safeChar.powers.map((p) => `${p.name} (Liv. ${p.level})`).join(', ')
        : 'Nessun potere soprannaturale';

    const storyOutlineBlock = campaign.customStoryOutline?.content?.trim()
      ? `\n\nCANOVACCIO UFFICIALE DELLA CRONACA (DIRETTIVA ASSOLUTA DELL'AUTORE/MASTER):\n"""\n${campaign.customStoryOutline.content}\n"""\nREGOLE TASSATIVE: 1. Inizia rigorosamente dalla prima scena o convocazione descritta nella trama. 2. Divieto assoluto di rivelare tradimenti futuri, sacrifici o complotti prima del tempo! 3. Fai giocare la scena iniziale in tempo reale senza salti temporali.`
      : '';

    const systemPrompt = `
Sei il NARRATORE supremo di un gioco di ruolo universale basato sul Chronica D10 Engine (riserva di dadi D10, soglia 8+, combattimenti tattici cinematografici).
Hai COMPLETA LIBERTÀ CREATIVA sull'ambientazione, ma DEVI RISPETTARE AL 100% L'INVENTARIO E I POTERI REALI DELLA SCHEDA:
- Nelle scelte di [[OPZIONI: [...]]], cita SOLO armi, armature e oggetti elencati in "Inventario Reale". VIETATO inventare oggetti (es. acqua benedetta, granate, pozioni non possedute) o trasformare il soprannome del personaggio in un potere magico!

CALIBRAZIONE TAVOLO:
${hasMultiplePlayers ? `- Sono presenti ${party.length} giocatori. Introduci la squadra e l'unione dei protagonisti.` : `- È presente 1 solo protagonista: ${safeChar.name}. Focalizzati su di lui.`}

STRUTTURA DEL PROLOGO:
1. Paragrafo 1: L'Atmosfera del luogo (${campaign.city}) e dell'epoca (${campaign.eraLabel || campaign.era}).
2. Paragrafo 2: ${hasMultiplePlayers ? "La presenza della Compagnia/Coterie di eroi giunti a " + campaign.city + " e il loro scopo comune." : "Chi è il personaggio (" + safeChar.name + ", " + safeChar.creatureType + " - " + safeChar.factionOrClan + ", " + safeChar.concept + ")."}
3. Paragrafo 3: L'INCIDENTE SCATENANTE / INCONTRO INIZIALE: se c'è un canovaccio, apri sulla prima scena senza spoilerare gli sviluppi successivi; altrimenti collegati alla minaccia di ${campaign.enemies.join(', ')}.
4. Bivio finale con blocco JSON (basato solo sull'inventario e poteri reali):
[[OPZIONI: ["Opzione 1", "Opzione 2", "Opzione 3"]]]
${storyOutlineBlock}
`.trim();

    const prompt = `
${hasMultiplePlayers ? `MODALITÀ TAVOLO SQUADRA (${party.length} GIOCATORI): La compagnia di avventurieri sta per affrontare la sfida.` : `SCHEDA REALE:\n- Nome: ${safeChar.name} | Stirpe: ${safeChar.creatureType} (${safeChar.factionOrClan}) | Concetto: ${safeChar.concept}\n- Inventario Reale: ${invDesc}\n- Poteri sulla Scheda: ${powersDesc}`}
- Luogo: ${campaign.city} (${campaign.eraLabel || campaign.era}) | Minacce: ${campaign.enemies.join(', ')}
Scrivi il Prologo Iniziale in lingua ITALIANA.
`.trim();

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent?key=${settings.apiKey}`;
        const clientGenConfig: any = {
          temperature: 0.82,
          maxOutputTokens: 4000,
        };
        if (settings.model.includes('3.7') || settings.model.includes('3.8') || settings.model.includes('thinking')) {
          clientGenConfig.thinkingConfig = { thinkingBudget: 0 };
        }
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
            generationConfig: clientGenConfig,
          }),
        });

      if (res.ok) {
        const data = await res.json();
        const candidate = data.candidates?.[0];
        const rawText = candidate?.content?.parts
          ? candidate.content.parts.filter((p: any) => !p.thought).map((p: any) => p.text || '').join('')
          : '';
        return parseAIResponse(rawText, [
          'Valuti la situazione con attenzione e cerchi una via tattica vantaggiosa.',
          'Sfodera la tua arma o il tuo potere per fronteggiare subito il pericolo.',
          'Cerchi di carpire maggiori informazioni prima che chiunque ti noti.',
        ]);
      }
    } catch (err) {
      console.warn('Errore AI prologo diretto client:', err);
    }
  }

  // 3. Fallback offline procedurale
  return generateOfflinePrologue(campaign, safeChar);
}

// 2. GENERATORE RISPOSTE DURANTE IL GIOCO
export async function generateNarratorResponse(
  campaign: CampaignConfig,
  character: Character | null | undefined,
  history: StoryMessage[],
  latestAction: string,
  latestRoll?: DiceRollResult,
  party?: { id: string; name: string; creatureType?: string; factionOrClan?: string; concept?: string }[],
  settings: AISettings = DEFAULT_AI_SETTINGS
): Promise<{
  text: string;
  suggestions: string[];
  requiredRoll?: RequiredRoll;
  xpAward?: { amount: number; reason: string };
  itemAward?: { name: string; description: string };
  obstacleSpawn?: Omit<DynamicObstacle, 'id' | 'currentSuccesses'>;
  enemySpawns?: EnemySpawnSpec[];
  playerDamage?: { points: number; type: DamageType; reason?: string };
  playerHeal?: { points: number; type?: DamageType; reason?: string };
  suggestedMapName?: string;
  battlemap?: BattlemapSpec;
  handout?: HandoutSpec;
}> {
  // 1. Tenta la chiamata centralizzata al Server con retry per resistere a brevi interruzioni
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch('/api/ai/narrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign: sanitizeCampaignForAI(campaign), character, history, latestAction, latestRoll, party }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          return data;
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
    } catch (err) {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1200));
        continue;
      }
      console.warn('Endpoint server /api/ai/narrate non raggiungibile dopo 3 tentativi:', err);
    }
  }

  // 2. Se il server non risponde ma il client ha una chiave locale
  const safeChar = character || createDefaultCharacter('hunter');
  if (settings.apiKey) {
    const hasMultiplePlayers = Array.isArray(party) && party.length > 1;
    const localStoryOutlineBlock = campaign.customStoryOutline?.content?.trim()
      ? `\n\nCANOVACCIO UFFICIALE DELLA CRONACA (DIRETTIVA ASSOLUTA DELL'AUTORE/MASTER):\n"""\n${campaign.customStoryOutline.content}\n"""\nDIRETTIVE NARRATIVE VINCOLANTI: 1. Fai progredire la storia passo dopo passo lungo gli snodi della trama. 2. Zero spoiler prematuri: non rivelare tradimenti futuri o segreti prima che vengano scoperti in gioco!`
      : '';

    const systemPrompt = `
Sei il NARRATORE di una sessione di gioco di ruolo guidata dal Chronica D10 Engine.
Epoca: ${campaign.eraLabel || campaign.era} | Luogo: ${campaign.city}.

${hasMultiplePlayers ? `CALIBRAZIONE TAVOLO SQUADRA (${party.length} GIOCATORI): Sono presenti ${party.length} compagni al tavolo. Modella la scena per l'intero gruppo.` : `CALIBRAZIONE SOLITARIA: 1 solo protagonista (${safeChar.name}).`}
${localStoryOutlineBlock}

REGOLE ESSENZIALI DI RITMO E GIOCO:
1. RITMO SERRATO E DIRETTO: Nei momenti di azione, sparatorie, combattimenti o pericolo immediato, sii BREVE e INCISIVO (massimo 2 brevi paragrafi d'impatto visivo, circa 80-120 parole). Niente descrizioni barocche verbose mentre si spara o si lotta: ritmo cinematografico rapido e passa la mano al giocatore.
2. COMBINAZIONI ATTRIBUTO + ABILITÀ & MODIFICATORI: Quando richiedi un tiro con [[TIRO:]], usa combinazioni coerenti (es. Destrezza + Armi da Fuoco, Forza + Armi da Mischia, Forza + Lotta, ecc.). Se applichi modificatori situazionali o per bersaglio specifico (es. -5 per mirare alla testa/punto debole, -2 per oscurità, +2 per vantaggio), inserisci SEMPRE "modifier": -5 (o +2) nel JSON: [[TIRO: {"attribute": "Destrezza", "ability": "Armi da Fuoco", "difficulty": 8, "modifier": -5, "reason": "Colpire il punto debole del medaglione"}]]
3. DIRITTO DI NARRAZIONE DEL GIOCATORE SUI SUCCESSI: Se il giocatore ha ottenuto successi e fornisce la sua narrazione (es. descrive dove colpisce o come fulmina il nemico), ACCETTA E CONFERMA SEMPRE la sua descrizione come fatto compiuto nella scena. Se il tiro è fallito o è un botch, descrivi tu le complicazioni e il contraccolpo.
4. BOTTINO NARRATIVO: Se il giocatore perquisisce un nemico, scassina una cassa o acquista risorse, assegna l'oggetto usando [[OGGETTO: "Nome Oggetto" | "Provenienza"]].
5. REGOLE MUNIZIONI: Se il giocatore tenta di sparare ma ha 0 frecce o proiettili, l'arma fa 'click' a vuoto o la faretra è vuota! L'attacco a distanza fallisce.
6. COMBATTIMENTO CHRONICA ENGINE (D10): Soglia fissa 8+, Esplosione del 10 (10-Again), Tiro di Fortuna se riserva <= 0. Iniziativa (1d10 + Destrezza + Autocontrollo), Tiro Unico Attacco + Danno (Attributo + Abilità + Bonus Arma - Difesa - Armatura = ogni successo infligge 1 punto Salute di danno Contundente /, Letale X o Aggravato *).
7. MECCANICHE DI NATURA/STIRPE: Applica al giocatore le regole della sua natura (Vampiro: Riserva di Sangue/Sete/Luce Solare; Lupo Mannaro: Forme/Furia/Argento; Incantatore: Mana/Risonanza/Sovraccarico) SOLO SE il personaggio appartiene a quella natura (${safeChar.creatureType}). Nel mondo di gioco e nella storia hai completa libertà creativa per PNG e avversari.
8. RIGIDO DIVIETO AUTORISOLUZIONE & CONTROLLO INVENTARIO: Se il giocatore scrive un'azione che comporta rischio, combattimento o prove (es. "gli sparo e lo ammazzo", "salto il burrone", "lo pugnalo"), È TASSATIVAMENTE VIETATO narrare che l'azione ha avuto successo o che il nemico muore! Tratta la frase ESCLUSIVAMENTE come dichiarazione d'intenti, ferma la narrazione prima dell'esito e RICHIEDI IL TIRO DI DADO EMETTENDO IL TAG [[TIRO: {"attribute": "...", "ability": "...", "difficulty": 8, "reason": "..."}]]! Se tenta di usare armi che non ha nell'inventario, digli che non le possiede e rifiuta l'azione!
9. CONTROLLO RIGIDO SU CURE E KIT MEDICI: Se il giocatore non possiede bende, kit medico o pozioni nell'elenco oggetti, NON PUÒ curarsi con essi! È VIETATO fargli usare o proporre nelle [[OPZIONI:]] kit medici o bende se non li ha nell'inventario reale. Se dichiara di usarli senza averli, il Narratore narra che fruga nelle tasche ma scopre di esserne privo!
10. AGGIORNAMENTO SALUTE PROTAGONISTA: Se il protagonista subisce ferite (colpi d'arma, artigli, cadute, fuoco) o riceve cure/riposo, inserisci SEMPRE alla fine della risposta il blocco JSON per aggiornare la scheda:
[[DANNO_GIOCATORE: {"points": 1, "type": "lethal", "reason": "Motivo del danno"}]] (type: "bashing" per contundenti, "lethal" per letali, "aggravated" per fuoco/sole/sovrannaturale)
oppure
[[CURA_GIOCATORE: {"points": 1, "type": "bashing", "reason": "Bendaggio o riposo"}]]
11. OPZIONI CON TIRO DADI: Concludi SEMPRE con una frase completa e poi il blocco con 3 o 4 opzioni per la mossa successiva. Ogni opzione che comporta rischio, combattimento, prove fisiche o indagini DEVE riportare i tratti tra parentesi quadre: [Attributo + Abilità], così che il giocatore possa lanciare i dadi cliccandoci sopra!
[[OPZIONI: ["Azione con tiro [Attributo + Abilità]", "Altra azione tattica [Attributo + Abilità]", "Azione cauta narrativa"]]]
`.trim();

    const prompt = `
CRONACA: ${campaign.title} | ${safeChar.name} (${safeChar.creatureType} - ${safeChar.factionOrClan})
AZIONE: "${latestAction}"
${latestRoll ? `TIRO DADI: ${latestRoll.netSuccesses} successi (${latestRoll.outcome})` : ''}
${hasMultiplePlayers ? `COMPAGNI AL TAVOLO:\n${party.map((p) => `- ${p.name} (${p.factionOrClan || p.concept})`).join('\n')}` : ''}
Continua la narrazione in ITALIANO.
`.trim();

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent?key=${settings.apiKey}`;
        const clientGenConfig: any = {
          temperature: 0.82,
          maxOutputTokens: 4000,
        };
        if (settings.model.includes('3.7') || settings.model.includes('3.8') || settings.model.includes('thinking')) {
          clientGenConfig.thinkingConfig = { thinkingBudget: 0 };
        }
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
            generationConfig: clientGenConfig,
          }),
        });

      if (res.ok) {
        const data = await res.json();
        const candidate = data.candidates?.[0];
        const rawText = candidate?.content?.parts
          ? candidate.content.parts.filter((p: any) => !p.thought).map((p: any) => p.text || '').join('')
          : '';
        return parseAIResponse(rawText, [
          'Valuti con attenzione la reazione dell\'ambiente circostante.',
          'Sfrutti le tue doti migliori per prendere in mano il controllo della situazione.',
          'Avanzi con decisione verso il tuo obiettivo primario.',
        ]);
      }
    } catch (err) {
      console.error('Errore chiamata client Gemini:', err);
    }
  }

  // 3. Fallback dinamico procedurale
  return generateOfflineAtmosphericResponse(campaign, safeChar, latestAction, latestRoll, history);
}

// 3. CHIEDI AL NARRATORE (CHIARIMENTO SCENA FUORI GIOCO / OOC - SENZA AVANZARE LA STORIA)
export async function askNarratorClarification(
  campaign: CampaignConfig,
  character: Character | null | undefined,
  history: StoryMessage[],
  question: string,
  party?: { id: string; name: string; creatureType?: string; factionOrClan?: string; concept?: string }[]
): Promise<{ answer: string; battlemap?: BattlemapSpec }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch('/api/ai/ask-narrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign: sanitizeCampaignForAI(campaign), character, history, question, party }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.answer) {
          return { answer: data.answer, battlemap: data.battlemap };
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
    } catch (err) {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      console.warn('Errore /api/ai/ask-narrator server:', err);
    }
  }

  const isSketchReq = /schizzo|mappa|posizion|tattic|dove sono/i.test(question);
  const fallbackBattlemap: BattlemapSpec | undefined = isSketchReq ? {
    title: `Schizzo Tattico: ${campaign.city}`,
    locationName: campaign.city,
    entities: [
      { id: 'p1', name: character?.name || 'Giocatore', type: 'player', x: 50, y: 75, label: (character?.name || 'G')[0] }
    ],
    terrain: [
      { id: 'c1', type: 'cover', x: 40, y: 55, w: 20, h: 8, label: 'Copertura Principale' }
    ]
  } : undefined;

  return {
    answer: `[Chiarimento Narratore]: La scena rimane ferma al momento presente. Valuti l'ambiente a ${campaign.city}: le coperture disponibili e la visibilità ti consentono di scegliere con calma la tua prossima mossa tattica.`,
    battlemap: fallbackBattlemap,
  };
}

function parseAIResponse(
  rawText: string,
  defaultSuggestions: string[]
): {
  text: string;
  suggestions: string[];
  requiredRoll?: { attribute: string; ability?: string; difficulty: number; reason: string; modifier?: number };
  xpAward?: { amount: number; reason: string };
  itemAward?: { name: string; description: string };
  obstacleSpawn?: Omit<DynamicObstacle, 'id' | 'currentSuccesses'>;
  enemySpawns?: EnemySpawnSpec[];
  playerDamage?: { points: number; type: DamageType; reason?: string };
  playerHeal?: { points: number; type?: DamageType; reason?: string };
  suggestedMapName?: string;
  battlemap?: BattlemapSpec;
  handout?: HandoutSpec;
} {
  let suggestions = defaultSuggestions;
  let cleanedText = rawText;
  let requiredRoll: { attribute: string; ability?: string; difficulty: number; reason: string; modifier?: number } | undefined = undefined;
  let xpAward: { amount: number; reason: string } | undefined = undefined;
  let itemAward: { name: string; description: string } | undefined = undefined;
  let obstacleSpawn: Omit<DynamicObstacle, 'id' | 'currentSuccesses'> | undefined = undefined;
  let playerDamage: { points: number; type: DamageType; reason?: string } | undefined = undefined;
  let playerHeal: { points: number; type?: DamageType; reason?: string } | undefined = undefined;
  const enemySpawns: EnemySpawnSpec[] = [];

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

      let mod: number | undefined = undefined;
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
  const dmgMatch = rawText.match(/\[\[DANNO_GIOCATORE:\s*(\{.*?\})\s*\]\]/s);
  if (dmgMatch) {
    try {
      const parsed = JSON.parse(dmgMatch[1]);
      const rawPts = parseInt(parsed.points, 10);
      const points = isNaN(rawPts) ? 1 : Math.max(1, rawPts);
      const rawType = String(parsed.type || '').toLowerCase();
      const type: DamageType = rawType === 'aggravated' || rawType === 'bashing' ? rawType : 'lethal';
      playerDamage = {
        points,
        type,
        reason: parsed.reason || 'Danno subito',
      };
      cleanedText = cleanedText.replace(dmgMatch[0], '').trim();
    } catch {}
  }

  // Estrazione Cura al Giocatore
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
      const type: DamageType = rawType.includes('aggravat')
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
  let suggestedMapName: string | undefined = undefined;
  const mapMatch = rawText.match(/\[\[(?:MAPPA|MAP):\s*"([^"]+)"\s*\]\]/i);
  if (mapMatch) {
    suggestedMapName = mapMatch[1].trim();
    cleanedText = cleanedText.replace(mapMatch[0], '').trim();
  }

  // Estrazione Schizzo Tattico Minimale (Battlemap Blueprint)
  let battlemap: BattlemapSpec | undefined = undefined;
  const battlemapMatch = rawText.match(/\[\[(?:BATTLEMAP|SCHIZZO_TATTICO):\s*(\{.*?\})\s*\]\]/s);
  if (battlemapMatch) {
    try {
      battlemap = JSON.parse(battlemapMatch[1]);
      cleanedText = cleanedText.replace(battlemapMatch[0], '').trim();
    } catch {}
  }

  // Estrazione Reperto Visivo / Documento Antico (Handout)
  let handout: HandoutSpec | undefined = undefined;
  const handoutMatch = rawText.match(/\[\[(?:REPERTO|HANDOUT|DOCUMENTO):\s*(\{.*?\})\s*\]\]/s);
  if (handoutMatch) {
    try {
      handout = JSON.parse(handoutMatch[1]);
      if (handout && !handout.id) {
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

function generateOfflinePrologue(
  campaign: CampaignConfig,
  character: Character
): { text: string; suggestions: string[] } {
  const isWildWest = campaign.era.includes('west');
  const isJapan = campaign.era.includes('japan');
  const isChina = campaign.era.includes('china');
  const isFantasy = campaign.era.includes('fantasy');

  let sceneSetting = '';
  if (isWildWest) {
    sceneSetting = `Il sole cocente di mezzogiorno arroventa la polvere di **${campaign.city}**. Il vento caldo fa cigolare l'insegna di legno del saloon mentre sagome a cavallo si stagliano contro la linea dell'orizzonte.`;
  } else if (isJapan) {
    sceneSetting = `L'aria tra le risaie e i templi di **${campaign.city}** vibra al suono dei rintocchi delle campane cerimoniali. Il crepuscolo tinge il cielo di indaco e cremisi, mentre le guardie sui bastioni stringono le lance.`;
  } else if (isChina) {
    sceneSetting = `I canali e i tetti dorati di **${campaign.city}** risplendono sotto la foschia del mattino. L'odore di incenso e spezie si mescola al fruscio delle vesti di seta e ai sussurri dei messaggeri dell'Imperatore.`;
  } else if (isFantasy) {
    sceneSetting = `Le imponenti torri di pietra di **${campaign.city}** svettano minacciose contro un cielo solcato da nubi cariche di magia arcana. Bandiere araldiche sventolano sui camminamenti di ronda.`;
  } else {
    sceneSetting = `Il panorama di **${campaign.city}** si distende attorno a te, denso di intrighi e forze che cospirano nell'ombra.`;
  }

  const text = `
${sceneSetting}

Tu sei **${character.name}**, ${character.creatureType} del lignaggio **${character.factionOrClan}**, noto in queste terre come *${character.concept}*. Nonostante la tua abilità, la morsa di **${campaign.enemies.join(' e ')}** si sta facendo ogni ora più serrata.

Poco fa, la quiete è andata in frantumi. Un messaggero trafelato è giunto recando una notizia allarmante: uno dei tuoi contatti più preziosi è caduto in un'imboscata tesa a poche leghe da qui, e il tuo nome è stato apertamente pronunciato dai cospiratori. 

Il tempo delle riflessioni è scaduto: l'avventura ha inizio, e ogni tua decisione lascerà un segno indelebile.
`.trim();

  return {
    text,
    suggestions: [
      'Ti muovi immediatamente verso il luogo dell\'agguato prima che le tracce si cancellino.',
      'Sondi la zona circostante per accertarti di non essere già stato individuato o seguito.',
      'Raccogli il tuo equipaggiamento e consulti la tua rete di informatori locali.',
      'Prepari un contrattacco rapido sfruttando l\'elemento sorpresa.',
    ],
  };
}

function generateOfflineAtmosphericResponse(
  campaign: CampaignConfig,
  _character: Character,
  action: string,
  roll?: DiceRollResult,
  _history?: StoryMessage[]
): { text: string; suggestions: string[] } {
  let outcomeText = '';
  if (roll) {
    if (roll.outcome === 'botch') {
      outcomeText = `Un imprevisto disastroso manda all'aria il tuo piano (**Fallimento Critico**)! Il pericolo esplode e subisci una complicazione immediata.`;
    } else if (roll.outcome === 'failure') {
      outcomeText = `L'azione non raggiunge il risultato sperato (**Nessun Successo**). Gli emissari nemici intuiscono la tua intenzione.`;
    } else if (roll.outcome === 'exceptional') {
      outcomeText = `Un colpo magistrale (**${roll.netSuccesses} Successi - Esito Eccezionale**)! Pieghi gli eventi a tuo totale favore con stile e precisione.`;
    } else {
      outcomeText = `L'azione ha successo (**${roll.netSuccesses} Successi**), consolidando la tua posizione pur mantenendo viva la tensione.`;
    }
  }

  const baseText = `Hai compiuto la tua mossa: *"${action}"*.\n\n${outcomeText ? outcomeText + '\n\n' : ''}Reagisci prontamente alla minaccia imminente a **${campaign.city}**. La polvere si deposita lentamente mentre valuti le conseguenze del tuo gesto e la posizione dei tuoi avversari.\n\nLa situazione resta aperta: come intendi procedere?`;

  return {
    text: baseText,
    suggestions: [
      `Mantieni la copertura e ricarichi o prepari la tua prossima mossa.`,
      `Incalzi subito l'avversario prima che si riorganizzi.`,
      `Sondi l'ambiente circostante per individuare ulteriori pericoli o vie di fuga.`,
    ],
  };
}
