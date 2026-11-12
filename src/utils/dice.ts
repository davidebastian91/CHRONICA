import type { DiceRollResult, DamageType } from '../types';

export interface StorytellingRollOptions {
  againThreshold?: 8 | 9 | 10 | 11; // 10 = 10-Again (default), 9 = 9-Again, 8 = 8-Again, 11 = Nessun rilancio
  willpowerSpent?: boolean;
  weaponBonusDice?: number;
  targetDefensePenalty?: number;
  isCombatAttack?: boolean;
  damageType?: DamageType;
  weaponName?: string;
}

/**
 * MOTORE DADI CHRONICA D10 ENGINE (Compendio Regole Sez. 1.1)
 * - Soglia Fissa: 8, 9 e 10 sono Successi (basta 1 successo per superare un'azione standard).
 * - Regola del 10-Again (o 9-Again / 8-Again): ogni dado >= againThreshold conta come successo e si rilancia immediatamente.
 * - Gli '1' NON sottraggono successi nei tiri normali.
 * - Tiro di Fortuna (Chance Die): se la riserva scende a 0 o meno (pool <= 0), si tira 1 singolo d10:
 *   • Risultato 10 = Successo (e si applica il 10-Again)
 *   • Risultato 2–9 = Fallimento semplice
 *   • Risultato 1 = Fallimento Drammatico (Botch / Dramatic Failure)
 * - Successo Eccezionale: 5 o più successi!
 */
export function rollD10Pool(
  pool: number,
  _legacyDifficulty: number = 8,
  attributeName?: string,
  abilityName?: string,
  options?: StorytellingRollOptions
): DiceRollResult {
  const againThreshold = options?.againThreshold || 10;
  const isChanceDie = pool <= 0;

  const baseDice: number[] = [];
  const explodedDice: number[] = [];
  let rawSuccesses = 0;
  let ones = 0;

  if (isChanceDie) {
    // TIRO DI FORTUNA (CHANCE DIE) — Compendio Sez. 1.1
    const firstDie = Math.floor(Math.random() * 10) + 1;
    baseDice.push(firstDie);
    if (firstDie === 1) {
      ones = 1;
    } else if (firstDie === 10) {
      rawSuccesses++;
      // Sul Tiro di Fortuna il 10 esplode con il 10-Again (solo altri 10 contano come successo)
      let current = firstDie;
      let safety = 0;
      while (current === 10 && safety < 50) {
        safety++;
        current = Math.floor(Math.random() * 10) + 1;
        explodedDice.push(current);
        if (current === 10) {
          rawSuccesses++;
        }
      }
    }

    const allDice = [...baseDice, ...explodedDice];
    let outcome: 'botch' | 'failure' | 'success' | 'exceptional';
    let netSuccesses = rawSuccesses;

    if (firstDie === 1) {
      outcome = 'botch'; // Fallimento Drammatico (Dramatic Failure)
      netSuccesses = -1;
    } else if (rawSuccesses === 0) {
      outcome = 'failure';
      netSuccesses = 0;
    } else if (rawSuccesses >= 5) {
      outcome = 'exceptional';
    } else {
      outcome = 'success';
    }

    return {
      pool: 0,
      difficulty: 10, // Sul Tiro di Fortuna serve un 10
      dice: allDice,
      explodedDice,
      againThreshold: 10,
      isChanceDie: true,
      willpowerSpent: options?.willpowerSpent,
      weaponBonusDice: options?.weaponBonusDice,
      targetDefensePenalty: options?.targetDefensePenalty,
      damageInflicted: options?.isCombatAttack ? Math.max(0, netSuccesses) : undefined,
      damageType: options?.damageType,
      weaponName: options?.weaponName,
      rawSuccesses,
      ones,
      netSuccesses,
      outcome,
      attributeName,
      abilityName,
      timestamp: Date.now(),
    };
  }

  // TIRO STANDARD STORYTELLING SYSTEM (pool >= 1, Soglia Fissa = 8+)
  let explodeCount = 0;
  for (let i = 0; i < pool; i++) {
    const val = Math.floor(Math.random() * 10) + 1;
    baseDice.push(val);
    if (val >= 8) {
      rawSuccesses++;
    }
    if (val === 1) {
      ones++;
    }
    if (val >= againThreshold) {
      explodeCount++;
    }
  }

  // Gestione Esplosione Dadi (10-Again / 9-Again / 8-Again)
  let safety = 0;
  while (explodeCount > 0 && safety < 100) {
    safety++;
    explodeCount--;
    const extraVal = Math.floor(Math.random() * 10) + 1;
    explodedDice.push(extraVal);
    if (extraVal >= 8) {
      rawSuccesses++;
    }
    if (extraVal >= againThreshold) {
      explodeCount++;
    }
  }

  // Ordina i dadi base dal più alto al più basso, seguiti dai dadi esplosi
  baseDice.sort((a, b) => b - a);
  const allDice = [...baseDice, ...explodedDice];

  const netSuccesses = rawSuccesses; // Gli 1 NON cancellano i successi nello Storytelling System!
  let outcome: 'botch' | 'failure' | 'success' | 'exceptional';

  if (netSuccesses <= 0) {
    outcome = 'failure';
  } else if (netSuccesses >= 5) {
    outcome = 'exceptional'; // 5+ successi = Successo Eccezionale (Compendio Sez. 1.1)
  } else {
    outcome = 'success';
  }

  return {
    pool,
    difficulty: 8, // Soglia fissa ufficiale Storytelling System (8+)
    dice: allDice,
    explodedDice,
    againThreshold,
    isChanceDie: false,
    willpowerSpent: options?.willpowerSpent,
    weaponBonusDice: options?.weaponBonusDice,
    targetDefensePenalty: options?.targetDefensePenalty,
    damageInflicted: options?.isCombatAttack ? Math.max(0, netSuccesses) : undefined,
    damageType: options?.damageType,
    weaponName: options?.weaponName,
    rawSuccesses,
    ones,
    netSuccesses,
    outcome,
    attributeName,
    abilityName,
    timestamp: Date.now(),
  };
}
