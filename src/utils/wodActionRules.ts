// Regole Chronica D10 Engine (Compendio Regole & Schermo del Narratore)
// Soglia Fissa: 8+ (8, 9, 10 = Successo; 10-Again; 5+ Successi = Successo Eccezionale; Riserva <= 0 = Tiro di Fortuna)

export interface WodActionPreset {
  id: string;
  name: string;
  category: 'Combattimento' | 'Fisico & Movimento' | 'Percezione & Indagine' | 'Interazione Sociale' | 'Occulto & Tecnico';
  attributeKey: string;
  abilityKey: string;
  defaultDifficulty: number;
  isCombatAttack?: boolean;
  combatCategory?: 'firearms' | 'melee' | 'brawl' | 'ranged';
  description: string;
  successGuidelines: {
    marginal: string;    // 1 successo
    solid: string;       // 2-3 successi
    superior: string;    // 4 successi
    exceptional: string; // 5+ successi (Successo Eccezionale)
  };
  sampleNarrations?: {
    marginal: string[];
    solid: string[];
    exceptional: string[];
  };
}

export const WOD_ACTION_PRESETS: WodActionPreset[] = [
  {
    id: 'firearms_shot',
    name: '🔫 Attacco con Armi da Fuoco / Arco',
    category: 'Combattimento',
    attributeKey: 'dexterity',
    abilityKey: 'firearms',
    defaultDifficulty: 8,
    isCombatAttack: true,
    combatCategory: 'firearms',
    description: 'Combattimento a distanza (Destrezza + Armi da Fuoco + Dadi Arma - Armatura bersaglio). Ogni successo infligge 1 danno diretto!',
    successGuidelines: {
      marginal: 'Colpo di striscio (1 danno inflitto). Il bersaglio accusa l\'impatto ma resta in piedi.',
      solid: 'Colpo netto in pieno corpo (2-3 danni inflitti). Il bersaglio barcolla sotto lo shock.',
      superior: 'Tiro chirurgico (4 danni inflitti). Proiettile devastante in un punto vitale.',
      exceptional: 'Successo Eccezionale (5+ danni inflitti)! Neutralizzazione immediata o colpo letale da maestro.',
    },
    sampleNarrations: {
      marginal: [
        'Sparo un colpo rapido tra il fumo cogliendolo di striscio alla spalla.',
        'Il proiettile scheggia il suo riparo e lo ferisce al braccio prima che si rannicchi.',
      ],
      solid: [
        'Prendo la mira con fermezza: il colpo secco lo impatta in pieno petto facendolo indietreggiare.',
        'Esplodo due colpi precisi che lacerano la sua guardia e lo costringono a gridare dal dolore.',
      ],
      exceptional: [
        'Un unico sparo chirurgico: il proiettile lo centra dritto alla fronte e crolla a terra immobile.',
        'Spianando l\'arma con freddezza glaciale, abbatto l\'assalitore prima ancora che possa alzare la sua canna.',
      ],
    },
  },
  {
    id: 'melee_strike',
    name: '🗡️ Attacco con Armi da Mischia',
    category: 'Combattimento',
    attributeKey: 'strength',
    abilityKey: 'weaponry',
    defaultDifficulty: 8,
    isCombatAttack: true,
    combatCategory: 'melee',
    description: 'Combattimento ravvicinato con armi (Forza + Armi da Mischia + Dadi Arma - Difesa e Armatura bersaglio). Ogni successo = 1 danno!',
    successGuidelines: {
      marginal: 'Taglio superficiale (1 danno inflitto). L\'avversario devia parzialmente ma sanguina.',
      solid: 'Fendente pulito e profondo (2-3 danni inflitti). La guardia avversaria è spezzata.',
      superior: 'Lacerazione grave (4 danni inflitti). Metti in ginocchio il bersaglio.',
      exceptional: 'Successo Eccezionale (5+ danni inflitti)! L\'arma affonda inesorabile, troncando ogni resistenza.',
    },
    sampleNarrations: {
      marginal: [
        'Allungo un fendente rapido aprendogli un taglio sull\'avambraccio.',
      ],
      solid: [
        'Finto a sinistra e affondo la lama nel fianco scoperto con precisione micidiale.',
      ],
      exceptional: [
        'Con un movimento fluido e letale trancio la sua guardia abbattendolo con un singolo colpo.',
      ],
    },
  },
  {
    id: 'brawl_strike',
    name: '👊 Lotta / Mani Nude / Artigli / Presa',
    category: 'Combattimento',
    attributeKey: 'strength',
    abilityKey: 'brawl',
    defaultDifficulty: 8,
    isCombatAttack: true,
    combatCategory: 'brawl',
    description: 'Combattimento ravvicinato disarmato o con Tirapugni/Zanne/Artigli (Forza + Lotta + Bonus - Difesa e Armatura bersaglio).',
    successGuidelines: {
      marginal: 'Colpo andato a segno (1 danno). Livido o presa iniziale.',
      solid: 'Pugno pesante alla mascella o presa solida (2-3 danni). Il nemico sputa sangue.',
      superior: 'Impatto brutale (4 danni) o manovra di sottomissione schiacciante.',
      exceptional: 'Successo Eccezionale (5+ danni)! Knockout immediato o sottomissione totale.',
    },
    sampleNarrations: {
      marginal: [
        'Scatto in avanti e gli assesto un montante che lo fa barcollare indietro.',
      ],
      solid: [
        'Afferro la sua giacca e gli fracasso il ginocchio nello stomaco prima di scaraventarlo via.',
      ],
      exceptional: [
        'Con scatto bestiale lo travolgo e lo schianto contro il muro di mattoni spegnendogli i sensi.',
      ],
    },
  },
  {
    id: 'thrown_attack',
    name: '💣 Armi da Lancio / Esplosivi',
    category: 'Combattimento',
    attributeKey: 'dexterity',
    abilityKey: 'athletics',
    defaultDifficulty: 8,
    isCombatAttack: true,
    combatCategory: 'ranged',
    description: 'Lanciare coltelli, lance, Molotov o granate (Destrezza + Atletica + Mod. Lancio/Danno - Difesa e Armatura).',
    successGuidelines: {
      marginal: 'Lancio centrato al limite dell\'area o impatto di striscio.',
      solid: 'Lancio preciso sul bersaglio! Piena deflagrazione o impatto.',
      superior: 'Traiettoria perfetta che coglie il nemico senza scampo.',
      exceptional: 'Successo Eccezionale! Colpo millimetrico che devasta la posizione avversaria.',
    },
    sampleNarrations: {
      marginal: ['Scaglio l\'ordigno facendolo esplodere ai piedi del suo riparo.'],
      solid: ['Con un arco perfetto lancio il colpo dritto al centro della formazione nemica.'],
      exceptional: ['Un lancio millimetrico che centra il punto debole innescando una deflagrazione devastante!'],
    },
  },
  {
    id: 'dodge_defense',
    name: '🛡️ Schivare / Gettarsi al Riparo',
    category: 'Combattimento',
    attributeKey: 'dexterity',
    abilityKey: 'athletics',
    defaultDifficulty: 8,
    description: 'Schivare raddoppia la Difesa del personaggio per l\'intero turno, oppure Destrezza + Atletica per tuffarsi dietro copertura piena.',
    successGuidelines: {
      marginal: 'Eviti il grosso del colpo, venendo solo sfiorato da schegge o detriti.',
      solid: 'Schivata pulita. Il colpo nemico va completamente a vuoto.',
      superior: 'Manovra acrobatica. Eviti il pericolo e raggiungi una copertura solida.',
      exceptional: 'Successo Eccezionale! Il colpo nemico va a vuoto lasciando l\'avversario scoperto.',
    },
    sampleNarrations: {
      marginal: ['Mi butto di lato: la pallottola mi sfiora la giacca senza penetrare la carne.'],
      solid: ['Scivolo dietro una colonna proprio mentre una scarica crivella l\'aria.'],
      exceptional: ['Con un riflesso fulmineo mi abbasso a filo pavimento ed emergo al riparo con l\'arma pronta.'],
    },
  },
  {
    id: 'perception_alertness',
    name: '👁️ Percezione / Reagire alla Sorpresa',
    category: 'Percezione & Indagine',
    attributeKey: 'wits',
    abilityKey: 'composure',
    defaultDifficulty: 8,
    description: 'Schermo del Narratore: Prontezza + Autocontrollo per cogliere pericoli, imboscate o dettagli nascosti.',
    successGuidelines: {
      marginal: 'Avverti un brivido o un suono ovattato: sai che non sei solo.',
      solid: 'Individui con precisione la provenienza del pericolo e previeni la sorpresa.',
      superior: 'Scorgi i dettagli vitali: tipologia di armi, postura e intenzione dell\'assalitore.',
      exceptional: 'Successo Eccezionale! Anticipi l\'agguato prima ancora che venga scatenato.',
    },
  },
  {
    id: 'investigation_search',
    name: '🕵️ Esaminare Scena / Investigare',
    category: 'Percezione & Indagine',
    attributeKey: 'wits',
    abilityKey: 'investigation',
    defaultDifficulty: 8,
    description: 'Schermo del Narratore: Prontezza (o Intelligenza) + Investigare per esaminare una scena del crimine o risolvere enigmi.',
    successGuidelines: {
      marginal: 'Trovi un indizio grezzo o una pista parziale che richiede conferma.',
      solid: 'Scopri il documento chiave, l\'impronta o lo scomparto nascosto cercato.',
      superior: 'Ricostruisci la dinamica esatta di cosa è accaduto in questo luogo.',
      exceptional: 'Successo Eccezionale! Trovi il segreto più celato e intuisci ogni collegamento.',
    },
  },
  {
    id: 'stealth_movement',
    name: '🤫 Muoversi Silenziosamente / Pedinare',
    category: 'Fisico & Movimento',
    attributeKey: 'dexterity',
    abilityKey: 'stealth',
    defaultDifficulty: 8,
    description: 'Schermo del Narratore: Destrezza (o Prontezza) + Furtività contro Prontezza + Autocontrollo.',
    successGuidelines: {
      marginal: 'Superi il varco ma un piccolo fruscio insospettisce le guardie vicine.',
      solid: 'Invisibile e silenzioso. Ti muovi come uno spettro senza lasciare traccia.',
      superior: 'Furtività impeccabile. Raggiungi la posizione desiderata totalmente inosservato.',
      exceptional: 'Successo Eccezionale! Sei a un palmo dal bersaglio senza che percepisca nulla.',
    },
  },
  {
    id: 'athletics_leap',
    name: '🏃 Arrampicarsi / Saltare / Inseguire',
    category: 'Fisico & Movimento',
    attributeKey: 'strength',
    abilityKey: 'athletics',
    defaultDifficulty: 8,
    description: 'Schermo del Narratore: Forza + Atletica per saltare/arrampicarsi, Costituzione + Atletica per inseguimento a piedi.',
    successGuidelines: {
      marginal: 'Afferri il bordo con la punta delle dita e ti issi a fatica.',
      solid: 'Salto netto e atterraggio pulito. Guadagni terreno prezioso.',
      superior: 'Scatto imperioso. Superi ostacoli con agilità superiore.',
      exceptional: 'Successo Eccezionale! Copri la distanza in un lampo seminando chiunque.',
    },
  },
  {
    id: 'security_picklock',
    name: '🔓 Scassinare / Eludere Sicurezza',
    category: 'Occulto & Tecnico',
    attributeKey: 'dexterity',
    abilityKey: 'larceny',
    defaultDifficulty: 8,
    description: 'Schermo del Narratore: Destrezza + Criminalità (+ equip) per scassinare serrature, borseggiare o disattivare allarmi.',
    successGuidelines: {
      marginal: 'La serratura scatta dopo diversi tentativi e un po\' di rumore.',
      solid: 'Scatto pulito e silenzioso. Porta aperta in pochi secondi.',
      superior: 'Disattivazione perfetta senza lasciare alcun segno visibile di effrazione.',
      exceptional: 'Successo Eccezionale! Meccanismo aperto in un lampo da vero maestro.',
    },
  },
  {
    id: 'medicine_firstaid',
    name: '🩹 Curare Ferite / Medicina',
    category: 'Occulto & Tecnico',
    attributeKey: 'dexterity',
    abilityKey: 'medicine',
    defaultDifficulty: 8,
    description: 'Schermo del Narratore: Destrezza (o Intelligenza) + Medicina (+ equip) per stabilizzare ferite o curare.',
    successGuidelines: {
      marginal: 'Emorragia tamponata al limite, il paziente è debole ma vivo.',
      solid: 'Trattamento efficace: condizioni stabilizzate e dolore lenito.',
      superior: 'Intervento medico eccellente: recupero rapido.',
      exceptional: 'Successo Eccezionale! Rianimazione o chirurgia da campo miracolosa.',
    },
  },
  {
    id: 'occult_knowledge',
    name: '🔮 Riconoscere l\'Occulto / Sapere Proibito',
    category: 'Occulto & Tecnico',
    attributeKey: 'intelligence',
    abilityKey: 'occult',
    defaultDifficulty: 8,
    description: 'Intelligenza + Occulto per identificare poteri sovrannaturali, sigilli, vampiri, lupi mannari o arcana.',
    successGuidelines: {
      marginal: 'Riconosci l\'origine generica del fenomeno.',
      solid: 'Identifichi la stirpe, il potere o il rito e i suoi effetti tipici.',
      superior: 'Comprendi la vulnerabilità o la maledizione specifica della creatura.',
      exceptional: 'Successo Eccezionale! Conoscenza esoterica completa su come contrastare la minaccia.',
    },
  },
  {
    id: 'social_intimidation',
    name: '😠 Intimidire / Coercizione',
    category: 'Interazione Sociale',
    attributeKey: 'presence',
    abilityKey: 'intimidation',
    defaultDifficulty: 8,
    description: 'Presenza (o Forza) + Intimidire contro Fermezza + Prontezza del bersaglio.',
    successGuidelines: {
      marginal: 'Il bersaglio è riluttante ma cede per evitare conseguenze peggiori.',
      solid: 'Il bersaglio è intimorito e risponde senza indugio.',
      superior: 'Panico totale: il bersaglio vuota il sacco.',
      exceptional: 'Successo Eccezionale! L\'avversario è psicologicamente piegato.',
    },
  },
  {
    id: 'social_subterfuge',
    name: '🎭 Mentire / Raggirare (Sotterfugio)',
    category: 'Interazione Sociale',
    attributeKey: 'manipulation',
    abilityKey: 'subterfuge',
    defaultDifficulty: 8,
    description: 'Ascendente + Sotterfugio per costruire un alibi, ingannare una guardia o celare le proprie intenzioni.',
    successGuidelines: {
      marginal: 'La bugia regge ma suscita qualche sospetto residuo.',
      solid: 'Credibile al 100%. L\'interlocutore abbocca senza dubitare.',
      superior: 'Inganno magistrale: l\'interlocutore agisce convinto di fare i propri interessi.',
      exceptional: 'Successo Eccezionale! L\'interlocutore difenderà la tua versione davanti a chiunque.',
    },
  },
  {
    id: 'social_persuasion',
    name: '🗣️ Persuasione / Negoziazione',
    category: 'Interazione Sociale',
    attributeKey: 'presence',
    abilityKey: 'persuasion',
    defaultDifficulty: 8,
    description: 'Presenza (o Ascendente) + Persuasione per convincere un alleato o negoziare una tregua.',
    successGuidelines: {
      marginal: 'Accetta ma chiedendo qualcosa in cambio.',
      solid: 'Patto stipulato con reciproca soddisfazione.',
      superior: 'Entusiasmo e lealtà: ottieni più di quanto speravi.',
      exceptional: 'Successo Eccezionale! Guadagni un alleato fedele.',
    },
  },
];

// Helper per ottenere la dritta ufficiale del Narratore in base ai successi (Storytelling System)
export function getSuccessRuling(
  netSuccesses: number,
  preset?: WodActionPreset,
  isChanceDie?: boolean
): {
  level: 'botch' | 'failure' | 'marginal' | 'solid' | 'superior' | 'exceptional';
  title: string;
  verdict: string;
  allowPlayerNarration: boolean;
  sampleNarrations: string[];
} {
  if (netSuccesses < 0) {
    return {
      level: 'botch',
      title: 'Fallimento Drammatico (1 sul Tiro di Fortuna)!',
      verdict:
        'Catastrofe sul Tiro di Fortuna! L\'arma si inceppa, il colpo rimbalza o si verifica la peggiore complicazione possibile. Il Narratore descrive il contraccolpo drammatico.',
      allowPlayerNarration: false,
      sampleNarrations: [],
    };
  }

  if (netSuccesses === 0) {
    return {
      level: 'failure',
      title: isChanceDie ? 'Fallimento sul Tiro di Fortuna (0 Successi)' : 'Fallimento Semplice (0 Successi)',
      verdict:
        'Nessun dado ha raggiunto la soglia 8+. L\'azione non riesce o viene neutralizzata dalla difesa/armatura avversaria.',
      allowPlayerNarration: false,
      sampleNarrations: [],
    };
  }

  if (netSuccesses === 1) {
    return {
      level: 'marginal',
      title: 'Successo (1 Successo)',
      verdict:
        preset?.successGuidelines.marginal ||
        'Basta 1 successo per riuscire nello Storytelling System! In combattimento infliggi 1 punto Salute di danno.',
      allowPlayerNarration: true,
      sampleNarrations: preset?.sampleNarrations?.marginal || [
        'Riesco a centrare il bersaglio di striscio mentre cerco riparo.',
        'Supero la prova con uno sforzo preciso.',
      ],
    };
  }

  if (netSuccesses <= 3) {
    return {
      level: 'solid',
      title: `Successo Solido (${netSuccesses} Successi)`,
      verdict:
        preset?.successGuidelines.solid ||
        `Azione pienamente riuscita con ${netSuccesses} successi! In combattimento infliggi direttamente ${netSuccesses} punti Salute di danno.`,
      allowPlayerNarration: true,
      sampleNarrations: preset?.sampleNarrations?.solid || [
        'Affondo il colpo con precisione chirurgica piegando la sua guardia.',
        'Eseguo la mossa esattamente come pianificato prendendo l\'iniziativa.',
      ],
    };
  }

  if (netSuccesses === 4) {
    return {
      level: 'superior',
      title: 'Successo Superiore (4 Successi)',
      verdict:
        preset?.successGuidelines.superior ||
        'Esecuzione magistrale con 4 successi! In combattimento infliggi 4 punti Salute di danno netto.',
      allowPlayerNarration: true,
      sampleNarrations: preset?.sampleNarrations?.solid || [
        'Un colpo devastante che lo fa volare all\'indietro.',
        'Domino la scena con totale superiorità tattica.',
      ],
    };
  }

  return {
    level: 'exceptional',
    title: `Successo Eccezionale (${netSuccesses} Successi — 5+)!`,
    verdict:
      preset?.successGuidelines.exceptional ||
      `Successo Eccezionale (5+ successi)! Risultato straordinario: in combattimento infliggi ${netSuccesses} punti Salute di danno devastante!`,
    allowPlayerNarration: true,
    sampleNarrations: preset?.sampleNarrations?.exceptional || [
      'Un colpo fulmineo e letale: cade al suolo prima ancora di capire cosa sia successo.',
      'Con un gesto da maestro liquido la minaccia e volto subito lo sguardo al prossimo pericolo.',
    ],
  };
}

// MODIFICATORI TATTICI UFFICIALI DELLO SCHERMO DEL NARRATORE (Tabella Riassuntiva del Combattimento)
export interface WodSituationalModifier {
  id: string;
  label: string;
  shortLabel: string;
  diceMod: number;
  category: 'Vantaggio' | 'Complicazione' | 'Manovra';
  ruleDescription: string;
}

export const WOD_SITUATIONAL_MODIFIERS: WodSituationalModifier[] = [
  // VANTAGGI & MANOVRE DELLO SCHERMO DEL NARRATORE
  {
    id: 'aim_1turn',
    label: '🎯 Mirare (1 Turno: +1)',
    shortLabel: 'Mira 1T (+1)',
    diceMod: 1,
    category: 'Vantaggio',
    ruleDescription: 'Schermo del Narratore: +1 dado per turno speso a mirare (fino a un massimo di +3).',
  },
  {
    id: 'aim_2turns',
    label: '🔭 Mirare (2 Turni: +2)',
    shortLabel: 'Mira 2T (+2)',
    diceMod: 2,
    category: 'Vantaggio',
    ruleDescription: 'Schermo del Narratore: 2 turni di mira concentrata aggiungono +2 dadi.',
  },
  {
    id: 'aim_3turns',
    label: '🎯 Mirare Max (3 Turni: +3)',
    shortLabel: 'Mira 3T (+3)',
    diceMod: 3,
    category: 'Vantaggio',
    ruleDescription: 'Schermo del Narratore: 3 turni di mira aggiungono il bonus massimo di +3 dadi.',
  },
  {
    id: 'all_out_attack',
    label: '⚔️ Attacco Impetuoso (+2 Mischia/Lotta, perde Difesa)',
    shortLabel: 'Impetuoso (+2)',
    diceMod: 2,
    category: 'Manovra',
    ruleDescription: 'Schermo del Narratore: +2 dadi con Lotta o Armi da Mischia, ma il personaggio perde la Difesa per questo turno.',
  },
  {
    id: 'burst_short',
    label: '⚡ Raffica Breve (3 colpi su 1 bersaglio: +1)',
    shortLabel: 'Raffica Breve (+1)',
    diceMod: 1,
    category: 'Manovra',
    ruleDescription: 'Schermo del Narratore: Tre pallottole contro un singolo bersaglio (+1 dado al tiro di attacco).',
  },
  {
    id: 'burst_medium',
    label: '⚡ Raffica Media (10 colpi: +2)',
    shortLabel: 'Raffica Media (+2)',
    diceMod: 2,
    category: 'Manovra',
    ruleDescription: 'Schermo del Narratore: Una decina di pallottole contro 1-3 bersagli (+2 dadi al tiro, -1 per ogni bersaglio oltre il primo).',
  },
  {
    id: 'burst_long',
    label: '🔥 Raffica Lunga (20 colpi: +3)',
    shortLabel: 'Raffica Lunga (+3)',
    diceMod: 3,
    category: 'Manovra',
    ruleDescription: 'Schermo del Narratore: Una ventina di pallottole (+3 dadi a ogni tiro d\'attacco, -1 per ogni bersaglio oltre il primo).',
  },
  {
    id: 'prone_melee_bonus',
    label: '🗡️ Bersaglio a Terra in Mischia (+2)',
    shortLabel: 'Nemico a Terra (+2)',
    diceMod: 2,
    category: 'Vantaggio',
    ruleDescription: 'Schermo del Narratore: Bonus di +2 dadi per colpire un bersaglio steso a terra in combattimento ravvicinato.',
  },

  // PENALITÀ, GITTATA, OCCULTAMENTO E BERSAGLI SPECIFICI (SCHERMO DEL NARRATORE)
  {
    id: 'conceal_barely',
    label: '🪑 Occultamento Scarso (-1)',
    shortLabel: 'Occ. Scarso (-1)',
    diceMod: -1,
    category: 'Complicazione',
    ruleDescription: 'Schermo del Narratore: Occultamento scarso -1 (es. acquattato dietro una sedia da ufficio).',
  },
  {
    id: 'conceal_partial',
    label: '🚗 Occultamento Parziale (-2)',
    shortLabel: 'Occ. Parziale (-2)',
    diceMod: -2,
    category: 'Complicazione',
    ruleDescription: 'Schermo del Narratore: Occultamento parziale -2 (es. nascosto dietro il cofano di un\'auto).',
  },
  {
    id: 'conceal_substantial',
    label: '🧱 Occultamento Considerevole (-3)',
    shortLabel: 'Occ. Considerevole (-3)',
    diceMod: -3,
    category: 'Complicazione',
    ruleDescription: 'Schermo del Narratore: Occultamento considerevole -3 (es. completamente acquattato dietro una macchina o in una buca).',
  },
  {
    id: 'range_medium',
    label: '📏 Gittata Media (-2)',
    shortLabel: 'Gittata Media (-2)',
    diceMod: -2,
    category: 'Complicazione',
    ruleDescription: 'Schermo del Narratore: Attacco a gittata media subisce una penalità di -2 dadi.',
  },
  {
    id: 'range_long',
    label: '🔭 Gittata Lunga (-4)',
    shortLabel: 'Gittata Lunga (-4)',
    diceMod: -4,
    category: 'Complicazione',
    ruleDescription: 'Schermo del Narratore: Attacco a gittata lunga subisce una penalità di -4 dadi.',
  },
  {
    id: 'prone_ranged_penalty',
    label: '⚠️ Bersaglio a Terra a Distanza (-2)',
    shortLabel: 'A Terra Dist. (-2)',
    diceMod: -2,
    category: 'Complicazione',
    ruleDescription: 'Schermo del Narratore: Penalità di -2 dadi per colpire a distanza un bersaglio steso a terra.',
  },
  {
    id: 'off_hand',
    label: '✋ Attaccare con Mano Secondaria (-2)',
    shortLabel: 'Mano Sec. (-2)',
    diceMod: -2,
    category: 'Complicazione',
    ruleDescription: 'Schermo del Narratore: Penalità di -2 dadi (annullata dal Pregio Ambidestro).',
  },
  {
    id: 'firing_into_melee',
    label: '⚔️ Sparare in un Combattimento Ravvicinato (-2)',
    shortLabel: 'Sparo in Mischia (-2)',
    diceMod: -2,
    category: 'Complicazione',
    ruleDescription: 'Schermo del Narratore: -2 dadi per ogni combattente che si cerca di non colpire con un singolo proiettile.',
  },
  {
    id: 'target_torso',
    label: '🎯 Bersaglio Specifico: Torso (-1)',
    shortLabel: 'Torso (-1)',
    diceMod: -1,
    category: 'Complicazione',
    ruleDescription: 'Schermo del Narratore: Mirare al Torso (-1 dado).',
  },
  {
    id: 'target_limb',
    label: '🦵 Bersaglio Specifico: Gamba o Braccio (-2)',
    shortLabel: 'Arto (-2)',
    diceMod: -2,
    category: 'Complicazione',
    ruleDescription: 'Schermo del Narratore: Mirare a Gamba o Braccio (-2 dadi).',
  },
  {
    id: 'target_head',
    label: '💀 Bersaglio Specifico: Testa (-3)',
    shortLabel: 'Testa (-3)',
    diceMod: -3,
    category: 'Complicazione',
    ruleDescription: 'Schermo del Narratore: Mirare alla Testa (-3 dadi). Contro i Vampiri i proiettili alla testa infliggono danno Letale anziché Contundente!',
  },
  {
    id: 'target_hand_heart',
    label: '❤️ Bersaglio Specifico: Mano / Cuore (-4)',
    shortLabel: 'Mano/Cuore (-4)',
    diceMod: -4,
    category: 'Complicazione',
    ruleDescription: 'Schermo del Narratore: Mirare alla Mano o al Cuore (-4 dadi). Col paletto nel cuore servono almeno 3 danni per paralizzare un Vampiro.',
  },
  {
    id: 'target_eye',
    label: '👁️ Bersaglio Specifico: Occhio (-5)',
    shortLabel: 'Occhio (-5)',
    diceMod: -5,
    category: 'Complicazione',
    ruleDescription: 'Schermo del Narratore: Mirare all\'Occhio (-5 dadi).',
  },
];

/**
 * Calcola la penalità da ferite attuale dalla barra Salute del personaggio.
 * Regola Compendio Sez. 1.3:
 * Le ultime tre caselle a destra della barra della Salute infliggono penalità progressive: -1, -2 e -3 dadi.
 */
export function getHealthPenalty(health?: Array<{ damage?: string; penalty: number }>): number {
  if (!health || health.length === 0) return 0;
  let penalty = 0;
  const len = health.length;
  for (let i = 0; i < len; i++) {
    const lvl = health[i];
    if (lvl.damage && lvl.damage !== 'none') {
      const fromRight = len - 1 - i;
      if (fromRight === 2) {
        penalty = Math.min(penalty, -1);
      } else if (fromRight === 1) {
        penalty = Math.min(penalty, -2);
      } else if (fromRight === 0) {
        penalty = Math.min(penalty, -3);
      } else if (typeof lvl.penalty === 'number' && lvl.penalty >= -5 && lvl.penalty < 0) {
        penalty = Math.min(penalty, lvl.penalty);
      }
    }
  }
  return penalty;
}
