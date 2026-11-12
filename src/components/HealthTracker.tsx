import React from 'react';
import type { DamageType, HealthLevel } from '../types';
import { applyDamageToHealth, healDamageFromHealth } from '../utils/wodCombatRules';
import { getHealthPenalty } from '../utils/wodActionRules';

interface HealthTrackerProps {
  health: HealthLevel[];
  onChange: (updatedHealth: HealthLevel[]) => void;
  readOnly?: boolean;
}

export const HealthTracker: React.FC<HealthTrackerProps> = ({
  health,
  onChange,
  readOnly = false,
}) => {
  const cycleDamage = (current: DamageType): DamageType => {
    switch (current) {
      case 'none':
        return 'bashing';
      case 'bashing':
        return 'lethal';
      case 'lethal':
        return 'aggravated';
      case 'aggravated':
        return 'none';
      default:
        return 'none';
    }
  };

  const handleBoxClick = (index: number) => {
    if (readOnly) return;
    const newHealth = [...health];
    newHealth[index] = {
      ...newHealth[index],
      damage: cycleDamage(newHealth[index].damage),
    };
    onChange(newHealth);
  };

  const handleQuickDamage = (type: 'bashing' | 'lethal' | 'aggravated') => {
    if (readOnly) return;
    const res = applyDamageToHealth(health, 1, type);
    onChange(res.updatedHealth);
  };

  const handleQuickHeal = (type: 'bashing' | 'lethal' | 'aggravated') => {
    if (readOnly) return;
    const updated = healDamageFromHealth(health, 1, type);
    onChange(updated);
  };

  const renderDamageMark = (damage: DamageType) => {
    switch (damage) {
      case 'bashing':
        return <span className="text-amber-400 font-bold select-none text-sm">/</span>;
      case 'lethal':
        return <span className="text-red-500 font-bold select-none text-sm">✕</span>;
      case 'aggravated':
        return <span className="text-purple-400 font-black select-none text-sm">✳</span>;
      default:
        return null;
    }
  };

  const activePenalty = getHealthPenalty(health);
  const isFull = health.length > 0 && health.every((h) => h.damage !== 'none');
  const allAggr = isFull && health.every((h) => h.damage === 'aggravated');
  const allLethalOrAggr = isFull && health.every((h) => h.damage === 'lethal' || h.damage === 'aggravated');

  return (
    <div className="space-y-2 text-sm text-slate-200">
      <div className="flex justify-between items-center text-xs text-slate-400 mb-1 border-b border-slate-800 pb-1.5 font-mono">
        <span>BARRA SALUTE ({health.filter((h) => h.damage === 'none').length}/{health.length})</span>
        <span>[/] Cont. [✕] Let. [✳] Aggr.</span>
      </div>

      {/* Bottoni rapidi per Scorrimento Automatico Ferite (Overflow Compendio Sez. 1.3) */}
      {!readOnly && (
        <div className="space-y-1.5 pb-1.5 border-b border-slate-800/80">
          <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => handleQuickDamage('bashing')}
              className="py-1 px-1.5 rounded bg-amber-950/60 hover:bg-amber-900/70 border border-amber-700/70 text-amber-200 font-bold transition-colors cursor-pointer"
              title="Aggiungi 1 Danno Contundente (/) con scorrimento automatico"
            >
              +1 Cont. [/]
            </button>
            <button
              type="button"
              onClick={() => handleQuickDamage('lethal')}
              className="py-1 px-1.5 rounded bg-red-950/60 hover:bg-red-900/70 border border-red-700/70 text-red-200 font-bold transition-colors cursor-pointer"
              title="Aggiungi 1 Danno Letale (X) con scorrimento automatico"
            >
              +1 Letale [✕]
            </button>
            <button
              type="button"
              onClick={() => handleQuickDamage('aggravated')}
              className="py-1 px-1.5 rounded bg-purple-950/60 hover:bg-purple-900/70 border border-purple-700/70 text-purple-200 font-bold transition-colors cursor-pointer"
              title="Aggiungi 1 Danno Aggravato (*) con scorrimento automatico"
            >
              +1 Aggr. [✳]
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => handleQuickHeal('bashing')}
              className="py-0.5 px-1 rounded bg-slate-900 hover:bg-emerald-950/60 border border-slate-800 hover:border-emerald-700/60 text-emerald-300 transition-colors cursor-pointer"
              title="Cura 1 Danno Contundente (/)"
            >
              🩹 -1 [/]
            </button>
            <button
              type="button"
              onClick={() => handleQuickHeal('lethal')}
              className="py-0.5 px-1 rounded bg-slate-900 hover:bg-emerald-950/60 border border-slate-800 hover:border-emerald-700/60 text-emerald-300 transition-colors cursor-pointer"
              title="Cura 1 Danno Letale (X)"
            >
              🩹 -1 [✕]
            </button>
            <button
              type="button"
              onClick={() => handleQuickHeal('aggravated')}
              className="py-0.5 px-1 rounded bg-slate-900 hover:bg-emerald-950/60 border border-slate-800 hover:border-emerald-700/60 text-emerald-300 transition-colors cursor-pointer"
              title="Cura 1 Danno Aggravato (*)"
            >
              🩹 -1 [✳]
            </button>
          </div>
        </div>
      )}

      {/* Elenco Caselle Salute con Penalità Ufficiali (-1, -2, -3 sulle ultime 3 caselle) */}
      {health.map((level, idx) => {
        const fromRight = health.length - 1 - idx;
        const boxPenalty = fromRight === 2 ? -1 : fromRight === 1 ? -2 : fromRight === 0 ? -3 : 0;
        const cleanLabel =
          fromRight === 2
            ? 'Ferito'
            : fromRight === 1
            ? 'Ferito Grave'
            : fromRight === 0
            ? 'Incapacitato'
            : `Salute (${idx + 1})`;

        return (
          <div
            key={idx}
            className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-slate-800/40 transition-colors"
          >
            <span className="font-mono text-slate-300 text-xs sm:text-sm">
              {cleanLabel}
              {boxPenalty < 0 && (
                <span className="text-red-400 font-bold ml-1.5">[{boxPenalty}]</span>
              )}
            </span>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => handleBoxClick(idx)}
              className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${
                level.damage === 'none'
                  ? 'border-slate-700 bg-slate-950 hover:border-slate-500'
                  : level.damage === 'bashing'
                  ? 'border-amber-700 bg-amber-950/40'
                  : level.damage === 'lethal'
                  ? 'border-red-700 bg-red-950/50 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                  : 'border-purple-600 bg-purple-950/50 shadow-[0_0_8px_rgba(168,85,247,0.5)]'
              } ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
              title="Clicca per cambiare manualmente il simbolo nella casella"
            >
              {renderDamageMark(level.damage)}
            </button>
          </div>
        );
      })}

      {/* Avviso Penalità o Stato Critico di Overflow */}
      {(activePenalty < 0 || isFull) && (
        <div
          className={`p-2 rounded-lg border text-[11px] font-mono ${
            allAggr
              ? 'bg-purple-950/80 border-purple-500 text-purple-200 font-bold'
              : allLethalOrAggr
              ? 'bg-red-950/80 border-red-500 text-red-200 font-bold'
              : isFull
              ? 'bg-amber-950/80 border-amber-500 text-amber-200 font-bold'
              : 'bg-slate-900/90 border-red-800/60 text-red-300'
          }`}
        >
          {allAggr
            ? '💀 Barra piena di Aggravati [✳]: Morte Istantanea!'
            : allLethalOrAggr
            ? '🩸 Barra piena di Letali [✕]: In fin di vita (1L/turno) o Torpore (Vampiri)!'
            : isFull
            ? '⚠️ Barra piena di Contundenti [/]: Tiro di Costituzione (8+) per non svenire! Ulteriori danni [/] diventano Letali [✕]!'
            : `Penalità Ferite Attiva: ${activePenalty} dadi a tutte le azioni.`}
        </div>
      )}
    </div>
  );
};
