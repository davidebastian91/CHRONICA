import type {
  Character,
  DiceRollResult,
  StoryMessage,
  CampaignConfig,
  ActiveCombatEnemy,
  DynamicObstacle,
} from '../types';
import type { CombatantInitiativeEntry } from '../utils/wodCombatRules';

export interface RoomCombatState {
  isCombatActive: boolean;
  roundNumber: number;
  initiativeOrder: CombatantInitiativeEntry[];
  activeCombatantId?: string;
  activeCombatantName?: string;
  activeEnemies: ActiveCombatEnemy[];
  activeObstacle: DynamicObstacle | null;
  targetPlayerIdForEnemyAttack?: string;
  targetPlayerNameForEnemyAttack?: string;
  isInitiativePending?: boolean;
}

export interface RoomPlayer {
  id: string;
  name: string;
  character: Character;
  joinedAt: number;
}

export type SocketMessage =
  | { type: 'CREATE_ROOM'; roomCode: string; campaign: CampaignConfig }
  | { type: 'UPDATE_CAMPAIGN'; roomCode: string; campaign: CampaignConfig }
  | { type: 'CAMPAIGN_UPDATED'; campaign: CampaignConfig }
  | { type: 'JOIN_ROOM'; roomCode: string; player: RoomPlayer }
  | { type: 'UPDATE_CHARACTER'; roomCode: string; playerId: string; character: Character }
  | { type: 'PLAYER_ACTION'; roomCode: string; playerId: string; playerName: string; action: string }
  | { type: 'PLAYER_QUESTION'; roomCode: string; playerId: string; playerName: string; question: string }
  | { type: 'DICE_ROLL'; roomCode: string; playerId: string; playerName: string; roll: DiceRollResult; comment?: string }
  | { type: 'STORY_UPDATE'; roomCode: string; message: StoryMessage }
  | {
      type: 'ROOM_STATE';
      roomCode: string;
      players: RoomPlayer[];
      campaign?: CampaignConfig;
      messages: StoryMessage[];
      claimedLoot?: Record<string, { playerId: string; playerName: string; itemName: string; timestamp: number }>;
      activeTurnPlayerId?: string;
      activeTurnPlayerName?: string;
      roundNumber?: number;
      combatState?: RoomCombatState;
    }
  | { type: 'PLAYER_JOINED'; player: RoomPlayer; isReconnecting?: boolean }
  | { type: 'PLAYER_LEFT'; playerId: string }
  | { type: 'CLAIM_LOOT'; roomCode: string; lootId: string; playerId: string; playerName: string; itemName: string }
  | { type: 'LOOT_CLAIMED'; roomCode: string; lootId: string; playerId: string; playerName: string; itemName: string }
  | { type: 'LOOT_ALREADY_CLAIMED'; lootId: string; claimedInfo?: any }
  | { type: 'SET_ACTIVE_TURN'; roomCode: string; activeTurnPlayerId: string; activeTurnPlayerName: string; roundNumber?: number }
  | { type: 'TURN_CHANGED'; roomCode: string; activeTurnPlayerId: string; activeTurnPlayerName: string; roundNumber: number }
  | { type: 'SYNC_COMBAT_STATE'; roomCode: string; combatState: RoomCombatState }
  | { type: 'COMBAT_STATE_CHANGED'; roomCode: string; combatState: RoomCombatState }
  | {
      type: 'RESOLVE_ENEMY_DEFENSE';
      roomCode: string;
      enemyId: string;
      playerId: string;
      playerName: string;
      isPlayerDodging: boolean;
    }
  | { type: 'PING' }
  | { type: 'PONG' }
  | { type: 'ERROR'; message: string };

type MessageHandler = (msg: SocketMessage) => void;

class MultiplayerClient {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private currentRoomCode: string | null = null;
  private lastCampaign: CampaignConfig | null = null;
  private isHost: boolean = false;
  private currentPlayer: RoomPlayer | null = null;
  private isConnected: boolean = false;
  private targetUrl: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const handleWakeup = () => {
        // Se la tab torna in primo piano (sblocco schermo, switch app), verifica connessione
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          this.reconnectImmediate();
        }
      };

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          handleWakeup();
        }
      });
      window.addEventListener('focus', handleWakeup);
      window.addEventListener('pageshow', handleWakeup);
      window.addEventListener('online', handleWakeup);
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'PING' }));
        } catch {}
      }
    }, 10000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public reconnectImmediate() {
    clearTimeout(this.reconnectTimer);
    if (this.currentRoomCode) {
      this.connect(this.targetUrl || undefined);
    }
  }

  public connect(url?: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve(true);
        return;
      }

      if (url) {
        this.targetUrl = url;
      } else if (!this.targetUrl && typeof window !== 'undefined') {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.targetUrl = `${protocol}//${window.location.host}/ws`;
      }

      const connectionUrl = this.targetUrl || 'ws://localhost:5173/ws';

      try {
        if (this.ws) {
          try {
            this.ws.close();
          } catch {}
        }

        this.ws = new WebSocket(connectionUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.startHeartbeat();

          // Se avevamo una stanza attiva, ri-sincronizza istantaneamente
          if (this.currentRoomCode) {
            if (this.isHost && this.lastCampaign) {
              this.send({ type: 'CREATE_ROOM', roomCode: this.currentRoomCode, campaign: this.lastCampaign });
            } else if (!this.isHost && this.currentPlayer) {
              this.send({ type: 'JOIN_ROOM', roomCode: this.currentRoomCode, player: this.currentPlayer });
            }
          }
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const data: SocketMessage = JSON.parse(event.data);
            if (data.type === 'PONG') {
              return; // Heartbeat ricevuto correttamente
            }
            this.handlers.forEach((h) => h(data));
          } catch (e) {
            console.warn('Errore parsing messaggio websocket:', e);
          }
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.stopHeartbeat();

          // Tenta riconnessione automatica dopo 2 secondi
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            if (this.currentRoomCode) {
              this.connect(this.targetUrl || undefined);
            }
          }, 2000);
        };

        this.ws.onerror = () => {
          resolve(false);
        };
      } catch (err) {
        console.warn('Impossibile connettere websocket:', err);
        resolve(false);
      }
    });
  }

  public subscribe(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public send(msg: SocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public createRoom(roomCode: string, campaign: CampaignConfig) {
    this.currentRoomCode = roomCode;
    this.lastCampaign = campaign;
    this.isHost = true;
    this.send({ type: 'CREATE_ROOM', roomCode, campaign });
  }

  public joinRoom(roomCode: string, player: RoomPlayer) {
    this.currentRoomCode = roomCode;
    this.isHost = false;
    this.currentPlayer = player;
    this.send({ type: 'JOIN_ROOM', roomCode, player });
  }

  public updateCharacter(character: Character) {
    if (!this.currentRoomCode || !this.currentPlayer) return;
    this.currentPlayer.character = character;
    this.send({
      type: 'UPDATE_CHARACTER',
      roomCode: this.currentRoomCode,
      playerId: this.currentPlayer.id,
      character,
    });
  }

  public sendAction(action: string) {
    if (!this.currentRoomCode || !this.currentPlayer) return;
    this.send({
      type: 'PLAYER_ACTION',
      roomCode: this.currentRoomCode,
      playerId: this.currentPlayer.id,
      playerName: this.currentPlayer.name,
      action,
    });
  }

  public askQuestion(question: string) {
    if (!this.currentRoomCode || !this.currentPlayer) return;
    this.send({
      type: 'PLAYER_QUESTION',
      roomCode: this.currentRoomCode,
      playerId: this.currentPlayer.id,
      playerName: this.currentPlayer.name,
      question,
    });
  }

  public rollDice(roll: DiceRollResult, comment?: string) {
    if (!this.currentRoomCode || !this.currentPlayer) return;
    this.send({
      type: 'DICE_ROLL',
      roomCode: this.currentRoomCode,
      playerId: this.currentPlayer.id,
      playerName: this.currentPlayer.name,
      roll,
      comment,
    });
  }

  public broadcastStory(message: StoryMessage) {
    if (!this.currentRoomCode) return;
    this.send({
      type: 'STORY_UPDATE',
      roomCode: this.currentRoomCode,
      message,
    });
  }

  public updateCampaign(campaign: CampaignConfig) {
    this.lastCampaign = campaign;
    if (!this.currentRoomCode) return;
    this.send({
      type: 'UPDATE_CAMPAIGN',
      roomCode: this.currentRoomCode,
      campaign,
    });
  }

  public claimLoot(lootId: string, itemName: string) {
    if (!this.currentRoomCode || !this.currentPlayer) return;
    this.send({
      type: 'CLAIM_LOOT',
      roomCode: this.currentRoomCode,
      lootId,
      playerId: this.currentPlayer.id,
      playerName: this.currentPlayer.name,
      itemName,
    });
  }

  public setActiveTurn(activeTurnPlayerId: string, activeTurnPlayerName: string, roundNumber?: number) {
    if (!this.currentRoomCode) return;
    this.send({
      type: 'SET_ACTIVE_TURN',
      roomCode: this.currentRoomCode,
      activeTurnPlayerId,
      activeTurnPlayerName,
      roundNumber,
    });
  }

  public syncCombatState(combatState: RoomCombatState) {
    if (!this.currentRoomCode) return;
    this.send({
      type: 'SYNC_COMBAT_STATE',
      roomCode: this.currentRoomCode,
      combatState,
    });
  }

  public resolveEnemyDefense(enemyId: string, isPlayerDodging: boolean) {
    if (!this.currentRoomCode || !this.currentPlayer) return;
    this.send({
      type: 'RESOLVE_ENEMY_DEFENSE',
      roomCode: this.currentRoomCode,
      enemyId,
      playerId: this.currentPlayer.id,
      playerName: this.currentPlayer.name,
      isPlayerDodging,
    });
  }

  public getStatus() {
    return {
      isConnected: this.isConnected,
      roomCode: this.currentRoomCode,
      isHost: this.isHost,
    };
  }
}

export const multiplayer = new MultiplayerClient();
