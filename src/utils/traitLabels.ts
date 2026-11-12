import type { Character, CharacterAttributes, RequiredRoll } from '../types';

/**
 * ATTRIBUTI CHRONICA D10 ENGINE
 * Matrice 3x3:
 *           Prestanza      Accuratezza    Resistenza
 * Mentali   Intelligenza   Prontezza      Fermezza
 * Fisici    Forza          Destrezza      Costituzione
 * Sociali   Presenza       Ascendente     Autocontrollo
 */
export const ATTRIBUTE_LABELS: Record<string, string> = {
  // Mentali
  intelligence: 'Intelligenza',
  wits: 'Prontezza',
  resolve: 'Fermezza',

  // Fisici
  strength: 'Forza',
  dexterity: 'Destrezza',
  stamina: 'Costituzione',

  // Sociali
  presence: 'Presenza',
  manipulation: 'Ascendente',
  composure: 'Autocontrollo',

  // Retrocompatibilità
  charisma: 'Presenza / Carisma',
  appearance: 'Presenza / Aspetto',
  perception: 'Prontezza / Percezione',
};

/**
 * LE 24 ABILITÀ UFFICIALI (8 Mentali, 8 Fisiche, 8 Sociali)
 */
export const ABILITY_LABELS: Record<string, string> = {
  // Mentali (-3 senza addestramento)
  academics: 'Accademiche',
  computer: 'Informatica',
  investigation: 'Investigare',
  crafts: 'Manualità',
  medicine: 'Medicina',
  occult: 'Occulto',
  politics: 'Politica',
  science: 'Scienze',

  // Fisiche (-1 senza addestramento)
  firearms: 'Armi da Fuoco',
  weaponry: 'Armi da Mischia',
  athletics: 'Atletica',
  larceny: 'Criminalità',
  stealth: 'Furtività',
  drive: 'Guidare',
  brawl: 'Lotta',
  survival: 'Sopravvivenza',

  // Sociali (-1 senza addestramento)
  animalKen: 'Affinità Animale',
  streetwise: 'Bassifondi',
  empathy: 'Empatia',
  expression: 'Espressività',
  intimidation: 'Intimidire',
  persuasion: 'Persuasione',
  socialize: 'Socializzare',
  subterfuge: 'Sotterfugio',

  // Retrocompatibilità
  alertness: 'Investigare / Allerta',
  dodge: 'Schivare (Difesa)',
  melee: 'Armi da Mischia',
  security: 'Criminalità / Sicurezza',
  etiquette: 'Socializzare / Etichetta',
};

/**
 * VIRTÙ E VIZI UFFICIALI (Psicologia WoD)
 */
export const WOD_VIRTUES = [
  'Carità',
  'Fede',
  'Fortezza',
  'Giustizia',
  'Prudenza',
  'Speranza',
  'Temperanza',
] as const;

export const WOD_VICES = [
  'Avarizia',
  'Gola',
  'Invidia',
  'Ira',
  'Lussuria',
  'Orgoglio',
  'Pigrizia',
] as const;

/**
 * CALCOLO MATEMATICO ESATTO DEI TRATTI DERIVATI
 * Dalle schede ufficiali del manuale base:
 * - Salute = Costituzione + Taglia (Taglia = 5 per umani normali)
 * - Volontà = Fermezza + Autocontrollo
 * - Difesa = Il valore più basso tra Destrezza e Prontezza
 * - Mod. Iniziativa = Destrezza + Autocontrollo
 * - Velocità = Forza + Destrezza + 5
 */
export function calculateDerivedTraits(
  attrs: CharacterAttributes,
  size: number = 5
): {
  healthMax: number;
  willpowerMax: number;
  defense: number;
  initiativeMod: number;
  speed: number;
  size: number;
} {
  const stamina = attrs.stamina || 2;
  const strength = attrs.strength || 2;
  const dexterity = attrs.dexterity || 2;
  const wits = attrs.wits || 2;
  const resolve = attrs.resolve || 2;
  const composure = attrs.composure || attrs.charisma || 2;

  const healthMax = stamina + size;
  const willpowerMax = resolve + composure;
  const defense = Math.min(dexterity, wits);
  const initiativeMod = dexterity + composure;
  const speed = strength + dexterity + 5;

  return {
    healthMax,
    willpowerMax,
    defense,
    initiativeMod,
    speed,
    size,
  };
}

// Cerca il valore numerico di un attributo a partire dal nome italiano o inglese
export function getAttributeValue(character: Character, name: string): { key: string; label: string; value: number } {
  const norm = name.trim().toLowerCase();
  for (const [key, label] of Object.entries(ATTRIBUTE_LABELS)) {
    if (key.toLowerCase() === norm || label.toLowerCase() === norm || norm.includes(label.toLowerCase()) || label.toLowerCase().includes(norm)) {
      return {
        key,
        label,
        value: (character.attributes as any)[key] || 1,
      };
    }
  }
  return { key: 'dexterity', label: name, value: character.attributes?.dexterity || 2 };
}

// Cerca il valore numerico di un'abilità a partire dal nome italiano o inglese
export function getAbilityValue(character: Character, name?: string): { key?: string; label?: string; value: number } {
  if (!name || name.toLowerCase() === 'nessuna' || name.toLowerCase() === 'none') {
    return { value: 0 };
  }
  const norm = name.trim().toLowerCase();

  // Mappatura sinonimi comuni usati dal Narratore per le abilità ufficiali
  const SYNONYMS: Record<string, string> = {
    'esaminare scena': 'investigation',
    'esaminare la scena': 'investigation',
    'esaminare': 'investigation',
    'indagare': 'investigation',
    'perquisire': 'investigation',
    'cercare': 'investigation',
    'percezione': 'investigation',
    'osservare': 'investigation',
    'sparare': 'firearms',
    'armi da fuoco': 'firearms',
    'pistola': 'firearms',
    'fucile': 'firearms',
    'corpo a corpo': 'weaponry',
    'armi da mischia': 'weaponry',
    'lama': 'weaponry',
    'pugnale': 'weaponry',
    'spada': 'weaponry',
    'pugni': 'brawl',
    'lotta': 'brawl',
    'calci': 'brawl',
    'mani nude': 'brawl',
    'correre': 'athletics',
    'scattare': 'athletics',
    'saltare': 'athletics',
    'atletica': 'athletics',
    'muoversi furtivo': 'stealth',
    'nascondersi': 'stealth',
    'furtività': 'stealth',
    'scassinare': 'larceny',
    'borseggiare': 'larceny',
    'criminalità': 'larceny',
  };

  const synonymKey = Object.keys(SYNONYMS).find((s) => norm === s || norm.includes(s));
  if (synonymKey) {
    const key = SYNONYMS[synonymKey];
    return {
      key,
      label: ABILITY_LABELS[key] || name,
      value: (character.abilities as any)?.[key] || 0,
    };
  }

  for (const [key, label] of Object.entries(ABILITY_LABELS)) {
    if (key.toLowerCase() === norm || label.toLowerCase() === norm || norm.includes(label.toLowerCase()) || label.toLowerCase().includes(norm)) {
      return {
        key,
        label,
        value: (character.abilities as any)[key] || 0,
      };
    }
  }
  return { label: name, value: 0 };
}

export interface ParsedSuggestionAction {
  rawText: string;
  cleanText: string;
  hasRoll: boolean;
  attribute?: string;
  ability?: string;
  modifier?: number;
  rollLabel?: string;
}

/**
 * Analizza un'opzione o azione dichiarata per estrarre la combinazione di dadi richiesta.
 * Supporta sia la notazione esplicita tra parentesi "[Destrezza + Armi da Fuoco]" o "(Forza + Atletica -2)",
 * sia il riconoscimento semantico automatico di azioni rischiose/di conflitto prive di annotazione.
 */
export function parseSuggestionRoll(suggestionText: string): ParsedSuggestionAction {
  const text = (suggestionText || '').trim();
  if (!text) {
    return { rawText: '', cleanText: '', hasRoll: false };
  }

  // 1. Cerca annotazioni esplicite tra parentesi quadre o tonde:
  // es: "Urlare una provocazione [Ascendente + Sotterfugio]" o "(Destrezza + Armi da Fuoco -2)"
  const bracketMatch = text.match(/(?:\[|\()([A-Za-zÀ-ÿ\s]+?)\s*\+\s*([A-Za-zÀ-ÿ\s]+?)(?:\s*([+-]\d+))?(?:\]|\))/i);
  if (bracketMatch) {
    const rawAttr = bracketMatch[1].trim();
    const rawAbil = bracketMatch[2].trim();
    const mod = bracketMatch[3] ? parseInt(bracketMatch[3], 10) : undefined;
    const clean = text.replace(bracketMatch[0], '').replace(/\s{2,}/g, ' ').trim();
    return {
      rawText: text,
      cleanText: clean || text,
      hasRoll: true,
      attribute: rawAttr,
      ability: rawAbil,
      modifier: mod,
      rollLabel: `${rawAttr} + ${rawAbil}${mod ? (mod > 0 ? ` +${mod}` : ` ${mod}`) : ''}`,
    };
  }

  // 2. Classificatore semantico per azioni rischiose o di conflitto prive di parentesi:
  const lower = text.toLowerCase();

  // Sparare / Armi da fuoco
  if (/spar(?:o|a|are)|fucil|pistol|peacemaker|revolver|grilletto|pallottol|proiettil|balestra|faccio fuoco/i.test(lower)) {
    return {
      rawText: text,
      cleanText: text,
      hasRoll: true,
      attribute: 'Destrezza',
      ability: 'Armi da Fuoco',
      rollLabel: 'Destrezza + Armi da Fuoco',
    };
  }

  // Armi da mischia
  if (/coltell|pugnal|spada|sciabola|ascia|lama|fendente|affond(?:o|a|are)|accoltell(?:o|a|are)/i.test(lower)) {
    return {
      rawText: text,
      cleanText: text,
      hasRoll: true,
      attribute: 'Forza',
      ability: 'Armi da Mischia',
      rollLabel: 'Forza + Armi da Mischia',
    };
  }

  // Lotta / Mani nude
  if (/pugno|calcio|lott(?:o|a|are)|afferr(?:o|a|are)|atterr(?:o|a|are)|blocca(?:re)?|strangol(?:o|a|are)/i.test(lower)) {
    return {
      rawText: text,
      cleanText: text,
      hasRoll: true,
      attribute: 'Forza',
      ability: 'Lotta',
      rollLabel: 'Forza + Lotta',
    };
  }

  // Atletica / Schivata / Salti / Fuga acrobatica
  if (/salt(?:o|a|are)|arrampica|scavalca|scapp(?:o|a|are)|fugg(?:o|a|are)|schiv(?:o|a|are)|tuff(?:o|a|are)|insegu(?:o|ire)/i.test(lower)) {
    return {
      rawText: text,
      cleanText: text,
      hasRoll: true,
      attribute: 'Destrezza',
      ability: 'Atletica',
      rollLabel: 'Destrezza + Atletica',
    };
  }

  // Furtività / Nascondersi
  if (/nascond|furtiv|striscia|ombra|silenzio/i.test(lower)) {
    return {
      rawText: text,
      cleanText: text,
      hasRoll: true,
      attribute: 'Destrezza',
      ability: 'Furtività',
      rollLabel: 'Destrezza + Furtività',
    };
  }

  // Criminalità / Scasso
  if (/scassin|grimaldello|forz(?:o|a|are)\s+la\s+serratura|borsegg/i.test(lower)) {
    return {
      rawText: text,
      cleanText: text,
      hasRoll: true,
      attribute: 'Destrezza',
      ability: 'Criminalità',
      rollLabel: 'Destrezza + Criminalità',
    };
  }

  // Investigare / Esaminare scena
  if (/esamin(?:o|a|are)|perquisi|ispezion|cerc(?:o|a|are)\s+indizi|osserv(?:o|a|are)\s+attentamente/i.test(lower)) {
    return {
      rawText: text,
      cleanText: text,
      hasRoll: true,
      attribute: 'Prontezza',
      ability: 'Investigare',
      rollLabel: 'Prontezza + Investigare',
    };
  }

  // Intimidire
  if (/intimid|minacci/i.test(lower)) {
    return {
      rawText: text,
      cleanText: text,
      hasRoll: true,
      attribute: 'Presenza',
      ability: 'Intimidire',
      rollLabel: 'Presenza + Intimidire',
    };
  }

  // Sotterfugio / Inganno
  if (/ingann|raggir|menti|distra(?:rre|ggi)/i.test(lower)) {
    return {
      rawText: text,
      cleanText: text,
      hasRoll: true,
      attribute: 'Ascendente',
      ability: 'Sotterfugio',
      rollLabel: 'Ascendente + Sotterfugio',
    };
  }

  // Persuasione
  if (/persuad|convinci|negozi/i.test(lower)) {
    return {
      rawText: text,
      cleanText: text,
      hasRoll: true,
      attribute: 'Presenza',
      ability: 'Persuasione',
      rollLabel: 'Presenza + Persuasione',
    };
  }

  // Azione puramente dialogica, descrittiva o priva di rischio/sfida
  return {
    rawText: text,
    cleanText: text,
    hasRoll: false,
  };
}

/**
 * Estrazione resiliente dei tiri richiesti dal Narratore dal testo
 * Supporta vari formati: [Tiro Richiesto: Destrezza + Armi da Fuoco • Soglia 8+ (Modificatore: -5)]
 * con o senza emoji, con • o - o |, e con modificatori situazionali.
 */
export function extractRequiredRollFromText(text: string): RequiredRoll | undefined {
  if (!text) return undefined;
  const match = text.match(/(?:(?:🎲|\uD83C\uDFB2)\s*)?\[(?:Tiro\s+Richiesto|Tiro|Roll):\s*([A-Za-zÀ-ÿ\s]+?)(?:\s*\+\s*([A-Za-zÀ-ÿ\s]+?))?(?:\s*[-•·|–—]\s*(?:Soglia|Difficolt[àa]|Diff)\s*(\d+)\+?)?(?:\s*\((.*?)\))?\]/i);
  if (!match) return undefined;

  const rawAttr = match[1].trim();
  const rawAbil = match[2]?.trim();
  const diff = match[3] ? parseInt(match[3], 10) : 8;
  const extra = match[4]?.trim() || '';

  let mod: number | undefined = undefined;
  const modMatch = extra.match(/([+-]\d+)/);
  if (modMatch) mod = parseInt(modMatch[1], 10);

  return {
    attribute: rawAttr,
    ability: rawAbil || undefined,
    difficulty: diff,
    reason: extra || `Azione richiesta dal Narratore (${rawAttr}${rawAbil ? ` + ${rawAbil}` : ''})`,
    modifier: mod,
  };
}

/**
 * Rimuove i badge testuali grezzi [Tiro Richiesto: ...] dal testo narrativo
 * per evitare doppioni visivi dato che viene renderizzato il pulsante interattivo rosso.
 */
export function cleanStoryTextFromRollBadges(text: string): string {
  if (!text) return '';
  return text.replace(/(?:(?:🎲|\uD83C\uDFB2)\s*)?\[(?:Tiro\s+Richiesto|Tiro|Roll):[^\]]+\]/gi, '').trim();
}

