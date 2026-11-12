export type CreatureType = 'vampire' | 'werewolf' | 'mage' | 'mortal' | 'hunter';
// Archetipi Universali del Chronica Engine (Libero da vincoli di copyright):
// 'mortal': Mortale / Cittadino / Investigatore senza poteri
// 'hunter': Veterano / Tattico / Specialista di Campo
// 'vampire': Potenziato / Stirpe Occulta (biomacchine, mutanti, esseri della notte)
// 'werewolf': Mutaforma / Primordiale (licantropi, bionoidi, spiriti totemici)
// 'mage': Canalizzatore / Arcanista (maghi, psionici, hacker neurali)

export type DamageType = 'none' | 'bashing' | 'lethal' | 'aggravated';

export interface HealthLevel {
  label: string;
  penalty: number; // e.g. 0, -1, -2, -5, incapacitated
  damage: DamageType;
}

export interface CharacterAttributes {
  // Mentali (Mental)
  intelligence: number; // Intelligenza (Prestanza)
  wits: number;         // Prontezza (Accuratezza)
  resolve: number;      // Fermezza (Resistenza)

  // Fisici (Physical)
  strength: number;     // Forza (Prestanza)
  dexterity: number;    // Destrezza (Accuratezza)
  stamina: number;      // Costituzione (Resistenza)

  // Sociali (Social)
  presence: number;     // Presenza (Prestanza)
  manipulation: number; // Ascendente (Accuratezza)
  composure: number;    // Autocontrollo (Resistenza)

  // Campi retrocompatibilità opzionali
  charisma?: number;
  appearance?: number;
  perception?: number;
}

export interface CharacterAbilities {
  // Mentali (-3 senza addestramento)
  academics: number;      // Accademiche
  computer: number;       // Informatica
  investigation: number;  // Investigare
  crafts: number;         // Manualità
  medicine: number;       // Medicina
  occult: number;         // Occulto
  politics: number;       // Politica
  science: number;        // Scienze

  // Fisiche (-1 senza addestramento)
  firearms: number;       // Armi da Fuoco
  weaponry: number;       // Armi da Mischia
  athletics: number;      // Atletica
  larceny: number;        // Criminalità
  stealth: number;        // Furtività
  drive: number;          // Guidare
  brawl: number;          // Lotta
  survival: number;       // Sopravvivenza

  // Sociali (-1 senza addestramento)
  animalKen: number;      // Affinità Animale
  streetwise: number;     // Bassifondi
  empathy: number;        // Empatia
  expression: number;     // Espressività
  intimidation: number;   // Intimidire
  persuasion: number;     // Persuasione
  socialize: number;      // Socializzare
  subterfuge: number;     // Sotterfugio

  // Campi retrocompatibilità opzionali
  alertness?: number;
  dodge?: number;
  etiquette?: number;
  melee?: number;
  security?: number;
}

export interface PowerTrait {
  name: string;
  level: number;
  description?: string;
}

export interface ExperienceLog {
  timestamp: number;
  amount: number;
  reason: string;
  type: 'gain' | 'spend';
  traitName?: string;
  oldVal?: number;
  newVal?: number;
}

export interface ExperienceTracker {
  current: number;
  total: number;
  history?: ExperienceLog[];
}

export type ItemCategory = 'weapon' | 'ammo' | 'consumable' | 'gear';

export interface WodWeapon {
  id: string;
  name: string;
  category: 'melee' | 'firearms' | 'ranged' | 'brawl';
  baseDamage: number; // Dadi bonus arma aggiunti direttamente alla riserva d'attacco
  addStrength: boolean; // Se vero, l'arma usa Forza in mischia
  damageType: DamageType; // 'bashing' (Contundente) | 'lethal' (Letale) | 'aggravated' (Aggravato)
  difficulty: number; // Soglia fissa Storytelling System = 8
  conceal?: 'P' | 'J' | 'T' | 'N'; // P=Tasca, J=Giacca, T=Trench/Cappotto, N=Non Occultabile
  rangeMeters?: number; // Gittata breve in metri (media = x2, lunga = x4)
  rateOfFire?: number; // Cadenza di tiro
  clipSize?: number; // Capienza caricatore/faretra
  minStrength?: number; // Forza minima richiesta (altrimenti -1 dado all'attacco)
  size?: number; // Taglia arma (1 = mano/tasca, 2 = cappotto, 3+ = non nascondibile)
  againThreshold?: 8 | 9 | 10; // Es. 9-Again per Ascia, Ascia Grande e Shotgun
  armorPiercing?: number; // Perforare Armatura (es. Stocco = 1)
  twoHanded?: boolean; // Richiede due mani (†)
  autoFire?: boolean; // Può sparare in fuoco automatico (*)
  description?: string;
}

export interface InitiativeResult {
  total: number;
  dexterity: number;
  wits: number;
  d10Roll: number;
  healthPenalty: number;
  formula: string;
  timestamp: number;
}

export interface DamageRollResult {
  dicePool: number;
  dice: number[];
  difficulty: number;
  successes: number; // Punti Ferita effettivi inflitti
  damageType: DamageType;
  weaponName?: string;
  timestamp: number;
}

export interface SoakRollResult {
  dicePool: number;
  dice: number[];
  difficulty: number;
  successes: number; // Danni annullati
  damageType: DamageType;
  finalDamage: number; // Danni residui subiti
  timestamp: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  quantity: number;
  maxQuantity?: number;
  associatedWeapon?: string;
  damageOrEffect?: string;
  damage?: number;
  armorBonus?: number;
  description?: string;
  isEquipped?: boolean;
  weaponStats?: WodWeapon;
}

export interface MeritFlaw {
  id: string;
  name: string;
  type: 'merit' | 'flaw';
  cost: number; // punti (positivo per meriti, negativo per difetti)
  category: 'physical' | 'mental' | 'social' | 'supernatural';
  description: string;
  effectKey?:
    | 'quick_draw'
    | 'lightning_reflexes'
    | 'danger_sense'
    | 'iron_will'
    | 'ambidextrous'
    | 'huge_size'
    | 'bad_sight'
    | 'short_fuse'
    | string;
}

export type WerewolfFormId = 'hishu' | 'dalu' | 'gauru' | 'urshul' | 'urhan';

export interface Character {
  id: string;
  name: string;
  concept: string;
  creatureType: CreatureType;
  factionOrClan: string; // Clan (Vampire), Tribe (Werewolf), Path/Order (Mage), Affiliation (Hunter/Mortal)

  // Psicologia Ufficiale Storytelling System
  virtue?: string;      // Virtù (Carità, Fede, Fortezza, Giustizia, Prudenza, Speranza, Temperanza)
  vice?: string;        // Vizio (Avarizia, Gola, Invidia, Ira, Lussuria, Orgoglio, Pigrizia)
  age?: number;         // Età
  playerName?: string;  // Giocatore
  groupName?: string;   // Nome del Gruppo / Coterie / Branco / Cabala

  // Campi retrocompatibilità
  nature?: string;
  demeanor?: string;
  generationOrRank?: string;

  attributes: CharacterAttributes;
  abilities: CharacterAbilities;
  powers: PowerTrait[]; // Discipline, Doni, Arcana...
  meritsFlaws?: MeritFlaw[]; // Pregi (7 punti iniziali) e Difetti

  // Tratti Derivati Ufficiali (Formule esatte delle schede)
  size?: number;          // Taglia (5 per umani normali)
  speed?: number;         // Velocità = Forza + Destrezza + 5
  defense?: number;       // Difesa = min(Destrezza, Prontezza)
  initiativeMod?: number; // Mod. Iniziativa = Destrezza + Autocontrollo
  armor?: number;         // Armatura

  // Integrità Morale (Scala 1-10, Iniziale = 7)
  morality?: number;      // Moralità (Umani/Cacciatori), Umanità (Vampiri), Armonia (Lupi), Saggezza (Maghi)
  humanity: number;       // Campo numerico per compatibilità retroattiva

  // Risorse e Volontà
  experience?: ExperienceTracker;
  willpower: {
    current: number;
    max: number;          // Fermezza + Autocontrollo
  };
  bloodOrEnergy: {
    name: string;         // 'Vitae' (Vampiri), 'Essenza' (Lupi), 'Mana' (Maghi), 'Punti Sangue' (Generico)
    current: number;
    max: number;
  };

  // Tratti Specifici Creature
  supernaturalPotency?: number; // Potenza Soprannaturale unificata (1-10)
  clan?: string;
  covenant?: string;      // Congrega
  coterie?: string;
  bloodPotency?: number;  // Potenza del Sangue (Vampiri)

  auspice?: string;       // Auspicio (Lupi)
  tribe?: string;         // Tribù (Lupi)
  packOrLodge?: string;   // Branco / Loggia
  primalUrge?: number;    // Istinto Primordiale (Lupi)
  activeForm?: 'hishu' | 'dalu' | 'gauru' | 'urshul' | 'urhan'; // Forme del Lupo
  werewolfForm?: 'hishu' | 'dalu' | 'gauru' | 'urshul' | 'urhan';

  path?: string;          // Cammino (Maghi)
  order?: string;         // Ordine (Maghi)
  cabal?: string;         // Cabala (Maghi)
  gnosis?: number;        // Gnosi (Maghi)

  health: HealthLevel[];  // Salute = Costituzione + Taglia
  inventory: string[];
  structuredInventory?: InventoryItem[];
  notes: string;
  backgroundNotes?: string;
  isProtagonistSlot?: boolean;
}

export interface DiceRollResult {
  pool: number;
  difficulty: number;
  dice: number[];
  explodedDice?: number[]; // Dadi extra generati dall'esplosione (10-Again / 9-Again / 8-Again)
  againThreshold?: 8 | 9 | 10 | 11; // 10 = 10-Again standard, 9 = 9-Again, 8 = 8-Again, 11 = nessun rilancio
  isChanceDie?: boolean; // True se la riserva era <= 0 (Tiro di Fortuna: solo 10 = successo, 1 = Fallimento Drammatico)
  willpowerSpent?: boolean; // True se è stato speso 1 punto Volontà (+3 dadi o +2 resistenza)
  weaponBonusDice?: number; // Dadi bonus arma sommati nel tiro singolo d'attacco
  targetDefensePenalty?: number; // Difesa + Armatura del bersaglio sottratta dal tiro d'attacco
  damageInflicted?: number; // Nel combattimento Storytelling System: ogni successo = 1 danno diretto
  damageType?: DamageType;
  weaponName?: string;
  targetEnemyId?: string;
  targetEnemyName?: string;
  rawSuccesses: number;
  ones: number;
  netSuccesses: number;
  outcome: 'botch' | 'failure' | 'success' | 'exceptional';
  attributeName?: string;
  abilityName?: string;
  dualWieldMode?: 'combined' | 'flurry';
  secondaryWeaponName?: string;
  secondaryRoll?: DiceRollResult;
  timestamp: number;
}

export interface CustomStoryOutline {
  fileName?: string;
  content: string; // Il testo completo della trama, canovaccio o appunti
  uploadedAt: number;
  wordCount?: number;
}

export interface CampaignMap {
  id: string;
  name: string; // es. "Regno di Aethelgard (Generale)", "Catacombe Oscure", "Sala del Trono"
  category: 'general' | 'location' | 'dungeon' | 'tactical';
  imageUrl: string; // URL o base64 dell'immagine caricata
  description?: string;
  createdAt: number;
}

export interface CampaignConfig {
  id: string;
  title: string;
  era: string; // Flessibile: 'wild_west' | 'feudal_japan' | 'imperial_china' | 'pirates' | 'ancient_myths' | 'fantasy_realms' | 'cyberpunk' | 'modern' | 'victorian' | 'dark_ages' | string
  eraLabel?: string;
  eraDescription?: string;
  city: string; // Luogo, regione, città o regno
  timeOfDay?: string; // Mezzogiorno, Tramonto, Alba, Notte, Dinamico...
  creatureType: CreatureType;
  enemies: string[];
  tone: 'investigative' | 'survival' | 'politics' | 'action' | 'horror' | 'epic_adventure';
  difficulty: 'narrative' | 'standard' | 'brutal';
  customPlotHook?: string;
  customStoryOutline?: CustomStoryOutline;
  maps?: CampaignMap[];
  activeMapId?: string;
  activeBattlemap?: BattlemapSpec | null;
  activeHandout?: HandoutSpec | null;
  rosterCharacters?: Character[];
  isQuickStart?: boolean;
  sessionMode?: 'solo' | 'tabletop';
}

export interface RequiredRoll {
  attribute: string;
  ability?: string;
  difficulty: number;
  reason: string;
  modifier?: number;
}

export interface DynamicObstacle {
  id: string;
  name: string;
  description?: string;
  successesNeeded: number;
  currentSuccesses: number;
  penaltyDamageOnFail?: number;
  penaltyDamageType?: DamageType;
  attribute?: string;
  ability?: string;
  resolved?: boolean;
}

export interface EnemySpawnSpec {
  name: string;
  creatureType?: CreatureType;
  maxHealth: number;
  defense: number;
  armor: number;
  initiativeMod: number;
  attackPool: number;
  attackName?: string;
  damageType?: DamageType;
  notes?: string;
}

export interface ActiveCombatEnemy {
  id: string;
  name: string;
  creatureType: CreatureType;
  health: HealthLevel[];
  maxHealth: number;
  defense: number;
  armor: number;
  initiativeMod: number;
  attackPool: number;
  attackName: string;
  damageType: DamageType;
  notes?: string;
  isDefeated?: boolean;
}

export interface StoryMessage {
  id: string;
  sender: 'narrator' | 'player' | 'system';
  senderName?: string;
  text: string;
  timestamp: number;
  rollResult?: DiceRollResult;
  suggestedActions?: string[];
  requiredRoll?: RequiredRoll;
  obstacleSpawn?: Omit<DynamicObstacle, 'id' | 'currentSuccesses'>;
  enemySpawns?: EnemySpawnSpec[];
  xpAward?: {
    amount: number;
    reason: string;
  };
  itemAward?: {
    name: string;
    description: string;
  };
  playerDamageAward?: {
    points: number;
    type: DamageType;
    reason?: string;
  };
  playerHealAward?: {
    points: number;
    type?: DamageType;
    reason?: string;
  };
  lootClaim?: {
    lootId: string;
    itemName: string;
    itemDescription?: string;
    claimedBy?: string;
    claimedByName?: string;
    claimedAt?: number;
  };
  isClarification?: boolean; // True se è un chiarimento/domanda fuori gioco (OOC) al Narratore
  clarificationQuestion?: string; // La domanda specifica posta dal giocatore
  battlemap?: BattlemapSpec; // Schizzo tattico minimale di battaglia/infiltrazione
  handout?: HandoutSpec; // Reperto di gioco antico (pergamena, lettera, rune)
  suggestedMapName?: string; // Auto-switch della mappa consigliata dal Narratore (es. "Aethelgard Capital")
}

export interface BattlemapEntity {
  id: string;
  name: string;
  type: 'player' | 'enemy' | 'neutral' | 'boss';
  x: number; // Percentuale 0-100 o coordinate
  y: number;
  label?: string;
  hp?: string;
  threat?: string;
}

export interface BattlemapTerrain {
  id: string;
  type: 'wall' | 'cover' | 'door' | 'elevation' | 'hazard' | 'water';
  x: number;
  y: number;
  w?: number;
  h?: number;
  label?: string;
}

export interface BattlemapSpec {
  id?: string;
  title: string;
  locationName?: string;
  gridSize?: number; // default 10x10
  entities: BattlemapEntity[];
  terrain?: BattlemapTerrain[];
  notes?: string;
}

export interface HandoutSpec {
  id: string;
  type: 'parchment' | 'scroll' | 'runic_stone' | 'bounty_poster' | 'military_dispatch';
  title: string;
  subtitle?: string;
  content: string;
  authorOrSeal?: string;
  secretReveal?: string;
  revealed?: boolean;
}

export interface TabletopTurnState {
  activeTurnPlayerId?: string;
  activeTurnPlayerName?: string;
  roundNumber: number;
  turnOrder: string[]; // array di id giocatori in ordine di iniziativa
}

export interface UserProfile {
  id: string;
  name: string;
  isMaster: boolean;
  avatar: string; // 'crown' | 'sword' | 'shield' | 'bow' | 'potion' | 'skull' | 'wizard'
  pin?: string;
  createdAt?: number;
}

export interface SavedChronicleHeader {
  id: string;
  fileName: string;
  title: string;
  era: string;
  city: string;
  characterName: string;
  messagesCount: number;
  updatedAt: number;
  profileId?: string;
  authorName?: string;
}


