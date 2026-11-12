import type { Character, HealthLevel } from '../types';
import { healDamageFromHealth } from './wodCombatRules';

// ============================================================================
// SEZIONE 2 COMPENDIO REGOLE — VAMPIRI: IL REQUIEM (POTENZA DEL SANGUE & VITAE)
// ============================================================================

export interface BloodPotencyTier {
  level: number;
  maxVitae: number;
  vitaePerTurn: number;
  traitMax: number;
  feedingRestriction: string;
  baseTorporDuration: string;
}

export const BLOOD_POTENCY_TABLE: BloodPotencyTier[] = [
  {
    level: 1,
    maxVitae: 10,
    vitaePerTurn: 1,
    traitMax: 5,
    feedingRestriction: 'Nessuna (può nutrirsi di animali e sangue conservato)',
    baseTorporDuration: '1 mese (Umanità 7)',
  },
  {
    level: 2,
    maxVitae: 11,
    vitaePerTurn: 1,
    traitMax: 5,
    feedingRestriction: 'Nessuna (animali e sangue conservato)',
    baseTorporDuration: '1 mese',
  },
  {
    level: 3,
    maxVitae: 12,
    vitaePerTurn: 1,
    traitMax: 5,
    feedingRestriction: 'Sangue conservato nutre la metà; animali normali',
    baseTorporDuration: '1 anno',
  },
  {
    level: 4,
    maxVitae: 13,
    vitaePerTurn: 2,
    traitMax: 5,
    feedingRestriction: 'Niente sangue conservato/sacche; solo animali o umani vivi',
    baseTorporDuration: '1 anno',
  },
  {
    level: 5,
    maxVitae: 14,
    vitaePerTurn: 2,
    traitMax: 5,
    feedingRestriction: 'Animali forniscono solo 1 Vitae per creatura',
    baseTorporDuration: '10 anni',
  },
  {
    level: 6,
    maxVitae: 15,
    vitaePerTurn: 3,
    traitMax: 6,
    feedingRestriction: 'Niente sangue animale (solo sangue umano vivo)',
    baseTorporDuration: '10 anni',
  },
  {
    level: 7,
    maxVitae: 20,
    vitaePerTurn: 5,
    traitMax: 7,
    feedingRestriction: 'Solo sangue umano fresco da vena viva',
    baseTorporDuration: '50 anni',
  },
  {
    level: 8,
    maxVitae: 30,
    vitaePerTurn: 7,
    traitMax: 8,
    feedingRestriction: 'Solo sangue di altri Vampiri (o creature soprannaturali)',
    baseTorporDuration: '100 anni',
  },
  {
    level: 9,
    maxVitae: 50,
    vitaePerTurn: 10,
    traitMax: 9,
    feedingRestriction: 'Solo sangue di altri Vampiri',
    baseTorporDuration: '500 anni',
  },
  {
    level: 10,
    maxVitae: 100,
    vitaePerTurn: 15,
    traitMax: 10,
    feedingRestriction: 'Solo sangue di altri Vampiri',
    baseTorporDuration: '1000+ anni',
  },
];

export function getBloodPotencyStats(level: number = 1): BloodPotencyTier & { torporDurationPerHumanity: string } {
  const safeLevel = Math.max(1, Math.min(10, level || 1));
  const row = BLOOD_POTENCY_TABLE[safeLevel - 1];
  return {
    ...row,
    torporDurationPerHumanity: row.baseTorporDuration,
  };
}

/**
 * Spende 1 Vitae per guarire 2 danni Contundenti (/) oppure 1 danno Letale (X) — Compendio Sez. 2.1
 */
export function spendVitaeToHeal(
  character: Character,
  healType: 'bashing' | 'bashing_2' | 'lethal' | 'lethal_1'
): { success: boolean; character: Character; message: string } {
  if (character.bloodOrEnergy.current < 1) {
    return {
      success: false,
      character,
      message: '⚠️ Vitae insufficiente (0 rimasta)! Nutriti prima di poter rigenerare le ferite.',
    };
  }

  let updatedHealth = character.health;
  if (healType === 'bashing' || healType === 'bashing_2') {
    updatedHealth = healDamageFromHealth(character.health, 2, 'bashing');
  } else {
    updatedHealth = healDamageFromHealth(character.health, 1, 'lethal');
  }

  const updatedChar: Character = {
    ...character,
    bloodOrEnergy: {
      ...character.bloodOrEnergy,
      current: character.bloodOrEnergy.current - 1,
    },
    health: updatedHealth,
  };

  return {
    success: true,
    character: updatedChar,
    message:
      healType === 'bashing' || healType === 'bashing_2'
        ? '🩸 Spesa 1 Vitae: guariti fino a 2 danni Contundenti (/)!'
        : '🩸 Spesa 1 Vitae: guarito 1 danno Letale (X)!',
  };
}

// ============================================================================
// SEZIONE 3 COMPENDIO REGOLE — STIRPE MUTALUPO (LE 5 FORME DEL BRANCO)
// ============================================================================

export type WerewolfFormId = 'hishu' | 'dalu' | 'gauru' | 'urshul' | 'urhan';

export interface WerewolfFormSpec {
  id: WerewolfFormId;
  name: string;
  subtitle: string;
  strengthMod: number;
  dexterityMod: number;
  staminaMod: number;
  manipulationMod: number;
  sizeMod: number; // rispetto a Taglia base 5
  speedBonus: number; // rispetto a Velocità umana base
  healthBonus: number; // COS Mod + Taglia Mod
  armorBonus: number;
  perceptionBonus: number;
  naturalAttack: string;
  specialNotes: string;
}

export const WEREWOLF_FORMS_TABLE: WerewolfFormSpec[] = [
  {
    id: 'hishu',
    name: 'Hishu',
    subtitle: 'Forma Umana',
    strengthMod: 0,
    dexterityMod: 0,
    staminaMod: 0,
    manipulationMod: 0,
    sizeMod: 0, // Taglia 5
    speedBonus: 0,
    healthBonus: 0,
    armorBonus: 0,
    perceptionBonus: 0,
    naturalAttack: 'Disarmato (+0 Contundente)',
    specialNotes: 'Mimetismo totale tra gli umani. Rigenera 1 danno Contundente (/) per turno.',
  },
  {
    id: 'dalu',
    name: 'Dalu',
    subtitle: 'Forma Quasi-Umana (Uomo-Lupo Massiccio)',
    strengthMod: 1,
    dexterityMod: 0,
    staminaMod: 1,
    manipulationMod: -1,
    sizeMod: 1, // Taglia 6
    speedBonus: 2,
    healthBonus: 2, // +1 COS, +1 Taglia
    armorBonus: 0,
    perceptionBonus: 2,
    naturalAttack: 'Morsi / Artigli (+1 Contundente)',
    specialNotes: 'Taglia 6, Salute +2, Velocità +2, +2 Percezione. Induce Lunacy moderata.',
  },
  {
    id: 'gauru',
    name: 'Gauru',
    subtitle: 'Forma da Guerra (Mostro Terrificante)',
    strengthMod: 3,
    dexterityMod: 1,
    staminaMod: 2,
    manipulationMod: -3,
    sizeMod: 2, // Taglia 7
    speedBonus: 3,
    healthBonus: 4, // +2 COS, +2 Taglia
    armorBonus: 1,
    perceptionBonus: 3,
    naturalAttack: 'Artigli (+2 Letale) / Morso (+3 Letale)',
    specialNotes:
      'Rigenerazione Automatica: 1 Contundente o 1 Letale per turno! Ignora penalità ferite e svenimento. Durata max: Costituzione + Istinto Primordiale turni (rischio Furia Mortale / Kuruth).',
  },
  {
    id: 'urshul',
    name: 'Urshul',
    subtitle: 'Forma Quasi-Lupina (Lupo Dire Gigante)',
    strengthMod: 2,
    dexterityMod: 2,
    staminaMod: 2,
    manipulationMod: -3,
    sizeMod: 1, // Taglia 6
    speedBonus: 5, // Fattore Specie 8 + FOR/DES
    healthBonus: 3, // +2 COS, +1 Taglia
    armorBonus: 0,
    perceptionBonus: 3,
    naturalAttack: 'Artigli (+1 Letale) / Morso (+3 Letale)',
    specialNotes: 'Taglia 6, Salute +3, Velocità +5, Morso devastante (+3L) che atterra le prede.',
  },
  {
    id: 'urhan',
    name: 'Urhan',
    subtitle: 'Forma Lupina (Lupo Naturale)',
    strengthMod: 0,
    dexterityMod: 2,
    staminaMod: 1,
    manipulationMod: -4,
    sizeMod: -1, // Taglia 4
    speedBonus: 5, // Fattore Specie 8
    healthBonus: 0, // +1 COS, -1 Taglia = +0 Salute
    armorBonus: 0,
    perceptionBonus: 4,
    naturalAttack: 'Morso (+2 Letale)',
    specialNotes: 'Taglia 4, +4 Percezione (olfatto/udito), +2 Iniziativa e Furtività.',
  },
];

export function getWerewolfFormSpec(formId: WerewolfFormId = 'hishu'): WerewolfFormSpec {
  return WEREWOLF_FORMS_TABLE.find((f) => f.id === formId) || WEREWOLF_FORMS_TABLE[0];
}

/**
 * Cambia la forma attiva di un personaggio Mutaforma aggiornando in tempo reale:
 * - Forza, Destrezza, Costituzione (rispetto ai valori base umani Hishu)
 * - Taglia, Velocità, Difesa, Iniziativa
 * - Numero di caselle della Barra Salute (+2 Dalu, +4 Gauru, +3 Urshul) preservando le ferite attuali!
 */
export function switchWerewolfForm(
  character: Character,
  targetFormId: WerewolfFormId
): Character {
  const prevForm = getWerewolfFormSpec(character.activeForm || 'hishu');
  const nextForm = getWerewolfFormSpec(targetFormId);

  // Calcola gli attributi base umani (Hishu) rimuovendo i modificatori della forma precedente
  const baseStr = Math.max(1, (character.attributes.strength || 2) - prevForm.strengthMod);
  const baseDex = Math.max(1, (character.attributes.dexterity || 2) - prevForm.dexterityMod);
  const baseSta = Math.max(1, (character.attributes.stamina || 2) - prevForm.staminaMod);

  // Applica i modificatori della nuova forma
  const newStr = baseStr + nextForm.strengthMod;
  const newDex = baseDex + nextForm.dexterityMod;
  const newSta = baseSta + nextForm.staminaMod;

  const newSize = 5 + nextForm.sizeMod;
  const newMaxHealth = newSta + newSize;
  const wits = character.attributes.wits || 2;
  const composure = character.attributes.composure || 2;
  const newDefense = Math.min(newDex, wits);
  const newInit = newDex + composure + (targetFormId === 'urhan' ? 2 : 0);
  const newSpeed = baseStr + baseDex + 5 + nextForm.speedBonus;

  // Adatta la barra della Salute al nuovo massimale preservando i danni esistenti a sinistra
  const existingDamages = (character.health || [])
    .map((h) => h.damage)
    .filter((d) => d !== 'none');

  const newHealth: HealthLevel[] = [];
  for (let i = 0; i < newMaxHealth; i++) {
    const fromRight = newMaxHealth - 1 - i;
    const penalty = fromRight === 2 ? -1 : fromRight === 1 ? -2 : fromRight === 0 ? -3 : 0;
    const label =
      fromRight === 2
        ? 'Ferito (-1)'
        : fromRight === 1
        ? 'Ferito Grave (-2)'
        : fromRight === 0
        ? 'Incapacitato (-3)'
        : `Salute (${i + 1})`;
    newHealth.push({
      label,
      penalty,
      damage: existingDamages[i] || 'none',
    });
  }

  return {
    ...character,
    activeForm: targetFormId,
    werewolfForm: targetFormId,
    attributes: {
      ...character.attributes,
      strength: newStr,
      dexterity: newDex,
      stamina: newSta,
    },
    size: newSize,
    defense: newDefense,
    initiativeMod: newInit,
    speed: newSpeed,
    health: newHealth,
  };
}

/**
 * Spende 1 punto di Essenza per guarire istantaneamente 1 danno Letale (X) — Compendio Sez. 3.3
 */
export function spendEssenceToHealLethal(character: Character): {
  success: boolean;
  character: Character;
  message: string;
} {
  if (character.bloodOrEnergy.current < 1) {
    return {
      success: false,
      character,
      message: '⚠️ Essenza insufficiente (0 rimasta)!',
    };
  }

  const updatedHealth = healDamageFromHealth(character.health, 1, 'lethal');
  return {
    success: true,
    character: {
      ...character,
      bloodOrEnergy: {
        ...character.bloodOrEnergy,
        current: character.bloodOrEnergy.current - 1,
      },
      health: updatedHealth,
    },
    message: '🐺 Speso 1 punto Essenza: rigenerato istantaneamente 1 danno Letale (X)!',
  };
}

// ============================================================================
// SEZIONE 4 COMPENDIO REGOLE — MAGHI: IL RISVEGLIO (GNOSI, CAMMINI & PARADOSSO)
// ============================================================================

export interface GnosisTier {
  level: number;
  maxMana: number;
  manaPerTurn: number;
  rulingArcanumMax: number;
  otherArcanumMax: number;
  combinedSpellsMax: number;
  baseParadoxDice: number;
}

export const GNOSIS_TABLE: GnosisTier[] = [
  { level: 1, maxMana: 10, manaPerTurn: 1, rulingArcanumMax: 3, otherArcanumMax: 2, combinedSpellsMax: 1, baseParadoxDice: 1 },
  { level: 2, maxMana: 11, manaPerTurn: 2, rulingArcanumMax: 3, otherArcanumMax: 3, combinedSpellsMax: 1, baseParadoxDice: 1 },
  { level: 3, maxMana: 12, manaPerTurn: 3, rulingArcanumMax: 4, otherArcanumMax: 3, combinedSpellsMax: 2, baseParadoxDice: 2 },
  { level: 4, maxMana: 13, manaPerTurn: 4, rulingArcanumMax: 4, otherArcanumMax: 4, combinedSpellsMax: 2, baseParadoxDice: 2 },
  { level: 5, maxMana: 14, manaPerTurn: 5, rulingArcanumMax: 5, otherArcanumMax: 4, combinedSpellsMax: 3, baseParadoxDice: 3 },
  { level: 6, maxMana: 15, manaPerTurn: 6, rulingArcanumMax: 5, otherArcanumMax: 5, combinedSpellsMax: 3, baseParadoxDice: 3 },
  { level: 7, maxMana: 20, manaPerTurn: 7, rulingArcanumMax: 5, otherArcanumMax: 5, combinedSpellsMax: 4, baseParadoxDice: 4 },
  { level: 8, maxMana: 30, manaPerTurn: 8, rulingArcanumMax: 5, otherArcanumMax: 5, combinedSpellsMax: 4, baseParadoxDice: 4 },
  { level: 9, maxMana: 50, manaPerTurn: 10, rulingArcanumMax: 5, otherArcanumMax: 5, combinedSpellsMax: 5, baseParadoxDice: 5 },
  { level: 10, maxMana: 100, manaPerTurn: 15, rulingArcanumMax: 5, otherArcanumMax: 5, combinedSpellsMax: 6, baseParadoxDice: 5 },
];

export function getGnosisStats(level: number = 1): GnosisTier {
  const safe = Math.max(1, Math.min(10, level || 1));
  return GNOSIS_TABLE[safe - 1];
}

export interface MagePathInfo {
  id: string;
  name: string;
  realm: string;
  rulingArcana: [string, string];
  inferiorArcanum: string;
  description: string;
}

export const MAGE_PATHS_TABLE: MagePathInfo[] = [
  {
    id: 'acanthus',
    name: 'Acanthus',
    realm: 'Arcadia (Dimora del Destino e del Tempo)',
    rulingArcana: ['Sorte', 'Tempo'],
    inferiorArcanum: 'Spazio',
    description: 'Incantatori e veggenti che tessono il filo della fortuna e le correnti del tempo.',
  },
  {
    id: 'mastigos',
    name: 'Mastigos',
    realm: 'Pandemonium (Dimora della Mente e dello Spazio)',
    rulingArcana: ['Mente', 'Spazio'],
    inferiorArcanum: 'Materia',
    description: 'Stregoni psichici e signori dei portali e delle distanze.',
  },
  {
    id: 'moros',
    name: 'Moros',
    realm: 'Stygia (Dimora della Materia e della Morte)',
    rulingArcana: ['Morte', 'Materia'],
    inferiorArcanum: 'Vita',
    description: 'Alchimisti e necromanti custodi della trasmutazione e dell\'oltretomba.',
  },
  {
    id: 'obrimos',
    name: 'Obrimos',
    realm: 'Etere / Aether (Dimora delle Forze e del Primo)',
    rulingArcana: ['Forze', 'Primo'],
    inferiorArcanum: 'Spirito',
    description: 'Teurghi che comandano il fuoco celeste, il fulmine e l\'energia primordiale.',
  },
  {
    id: 'thyrsus',
    name: 'Thyrsus',
    realm: 'Selva Primordiale (Dimora della Vita e dello Spirito)',
    rulingArcana: ['Vita', 'Spirito'],
    inferiorArcanum: 'Mente',
    description: 'Sciamani ed estatici in comunione con il mondo spirituale e la carne vivente.',
  },
];

export const MAGE_ARCANA_LIST: string[] = [
  'Sorte',
  'Tempo',
  'Mente',
  'Spazio',
  'Morte',
  'Materia',
  'Forze',
  'Primo',
  'Vita',
  'Spirito',
];

export function detectMagePath(character?: Character): MagePathInfo {
  const text = `${character?.path || ''} ${character?.factionOrClan || ''} ${character?.concept || ''}`.toLowerCase();
  if (text.includes('acanthus')) return MAGE_PATHS_TABLE[0];
  if (text.includes('mastigos')) return MAGE_PATHS_TABLE[1];
  if (text.includes('moros')) return MAGE_PATHS_TABLE[2];
  if (text.includes('thyrsus')) return MAGE_PATHS_TABLE[4];
  return MAGE_PATHS_TABLE[3]; // Default Obrimos
}

/**
 * Calcola la riserva di dadi di Paradosso per un incantesimo Volgare — Compendio Sez. 4.3
 */
export function calculateParadoxPool(params: {
  gnosis: number;
  hasSleeperWitnesses: boolean;
  consecutiveParadoxRolls: number;
  manaSpentToMitigate: number;
}): {
  pool: number;
  baseDice: number;
  witnessBonus: number;
  formula: string;
} {
  const gnosisTier = getGnosisStats(params.gnosis);
  const baseDice = gnosisTier.baseParadoxDice;
  const witnessBonus = params.hasSleeperWitnesses ? 2 : 0;
  const consecutiveBonus = Math.max(0, params.consecutiveParadoxRolls);
  const mitigation = Math.max(0, params.manaSpentToMitigate);

  const pool = Math.max(0, baseDice + witnessBonus + consecutiveBonus - mitigation);
  const parts = [
    `Base Gnosi ${params.gnosis} (${baseDice} dadi)`,
    witnessBonus > 0 ? `Testimoni Mortali (+2)` : '',
    consecutiveBonus > 0 ? `Ripercussioni Precedenti (+${consecutiveBonus})` : '',
    mitigation > 0 ? `Mitigazione Mana (-${mitigation})` : '',
  ].filter(Boolean);

  return {
    pool,
    baseDice,
    witnessBonus,
    formula: `${parts.join(' ')} = ${pool} dadi di Paradosso`,
  };
}
