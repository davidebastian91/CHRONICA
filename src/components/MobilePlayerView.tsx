import React, { useState, useEffect } from 'react';
import type {
  Character,
  CreatureType,
  DiceRollResult,
  StoryMessage,
  RequiredRoll,
  CampaignConfig,
} from '../types';
import { createCustomPlayerCharacter, PLAYER_ARCHETYPES } from '../utils/characterTemplates';
import {
  getAttributeXpCost,
  getAbilityXpCost,
  spendExperience,
  ensureExperienceTracker,
} from '../utils/experienceRules';
import {
  getBloodPotencyStats,
  spendVitaeToHeal,
  WEREWOLF_FORMS_TABLE,
  switchWerewolfForm,
  spendEssenceToHealLethal,
  getGnosisStats,
  detectMagePath,
} from '../utils/wodSupernaturalRules';
import { healDamageFromHealth, getEnemyHealthStatus } from '../utils/wodCombatRules';
import { multiplayer, type RoomCombatState } from '../services/multiplayer';
import { getAttributeValue, getAbilityValue, calculateDerivedTraits, parseSuggestionRoll, extractRequiredRollFromText, cleanStoryTextFromRollBadges } from '../utils/traitLabels';
import { DotRating } from './DotRating';
import { HealthTracker } from './HealthTracker';
import { DiceRollerModal } from './DiceRollerModal';
import { QuickGuideModal } from './QuickGuideModal';
import { GameTutorialModal } from './GameTutorialModal';
import { StorytellerScreenModal } from './StorytellerScreenModal';
import { StructuredInventoryView } from './StructuredInventoryView';
import { AskNarratorModal } from './AskNarratorModal';
import { addLootToInventory } from '../utils/inventorySystem';
import {
  WOD_MERITS_AND_FLAWS,
  ALL_STORYTELLER_GEAR_OPTIONS,
  getStartingGearForEra,
  getCharacterArmorStatsFromGear,
  convertGearOptionToInventoryItem,
  type ScreenGearCategory,
} from '../utils/wodMeritsAndGear';
import {
  Dices,
  Flame,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Sparkles,
  LogOut,
  CheckCircle2,
  Edit3,
  Crosshair,
  Scroll,
  HelpCircle,
  Package,
  Send,
  Zap,
  Check,
  Skull,
  Users,
  Bot,
  Lock,
  AlertCircle,
  Heart,
  HeartCrack,
  Mic,
  MicOff,
} from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface MobilePlayerViewProps {
  roomCode: string;
  onExitRoom?: () => void;
}

type MobileNavTab = 'play' | 'sheet' | 'inventory' | 'powers_merits';

function isCharacterValidForCampaign(char: any, camp?: CampaignConfig): boolean {
  if (!char || !camp) return false;
  if (char.campaignId && camp.id && char.campaignId === camp.id) return true;
  if (char.campaignTitle && camp.title && char.campaignTitle.toLowerCase() === camp.title.toLowerCase()) return true;
  if (camp.rosterCharacters?.some((r) => r.id === char.id || r.name.toLowerCase() === char.name.toLowerCase())) return true;
  return false;
}

export const MobilePlayerView: React.FC<MobilePlayerViewProps> = ({ roomCode, onExitRoom }) => {
  const [character, setCharacter] = useState<Character | null>(() => {
    try {
      const saved = localStorage.getItem(`chronica_player_${roomCode}`);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      // Rimuovi personaggi residui da vecchie sessioni passate senza legame con la cronaca (es. Morgan)
      if (!parsed?.campaignId && !parsed?.campaignTitle) {
        localStorage.removeItem(`chronica_player_${roomCode}`);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  // Tab di navigazione attiva su Mobile (basta scroll infinito!)
  const [activeNavTab, setActiveNavTab] = useState<MobileNavTab>('play');

  // Mostra schermata creazione se il personaggio non è ancora stato creato per questa stanza
  const [isCreatingChar, setIsCreatingChar] = useState(!character);

  // Campi form creazione personaggio
  const [newCharName, setNewCharName] = useState('');
  const [newCharCreature, setNewCharCreature] = useState<CreatureType>('hunter');
  const [newCharArchetype, setNewCharArchetype] = useState<string>('gunslinger');
  const [newCharClan, setNewCharClan] = useState<string>('');

  // Meriti e Difetti selezionati durante la creazione
  const [selectedMeritIds, setSelectedMeritIds] = useState<string[]>(['merit_quick_draw']);

  // Equipaggiamento Iniziale selezionato (Tabelle Schermo del Narratore)
  const [selectedGearIds, setSelectedGearIds] = useState<string[]>([
    'screen_ranged_revolver_heavy',
    'screen_ammo_pistol_pack',
    'screen_melee_knife',
    'screen_armor_reinforced_clothes',
  ]);
  const [mobileGearTab, setMobileGearTab] = useState<'all' | ScreenGearCategory>('all');

  // Gestione Avanzamento XP su Mobile (Legittimo WoD, solo punti assegnati dal Narratore)
  const [pendingMobileUpgrade, setPendingMobileUpgrade] = useState<{
    traitType: 'attr' | 'ability';
    traitKey: string;
    traitLabel: string;
    oldVal: number;
    newVal: number;
    cost: number;
  } | null>(null);


  const [isJoined, setIsJoined] = useState(false);
  const [latestStoryMessage, setLatestStoryMessage] = useState<StoryMessage | null>(null);
  const [isStoryOpen, setIsStoryOpen] = useState(true);

  // STATO TURNI CONDIVISI & AMBIENTAZIONE
  const [roomCampaign, setRoomCampaign] = useState<CampaignConfig | undefined>();
  const [roomPlayers, setRoomPlayers] = useState<
    { id: string; name: string; characterName?: string; character?: Character }[]
  >([]);
  const [charCreationTab, setCharCreationTab] = useState<'roster' | 'custom'>('roster');
  const [expandedRosterCharId, setExpandedRosterCharId] = useState<string | null>(null);
  const [activeTurnPlayerId, setActiveTurnPlayerId] = useState<string | undefined>();
  const [activeTurnPlayerName, setActiveTurnPlayerName] = useState<string | undefined>();
  const [roundNumber, setRoundNumber] = useState<number>(1);

  // STATO COMBATTIMENTO, NEMICI E OSTACOLI IN CORSA (Sincronizzato in tempo reale)
  const [combatState, setCombatState] = useState<RoomCombatState | null>(null);

  // ID Univoco stabile per questo client mobile
  const [myPlayerId] = useState<string>(() => (character?.id ? `p_${character.id}` : `p_${Date.now()}`));

  // STATO BOTTINO UNICO
  const [claimedLoot, setClaimedLoot] = useState<
    Record<string, { playerId: string; playerName: string; itemName: string }>
  >({});

  // Gestione Tiro Richiesto dal Narratore
  const [completedRollMsgId, setCompletedRequiredRollId] = useState<string | null>(null);
  const [lastExecutedRoll, setLastExecutedRoll] = useState<DiceRollResult | null>(null);
  const [customDifficulty, setCustomDifficulty] = useState<number | null>(null);

  // Modal Tiro Dadi Manuale Completo
  const [isCustomDiceOpen, setIsCustomDiceOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isStorytellerScreenOpen, setIsStorytellerScreenOpen] = useState(false);

  // Gestione Invio Azioni da Cellulare
  const [mobileActionInput, setMobileActionInput] = useState('');
  const [isSendingAction, setIsSendingAction] = useState(false);

  const {
    isListening: isMobileListening,
    isSupported: isMobileSpeechSupported,
    toggleListening: toggleMobileListening,
    stopListening: stopMobileListening,
  } = useSpeechRecognition({
    onResult: (text) => setMobileActionInput(text),
  });

  // Tratti per DiceRollerModal (se aperto da un Tiro Richiesto)
  const [diceModalTraits, setDiceModalTraits] = useState<{
    attr?: { name: string; value: number };
    ability?: { name: string; value: number };
    difficulty?: number;
    reason?: string;
    modifier?: number;
  } | null>(null);

  // Inizializza gli equipaggiamenti consigliati per l'ambientazione
  useEffect(() => {
    const gearList = getStartingGearForEra(roomCampaign?.era);
    if (gearList.length > 0 && selectedGearIds.length === 0) {
      // Pre-seleziona i primi 3-4 elementi essenziali (arma principale, munizioni, protezione)
      setSelectedGearIds(gearList.slice(0, 4).map((g) => g.id));
    }
  }, [roomCampaign?.era]);

  // Memorizza la stanza attiva per riconnessioni future e carica info stanza / cast
  useEffect(() => {
    localStorage.setItem('chronica_current_mobile_room', roomCode);

    fetch(`/api/room-info?roomCode=${encodeURIComponent(roomCode)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.campaign) {
          const camp = data.campaign;
          setRoomCampaign(camp);
          if (character) {
            if (!isCharacterValidForCampaign(character, camp)) {
              console.warn(`[Chronica Mobile] Personaggio "${character.name}" non valido per "${camp.title}". Reset.`);
              localStorage.removeItem(`chronica_player_${roomCode}`);
              setCharacter(null);
              setIsCreatingChar(true);
              setCharCreationTab(camp.rosterCharacters && camp.rosterCharacters.length > 0 ? 'roster' : 'custom');
            }
          } else {
            setIsCreatingChar(true);
            setCharCreationTab(camp.rosterCharacters && camp.rosterCharacters.length > 0 ? 'roster' : 'custom');
          }
        }
        if (data?.players) {
          setRoomPlayers(data.players);
        }
      })
      .catch(() => {
        fetch('/api/active-room')
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.campaign) {
              const camp = data.campaign;
              setRoomCampaign(camp);
              if (character) {
                if (!isCharacterValidForCampaign(character, camp)) {
                  localStorage.removeItem(`chronica_player_${roomCode}`);
                  setCharacter(null);
                  setIsCreatingChar(true);
                  setCharCreationTab(camp.rosterCharacters && camp.rosterCharacters.length > 0 ? 'roster' : 'custom');
                }
              } else {
                setIsCreatingChar(true);
                setCharCreationTab(camp.rosterCharacters && camp.rosterCharacters.length > 0 ? 'roster' : 'custom');
              }
            }
          })
          .catch(() => {});
      });
  }, [roomCode]);

  // Connessione WebSocket e Sottoscrizione quando il personaggio esiste ed è verificato per la campagna
  useEffect(() => {
    if (!character || isCreatingChar) return;
    if (roomCampaign && !isCharacterValidForCampaign(character, roomCampaign)) return;

    const connectToRoom = () => {
      multiplayer.connect().then(() => {
        multiplayer.joinRoom(roomCode, {
          id: myPlayerId,
          name: character.name,
          character,
          joinedAt: Date.now(),
        });
        setIsJoined(true);
      });
    };

    connectToRoom();

    const unsubscribe = multiplayer.subscribe((msg) => {
      if (msg.type === 'STORY_UPDATE') {
        setLatestStoryMessage(msg.message);
        setCustomDifficulty(null);
      } else if (msg.type === 'COMBAT_STATE_CHANGED') {
        setCombatState(msg.combatState);
      } else if (msg.type === 'ROOM_STATE') {
        if (msg.messages && msg.messages.length > 0) {
          setLatestStoryMessage(msg.messages[msg.messages.length - 1]);
        }
        if (msg.campaign) setRoomCampaign(msg.campaign);
        if (msg.players) setRoomPlayers(msg.players);
        if (msg.activeTurnPlayerId) setActiveTurnPlayerId(msg.activeTurnPlayerId);
        if (msg.activeTurnPlayerName) setActiveTurnPlayerName(msg.activeTurnPlayerName);
        if (msg.roundNumber) setRoundNumber(msg.roundNumber);
        if (msg.claimedLoot) setClaimedLoot(msg.claimedLoot);
        if (msg.combatState) setCombatState(msg.combatState);
        setIsJoined(true);
      } else if (msg.type === 'CAMPAIGN_UPDATED') {
        setRoomCampaign(msg.campaign);
      } else if (msg.type === 'PLAYER_JOINED') {
        setRoomPlayers((prev) => [...prev.filter((p) => p.id !== msg.player.id), msg.player]);
      } else if (msg.type === 'TURN_CHANGED') {
        setActiveTurnPlayerId(msg.activeTurnPlayerId);
        setActiveTurnPlayerName(msg.activeTurnPlayerName);
        if (msg.roundNumber) setRoundNumber(msg.roundNumber);
      } else if (msg.type === 'LOOT_CLAIMED') {
        setClaimedLoot((prev) => ({
          ...prev,
          [msg.lootId]: { playerId: msg.playerId, playerName: msg.playerName, itemName: msg.itemName },
        }));
      }
    });

    return () => unsubscribe();
  }, [roomCode, character?.id]);

  // Sincronizza modifiche scheda con il server
  const handleUpdateChar = (updated: Character) => {
    setCharacter(updated);
    localStorage.setItem(`chronica_player_${roomCode}`, JSON.stringify(updated));
    multiplayer.updateCharacter(updated);
  };

  const exp = character ? ensureExperienceTracker(character) : { current: 0, total: 0, history: [] };

  const isMyTurn = !activeTurnPlayerId || activeTurnPlayerId === myPlayerId || activeTurnPlayerId === character?.id;

  const handleSendMobileAction = (actionText: string) => {
    if (!actionText.trim() || isSendingAction || !isMyTurn) return;
    setIsSendingAction(true);
    multiplayer.sendAction(actionText.trim());
    setMobileActionInput('');
    setTimeout(() => setIsSendingAction(false), 2000);
  };

  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [isAskingNarrator, setIsAskingNarrator] = useState(false);

  const handleAskQuestionMobile = async (question: string) => {
    setIsAskingNarrator(true);
    try {
      multiplayer.askQuestion(question);
    } finally {
      setIsAskingNarrator(false);
    }
  };

  const handleSubmitCustomAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (isMobileListening) stopMobileListening();
    if (!mobileActionInput.trim()) return;
    handleSendMobileAction(mobileActionInput.trim());
  };

  const handleOpenRequiredRollModal = (req: RequiredRoll, msgId: string) => {
    if (!character) return;
    const attrInfo = getAttributeValue(character, req.attribute);
    const abilityInfo = req.ability ? getAbilityValue(character, req.ability) : undefined;
    const targetDiff = customDifficulty !== null ? customDifficulty : req.difficulty || 8;

    let mod = req.modifier;
    if (mod === undefined && req.reason) {
      const match = req.reason.match(/([+-]\d+)/);
      if (match) mod = parseInt(match[1], 10);
    }

    setDiceModalTraits({
      attr: { name: attrInfo.key, value: attrInfo.value },
      ability: abilityInfo?.key ? { name: abilityInfo.key, value: abilityInfo.value } : undefined,
      difficulty: targetDiff,
      reason: req.reason || `Tiro Richiesto: ${attrInfo.label}${abilityInfo?.label ? ' + ' + abilityInfo.label : ''}`,
      modifier: mod || 0,
    });
    setCompletedRequiredRollId(msgId);
    setIsCustomDiceOpen(true);
  };

  // Raccolta bottino protetta da click multipli
  const handleClaimLoot = (lootId: string, itemName: string, itemDesc?: string) => {
    if (!character || claimedLoot[lootId]) return;

    multiplayer.claimLoot(lootId, itemName);
    const updated = addLootToInventory(character, itemName, itemDesc);
    handleUpdateChar(updated);
  };

  const handleMobileAttrChange = (key: string, name: string, newVal: number) => {
    if (!character) return;
    const oldVal = (character.attributes as any)[key] ?? 1;
    if (newVal <= oldVal) return; // Non si scalano pallini indietro
    const cost = getAttributeXpCost(oldVal);
    setPendingMobileUpgrade({
      traitType: 'attr',
      traitKey: key,
      traitLabel: name,
      oldVal,
      newVal,
      cost,
    });
  };

  const handleMobileAbilityChange = (key: string, name: string, newVal: number) => {
    if (!character) return;
    const oldVal = (character.abilities as any)[key] || 0;
    if (newVal <= oldVal) return;
    const cost = getAbilityXpCost(oldVal);
    setPendingMobileUpgrade({
      traitType: 'ability',
      traitKey: key,
      traitLabel: name,
      oldVal,
      newVal,
      cost,
    });
  };

  const confirmMobileUpgrade = () => {
    if (!character || !pendingMobileUpgrade) return;
    const res = spendExperience(
      character,
      pendingMobileUpgrade.cost,
      pendingMobileUpgrade.traitLabel,
      pendingMobileUpgrade.oldVal,
      pendingMobileUpgrade.newVal
    );
    if (res.success) {
      handleUpdateChar(res.character);
      setPendingMobileUpgrade(null);
    } else {
      alert(res.error);
    }
  };

  // Creazione e salvataggio del nuovo personaggio mobile con Meriti & Equipaggiamento
  const handleConfirmCharacter = (e: React.FormEvent) => {
    e.preventDefault();

    const finalName = newCharName.trim() || 'Avventuriero';
    const newChar = createCustomPlayerCharacter(
      finalName,
      newCharCreature,
      newCharArchetype,
      newCharClan.trim() || undefined
    );

    // 1. Assegna Meriti & Difetti selezionati
    newChar.meritsFlaws = WOD_MERITS_AND_FLAWS.filter((m) => selectedMeritIds.includes(m.id));

    // 2. Assegna Equipaggiamento Iniziale selezionato & Valore Armatura
    const chosenGear = ALL_STORYTELLER_GEAR_OPTIONS.filter((g) => selectedGearIds.includes(g.id));
    if (chosenGear.length > 0) {
      newChar.structuredInventory = chosenGear.map(convertGearOptionToInventoryItem);
      newChar.inventory = newChar.structuredInventory.map((i) => i.name);
      const armorStats = getCharacterArmorStatsFromGear(selectedGearIds);
      newChar.armor = armorStats.armorValue;
      newChar.defense = Math.max(0, (newChar.defense || 2) + armorStats.defensePenalty);
      newChar.speed = Math.max(1, (newChar.speed || 10) + armorStats.speedPenalty);
    }

    (newChar as any).campaignId = roomCampaign?.id;
    (newChar as any).campaignTitle = roomCampaign?.title;
    (newChar as any).era = roomCampaign?.era;

    setCharacter(newChar);
    localStorage.setItem(`chronica_player_${roomCode}`, JSON.stringify(newChar));
    setIsCreatingChar(false);

    // Connessione al tavolo
    multiplayer.connect().then(() => {
      const playerId = `p_${newChar.id}`;
      multiplayer.joinRoom(roomCode, {
        id: playerId,
        name: newChar.name,
        character: newChar,
        joinedAt: Date.now(),
      });
      setIsJoined(true);
    });
  };

  const handleSelectRosterCharacter = (chosen: Character) => {
    const finalChar: Character = {
      ...chosen,
      id: chosen.id || `p_${Date.now()}`,
    };
    (finalChar as any).campaignId = roomCampaign?.id;
    (finalChar as any).campaignTitle = roomCampaign?.title;
    (finalChar as any).era = roomCampaign?.era;

    setCharacter(finalChar);
    localStorage.setItem(`chronica_player_${roomCode}`, JSON.stringify(finalChar));
    setIsCreatingChar(false);

    // Connessione al tavolo
    multiplayer.connect().then(() => {
      const playerId = `p_${finalChar.id}`;
      multiplayer.joinRoom(roomCode, {
        id: playerId,
        name: finalChar.name,
        character: finalChar,
        joinedAt: Date.now(),
      });
      setIsJoined(true);
    });
  };

  const handleExit = () => {
    localStorage.removeItem('chronica_current_mobile_room');
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    if (onExitRoom) {
      onExitRoom();
    } else {
      window.location.href = window.location.origin + window.location.pathname;
    }
  };

  const startingGearList = getStartingGearForEra(roomCampaign?.era);

  // =========================================================================
  // 1. SCHERMATA CREAZIONE PERSONAGGIO COMPLETA (CON MERITI & EQUIPAGGIAMENTO)
  // =========================================================================
  if (isCreatingChar || !character) {
    const creatureOptions: { type: CreatureType; label: string; desc: string; icon: string }[] = [
      { type: 'hunter', label: 'Cacciatore', desc: 'Precisione balistica, fede e tattica', icon: '🏹' },
      { type: 'vampire', label: 'Vampiro', desc: 'Predatore immortale e poteri del sangue', icon: '🧛' },
      { type: 'werewolf', label: 'Lupo Mannaro', desc: 'Furia primordiale e legame spirituale', icon: '🐺' },
      { type: 'mage', label: 'Mago', desc: 'Magia runica e controllo della realtà', icon: '🔮' },
      { type: 'mortal', label: 'Mortale', desc: 'Investigatore acuto e coraggioso', icon: '👤' },
    ];

    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-center p-3 sm:p-4 pb-12">
        <div className="max-w-lg mx-auto w-full bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-4 sm:p-6 space-y-4">
          <div className="text-center space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-indigo-950/80 border border-indigo-700/80 rounded-full text-[11px] font-mono text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Stanza Tavolo {roomCode}</span>
            </div>
            <h2 className="font-serif font-black text-xl text-slate-100 tracking-wide mt-1">
              {roomCampaign?.rosterCharacters && roomCampaign.rosterCharacters.length > 0 && charCreationTab === 'roster'
                ? 'Scegli il tuo Personaggio'
                : 'Crea il tuo Personaggio'}
            </h2>
            <p className="text-xs text-slate-400 font-serif">
              {roomCampaign?.rosterCharacters && roomCampaign.rosterCharacters.length > 0 && charCreationTab === 'roster'
                ? 'Seleziona un personaggio dal Cast della Cronaca o creane uno da zero'
                : 'Tratti ufficiali, Meriti (es. Estrazione Rapida) ed Equipaggiamento Iniziale'}
            </p>
          </div>

          {/* Switcher Tab Cast vs Crea da Zero */}
          {roomCampaign?.rosterCharacters && roomCampaign.rosterCharacters.length > 0 && (
            <div className="grid grid-cols-2 p-1 bg-slate-950 border border-slate-800 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => setCharCreationTab('roster')}
                className={`py-2 px-3 rounded-xl text-xs font-serif font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  charCreationTab === 'roster'
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Cast Cronaca ({roomCampaign.rosterCharacters.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setCharCreationTab('custom')}
                className={`py-2 px-3 rounded-xl text-xs font-serif font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  charCreationTab === 'custom'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Crea da Zero</span>
              </button>
            </div>
          )}

          {charCreationTab === 'roster' && roomCampaign?.rosterCharacters && roomCampaign.rosterCharacters.length > 0 ? (
            <div className="space-y-3">
              {/* Banner Regola Vincolante IA */}
              <div className="p-3 bg-gradient-to-r from-purple-950/60 to-slate-900 border border-purple-500/40 rounded-2xl flex items-start space-x-2.5">
                <Bot className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed text-slate-300">
                  <span className="font-bold text-purple-200 block uppercase font-mono">
                    Regola Narrativa:
                  </span>
                  Scegli chi interpretare. <strong>I personaggi non scelti saranno guidati dall'IA Narratore</strong> come comprimari attivi.
                </div>
              </div>

              {/* Elenco Carte Personaggio */}
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                {roomCampaign.rosterCharacters.map((char) => {
                  const charNameLower = (char.name || '').toLowerCase().trim();
                  const takenByPlayer = roomPlayers.find(
                    (p) =>
                      (p.characterName || p.character?.name || '').toLowerCase().trim() === charNameLower ||
                      (p.name || '').toLowerCase().trim() === charNameLower
                  );
                  const isTaken = !!takenByPlayer;
                  const isExpanded = expandedRosterCharId === char.id;

                  return (
                    <div
                      key={char.id}
                      className={`bg-slate-950 border rounded-2xl p-3.5 transition-all shadow-md ${
                        isTaken ? 'border-slate-800 opacity-60' : 'border-slate-700/80 hover:border-amber-500/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <span className="text-2xl shrink-0">
                            {char.creatureType === 'vampire'
                              ? '🧛'
                              : char.creatureType === 'werewolf'
                              ? '🐺'
                              : char.creatureType === 'mage'
                              ? '🔮'
                              : char.creatureType === 'hunter'
                              ? '🏹'
                              : '👤'}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-serif font-black text-sm text-slate-100 truncate">
                                {char.name}
                              </h4>
                              {char.isProtagonistSlot ? (
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                                  Slot Protagonista
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                                  Pronto
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 truncate">
                              {char.concept}
                              {char.factionOrClan ? ` • ${char.factionOrClan}` : ''}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setExpandedRosterCharId(isExpanded ? null : char.id)}
                          className="p-1 text-slate-500 hover:text-slate-300 rounded cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Dettagli sintetici sempre visibili */}
                      <div className="mt-2.5 pt-2 border-t border-slate-900 grid grid-cols-3 gap-1.5 text-[10px] font-mono text-slate-400">
                        <div>
                          <span className="text-slate-600 block">Fisici:</span>
                          <span className="text-slate-300">
                            F{char.attributes?.strength || 2} D{char.attributes?.dexterity || 2} C{char.attributes?.stamina || 2}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-600 block">Mentali:</span>
                          <span className="text-slate-300">
                            I{char.attributes?.intelligence || 2} P{char.attributes?.wits || 2} F{char.attributes?.resolve || 2}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-600 block">Derivati:</span>
                          <span className="text-slate-300">
                            Dif {char.defense || 2} • Iniz +{char.initiativeMod || 4}
                          </span>
                        </div>
                      </div>

                      {/* Dettagli Espansi */}
                      {isExpanded && (
                        <div className="mt-2.5 pt-2 border-t border-slate-900 space-y-2 text-xs">
                          {char.backgroundNotes && (
                            <div className="text-xs text-slate-300 font-serif leading-relaxed bg-slate-900/90 p-3 rounded-xl border border-slate-800 max-h-60 overflow-y-auto whitespace-pre-wrap">
                              {char.backgroundNotes}
                            </div>
                          )}
                          {char.inventory && char.inventory.length > 0 && (
                            <div className="text-[11px] text-slate-400">
                              <span className="font-bold text-slate-500 block">Equipaggiamento:</span>
                              <span>{char.inventory.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Pulsante Selezione */}
                      <div className="mt-3 space-y-1.5">
                        {isTaken ? (
                          <div className="w-full py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-center text-xs text-slate-500 font-mono flex items-center justify-center space-x-1.5">
                            <Lock className="w-3.5 h-3.5 text-slate-600" />
                            <span>Già scelto da {takenByPlayer?.name || 'un altro giocatore'}</span>
                          </div>
                        ) : char.isProtagonistSlot ? (
                          <button
                            type="button"
                            onClick={() => {
                              setNewCharName(char.name);
                              if (char.creatureType) setNewCharCreature(char.creatureType);
                              if (char.factionOrClan) setNewCharClan(char.factionOrClan);
                              setCharCreationTab('custom');
                            }}
                            className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white rounded-xl text-xs font-serif font-black tracking-wide shadow-md shadow-amber-900/30 flex items-center justify-center space-x-1.5 cursor-pointer active:scale-[0.98] transition-all"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-200" />
                            <span>Scegli e Personalizza {char.name}</span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSelectRosterCharacter(char)}
                              className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white rounded-xl text-xs font-serif font-black tracking-wide shadow-md shadow-indigo-900/30 flex items-center justify-center space-x-1.5 cursor-pointer active:scale-[0.98] transition-all"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                              <span>Interpreta Subito {char.name}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setNewCharName(char.name);
                                if (char.creatureType) setNewCharCreature(char.creatureType);
                                if (char.factionOrClan) setNewCharClan(char.factionOrClan);
                                setCharCreationTab('custom');
                              }}
                              className="w-full text-center text-[11px] text-slate-400 hover:text-slate-200 font-mono py-1 cursor-pointer transition-colors"
                            >
                              Oppure personalizza i tratti prima di entrare →
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleConfirmCharacter} className="space-y-4">
            {/* Nome Personaggio */}
            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-400 font-bold block">
                Nome del tuo Personaggio:
              </label>
              <input
                type="text"
                required
                value={newCharName}
                onChange={(e) => setNewCharName(e.target.value)}
                placeholder="Es. Silas Cole, Julian Cross, Sarah Vance..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-serif font-bold"
              />
            </div>

            {/* Natura della Creatura */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400 font-bold block">
                Natura Sovrannaturale:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {creatureOptions.map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setNewCharCreature(opt.type)}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center space-x-2 ${
                      newCharCreature === opt.type
                        ? 'bg-indigo-950 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="text-lg">{opt.icon}</span>
                    <span className="font-serif font-bold text-xs">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Archetipo o Tratti */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400 font-bold block">
                Archetipo Tattico:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {PLAYER_ARCHETYPES.map((arch) => (
                  <button
                    key={arch.id}
                    type="button"
                    onClick={() => setNewCharArchetype(arch.id)}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      newCharArchetype === arch.id
                        ? 'bg-amber-950/60 border-amber-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-serif font-bold text-xs text-amber-300">{arch.label}</div>
                    <div className="text-[10px] text-slate-400 line-clamp-1">{arch.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* SEZIONE MERITI & DIFETTI (Con Estrazione Rapida!) */}
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-amber-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Meriti & Manovre Speciali</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Opzionali</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto pr-1">
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
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-start space-x-2 ${
                        isChecked
                          ? 'bg-amber-950/50 border-amber-600/90 text-white'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                          isChecked ? 'bg-amber-600 border-amber-400 text-white' : 'border-slate-700'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                      <div>
                        <div className="font-serif font-bold text-xs text-slate-100 flex items-center gap-1.5">
                          <span>{mf.name}</span>
                          <span className="text-[10px] font-mono text-amber-400">({mf.cost > 0 ? `+${mf.cost}` : mf.cost} pt)</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{mf.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SEZIONE EQUIPAGGIAMENTO INIZIALE UFFICIALE (SCHERMO DEL NARRATORE) */}
            <div className="p-3 bg-slate-950/90 border border-emerald-800/70 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-emerald-300 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Equipaggiamento (Tabelle Schermo Narratore)</span>
                </span>
                <span className="text-[10px] text-emerald-300 bg-emerald-950 border border-emerald-700 px-2 py-0.5 rounded font-mono font-bold">
                  {selectedGearIds.length} Selezionati
                </span>
              </div>

              {/* Tab Categorie Mobile */}
              <div className="flex flex-wrap gap-1">
                {[
                  { id: 'all', label: '📋 Tutte' },
                  { id: 'melee', label: '🗡️ Mischia' },
                  { id: 'ranged', label: '🔫 Distanza' },
                  { id: 'explosive', label: '💣 Esplosivi' },
                  { id: 'armor', label: '🛡️ Armature' },
                  { id: 'utility', label: '🎒 Kit' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setMobileGearTab(cat.id as any)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                      mobileGearTab === cat.id
                        ? 'bg-emerald-700 text-white font-bold'
                        : 'bg-slate-900 border border-slate-800 text-slate-400'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-1.5 max-h-64 overflow-y-auto pr-1">
                {startingGearList
                  .filter((g) => mobileGearTab === 'all' || g.screenCategory === mobileGearTab)
                  .map((gear) => {
                    const isChecked = selectedGearIds.includes(gear.id);
                    return (
                      <button
                        key={gear.id}
                        type="button"
                        onClick={() => {
                          setSelectedGearIds((prev) =>
                            prev.includes(gear.id) ? prev.filter((id) => id !== gear.id) : [...prev, gear.id]
                          );
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start space-x-2 ${
                          isChecked
                            ? 'bg-emerald-950/60 border-emerald-500 text-white'
                            : 'bg-slate-900/80 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                            isChecked ? 'bg-emerald-600 border-emerald-400 text-white' : 'border-slate-700'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="font-serif font-bold text-xs text-emerald-300 flex items-center justify-between gap-1">
                            <span className="truncate">{gear.name}</span>
                            {gear.costDots && (
                              <span className="text-[10px] font-mono text-amber-300 bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                                Costo {gear.costDots}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {gear.damageOrEffect && (
                              <span className="text-[10px] font-mono font-bold text-red-300 bg-red-950/70 px-1.5 py-0.5 rounded">
                                {gear.damageOrEffect}
                              </span>
                            )}
                            {gear.sizeOrRange && (
                              <span className="text-[10px] font-mono text-slate-300 bg-slate-950 px-1.5 py-0.5 rounded">
                                {gear.sizeOrRange}
                              </span>
                            )}
                          </div>
                          {gear.specialRules && (
                            <div className="text-[10px] font-mono text-indigo-300">★ {gear.specialRules}</div>
                          )}
                          <p className="text-[10px] text-slate-400 leading-tight">{gear.description}</p>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Bottone di Conferma */}
            <button
              type="submit"
              disabled={!newCharName.trim() || selectedGearIds.length === 0}
              className={`w-full py-3.5 rounded-2xl font-serif font-black uppercase tracking-wider text-xs sm:text-sm shadow-xl flex items-center justify-center space-x-2 transition-all ${
                newCharName.trim() && selectedGearIds.length > 0
                  ? 'bg-gradient-to-r from-red-700 via-indigo-700 to-emerald-700 hover:from-red-600 text-white cursor-pointer active:scale-[0.99]'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Entra al Tavolo con Questo Personaggio</span>
            </button>
          </form>
          )}

          {character && (
            <button
              type="button"
              onClick={() => setIsCreatingChar(false)}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-300 font-mono transition-colors"
            >
              Annulla e mantieni scheda attuale
            </button>
          )}
        </div>
      </div>
    );
  }

  // Dati Tiro Richiesto
  const pendingReq = latestStoryMessage?.requiredRoll || (latestStoryMessage?.text ? extractRequiredRollFromText(latestStoryMessage.text) : undefined);
  const isPendingRollActive = !!pendingReq && (!latestStoryMessage || completedRollMsgId !== latestStoryMessage.id);
  const reqAttrInfo = pendingReq ? getAttributeValue(character, pendingReq.attribute) : null;
  const reqAbilityInfo = pendingReq && pendingReq.ability ? getAbilityValue(character, pendingReq.ability) : null;
  const reqTotalPool = reqAttrInfo ? Math.max(1, reqAttrInfo.value + (reqAbilityInfo?.value || 0)) : 4;
  const activeDifficulty = customDifficulty !== null ? customDifficulty : pendingReq?.difficulty || 6;

  // Controllo Loot
  const currentLootId = latestStoryMessage?.itemAward ? `${latestStoryMessage.id}_loot` : null;
  const currentLootClaim = currentLootId ? claimedLoot[currentLootId] : null;

  // =========================================================================
  // 2. SCHERMATA DI GIOCO PRINCIPALE MOBILE (LAYOUT A 4 SCHEDE PULITE)
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans pb-24">
      {/* Top Header Mobile */}
      <header className="sticky top-0 z-40 bg-slate-950/95 border-b border-slate-800 px-3.5 py-2.5 flex items-center justify-between backdrop-blur shadow-md">
        <div className="flex items-center space-x-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isJoined ? 'bg-emerald-500 shadow-md shadow-emerald-500/50 animate-pulse' : 'bg-amber-500 animate-ping'
            }`}
            title={isJoined ? 'Connesso al Tavolo' : 'Riconnessione...'}
          />
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="font-serif font-black text-sm tracking-wide text-slate-100 truncate max-w-[110px]">
                {character.name}
              </h1>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem(`chronica_player_${roomCode}`);
                  setCharCreationTab(roomCampaign?.rosterCharacters && roomCampaign.rosterCharacters.length > 0 ? 'roster' : 'custom');
                  setIsCreatingChar(true);
                }}
                className="px-2 py-0.5 rounded-lg bg-amber-950/80 border border-amber-600/80 text-amber-200 hover:text-white text-[10px] font-mono cursor-pointer flex items-center space-x-1 shadow-sm active:scale-95 transition-all"
                title="Cambia o Scegli Personaggio"
              >
                <Users className="w-3 h-3 text-amber-400" />
                <span>Cambia</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 font-serif italic line-clamp-1">
              {character.creatureType} • {character.factionOrClan}
            </p>
          </div>
        </div>

        {/* Azioni rapide Header: Riserva Sangue, Dadi Rapidi ed Esci */}
        <div className="flex items-center space-x-1.5">
          <div className="flex items-center space-x-1 bg-red-950/70 border border-red-800/80 rounded-lg px-2 py-1 text-xs">
            <Flame className="w-3.5 h-3.5 text-red-500" />
            <span className="font-mono font-bold text-slate-100">
              {character.bloodOrEnergy.current}/{character.bloodOrEnergy.max}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsStorytellerScreenOpen(true)}
            className="p-1.5 bg-amber-950/80 border border-amber-700/80 rounded-lg text-amber-300 hover:text-white cursor-pointer"
            title="Schermo del Narratore Ufficiale"
          >
            <Scroll className="w-4 h-4" />
          </button>

          {roomCampaign?.rosterCharacters && roomCampaign.rosterCharacters.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setCharCreationTab('roster');
                setIsCreatingChar(true);
              }}
              className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-amber-400 hover:text-amber-300 cursor-pointer"
              title="Cast della Cronaca"
            >
              <Users className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsTutorialOpen(true)}
            className="p-1.5 bg-slate-900 border border-amber-500/70 rounded-lg text-amber-300 hover:text-white cursor-pointer"
            title="Tutorial: Come Giocare"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
          </button>

          <button
            type="button"
            onClick={() => setIsGuideOpen(true)}
            className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-indigo-300 hover:text-white cursor-pointer"
            title="Guida Rapida"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleExit}
            className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-red-400 cursor-pointer"
            title="Esci"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* =================================================================== */}
      {/* TAB 1: AZIONE & TAVOLO (Gestione Turno, Narrazione e Scelte)      */}
      {/* =================================================================== */}
      {activeNavTab === 'play' && (
        <div className="p-3 sm:p-4 space-y-3.5">
          {/* BANNER STATO TURNO SEQUENZIALE (STOP AL FAR WEST DEI CLICK!) */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs transition-all shadow-md ${
              isMyTurn
                ? 'bg-gradient-to-r from-amber-950/70 via-slate-900 to-indigo-950 border-amber-500 text-amber-200'
                : 'bg-slate-950/90 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <span className="text-xl shrink-0">{isMyTurn ? '⚡' : '⏳'}</span>
              <div>
                <div className="font-mono font-bold uppercase text-[11px] tracking-wider">
                  {isMyTurn ? 'È IL TUO TURNO!' : `In Attesa: Turno di ${activeTurnPlayerName || 'un altro giocatore'}`}
                </div>
                <div className="text-[11px] font-serif text-slate-300 mt-0.5">
                  {isMyTurn
                    ? 'Scegli la tua azione o tira i dadi dal tuo telefono.'
                    : 'Segui l\'azione sullo schermo o consulta la tua scheda.'}
                </div>
              </div>
            </div>
            <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 shrink-0">
              Round {roundNumber}
            </span>
          </div>

          {/* BANNER FASE D'INIZIATIVA SU MOBILE */}
          {combatState?.isCombatActive && combatState?.isInitiativePending && (
            <div className="bg-gradient-to-r from-amber-950/90 via-slate-900 to-red-950/90 border-2 border-amber-500 rounded-2xl p-4 shadow-xl space-y-2.5 animate-fadeIn">
              <div className="flex items-center space-x-2 text-amber-300">
                <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
                <h4 className="font-serif font-black text-sm text-slate-100">
                  ⚡ FASE DI INIZIATIVA! Lo scontro ha inizio!
                </h4>
              </div>
              <p className="text-xs text-slate-300 font-serif">
                Tira il tuo d10 per determinare l'ordine di azione al tavolo.
              </p>

              {(() => {
                const myEntry = combatState.initiativeOrder?.find(
                  (c) => c.id === myPlayerId || c.name === character.name
                );
                if (myEntry?.hasRolled) {
                  return (
                    <div className="p-2.5 bg-emerald-950/80 border border-emerald-600/70 rounded-xl text-center">
                      <span className="font-serif font-bold text-xs text-emerald-200">
                        ✅ Iniziativa registrata: <strong>{myEntry.totalInitiative}</strong> (Dado: {myEntry.d10Roll} + Mod. {myEntry.initiativeMod})
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">In attesa dell'inizio del Round 1...</p>
                    </div>
                  );
                }

                return (
                  <button
                    type="button"
                    onClick={() => {
                      const d10Roll = Math.floor(Math.random() * 10) + 1;
                      const mod = (character.attributes?.dexterity || 2) + (character.attributes?.composure || 2);
                      const total = Math.max(1, mod + d10Roll);
                      const initRoll: DiceRollResult = {
                        pool: 1,
                        difficulty: 8,
                        dice: [d10Roll],
                        rawSuccesses: total,
                        ones: 0,
                        netSuccesses: total,
                        outcome: 'success',
                        attributeName: 'Iniziativa',
                        timestamp: Date.now(),
                      };
                      multiplayer.rollDice(
                        initRoll,
                        `⚡ INIZIATIVA: ${total} [1d10 (${d10Roll}) + Mod ${mod}]`
                      );
                    }}
                    className="w-full py-3 bg-gradient-to-r from-amber-600 via-red-600 to-amber-700 hover:from-amber-500 text-white font-serif font-black uppercase text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center space-x-2 cursor-pointer animate-bounce"
                  >
                    <Dices className="w-4 h-4 text-amber-200" />
                    <span>🎲 Lancia la Tua Iniziativa!</span>
                  </button>
                );
              })()}
            </div>
          )}

          {/* OSTACOLO IN CORSA (SFONDAMENTO / INSEGUIMENTO DA SUPERARE) */}
          {combatState?.activeObstacle && !combatState.activeObstacle.resolved && (
            <div className="bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-950/90 border-2 border-amber-500 rounded-2xl p-3.5 shadow-lg space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🚧</span>
                  <div>
                    <h4 className="font-serif font-bold text-amber-200 text-sm">{combatState.activeObstacle.name}</h4>
                    <span className="text-[10px] font-mono text-amber-400">Ostacolo in Corsa (Avanzamento Collettivo)</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-950/90 border border-amber-500/60 rounded-lg">
                  <span className="text-xs font-mono font-bold text-amber-200">
                    {combatState.activeObstacle.currentSuccesses} / {combatState.activeObstacle.successesNeeded}
                  </span>
                  <span className="text-[10px] text-amber-300">Succ.</span>
                </div>
              </div>

              {combatState.activeObstacle.description && (
                <p className="text-xs text-slate-300 font-serif italic">
                  {combatState.activeObstacle.description}
                </p>
              )}

              {/* Barra di Progresso Successi */}
              <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-amber-600/40">
                <div
                  className="bg-gradient-to-r from-amber-500 to-emerald-400 h-2.5 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (combatState.activeObstacle.currentSuccesses / combatState.activeObstacle.successesNeeded) * 100)}%`,
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!character) return;
                  const obs = combatState.activeObstacle!;
                  const attrInfo = obs.attribute ? getAttributeValue(character, obs.attribute) : getAttributeValue(character, 'dexterity');
                  const abilInfo = obs.ability ? getAbilityValue(character, obs.ability) : getAbilityValue(character, 'athletics');
                  setDiceModalTraits({
                    attr: { name: attrInfo.key, value: attrInfo.value },
                    ability: abilInfo?.key ? { name: abilInfo.key, value: abilInfo.value } : undefined,
                    difficulty: 8,
                    reason: `Superare Ostacolo: ${obs.name} (${obs.currentSuccesses}/${obs.successesNeeded} successi)`,
                  });
                  setIsCustomDiceOpen(true);
                }}
                className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 text-white font-serif font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <Dices className="w-4 h-4 text-amber-200" />
                <span>
                  🎲 Tira per Superare ({combatState.activeObstacle.attribute || 'Destrezza'} + {combatState.activeObstacle.ability || 'Atletica'})
                </span>
              </button>
            </div>
          )}

          {/* BANNER 3: LISTA NEMICI ATTIVI CON SALUTE REALE SU MOBILE */}
          {combatState?.isCombatActive && combatState?.activeEnemies && combatState.activeEnemies.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-md space-y-2">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-red-300 border-b border-slate-800 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Skull className="w-3.5 h-3.5 text-red-400" />
                  <span>Avversari nel Combattimento ({combatState.activeEnemies.length})</span>
                </div>
                <span className="text-[10px] text-slate-400">Round {roundNumber}</span>
              </div>
              <div className="space-y-1.5">
                {combatState.activeEnemies.map((enemy) => {
                  const status = getEnemyHealthStatus(enemy);
                  return (
                    <div
                      key={enemy.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                        status.isDefeated
                          ? 'bg-slate-950/50 border-slate-900 opacity-60'
                          : 'bg-slate-950/80 border-red-900/50'
                      }`}
                    >
                      <div>
                        <div className="font-serif font-bold text-slate-200 flex items-center gap-1.5">
                          <span>{enemy.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            Dif {enemy.defense} | Arm {enemy.armor}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Attacco: {enemy.attackName} ({enemy.attackPool} dadi)
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-[11px] font-mono font-bold ${
                            status.isDefeated ? 'text-red-500 line-through' : 'text-emerald-400'
                          }`}
                        >
                          {status.statusText}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Narrazione della Scena dal PC */}
          {latestStoryMessage && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 text-xs shadow-md space-y-2">
              <div
                className="flex items-center justify-between cursor-pointer font-serif font-bold text-indigo-300"
                onClick={() => setIsStoryOpen(!isStoryOpen)}
              >
                <div className="flex items-center space-x-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Dalla Storia (Schermo del Narratore)</span>
                </div>
                {isStoryOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
              {isStoryOpen && (
                latestStoryMessage.isClarification ? (
                  <div className="space-y-2 p-2.5 bg-cyan-950/40 border border-cyan-800/80 rounded-xl">
                    <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-cyan-300" />
                      <span>Chiarimento Fuori Gioco (Scena Congelata)</span>
                    </div>
                    {latestStoryMessage.clarificationQuestion && (
                      <p className="text-slate-300 italic text-[11px]">
                        "{latestStoryMessage.clarificationQuestion}"
                      </p>
                    )}
                    <p className="text-cyan-100 font-serif text-xs leading-relaxed">
                      {cleanStoryTextFromRollBadges(latestStoryMessage.text)}
                    </p>
                  </div>
                ) : (
                  <p className="text-slate-200 font-serif italic leading-relaxed text-xs sm:text-sm">
                    {cleanStoryTextFromRollBadges(latestStoryMessage.text)}
                  </p>
                )
              )}

              {/* Feedback Ferita Subita su Mobile */}
              {latestStoryMessage.playerDamageAward && (
                <div className="p-2.5 bg-red-950/80 border border-red-600/80 rounded-xl flex items-center justify-between text-xs mt-2">
                  <div className="flex items-center space-x-2">
                    <HeartCrack className="w-4 h-4 text-red-400 shrink-0" />
                    <div>
                      <div className="font-mono text-[10px] text-red-300 font-bold uppercase">
                        Ferita ({latestStoryMessage.playerDamageAward.type})
                      </div>
                      <div className="text-red-200 text-[11px] font-serif">
                        {latestStoryMessage.playerDamageAward.reason || 'Danno inflitto'}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-red-200 bg-red-900 px-2 py-0.5 rounded border border-red-500 text-xs">
                    -{latestStoryMessage.playerDamageAward.points} Salute
                  </span>
                </div>
              )}

              {/* Feedback Cura Ricevuta su Mobile */}
              {latestStoryMessage.playerHealAward && (
                <div className="p-2.5 bg-emerald-950/80 border border-emerald-600/80 rounded-xl flex items-center justify-between text-xs mt-2">
                  <div className="flex items-center space-x-2">
                    <Heart className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-mono text-[10px] text-emerald-300 font-bold uppercase">
                        Cura Salute
                      </div>
                      <div className="text-emerald-200 text-[11px] font-serif">
                        {latestStoryMessage.playerHealAward.reason || 'Riposo / Medicazione'}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-emerald-200 bg-emerald-900 px-2 py-0.5 rounded border border-emerald-500 text-xs">
                    +{latestStoryMessage.playerHealAward.points} Salute
                  </span>
                </div>
              )}
            </div>
          )}

          {/* SEZIONE AZIONI PERSONALI DEL GIOCATORE (Abilitata solo se è il tuo turno!) */}
          <div
            className={`p-4 rounded-2xl border shadow-xl space-y-3 transition-all ${
              isMyTurn
                ? 'bg-slate-950/95 border-indigo-600/70 shadow-indigo-950/50'
                : 'bg-slate-950/60 border-slate-800/80 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[11px] uppercase font-mono font-bold text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Le tue Opzioni Tattiche:</span>
              </span>
              {isSendingAction && (
                <span className="text-[10px] font-mono text-emerald-400 animate-pulse">Invio in corso...</span>
              )}
            </div>

            {!isMyTurn ? (
              <div className="p-3 bg-slate-900/60 rounded-xl text-center text-xs text-slate-400 font-serif italic">
                I comandi d'azione si attiveranno automaticamente quando il Narratore passerà il turno a te.
              </div>
            ) : (
              <>
                {/* Opzioni Rapide Suggerite (se presenti dal Narratore) */}
                {latestStoryMessage?.suggestedActions && latestStoryMessage.suggestedActions.length > 0 && (
                  <div className="space-y-1.5">
                    {latestStoryMessage.suggestedActions.map((opt, idx) => {
                      const parsed = parseSuggestionRoll(opt);
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={isSendingAction}
                          onClick={() => {
                            if (parsed.hasRoll) {
                              handleOpenRequiredRollModal(
                                {
                                  attribute: parsed.attribute || 'Destrezza',
                                  ability: parsed.ability,
                                  modifier: parsed.modifier,
                                  difficulty: 8,
                                  reason: parsed.cleanText,
                                },
                                `mobile_sugg_${idx}`
                              );
                            } else {
                              handleSendMobileAction(parsed.cleanText);
                            }
                          }}
                          className="w-full text-left p-2.5 sm:p-3 rounded-xl bg-slate-900/90 hover:bg-indigo-950/80 active:bg-indigo-900 border border-slate-800 hover:border-indigo-500/80 text-xs sm:text-sm text-slate-200 hover:text-white transition-all cursor-pointer font-serif flex items-center justify-between gap-2 active:scale-[0.99] disabled:opacity-50"
                        >
                          <span className="leading-snug flex-1">› {parsed.cleanText}</span>
                          {parsed.hasRoll ? (
                            <span className="shrink-0 px-2 py-0.5 rounded-lg bg-indigo-950 border border-indigo-700/80 text-indigo-300 text-[10px] sm:text-[11px] font-mono font-bold flex items-center space-x-1">
                              <Dices className="w-3.5 h-3.5 text-indigo-400" />
                              <span>{parsed.rollLabel}</span>
                            </span>
                          ) : (
                            <span className="shrink-0 text-[10px] text-slate-500 font-mono">Narra</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Se non ci sono messaggi recenti, mostra un consiglio di benvenuto */}
                {!latestStoryMessage && (
                  <div className="p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-xl text-center space-y-1">
                    <p className="font-serif font-bold text-xs text-indigo-200">
                      Tavolo sincronizzato e pronto per l'azione!
                    </p>
                    <p className="text-[11px] text-slate-400 font-serif">
                      Dichiara la tua mossa con il campo sottostante o usa la voce per interagire con la scena.
                    </p>
                  </div>
                )}

                {/* Chiedi al Narratore da Smartphone (Chiarimento Fuori Gioco) */}
                <div className="pt-1.5 pb-1">
                  <button
                    type="button"
                    onClick={() => setIsAskModalOpen(true)}
                    className="w-full py-1.5 px-3 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/80 text-cyan-300 hover:text-white text-xs font-serif font-bold flex items-center justify-center space-x-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                    <span>💭 Chiedi Chiarimento al Narratore (OOC)</span>
                  </button>
                </div>

                {/* Input Azione Libera */}
                <form onSubmit={handleSubmitCustomAction} className="flex gap-1.5 sm:gap-2 pt-1 border-t border-slate-900">
                  <input
                    type="text"
                    value={mobileActionInput}
                    onChange={(e) => setMobileActionInput(e.target.value)}
                    placeholder={isMobileListening ? "🎙️ Parla ora, sto ascoltando..." : "Dichiara cosa tenti di fare..."}
                    className={`flex-1 bg-slate-900 border rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none font-serif transition-all ${
                      isMobileListening
                        ? 'border-rose-500/80 bg-slate-900/95 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                        : 'border-slate-800 focus:border-indigo-500'
                    }`}
                  />

                  {/* Bottone Vocale Smartphone */}
                  <button
                    type="button"
                    onClick={toggleMobileListening}
                    disabled={isSendingAction}
                    title={
                      !isMobileSpeechSupported
                        ? 'Riconoscimento vocale non supportato dal browser'
                        : isMobileListening
                        ? 'Interrompi dettatura vocale'
                        : 'Dichiara a voce la tua azione'
                    }
                    className={`p-2 sm:px-2.5 rounded-xl text-xs font-serif font-bold transition-all shadow-md shrink-0 flex items-center justify-center cursor-pointer ${
                      isMobileListening
                        ? 'bg-rose-600 text-white animate-pulse border border-rose-400 shadow-[0_0_12px_rgba(225,29,72,0.8)]'
                        : 'bg-slate-900 border border-slate-800 text-indigo-400 hover:text-white hover:border-indigo-500'
                    }`}
                  >
                    {isMobileListening ? (
                      <MicOff className="w-4 h-4 text-white animate-bounce" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    type="submit"
                    disabled={!mobileActionInput.trim() || isSendingAction}
                    className="px-3.5 py-2 bg-gradient-to-r from-red-800 to-indigo-900 hover:from-red-700 text-white rounded-xl text-xs font-serif font-bold uppercase tracking-wider disabled:opacity-40 cursor-pointer shadow-md shrink-0 flex items-center space-x-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Invia</span>
                  </button>
                </form>
              </>
            )}
          </div>

          {/* TIRO RICHIESTO DAL NARRATORE */}
          {isPendingRollActive && pendingReq && (
            <div className="p-4 bg-gradient-to-br from-red-950/90 via-slate-900 to-indigo-950/90 border-2 border-red-500 rounded-3xl shadow-2xl space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-red-400 font-mono text-xs font-black uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
                  <span>Lancio Richiesto</span>
                </div>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-red-900 text-red-200 border border-red-700">
                  Difficoltà {activeDifficulty}
                </span>
              </div>

              {pendingReq.reason && (
                <p className="text-xs text-red-200 italic font-serif">"{pendingReq.reason}"</p>
              )}

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300">
                  {reqAttrInfo?.label} ({reqAttrInfo?.value}) + {reqAbilityInfo?.label || 'Nessuna'} ({reqAbilityInfo?.value || 0})
                </span>
                <span className="font-bold text-amber-300 text-sm">{reqTotalPool} Dadi d10</span>
              </div>

              <button
                type="button"
                onClick={() => handleOpenRequiredRollModal(pendingReq, latestStoryMessage!.id)}
                className="w-full py-3.5 bg-gradient-to-r from-red-600 via-indigo-600 to-red-700 hover:from-red-500 text-white font-serif font-black uppercase tracking-wider text-xs sm:text-sm rounded-xl shadow-xl flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Dices className="w-4 h-4 text-amber-300" />
                <span>Lancia {reqTotalPool} Dadi con Diritto di Narrazione</span>
              </button>
            </div>
          )}

          {/* BOTTINO / OGGETTO UNICO (Non duplicabile a 50 click!) */}
          {latestStoryMessage?.itemAward && currentLootId && (
            <div className="p-3.5 bg-gradient-to-r from-emerald-950/90 via-slate-900 to-indigo-950/80 border border-emerald-500/80 rounded-2xl shadow-xl flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-emerald-900/60 border border-emerald-500 text-emerald-200 shrink-0">
                  <Package className="w-4 h-4 text-emerald-300" />
                </div>
                <div className="min-w-0">
                  <div className="font-serif font-black text-emerald-300 text-xs sm:text-sm truncate">
                    🎁 {latestStoryMessage.itemAward.name}
                  </div>
                  <p className="text-[10px] text-emerald-200/80 italic line-clamp-1">
                    {latestStoryMessage.itemAward.description}
                  </p>
                </div>
              </div>

              <div>
                {currentLootClaim ? (
                  <span className="text-[10px] font-mono px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-400 font-bold block text-center">
                    ✓ Già preso da {currentLootClaim.playerName}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      handleClaimLoot(
                        currentLootId,
                        latestStoryMessage!.itemAward!.name,
                        latestStoryMessage!.itemAward!.description
                      )
                    }
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-serif font-bold text-xs rounded-xl shadow cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    Raccogli
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Esito del Tiro appena effettuato */}
          {completedRollMsgId === latestStoryMessage?.id && lastExecutedRoll && (
            <div className="p-3.5 bg-slate-950/90 border border-emerald-500/60 rounded-2xl shadow-xl space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-mono text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Tiro Registrato al Tavolo!</span>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center py-1">
                {lastExecutedRoll.dice.map((d, idx) => (
                  <span
                    key={idx}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs border ${
                      d >= lastExecutedRoll.difficulty
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                        : d === 1
                        ? 'bg-red-950 border-red-500 text-red-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {d}
                  </span>
                ))}
              </div>
              <div className="text-center font-serif text-xs text-slate-300">
                Successi Netti: <strong className="text-emerald-400">{lastExecutedRoll.netSuccesses}</strong> ({lastExecutedRoll.outcome.toUpperCase()})
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: SCHEDA TRATTI (Attributi, Abilità, Salute e Avanzamento XP) */}
      {/* =================================================================== */}
      {activeNavTab === 'sheet' && (
        <div className="p-3 sm:p-4 space-y-4">
          {/* Risorse Fondamentali: Sangue, Volontà, Salute */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-lg">
            {/* Salute WoD con Penalità */}
            <div>
              <div className="text-xs font-serif font-bold text-red-400 mb-1.5">
                Livelli di Salute & Penalità (Chronica D10)
              </div>
              <HealthTracker
                health={character.health}
                onChange={(updated) => handleUpdateChar({ ...character, health: updated })}
              />
            </div>

            {/* Forza di Volontà */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-bold">Forza di Volontà</span>
                <span className="font-mono text-amber-400">{character.willpower.current} / {character.willpower.max}</span>
              </div>
              <DotRating
                value={character.willpower.current}
                max={character.willpower.max}
                onChange={(v) => handleUpdateChar({ ...character, willpower: { ...character.willpower, current: v } })}
                activeColor="bg-amber-500"
              />
            </div>
          </div>

          {/* Riepilogo XP Guadagnati dal Narratore (Regole Ufficiali WoD) */}
          <div className="bg-slate-950/80 border border-amber-600/60 rounded-2xl p-3 flex items-center justify-between shadow-lg">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-xs font-mono font-bold text-amber-300">
                  {exp.current} XP Disponibili
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {exp.total} XP guadagnati dal Narratore di Cronaca
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
              🔒 Spesa Bilanciata D10
            </span>
          </div>

          {/* Tratti Derivati & Psicologia (Storytelling System) */}
          {(() => {
            const derived = calculateDerivedTraits(character.attributes, character.size || 5);
            return (
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 shadow-md">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-mono">Virtù & Vizio:</span>
                  <span className="font-serif font-bold text-amber-300">
                    {character.virtue || 'Prudenza'} • {character.vice || 'Orgoglio'}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-center text-xs pt-1 border-t border-slate-800/80">
                  <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-mono block">Difesa</span>
                    <span className="font-bold text-indigo-400 font-mono">{character.defense ?? derived.defense}</span>
                  </div>
                  <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-mono block">Iniziativa</span>
                    <span className="font-bold text-emerald-400 font-mono">+{character.initiativeMod ?? derived.initiativeMod}</span>
                  </div>
                  <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-mono block">Velocità</span>
                    <span className="font-bold text-cyan-400 font-mono">{character.speed ?? derived.speed}</span>
                  </div>
                  <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-mono block">Moralità</span>
                    <span className="font-bold text-amber-400 font-mono">{character.morality ?? 7}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Attributi (Matrice 3x3 Ufficiale) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-3">
            <h3 className="font-serif font-bold text-indigo-300 text-xs uppercase tracking-wider">
              Attributi Ufficiali
            </h3>
            
            {/* Mentali */}
            <div className="space-y-1 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60">
              <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold block mb-1">
                Mentali (Prestanza • Accuratezza • Resistenza)
              </span>
              {[
                { key: 'intelligence', name: 'Intelligenza', role: 'Prestanza' },
                { key: 'wits', name: 'Prontezza', role: 'Accuratezza' },
                { key: 'resolve', name: 'Fermezza', role: 'Resistenza' },
              ].map(({ key, name, role }) => (
                <div key={key} className="flex justify-between items-center py-1 px-1.5 rounded hover:bg-slate-900/80">
                  <div>
                    <span className="font-semibold text-xs text-slate-200">{name}</span>
                    <span className="text-[9px] text-slate-500 ml-1 font-mono">({role})</span>
                  </div>
                  <DotRating
                    min={1}
                    max={5}
                    value={(character.attributes as any)[key] ?? 1}
                    onChange={(v) => handleMobileAttrChange(key, name, v)}
                  />
                </div>
              ))}
            </div>

            {/* Fisici */}
            <div className="space-y-1 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60">
              <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold block mb-1">
                Fisici (Prestanza • Accuratezza • Resistenza)
              </span>
              {[
                { key: 'strength', name: 'Forza', role: 'Prestanza' },
                { key: 'dexterity', name: 'Destrezza', role: 'Accuratezza' },
                { key: 'stamina', name: 'Costituzione', role: 'Resistenza' },
              ].map(({ key, name, role }) => (
                <div key={key} className="flex justify-between items-center py-1 px-1.5 rounded hover:bg-slate-900/80">
                  <div>
                    <span className="font-semibold text-xs text-slate-200">{name}</span>
                    <span className="text-[9px] text-slate-500 ml-1 font-mono">({role})</span>
                  </div>
                  <DotRating
                    min={1}
                    max={5}
                    value={(character.attributes as any)[key] ?? 1}
                    onChange={(v) => handleMobileAttrChange(key, name, v)}
                  />
                </div>
              ))}
            </div>

            {/* Sociali */}
            <div className="space-y-1 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60">
              <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold block mb-1">
                Sociali (Prestanza • Accuratezza • Resistenza)
              </span>
              {[
                { key: 'presence', name: 'Presenza', role: 'Prestanza' },
                { key: 'manipulation', name: 'Ascendente', role: 'Accuratezza' },
                { key: 'composure', name: 'Autocontrollo', role: 'Resistenza' },
              ].map(({ key, name, role }) => (
                <div key={key} className="flex justify-between items-center py-1 px-1.5 rounded hover:bg-slate-900/80">
                  <div>
                    <span className="font-semibold text-xs text-slate-200">{name}</span>
                    <span className="text-[9px] text-slate-500 ml-1 font-mono">({role})</span>
                  </div>
                  <DotRating
                    min={1}
                    max={5}
                    value={(character.attributes as any)[key] ?? 1}
                    onChange={(v) => handleMobileAttrChange(key, name, v)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Le 24 Abilità Fondamentali Chronica Engine */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-3">
            <h3 className="font-serif font-bold text-indigo-300 text-xs uppercase tracking-wider">
              Le 24 Abilità Fondamentali
            </h3>

            {/* Mentali (-3 non addestrata) */}
            <div className="space-y-1 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60">
              <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold block mb-1">
                Mentali <span className="text-[9px] text-slate-500 font-normal">(-3 se non addestrata)</span>
              </span>
              {[
                { key: 'academics', name: 'Accademiche' },
                { key: 'computer', name: 'Informatica' },
                { key: 'investigation', name: 'Investigare' },
                { key: 'crafts', name: 'Manualità' },
                { key: 'medicine', name: 'Medicina' },
                { key: 'occult', name: 'Occulto' },
                { key: 'politics', name: 'Politica' },
                { key: 'science', name: 'Scienze' },
              ].map(({ key, name }) => (
                <div key={key} className="flex justify-between items-center py-0.5 px-1.5 rounded hover:bg-slate-900/80">
                  <span className="font-semibold text-xs text-slate-200">{name}</span>
                  <DotRating
                    min={0}
                    max={5}
                    value={(character.abilities as any)[key] ?? 0}
                    onChange={(v) => handleMobileAbilityChange(key, name, v)}
                  />
                </div>
              ))}
            </div>

            {/* Fisiche (-1 non addestrata) */}
            <div className="space-y-1 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60">
              <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold block mb-1">
                Fisiche <span className="text-[9px] text-slate-500 font-normal">(-1 se non addestrata)</span>
              </span>
              {[
                { key: 'firearms', name: 'Armi da Fuoco' },
                { key: 'weaponry', name: 'Armi da Mischia' },
                { key: 'athletics', name: 'Atletica' },
                { key: 'larceny', name: 'Criminalità' },
                { key: 'stealth', name: 'Furtività' },
                { key: 'drive', name: 'Guidare' },
                { key: 'brawl', name: 'Lotta' },
                { key: 'survival', name: 'Sopravvivenza' },
              ].map(({ key, name }) => (
                <div key={key} className="flex justify-between items-center py-0.5 px-1.5 rounded hover:bg-slate-900/80">
                  <span className="font-semibold text-xs text-slate-200">{name}</span>
                  <DotRating
                    min={0}
                    max={5}
                    value={(character.abilities as any)[key] ?? 0}
                    onChange={(v) => handleMobileAbilityChange(key, name, v)}
                  />
                </div>
              ))}
            </div>

            {/* Sociali (-1 non addestrata) */}
            <div className="space-y-1 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60">
              <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold block mb-1">
                Sociali <span className="text-[9px] text-slate-500 font-normal">(-1 se non addestrata)</span>
              </span>
              {[
                { key: 'animalKen', name: 'Affinità Animale' },
                { key: 'streetwise', name: 'Bassifondi' },
                { key: 'empathy', name: 'Empatia' },
                { key: 'expression', name: 'Espressività' },
                { key: 'intimidation', name: 'Intimidire' },
                { key: 'persuasion', name: 'Persuasione' },
                { key: 'socialize', name: 'Socializzare' },
                { key: 'subterfuge', name: 'Sotterfugio' },
              ].map(({ key, name }) => (
                <div key={key} className="flex justify-between items-center py-0.5 px-1.5 rounded hover:bg-slate-900/80">
                  <span className="font-semibold text-xs text-slate-200">{name}</span>
                  <DotRating
                    min={0}
                    max={5}
                    value={(character.abilities as any)[key] ?? 0}
                    onChange={(v) => handleMobileAbilityChange(key, name, v)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Biografia, Origini & Guida all'Interpretazione per il Giocatore su Mobile */}
          {(character.backgroundNotes || character.notes) && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-2 shadow-md">
              <div className="flex items-center space-x-2 text-cyan-400 font-mono font-bold text-xs uppercase tracking-wider">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span>Biografia &amp; Guida all&apos;Interpretazione</span>
              </div>
              <div className="text-xs text-slate-300 font-serif leading-relaxed bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 max-h-72 overflow-y-auto whitespace-pre-wrap">
                {character.backgroundNotes || character.notes}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: INVENTARIO & ARMI (Armi Reali, Munizioni e Consumabili)     */}
      {/* =================================================================== */}
      {activeNavTab === 'inventory' && (
        <div className="p-3 sm:p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-sm text-slate-100 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-emerald-400" />
              <span>Il Tuo Equipaggiamento Reale</span>
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800">
              🔒 Vincolo di Gioco Attivo
            </span>
          </div>

          <StructuredInventoryView
            character={character}
            onUpdateCharacter={handleUpdateChar}
            allowEdit={false}
            compact={true}
          />
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: MERITI & POTERI (Estrazione Rapida, Discipline, Doni)        */}
      {/* =================================================================== */}
      {activeNavTab === 'powers_merits' && (
        <div className="p-3 sm:p-4 space-y-3.5">
          {/* Meriti & Difetti Ufficiali Attivi */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
            <div className="flex items-center space-x-2 text-amber-300 font-mono font-bold text-xs uppercase tracking-wider">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Meriti & Difetti di {character.name}</span>
            </div>

            {(!character.meritsFlaws || character.meritsFlaws.length === 0) ? (
              <p className="text-xs text-slate-400 font-serif italic">
                Nessun merito speciale registrato. Puoi crearne uno nuovo rifacendo la scheda.
              </p>
            ) : (
              <div className="space-y-2">
                {character.meritsFlaws.map((mf) => (
                  <div key={mf.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-bold text-xs text-slate-100 flex items-center gap-1">
                        <span>{mf.name}</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 border border-amber-600/70 text-amber-300 font-bold">
                        {mf.type === 'merit' ? 'Merito' : 'Difetto'} ({mf.cost > 0 ? `+${mf.cost}` : mf.cost} pt)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-serif">{mf.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Poteri / Discipline / Doni */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
            <div className="flex items-center space-x-2 text-purple-300 font-mono font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Poteri Sovrannaturali & Discipline</span>
            </div>

            {(!character.powers || character.powers.length === 0) ? (
              <p className="text-xs text-slate-400 font-serif italic">
                Nessuna disciplina o dono soprannaturale attivo per questo archetipo.
              </p>
            ) : (
              <div className="space-y-2">
                {character.powers.map((p, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-serif font-bold text-xs text-slate-200 block">{p.name}</span>
                      {p.description && <span className="text-[10px] text-slate-400 italic">{p.description}</span>}
                    </div>
                    <DotRating value={p.level} max={5} activeColor="bg-purple-500" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Meccaniche di Stirpe Soprannaturale su Mobile (Visibile SOLO se il giocatore è Vampiro, Lupo Mannaro o Mago) */}
          {(character.creatureType === 'vampire' ||
            character.creatureType === 'werewolf' ||
            character.creatureType === 'mage') && (
            <div className="bg-slate-950/90 border border-indigo-800/60 rounded-2xl p-4 space-y-3 shadow-md">
              {character.creatureType === 'vampire' && (() => {
                const bp = character.supernaturalPotency ?? 1;
                const bpStats = getBloodPotencyStats(bp);
                return (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono text-red-300 font-bold uppercase">
                      <span>🧛 Potenza del Sangue: {bp}/10</span>
                      <span>Max {bpStats.vitaePerTurn} Vitae/Turno</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      Restrizione: <span className="text-slate-200">{bpStats.feedingRestriction}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const res = spendVitaeToHeal(character, 'bashing');
                          if (!res.success) return alert(res.message);
                          handleUpdateChar(res.character);
                        }}
                        className="p-2 bg-red-950/80 border border-red-700 rounded-xl text-[11px] font-mono font-bold text-red-100 cursor-pointer"
                      >
                        🩸 1 Vitae: Cura 2 [/]
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const res = spendVitaeToHeal(character, 'lethal');
                          if (!res.success) return alert(res.message);
                          handleUpdateChar(res.character);
                        }}
                        className="p-2 bg-red-950/80 border border-red-700 rounded-xl text-[11px] font-mono font-bold text-red-100 cursor-pointer"
                      >
                        🩸 1 Vitae: Cura 1 [X]
                      </button>
                    </div>
                  </div>
                );
              })()}

              {character.creatureType === 'werewolf' && (() => {
                const activeForm = character.werewolfForm || character.activeForm || 'hishu';
                return (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono text-amber-300 font-bold uppercase">
                      <span>🐺 Le 5 Forme Uratha</span>
                      <span>Istinto Primordiale: {character.supernaturalPotency ?? character.primalUrge ?? 1}/10</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {WEREWOLF_FORMS_TABLE.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => handleUpdateChar(switchWerewolfForm(character, f.id))}
                          className={`p-1.5 rounded-lg border text-center font-mono text-[10px] cursor-pointer ${
                            activeForm === f.id
                              ? 'bg-amber-900/80 border-amber-400 text-amber-100 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          <div>{f.name}</div>
                          <div className="text-[8px] opacity-80">Sal +{f.healthBonus}</div>
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateChar({
                            ...character,
                            health: healDamageFromHealth(character.health, 1, 'bashing'),
                          })
                        }
                        className="p-2 bg-emerald-950/80 border border-emerald-700 rounded-xl text-[11px] font-mono font-bold text-emerald-100 cursor-pointer"
                      >
                        🩹 Rigenera 1 [/] (Gratis)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const res = spendEssenceToHealLethal(character);
                          if (!res.success) return alert(res.message);
                          handleUpdateChar(res.character);
                        }}
                        className="p-2 bg-amber-950/80 border border-amber-700 rounded-xl text-[11px] font-mono font-bold text-amber-100 cursor-pointer"
                      >
                        🐺 1 Essenza: Cura 1 [X]
                      </button>
                    </div>
                  </div>
                );
              })()}

              {character.creatureType === 'mage' && (() => {
                const gnosis = character.supernaturalPotency ?? 1;
                const gStats = getGnosisStats(gnosis);
                const path = detectMagePath(character);
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-indigo-300 font-bold uppercase">
                      <span>🔮 Gnosi: {gnosis}/10</span>
                      <span>Max {gStats.manaPerTurn} Mana/Turno</span>
                    </div>
                    {path && (
                      <div className="text-[11px] font-mono text-slate-300">
                        Cammino <b>{path.name}</b> • Dominanti: <span className="text-emerald-300">{path.rulingArcana.join(', ')}</span> • Inferiore: <span className="text-red-300">{path.inferiorArcanum}</span>
                      </div>
                    )}
                    <div className="text-[11px] font-mono text-amber-300">
                      ⚡ Dadi Base Paradosso: {gStats.baseParadoxDice}d10 (+2d con Testimoni Mortali)
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* BOTTOM NAVIGATION BAR MOBILE (4 TABS FISSE + NIENTE SCROLL INFINITO)*/}
      {/* =================================================================== */}
      <nav className="fixed bottom-0 inset-x-0 bg-slate-950/95 border-t border-slate-800 z-50 px-2 py-1.5 flex justify-around items-center backdrop-blur shadow-2xl">
        <button
          type="button"
          onClick={() => setActiveNavTab('play')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeNavTab === 'play'
              ? 'text-amber-400 font-bold bg-amber-950/40 border border-amber-800/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Crosshair className="w-4 h-4" />
          <span className="text-[10px] font-mono mt-0.5">Azione</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNavTab('sheet')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeNavTab === 'sheet'
              ? 'text-indigo-400 font-bold bg-indigo-950/40 border border-indigo-800/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scroll className="w-4 h-4" />
          <span className="text-[10px] font-mono mt-0.5">Tratti</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNavTab('inventory')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeNavTab === 'inventory'
              ? 'text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-800/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span className="text-[10px] font-mono mt-0.5">Inventario</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNavTab('powers_merits')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeNavTab === 'powers_merits'
              ? 'text-purple-400 font-bold bg-purple-950/40 border border-purple-800/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span className="text-[10px] font-mono mt-0.5">Meriti</span>
        </button>
      </nav>

      {/* MODAL CONFERMA SPESA XP MOBILE (Solo con punti assegnati dal Narratore) */}
      {pendingMobileUpgrade && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-slate-900 border border-amber-600/70 rounded-3xl p-5 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center space-x-2.5 text-amber-400">
              <Sparkles className="w-5 h-5 shrink-0 animate-pulse" />
              <h4 className="font-serif font-black text-base text-slate-100">
                Avanzamento Tratto (Regole D10)
              </h4>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5 font-mono text-xs">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Tratto:</span>
                <span className="font-bold text-slate-100">{pendingMobileUpgrade.traitLabel}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-slate-800/80 pt-1.5">
                <span className="text-slate-400">Incremento:</span>
                <span className="font-bold text-indigo-400">
                  Livello {pendingMobileUpgrade.oldVal} ➔ {pendingMobileUpgrade.newVal}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-slate-800/80 pt-1.5">
                <span className="text-slate-400">Costo XP:</span>
                <span className="font-bold text-amber-300 text-sm">{pendingMobileUpgrade.cost} XP</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-slate-800/80 pt-1.5">
                <span className="text-slate-400">XP Assegnati dal Narratore:</span>
                <span className={exp.current >= pendingMobileUpgrade.cost ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {exp.current} XP
                </span>
              </div>
            </div>

            {exp.current < pendingMobileUpgrade.cost && (
              <div className="flex items-center space-x-2 text-[11px] text-red-400 font-mono bg-red-950/40 p-2 rounded-lg border border-red-800/60">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Punti Esperienza insufficienti ({pendingMobileUpgrade.cost - exp.current} mancanti). Ottienili dal Narratore giocando le scene!</span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingMobileUpgrade(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-serif text-xs uppercase font-bold cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={exp.current < pendingMobileUpgrade.cost}
                onClick={confirmMobileUpgrade}
                className={`flex-1 py-2.5 rounded-xl font-serif text-xs uppercase font-bold transition-all shadow-md ${
                  exp.current >= pendingMobileUpgrade.cost
                    ? 'bg-gradient-to-r from-amber-600 to-indigo-700 text-white cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                Spendi {pendingMobileUpgrade.cost} XP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LANCIO DADI COMPLETO STORYTELLER */}
      <DiceRollerModal
        isOpen={isCustomDiceOpen}
        onClose={() => {
          setIsCustomDiceOpen(false);
          setDiceModalTraits(null);
        }}
        character={character}
        initialAttribute={diceModalTraits?.attr}
        initialAbility={diceModalTraits?.ability}
        initialDifficulty={diceModalTraits?.difficulty || 8}
        initialReason={diceModalTraits?.reason || ''}
        initialSituationalMod={diceModalTraits?.modifier || 0}
        activeEnemies={combatState?.activeEnemies || []}
        onUpdateCharacter={handleUpdateChar}
        onSendRollToStory={(roll, comment, playerNarration) => {
          let fullComment = comment;
          if (playerNarration?.trim()) {
            fullComment = (comment || '') + `\n\n💬 Narrazione del Giocatore:\n"${playerNarration.trim()}"`;
          }
          setLastExecutedRoll(roll);
          multiplayer.rollDice(roll, fullComment);
        }}
      />

      {/* MODAL TUTORIAL DI GIOCO */}
      <GameTutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />

      {/* MODAL GUIDA RAPIDA */}
      <QuickGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      {/* MODAL SCHERMO DEL NARRATORE */}
      <StorytellerScreenModal isOpen={isStorytellerScreenOpen} onClose={() => setIsStorytellerScreenOpen(false)} />

      {/* MODAL CHIEDI AL NARRATORE (SMARTPHONE) */}
      <AskNarratorModal
        isOpen={isAskModalOpen}
        onClose={() => setIsAskModalOpen(false)}
        isLoading={isAskingNarrator}
        onSubmitQuestion={handleAskQuestionMobile}
      />
    </div>
  );
};
