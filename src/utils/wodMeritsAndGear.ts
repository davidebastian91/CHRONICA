import type { MeritFlaw, InventoryItem } from '../types';
import { matchWeaponFromCatalog } from './wodCombatRules';

/**
 * CATALOGO DEI MERITI E DIFETTI CHRONICA D10 ENGINE
 */
export const WOD_MERITS_AND_FLAWS: MeritFlaw[] = [
  // --- MERITI FISICI ---
  {
    id: 'merit_quick_draw',
    name: '⚡ Estrazione Rapida (Quick Draw)',
    type: 'merit',
    cost: 2,
    category: 'physical',
    effectKey: 'quick_draw',
    description:
      'Hai una coordinazione motoria eccezionale: puoi estrarre la tua arma (pistola o lama) come azione GRATUITA e istantanea, senza sprecare l\'azione del turno!',
  },
  {
    id: 'merit_ambidextrous',
    name: '✋ Ambidestro (Ambidextrous)',
    type: 'merit',
    cost: 1,
    category: 'physical',
    effectKey: 'ambidextrous',
    description:
      'Usi la mano secondaria con la stessa naturalezza della mano primaria. Nessuna penalità a combattere con due armi o sparare con la mano debole.',
  },
  {
    id: 'merit_lightning_reflexes',
    name: '⚡ Riflessi Fulminei (Lightning Reflexes)',
    type: 'merit',
    cost: 2,
    category: 'physical',
    effectKey: 'lightning_reflexes',
    description:
      'I tuoi riflessi nervosi sono scattanti: ottieni un bonus permanente di +2 punti al tuo punteggio totale di Iniziativa in ogni scontro.',
  },
  {
    id: 'merit_huge_size',
    name: '🛡️ Taglia Enorme (Huge Size)',
    type: 'merit',
    cost: 4,
    category: 'physical',
    effectKey: 'huge_size',
    description:
      'Sei alto più di due metri e dotato di corporatura massiccia. Ottieni 1 livello di salute "Illeso" addizionale (+1 ferita assorbibile prima delle penalità).',
  },

  // --- MERITI MENTALI E PERCETTIVI ---
  {
    id: 'merit_danger_sense',
    name: '👁️ Senso del Pericolo (Danger Sense)',
    type: 'merit',
    cost: 2,
    category: 'mental',
    effectKey: 'danger_sense',
    description:
      'Un sesto senso ti avverte un istante prima di un agguato: il Narratore ti concede un tiro di Percezione + Allerta prima di ogni imboscata o trappola a sorpresa.',
  },
  {
    id: 'merit_iron_will',
    name: '🧠 Volontà di Ferro (Iron Will)',
    type: 'merit',
    cost: 3,
    category: 'mental',
    effectKey: 'iron_will',
    description:
      'La tua mente è una fortezza: spendendo 1 punto Volontà puoi spezzare automaticamente qualsiasi tentativo di Dominazione o controllo mentale sovrannaturale.',
  },
  {
    id: 'merit_calm_heart',
    name: '🕊️ Cuore Calmo (Calm Heart)',
    type: 'merit',
    cost: 3,
    category: 'mental',
    effectKey: 'calm_heart',
    description:
      'Hai un autocontrollo sovrumano: ricevi +2 dadi a tutti i tiri per resistere alla Frenesia o alle provocazioni esterne.',
  },

  // --- DIFETTI FISICI & MENTALI ---
  {
    id: 'flaw_bad_sight',
    name: '👓 Vista Difettosa (Bad Sight)',
    type: 'flaw',
    cost: -2,
    category: 'physical',
    effectKey: 'bad_sight',
    description:
      'Senza occhiali o lenti a contatto, tutte le tue riserve di dadi per azioni visive e tiri con armi a distanza subiscono -2 dadi di penalità.',
  },
  {
    id: 'flaw_short_fuse',
    name: '🔥 Miccia Corta / Irascibile (Short Fuse)',
    type: 'flaw',
    cost: -2,
    category: 'mental',
    effectKey: 'short_fuse',
    description:
      'Hai la rabbia a fior di pelle e perdi facilmente la calma: la difficoltà di tutti i tuoi tiri di Autocontrollo/Frenesia aumenta di +2!',
  },
  {
    id: 'flaw_nightmares',
    name: '🕷️ Incubi Ricorrenti (Nightmares)',
    type: 'flaw',
    cost: -1,
    category: 'mental',
    effectKey: 'nightmares',
    description:
      'Sogni orrendi tormentano il tuo sonno diurno o notturno: tiri Volontà ogni risveglio o inizi la notte con 1 punto Volontà temporaneo in meno.',
  },
];

/**
 * STRUTTURA DI UN OGGETTO DI PARTENZA SELEZIONABILE (SCHERMO DEL NARRATORE UFFICIALE)
 */
export type ScreenGearCategory = 'melee' | 'ranged' | 'explosive' | 'armor' | 'utility';

export interface ThematicGearOption {
  id: string;
  name: string;
  category: 'weapon' | 'ammo' | 'consumable' | 'gear';
  screenCategory: ScreenGearCategory;
  quantity: number;
  description: string;
  damageOrEffect?: string;
  sizeOrRange?: string;
  minStrength?: number;
  costDots?: string;
  specialRules?: string;
  isEquipped?: boolean;
  armorStats?: {
    meleeValue: number;
    firearmValue: number;
    defensePenalty: number;
    speedPenalty: number;
    bulletproof?: boolean;
  };
  eras?: ('modern' | 'victorian' | 'fantasy')[];
}

/**
 * CATALOGO COMPLETO EQUIPAGGIAMENTO UFFICIALE DELLO SCHERMO DEL NARRATORE
 * Include:
 * - 14 Armi da Mischia (Tabella delle Armi da Mischia)
 * - 10 Armi a Distanza + Munizioni (Tabella delle Armi a Distanza)
 * - 5 Esplosivi (Tabella degli Esplosivi)
 * - 7 Armature Moderne e Antiche (Tabella delle Armature)
 * - 8 Kit & Attrezzi di Supporto (Elenco delle Prove con +equip)
 */
export const ALL_STORYTELLER_GEAR_OPTIONS: ThematicGearOption[] = [
  // =========================================================================
  // 1. TABELLA DELLE ARMI DA MISCHIA (14 ARMI UFFICIALI)
  // =========================================================================
  {
    id: 'screen_melee_sap',
    name: '🔨 Manganello',
    category: 'weapon',
    screenCategory: 'melee',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: '1 (C) Contundente',
    sizeOrRange: 'Taglia 1 (Mano/Tasca)',
    minStrength: 1,
    costDots: '•',
    specialRules: 'Mettere Fuori Combattimento (pag. 168)',
    description: 'Manganello compatto. Danno: 1 (C) | Taglia/Forza: 1 | Costo Risorse: • | Speciale: Mettere Fuori Combattimento.',
    eras: ['modern', 'victorian'],
  },
  {
    id: 'screen_melee_metal_club',
    name: '🏏 Mazza (metallo)',
    category: 'weapon',
    screenCategory: 'melee',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: '3 (C) Contundente',
    sizeOrRange: 'Taglia 2 (Cappotto)',
    minStrength: 2,
    costDots: '••',
    description: 'Mazza pesante in metallo o tubo d\'acciaio. Danno: 3 (C) | Taglia/Forza: 2 | Costo Risorse: ••.',
    eras: ['modern', 'victorian', 'fantasy'],
  },
  {
    id: 'screen_melee_wood_club',
    name: '🪵 Randello (legno)',
    category: 'weapon',
    screenCategory: 'melee',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: '2 (C) Contundente',
    sizeOrRange: 'Taglia 2 (Cappotto)',
    minStrength: 2,
    costDots: 'n/a',
    description: 'Bastone nodoso o mazza di legno. Danno: 2 (C) | Taglia/Forza: 2 | Costo Risorse: n/a (creabile).',
    eras: ['modern', 'victorian', 'fantasy'],
  },
  {
    id: 'screen_melee_brass_knuckles',
    name: '🥊 Tirapugni d\'Ottone',
    category: 'weapon',
    screenCategory: 'melee',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: '1 (C) Contundente',
    sizeOrRange: 'Taglia n/a (Invisibile in pugno)',
    minStrength: 1,
    costDots: '•',
    specialRules: 'Usa l\'Abilità Lotta*',
    description: 'Tirapugni metallico. Danno: 1 (C) | Costo Risorse: • | Speciale: Usa Lotta anziché Armi da Mischia.',
    eras: ['modern', 'victorian'],
  },
  {
    id: 'screen_melee_hatchet',
    name: '🪓 Accetta',
    category: 'weapon',
    screenCategory: 'melee',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: '2 (L) Letale',
    sizeOrRange: 'Taglia 1 (Mano/Cintura)',
    minStrength: 1,
    costDots: '•',
    description: 'Accetta a una mano facile da occultare. Danno: 2 (L) | Taglia/Forza: 1 | Costo Risorse: •.',
    eras: ['modern', 'victorian', 'fantasy'],
  },
  {
    id: 'screen_melee_axe',
    name: '🪓 Ascia†',
    category: 'weapon',
    screenCategory: 'melee',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: '3 (L) Letale',
    sizeOrRange: 'Taglia 3 (Non occultabile)',
    minStrength: 3,
    costDots: '••',
    specialRules: 'Due mani†, Ritira 9 (pag. 134)',
    description: 'Ascia da spacco o da battaglia a due mani. Danno: 3 (L) | Taglia/Forza: 3 | Costo: •• | Speciale: Ritira i 9.',
    eras: ['modern', 'victorian', 'fantasy'],
  },
  {
    id: 'screen_melee_greataxe',
    name: '🪓 Ascia Grande†',
    category: 'weapon',
    screenCategory: 'melee',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: '5 (L) Letale',
    sizeOrRange: 'Taglia 4 (Non occultabile)',
    minStrength: 4,
    costDots: '•••',
    specialRules: 'Due mani†, Ritira 9 (pag. 134)',
    description: 'Enorme bipenne devastante a due mani. Danno: 5 (L) | Taglia/Forza: 4 | Costo: ••• | Speciale: Ritira i 9.',
    eras: ['fantasy', 'victorian'],
  },
  {
    id: 'screen_melee_knife',
    name: '🗡️ Coltello',
    category: 'weapon',
    screenCategory: 'melee',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: '1 (L) Letale',
    sizeOrRange: 'Taglia 1 (Mano/Tasca)',
    minStrength: 1,
    costDots: '•',
    description: 'Coltello da caccia, pugnale o lama a scatto. Danno: 1 (L) | Taglia/Forza: 1 | Costo Risorse: •.',
    eras: ['modern', 'victorian', 'fantasy'],
  },
  {
    id: 'screen_melee_katana',
    name: '⚔️ Katana',
    category: 'weapon',
    screenCategory: 'melee',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: '3 (L) Letale',
    sizeOrRange: 'Taglia 2 (Cappotto)',
    minStrength: 2,
    costDots: '•••',
    specialRules: 'Durezza +1** (non si rompe con facilità)',
    description: 'Spada giapponese magistralmente forgiata. Danno: 3 (L) | Taglia/Forza: 2 | Costo: ••• | Speciale: Durezza +1.',
    eras: ['modern', 'victorian', 'fantasy'],
  },
  {
    id: 'screen_melee_spear',
    name: '🔱 Lancia†',
    category: 'weapon',
    screenCategory: 'melee',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: '3 (L) Letale',
    sizeOrRange: 'Taglia 4 (Non occultabile)',
    minStrength: 4,
    costDots: '•',
    specialRules: 'Due mani†, +1 Difesa**** contro disarmati',
    description: 'Asta lunga con punta forgiata: mantiene a distanza gli avversari. Danno: 3 (L) | Taglia/Forza: 4 | Costo: • | +1 Difesa.',
    eras: ['fantasy', 'victorian'],
  },
  {
    id: 'screen_melee_stake',
    name: '🪵 Paletto*** (Legno)',
    category: 'weapon',
    screenCategory: 'melee',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: '1 (L) Letale',
    sizeOrRange: 'Taglia 1 (Mano/Tasca)',
    minStrength: 1,
    costDots: 'n/a',
    specialRules: 'Mirare al cuore (-4), min. 3 danni per paralizzare un vampiro***',
    description: 'Paletto di frassino appuntito. Danno: 1 (L) | Taglia/Forza: 1 | Costo: n/a | Mirare al cuore (-4, min 3 danni).',
    eras: ['modern', 'victorian', 'fantasy'],
  },
  {
    id: 'screen_melee_sword',
    name: '⚔️ Spada',
    category: 'weapon',
    screenCategory: 'melee',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: '3 (L) Letale',
    sizeOrRange: 'Taglia 2 (Cappotto)',
    minStrength: 2,
    costDots: '••',
    description: 'Spada lunga a una mano o sciabola. Danno: 3 (L) | Taglia/Forza: 2 | Costo Risorse: ••.',
    eras: ['modern', 'victorian', 'fantasy'],
  },
  {
    id: 'screen_melee_greatsword',
    name: '🗡️ Spadone†',
    category: 'weapon',
    screenCategory: 'melee',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: '4 (L) Letale',
    sizeOrRange: 'Taglia 3 (Non occultabile)',
    minStrength: 3,
    costDots: '•••',
    specialRules: 'Richiede due mani† (Forza min 4 se usato a una mano)',
    description: 'Pesante spadone a due mani (Claymore / Zweihänder). Danno: 4 (L) | Taglia/Forza: 3 | Costo Risorse: •••.',
    eras: ['fantasy', 'victorian'],
  },
  {
    id: 'screen_melee_rapier',
    name: '🤺 Stocco',
    category: 'weapon',
    screenCategory: 'melee',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: '2 (L) Letale',
    sizeOrRange: 'Taglia 2 (Cappotto)',
    minStrength: 2,
    costDots: '••',
    specialRules: 'Perforare Armatura 1 (pag. 167)',
    description: 'Lama sottile da affondo chirurgico. Danno: 2 (L) | Taglia/Forza: 2 | Costo: •• | Speciale: Perforare Armatura 1.',
    eras: ['victorian', 'fantasy', 'modern'],
  },
  {
    id: 'screen_melee_shield',
    name: '🛡️ Scudo da Battaglia / Rotella Rinforzata',
    category: 'weapon',
    screenCategory: 'melee',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: 'Bonus Difesa +2 | Danno 1 (C)',
    sizeOrRange: 'Taglia 2 (Braccio)',
    minStrength: 2,
    costDots: '••',
    specialRules: 'Concede +2 alla Difesa contro attacchi fisici e proiettili/frecce',
    description: 'Scudo in legno rinforzato con borchie o ferro. Danno: 1 (C) Percussione | Difesa: +2 | Taglia: 2 | Forza: 2 | Costo: ••.',
    eras: ['fantasy', 'victorian'],
  },
  {
    id: 'screen_melee_tactical_shield',
    name: '🛡️ Scudo Tattico Balistico Antisommossa',
    category: 'weapon',
    screenCategory: 'melee',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: 'Copertura Balistica Mobile (+3 Difesa)',
    sizeOrRange: 'Taglia 3 (Avanzata tattica)',
    minStrength: 3,
    costDots: '••••',
    specialRules: 'Copertura Balistica Mobile contro armi da fuoco',
    description: 'Scudo trasparente antiproiettile ad alta resistenza per irruzioni. Danno: 1 (C) | Copertura: +3 Difesa | Forza: 3 | Costo: ••••.',
    eras: ['modern'],
  },

  // =========================================================================
  // 2. TABELLA DELLE ARMI A DISTANZA & MUNIZIONI (10 ARMI + 3 MUNIZIONI)
  // =========================================================================
  {
    id: 'screen_ranged_revolver_light',
    name: '🔫 Revolver Leggero — SW M640 (.38 Special)',
    category: 'weapon',
    screenCategory: 'ranged',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: '2 (L) Letale',
    sizeOrRange: 'Gittata 20/40/80m | Car. 6 | Taglia 1',
    minStrength: 2,
    costDots: '••',
    description: 'Revolver compatto e affidabile (.38 Special). Danno: 2 (L) | Gittata: 20/40/80m | Caricatore: 6 | Forza: 2 | Taglia: 1 | Costo: ••.',
    eras: ['modern', 'victorian'],
  },
  {
    id: 'screen_ranged_revolver_heavy',
    name: '💥 Revolver Pesante — Colt Peacemaker .45 / S&W .44',
    category: 'weapon',
    screenCategory: 'ranged',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: '3 (L) Letale',
    sizeOrRange: 'Gittata 35/70/140m | Car. 6 | Taglia 1',
    minStrength: 3,
    costDots: '••',
    description: 'Revolver di grosso calibro (.45 Colt Peacemaker / S&W .44). Danno: 3 (L) | Gittata: 35/70/140m | Caricatore: 6 | Forza: 3 | Taglia: 1 | Costo: ••.',
    eras: ['modern', 'victorian'],
  },
  {
    id: 'screen_ranged_pistol_light',
    name: '🔫 Pistola Leggera — Glock 17 (9mm)',
    category: 'weapon',
    screenCategory: 'ranged',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: '2 (L) Letale',
    sizeOrRange: 'Gittata 20/40/80m | Car. 17+1 | Taglia 1',
    minStrength: 2,
    costDots: '•••',
    description: 'Semiautomatica leggera ad alta capacità (Glock 17 9mm). Danno: 2 (L) | Gittata: 20/40/80m | Caricatore: 17+1 | Forza: 2 | Taglia: 1 | Costo: •••.',
    eras: ['modern'],
  },
  {
    id: 'screen_ranged_pistol_heavy',
    name: '🔫 Pistola Pesante — Colt M1911A1 (.45 ACP)',
    category: 'weapon',
    screenCategory: 'ranged',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: '3 (L) Letale',
    sizeOrRange: 'Gittata 30/60/120m | Car. 7+1 | Taglia 1',
    minStrength: 3,
    costDots: '•••',
    description: 'Semiautomatica pesante d\'ordinanza (Colt M1911A1 .45 ACP). Danno: 3 (L) | Gittata: 30/60/120m | Caricatore: 7+1 | Forza: 3 | Taglia: 1 | Costo: •••.',
    eras: ['modern', 'victorian'],
  },
  {
    id: 'screen_ranged_rifle',
    name: '🎯 Fucile† — Remington M-700 (30.06)',
    category: 'weapon',
    screenCategory: 'ranged',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: '5 (L) Letale',
    sizeOrRange: 'Gittata 200/400/800m | Car. 5+1 | Taglia 3',
    minStrength: 2,
    costDots: '••',
    specialRules: 'Richiede due mani†',
    description: 'Fucile da caccia o di precisione a lunga gittata. Danno: 5 (L) | Gittata: 200/400/800m | Caricatore: 5+1 | Forza: 2 | Taglia: 3 | Costo: ••.',
    eras: ['modern', 'victorian'],
  },
  {
    id: 'screen_ranged_smg_small',
    name: '🔫 Mitra Piccolo* — Ingram Mac-10 (9mm)',
    category: 'weapon',
    screenCategory: 'ranged',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: '2 (L) Letale (Fuoco Auto*)',
    sizeOrRange: 'Gittata 25/50/100m | Car. 30+1 | Taglia 1',
    minStrength: 2,
    costDots: '•••',
    specialRules: 'Fuoco Automatico* (Raffica Breve +1, Media +2, Lunga +3)',
    description: 'Pistola mitragliatrice compatta occultabile. Danno: 2 (L) | Gittata: 25/50/100m | Caricatore: 30+1 | Forza: 2 | Taglia: 1 | Costo: •••.',
    eras: ['modern'],
  },
  {
    id: 'screen_ranged_smg_large',
    name: '🔫 Mitra Grande*† — HK MP-5 (9mm)',
    category: 'weapon',
    screenCategory: 'ranged',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: '3 (L) Letale (Fuoco Auto*)',
    sizeOrRange: 'Gittata 50/100/200m | Car. 30+1 | Taglia 2',
    minStrength: 3,
    costDots: '•••',
    specialRules: 'Due mani†, Fuoco Automatico* (Raffica Breve/Media/Lunga)',
    description: 'Mitra tattico di precisione (HK MP-5). Danno: 3 (L) | Gittata: 50/100/200m | Caricatore: 30+1 | Forza: 3 | Taglia: 2 | Costo: •••.',
    eras: ['modern'],
  },
  {
    id: 'screen_ranged_assault_rifle',
    name: '🎯 Fucile d\'Assalto*† — Steyr-Aug (5.56mm)',
    category: 'weapon',
    screenCategory: 'ranged',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: '4 (L) Letale (Fuoco Auto*)',
    sizeOrRange: 'Gittata 150/300/600m | Car. 42+1 | Taglia 3',
    minStrength: 3,
    costDots: '•••',
    specialRules: 'Due mani†, Fuoco Automatico* (Raffica Breve/Media/Lunga)',
    description: 'Fucile d\'assalto militare automatico (5.56mm). Danno: 4 (L) | Gittata: 150/300/600m | Caricatore: 42+1 | Forza: 3 | Taglia: 3 | Costo: •••.',
    eras: ['modern'],
  },
  {
    id: 'screen_ranged_shotgun',
    name: '💥 Shotgun† — Remington M870 (12-gauge)',
    category: 'weapon',
    screenCategory: 'ranged',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: '4 (L) Letale (Ritira 9***)',
    sizeOrRange: 'Gittata 20/40/80m | Car. 5+1 | Taglia 2',
    minStrength: 3,
    costDots: '••',
    specialRules: 'Due mani†, Ritira 9*** (9-Again)',
    description: 'Fucile a pompa o doppietta calibro 12. Danno: 4 (L) Ritira 9 | Gittata: 20/40/80m | Caricatore: 5+1 | Forza: 3 | Taglia: 2 | Costo: ••.',
    eras: ['modern', 'victorian'],
  },
  {
    id: 'screen_ranged_crossbow',
    name: '🏹 Balestra**†',
    category: 'weapon',
    screenCategory: 'ranged',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: '3 (L) Letale',
    sizeOrRange: 'Gittata 40/80/160m | Car. 1 | Taglia 3',
    minStrength: 3,
    costDots: '•••',
    specialRules: 'Due mani†, Ricarica 3 turni**, Può impalettare (-4 al cuore, min 3 danni)',
    description: 'Balestra silenziosa ad alta penetrazione. Danno: 3 (L) | Gittata: 40/80/160m | Caricatore: 1 | Forza: 3 | Taglia: 3 | Costo: •••.',
    eras: ['modern', 'victorian', 'fantasy'],
  },
  {
    id: 'screen_ranged_heavy_mg',
    name: '🔫 Mitragliatrice Pesante di Supporto*† — M60 / Minimi (7.62 / 5.56mm)',
    category: 'weapon',
    screenCategory: 'ranged',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: '5 (L) Letale (Raffica Pesante / Soppressione*)',
    sizeOrRange: 'Gittata 200/400/800m | Nastro 100 colpi | Taglia 3',
    minStrength: 3,
    costDots: '••••',
    specialRules: 'Due mani†, Fuoco Automatico & Soppressione ad area (pag. 160)',
    description: 'Mitragliatrice di squadra per fuoco di supporto pesante continuo. Danno: 5 (L) | Gittata: 200/400/800m | Nastro: 100 colpi | Forza: 3 | Taglia: 3 | Costo: ••••.',
    eras: ['modern'],
  },
  {
    id: 'screen_ranged_sniper_rifle',
    name: '🎯 Fucile da Cecchino di Precisione† — Barrett .50 / L96 (Ottica Telemetrica)',
    category: 'weapon',
    screenCategory: 'ranged',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: '5 (L) Letale (Perforante / Mirino +2*)',
    sizeOrRange: 'Gittata 250/500/1000m | Car. 5+1 | Taglia 3',
    minStrength: 3,
    costDots: '••••',
    specialRules: 'Due mani†, Mirare concede +2 dadi addizionali, ignora 1 punto armatura',
    description: 'Fucile di precisione per tiratori scelti con ottica balistica ad alto ingrandimento. Danno: 5 (L) | Gittata: 250/500/1000m | Forza: 3 | Taglia: 3 | Costo: ••••.',
    eras: ['modern', 'victorian'],
  },
  {
    id: 'screen_ranged_bow',
    name: '🏹 Arco Composito / Lungo da Guerra†',
    category: 'weapon',
    screenCategory: 'ranged',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: '3 (L) Letale',
    sizeOrRange: 'Gittata 50/100/200m | Car. 1 | Taglia 3',
    minStrength: 2,
    costDots: '••',
    specialRules: 'Due mani†, Silenzioso, basato su Forza',
    description: 'Arco da guerra in legno e corno per cacciatori e tiratori. Danno: 3 (L) | Gittata: 50/100/200m | Forza: 2 | Taglia: 3 | Costo: ••.',
    eras: ['fantasy', 'victorian', 'modern'],
  },
  {
    id: 'screen_ammo_heavy_mg_belt',
    name: '📦 Nastro / Cassetta Munizioni Pesanti (x100 colpi)',
    category: 'ammo',
    screenCategory: 'ranged',
    quantity: 100,
    costDots: '••',
    sizeOrRange: 'Taglia 2 (Cassetta)',
    description: 'Nastro da 100 cartucce calibro pesante (7.62mm NATO / 5.56mm) per armi di supporto.',
    eras: ['modern'],
  },
  {
    id: 'screen_ammo_sniper_pack',
    name: '📦 Cartucce di Precisione / Calibro Pesante (x10)',
    category: 'ammo',
    screenCategory: 'ranged',
    quantity: 10,
    costDots: '••',
    sizeOrRange: 'Taglia 1 (Giberna)',
    description: 'Munizioni selezionate da cecchino ad alta penetrazione per tiri a lunghissimo raggio.',
    eras: ['modern', 'victorian'],
  },
  {
    id: 'screen_ammo_arrows',
    name: '🏹 Faretra con Frecce da Guerra (x20)',
    category: 'ammo',
    screenCategory: 'ranged',
    quantity: 20,
    costDots: '•',
    sizeOrRange: 'Taglia 2 (Faretra)',
    description: '20 frecce bilanciate con cocca e punte d\'acciaio temprato per archi storici o tradizionali.',
    eras: ['fantasy', 'victorian'],
  },
  {
    id: 'screen_ammo_pistol_pack',
    name: '📦 Munizioni Pistola / Revolver (x30)',
    category: 'ammo',
    screenCategory: 'ranged',
    quantity: 30,
    costDots: '•',
    sizeOrRange: 'Taglia 1 (Tasca)',
    description: 'Scatola di cartucce di scorta cal. .45 Peacemaker, .38 Special, .44 o 9mm per ricaricare armi corte.',
    eras: ['modern', 'victorian'],
  },
  {
    id: 'screen_ammo_rifle_shotgun_pack',
    name: '📦 Cartucce Fucile / Shotgun Cal. 12 (x20)',
    category: 'ammo',
    screenCategory: 'ranged',
    quantity: 20,
    costDots: '•',
    sizeOrRange: 'Taglia 1 (Giberna)',
    description: 'Confezione da 20 cartucce per fucile (30.06 / 5.56mm) o pallettoni calibro 12 per Shotgun.',
    eras: ['modern', 'victorian'],
  },
  {
    id: 'screen_ammo_crossbow_bolts',
    name: '🏹 Faretra di Dardi per Balestra (x12)',
    category: 'ammo',
    screenCategory: 'ranged',
    quantity: 12,
    costDots: '•',
    sizeOrRange: 'Taglia 2 (Faretra)',
    description: '12 dardi con punta d\'acciaio e asta in legno massiccio (utilizzabili anche per impalettare).',
    eras: ['modern', 'victorian', 'fantasy'],
  },

  // =========================================================================
  // 3. TABELLA DEGLI ESPLOSIVI (5 ESPLOSIVI UFFICIALI)
  // =========================================================================
  {
    id: 'screen_explosive_molotov',
    name: '🍾 Incendiario* — Molotov',
    category: 'weapon',
    screenCategory: 'explosive',
    quantity: 2,
    damageOrEffect: 'Danno 2 (C) + Fuoco Letale*',
    sizeOrRange: 'Mod. Lancio -1 | Area 2m | Taglia 1',
    costDots: 'n/a',
    specialRules: 'Appicca fuoco al bersaglio (danno esplosione contundente, fuoco letale)',
    description: 'Bottiglia incendiaria artigianale. Mod. al Lancio: -1 | Area di Esplosione: 2m | Danno: 2 (C) + Fuoco (L) | Taglia: 1 | Costo: n/a.',
    eras: ['modern', 'victorian', 'fantasy'],
  },
  {
    id: 'screen_explosive_concussion',
    name: '💣 Concussione** — Granata a Concussione†',
    category: 'weapon',
    screenCategory: 'explosive',
    quantity: 2,
    damageOrEffect: 'Danno 4 (C) Contundente + Atterramento**',
    sizeOrRange: 'Mod. Lancio +2 | Area 3m | Taglia 1',
    costDots: '•••',
    specialRules: 'Aerodinamica (+2 lancio)†, infligge danni contundenti e getta a terra il bersaglio (pag. 168)',
    description: 'Granata stordente/concussiva. Mod. al Lancio: +2 | Area di Esplosione: 3m | Danno: 4 (C) + Atterramento | Taglia: 1 | Costo: •••.',
    eras: ['modern'],
  },
  {
    id: 'screen_explosive_frag',
    name: '💣 Frammentazione — Granata a Frammentazione†',
    category: 'weapon',
    screenCategory: 'explosive',
    quantity: 2,
    damageOrEffect: 'Danno 4 (L) Letale',
    sizeOrRange: 'Mod. Lancio +2 | Area 3m | Taglia 1',
    costDots: '•••',
    specialRules: 'Esplosivo aerodinamico quando viene lanciato (+2 al tiro)',
    description: 'Granata militare a schegge. Mod. al Lancio: +2 | Area di Esplosione: 3m | Danno: 4 (L) | Taglia: 1 | Costo: •••.',
    eras: ['modern'],
  },
  {
    id: 'screen_explosive_dynamite',
    name: '🧨 Detonazione Singola — Candelotto di Dinamite',
    category: 'weapon',
    screenCategory: 'explosive',
    quantity: 2,
    damageOrEffect: 'Danno 4+ (L) Letale',
    sizeOrRange: 'Mod. Lancio +1 | Area 4m | Taglia 1',
    costDots: '•••',
    specialRules: 'Miccia accendibile o detonatore singolo',
    description: 'Candelotto di nitroglicerina/dinamite. Mod. al Lancio: +1 | Area di Esplosione: 4m | Danno: 4+ (L) | Taglia: 1 | Costo: •••.',
    eras: ['modern', 'victorian'],
  },
  {
    id: 'screen_explosive_plastique',
    name: '🧨 Alto Potenziale*** — Plastico (C4)',
    category: 'weapon',
    screenCategory: 'explosive',
    quantity: 1,
    damageOrEffect: 'Danno 6+ (L) Letale (Demolizione)',
    sizeOrRange: 'Mod. Lancio n/a | Area 20+m | Taglia 1-3',
    costDots: '••••',
    specialRules: 'Non lanciabile (n/a): bomba a tempo o a innesco contro strutture e veicoli***',
    description: 'Carica di esplosivo plastico ad alto potenziale. Mod. Lancio: n/a | Area: 20+m | Danno: 6+ (L) | Taglia: 1-3 | Costo: ••••.',
    eras: ['modern'],
  },

  // =========================================================================
  // 4. TABELLA DELLE ARMATURE (4 MODERNE + 3 ANTICHE UFFICIALI)
  // =========================================================================
  {
    id: 'screen_armor_reinforced_clothes',
    name: '🧥 Abiti spessi / rinforzati (Armatura Moderna)',
    category: 'gear',
    screenCategory: 'armor',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: 'Valore Armatura: 1 (Mischia) / 0 (Fuoco)',
    sizeOrRange: 'Forza min: 1 | Difesa: 0 | Velocità: 0',
    minStrength: 1,
    costDots: 'n/a',
    armorStats: { meleeValue: 1, firearmValue: 0, defensePenalty: 0, speedPenalty: 0, bulletproof: false },
    description: 'Giacca di pelle pesante o cappotto rinforzato. Valore: 1/0 | Forza: 1 | Penalità Difesa: 0 | Penalità Velocità: 0 | Costo: n/a.',
    eras: ['modern', 'victorian', 'fantasy'],
  },
  {
    id: 'screen_armor_kevlar_jacket',
    name: '🛡️ Giacca di kevlar* (sottile)',
    category: 'gear',
    screenCategory: 'armor',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: 'Valore Armatura: 1 (Mischia) / 2 (Fuoco)*',
    sizeOrRange: 'Forza min: 1 | Difesa: 0 | Velocità: 0',
    minStrength: 1,
    costDots: '•',
    specialRules: 'A prova di proiettile*: declassa i danni da Armi da Fuoco da Letali a Contundenti',
    armorStats: { meleeValue: 1, firearmValue: 2, defensePenalty: 0, speedPenalty: 0, bulletproof: true },
    description: 'Sottogiacca balistico leggero senza penalità ai movimenti. Valore: 1/2 | Forza: 1 | Difesa: 0 | Velocità: 0 | Costo: •.',
    eras: ['modern'],
  },
  {
    id: 'screen_armor_flak_vest',
    name: '🛡️ Giubbotto antiproiettile*',
    category: 'gear',
    screenCategory: 'armor',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: 'Valore Armatura: 2 (Mischia) / 3 (Fuoco)*',
    sizeOrRange: 'Forza min: 1 | Difesa: -1 | Velocità: 0',
    minStrength: 1,
    costDots: '••',
    specialRules: 'A prova di proiettile*: declassa i danni da Armi da Fuoco da Letali a Contundenti',
    armorStats: { meleeValue: 2, firearmValue: 3, defensePenalty: -1, speedPenalty: 0, bulletproof: true },
    description: 'Giubbotto tattico balistico completo. Valore: 2/3 | Forza: 1 | Penalità Difesa: -1 | Penalità Velocità: 0 | Costo: ••.',
    eras: ['modern'],
  },
  {
    id: 'screen_armor_riot_gear',
    name: '🛡️ Tenuta antisommossa*',
    category: 'gear',
    screenCategory: 'armor',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: 'Valore Armatura: 3 (Mischia) / 4 (Fuoco)*',
    sizeOrRange: 'Forza min: 2 | Difesa: -2 | Velocità: -1',
    minStrength: 2,
    costDots: '•••',
    specialRules: 'A prova di proiettile*: declassa i danni da Armi da Fuoco da Letali a Contundenti',
    armorStats: { meleeValue: 3, firearmValue: 4, defensePenalty: -2, speedPenalty: -1, bulletproof: true },
    description: 'Corazza integrale SWAT / Antisommossa con casco. Valore: 3/4 | Forza: 2 | Penalità Difesa: -2 | Penalità Velocità: -1 | Costo: •••.',
    eras: ['modern'],
  },
  {
    id: 'screen_armor_hard_leather',
    name: '🥋 Cuoio (rigido) (Armatura Antica)',
    category: 'gear',
    screenCategory: 'armor',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: 'Valore Armatura: 1 (Mischia) / 0 (Fuoco)',
    sizeOrRange: 'Forza min: 2 | Difesa: -1 | Velocità: 0',
    minStrength: 2,
    costDots: '•',
    armorStats: { meleeValue: 1, firearmValue: 0, defensePenalty: -1, speedPenalty: 0, bulletproof: false },
    description: 'Armatura in cuoio bollito e indurito. Valore: 1/0 | Forza: 2 | Penalità Difesa: -1 | Penalità Velocità: 0 | Costo: •.',
    eras: ['fantasy', 'victorian'],
  },
  {
    id: 'screen_armor_chainmail',
    name: '⛓️ Cotta di maglia (Armatura Antica)',
    category: 'gear',
    screenCategory: 'armor',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: 'Valore Armatura: 2 (Mischia) / 1 (Fuoco)',
    sizeOrRange: 'Forza min: 3 | Difesa: -2 | Velocità: -2',
    minStrength: 3,
    costDots: '••',
    armorStats: { meleeValue: 2, firearmValue: 1, defensePenalty: -2, speedPenalty: -2, bulletproof: false },
    description: 'Usbergo di anelli d\'acciaio intrecciati. Valore: 2/1 | Forza: 3 | Penalità Difesa: -2 | Penalità Velocità: -2 | Costo: ••.',
    eras: ['fantasy', 'victorian'],
  },
  {
    id: 'screen_armor_plate',
    name: '🛡️ Corazza di Piastre (Armatura Antica)',
    category: 'gear',
    screenCategory: 'armor',
    quantity: 1,
    isEquipped: true,
    damageOrEffect: 'Valore Armatura: 3 (Mischia) / 2 (Fuoco)',
    sizeOrRange: 'Forza min: 4 | Difesa: -2 | Velocità: -3',
    minStrength: 4,
    costDots: '••••',
    armorStats: { meleeValue: 3, firearmValue: 2, defensePenalty: -2, speedPenalty: -3, bulletproof: false },
    description: 'Armatura completa in piastre d\'acciaio forgiato. Valore: 3/2 | Forza: 4 | Penalità Difesa: -2 | Penalità Velocità: -3 | Costo: ••••.',
    eras: ['fantasy'],
  },

  // =========================================================================
  // 5. KIT, STRUMENTI & UTILITÀ (PROVE DELLO SCHERMO CON "+EQUIP")
  // =========================================================================
  {
    id: 'screen_util_medkit',
    name: '🩹 Kit Medico / Pronto Soccorso (+equip Curare Ferite)',
    category: 'consumable',
    screenCategory: 'utility',
    quantity: 2,
    costDots: '•',
    damageOrEffect: 'Bonus +1/+2 a DES o INT + Medicina',
    description: 'Bende, antisettici e strumenti chirurgici per la prova ufficiale "Curare Ferite" (DES o INT + Medicina + equip).',
    eras: ['modern', 'victorian', 'fantasy'],
  },
  {
    id: 'screen_util_lockpicks',
    name: '🔑 Grimaldelli & Kit Scasso (+equip Scassinare / Sicurezza)',
    category: 'gear',
    screenCategory: 'utility',
    quantity: 1,
    costDots: '••',
    damageOrEffect: 'Permette/Bonus a DES + Criminalità',
    description: 'Strumenti di precisione per le prove ufficiali "Scassinare" ed "Eludere Sistemi Sicurezza" (DES + Criminalità + equip).',
    eras: ['modern', 'victorian', 'fantasy'],
  },
  {
    id: 'screen_util_investigative_kit',
    name: '🔍 Kit Investigativo / Forense (+equip Esaminare Scena)',
    category: 'gear',
    screenCategory: 'utility',
    quantity: 1,
    costDots: '••',
    damageOrEffect: 'Bonus +1/+2 a PRONT + Investigare',
    description: 'Lente, guanti, polveri per impronte o reagenti per la prova ufficiale "Esaminare Scena" (PRONT + Investigare + equip).',
    eras: ['modern', 'victorian'],
  },
  {
    id: 'screen_util_repair_tools',
    name: '🛠️ Cassetta Attrezzi / Artigiano (+equip Riparare Oggetti)',
    category: 'gear',
    screenCategory: 'utility',
    quantity: 1,
    costDots: '•',
    damageOrEffect: 'Bonus +1/+2 a DES + Manualità',
    description: 'Utensili meccanici e di precisione per la prova ufficiale "Riparare Oggetti" (DES + Manualità + equip).',
    eras: ['modern', 'victorian', 'fantasy'],
  },
  {
    id: 'screen_util_climbing_gear',
    name: '🪢 Corda Robusta & Rampino (+equip Arrampicarsi)',
    category: 'gear',
    screenCategory: 'utility',
    quantity: 1,
    costDots: '•',
    damageOrEffect: 'Bonus +1/+2 a FOR + Atletica',
    description: '15 metri di corda ad alta tenuta, imbrago e rampino per la prova ufficiale "Arrampicarsi" (FOR + Atletica + equip).',
    eras: ['modern', 'victorian', 'fantasy'],
  },
  {
    id: 'screen_util_light_source',
    name: '🔦 Torcia Tattica / Lanterna Schermabile',
    category: 'gear',
    screenCategory: 'utility',
    quantity: 1,
    costDots: '•',
    damageOrEffect: 'Annulla penalità di buio/oscurità',
    description: 'Fonte di illuminazione affidabile per esplorare ambienti bui, sotterranei e scene del crimine notturne.',
    eras: ['modern', 'victorian', 'fantasy'],
  },
  {
    id: 'screen_util_computer_hacker',
    name: '💻 Terminale Cifrato / Kit Hacker (+equip Pirateria Informatica)',
    category: 'gear',
    screenCategory: 'utility',
    quantity: 1,
    costDots: '•••',
    damageOrEffect: 'Bonus +1/+2 a INT + Informatica',
    description: 'Portatile protetto e sniffer di rete per la prova ufficiale "Pirateria Informatica" (INT + Informatica + equip) e "Ricerche Accademiche".',
    eras: ['modern'],
  },
  {
    id: 'screen_util_survival_pack',
    name: '🧭 Kit di Sopravvivenza & Foraggiamento (+equip Foraggiamento)',
    category: 'gear',
    screenCategory: 'utility',
    quantity: 1,
    costDots: '•',
    damageOrEffect: 'Bonus +1/+2 a PRONT + Sopravvivenza',
    description: 'Bussola, acciarino, borraccia e razioni per la prova ufficiale "Foraggiamento" (PRONT + Sopravvivenza + equip).',
    eras: ['modern', 'victorian', 'fantasy'],
  },
];

export const THEMATIC_STARTING_GEAR_CATALOG: Record<string, ThematicGearOption[]> = {
  fantasy: ALL_STORYTELLER_GEAR_OPTIONS.filter((g) => g.eras?.includes('fantasy')),
  victorian: ALL_STORYTELLER_GEAR_OPTIONS.filter((g) => g.eras?.includes('victorian')),
  modern: ALL_STORYTELLER_GEAR_OPTIONS.filter((g) => g.eras?.includes('modern')),
  all: ALL_STORYTELLER_GEAR_OPTIONS,
};

/**
 * Restituisce l'intero catalogo ufficiale dello Schermo del Narratore,
 * oppure filtra per epoca se onlyEraMatched è true.
 */
export function getStartingGearForEra(era?: string, onlyEraMatched: boolean = false): ThematicGearOption[] {
  if (!onlyEraMatched || !era) {
    return ALL_STORYTELLER_GEAR_OPTIONS;
  }
  const lower = era.toLowerCase();

  if (
    lower.includes('fantasy') ||
    lower.includes('dark_ages') ||
    lower.includes('medieval') ||
    lower.includes('myths') ||
    lower.includes('antico') ||
    lower.includes('feudal') ||
    lower.includes('imperial')
  ) {
    return THEMATIC_STARTING_GEAR_OPTIONS_BY_ERA('fantasy');
  }

  if (
    lower.includes('victorian') ||
    lower.includes('rinascim') ||
    lower.includes('pirat') ||
    lower.includes('wild_west') ||
    lower.includes('ottocento')
  ) {
    return THEMATIC_STARTING_GEAR_OPTIONS_BY_ERA('victorian');
  }

  return THEMATIC_STARTING_GEAR_OPTIONS_BY_ERA('modern');
}

function THEMATIC_STARTING_GEAR_OPTIONS_BY_ERA(eraKey: 'modern' | 'victorian' | 'fantasy'): ThematicGearOption[] {
  return ALL_STORYTELLER_GEAR_OPTIONS.filter((g) => !g.eras || g.eras.includes(eraKey));
}

/**
 * Calcola il valore Armatura e le eventuali penalità di Difesa/Velocità in base alle armature scelte
 */
export function getCharacterArmorStatsFromGear(selectedIds: string[]): {
  armorValue: number;
  armorFirearmValue: number;
  defensePenalty: number;
  speedPenalty: number;
  armorName?: string;
} {
  const chosenArmors = ALL_STORYTELLER_GEAR_OPTIONS.filter(
    (g) => selectedIds.includes(g.id) && g.screenCategory === 'armor' && g.armorStats
  );
  if (chosenArmors.length === 0) {
    return { armorValue: 0, armorFirearmValue: 0, defensePenalty: 0, speedPenalty: 0 };
  }
  // Prende l'armatura più protettiva selezionata
  const best = chosenArmors.reduce((prev, curr) =>
    (curr.armorStats!.meleeValue + curr.armorStats!.firearmValue) >
    (prev.armorStats!.meleeValue + prev.armorStats!.firearmValue)
      ? curr
      : prev
  );
  return {
    armorValue: best.armorStats!.meleeValue,
    armorFirearmValue: best.armorStats!.firearmValue,
    defensePenalty: best.armorStats!.defensePenalty,
    speedPenalty: best.armorStats!.speedPenalty,
    armorName: best.name,
  };
}

/**
 * Converte le opzioni di equipaggiamento selezionate in oggetti di tipo InventoryItem per la scheda
 */
export function convertGearOptionToInventoryItem(option: ThematicGearOption): InventoryItem {
  const item: InventoryItem = {
    id: `item_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    name: option.name,
    category: option.category,
    quantity: option.quantity,
    description: option.description,
    damageOrEffect: option.damageOrEffect,
    isEquipped: option.isEquipped,
  };

  if (option.category === 'weapon') {
    item.weaponStats = matchWeaponFromCatalog(option.name);
  }

  return item;
}

/**
 * Deduce in modo intelligente e universale (in base a Epoca e Ruolo/Concetto del personaggio)
 * gli ID dell'equipaggiamento ideale dal catalogo ufficiale dello Schermo del Narratore.
 */
export function deduceStartingGearForCastCharacter(char: any, era?: string): string[] {
  if (!char) return ['screen_ranged_revolver_heavy', 'screen_ammo_pistol_pack', 'screen_melee_knife', 'screen_armor_reinforced_clothes'];

  const matchedIds: string[] = [];
  const textToScan = `${char.name || ''} ${char.concept || ''} ${char.factionOrClan || ''} ${char.notes || ''} ${char.backgroundNotes || ''}`.toLowerCase();
  const eraLower = (era || '').toLowerCase();
  const isFantasyOrAncient = eraLower.includes('fantasy') || eraLower.includes('medieval') || eraLower.includes('dark_ages') || eraLower.includes('antico') || eraLower.includes('feudal');
  const isVictorianOrWest = eraLower.includes('victorian') || eraLower.includes('west') || eraLower.includes('ottocento') || eraLower.includes('pirat');

  // 1. Se il personaggio ha già un inventario strutturato o testuale importato da documento
  const rawItems: string[] = [];
  if (Array.isArray(char.structuredInventory)) {
    char.structuredInventory.forEach((it: any) => {
      if (it.name) rawItems.push(it.name.toLowerCase());
      if (it.description) rawItems.push(it.description.toLowerCase());
    });
  }
  if (Array.isArray(char.inventory)) {
    char.inventory.forEach((it: any) => {
      if (typeof it === 'string') rawItems.push(it.toLowerCase());
      else if (it?.name) rawItems.push(it.name.toLowerCase());
    });
  }

  // Se l'inventario contiene già armi/oggetti specifici, cerchiamo di mapparli nel catalogo
  if (rawItems.length > 0) {
    const combinedInv = rawItems.join(' ');
    if (/mitragliatrice|supporto|heavy\s*gun|m60|minimi|lmg/i.test(combinedInv)) {
      matchedIds.push('screen_ranged_heavy_mg', 'screen_ammo_heavy_mg_belt');
    }
    if (/cecchino|sniper|precisione|barrett|l96/i.test(combinedInv)) {
      matchedIds.push('screen_ranged_sniper_rifle', 'screen_ammo_sniper_pack');
    }
    if (/arco|frecc|bow/i.test(combinedInv)) {
      matchedIds.push('screen_ranged_bow', 'screen_ammo_arrows');
    }
    if (/balestra|dardo|crossbow/i.test(combinedInv)) {
      matchedIds.push('screen_ranged_crossbow', 'screen_ammo_crossbow_bolts');
    }
    if (/fucile d'assalto|m4|m16|kalashnikov|ak-47|steyr|aug/i.test(combinedInv)) {
      matchedIds.push('screen_ranged_assault_rifle', 'screen_ammo_rifle_shotgun_pack');
    }
    if (/shotgun|pompa|doppietta|spas/i.test(combinedInv)) {
      matchedIds.push('screen_ranged_shotgun', 'screen_ammo_rifle_shotgun_pack');
    }
    if (/plastico|c4|esplosiv|detonator/i.test(combinedInv)) {
      matchedIds.push('screen_explosive_plastique');
    }
    if (/granat.*framm|bomba.*mano/i.test(combinedInv)) {
      matchedIds.push('screen_explosive_frag');
    }
    if (/medico|medkit|pronto soccorso|bende|trauma/i.test(combinedInv)) {
      matchedIds.push('screen_util_medkit');
    }
    if (/scudo.*balistico|scudo.*tattico/i.test(combinedInv)) {
      matchedIds.push('screen_melee_tactical_shield');
    } else if (/scudo|rotella/i.test(combinedInv)) {
      matchedIds.push('screen_melee_shield');
    }
    if (/spadone|claymore|zweihander/i.test(combinedInv)) {
      matchedIds.push('screen_melee_greatsword');
    } else if (/spada|katana/i.test(combinedInv)) {
      matchedIds.push(combinedInv.includes('katana') ? 'screen_melee_katana' : 'screen_melee_sword');
    }
    if (/ascia/i.test(combinedInv)) {
      matchedIds.push(combinedInv.includes('grande') ? 'screen_melee_greataxe' : 'screen_melee_axe');
    }
    if (/giubbotto.*antiproiettile|tattico|flak/i.test(combinedInv)) {
      matchedIds.push('screen_armor_flak_vest');
    } else if (/kevlar/i.test(combinedInv)) {
      matchedIds.push('screen_armor_kevlar_jacket');
    } else if (/piastre/i.test(combinedInv)) {
      matchedIds.push('screen_armor_plate');
    } else if (/maglia|usbergo/i.test(combinedInv)) {
      matchedIds.push('screen_armor_chainmail');
    } else if (/cuoio/i.test(combinedInv)) {
      matchedIds.push('screen_armor_hard_leather');
    }
  }

  // 2. Se ancora vuoto o parziale, deduciamo dal RUOLO / CONCETTO del personaggio:
  if (matchedIds.length === 0) {
    // Ruolo: Supporto / Mitragliere Pesante
    if (/mitragliere|supporto|heavy\s*gun|armi\s*pesanti|gunner/i.test(textToScan)) {
      matchedIds.push(
        'screen_ranged_heavy_mg',
        'screen_ammo_heavy_mg_belt',
        'screen_armor_flak_vest',
        'screen_ranged_pistol_heavy'
      );
    }
    // Ruolo: Tiratore Scelto / Cecchino
    else if (/cecchino|tiratore|sniper|marksman|precisione/i.test(textToScan)) {
      if (isFantasyOrAncient) {
        matchedIds.push('screen_ranged_bow', 'screen_ammo_arrows', 'screen_melee_knife', 'screen_armor_hard_leather');
      } else {
        matchedIds.push(
          'screen_ranged_sniper_rifle',
          'screen_ammo_sniper_pack',
          'screen_armor_kevlar_jacket',
          'screen_ranged_pistol_light'
        );
      }
    }
    // Ruolo: Medico / Supporto Sanitario
    else if (/medico|medica|dottore|sanitario|medic|chirurgo/i.test(textToScan)) {
      matchedIds.push(
        'screen_util_medkit',
        isFantasyOrAncient ? 'screen_melee_knife' : 'screen_ranged_pistol_light',
        isFantasyOrAncient ? 'screen_armor_hard_leather' : 'screen_armor_kevlar_jacket'
      );
    }
    // Ruolo: Granatiere / Esperto Esplosivi / Demolizioni
    else if (/granatiere|esplosiv|demolizion|c4|sabotatore/i.test(textToScan)) {
      matchedIds.push(
        'screen_explosive_plastique',
        'screen_explosive_frag',
        'screen_ranged_assault_rifle',
        'screen_ammo_rifle_shotgun_pack',
        'screen_armor_flak_vest'
      );
    }
    // Ruolo: Capitano / Ufficiale / Comandante
    else if (/capitano|leader|comandante|ufficiale|sergente/i.test(textToScan)) {
      if (isFantasyOrAncient) {
        matchedIds.push('screen_melee_sword', 'screen_melee_shield', 'screen_armor_chainmail', 'screen_melee_knife');
      } else {
        matchedIds.push(
          'screen_ranged_assault_rifle',
          'screen_ammo_rifle_shotgun_pack',
          'screen_ranged_pistol_heavy',
          'screen_armor_flak_vest'
        );
      }
    }
    // Ruolo: Fuciliere / Assaltatore / Soldato
    else if (/fuciliere|assalto|soldato|militare|fanteria/i.test(textToScan)) {
      if (isFantasyOrAncient) {
        matchedIds.push('screen_melee_sword', 'screen_melee_shield', 'screen_armor_chainmail');
      } else {
        matchedIds.push(
          'screen_ranged_assault_rifle',
          'screen_ammo_rifle_shotgun_pack',
          'screen_armor_flak_vest',
          'screen_melee_knife'
        );
      }
    }
    // Ruolo: Cavaliere / Paladino / Guardiano Antico
    else if (/cavaliere|knight|paladino|crociato|guardia/i.test(textToScan)) {
      matchedIds.push('screen_melee_sword', 'screen_melee_shield', 'screen_armor_plate', 'screen_melee_knife');
    }
    // Ruolo: Arciere / Cacciatore / Ranger
    else if (/arciere|archer|ranger|esploratore|cacciatore/i.test(textToScan)) {
      if (isFantasyOrAncient) {
        matchedIds.push('screen_ranged_bow', 'screen_ammo_arrows', 'screen_melee_knife', 'screen_armor_hard_leather');
      } else {
        matchedIds.push('screen_ranged_rifle', 'screen_ammo_rifle_shotgun_pack', 'screen_melee_knife', 'screen_armor_reinforced_clothes');
      }
    }
    // Ruolo: Samurai / Guerriero Orientale
    else if (/samurai|ronin|bushi/i.test(textToScan)) {
      matchedIds.push('screen_melee_katana', 'screen_melee_knife', 'screen_armor_hard_leather');
    }
    // Ruolo: Ninja / Shinobi / Spia
    else if (/ninja|shinobi|spia|assassino|sicario/i.test(textToScan)) {
      matchedIds.push('screen_melee_katana', 'screen_melee_knife', 'screen_util_lockpicks');
    }
    // Ruolo: Hacker / Informatico / Tecnico
    else if (/informatica|hacker|tecnico|computer/i.test(textToScan)) {
      matchedIds.push('screen_util_laptop', 'screen_ranged_pistol_light', 'screen_ammo_pistol_pack');
    }
    // Ruolo: Investigatore / Detective / Poliziotto
    else if (/detective|investigatore|poliziotto|ispettore/i.test(textToScan)) {
      matchedIds.push('screen_ranged_pistol_heavy', 'screen_ammo_pistol_pack', 'screen_armor_kevlar_jacket', 'screen_melee_sap');
    }
    // Ruolo: Pistolero / Bandito Wild West
    else if (isVictorianOrWest || /pistolero|cowboy|fuorilegge|sceriffo/i.test(textToScan)) {
      matchedIds.push('screen_ranged_revolver_heavy', 'screen_ammo_pistol_pack', 'screen_ranged_rifle', 'screen_armor_reinforced_clothes');
    }
    // Default generico equilibrato
    else {
      if (isFantasyOrAncient) {
        matchedIds.push('screen_melee_sword', 'screen_armor_hard_leather', 'screen_melee_knife');
      } else {
        matchedIds.push('screen_ranged_pistol_heavy', 'screen_ammo_pistol_pack', 'screen_melee_knife', 'screen_armor_reinforced_clothes');
      }
    }
  }

  // Rimuovi duplicati e assicurati che esistano nel catalogo
  const uniqueIds = Array.from(new Set(matchedIds)).filter((id) =>
    ALL_STORYTELLER_GEAR_OPTIONS.some((g) => g.id === id)
  );

  return uniqueIds.length > 0
    ? uniqueIds
    : ['screen_ranged_revolver_heavy', 'screen_ammo_pistol_pack', 'screen_melee_knife', 'screen_armor_reinforced_clothes'];
}


