import type { Character, InventoryItem, ItemCategory } from '../types';
import { healDamageFromHealth } from './wodCombatRules';

export const ITEM_CATEGORIES: { id: ItemCategory; label: string; icon: string; description: string }[] = [
  { id: 'weapon', label: 'Armi', icon: '🗡️', description: 'Armi bianche, pistole, fucili, archi e pugnali.' },
  { id: 'ammo', label: 'Munizioni', icon: '🏹', description: 'Proiettili, frecce, caricatori e dardi.' },
  { id: 'consumable', label: 'Consumabili', icon: '🧪', description: 'Bende mediche, pozioni, fiale e antidoti.' },
  { id: 'gear', label: 'Attrezzatura', icon: '🎒', description: 'Grimaldelli, torce, corde e oggetti narrativi.' },
];

/**
 * Riconosce automaticamente la categoria e la quantità da una stringa grezza di inventario.
 */
export function parseRawItem(raw: string, index: number): InventoryItem {
  const clean = raw.trim();
  const id = `item_${Date.now()}_${index}`;
  const lower = clean.toLowerCase();

  // Cerca un moltiplicatore numerico (es. "10x Frecce", "Frecce (10)", "15 proiettili 9mm")
  let quantity = 1;
  let name = clean;

  const qtyMatch = clean.match(/^(\d+)[xX\s]+(.+)$/) || clean.match(/^(.+)\s*[\(\[](\d+)[xX]?[\)\]]$/);
  if (qtyMatch) {
    if (!isNaN(parseInt(qtyMatch[1], 10))) {
      quantity = parseInt(qtyMatch[1], 10);
      name = qtyMatch[2].trim();
    } else if (!isNaN(parseInt(qtyMatch[2], 10))) {
      name = qtyMatch[1].trim();
      quantity = parseInt(qtyMatch[2], 10);
    }
  }

  // Riconoscimento Categoria
  let category: ItemCategory = 'gear';
  let isEquipped = false;

  if (
    lower.includes('frecci') ||
    lower.includes('proiettil') ||
    lower.includes('colpi') ||
    lower.includes('caricator') ||
    lower.includes('dardo') ||
    lower.includes('dardi') ||
    lower.includes('munizion') ||
    lower.includes('cartucc')
  ) {
    category = 'ammo';
  } else if (
    lower.includes('spada') ||
    lower.includes('pistola') ||
    lower.includes('fucile') ||
    lower.includes('pugnale') ||
    lower.includes('arco') ||
    lower.includes('balestra') ||
    lower.includes('lama') ||
    lower.includes('coltello') ||
    lower.includes('ascia') ||
    lower.includes('martello') ||
    lower.includes('mazza') ||
    lower.includes('revolver') ||
    lower.includes('arma')
  ) {
    category = 'weapon';
    isEquipped = true;
  } else if (
    lower.includes('pozion') ||
    lower.includes('benda') ||
    lower.includes('medikit') ||
    lower.includes('pronto soccorso') ||
    lower.includes('fiala') ||
    lower.includes('antidoto') ||
    lower.includes('elisir') ||
    lower.includes('erba') ||
    lower.includes('cibo') ||
    lower.includes('razione')
  ) {
    category = 'consumable';
  }

  return {
    id,
    name,
    category,
    quantity,
    isEquipped: category === 'weapon' ? isEquipped : undefined,
  };
}

/**
 * Restituisce l'inventario strutturato del personaggio, migrando da string[] se necessario.
 */
export function getCharacterInventory(char: Character): InventoryItem[] {
  if (char.structuredInventory && Array.isArray(char.structuredInventory) && char.structuredInventory.length > 0) {
    return char.structuredInventory;
  }

  if (char.inventory && Array.isArray(char.inventory) && char.inventory.length > 0) {
    return char.inventory.map((item, idx) => parseRawItem(String(item), idx));
  }

  // Starter pack di base se vuoto
  return [
    { id: 'start_wep', name: 'Arma Personale d\'Ordinanza', category: 'weapon', quantity: 1, isEquipped: true },
    { id: 'start_ammo', name: 'Proiettili / Frecce Standard', category: 'ammo', quantity: 12, maxQuantity: 30 },
    { id: 'start_med', name: 'Bende Mediche di Emergenza', category: 'consumable', quantity: 2, damageOrEffect: 'Cura 1 livello di salute' },
    { id: 'start_gear', name: 'Equipaggiamento da Viaggio', category: 'gear', quantity: 1 },
  ];
}

/**
 * Aggiorna sia la lista strutturata sia l'array legacy di stringhe per retrocompatibilità.
 */
export function updateCharacterInventory(char: Character, items: InventoryItem[]): Character {
  const legacyStrings = items.map((i) => (i.quantity > 1 ? `${i.quantity}x ${i.name}` : i.name));
  return {
    ...char,
    structuredInventory: items,
    inventory: legacyStrings,
  };
}

/**
 * Trova l'indice della munizione compatibile con l'arma utilizzata.
 */
export function findMatchingAmmoItem(items: InventoryItem[], weaponNameOrCategory?: string): number {
  const weapon = (weaponNameOrCategory || '').toLowerCase();

  // 1. Corrispondenza per Archi e Balestre
  if (weapon.includes('arco') || weapon.includes('balestra') || weapon.includes('bow') || weapon.includes('crossbow')) {
    const arrowIdx = items.findIndex(
      (i) => i.category === 'ammo' && i.quantity > 0 && (/frecci|dardo|faretra/i.test(i.name))
    );
    if (arrowIdx !== -1) return arrowIdx;
  }

  // 2. Corrispondenza per Armi da Fuoco (Revolver, Pistole, Fucili, Moschetti, Tromboni)
  if (
    weapon.includes('revolver') ||
    weapon.includes('pistola') ||
    weapon.includes('colt') ||
    weapon.includes('fucile') ||
    weapon.includes('moschetto') ||
    weapon.includes('trombone') ||
    weapon.includes('canne') ||
    weapon.includes('firearms') ||
    weapon.includes('shotgun') ||
    weapon.includes('mitragliatrice') ||
    weapon.includes('peacemaker') ||
    weapon.includes('magnum')
  ) {
    const bulletIdx = items.findIndex(
      (i) => i.category === 'ammo' && i.quantity > 0 && (/proiettil|munizion|cartucc|pallottole|colp/i.test(i.name))
    );
    if (bulletIdx !== -1) return bulletIdx;
  }

  // 3. Fallback: prima munizione disponibile
  return items.findIndex((i) => i.category === 'ammo' && i.quantity > 0);
}

export type MagazineKind = 'tamburo' | 'caricatore' | 'nastro' | 'serbatoio' | 'camera';

export interface WeaponMagazineState {
  hasMagazine: boolean;
  kind: MagazineKind;
  label: string; // "Tamburo", "Caricatore", "Nastro", "Serbatoio", "Camera di Scoppio", "Incocco"
  loaded: number;
  max: number;
  reserve: number;
  isLoaded: boolean;
  canReload: boolean;
  reserveItemName?: string;
  weaponLineIndex: number;
}

/**
 * Determina il tipo e l'etichetta del contenitore munizioni dell'arma.
 */
export function getWeaponMagazineKind(weaponNameOrCategory?: string): { kind: MagazineKind; label: string } {
  const w = (weaponNameOrCategory || '').toLowerCase();
  if (
    w.includes('revolver') ||
    w.includes('peacemaker') ||
    w.includes('magnum') ||
    w.includes('.44') ||
    w.includes('.38') ||
    w.includes('derringer')
  ) {
    return { kind: 'tamburo', label: 'Tamburo' };
  }
  if (
    w.includes('mitragliatrice') ||
    w.includes('lmg') ||
    w.includes('m60') ||
    w.includes('minimi') ||
    w.includes('supporto')
  ) {
    return { kind: 'nastro', label: 'Nastro' };
  }
  if (
    w.includes('shotgun') ||
    w.includes('pompa') ||
    w.includes('m870') ||
    w.includes('winchester') ||
    w.includes('remington')
  ) {
    return { kind: 'serbatoio', label: 'Serbatoio' };
  }
  if (
    w.includes('moschetto') ||
    w.includes('archibugio') ||
    w.includes('trombone') ||
    w.includes('flintlock') ||
    w.includes('pietra focaia')
  ) {
    return { kind: 'camera', label: 'Canna' };
  }
  if (w.includes('arco') || w.includes('balestra') || w.includes('bow') || w.includes('crossbow')) {
    return { kind: 'camera', label: 'Incocco' };
  }
  return { kind: 'caricatore', label: 'Caricatore' };
}

/**
 * Ottiene lo stato attuale del tamburo/caricatore/nastro dell'arma per il personaggio.
 */
export function getWeaponMagazineState(
  char: Character,
  weaponName?: string,
  weaponClipSize?: number
): WeaponMagazineState {
  const { kind, label } = getWeaponMagazineKind(weaponName);
  const wNameLower = (weaponName || '').toLowerCase().trim();

  // Capienza massima
  const defaultMax =
    weaponClipSize && weaponClipSize > 0
      ? weaponClipSize
      : kind === 'tamburo'
      ? 6
      : kind === 'nastro'
      ? 100
      : kind === 'serbatoio'
      ? 6
      : kind === 'camera'
      ? 1
      : 15;

  const max = defaultMax;

  // Trova la riga dell'arma nell'inventario del personaggio
  const inv = char.inventory || [];
  let weaponLineIndex = -1;
  let rawWeaponString = '';

  for (let i = 0; i < inv.length; i++) {
    const line = String(inv[i] || '').trim();
    const lineLower = line.toLowerCase();
    if (wNameLower) {
      // Confronto per nome o parole chiave (es. "revolver", "colt", "arco")
      const keywords = wNameLower.split(/[\s—\-\/]+/).filter((k) => k.length > 3);
      if (lineLower.includes(wNameLower) || (keywords.length > 0 && keywords.some((k) => lineLower.includes(k)))) {
        weaponLineIndex = i;
        rawWeaponString = line;
        break;
      }
    }
  }

  // Estrai i colpi attualmente carichi dalla riga dell'inventario
  let loaded = max;
  let hasTag = false;

  if (rawWeaponString) {
    const tagMatch = rawWeaponString.match(
      /\[(?:Tamburo|Caricatore|Nastro|Serbatoio|Canna|Incocco|Colpi)?:\s*(\d+)\/(\d+).*?\]/i
    );
    if (tagMatch) {
      loaded = parseInt(tagMatch[1], 10);
      hasTag = true;
    }
  }

  // Fallback da weaponMagazines
  if (!hasTag && char.weaponMagazines) {
    const key = Object.keys(char.weaponMagazines).find(
      (k) => k.toLowerCase() === wNameLower || wNameLower.includes(k.toLowerCase())
    );
    if (key !== undefined && typeof char.weaponMagazines[key] === 'number') {
      loaded = char.weaponMagazines[key];
      hasTag = true;
    }
  }

  // Se non era specificato ed è un'arma specifica come il revolver che ha appena sparato
  if (!hasTag) {
    // Se la stringa indica scarico
    if (/scaric[oa]/i.test(rawWeaponString)) {
      loaded = 0;
    } else {
      loaded = max;
    }
  }

  // Calcolo riserva in borsa
  const items = getCharacterInventory(char);
  const ammoIdx = findMatchingAmmoItem(items, weaponName);
  const reserve = ammoIdx !== -1 ? items[ammoIdx].quantity : 0;
  const reserveItemName = ammoIdx !== -1 ? items[ammoIdx].name : undefined;

  return {
    hasMagazine: true,
    kind,
    label,
    loaded: Math.max(0, Math.min(max, loaded)),
    max,
    reserve,
    isLoaded: loaded > 0,
    canReload: loaded < max && reserve > 0,
    reserveItemName,
    weaponLineIndex,
  };
}

/**
 * Ricarica il tamburo/caricatore/nastro dell'arma prelevando colpi dalla riserva nell'inventario.
 */
export function reloadWeaponMagazine(
  char: Character,
  weaponName?: string,
  weaponClipSize?: number
): {
  updatedChar: Character;
  success: boolean;
  reloadedCount: number;
  newLoaded: number;
  maxLoaded: number;
  remainingReserve: number;
  label: string;
  message: string;
} {
  const state = getWeaponMagazineState(char, weaponName, weaponClipSize);
  const needed = state.max - state.loaded;

  if (needed <= 0) {
    return {
      updatedChar: char,
      success: false,
      reloadedCount: 0,
      newLoaded: state.loaded,
      maxLoaded: state.max,
      remainingReserve: state.reserve,
      label: state.label,
      message: `⚠️ Il ${state.label} è già completamente carico (${state.loaded}/${state.max})!`,
    };
  }

  if (state.reserve <= 0) {
    return {
      updatedChar: char,
      success: false,
      reloadedCount: 0,
      newLoaded: state.loaded,
      maxLoaded: state.max,
      remainingReserve: 0,
      label: state.label,
      message: `⚠️ Nessuna munizione di riserva compatibile in borsa/cartucciera per ricaricare il ${state.label}!`,
    };
  }

  const toTransfer = Math.min(needed, state.reserve);
  const newLoaded = state.loaded + toTransfer;

  // 1. Sottrai toTransfer dall'inventario
  const items = [...getCharacterInventory(char)];
  const ammoIdx = findMatchingAmmoItem(items, weaponName);
  let remainingReserve = 0;
  if (ammoIdx !== -1) {
    items[ammoIdx].quantity = Math.max(0, items[ammoIdx].quantity - toTransfer);
    remainingReserve = items[ammoIdx].quantity;
  }

  let updatedChar = updateCharacterInventory(char, items);
  const rawInv = [...(updatedChar.inventory || [])];

  // 2. Aggiorna la riga dell'arma nell'inventario
  if (state.weaponLineIndex !== -1 && state.weaponLineIndex < rawInv.length) {
    const rawLine = rawInv[state.weaponLineIndex];
    const cleanLine = rawLine
      .replace(/\s*\[(?:Tamburo|Caricatore|Nastro|Serbatoio|Canna|Incocco|Colpi)?:\s*\d+\/\d+.*?\]/gi, '')
      .replace(/\s*-\s*SCARIC[OA]/gi, '')
      .trim();
    rawInv[state.weaponLineIndex] = `${cleanLine} [${state.label}: ${newLoaded}/${state.max}]`;
    updatedChar.inventory = rawInv;
  }

  // 3. Aggiorna mappa weaponMagazines
  const key = weaponName || 'current_weapon';
  updatedChar.weaponMagazines = {
    ...(updatedChar.weaponMagazines || {}),
    [key]: newLoaded,
  };

  return {
    updatedChar,
    success: true,
    reloadedCount: toTransfer,
    newLoaded,
    maxLoaded: state.max,
    remainingReserve,
    label: state.label,
    message: `🔄 Ricaricato ${state.label}: inseriti +${toTransfer} colpi [${newLoaded}/${state.max}]. Rimasti ${remainingReserve}x nella riserva in borsa.`,
  };
}

/**
 * Consuma munizioni dal tamburo/caricatore/nastro dell'arma quando si spara.
 * NON tocca la riserva in borsa, poiché i proiettili erano già stati caricati nell'arma!
 */
export function consumeWeaponMagazineAmmo(
  char: Character,
  count: number | 'all',
  weaponName?: string,
  weaponClipSize?: number
): {
  updatedChar: Character;
  success: boolean;
  consumedCount: number;
  newLoaded: number;
  maxLoaded: number;
  remainingReserve: number;
  label: string;
  message: string;
} {
  const state = getWeaponMagazineState(char, weaponName, weaponClipSize);

  if (state.loaded <= 0) {
    return {
      updatedChar: char,
      success: false,
      consumedCount: 0,
      newLoaded: 0,
      maxLoaded: state.max,
      remainingReserve: state.reserve,
      label: state.label,
      message: `⚠️ CLICK! ${state.label} VUOTO (0/${state.max})! Devi Ricaricare prima di poter sparare.`,
    };
  }

  const toConsume = count === 'all' ? state.loaded : Math.min(state.loaded, Math.max(1, count));
  const newLoaded = Math.max(0, state.loaded - toConsume);

  let updatedChar = { ...char };
  const rawInv = [...(char.inventory || [])];

  if (state.weaponLineIndex !== -1 && state.weaponLineIndex < rawInv.length) {
    const rawLine = rawInv[state.weaponLineIndex];
    const cleanLine = rawLine
      .replace(/\s*\[(?:Tamburo|Caricatore|Nastro|Serbatoio|Canna|Incocco|Colpi)?:\s*\d+\/\d+.*?\]/gi, '')
      .replace(/\s*-\s*SCARIC[OA]/gi, '')
      .trim();
    const statusSuffix = newLoaded === 0 ? ' - SCARICO' : '';
    rawInv[state.weaponLineIndex] = `${cleanLine} [${state.label}: ${newLoaded}/${state.max}${statusSuffix}]`;
    updatedChar.inventory = rawInv;
  }

  const key = weaponName || 'current_weapon';
  updatedChar.weaponMagazines = {
    ...(updatedChar.weaponMagazines || {}),
    [key]: newLoaded,
  };

  return {
    updatedChar,
    success: true,
    consumedCount: toConsume,
    newLoaded,
    maxLoaded: state.max,
    remainingReserve: state.reserve,
    label: state.label,
    message:
      newLoaded === 0
        ? `💥 Svuotato ${state.label} (${toConsume} colpi sparati)! Ora è completamente SCARICO [0/${state.max}].`
        : `💥 Sparati ${toConsume} colpi da ${state.label}. Rimasti: ${newLoaded}/${state.max}.`,
  };
}

/**
 * Verifica se il personaggio ha munizioni disponibili per attacchi a distanza (armi da fuoco, arco, ecc.).
 */
export function checkAmmoStatus(char: Character, weaponNameOrCategory?: string): {
  hasAmmo: boolean;
  totalAmmo: number;
  ammoItems: InventoryItem[];
  primaryAmmo?: InventoryItem;
} {
  const items = getCharacterInventory(char);
  const ammoItems = items.filter((i) => i.category === 'ammo');
  const matchedIdx = findMatchingAmmoItem(items, weaponNameOrCategory);
  const primaryAmmo = matchedIdx !== -1 ? items[matchedIdx] : (ammoItems.find((i) => i.quantity > 0) || ammoItems[0]);
  const totalAmmo = primaryAmmo ? primaryAmmo.quantity : 0;

  return {
    hasAmmo: totalAmmo > 0,
    totalAmmo,
    ammoItems,
    primaryAmmo,
  };
}

/**
 * Consuma munizioni dall'inventario per l'arma specifica utilizzata.
 */
export function consumeAmmo(
  char: Character,
  amount: number | 'all' = 1,
  weaponName?: string,
  clipSize?: number
): {
  updatedChar: Character;
  success: boolean;
  consumedItem?: InventoryItem;
  remaining: number;
  consumedCount: number;
  message: string;
} {
  const items = [...getCharacterInventory(char)];
  const ammoIndex = findMatchingAmmoItem(items, weaponName);

  if (ammoIndex === -1) {
    return {
      updatedChar: char,
      success: false,
      remaining: 0,
      consumedCount: 0,
      message: `Munizioni esaurite per quest'arma! Nessun colpo compatibile rimasto.`,
    };
  }

  const target = { ...items[ammoIndex] };
  // Svuota caricatore consuma al massimo la capienza del caricatore (default 6 per revolver, o clipSize), o i colpi rimasti
  const maxClip = clipSize && clipSize > 0 ? clipSize : 6;
  const toConsume = amount === 'all'
    ? Math.min(target.quantity, maxClip)
    : Math.min(target.quantity, Math.max(1, amount));

  target.quantity = Math.max(0, target.quantity - toConsume);
  items[ammoIndex] = target;

  const remaining = target.quantity;
  const updatedChar = updateCharacterInventory(char, items);

  return {
    updatedChar,
    success: true,
    consumedItem: target,
    remaining,
    consumedCount: toConsume,
    message: remaining === 0
      ? `Hai sparato gli ultimi colpi (${toConsume}) di ${target.name}! Munizioni ora completamente ESAURITE (0).`
      : `Hai consumato ${toConsume} colpi di ${target.name}. Rimasti: ${remaining}.`,
  };
}

/**
 * Consuma un oggetto specifico per nome o motivo (es. "Kit Medico", "Bende", "Pozione", "Torcia").
 */
export function consumeNamedItem(
  char: Character,
  itemNameOrPattern: string,
  quantityToConsume: number = 1
): {
  updatedChar: Character;
  success: boolean;
  consumedItem?: InventoryItem;
  remaining: number;
  message: string;
} {
  const items = [...getCharacterInventory(char)];
  const pat = itemNameOrPattern.toLowerCase().trim();
  const idx = items.findIndex((i) => i.name.toLowerCase().includes(pat) && i.quantity > 0);

  if (idx === -1) {
    return {
      updatedChar: char,
      success: false,
      remaining: 0,
      message: `Oggetto "${itemNameOrPattern}" non trovato o terminato nell'inventario.`,
    };
  }

  const item = { ...items[idx] };
  const toRemove = Math.min(item.quantity, Math.max(1, quantityToConsume));
  item.quantity -= toRemove;

  if (item.quantity <= 0) {
    items.splice(idx, 1);
  } else {
    items[idx] = item;
  }

  const updatedChar = updateCharacterInventory(char, items);
  return {
    updatedChar,
    success: true,
    consumedItem: item,
    remaining: Math.max(0, item.quantity),
    message: `Consumato ${toRemove}x ${item.name}. Rimasti: ${Math.max(0, item.quantity)}.`,
  };
}

/**
 * Usa un consumabile (es. pozione, bende, fiala di sangue).
 * Se è curativo, ripara anche una casella ferita nella salute del personaggio.
 */
export function useConsumable(char: Character, itemId: string): {
  updatedChar: Character;
  success: boolean;
  message: string;
} {
  const items = [...getCharacterInventory(char)];
  const idx = items.findIndex((i) => i.id === itemId);

  if (idx === -1 || items[idx].quantity <= 0) {
    return { updatedChar: char, success: false, message: 'Oggetto non trovato o terminato.' };
  }

  const item = { ...items[idx] };
  item.quantity -= 1;
  if (item.quantity <= 0) {
    items.splice(idx, 1);
  } else {
    items[idx] = item;
  }

  let updatedChar = updateCharacterInventory(char, items);
  let healNotice = '';

  // Effetto curativo automatico se è bende / pozione / medikit / pronto soccorso
  const lower = item.name.toLowerCase();
  if (
    lower.includes('benda') ||
    lower.includes('pozion') ||
    lower.includes('medikit') ||
    lower.includes('kit medico') ||
    lower.includes('pronto soccorso') ||
    lower.includes('sangue') ||
    lower.includes('cura')
  ) {
    if (updatedChar.health && updatedChar.health.length > 0) {
      const healedHealth = healDamageFromHealth(updatedChar.health, 1, 'bashing');
      updatedChar = { ...updatedChar, health: healedHealth };
      healNotice = ' ❤️ Hai risanato 1 casella di salute!';
    }
  }

  return {
    updatedChar,
    success: true,
    message: `Hai utilizzato ${item.name}.${healNotice}`,
  };
}

/**
 * Controlla se il personaggio ha kit medico, bende, fiale o pozioni per curarsi.
 */
export function checkHealingItemStatus(char: Character): {
  hasHealingItem: boolean;
  item?: InventoryItem;
  totalQuantity: number;
} {
  const items = getCharacterInventory(char);
  const healingKeywords = /kit\s+medico|medikit|pronto\s+soccorso|bende|benda|pozion/i;
  const healingItems = items.filter(
    (i) => (i.category === 'consumable' || healingKeywords.test(i.name)) && healingKeywords.test(i.name) && i.quantity > 0
  );
  const totalQuantity = healingItems.reduce((acc, i) => acc + i.quantity, 0);

  return {
    hasHealingItem: healingItems.length > 0,
    item: healingItems[0],
    totalQuantity,
  };
}

/**
 * Consuma un kit medico / oggetto curativo dall'inventario e ripristina la salute.
 */
export function consumeHealingItem(char: Character): {
  updatedChar: Character;
  success: boolean;
  consumedItem?: InventoryItem;
  remaining: number;
  message: string;
} {
  const status = checkHealingItemStatus(char);
  if (!status.hasHealingItem || !status.item) {
    return {
      updatedChar: char,
      success: false,
      remaining: 0,
      message: 'Nessun kit medico, bende o pozione curativa presente nell\'inventario!',
    };
  }

  const res = useConsumable(char, status.item.id);
  const remaining = Math.max(0, (status.item.quantity || 1) - 1);
  return {
    updatedChar: res.updatedChar,
    success: true,
    consumedItem: status.item,
    remaining,
    message: res.message,
  };
}

/**
 * Aggiunge un bottino narrativo all'inventario, sommando le munizioni esistenti se già presenti.
 */
export function addLootToInventory(char: Character, rawName: string, description?: string): Character {
  const items = [...getCharacterInventory(char)];
  const parsed = parseRawItem(rawName, items.length);
  if (description) parsed.description = description;

  // 1. Se è una munizione e ne abbiamo già dello stesso tipo, incrementa la quantità
  const existingAmmoIndex = items.findIndex(
    (i) => i.category === 'ammo' && i.name.toLowerCase() === parsed.name.toLowerCase()
  );
  if (existingAmmoIndex !== -1) {
    items[existingAmmoIndex] = {
      ...items[existingAmmoIndex],
      quantity: items[existingAmmoIndex].quantity + parsed.quantity,
    };
    return updateCharacterInventory(char, items);
  }

  // 2. Controllo duplicati intelligenti per oggetti di missione, dispacci e bottini narrativi
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
  const newNorm = normalize(parsed.name);

  const existingGearIndex = items.findIndex((i) => {
    const oldNorm = normalize(i.name);
    if (oldNorm === newNorm) return true;
    // Se entrambi contengono "dispaccio cifrato" o "cuore di scorie", è lo stesso identico oggetto di trama
    if (oldNorm.includes('dispaccio') && newNorm.includes('dispaccio') && (oldNorm.includes('cifrat') || newNorm.includes('cifrat'))) {
      return true;
    }
    if (oldNorm.includes('cuore di scorie') && newNorm.includes('cuore di scorie')) {
      return true;
    }
    return false;
  });

  if (existingGearIndex !== -1) {
    // Non duplicare: aggiorna la descrizione se più dettagliata
    if (description && (!items[existingGearIndex].description || description.length > items[existingGearIndex].description!.length)) {
      items[existingGearIndex] = {
        ...items[existingGearIndex],
        description,
      };
    }
    return updateCharacterInventory(char, items);
  }

  items.push(parsed);
  return updateCharacterInventory(char, items);
}

/**
 * Formatta l'inventario per il System Prompt del Narratore AI, evidenziando le munizioni.
 */
export function formatInventoryForPrompt(char: Character): string {
  const items = getCharacterInventory(char);
  if (items.length === 0) return 'Inventario vuoto.';

  const weapons = items.filter((i) => i.category === 'weapon').map((w) => `${w.name}${w.isEquipped ? ' [Impugnata]' : ''}`);
  const ammos = items.filter((i) => i.category === 'ammo').map((a) => `${a.name}: ${a.quantity} rimasti${a.quantity === 0 ? ' [ESAURITI ⚠]' : ''}`);
  const consumables = items.filter((i) => i.category === 'consumable').map((c) => `${c.name} (${c.quantity})`);
  const gear = items.filter((i) => i.category === 'gear').map((g) => g.name);

  return `
STATO EQUIPAGGIAMENTO & MUNIZIONI:
- Armi: ${weapons.length > 0 ? weapons.join(', ') : 'Nessuna arma evidente'}
- Munizioni: ${ammos.length > 0 ? ammos.join(', ') : 'Nessuna munizione'}
- Consumabili: ${consumables.length > 0 ? consumables.join(', ') : 'Nessun consumabile'}
- Oggetti / Attrezzatura: ${gear.length > 0 ? gear.join(', ') : 'Nessun oggetto speciale'}
REGOLA RIGOROSA MUNIZIONI PER IL NARRATORE:
Se il giocatore tenta di sparare con frecce o proiettili la cui quantità è 0 (ESAURITI), l'arma NON spara: scatta a vuoto con un rumoroso 'click' o la faretra è desolatamente vuota! Il narratore DEVE evidenziare la mancanza di colpi e costringere il giocatore al corpo a corpo, alla fuga o al riparo.
`.trim();
}

