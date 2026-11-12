import type {
  Character,
  DamageType,
  HealthLevel,
  InitiativeResult,
  DamageRollResult,
  SoakRollResult,
  WodWeapon,
  ActiveCombatEnemy,
  EnemySpawnSpec,
  DiceRollResult,
} from '../types';
import { getHealthPenalty } from './wodActionRules';
import { rollD10Pool } from './dice';

/**
 * CATALOGO ARMI CHRONICA D10 ENGINE
 * Include tutte le Armi da Mischia (14), Armi a Distanza (10) ed Esplosivi (5) con i valori esatti dello Schermo.
 */
export const WOD_WEAPONS_CATALOG: WodWeapon[] = [
  // --- LOTTA & MANI NUDE ---
  {
    id: 'brawl_punch',
    name: '👊 Colpo Disarmato (Pugno / Calcio / Lotta)',
    category: 'brawl',
    baseDamage: 0,
    addStrength: true,
    damageType: 'bashing',
    difficulty: 8,
    minStrength: 1,
    size: 0,
    description: 'Combattimento disarmato (Forza + Lotta - Difesa - Armatura). Danno: +0 Contundente (/).',
  },
  {
    id: 'brawl_brass_knuckles',
    name: '🥊 Tirapugni d\'Ottone',
    category: 'brawl',
    baseDamage: 1,
    addStrength: true,
    damageType: 'bashing',
    difficulty: 8,
    conceal: 'P',
    minStrength: 1,
    size: 0,
    description: 'Schermo del Narratore — Danno: +1 (C) | Taglia: n/a | Costo: • | Speciale: Usa l\'Abilità Lotta anziché Armi da Mischia.',
  },
  {
    id: 'brawl_fangs',
    name: '🧛 Morso Vampirico / Zanne (in Presa)',
    category: 'brawl',
    baseDamage: 1,
    addStrength: true,
    damageType: 'aggravated',
    difficulty: 8,
    minStrength: 1,
    size: 0,
    description: 'Affondo di zanne o presa soprannaturale. Danno: +1 Aggravato (*).',
  },
  {
    id: 'brawl_claws',
    name: '🐺 Artigli / Morso Ferino (Uratha / Proteide)',
    category: 'brawl',
    baseDamage: 2,
    addStrength: true,
    damageType: 'lethal',
    difficulty: 8,
    minStrength: 1,
    size: 0,
    description: 'Artigli o zanne di Lupo Mannaro (Gauru/Urshul +2L/+3L) o Proteide. Danno: +2 Letale (X) o Aggravato (*).',
  },

  // --- TABELLA DELLE ARMI DA MISCHIA (SCHERMO DEL NARRATORE) ---
  {
    id: 'melee_sap',
    name: '🔨 Manganello',
    category: 'melee',
    baseDamage: 1,
    addStrength: true,
    damageType: 'bashing',
    difficulty: 8,
    conceal: 'P',
    minStrength: 1,
    size: 1,
    description: 'Schermo del Narratore — Danno: +1 (C) | Taglia/Forza min: 1 | Costo: • | Speciale: Mettere Fuori Combattimento (pag. 168).',
  },
  {
    id: 'melee_metal_club',
    name: '🏏 Mazza (metallo)',
    category: 'melee',
    baseDamage: 3,
    addStrength: true,
    damageType: 'bashing',
    difficulty: 8,
    conceal: 'T',
    minStrength: 2,
    size: 2,
    description: 'Schermo del Narratore — Danno: +3 (C) | Taglia/Forza min: 2 | Costo: •• | Nascondibile sotto un cappotto.',
  },
  {
    id: 'melee_wood_club',
    name: '🪵 Randello (legno)',
    category: 'melee',
    baseDamage: 2,
    addStrength: true,
    damageType: 'bashing',
    difficulty: 8,
    conceal: 'T',
    minStrength: 2,
    size: 2,
    description: 'Schermo del Narratore — Danno: +2 (C) | Taglia/Forza min: 2 | Costo: n/a (può essere ricavato/creato).',
  },
  {
    id: 'melee_hatchet',
    name: '🪓 Accetta',
    category: 'melee',
    baseDamage: 2,
    addStrength: true,
    damageType: 'lethal',
    difficulty: 8,
    conceal: 'P',
    minStrength: 1,
    size: 1,
    description: 'Schermo del Narratore — Danno: +2 (L) | Taglia/Forza min: 1 | Costo: • | Compatta e nascondibile.',
  },
  {
    id: 'melee_battleaxe',
    name: '🪓 Ascia† (9-Again)',
    category: 'melee',
    baseDamage: 3,
    addStrength: true,
    damageType: 'lethal',
    difficulty: 8,
    conceal: 'N',
    minStrength: 3,
    size: 3,
    againThreshold: 9,
    twoHanded: true,
    description: 'Schermo del Narratore — Danno: +3 (L) | Taglia/Forza min: 3 | Costo: •• | Speciale: Due mani†, Ritira 9 (9-Again).',
  },
  {
    id: 'melee_greataxe',
    name: '🪓 Ascia Grande† (9-Again)',
    category: 'melee',
    baseDamage: 5,
    addStrength: true,
    damageType: 'lethal',
    difficulty: 8,
    conceal: 'N',
    minStrength: 4,
    size: 4,
    againThreshold: 9,
    twoHanded: true,
    description: 'Schermo del Narratore — Danno: +5 (L) | Taglia/Forza min: 4 | Costo: ••• | Speciale: Due mani†, Ritira 9 (9-Again).',
  },
  {
    id: 'melee_knife',
    name: '🗡️ Coltello',
    category: 'melee',
    baseDamage: 1,
    addStrength: true,
    damageType: 'lethal',
    difficulty: 8,
    conceal: 'P',
    minStrength: 1,
    size: 1,
    description: 'Schermo del Narratore — Danno: +1 (L) | Taglia/Forza min: 1 | Costo: • | Nascondibile in una mano o in tasca.',
  },
  {
    id: 'melee_katana',
    name: '⚔️ Katana',
    category: 'melee',
    baseDamage: 3,
    addStrength: true,
    damageType: 'lethal',
    difficulty: 8,
    conceal: 'T',
    minStrength: 2,
    size: 2,
    description: 'Schermo del Narratore — Danno: +3 (L) | Taglia/Forza min: 2 | Costo: ••• | Speciale: Durezza +1 (spada magistralmente realizzata).',
  },
  {
    id: 'melee_spear',
    name: '🔱 Lancia† (+1 Difesa)',
    category: 'melee',
    baseDamage: 3,
    addStrength: true,
    damageType: 'lethal',
    difficulty: 8,
    conceal: 'N',
    minStrength: 4,
    size: 4,
    twoHanded: true,
    description: 'Schermo del Narratore — Danno: +3 (L) | Taglia/Forza min: 4 | Costo: • | Speciale: Due mani†, +1 alla Difesa contro avversari disarmati.',
  },
  {
    id: 'melee_stake',
    name: '🪵 Paletto di Legno',
    category: 'melee',
    baseDamage: 1,
    addStrength: true,
    damageType: 'lethal',
    difficulty: 8,
    conceal: 'P',
    minStrength: 1,
    size: 1,
    description: 'Schermo del Narratore — Danno: +1 (L) | Taglia/Forza min: 1 | Costo: n/a | Speciale: Mirare al cuore (-4) e infliggere almeno 3 danni.',
  },
  {
    id: 'melee_sword',
    name: '⚔️ Spada',
    category: 'melee',
    baseDamage: 3,
    addStrength: true,
    damageType: 'lethal',
    difficulty: 8,
    conceal: 'T',
    minStrength: 2,
    size: 2,
    description: 'Schermo del Narratore — Danno: +3 (L) | Taglia/Forza min: 2 | Costo: •• | Spada a una mano bilanciata.',
  },
  {
    id: 'melee_greatsword',
    name: '🗡️ Spadone†',
    category: 'melee',
    baseDamage: 4,
    addStrength: true,
    damageType: 'lethal',
    difficulty: 8,
    conceal: 'N',
    minStrength: 3,
    size: 3,
    twoHanded: true,
    description: 'Schermo del Narratore — Danno: +4 (L) | Taglia/Forza min: 3 | Costo: ••• | Speciale: Richiede due mani† (Forza +1 se usato a una mano).',
  },
  {
    id: 'melee_rapier',
    name: '🤺 Stocco (Perforare Armatura 1)',
    category: 'melee',
    baseDamage: 2,
    addStrength: true,
    damageType: 'lethal',
    difficulty: 8,
    conceal: 'T',
    minStrength: 2,
    size: 2,
    armorPiercing: 1,
    description: 'Schermo del Narratore — Danno: +2 (L) | Taglia/Forza min: 2 | Costo: •• | Speciale: Perforare Armatura 1 (ignora 1 punto di armatura).',
  },

  // --- TABELLA DELLE ARMI A DISTANZA (SCHERMO DEL NARRATORE) ---
  {
    id: 'firearms_revolver_light',
    name: '🔫 Revolver Leggero — SW M640 (.38 Special)',
    category: 'firearms',
    baseDamage: 2,
    addStrength: false,
    damageType: 'lethal',
    difficulty: 8,
    conceal: 'P',
    rangeMeters: 20,
    clipSize: 6,
    minStrength: 2,
    size: 1,
    description: 'Schermo del Narratore — Danno: +2 (L) | Gittata: 20/40/80m | Caricatore: 6 | Forza min: 2 | Taglia: 1 | Costo: ••.',
  },
  {
    id: 'firearms_revolver_heavy',
    name: '💥 Revolver Pesante — SW M29 (.44 Magnum)',
    category: 'firearms',
    baseDamage: 3,
    addStrength: false,
    damageType: 'lethal',
    difficulty: 8,
    conceal: 'P',
    rangeMeters: 35,
    clipSize: 6,
    minStrength: 3,
    size: 1,
    description: 'Schermo del Narratore — Danno: +3 (L) | Gittata: 35/70/140m | Caricatore: 6 | Forza min: 3 | Taglia: 1 | Costo: ••.',
  },
  {
    id: 'firearms_pistol_light',
    name: '🔫 Pistola Leggera — Glock 17 (9mm)',
    category: 'firearms',
    baseDamage: 2,
    addStrength: false,
    damageType: 'lethal',
    difficulty: 8,
    conceal: 'P',
    rangeMeters: 20,
    clipSize: 18,
    minStrength: 2,
    size: 1,
    description: 'Schermo del Narratore — Danno: +2 (L) | Gittata: 20/40/80m | Caricatore: 17+1 | Forza min: 2 | Taglia: 1 | Costo: •••.',
  },
  {
    id: 'firearms_pistol_heavy',
    name: '🔫 Pistola Pesante — Colt M1911A1 (.45 ACP)',
    category: 'firearms',
    baseDamage: 3,
    addStrength: false,
    damageType: 'lethal',
    difficulty: 8,
    conceal: 'P',
    rangeMeters: 30,
    clipSize: 8,
    minStrength: 3,
    size: 1,
    description: 'Schermo del Narratore — Danno: +3 (L) | Gittata: 30/60/120m | Caricatore: 7+1 | Forza min: 3 | Taglia: 1 | Costo: •••.',
  },
  {
    id: 'firearms_rifle',
    name: '🎯 Fucile† — Remington M-700 (30.06)',
    category: 'firearms',
    baseDamage: 5,
    addStrength: false,
    damageType: 'lethal',
    difficulty: 8,
    conceal: 'N',
    rangeMeters: 200,
    clipSize: 6,
    minStrength: 2,
    size: 3,
    twoHanded: true,
    description: 'Schermo del Narratore — Danno: +5 (L) | Gittata: 200/400/800m | Caricatore: 5+1 | Forza min: 2 | Taglia: 3 | Costo: •• | Due mani†.',
  },
  {
    id: 'firearms_smg_small',
    name: '🔫 Mitra Piccolo* — Ingram Mac-10 (9mm)',
    category: 'firearms',
    baseDamage: 2,
    addStrength: false,
    damageType: 'lethal',
    difficulty: 8,
    conceal: 'P',
    rangeMeters: 25,
    clipSize: 31,
    minStrength: 2,
    size: 1,
    autoFire: true,
    description: 'Schermo del Narratore — Danno: +2 (L) | Gittata: 25/50/100m | Caricatore: 30+1 | Forza min: 2 | Taglia: 1 | Costo: ••• | Fuoco Automatico*.',
  },
  {
    id: 'firearms_smg_large',
    name: '🔫 Mitra Grande*† — HK MP-5 (9mm)',
    category: 'firearms',
    baseDamage: 3,
    addStrength: false,
    damageType: 'lethal',
    difficulty: 8,
    conceal: 'T',
    rangeMeters: 50,
    clipSize: 31,
    minStrength: 3,
    size: 2,
    twoHanded: true,
    autoFire: true,
    description: 'Schermo del Narratore — Danno: +3 (L) | Gittata: 50/100/200m | Caricatore: 30+1 | Forza min: 3 | Taglia: 2 | Costo: ••• | Due mani†, Fuoco Automatico*.',
  },
  {
    id: 'firearms_assault_rifle',
    name: '🎯 Fucile d\'Assalto*† — Steyr-Aug (5.56mm)',
    category: 'firearms',
    baseDamage: 4,
    addStrength: false,
    damageType: 'lethal',
    difficulty: 8,
    conceal: 'N',
    rangeMeters: 150,
    clipSize: 43,
    minStrength: 3,
    size: 3,
    twoHanded: true,
    autoFire: true,
    description: 'Schermo del Narratore — Danno: +4 (L) | Gittata: 150/300/600m | Caricatore: 42+1 | Forza min: 3 | Taglia: 3 | Costo: ••• | Due mani†, Fuoco Automatico*.',
  },
  {
    id: 'firearms_shotgun',
    name: '💥 Shotgun† — Remington M870 (9-Again)',
    category: 'firearms',
    baseDamage: 4,
    addStrength: false,
    damageType: 'lethal',
    difficulty: 8,
    conceal: 'T',
    rangeMeters: 20,
    clipSize: 6,
    minStrength: 3,
    size: 2,
    againThreshold: 9,
    twoHanded: true,
    description: 'Schermo del Narratore — Danno: +4 (L) Ritira 9 (9-Again)*** | Gittata: 20/40/80m | Caricatore: 5+1 | Forza min: 3 | Taglia: 2 | Costo: •• | Due mani†.',
  },
  {
    id: 'ranged_crossbow',
    name: '🏹 Balestra**†',
    category: 'ranged',
    baseDamage: 3,
    addStrength: false,
    damageType: 'lethal',
    difficulty: 8,
    conceal: 'N',
    rangeMeters: 40,
    clipSize: 1,
    minStrength: 3,
    size: 3,
    twoHanded: true,
    description: 'Schermo del Narratore — Danno: +3 (L) | Gittata: 40/80/160m | Caricatore: 1 | Forza min: 3 | Taglia: 3 | Costo: ••• | Ricarica 3 turni, Può impalettare (-4, min 3 danni).',
  },
  {
    id: 'firearms_heavy_mg',
    name: '🔫 Mitragliatrice Pesante di Supporto*† — M60 / Minimi (7.62 / 5.56mm)',
    category: 'firearms',
    baseDamage: 5,
    addStrength: false,
    damageType: 'lethal',
    difficulty: 8,
    conceal: 'N',
    rangeMeters: 200,
    clipSize: 100,
    minStrength: 3,
    size: 3,
    twoHanded: true,
    autoFire: true,
    description: 'Schermo del Narratore — Danno: +5 (L) | Gittata: 200/400/800m | Nastro: 100 colpi | Forza min: 3 | Taglia: 3 | Due mani†, Fuoco Automatico & Soppressione*.',
  },
  {
    id: 'firearms_sniper',
    name: '🎯 Fucile da Cecchino di Precisione† — Barrett .50 / L96 (Ottica Telemetrica)',
    category: 'firearms',
    baseDamage: 5,
    addStrength: false,
    damageType: 'lethal',
    difficulty: 8,
    conceal: 'N',
    rangeMeters: 250,
    clipSize: 6,
    minStrength: 3,
    size: 3,
    twoHanded: true,
    armorPiercing: 1,
    description: 'Schermo del Narratore — Danno: +5 (L) | Gittata: 250/500/1000m | Caricatore: 5+1 | Forza min: 3 | Taglia: 3 | Due mani†, Mirino Telemetrico +2*, Perforare Armatura 1.',
  },
  {
    id: 'ranged_bow',
    name: '🏹 Arco Composito / Lungo da Guerra†',
    category: 'ranged',
    baseDamage: 3,
    addStrength: false,
    damageType: 'lethal',
    difficulty: 8,
    conceal: 'N',
    rangeMeters: 50,
    clipSize: 1,
    minStrength: 2,
    size: 3,
    twoHanded: true,
    description: 'Schermo del Narratore — Danno: +3 (L) | Gittata: 50/100/200m | Caricatore: 1 freccia | Forza min: 2 | Taglia: 3 | Due mani†, Silenzioso.',
  },
  {
    id: 'melee_shield',
    name: '🛡️ Scudo da Battaglia / Rotella Rinforzata',
    category: 'melee',
    baseDamage: 1,
    addStrength: true,
    damageType: 'bashing',
    difficulty: 8,
    conceal: 'N',
    minStrength: 2,
    size: 2,
    description: 'Schermo del Narratore — Danno: +1 (C) Percussione | Taglia: 2 | Forza min: 2 | Bonus Difesa: +2 contro attacchi fisici e frecce.',
  },
  {
    id: 'melee_tactical_shield',
    name: '🛡️ Scudo Tattico Balistico Antisommossa',
    category: 'melee',
    baseDamage: 1,
    addStrength: true,
    damageType: 'bashing',
    difficulty: 8,
    conceal: 'N',
    minStrength: 3,
    size: 3,
    description: 'Schermo del Narratore — Danno: +1 (C) Percussione | Taglia: 3 | Forza min: 3 | Bonus Copertura Balistica Mobile (+3 Difesa / Copertura).',
  },

  // --- TABELLA DEGLI ESPLOSIVI (SCHERMO DEL NARRATORE) ---
  {
    id: 'explosive_molotov',
    name: '🍾 Incendiario — Molotov',
    category: 'ranged',
    baseDamage: 2,
    addStrength: false,
    damageType: 'lethal',
    difficulty: 8,
    conceal: 'P',
    rangeMeters: 15,
    clipSize: 1,
    size: 1,
    description: 'Schermo del Narratore — Mod. Lancio: -1 | Area Esplosione: 2m | Danno: 2 (C) + Fuoco Letale | Taglia: 1 | Costo: n/a.',
  },
  {
    id: 'explosive_concussion',
    name: '💣 Granata a Concussione',
    category: 'ranged',
    baseDamage: 4,
    addStrength: false,
    damageType: 'bashing',
    difficulty: 8,
    conceal: 'P',
    rangeMeters: 20,
    clipSize: 1,
    size: 1,
    description: 'Schermo del Narratore — Mod. Lancio: +2 | Area Esplosione: 3m | Danno: 4 (C) + Atterramento | Taglia: 1 | Costo: •••.',
  },
  {
    id: 'explosive_frag',
    name: '💣 Granata a Frammentazione',
    category: 'ranged',
    baseDamage: 4,
    addStrength: false,
    damageType: 'lethal',
    difficulty: 8,
    conceal: 'P',
    rangeMeters: 20,
    clipSize: 1,
    size: 1,
    description: 'Schermo del Narratore — Mod. Lancio: +2 | Area Esplosione: 3m | Danno: 4 (L) | Taglia: 1 | Costo: •••.',
  },
  {
    id: 'explosive_dynamite',
    name: '🧨 Detonazione Singola — Candelotto di Dinamite',
    category: 'ranged',
    baseDamage: 4,
    addStrength: false,
    damageType: 'lethal',
    difficulty: 8,
    conceal: 'P',
    rangeMeters: 15,
    clipSize: 1,
    size: 1,
    description: 'Schermo del Narratore — Mod. Lancio: +1 | Area Esplosione: 4m | Danno: 4+ (L) | Taglia: 1 | Costo: •••.',
  },
  {
    id: 'explosive_plastique',
    name: '🧨 Alto Potenziale — Plastico (C4)',
    category: 'ranged',
    baseDamage: 6,
    addStrength: false,
    damageType: 'lethal',
    difficulty: 8,
    conceal: 'T',
    rangeMeters: 20,
    clipSize: 1,
    size: 2,
    description: 'Schermo del Narratore — Mod. Lancio: n/a (Innesco/Tempo) | Area Esplosione: 20+m | Danno: 6+ (L) | Taglia: 1-3 | Costo: ••••.',
  },
];

/**
 * Cerca un'arma dal catalogo in base al testo o nome.
 * Se non trova alcuna parola chiave di armi, restituisce null anziché forzare un coltello errato.
 */
export function findWeaponFromText(weaponName?: string): WodWeapon | null {
  if (!weaponName) return null;
  const lower = weaponName.toLowerCase();

  const found = WOD_WEAPONS_CATALOG.find((w) =>
    lower.includes(w.name.toLowerCase().replace(/[^\w\s]/gi, '').trim())
  );
  if (found) return found;

  if (lower.includes('tirapugni')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'brawl_brass_knuckles') || null;
  if (lower.includes('manganello')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'melee_sap') || null;
  if (lower.includes('mazza')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'melee_metal_club') || null;
  if (lower.includes('randello')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'melee_wood_club') || null;
  if (lower.includes('accetta')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'melee_hatchet') || null;
  if (lower.includes('ascia grande')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'melee_greataxe') || null;
  if (lower.includes('ascia')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'melee_battleaxe') || null;
  if (lower.includes('katana')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'melee_katana') || null;
  if (lower.includes('lancia')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'melee_spear') || null;
  if (lower.includes('paletto')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'melee_stake') || null;
  if (lower.includes('spadone')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'melee_greatsword') || null;
  if (lower.includes('stocco') || lower.includes('fioretto')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'melee_rapier') || null;
  if (lower.includes('spada')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'melee_sword') || null;
  if (lower.includes('scudo tattico') || (lower.includes('scudo') && lower.includes('balistico'))) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'melee_tactical_shield') || null;
  if (lower.includes('scudo')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'melee_shield') || null;
  if (lower.includes('coltello') || lower.includes('pugnale') || lower.includes('daga')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'melee_knife') || null;

  if (lower.includes('mitragliatrice') || lower.includes('supporto') || lower.includes('m60') || lower.includes('minimi') || lower.includes('lmg')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'firearms_heavy_mg') || null;
  if (lower.includes('cecchino') || lower.includes('sniper') || lower.includes('precisione') || lower.includes('barrett') || lower.includes('l96')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'firearms_sniper') || null;
  if (lower.includes('arco') || lower.includes('bow') || lower.includes('freccia')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'ranged_bow') || null;
  if (lower.includes('balestra')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'ranged_crossbow') || null;
  if (lower.includes('revolver leggero') || lower.includes('.38')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'firearms_revolver_light') || null;
  if (lower.includes('peacemaker') || lower.includes('revolver') || lower.includes('magnum') || lower.includes('.44')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'firearms_revolver_heavy') || null;
  if (lower.includes('pistola leggera') || lower.includes('glock')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'firearms_pistol_light') || null;
  if (lower.includes('pistola') || lower.includes('colt') || lower.includes('.45')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'firearms_pistol_heavy') || null;
  if (lower.includes('mitra piccolo') || lower.includes('mac-10')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'firearms_smg_small') || null;
  if (lower.includes('mitra') || lower.includes('mp-5')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'firearms_smg_large') || null;
  if (lower.includes('assalto') || lower.includes('steyr')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'firearms_assault_rifle') || null;
  if (lower.includes('shotgun') || lower.includes('m870') || lower.includes('pompa')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'firearms_shotgun') || null;
  if (lower.includes('winchester') || lower.includes('fucile') || lower.includes('remington')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'firearms_rifle') || null;

  if (lower.includes('molotov') || lower.includes('incendiario')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'explosive_molotov') || null;
  if (lower.includes('concussione')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'explosive_concussion') || null;
  if (lower.includes('frammentazione')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'explosive_frag') || null;
  if (lower.includes('dinamite') || lower.includes('detonazione')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'explosive_dynamite') || null;
  if (lower.includes('plastico') || lower.includes('alto potenziale')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'explosive_plastique') || null;

  if (lower.includes('zann') || lower.includes('mors')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'brawl_fangs') || null;
  if (lower.includes('artigli')) return WOD_WEAPONS_CATALOG.find((w) => w.id === 'brawl_claws') || null;

  return null;
}

/**
 * Cerca un'arma dal catalogo in base al nome (o restituisce un default intelligente se specificamente richiesto un'arma).
 */
export function matchWeaponFromCatalog(weaponName?: string): WodWeapon {
  const match = findWeaponFromText(weaponName);
  if (match) return match;
  return WOD_WEAPONS_CATALOG.find((w) => w.id === 'melee_knife') || WOD_WEAPONS_CATALOG[0];
}

/**
 * Calcola tutti i bonus di Iniziativa derivanti dalla scheda del personaggio:
 * - Attributi base: Destrezza + Autocontrollo
 * - Pregio Riflessi Fulminei (Fast/Lightning Reflexes): +2 (o pallini del pregio)
 * - Lupo Mannaro in forma Urhan: +2 bonus speciale Iniziativa (Compendio Sez. 3.2)
 * - Disciplina Velocità (Celerity): +Livello
 * - Eventuale modifica manuale Master su character.initiativeMod
 */
export function getCharacterInitiativeBreakdown(character: Character): {
  dexterity: number;
  composure: number;
  meritBonus: number;
  powerOrFormBonus: number;
  healthPenalty: number;
  totalMod: number;
  bonusLabels: string[];
} {
  const dex = character.attributes?.dexterity || 2;
  const composure = character.attributes?.composure || character.attributes?.wits || 2;
  const healthPenalty = getHealthPenalty(character.health);
  const bonusLabels: string[] = [];

  // 1. Pregio Riflessi Fulminei (Fast Reflexes)
  const reflexesMerit = (character.meritsFlaws || []).find(
    (m) => m.effectKey === 'lightning_reflexes' || m.name.toLowerCase().includes('riflessi')
  );
  const meritBonus = reflexesMerit ? Math.max(1, reflexesMerit.cost || 2) : 0;
  if (meritBonus > 0) {
    bonusLabels.push(`Riflessi Fulminei (+${meritBonus})`);
  }

  // 2. Bonus Forma Lupina Urhan (+2 extra oltre a Destrezza) o Disciplina Velocità (Celerity)
  let powerOrFormBonus = 0;
  if (character.creatureType === 'werewolf' && character.activeForm === 'urhan') {
    powerOrFormBonus += 2;
    bonusLabels.push('Forma Urhan (+2)');
  }

  const celerityPower = (character.powers || []).find(
    (p) =>
      p.name.toLowerCase().includes('velocità') ||
      p.name.toLowerCase().includes('celerit') ||
      p.name.toLowerCase().includes('riflessi')
  );
  if (celerityPower && celerityPower.level > 0) {
    powerOrFormBonus += celerityPower.level;
    bonusLabels.push(`${celerityPower.name} (+${celerityPower.level})`);
  }

  const calculatedBaseMod = dex + composure + meritBonus + powerOrFormBonus;
  // Se sulla scheda il Master ha impostato un initiativeMod superiore, rispettalo
  const effectiveBaseMod = Math.max(calculatedBaseMod, character.initiativeMod || 0);
  if (effectiveBaseMod > calculatedBaseMod) {
    bonusLabels.push(`Bonus Scheda (+${effectiveBaseMod - calculatedBaseMod})`);
  }

  const totalMod = effectiveBaseMod + healthPenalty;

  return {
    dexterity: dex,
    composure,
    meritBonus,
    powerOrFormBonus,
    healthPenalty,
    totalMod,
    bonusLabels,
  };
}

/**
 * 1. FASE INIZIATIVA CHRONICA D10 ENGINE (Compendio Sez. 1.2 & Schermo)
 * Formula ufficiale: Destrezza + Autocontrollo + Bonus Scheda (Riflessi/Poteri/Forma) + 1d10 + Penalità Ferite.
 */
export function rollInitiative(character: Character): InitiativeResult {
  const breakdown = getCharacterInitiativeBreakdown(character);
  const d10Roll = Math.floor(Math.random() * 10) + 1;

  const total = Math.max(1, breakdown.totalMod + d10Roll);
  const bonusStr =
    breakdown.bonusLabels.length > 0 ? ` + ${breakdown.bonusLabels.join(' + ')}` : '';
  const penaltyStr =
    breakdown.healthPenalty !== 0 ? ` ${breakdown.healthPenalty} (Ferite)` : '';
  const formula = `Destrezza (${breakdown.dexterity}) + Autocontrollo (${breakdown.composure})${bonusStr} + 1d10 [${d10Roll}]${penaltyStr} = ${total}`;

  return {
    total,
    dexterity: breakdown.dexterity,
    wits: breakdown.composure,
    d10Roll,
    healthPenalty: breakdown.healthPenalty,
    formula,
    timestamp: Date.now(),
  };
}

/**
 * 2. CALCOLO DELLA RISERVA D'ATTACCO IN UN SOLO TIRO (STORYTELLING SYSTEM — Compendio Sez. 1.3)
 * Nello Storytelling System NON esiste un tiro separato per i danni:
 * Riserva = (Attributo + Abilità + Dadi Bonus Arma + Modificatori + Volontà) - Difesa Bersaglio - Armatura Bersaglio.
 * Ogni successo ottenuto (>= 8, o 10 sul Tiro di Fortuna) infligge direttamente 1 punto Salute di danno!
 */
export function calculateSingleRollAttackPool(params: {
  character?: Character;
  attrVal: number;
  attrLabel: string;
  abilityVal: number;
  abilityLabel: string;
  weapon?: WodWeapon | null;
  useWeaponInRoll: boolean;
  targetDefense: number;
  targetArmor: number;
  situationalMod: number;
  healthPenalty: number;
  spendWillpower: boolean;
  fireModeBonus?: number;
  fireModeLabel?: string;
  dualWield?: {
    secondaryWeapon: WodWeapon;
    mode: 'combined' | 'flurry';
    isAmbidextrous: boolean;
  };
}): {
  finalPool: number; // Può essere <= 0 (attiva il Tiro di Fortuna / Chance Die!)
  weaponBonus: number;
  strengthPenalty: number;
  effectiveDefensePenalty: number;
  effectiveArmorPenalty: number;
  willpowerBonus: number;
  againThreshold: 8 | 9 | 10;
  damageType: DamageType;
  formulaParts: string[];
  formulaSummary: string;
} {
  const {
    character,
    attrVal,
    attrLabel,
    abilityVal,
    abilityLabel,
    weapon,
    useWeaponInRoll,
    targetDefense,
    targetArmor,
    situationalMod,
    healthPenalty,
    spendWillpower,
    fireModeBonus = 0,
    fireModeLabel,
    dualWield,
  } = params;

  const charStrength = character?.attributes?.strength || 2;
  const weaponBonus = useWeaponInRoll && weapon ? weapon.baseDamage : 0;

  // Bonus e Penalità Doppia Arma (Stile Colpo Incrociato)
  const dualWieldBonus =
    useWeaponInRoll && dualWield && dualWield.mode === 'combined'
      ? Math.max(1, Math.min(dualWield.secondaryWeapon.baseDamage, 2))
      : 0;
  const offHandPenalty =
    useWeaponInRoll && dualWield && dualWield.mode === 'combined' && !dualWield.isAmbidextrous
      ? -2
      : 0;

  // Penalità per Forza inferiore alla Forza minima richiesta dall'arma (-1 dado, Schermo del Narratore)
  const strengthPenalty =
    useWeaponInRoll && weapon && weapon.minStrength && charStrength < weapon.minStrength ? -1 : 0;

  // La Difesa del bersaglio si sottrae in Mischia, Lotta e Armi da Lancio, ma NON contro Armi da Fuoco (Compendio Sez. 1.3)
  const isFirearm = useWeaponInRoll && weapon && weapon.category === 'firearms';
  const effectiveDefensePenalty = isFirearm ? 0 : Math.max(0, targetDefense);

  // Perforare Armatura (es. Stocco ignora 1 punto di armatura)
  const armorPiercing = useWeaponInRoll && weapon?.armorPiercing ? weapon.armorPiercing : 0;
  const effectiveArmorPenalty = Math.max(0, targetArmor - armorPiercing);

  // Spesa di 1 punto Volontà = +3 dadi (Compendio Sez. 1.2)
  const willpowerBonus = spendWillpower ? 3 : 0;

  const finalPool =
    attrVal +
    abilityVal +
    weaponBonus +
    dualWieldBonus +
    offHandPenalty +
    strengthPenalty +
    situationalMod +
    healthPenalty +
    willpowerBonus +
    fireModeBonus -
    effectiveDefensePenalty -
    effectiveArmorPenalty;

  const formulaParts: string[] = [
    `${attrLabel} (${attrVal})`,
    `${abilityLabel} (${abilityVal})`,
  ];

  if (useWeaponInRoll && weapon && weaponBonus > 0) {
    formulaParts.push(`Arma +${weaponBonus}`);
  }
  if (dualWieldBonus > 0) {
    formulaParts.push(`2ª Arma (${dualWield?.secondaryWeapon.name}) +${dualWieldBonus}`);
    if (offHandPenalty < 0) {
      formulaParts.push('Mano Debole (-2)');
    } else {
      formulaParts.push('Ambidestro (0)');
    }
  }
  if (fireModeBonus > 0) {
    formulaParts.push(fireModeLabel || (fireModeBonus === 1 ? 'Raffica Breve (+1)' : 'Svuota Caricatore (+3)'));
  }
  if (strengthPenalty < 0) {
    formulaParts.push(`Forza Insuff. (${strengthPenalty})`);
  }
  if (willpowerBonus > 0) {
    formulaParts.push(`Volontà (+${willpowerBonus})`);
  }
  if (situationalMod !== 0) {
    formulaParts.push(`Manovre (${situationalMod > 0 ? `+${situationalMod}` : situationalMod})`);
  }
  if (healthPenalty !== 0) {
    formulaParts.push(`Ferite (${healthPenalty})`);
  }
  if (effectiveDefensePenalty > 0) {
    formulaParts.push(`Difesa Nemica (-${effectiveDefensePenalty})`);
  }
  if (effectiveArmorPenalty > 0) {
    formulaParts.push(
      `Armatura Nemica (-${effectiveArmorPenalty}${armorPiercing > 0 ? `, Perf. ${armorPiercing}` : ''})`
    );
  }

  const againThreshold: 8 | 9 | 10 =
    useWeaponInRoll && weapon?.againThreshold ? weapon.againThreshold : 10;
  let damageType: DamageType = useWeaponInRoll && weapon ? weapon.damageType : 'bashing';
  if (useWeaponInRoll && dualWield && dualWield.mode === 'combined') {
    if (weapon?.damageType === 'aggravated' || dualWield.secondaryWeapon.damageType === 'aggravated') {
      damageType = 'aggravated';
    } else if (weapon?.damageType === 'lethal' || dualWield.secondaryWeapon.damageType === 'lethal') {
      damageType = 'lethal';
    }
  }

  const poolDisplay =
    finalPool <= 0
      ? `Tiro di Fortuna (1d10 — Riserva ${finalPool})`
      : `${finalPool} Dadi d10 (Soglia 8+)`;

  return {
    finalPool,
    weaponBonus,
    strengthPenalty,
    effectiveDefensePenalty,
    effectiveArmorPenalty,
    willpowerBonus,
    againThreshold,
    damageType,
    formulaParts,
    formulaSummary: `${formulaParts.join(' + ').replace(/\+ -/g, '- ')} = ${poolDisplay}`,
  };
}

/**
 * 3. RILEVAMENTO ARMATURA GENERALE & BALISTICA DEL PERSONAGGIO (Compendio Sez. 1.3 & Tabella Armature)
 * Restituisce:
 * - generalArmor: contro mischia/lotta/lancio
 * - ballisticArmor: contro armi da fuoco
 * - isBulletproof: se vero, converte i danni Letali (X) delle armi da fuoco in Contundenti (/)!
 */
export function getCharacterArmorDetails(character?: Character): {
  armorName: string;
  generalArmor: number;
  ballisticArmor: number;
  isBulletproof: boolean;
} {
  if (!character) {
    return { armorName: 'Nessuna armatura', generalArmor: 0, ballisticArmor: 0, isBulletproof: false };
  }

  const allText = [
    ...(character.inventory || []),
    ...(character.structuredInventory || []).map((i) => `${i.name} ${i.damageOrEffect || ''}`),
  ]
    .join(' ')
    .toLowerCase();

  if (allText.includes('antisommossa')) {
    return { armorName: 'Tenuta Antisommossa (3/4*)', generalArmor: 3, ballisticArmor: 4, isBulletproof: true };
  }
  if (allText.includes('corazza di piastre')) {
    return { armorName: 'Corazza di Piastre (3/2)', generalArmor: 3, ballisticArmor: 2, isBulletproof: false };
  }
  if (allText.includes('giubbotto antiproiettile')) {
    return { armorName: 'Giubbotto Antiproiettile (2/3*)', generalArmor: 2, ballisticArmor: 3, isBulletproof: true };
  }
  if (allText.includes('cotta di maglia')) {
    return { armorName: 'Cotta di Maglia (2/1)', generalArmor: 2, ballisticArmor: 1, isBulletproof: false };
  }
  if (allText.includes('kevlar')) {
    return { armorName: 'Giacca di Kevlar (1/2*)', generalArmor: 1, ballisticArmor: 2, isBulletproof: true };
  }
  if (allText.includes('cuoio')) {
    return { armorName: 'Armatura di Cuoio Rigido (1/0)', generalArmor: 1, ballisticArmor: 0, isBulletproof: false };
  }
  if (allText.includes('abiti spessi') || allText.includes('rinforzati')) {
    return { armorName: 'Abiti Spessi / Rinforzati (1/0)', generalArmor: 1, ballisticArmor: 0, isBulletproof: false };
  }

  const fallback = character.armor || 0;
  return {
    armorName: fallback > 0 ? `Protezione (Valore ${fallback})` : 'Nessuna armatura',
    generalArmor: fallback,
    ballisticArmor: fallback,
    isBulletproof: false,
  };
}

/**
 * 4. APPLICAZIONE FERITE CON SCORRIMENTO E POTENZIAMENTO (OVERFLOW) — Compendio Sez. 1.3
 * Regole Chronica D10 Engine:
 * - Simboli: Contundente (/), Letale (X), Aggravato (*).
 * - Da sinistra a destra: i danni più gravi sono SEMPRE a sinistra (* -> X -> /), facendo scorrere i meno gravi a destra.
 * - Scorrimento / Upgrade quando la barra è piena:
 *   • Barra piena di Contundenti (/) + ulteriore danno Contundente (/) => converte il Contundente (/) più a sinistra in Letale (X)!
 *   • Barra piena con Contundenti (/) + ulteriore danno Letale (X) => converte il Contundente (/) più a sinistra in Letale (X)!
 *   • Barra piena di Letali (X) + ulteriore danno Contundente (/) o Letale (X) => converte il Letale (X) più a sinistra in Aggravato (*)!
 *   • Barra piena di Aggravati (*) => Morte Istantanea!
 * - Penalità azioni: le ultime 3 caselle a destra infliggono -1, -2 e -3 dadi.
 */
export function applyDamageToHealth(
  currentHealth: HealthLevel[],
  points: number,
  damageType: DamageType
): {
  updatedHealth: HealthLevel[];
  woundsMarked: number;
  upgradedWounds: number;
  newPenalty: number;
  isIncapacitated: boolean;
  healthState: 'healthy' | 'injured' | 'unconscious_risk' | 'bleeding_out_or_torpor' | 'dead';
  stateDescription: string;
} {
  const healthCopy: HealthLevel[] = JSON.parse(JSON.stringify(currentHealth));
  const maxBoxes = healthCopy.length;

  // Estrai i danni attualmente presenti come lista ordinata per gravità
  const severityWeight: Record<DamageType, number> = {
    aggravated: 3,
    lethal: 2,
    bashing: 1,
    none: 0,
  };

  let currentDamages: DamageType[] = healthCopy
    .map((h) => h.damage)
    .filter((d) => d !== 'none')
    .sort((a, b) => severityWeight[b] - severityWeight[a]);

  let woundsMarked = 0;
  let upgradedWounds = 0;

  for (let p = 0; p < points; p++) {
    if (currentDamages.length < maxBoxes) {
      // C'è ancora almeno una casella vuota: inserisci il nuovo danno e riordina da sinistra (più grave) a destra (meno grave)
      currentDamages.push(damageType);
      currentDamages.sort((a, b) => severityWeight[b] - severityWeight[a]);
      woundsMarked++;
    } else {
      // BARRA SALUTE PIENA: APPLICAZIONE SCORRIMENTO (OVERFLOW / UPGRADE DEL DANNO — Compendio Sez. 1.3)
      if (damageType === 'bashing' || damageType === 'lethal') {
        // Cerca il primo Contundente (/) più a sinistra da potenziare in Letale (X)
        const firstBashingIdx = currentDamages.findIndex((d) => d === 'bashing');
        if (firstBashingIdx !== -1) {
          currentDamages[firstBashingIdx] = 'lethal';
          currentDamages.sort((a, b) => severityWeight[b] - severityWeight[a]);
          upgradedWounds++;
          woundsMarked++;
        } else {
          // Non ci sono più Contundenti (tutta la barra è piena di Letali o Aggravati):
          // Ulteriori danni Contundenti o Letali convertono il Letale (X) più a sinistra in Aggravato (*)!
          const firstLethalIdx = currentDamages.findIndex((d) => d === 'lethal');
          if (firstLethalIdx !== -1) {
            currentDamages[firstLethalIdx] = 'aggravated';
            currentDamages.sort((a, b) => severityWeight[b] - severityWeight[a]);
            upgradedWounds++;
            woundsMarked++;
          }
        }
      } else if (damageType === 'aggravated') {
        // Un nuovo danno Aggravato (*) su barra piena sostituisce/potenzia il danno meno grave o il primo non-aggravato
        const firstBashingIdx = currentDamages.findIndex((d) => d === 'bashing');
        const firstLethalIdx = currentDamages.findIndex((d) => d === 'lethal');
        if (firstBashingIdx !== -1) {
          currentDamages[firstBashingIdx] = 'aggravated';
          currentDamages.sort((a, b) => severityWeight[b] - severityWeight[a]);
          upgradedWounds++;
          woundsMarked++;
        } else if (firstLethalIdx !== -1) {
          currentDamages[firstLethalIdx] = 'aggravated';
          currentDamages.sort((a, b) => severityWeight[b] - severityWeight[a]);
          upgradedWounds++;
          woundsMarked++;
        }
      }
    }
  }

  // Ricostruisci la barra della Salute da sinistra (indice 0) a destra (indice maxBoxes - 1)
  // e assicurati che le ultime 3 caselle abbiano penalità ufficiali -1, -2, -3
  for (let i = 0; i < maxBoxes; i++) {
    healthCopy[i].damage = currentDamages[i] || 'none';
    const fromRight = maxBoxes - 1 - i;
    if (fromRight === 2) {
      healthCopy[i].penalty = -1;
      healthCopy[i].label = 'Ferito (-1)';
    } else if (fromRight === 1) {
      healthCopy[i].penalty = -2;
      healthCopy[i].label = 'Ferito Grave (-2)';
    } else if (fromRight === 0) {
      healthCopy[i].penalty = -3;
      healthCopy[i].label = 'Incapacitato (-3)';
    } else {
      healthCopy[i].penalty = 0;
      healthCopy[i].label = `Salute (${i + 1})`;
    }
  }

  const newPenalty = getHealthPenalty(healthCopy);
  const isFull = currentDamages.length >= maxBoxes;
  const allAggravated = isFull && currentDamages.every((d) => d === 'aggravated');
  const allLethalOrAggr = isFull && currentDamages.every((d) => d === 'lethal' || d === 'aggravated');

  let healthState: 'healthy' | 'injured' | 'unconscious_risk' | 'bleeding_out_or_torpor' | 'dead' = 'healthy';
  let stateDescription = 'Il personaggio è attivo e operativo.';

  if (allAggravated) {
    healthState = 'dead';
    stateDescription = '💀 Tutte le caselle Salute sono piene di Danni Aggravati (*): Morte Istantanea!';
  } else if (allLethalOrAggr) {
    healthState = 'bleeding_out_or_torpor';
    stateDescription =
      '🩸 Tutte le caselle sono piene di Danni Letali (X): In fin di vita (1 danno letale automatico per turno se non stabilizzato; Torpore se Vampiro)!';
  } else if (isFull) {
    healthState = 'unconscious_risk';
    stateDescription =
      '⚠️ Barra Salute piena con Danni Contundenti (/): Tiro riflesso di Costituzione (Soglia 8+) necessario ogni turno per restare cosciente!';
  } else if (currentDamages.length > 0) {
    healthState = 'injured';
    stateDescription =
      newPenalty < 0
        ? `Ferito con penalità attiva di ${newPenalty} dadi a tutte le riserve di azione.`
        : 'Ferite leggere annotate sulla barra Salute (nessuna penalità ai dadi).';
  }

  return {
    updatedHealth: healthCopy,
    woundsMarked,
    upgradedWounds,
    newPenalty,
    isIncapacitated: isFull,
    healthState,
    stateDescription,
  };
}

/**
 * 5. GUARIGIONE FERITE DALLA BARRA SALUTE (Ordine da destra verso sinistra per tipo di danno)
 */
export function healDamageFromHealth(
  currentHealth: HealthLevel[],
  points: number,
  damageType: DamageType = 'bashing'
): HealthLevel[] {
  const effectiveDamageType: 'bashing' | 'lethal' | 'aggravated' =
    damageType === 'aggravated' || damageType === 'lethal' ? damageType : 'bashing';
  const healthCopy: HealthLevel[] = JSON.parse(JSON.stringify(currentHealth));
  const severityWeight: Record<DamageType, number> = {
    aggravated: 3,
    lethal: 2,
    bashing: 1,
    none: 0,
  };

  let currentDamages: DamageType[] = healthCopy
    .map((h) => h.damage)
    .filter((d) => d !== 'none');

  let remaining = points;
  for (let i = currentDamages.length - 1; i >= 0 && remaining > 0; i--) {
    if (currentDamages[i] === effectiveDamageType) {
      currentDamages.splice(i, 1);
      remaining--;
    }
  }

  currentDamages.sort((a, b) => severityWeight[b] - severityWeight[a]);

  for (let i = 0; i < healthCopy.length; i++) {
    healthCopy[i].damage = currentDamages[i] || 'none';
  }

  return healthCopy;
}

// ============================================================================
// FUNZIONI DI RETROCOMPATIBILITÀ (Mantenute per eventuali riferimenti legacy)
// ============================================================================
export function calculateDamagePool(
  weapon: WodWeapon,
  character: Character,
  netAttackSuccesses: number = 1
): {
  dicePool: number;
  damageType: DamageType;
  formula: string;
  extraDiceFromSuccesses: number;
} {
  const strength = character.attributes?.strength || 2;
  const dicePool = Math.max(1, weapon.baseDamage + (weapon.addStrength ? strength : 0) + Math.max(0, netAttackSuccesses - 1));
  return {
    dicePool,
    damageType: weapon.damageType,
    formula: `Tiro Unico Storytelling System: ${netAttackSuccesses} successi = ${netAttackSuccesses} danni [${weapon.damageType.toUpperCase()}]`,
    extraDiceFromSuccesses: Math.max(0, netAttackSuccesses - 1),
  };
}

export function rollDamage(
  dicePool: number,
  damageType: DamageType,
  weaponName?: string
): DamageRollResult {
  return {
    dicePool,
    dice: [],
    difficulty: 8,
    successes: dicePool,
    damageType,
    weaponName,
    timestamp: Date.now(),
  };
}

export function calculateSoakPool(
  character: Character,
  _damageType: DamageType
): {
  pool: number;
  canSoak: boolean;
  explanation: string;
} {
  const details = getCharacterArmorDetails(character);
  return {
    pool: details.generalArmor,
    canSoak: details.generalArmor > 0 || details.ballisticArmor > 0,
    explanation: `${details.armorName} — Mischia: -${details.generalArmor} dadi | Armi da Fuoco: -${details.ballisticArmor} dadi${details.isBulletproof ? ' (Converte Letale in Contundente)' : ''}`,
  };
}

export function rollSoak(
  character: Character,
  damagePoints: number,
  damageType: DamageType
): SoakRollResult {
  const details = getCharacterArmorDetails(character);
  return {
    dicePool: details.generalArmor,
    dice: [],
    difficulty: 8,
    successes: 0,
    damageType,
    finalDamage: damagePoints,
    timestamp: Date.now(),
  };
}

// ============================================================================
// GESTIONE COMPLETA DELL'ORDINE DI INIZIATIVA DEL COMBATTIMENTO (Schermo del Narratore)
// ============================================================================

export interface CombatantInitiativeEntry {
  id: string;
  name: string;
  isEnemy: boolean;
  dexterity: number;
  composure: number;
  healthPenalty: number;
  initiativeMod: number; // Destrezza + Autocontrollo + Penalità Ferite
  d10Roll: number;
  totalInitiative: number; // 1d10 + initiativeMod
  isDelayed?: boolean;
  hasRolled?: boolean;
}

/**
 * Prepara la lista iniziale dei partecipanti al tavolo prima del tiro dei dadi d'Iniziativa.
 */
export function prepareInitiativeParticipants(params: {
  hostCharacter?: Character;
  connectedPlayers?: { id: string; name: string; character: Character }[];
}): CombatantInitiativeEntry[] {
  const entries: CombatantInitiativeEntry[] = [];

  if (params.hostCharacter) {
    const breakdown = getCharacterInitiativeBreakdown(params.hostCharacter);
    entries.push({
      id: 'host',
      name: params.hostCharacter.name,
      isEnemy: false,
      dexterity: breakdown.dexterity,
      composure: breakdown.composure,
      healthPenalty: breakdown.healthPenalty,
      initiativeMod: breakdown.totalMod,
      d10Roll: 0,
      totalInitiative: 0,
      hasRolled: false,
    });
  }

  for (const p of params.connectedPlayers || []) {
    if (!p.character) continue;
    const breakdown = getCharacterInitiativeBreakdown(p.character);
    entries.push({
      id: p.id,
      name: p.character.name || p.name,
      isEnemy: false,
      dexterity: breakdown.dexterity,
      composure: breakdown.composure,
      healthPenalty: breakdown.healthPenalty,
      initiativeMod: breakdown.totalMod,
      d10Roll: 0,
      totalInitiative: 0,
      hasRolled: false,
    });
  }

  return entries;
}

/**
 * Ordina i partecipanti all'Iniziativa secondo le regole ufficiali dello Storytelling System:
 * 1. Grado di Iniziativa totale più alto (1d10 + Destrezza + Autocontrollo - Ferite)
 * 2. Spareggio 1: Modificatore di Iniziativa base (Destrezza + Autocontrollo) più alto
 * 3. Spareggio 2: Punteggio di Destrezza più alto
 */
export function sortInitiativeOrder(
  entries: CombatantInitiativeEntry[]
): CombatantInitiativeEntry[] {
  return [...entries].sort((a, b) => {
    if (b.totalInitiative !== a.totalInitiative) {
      return b.totalInitiative - a.totalInitiative;
    }
    if (b.initiativeMod !== a.initiativeMod) {
      return b.initiativeMod - a.initiativeMod;
    }
    return b.dexterity - a.dexterity;
  });
}

/**
 * Tira 1d10 + Destrezza + Autocontrollo per tutti i giocatori e i nemici presenti nello scontro.
 */
export function rollCombatInitiativeOrder(params: {
  hostCharacter?: Character;
  connectedPlayers?: { id: string; name: string; character: Character }[];
  enemyNames?: string[];
  existingEnemies?: { id: string; name: string; initiativeMod?: number }[];
  includeEnemies?: boolean;
}): CombatantInitiativeEntry[] {
  const entries: CombatantInitiativeEntry[] = [];

  // 1. Aggiungi il personaggio principale sul PC (se non è già duplicato tra i connessi)
  if (params.hostCharacter && params.hostCharacter.name) {
    const isAlreadyInPlayers = (params.connectedPlayers || []).some(
      (p) => p.character?.name === params.hostCharacter?.name
    );
    if (!isAlreadyInPlayers) {
      const breakdown = getCharacterInitiativeBreakdown(params.hostCharacter);
      const initRes = rollInitiative(params.hostCharacter);
      entries.push({
        id: 'host',
        name: params.hostCharacter.name,
        isEnemy: false,
        dexterity: breakdown.dexterity,
        composure: breakdown.composure,
        healthPenalty: breakdown.healthPenalty,
        initiativeMod: breakdown.totalMod,
        d10Roll: initRes.d10Roll,
        totalInitiative: initRes.total,
        isDelayed: false,
      });
    }
  }

  // 2. Aggiungi i giocatori connessi da smartphone
  for (const p of params.connectedPlayers || []) {
    if (!p.character) continue;
    const breakdown = getCharacterInitiativeBreakdown(p.character);
    const initRes = rollInitiative(p.character);
    entries.push({
      id: p.id,
      name: p.character.name || p.name,
      isEnemy: false,
      dexterity: breakdown.dexterity,
      composure: breakdown.composure,
      healthPenalty: breakdown.healthPenalty,
      initiativeMod: breakdown.totalMod,
      d10Roll: initRes.d10Roll,
      totalInitiative: initRes.total,
      isDelayed: false,
    });
  }

  // 3. Aggiungi i Nemici in scena solo se richiesto esplicitamente
  if (params.includeEnemies) {
    const enemiesToRoll: { id: string; name: string; mod: number }[] = [];
    if (params.existingEnemies && params.existingEnemies.length > 0) {
      params.existingEnemies.forEach((e) => {
        enemiesToRoll.push({
          id: e.id,
          name: e.name,
          mod: e.initiativeMod ?? 5,
        });
      });
    } else if (params.enemyNames && params.enemyNames.length > 0) {
      params.enemyNames.slice(0, 3).forEach((name, idx) => {
        enemiesToRoll.push({
          id: `enemy_${idx + 1}_${Date.now()}`,
          name: name.trim(),
          mod: 5,
        });
      });
    }

    for (const enemy of enemiesToRoll) {
      const d10Roll = Math.floor(Math.random() * 10) + 1;
      const total = Math.max(1, enemy.mod + d10Roll);
      entries.push({
        id: enemy.id,
        name: enemy.name,
        isEnemy: true,
        dexterity: Math.ceil(enemy.mod / 2),
        composure: Math.floor(enemy.mod / 2),
        healthPenalty: 0,
        initiativeMod: enemy.mod,
        d10Roll,
        totalInitiative: total,
        isDelayed: false,
      });
    }
  }

  return sortInitiativeOrder(entries);
}

// ============================================================================
// BESTIARIO UFFICIALE E GESTIONE NEMICI IN COMBATTIMENTO (Scheda, Salute & Tiro Dadi Narratore)
// ============================================================================

export const OFFICIAL_WOD_BESTIARY: EnemySpawnSpec[] = [
  {
    name: 'Guardia / Sgherro Armato',
    creatureType: 'mortal',
    maxHealth: 7,
    defense: 2,
    armor: 1,
    initiativeMod: 4,
    attackPool: 5,
    attackName: 'Manganello / Pistola Leggera',
    damageType: 'lethal',
    notes: 'Combattente umano addestrato base.',
  },
  {
    name: 'Sicario / Agente SWAT',
    creatureType: 'mortal',
    maxHealth: 8,
    defense: 3,
    armor: 2,
    initiativeMod: 6,
    attackPool: 7,
    attackName: 'Fucile d\'Assalto / Coltello Tattico',
    damageType: 'lethal',
    notes: 'Tiratore esperto con giubbotto antiproiettile.',
  },
  {
    name: 'Ghoul Servitore del Sangue',
    creatureType: 'mortal',
    maxHealth: 8,
    defense: 3,
    armor: 1,
    initiativeMod: 5,
    attackPool: 7,
    attackName: 'Vigore Sovrumano + Arma da Mischia',
    damageType: 'lethal',
    notes: 'Potenziato dalla Vitae vampirica (Vigore 1).',
  },
  {
    name: 'Vampiro Neonato (Predatore)',
    creatureType: 'vampire',
    maxHealth: 8,
    defense: 3,
    armor: 1,
    initiativeMod: 6,
    attackPool: 8,
    attackName: 'Zanne / Artigli o Arma Letale',
    damageType: 'lethal',
    notes: 'Proiettili normali infliggono danni Contundenti (/). Può curarsi con la Vitae.',
  },
  {
    name: 'Vampiro Anziano / Ricercato Boss',
    creatureType: 'vampire',
    maxHealth: 10,
    defense: 4,
    armor: 2,
    initiativeMod: 8,
    attackPool: 10,
    attackName: 'Potere di Stirpe / Lama Antica',
    damageType: 'lethal',
    notes: 'Avversario letale con Velocità e Robustezza soprannaturali.',
  },
  {
    name: 'Lupo Mannaro Uratha (Forma Gauru)',
    creatureType: 'werewolf',
    maxHealth: 11,
    defense: 3,
    armor: 1,
    initiativeMod: 7,
    attackPool: 10,
    attackName: 'Artigli (+2L) & Morso (+3L)',
    damageType: 'lethal',
    notes: 'Rigenera 1 danno per turno, ignora penalità ferite. Vulnerabile all\'Argento (*).',
  },
  {
    name: 'Mago Risvegliato Oscuro',
    creatureType: 'mage',
    maxHealth: 7,
    defense: 3,
    armor: 2,
    initiativeMod: 6,
    attackPool: 8,
    attackName: 'Incantesimo Offensivo (Forze/Morte)',
    damageType: 'lethal',
    notes: 'Protetto da Armatura Magica, colpisce a distanza con gli Arcana.',
  },
  {
    name: 'Cacciatore di Mostri Veterano',
    creatureType: 'hunter',
    maxHealth: 8,
    defense: 3,
    armor: 2,
    initiativeMod: 6,
    attackPool: 8,
    attackName: 'Shotgun (9-Again) / Arma Consacrata',
    damageType: 'lethal',
    notes: 'Equipaggiato per sfruttare le debolezze delle creature soprannaturali.',
  },
];

export function createCombatEnemyFromSpec(
  spec: EnemySpawnSpec,
  customId?: string
): ActiveCombatEnemy {
  const maxHealth = Math.max(3, Math.min(18, spec.maxHealth || 7));
  const health: HealthLevel[] = [];

  for (let i = 0; i < maxHealth; i++) {
    const fromRight = maxHealth - 1 - i;
    const penalty = fromRight === 2 ? -1 : fromRight === 1 ? -2 : fromRight === 0 ? -3 : 0;
    const label =
      fromRight === 2
        ? 'Ferito (-1)'
        : fromRight === 1
        ? 'Ferito Grave (-2)'
        : fromRight === 0
        ? 'Incapacitato (-3)'
        : `Salute (${i + 1})`;
    health.push({
      label,
      penalty,
      damage: 'none',
    });
  }

  let attackName = spec.attackName || 'Attacco Ostile';
  const lowerName = (spec.name || '').toLowerCase();
  if (
    attackName.toLowerCase().includes('pistola') ||
    attackName.toLowerCase().includes('manganello') ||
    attackName.toLowerCase().includes('fucile') ||
    attackName === 'Attacco Ostile'
  ) {
    if (lowerName.includes('oni') || lowerName.includes('demone') || lowerName.includes('mostro') || lowerName.includes('spettro')) {
      attackName = 'Maglio Infernale / Artigli Demoniaci';
    } else if (lowerName.includes('ninja') || lowerName.includes('shinobi')) {
      attackName = 'Katana / Shuriken & Veleno';
    } else if (lowerName.includes('samurai') || lowerName.includes('guardia') || lowerName.includes('guerriero') || lowerName.includes('soldat')) {
      attackName = 'Katana d\'Acciaio / Alabarda';
    } else if (lowerName.includes('lupo') || lowerName.includes('fiera') || lowerName.includes('bestia')) {
      attackName = 'Zanne & Artigli Devastanti';
    }
  }

  return {
    id: customId || `enemy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: spec.name || 'Avversario Ostile',
    creatureType: spec.creatureType || 'mortal',
    health,
    maxHealth,
    defense: Math.max(0, spec.defense ?? 2),
    armor: Math.max(0, spec.armor ?? 0),
    initiativeMod: spec.initiativeMod ?? 5,
    attackPool: Math.max(1, spec.attackPool ?? 6),
    attackName,
    damageType: spec.damageType || 'lethal',
    notes: spec.notes,
    isDefeated: false,
  };
}

export function getEnemyHealthStatus(enemy: ActiveCombatEnemy): {
  undamagedBoxes: number;
  bashingCount: number;
  lethalCount: number;
  aggravatedCount: number;
  woundPenalty: number;
  isDefeated: boolean;
  statusText: string;
} {
  const boxes = enemy.health || [];
  let undamagedBoxes = 0;
  let bashingCount = 0;
  let lethalCount = 0;
  let aggravatedCount = 0;

  for (const b of boxes) {
    if (b.damage === 'none') undamagedBoxes++;
    else if (b.damage === 'bashing') bashingCount++;
    else if (b.damage === 'lethal') lethalCount++;
    else if (b.damage === 'aggravated') aggravatedCount++;
  }

  // Un nemico è sconfitto/eliminato quando tutte le caselle sono piene di danni Letali/Aggravati,
  // oppure (se mortale/cacciatore) quando tutte le caselle sono piene anche di Contundenti (svenuto/KO).
  const allBoxesFilled = undamagedBoxes === 0 && boxes.length > 0;
  const allLethalOrAgg = lethalCount + aggravatedCount >= boxes.length && boxes.length > 0;
  const isDefeated =
    Boolean(enemy.isDefeated) ||
    allLethalOrAgg ||
    (allBoxesFilled && (enemy.creatureType === 'mortal' || enemy.creatureType === 'hunter'));

  // I Lupi Mannari in forma Gauru ignorano le penalità da ferita
  const isGauru = enemy.creatureType === 'werewolf' && enemy.name.toLowerCase().includes('gauru');
  const woundPenalty = isGauru ? 0 : getHealthPenalty(boxes);

  let statusText = `In piedi (${undamagedBoxes}/${boxes.length} caselle integre)`;
  if (isDefeated) {
    statusText = allLethalOrAgg ? '💀 ELIMINATO / ABBATTUTO' : '💫 KO / NEUTRALIZZATO';
  } else if (woundPenalty === -3) {
    statusText = `🩸 Barcollante (${undamagedBoxes}/${boxes.length}, penalità -3 dadi)`;
  } else if (woundPenalty < 0) {
    statusText = `🩸 Ferito (${undamagedBoxes}/${boxes.length}, penalità ${woundPenalty} dadi)`;
  }

  return {
    undamagedBoxes,
    bashingCount,
    lethalCount,
    aggravatedCount,
    woundPenalty,
    isDefeated,
    statusText,
  };
}

/**
 * Esegue il tiro di dadi ufficiale del Narratore per l'attacco di un Nemico contro il Giocatore:
 * Riserva Nemico = AttackPool + Penalità Ferite Nemico - Difesa Giocatore (x2 se Schiva!) - Armatura Giocatore
 */
export function rollEnemyAttackAgainstPlayer(params: {
  enemy: ActiveCombatEnemy;
  targetCharacter: Character;
  isPlayerDodging: boolean;
}): {
  rollResult: DiceRollResult;
  updatedCharacter: Character;
  damageDealt: number;
  effectiveDamageType: DamageType;
  formulaSummary: string;
} {
  const { enemy, targetCharacter, isPlayerDodging } = params;
  const enemyStatus = getEnemyHealthStatus(enemy);

  const basePlayerDefense =
    targetCharacter.defense ??
    Math.min(targetCharacter.attributes?.dexterity || 2, targetCharacter.attributes?.wits || 2);
  const effectivePlayerDefense = isPlayerDodging ? basePlayerDefense * 2 : basePlayerDefense;

  const armorDetails = getCharacterArmorDetails(targetCharacter);
  const isRangedFirearm =
    enemy.attackName.toLowerCase().includes('pistola') ||
    enemy.attackName.toLowerCase().includes('fucile') ||
    enemy.attackName.toLowerCase().includes('revolver') ||
    enemy.attackName.toLowerCase().includes('shotgun') ||
    enemy.attackName.toLowerCase().includes('mitra');

  // Nello Storytelling System la Difesa non si sottrae contro le armi da fuoco a meno che il giocatore non stia Schivando attivamente per buttarsi al riparo
  const defenseSubtracted = isRangedFirearm && !isPlayerDodging ? 0 : effectivePlayerDefense;
  const armorSubtracted = isRangedFirearm ? armorDetails.ballisticArmor : armorDetails.generalArmor;

  const finalPool =
    enemy.attackPool + enemyStatus.woundPenalty - defenseSubtracted - armorSubtracted;

  const rollResult = rollD10Pool(
    finalPool,
    8,
    `${enemy.name} (${enemy.attackName})`,
    isPlayerDodging ? 'contro Schivata (Difesa ×2)' : 'contro Difesa Giocatore',
    {
      againThreshold: 10,
      targetDefensePenalty: defenseSubtracted + armorSubtracted,
      isCombatAttack: true,
      damageType: enemy.damageType || 'lethal',
      weaponName: enemy.attackName,
    }
  );

  // Calcola il tipo di danno effettivo (es. armi da fuoco contro Vampiri o Armatura Balistica = Contundente)
  let effectiveDamageType: DamageType = enemy.damageType || 'lethal';
  if (
    isRangedFirearm &&
    effectiveDamageType === 'lethal' &&
    (targetCharacter.creatureType === 'vampire' || armorDetails.ballisticArmor > 0)
  ) {
    effectiveDamageType = 'bashing';
  }

  const damageDealt = Math.max(0, rollResult.netSuccesses);
  rollResult.damageInflicted = damageDealt;
  rollResult.damageType = effectiveDamageType;

  const updatedHealth =
    damageDealt > 0
      ? applyDamageToHealth(targetCharacter.health, damageDealt, effectiveDamageType).updatedHealth
      : targetCharacter.health;

  const updatedCharacter: Character = {
    ...targetCharacter,
    health: updatedHealth,
  };

  const formulaParts = [
    `Attacco ${enemy.attackPool}`,
    enemyStatus.woundPenalty < 0 ? `Ferite Nemico (${enemyStatus.woundPenalty})` : '',
    defenseSubtracted > 0
      ? `Difesa ${targetCharacter.name}${isPlayerDodging ? ' ×2 Schivata' : ''} (-${defenseSubtracted})`
      : '',
    armorSubtracted > 0 ? `Armatura (-${armorSubtracted})` : '',
  ].filter(Boolean);

  return {
    rollResult,
    updatedCharacter,
    damageDealt,
    effectiveDamageType,
    formulaSummary: `${formulaParts.join(' ')} = ${finalPool <= 0 ? 'Tiro di Fortuna (1d10)' : `${finalPool} dadi`}`,
  };
}


