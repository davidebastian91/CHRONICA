import React, { useState, useEffect } from 'react';
import type {
  Character,
  DiceRollResult,
  InitiativeResult,
  WodWeapon,
  ActiveCombatEnemy,
} from '../types';
import { rollD10Pool } from '../utils/dice';
import { ATTRIBUTE_LABELS, ABILITY_LABELS } from '../utils/traitLabels';
import {
  getSuccessRuling,
  getHealthPenalty,
} from '../utils/wodActionRules';
import { checkAmmoStatus, consumeAmmo, getCharacterInventory } from '../utils/inventorySystem';
import {
  WOD_WEAPONS_CATALOG,
  rollInitiative,
  calculateSingleRollAttackPool,
  matchWeaponFromCatalog,
  findWeaponFromText,
} from '../utils/wodCombatRules';
import {
  Dices,
  X,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Feather,
  Flame,
  Swords,
  Zap,
  Mic,
  MicOff,
} from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { Dice3DStage } from './Dice3DStage';

interface DiceRollerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendRollToStory?: (roll: DiceRollResult, comment?: string, playerNarration?: string) => void;
  onUpdateCharacter?: (updated: Character) => void;
  character?: Character | null;
  activeEnemies?: ActiveCombatEnemy[];
  initialAttribute?: { name: string; value: number };
  initialAbility?: { name: string; value: number };
  initialDifficulty?: number;
  initialReason?: string;
  initialSituationalMod?: number;
}

export const DiceRollerModal: React.FC<DiceRollerModalProps> = ({
  isOpen,
  onClose,
  onSendRollToStory,
  onUpdateCharacter,
  character,
  activeEnemies = [],
  initialAttribute,
  initialAbility,
  initialReason = '',
  initialSituationalMod,
}) => {
  // Tratti selezionati per Azione / Attacco
  const [selectedAttrKey, setSelectedAttrKey] = useState<string>(
    initialAttribute ? initialAttribute.name : 'dexterity'
  );
  const [selectedAbilityKey, setSelectedAbilityKey] = useState<string>(
    initialAbility ? initialAbility.name : 'firearms'
  );
  const [actionComment, setActionComment] = useState<string>(initialReason);
  const [lastRoll, setLastRoll] = useState<DiceRollResult | null>(null);
  const [isRolling3D, setIsRolling3D] = useState<boolean>(false);

  // Modificatore Situazionale rapido (+/- dadi)
  const [situationalMod, setSituationalMod] = useState<number>(0);

  // Regola Esplosione Dadi (10-Again di default, 9-Again, 8-Again, 11=Nessuno)
  const [customAgainThreshold, setCustomAgainThreshold] = useState<8 | 9 | 10 | 11 | null>(null);

  // Spesa Volontà (+3 dadi all'azione)
  const [spendWillpower, setSpendWillpower] = useState<boolean>(false);

  // Narrazione personalizzata del giocatore sui successi
  const [playerNarration, setPlayerNarration] = useState<string>('');

  // Riconoscimento Vocale (Speech-to-Text) per dettare la narrazione
  const { isListening, isSupported: isSpeechSupported, toggleListening } = useSpeechRecognition({
    onResult: (text) => setPlayerNarration(text),
  });

  // --- COMBATTIMENTO STORYTELLING SYSTEM (TIRO UNICO) ---
  const [useCombatWeapon, setUseCombatWeapon] = useState<boolean>(true);
  const [selectedWeaponId, setSelectedWeaponId] = useState<string>('');
  const [selectedTargetEnemyId, setSelectedTargetEnemyId] = useState<string>('');
  const [targetDefense, setTargetDefense] = useState<number>(2);
  const [targetArmor, setTargetArmor] = useState<number>(0);
  const [fireMode, setFireMode] = useState<'single' | 'shortBurst' | 'fullAuto'>('single');

  // --- COMBATTIMENTO CON DUE ARMI (DUAL WIELDING / AKIMBO) ---
  const [useDualWield, setUseDualWield] = useState<boolean>(false);
  const [dualWieldMode, setDualWieldMode] = useState<'combined' | 'flurry'>('combined');
  const [selectedSecondaryWeaponId, setSelectedSecondaryWeaponId] = useState<string>('twin');
  const [secondaryRoll, setSecondaryRoll] = useState<DiceRollResult | null>(null);

  // --- INIZIATIVA (Solo se richiesta esplicitamente dal Narratore per il combattimento) ---
  const [initiativeResult, setInitiativeResult] = useState<InitiativeResult | null>(null);

  // Verifica se la modale è stata aperta dal Narratore specificamente per un tiro d'Iniziativa
  const isInitiativeMode =
    initialAttribute?.name === 'initiative' ||
    (initialReason || '').toLowerCase().includes('iniziativa');

  // Armi disponibili: prima quelle nell'inventario del personaggio, poi il catalogo
  const characterItems = character ? getCharacterInventory(character) : [];
  const inventoryWeapons = characterItems
    .filter((i) => i.category === 'weapon')
    .map((i) => i.weaponStats || matchWeaponFromCatalog(i.name));

  const availableWeapons: WodWeapon[] = [
    ...inventoryWeapons,
    ...WOD_WEAPONS_CATALOG.filter((w) => !inventoryWeapons.some((iw) => iw.id === w.id)),
  ];

  // Algoritmo intelligente per trovare l'arma più adatta in base al testo dell'azione e all'abilità
  const resolveBestWeaponForAction = (
    actionText: string | undefined,
    abilityKey: string | undefined
  ): WodWeapon | null => {
    const text = (actionText || '').toLowerCase().trim();

    // 1. Identifica la tipologia d'arma richiesta dall'abilità scelta
    const isFirearmSkill = abilityKey === 'firearms';
    const isMeleeSkill = abilityKey === 'weaponry';
    const isBrawlSkill = abilityKey === 'brawl';

    // 2. Filtra nell'inventario del PG SOLO le armi compatibili con l'abilità
    // (es. per Firearms si accettano solo armi da fuoco/a distanza, MAI lame o pugnali!)
    const compatibleInvWeapons = inventoryWeapons.filter((w) => {
      if (isFirearmSkill) return w.category === 'firearms' || w.category === 'ranged';
      if (isMeleeSkill) return w.category === 'melee';
      if (isBrawlSkill) return w.category === 'brawl';
      return true;
    });

    // A. Se il testo cita espressamente un'arma presente nell'inventario del PG (es. "peacemaker", "colt", "winchester")
    if (text && compatibleInvWeapons.length > 0) {
      const explicitInvMatch = compatibleInvWeapons.find((w) => {
        const cleanName = w.name.toLowerCase().replace(/[^\w\s]/gi, ' ').trim();
        const words = cleanName.split(/\s+/).filter((word) => word.length >= 3);
        return words.some((word) => text.includes(word));
      });
      if (explicitInvMatch) return explicitInvMatch;
    }

    // B. Se il testo cita un'arma specifica del catalogo (tramite findWeaponFromText)
    if (text) {
      const textMatchedWeapon = findWeaponFromText(text);
      if (textMatchedWeapon) {
        // Cerca se il personaggio possiede un'arma equivalente
        const inInv = compatibleInvWeapons.find(
          (w) => w.id === textMatchedWeapon.id || w.category === textMatchedWeapon.category
        );
        if (inInv) return inInv;

        if (
          (!isFirearmSkill || textMatchedWeapon.category === 'firearms' || textMatchedWeapon.category === 'ranged') &&
          (!isMeleeSkill || textMatchedWeapon.category === 'melee') &&
          (!isBrawlSkill || textMatchedWeapon.category === 'brawl')
        ) {
          return textMatchedWeapon;
        }
      }
    }

    // C. Se il personaggio ha un'arma compatibile equipaggiata (isEquipped) nell'inventario
    if (characterItems.length > 0) {
      const equippedItem = characterItems.find((i) => {
        if (i.category !== 'weapon' || !i.isEquipped) return false;
        const wep = i.weaponStats || matchWeaponFromCatalog(i.name);
        if (isFirearmSkill) return wep.category === 'firearms' || wep.category === 'ranged';
        if (isMeleeSkill) return wep.category === 'melee';
        if (isBrawlSkill) return wep.category === 'brawl';
        return true;
      });
      if (equippedItem) {
        return equippedItem.weaponStats || matchWeaponFromCatalog(equippedItem.name);
      }
    }

    // D. Prendi la prima arma compatibile con l'abilità presente nell'inventario del PG!
    // (es. Se spara, prende la prima arma da fuoco posseduta come Revolver Peacemaker)
    if (compatibleInvWeapons.length > 0) {
      return compatibleInvWeapons[0];
    }

    // E. Se il personaggio non possiede un'arma compatibile nell'inventario, cerca nel catalogo generale
    if (isFirearmSkill) {
      return (
        availableWeapons.find((w) => w.id === 'firearms_revolver_heavy') ||
        availableWeapons.find((w) => w.id === 'firearms_pistol_heavy') ||
        availableWeapons.find((w) => w.category === 'firearms') ||
        null
      );
    }
    if (isMeleeSkill) {
      return (
        availableWeapons.find((w) => w.id === 'melee_sword') ||
        availableWeapons.find((w) => w.id === 'melee_knife') ||
        availableWeapons.find((w) => w.category === 'melee') ||
        null
      );
    }
    if (isBrawlSkill) {
      return (
        availableWeapons.find((w) => w.id === 'brawl_brass_knuckles') ||
        availableWeapons.find((w) => w.category === 'brawl') ||
        null
      );
    }

    return inventoryWeapons[0] || availableWeapons[0] || null;
  };

  useEffect(() => {
    const abilKey = initialAbility?.name || selectedAbilityKey;
    const reasonText = initialReason || '';

    if (initialAttribute) setSelectedAttrKey(initialAttribute.name);
    if (initialAbility) setSelectedAbilityKey(initialAbility.name);
    if (initialReason) setActionComment(initialReason);

    // Se l'abilità iniziale è di combattimento, attiva il calcolo con arma
    const isCombatAbil = ['firearms', 'weaponry', 'brawl'].includes(abilKey);
    setUseCombatWeapon(isCombatAbil);

    const bestWeapon = resolveBestWeaponForAction(reasonText, abilKey);
    if (bestWeapon) {
      setSelectedWeaponId(bestWeapon.id);
    }

    // Se ci sono nemici attivi in combattimento, pre-seleziona il primo nemico vivo
    const firstLivingEnemy = activeEnemies.find(
      (e) => !e.isDefeated && e.health.some((h) => h.damage === 'none')
    ) || activeEnemies[0];
    if (firstLivingEnemy) {
      setSelectedTargetEnemyId(firstLivingEnemy.id);
      setTargetDefense(firstLivingEnemy.defense);
      setTargetArmor(firstLivingEnemy.armor);
    }

    setLastRoll(null);
    setIsRolling3D(false);
    setPlayerNarration('');

    // Calcolo Modificatore Situazionale: usa initialSituationalMod se passato, altrimenti estrailo da initialReason
    let initialMod = initialSituationalMod !== undefined ? initialSituationalMod : 0;
    if (initialMod === 0 && initialReason) {
      const match = initialReason.match(/(?:modificatore|penalit[àa]|bonus|bersaglio\s+specifico)?\s*([+-]\d+)/i);
      if (match) {
        initialMod = parseInt(match[1], 10);
      }
    }
    setSituationalMod(initialMod);

    setSpendWillpower(false);
    setCustomAgainThreshold(null);
    setInitiativeResult(null);

    // Modalità di Fuoco: auto-seleziona Svuota Caricatore o Raffica se citati nell'azione
    if (/svuot(?:o|a|are)|scaric(?:o|a|are)|tutti\s+i\s+colpi/i.test(reasonText)) {
      setFireMode('fullAuto');
    } else if (/raffic(?:a|he)/i.test(reasonText)) {
      setFireMode('shortBurst');
    } else {
      setFireMode('single');
    }

    // Combattimento con Due Armi / Akimbo: auto-seleziona se citato nell'azione
    const isDualText = /entramb[ei]|due\s+(?:katana|spade|pistol|lame|armi|coltell|pugnal|revolver)|doppi[ae]\s+(?:lama|lame|arma|armi|pistol)|akimbo|combatt(?:ere|i)?\s+con\s+due/i.test(
      reasonText
    );
    if (isDualText) {
      setUseDualWield(true);
      setSelectedSecondaryWeaponId('twin');
    } else {
      setUseDualWield(false);
    }
    setSecondaryRoll(null);
  }, [isOpen, initialAttribute, initialAbility, initialReason, initialSituationalMod]);

  if (!isOpen) return null;

  // Calcola penalità da ferite automatica dalla scheda (-1, -2, -3 sulle ultime tre caselle)
  const healthPenalty = getHealthPenalty(character?.health);

  // Valore attributo e abilità
  const attrVal =
    character && (character.attributes as any)[selectedAttrKey] !== undefined
      ? (character.attributes as any)[selectedAttrKey]
      : 2;

  const abilityVal =
    selectedAbilityKey === 'none'
      ? 0
      : character && (character.abilities as any)[selectedAbilityKey] !== undefined
      ? (character.abilities as any)[selectedAbilityKey]
      : 0;

  const attrLabel = ATTRIBUTE_LABELS[selectedAttrKey] || selectedAttrKey;
  const abilityLabel =
    selectedAbilityKey === 'none' ? 'Nessuna' : ABILITY_LABELS[selectedAbilityKey] || selectedAbilityKey;

  const currentWeapon =
    availableWeapons.find((w) => w.id === selectedWeaponId) ||
    availableWeapons[0] ||
    WOD_WEAPONS_CATALOG[0];

  // Rilevamento tiro a distanza con armi da fuoco/archi per il consumo munizioni e modalità raffica
  const isRangedAction =
    selectedAbilityKey === 'firearms' ||
    (useCombatWeapon &&
      (currentWeapon.category === 'firearms' || currentWeapon.category === 'ranged'));

  const fireModeBonusDice =
    isRangedAction && useCombatWeapon
      ? fireMode === 'fullAuto'
        ? 3
        : fireMode === 'shortBurst'
        ? 1
        : 0
      : 0;

  const fireModeLabel =
    fireMode === 'fullAuto'
      ? 'Svuota Caricatore (+3)'
      : fireMode === 'shortBurst'
      ? 'Raffica Breve (+1)'
      : undefined;

  // Controllo Merito Ambidestro nella scheda del personaggio
  const charMerits = (character?.meritsFlaws || (character as any)?.merits || []) as Array<{
    name?: string;
    description?: string;
  }>;
  const isAmbidextrous = Boolean(
    charMerits.some(
      (m) =>
        (m.name || '').toLowerCase().includes('ambidestro') ||
        (m.name || '').toLowerCase().includes('ambidextrous') ||
        (m.description || '').toLowerCase().includes('ambidestro')
    )
  );

  // Arma Secondaria per Combattere con Due Armi (Twin blade o arma differente)
  const secondaryWeapon: WodWeapon =
    selectedSecondaryWeaponId === 'twin'
      ? {
          ...currentWeapon,
          id: `twin_${currentWeapon.id}`,
          name: `${currentWeapon.name} Gemella`,
        }
      : availableWeapons.find((w) => w.id === selectedSecondaryWeaponId) || currentWeapon;

  // Calcolo della riserva secondo lo Storytelling System (Tiro Unico o Colpo Incrociato Combinato)
  const singleAttackCalc = calculateSingleRollAttackPool({
    character: character || undefined,
    attrVal,
    attrLabel,
    abilityVal,
    abilityLabel,
    weapon: currentWeapon,
    useWeaponInRoll: useCombatWeapon,
    targetDefense: useCombatWeapon ? targetDefense : 0,
    targetArmor: useCombatWeapon ? targetArmor : 0,
    situationalMod,
    healthPenalty,
    spendWillpower,
    fireModeBonus: fireModeBonusDice,
    fireModeLabel,
    dualWield:
      useCombatWeapon && useDualWield
        ? {
            secondaryWeapon,
            mode: dualWieldMode,
            isAmbidextrous,
          }
        : undefined,
  });

  // Calcolo per modalità "Doppio Attacco a Due Mani" (Flurry: 2 Tiri Separati)
  const primaryAttackCalc = calculateSingleRollAttackPool({
    character: character || undefined,
    attrVal,
    attrLabel,
    abilityVal,
    abilityLabel,
    weapon: currentWeapon,
    useWeaponInRoll: useCombatWeapon,
    targetDefense: useCombatWeapon ? targetDefense : 0,
    targetArmor: useCombatWeapon ? targetArmor : 0,
    situationalMod,
    healthPenalty,
    spendWillpower,
    fireModeBonus: fireModeBonusDice,
    fireModeLabel,
  });

  const secondaryOffHandPenalty = isAmbidextrous ? 0 : -2;
  const secondaryAttackCalc = calculateSingleRollAttackPool({
    character: character || undefined,
    attrVal,
    attrLabel,
    abilityVal,
    abilityLabel,
    weapon: secondaryWeapon,
    useWeaponInRoll: useCombatWeapon,
    targetDefense: useCombatWeapon ? targetDefense : 0,
    targetArmor: useCombatWeapon ? targetArmor : 0,
    situationalMod: situationalMod + secondaryOffHandPenalty,
    healthPenalty,
    spendWillpower: false,
    fireModeBonus: 0,
  });

  const calculatedPool =
    useCombatWeapon && useDualWield && dualWieldMode === 'flurry'
      ? primaryAttackCalc.finalPool
      : singleAttackCalc.finalPool;
  const effectiveAgainThreshold: 8 | 9 | 10 | 11 =
    customAgainThreshold || singleAttackCalc.againThreshold || 10;

  const successRuling = lastRoll
    ? getSuccessRuling(lastRoll.netSuccesses, undefined, lastRoll.isChanceDie)
    : null;

  const canSpendWillpower = (character?.willpower?.current || 0) > 0;

  const ammoStatus = character ? checkAmmoStatus(character) : null;
  const isOutOfAmmo = Boolean(
    isRangedAction && ammoStatus && ammoStatus.ammoItems.length > 0 && ammoStatus.totalAmmo === 0
  );

  // Lancio Dadi Storytelling System (Soglia 8+, 10-Again / 9-Again, Tiro di Fortuna se <= 0)
  const handleRoll = () => {
    if (isOutOfAmmo) {
      alert(
        '⚠️ Impossibile sparare: Munizioni Esaurite (0 rimaste)! Devi cambiare arma, passare al corpo a corpo o ricaricare.'
      );
      return;
    }

    const targetEnemyObj =
      useCombatWeapon && selectedTargetEnemyId
        ? activeEnemies.find((e) => e.id === selectedTargetEnemyId)
        : undefined;

    // Caso A: Combattimento con Due Armi in modalità "Doppio Attacco a Due Mani" (2 Tiri Distinti)
    if (useCombatWeapon && useDualWield && dualWieldMode === 'flurry') {
      const primaryResult = rollD10Pool(
        primaryAttackCalc.finalPool,
        8,
        attrLabel,
        selectedAbilityKey === 'none' ? undefined : abilityLabel,
        {
          againThreshold: customAgainThreshold || primaryAttackCalc.againThreshold || 10,
          willpowerSpent: spendWillpower,
          weaponBonusDice: primaryAttackCalc.weaponBonus + fireModeBonusDice,
          targetDefensePenalty:
            primaryAttackCalc.effectiveDefensePenalty + primaryAttackCalc.effectiveArmorPenalty,
          isCombatAttack: true,
          damageType: primaryAttackCalc.damageType,
          weaponName: currentWeapon.name,
        }
      );

      const secondaryResult = rollD10Pool(
        secondaryAttackCalc.finalPool,
        8,
        attrLabel,
        selectedAbilityKey === 'none' ? undefined : abilityLabel,
        {
          againThreshold: customAgainThreshold || secondaryAttackCalc.againThreshold || 10,
          willpowerSpent: false,
          weaponBonusDice: secondaryAttackCalc.weaponBonus,
          targetDefensePenalty:
            secondaryAttackCalc.effectiveDefensePenalty + secondaryAttackCalc.effectiveArmorPenalty,
          isCombatAttack: true,
          damageType: secondaryAttackCalc.damageType,
          weaponName: secondaryWeapon.name,
        }
      );

      if (targetEnemyObj) {
        primaryResult.targetEnemyId = targetEnemyObj.id;
        primaryResult.targetEnemyName = targetEnemyObj.name;
        secondaryResult.targetEnemyId = targetEnemyObj.id;
        secondaryResult.targetEnemyName = targetEnemyObj.name;
      }

      const primaryDmg = Math.max(0, primaryResult.netSuccesses);
      const secondaryDmg = Math.max(0, secondaryResult.netSuccesses);
      primaryResult.damageInflicted = primaryDmg + secondaryDmg;
      primaryResult.dualWieldMode = 'flurry';
      primaryResult.secondaryWeaponName = secondaryWeapon.name;
      primaryResult.secondaryRoll = secondaryResult;

      setLastRoll(primaryResult);
      setSecondaryRoll(secondaryResult);
      setPlayerNarration('');
      setIsRolling3D(true);
      return;
    }

    // Caso B: Tiro Singolo Standard o Colpo Incrociato Coordinato
    const result = rollD10Pool(
      calculatedPool,
      8,
      attrLabel,
      selectedAbilityKey === 'none' ? undefined : abilityLabel,
      {
        againThreshold: effectiveAgainThreshold,
        willpowerSpent: spendWillpower,
        weaponBonusDice: useCombatWeapon ? singleAttackCalc.weaponBonus + fireModeBonusDice : undefined,
        targetDefensePenalty:
          useCombatWeapon
            ? singleAttackCalc.effectiveDefensePenalty + singleAttackCalc.effectiveArmorPenalty
            : undefined,
        isCombatAttack: useCombatWeapon,
        damageType: useCombatWeapon ? singleAttackCalc.damageType : undefined,
        weaponName: useCombatWeapon
          ? useDualWield
            ? `${currentWeapon.name} & ${secondaryWeapon.name}`
            : currentWeapon.name
          : undefined,
      }
    );

    if (targetEnemyObj) {
      result.targetEnemyId = targetEnemyObj.id;
      result.targetEnemyName = targetEnemyObj.name;
    }

    if (useCombatWeapon && useDualWield) {
      result.dualWieldMode = 'combined';
      result.secondaryWeaponName = secondaryWeapon.name;
    }

    setLastRoll(result);
    setSecondaryRoll(null);
    setPlayerNarration('');
    setIsRolling3D(true);
  };

  // Lancio Iniziativa
  const handleRollInitiative = () => {
    const charToRoll =
      character || ({ attributes: { dexterity: 2, composure: 2, wits: 2 }, health: [] } as any);
    const res = rollInitiative(charToRoll);
    setInitiativeResult(res);
    setIsRolling3D(true);
  };

  // Invio Azione / Attacco Unico al Narratore
  const handleSend = () => {
    if (lastRoll && onSendRollToStory) {
      let currentChar = character;

      // Se il giocatore ha speso 1 punto Volontà (+3 dadi), scalalo dalla scheda
      let willpowerNote = '';
      if (lastRoll.willpowerSpent && currentChar && onUpdateCharacter && currentChar.willpower.current > 0) {
        currentChar = {
          ...currentChar,
          willpower: {
            ...currentChar.willpower,
            current: Math.max(0, currentChar.willpower.current - 1),
          },
        };
        onUpdateCharacter(currentChar);
        willpowerNote = ' [Volontà Spesa: +3 Dadi]';
      }

      // Se è un'azione a distanza, consuma munizioni in base alla modalità di fuoco
      let ammoDetails = '';
      if (isRangedAction && currentChar && onUpdateCharacter) {
        const ammoAmount = fireMode === 'fullAuto' ? 'all' : fireMode === 'shortBurst' ? 3 : 1;
        const ammoRes = consumeAmmo(currentChar, ammoAmount);
        if (ammoRes.success) {
          currentChar = ammoRes.updatedChar;
          onUpdateCharacter(currentChar);
          const modeName =
            fireMode === 'fullAuto'
              ? 'Svuotato Caricatore'
              : fireMode === 'shortBurst'
              ? 'Raffica 3 colpi'
              : 'Colpo singolo';
          ammoDetails = ` [Munizioni: -${ammoRes.consumedCount} (${modeName}, Rimaste: ${ammoRes.remaining})]`;
        } else {
          ammoDetails = ` [Munizioni: ${ammoRes.message}]`;
        }
      }

      let modDetails = '';
      if (situationalMod !== 0 || healthPenalty !== 0) {
        const parts = [
          situationalMod !== 0 ? `Modificatore (${situationalMod > 0 ? '+' : ''}${situationalMod})` : '',
          healthPenalty !== 0 ? `Ferite (${healthPenalty})` : '',
        ].filter(Boolean);
        modDetails = ` [Mod: ${parts.join(', ')}]`;
      }

      let combatDetails = '';
      if (useCombatWeapon && lastRoll.weaponName) {
        if (lastRoll.dualWieldMode === 'flurry' && lastRoll.secondaryRoll) {
          const dmg1 = Math.max(0, lastRoll.netSuccesses);
          const dmg2 = Math.max(0, lastRoll.secondaryRoll.netSuccesses);
          const totalDmg = dmg1 + dmg2;
          const dmgType1 =
            lastRoll.damageType === 'aggravated'
              ? 'AGGRAVATI (*)'
              : lastRoll.damageType === 'lethal'
              ? 'LETALI (X)'
              : 'CONTUNDENTI (/)';
          const dmgType2 =
            lastRoll.secondaryRoll.damageType === 'aggravated'
              ? 'AGGRAVATI (*)'
              : lastRoll.secondaryRoll.damageType === 'lethal'
              ? 'LETALI (X)'
              : 'CONTUNDENTI (/)';

          combatDetails = `\n\n⚔️ DOPPIO ATTACCO A DUE MANI (${lastRoll.weaponName} & ${lastRoll.secondaryWeaponName}):\n• 1° Colpo [${lastRoll.weaponName}]: ${
            dmg1 > 0 ? `💥 ${dmg1} danni ${dmgType1}` : '🛡️ Mancato'
          } [Formula: ${primaryAttackCalc.formulaSummary}]\n• 2° Colpo [${lastRoll.secondaryWeaponName}]: ${
            dmg2 > 0 ? `💥 ${dmg2} danni ${dmgType2}` : '🛡️ Mancato'
          } [Formula: ${secondaryAttackCalc.formulaSummary} • ${isAmbidextrous ? '✨ Ambidestro: 0 malus' : '⚠️ Mano Debole: -2 dadi'}]\n• 💥 DANNI TOTALI COMBINATI: ${totalDmg} Punti Salute`;
        } else if (lastRoll.dualWieldMode === 'combined') {
          const dmgTypeLabel =
            lastRoll.damageType === 'aggravated'
              ? 'AGGRAVATI (*)'
              : lastRoll.damageType === 'lethal'
              ? 'LETALI (X)'
              : 'CONTUNDENTI (/)';
          const inflicted = Math.max(0, lastRoll.netSuccesses);
          combatDetails = `\n\n⚔️ COLPO INCROCIATO A DUE ARMI (${lastRoll.weaponName}):\n• Formula: ${singleAttackCalc.formulaSummary}\n• Stile: Colpo Coordinato (+Dadi Secondaria, ${isAmbidextrous ? '✨ Ambidestro: 0 malus' : '⚠️ Mano Debole: -2 dadi'})\n• Esito: ${
            inflicted > 0
              ? `💥 COLPITO! Inflitti direttamente ${inflicted} Punti Salute di danno ${dmgTypeLabel}`
              : '🛡️ Colpo mancato o deviato da Difesa/Armatura (0 danni).'
          }`;
        } else {
          const dmgTypeLabel =
            lastRoll.damageType === 'aggravated'
              ? 'AGGRAVATI (*)'
              : lastRoll.damageType === 'lethal'
              ? 'LETALI (X)'
              : 'CONTUNDENTI (/)';
          const inflicted = Math.max(0, lastRoll.netSuccesses);
          combatDetails = `\n\n⚔️ ATTACCO TIRO UNICO (${lastRoll.weaponName}):\n• Formula: ${singleAttackCalc.formulaSummary}\n• Esito: ${
            inflicted > 0
              ? `💥 COLPITO! Inflitti direttamente ${inflicted} Punti Salute di danno ${dmgTypeLabel}`
              : '🛡️ Colpo mancato o deviato da Difesa/Armatura (0 danni).'
          }`;
        }
      }

      const commentText = actionComment.trim()
        ? `${actionComment.trim()}${willpowerNote}${modDetails}${ammoDetails}`
        : `Tiro di ${attrLabel} + ${abilityLabel}${willpowerNote}${modDetails}${ammoDetails}`;

      const fullComment = (commentText + combatDetails).trim();
      onSendRollToStory(lastRoll, fullComment, playerNarration.trim() || undefined);
      onClose();
    }
  };

  // Invio Iniziativa al Narratore (Se richiesta dal narratore)
  const handleSendInitiativeToStory = () => {
    if (!initiativeResult || !onSendRollToStory) return;

    const initDiceRoll: DiceRollResult = {
      pool: 1,
      difficulty: 8,
      dice: [initiativeResult.d10Roll],
      rawSuccesses: initiativeResult.total,
      ones: 0,
      netSuccesses: initiativeResult.total,
      outcome: 'success',
      timestamp: Date.now(),
      attributeName: 'Iniziativa',
    };

    onSendRollToStory(
      initDiceRoll,
      `⚡ INIZIATIVA COMBATTIMENTO: ${initiativeResult.total} [${initiativeResult.formula}]`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl shadow-indigo-950/80 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Pulito */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 px-4 sm:px-5 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5 text-indigo-400">
            {isInitiativeMode ? (
              <Zap className="w-6 h-6 text-amber-400" />
            ) : (
              <Dices className="w-6 h-6 text-indigo-400" />
            )}
            <div>
              <h3 className="font-serif font-bold text-sm sm:text-base tracking-wider uppercase text-slate-100 flex items-center gap-2">
                <span>{isInitiativeMode ? "Tiro d'Iniziativa" : 'Lancio Dadi d10'}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 border border-indigo-700 text-amber-300 font-bold">
                  {isInitiativeMode ? 'Combattimento' : 'Soglia 8+ • 10-Again'}
                </span>
              </h3>
              <p className="text-[11px] font-mono text-indigo-300">
                {isInitiativeMode
                  ? 'Fase Iniziale dello Scontro • Ordine dei Turni'
                  : 'Chronica D10 Engine • Combattimento a Riserva di Dadi'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* CORPO DELLA MODALE                                       */}
        {/* ======================================================== */}
        <div className="p-3 sm:p-5 space-y-3.5 overflow-y-auto">
          {/* CASO 1: TIRO INIZIATIVA RICHIESTO DAL NARRATORE */}
          {isInitiativeMode ? (
            <div className="space-y-4">
              <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center space-x-2 text-amber-400 font-mono font-bold text-xs uppercase tracking-wider">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Il Narratore ha dichiarato l'Inizio dello Scontro!</span>
                </div>
                <p className="text-xs text-slate-300 font-serif leading-relaxed">
                  Lancia 1d10 per determinare il tuo punteggio d'Iniziativa al tavolo:
                  <br />
                  <strong className="text-amber-300">
                    Destrezza ({character?.attributes?.dexterity || 2}) + Autocontrollo ({character?.attributes?.composure || 2}) + 1d10
                    {healthPenalty !== 0 ? ` (Penalità Ferite ${healthPenalty})` : ''}
                  </strong>
                </p>

                {/* Tratti Usati */}
                <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2">
                    <span className="text-[10px] text-slate-400 block uppercase">Destrezza</span>
                    <span className="text-base font-bold text-slate-100">
                      {character?.attributes?.dexterity || 2}
                    </span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2">
                    <span className="text-[10px] text-slate-400 block uppercase">Autocontrollo</span>
                    <span className="text-base font-bold text-slate-100">
                      {character?.attributes?.composure || character?.attributes?.wits || 2}
                    </span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2">
                    <span className="text-[10px] text-slate-400 block uppercase">Ferite</span>
                    <span
                      className={`text-base font-bold ${
                        healthPenalty !== 0 ? 'text-red-400' : 'text-slate-400'
                      }`}
                    >
                      {healthPenalty}
                    </span>
                  </div>
                </div>

                {/* Pulsante Lancia Iniziativa */}
                <button
                  type="button"
                  onClick={handleRollInitiative}
                  className="w-full py-3 px-4 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 hover:from-amber-600 hover:to-amber-700 text-white font-serif font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-amber-200" />
                  <span>🎲 Lancia la Tua Iniziativa</span>
                </button>
              </div>

              {/* Risultato Iniziativa */}
              {initiativeResult && (
                <div className="bg-slate-950 border border-amber-600/80 rounded-2xl p-4 space-y-3 animate-fadeIn">
                  {/* Animazione Dado Iniziativa 3D */}
                  {isRolling3D && (
                    <div className="mb-2">
                      <Dice3DStage
                        diceValues={[initiativeResult.d10Roll]}
                        onComplete={() => setIsRolling3D(false)}
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase">
                      Punteggio Iniziativa:
                    </span>
                    <span className="text-2xl font-mono font-bold text-amber-400 px-3 py-1 bg-amber-950/80 border border-amber-600 rounded-xl">
                      ⚡ {initiativeResult.total}
                    </span>
                  </div>

                  <div className="text-xs font-mono text-slate-300">
                    <div className="text-indigo-300 font-bold">Formula:</div>
                    <div className="p-2 bg-slate-900 rounded-lg text-slate-200 mt-1">
                      {initiativeResult.formula}
                    </div>
                  </div>

                  {onSendRollToStory && (
                    <button
                      type="button"
                      onClick={handleSendInitiativeToStory}
                      className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-600 text-white font-serif font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Comunica Iniziativa ({initiativeResult.total}) al Tavolo</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* CASO 2: NORMALE TIRO DI AZIONE O COMBATTIMENTO A TIRO UNICO */
            <>
              {/* Motivo del tiro / Azione dichiarata */}
              {actionComment && (
                <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-xl p-3 text-xs sm:text-sm text-indigo-200 font-serif italic flex items-start gap-2">
                  <span className="text-base shrink-0">🎯</span>
                  <div>
                    <strong>Azione Dichiarata:</strong> {actionComment}
                  </div>
                </div>
              )}

              {/* SELEZIONE TRATTI DELLA SCHEDA */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Selezione Attributo */}
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-slate-400 font-mono font-bold block mb-1">
                      1. Attributo
                    </label>
                    <select
                      value={selectedAttrKey}
                      onChange={(e) => setSelectedAttrKey(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      {Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => {
                        const val = character ? (character.attributes as any)[key] || 1 : 2;
                        return (
                          <option key={key} value={key}>
                            {label} ({val} {val === 1 ? 'dado' : 'dadi'})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Selezione Abilità */}
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-slate-400 font-mono font-bold block mb-1">
                      2. Abilità
                    </label>
                    <select
                      value={selectedAbilityKey}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedAbilityKey(val);
                        if (['firearms', 'weaponry', 'brawl'].includes(val)) {
                          setUseCombatWeapon(true);
                          const bestWep = resolveBestWeaponForAction(actionComment, val);
                          if (bestWep) setSelectedWeaponId(bestWep.id);
                        } else {
                          setUseCombatWeapon(false);
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      <option value="none">-- Nessuna / Solo Attributo (0 dadi) --</option>
                      {Object.entries(ABILITY_LABELS).map(([key, label]) => {
                        const val = character ? (character.abilities as any)[key] || 0 : 0;
                        return (
                          <option key={key} value={key}>
                            {label} ({val} {val === 1 ? 'dado' : 'dadi'})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* SEZIONE COMBATTIMENTO A TIRO UNICO (ARMA + DIFESA/ARMATURA BERSAGLIO) */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-mono font-bold text-red-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCombatWeapon}
                      onChange={(e) => setUseCombatWeapon(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-red-600 focus:ring-red-500"
                    />
                    <Swords className="w-3.5 h-3.5 text-red-400" />
                    <span>⚔️ Tiro d'Attacco Combattimento (Arma, Difesa & Armatura)</span>
                  </label>

                  {useCombatWeapon && (
                    <div className="bg-slate-900/95 border border-red-900/50 rounded-xl p-3 space-y-2.5">
                      <div>
                        <label className="text-[11px] font-mono text-slate-300 font-bold block mb-1">
                          Arma Impugnata (+ Dadi Danno):
                        </label>
                        <select
                          value={currentWeapon.id}
                          onChange={(e) => {
                            setSelectedWeaponId(e.target.value);
                            setCustomAgainThreshold(null);
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-red-500"
                        >
                          {availableWeapons.map((w) => {
                            const isOwned = inventoryWeapons.some((iw) => iw.id === w.id);
                            const dmgChar =
                              w.damageType === 'aggravated'
                                ? '*'
                                : w.damageType === 'lethal'
                                ? 'L'
                                : 'C';
                            return (
                              <option key={w.id} value={w.id}>
                                {isOwned ? '🎒 [Inventario] ' : ''}
                                {w.name} (+{w.baseDamage} Dadi [{dmgChar}]
                                {w.againThreshold === 9 ? ' • 9-Again' : ''}
                                {w.armorPiercing ? ` • Perf. ${w.armorPiercing}` : ''})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Modalità di Fuoco per Armi da Fuoco / a Distanza */}
                      {isRangedAction && (
                        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
                          <div className="text-[11px] font-mono text-slate-300 font-bold uppercase flex items-center justify-between">
                            <span className="flex items-center space-x-1.5">
                              <span>🎯 Modalità di Fuoco:</span>
                              {ammoStatus && (
                                <span className={`font-mono text-[11px] ${ammoStatus.totalAmmo === 0 ? 'text-red-400 font-bold' : 'text-amber-400'}`}>
                                  ({ammoStatus.totalAmmo} colpi rimasti)
                                </span>
                              )}
                            </span>
                            {fireMode === 'fullAuto' ? (
                              <span className="text-red-400 font-bold text-xs">+3 Dadi (Svuota Tutto)</span>
                            ) : fireMode === 'shortBurst' ? (
                              <span className="text-amber-400 font-bold text-xs">+1 Dado (Raffica 3)</span>
                            ) : (
                              <span className="text-slate-400 text-xs">Colpo Singolo (-1)</span>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                            <button
                              type="button"
                              onClick={() => setFireMode('single')}
                              className={`py-1.5 px-2 rounded-lg text-xs font-serif font-bold transition-all border cursor-pointer ${
                                fireMode === 'single'
                                  ? 'bg-indigo-600 text-white border-indigo-400 shadow'
                                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              Colpo Singolo
                            </button>
                            <button
                              type="button"
                              onClick={() => setFireMode('shortBurst')}
                              className={`py-1.5 px-2 rounded-lg text-xs font-serif font-bold transition-all border cursor-pointer ${
                                fireMode === 'shortBurst'
                                  ? 'bg-amber-600 text-white border-amber-400 shadow'
                                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              Raffica (+1 D)
                            </button>
                            <button
                              type="button"
                              onClick={() => setFireMode('fullAuto')}
                              className={`py-1.5 px-2 rounded-lg text-xs font-serif font-bold transition-all border cursor-pointer ${
                                fireMode === 'fullAuto'
                                  ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white border-red-400 shadow'
                                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              Svuota Tutto (+3 D)
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Combattimento con Due Armi (Dual Wielding / Akimbo) */}
                      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-xs font-mono font-bold text-amber-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={useDualWield}
                              onChange={(e) => setUseDualWield(e.target.checked)}
                              className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
                            />
                            <span>⚔️ Combatti con Due Armi (Dual Wielding / Akimbo)</span>
                          </label>
                          {useDualWield && isAmbidextrous && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 font-bold">
                              ✨ Ambidestro (+0 Malus)
                            </span>
                          )}
                          {useDualWield && !isAmbidextrous && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 border border-amber-600 text-amber-300 font-bold">
                              ⚠️ Mano Debole (-2 Dadi)
                            </span>
                          )}
                        </div>

                        {useDualWield && (
                          <div className="space-y-2.5 pt-1.5 border-t border-slate-800/80">
                            {/* Selezione Arma Secondaria */}
                            <div>
                              <label className="text-[11px] font-mono text-slate-300 font-bold block mb-1">
                                Arma Secondaria (Mano Sinistra / Secondaria):
                              </label>
                              <select
                                value={selectedSecondaryWeaponId}
                                onChange={(e) => setSelectedSecondaryWeaponId(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                              >
                                <option value="twin">
                                  ⚔️ {currentWeapon.name} Gemella (Seconda Arma Identica)
                                </option>
                                {availableWeapons
                                  .filter((w) => !w.twoHanded)
                                  .map((w) => {
                                    const isOwned = inventoryWeapons.some((iw) => iw.id === w.id);
                                    const dmgChar =
                                      w.damageType === 'aggravated'
                                        ? '*'
                                        : w.damageType === 'lethal'
                                        ? 'L'
                                        : 'C';
                                    return (
                                      <option key={`sec_${w.id}`} value={w.id}>
                                        {isOwned ? '🎒 [Inventario] ' : ''}
                                        {w.name} (+{w.baseDamage} Dadi [{dmgChar}])
                                      </option>
                                    );
                                  })}
                              </select>
                            </div>

                            {/* Scelta Stile di Combattimento WoD */}
                            <div className="space-y-1">
                              <label className="text-[11px] font-mono text-slate-300 font-bold block">
                                Scegli lo Stile di Combattimento a Due Armi:
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setDualWieldMode('combined')}
                                  className={`p-2 rounded-xl border text-left font-mono transition-all cursor-pointer ${
                                    dualWieldMode === 'combined'
                                      ? 'bg-amber-950/80 border-amber-500 text-amber-100 shadow-md ring-1 ring-amber-500/50'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  <div className="text-xs font-bold flex items-center justify-between">
                                    <span>Colpo Incrociato</span>
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-900/60 text-amber-300">
                                      Tiro Singolo
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                                    Attacco combinato: +{Math.max(1, Math.min(secondaryWeapon.baseDamage, 2))} dadi bonus danni.
                                    {isAmbidextrous ? ' ✨ Ambidestro: 0 malus.' : ' ⚠️ -2 dadi mano debole.'}
                                  </div>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setDualWieldMode('flurry')}
                                  className={`p-2 rounded-xl border text-left font-mono transition-all cursor-pointer ${
                                    dualWieldMode === 'flurry'
                                      ? 'bg-indigo-950/80 border-indigo-500 text-indigo-100 shadow-md ring-1 ring-indigo-500/50'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  <div className="text-xs font-bold flex items-center justify-between">
                                    <span>Doppio Attacco</span>
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-300">
                                      2 Tiri Separati
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                                    Due tiri in sequenza: 1° con {currentWeapon.name}, 2° con {secondaryWeapon.name}
                                    {isAmbidextrous ? ' (✨ 0 malus).' : ' (⚠️ -2 dadi al 2° tiro).'}
                                  </div>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Selettore Bersaglio Nemico Attivo (se presenti) */}
                      {activeEnemies.length > 0 && (
                        <div>
                          <label className="text-[11px] font-mono text-amber-300 font-bold block mb-1">
                            🎯 Nemico Bersaglio (Sottrae Difesa/Armatura in automatico):
                          </label>
                          <select
                            value={selectedTargetEnemyId}
                            onChange={(e) => {
                              const eid = e.target.value;
                              setSelectedTargetEnemyId(eid);
                              const found = activeEnemies.find((en) => en.id === eid);
                              if (found) {
                                setTargetDefense(found.defense);
                                setTargetArmor(found.armor);
                              }
                            }}
                            className="w-full bg-slate-950 border border-amber-700/70 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 font-mono font-bold"
                          >
                            <option value="">-- Bersaglio Generico / Manuale --</option>
                            {activeEnemies.map((en) => {
                              const rem = en.health.filter((h) => h.damage === 'none').length;
                              return (
                                <option key={en.id} value={en.id}>
                                  💀 {en.name} — Salute {rem}/{en.maxHealth} | Difesa {en.defense} | Armatura {en.armor}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}

                      {/* Difesa e Armatura del Bersaglio (Modificabili) */}
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 flex items-center justify-between">
                          <span className="text-slate-300 font-bold">Difesa</span>
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => setTargetDefense(Math.max(0, targetDefense - 1))}
                              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <span className="text-red-400 font-bold min-w-5 text-center">
                              -{targetDefense}
                            </span>
                            <button
                              type="button"
                              onClick={() => setTargetDefense(Math.min(10, targetDefense + 1))}
                              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 flex items-center justify-between">
                          <span className="text-slate-300 font-bold">Armatura</span>
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => setTargetArmor(Math.max(0, targetArmor - 1))}
                              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <span className="text-red-400 font-bold min-w-5 text-center">
                              -{singleAttackCalc.effectiveArmorPenalty}
                            </span>
                            <button
                              type="button"
                              onClick={() => setTargetArmor(Math.min(10, targetArmor + 1))}
                              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* MODIFICATORE SITUAZIONALE RAPIDO (+/- DADI) & SPESA VOLONTA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {/* Spesa Volontà */}
                  <button
                    type="button"
                    disabled={!canSpendWillpower && !spendWillpower}
                    onClick={() => setSpendWillpower(!spendWillpower)}
                    className={`p-2.5 rounded-xl border text-left font-mono text-xs transition-all flex items-center justify-between ${
                      spendWillpower
                        ? 'bg-amber-950/80 border-amber-500 text-amber-200 shadow-md'
                        : canSpendWillpower
                        ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 cursor-pointer'
                        : 'bg-slate-950 border-slate-900 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Flame className={`w-4 h-4 ${spendWillpower ? 'text-amber-400' : 'text-slate-500'}`} />
                      <div>
                        <div className="font-bold">Spendi 1 Volontà (+3)</div>
                        <div className="text-[10px] opacity-80">
                          {character?.willpower?.current ?? 0}/{character?.willpower?.max ?? 5} rimaste
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        spendWillpower ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {spendWillpower ? 'ATTIVO' : '+3 Dadi'}
                    </span>
                  </button>

                  {/* Modificatore Situazione Rapido (+/- Dadi) */}
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="text-slate-300 font-bold block">Mod. Circostanza</span>
                      <span className="text-[10px] text-slate-400">Bonus / Malus</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setSituationalMod(Math.max(-5, situationalMod - 1))}
                        className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
                      >
                        -
                      </button>
                      <span
                        className={`text-xs font-bold min-w-6 text-center ${
                          situationalMod > 0
                            ? 'text-emerald-400'
                            : situationalMod < 0
                            ? 'text-red-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {situationalMod > 0 ? `+${situationalMod}` : situationalMod}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSituationalMod(Math.min(5, situationalMod + 1))}
                        className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Formula Riserva Storytelling System */}
                <div className="bg-slate-900/90 border border-indigo-800/60 rounded-xl p-3 space-y-2 text-xs font-mono">
                  {useCombatWeapon && useDualWield && dualWieldMode === 'flurry' ? (
                    <>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-indigo-300 font-bold">
                          <span>1° Attacco — Mano Principale ({currentWeapon.name}):</span>
                          <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-600 text-white font-bold">
                            {primaryAttackCalc.finalPool <= 0
                              ? 'Chance Die'
                              : `${primaryAttackCalc.finalPool} Dadi d10`}
                          </span>
                        </div>
                        <div className="text-slate-300 text-xs break-words">
                          {primaryAttackCalc.formulaSummary}
                        </div>
                      </div>

                      <div className="space-y-1 pt-2 border-t border-slate-800">
                        <div className="flex items-center justify-between text-amber-300 font-bold">
                          <span>2° Attacco — Mano Secondaria ({secondaryWeapon.name}):</span>
                          <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-600 text-amber-200 font-bold">
                            {secondaryAttackCalc.finalPool <= 0
                              ? 'Chance Die'
                              : `${secondaryAttackCalc.finalPool} Dadi d10`}
                          </span>
                        </div>
                        <div className="text-slate-300 text-xs break-words">
                          {secondaryAttackCalc.formulaSummary}{' '}
                          {isAmbidextrous ? (
                            <span className="text-emerald-400 font-bold">(✨ Ambidestro: 0 malus)</span>
                          ) : (
                            <span className="text-amber-400 font-bold">(⚠️ Mano Debole: -2 dadi)</span>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Formula Riserva D10:</span>
                        {calculatedPool <= 0 ? (
                          <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-600 text-amber-300 font-bold">
                            🎲 Tiro di Fortuna (Chance Die)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-600 text-white font-bold">
                            {calculatedPool} Dadi d10 (Soglia 8+)
                          </span>
                        )}
                      </div>
                      <div className="text-indigo-200 font-bold text-xs sm:text-sm break-words">
                        {singleAttackCalc.formulaSummary}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* PULSANTONE DI LANCIO */}
              {!lastRoll && (
                <button
                  type="button"
                  onClick={handleRoll}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 hover:from-indigo-600 hover:to-indigo-700 text-white font-serif font-black uppercase text-sm sm:text-base rounded-xl shadow-xl shadow-indigo-950/70 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Dices className="w-5 h-5 text-amber-300" />
                  <span>
                    {useCombatWeapon && useDualWield && dualWieldMode === 'flurry'
                      ? `LANCIA DOPPIO ATTACCO (1°: ${
                          primaryAttackCalc.finalPool > 0 ? primaryAttackCalc.finalPool : 1
                        }D • 2°: ${secondaryAttackCalc.finalPool > 0 ? secondaryAttackCalc.finalPool : 1}D)`
                      : calculatedPool <= 0
                      ? 'LANCIA TIRO DI FORTUNA (1 DADO • SOLO IL 10 VINCE)'
                      : `LANCIA ${calculatedPool} DADI D10 (SOGLIA 8+ • 10-AGAIN)`}
                  </span>
                </button>
              )}

              {/* RISULTATO DEL TIRO */}
              {lastRoll && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3.5 animate-fadeIn">
                  {/* Palcoscenico Dadi 3D & Vibrazione Haptic */}
                  {isRolling3D && (
                    <div className="mb-2">
                      <Dice3DStage
                        diceValues={
                          secondaryRoll
                            ? [...lastRoll.dice, ...secondaryRoll.dice]
                            : lastRoll.dice
                        }
                        explodedCount={
                          (lastRoll.explodedDice?.length || 0) +
                          (secondaryRoll?.explodedDice?.length || 0)
                        }
                        isChanceDie={lastRoll.isChanceDie}
                        onComplete={() => setIsRolling3D(false)}
                      />
                    </div>
                  )}
                  {secondaryRoll ? (
                    /* CASO A: RISULTATO DOPPIO ATTACCO A DUE MANI (FLURRY) */
                    <div className="space-y-3">
                      {/* 1° Colpo: Mano Principale */}
                      <div className="p-3 rounded-xl bg-slate-900/90 border border-indigo-700/60 space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <span className="text-xs font-mono font-bold text-indigo-300 flex items-center gap-1.5">
                            <Swords className="w-4 h-4 text-indigo-400" />
                            <span>1° Attacco — Mano Principale ({lastRoll.weaponName}):</span>
                          </span>
                          <span
                            className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                              lastRoll.netSuccesses >= 1
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {lastRoll.netSuccesses >= 1
                              ? `💥 ${lastRoll.netSuccesses} SUCCESSI (${lastRoll.netSuccesses} Danni)`
                              : '🛡️ MANCATO (0)'}
                          </span>
                        </div>
                        {/* Dadi Primari */}
                        <div className="flex gap-1.5 flex-wrap justify-center py-1">
                          {lastRoll.dice.map((d, i) => {
                            const isSuccess = lastRoll.isChanceDie ? d === 10 : d >= 8;
                            const isExploded = i >= Math.max(1, lastRoll.pool);
                            return (
                              <div
                                key={`d1_${i}`}
                                className={`relative w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono ${
                                  isSuccess
                                    ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                                    : 'bg-slate-950 border border-slate-800 text-slate-400'
                                }`}
                              >
                                {d}
                                {isExploded && (
                                  <span className="absolute -top-1 -right-1 text-[8px] bg-amber-500 text-slate-950 font-black px-0.5 rounded-full">
                                    💥
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2° Colpo: Mano Secondaria */}
                      <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-700/60 space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5">
                            <Swords className="w-4 h-4 text-amber-400" />
                            <span>2° Attacco — Mano Secondaria ({secondaryRoll.weaponName}):</span>
                          </span>
                          <span
                            className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                              secondaryRoll.netSuccesses >= 1
                                ? 'bg-amber-950 text-amber-300 border border-amber-600'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {secondaryRoll.netSuccesses >= 1
                              ? `💥 ${secondaryRoll.netSuccesses} SUCCESSI (${secondaryRoll.netSuccesses} Danni)`
                              : '🛡️ MANCATO (0)'}
                          </span>
                        </div>
                        {/* Dadi Secondari */}
                        <div className="flex gap-1.5 flex-wrap justify-center py-1">
                          {secondaryRoll.dice.map((d, i) => {
                            const isSuccess = secondaryRoll.isChanceDie ? d === 10 : d >= 8;
                            const isExploded = i >= Math.max(1, secondaryRoll.pool);
                            return (
                              <div
                                key={`d2_${i}`}
                                className={`relative w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono ${
                                  isSuccess
                                    ? 'bg-amber-950 border border-amber-500 text-amber-300'
                                    : 'bg-slate-950 border border-slate-800 text-slate-400'
                                }`}
                              >
                                {d}
                                {isExploded && (
                                  <span className="absolute -top-1 -right-1 text-[8px] bg-amber-500 text-slate-950 font-black px-0.5 rounded-full">
                                    💥
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Banner Totale Danni Combinati */}
                      <div className="p-3 rounded-xl bg-gradient-to-r from-red-950 via-rose-950 to-red-950 border border-red-500/80 flex items-center justify-between">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-200 flex items-center gap-1.5">
                          <span>💥 DANNI TOTALI COMBINATI A DUE MANI:</span>
                        </span>
                        <span className="text-sm font-mono font-black text-white px-3 py-1 bg-red-900 border border-red-400 rounded-lg shadow-md">
                          {Math.max(0, lastRoll.netSuccesses) + Math.max(0, secondaryRoll.netSuccesses)} PUNTI SALUTE
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* CASO B: TIRO SINGOLO STANDARD O COLPO INCROCIATO */
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                        <span className="text-xs text-slate-400 uppercase tracking-wider font-mono font-bold">
                          {lastRoll.dualWieldMode === 'combined'
                            ? 'Esito Colpo Incrociato:'
                            : 'Esito del Lancio:'}
                        </span>
                        <span
                          className={`text-xs sm:text-sm px-3 py-1 rounded-lg font-bold font-mono flex items-center space-x-1.5 ${
                            lastRoll.outcome === 'botch'
                              ? 'bg-red-950 border border-red-700 text-red-300'
                              : lastRoll.outcome === 'failure'
                              ? 'bg-slate-800 text-slate-300'
                              : lastRoll.outcome === 'exceptional'
                              ? 'bg-amber-950 border border-amber-600 text-amber-300'
                              : 'bg-emerald-950 border border-emerald-700 text-emerald-300'
                          }`}
                        >
                          {lastRoll.outcome === 'botch' && (
                            <>
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                              <span>FALLIMENTO DRAMMATICO (1 SU FORTUNA)</span>
                            </>
                          )}
                          {lastRoll.outcome === 'failure' && <span>FALLIMENTO (0 SUCCESSI)</span>}
                          {lastRoll.outcome === 'success' && (
                            <>
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                              <span>SUCCESSO ({lastRoll.netSuccesses})</span>
                            </>
                          )}
                          {lastRoll.outcome === 'exceptional' && (
                            <>
                              <Sparkles className="w-4 h-4 text-amber-400" />
                              <span>SUCCESSO ECCEZIONALE ({lastRoll.netSuccesses} SUCCESSI!)</span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Dadi d10 usciti */}
                      <div className="space-y-1.5">
                        <div className="flex gap-2 flex-wrap justify-center py-1">
                          {lastRoll.dice.map((d, i) => {
                            const baseCount = Math.max(1, lastRoll.pool);
                            const isExploded = i >= baseCount;
                            const isSuccess = lastRoll.isChanceDie ? d === 10 : d >= 8;
                            const isDramaticOne = lastRoll.isChanceDie && d === 1 && i === 0;

                            return (
                              <div
                                key={i}
                                className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-sm sm:text-base font-mono ${
                                  isDramaticOne
                                    ? 'bg-red-950 border-2 border-red-500 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.8)]'
                                    : isSuccess && isExploded
                                    ? 'bg-amber-950 border-2 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.7)]'
                                    : isSuccess
                                    ? 'bg-emerald-950 border-2 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.6)]'
                                    : isExploded
                                    ? 'bg-indigo-950 border border-indigo-500 text-indigo-300'
                                    : 'bg-slate-900 border border-slate-800 text-slate-400'
                                }`}
                              >
                                {d}
                                {isExploded && (
                                  <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-amber-500 text-slate-950 font-black px-1 rounded-full">
                                    💥
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {lastRoll.explodedDice && lastRoll.explodedDice.length > 0 && (
                          <div className="text-center text-[11px] font-mono text-amber-300">
                            💥 Rilancio 10-Again: +{lastRoll.explodedDice.length}{' '}
                            {lastRoll.explodedDice.length === 1 ? 'dado extra' : 'dadi extra'} [
                            {lastRoll.explodedDice.join(', ')}]!
                          </div>
                        )}
                      </div>

                      {/* ESITO ATTACCO COMBATTIMENTO */}
                      {useCombatWeapon && (
                        <div
                          className={`p-3 rounded-xl border space-y-1 ${
                            lastRoll.netSuccesses >= 1
                              ? 'bg-red-950/60 border-red-500/80'
                              : 'bg-slate-900 border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-300 flex items-center gap-1.5">
                              <Swords className="w-4 h-4 text-red-400" />
                              <span>
                                {lastRoll.dualWieldMode === 'combined'
                                  ? `Esito Colpo Incrociato (${lastRoll.weaponName}):`
                                  : `Esito Attacco (${lastRoll.weaponName || currentWeapon.name}):`}
                              </span>
                            </span>
                            <span
                              className={`text-xs sm:text-sm font-mono font-bold px-2 py-0.5 rounded border ${
                                lastRoll.netSuccesses >= 1
                                  ? 'bg-red-900 text-white border-red-400'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {lastRoll.netSuccesses >= 1
                                ? `💥 ${lastRoll.netSuccesses} DANNI INFLITTI`
                                : '0 Danni (Mancato)'}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Narrazione facoltativa del giocatore (Tastiera o Microfono) */}
                  {successRuling && successRuling.allowPlayerNarration && (
                    <div className="bg-indigo-950/30 border border-indigo-800/50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-mono font-bold text-indigo-300 flex items-center gap-1.5">
                          <Feather className="w-3.5 h-3.5 text-indigo-400" />
                          <span>✍️ Narra la tua azione (Facoltativo):</span>
                        </label>
                        {isSpeechSupported && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {isListening ? '🎙️ In ascolto...' : 'Tastiera o Microfono'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={playerNarration}
                          onChange={(e) => setPlayerNarration(e.target.value)}
                          placeholder={isListening ? '🎙️ Parla pure, sto trascrivendo...' : 'Es: "Colpisco con precisione mentre mi getto al riparo..."'}
                          className={`flex-1 bg-slate-900 border rounded-lg p-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-all ${
                            isListening
                              ? 'border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)] bg-slate-900/95 ring-1 ring-rose-500'
                              : 'border-slate-700 focus:border-indigo-500'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={toggleListening}
                          title={
                            !isSpeechSupported
                              ? 'Riconoscimento vocale non supportato da questo browser'
                              : isListening
                              ? 'Interrompi registrazione vocale'
                              : 'Detta a voce la narrazione dell\'azione'
                          }
                          className={`p-2 rounded-lg transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                            isListening
                              ? 'bg-rose-600 text-white animate-pulse shadow-md border border-rose-400'
                              : 'bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-indigo-500'
                          }`}
                        >
                          {isListening ? (
                            <MicOff className="w-4 h-4 text-white animate-bounce" />
                          ) : (
                            <Mic className="w-4 h-4 text-indigo-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tasti Azione: Invia o Ritira */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleRoll}
                      className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-serif font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Ritira
                    </button>
                    {onSendRollToStory && (
                      <button
                        type="button"
                        onClick={handleSend}
                        className="flex-1 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-600 text-white font-serif font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Invia Risultato al Narratore</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
