import React, { useState } from 'react';
import type { CampaignConfig, Character, CreatureType, CharacterAttributes, CharacterAbilities, CampaignMap } from '../types';
import { QUICK_START_SCENARIOS, createDefaultCharacter, WOD_CREATION_LIMITS } from '../utils/characterTemplates';
import { WOD_VIRTUES, WOD_VICES, calculateDerivedTraits } from '../utils/traitLabels';
import {
  WOD_MERITS_AND_FLAWS,
  ALL_STORYTELLER_GEAR_OPTIONS,
  getStartingGearForEra,
  getCharacterArmorStatsFromGear,
  convertGearOptionToInventoryItem,
  deduceStartingGearForCastCharacter,
  type ScreenGearCategory,
} from '../utils/wodMeritsAndGear';
import { DotRating } from './DotRating';
import { compressMapImage } from '../utils/mapStorage';
import {
  Sparkles,
  Dices,
  Skull,
  Moon,
  Compass,
  Shield,
  Flame,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Sun,
  Sunset,
  Sunrise,
  AlertTriangle,
  Info,
  RotateCcw,
  Tv,
  Zap,
  Package,
  Check,
  Upload,
  Users,
  Bot,
  CheckCircle2,
  MapPin,
  Trash2,
} from 'lucide-react';

interface CampaignWizardProps {
  onStartCampaign: (config: CampaignConfig, character: Character | null, initialHook?: string) => void;
  onOpenLoadChronicle?: () => void;
  onOpenTutorial?: () => void;
}

export const CampaignWizard: React.FC<CampaignWizardProps> = ({ onStartCampaign, onOpenLoadChronicle, onOpenTutorial }) => {
  const [tab, setTab] = useState<'guided' | 'quick'>('guided');
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSpectatorHost, setIsSpectatorHost] = useState(false);

  // Mappe Caricate (Generale e Singoli Luoghi)
  const [wizardMaps, setWizardMaps] = useState<CampaignMap[]>([]);
  const [activeMapId, setActiveMapId] = useState<string | undefined>();

  const handleMapUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: 'general' | 'location') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imageUrl = await compressMapImage(file, 1600, 1200, 0.75);
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      const newMap: CampaignMap = {
        id: `map_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: category === 'general' ? `Mappa Generale - ${city || baseName}` : baseName,
        category,
        imageUrl,
        createdAt: Date.now(),
      };
      setWizardMaps((prev) => {
        const next = [...prev, newMap];
        if (!activeMapId) setActiveMapId(newMap.id);
        return next;
      });
    } catch (err) {
      console.error('[CampaignWizard] Errore compressione mappa:', err);
    } finally {
      e.target.value = '';
    }
  };

  const handleRemoveMap = (mapId: string) => {
    setWizardMaps((prev) => {
      const next = prev.filter((m) => m.id !== mapId);
      if (activeMapId === mapId) {
        setActiveMapId(next[0]?.id);
      }
      return next;
    });
  };

  const handleRenameMap = (mapId: string, newName: string) => {
    setWizardMaps((prev) => prev.map((m) => (m.id === mapId ? { ...m, name: newName } : m)));
  };

  // STEP 1: AMBIENTAZIONE E MONDO
  const [title, setTitle] = useState('Il Sangue della Frontiera');
  const [era, setEra] = useState<string>('wild_west');
  const [customEraInput, setCustomEraInput] = useState('');
  const [city, setCity] = useState('Tombstone, Arizona');
  const [timeOfDay, setTimeOfDay] = useState('Mezzogiorno / Sole Pieno');
  const [tone, setTone] = useState<'investigative' | 'survival' | 'politics' | 'action' | 'horror' | 'epic_adventure'>('epic_adventure');
  const [difficulty, setDifficulty] = useState<'narrative' | 'standard' | 'brutal'>('standard');
  const [selectedEnemies, setSelectedEnemies] = useState<string[]>([
    'Banda di Fuorilegge Non-Morti',
    'Cospirazione dei Notabili',
  ]);
  const [customPlot, setCustomPlot] = useState('');
  const [storyOutlineContent, setStoryOutlineContent] = useState('');
  const [storyOutlineFileName, setStoryOutlineFileName] = useState<string | undefined>();
  const [isExtractingOutline, setIsExtractingOutline] = useState(false);
  const [outlineAnalysisNotice, setOutlineAnalysisNotice] = useState<string | null>(null);

  // Cast Importato nello Step 2
  const [wizardRoster, setWizardRoster] = useState<Character[]>([]);
  const [castFileName, setCastFileName] = useState<string | null>(null);
  const [isExtractingCast, setIsExtractingCast] = useState(false);
  const [castExtractError, setCastExtractError] = useState<string | null>(null);
  const [selectedCastCharId, setSelectedCastCharId] = useState<string | null>(null);

  const analyzeStoryOutlineText = async (textToAnalyze: string) => {
    if (!textToAnalyze || textToAnalyze.trim().length < 25) return;
    try {
      setIsExtractingOutline(true);
      const res = await fetch('/api/ai/analyze-story-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outlineText: textToAnalyze }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.title) setTitle(data.title);
        if (data.location) setCity(data.location);
        if (data.era) {
          if (data.era === 'custom') {
            setEra('custom');
            if (data.customEraDescription) setCustomEraInput(data.customEraDescription);
          } else {
            setEra(data.era);
            if (data.customEraDescription) setCustomEraInput(data.customEraDescription);
          }
        }
        if (data.initialLight) setTimeOfDay(data.initialLight);
        setOutlineAnalysisNotice(
          `✨ Titolo: "${data.title}" • Luogo: "${data.location}" • Epoca: "${data.customEraDescription || data.era}" rilevati e impostati in automatico dalla tua bozza!`
        );
      }
    } catch (err) {
      console.warn('Errore analisi bozza:', err);
    } finally {
      setIsExtractingOutline(false);
    }
  };

  const handleOutlineFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtractingOutline(true);
    setStoryOutlineFileName(file.name);
    setOutlineAnalysisNotice(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          resolve(res.split(',')[1] || res);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const fileBase64 = await base64Promise;

      const res = await fetch('/api/extract-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64, fileName: file.name }),
      });

      if (res.ok) {
        const data = await res.json();
        const extractedText = (data.text || '').trim();
        setStoryOutlineContent(extractedText);

        // Deduzione automatica con IA
        await analyzeStoryOutlineText(extractedText);
      } else {
        throw new Error('Errore estrazione testo dal file');
      }
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || '';
        setStoryOutlineContent(text);
      };
      reader.readAsText(file);
    } finally {
      setIsExtractingOutline(false);
    }
  };

  const handleApplyCastCharacter = (c: Character) => {
    setIsSpectatorHost(false);
    setSelectedCastCharId(c.id);
    setCharName(c.name || 'Protagonista');
    setConcept(c.concept || 'Avventuriero');
    setCharBackgroundNotes(c.backgroundNotes || c.notes || '');
    if (c.creatureType) {
      setCreatureType(c.creatureType as CreatureType);
    }
    if (c.factionOrClan) {
      setClan(c.factionOrClan);
      setCustomClan(c.factionOrClan);
    }
    if (c.attributes) {
      setCustomAttrs(c.attributes);
    }
    if (c.abilities) {
      const fixedAbilities = { ...c.abilities };
      const bioScan = `${c.name || ''} ${c.concept || ''} ${c.backgroundNotes || ''} ${(Array.isArray(c.structuredInventory) ? c.structuredInventory.map((i) => i.name).join(' ') : '')} ${(Array.isArray(c.inventory) ? c.inventory.join(' ') : '')}`.toLowerCase();
      
      const usesMelee = /katana|spada|daga|pugnale|ascia|lancia|lama|mischia|claymore|zanne|spadaccin|guerrier|mercenari/i.test(bioScan);
      const usesRanged = /fucil|pistol|revolver|arco|balestr|cecchin|tirator|frecc|munizion|ottica|occhio del corvo/i.test(bioScan);
      
      if (usesMelee && (fixedAbilities.weaponry || 0) < 2) {
        fixedAbilities.weaponry = /doppi|gemell|zanne|lupo di ferro|maestro|letale/i.test(bioScan) ? 4 : 3;
      }
      if (usesRanged && (fixedAbilities.firearms || 0) < 2) {
        fixedAbilities.firearms = /cecchin|tirator|occhio del corvo|maestro/i.test(bioScan) ? 4 : 3;
      }
      setCustomAbilities(fixedAbilities);
    }

    // Sincronizzazione automatica e immediata dell'equipaggiamento dal Cast allo Schermo del Narratore
    const deducedGearIds = deduceStartingGearForCastCharacter(c, era);
    if (deducedGearIds && deducedGearIds.length > 0) {
      setSelectedGearIds(deducedGearIds);
    }
    if (Array.isArray(c.structuredInventory) && c.structuredInventory.length > 0) {
      setCustomGearItems(c.structuredInventory);
    } else {
      setCustomGearItems([]);
    }
  };

  const handleCastFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtractingCast(true);
    setCastFileName(file.name);
    setCastExtractError(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          resolve(res.split(',')[1] || res);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const fileBase64 = await base64Promise;

      const res = await fetch('/api/ai/import-cast-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64, fileName: file.name }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Errore HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!data.characters || !Array.isArray(data.characters) || data.characters.length === 0) {
        throw new Error('Nessun personaggio trovato nel file');
      }

      // Arricchisci ogni personaggio (inclusi i comprimari/PNG per smartphone o per l'IA Narratore) con l'equipaggiamento dedotto dal ruolo ed epoca
      const chars: Character[] = data.characters.map((ch: any) => {
        const gearIds = deduceStartingGearForCastCharacter(ch, era);
        const gearOptions = ALL_STORYTELLER_GEAR_OPTIONS.filter((g) => gearIds.includes(g.id));
        const structuredFromGear = gearOptions.map(convertGearOptionToInventoryItem);

        const hasCustomItems = Array.isArray(ch.structuredInventory) && ch.structuredInventory.length > 0;
        const finalStructured = hasCustomItems ? ch.structuredInventory : structuredFromGear;
        const finalInventory = hasCustomItems ? ch.inventory : structuredFromGear.map((i) => i.name);

        return {
          ...ch,
          structuredInventory: finalStructured,
          inventory: finalInventory,
        };
      });

      setWizardRoster(chars);

      // Pre-seleziona il primo personaggio per il Master solo se non è in modalità Schermo Spettatore
      if (!isSpectatorHost) {
        const firstChar = chars[0];
        handleApplyCastCharacter(firstChar);

        // Se il primo personaggio appartiene a un regno/fazione specifico (es. "Ex Regno di Aethelgard") e la città è rimasta Tombstone o vuota, sincronizzala!
        if (firstChar?.factionOrClan && (city === 'Tombstone, Arizona' || !city)) {
          const cleanRealm = firstChar.factionOrClan.replace(/^ex\s+/i, '').split('/')[0].trim();
          if (cleanRealm && cleanRealm.length > 2 && !cleanRealm.toLowerCase().includes('taglie') && !cleanRealm.toLowerCase().includes('cowboy')) {
            setCity(cleanRealm);
          }
        }
      }
    } catch (err: any) {
      console.error('Errore estrazione cast:', err);
      setCastExtractError(err.message || 'Errore durante l\'analisi del file cast');
    } finally {
      setIsExtractingCast(false);
    }
  };

  // STEP 2: CREAZIONE PERSONAGGIO
  const [creatureType, setCreatureType] = useState<CreatureType>('hunter');
  const [charName, setCharName] = useState('Silas Cole');
  const [concept, setConcept] = useState('Pistolero Solitario');
  const [clan, setClan] = useState('Cacciatore di Taglie');
  const [customClan, setCustomClan] = useState('');
  const [archetype, setArchetype] = useState<'investigator' | 'predator' | 'manipulator' | 'custom'>('predator');
  const [charBackgroundNotes, setCharBackgroundNotes] = useState<string>('');

  // Meriti & Difetti WoD
  const [selectedMeritIds, setSelectedMeritIds] = useState<string[]>(['merit_quick_draw']);

  // Equipaggiamento iniziale dalle Tabelle Ufficiali dello Schermo del Narratore
  const [selectedGearIds, setSelectedGearIds] = useState<string[]>([
    'screen_ranged_revolver_heavy',
    'screen_ammo_pistol_pack',
    'screen_melee_knife',
    'screen_armor_reinforced_clothes',
  ]);
  const [customGearItems, setCustomGearItems] = useState<any[]>([]);
  const [gearTab, setGearTab] = useState<'all' | ScreenGearCategory>('all');
  const [filterGearByEra, setFilterGearByEra] = useState<boolean>(false);

  // Regole Chronica Engine: Priorità Categorie Attributi (5 / 4 / 3)
  const [primaryCat, setPrimaryCat] = useState<'physical' | 'social' | 'mental'>('physical');
  const [secondaryCat, setSecondaryCat] = useState<'physical' | 'social' | 'mental'>('mental');
  const tertiaryCat = (['physical', 'mental', 'social'] as const).find(
    (c) => c !== primaryCat && c !== secondaryCat
  ) || 'social';

  // Matrice Attributi 3x3 Chronica Engine (partenza da 1 base per ogni attributo)
  const [customAttrs, setCustomAttrs] = useState<CharacterAttributes>({
    intelligence: 2,
    wits: 3,
    resolve: 2,
    strength: 3,
    dexterity: 3,
    stamina: 2,
    presence: 2,
    manipulation: 2,
    composure: 2,
  });

  // Virtù e Vizio (Psicologia ufficiale delle schede)
  const [virtue, setVirtue] = useState<string>('Prudenza');
  const [vice, setVice] = useState<string>('Orgoglio');

  // Personalizzazione Abilità Iniziali (Regola WoD: 11 / 7 / 4)
  const [showAbilitiesCustom, setShowAbilitiesCustom] = useState(false);
  const [customAbilities, setCustomAbilities] = useState<CharacterAbilities>(() => {
    return createDefaultCharacter('hunter').abilities;
  });

  const [showBudgetWarningModal, setShowBudgetWarningModal] = useState(false);

  const eraOptions = [
    { id: 'wild_west', label: 'Far West (1880)', desc: 'Deserto, saloon, pistoleri e sceriffi' },
    { id: 'feudal_japan', label: 'Giappone Feudale (Sengoku)', desc: 'Samurai, ninja, onore e spiriti Kami' },
    { id: 'imperial_china', label: 'Cina Imperiale (Dinastie)', desc: 'Corti imperiali, maestri wuxia e alchimia' },
    { id: 'fantasy_realms', label: 'High Fantasy (Stile D&D)', desc: 'Magia arcana, dungeon, fortezze e mostri' },
    { id: 'pirates', label: 'Pirati & Mari del Sud (1715)', desc: 'Vele nere, tesori aztechi, voodoo e arrembaggi' },
    { id: 'ancient_myths', label: 'Antichità & Miti (Egitto/Roma)', desc: 'Sabbie cocenti, piramidi, arene e divinità' },
    { id: 'modern', label: 'Epoca Contemporanea', desc: 'Metropoli moderne, thriller e cospirazioni' },
    { id: 'cyberpunk', label: 'Cyberpunk / Distopia Futura', desc: 'Megacorporazioni, neon, cromo e tecnologia' },
    { id: 'victorian', label: 'Epoca Vittoriana (1888)', desc: 'Londra nebbiosa, lampioni a gas e misteri' },
    { id: 'custom', label: 'Altra Era / Personalizzata...', desc: 'Scrivi qualsiasi universo o periodo storico' },
  ];

  const enemySuggestionsByEra: Record<string, string[]> = {
    wild_west: ['Banda di Fuorilegge Non-Morti', 'Cospirazione dei Notabili', 'Spiriti del Canyon Maledetto', 'Cacciatori di Taglie rivali'],
    feudal_japan: ['Ninja del Clan Rivali', 'Demoni Oni della Montagna', 'Lo Shogun Corrotto', 'Spiriti Vendicativi Yurei'],
    imperial_china: ['Spie della Città Proibita', 'Cultisti del Sangue Nero', 'Spiriti Yaoguai', 'Guerrieri dell\'Esercito Imperiale'],
    fantasy_realms: ['Cultisti del Drago d\'Ombra', 'Mercenari del Re Tiranno', 'Maghi Rinnegati', 'Orde del Sottosuolo'],
    pirates: ['La Marina Britannica', 'Corsari Fantasma', 'Stregoni del Voodoo Nero', 'Ammiragli dell\'Inquisizione'],
    ancient_myths: ['I Sacerdoti di Set / Osiride', 'Legioni Romane Maledette', 'Cultisti di Anubi', 'Mostri della Mitologia'],
    modern: ['Inquisizione / Cacciatori', 'Sindacato Criminale Occulto', 'Congiura dei Notabili', 'Fazione Ribelle', 'Mercenari Corporativi'],
    cyberpunk: ['Agenti della Sicurezza Corporativa', 'Hacker d\'Assalto Potenziati', 'Sindacato Criminale della Yakuza', 'IA Ribelle'],
  };

  const currentEnemyList = enemySuggestionsByEra[era] || [
    'Inquisizione / Cacciatori',
    'Cospirazione Interna',
    'Antagonisti del Potere',
    'Creature dell\'Ombra',
    'Mercenari Rivali',
  ];

  const toggleEnemy = (item: string) => {
    if (selectedEnemies.includes(item)) {
      setSelectedEnemies(selectedEnemies.filter((e) => e !== item));
    } else {
      setSelectedEnemies([...selectedEnemies, item]);
    }
  };

  const getClanOptions = () => {
    if (era === 'feudal_japan') {
      return ['Clan dei Samurai Fedeli', 'Shinobi dell\'Ombra', 'Monaci Guerrieri Yamabushi', 'Stirpe degli Hengeyokai (Spiriti Bestia)', 'Rōnin Senza Padrone', 'Altro...'];
    }
    if (era === 'wild_west') {
      return ['Pistolero Solitario', 'Sceriffo Federale', 'Cacciatore di Taglie', 'Tribù dei Veggenti della Prateria', 'Fuorilegge Redento', 'Altro...'];
    }
    if (era === 'imperial_china') {
      return ['Maestri Alchimisti del Tao', 'Setta della Spada Celeste', 'Guardie della Città Proibita', 'Medici della Medicina Sacra', 'Altro...'];
    }
    if (era === 'fantasy_realms') {
      return ['Ordine dei Paladini Solari', 'Gilda delle Rune Proibite', 'Ladri della Rosa Nera', 'Cerchio dei Druidi', 'Cavalieri Mercenari', 'Altro...'];
    }
    if (creatureType === 'vampire') {
      return [
        'Eredi del Sangue Sovrano (Dominio & Influenza)',
        'Cacciatori dell\'Ombra (Furtività & Predazione)',
        'Signori dell\'Impatto (Forza Bruta & Resistenza)',
        'I Mistici del Sangue (Riti & Segreti Occulti)',
        'Non Allineato / Rinnegato',
        'Altro...',
      ];
    } else if (creatureType === 'werewolf') {
      return [
        'Branco degli Artigli da Guerra (Lotta & Assalto)',
        'Guardiani degli Spiriti (Misticismo & Visioni)',
        'Cacciatori Silenziosi (Tracciamento & Furtività)',
        'Condottieri del Patto (Comando & Risolutezza)',
        'Solitario Senza Branco',
        'Altro...',
      ];
    } else if (creatureType === 'mage') {
      return [
        'Ordine delle Forze Elementali (Energia & Distruzione)',
        'Tessitori della Trama Arcana (Spazio & Barriere)',
        'Custodi delle Menti (Telepatia & Controllo)',
        'Alchimisti e Trasmutatori (Materia & Pozioni)',
        'Sapienti del Tempo e del Destino (Presagi & Fortuna)',
        'Altro...',
      ];
    }
    return ['Compagnia di Ventura', 'Investigatore Indipendente', 'Veterano delle Guerre', 'Gilda di Mestiere', 'Agente Segreto', 'Altro...'];
  };

  const getCategoryBudget = (cat: 'physical' | 'social' | 'mental') => {
    if (cat === primaryCat) return WOD_CREATION_LIMITS.ATTRIBUTES.POOL_PRIMARY; // 5
    if (cat === secondaryCat) return WOD_CREATION_LIMITS.ATTRIBUTES.POOL_SECONDARY; // 4
    return WOD_CREATION_LIMITS.ATTRIBUTES.POOL_TERTIARY; // 3
  };

  const physSpent = (customAttrs.strength - 1) + (customAttrs.dexterity - 1) + (customAttrs.stamina - 1);
  const socSpent = (customAttrs.presence - 1) + (customAttrs.manipulation - 1) + (customAttrs.composure - 1);
  const menSpent = (customAttrs.intelligence - 1) + (customAttrs.wits - 1) + (customAttrs.resolve - 1);
  const totalAttrSpent = physSpent + socSpent + menSpent;

  const physBudget = getCategoryBudget('physical');
  const socBudget = getCategoryBudget('social');
  const menBudget = getCategoryBudget('mental');

  const isAttrBudgetValid = physSpent <= physBudget && socSpent <= socBudget && menSpent <= menBudget && totalAttrSpent === 12;

  const menAbilSpent = (customAbilities.academics || 0) +
    (customAbilities.computer || 0) +
    (customAbilities.investigation || 0) +
    (customAbilities.crafts || 0) +
    (customAbilities.medicine || 0) +
    (customAbilities.occult || 0) +
    (customAbilities.politics || 0) +
    (customAbilities.science || 0);

  const physAbilSpent = (customAbilities.athletics || 0) +
    (customAbilities.brawl || 0) +
    (customAbilities.drive || 0) +
    (customAbilities.firearms || 0) +
    (customAbilities.larceny || 0) +
    (customAbilities.stealth || 0) +
    (customAbilities.survival || 0) +
    (customAbilities.weaponry || 0);

  const socAbilSpent = (customAbilities.animalKen || 0) +
    (customAbilities.empathy || 0) +
    (customAbilities.expression || 0) +
    (customAbilities.intimidation || 0) +
    (customAbilities.persuasion || 0) +
    (customAbilities.socialize || 0) +
    (customAbilities.streetwise || 0) +
    (customAbilities.subterfuge || 0);

  const totalAbilSpent = menAbilSpent + physAbilSpent + socAbilSpent;

  const handleSetPrimaryCat = (newCat: 'physical' | 'social' | 'mental') => {
    if (newCat === secondaryCat) {
      setSecondaryCat(primaryCat);
    }
    setPrimaryCat(newCat);
  };

  const handleSetSecondaryCat = (newCat: 'physical' | 'social' | 'mental') => {
    if (newCat === primaryCat) {
      setPrimaryCat(secondaryCat);
    }
    setSecondaryCat(newCat);
  };

  const resetToWodBalanced = () => {
    const newAttrs: CharacterAttributes = {
      intelligence: 1,
      wits: 1,
      resolve: 1,
      strength: 1,
      dexterity: 1,
      stamina: 1,
      presence: 1,
      manipulation: 1,
      composure: 1,
    };

    // Assegna budget primaria (+5 extra: es. 3, 2, 2)
    if (primaryCat === 'physical') {
      newAttrs.strength = 3; newAttrs.dexterity = 3; newAttrs.stamina = 2;
    } else if (primaryCat === 'social') {
      newAttrs.presence = 3; newAttrs.manipulation = 3; newAttrs.composure = 2;
    } else {
      newAttrs.intelligence = 3; newAttrs.wits = 3; newAttrs.resolve = 2;
    }

    // Assegna budget secondaria (+4 extra: es. 2, 2, 2)
    if (secondaryCat === 'physical') {
      newAttrs.strength = 2; newAttrs.dexterity = 3; newAttrs.stamina = 2;
    } else if (secondaryCat === 'social') {
      newAttrs.presence = 2; newAttrs.manipulation = 3; newAttrs.composure = 2;
    } else {
      newAttrs.intelligence = 3; newAttrs.wits = 2; newAttrs.resolve = 2;
    }

    // Assegna budget terziaria (+3 extra: es. 2, 2, 1)
    if (tertiaryCat === 'physical') {
      newAttrs.strength = 2; newAttrs.dexterity = 2; newAttrs.stamina = 2;
    } else if (tertiaryCat === 'social') {
      newAttrs.presence = 2; newAttrs.manipulation = 2; newAttrs.composure = 2;
    } else {
      newAttrs.intelligence = 2; newAttrs.wits = 2; newAttrs.resolve = 2;
    }

    setCustomAttrs(newAttrs);
  };

  const applyArchetype = (type: 'investigator' | 'predator' | 'manipulator' | 'custom') => {
    setArchetype(type);
    if (type === 'investigator') {
      setPrimaryCat('mental');
      setSecondaryCat('physical');
      setCustomAttrs({
        intelligence: 3,
        wits: 3,
        resolve: 2,
        strength: 2,
        dexterity: 3,
        stamina: 2,
        presence: 2,
        manipulation: 2,
        composure: 2,
      });
      setConcept('Detective / Studioso dell\'Occulto');
      setVirtue('Prudenza');
      setVice('Orgoglio');
    } else if (type === 'predator') {
      setPrimaryCat('physical');
      setSecondaryCat('mental');
      setCustomAttrs({
        intelligence: 2,
        wits: 3,
        resolve: 2,
        strength: 3,
        dexterity: 3,
        stamina: 2,
        presence: 2,
        manipulation: 1,
        composure: 3,
      });
      setConcept('Guerriero / Pistolero');
      setVirtue('Fortezza');
      setVice('Ira');
    } else if (type === 'manipulator') {
      setPrimaryCat('social');
      setSecondaryCat('mental');
      setCustomAttrs({
        intelligence: 2,
        wits: 3,
        resolve: 2,
        strength: 2,
        dexterity: 2,
        stamina: 2,
        presence: 3,
        manipulation: 3,
        composure: 2,
      });
      setConcept('Diplomatico / Mediatore');
      setVirtue('Temperanza');
      setVice('Avarizia');
    }
  };

  const handleStartChronicle = () => {
    const activeEraLabel = era === 'custom' && customEraInput.trim()
      ? customEraInput.trim()
      : eraOptions.find((e) => e.id === era)?.label || era;

    let finalCity = city.trim();
    if (era !== 'wild_west' && (!finalCity || finalCity.toLowerCase().includes('tombstone'))) {
      const rosterRealm = wizardRoster[0]?.factionOrClan ? wizardRoster[0].factionOrClan.replace(/^ex\s+/i, '').split('/')[0].trim() : '';
      finalCity = customEraInput.trim() || (rosterRealm && !rosterRealm.toLowerCase().includes('taglie') ? rosterRealm : '') || 'Regno / Area Personalizzata';
    }
    if (!finalCity) {
      finalCity = customEraInput.trim() || 'Terre Selvagge';
    }

    const config: CampaignConfig = {
      id: `camp_${Date.now()}`,
      title: title || 'Epica Cronaca',
      era,
      eraLabel: activeEraLabel,
      city: finalCity,
      timeOfDay,
      creatureType,
      enemies: selectedEnemies.length > 0 ? selectedEnemies : ['Le Insidie del Mondo'],
      tone,
      difficulty,
      customPlotHook: customPlot.trim() || undefined,
      customStoryOutline: storyOutlineContent.trim()
        ? {
            fileName: storyOutlineFileName || 'Canovaccio_Autore.txt',
            content: storyOutlineContent.trim(),
            uploadedAt: Date.now(),
            wordCount: storyOutlineContent.trim().split(/\s+/).filter(Boolean).length,
          }
        : undefined,
      maps: wizardMaps.length > 0 ? wizardMaps : undefined,
      activeMapId: activeMapId || (wizardMaps.length > 0 ? wizardMaps[0].id : undefined),
      rosterCharacters: wizardRoster.length > 0 ? wizardRoster : undefined,
      isQuickStart: false,
    };

    if (isSpectatorHost) {
      onStartCampaign(config, null, customPlot.trim());
      return;
    }

    const finalFaction = clan === 'Altro...' && customClan.trim() ? customClan.trim() : clan;
    const baseChar = createDefaultCharacter(creatureType);

    // 1. Meriti e Difetti selezionati
    const chosenMerits = WOD_MERITS_AND_FLAWS.filter((m) => selectedMeritIds.includes(m.id));

    // 2. Equipaggiamento iniziale: Tabelle Ufficiali + Oggetti Specialistici Unici estratti dall'IA
    const chosenGear = ALL_STORYTELLER_GEAR_OPTIONS.filter((g) => selectedGearIds.includes(g.id));
    const structuredFromGear = chosenGear.map(convertGearOptionToInventoryItem);
    const armorStats = getCharacterArmorStatsFromGear(selectedGearIds);

    // Unione con gli oggetti specialistici estratti dall'IA per il personaggio (qualsiasi ruolo o classe)
    const existingNames = new Set(structuredFromGear.map((g) => g.name.toLowerCase().trim()));
    const extraCustom = customGearItems.filter(
      (c) => c && c.name && !existingNames.has(c.name.toLowerCase().trim())
    );
    const finalStructured = [...structuredFromGear, ...extraCustom];

    const derived = calculateDerivedTraits(customAttrs, 5);
    const healthLevels = [];
    for (let i = 0; i < derived.healthMax; i++) {
      const fromEnd = derived.healthMax - 1 - i;
      if (fromEnd === 0) {
        healthLevels.push({ label: 'Incapacitato', penalty: -99, damage: 'none' as const });
      } else if (fromEnd === 1) {
        healthLevels.push({ label: 'Ferito Grave (-2)', penalty: -2, damage: 'none' as const });
      } else if (fromEnd === 2) {
        healthLevels.push({ label: 'Ferito (-1)', penalty: -1, damage: 'none' as const });
      } else {
        healthLevels.push({ label: `Sano (${i + 1})`, penalty: 0, damage: 'none' as const });
      }
    }

    // Sanity check di sicurezza abilità <-> inventario effettivo
    const finalAbilities = { ...customAbilities };
    const allGearText = finalStructured.map((i) => i.name).join(' ').toLowerCase();
    const hasMelee = /katana|spada|daga|pugnale|ascia|lancia|lama|mischia|claymore|zanne/i.test(allGearText) || selectedGearIds.some((id) => id.includes('melee'));
    const hasRanged = /fucil|pistol|revolver|arco|balestr|cecchin|tirator|frecc|munizion/i.test(allGearText) || selectedGearIds.some((id) => id.includes('ranged'));
    
    if (hasMelee && (finalAbilities.weaponry || 0) < 2) {
      finalAbilities.weaponry = /doppi|gemell|zanne|lupo/i.test(charName + ' ' + allGearText) ? 4 : 3;
    }
    if (hasRanged && (finalAbilities.firearms || 0) < 2) {
      finalAbilities.firearms = 3;
    }

    const finalChar: Character = {
      ...baseChar,
      name: charName.trim() || 'Avventuriero Senza Nome',
      concept: concept.trim() || 'Sopravvissuto',
      factionOrClan: finalFaction,
      virtue,
      vice,
      nature: virtue,
      demeanor: vice,
      attributes: customAttrs,
      abilities: finalAbilities,
      defense: Math.max(0, derived.defense + armorStats.defensePenalty),
      initiativeMod: derived.initiativeMod,
      speed: Math.max(1, derived.speed + armorStats.speedPenalty),
      size: derived.size,
      armor: armorStats.armorValue,
      willpower: { current: derived.willpowerMax, max: derived.willpowerMax },
      health: healthLevels,
      meritsFlaws: chosenMerits,
      structuredInventory: finalStructured.length > 0 ? finalStructured : baseChar.structuredInventory,
      inventory: finalStructured.length > 0 ? finalStructured.map((i) => i.name) : baseChar.inventory,
      notes: charBackgroundNotes || baseChar.notes,
      backgroundNotes: charBackgroundNotes || baseChar.backgroundNotes,
    };

    onStartCampaign(config, finalChar, customPlot.trim());
  };

  const handleSelectQuickScenario = (index: number, customizeFirst: boolean = false) => {
    const scenario = QUICK_START_SCENARIOS[index];
    if (customizeFirst) {
      setTitle(`${scenario.city} - La Prova del Destino`);
      setEra(scenario.era);
      setCity(scenario.city);
      setCreatureType(scenario.creature);
      setCharName(scenario.characterName);
      setConcept(scenario.characterConcept);
      setClan(scenario.faction);
      setSelectedEnemies(scenario.enemies);
      setTone(scenario.tone);
      setCustomPlot(scenario.hook);
      if ((scenario as any).startingGearIds) {
        setSelectedGearIds((scenario as any).startingGearIds);
      }
      setTab('guided');
      setWizardStep(2);
      return;
    }

    const config: CampaignConfig = {
      id: `camp_${Date.now()}`,
      title: `${scenario.city} - La Prova del Destino`,
      era: scenario.era,
      eraLabel: scenario.eraLabel,
      city: scenario.city,
      timeOfDay: 'Mezzogiorno o Tramonto',
      creatureType: scenario.creature,
      enemies: scenario.enemies,
      tone: scenario.tone,
      difficulty: 'standard',
      customPlotHook: scenario.hook,
      isQuickStart: true,
    };

    const char = createDefaultCharacter(
      scenario.creature,
      scenario.characterName,
      scenario.characterConcept,
      scenario.faction,
      (scenario as any).startingGearIds
    );
    onStartCampaign(config, char, scenario.hook);
  };

  return (
    <div className="max-w-4xl mx-auto w-full bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl shadow-indigo-950/40 overflow-hidden backdrop-blur-md my-2 sm:my-4">
      {/* Banner Titolo & Tabs */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950/80 to-slate-950 p-4 sm:p-8 border-b border-slate-800 text-center relative">
        <div className="inline-flex items-center space-x-2 text-indigo-400 mb-1.5 sm:mb-2">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
          <span className="font-mono text-[10px] sm:text-sm tracking-widest uppercase font-semibold">
            Chronica • Motore di Storie & Avventure
          </span>
        </div>
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-serif font-black text-slate-100 tracking-wider">
          CREA LA TUA CRONACA
        </h1>
        <p className="text-slate-300 text-xs sm:text-base mt-1 sm:mt-2 max-w-xl mx-auto font-serif italic">
          Spazia liberamente tra epoche, mondi fantastici e ogni momento della giornata: l'unico limite è l'immaginazione.
        </p>

        {/* Tab switcher */}
        <div className="flex justify-center mt-4 sm:mt-6">
          <div className="bg-slate-950/90 p-1 sm:p-1.5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row flex-wrap justify-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            <button
              onClick={() => setTab('guided')}
              className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                tab === 'guided'
                  ? 'bg-gradient-to-r from-red-800 to-indigo-900 text-white shadow-lg shadow-indigo-950/80'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Avventura Personalizzata</span>
            </button>
            <button
              onClick={() => setTab('quick')}
              className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                tab === 'quick'
                  ? 'bg-gradient-to-r from-red-800 to-indigo-900 text-white shadow-lg shadow-indigo-950/80'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Scenari Pronti & Sandbox</span>
            </button>
            {onOpenLoadChronicle && (
              <button
                type="button"
                onClick={onOpenLoadChronicle}
                className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/80 text-emerald-200 shadow-md"
              >
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>📂 Carica Cronaca Salvata</span>
              </button>
            )}
            {onOpenTutorial && (
              <button
                type="button"
                onClick={onOpenTutorial}
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer bg-gradient-to-r from-amber-950/90 to-indigo-950/90 hover:from-amber-900 hover:to-indigo-900 border border-amber-500/70 text-amber-200 shadow-md"
              >
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>✨ Come si Gioca (Tutorial)</span>
              </button>
            )}
          </div>
        </div>

        {/* Stepper a 4 Passaggi */}
        {tab === 'guided' && (
          <div className="flex justify-center items-center space-x-3 sm:space-x-6 mt-7 border-t border-slate-800/80 pt-5">
            {[
              { num: 1, title: '1. Mondo, Trama & Mappe' },
              { num: 2, title: '2. Protagonista & Cast' },
              { num: 3, title: '3. Scheda (Facoltativa)' },
              { num: 4, title: '4. Avvio Tavolo' },
            ].map((st) => (
              <button
                key={st.num}
                onClick={() => setWizardStep(st.num as any)}
                className={`flex items-center space-x-2 text-xs sm:text-sm font-serif uppercase tracking-wider cursor-pointer transition-colors ${
                  wizardStep === st.num
                    ? 'text-indigo-300 font-bold'
                    : wizardStep > st.num
                    ? 'text-emerald-400'
                    : 'text-slate-500'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs ${
                    wizardStep === st.num
                      ? 'bg-indigo-600 text-white shadow-[0_0_8px_rgba(99,102,241,0.6)]'
                      : wizardStep > st.num
                      ? 'bg-emerald-950 border border-emerald-600 text-emerald-400'
                      : 'bg-slate-900 text-slate-500'
                  }`}
                >
                  {wizardStep > st.num ? '✓' : st.num}
                </span>
                <span className="hidden sm:inline">{st.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Contenuto Wizard */}
      <div className="p-6 sm:p-8">
        {tab === 'guided' ? (
          <div>
            {/* STEP 1: IL MONDO & L'EPOCA */}
            {wizardStep === 1 && (
              <div className="space-y-6 sm:space-y-8 animate-fadeIn">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs sm:text-sm uppercase font-mono font-semibold text-slate-300 mb-2">
                      Titolo della Cronaca / Avventura
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-slate-950/90 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-base text-slate-100 focus:outline-none"
                      placeholder="Es. Duello a Mezzogiorno, I Segreti di Kyoto..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm uppercase font-mono font-semibold text-slate-300 mb-2">
                      Luogo, Città o Regione
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-slate-950/90 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-base text-slate-100 focus:outline-none"
                      placeholder="Es. Tombstone, Kyoto, Chang'an, Tortuga, Roma, Praga, New York..."
                    />
                  </div>
                </div>

                {/* Scelta Epoca / Mondo */}
                <div>
                  <label className="block text-xs sm:text-sm uppercase font-mono font-semibold text-slate-300 mb-3">
                    Epoca & Ambientazione (Scegli tra quelle iconiche o personalizza)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {eraOptions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setEra(item.id);
                          // Aggiorna nemici suggeriti per contesto
                          if (enemySuggestionsByEra[item.id]) {
                            setSelectedEnemies(enemySuggestionsByEra[item.id].slice(0, 2));
                          }
                          if (item.id === 'wild_west') {
                            setCity('Tombstone, Arizona');
                            setCreatureType('hunter');
                            setCharName('Silas Vance');
                            setConcept('Pistolero Solitario');
                            setClan('Cacciatore di Taglie');
                            setTimeOfDay('Mezzogiorno / Sole Pieno');
                          } else if (item.id === 'feudal_japan') {
                            setCity('Kyoto, Giappone');
                            setCreatureType('werewolf');
                            setCharName('Kenjiro Takahashi');
                            setConcept('Guerriero Samurai');
                            setClan('Clan dei Samurai Fedeli');
                            setTimeOfDay('Tramonto o Crepuscolo');
                          } else if (item.id === 'imperial_china') {
                            setCity('Chang\'an, Cina Imperiale');
                            setCreatureType('mage');
                            setCharName('Li Wei');
                            setConcept('Maestro Alchimista');
                            setClan('Maestri Alchimisti del Tao');
                            setTimeOfDay('Alba Nebbiosa / Mattino');
                          } else if (item.id === 'fantasy_realms') {
                            setCity('Fortezza dei Monti Grigioferro');
                            setCreatureType('mage');
                            setCharName('Lord Eldrin');
                            setConcept('Mago delle Rune');
                            setClan('Gilda delle Rune Proibite');
                            setTimeOfDay('Ciclo Continuo Dinamico');
                          } else if (item.id === 'custom') {
                            // Se era una città preset del West o di altra epoca fissa, azzerala o assegna l'ambientazione personalizzata
                            if (city === 'Tombstone, Arizona' || city === 'Kyoto, Giappone' || city === 'Chang\'an, Cina Imperiale' || city === 'Fortezza dei Monti Grigioferro') {
                              setCity(customEraInput.trim() || '');
                            }
                          }
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          era === item.id
                            ? 'border-indigo-500 bg-indigo-950/60 text-indigo-200 shadow-md shadow-indigo-950/60'
                            : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold text-sm sm:text-base text-slate-200">{item.label}</div>
                        <div className="text-xs text-slate-400 mt-1">{item.desc}</div>
                      </button>
                    ))}
                  </div>

                  {/* Se sceglie Custom, mostra input personalizzato per Epoca e per Luogo/Regno */}
                  {era === 'custom' && (
                    <div className="mt-4 p-4 bg-indigo-950/30 border border-indigo-700/60 rounded-2xl space-y-3.5 animate-fadeIn">
                      <div>
                        <label className="block text-xs uppercase font-mono font-semibold text-indigo-300 mb-1.5">
                          Descrizione Epoca & Ambientazione Personalizzata
                        </label>
                        <input
                          type="text"
                          value={customEraInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomEraInput(val);
                            // Se la città/luogo era rimasta quella di Tombstone o vuota, sincronizzala automaticamente!
                            if (!city || city === 'Tombstone, Arizona') {
                              setCity(val);
                            }
                          }}
                          placeholder="Descrivi l'ambientazione (es. Regno di Aethelgard, Marte Coloniale 2140, Costantinopoli bizantina...)"
                          className="w-full bg-slate-950 border border-indigo-600 focus:border-indigo-400 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs uppercase font-mono font-semibold text-indigo-300 mb-1.5">
                          Luogo, Capitale o Regione di Partenza della Storia
                        </label>
                        <input
                          type="text"
                          value={city === 'Tombstone, Arizona' ? '' : city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Es. Regno di Aethelgard, Città di Nova Terra, Terre d'Oriente..."
                          className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-400 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none"
                        />
                        <p className="text-[11px] text-slate-400 font-serif mt-1">
                          Questo è il luogo principale che l'IA Narratore userà come teatro degli eventi per la tua cronaca.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Momento della Giornata */}
                <div>
                  <label className="block text-xs sm:text-sm uppercase font-mono font-semibold text-slate-300 mb-2">
                    Momento Iniziale della Giornata / Luce
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { id: 'Mezzogiorno / Sole Pieno', icon: Sun, label: 'Mezzogiorno' },
                      { id: 'Tramonto / Crepuscolo', icon: Sunset, label: 'Tramonto' },
                      { id: 'Alba Nebbiosa / Mattino', icon: Sunrise, label: 'Alba' },
                      { id: 'Notte Profonda', icon: Moon, label: 'Notte' },
                      { id: 'Ciclo Continuo Dinamico', icon: Compass, label: 'Dinamico' },
                    ].map((tod) => {
                      const Icon = tod.icon;
                      return (
                        <button
                          key={tod.id}
                          type="button"
                          onClick={() => setTimeOfDay(tod.id)}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            timeOfDay === tod.id
                              ? 'border-indigo-500 bg-indigo-950/60 text-indigo-200 font-bold'
                              : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <Icon className="w-4 h-4 mx-auto mb-1 text-amber-300" />
                          <span className="text-xs">{tod.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Minacce e Nemici */}
                <div>
                  <label className="block text-xs sm:text-sm uppercase font-mono font-semibold text-slate-300 mb-2">
                    Minacce e Fazioni Rivale
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {currentEnemyList.map((enemy) => {
                      const isSel = selectedEnemies.includes(enemy);
                      return (
                        <button
                          key={enemy}
                          type="button"
                          onClick={() => toggleEnemy(enemy)}
                          className={`px-4 py-2 rounded-xl text-xs sm:text-sm transition-all cursor-pointer border ${
                            isSel
                              ? 'border-red-600 bg-red-950/60 text-red-200 font-semibold shadow-md'
                              : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          {isSel ? '✓ ' : '+ '}
                          {enemy}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tono & Difficoltà */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs sm:text-sm uppercase font-mono font-semibold text-slate-300 mb-2">
                      Tono dell'Avventura
                    </label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value as any)}
                      className="w-full bg-slate-950/90 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm sm:text-base text-slate-200 focus:outline-none"
                    >
                      <option value="epic_adventure">Avventura Epica & Esplorazione</option>
                      <option value="action">Azione & Conflitti a Fuoco / Lame</option>
                      <option value="investigative">Investigativo / Mistero</option>
                      <option value="politics">Intrigo Politico tra Clan o Fazioni</option>
                      <option value="horror">Sopravvivenza & Tensione</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm uppercase font-mono font-semibold text-slate-300 mb-2">
                      Livello di Sfida
                    </label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as any)}
                      className="w-full bg-slate-950/90 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm sm:text-base text-slate-200 focus:outline-none"
                    >
                      <option value="standard">Standard (Regolamento D10 equilibrato)</option>
                      <option value="narrative">Narrativo (Più clemente sui dadi)</option>
                      <option value="brutal">Brutale (Ferite letali e conseguenze spietate)</option>
                    </select>
                  </div>
                </div>

                {/* Sezione Canovaccio / Trama dell'Autore */}
                <div className="bg-gradient-to-br from-purple-950/40 via-slate-950/80 to-slate-950 border border-purple-800/40 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-900/40 pb-2.5">
                    <div className="flex items-center space-x-2.5">
                      <BookOpen className="w-5 h-5 text-purple-400" />
                      <div>
                        <h4 className="font-serif font-bold text-sm sm:text-base text-slate-100 flex items-center gap-2">
                          <span>Canovaccio & Bozza della Trama (Facoltativo)</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-700/60">
                            Guida IA
                          </span>
                        </h4>
                        <p className="text-xs text-slate-400 font-serif">
                          Carica un file o scrivi la trama: l'IA Narratore modellerà gli eventi, i capitoli e i misteri su questo testo.
                        </p>
                      </div>
                    </div>

                    <label className="px-3.5 py-1.5 bg-purple-950 hover:bg-purple-900 border border-purple-600/80 rounded-xl text-xs font-serif font-bold text-purple-200 flex items-center space-x-1.5 cursor-pointer transition-colors shadow">
                      <Upload className="w-3.5 h-3.5 text-purple-300" />
                      <span>{storyOutlineFileName ? 'Sostituisci File' : 'Carica File Trama (.docx, .txt, .xlsx)'}</span>
                      <input
                        type="file"
                        accept=".docx,.doc,.xlsx,.xls,.csv,.txt,.md"
                        onChange={handleOutlineFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {isExtractingOutline && (
                    <div className="p-2.5 bg-purple-950/60 border border-purple-700/60 rounded-xl text-xs text-purple-300 font-mono animate-pulse flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 animate-spin text-amber-300 shrink-0" />
                      <span>Lettura documento Word/Excel e deduzione automatica di Titolo, Epoca e Luogo con IA...</span>
                    </div>
                  )}

                  {outlineAnalysisNotice && (
                    <div className="p-3 bg-indigo-950/70 border border-indigo-700/80 rounded-xl text-xs text-indigo-200 font-mono flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{outlineAnalysisNotice}</span>
                    </div>
                  )}

                  {storyOutlineFileName && (
                    <div className="flex items-center justify-between bg-purple-950/60 border border-purple-700/60 rounded-xl px-3 py-1.5 text-xs font-mono text-purple-200">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>
                          File: <strong>{storyOutlineFileName}</strong> ({storyOutlineContent.split(/\s+/).filter(Boolean).length} parole estratte)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setStoryOutlineFileName(undefined);
                          setStoryOutlineContent('');
                          setOutlineAnalysisNotice(null);
                        }}
                        className="text-[11px] text-red-400 hover:text-red-300 cursor-pointer"
                      >
                        Rimuovi
                      </button>
                    </div>
                  )}

                  <textarea
                    value={storyOutlineContent}
                    onChange={(e) => setStoryOutlineContent(e.target.value)}
                    rows={4}
                    placeholder="Incolla o scrivi qui gli snodi della tua cronaca, i segreti dei PNG, le fazioni o la premessa... (Se lasci vuoto, l'IA improvviserà liberamente)"
                    className="w-full bg-slate-900/90 border border-slate-800 focus:border-purple-500 rounded-xl p-3 text-xs sm:text-sm text-slate-200 focus:outline-none resize-none font-serif leading-relaxed"
                  />

                  {storyOutlineContent.trim().length > 30 && !isExtractingOutline && (
                    <button
                      type="button"
                      onClick={() => analyzeStoryOutlineText(storyOutlineContent)}
                      className="text-xs font-mono text-purple-300 hover:text-purple-200 flex items-center space-x-1.5 cursor-pointer pt-1"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Rileva automaticamente Titolo, Luogo ed Epoca da questa bozza</span>
                    </button>
                  )}
                </div>

                {/* SEZIONE: MAPPE DELLA CRONACA (GENERALE + SINGOLI LUOGHI) */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-serif font-bold text-sm text-slate-200 flex items-center space-x-2">
                        <Compass className="w-4 h-4 text-amber-400" />
                        <span>Mappe della Cronaca (Generale & Singoli Luoghi)</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Carica la mappa generale del mondo/regno e quelle dei luoghi specifici (città, fortezze, catacombe, taverne).
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <label className="px-3 py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800 text-amber-200 text-xs font-serif cursor-pointer transition-colors flex items-center space-x-1.5 shadow-sm">
                        <Compass className="w-3.5 h-3.5 text-amber-400" />
                        <span>+ Mappa Generale</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleMapUpload(e, 'general')}
                          className="hidden"
                        />
                      </label>

                      <label className="px-3 py-1.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-800 text-indigo-200 text-xs font-serif cursor-pointer transition-colors flex items-center space-x-1.5 shadow-sm">
                        <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                        <span>+ Mappa Luogo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleMapUpload(e, 'location')}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {wizardMaps.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center bg-slate-900/20">
                      <p className="text-xs text-slate-500 font-serif">
                        Nessuna mappa personalizzata caricata. Verrà utilizzata la mappa vettoriale / satellitare automatica di <strong className="text-slate-400">{city || 'Chronica'}</strong>.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                      {wizardMaps.map((m) => {
                        const isGeneral = m.category === 'general';
                        return (
                          <div
                            key={m.id}
                            className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden flex flex-col group hover:border-slate-700 transition-all shadow-md"
                          >
                            <div className="relative h-28 bg-black/60 overflow-hidden flex items-center justify-center">
                              <img
                                src={m.imageUrl}
                                alt={m.name}
                                className="w-full h-full object-cover"
                              />
                              <span
                                className={`absolute top-2 left-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider backdrop-blur-md ${
                                  isGeneral
                                    ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                                    : 'bg-indigo-950/80 border-indigo-600 text-indigo-300'
                                }`}
                              >
                                {isGeneral ? 'Mappa Generale' : 'Singolo Luogo'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveMap(m.id)}
                                className="absolute top-2 right-2 p-1 rounded-lg bg-black/70 hover:bg-rose-950 border border-slate-700 hover:border-rose-500 text-slate-400 hover:text-rose-200 transition-colors cursor-pointer"
                                title="Rimuovi mappa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="p-2.5">
                              <input
                                type="text"
                                value={m.name}
                                onChange={(e) => handleRenameMap(m.id, e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-2 py-1 text-xs text-slate-200 font-serif focus:outline-none"
                                placeholder="Nome della mappa o luogo"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Tasto Avanti allo Step 2 */}
                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setWizardStep(2)}
                    className="px-8 py-3.5 bg-gradient-to-r from-indigo-900 to-slate-900 hover:from-indigo-800 text-white font-serif uppercase tracking-wider text-sm font-bold rounded-2xl shadow-xl flex items-center space-x-2 cursor-pointer"
                  >
                    <span>Passo Successivo: Protagonista & Cast</span>
                    <ArrowRight className="w-5 h-5 text-indigo-400" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: CREAZIONE PERSONAGGIO */}
            {wizardStep === 2 && (
              <div className="space-y-6 sm:space-y-8 animate-fadeIn">
                {/* BANNER SELETTORE MODALITÀ: SCHERMO DEL TAVOLO (HOST SPETTATORE) vs PERSONAGGIO SU PC */}
                <div
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    isSpectatorHost
                      ? 'bg-gradient-to-r from-cyan-950/70 via-slate-900 to-indigo-950/70 border-cyan-500 ring-2 ring-cyan-500/30 shadow-xl'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center space-x-3.5">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                          isSpectatorHost
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-md shadow-cyan-950/50'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        <Tv className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif font-black text-sm sm:text-base text-slate-100">
                            Usa questo PC solo come Schermo del Narratore / Tavolo
                          </h3>
                          {isSpectatorHost && (
                            <span className="px-2 py-0.5 text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full font-mono uppercase font-bold animate-pulse">
                              Attivo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                          {isSpectatorHost
                            ? "Il PC mostrerà unicamente la narrazione, i combattimenti, la mappa e i tiri. NESSUN personaggio è assegnato a questo PC: tutti i personaggi del Cast sono liberi per gli smartphone (compreso il tuo come Master)!"
                            : "Attiva questa opzione se tu come Master giocherai dal tuo smartphone e vuoi usare questo PC solo come schermo condiviso per il tavolo."}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsSpectatorHost((prev) => {
                          const next = !prev;
                          if (next) setSelectedCastCharId(null);
                          return next;
                        });
                      }}
                      className={`px-4 py-2.5 rounded-xl text-xs font-serif font-bold cursor-pointer transition-all shrink-0 flex items-center justify-center space-x-2 ${
                        isSpectatorHost
                          ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-900/40 border border-cyan-400/50'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      <Tv className="w-4 h-4" />
                      <span>{isSpectatorHost ? '✓ Schermo del Tavolo Attivo' : 'Salta Personaggio PC'}</span>
                    </button>
                  </div>

                  {isSpectatorHost && (
                    <div className="mt-3 pt-3 border-t border-cyan-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <span className="text-cyan-300/90 font-mono flex items-center space-x-1.5">
                        <Check className="w-4 h-4 text-cyan-400" />
                        <span>Nessuna scheda creata su questo PC. Procedi direttamente al riepilogo o avvia la cronaca!</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setWizardStep(3)}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 text-white font-serif font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center space-x-1.5"
                      >
                        <span>Vai al Riepilogo e Avvia ➔</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* SEZIONE: IMPORTAZIONE CAST / PERSONAGGI DA WORD O EXCEL */}
                <div className="bg-gradient-to-br from-amber-950/30 via-slate-950/90 to-indigo-950/30 border border-amber-600/50 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-900/40 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-serif font-bold text-sm sm:text-base text-slate-100 flex items-center gap-2">
                          <span>Hai già un Cast / File Personaggi?</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-900/60 text-amber-200 border border-amber-700/60">
                            Word / Excel
                          </span>
                        </h4>
                        <p className="text-xs text-slate-400 font-serif">
                          Carica il file con i tuoi personaggi: l'IA estrarrà le schede complete. Potrai scegliere chi interpretare tu al tavolo, mentre il resto del Cast sarà affidato ai giocatori da smartphone e all'IA Narratore!
                        </p>
                      </div>
                    </div>

                    <label className="px-3.5 py-2 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 border border-amber-500/80 rounded-xl text-xs font-serif font-bold text-white flex items-center space-x-1.5 cursor-pointer transition-all shadow-md shadow-amber-900/40">
                      <Upload className="w-3.5 h-3.5 text-amber-200" />
                      <span>{castFileName ? 'Sostituisci File Cast' : 'Carica Cast (.docx, .xlsx)'}</span>
                      <input
                        type="file"
                        accept=".docx,.doc,.xlsx,.xls,.csv,.txt,.md"
                        onChange={handleCastFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {isExtractingCast && (
                    <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-xl flex items-center space-x-2 text-xs text-amber-300 font-mono">
                      <Sparkles className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Gemini sta analizzando il file Word/Excel ed estraendo le schede dei personaggi...</span>
                    </div>
                  )}

                  {castExtractError && (
                    <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-xl flex items-center space-x-2 text-xs text-red-300 font-mono">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span>{castExtractError}</span>
                    </div>
                  )}

                  {/* Se ci sono personaggi estratti nel Cast */}
                  {wizardRoster.length > 0 && (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                          Personaggi Estratti dal File ({wizardRoster.length}) • Clicca per scegliere chi interpretare
                        </span>
                        <span className="text-[11px] font-mono text-emerald-400 flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Cast Pronto</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                        {wizardRoster.map((c) => {
                          const isSelected = !isSpectatorHost && (selectedCastCharId === c.id || charName.toLowerCase().trim() === (c.name || '').toLowerCase().trim());

                          return (
                            <div
                              key={c.id}
                              onClick={() => handleApplyCastCharacter(c)}
                              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-amber-950/50 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1 gap-1">
                                <span className="font-serif font-black text-sm text-slate-100 truncate">
                                  {c.name}
                                </span>
                                {isSelected ? (
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-emerald-950 border border-emerald-500 text-emerald-300 rounded shrink-0">
                                    IL TUO PG
                                  </span>
                                ) : c.isProtagonistSlot ? (
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-amber-950/90 border border-amber-500/70 text-amber-300 rounded shrink-0">
                                    SLOT PROTAGONISTA
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-indigo-950/70 border border-indigo-700/50 text-indigo-300 rounded shrink-0">
                                    SCHEDA PRONTA
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 truncate mb-1">
                                {c.concept} {c.factionOrClan ? `• ${c.factionOrClan}` : ''}
                              </p>
                              {c.backgroundNotes && (
                                <div className="mt-1 pt-1 border-t border-slate-800/80">
                                  <p className={`text-[11px] font-serif leading-relaxed whitespace-pre-wrap ${
                                    isSelected
                                      ? 'text-slate-200 max-h-48 overflow-y-auto bg-slate-900/90 p-2 rounded-lg border border-slate-700/80'
                                      : 'text-slate-500 italic line-clamp-2'
                                  }`}>
                                    {c.backgroundNotes}
                                  </p>
                                </div>
                              )}
                              {isSelected && c.isProtagonistSlot && (
                                <div className="text-[10px] text-amber-300 font-mono mt-1 pt-1 border-t border-amber-500/30">
                                  ✍️ Nome fissato! Definisci stirpe, pallini e armi qui sotto.
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Notifica Destinazione Personaggi Non Scelti */}
                      {isSpectatorHost ? (
                        <div className="p-3 bg-cyan-950/40 border border-cyan-700/60 rounded-xl flex items-start space-x-2 text-xs text-slate-300">
                          <Tv className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">
                            <strong>Modalità Schermo del Narratore Attiva:</strong> Nessun personaggio è bloccato su questo PC. <strong>Tutti i {wizardRoster.length} personaggi del Cast</strong> restano liberamente selezionabili da smartphone dai giocatori e dal Master! I personaggi che nessuno interpreterà saranno guidati dall'IA Narratore come comprimari attivi.
                          </span>
                        </div>
                      ) : (
                        <div className="p-3 bg-indigo-950/40 border border-indigo-700/60 rounded-xl flex items-start space-x-2 text-xs text-slate-300">
                          <Bot className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">
                            <strong>Regola del Tavolo:</strong> Il personaggio selezionato sopra sarà il tuo alter-ego come Master/Giocatore. <strong>Tutti gli altri {wizardRoster.length - 1} personaggi</strong> saranno disponibili per i giocatori che si collegheranno dal cellulare; quelli che non verranno scelti saranno <strong>guidati attivamente dall'IA Narratore</strong> come comprimari!
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {!isSpectatorHost ? (
                  <>
                    {/* Selezione Creatura */}
                    <div>
                  <label className="block text-xs sm:text-sm uppercase font-mono font-semibold text-slate-300 mb-3">
                    Stirpe o Natura del Personaggio
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { id: 'hunter', label: 'Veterano / Tattico', icon: Shield, desc: 'Addestramento militare, armi & risolutezza' },
                      { id: 'mortal', label: 'Mortale / Investigatore', icon: Skull, desc: 'Acume logico, coraggio & abilità umane' },
                      { id: 'vampire', label: 'Potenziato / Notturno', icon: Flame, desc: 'Fisiologia alterata, rigenerazione & vigore' },
                      { id: 'werewolf', label: 'Mutaforma / Primordiale', icon: Moon, desc: 'Forma da guerra, istinto & potenza ferina' },
                      { id: 'mage', label: 'Canalizzatore / Arcano', icon: Sparkles, desc: 'Manipolazione della realtà, poteri & riti' },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCreatureType(item.id as any)}
                          className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                            creatureType === item.id
                              ? 'border-indigo-500 bg-indigo-950/60 text-slate-100 shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                              : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <Icon className="w-6 h-6 mx-auto mb-1.5 text-indigo-400" />
                          <div className="font-semibold text-sm sm:text-base text-slate-200">{item.label}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dati Anagrafici e Clan */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm uppercase font-mono font-semibold text-slate-300 mb-2">
                      Nome Personaggio
                    </label>
                    <input
                      type="text"
                      value={charName}
                      onChange={(e) => setCharName(e.target.value)}
                      className="w-full bg-slate-950/90 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-100 focus:outline-none"
                      placeholder="Es. Silas Vance, Kenjiro, Li Wei..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm uppercase font-mono font-semibold text-slate-300 mb-2">
                      Fazione / Clan / Ordine
                    </label>
                    <select
                      value={clan}
                      onChange={(e) => setClan(e.target.value)}
                      className="w-full bg-slate-950/90 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-200 focus:outline-none"
                    >
                      {getClanOptions().map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {clan === 'Altro...' && (
                      <input
                        type="text"
                        value={customClan}
                        onChange={(e) => setCustomClan(e.target.value)}
                        placeholder="Specifica fazione personalizzata..."
                        className="mt-2 w-full bg-slate-950 border border-indigo-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm uppercase font-mono font-semibold text-slate-300 mb-2">
                      Concetto
                    </label>
                    <input
                      type="text"
                      value={concept}
                      onChange={(e) => setConcept(e.target.value)}
                      className="w-full bg-slate-950/90 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-100 focus:outline-none"
                      placeholder="Es. Pistolero, Samurai Rōnin, Scienziato..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm uppercase font-mono font-semibold text-slate-300 mb-2">
                      Virtù Guida
                    </label>
                    <select
                      value={virtue}
                      onChange={(e) => setVirtue(e.target.value)}
                      className="w-full bg-slate-950/90 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-100 focus:outline-none"
                    >
                      {WOD_VIRTUES.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm uppercase font-mono font-semibold text-slate-300 mb-2">
                      Debolezza / Vizio
                    </label>
                    <select
                      value={vice}
                      onChange={(e) => setVice(e.target.value)}
                      className="w-full bg-slate-950/90 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-100 focus:outline-none"
                    >
                      {WOD_VICES.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            ) : null}

                {/* Tasti Navigazione Step 2 */}
                <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="w-full sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-serif uppercase tracking-wider text-xs sm:text-sm font-semibold rounded-2xl flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Torna a Mondo & Mappe</span>
                  </button>

                  <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setWizardStep(4)}
                      className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-serif uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      <span>Salta Scheda (Usa Predefiniti) ➔</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWizardStep(isSpectatorHost ? 4 : 3)}
                      className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-indigo-900 to-slate-900 hover:from-indigo-800 text-white font-serif uppercase tracking-wider text-xs sm:text-sm font-bold rounded-2xl shadow-xl flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <span>Passo Successivo: {isSpectatorHost ? 'Riepilogo & Avvio' : 'Scheda Personaggio'}</span>
                      <ArrowRight className="w-4 h-4 text-indigo-400" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: SCHEDA PERSONAGGIO (FACOLTATIVA) */}
            {wizardStep === 3 && (
              <div className="space-y-6 sm:space-y-8 animate-fadeIn">
                {/* Banner Informativo Sezione Facoltativa */}
                <div className="p-4 bg-indigo-950/40 border border-indigo-700/60 rounded-2xl flex items-start space-x-3 shadow-lg">
                  <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-300 font-serif leading-relaxed">
                    <strong className="text-amber-300 uppercase tracking-wide block mb-0.5">
                      Gestione Scheda del Protagonista (Facoltativa)
                    </strong>
                    I tratti, gli attributi e le abilità di <strong className="text-slate-100">{charName}</strong> sono stati già calibrati e bilanciati automaticamente in base al suo ruolo e all'equipaggiamento.
                    Puoi rifinire ogni singolo pallino qui sotto oppure procedere direttamente al riepilogo con <em>"Conferma e Continua"</em>.
                  </div>
                </div>

                {/* Archetipo di Statistiche */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                    <label className="block text-xs sm:text-sm uppercase font-mono font-semibold text-slate-300">
                      Distribuzione Tratti & Attributi (Chronica Engine: 5 / 4 / 3)
                    </label>
                    <div className="flex items-center space-x-2 text-xs font-mono">
                      <span className="text-slate-400">Punti Extra Attributi:</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded-full ${
                          totalAttrSpent === 12
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : totalAttrSpent < 12
                            ? 'bg-amber-950 text-amber-300 border border-amber-700'
                            : 'bg-red-950 text-red-300 border border-red-700 animate-pulse'
                        }`}
                      >
                        {totalAttrSpent} / 12
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      { id: 'predator', label: 'Guerriero / Fisico', desc: 'Fisici 5 • Mentali 4 • Sociali 3' },
                      { id: 'investigator', label: 'Investigativo / Mentale', desc: 'Mentali 5 • Fisici 4 • Sociali 3' },
                      { id: 'manipulator', label: 'Sociale / Diplomatico', desc: 'Sociali 5 • Mentali 4 • Fisici 3' },
                      { id: 'custom', label: 'Personalizza Pallini', desc: 'Scegli priorità 5 / 4 / 3 liberamente' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => applyArchetype(item.id as any)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                          archetype === item.id
                            ? 'border-indigo-500 bg-indigo-950/50 text-indigo-200 shadow-md'
                            : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold text-sm text-slate-200">{item.label}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                      </button>
                    ))}
                  </div>

                  {/* Selettore Priorità Categorie (Attivo in modalità Custom) */}
                  {archetype === 'custom' && (
                    <div className="mb-4 p-4 bg-slate-950/90 border border-indigo-900/60 rounded-2xl space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                        <div className="flex items-center space-x-2 text-indigo-300 font-bold font-mono">
                          <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span>Assegna Priorità Categorie (Budget D10: 5 / 4 / 3 pallini oltre il base 1):</span>
                        </div>
                        <button
                          type="button"
                          onClick={resetToWodBalanced}
                          className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3 text-amber-400" />
                          <span>Reimposta 5 / 4 / 3 Bilanciato</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        {/* Primaria (5 pt) */}
                        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-indigo-700/60">
                          <span className="text-[11px] font-mono uppercase text-amber-400 font-bold block mb-1.5">
                            Primaria (5 Pallini Extra)
                          </span>
                          <div className="grid grid-cols-3 gap-1">
                            {(['physical', 'social', 'mental'] as const).map((cat) => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => handleSetPrimaryCat(cat)}
                                className={`py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                                  primaryCat === cat
                                    ? 'bg-amber-600 text-white font-bold shadow'
                                    : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {cat === 'physical' ? 'Fisici' : cat === 'social' ? 'Sociali' : 'Mentali'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Secondaria (4 pt) */}
                        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-indigo-700/60">
                          <span className="text-[11px] font-mono uppercase text-indigo-300 font-bold block mb-1.5">
                            Secondaria (4 Pallini Extra)
                          </span>
                          <div className="grid grid-cols-3 gap-1">
                            {(['physical', 'social', 'mental'] as const).map((cat) => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => handleSetSecondaryCat(cat)}
                                className={`py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                                  secondaryCat === cat
                                    ? 'bg-indigo-600 text-white font-bold shadow'
                                    : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {cat === 'physical' ? 'Fisici' : cat === 'social' ? 'Sociali' : 'Mentali'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Terziaria (3 pt) */}
                        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/60 flex flex-col justify-between">
                          <span className="text-[11px] font-mono uppercase text-slate-400 font-bold block mb-1.5">
                            Terziaria (3 Pallini Extra)
                          </span>
                          <div className="py-1 px-3 bg-slate-950 rounded text-center text-xs font-mono font-bold text-slate-300">
                            {tertiaryCat === 'physical' ? 'Fisici (3 pt)' : tertiaryCat === 'social' ? 'Sociali (3 pt)' : 'Mentali (3 pt)'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Matrice Ufficiale Attributi 3x3 */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      {/* Mentali */}
                      <div className="space-y-2.5 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-mono uppercase text-indigo-400 font-bold">Mentali</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {menBudget} pt
                            </span>
                          </div>
                          <span
                            className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                              menSpent === menBudget
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : menSpent < menBudget
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-red-950 text-red-300 border border-red-800'
                            }`}
                          >
                            {menSpent}/{menBudget}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-300">Intelligenza <span className="text-[10px] text-slate-500 font-mono">(Prestanza)</span></span>
                          <DotRating min={1} max={5} value={customAttrs.intelligence} readOnly={archetype !== 'custom'} onChange={(v) => setCustomAttrs({ ...customAttrs, intelligence: v })} />
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-300">Prontezza <span className="text-[10px] text-slate-500 font-mono">(Accuratezza)</span></span>
                          <DotRating min={1} max={5} value={customAttrs.wits} readOnly={archetype !== 'custom'} onChange={(v) => setCustomAttrs({ ...customAttrs, wits: v })} />
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-300">Fermezza <span className="text-[10px] text-slate-500 font-mono">(Resistenza)</span></span>
                          <DotRating min={1} max={5} value={customAttrs.resolve} readOnly={archetype !== 'custom'} onChange={(v) => setCustomAttrs({ ...customAttrs, resolve: v })} />
                        </div>
                      </div>

                      {/* Fisici */}
                      <div className="space-y-2.5 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-mono uppercase text-indigo-400 font-bold">Fisici</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {physBudget} pt
                            </span>
                          </div>
                          <span
                            className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                              physSpent === physBudget
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : physSpent < physBudget
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-red-950 text-red-300 border border-red-800'
                            }`}
                          >
                            {physSpent}/{physBudget}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-300">Forza <span className="text-[10px] text-slate-500 font-mono">(Prestanza)</span></span>
                          <DotRating min={1} max={5} value={customAttrs.strength} readOnly={archetype !== 'custom'} onChange={(v) => setCustomAttrs({ ...customAttrs, strength: v })} />
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-300">Destrezza <span className="text-[10px] text-slate-500 font-mono">(Accuratezza)</span></span>
                          <DotRating min={1} max={5} value={customAttrs.dexterity} readOnly={archetype !== 'custom'} onChange={(v) => setCustomAttrs({ ...customAttrs, dexterity: v })} />
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-300">Costituzione <span className="text-[10px] text-slate-500 font-mono">(Resistenza)</span></span>
                          <DotRating min={1} max={5} value={customAttrs.stamina} readOnly={archetype !== 'custom'} onChange={(v) => setCustomAttrs({ ...customAttrs, stamina: v })} />
                        </div>
                      </div>

                      {/* Sociali */}
                      <div className="space-y-2.5 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-mono uppercase text-indigo-400 font-bold">Sociali</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {socBudget} pt
                            </span>
                          </div>
                          <span
                            className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                              socSpent === socBudget
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : socSpent < socBudget
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-red-950 text-red-300 border border-red-800'
                            }`}
                          >
                            {socSpent}/{socBudget}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-300">Presenza <span className="text-[10px] text-slate-500 font-mono">(Prestanza)</span></span>
                          <DotRating min={1} max={5} value={customAttrs.presence} readOnly={archetype !== 'custom'} onChange={(v) => setCustomAttrs({ ...customAttrs, presence: v })} />
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-300">Ascendente <span className="text-[10px] text-slate-500 font-mono">(Accuratezza)</span></span>
                          <DotRating min={1} max={5} value={customAttrs.manipulation} readOnly={archetype !== 'custom'} onChange={(v) => setCustomAttrs({ ...customAttrs, manipulation: v })} />
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-300">Autocontrollo <span className="text-[10px] text-slate-500 font-mono">(Resistenza)</span></span>
                          <DotRating min={1} max={5} value={customAttrs.composure} readOnly={archetype !== 'custom'} onChange={(v) => setCustomAttrs({ ...customAttrs, composure: v })} />
                        </div>
                      </div>
                    </div>

                    {/* Riepilogo Tratti Derivati Ufficiali (Live) */}
                    <div className="bg-slate-900/60 border border-indigo-950 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                      <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-mono block">Salute (Cost+5)</span>
                        <span className="text-base font-bold text-red-400 font-mono">{customAttrs.stamina + 5}</span>
                      </div>
                      <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-mono block">Volontà (Ferm+Auto)</span>
                        <span className="text-base font-bold text-amber-400 font-mono">{customAttrs.resolve + customAttrs.composure}</span>
                      </div>
                      <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-mono block">Difesa (Min Des/Pro)</span>
                        <span className="text-base font-bold text-indigo-400 font-mono">{Math.min(customAttrs.dexterity, customAttrs.wits)}</span>
                      </div>
                      <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-mono block">Iniziativa (Des+Auto)</span>
                        <span className="text-base font-bold text-emerald-400 font-mono">+{customAttrs.dexterity + customAttrs.composure}</span>
                      </div>
                      <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-slate-400 font-mono block">Velocità (For+Des+5)</span>
                        <span className="text-base font-bold text-cyan-400 font-mono">{customAttrs.strength + customAttrs.dexterity + 5}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sezione Espandibile: Le 24 Abilità Ufficiali (Regola Storytelling System: 11 / 7 / 4) */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowAbilitiesCustom(!showAbilitiesCustom)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-900/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5">
                      <BookOpen className="w-4 h-4 text-indigo-400" />
                      <div>
                        <span className="font-serif font-bold text-sm text-slate-200 block">
                          Abilità del Personaggio (24 Abilità Fondamentali)
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Ripartizione 11 / 7 / 4 • Totale assegnato: {totalAbilSpent} / 22 punti
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-indigo-400 font-bold px-3 py-1 bg-indigo-950/60 rounded-lg border border-indigo-800/80">
                      {showAbilitiesCustom ? 'Nascondi ▲' : 'Visualizza / Personalizza ▼'}
                    </span>
                  </button>

                  {showAbilitiesCustom && (
                    <div className="p-4 border-t border-slate-800 bg-slate-900/20 grid grid-cols-1 sm:grid-cols-3 gap-5 animate-fadeIn">
                      {/* Abilità Mentali (-3 non addestrata) */}
                      <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                          <span className="text-xs font-mono uppercase text-indigo-400 font-bold block">
                            Mentali <span className="text-[10px] text-slate-500 font-normal">(-3 non addestrata)</span>
                          </span>
                          <span className="text-[11px] font-mono text-slate-300 font-bold">{menAbilSpent} pt</span>
                        </div>
                        {[
                          { key: 'academics', label: 'Accademiche' },
                          { key: 'computer', label: 'Informatica' },
                          { key: 'investigation', label: 'Investigare' },
                          { key: 'crafts', label: 'Manualità' },
                          { key: 'medicine', label: 'Medicina' },
                          { key: 'occult', label: 'Occulto' },
                          { key: 'politics', label: 'Politica' },
                          { key: 'science', label: 'Scienze' },
                        ].map(({ key, label }) => (
                          <div key={key} className="flex justify-between items-center text-xs">
                            <span className="text-slate-300">{label}</span>
                            <DotRating
                              min={0}
                              max={5}
                              value={(customAbilities as any)[key] || 0}
                              onChange={(v) =>
                                setCustomAbilities({
                                  ...customAbilities,
                                  [key]: v,
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>

                      {/* Abilità Fisiche (-1 non addestrata) */}
                      <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                          <span className="text-xs font-mono uppercase text-indigo-400 font-bold block">
                            Fisiche <span className="text-[10px] text-slate-500 font-normal">(-1 non addestrata)</span>
                          </span>
                          <span className="text-[11px] font-mono text-slate-300 font-bold">{physAbilSpent} pt</span>
                        </div>
                        {[
                          { key: 'firearms', label: 'Armi da Fuoco' },
                          { key: 'weaponry', label: 'Armi da Mischia' },
                          { key: 'athletics', label: 'Atletica' },
                          { key: 'larceny', label: 'Criminalità' },
                          { key: 'stealth', label: 'Furtività' },
                          { key: 'drive', label: 'Guidare' },
                          { key: 'brawl', label: 'Lotta' },
                          { key: 'survival', label: 'Sopravvivenza' },
                        ].map(({ key, label }) => (
                          <div key={key} className="flex justify-between items-center text-xs">
                            <span className="text-slate-300">{label}</span>
                            <DotRating
                              min={0}
                              max={5}
                              value={(customAbilities as any)[key] || 0}
                              onChange={(v) =>
                                setCustomAbilities({
                                  ...customAbilities,
                                  [key]: v,
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>

                      {/* Abilità Sociali (-1 non addestrata) */}
                      <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                          <span className="text-xs font-mono uppercase text-indigo-400 font-bold block">
                            Sociali <span className="text-[10px] text-slate-500 font-normal">(-1 non addestrata)</span>
                          </span>
                          <span className="text-[11px] font-mono text-slate-300 font-bold">{socAbilSpent} pt</span>
                        </div>
                        {[
                          { key: 'animalKen', label: 'Affinità Animale' },
                          { key: 'streetwise', label: 'Bassifondi' },
                          { key: 'empathy', label: 'Empatia' },
                          { key: 'expression', label: 'Espressività' },
                          { key: 'intimidation', label: 'Intimidire' },
                          { key: 'persuasion', label: 'Persuasione' },
                          { key: 'socialize', label: 'Socializzare' },
                          { key: 'subterfuge', label: 'Sotterfugio' },
                        ].map(({ key, label }) => (
                          <div key={key} className="flex justify-between items-center text-xs">
                            <span className="text-slate-300">{label}</span>
                            <DotRating
                              min={0}
                              max={5}
                              value={(customAbilities as any)[key] || 0}
                              onChange={(v) =>
                                setCustomAbilities({
                                  ...customAbilities,
                                  [key]: v,
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* SEZIONE MERITI & DIFETTI (WOD) */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span className="text-xs sm:text-sm font-mono font-bold uppercase text-amber-300">
                        Meriti & Manovre Speciali
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">Opzionali</span>
                  </div>
                  <p className="text-xs text-slate-400 font-sans">
                    Seleziona i tratti speciali o manovre del personaggio. Includono capacità come <strong>Estrazione Rapida</strong> per non perdere un turno a sfoderare l'arma o <strong>Riflessi Fulminei</strong> (+2 iniziativa).
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {WOD_MERITS_AND_FLAWS.map((mf) => {
                      const isChecked = selectedMeritIds.includes(mf.id);
                      return (
                        <button
                          key={mf.id}
                          type="button"
                          onClick={() => {
                            setSelectedMeritIds((prev) =>
                              prev.includes(mf.id) ? prev.filter((id) => id !== mf.id) : [...prev, mf.id]
                            );
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start space-x-2.5 ${
                            isChecked
                              ? 'bg-amber-950/40 border-amber-500/80 text-white'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                              isChecked
                                ? 'bg-amber-500 border-amber-400 text-black'
                                : 'border-slate-700 bg-slate-950'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-serif font-bold text-xs text-amber-300 truncate">
                                {mf.name}
                              </span>
                              <span
                                className={`text-[10px] font-mono uppercase px-1 rounded ${
                                  mf.type === 'merit'
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                                    : 'bg-red-950 text-red-300 border border-red-800/60'
                                }`}
                              >
                                {mf.cost > 0 ? `+${mf.cost}` : mf.cost} pt
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{mf.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SEZIONE EQUIPAGGIAMENTO INIZIALE UFFICIALE (SCHERMO DEL NARRATORE) */}
                <div className="bg-slate-950/90 border border-emerald-800/70 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <Package className="w-5 h-5 text-emerald-400" />
                      <div>
                        <span className="text-xs sm:text-sm font-mono font-bold uppercase text-emerald-300 block">
                          Arsenale & Equipaggiamento Ufficiale (Schermo del Narratore)
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Scegli liberamente tra le Tabelle delle Armi da Mischia, Armi a Distanza, Esplosivi, Armature e Kit
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFilterGearByEra((prev) => !prev)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                          filterGearByEra
                            ? 'bg-indigo-950 border-indigo-500 text-indigo-200 font-bold'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {filterGearByEra ? `Filtro Epoca Attivo (${era})` : 'Catalogo Completo (Tutte le Epoche)'}
                      </button>
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-700 text-emerald-300">
                        {selectedGearIds.length} Selezionati
                      </span>
                    </div>
                  </div>

                  {/* Tab Categorie dello Schermo del Narratore */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'all', label: '📋 Tutte le Tabelle', count: getStartingGearForEra(era, filterGearByEra).length },
                      {
                        id: 'melee',
                        label: '🗡️ Armi da Mischia',
                        count: getStartingGearForEra(era, filterGearByEra).filter((g) => g.screenCategory === 'melee').length,
                      },
                      {
                        id: 'ranged',
                        label: '🔫 Armi a Distanza & Munizioni',
                        count: getStartingGearForEra(era, filterGearByEra).filter((g) => g.screenCategory === 'ranged').length,
                      },
                      {
                        id: 'explosive',
                        label: '💣 Esplosivi',
                        count: getStartingGearForEra(era, filterGearByEra).filter((g) => g.screenCategory === 'explosive').length,
                      },
                      {
                        id: 'armor',
                        label: '🛡️ Armature (Moderne & Antiche)',
                        count: getStartingGearForEra(era, filterGearByEra).filter((g) => g.screenCategory === 'armor').length,
                      },
                      {
                        id: 'utility',
                        label: '🎒 Kit & Prove (+equip)',
                        count: getStartingGearForEra(era, filterGearByEra).filter((g) => g.screenCategory === 'utility').length,
                      },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setGearTab(cat.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer flex items-center space-x-1.5 ${
                          gearTab === cat.id
                            ? 'bg-emerald-700 text-white font-bold shadow-md shadow-emerald-950/60'
                            : 'bg-slate-900/90 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <span>{cat.label}</span>
                        <span className="text-[10px] opacity-80">({cat.count})</span>
                      </button>
                    ))}
                  </div>

                  {/* Riepilogo Rapido Oggetti Selezionati & Valore Armatura */}
                  {selectedGearIds.length > 0 && (() => {
                    const activeArmor = getCharacterArmorStatsFromGear(selectedGearIds);
                    const selectedItems = ALL_STORYTELLER_GEAR_OPTIONS.filter((g) => selectedGearIds.includes(g.id));
                    return (
                      <div className="bg-slate-900/90 border border-emerald-900/60 rounded-xl p-3 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-mono uppercase text-emerald-400 font-bold">
                            Dotazione Attuale del Personaggio:
                          </span>
                          {activeArmor.armorName && (
                            <span className="font-mono text-[11px] bg-indigo-950 border border-indigo-700/80 text-indigo-200 px-2 py-0.5 rounded-lg">
                              🛡️ Armatura Attiva: <strong>{activeArmor.armorValue}/{activeArmor.armorFirearmValue}</strong>
                              {activeArmor.defensePenalty !== 0 ? ` | Difesa ${activeArmor.defensePenalty}` : ''}
                              {activeArmor.speedPenalty !== 0 ? ` | Velocità ${activeArmor.speedPenalty}` : ''}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedItems.map((item) => (
                            <span
                              key={item.id}
                              onClick={() => setSelectedGearIds((prev) => prev.filter((id) => id !== item.id))}
                              title="Clicca per rimuovere"
                              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-600/60 text-xs text-emerald-200 cursor-pointer hover:bg-red-950/60 hover:border-red-500/60 hover:text-red-200 transition-colors"
                            >
                              <span>{item.name}</span>
                              {item.damageOrEffect && (
                                <span className="text-[10px] font-mono text-amber-300">[{item.damageOrEffect}]</span>
                              )}
                              <span className="text-[10px] opacity-75">✕</span>
                            </span>
                          ))}

                          {/* Oggetti Unici/Specialistici generati dall'IA o dal Cast per qualsiasi classe */}
                          {customGearItems
                            .filter(
                              (c) =>
                                c &&
                                c.name &&
                                !selectedItems.some((s) => s.name.toLowerCase().trim() === c.name.toLowerCase().trim())
                            )
                            .map((item, idx) => (
                              <span
                                key={`custom_${idx}_${item.name}`}
                                onClick={() =>
                                  setCustomGearItems((prev) => prev.filter((_, i) => i !== idx))
                                }
                                title="Oggetto specialistico unico estratto dal Cast. Clicca per rimuovere."
                                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-600/70 text-xs text-indigo-200 cursor-pointer hover:bg-red-950/60 hover:border-red-500/60 hover:text-red-200 transition-colors"
                              >
                                <span className="font-semibold">{item.name}</span>
                                {item.damage !== undefined && (
                                  <span className="text-[10px] font-mono text-amber-300">[Danno {item.damage}]</span>
                                )}
                                {item.armorBonus !== undefined && (
                                  <span className="text-[10px] font-mono text-cyan-300">[Armatura +{item.armorBonus}]</span>
                                )}
                                <span className="text-[9px] font-mono uppercase bg-indigo-900/60 text-indigo-300 px-1 py-0.5 rounded">Special</span>
                                <span className="text-[10px] opacity-75">✕</span>
                              </span>
                            ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Griglia Articoli delle Tabelle Ufficiali */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pr-1">
                    {getStartingGearForEra(era, filterGearByEra)
                      .filter((g) => gearTab === 'all' || g.screenCategory === gearTab)
                      .map((gear) => {
                        const isChecked = selectedGearIds.includes(gear.id);
                        const strengthTooLow = gear.minStrength && customAttrs.strength < gear.minStrength;
                        return (
                          <button
                            key={gear.id}
                            type="button"
                            onClick={() => {
                              setSelectedGearIds((prev) =>
                                prev.includes(gear.id) ? prev.filter((id) => id !== gear.id) : [...prev, gear.id]
                              );
                            }}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start space-x-2.5 ${
                              isChecked
                                ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-md shadow-emerald-950/50'
                                : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                                isChecked
                                  ? 'bg-emerald-500 border-emerald-400 text-black'
                                  : 'border-slate-700 bg-slate-950'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-serif font-bold text-xs sm:text-sm text-emerald-300 truncate">
                                  {gear.name}
                                </span>
                                {gear.costDots && (
                                  <span
                                    className="text-[10px] font-mono bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-amber-300 shrink-0"
                                    title="Costo minimo nel Pregio Risorse"
                                  >
                                    Costo: {gear.costDots}
                                  </span>
                                )}
                              </div>

                              {/* Badges Statistiche Ufficiali dello Schermo */}
                              <div className="flex flex-wrap gap-1">
                                {gear.damageOrEffect && (
                                  <span className="text-[10px] font-mono font-bold bg-red-950/80 border border-red-800/70 text-red-200 px-1.5 py-0.5 rounded">
                                    ⚡ {gear.damageOrEffect}
                                  </span>
                                )}
                                {gear.sizeOrRange && (
                                  <span className="text-[10px] font-mono bg-slate-950 border border-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                                    📏 {gear.sizeOrRange}
                                  </span>
                                )}
                                {gear.minStrength !== undefined && (
                                  <span
                                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                      strengthTooLow
                                        ? 'bg-amber-950/80 border-amber-600 text-amber-300 font-bold'
                                        : 'bg-slate-950 border-slate-800 text-slate-400'
                                    }`}
                                  >
                                    💪 Forza min: {gear.minStrength}
                                    {strengthTooLow ? ' (-1 tiro)' : ''}
                                  </span>
                                )}
                              </div>

                              {gear.specialRules && (
                                <div className="text-[10px] font-mono text-indigo-300 bg-indigo-950/40 border border-indigo-900/50 px-1.5 py-0.5 rounded">
                                  ★ Speciale: {gear.specialRules}
                                </div>
                              )}

                              <p className="text-[11px] text-slate-400 leading-snug">{gear.description}</p>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>

            {/* Tasti Navigazione Step 3 */}
            <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
              <button
                type="button"
                onClick={() => setWizardStep(2)}
                className="w-full sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-serif uppercase tracking-wider text-xs sm:text-sm font-semibold rounded-2xl flex items-center justify-center space-x-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Torna a Protagonista & Cast</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isSpectatorHost) {
                    setWizardStep(4);
                  } else if (!isAttrBudgetValid) {
                    setShowBudgetWarningModal(true);
                  } else {
                    setWizardStep(4);
                  }
                }}
                className={`w-full sm:w-auto px-8 py-3.5 text-white font-serif uppercase tracking-wider text-xs sm:text-sm font-bold rounded-2xl shadow-xl flex items-center justify-center space-x-2 cursor-pointer transition-all ${
                  isSpectatorHost
                    ? 'bg-gradient-to-r from-cyan-700 to-indigo-800 hover:from-cyan-600'
                    : isAttrBudgetValid
                    ? 'bg-gradient-to-r from-indigo-900 to-slate-900 hover:from-indigo-800'
                    : 'bg-gradient-to-r from-amber-900 to-slate-900 hover:from-amber-800 border border-amber-700/60'
                }`}
              >
                <span>Passo Successivo: Riepilogo & Avvio Tavolo</span>
                <ArrowRight className="w-5 h-5 text-indigo-400" />
              </button>
            </div>

                {/* MODAL AVVISO BUDGET WOD */}
                {showBudgetWarningModal && (
                  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-slate-900 border border-amber-600/70 rounded-3xl p-6 shadow-2xl space-y-4">
                      <div className="flex items-center space-x-3 text-amber-400">
                        <AlertTriangle className="w-6 h-6 shrink-0" />
                        <h4 className="font-serif font-black text-lg text-slate-100">
                          Bilanciamento Attributi D10
                        </h4>
                      </div>

                      <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                        <p>
                          Nel regolamento standard del Chronica Engine, alla creazione del personaggio
                          hai a disposizione <strong>12 punti extra</strong> suddivisi in <strong>5 / 4 / 3</strong> per le categorie (Mentali, Fisici, Sociali).
                        </p>
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 font-mono">
                          <div className="flex justify-between">
                            <span>Fisici:</span>
                            <span className={physSpent > physBudget ? 'text-red-400 font-bold' : 'text-slate-300'}>{physSpent} / {physBudget} pt</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Sociali:</span>
                            <span className={socSpent > socBudget ? 'text-red-400 font-bold' : 'text-slate-300'}>{socSpent} / {socBudget} pt</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Mentali:</span>
                            <span className={menSpent > menBudget ? 'text-red-400 font-bold' : 'text-slate-300'}>{menSpent} / {menBudget} pt</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-800 pt-1 font-bold">
                            <span>Totale Assegnato:</span>
                            <span className={totalAttrSpent !== 12 ? 'text-amber-400' : 'text-emerald-400'}>{totalAttrSpent} / 12 pt</span>
                          </div>
                        </div>
                        <p className="text-slate-400 italic">
                          Come desideri procedere?
                        </p>
                      </div>

                      <div className="space-y-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            resetToWodBalanced();
                            setShowBudgetWarningModal(false);
                            setWizardStep(4);
                          }}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-700 to-indigo-800 hover:from-emerald-600 text-white font-serif font-bold text-xs uppercase tracking-wider cursor-pointer"
                        >
                          Bilancia Automaticamente (5 / 4 / 3) e Continua
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowBudgetWarningModal(false);
                            setWizardStep(4);
                          }}
                          className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-serif text-xs cursor-pointer"
                        >
                          Continua Comunque (Modalità Libera / Senza Limiti)
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowBudgetWarningModal(false)}
                          className="w-full py-1.5 text-center text-xs text-slate-500 hover:text-slate-400 cursor-pointer"
                        >
                          Torna Indietro e Modifica a Mano
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: RIEPILOGO & AVVIO TAVOLO */}
            {wizardStep === 4 && (
              <div className="space-y-6 sm:space-y-8 animate-fadeIn">
                <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
                  {isSpectatorHost ? (
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-cyan-800/60 pb-4 gap-2">
                      <div>
                        <span className="text-xs font-mono uppercase text-cyan-400 font-bold block">
                          Modalità Schermo del Narratore
                        </span>
                        <h3 className="font-serif font-black text-2xl text-slate-100 mt-1 flex items-center gap-2">
                          <Tv className="w-6 h-6 text-cyan-400" />
                          <span>Schermo del Tavolo Condiviso</span>
                        </h3>
                        <p className="text-sm text-slate-400 font-serif italic">
                          Nessun personaggio sul PC • Tutti i {wizardRoster.length} personaggi del Cast sono pronti per smartphone
                        </p>
                      </div>

                      <div className="text-left sm:text-right space-y-1">
                        <div className="flex items-center gap-1.5 justify-start sm:justify-end">
                          <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                          <input
                            type="text"
                            value={city === 'Tombstone, Arizona' && era !== 'wild_west' ? (customEraInput.trim() || (wizardRoster[0]?.factionOrClan ? wizardRoster[0].factionOrClan.replace(/^ex\s+/i, '').split('/')[0].trim() : '') || 'Regno / Area Personalizzata') : city}
                            onChange={(e) => setCity(e.target.value)}
                            className="bg-slate-950/90 border border-slate-700 focus:border-indigo-400 rounded-xl px-3 py-1 text-xs text-slate-100 font-mono font-bold focus:outline-none w-full sm:w-auto min-w-[220px]"
                            placeholder="Luogo, Città o Regno..."
                            title="Modifica direttamente il luogo prima di avviare il tavolo"
                          />
                        </div>
                        <span className="text-xs text-indigo-300 font-mono block">
                          Epoca: {era === 'custom' ? customEraInput || 'Personalizzata' : eraOptions.find((e) => e.id === era)?.label}
                        </span>
                        <span className="text-xs text-amber-300 font-mono block">
                          {timeOfDay} • Tono: {tone} • Difficoltà: {difficulty}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 gap-2">
                      <div>
                        <span className="text-xs font-mono uppercase text-indigo-400 font-bold block">
                          Riepilogo del Tavolo & Personaggio
                        </span>
                        <h3 className="font-serif font-black text-2xl text-slate-100 mt-1">
                          {charName || 'Avventuriero'} • {creatureType.toUpperCase()} ({clan === 'Altro...' ? customClan : clan})
                        </h3>
                        <p className="text-sm text-slate-400 font-serif italic">
                          {concept} | Virtù: {virtue} | Vizio: {vice}
                        </p>
                      </div>

                      <div className="text-left sm:text-right space-y-1">
                        <div className="flex items-center gap-1.5 justify-start sm:justify-end">
                          <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                          <input
                            type="text"
                            value={city === 'Tombstone, Arizona' && era !== 'wild_west' ? (customEraInput.trim() || (wizardRoster[0]?.factionOrClan ? wizardRoster[0].factionOrClan.replace(/^ex\s+/i, '').split('/')[0].trim() : '') || 'Regno / Area Personalizzata') : city}
                            onChange={(e) => setCity(e.target.value)}
                            className="bg-slate-950/90 border border-slate-700 focus:border-indigo-400 rounded-xl px-3 py-1 text-xs text-slate-100 font-mono font-bold focus:outline-none w-full sm:w-auto min-w-[220px]"
                            placeholder="Luogo, Città o Regno..."
                            title="Modifica direttamente il luogo prima di avviare il tavolo"
                          />
                        </div>
                        <span className="text-xs text-indigo-300 font-mono block">
                          Epoca: {era === 'custom' ? customEraInput || 'Personalizzata' : eraOptions.find((e) => e.id === era)?.label}
                        </span>
                        <span className="text-xs text-amber-300 font-mono block">
                          {timeOfDay} • Tono: {tone} • Difficoltà: {difficulty}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Info Box Tavolo Unificato */}
                  <div className="p-4 bg-indigo-950/40 border border-indigo-700/60 rounded-2xl flex items-start space-x-3">
                    <Tv className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-300 space-y-1">
                      <div className="font-serif font-bold text-indigo-200 text-sm">
                        Tavolo Aperto & Calibrazione Dinamica
                      </div>
                      <p className="leading-relaxed">
                        Puoi giocare subito da questo PC. In qualsiasi momento, altri giocatori possono inquadrare il QR Code della stanza con il proprio smartphone, creare la propria scheda ed entrare in partita. Il Narratore IA calibra automaticamente sfide e turni in base a chi è seduto al tavolo!
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-mono uppercase text-slate-400 block mb-2 font-bold">
                      Fazioni e Minacce in gioco:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedEnemies.map((e) => (
                        <span key={e} className="px-3 py-1 bg-red-950/60 border border-red-800/80 rounded-xl text-xs font-semibold text-red-200">
                          ⚠ {e}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Badge Canovaccio se caricato */}
                  {storyOutlineContent.trim() && (
                    <div className="p-3 bg-purple-950/40 border border-purple-700/60 rounded-xl flex items-center justify-between text-xs font-mono text-purple-200">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-purple-400 shrink-0" />
                        <span>
                          Canovaccio Trama Attivo: <strong>{storyOutlineFileName || 'Testo inserito'}</strong> ({storyOutlineContent.split(/\s+/).filter(Boolean).length} parole)
                        </span>
                      </div>
                      <span className="text-emerald-400 font-bold">✓ Guida IA Attiva</span>
                    </div>
                  )}

                  {/* Sezione Mappe Registrate nel Riepilogo */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase text-amber-400 font-bold flex items-center space-x-1.5">
                        <Compass className="w-3.5 h-3.5" />
                        <span>Mappe della Cronaca ({wizardMaps.length})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setWizardStep(1)}
                        className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                      >
                        Gestisci Mappe
                      </button>
                    </div>

                    {wizardMaps.length === 0 ? (
                      <p className="text-xs text-slate-400 font-serif italic">
                        Mappa Vettoriale / Satellitare attiva per {city || 'Chronica'}. Potrai aggiungere mappe di singoli luoghi in qualsiasi momento durante la sessione.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {wizardMaps.map((m) => (
                          <div
                            key={m.id}
                            className="p-2 bg-slate-950 rounded-xl border border-slate-800 flex items-center space-x-2"
                          >
                            <img src={m.imageUrl} alt={m.name} className="w-8 h-8 rounded object-cover shrink-0" />
                            <div className="min-w-0">
                              <div className="text-xs font-serif font-bold text-slate-200 truncate">{m.name}</div>
                              <div className="text-[9px] font-mono text-slate-400 uppercase">
                                {m.category === 'general' ? 'Generale' : 'Luogo'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dettaglio trama facoltativo */}
                  <div>
                    <label className="block text-xs uppercase font-mono font-semibold text-slate-300 mb-2">
                      Spunti o Note Speciali per il Narratore AI (Facoltativo)
                    </label>
                    <textarea
                      value={customPlot}
                      onChange={(e) => setCustomPlot(e.target.value)}
                      rows={2}
                      placeholder="Es. Possiedo una reliquia rubata a una setta nemica, o cerco vendetta per il tradimento del mio vecchio maestro..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                </div>

                {/* Tasti Finali */}
                <div className="pt-2 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setWizardStep(isSpectatorHost ? 2 : 3)}
                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-serif uppercase tracking-wider text-sm font-semibold rounded-2xl flex items-center space-x-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{isSpectatorHost ? 'Torna al Cast' : 'Modifica Scheda'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStartChronicle}
                    className="px-9 py-4 bg-gradient-to-r from-red-800 via-indigo-900 to-slate-900 hover:from-red-700 hover:via-indigo-800 text-white font-serif uppercase tracking-widest text-base font-bold rounded-2xl shadow-2xl shadow-indigo-950/90 flex items-center space-x-3 cursor-pointer transition-transform hover:scale-105"
                  >
                    <BookOpen className="w-5 h-5 text-amber-300" />
                    <span>Avvia Tavolo di Gioco & Inizia</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: VEDIAMO CHE SUCCEDE */
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center max-w-lg mx-auto py-2">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-950 to-slate-950 border border-indigo-700 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-300 shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                <Dices className="w-8 h-8" />
              </div>
              <h3 className="font-serif font-bold text-xl sm:text-2xl text-slate-100">Modalità Destino Aperto</h3>
              <p className="text-sm sm:text-base text-slate-300 mt-2">
                Dal Far West assolato alle guerre dei samurai, dai pirati caraibici al fantasy arcano: clicca per generare un preludio ad alta tensione.
              </p>
              <button
                type="button"
                onClick={() => handleSelectQuickScenario(Math.floor(Math.random() * QUICK_START_SCENARIOS.length))}
                className="mt-6 px-8 py-3.5 bg-gradient-to-r from-red-800 to-indigo-900 hover:from-red-700 hover:to-indigo-800 text-white font-serif uppercase tracking-wider text-sm sm:text-base font-bold rounded-2xl shadow-xl shadow-indigo-950/80 transition-transform hover:scale-105 cursor-pointer flex items-center justify-center space-x-2 mx-auto"
              >
                <Sparkles className="w-5 h-5 text-amber-300" />
                <span>Genera Scenario Casuale & Avvia</span>
              </button>
            </div>

            {/* Scenari Preimpostati Ispiratori */}
            <div className="border-t border-slate-800 pt-6 space-y-4">
              <span className="text-xs sm:text-sm font-mono uppercase text-slate-400 block text-center font-semibold">
                Oppure scegli uno di questi mondi:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {QUICK_START_SCENARIOS.map((scenario, idx) => {
                  const gearItems = ALL_STORYTELLER_GEAR_OPTIONS.filter((g) =>
                    ((scenario as any).startingGearIds || []).includes(g.id)
                  );
                  return (
                    <div
                      key={idx}
                      className="p-5 bg-slate-950/60 hover:bg-slate-950/90 border border-slate-800 hover:border-indigo-500/80 rounded-2xl transition-all group shadow-sm flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <div className="font-serif font-bold text-base text-indigo-300 group-hover:text-indigo-200">
                            {scenario.city}
                          </div>
                          <span className="text-xs uppercase font-mono px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-amber-300">
                            {scenario.eraLabel}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-slate-400 mb-2">
                          Protagonista: <strong className="text-slate-200">{scenario.characterName}</strong> ({scenario.faction})
                        </div>
                        <p className="text-xs sm:text-sm text-slate-300 font-serif italic line-clamp-3">
                          {scenario.hook}
                        </p>

                        {/* Equipaggiamento reale dello Schermo incluso nello Scenario */}
                        {gearItems.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-slate-900/80">
                            <span className="text-[10px] font-mono uppercase text-emerald-400 block mb-1 font-bold">
                              Dotazione Ufficiale Inclusa:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {gearItems.map((g) => (
                                <span
                                  key={g.id}
                                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/70 text-emerald-200"
                                >
                                  {g.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-900 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectQuickScenario(idx, true)}
                          className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono cursor-pointer transition-colors"
                        >
                          ⚙️ Personalizza Scheda & Equip.
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectQuickScenario(idx, false)}
                          className="flex-1 py-2 px-3 rounded-xl bg-indigo-900/80 hover:bg-indigo-800 border border-indigo-600 text-white text-xs font-mono font-bold cursor-pointer transition-colors"
                        >
                          ⚡ Avvia Subito ➔
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
