// ============================================================================
// SCHERMO DEL NARRATORE - CHRONICA D10 ENGINE (COMPENDIO REGOLE TATTICHE)
// Trascrizione integrale e fedele delle 4 tavole ufficiali italiane
// ============================================================================

export interface MeleeWeaponRow {
  type: string;
  damage: string;
  size: string;
  cost: string;
  special: string;
}

export interface RangedWeaponRow {
  type: string;
  damage: string;
  range: string;
  magazine: string;
  minStrength: number;
  size: number;
  cost: string;
  example: string;
}

export interface ExplosiveRow {
  type: string;
  throwMod: string;
  blastArea: string;
  damage: string;
  size: string;
  cost: string;
  example: string;
}

export interface ArmorRow {
  era: 'Moderna' | 'Antica';
  name: string;
  rating: string; // Mischia / Armi da Fuoco
  minStrength: number;
  defensePenalty: number;
  speedPenalty: number;
  cost: string;
  bulletproof?: boolean;
}

export interface OfficialRollRow {
  action: string;
  pool: string;
  type: 'Istantanea' | 'Prolungata' | 'Contrastata' | 'Riflessiva';
  notes?: string;
}

// 1. TABELLA DELLE ARMI DA MISCHIA (Tavola 2)
export const SCREEN_MELEE_WEAPONS: MeleeWeaponRow[] = [
  { type: 'Manganello', damage: '1 (C)', size: '1', cost: '•', special: 'Mettere Fuori Combattimento (pag. 168)' },
  { type: 'Mazza (metallo)', damage: '3 (C)', size: '2', cost: '••', special: '—' },
  { type: 'Randello (legno)', damage: '2 (C)', size: '2', cost: 'n/a', special: '—' },
  { type: "Tirapugni d'Ottone", damage: '1 (C)', size: 'n/a', cost: '•', special: 'Usa Abilità Lotta anziché Armi da Mischia*' },
  { type: 'Accetta', damage: '2 (L)', size: '1', cost: '•', special: '—' },
  { type: 'Ascia Grande†', damage: '5 (L)', size: '4', cost: '•••', special: 'Due mani; Ritira 9 (pag. 134)' },
  { type: 'Ascia†', damage: '3 (L)', size: '3', cost: '••', special: 'Due mani; Ritira 9 (pag. 134)' },
  { type: 'Coltello', damage: '1 (L)', size: '1', cost: '•', special: 'Nascondibile in una mano' },
  { type: 'Katana', damage: '3 (L)', size: '2', cost: '••', special: 'Durezza +1** (non si rompe facilmente)' },
  { type: 'Lancia†', damage: '3 (L)', size: '4', cost: '•', special: 'Due mani; +1 Difesa contro avversari disarmati****' },
  { type: 'Paletto***', damage: '1 (L)', size: '1', cost: 'n/a', special: 'Mirare al cuore (-4), min. 3 danni in un singolo attacco' },
  { type: 'Spada', damage: '3 (L)', size: '2', cost: '••', special: 'Nascondibile sotto un cappotto' },
  { type: 'Spadone†', damage: '4 (L)', size: '3', cost: '•••', special: 'Due mani (+1 Forza min. se impugnato a una mano)' },
  { type: 'Stocco', damage: '2 (L)', size: '2', cost: '••', special: 'Perforare Armatura 1 (pag. 167)' },
];

export const SCREEN_MELEE_NOTES = [
  'Armi Improvvisate: Subiscono automaticamente una penalità di -1 al tiro.',
  'Taglia e Forza Minima: 1 = Nascondibile in mano; 2 = Sotto un cappotto; 3+ = Non nascondibile. La Taglia indica anche la Forza minima richiesta: se la Forza è inferiore, si subisce -1 ai tiri di attacco.',
  '† Arma a Due Mani: Se usata con una sola mano, la Forza minima richiesta aumenta di +1.',
];

// 2. TABELLA DELLE ARMI A DISTANZA (Tavola 3)
export const SCREEN_RANGED_WEAPONS: RangedWeaponRow[] = [
  { type: 'Revolver, Leggero', damage: '2 (L)', range: '20 / 40 / 80', magazine: '6', minStrength: 2, size: 1, cost: '••', example: 'SW M640 (.38 Special)' },
  { type: 'Revolver, Pesante', damage: '3 (L)', range: '35 / 70 / 140', magazine: '6', minStrength: 3, size: 1, cost: '••', example: 'SW M29 (.44 Magnum)' },
  { type: 'Pistola, Leggera', damage: '2 (L)', range: '20 / 40 / 80', magazine: '17+1', minStrength: 2, size: 1, cost: '•••', example: 'Glock 17 (9mm)' },
  { type: 'Pistola, Pesante', damage: '3 (L)', range: '30 / 60 / 120', magazine: '7+1', minStrength: 3, size: 1, cost: '•••', example: 'Colt M1911A1 (.45 ACP)' },
  { type: 'Fucile†', damage: '5 (L)', range: '200 / 400 / 800', magazine: '5+1', minStrength: 2, size: 3, cost: '••', example: 'Remington M-700 (30.06)' },
  { type: 'Mitra, Piccolo*', damage: '2 (L)', range: '25 / 50 / 100', magazine: '30+1', minStrength: 2, size: 1, cost: '•••', example: 'Ingram Mac-10 (9mm)' },
  { type: 'Mitra, Grande*†', damage: '3 (L)', range: '50 / 100 / 200', magazine: '30+1', minStrength: 3, size: 2, cost: '•••', example: 'HK MP-5 (9mm)' },
  { type: "Fucile d'Assalto*†", damage: '4 (L)', range: '150 / 300 / 600', magazine: '42+1', minStrength: 3, size: 3, cost: '•••', example: 'Steyr-Aug (5.56mm)' },
  { type: 'Shotgun†', damage: '4*** (L)', range: '20 / 40 / 80', magazine: '5+1', minStrength: 3, size: 2, cost: '••', example: 'Remington M870 (12-gauge) [Ritira 9]' },
  { type: 'Balestra**†', damage: '3 (L)', range: '40 / 80 / 160', magazine: '1', minStrength: 3, size: 3, cost: '•••', example: 'Ricarica in 3 turni; può impalettare (-4, min 3 danni)' },
];

export const SCREEN_RANGED_NOTES = [
  'Danno contro Vampiri: Le armi da fuoco convenzionali infliggono danni Letali ai mortali, ma solo Contundenti ai vampiri (salvo colpi alla testa o munizioni speciali).',
  'Gittata (Breve / Media / Lunga in metri): Gli attacchi a gittata Media subiscono -2; a gittata Lunga subiscono -4.',
  '* Fuoco Automatico: Può sparare raffiche brevi (+1), medie (+2) o lunghe (+3).',
  '† Due Mani: Se impugnata con una sola mano, la Forza minima richiesta aumenta di +1.',
];

// 3. TABELLA DEGLI ESPLOSIVI (Tavola 1)
export const SCREEN_EXPLOSIVES: ExplosiveRow[] = [
  { type: 'Incendiario*', throwMod: '-1', blastArea: '2 m', damage: '2 (C + Fuoco L)', size: '1', cost: 'n/a', example: 'Molotov (appicca fuoco Letale)' },
  { type: 'Concussione**', throwMod: '+2', blastArea: '3 m', damage: '4 (C)', size: '1', cost: '•••', example: 'Granata a Concussione† (atterra il bersaglio)' },
  { type: 'Frammentazione', throwMod: '+2', blastArea: '3 m', damage: '4 (L)', size: '1', cost: '•••', example: 'Granata a Frammentazione†' },
  { type: 'Detonazione singola', throwMod: '+1', blastArea: '4 m', damage: '4+ (L)', size: '1', cost: '•••', example: 'Candelotto di Dinamite' },
  { type: 'Alto Potenziale***', throwMod: 'n/a', blastArea: '20+ m', damage: '6+ (L)', size: '1-3', cost: '••••', example: 'Plastico / C4 (demolizione strutture)' },
];

// 4. TABELLA DELLE ARMATURE (Tavola 2)
export const SCREEN_ARMOR: ArmorRow[] = [
  { era: 'Moderna', name: 'Abiti spessi / rinforzati', rating: '1 / 0', minStrength: 1, defensePenalty: 0, speedPenalty: 0, cost: 'n/a', bulletproof: false },
  { era: 'Moderna', name: 'Giacca di kevlar* (sottile)', rating: '1 / 2', minStrength: 1, defensePenalty: 0, speedPenalty: 0, cost: '•', bulletproof: true },
  { era: 'Moderna', name: 'Giubbotto antiproiettile*', rating: '2 / 3', minStrength: 1, defensePenalty: -1, speedPenalty: 0, cost: '••', bulletproof: true },
  { era: 'Moderna', name: 'Tenuta antisommossa*', rating: '3 / 4', minStrength: 2, defensePenalty: -2, speedPenalty: -1, cost: '•••', bulletproof: true },
  { era: 'Antica', name: 'Cuoio (rigido)', rating: '1 / 0', minStrength: 2, defensePenalty: -1, speedPenalty: 0, cost: '•', bulletproof: false },
  { era: 'Antica', name: 'Cotta di maglia', rating: '2 / 1', minStrength: 3, defensePenalty: -2, speedPenalty: -2, cost: '••', bulletproof: false },
  { era: 'Antica', name: 'Corazza di Piastre', rating: '3 / 2', minStrength: 4, defensePenalty: -2, speedPenalty: -3, cost: '••••', bulletproof: false },
];

export const SCREEN_ARMOR_NOTES = [
  'Valore (Mischia / Armi da Fuoco): Il primo numero protegge dagli attacchi ravvicinati e da lancio; il secondo numero protegge dalle Armi da Fuoco.',
  '* A Prova di Proiettile: Giacca di kevlar, giubbotto antiproiettile e tenuta antisommossa declassano inoltre i danni delle armi da fuoco da Letali a Contundenti.',
  'Forza Minima: Se la Forza del personaggio è inferiore a quella richiesta, i suoi attacchi di Lotta e Armi da Mischia subiscono una penalità di -1.',
];

// 5. ELENCO UFFICIALE DELLE PROVE DELLO SCHERMO (Tavola 3)
export const SCREEN_OFFICIAL_ROLLS: OfficialRollRow[] = [
  { action: 'Memorizzare / Ricordare', pool: 'Intelligenza + Autocontrollo', type: 'Istantanea' },
  { action: 'Percezione / Notare Dettagli', pool: 'Prontezza + Autocontrollo', type: 'Riflessiva' },
  { action: 'Reagire alla Sorpresa (Imboscate)', pool: 'Prontezza + Autocontrollo', type: 'Riflessiva' },
  { action: 'Resistere alla Coercizione', pool: 'Fermezza + Prontezza (contro Intimidazione)', type: 'Contrastata' },
  { action: 'Sollevare / Spostare Oggetti', pool: 'Forza + Costituzione', type: 'Istantanea' },
  { action: 'Meditazione', pool: 'Autocontrollo + Prontezza + Equip.', type: 'Prolungata' },
  { action: 'Ricerche Accademiche', pool: 'Intelligenza + Accademiche + Equip.', type: 'Prolungata' },
  { action: 'Pirateria Informatica (Hacking)', pool: 'Intelligenza + Informatica + Equip.', type: 'Contrastata' },
  { action: 'Investigare Indizi', pool: 'Prontezza + Investigare', type: 'Istantanea' },
  { action: 'Esaminare Scena del Crimine', pool: 'Prontezza + Investigare + Equip.', type: 'Prolungata' },
  { action: 'Risolvere Enigmi', pool: 'Intelligenza + Investigare + Equip.', type: 'Istantanea' },
  { action: 'Creazione Artistica / Artigianato', pool: 'Intelligenza + Manualità + Equip.', type: 'Prolungata' },
  { action: 'Riparare Oggetti / Meccanica', pool: 'Destrezza + Manualità + Equip.', type: 'Prolungata' },
  { action: 'Curare Ferite / Chirurgia', pool: 'Destrezza (o Intelligenza) + Medicina + Equip.', type: 'Prolungata' },
  { action: 'Arrampicarsi', pool: 'Forza + Atletica + Equip.', type: 'Istantanea' },
  { action: 'Inseguimento a Piedi', pool: 'Costituzione + Atletica + Equip.', type: 'Contrastata' },
  { action: 'Lanciare Oggetti / Armi', pool: 'Destrezza + Atletica + Equip.', type: 'Istantanea' },
  { action: 'Saltare', pool: 'Forza + Atletica + Equip.', type: 'Istantanea' },
  { action: 'Eludere Sistemi di Sicurezza', pool: 'Destrezza + Criminalità + Equip.', type: 'Istantanea' },
  { action: 'Rapidità di Mano / Borseggiare', pool: 'Destrezza + Criminalità + Equip. vs Prontezza + Autocontrollo', type: 'Contrastata' },
  { action: 'Scassinare Serrature', pool: 'Destrezza + Criminalità + Equip.', type: 'Istantanea' },
  { action: 'Muoversi Silenziosamente', pool: 'Prontezza (o Destrezza) + Furtività', type: 'Contrastata' },
  { action: 'Pedinamento a Piedi', pool: 'Prontezza + Furtività + Equip. vs Prontezza + Autocontrollo + Equip.', type: 'Contrastata' },
  { action: 'Inseguimento in Macchina', pool: 'Destrezza + Guidare + Manovrabilità', type: 'Contrastata' },
  { action: 'Pedinamento in Macchina', pool: 'Prontezza + Guidare + Manovrabilità vs Prontezza + Autocontrollo', type: 'Contrastata' },
  { action: 'Foraggiamento / Sopravvivenza', pool: 'Prontezza + Sopravvivenza + Equip.', type: 'Prolungata' },
];

// 6. MODIFICATORI DI COMBATTIMENTO DELLO SCHERMO (Tavola 4)
export const SCREEN_COMBAT_MODIFIERS = [
  { name: 'Mirare', effect: '+1 dado per turno di mira fino a un massimo di +3 (si perde se ci si muove o si viene attaccati).' },
  { name: 'Attacco Impetuoso (All-Out Attack)', effect: '+2 dadi con Lotta o Armi da Mischia; il personaggio perde completamente la Difesa per il turno.' },
  { name: 'Perforare Armatura', effect: "Ignora l'armatura del bersaglio fino a un massimo pari al valore dell'arma." },
  { name: 'Raffica Breve (Fuoco Automatico)', effect: '3 pallottole contro un singolo bersaglio: bonus di +1 al tiro di attacco.' },
  { name: 'Raffica Media (Fuoco Automatico)', effect: '~10 pallottole contro 1-3 bersagli: bonus di +2 a ogni tiro (-1 per ogni bersaglio oltre il primo).' },
  { name: 'Raffica Lunga (Fuoco Automatico)', effect: '~20 pallottole contro più bersagli: bonus di +3 a ogni tiro (-1 per ogni bersaglio oltre il primo).' },
  { name: 'Occultamento del Bersaglio', effect: 'Scarso: -1 (sedia); Parziale: -2 (cofano auto); Considerevole: -3 (blocco motore/buca); Copertura Piena: colpisce la barriera.' },
  { name: 'Schivare (Azione Difensiva)', effect: 'Raddoppia la Difesa del personaggio per tutto il turno (consuma l’azione del turno).' },
  { name: "Estrarre un'Arma", effect: "Richiede 1 azione (1 turno) senza il Pregio Estrazione Rapida, e può annullare la Difesa." },
  { name: 'Sparare da un Occultamento', effect: 'La propria copertura riduce di 1 la penalità per rispondere al fuoco (quindi 0, -1 o -2).' },
  { name: 'Attaccare con Mano Secondaria', effect: 'Penalità di -2 dadi.' },
  { name: 'Bersaglio Steso a Terra (Prono)', effect: 'Penalità di -2 per colpirlo a distanza; Bonus di +2 per colpirlo in combattimento ravvicinato.' },
  { name: 'Gittata Armi a Distanza', effect: 'Gittata Breve: 0 | Gittata Media: -2 | Gittata Lunga: -4.' },
  { name: 'Sparare in Mischia', effect: '-2 dadi per ogni combattente che non si vuole colpire con un singolo proiettile (non applicabile al fuoco automatico).' },
  { name: 'Bersaglio Specifico (Colpo Mirato)', effect: 'Torso: -1 | Gamba o Braccio: -2 | Testa: -3 | Mano: -4 | Occhio: -5.' },
  { name: 'Bersaglio Sorpreso o Immobilizzato', effect: 'Il bersaglio non applica la propria Difesa.' },
  { name: 'Toccare un Avversario', effect: 'Destrezza + Lotta o Destrezza + Armi da Mischia (la Difesa si applica, l’armatura può essere ignorata).' },
  { name: 'Spendere Volontà', effect: '+3 dadi a un tiro oppure +2 a un tratto di Resistenza (Fermezza, Costituzione, Autocontrollo o Difesa).' },
];

// 7. GRADI DI SFIDA (APPLICARE I MODIFICATORI - Tavola 4)
export const SCREEN_DIFFICULTY_GRADES = [
  { mod: '+5', label: 'Potreste farlo anche mentre dormite' },
  { mod: '+4', label: 'Facile come rubare caramelle a un bambino' },
  { mod: '+3', label: 'Roba da nulla' },
  { mod: '+2', label: 'Una passeggiata' },
  { mod: '+1', label: 'Una piccola spinta' },
  { mod: '-1', label: 'Un piccolo ostacolo' },
  { mod: '-2', label: 'Una discreta fatica' },
  { mod: '-3', label: "Un'impresa difficile" },
  { mod: '-4', label: 'Davvero impegnativo' },
  { mod: '-5', label: 'Che il Cielo ci aiuti!' },
];

// 8. TABELLA FORZA E SOLLEVAMENTO (Tavola 1)
export const SCREEN_STRENGTH_FEATS = [
  { strength: 1, feat: 'Sollevare una sedia', weight: '20 kg' },
  { strength: 2, feat: 'Sollevare un grosso cane', weight: '50 kg' },
  { strength: 3, feat: 'Sollevare una cassetta postale pubblica', weight: '125 kg' },
  { strength: 4, feat: 'Sollevare una cassa di legno', weight: '200 kg' },
  { strength: 5, feat: 'Sollevare una bara', weight: '325 kg' },
  { strength: 6, feat: 'Sollevare un refrigeratore', weight: '400 kg' },
  { strength: 7, feat: "Rovesciare un'auto piccola", weight: '450 kg' },
  { strength: 8, feat: 'Sollevare una motocicletta', weight: '500 kg' },
  { strength: 9, feat: "Ribaltare un'auto media", weight: '600 kg' },
  { strength: 10, feat: 'Sollevare un grosso tronco', weight: '750 kg' },
  { strength: 11, feat: "Ribaltare un'auto grande", weight: '1000 kg' },
  { strength: 12, feat: 'Sollevare una palla da demolizione', weight: '1500 kg' },
  { strength: 13, feat: 'Ribaltare una station wagon', weight: '2000 kg' },
  { strength: 14, feat: 'Ribaltare un furgone', weight: '2500 kg' },
  { strength: 15, feat: 'Ribaltare un autocarro', weight: '3000 kg' },
];

// 9. GERARCHIA DEI PECCATI / MORALITÀ (Tavola 1)
export const SCREEN_MORALITY_SINS = [
  { level: 10, sin: 'Pensieri egoistici.', dice: 'Tirate 5 dadi' },
  { level: 9, sin: 'Azione egoistica non grave (es. non fare la carità).', dice: 'Tirate 5 dadi' },
  { level: 8, sin: 'Causare danno ad altri (accidentalmente o no).', dice: 'Tirate 4 dadi' },
  { level: 7, sin: 'Furto di minore entità (es. rubare in un negozio).', dice: 'Tirate 4 dadi' },
  { level: 6, sin: 'Furto di grave entità (es. svaligiare un appartamento).', dice: 'Tirate 3 dadi' },
  { level: 5, sin: 'Vandalismo grave e volontario (es. appiccare un incendio).', dice: 'Tirate 3 dadi' },
  { level: 4, sin: 'Crimine passionale (es. omicidio colposo).', dice: 'Tirate 3 dadi' },
  { level: 3, sin: 'Crimine premeditato (es. assassinio).', dice: 'Tirate 2 dadi' },
  { level: 2, sin: 'Crimine immotivato / recidivo (es. assassinio seriale).', dice: 'Tirate 2 dadi' },
  { level: 1, sin: 'Perversione totale, atti abominevoli (es. strage).', dice: 'Tirate 2 dadi' },
];

// 10. MODIFICATORI ALLA MANIFESTAZIONE (Tavola 1)
export const SCREEN_MANIFESTATION_MODS = [
  { place: 'Cimitero', mod: '+3' },
  { place: 'Campo di battaglia', mod: '+3' },
  { place: 'Chiesa', mod: '+2' },
  { place: 'Ospedale', mod: '+2' },
  { place: 'Antico edificio (100 o più anni)', mod: '+2' },
  { place: 'Vecchio edificio (50-100 anni)', mod: '+1' },
  { place: 'Struttura costruita a mano (ponte di legno, baracca)', mod: '+1' },
  { place: 'Area di parcheggio', mod: '-1' },
  { place: 'Edificio commerciale moderno (negozio, centro commerciale)', mod: '-1' },
  { place: 'Edificio industriale moderno', mod: '-2' },
  { place: 'Laboratorio moderno', mod: '-3' },
];

// 11. FUOCO, ELETTRICITÀ, VELENI & GUARIGIONE (Tavola 2)
export const SCREEN_ELECTRICITY = [
  { source: 'Minore (presa del muro)', damage: '4 (C) per turno' },
  { source: 'Maggiore (recinto di protezione)', damage: '6 (C) per turno' },
  { source: 'Severa (scatola di derivazione)', damage: '8 (C) per turno' },
  { source: 'Fatale (cavi alta tensione, rotaia metropolitana)', damage: '10 (C) per turno' },
];

export const SCREEN_FIRE_SIZE = [
  { size: 'Torcia', damage: '1 (L)' },
  { size: 'Falò', damage: '2 (L)' },
  { size: 'Incendio', damage: '3 (L)' },
];

export const SCREEN_FIRE_HEAT = [
  { heat: 'Candela (ustione I grado)', mod: '—' },
  { heat: 'Torcia (ustione II grado)', mod: '+1' },
  { heat: 'Bruciatore Bunsen (ustione III grado)', mod: '+2' },
  { heat: 'Fuoco chimico / Metallo fuso', mod: '+3' },
];

export const SCREEN_POISONS = [
  { poison: 'Abuso di Alcol / Droga (Ingestione, Inalazione, Iniezione)', toxicity: 'da 3 a 7' },
  { poison: 'Ammoniaca (Inalazione)', toxicity: '3' },
  { poison: 'Candeggina (Ingestione)', toxicity: '4' },
  { poison: 'Cianuro (Ingestione o Inalazione)', toxicity: '7' },
  { poison: 'Salmonella (Ingestione)', toxicity: '2' },
  { poison: 'Sostanza Velenosa (Iniezione o Inalazione)', toxicity: 'da 3 a 8' },
];

export const SCREEN_HEALING_RATES = [
  { type: 'Danno Contundente (/)', time: '1 punto ogni 15 Minuti' },
  { type: 'Danno Letale (✕)', time: '1 punto ogni 2 Giorni' },
  { type: 'Danno Aggravato (✦)', time: '1 punto ogni 1 Settimana' },
];

