import type { Character, CreatureType, HealthLevel } from '../types';
import { calculateDerivedTraits } from './traitLabels';
import {
  ALL_STORYTELLER_GEAR_OPTIONS,
  convertGearOptionToInventoryItem,
  getCharacterArmorStatsFromGear,
} from './wodMeritsAndGear';

export const DEFAULT_HEALTH_LEVELS: HealthLevel[] = [
  { label: 'Salute (1)', penalty: 0, damage: 'none' },
  { label: 'Salute (2)', penalty: 0, damage: 'none' },
  { label: 'Salute (3)', penalty: 0, damage: 'none' },
  { label: 'Salute (4)', penalty: 0, damage: 'none' },
  { label: 'Ferito (-1)', penalty: -1, damage: 'none' },
  { label: 'Ferito Grave (-2)', penalty: -2, damage: 'none' },
  { label: 'Incapacitato (-3)', penalty: -3, damage: 'none' },
];

export interface CharacterArchetype {
  id: string;
  label: string;
  description: string;
  concept: string;
  primaryAttrs: Record<string, number>;
  primaryAbilities: Record<string, number>;
}

export const WOD_CREATION_LIMITS = {
  ATTRIBUTES: {
    BASE_PER_TRAIT: 1,
    MAX_PER_TRAIT: 5,
    POOL_PRIMARY: 5,
    POOL_SECONDARY: 4,
    POOL_TERTIARY: 3,
    TOTAL_EXTRA_POINTS: 12, // 5 + 4 + 3 (Regola Chronica Engine)
  },
  ABILITIES: {
    BASE_PER_TRAIT: 0,
    MAX_INITIAL_PER_TRAIT: 5,
    MAX_PER_TRAIT: 5,
    POOL_PRIMARY: 11,
    POOL_SECONDARY: 7,
    POOL_TERTIARY: 4,
    TOTAL_POINTS: 22, // 11 + 7 + 4 (Regola Chronica Engine)
    SPECIALTIES: 3,
  },
  MERITS: 7, // 7 Punti Pregi iniziali (il 5° pallino in qualsiasi area costa 2 punti)
  MORALITY_STARTING: 7, // Moralità / Umanità / Armonia / Saggezza iniziale = 7
  STARTING_POWERS: 3, // Discipline per Vampiri / Doni per Lupi / Arcana per Maghi
};

export const PLAYER_ARCHETYPES: CharacterArchetype[] = [
  {
    id: 'gunslinger',
    label: 'Tiratore Scelto / Pistolero',
    description: 'Riflessi fulminei, precisione letale con armi da fuoco o archi',
    concept: 'Pistolero & Tiratore di Precisione',
    primaryAttrs: {
      strength: 2,
      dexterity: 4,
      stamina: 2,
      presence: 2,
      manipulation: 2,
      composure: 3,
      intelligence: 2,
      wits: 3,
      resolve: 2,
    },
    primaryAbilities: { firearms: 3, athletics: 2, stealth: 2, composure: 2, streetwise: 2 },
  },
  {
    id: 'brawler',
    label: 'Combattente / Assaltatore',
    description: 'Forza d\'impatto, armi da mischia, lame e scontro corpo a corpo',
    concept: 'Veterano di Battaglia & Combattente',
    primaryAttrs: {
      strength: 4,
      dexterity: 3,
      stamina: 3,
      presence: 2,
      manipulation: 1,
      composure: 2,
      intelligence: 1,
      wits: 3,
      resolve: 2,
    },
    primaryAbilities: { brawl: 3, weaponry: 3, athletics: 2, survival: 2 },
  },
  {
    id: 'infiltrator',
    label: 'Furtivo / Infiltratore',
    description: 'Ombre, serrature, sensi affilati e colpi a sorpresa',
    concept: 'Ombra Silenziosa & Infiltratore',
    primaryAttrs: {
      strength: 2,
      dexterity: 4,
      stamina: 2,
      presence: 2,
      manipulation: 2,
      composure: 3,
      intelligence: 2,
      wits: 3,
      resolve: 2,
    },
    primaryAbilities: { stealth: 3, larceny: 3, investigation: 2, streetwise: 2 },
  },
  {
    id: 'scholar',
    label: 'Mistico / Erudito dell\'Occulto',
    description: 'Sapienza arcana, rituali antichi e decifrazione dei misteri',
    concept: 'Studioso dell\'Occulto & Alchimista',
    primaryAttrs: {
      strength: 1,
      dexterity: 2,
      stamina: 2,
      presence: 2,
      manipulation: 2,
      composure: 3,
      intelligence: 4,
      wits: 3,
      resolve: 3,
    },
    primaryAbilities: { occult: 3, investigation: 3, academics: 3, science: 2 },
  },
  {
    id: 'negotiator',
    label: 'Diplomatico / Negoziatore',
    description: 'Presenza magnetica, persuasione, sotterfugi e alleanze',
    concept: 'Negoziatore & Mediatore',
    primaryAttrs: {
      strength: 1,
      dexterity: 2,
      stamina: 2,
      presence: 4,
      manipulation: 3,
      composure: 3,
      intelligence: 2,
      wits: 3,
      resolve: 2,
    },
    primaryAbilities: { persuasion: 3, subterfuge: 3, empathy: 2, socialize: 3 },
  },
];

export function createDefaultCharacter(
  type: CreatureType = 'vampire',
  customName?: string,
  customConcept?: string,
  customFaction?: string,
  customGearIds?: string[]
): Character {
  let clanOrFaction = customFaction || 'Signori del Sangue';
  let energyName = 'Riserva Vitale';
  let powers = [
    { name: 'Volontà Dominante', level: 1, description: 'Comando mentale o fascino istantaneo' },
    { name: 'Robustezza Inumana', level: 1, description: 'Resistenza elevata ai danni e all\'impatto' },
    { name: 'Presenza Soggiogante', level: 1, description: 'Terrore o ammirazione incontrollabile' },
  ];

  let defaultName = 'Valerius Cross';
  let defaultConcept = 'Lord della Notte & Nobile Occulto';
  let defaultVirtue = 'Prudenza';
  let defaultVice = 'Orgoglio';
  let defaultGearIds = [
    'screen_ranged_pistol_light',
    'screen_ammo_pistol_pack',
    'screen_melee_knife',
    'screen_armor_kevlar_jacket',
    'screen_util_light_source',
  ];

  if (type === 'werewolf') {
    clanOrFaction = customFaction || 'Branco degli Artigli da Guerra';
    energyName = 'Furia Primordiale';
    powers = [
      { name: 'Lacerazione Ferina', level: 1, description: 'Attacchi fisici devastanti a mani nude o zanne' },
      { name: 'Sensi del Predatore', level: 1, description: 'Tracciamento a distanza e percezione acuita' },
    ];
    defaultName = 'Torak Zanna-Rossa';
    defaultConcept = 'Guerriero Mutaforma & Cacciatore';
    defaultVirtue = 'Fortezza';
    defaultVice = 'Ira';
    defaultGearIds = [
      'screen_melee_katana',
      'screen_melee_knife',
      'screen_armor_reinforced_clothes',
      'screen_util_survival_pack',
      'screen_util_medkit',
    ];
  } else if (type === 'mage') {
    clanOrFaction = customFaction || 'Ordine delle Forze Elementali';
    energyName = 'Riserva Arcana';
    powers = [
      { name: 'Manipolazione delle Forze', level: 2, description: 'Controllo di calore, energia cinetica, luce o campi elettrici' },
      { name: 'Trama dell\'Origine', level: 1, description: 'Lettura delle correnti energetiche e canalizzazione poteri' },
    ];
    defaultName = 'Aurelius Thorne';
    defaultConcept = 'Mistico delle Forze Arcane';
    defaultVirtue = 'Fede';
    defaultVice = 'Orgoglio';
    defaultGearIds = [
      'screen_melee_sword',
      'screen_melee_knife',
      'screen_armor_reinforced_clothes',
      'screen_util_investigative_kit',
      'screen_util_medkit',
    ];
  } else if (type === 'hunter') {
    clanOrFaction = customFaction || 'Veterani della Prima Linea';
    energyName = 'Impeto Tattico';
    powers = [
      { name: 'Addestramento Tattico Avanzato', level: 1, description: 'Precisione balistica e riflessi sotto fuoco nemico' },
      { name: 'Volontà Incrollabile', level: 1, description: 'Resistenza al panico e alle coercizioni mentali' },
    ];
    defaultName = 'Cole Cassidy';
    defaultConcept = 'Veterano di Battaglia & Tiratore Scelto';
    defaultVirtue = 'Giustizia';
    defaultVice = 'Ira';
    defaultGearIds = [
      'screen_ranged_revolver_heavy',
      'screen_ammo_pistol_pack',
      'screen_melee_knife',
      'screen_armor_reinforced_clothes',
      'screen_util_medkit',
      'screen_util_light_source',
    ];
  } else if (type === 'mortal') {
    clanOrFaction = customFaction || 'Compagnia Investigativa Indipendente';
    energyName = 'Determinazione';
    powers = [
      { name: 'Intuizione Investigativa', level: 1, description: 'Cogliere dettagli occulti o prove celate' },
      { name: 'Sangue Freddo', level: 1, description: 'Mantenere la lucidità nello shock o nel pericolo' },
    ];
    defaultName = 'Marcus Reed';
    defaultConcept = 'Investigatore Indipendente & Consulente';
    defaultVirtue = 'Speranza';
    defaultVice = 'Prudenza';
    defaultGearIds = [
      'screen_ranged_revolver_light',
      'screen_ammo_pistol_pack',
      'screen_melee_sap',
      'screen_armor_reinforced_clothes',
      'screen_util_investigative_kit',
      'screen_util_light_source',
    ];
  }

  const activeGearIds = customGearIds && customGearIds.length > 0 ? customGearIds : defaultGearIds;
  const chosenGearOptions = ALL_STORYTELLER_GEAR_OPTIONS.filter((g) => activeGearIds.includes(g.id));
  const structuredInventory = chosenGearOptions.map(convertGearOptionToInventoryItem);
  const armorStats = getCharacterArmorStatsFromGear(activeGearIds);

  const attrs = {
    // Mentali
    intelligence: 3,
    wits: 2,
    resolve: 2,
    // Fisici
    strength: 2,
    dexterity: 3,
    stamina: 2,
    // Sociali
    presence: 2,
    manipulation: 2,
    composure: 3,
    // Retrocompatibilità
    charisma: 2,
    appearance: 2,
    perception: 2,
  };

  const size = 5;
  const maxHealth = attrs.stamina + size; // Formula ufficiale: Costituzione + Taglia (5) = 7
  const maxWillpower = attrs.resolve + attrs.composure; // Formula ufficiale: Fermezza + Autocontrollo = 5
  const defense = Math.min(attrs.dexterity, attrs.wits); // Valore più basso tra Destrezza e Prontezza = 2
  const initiativeMod = attrs.dexterity + attrs.composure; // Destrezza + Autocontrollo = 6
  const speed = attrs.strength + attrs.dexterity + 5; // Forza + Destrezza + 5 = 10

  // Genera i quadratini di salute con le penalità ufficiali Compendio Sez. 1.3: gli ultimi tre sono -1, -2, -3
  const healthLevels: HealthLevel[] = [];
  for (let i = 0; i < maxHealth; i++) {
    const fromEnd = maxHealth - 1 - i;
    if (fromEnd === 0) {
      healthLevels.push({ label: 'Incapacitato (-3)', penalty: -3, damage: 'none' });
    } else if (fromEnd === 1) {
      healthLevels.push({ label: 'Ferito Grave (-2)', penalty: -2, damage: 'none' });
    } else if (fromEnd === 2) {
      healthLevels.push({ label: 'Ferito (-1)', penalty: -1, damage: 'none' });
    } else {
      healthLevels.push({ label: `Salute (${i + 1})`, penalty: 0, damage: 'none' });
    }
  }

  return {
    id: `char_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: customName?.trim() || defaultName,
    concept: customConcept?.trim() || defaultConcept,
    creatureType: type,
    factionOrClan: clanOrFaction,

    // Psicologia Ufficiale Storytelling System
    virtue: defaultVirtue,
    vice: defaultVice,
    nature: defaultVirtue,
    demeanor: defaultVice,
    generationOrRank: type === 'vampire' ? 'Potenza del Sangue 1' : 'Rango 1',

    // Matrice Attributi 3x3
    attributes: attrs,

    // Le 24 Abilità Ufficiali (8 Mentali, 8 Fisiche, 8 Sociali)
    abilities: {
      // Mentali
      academics: 2,
      computer: 1,
      investigation: 2,
      crafts: 0,
      medicine: 1,
      occult: 2,
      politics: 1,
      science: 1,

      // Fisiche
      firearms: 2,
      weaponry: 1,
      athletics: 2,
      larceny: 1,
      stealth: 2,
      drive: 1,
      brawl: 1,
      survival: 1,

      // Sociali
      animalKen: 0,
      streetwise: 2,
      empathy: 2,
      expression: 1,
      intimidation: 1,
      persuasion: 2,
      socialize: 1,
      subterfuge: 2,

      // Retrocompatibilità
      alertness: 2,
      dodge: 2,
      melee: 1,
      security: 1,
      etiquette: 1,
    },

    powers,
    meritsFlaws: [
      {
        id: 'merit_quick_draw',
        name: '⚡ Estrazione Rapida (Quick Draw)',
        type: 'merit',
        cost: 1,
        category: 'physical',
        effectKey: 'quick_draw',
        description: 'Estrai la tua arma come azione gratuita istantanea!',
      },
    ],

    experience: {
      current: 0,
      total: 0,
      history: [],
    },

    // Tratti derivati esatti
    size,
    speed: Math.max(1, speed + armorStats.speedPenalty),
    defense: Math.max(0, defense + armorStats.defensePenalty),
    initiativeMod,
    armor: armorStats.armorValue,
    morality: 7,
    humanity: 7,

    willpower: {
      current: maxWillpower,
      max: maxWillpower,
    },
    bloodOrEnergy: {
      name: energyName,
      current: type === 'vampire' ? 10 : 7,
      max: type === 'vampire' ? 10 : 7,
    },

    // Stirpi
    bloodPotency: type === 'vampire' ? 1 : undefined,
    primalUrge: type === 'werewolf' ? 1 : undefined,
    gnosis: type === 'mage' ? 1 : undefined,
    activeForm: type === 'werewolf' ? 'hishu' : undefined,

    health: healthLevels,
    structuredInventory,
    inventory: structuredInventory.map((i) => i.name),
    notes: 'Pronto per la cronaca.',
  };
}

export function createCustomPlayerCharacter(
  name: string,
  creatureType: CreatureType,
  archetypeId: string,
  customClan?: string
): Character {
  const base = createDefaultCharacter(creatureType, name);
  const arch = PLAYER_ARCHETYPES.find((a) => a.id === archetypeId) || PLAYER_ARCHETYPES[0];

  base.concept = arch.concept;
  if (customClan?.trim()) {
    base.factionOrClan = customClan.trim();
  }

  // Applica attributi prioritari dell'archetipo
  for (const [attr, val] of Object.entries(arch.primaryAttrs)) {
    if ((base.attributes as any)[attr] !== undefined) {
      (base.attributes as any)[attr] = val;
    }
  }

  // Applica abilità prioritarie dell'archetipo
  for (const [abil, val] of Object.entries(arch.primaryAbilities)) {
    if ((base.abilities as any)[abil] !== undefined) {
      (base.abilities as any)[abil] = val;
    }
  }

  // Ricalcola tratti derivati Chronica D10 Engine
  const derived = calculateDerivedTraits(base.attributes, base.size || 5);
  base.defense = derived.defense;
  base.initiativeMod = derived.initiativeMod;
  base.speed = derived.speed;
  base.willpower = { current: derived.willpowerMax, max: derived.willpowerMax };

  const healthLevels: HealthLevel[] = [];
  for (let i = 0; i < derived.healthMax; i++) {
    const fromEnd = derived.healthMax - 1 - i;
    if (fromEnd === 0) {
      healthLevels.push({ label: 'Incapacitato (-3)', penalty: -3, damage: 'none' });
    } else if (fromEnd === 1) {
      healthLevels.push({ label: 'Ferito Grave (-2)', penalty: -2, damage: 'none' });
    } else if (fromEnd === 2) {
      healthLevels.push({ label: 'Ferito (-1)', penalty: -1, damage: 'none' });
    } else {
      healthLevels.push({ label: `Salute (${i + 1})`, penalty: 0, damage: 'none' });
    }
  }
  base.health = healthLevels;

  return base;
}

export const QUICK_START_SCENARIOS = [
  {
    city: 'Tombstone, Arizona (1881)',
    era: 'wild_west',
    eraLabel: 'Far West / Frontiera Americana',
    creature: 'hunter' as const,
    characterName: 'Cole "Occhio Morto" Cassidy',
    characterConcept: 'Pistolero Solitario & Cacciatore di Taglie',
    faction: 'Cacciatore di Taglie',
    enemies: ['Banda di Fuorilegge Non-Morti', 'Spiriti della Gola di Roccia'],
    tone: 'action' as const,
    startingGearIds: [
      'screen_ranged_revolver_heavy',
      'screen_ammo_pistol_pack',
      'screen_melee_knife',
      'screen_explosive_dynamite',
      'screen_armor_reinforced_clothes',
      'screen_util_medkit',
    ],
    hook: 'Il sole di mezzogiorno cuoce la terra rossa e la polvere della main street. Hai una stella d\'argento sul gilet, un pesante revolver Colt Peacemaker .45 caricato e la taglia sulla testa del bandito più temuto del territorio: un uomo che dicono sia morto tre volte senza mai finire sottoterra.',
  },
  {
    city: 'Kyoto, Giappone (Epoca Sengoku 1582)',
    era: 'feudal_japan',
    eraLabel: 'Giappone Feudale / Sengoku',
    creature: 'werewolf' as const,
    characterName: 'Hayate Kazamatsuri',
    characterConcept: 'Rōnin & Guerriero dello Spirito Hengeyokai',
    faction: 'Stirpe degli Hengeyokai',
    enemies: ['Ninja al servizio dello Shogun corrotto', 'Demoni Oni della montagna'],
    tone: 'epic_adventure' as const,
    startingGearIds: [
      'screen_melee_katana',
      'screen_melee_knife',
      'screen_ranged_crossbow',
      'screen_ammo_crossbow_bolts',
      'screen_armor_hard_leather',
      'screen_util_medkit',
    ],
    hook: 'I ciliegi in fiore tingono di rosso il cortile di un tempio shintoista tra le colline di Kyoto al calar del sole. Il signore della guerra locale ha venduto la propria anima alle potenze del disfacimento per vincere la guerra civile. La tua lama d\'acciaio e lo spirito del lupo dentro di te sono l\'unica barriera tra il regno e il caos.',
  },
  {
    city: 'Chang\'an, Cina (Dinastia Tang 750 d.C.)',
    era: 'imperial_china',
    eraLabel: 'Cina Imperiale / Dinastie',
    creature: 'mage' as const,
    characterName: 'Li Yuan',
    characterConcept: 'Maestro Alchimista & Sapiente Taoista',
    faction: 'Maestri Alchimisti del Tao',
    enemies: ['Spie della Città Proibita', 'Spiriti Yaoguai millenari'],
    tone: 'investigative' as const,
    startingGearIds: [
      'screen_melee_sword',
      'screen_melee_knife',
      'screen_armor_reinforced_clothes',
      'screen_util_investigative_kit',
      'screen_util_medkit',
      'screen_util_light_source',
    ],
    hook: 'Le lanterne dorate del mercato della seta si accendono mentre la folla sciama tra i canali imperiali. Una carovana proveniente dall\'Ovest ha introdotto una reliquia di giada nera che fa marcire la carne di chiunque la tocchi. Hai poche ore per tracciare la sorgente prima che l\'inquisizione dell\'Imperatore chiuda le mura.',
  },
  {
    city: 'Le Isole dei Caraibi (Età d\'Oro della Pirateria 1718)',
    era: 'pirates',
    eraLabel: 'Mari del Sud & Pirati',
    creature: 'vampire' as const,
    characterName: 'Capitano Edward "Blood" Low',
    characterConcept: 'Corsaro Dannato dei Mari del Sud',
    faction: 'Corsari del Sangue',
    enemies: ['La Flotta Britannica', 'Cacciatori della Corona'],
    tone: 'survival' as const,
    startingGearIds: [
      'screen_melee_rapier',
      'screen_ranged_revolver_light',
      'screen_ammo_pistol_pack',
      'screen_melee_knife',
      'screen_armor_reinforced_clothes',
      'screen_util_climbing_gear',
    ],
    hook: 'Il ponte del brigantino scricchiola sotto gli spruzzi salmastri mentre le vele nere garriscono al vento del tramonto. Nel cuore della stiva riposa un forziere d\'oro azteco bagnato di sangue antico. All\'orizzonte, una fregata da guerra a vele spiegate manovra per tagliarvi la rotta con cannoni pronti a fare fuoco.',
  },
  {
    city: 'Fortezza dei Monti Grigioferro (High Fantasy)',
    era: 'fantasy_realms',
    eraLabel: 'Regni Fantasy & Magia Arcana',
    creature: 'mage' as const,
    characterName: 'Valerius Starfall',
    characterConcept: 'Mago Guerriero delle Rune Arcane',
    faction: 'Gilda delle Rune Proibite',
    enemies: ['Cultisti del Drago d\'Ombra', 'Mercenari del Re Tiranno'],
    tone: 'epic_adventure' as const,
    startingGearIds: [
      'screen_melee_sword',
      'screen_melee_spear',
      'screen_armor_chainmail',
      'screen_util_medkit',
      'screen_util_climbing_gear',
      'screen_util_light_source',
    ],
    hook: 'Le antiche rovine naniche riecheggiano di canti d\'assedio. Un varco tra le dimensioni si è spalancato nel santuario sotterraneo, rigurgitando aberrazioni che la guardia reale non riesce ad arginare. Stringi il tuo bastone runico mentre la pietra sotto i tuoi stivali comincia a tremare.',
  },
  {
    city: 'Praga, Notte di Pioggia',
    era: 'modern',
    eraLabel: 'Metropoli Contemporanea',
    creature: 'vampire' as const,
    characterName: 'Vincent Cross',
    characterConcept: 'Occultista & Custode dei Segreti',
    faction: 'Cerchio degli Ermetici Notturni',
    enemies: ['Inquisitori della Notte', 'Sicari del Sindacato'],
    tone: 'investigative' as const,
    startingGearIds: [
      'screen_ranged_pistol_light',
      'screen_ammo_pistol_pack',
      'screen_melee_knife',
      'screen_armor_kevlar_jacket',
      'screen_util_investigative_kit',
      'screen_util_light_source',
    ],
    hook: 'I sotterranei di un\'antica biblioteca alchemica di Malá Strana odorano di cenere e polvere da sparo. Il tuo contatto è appena stato eliminato, ma stringi ancora il rotolo sigillato mentre passi pesanti scendono le scale di pietra.',
  },
];
