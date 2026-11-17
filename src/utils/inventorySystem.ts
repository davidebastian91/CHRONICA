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
    weapon.includes('firearms')
  ) {
    const bulletIdx = items.findIndex(
      (i) => i.category === 'ammo' && i.quantity > 0 && (/proiettil|munizion|cartucc|pallottole|colp/i.test(i.name))
    );
    if (bulletIdx !== -1) return bulletIdx;
  }

  // 3. Fallback: prima munizione disponibile
  return items.findIndex((i) => i.category === 'ammo' && i.quantity > 0);
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

  // Se è una munizione e ne abbiamo già dello stesso tipo, incrementa la quantità
  const existingIndex = items.findIndex(
    (i) => i.category === parsed.category && i.name.toLowerCase() === parsed.name.toLowerCase()
  );

  if (existingIndex !== -1) {
    items[existingIndex] = {
      ...items[existingIndex],
      quantity: items[existingIndex].quantity + parsed.quantity,
    };
  } else {
    items.push(parsed);
  }

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

