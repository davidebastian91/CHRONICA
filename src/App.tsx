import { useState, useEffect, useRef } from 'react';
import type {
  CampaignConfig,
  Character,
  DiceRollResult,
  StoryMessage,
  RequiredRoll,
  UserProfile,
  ActiveCombatEnemy,
  DynamicObstacle,
  EnemySpawnSpec,
  HandoutSpec,
  BattlemapSpec,
} from './types';
import { createDefaultCharacter } from './utils/characterTemplates';
import { awardExperience } from './utils/experienceRules';
import { addLootToInventory, consumeAmmo, checkHealingItemStatus, consumeHealingItem } from './utils/inventorySystem';
import { generateNarratorResponse, generateGrandPrologue, askNarratorClarification } from './services/ai';
import { multiplayer, type RoomPlayer } from './services/multiplayer';
import { getAttributeValue, getAbilityValue, parseSuggestionRoll } from './utils/traitLabels';
import { saveChronicleToServer, type ChronicleSaveData } from './services/storage';
import { safeLocalStorageSet } from './utils/mapStorage';
import { CampaignWizard } from './components/CampaignWizard';
import { StoryFeed } from './components/StoryFeed';
import { TacticalSidePanel } from './components/TacticalSidePanel';
import { HandoutViewModal } from './components/HandoutViewModal';
import { CharacterSheetModal } from './components/CharacterSheetModal';
import { DiceRollerModal } from './components/DiceRollerModal';
import { narratorVoice } from './services/voice';
import { CityMapModal } from './components/CityMapModal';
import { StoryOutlineModal } from './components/StoryOutlineModal';
import { ChronicleCastModal } from './components/ChronicleCastModal';
import { SettingsModal } from './components/SettingsModal';
import { AmbientPlayer } from './components/AmbientPlayer';
import { TabletopRoomModal } from './components/TabletopRoomModal';
import { MobilePlayerView } from './components/MobilePlayerView';
import { ProfileSelectModal } from './components/ProfileSelectModal';
import { ChronicleSlotsModal } from './components/ChronicleSlotsModal';
import { ProfileManagementModal } from './components/ProfileManagementModal';
import { QuickGuideModal } from './components/QuickGuideModal';
import { GameTutorialModal } from './components/GameTutorialModal';
import { StorytellerScreenModal } from './components/StorytellerScreenModal';
import { CombatInitiativeBar } from './components/CombatInitiativeBar';
import {
  prepareInitiativeParticipants,
  rollInitiative,
  sortInitiativeOrder,
  createCombatEnemyFromSpec,
  getEnemyHealthStatus,
  rollEnemyAttackAgainstPlayer,
  applyDamageToHealth,
  healDamageFromHealth,
  OFFICIAL_WOD_BESTIARY,
  type CombatantInitiativeEntry,
} from './utils/wodCombatRules';
import { Moon, Settings, User, MapPin, Users, Tv, Crown, BookOpen, HelpCircle, Key, Scroll, Save, LogOut, ChevronDown, Sparkles, Smartphone, X } from 'lucide-react';

interface HostAppProps {
  onJoinTabletopRoom?: (code: string) => void;
}

function HostApp({ onJoinTabletopRoom }: HostAppProps = {}) {
  // Codice Stanza Host del PC (salvato o generato)
  const [roomCode, setRoomCode] = useState<string>(() => {
    const saved = localStorage.getItem('chronica_room_code');
    if (saved) return saved;
    const generated = `CHR-${Math.floor(100 + Math.random() * 900)}`;
    localStorage.setItem('chronica_room_code', generated);
    return generated;
  });

  const [campaign, setCampaign] = useState<CampaignConfig | null>(() => {
    try {
      const saved = localStorage.getItem('chronica_campaign');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.warn('Errore lettura chronica_campaign da localStorage:', e);
      return null;
    }
  });

  const [character, setCharacter] = useState<Character | null>(() => {
    try {
      const isSpectator = localStorage.getItem('chronica_is_spectator') === 'true';
      if (isSpectator) return null;
      const saved = localStorage.getItem('chronica_character');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.warn('Errore lettura chronica_character da localStorage:', e);
      return null;
    }
  });

  const [messages, setMessages] = useState<StoryMessage[]>(() => {
    try {
      const saved = localStorage.getItem('chronica_messages');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('Errore lettura chronica_messages da localStorage:', e);
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDiceOpen, setIsDiceOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStoryOutlineOpen, setIsStoryOutlineOpen] = useState(false);
  const [isCastModalOpen, setIsCastModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [connectedPlayers, setConnectedPlayers] = useState<RoomPlayer[]>([]);

  // Interrompe istantaneamente la voce del narratore se si apre il lanciatore di dadi
  useEffect(() => {
    if (isDiceOpen) {
      narratorVoice.stop();
    }
  }, [isDiceOpen]);

  // Gestione Turni, Ordine di Iniziativa, Nemici con Salute Reale & Ostacoli in Corsa
  const [isCombatActive, setIsCombatActive] = useState(false);
  const [isInitiativePending, setIsInitiativePending] = useState(false);
  const [initiativeOrder, setInitiativeOrder] = useState<CombatantInitiativeEntry[]>([]);
  const [activeEnemies, setActiveEnemies] = useState<ActiveCombatEnemy[]>(() => {
    try {
      const saved = localStorage.getItem('chronica_active_enemies');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  // Salva i nemici attivi e le loro ferite in localStorage per preservare la salute esatta
  useEffect(() => {
    try {
      if (activeEnemies.length > 0) {
        localStorage.setItem('chronica_active_enemies', JSON.stringify(activeEnemies));
      } else {
        localStorage.removeItem('chronica_active_enemies');
      }
    } catch {}
  }, [activeEnemies]);
  const [activeObstacle, setActiveObstacle] = useState<DynamicObstacle | null>(null);
  const [activeTurnPlayerId, setActiveTurnPlayerId] = useState<string | undefined>();
  const [_activeTurnPlayerName, setActiveTurnPlayerName] = useState<string | undefined>();
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const targetPlayerIdForEnemyAttack = 'host';
  const [claimedLoot, setClaimedLoot] = useState<
    Record<string, { playerId: string; playerName: string; itemName: string }>
  >({});

  const connectedPlayersRef = useRef(connectedPlayers);
  connectedPlayersRef.current = connectedPlayers;
  const activeTurnPlayerIdRef = useRef(activeTurnPlayerId);
  activeTurnPlayerIdRef.current = activeTurnPlayerId;
  const roundNumberRef = useRef(roundNumber);
  roundNumberRef.current = roundNumber;
  const isCombatActiveRef = useRef(isCombatActive);
  isCombatActiveRef.current = isCombatActive;
  const isInitiativePendingRef = useRef(isInitiativePending);
  isInitiativePendingRef.current = isInitiativePending;
  const initiativeOrderRef = useRef(initiativeOrder);
  initiativeOrderRef.current = initiativeOrder;
  const activeEnemiesRef = useRef(activeEnemies);
  activeEnemiesRef.current = activeEnemies;
  const activeObstacleRef = useRef(activeObstacle);
  activeObstacleRef.current = activeObstacle;
  const targetPlayerIdForEnemyAttackRef = useRef(targetPlayerIdForEnemyAttack);
  targetPlayerIdForEnemyAttackRef.current = targetPlayerIdForEnemyAttack;

  // Sincronizza in tempo reale lo stato del combattimento (nemici, salute, ostacoli) con tutti gli smartphone
  useEffect(() => {
    if (multiplayer.getStatus().isConnected) {
      multiplayer.syncCombatState({
        isCombatActive,
        roundNumber,
        initiativeOrder,
        activeCombatantId: activeTurnPlayerId,
        activeCombatantName: _activeTurnPlayerName,
        activeEnemies,
        activeObstacle,
        targetPlayerIdForEnemyAttack,
        isInitiativePending,
      });
    }
  }, [
    isCombatActive,
    isInitiativePending,
    roundNumber,
    initiativeOrder,
    activeEnemies,
    activeObstacle,
    activeTurnPlayerId,
    _activeTurnPlayerName,
    targetPlayerIdForEnemyAttack,
  ]);

  const handleSendRollToStoryRef = useRef<
    (
      roll: DiceRollResult,
      comment?: string,
      playerNarration?: string,
      sourcePlayerId?: string,
      sourcePlayerName?: string
    ) => Promise<void>
  >(null as any);

  const handleTriggerEnemyTurnRollRef = useRef<
    (
      enemy: ActiveCombatEnemy,
      isPlayerDodging: boolean,
      targetPlayerId?: string,
      targetPlayerName?: string
    ) => Promise<void>
  >(null as any);

  const handleAskNarratorRef = useRef<
    (question: string, sourcePlayerId?: string, sourcePlayerName?: string) => Promise<void>
  >(null as any);

  // Avvia il Combattimento e apre la FASE DI INIZIATIVA per tutti i giocatori al tavolo
  const handleStartCombatAndRoll = (customEnemiesList?: ActiveCombatEnemy[]) => {
    let enemiesToUse = customEnemiesList || activeEnemiesRef.current;

    // Se non ci sono ancora nemici con scheda attiva, creali in automatico dalla campagna o dal Bestiario
    if (enemiesToUse.length === 0) {
      const names =
        campaign?.enemies && campaign.enemies.length > 0
          ? campaign.enemies.slice(0, 2)
          : ['Avversario Ostile'];
      enemiesToUse = names.map((rawName, idx) => {
        const lower = rawName.toLowerCase();
        const preset =
          OFFICIAL_WOD_BESTIARY.find(
            (b) =>
              (lower.includes('vampir') && b.creatureType === 'vampire') ||
              (lower.includes('lup') && b.creatureType === 'werewolf') ||
              (lower.includes('mag') && b.creatureType === 'mage') ||
              (lower.includes('cacciator') && b.creatureType === 'hunter')
          ) || OFFICIAL_WOD_BESTIARY[0];
        return createCombatEnemyFromSpec(
          {
            ...preset,
            name: rawName,
          },
          `enemy_${idx + 1}_${Date.now()}`
        );
      });
      setActiveEnemies(enemiesToUse);
    }

    // Prepara i partecipanti al tavolo per il tiro dell'Iniziativa (Host + Giocatori connessi)
    const initialParticipants = prepareInitiativeParticipants({
      hostCharacter: character || undefined,
      connectedPlayers: connectedPlayersRef.current,
    });

    setIsCombatActive(true);
    setIsInitiativePending(true);
    setInitiativeOrder(initialParticipants);
    setRoundNumber(1);
    setActiveTurnPlayerId(undefined);
    setActiveTurnPlayerName(undefined);

    const enemySummary = enemiesToUse
      .map((e) => `• 💀 ${e.name} (Salute: ${e.maxHealth}, Difesa: ${e.defense}, Armatura: ${e.armor})`)
      .join('\n');

    const startMsg: StoryMessage = {
      id: `sys_combat_start_${Date.now()}`,
      sender: 'system',
      text: `⚔️ LO SCONTRO HA INIZIO — FASE DI INIZIATIVA AL TAVOLO!\n\n💀 AVVERSARI IN SCENA:\n${enemySummary}\n\n🎲 Tutti i giocatori al tavolo devono tirare l'Iniziativa (1d10 + Destrezza + Autocontrollo) per stabilire l'ordine dei turni!`,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, startMsg]);
    multiplayer.broadcastStory(startMsg);
  };

  // Tiro d'Iniziativa manuale per l'Host (dal PC)
  const handleRollMyInitiative = () => {
    if (!character) return;
    const initRes = rollInitiative(character);
    const initDiceRoll: DiceRollResult = {
      pool: 1,
      difficulty: 8,
      dice: [initRes.d10Roll],
      rawSuccesses: initRes.total,
      ones: 0,
      netSuccesses: initRes.total,
      outcome: 'success',
      attributeName: 'Iniziativa',
      timestamp: Date.now(),
    };
    handleSendRollToStory(
      initDiceRoll,
      `⚡ INIZIATIVA COMBATTIMENTO: ${initRes.total} [${initRes.formula}]`
    );
  };

  // Tira l'Iniziativa per tutti i partecipanti restanti e avvia subito il Round 1
  const handleForceCompleteInitiative = () => {
    const updated = initiativeOrderRef.current.map((c) => {
      if (!c.hasRolled) {
        const d10Roll = Math.floor(Math.random() * 10) + 1;
        const total = Math.max(1, c.initiativeMod + d10Roll);
        return {
          ...c,
          d10Roll,
          totalInitiative: total,
          hasRolled: true,
        };
      }
      return c;
    });

    const sorted = sortInitiativeOrder(updated);
    setInitiativeOrder(sorted);
    setIsInitiativePending(false);

    if (sorted.length > 0) {
      setActiveTurnPlayerId(sorted[0].id);
      setActiveTurnPlayerName(sorted[0].name);
      multiplayer.setActiveTurn(sorted[0].id, sorted[0].name, 1);

      const summaryLines = sorted
        .map(
          (c, idx) =>
            `${idx + 1}° ⚡ ${c.name}: Iniziativa ${c.totalInitiative} (1d10 [${c.d10Roll}] + Mod ${c.initiativeMod >= 0 ? `+${c.initiativeMod}` : c.initiativeMod})`
        )
        .join('\n');

      const readyMsg: StoryMessage = {
        id: `sys_init_ready_${Date.now()}`,
        sender: 'system',
        text: `⚔️ ORDINE DEI TURNI DETERMINATO:\n${summaryLines}\n\n➔ Round 1 iniziato! Tocca a: ${sorted[0].name}!`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, readyMsg]);
      multiplayer.broadcastStory(readyMsg);
    }
  };

  // Avanza al prossimo giocatore nella classifica di Iniziativa
  const advanceTurn = () => {
    const players = initiativeOrderRef.current.filter((c) => !c.isEnemy);
    if (players.length === 0) return;

    const currentId = activeTurnPlayerIdRef.current;
    const currentRound = roundNumberRef.current;
    const currentIdx = players.findIndex((c) => c.id === currentId);
    const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % players.length;
    const nextPlayer = players[nextIdx];
    const nextRound = nextIdx === 0 ? currentRound + 1 : currentRound;

    setRoundNumber(nextRound);
    setActiveTurnPlayerId(nextPlayer.id);
    setActiveTurnPlayerName(nextPlayer.name);
    multiplayer.setActiveTurn(nextPlayer.id, nextPlayer.name, nextRound);
  };

  // Regola Ufficiale Schermo del Narratore: Ritardare l'Azione a un momento successivo della lista di Iniziativa
  const handleDelayAction = () => {
    const players = initiativeOrder.filter((c) => !c.isEnemy);
    if (!isCombatActive || players.length <= 1) return;
    const currentIdx = players.findIndex((c) => c.id === activeTurnPlayerId);
    const idx = currentIdx === -1 ? 0 : currentIdx;
    const nextIdx = (idx + 1) % players.length;

    const updatedOrder = [...players];
    const [delayedCombatant] = updatedOrder.splice(idx, 1);
    delayedCombatant.isDelayed = true;
    updatedOrder.splice(nextIdx, 0, delayedCombatant);

    setInitiativeOrder(updatedOrder);
    const nowActive = updatedOrder[idx];
    if (nowActive) {
      setActiveTurnPlayerId(nowActive.id);
      setActiveTurnPlayerName(nowActive.name);
      multiplayer.setActiveTurn(nowActive.id, nowActive.name, roundNumber);
    }
  };

  // Aggiunge un nuovo Nemico con Scheda Completa (Salute, Difesa, Armatura, Attacco)
  const handleAddEnemySpec = (spec: EnemySpawnSpec) => {
    const newEnemy = createCombatEnemyFromSpec(spec);
    setActiveEnemies((prev) => [...prev, newEnemy]);
    setIsCombatActive(true);
  };

  // Rimuove un nemico dallo scontro
  const handleRemoveCombatant = (id: string) => {
    setActiveEnemies((prev) => prev.filter((e) => e.id !== id));
  };

  // Applica o cura danni manuali sulla Mini-Scheda di un Nemico
  const handleDamageEnemy = (
    enemyId: string,
    damageAmount: number,
    damageType: 'bashing' | 'lethal' | 'aggravated'
  ) => {
    setActiveEnemies((prev) =>
      prev.map((e) => {
        if (e.id !== enemyId) return e;
        const res = applyDamageToHealth(e.health, damageAmount, damageType);
        return {
          ...e,
          health: res.updatedHealth,
        };
      })
    );
  };

  const handleHealEnemy = (enemyId: string) => {
    setActiveEnemies((prev) =>
      prev.map((e) => {
        if (e.id !== enemyId) return e;
        const hasAgg = e.health.some((h) => h.damage === 'aggravated');
        const hasLethal = e.health.some((h) => h.damage === 'lethal');
        const typeToHeal = hasAgg ? 'aggravated' : hasLethal ? 'lethal' : 'bashing';
        return {
          ...e,
          health: healDamageFromHealth(e.health, 1, typeToHeal),
          isDefeated: false,
        };
      })
    );
  };

  // Sincronizza istantaneamente la salute e i danni dei nemici dal testo e dai report del Narratore
  const syncEnemiesFromNarratorText = (text?: string) => {
    if (!text) return;

    // Cattura pattern tipo:
    // **STATO NEMICO:** Elias Blackwood [Salute: 4/7]
    // STATO NEMICO: Elias Blackwood [Salute: 4/7]
    // [Salute: 4/7]
    const enemyStateRegex = /(?:\*\*STATO NEMICO:\*\*|STATO NEMICO:)?\s*([A-Za-z0-9'’\s\-]+?)\s*\[Salute:\s*(\d+)\/(\d+)\]/gi;
    let match: RegExpExecArray | null;

    while ((match = enemyStateRegex.exec(text)) !== null) {
      const enemyName = match[1].replace(/^\*+|\*+$/g, '').trim();
      const currentHealth = parseInt(match[2], 10);
      const maxHealth = parseInt(match[3], 10);

      if (!enemyName || isNaN(currentHealth) || isNaN(maxHealth) || maxHealth <= 0) continue;

      setActiveEnemies((prev) => {
        const lowerTarget = enemyName.toLowerCase();
        const existingIdx = prev.findIndex(
          (e) =>
            e.name.toLowerCase().includes(lowerTarget) ||
            lowerTarget.includes(e.name.toLowerCase())
        );

        if (existingIdx >= 0) {
          const existing = prev[existingIdx];
          const fresh = createCombatEnemyFromSpec({
            name: existing.name,
            creatureType: existing.creatureType,
            maxHealth,
            defense: existing.defense,
            armor: existing.armor,
            initiativeMod: existing.initiativeMod,
            attackPool: existing.attackPool,
            attackName: existing.attackName,
          });
          const damageNeeded = Math.max(0, maxHealth - currentHealth);
          if (damageNeeded > 0) {
            fresh.health = applyDamageToHealth(fresh.health, damageNeeded, 'lethal').updatedHealth;
          }
          fresh.id = existing.id;
          fresh.isDefeated = currentHealth <= 0;
          const next = [...prev];
          next[existingIdx] = fresh;
          return next;
        } else {
          const lower = enemyName.toLowerCase();
          const preset =
            OFFICIAL_WOD_BESTIARY.find(
              (b) =>
                (lower.includes('vampir') && b.creatureType === 'vampire') ||
                (lower.includes('lup') && b.creatureType === 'werewolf') ||
                (lower.includes('mag') && b.creatureType === 'mage') ||
                (lower.includes('cacciator') && b.creatureType === 'hunter')
            ) || OFFICIAL_WOD_BESTIARY[0];

          const createdEnemy = createCombatEnemyFromSpec(
            {
              ...preset,
              name: enemyName,
              maxHealth,
            },
            `enemy_sync_${Date.now()}`
          );
          const damageNeeded = Math.max(0, maxHealth - currentHealth);
          if (damageNeeded > 0) {
            createdEnemy.health = applyDamageToHealth(createdEnemy.health, damageNeeded, 'lethal').updatedHealth;
          }
          createdEnemy.isDefeated = currentHealth <= 0;
          setIsCombatActive(true);
          return [...prev, createdEnemy];
        }
      });
    }
  };

  // Reperti Visivi Antichi e Handout scoperti durante la Cronaca
  const [discoveredHandouts, setDiscoveredHandouts] = useState<HandoutSpec[]>(() => {
    const saved = localStorage.getItem('chronica_handouts');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeHandoutModal, setActiveHandoutModal] = useState<HandoutSpec | null>(null);

  useEffect(() => {
    if (discoveredHandouts.length > 0) {
      safeLocalStorageSet('chronica_handouts', JSON.stringify(discoveredHandouts));
    } else {
      localStorage.removeItem('chronica_handouts');
    }
  }, [discoveredHandouts]);

  // Gestisce gli Ostacoli Rapidi, Nemici, Mappe e Reperti generati automaticamente dall'IA
  const processAIResponseEncounters = (
    response: {
      obstacleSpawn?: Omit<DynamicObstacle, 'id' | 'currentSuccesses'>;
      enemySpawns?: EnemySpawnSpec[];
      suggestedMapName?: string;
      battlemap?: BattlemapSpec;
      handout?: HandoutSpec;
    },
    responseText?: string
  ) => {
    // 1. Cambio Mappa Automatico Consigliato dal Narratore
    if (response.suggestedMapName && campaign?.maps && campaign.maps.length > 0) {
      const target = response.suggestedMapName.toLowerCase().trim();
      const match = campaign.maps.find(
        (m) => m.name.toLowerCase().includes(target) || target.includes(m.name.toLowerCase())
      );
      if (match && match.id !== campaign.activeMapId) {
        const updated = { ...campaign, activeMapId: match.id };
        setCampaign(updated);
        safeLocalStorageSet('chronica_campaign', JSON.stringify(updated));
      }
    }

    // 2. Schizzo Tattico Minimale (Battlemap Blueprint)
    if (response.battlemap && campaign) {
      const updated = { ...campaign, activeBattlemap: response.battlemap };
      setCampaign(updated);
      safeLocalStorageSet('chronica_campaign', JSON.stringify(updated));
    }

    // 3. Reperto Visivo Antico (Pergamena, Lettera, Pietra Runica)
    if (response.handout) {
      setDiscoveredHandouts((prev) => {
        if (prev.some((h) => h.id === response.handout!.id || h.title === response.handout!.title)) {
          return prev;
        }
        return [...prev, response.handout!];
      });
      setActiveHandoutModal(response.handout);
    }

    if (response.obstacleSpawn) {
      setActiveObstacle({
        id: `obs_${Date.now()}`,
        name: response.obstacleSpawn.name || 'Ostacolo in Corsa',
        description: response.obstacleSpawn.description,
        successesNeeded: Math.max(1, response.obstacleSpawn.successesNeeded || 2),
        currentSuccesses: 0,
        penaltyDamageOnFail: response.obstacleSpawn.penaltyDamageOnFail ?? 1,
        penaltyDamageType: response.obstacleSpawn.penaltyDamageType || 'bashing',
        attribute: response.obstacleSpawn.attribute,
        ability: response.obstacleSpawn.ability,
        resolved: false,
      });
    }

    if (response.enemySpawns && response.enemySpawns.length > 0) {
      const currentList = activeEnemiesRef.current;
      const updatedList = [...currentList];

      for (const spec of response.enemySpawns) {
        const existingIdx = updatedList.findIndex(
          (e) => e.name.toLowerCase().trim() === spec.name.toLowerCase().trim()
        );
        if (existingIdx >= 0) {
          // Mantieni la salute e i danni subiti dall'avversario
          continue;
        } else {
          updatedList.push(
            createCombatEnemyFromSpec(spec, `enemy_ai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`)
          );
        }
      }

      setActiveEnemies(updatedList);
      if (!isCombatActiveRef.current && updatedList.length > 0) {
        handleStartCombatAndRoll(updatedList);
      }
    }

    if (responseText) {
      syncEnemiesFromNarratorText(responseText);
    }
  };

  // Profilo Utente Attivo & Gestione Cronache
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('chronica_active_profile') || sessionStorage.getItem('chronica_active_profile');
    return saved ? JSON.parse(saved) : null;
  });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(() => !currentProfile);
  const [isChronicleSlotsOpen, setIsChronicleSlotsOpen] = useState(false);
  const [isProfileManageOpen, setIsProfileManageOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(() => !localStorage.getItem('chronica_tutorial_seen'));
  const [isStorytellerScreenOpen, setIsStorytellerScreenOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isJoinRoomModalOpen, setIsJoinRoomModalOpen] = useState(false);
  const [manualRoomInput, setManualRoomInput] = useState('');
  const [joinRoomError, setJoinRoomError] = useState('');
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    if (isProfileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileDropdownOpen]);

  const [diceTraits, setDiceTraits] = useState<{
    attr?: { name: string; value: number };
    ability?: { name: string; value: number };
    difficulty?: number;
    reason?: string;
    modifier?: number;
  }>({});

  // Salvataggio automatico dello stato locale
  useEffect(() => {
    if (campaign) safeLocalStorageSet('chronica_campaign', JSON.stringify(campaign));
    else localStorage.removeItem('chronica_campaign');
  }, [campaign]);

  useEffect(() => {
    if (character) {
      safeLocalStorageSet('chronica_character', JSON.stringify(character));
      localStorage.removeItem('chronica_is_spectator');
    } else {
      localStorage.removeItem('chronica_character');
    }
  }, [character]);

  useEffect(() => {
    safeLocalStorageSet('chronica_messages', JSON.stringify(messages));
  }, [messages]);

  // Sincronizza lo stato dei nemici (es. Elias Blackwood [Salute: 4/7]) dall'ultimo messaggio del narratore
  useEffect(() => {
    if (messages.length > 0) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m.sender === 'narrator' && m.text && m.text.includes('[Salute:')) {
          syncEnemiesFromNarratorText(m.text);
          break;
        }
      }
    }
  }, [messages.length]);

  // Salvataggio automatico sul Server (sempre attivo, anche per Ospite)
  useEffect(() => {
    if (campaign && messages.length > 0) {
      saveChronicleToServer(
        campaign,
        character,
        messages,
        currentProfile?.id || 'default',
        currentProfile?.name || 'Narratore',
        activeEnemies
      );
    }
  }, [campaign, character, messages, currentProfile, activeEnemies]);

  const handleLoadChronicle = (data: ChronicleSaveData) => {
    setCampaign(data.campaign);
    setCharacter(data.character || null);
    if (!data.character) {
      localStorage.setItem('chronica_is_spectator', 'true');
      localStorage.removeItem('chronica_character');
    } else {
      localStorage.removeItem('chronica_is_spectator');
      localStorage.setItem('chronica_character', JSON.stringify(data.character));
    }
    if (data.activeEnemies && data.activeEnemies.length > 0) {
      setActiveEnemies(data.activeEnemies);
      localStorage.setItem('chronica_active_enemies', JSON.stringify(data.activeEnemies));
    } else {
      setActiveEnemies([]);
      localStorage.removeItem('chronica_active_enemies');
    }
    setMessages(data.messages);
    multiplayer.createRoom(roomCode, data.campaign);
  };

  const handleSaveAndExitToMenu = async () => {
    if (campaign && messages.length > 0) {
      await saveChronicleToServer(
        campaign,
        character || null,
        messages,
        currentProfile?.id || 'default',
        currentProfile?.name || 'Narratore',
        activeEnemies
      );
    }
    setCampaign(null);
    setMessages([]);
    setActiveEnemies([]);
    localStorage.removeItem('chronica_campaign');
    localStorage.removeItem('chronica_messages');
    localStorage.removeItem('chronica_active_enemies');
  };

  // Calcolo istantaneo del gruppo di gioco (Party) per la calibrazione dinamica del Narratore IA
  const getPartySnapshot = (activePlayers = connectedPlayers) => {
    const list: { id: string; name: string; creatureType?: string; factionOrClan?: string; concept?: string }[] = [];
    if (character && character.name) {
      list.push({
        id: 'host',
        name: character.name,
        creatureType: character.creatureType,
        factionOrClan: character.factionOrClan,
        concept: character.concept,
      });
    }
    activePlayers.forEach((p) => {
      if (p.character?.name && !list.some((existing) => existing.name === p.character.name)) {
        list.push({
          id: p.id,
          name: p.character.name,
          creatureType: p.character.creatureType,
          factionOrClan: p.character.factionOrClan,
          concept: p.character.concept,
        });
      }
    });
    return list;
  };

  // Connessione WebSocket Host per la Stanza Condivisa
  useEffect(() => {
    multiplayer.connect().then(() => {
      if (campaign) {
        multiplayer.createRoom(roomCode, campaign);
      }
    });

    const unsubscribe = multiplayer.subscribe(async (msg) => {
      // 1. Nuovo giocatore unito dal cellulare
      if (msg.type === 'PLAYER_JOINED') {
        const isAlreadyConnected = connectedPlayers.some((p) => p.id === msg.player.id);
        setConnectedPlayers((prev) => {
          const exists = prev.some((p) => p.id === msg.player.id);
          if (exists) {
            return prev.map((p) => (p.id === msg.player.id ? msg.player : p));
          }
          return [...prev, msg.player];
        });

        if (!isAlreadyConnected && !msg.isReconnecting) {
          const systemMsg: StoryMessage = {
            id: `sys_${Date.now()}`,
            sender: 'system',
            text: `🎲 ${msg.player.name} (${msg.player.character.factionOrClan}) si è unito al tavolo con il suo smartphone.`,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, systemMsg]);
        }

        if (!activeTurnPlayerId) {
          setActiveTurnPlayerId(msg.player.id);
          setActiveTurnPlayerName(msg.player.name);
          multiplayer.setActiveTurn(msg.player.id, msg.player.name, roundNumber);
        }
      }

      // 2. Giocatore disconnesso
      else if (msg.type === 'PLAYER_LEFT') {
        setConnectedPlayers((prev) => prev.filter((p) => p.id !== msg.playerId));
      }

      // 3. Giocatore aggiorna la scheda da smartphone
      else if (msg.type === 'UPDATE_CHARACTER') {
        setConnectedPlayers((prev) =>
          prev.map((p) => (p.id === msg.playerId ? { ...p, character: msg.character } : p))
        );
      }

      // 4. Bottino unico raccolto da un giocatore
      else if (msg.type === 'LOOT_CLAIMED') {
        setClaimedLoot((prev) => ({
          ...prev,
          [msg.lootId]: { playerId: msg.playerId, playerName: msg.playerName, itemName: msg.itemName },
        }));
      }

      // 5. Sincronizzazione turno attivo da parte del server o altro client
      else if (msg.type === 'TURN_CHANGED') {
        setActiveTurnPlayerId(msg.activeTurnPlayerId);
        setActiveTurnPlayerName(msg.activeTurnPlayerName);
        setRoundNumber(msg.roundNumber);
      }

      // 4. Lancio dadi effettuato da uno smartphone (integrato al 100% con Ostacoli in Corsa e Salute Nemici)
      else if (msg.type === 'DICE_ROLL' && campaign) {
        if (handleSendRollToStoryRef.current) {
          handleSendRollToStoryRef.current(msg.roll, msg.comment, undefined, msg.playerId, msg.playerName);
        }
      }

      // 4.5 Risoluzione Difesa da Smartphone per Attacco Nemico
      else if (msg.type === 'RESOLVE_ENEMY_DEFENSE' && campaign) {
        const enemy = activeEnemiesRef.current.find((e) => e.id === msg.enemyId) || activeEnemiesRef.current[0];
        if (enemy && handleTriggerEnemyTurnRollRef.current) {
          handleTriggerEnemyTurnRollRef.current(enemy, msg.isPlayerDodging, msg.playerId, msg.playerName);
        }
      }

      // 5. Azione narrativa inviata da uno smartphone al tavolo
      else if (msg.type === 'PLAYER_ACTION' && campaign) {
        const actingPlayer = connectedPlayers.find((p) => p.id === msg.playerId);
        let activeChar = actingPlayer?.character || character;
        const actionText = `${msg.playerName}: "${msg.action.trim()}"`;

        const userMsg: StoryMessage = {
          id: `msg_user_${Date.now()}`,
          sender: 'player',
          text: actionText,
          timestamp: Date.now(),
          senderName: msg.playerName,
        };

        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        multiplayer.broadcastStory(userMsg);
        setIsLoading(true);

        // Rilevamento automatico consumo munizioni da azioni su smartphone (es. "svuoto il caricatore", "raffica")
        let promptAction = actionText;
        if (activeChar) {
          const isFullDump = /svuot(?:o|a|are)\s+(?:il\s+)?(?:caricatore|tamburo)|scaric(?:o|a|are)\s+(?:il\s+)?(?:caricatore|tamburo|tutto)|tutti\s+i\s+colpi/i.test(msg.action);
          const isBurst = !isFullDump && /raffic(?:a|he)/i.test(msg.action);

          if (isFullDump || isBurst) {
            const ammoRes = consumeAmmo(activeChar, isFullDump ? 'all' : 3);
            if (ammoRes.success) {
              activeChar = ammoRes.updatedChar;
              if (actingPlayer) {
                actingPlayer.character = ammoRes.updatedChar;
                setConnectedPlayers([...connectedPlayers]);
              } else if (character) {
                setCharacter(ammoRes.updatedChar);
                multiplayer.updateCharacter(ammoRes.updatedChar);
              }
              promptAction += `\n[SISTEMA MUNIZIONI: Il giocatore ${msg.playerName} ha ${isFullDump ? 'svuotato completamente il caricatore' : 'sparato una raffica'} (${ammoRes.consumedCount} colpi consumati). Munizioni rimaste nell'inventario: ${ammoRes.remaining}]`;
            }
          }

          // Controllo automatico per kit medico / oggetti curativi
          const healingKeywords = /kit\s+medico|medikit|pronto\s+soccorso|bende|benda|pozion/i;
          if (healingKeywords.test(msg.action)) {
            const healStatus = checkHealingItemStatus(activeChar);
            if (!healStatus.hasHealingItem) {
              promptAction += `\n[VERIFICA INVENTARIO: FALLITA! Il giocatore ${msg.playerName} tenta di curarsi con un kit medico / bende / pozione, ma NON POSSIEDE questo oggetto nell'inventario! Narra che controlla tasche e zaino ma non ha alcun materiale medico, e rifiuta la guarigione!]`;
            } else {
              const healRes = consumeHealingItem(activeChar);
              if (healRes.success) {
                activeChar = healRes.updatedChar;
                if (actingPlayer) {
                  actingPlayer.character = healRes.updatedChar;
                  setConnectedPlayers([...connectedPlayers]);
                } else if (character) {
                  setCharacter(healRes.updatedChar);
                }
                multiplayer.updateCharacter(healRes.updatedChar);
                promptAction += `\n[SISTEMA INVENTARIO: 1x ${healRes.consumedItem?.name || 'Kit Medico'} utilizzato per medicarsi. 1 casella di ferita risanata dalla scheda! Rimasti: ${healRes.remaining}]`;
              }
            }
          }

          // Anti-Autorisoluzione: se l'azione dichiarata da cellulare richiede dadi, impone all'IA di richiedere il tiro
          const parsedAction = parseSuggestionRoll(msg.action);
          if (parsedAction.hasRoll) {
            promptAction += `\n[DIRETTIVA ARBITRO TASSATIVA: ${msg.playerName} ha dichiarato un'azione rischiosa o di conflitto ("${msg.action}")! REGOLA FERREA: È RIGIDAMENTE VIETATO narrare che l'azione ha avuto successo o che il nemico muore/l'ostacolo è superato senza il tiro di dadi! Tratta la frase del giocatore SOLO come un tentativo. Narra la tensione dell'istante, FERMATI AL MOMENTO CULMINANTE DELL'AZIONE e RICHIEDI IL TIRO DI DADO OBBLIGATORIO inserendo a fine risposta: [[TIRO: {"attribute": "${parsedAction.attribute || 'Destrezza'}", "ability": "${parsedAction.ability || 'Nessuna'}", "difficulty": 8, "reason": "${parsedAction.cleanText}"}]]!]`;
          }
        }

        try {
          const response = await generateNarratorResponse(
            campaign,
            activeChar,
            updatedMessages,
            promptAction,
            undefined,
            getPartySnapshot()
          );

          const narratorMsg: StoryMessage = {
            id: `msg_narrator_${Date.now()}`,
            sender: 'narrator',
            text: response.text,
            timestamp: Date.now(),
            suggestedActions: response.suggestions,
            requiredRoll: response.requiredRoll,
            xpAward: response.xpAward,
            itemAward: response.itemAward,
            playerDamageAward: response.playerDamage,
            playerHealAward: response.playerHeal,
          };

          // Aggiornamento automatico della Salute del giocatore su Danni inflitti dal Narratore
          if (response.playerDamage && activeChar) {
            const dmgRes = applyDamageToHealth(activeChar.health, response.playerDamage.points, response.playerDamage.type || 'lethal');
            const damagedChar = { ...activeChar, health: dmgRes.updatedHealth };
            activeChar = damagedChar;
            if (actingPlayer) {
              actingPlayer.character = damagedChar;
              setConnectedPlayers([...connectedPlayers]);
            } else if (character) {
              setCharacter(damagedChar);
              localStorage.setItem('chronica_character', JSON.stringify(damagedChar));
            }
            multiplayer.updateCharacter(damagedChar);
          }

          // Aggiornamento automatico della Salute del giocatore su Cure ricevute dal Narratore
          if (response.playerHeal && activeChar) {
            const healedHealth = healDamageFromHealth(activeChar.health, response.playerHeal.points, response.playerHeal.type || 'bashing');
            const healedChar = { ...activeChar, health: healedHealth };
            activeChar = healedChar;
            if (actingPlayer) {
              actingPlayer.character = healedChar;
              setConnectedPlayers([...connectedPlayers]);
            } else if (character) {
              setCharacter(healedChar);
              localStorage.setItem('chronica_character', JSON.stringify(healedChar));
            }
            multiplayer.updateCharacter(healedChar);
          }

          if (response.xpAward) {
            if (actingPlayer && actingPlayer.character) {
              const updatedPlayerChar = awardExperience(
                actingPlayer.character,
                response.xpAward.amount,
                response.xpAward.reason
              );
              setConnectedPlayers((prev) =>
                prev.map((p) => (p.id === actingPlayer.id ? { ...p, character: updatedPlayerChar } : p))
              );
              multiplayer.updateCharacter(updatedPlayerChar);
            } else if (character) {
              const updatedWithXp = awardExperience(character, response.xpAward.amount, response.xpAward.reason);
              setCharacter(updatedWithXp);
              localStorage.setItem('chronica_character', JSON.stringify(updatedWithXp));
            }
          }

          setMessages((prev) => [...prev, narratorMsg]);
          multiplayer.broadcastStory(narratorMsg);
          advanceTurn();
        } catch (err) {
          console.error('Errore gestione PLAYER_ACTION:', err);
        } finally {
          setIsLoading(false);
        }
      }

      // 5b. Domanda di chiarimento fuori gioco (OOC) inviata da uno smartphone al tavolo
      else if (msg.type === 'PLAYER_QUESTION' && campaign) {
        if (handleAskNarratorRef.current) {
          handleAskNarratorRef.current(msg.question, msg.playerId, msg.playerName);
        }
      }
    });

    return () => unsubscribe();
  }, [roomCode, campaign, character, messages, connectedPlayers]);

  // Avvio nuova cronaca con Generazione del Grande Prologo
  const handleStartCampaign = async (
    config: CampaignConfig,
    createdChar: Character | null,
    _initialHook?: string
  ) => {
    const freshRoomCode = `CHR-${Math.floor(100 + Math.random() * 900)}`;
    setRoomCode(freshRoomCode);
    localStorage.setItem('chronica_room_code', freshRoomCode);

    setCampaign(config);
    setCharacter(createdChar);
    if (!createdChar) {
      safeLocalStorageSet('chronica_is_spectator', 'true');
      localStorage.removeItem('chronica_character');
    } else {
      localStorage.removeItem('chronica_is_spectator');
      safeLocalStorageSet('chronica_character', JSON.stringify(createdChar));
    }
    setIsLoading(true);

    try {
      const prologue = await generateGrandPrologue(config, createdChar, getPartySnapshot());
      processAIResponseEncounters(prologue as any, prologue.text);
      const initialNarratorMsg: StoryMessage = {
        id: `msg_prologue_${Date.now()}`,
        sender: 'narrator',
        text: prologue.text,
        timestamp: Date.now(),
        suggestedActions: prologue.suggestions,
        requiredRoll: prologue.requiredRoll,
        battlemap: (prologue as any).battlemap,
        handout: (prologue as any).handout,
        suggestedMapName: (prologue as any).suggestedMapName,
      };

      setMessages([initialNarratorMsg]);
      multiplayer.createRoom(freshRoomCode, config);
      multiplayer.broadcastStory(initialNarratorMsg);
    } catch (err) {
      console.error('Errore avvio prologo:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Chiedi chiarimento fuori gioco (OOC) al Narratore (Scena congelata, senza avanzamento tempo)
  const handleAskNarrator = async (
    question: string,
    sourcePlayerId?: string,
    sourcePlayerName?: string
  ) => {
    if (!campaign) return;

    const isMobileSource = Boolean(sourcePlayerId && sourcePlayerId !== 'host');
    const askingPlayer = isMobileSource
      ? connectedPlayersRef.current.find((p) => p.id === sourcePlayerId)
      : undefined;
    const activeChar = askingPlayer?.character || character || null;
    const senderDisplayName = sourcePlayerName || askingPlayer?.name || character?.name || 'Giocatore';

    setIsLoading(true);
    try {
      const res = await askNarratorClarification(
        campaign,
        activeChar,
        messages,
        question,
        getPartySnapshot()
      );

      const clarifMsg: StoryMessage = {
        id: `msg_clarif_${Date.now()}`,
        sender: 'narrator',
        senderName: senderDisplayName,
        text: res.answer,
        timestamp: Date.now(),
        isClarification: true,
        clarificationQuestion: question,
        battlemap: res.battlemap,
      };

      if (res.battlemap) {
        setCampaign((prev) => (prev ? { ...prev, activeBattlemap: res.battlemap } : prev));
        safeLocalStorageSet('chronica_campaign', JSON.stringify({ ...campaign, activeBattlemap: res.battlemap }));
      }

      const updated = [...messages, clarifMsg];
      setMessages(updated);
      multiplayer.broadcastStory(clarifMsg);
    } catch (err) {
      console.error('Errore richiesta chiarimento narratore:', err);
    } finally {
      setIsLoading(false);
    }
  };
  handleAskNarratorRef.current = handleAskNarrator;

  // Invio azione del giocatore dal PC
  const handleSendAction = async (actionText: string) => {
    if (!campaign) return;

    const userMsg: StoryMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'player',
      text: actionText,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    // Se c'è un Ostacolo Rapido attivo e il giocatore prova a passare senza tirare i dadi, ricorda all'IA il blocco
    let promptAction = actionText;
    let currentCharForAI = character;

    // Rilevamento automatico consumo munizioni da azioni scritte (es. "svuoto il caricatore", "scarico il tamburo", "raffica")
    if (character) {
      const isFullDump = /svuot(?:o|a|are)\s+(?:il\s+)?(?:caricatore|tamburo)|scaric(?:o|a|are)\s+(?:il\s+)?(?:caricatore|tamburo|tutto)|tutti\s+i\s+colpi/i.test(actionText);
      const isBurst = !isFullDump && /raffic(?:a|he)/i.test(actionText);

      if (isFullDump || isBurst) {
        const ammoRes = consumeAmmo(character, isFullDump ? 'all' : 3);
        if (ammoRes.success) {
          currentCharForAI = ammoRes.updatedChar;
          setCharacter(ammoRes.updatedChar);
          multiplayer.updateCharacter(ammoRes.updatedChar);
          promptAction += `\n[SISTEMA MUNIZIONI: Il giocatore ha ${isFullDump ? 'svuotato completamente il caricatore' : 'sparato una raffica'} (${ammoRes.consumedCount} colpi consumati). Munizioni rimaste nell'inventario: ${ammoRes.remaining}]`;
        }
      }

      // Controllo automatico per kit medico / oggetti curativi
      const healingKeywords = /kit\s+medico|medikit|pronto\s+soccorso|bende|benda|pozion/i;
      if (healingKeywords.test(actionText)) {
        const healStatus = checkHealingItemStatus(character);
        if (!healStatus.hasHealingItem) {
          promptAction += `\n[VERIFICA INVENTARIO: FALLITA! Il giocatore tenta di curarsi con un kit medico / bende / pozione, ma NON POSSIEDE questo oggetto nell'inventario! Narra che controlla nelle tasche e nello zaino ma non trova alcun materiale medico, e rifiuta la guarigione!]`;
        } else {
          const healRes = consumeHealingItem(character);
          if (healRes.success) {
            currentCharForAI = healRes.updatedChar;
            setCharacter(healRes.updatedChar);
            multiplayer.updateCharacter(healRes.updatedChar);
            promptAction += `\n[SISTEMA INVENTARIO: 1x ${healRes.consumedItem?.name || 'Kit Medico'} utilizzato per medicarsi. 1 casella di ferita risanata dalla scheda della salute! Rimasti in inventario: ${healRes.remaining}]`;
          }
        }
      }

      // Anti-Autorisoluzione: se l'azione dichiarata al PC richiede dadi, impone all'IA di richiedere il tiro
      const parsedAction = parseSuggestionRoll(actionText);
      if (parsedAction.hasRoll) {
        promptAction += `\n[DIRETTIVA ARBITRO TASSATIVA SULL'AZIONE DEL GIOCATORE: Il giocatore ha dichiarato un'azione rischiosa o di conflitto ("${actionText}")! REGOLA FERREA: È RIGIDAMENTE VIETATO narrare che l'azione ha avuto successo o che il nemico muore/l'ostacolo è superato senza il tiro di dadi! Tratta la frase del giocatore SOLO come un tentativo. Narra la tensione dell'istante, FERMATI AL MOMENTO CULMINANTE DELL'AZIONE e RICHIEDI IL TIRO DI DADO OBBLIGATORIO inserendo a fine risposta: [[TIRO: {"attribute": "${parsedAction.attribute || 'Destrezza'}", "ability": "${parsedAction.ability || 'Nessuna'}", "difficulty": 8, "reason": "${parsedAction.cleanText}"}]]!]`;
      }
    }

    if (activeObstacleRef.current && !activeObstacleRef.current.resolved) {
      const obs = activeObstacleRef.current;
      promptAction += `\n[ATTENZIONE NARRATORE: C'è un Ostacolo in Corsa attivo ("${obs.name}", progresso ${obs.currentSuccesses}/${obs.successesNeeded} successi). Il giocatore NON ha ancora superato l'ostacolo coi dadi: richiedigli il tiro obbligatorio per superare ${obs.name}!]`;
    }

    try {
      const response = await generateNarratorResponse(
        campaign,
        currentCharForAI,
        updatedMessages,
        promptAction,
        undefined,
        getPartySnapshot()
      );

      processAIResponseEncounters(response, response.text);

      const narratorMsg: StoryMessage = {
        id: `msg_narrator_${Date.now()}`,
        sender: 'narrator',
        text: response.text,
        timestamp: Date.now(),
        suggestedActions: response.suggestions,
        requiredRoll: response.requiredRoll,
        xpAward: response.xpAward,
        itemAward: response.itemAward,
        playerDamageAward: response.playerDamage,
        playerHealAward: response.playerHeal,
        battlemap: response.battlemap,
        handout: response.handout,
        suggestedMapName: response.suggestedMapName,
      };

      // Aggiornamento automatico della Salute del protagonista su Danni inflitti dal Narratore
      if (response.playerDamage && character) {
        const dmgRes = applyDamageToHealth(character.health, response.playerDamage.points, response.playerDamage.type || 'lethal');
        const damagedChar = { ...character, health: dmgRes.updatedHealth };
        setCharacter(damagedChar);
        localStorage.setItem('chronica_character', JSON.stringify(damagedChar));
        multiplayer.updateCharacter(damagedChar);
      }

      // Aggiornamento automatico della Salute del protagonista su Cure ricevute dal Narratore
      if (response.playerHeal && character) {
        const healedHealth = healDamageFromHealth(character.health, response.playerHeal.points, response.playerHeal.type || 'bashing');
        const healedChar = { ...character, health: healedHealth };
        setCharacter(healedChar);
        localStorage.setItem('chronica_character', JSON.stringify(healedChar));
        multiplayer.updateCharacter(healedChar);
      }

      if (response.xpAward && character) {
        const updatedWithXp = awardExperience(character, response.xpAward.amount, response.xpAward.reason);
        setCharacter(updatedWithXp);
        localStorage.setItem('chronica_character', JSON.stringify(updatedWithXp));
      }

      setMessages((prev) => [...prev, narratorMsg]);
      multiplayer.broadcastStory(narratorMsg);
      if (isCombatActiveRef.current) {
        advanceTurn();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Esegue il turno d'attacco di un Nemico tirando i suoi dadi contro la Difesa normale o la Schivata (Difesa x2) del giocatore o dello smartphone
  const handleTriggerEnemyTurnRoll = async (
    enemy: ActiveCombatEnemy,
    isPlayerDodging: boolean,
    targetPlayerId?: string,
    targetPlayerName?: string
  ) => {
    if (!campaign) return;

    const isMobileTarget = Boolean(targetPlayerId && targetPlayerId !== 'host');
    const targetPlayer = isMobileTarget
      ? connectedPlayersRef.current.find((p) => p.id === targetPlayerId)
      : undefined;
    const targetChar = targetPlayer?.character || character || createDefaultCharacter('hunter');
    const targetDisplayName = targetPlayerName || targetPlayer?.name || character?.name || 'Tavolo';

    const attackOutcome = rollEnemyAttackAgainstPlayer({
      enemy,
      targetCharacter: targetChar,
      isPlayerDodging,
    });

    if (isMobileTarget && targetPlayerId) {
      setConnectedPlayers((prev) =>
        prev.map((p) => (p.id === targetPlayerId ? { ...p, character: attackOutcome.updatedCharacter } : p))
      );
      multiplayer.updateCharacter(attackOutcome.updatedCharacter);
    } else if (character) {
      setCharacter(attackOutcome.updatedCharacter);
      localStorage.setItem('chronica_character', JSON.stringify(attackOutcome.updatedCharacter));
      multiplayer.updateCharacter(attackOutcome.updatedCharacter);
    }

    const dmgSymbol =
      attackOutcome.effectiveDamageType === 'aggravated'
        ? '*'
        : attackOutcome.effectiveDamageType === 'lethal'
        ? 'X'
        : '/';

    const rollSummaryText = `⚔️ TURNO DEL NEMICO — ${enemy.name} attacca ${targetDisplayName} con ${enemy.attackName} (${attackOutcome.formulaSummary}):\n${
      isPlayerDodging ? `💨 ${targetDisplayName} sceglie di SCHIVARE (Difesa ×2)!\n` : `🛡️ ${targetDisplayName} usa la Difesa Standard.\n`
    }➔ Successi del Nemico: ${attackOutcome.damageDealt} (${
      attackOutcome.damageDealt > 0
        ? `Inflitti ${attackOutcome.damageDealt} danni [${dmgSymbol}] alla Salute di ${targetDisplayName}!`
        : `Colpo parato o schivato senza subire danni!`
    })`;

    const enemyRollMsg: StoryMessage = {
      id: `msg_enemy_roll_${Date.now()}`,
      sender: 'player',
      senderName: `💀 ${enemy.name}`,
      text: rollSummaryText,
      timestamp: Date.now(),
      rollResult: attackOutcome.rollResult,
    };

    const updatedMessages = [...messages, enemyRollMsg];
    setMessages(updatedMessages);
    multiplayer.broadcastStory(enemyRollMsg);
    advanceTurn();
    setIsLoading(true);

    try {
      const response = await generateNarratorResponse(
        campaign,
        attackOutcome.updatedCharacter,
        updatedMessages,
        `${rollSummaryText}\n[Narra l'attacco appena effettuato da ${enemy.name} contro ${targetDisplayName} e passa la parola al gruppo per il loro prossimo turno!]`,
        attackOutcome.rollResult,
        getPartySnapshot()
      );

      processAIResponseEncounters(response, response.text);

      const narratorMsg: StoryMessage = {
        id: `msg_narrator_${Date.now()}`,
        sender: 'narrator',
        text: response.text,
        timestamp: Date.now(),
        suggestedActions: response.suggestions,
        requiredRoll: response.requiredRoll,
        xpAward: response.xpAward,
        itemAward: response.itemAward,
        playerDamageAward: response.playerDamage,
        playerHealAward: response.playerHeal,
        battlemap: response.battlemap,
        handout: response.handout,
        suggestedMapName: response.suggestedMapName,
      };

      // Aggiornamento automatico della Salute del giocatore su Danni narrativi
      if (response.playerDamage && targetChar) {
        const dmgRes = applyDamageToHealth(targetChar.health, response.playerDamage.points, response.playerDamage.type || 'lethal');
        const damagedChar = { ...targetChar, health: dmgRes.updatedHealth };
        if (isMobileTarget && targetPlayerId) {
          setConnectedPlayers((prev) =>
            prev.map((p) => (p.id === targetPlayerId ? { ...p, character: damagedChar } : p))
          );
        } else if (character) {
          setCharacter(damagedChar);
          localStorage.setItem('chronica_character', JSON.stringify(damagedChar));
        }
        multiplayer.updateCharacter(damagedChar);
      }

      // Aggiornamento automatico della Salute del giocatore su Cure narrative
      if (response.playerHeal && targetChar) {
        const healedHealth = healDamageFromHealth(targetChar.health, response.playerHeal.points, response.playerHeal.type || 'bashing');
        const healedChar = { ...targetChar, health: healedHealth };
        if (isMobileTarget && targetPlayerId) {
          setConnectedPlayers((prev) =>
            prev.map((p) => (p.id === targetPlayerId ? { ...p, character: healedChar } : p))
          );
        } else if (character) {
          setCharacter(healedChar);
          localStorage.setItem('chronica_character', JSON.stringify(healedChar));
        }
        multiplayer.updateCharacter(healedChar);
      }

      setMessages((prev) => [...prev, narratorMsg]);
      multiplayer.broadcastStory(narratorMsg);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  handleTriggerEnemyTurnRollRef.current = handleTriggerEnemyTurnRoll;

  // Invio tiro dadi dal PC o dallo Smartphone alla narrazione con gestione Ostacolo Rapido e Salute Reale dei Nemici
  const handleSendRollToStory = async (
    roll: DiceRollResult,
    comment?: string,
    playerNarration?: string,
    sourcePlayerId?: string,
    sourcePlayerName?: string
  ) => {
    if (!campaign) return;

    const isMobileSource = Boolean(sourcePlayerId && sourcePlayerId !== 'host');
    const rollingPlayer = isMobileSource
      ? connectedPlayersRef.current.find((p) => p.id === sourcePlayerId)
      : undefined;
    const activeChar = rollingPlayer?.character || character || null;
    const senderDisplayName = sourcePlayerName || rollingPlayer?.name || character?.name || 'Tavolo';

    // Se il giocatore ha tirato l'Iniziativa, aggiorna la sua voce e controlla se tutti hanno tirato
    if (roll.attributeName === 'Iniziativa') {
      const targetIdToUpdate = sourcePlayerId || 'host';
      const currentOrder =
        initiativeOrderRef.current.length > 0
          ? initiativeOrderRef.current
          : prepareInitiativeParticipants({
              hostCharacter: character || undefined,
              connectedPlayers: connectedPlayersRef.current,
            });

      const updated = currentOrder.map((c) =>
        c.id === targetIdToUpdate || (!isMobileSource && c.id === 'host') || c.name === senderDisplayName
          ? {
              ...c,
              d10Roll: roll.dice[0] || (roll as any).d10Roll || 1,
              totalInitiative: roll.netSuccesses,
              hasRolled: true,
            }
          : c
      );

      const sorted = sortInitiativeOrder(updated);
      setIsCombatActive(true);
      setInitiativeOrder(sorted);

      // Controlla se tutti i giocatori hanno completato il tiro d'Iniziativa
      const allPlayersRolled = sorted.every((c) => c.hasRolled);
      if (allPlayersRolled) {
        setIsInitiativePending(false);
        if (sorted[0]) {
          setActiveTurnPlayerId(sorted[0].id);
          setActiveTurnPlayerName(sorted[0].name);
          multiplayer.setActiveTurn(sorted[0].id, sorted[0].name, 1);
        }
      }
    }

    const traitDetail = roll.attributeName
      ? `Tiro di ${roll.attributeName}${roll.abilityName ? ' + ' + roll.abilityName : ''} (Soglia 8+)`
      : '';

    let actionText = comment?.trim()
      ? `${senderDisplayName}: "${comment.trim()}"${traitDetail ? ` [${traitDetail}]` : ''}`
      : `${senderDisplayName} effettua un ${traitDetail || 'tiro di dadi'}`;

    if (playerNarration?.trim()) {
      actionText += `\n\n💬 Narrazione del Giocatore:\n"${playerNarration.trim()}"`;
    }

    let aiMechanicalContext = '';

    // 1. GESTIONE MODALITÀ 1: OSTACOLO RAPIDO IN CORSA (Tira solo il giocatore fino a raggiungere i successi richiesti)
    if (activeObstacleRef.current && !activeObstacleRef.current.resolved && roll.attributeName !== 'Iniziativa') {
      const obs = activeObstacleRef.current;
      const gained = Math.max(0, roll.netSuccesses);
      const newTotal = obs.currentSuccesses + gained;

      if (newTotal >= obs.successesNeeded) {
        setActiveObstacle(null);
        aiMechanicalContext += `\n\n[🚧 ESITO OSTACOLO IN CORSA "${obs.name}": SUPERATO CON SUCCESSO (${newTotal}/${obs.successesNeeded} successi raggiunti)! ${senderDisplayName} sbaraglia/supera definitivamente ${obs.name} e il gruppo può proseguire nella scena!]`;
      } else {
        setActiveObstacle({
          ...obs,
          currentSuccesses: newTotal,
        });
        if (gained === 0 && (obs.penaltyDamageOnFail ?? 0) > 0 && activeChar) {
          const dmgRes = applyDamageToHealth(
            activeChar.health,
            obs.penaltyDamageOnFail || 1,
            obs.penaltyDamageType || 'bashing'
          );
          const hurtChar: Character = { ...activeChar, health: dmgRes.updatedHealth };
          if (isMobileSource && sourcePlayerId) {
            setConnectedPlayers((prev) =>
              prev.map((p) => (p.id === sourcePlayerId ? { ...p, character: hurtChar } : p))
            );
            multiplayer.updateCharacter(hurtChar);
          } else if (character) {
            setCharacter(hurtChar);
            localStorage.setItem('chronica_character', JSON.stringify(hurtChar));
            multiplayer.updateCharacter(hurtChar);
          }
        }
        aiMechanicalContext += `\n\n[🚧 ESITO OSTACOLO IN CORSA "${obs.name}": NON ANCORA SUPERATO! Progresso attuale: ${newTotal}/${obs.successesNeeded} successi. REGOLA TASSATIVA: ${senderDisplayName} NON riesce ancora a superare ${obs.name}, resta bloccato lì e deve effettuare un altro tiro per ottenere i ${obs.successesNeeded - newTotal} successi mancanti!]`;
      }
    }

    // 2. GESTIONE MODALITÀ 2: DANNO REALE SULLA BARRA SALUTE DEL NEMICO IN COMBATTIMENTO TATTICO
    else if (activeEnemiesRef.current.length > 0 && roll.damageInflicted !== undefined && roll.attributeName !== 'Iniziativa') {
      const targetEnemy =
        activeEnemiesRef.current.find((e) => e.id === roll.targetEnemyId) ||
        activeEnemiesRef.current.find((e) => !getEnemyHealthStatus(e).isDefeated) ||
        activeEnemiesRef.current[0];

      if (targetEnemy) {
        const dmg = Math.max(0, roll.damageInflicted);
        let effectiveEnemyDmgType = roll.damageType || 'lethal';
        // Se il nemico è un Vampiro e l'arma è da fuoco normale, converte Letale in Contundente
        if (
          targetEnemy.creatureType === 'vampire' &&
          effectiveEnemyDmgType === 'lethal' &&
          (roll.abilityName?.toLowerCase().includes('fuoco') ||
            roll.weaponName?.toLowerCase().includes('pistola') ||
            roll.weaponName?.toLowerCase().includes('fucile') ||
            roll.weaponName?.toLowerCase().includes('revolver'))
        ) {
          effectiveEnemyDmgType = 'bashing';
        }

        const updatedHealth =
          dmg > 0
            ? applyDamageToHealth(targetEnemy.health, dmg, effectiveEnemyDmgType).updatedHealth
            : targetEnemy.health;

        const updatedEnemy: ActiveCombatEnemy = {
          ...targetEnemy,
          health: updatedHealth,
        };
        const statusAfter = getEnemyHealthStatus(updatedEnemy);
        updatedEnemy.isDefeated = statusAfter.isDefeated;

        setActiveEnemies((prev) =>
          prev.map((e) => (e.id === updatedEnemy.id ? updatedEnemy : e))
        );

        if (statusAfter.isDefeated) {
          aiMechanicalContext += `\n\n[💀 STATO SALUTE NEMICO "${updatedEnemy.name}": ${senderDisplayName} gli ha inflitto ${dmg} danni ed è sceso a 0/${updatedEnemy.maxHealth} caselle Salute integre! IL NEMICO È STATO SCONFITTO / ELIMINATO DEFINITIVAMENTE! Puoi narrare il suo abbattimento!]`;
        } else {
          aiMechanicalContext += `\n\n[🩸 STATO SALUTE NEMICO "${updatedEnemy.name}": ${senderDisplayName} gli ha inflitto ${dmg} danni, ma gli restano ancora ${statusAfter.undamagedBoxes}/${updatedEnemy.maxHealth} caselle Salute integre (${statusAfter.statusText}). DIVIETO ASSOLUTO DI FARLO MORIRE! Il nemico incassa il colpo, è ferito ma resta in piedi e attivo nello scontro!]`;
        }
      }
    }

    const rollMsg: StoryMessage = {
      id: `msg_roll_${Date.now()}`,
      sender: 'player',
      text: actionText,
      timestamp: Date.now(),
      rollResult: roll,
      senderName: senderDisplayName,
    };

    const updatedMessages = [...messages, rollMsg];
    setMessages(updatedMessages);
    multiplayer.broadcastStory(rollMsg);
    setIsLoading(true);

    try {
      const response = await generateNarratorResponse(
        campaign,
        activeChar,
        updatedMessages,
        actionText + aiMechanicalContext,
        roll,
        getPartySnapshot()
      );

      processAIResponseEncounters(response, response.text);

      const narratorMsg: StoryMessage = {
        id: `msg_narrator_${Date.now()}`,
        sender: 'narrator',
        text: response.text,
        timestamp: Date.now(),
        suggestedActions: response.suggestions,
        requiredRoll: response.requiredRoll,
        xpAward: response.xpAward,
        itemAward: response.itemAward,
        playerDamageAward: response.playerDamage,
        playerHealAward: response.playerHeal,
        battlemap: response.battlemap,
        handout: response.handout,
        suggestedMapName: response.suggestedMapName,
      };

      // Aggiornamento automatico della Salute del giocatore su Danni narrativi
      if (response.playerDamage && activeChar) {
        const dmgRes = applyDamageToHealth(activeChar.health, response.playerDamage.points, response.playerDamage.type || 'lethal');
        const damagedChar = { ...activeChar, health: dmgRes.updatedHealth };
        if (isMobileSource && sourcePlayerId) {
          setConnectedPlayers((prev) =>
            prev.map((p) => (p.id === sourcePlayerId ? { ...p, character: damagedChar } : p))
          );
        } else if (character) {
          setCharacter(damagedChar);
          localStorage.setItem('chronica_character', JSON.stringify(damagedChar));
        }
        multiplayer.updateCharacter(damagedChar);
      }

      // Aggiornamento automatico della Salute del giocatore su Cure narrative
      if (response.playerHeal && activeChar) {
        const healedHealth = healDamageFromHealth(activeChar.health, response.playerHeal.points, response.playerHeal.type || 'bashing');
        const healedChar = { ...activeChar, health: healedHealth };
        if (isMobileSource && sourcePlayerId) {
          setConnectedPlayers((prev) =>
            prev.map((p) => (p.id === sourcePlayerId ? { ...p, character: healedChar } : p))
          );
        } else if (character) {
          setCharacter(healedChar);
          localStorage.setItem('chronica_character', JSON.stringify(healedChar));
        }
        multiplayer.updateCharacter(healedChar);
      }

      if (response.xpAward) {
        if (isMobileSource && rollingPlayer && activeChar) {
          const updatedPlayerChar = awardExperience(
            activeChar,
            response.xpAward.amount,
            response.xpAward.reason
          );
          setConnectedPlayers((prev) =>
            prev.map((p) => (p.id === sourcePlayerId ? { ...p, character: updatedPlayerChar } : p))
          );
          multiplayer.updateCharacter(updatedPlayerChar);
        } else if (character) {
          const updatedWithXp = awardExperience(character, response.xpAward.amount, response.xpAward.reason);
          setCharacter(updatedWithXp);
          localStorage.setItem('chronica_character', JSON.stringify(updatedWithXp));
        }
      }

      setMessages((prev) => [...prev, narratorMsg]);
      multiplayer.broadcastStory(narratorMsg);
      if (isCombatActiveRef.current && roll.attributeName !== 'Iniziativa') {
        advanceTurn();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  handleSendRollToStoryRef.current = handleSendRollToStory;

  // Raccolta bottino/oggetto narrativo
  const handleCollectItem = (itemName: string, description?: string, lootId?: string) => {
    if (!character) return;
    const finalLootId = lootId || `loot_${Date.now()}`;
    if (claimedLoot[finalLootId]) return;

    if (!character) return;

    multiplayer.claimLoot(finalLootId, itemName);
    setClaimedLoot((prev) => ({
      ...prev,
      [finalLootId]: { playerId: 'host', playerName: character.name, itemName },
    }));

    const updated = addLootToInventory(character, itemName, description);
    setCharacter(updated);
    localStorage.setItem('chronica_character', JSON.stringify(updated));
    multiplayer.updateCharacter(updated);
  };

  const handleTriggerRequiredRoll = (roll: RequiredRoll) => {
    let mod = roll.modifier;
    if (mod === undefined && roll.reason) {
      const match = roll.reason.match(/([+-]\d+)/);
      if (match) mod = parseInt(match[1], 10);
    }

    if (!character) {
      setDiceTraits({
        difficulty: roll.difficulty || 8,
        reason: roll.reason || '',
        modifier: mod || 0,
      });
      setIsDiceOpen(true);
      return;
    }
    const attrInfo = getAttributeValue(character, roll.attribute);
    const abilityInfo = roll.ability ? getAbilityValue(character, roll.ability) : undefined;

    setDiceTraits({
      attr: { name: attrInfo.key, value: attrInfo.value },
      ability: abilityInfo?.key ? { name: abilityInfo.key, value: abilityInfo.value } : undefined,
      difficulty: roll.difficulty || 8,
      reason: roll.reason || '',
      modifier: mod || 0,
    });
    setIsDiceOpen(true);
  };

  const handleOpenDiceWithTraits = (
    attr: { name: string; value: number },
    ab: { name: string; value: number }
  ) => {
    setDiceTraits({ attr, ability: ab });
    setIsDiceOpen(true);
  };

  const handleResetCampaign = () => {
    setCampaign(null);
    setMessages([]);
    setActiveEnemies([]);
    localStorage.removeItem('chronica_campaign');
    localStorage.removeItem('chronica_messages');
    localStorage.removeItem('chronica_active_enemies');
  };

  return (
    <div className={`h-screen h-[100dvh] overflow-hidden bg-[#0b0f19] text-slate-100 flex flex-col font-sans selection:bg-red-900 selection:text-white ${isCinemaMode ? 'text-lg sm:text-xl' : ''}`}>
      {/* Top Header Bar */}
      <header className="h-14 sm:h-16 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur px-2.5 sm:px-5 flex items-center justify-between shrink-0 sticky top-0 z-40 gap-1.5 sm:gap-2">
        {/* Sinistra: Brand Logo & Titolo */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-indigo-900 via-slate-900 to-red-950 border border-slate-700/60 flex items-center justify-center shadow-[0_0_15px_rgba(30,58,138,0.5)]">
            <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-300" />
          </div>
          <div>
            <h1 className="font-serif font-black tracking-widest text-sm sm:text-lg text-slate-100 leading-tight">
              CHRONICA
            </h1>
            <p className="text-[10px] uppercase font-mono tracking-wider text-indigo-400 hidden sm:block">
              TTRPG & Storyteller Engine
            </p>
          </div>
        </div>

        {/* Centro: Azioni & Strumenti di Gioco (Visibile da tablet in su) */}
        <div className="hidden md:flex flex-1 min-w-0 items-center justify-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-1">
          {campaign && (
            <>
              {/* Tasto Scheda Host */}
              <button
                type="button"
                onClick={() => setIsSheetOpen(true)}
                className="h-9 px-2.5 sm:px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer text-slate-200 whitespace-nowrap shrink-0"
                title="Scheda Personaggio"
              >
                <User className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="hidden lg:inline">Scheda</span>
              </button>

              {/* Tasto Mappa */}
              <button
                type="button"
                onClick={() => setIsMapOpen(true)}
                className="h-9 px-2.5 sm:px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer text-slate-200 whitespace-nowrap shrink-0"
                title="Mappa dell'Avventura"
              >
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="hidden lg:inline">Mappa</span>
              </button>

              {/* Tasto Canovaccio / Trama */}
              <button
                type="button"
                onClick={() => setIsStoryOutlineOpen(true)}
                className="h-9 px-2.5 sm:px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-purple-500 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer text-slate-200 whitespace-nowrap shrink-0"
                title="Canovaccio & Trama della Cronaca (Guida per l'IA Narratore)"
              >
                <BookOpen className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="hidden lg:inline">Trama</span>
                {campaign.customStoryOutline?.content && (
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 ml-0.5 animate-pulse shrink-0" />
                )}
              </button>

              {/* Tasto Cast & Personaggi della Cronaca */}
              <button
                type="button"
                onClick={() => setIsCastModalOpen(true)}
                className="h-9 px-2.5 sm:px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer text-slate-200 whitespace-nowrap shrink-0"
                title="Cast e Personaggi della Cronaca (Word/Excel & Controllo IA)"
              >
                <Users className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="hidden lg:inline">Cast</span>
                {campaign.rosterCharacters && campaign.rosterCharacters.length > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30 font-mono shrink-0">
                    {campaign.rosterCharacters.length}
                  </span>
                )}
              </button>
            </>
          )}

          {/* Tasto Schermo del Narratore Ufficiale */}
          <button
            type="button"
            onClick={() => setIsStorytellerScreenOpen(true)}
            className="h-9 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border border-amber-600/70 hover:border-amber-400 text-amber-200 whitespace-nowrap shrink-0"
            title="Schermo del Narratore Ufficiale (Regole, Armi, Prove)"
          >
            <Scroll className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="hidden 2xl:inline">Schermo Narratore</span>
            <span className="2xl:hidden">Schermo</span>
          </button>

          {/* Tasto Tavolo con Amici (QR Code) */}
          <button
            type="button"
            onClick={() => setIsRoomModalOpen(true)}
            className="h-9 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm bg-gradient-to-r from-emerald-950 via-indigo-950 to-slate-900 border border-emerald-500/80 hover:border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.2)] whitespace-nowrap shrink-0"
            title="Connetti gli Smartphone degli Amici (Mostra QR Code)"
          >
            <Users className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Tavolo {connectedPlayers.length > 0 ? `(${connectedPlayers.length})` : '(QR)'}</span>
          </button>
        </div>

        {/* Destra: Sistema, Audio & Menu Profilo */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
          {/* Riproduttore Atmosfera Sonora */}
          <AmbientPlayer />

          {campaign && (
            <>
              {/* Tasto Modalità TV/Cinema */}
              <button
                type="button"
                onClick={() => setIsCinemaMode(!isCinemaMode)}
                className={`h-9 w-9 flex items-center justify-center rounded-xl border transition-colors cursor-pointer shrink-0 ${
                  isCinemaMode ? 'bg-amber-950 border-amber-600 text-amber-200' : 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-slate-300'
                }`}
                title="Attiva/Disattiva Schermo TV"
              >
                <Tv className="w-4 h-4" />
              </button>

              {/* Tasto Rapido Salva & Esci (Desktop) */}
              <button
                type="button"
                onClick={handleSaveAndExitToMenu}
                className="hidden sm:flex h-9 px-2.5 sm:px-3 bg-gradient-to-r from-emerald-900 to-teal-900 hover:from-emerald-800 hover:to-teal-800 border border-emerald-500/80 rounded-xl text-xs font-semibold items-center space-x-1.5 transition-all cursor-pointer text-white shadow-sm whitespace-nowrap shrink-0"
                title="Salva automaticamente la cronaca e torna al menu principale"
              >
                <Save className="w-4 h-4 text-emerald-300 shrink-0" />
                <span className="hidden xl:inline">Salva & Esci</span>
                <span className="xl:hidden">Salva</span>
              </button>
            </>
          )}

          {/* Menu a Discesa Profilo & Gestione Globale */}
          <div ref={profileDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="h-9 px-2 sm:px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/80 rounded-xl flex items-center space-x-1 sm:space-x-1.5 text-xs font-semibold cursor-pointer transition-all shadow-sm"
              title="Opzioni Profilo, Tavolo & Strumenti"
            >
              {currentProfile?.isMaster ? (
                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              )}
              <span className="font-serif font-bold text-slate-200 max-w-[70px] sm:max-w-[120px] truncate">
                {currentProfile ? currentProfile.name : 'Ospite'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {isProfileDropdownOpen && (
              <div className="absolute right-0 top-11 z-50 w-64 max-w-[90vw] bg-slate-900/98 border border-slate-700 rounded-2xl shadow-2xl p-2 space-y-1 backdrop-blur-md animate-fadeIn font-sans">
                <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span>Ruolo:</span>
                  <span className="font-bold text-indigo-300">
                    {currentProfile?.isMaster ? 'Master Narratore' : 'Giocatore'}
                  </span>
                </div>

                {/* Voci rapide per Mobile & Desktop: Tavolo con Amici e Schermo Narratore */}
                <button
                  type="button"
                  onClick={() => {
                    setIsRoomModalOpen(true);
                    setIsProfileDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-bold text-emerald-200 hover:text-white bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-600/40 rounded-xl flex items-center space-x-2.5 transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Avvia Tavolo Condiviso (QR Code)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsJoinRoomModalOpen(true);
                    setManualRoomInput('');
                    setJoinRoomError('');
                    setIsProfileDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-cyan-200 hover:text-white bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-600/30 rounded-xl flex items-center space-x-2.5 transition-colors cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Partecipa a un Tavolo con Codice</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsStorytellerScreenOpen(true);
                    setIsProfileDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-amber-200 hover:text-white bg-amber-950/30 hover:bg-amber-900/50 border border-amber-600/30 rounded-xl flex items-center space-x-2.5 transition-colors cursor-pointer"
                >
                  <Scroll className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Schermo Narratore (Regole & Armi)</span>
                </button>

                {/* Tutorial Passo-Passo */}
                <button
                  type="button"
                  onClick={() => {
                    setIsTutorialOpen(true);
                    setIsProfileDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-amber-300 hover:text-white hover:bg-slate-800 rounded-xl flex items-center space-x-2.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Come si Gioca (Tutorial)</span>
                </button>

                {/* Guida Rapida */}
                <button
                  type="button"
                  onClick={() => {
                    setIsGuideOpen(true);
                    setIsProfileDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl flex items-center space-x-2.5 transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Guida Rapida alle Regole</span>
                </button>

                {/* Impostazioni */}
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(true);
                    setIsProfileDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl flex items-center space-x-2.5 transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Impostazioni & Server</span>
                </button>

                <div className="my-1 border-t border-slate-800" />

                <button
                  type="button"
                  onClick={() => {
                    setIsChronicleSlotsOpen(true);
                    setIsProfileDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-slate-200 hover:text-white hover:bg-indigo-950/70 rounded-xl flex items-center space-x-2.5 transition-colors cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Salva & Carica Cronache</span>
                </button>

                {currentProfile?.isMaster && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileManageOpen(true);
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-amber-200 hover:text-white hover:bg-amber-950/70 rounded-xl flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <Key className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Gestione Profili & Password</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileModalOpen(true);
                    setIsProfileDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl flex items-center space-x-2.5 transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Cambia Profilo</span>
                </button>

                {campaign && (
                  <>
                    <div className="my-1 border-t border-slate-800" />
                    <button
                      type="button"
                      onClick={() => {
                        handleSaveAndExitToMenu();
                        setIsProfileDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-bold text-red-300 hover:text-white hover:bg-red-950/70 rounded-xl flex items-center space-x-2.5 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-red-400 shrink-0" />
                      <span>Salva & Esci al Menu</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col min-h-0 ${!campaign ? 'p-2 sm:p-4 overflow-y-auto overflow-x-hidden' : 'p-0 overflow-hidden'}`}>
        {!campaign ? (
          <div className="flex-1 flex items-start sm:items-center justify-center p-1 sm:p-2 w-full">
            <CampaignWizard
              onStartCampaign={handleStartCampaign}
              onOpenLoadChronicle={() => setIsChronicleSlotsOpen(true)}
              onOpenTutorial={() => setIsTutorialOpen(true)}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-row overflow-hidden w-full h-full">
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
              <CombatInitiativeBar
                isCombatActive={isCombatActive}
                isInitiativePending={isInitiativePending}
                roundNumber={roundNumber}
                initiativeOrder={initiativeOrder}
                activeCombatantId={activeTurnPlayerId}
                connectedPlayersCount={connectedPlayers.length}
                connectedPlayers={connectedPlayers}
                activeEnemies={activeEnemies}
                activeObstacle={activeObstacle}
                playerName={character ? character.name : 'Tavolo'}
                onStartCombatAndRoll={() => handleStartCombatAndRoll()}
                onRollMyInitiative={handleRollMyInitiative}
                onForceCompleteInitiative={handleForceCompleteInitiative}
                onAdvanceTurn={advanceTurn}
                onDelayAction={handleDelayAction}
                onSelectCombatant={(entry) => {
                  setActiveTurnPlayerId(entry.id);
                  setActiveTurnPlayerName(entry.name);
                  multiplayer.setActiveTurn(entry.id, entry.name, roundNumber);
                }}
                onAddEnemySpec={handleAddEnemySpec}
                onRemoveCombatant={handleRemoveCombatant}
                onDamageEnemy={handleDamageEnemy}
                onHealEnemy={handleHealEnemy}
                onRollForObstacle={(obs) => {
                  const attrInfo = obs.attribute && character ? getAttributeValue(character, obs.attribute) : undefined;
                  const abilInfo = obs.ability && character ? getAbilityValue(character, obs.ability) : undefined;
                  setDiceTraits({
                    attr: attrInfo ? { name: attrInfo.key, value: attrInfo.value } : undefined,
                    ability: abilInfo?.key ? { name: abilInfo.key, value: abilInfo.value } : undefined,
                    difficulty: 8,
                    reason: `Superare Ostacolo: ${obs.name} (${obs.currentSuccesses}/${obs.successesNeeded} successi)`,
                  });
                  setIsDiceOpen(true);
                }}
                onClearObstacle={() => setActiveObstacle(null)}
                onEndCombat={() => {
                  setIsCombatActive(false);
                  setIsInitiativePending(false);
                  setInitiativeOrder([]);
                  setActiveEnemies([]);
                }}
              />
              <StoryFeed
                messages={messages}
                campaign={campaign}
                character={character}
                isLoading={isLoading}
                isInitiativePending={isInitiativePending}
                hasHostRolledInitiative={Boolean(initiativeOrder.find((c) => c.id === 'host')?.hasRolled)}
                onRollInitiative={handleRollMyInitiative}
                onSendAction={handleSendAction}
                onOpenDiceModal={() => {
                  setDiceTraits({});
                  setIsDiceOpen(true);
                }}
                onOpenSheetModal={() => setIsSheetOpen(true)}
                onOpenMapModal={() => setIsMapOpen(true)}
                onTriggerRequiredRoll={handleTriggerRequiredRoll}
                onCollectItem={handleCollectItem}
                claimedLoot={claimedLoot}
                onAskNarrator={handleAskNarrator}
                onOpenHandoutModal={(h) => setActiveHandoutModal(h)}
              />
            </div>

            {/* Pannello Tattico Laterale Desktop (Mappe del Mondo, Blueprint Tattici, Reperti Antichi) */}
            <div className="hidden md:flex h-full shrink-0">
              <TacticalSidePanel
                campaign={campaign}
                characterName={character?.name}
                party={getPartySnapshot()}
                activeEnemies={activeEnemies}
                discoveredHandouts={discoveredHandouts}
                onSelectMap={(mapId) => {
                  const updated = { ...campaign, activeMapId: mapId };
                  setCampaign(updated);
                  safeLocalStorageSet('chronica_campaign', JSON.stringify(updated));
                }}
                onOpenFullMapModal={() => setIsMapOpen(true)}
                onOpenHandoutModal={(h) => setActiveHandoutModal(h)}
                onAskTacticalUpdate={() => handleAskNarrator('Mostrami la disposizione tattica e le coperture della zona con uno schizzo tattico.')}
              />
            </div>
          </div>
        )}
      </main>

      {/* Modale Stanza Tavolo Condiviso (QR Code) */}
      <TabletopRoomModal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        roomCode={roomCode}
        players={connectedPlayers}
        onToggleCinemaMode={() => setIsCinemaMode(!isCinemaMode)}
        isCinemaMode={isCinemaMode}
        onRegenerateRoomCode={() => {
          const fresh = `CHR-${Math.floor(100 + Math.random() * 900)}`;
          setRoomCode(fresh);
          localStorage.setItem('chronica_room_code', fresh);
          if (campaign) multiplayer.createRoom(fresh, campaign);
        }}
      />

      {/* Modale Scheda */}
      {character && (
        <CharacterSheetModal
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          character={character}
          onUpdateCharacter={setCharacter}
          onOpenDiceWithTraits={handleOpenDiceWithTraits}
        />
      )}

      {/* Modale Dadi d10 */}
      <DiceRollerModal
        isOpen={isDiceOpen}
        onClose={() => setIsDiceOpen(false)}
        character={character}
        activeEnemies={activeEnemies}
        initialAttribute={diceTraits.attr}
        initialAbility={diceTraits.ability}
        initialDifficulty={diceTraits.difficulty || 8}
        initialReason={diceTraits.reason || ''}
        initialSituationalMod={diceTraits.modifier || 0}
        onSendRollToStory={handleSendRollToStory}
        onUpdateCharacter={(updated) => {
          setCharacter(updated);
          safeLocalStorageSet('chronica_character', JSON.stringify(updated));
          multiplayer.updateCharacter(updated);
        }}
      />

      {/* Modale Mappa */}
      {campaign && (
        <CityMapModal
          isOpen={isMapOpen}
          onClose={() => setIsMapOpen(false)}
          cityName={campaign.city}
          era={campaign.era}
          campaign={campaign}
          onUpdateMaps={(updatedMaps, activeId) => {
            const updatedCampaign: CampaignConfig = {
              ...campaign,
              maps: updatedMaps,
              activeMapId: activeId,
            };
            setCampaign(updatedCampaign);
            safeLocalStorageSet('chronica_campaign', JSON.stringify(updatedCampaign));
            multiplayer.updateCampaign(updatedCampaign);
          }}
        />
      )}

      {/* Modale Canovaccio Trama dell'Autore */}
      {campaign && (
        <StoryOutlineModal
          isOpen={isStoryOutlineOpen}
          onClose={() => setIsStoryOutlineOpen(false)}
          campaign={campaign}
          onUpdateStoryOutline={(updatedOutline) => {
            const updatedCampaign: CampaignConfig = {
              ...campaign,
              customStoryOutline: updatedOutline,
            };
            setCampaign(updatedCampaign);
            safeLocalStorageSet('chronica_campaign', JSON.stringify(updatedCampaign));
            if (character) {
              saveChronicleToServer(
                updatedCampaign,
                character,
                messages,
                currentProfile?.id || 'default',
                currentProfile?.name || 'Narratore'
              );
            }
          }}
        />
      )}

      {/* Modale Cast & Personaggi della Cronaca */}
      {campaign && (
        <ChronicleCastModal
          isOpen={isCastModalOpen}
          onClose={() => setIsCastModalOpen(false)}
          campaign={campaign}
          connectedPlayers={connectedPlayers}
          hostCharacter={character}
          onUpdateCast={(updatedRoster) => {
            const updatedCampaign: CampaignConfig = {
              ...campaign,
              rosterCharacters: updatedRoster,
            };
            setCampaign(updatedCampaign);
            safeLocalStorageSet('chronica_campaign', JSON.stringify(updatedCampaign));
            multiplayer.updateCampaign(updatedCampaign);
            if (character) {
              saveChronicleToServer(
                updatedCampaign,
                character,
                messages,
                currentProfile?.id || 'default',
                currentProfile?.name || 'Narratore'
              );
            }
          }}
        />
      )}

      {/* Modale Impostazioni & Salvataggi */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        campaign={campaign}
        character={character}
        messages={messages}
        onLoadChronicle={(data) => {
          setCampaign(data.campaign);
          setCharacter(data.character || null);
          setMessages(data.messages);
        }}
        onResetCampaign={campaign ? handleResetCampaign : undefined}
      />

      {/* Modale Selezione Profilo con PIN */}
      <ProfileSelectModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentProfile={currentProfile}
        onSelectProfile={(p) => {
          setCurrentProfile(p);
          setIsProfileModalOpen(false);
        }}
        onOpenManagement={() => {
          setIsProfileModalOpen(false);
          setIsProfileManageOpen(true);
        }}
        onOpenTutorial={() => {
          setIsTutorialOpen(true);
        }}
      />

      {/* Modale Gestione Profili & Password Master */}
      <ProfileManagementModal
        isOpen={isProfileManageOpen}
        onClose={() => setIsProfileManageOpen(false)}
        currentProfile={currentProfile}
        onUpdateActiveProfile={(updated) => {
          setCurrentProfile(updated);
          localStorage.setItem('chronica_active_profile', JSON.stringify(updated));
        }}
      />

      {/* Modale Salva & Carica Cronache */}
      <ChronicleSlotsModal
        isOpen={isChronicleSlotsOpen}
        onClose={() => setIsChronicleSlotsOpen(false)}
        currentProfile={currentProfile}
        activeCampaign={campaign}
        activeCharacter={character || undefined}
        activeMessages={messages}
        onLoadChronicle={handleLoadChronicle}
        onSaveAndExitToMenu={handleSaveAndExitToMenu}
        onStartNewCampaign={() => {
          setCampaign(null);
          setMessages([]);
          setActiveEnemies([]);
          localStorage.removeItem('chronica_campaign');
          localStorage.removeItem('chronica_messages');
          localStorage.removeItem('chronica_active_enemies');
        }}
        onChangeProfile={() => {
          setIsChronicleSlotsOpen(false);
          setIsProfileModalOpen(true);
        }}
      />
      {/* Modale Tutorial Passo-Passo */}
      <GameTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />

      {/* Modale Guida Rapida */}
      <QuickGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Modale Schermo del Narratore Ufficiale */}
      <StorytellerScreenModal
        isOpen={isStorytellerScreenOpen}
        onClose={() => setIsStorytellerScreenOpen(false)}
      />

      {/* Modale Reperto Visivo Antico / Pergamena / Rune (Esclusivo PC / Tavolo) */}
      <HandoutViewModal
        handout={activeHandoutModal}
        isOpen={Boolean(activeHandoutModal)}
        onClose={() => setActiveHandoutModal(null)}
      />

      {/* Modale Partecipa a un Tavolo con Codice Stanza */}
      {isJoinRoomModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="max-w-md w-full bg-slate-900 border border-cyan-800/80 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-cyan-300">
                <Smartphone className="w-5 h-5 text-cyan-400" />
                <h3 className="font-serif font-black text-base text-slate-100">
                  Partecipa a un Tavolo di Gioco
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsJoinRoomModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 font-serif leading-relaxed">
              Inserisci il codice della stanza del Narratore (es. <strong>CHR-123</strong>) per collegarti al tavolo col tuo smartphone o browser:
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const code = manualRoomInput.trim().toUpperCase();
                if (!code) {
                  setJoinRoomError('Inserisci un codice valido (es. CHR-123)');
                  return;
                }
                setIsJoinRoomModalOpen(false);
                if (onJoinTabletopRoom) {
                  onJoinTabletopRoom(code);
                } else {
                  window.location.href = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(code)}`;
                }
              }}
              className="space-y-3"
            >
              <div>
                <input
                  type="text"
                  value={manualRoomInput}
                  onChange={(e) => {
                    setManualRoomInput(e.target.value.toUpperCase());
                    setJoinRoomError('');
                  }}
                  placeholder="Es. CHR-456"
                  className="w-full text-center tracking-widest font-mono font-black text-lg bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-100 uppercase"
                />
                {joinRoomError && (
                  <p className="text-[11px] text-red-400 font-mono mt-1.5 text-center">{joinRoomError}</p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsJoinRoomModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-serif text-xs cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={!manualRoomInput.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 text-white font-serif font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg disabled:opacity-40"
                >
                  Entra nel Tavolo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function App() {
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const urlRoomCode = urlParams?.get('room');

  // Si attiva la schermata mobile di gioco del Tavolo SOLO SE l'utente apre un link con ?room=
  // (es. inquadrando il QR Code del tavolo o cliccando un link d'invito esplicito)
  const [activeMobileRoom, setActiveMobileRoom] = useState<string | null>(() => {
    return urlRoomCode || null;
  });

  const handleExitMobile = () => {
    localStorage.removeItem('chronica_current_mobile_room');
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    setActiveMobileRoom(null);
    window.location.href = window.location.origin + window.location.pathname;
  };

  // Se è presente ?room=XXX, apri la vista controller dedicata al tavolo del Narratore
  if (activeMobileRoom) {
    return (
      <MobilePlayerView
        roomCode={activeMobileRoom}
        onExitRoom={handleExitMobile}
      />
    );
  }

  // Se l'utente visita il link principale senza ?room=, accede a Chronica completa
  // (da Mobile, Tablet o PC) con il proprio profilo personale, i suoi salvataggi e le sue storie!
  return <HostApp onJoinTabletopRoom={(code) => setActiveMobileRoom(code)} />;
}

export default App;
