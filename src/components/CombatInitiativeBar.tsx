import React, { useState } from 'react';
import type { ActiveCombatEnemy, DynamicObstacle, EnemySpawnSpec } from '../types';
import type { RoomPlayer } from '../services/multiplayer';
import {
  OFFICIAL_WOD_BESTIARY,
  getEnemyHealthStatus,
  type CombatantInitiativeEntry,
} from '../utils/wodCombatRules';
import {
  Zap,
  Plus,
  RotateCcw,
  X,
  Skull,
  User,
  Dices,
  Swords,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';

interface CombatInitiativeBarProps {
  isCombatActive: boolean;
  isInitiativePending?: boolean;
  roundNumber: number;
  initiativeOrder: CombatantInitiativeEntry[];
  activeCombatantId?: string;
  connectedPlayersCount: number;
  connectedPlayers?: RoomPlayer[];
  activeEnemies: ActiveCombatEnemy[];
  activeObstacle: DynamicObstacle | null;
  playerName: string;
  targetPlayerIdForEnemyAttack?: string;
  onSetTargetPlayerForEnemyAttack?: (playerId: string) => void;
  onStartCombatAndRoll: () => void;
  onRollMyInitiative?: () => void;
  onForceCompleteInitiative?: () => void;
  onAdvanceTurn: () => void;
  onDelayAction: () => void;
  onSelectCombatant: (entry: CombatantInitiativeEntry) => void;
  onAddEnemySpec: (spec: EnemySpawnSpec) => void;
  onRemoveCombatant: (id: string) => void;
  onDamageEnemy: (enemyId: string, damageAmount: number, damageType: 'bashing' | 'lethal' | 'aggravated') => void;
  onHealEnemy: (enemyId: string) => void;
  onTriggerEnemyTurnRoll?: (enemy: ActiveCombatEnemy, isPlayerDodging: boolean, targetPlayerId?: string) => void;
  onRollForObstacle: (obstacle: DynamicObstacle) => void;
  onClearObstacle: () => void;
  onEndCombat: () => void;
}

export const CombatInitiativeBar: React.FC<CombatInitiativeBarProps> = ({
  isCombatActive,
  isInitiativePending,
  roundNumber,
  initiativeOrder,
  activeCombatantId,
  connectedPlayersCount,
  activeEnemies,
  activeObstacle,
  playerName,
  onStartCombatAndRoll,
  onRollMyInitiative,
  onForceCompleteInitiative,
  onAdvanceTurn,
  onDelayAction,
  onSelectCombatant,
  onAddEnemySpec,
  onRemoveCombatant,
  onDamageEnemy,
  onHealEnemy,
  onRollForObstacle,
  onClearObstacle,
  onEndCombat,
}) => {
  const [showAddEnemy, setShowAddEnemy] = useState(false);
  const [showEnemiesDetail, setShowEnemiesDetail] = useState(false);
  const [selectedBestiaryIdx, setSelectedBestiaryIdx] = useState<number>(0);
  const [customEnemyName, setCustomEnemyName] = useState('');
  const [customEnemyHealth, setCustomEnemyHealth] = useState(7);
  const [customEnemyDefense, setCustomEnemyDefense] = useState(2);
  const [customEnemyArmor, setCustomEnemyArmor] = useState(1);
  const [customEnemyInitMod, setCustomEnemyInitMod] = useState(5);
  const [customEnemyAttackPool, setCustomEnemyAttackPool] = useState(6);

  // Filtra l'ordine di iniziativa per mostrare SOLO i Giocatori (Opzione A)
  const playerEntries = initiativeOrder.filter((c) => !c.isEnemy);
  const activeCombatant =
    playerEntries.find((c) => c.id === activeCombatantId) || playerEntries[0];

  const handleSelectBestiaryPreset = (idx: number) => {
    setSelectedBestiaryIdx(idx);
    const preset = OFFICIAL_WOD_BESTIARY[idx];
    if (preset) {
      setCustomEnemyName(preset.name);
      setCustomEnemyHealth(preset.maxHealth);
      setCustomEnemyDefense(preset.defense);
      setCustomEnemyArmor(preset.armor);
      setCustomEnemyInitMod(preset.initiativeMod);
      setCustomEnemyAttackPool(preset.attackPool);
    }
  };

  const handleConfirmAddEnemy = (e: React.FormEvent) => {
    e.preventDefault();
    const preset = OFFICIAL_WOD_BESTIARY[selectedBestiaryIdx];
    const finalName = customEnemyName.trim() || preset?.name || 'Avversario Ostile';
    onAddEnemySpec({
      name: finalName,
      creatureType: preset?.creatureType || 'mortal',
      maxHealth: customEnemyHealth,
      defense: customEnemyDefense,
      armor: customEnemyArmor,
      initiativeMod: customEnemyInitMod,
      attackPool: customEnemyAttackPool,
      attackName: preset?.attackName || 'Attacco Ostile',
      damageType: preset?.damageType || 'lethal',
      notes: preset?.notes,
    });
    setCustomEnemyName('');
    setShowAddEnemy(false);
  };

  return (
    <div className="max-w-5xl mx-auto w-full mb-2 space-y-2 shrink-0">
      {/* 1. OSTACOLO IN CORSA (INSEGUIMENTI / SFONDAMENTI) */}
      {activeObstacle && !activeObstacle.resolved && (
        <div className="bg-gradient-to-r from-amber-950/90 via-slate-950 to-amber-950/80 border border-amber-500/80 rounded-xl px-3.5 py-2.5 shadow-lg animate-fadeIn flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2.5">
            <span className="text-lg">🚧</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-black">
                  Ostacolo
                </span>
                <h4 className="font-serif font-bold text-xs sm:text-sm text-amber-200">
                  {activeObstacle.name}
                </h4>
              </div>
              <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                Richiesti <strong className="text-amber-300">{activeObstacle.successesNeeded} successi</strong> per superarlo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="bg-slate-950 px-2.5 py-1 rounded-lg border border-amber-700/60 flex items-center gap-1.5 text-xs font-mono">
              <span className="text-slate-400">Progresso:</span>
              <span className="font-bold text-amber-300">
                {activeObstacle.currentSuccesses}/{activeObstacle.successesNeeded}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onRollForObstacle(activeObstacle)}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 text-white font-serif font-bold text-xs rounded-lg shadow flex items-center gap-1.5 cursor-pointer"
            >
              <Dices className="w-3.5 h-3.5 text-amber-200" />
              <span>Tira Dadi</span>
            </button>

            <button
              type="button"
              onClick={onClearObstacle}
              title="Rimuovi Ostacolo"
              className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. BARRA DI GIOCO */}
      {!isCombatActive ? (
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl px-3.5 py-2 shadow-sm flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <Swords className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Fase Narrativa Libera
              {connectedPlayersCount > 0 ? ` • ${connectedPlayersCount + 1} Eroi al Tavolo` : ''}
            </span>
          </div>

          <button
            type="button"
            onClick={onStartCombatAndRoll}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-700 via-red-800 to-slate-900 hover:from-amber-600 border border-amber-500/70 text-amber-100 font-serif font-bold text-xs rounded-lg shadow transition-all flex items-center space-x-1.5 cursor-pointer"
            title="Attiva lo scontro con iniziativa e schede salute dei nemici"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>⚔️ Inizia Combattimento</span>
          </button>
        </div>
      ) : isInitiativePending ? (
        /* FASE D'INIZIATIVA (I GIOCATORI TIRANO I DADI) */
        <div className="bg-slate-950/95 border-2 border-amber-500/80 rounded-xl p-3 shadow-xl space-y-2.5 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-600/40 pb-2">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
              <h4 className="font-serif font-black text-xs sm:text-sm text-amber-200">
                FASE DI INIZIATIVA — TIRATE I DADI PER LO SCONTRO!
              </h4>
            </div>

            <div className="flex items-center gap-2">
              {onRollMyInitiative && !initiativeOrder.find((c) => c.id === 'host')?.hasRolled && (
                <button
                  type="button"
                  onClick={onRollMyInitiative}
                  className="px-3 py-1 bg-gradient-to-r from-amber-600 to-red-700 hover:from-amber-500 text-white font-serif font-bold text-xs rounded-lg shadow transition-all flex items-center space-x-1.5 cursor-pointer animate-bounce"
                >
                  <Dices className="w-3.5 h-3.5 text-amber-200" />
                  <span>🎲 Tira la Tua Iniziativa!</span>
                </button>
              )}

              {onForceCompleteInitiative && (
                <button
                  type="button"
                  onClick={onForceCompleteInitiative}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px] rounded-lg cursor-pointer"
                  title="Completa automaticamente l'iniziativa per chi non ha ancora tirato e avvia il Round 1"
                >
                  Tira per i Restanti ➔
                </button>
              )}

              <button
                type="button"
                onClick={onEndCombat}
                className="p-1 hover:bg-slate-900 text-slate-500 hover:text-red-400 rounded-lg cursor-pointer transition-colors"
                title="Annulla scontro"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lista Partecipanti con stato del tiro */}
          <div className="flex flex-wrap gap-2 items-center">
            {initiativeOrder.map((c) => (
              <div
                key={c.id}
                className={`px-2.5 py-1 rounded-lg text-xs font-serif flex items-center gap-1.5 border ${
                  c.hasRolled
                    ? 'bg-emerald-950/80 border-emerald-600/70 text-emerald-200'
                    : 'bg-amber-950/40 border-amber-600/50 text-amber-300 animate-pulse'
                }`}
              >
                <User className="w-3 h-3 text-slate-400" />
                <span className="font-bold">{c.name}</span>
                {c.hasRolled ? (
                  <span className="font-mono text-[10px] text-emerald-300 font-bold ml-1">
                    ✓ Iniz. {c.totalInitiative} (Dado: {c.d10Roll} + {c.initiativeMod})
                  </span>
                ) : (
                  <span className="font-mono text-[10px] text-amber-400 italic ml-1">
                    In attesa del tiro...
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* MODALITÀ SCONTRO SNELLA & NARRATIVA (OPZIONE A) */
        <div className="bg-slate-950/95 border border-amber-600/50 rounded-xl p-2.5 shadow-lg space-y-2 animate-fadeIn">
          {/* RIGA 1: Round, Turno Attivo dei Giocatori e Comandi Rapidi */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 bg-amber-950/90 text-amber-300 font-mono text-xs font-bold rounded border border-amber-600/70 uppercase tracking-wide">
                Round {roundNumber}
              </span>

              <div className="flex items-center space-x-1.5">
                <span className="text-xs text-slate-400 font-mono">Tocca a:</span>
                <span className="font-serif font-bold text-xs sm:text-sm px-2.5 py-0.5 rounded-lg border bg-emerald-950/80 border-emerald-500 text-emerald-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{activeCombatant?.name || playerName}</span>
                  {activeCombatant && (
                    <span className="font-mono text-[10px] text-amber-300">
                      [Iniz. {activeCombatant.totalInitiative}]
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Pulsanti Rapidi */}
            <div className="flex items-center gap-1.5">
              {playerEntries.length > 1 && (
                <button
                  type="button"
                  onClick={onDelayAction}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 font-mono text-xs rounded-lg cursor-pointer flex items-center gap-1"
                  title="Ritarda l'azione dopo il prossimo giocatore"
                >
                  <Clock className="w-3 h-3" />
                  <span>Ritarda</span>
                </button>
              )}

              <button
                type="button"
                onClick={onAdvanceTurn}
                className="px-3 py-1 bg-gradient-to-r from-indigo-700 to-emerald-700 hover:from-indigo-600 hover:to-emerald-600 text-white font-serif font-bold text-xs rounded-lg shadow cursor-pointer transition-all flex items-center space-x-1"
                title="Passa al prossimo giocatore"
              >
                <span>Prossimo Turno ➔</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!showAddEnemy) handleSelectBestiaryPreset(0);
                  setShowAddEnemy(!showAddEnemy);
                }}
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-red-300 font-mono text-xs rounded-lg cursor-pointer"
                title="Aggiungi un nemico"
              >
                <Plus className="w-3 h-3 inline mr-0.5" />
                <span>Nemico</span>
              </button>

              <button
                type="button"
                onClick={onStartCombatAndRoll}
                className="p-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg cursor-pointer"
                title="Ritira Iniziativa"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onEndCombat}
                className="px-2 py-1 bg-slate-900 hover:bg-red-950/50 border border-slate-700 text-slate-400 hover:text-red-300 font-mono text-xs rounded-lg cursor-pointer"
                title="Termina combattimento"
              >
                Fine Scontro
              </button>
            </div>
          </div>

          {/* RIGA 2: Giocatori in Ordine di Iniziativa (se più di 1) */}
          {playerEntries.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-1 border-t border-slate-800/60 text-xs">
              <span className="text-[10px] font-mono text-slate-500 uppercase mr-1">Ordine:</span>
              {playerEntries.map((p, idx) => {
                const isCurrent = p.id === activeCombatant?.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectCombatant(p)}
                    className={`px-2 py-0.5 rounded border font-mono text-xs flex items-center gap-1 cursor-pointer transition-all ${
                      isCurrent
                        ? 'bg-emerald-900/90 border-emerald-400 text-white font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{idx + 1}°</span>
                    <span className="font-serif">{p.name}</span>
                    <span className="text-amber-300 text-[10px]">({p.totalInitiative})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* RIGA 3: STRISCIA COMPATTA SALUTE NEMICI (Elegante e discreta) */}
          {activeEnemies.length > 0 && (
            <div className="pt-1 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                <div className="flex items-center gap-1.5 text-red-300 font-bold">
                  <Skull className="w-3.5 h-3.5 text-red-400" />
                  <span>Nemici in Scena ({activeEnemies.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEnemiesDetail(!showEnemiesDetail)}
                  className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <span>{showEnemiesDetail ? 'Compatta' : 'Dettagli / Modifica'}</span>
                  {showEnemiesDetail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Elenco compatto dei nemici */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                {activeEnemies.map((enemy) => {
                  const status = getEnemyHealthStatus(enemy);
                  return (
                    <div
                      key={enemy.id}
                      className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-1.5 transition-all ${
                        status.isDefeated
                          ? 'bg-slate-950/60 border-slate-900 opacity-60 line-through'
                          : 'bg-slate-900/80 border-red-950/70'
                      }`}
                    >
                      <div className="truncate">
                        <div className="font-serif font-bold text-slate-200 truncate flex items-center gap-1">
                          <span className="truncate">{enemy.name}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          Dif {enemy.defense} • Arm {enemy.armor}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Caselle salute compatte o stato */}
                        <span
                          className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                            status.isDefeated
                              ? 'bg-red-950 text-red-400'
                              : status.undamagedBoxes === enemy.maxHealth
                              ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-950/90 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {status.isDefeated ? 'K.O.' : `${status.undamagedBoxes}/${enemy.maxHealth}`}
                        </span>

                        {showEnemiesDetail && !status.isDefeated && (
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => onDamageEnemy(enemy.id, 1, 'lethal')}
                              className="px-1.5 py-0.5 bg-red-950 hover:bg-red-900 text-red-200 rounded border border-red-800 font-mono text-[10px] cursor-pointer"
                              title="Infliggi 1 danno Letale"
                            >
                              -1
                            </button>
                            <button
                              type="button"
                              onClick={() => onHealEnemy(enemy.id)}
                              className="px-1.5 py-0.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-200 rounded border border-emerald-800 font-mono text-[10px] cursor-pointer"
                              title="Cura 1 casella"
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemoveCombatant(enemy.id)}
                              className="p-0.5 text-slate-500 hover:text-red-400 cursor-pointer ml-0.5"
                              title="Rimuovi dallo scontro"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Form Rapido Aggiungi Nemico */}
          {showAddEnemy && (
            <form
              onSubmit={handleConfirmAddEnemy}
              className="bg-slate-950 p-2.5 rounded-lg border border-red-800/60 space-y-2 text-xs font-mono animate-fadeIn"
            >
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="text-red-300 font-bold uppercase text-[11px]">
                  Aggiungi Nemico al Bestiario:
                </span>
                <select
                  value={selectedBestiaryIdx}
                  onChange={(e) => handleSelectBestiaryPreset(Number(e.target.value))}
                  className="bg-slate-900 border border-red-700/70 rounded px-2 py-0.5 text-xs text-amber-300 font-bold"
                >
                  {OFFICIAL_WOD_BESTIARY.map((b, i) => (
                    <option key={b.name} value={i}>
                      {b.name} (Salute {b.maxHealth} | Dif {b.defense} | Arm {b.armor})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                <div className="col-span-2">
                  <input
                    type="text"
                    value={customEnemyName}
                    onChange={(e) => setCustomEnemyName(e.target.value)}
                    placeholder="Nome nemico..."
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    min={3}
                    max={16}
                    value={customEnemyHealth}
                    onChange={(e) => setCustomEnemyHealth(Number(e.target.value) || 7)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center text-emerald-300 font-bold text-xs"
                    title="Salute"
                  />
                </div>
                <button
                  type="submit"
                  className="py-1 px-3 bg-red-700 hover:bg-red-600 text-white rounded font-bold cursor-pointer text-xs"
                >
                  Aggiungi
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
