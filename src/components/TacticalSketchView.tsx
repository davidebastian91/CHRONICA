import React, { useState } from 'react';
import type { BattlemapSpec, BattlemapEntity, BattlemapTerrain, CampaignConfig } from '../types';
import { Skull, Crosshair, Compass, Info, Maximize2, RefreshCw } from 'lucide-react';

interface TacticalSketchViewProps {
  battlemap?: BattlemapSpec | null;
  activeEnemies?: any[];
  characterName?: string;
  party?: { id: string; name: string }[];
  campaign?: CampaignConfig;
  onAskTacticalUpdate?: () => void;
  onOpenFullMap?: () => void;
}

export const TacticalSketchView: React.FC<TacticalSketchViewProps> = ({
  battlemap,
  activeEnemies = [],
  characterName = 'Kael',
  party = [],
  campaign,
  onAskTacticalUpdate,
  onOpenFullMap,
}) => {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  // Se non c'è una battlemap generata esplicitamente dall'IA, ne costruiamo una coerente e automatica
  const effectiveGridSize = battlemap?.gridSize || 10;
  const effectiveTitle = battlemap?.title || (campaign ? `Schizzo: ${campaign.city}` : 'Schizzo Tattico d\'Ingaggio');
  const effectiveLocation = battlemap?.locationName || campaign?.city || 'Zona di Scontro';

  const normalizeCoord = (val: number | undefined, defaultVal = 50) => {
    if (val === undefined || isNaN(val)) return defaultVal;
    if (val <= 10) {
      return Math.max(10, Math.min(90, Math.round(val * 8 + 6)));
    }
    return Math.max(10, Math.min(90, val));
  };

  const normalizeDim = (dim: number | undefined, defaultVal: number, maxVal = 25) => {
    if (dim === undefined || isNaN(dim)) return Math.min(defaultVal, maxVal);
    if (dim <= 4) return Math.min(maxVal, dim * 4);
    return Math.max(4, Math.min(maxVal, dim));
  };

  // Costruzione entità se non fornite
  let entities: BattlemapEntity[] = battlemap?.entities || [];
  if (entities.length === 0) {
    const playerList = party && party.length > 0 ? party.map((p) => p.name) : [characterName];
    // Posiziona i giocatori nella parte inferiore/sud (y: 75-85%)
    playerList.forEach((name, idx) => {
      const offsetX = 30 + idx * 20;
      entities.push({
        id: `player_${idx}`,
        name,
        type: 'player',
        x: Math.min(85, Math.max(15, offsetX)),
        y: 80,
        label: name.charAt(0).toUpperCase(),
        hp: 'Attivo',
      });
    });

    // Posiziona i nemici reali o comprimari del cast nella parte superiore/nord
    if (activeEnemies && activeEnemies.length > 0) {
      activeEnemies.forEach((enemy, idx) => {
        const offsetX = 25 + idx * 25;
        entities.push({
          id: enemy.id || `enemy_${idx}`,
          name: enemy.name || `Nemico ${idx + 1}`,
          type: (enemy.type === 'boss' || enemy.maxHealth >= 8) ? 'boss' : 'enemy',
          x: Math.min(85, Math.max(15, offsetX)),
          y: 25 + (idx % 2) * 10,
          label: enemy.name ? enemy.name.charAt(0).toUpperCase() : `E${idx + 1}`,
          hp: `${enemy.currentHealth || 7}/${enemy.maxHealth || 7}`,
          threat: enemy.type || 'Fanteria Ostile',
        });
      });
    } else if (campaign?.rosterCharacters && campaign.rosterCharacters.length > 1) {
      // Usa i compagni/PNG del cast reale della cronaca
      const nonActiveRoster = campaign.rosterCharacters.filter((rc) => rc.name.toLowerCase() !== characterName.toLowerCase());
      nonActiveRoster.slice(0, 3).forEach((rc, idx) => {
        const isHostile = /nemico|avversario|predatore|colosso/i.test(rc.concept || '');
        entities.push({
          id: `roster_${rc.id || idx}`,
          name: rc.name,
          type: isHostile ? 'boss' : 'player',
          x: 25 + idx * 25,
          y: isHostile ? 25 : 65,
          label: rc.name.charAt(0).toUpperCase(),
          hp: 'Presente',
          threat: rc.concept || (isHostile ? 'Avversario' : 'Compagno'),
        });
      });
    } else {
      entities.push({
        id: 'default_enemy_1',
        name: 'Avversario Ostile',
        type: 'enemy',
        x: 50,
        y: 25,
        label: 'A1',
        hp: '7/7',
        threat: 'In Guardia',
      });
    }
  }

  // Terreno di default se assente
  const terrain: BattlemapTerrain[] = battlemap?.terrain && battlemap.terrain.length > 0
    ? battlemap.terrain
    : [
        { id: 'w1', type: 'wall', x: 10, y: 12, w: 80, h: 4, label: 'Perimetro Nord' },
        { id: 'c1', type: 'cover', x: 25, y: 48, w: 20, h: 8, label: 'Riparo Tattico Ovest' },
        { id: 'c2', type: 'cover', x: 55, y: 48, w: 20, h: 8, label: 'Riparo Tattico Est' },
        { id: 'd1', type: 'door', x: 42, y: 12, w: 16, h: 4, label: 'Varco di Fuga' },
      ];

  const selectedEntity = entities.find((e) => e.id === selectedEntityId);

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Header Schizzo Tattico */}
      <div className="p-3 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-xs sm:text-sm text-slate-100 flex items-center space-x-1.5">
              <span>{effectiveTitle}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                Griglia 2m
              </span>
            </h3>
            <p className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]">
              📍 {effectiveLocation}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {onAskTacticalUpdate && (
            <button
              type="button"
              onClick={onAskTacticalUpdate}
              title="Aggiorna Schizzo dal Narratore"
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          {onOpenFullMap && (
            <button
              type="button"
              onClick={onOpenFullMap}
              title="Apri Mappe a Schermo Intero"
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 cursor-pointer transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Area Griglia Tattica Blueprint con Proporzione Quadrata Stabile (Zero Deformazione) */}
      <div className="flex-1 p-2 sm:p-3 flex items-center justify-center overflow-hidden bg-[#090d16]">
        <div className="w-full max-w-[340px] aspect-square relative bg-[#060a12] rounded-xl border border-indigo-900/40 shadow-inner overflow-hidden select-none">
          {/* Texture e linee di griglia blueprint */}
          <div
            className="absolute inset-0 opacity-25 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(99, 102, 241, 0.25) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(99, 102, 241, 0.25) 1px, transparent 1px)
              `,
              backgroundSize: `${100 / effectiveGridSize}% ${100 / effectiveGridSize}%`,
            }}
          />

          {/* Bordo di scala e coordinate */}
          <div className="absolute top-1 left-2 text-[9px] font-mono text-indigo-400/50 uppercase select-none">
            ▲ NORD (A1)
          </div>
          <div className="absolute bottom-1 right-2 text-[9px] font-mono text-indigo-400/50 uppercase select-none">
            SUD (J10) ▼
          </div>

          {/* Rendering Terreno */}
          {terrain.map((t) => {
            let styleClass = 'border-slate-700 bg-slate-800/60 text-slate-400';
            if (t.type === 'cover') {
              styleClass = 'border-amber-600/70 bg-amber-950/40 text-amber-300 shadow-sm';
            } else if (t.type === 'door') {
              styleClass = 'border-emerald-500/80 bg-emerald-950/60 text-emerald-300';
            } else if (t.type === 'hazard') {
              styleClass = 'border-red-600/80 bg-red-950/50 text-red-300 animate-pulse';
            }

            const normX = normalizeCoord(t.x, 20);
            const normY = normalizeCoord(t.y, 50);
            const normW = normalizeDim(t.w, 18, 50);
            const normH = normalizeDim(t.h, 7, 20);

            return (
              <div
                key={t.id}
                style={{
                  left: `${normX}%`,
                  top: `${normY}%`,
                  width: `${normW}%`,
                  height: `${normH}%`,
                }}
                className={`absolute rounded-md border text-[9px] font-mono flex items-center justify-center px-1 overflow-hidden transition-all pointer-events-none z-10 ${styleClass}`}
              >
                <span className="truncate">{t.label || t.type.toUpperCase()}</span>
              </div>
            );
          })}

          {/* Rendering Entità (Giocatori e Nemici) */}
          {entities.map((e) => {
            const isSelected = e.id === selectedEntityId;
            const isPlayer = e.type === 'player';
            const isBoss = e.type === 'boss';

            const normX = normalizeCoord(e.x, 50);
            const normY = normalizeCoord(e.y, 75);

            return (
              <div
                key={e.id}
                onClick={() => setSelectedEntityId(isSelected ? null : e.id)}
                style={{
                  left: `${normX}%`,
                  top: `${normY}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute cursor-pointer transition-all duration-300 z-20 flex flex-col items-center group`}
              >
                {/* Token circolare */}
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-serif font-black text-xs shadow-lg transition-transform ${
                    isPlayer
                      ? 'bg-gradient-to-br from-indigo-500 to-cyan-700 text-white border-2 border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                      : isBoss
                      ? 'bg-gradient-to-br from-red-600 to-rose-950 text-white border-2 border-red-400 shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse'
                      : 'bg-gradient-to-br from-rose-700 to-slate-900 text-rose-100 border-2 border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                  } ${isSelected ? 'scale-125 ring-4 ring-amber-400/80 z-30' : 'hover:scale-110'}`}
                >
                  {isPlayer ? (
                    <span>{e.label || e.name.charAt(0)}</span>
                  ) : isBoss ? (
                    <Skull className="w-4 h-4 text-rose-200" />
                  ) : (
                    <Crosshair className="w-3.5 h-3.5 text-rose-200" />
                  )}
                </div>

                {/* Etichetta nome sotto il token */}
                <div
                  className={`mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold whitespace-nowrap shadow-md pointer-events-none max-w-[90px] truncate ${
                    isPlayer
                      ? 'bg-indigo-950/90 border border-indigo-700/80 text-cyan-200'
                      : isBoss
                      ? 'bg-red-950/90 border border-red-700 text-red-200'
                      : 'bg-slate-900/90 border border-slate-800 text-rose-300'
                  }`}
                >
                  {e.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Dettagli Tattici / Entità Selezionata */}
      <div className="p-2.5 bg-slate-900/95 border-t border-slate-800 text-xs shrink-0">
        {selectedEntity ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                  selectedEntity.type === 'player'
                    ? 'bg-cyan-700 text-white'
                    : 'bg-rose-800 text-white'
                }`}
              >
                {selectedEntity.label || selectedEntity.name.charAt(0)}
              </div>
              <div>
                <p className="font-serif font-bold text-slate-100 leading-none">
                  {selectedEntity.name}
                </p>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                  Salute: <span className="text-emerald-400 font-bold">{selectedEntity.hp || 'Attivo'}</span>
                  {selectedEntity.threat ? ` • Ruolo: ${selectedEntity.threat}` : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedEntityId(null)}
              className="text-[10px] font-mono text-slate-400 hover:text-slate-200 underline cursor-pointer"
            >
              Chiudi
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[11px] font-serif text-slate-400">
            <div className="flex items-center space-x-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>
                {battlemap?.notes || 'Tocca un segnalino per ispezionare la distanza e la linea di tiro.'}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[10px] font-mono shrink-0">
              <span className="flex items-center space-x-1 text-cyan-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                <span>Alleati</span>
              </span>
              <span className="flex items-center space-x-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                <span>Ostili</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
