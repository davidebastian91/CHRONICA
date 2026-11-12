import type { Character, CreatureType, ExperienceTracker } from '../types';
import { detectMagePath } from './wodSupernaturalRules';

/**
 * TABELLA UNIFICATA DEI COSTI PUNTI ESPERIENZA (Compendio Regole Sezione 5)
 * - Generici:
 *   • Attributo: Nuovo livello × 5 PE
 *   • Abilità (Skill): Nuovo livello × 3 PE
 *   • Specializzazione Abilità: 3 PE (costo fisso)
 *   • Meriti: Nuovo livello × 2 PE
 *   • Volontà (pallino acquistato): 8 PE (costo fisso)
 * - Vampiri (Il Requiem):
 *   • Potenza del Sangue: Nuovo livello × 8 PE
 *   • Disciplina di Clan: Nuovo livello × 5 PE
 *   • Disciplina fuori Clan: Nuovo livello × 7 PE
 *   • Umanità: Nuovo livello × 3 PE
 * - Lupi Mannari (I Rinnegati):
 *   • Istinto Primordiale: Nuovo livello × 8 PE
 *   • Dono di Affinità (Auspicio/Tribù): Nuovo livello × 5 PE
 *   • Dono Generico / Fuori Affinità: Nuovo livello × 7 PE
 *   • Riti: Livello del Rito × 2 PE
 *   • Armonia: Nuovo livello × 3 PE
 * - Maghi (Il Risveglio):
 *   • Gnosi: Nuovo livello × 8 PE
 *   • Arcanum Principale (Ruling): Nuovo livello × 6 PE
 *   • Arcanum Comune (Common): Nuovo livello × 7 PE
 *   • Arcanum Inferiore (Inferior): Nuovo livello × 8 PE
 *   • Formula Magica (Rote): 2 PE per pallino di livello
 *   • Saggezza: Nuovo livello × 3 PE
 */
export const UNIFIED_XP_COST_TABLE: { trait: string; formula: string }[] = [
  { trait: 'Attributo (Mentale / Fisico / Sociale)', formula: 'Nuovo livello × 5 PE' },
  { trait: 'Abilità (Skill)', formula: 'Nuovo livello × 3 PE' },
  { trait: 'Specializzazione Abilità', formula: '3 PE (costo fisso)' },
  { trait: 'Merito (Merit)', formula: 'Nuovo livello × 2 PE' },
  { trait: 'Volontà (pallino acquistato)', formula: '8 PE (costo fisso)' },
  { trait: 'Moralità / Umanità / Armonia / Saggezza', formula: 'Nuovo livello × 3 PE' },
  { trait: '🧛 Potenza del Sangue (Vampiri)', formula: 'Nuovo livello × 8 PE' },
  { trait: '🧛 Disciplina di Clan / Affinità', formula: 'Nuovo livello × 5 PE' },
  { trait: '🧛 Disciplina fuori Clan / Generica', formula: 'Nuovo livello × 7 PE' },
  { trait: '🐺 Istinto Primordiale (Lupi Mannari)', formula: 'Nuovo livello × 8 PE' },
  { trait: '🐺 Dono di Affinità (Auspicio/Tribù)', formula: 'Nuovo livello × 5 PE' },
  { trait: '🐺 Rito (Lupi) / Formula Rote (Maghi)', formula: 'Livello × 2 PE' },
  { trait: '🔮 Gnosi (Maghi)', formula: 'Nuovo livello × 8 PE' },
  { trait: '🔮 Arcanum Principale (Ruling)', formula: 'Nuovo livello × 6 PE' },
  { trait: '🔮 Arcanum Comune (Common)', formula: 'Nuovo livello × 7 PE' },
  { trait: '🔮 Arcanum Inferiore (Inferior)', formula: 'Nuovo livello × 8 PE' },
];

export const WOD_XP_COSTS = {
  SPECIALTY: 3,
  ATTRIBUTE_NEW_DOT_MULTIPLIER: 5,
  ABILITY_NEW_DOT_MULTIPLIER: 3,
  MERIT_NEW_DOT_MULTIPLIER: 2,
  MORALITY_NEW_DOT_MULTIPLIER: 3,
  POWER_NEW_DOT_MULTIPLIER: 5,
  OUT_OF_CLAN_POWER_MULTIPLIER: 7,
  MAGE_RULING_ARCANUM_MULTIPLIER: 6,
  MAGE_COMMON_ARCANUM_MULTIPLIER: 7,
  MAGE_INFERIOR_ARCANUM_MULTIPLIER: 8,
  SUPERNATURAL_POTENCY_MULTIPLIER: 8, // Potenza del Sangue / Istinto Primordiale / Gnosi
  RITUAL_OR_ROTE_MULTIPLIER: 2,
  WILLPOWER_FLAT_DOT: 8,
};

export function getAttributeXpCost(currentLevel: number): number {
  const newDot = currentLevel + 1;
  return newDot * WOD_XP_COSTS.ATTRIBUTE_NEW_DOT_MULTIPLIER;
}

export function getAbilityXpCost(currentLevel: number): number {
  const newDot = currentLevel + 1;
  return newDot * WOD_XP_COSTS.ABILITY_NEW_DOT_MULTIPLIER;
}

export function getMeritXpCost(currentLevel: number): number {
  const newDot = currentLevel + 1;
  return newDot * WOD_XP_COSTS.MERIT_NEW_DOT_MULTIPLIER;
}

/**
 * Calcola il costo in PE per aumentare Potenza del Sangue (Vampiri), Istinto Primordiale (Lupi) o Gnosi (Maghi):
 * Nuovo livello × 8 PE (Compendio Sez. 5)
 */
export function getSupernaturalPotencyXpCost(currentLevel: number): number {
  const newDot = currentLevel + 1;
  return newDot * WOD_XP_COSTS.SUPERNATURAL_POTENCY_MULTIPLIER;
}

/**
 * Calcola il costo in PE di un Potere (Disciplina / Dono / Arcanum / Rito / Formula) in base alla stirpe del personaggio
 * secondo la Sezione 5 del Compendio Regole.
 */
export function getPowerXpCost(
  currentLevel: number,
  character?: Character,
  powerName?: string,
  isOutOfClan?: boolean
): number {
  const newDot = currentLevel + 1;
  const creature: CreatureType = character?.creatureType || 'mortal';
  const nameLower = (powerName || '').toLowerCase();

  // Riti (Lupi Mannari) o Formule / Rotes (Maghi): Livello × 2 PE
  if (nameLower.includes('rito:') || nameLower.includes('formula:') || nameLower.includes('rote:')) {
    return newDot * WOD_XP_COSTS.RITUAL_OR_ROTE_MULTIPLIER;
  }

  // MAGHI: Arcanum Principale (×6), Comune (×7), Inferiore (×8)
  if (creature === 'mage') {
    const pathInfo = detectMagePath(character);
    const isRuling = pathInfo.rulingArcana.some((a) =>
      nameLower.includes(a.toLowerCase()) ||
      (a === 'Primo' && nameLower.includes('cardinale'))
    );
    const isInferior = nameLower.includes(pathInfo.inferiorArcanum.toLowerCase());

    if (isRuling) {
      return newDot * WOD_XP_COSTS.MAGE_RULING_ARCANUM_MULTIPLIER;
    }
    if (isInferior) {
      return newDot * WOD_XP_COSTS.MAGE_INFERIOR_ARCANUM_MULTIPLIER;
    }
    return newDot * WOD_XP_COSTS.MAGE_COMMON_ARCANUM_MULTIPLIER;
  }

  // VAMPIRI & LUPI MANNARI: Di Clan / Affinità (×5) vs Fuori Clan / Generico (×7)
  if (creature === 'vampire' || creature === 'werewolf') {
    if (isOutOfClan) {
      return newDot * WOD_XP_COSTS.OUT_OF_CLAN_POWER_MULTIPLIER;
    }
    return newDot * WOD_XP_COSTS.POWER_NEW_DOT_MULTIPLIER;
  }

  return newDot * WOD_XP_COSTS.POWER_NEW_DOT_MULTIPLIER;
}

export function getWillpowerXpCost(_currentLevel: number): number {
  return WOD_XP_COSTS.WILLPOWER_FLAT_DOT;
}

export function getHumanityXpCost(currentLevel: number): number {
  const newDot = currentLevel + 1;
  return newDot * WOD_XP_COSTS.MORALITY_NEW_DOT_MULTIPLIER;
}

export function ensureExperienceTracker(character: Character): ExperienceTracker {
  return character.experience || { current: 0, total: 0, history: [] };
}

/**
 * Assegna nuovi Punti Esperienza al personaggio
 */
export function awardExperience(
  character: Character,
  amount: number,
  reason: string = 'Avanzamento Narrativo'
): Character {
  const currentExp = ensureExperienceTracker(character);
  const newExp: ExperienceTracker = {
    current: currentExp.current + amount,
    total: currentExp.total + amount,
    history: [
      {
        timestamp: Date.now(),
        amount,
        reason,
        type: 'gain',
      },
      ...(currentExp.history || []),
    ],
  };

  return {
    ...character,
    experience: newExp,
  };
}

/**
 * Spende Punti Esperienza per aumentare un tratto secondo i costi WoD
 */
export function spendExperience(
  character: Character,
  cost: number,
  traitName: string,
  oldVal: number,
  newVal: number
): { success: boolean; character: Character; error?: string } {
  const currentExp = ensureExperienceTracker(character);

  if (currentExp.current < cost) {
    return {
      success: false,
      character,
      error: `Punti Esperienza insufficienti: necessari ${cost} PE, ne possiedi ${currentExp.current} PE.`,
    };
  }

  const updatedExp: ExperienceTracker = {
    current: currentExp.current - cost,
    total: currentExp.total,
    history: [
      {
        timestamp: Date.now(),
        amount: cost,
        reason: `Migliorato ${traitName} da ${oldVal} a ${newVal}`,
        type: 'spend',
        traitName,
        oldVal,
        newVal,
      },
      ...(currentExp.history || []),
    ],
  };

  return {
    success: true,
    character: {
      ...character,
      experience: updatedExp,
    },
  };
}
