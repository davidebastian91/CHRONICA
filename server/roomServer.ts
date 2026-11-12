import { WebSocketServer, WebSocket } from 'ws';

interface RoomData {
  roomCode: string;
  hostWs: WebSocket | null;
  campaign?: any;
  messages: any[];
  players: Map<string, { player: any; ws: WebSocket }>;
}

export function setupRoomWebSocketServer(server: any) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const rooms = new Map<string, RoomData>();

  console.log('[Chronica WS] WebSocket Server attivo su /ws');

  wss.on('connection', (ws) => {
    let currentRoomCode: string | null = null;
    let currentPlayerId: string | null = null;
    let isHost = false;

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        // 1. CREAZIONE STANZA (Host PC)
        if (msg.type === 'CREATE_ROOM') {
          const { roomCode, campaign } = msg;
          currentRoomCode = roomCode;
          isHost = true;

          let room = rooms.get(roomCode);
          if (!room) {
            room = {
              roomCode,
              hostWs: ws,
              campaign,
              messages: [],
              players: new Map(),
            };
            rooms.set(roomCode, room);
          } else {
            room.hostWs = ws;
            if (campaign) room.campaign = campaign;
          }

          console.log(`[Chronica WS] Stanza creata/aggiornata: ${roomCode}`);
          const playersList = Array.from(room.players.values()).map((p) => p.player);
          ws.send(JSON.stringify({
            type: 'ROOM_STATE',
            roomCode,
            players: playersList,
            campaign: room.campaign,
            messages: room.messages,
          }));
        }

        // 2. GIOCATORE ENTRA DA CELLULARE
        else if (msg.type === 'JOIN_ROOM') {
          const { roomCode, player } = msg;
          currentRoomCode = roomCode;
          currentPlayerId = player.id;
          isHost = false;

          let room = rooms.get(roomCode);
          if (!room) {
            // Se la stanza non esiste ancora, creala vuota
            room = {
              roomCode,
              hostWs: null,
              messages: [],
              players: new Map(),
            };
            rooms.set(roomCode, room);
          }

          room.players.set(player.id, { player, ws });
          console.log(`[Chronica WS] Giocatore ${player.name} (${player.id}) entrato nella stanza ${roomCode}`);

          // Notifica l'host se presente
          if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
            room.hostWs.send(JSON.stringify({ type: 'PLAYER_JOINED', player }));
          }

          // Invia lo stato completo della stanza al nuovo giocatore
          const playersList = Array.from(room.players.values()).map((p) => p.player);
          ws.send(JSON.stringify({
            type: 'ROOM_STATE',
            roomCode,
            players: playersList,
            campaign: room.campaign,
            messages: room.messages,
          }));
        }

        // 3. GIOCATORE AGGIORNA LA SCHEDA DA CELLULARE
        else if (msg.type === 'UPDATE_CHARACTER') {
          const { roomCode, playerId, character } = msg;
          const room = rooms.get(roomCode);
          if (room) {
            const p = room.players.get(playerId);
            if (p) {
              p.player.character = character;
              // Invia all'Host PC
              if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
                room.hostWs.send(JSON.stringify({
                  type: 'UPDATE_CHARACTER',
                  roomCode,
                  playerId,
                  character,
                }));
              }
            }
          }
        }

        // 4. GIOCATORE LANCIA DADI DA CELLULARE
        else if (msg.type === 'DICE_ROLL') {
          const { roomCode } = msg;
          const room = rooms.get(roomCode);
          if (room) {
            console.log(`[Chronica WS] Lancio dadi da ${msg.playerName} nella stanza ${roomCode}`);
            // Invia all'Host PC
            if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
              room.hostWs.send(JSON.stringify(msg));
            }
            // Invia a tutti gli altri giocatori
            room.players.forEach(({ ws: playerWs }) => {
              if (playerWs.readyState === WebSocket.OPEN) {
                playerWs.send(JSON.stringify(msg));
              }
            });
          }
        }

        // 5. NARRATORE AGGIORNA LA STORIA (dal PC a tutti i telefoni)
        else if (msg.type === 'STORY_UPDATE') {
          const { roomCode, message } = msg;
          const room = rooms.get(roomCode);
          if (room) {
            room.messages.push(message);
            // Inoltra a tutti i telefoni connessi
            room.players.forEach(({ ws: playerWs }) => {
              if (playerWs.readyState === WebSocket.OPEN) {
                playerWs.send(JSON.stringify({ type: 'STORY_UPDATE', roomCode, message }));
              }
            });
          }
        }
      } catch (err) {
        console.error('[Chronica WS] Errore gestione messaggio:', err);
      }
    });

    ws.on('close', () => {
      if (currentRoomCode) {
        const room = rooms.get(currentRoomCode);
        if (room) {
          if (isHost) {
            console.log(`[Chronica WS] Host disconnesso dalla stanza ${currentRoomCode}`);
            room.hostWs = null;
          } else if (currentPlayerId) {
            console.log(`[Chronica WS] Giocatore ${currentPlayerId} disconnesso dalla stanza ${currentRoomCode}`);
            room.players.delete(currentPlayerId);
            if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
              room.hostWs.send(JSON.stringify({ type: 'PLAYER_LEFT', playerId: currentPlayerId }));
            }
          }
        }
      }
    });
  });

  return wss;
}

