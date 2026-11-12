import React, { useState } from 'react';
import type { Character, CharacterAbilities, CharacterAttributes, WerewolfFormId } from '../types';
import { DotRating } from './DotRating';
import { HealthTracker } from './HealthTracker';
import { StructuredInventoryView } from './StructuredInventoryView';
import {
  getAttributeXpCost,
  getAbilityXpCost,
  getPowerXpCost,
  getSupernaturalPotencyXpCost,
  getWillpowerXpCost,
  getHumanityXpCost,
  spendExperience,
  ensureExperienceTracker,
} from '../utils/experienceRules';
import {
  getBloodPotencyStats,
  getWerewolfFormSpec,
  switchWerewolfForm,
  getGnosisStats,
  detectMagePath,
} from '../utils/wodSupernaturalRules';
import {
  X,
  Dices,
  Plus,
  Trash2,
  Droplets,
  HeartPulse,
  Brain,
  Package,
  Moon,
  Wand2,
  Zap,
  Sparkles,
  History,
  AlertCircle,
  Shield,
  BookOpen,
} from 'lucide-react';

interface CharacterSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character;
  onUpdateCharacter: (char: Character) => void;
  onOpenDiceWithTraits?: (attr: { name: string; value: number }, ab: { name: string; value: number }) => void;
}

export const CharacterSheetModal: React.FC<CharacterSheetModalProps> = ({
  isOpen,
  onClose,
  character,
  onUpdateCharacter,
  onOpenDiceWithTraits,
}) => {
  const [selectedAttribute, setSelectedAttribute] = useState<{ name: string; value: number } | null>(null);
  const [selectedAbility, setSelectedAbility] = useState<{ name: string; value: number } | null>(null);
  const [newPowerName, setNewPowerName] = useState('');

  // Gestione Avanzamento XP Ufficiale WoD (Senza cheat, solo punti del Narratore)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [pendingUpgrade, setPendingUpgrade] = useState<{
    traitType: 'attr' | 'ability' | 'power' | 'potency' | 'willpower' | 'humanity';
    traitKey: string;
    traitLabel: string;
    oldVal: number;
    newVal: number;
    cost: number;
    powerIndex?: number;
  } | null>(null);

  // Stato ausiliario per Meccaniche di Stirpe
  const [lineageFeedback, setLineageFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const exp = ensureExperienceTracker(character);

  const showLineageFeedback = (msg: string) => {
    setLineageFeedback(msg);
    setTimeout(() => setLineageFeedback(null), 4000);
  };

  const handleAttrChange = (key: keyof CharacterAttributes, label: string, newVal: number) => {
    const oldVal = (character.attributes[key] ?? 1) as number;
    if (newVal <= oldVal) return; // Non si scalano punti indietro
    const cost = getAttributeXpCost(oldVal);
    setPendingUpgrade({
      traitType: 'attr',
      traitKey: key,
      traitLabel: label,
      oldVal,
      newVal,
      cost,
    });
  };

  const handleAbilityChange = (key: keyof CharacterAbilities, label: string, newVal: number) => {
    const oldVal = (character.abilities[key] ?? 0) as number;
    if (newVal <= oldVal) return;
    const cost = getAbilityXpCost(oldVal);
    setPendingUpgrade({
      traitType: 'ability',
      traitKey: key,
      traitLabel: label,
      oldVal,
      newVal,
      cost,
    });
  };

  const handlePowerChange = (index: number, name: string, newVal: number) => {
    const oldVal = character.powers[index].level;
    if (newVal <= oldVal) return;
    const cost = getPowerXpCost(oldVal, character, name);
    setPendingUpgrade({
      traitType: 'power',
      traitKey: name,
      traitLabel: `Potere: ${name}`,
      oldVal,
      newVal,
      cost,
      powerIndex: index,
    });
  };

  const applyPotencyUpdate = (char: Character, newPotency: number): Character => {
    const clamped = Math.max(1, Math.min(10, newPotency));
    let newMaxEnergy = char.bloodOrEnergy.max;
    if (char.creatureType === 'vampire') {
      newMaxEnergy = getBloodPotencyStats(clamped).maxVitae;
    } else if (char.creatureType === 'mage') {
      newMaxEnergy = getGnosisStats(clamped).maxMana;
    } else if (char.creatureType === 'werewolf') {
      newMaxEnergy = getBloodPotencyStats(clamped).maxVitae;
    }
    return {
      ...char,
      supernaturalPotency: clamped,
      bloodOrEnergy: {
        ...char.bloodOrEnergy,
        max: newMaxEnergy,
        current: Math.min(newMaxEnergy, char.bloodOrEnergy.current),
      },
    };
  };

  const handlePotencyChange = (label: string, newVal: number) => {
    const oldVal = character.supernaturalPotency ?? 1;
    if (newVal <= oldVal) return;
    const cost = getSupernaturalPotencyXpCost(oldVal);
    setPendingUpgrade({
      traitType: 'potency',
      traitKey: 'supernaturalPotency',
      traitLabel: label,
      oldVal,
      newVal,
      cost,
    });
  };

  const handleWillpowerMaxChange = (newVal: number) => {
    const oldVal = character.willpower.max;
    if (newVal <= oldVal) return;
    const cost = getWillpowerXpCost(oldVal);
    setPendingUpgrade({
      traitType: 'willpower',
      traitKey: 'willpower',
      traitLabel: 'Forza di Volontà Massima',
      oldVal,
      newVal,
      cost,
    });
  };

  const handleHumanityChange = (newVal: number) => {
    const oldVal = character.morality ?? character.humanity;
    if (newVal <= oldVal) return;
    const cost = getHumanityXpCost(oldVal);
    setPendingUpgrade({
      traitType: 'humanity',
      traitKey: 'humanity',
      traitLabel:
        character.creatureType === 'vampire'
          ? 'Umanità'
          : character.creatureType === 'werewolf'
          ? 'Armonia'
          : character.creatureType === 'mage'
          ? 'Saggezza'
          : 'Moralità',
      oldVal,
      newVal,
      cost,
    });
  };

  const confirmUpgrade = () => {
    if (!pendingUpgrade) return;
    const { traitType, traitKey, traitLabel, oldVal, newVal, cost, powerIndex } = pendingUpgrade;
    const res = spendExperience(character, cost, traitLabel, oldVal, newVal);
    if (!res.success) {
      alert(res.error);
      return;
    }
    let updated = res.character;
    if (traitType === 'attr') {
      updated = {
        ...updated,
        attributes: { ...updated.attributes, [traitKey]: newVal },
      };
    } else if (traitType === 'ability') {
      updated = {
        ...updated,
        abilities: { ...updated.abilities, [traitKey]: newVal },
      };
    } else if (traitType === 'power' && powerIndex !== undefined) {
      const powers = [...updated.powers];
      powers[powerIndex].level = newVal;
      updated = { ...updated, powers };
    } else if (traitType === 'potency') {
      updated = applyPotencyUpdate(updated, newVal);
    } else if (traitType === 'willpower') {
      updated = {
        ...updated,
        willpower: { ...updated.willpower, max: newVal, current: Math.min(newVal, updated.willpower.current + 1) },
      };
    } else if (traitType === 'humanity') {
      updated = {
        ...updated,
        humanity: newVal,
        morality: newVal,
      };
    }
    onUpdateCharacter(updated);
    setPendingUpgrade(null);
  };

  const handleTraitClick = (type: 'attr' | 'ability', name: string, value: number) => {
    if (type === 'attr') {
      setSelectedAttribute(selectedAttribute?.name === name ? null : { name, value });
    } else {
      setSelectedAbility(selectedAbility?.name === name ? null : { name, value });
    }
  };

  const handleLaunchCombinedRoll = () => {
    if (onOpenDiceWithTraits && (selectedAttribute || selectedAbility)) {
      onOpenDiceWithTraits(
        selectedAttribute || { name: 'Nessuno', value: 0 },
        selectedAbility || { name: 'Nessuno', value: 0 }
      );
      setSelectedAttribute(null);
      setSelectedAbility(null);
      onClose();
    }
  };

  const addPower = () => {
    if (!newPowerName.trim()) return;
    onUpdateCharacter({
      ...character,
      powers: [...character.powers, { name: newPowerName.trim(), level: 1 }],
    });
    setNewPowerName('');
  };

  const removePower = (index: number) => {
    const powers = [...character.powers];
    powers.splice(index, 1);
    onUpdateCharacter({ ...character, powers });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-indigo-950/50 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header Scheda */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 px-5 sm:px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="font-serif font-black text-xl sm:text-2xl text-slate-100 tracking-wider uppercase">
                {character.name}
              </h2>
              <span className="text-xs uppercase font-mono px-3 py-1 rounded-lg bg-indigo-950/80 border border-indigo-700/80 text-indigo-300 font-semibold">
                {character.creatureType} • {character.factionOrClan}
              </span>
            </div>
            <p className="text-sm text-slate-300 font-serif italic mt-0.5">
              {character.concept} | Virtù: {character.virtue || character.nature || 'Giustizia'} | Vizio:{' '}
              {character.vice || character.demeanor || 'Ira'}
            </p>
            <div className="flex flex-wrap gap-2 mt-2 text-[11px] font-mono">
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200">
                🛡️ Difesa: <strong>{character.defense ?? 2}</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200">
                ⚡ Iniziativa: <strong>+{character.initiativeMod ?? 5}</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200">
                🏃 Velocità: <strong>{character.speed ?? 10}</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/80 text-indigo-200">
                🥋 Armatura: <strong>{character.armor ?? 0}</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
                📏 Taglia: <strong>{character.size ?? 5}</strong>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Barra XP Legittima: Solo Punti Assegnati dal Narratore (Nessun tasto regalo né modifica libera) */}
        <div className="bg-slate-950/95 border-b border-slate-800 px-5 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="flex items-center space-x-1.5 px-3 py-1 bg-amber-950/70 border border-amber-600/70 rounded-xl text-xs sm:text-sm font-mono shadow-inner">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="text-slate-300">XP Disponibili:</span>
              <span className="font-bold text-amber-300 text-sm">{exp.current}</span>
              <span className="text-slate-500 text-xs">/ {exp.total} Guadagnati</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>Regola Chronica: XP assegnati esclusivamente dal Narratore di Cronaca</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center space-x-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer text-xs font-mono"
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span>Storico Avanzamenti ({exp.history?.length || 0})</span>
          </button>
        </div>

        {/* Barra di selezione rapida tiro dadi */}
        {(selectedAttribute || selectedAbility) && (
          <div className="bg-indigo-950/90 border-b border-indigo-800/80 px-5 py-2.5 flex items-center justify-between text-sm animate-fadeIn shrink-0">
            <div className="flex items-center space-x-2 text-slate-200">
              <Dices className="w-5 h-5 text-amber-300" />
              <span>
                Pronto al tiro:{' '}
                <strong className="text-amber-300">
                  {selectedAttribute ? `${selectedAttribute.name} (${selectedAttribute.value})` : 'Scegli Attributo'}{' '}
                  +{' '}
                  {selectedAbility ? `${selectedAbility.name} (${selectedAbility.value})` : 'Scegli Abilità'}
                </strong>
              </span>
            </div>
            <button
              onClick={handleLaunchCombinedRoll}
              className="px-4 py-1.5 bg-gradient-to-r from-red-800 to-indigo-800 hover:from-red-700 hover:to-indigo-700 text-white rounded-xl font-bold font-mono text-xs sm:text-sm uppercase tracking-wider shadow-md cursor-pointer"
            >
              Apri Lancia Dadi ({(selectedAttribute?.value || 0) + (selectedAbility?.value || 0)} d10)
            </button>
          </div>
        )}

        {/* Feedback Dinamico Stirpe */}
        {lineageFeedback && (
          <div className="bg-red-950/90 border-b border-red-600/80 px-6 py-2 text-xs font-mono text-red-200 animate-fadeIn flex items-center justify-between shrink-0">
            <span>{lineageFeedback}</span>
            <button
              onClick={() => setLineageFeedback(null)}
              className="text-red-400 hover:text-white font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto">
          {/* SEZIONE 1: ATTRIBUTI */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-mono uppercase text-indigo-400 font-bold tracking-wider">
                Attributi (9 Tratti Primari)
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                Clicca per tiro dadi • Clicca sui pallini per avanzamento con XP
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Mentali */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <span className="text-xs font-mono uppercase text-slate-400 font-bold block border-b border-slate-800 pb-1">
                  Mentali (Prestanza • Precisione • Resistenza)
                </span>
                <div className="space-y-2.5">
                  {[
                    { key: 'intelligence', label: 'Intelligenza' },
                    { key: 'wits', label: 'Prontezza' },
                    { key: 'resolve', label: 'Fermezza' },
                  ].map(({ key, label }) => {
                    const isSelected = selectedAttribute?.name === label;
                    const val = (character.attributes as any)[key] ?? 1;
                    return (
                      <div
                        key={key}
                        className={`flex justify-between items-center p-1.5 rounded-lg transition-colors ${
                          isSelected ? 'bg-indigo-950/90 border border-indigo-700/80 shadow' : 'hover:bg-slate-900/60'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleTraitClick('attr', label, val)}
                          className={`text-sm text-left font-serif transition-colors cursor-pointer ${
                            isSelected ? 'text-amber-300 font-bold' : 'text-slate-200 hover:text-indigo-300'
                          }`}
                        >
                          {label}
                        </button>
                        <DotRating
                          min={1}
                          value={val}
                          onChange={(v) => handleAttrChange(key as any, label, v)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fisici */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <span className="text-xs font-mono uppercase text-slate-400 font-bold block border-b border-slate-800 pb-1">
                  Fisici (Prestanza • Precisione • Resistenza)
                </span>
                <div className="space-y-2.5">
                  {[
                    { key: 'strength', label: 'Forza' },
                    { key: 'dexterity', label: 'Destrezza' },
                    { key: 'stamina', label: 'Costituzione' },
                  ].map(({ key, label }) => {
                    const isSelected = selectedAttribute?.name === label;
                    const val = (character.attributes as any)[key] ?? 1;
                    return (
                      <div
                        key={key}
                        className={`flex justify-between items-center p-1.5 rounded-lg transition-colors ${
                          isSelected ? 'bg-indigo-950/90 border border-indigo-700/80 shadow' : 'hover:bg-slate-900/60'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleTraitClick('attr', label, val)}
                          className={`text-sm text-left font-serif transition-colors cursor-pointer ${
                            isSelected ? 'text-amber-300 font-bold' : 'text-slate-200 hover:text-indigo-300'
                          }`}
                        >
                          {label}
                        </button>
                        <DotRating
                          min={1}
                          value={val}
                          onChange={(v) => handleAttrChange(key as any, label, v)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sociali */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <span className="text-xs font-mono uppercase text-slate-400 font-bold block border-b border-slate-800 pb-1">
                  Sociali (Prestanza • Precisione • Resistenza)
                </span>
                <div className="space-y-2.5">
                  {[
                    { key: 'presence', label: 'Presenza' },
                    { key: 'manipulation', label: 'Ascendente' },
                    { key: 'composure', label: 'Autocontrollo' },
                  ].map(({ key, label }) => {
                    const isSelected = selectedAttribute?.name === label;
                    const val = (character.attributes as any)[key] ?? 1;
                    return (
                      <div
                        key={key}
                        className={`flex justify-between items-center p-1.5 rounded-lg transition-colors ${
                          isSelected ? 'bg-indigo-950/90 border border-indigo-700/80 shadow' : 'hover:bg-slate-900/60'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleTraitClick('attr', label, val)}
                          className={`text-sm text-left font-serif transition-colors cursor-pointer ${
                            isSelected ? 'text-amber-300 font-bold' : 'text-slate-200 hover:text-indigo-300'
                          }`}
                        >
                          {label}
                        </button>
                        <DotRating
                          min={1}
                          value={val}
                          onChange={(v) => handleAttrChange(key as any, label, v)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* SEZIONE 2: ABILITÀ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-mono uppercase text-indigo-400 font-bold tracking-wider">
                Abilità del Personaggio (24 Abilità Fondamentali)
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                Clicca per tiro dadi • Clicca sui pallini per avanzamento con XP
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Mentali (-3 non addestrata) */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2.5">
                <span className="text-xs font-mono uppercase text-slate-400 font-bold block border-b border-slate-800 pb-1">
                  Mentali <span className="text-[10px] text-slate-500 font-normal">(-3 se non addestrata)</span>
                </span>
                <div className="space-y-1.5">
                  {[
                    { key: 'academics', label: 'Accademiche' },
                    { key: 'computer', label: 'Informatica' },
                    { key: 'crafts', label: 'Manualità' },
                    { key: 'investigation', label: 'Investigare' },
                    { key: 'medicine', label: 'Medicina' },
                    { key: 'occult', label: 'Occulto' },
                    { key: 'politics', label: 'Politica' },
                    { key: 'science', label: 'Scienza' },
                  ].map(({ key, label }) => {
                    const isSelected = selectedAbility?.name === label;
                    const val = (character.abilities as any)[key] ?? 0;
                    return (
                      <div
                        key={key}
                        className={`flex justify-between items-center p-1 rounded-lg transition-colors ${
                          isSelected ? 'bg-indigo-950/90 border border-indigo-700/80 shadow' : 'hover:bg-slate-900/60'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleTraitClick('ability', label, val)}
                          className={`text-xs text-left font-serif transition-colors cursor-pointer ${
                            isSelected ? 'text-amber-300 font-bold' : 'text-slate-200 hover:text-indigo-300'
                          }`}
                        >
                          {label}
                        </button>
                        <DotRating
                          min={0}
                          value={val}
                          onChange={(v) => handleAbilityChange(key as any, label, v)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fisiche (-1 non addestrata) */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2.5">
                <span className="text-xs font-mono uppercase text-slate-400 font-bold block border-b border-slate-800 pb-1">
                  Fisiche <span className="text-[10px] text-slate-500 font-normal">(-1 se non addestrata)</span>
                </span>
                <div className="space-y-1.5">
                  {[
                    { key: 'athletics', label: 'Atletica' },
                    { key: 'brawl', label: 'Lotta / Corpo a Corpo' },
                    { key: 'drive', label: 'Guidare' },
                    { key: 'firearms', label: 'Armi da Fuoco' },
                    { key: 'larceny', label: 'Furto / Scasso' },
                    { key: 'stealth', label: 'Furtività' },
                    { key: 'survival', label: 'Sopravvivenza' },
                    { key: 'weaponry', label: 'Armi da Mischia' },
                  ].map(({ key, label }) => {
                    const isSelected = selectedAbility?.name === label;
                    const val = (character.abilities as any)[key] ?? 0;
                    return (
                      <div
                        key={key}
                        className={`flex justify-between items-center p-1 rounded-lg transition-colors ${
                          isSelected ? 'bg-indigo-950/90 border border-indigo-700/80 shadow' : 'hover:bg-slate-900/60'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleTraitClick('ability', label, val)}
                          className={`text-xs text-left font-serif transition-colors cursor-pointer ${
                            isSelected ? 'text-amber-300 font-bold' : 'text-slate-200 hover:text-indigo-300'
                          }`}
                        >
                          {label}
                        </button>
                        <DotRating
                          min={0}
                          value={val}
                          onChange={(v) => handleAbilityChange(key as any, label, v)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sociali (-1 non addestrata) */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2.5">
                <span className="text-xs font-mono uppercase text-slate-400 font-bold block border-b border-slate-800 pb-1">
                  Sociali <span className="text-[10px] text-slate-500 font-normal">(-1 se non addestrata)</span>
                </span>
                <div className="space-y-1.5">
                  {[
                    { key: 'animalKen', label: 'Affinità Animale' },
                    { key: 'empathy', label: 'Empatia' },
                    { key: 'expression', label: 'Espressività' },
                    { key: 'intimidation', label: 'Intimidire' },
                    { key: 'persuasion', label: 'Persuasione' },
                    { key: 'socialize', label: 'Socializzare' },
                    { key: 'streetwise', label: 'Bassifondi' },
                    { key: 'subterfuge', label: 'Sotterfugio' },
                  ].map(({ key, label }) => {
                    const isSelected = selectedAbility?.name === label;
                    const val = (character.abilities as any)[key] ?? 0;
                    return (
                      <div
                        key={key}
                        className={`flex justify-between items-center p-1 rounded-lg transition-colors ${
                          isSelected ? 'bg-indigo-950/90 border border-indigo-700/80 shadow' : 'hover:bg-slate-900/60'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleTraitClick('ability', label, val)}
                          className={`text-xs text-left font-serif transition-colors cursor-pointer ${
                            isSelected ? 'text-amber-300 font-bold' : 'text-slate-200 hover:text-indigo-300'
                          }`}
                        >
                          {label}
                        </button>
                        <DotRating
                          min={0}
                          value={val}
                          onChange={(v) => handleAbilityChange(key as any, label, v)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* SEZIONE 3: TRATTI SPECIALI E MECCANICHE SOVRANNATURALI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Poteri / Discipline / Doni / Arcana */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                <span className="text-xs font-mono uppercase text-indigo-400 font-bold flex items-center space-x-1.5">
                  <Brain className="w-4 h-4 text-indigo-400" />
                  <span>
                    {character.creatureType === 'vampire'
                      ? 'Discipline Vampiriche'
                      : character.creatureType === 'werewolf'
                      ? 'Doni & Riti Primordiali'
                      : character.creatureType === 'mage'
                      ? 'Arcana della Realtà'
                      : 'Tratti Speciali & Abilità Uniche'}
                  </span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">Livello 1-5</span>
              </div>

              {/* Potenza della Stirpe (Blood Potency / Gnosis / Primal Urge) */}
              {(character.creatureType === 'vampire' ||
                character.creatureType === 'werewolf' ||
                character.creatureType === 'mage') && (
                <div className="p-3 bg-gradient-to-r from-red-950/40 via-slate-900 to-indigo-950/40 border border-red-800/40 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-serif font-bold text-xs text-red-300 block">
                        {character.creatureType === 'vampire'
                          ? 'Potenza del Sangue (Blood Potency)'
                          : character.creatureType === 'werewolf'
                          ? 'Furia Primordiale (Primal Urge)'
                          : 'Gnosi (Gnosis)'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {character.creatureType === 'vampire'
                          ? 'Determina Max Vitae e limite tratti'
                          : character.creatureType === 'werewolf'
                          ? 'Determina Essenza e durata forme'
                          : 'Determina Max Mana e Paradox'}
                      </span>
                    </div>
                    <DotRating
                      min={1}
                      max={10}
                      size="sm"
                      value={character.supernaturalPotency ?? 1}
                      onChange={(v) =>
                        handlePotencyChange(
                          character.creatureType === 'vampire'
                            ? 'Potenza del Sangue'
                            : character.creatureType === 'werewolf'
                            ? 'Furia Primordiale'
                            : 'Gnosi',
                          v
                        )
                      }
                      activeColor="bg-red-500"
                    />
                  </div>
                </div>
              )}

              {/* Forme del Lupo Mannaro */}
              {character.creatureType === 'werewolf' && (
                <div className="p-3 bg-slate-900/80 border border-amber-900/60 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-serif font-bold text-amber-300 flex items-center space-x-1.5">
                      <Moon className="w-3.5 h-3.5 text-amber-400" />
                      <span>Forma Attiva del Lupo Mannaro</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-200 border border-amber-700">
                      {character.activeForm || 'Hishu (Umana)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 pt-1">
                    {(['hishu', 'dalu', 'gauru', 'urshul', 'urhan'] as WerewolfFormId[]).map((fId) => {
                      const spec = getWerewolfFormSpec(fId);
                      const isCurrent = (character.activeForm || 'hishu').toLowerCase().includes(fId);
                      return (
                        <button
                          key={fId}
                          type="button"
                          onClick={() => {
                            const updatedChar = switchWerewolfForm(character, fId);
                            onUpdateCharacter(updatedChar);
                            showLineageFeedback(`Forma mutata in ${spec.name}`);
                          }}
                          className={`py-1 px-1 rounded text-center transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-amber-600 text-slate-950 font-bold shadow'
                              : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                          }`}
                        >
                          <div className="text-[10px] font-serif font-bold">{spec.name.split(' ')[0]}</div>
                          <div className="text-[8px] font-mono opacity-80">{fId === 'gauru' ? 'Guerra' : 'Forma'}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Paradosso e Sentiero del Mago */}
              {character.creatureType === 'mage' && (
                <div className="p-3 bg-indigo-950/40 border border-indigo-800/60 rounded-xl space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-indigo-300 font-bold flex items-center gap-1.5">
                      <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Sentiero: {detectMagePath(character).name}</span>
                    </span>
                    <span className="text-[10px] text-amber-300 font-bold">
                      Gnosi: {character.supernaturalPotency || 1}
                    </span>
                  </div>
                </div>
              )}

              {/* Lista Poteri / Discipline */}
              <div className="space-y-2">
                {character.powers.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-2 rounded-lg bg-slate-900/60 border border-slate-800/60 group hover:border-slate-700"
                  >
                    <span className="text-sm font-serif text-slate-200">{p.name}</span>
                    <div className="flex items-center space-x-2">
                      <DotRating
                        value={p.level}
                        onChange={(v) => handlePowerChange(idx, p.name, v)}
                      />
                      <button
                        onClick={() => removePower(idx)}
                        className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newPowerName}
                  onChange={(e) => setNewPowerName(e.target.value)}
                  placeholder="Aggiungi potere..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={addPower}
                  className="p-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl cursor-pointer"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Risorse: Sangue / Umanità / Volontà */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4">
              <div className="text-xs font-mono uppercase text-indigo-400 font-bold border-b border-slate-800 pb-1.5 flex items-center space-x-2">
                <Droplets className="w-4 h-4 text-red-500" />
                <span>Risorse Morali & Vitali</span>
              </div>

              {/* Sangue / Energia Soprannaturale */}
              {(character.creatureType === 'vampire' ||
                character.creatureType === 'werewolf' ||
                character.creatureType === 'mage') && (
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-red-400 font-semibold">{character.bloodOrEnergy.name}</span>
                    <span className="font-mono text-slate-300 font-bold">
                      {character.bloodOrEnergy.current} / {character.bloodOrEnergy.max}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateCharacter({
                          ...character,
                          bloodOrEnergy: {
                            ...character.bloodOrEnergy,
                            current: Math.max(0, character.bloodOrEnergy.current - 1),
                          },
                        })
                      }
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <div className="flex-1 bg-slate-950 rounded-xl h-5 overflow-hidden border border-slate-800 p-0.5">
                      <div
                        className="bg-gradient-to-r from-red-800 to-red-600 h-full rounded-lg transition-all shadow-[0_0_10px_rgba(239,68,68,0.7)]"
                        style={{
                          width: `${(character.bloodOrEnergy.current / character.bloodOrEnergy.max) * 100}%`,
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateCharacter({
                          ...character,
                          bloodOrEnergy: {
                            ...character.bloodOrEnergy,
                            current: Math.min(character.bloodOrEnergy.max, character.bloodOrEnergy.current + 1),
                          },
                        })
                      }
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Volontà (Spesa normale di gioco vs Aumento del Massimale) */}
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-200 font-medium">Volontà Disponibile (Spesa / Attuale)</span>
                  <span className="font-mono text-slate-300 font-bold">
                    {character.willpower.current} / {character.willpower.max}
                  </span>
                </div>
                <DotRating
                  value={character.willpower.current}
                  max={character.willpower.max}
                  onChange={(v) =>
                    onUpdateCharacter({
                      ...character,
                      willpower: { ...character.willpower, current: v },
                    })
                  }
                  activeColor="bg-amber-500"
                />
                <div className="mt-2 flex justify-between items-center text-xs text-slate-400 font-mono">
                  <span>Aumenta Massimale Volontà (8 PE):</span>
                  <DotRating
                    min={1}
                    max={10}
                    size="sm"
                    value={character.willpower.max}
                    onChange={(v) => handleWillpowerMaxChange(v)}
                    activeColor="bg-indigo-500"
                  />
                </div>
              </div>

              {/* Moralità / Umanità / Armonia / Saggezza */}
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-200 font-medium">
                    {character.creatureType === 'vampire'
                      ? 'Umanità'
                      : character.creatureType === 'werewolf'
                      ? 'Armonia'
                      : character.creatureType === 'mage'
                      ? 'Saggezza'
                      : 'Moralità / Integrità'}
                  </span>
                  <span className="font-mono text-slate-300 font-bold">{character.morality ?? character.humanity} / 10</span>
                </div>
                <DotRating
                  min={1}
                  value={character.morality ?? character.humanity}
                  max={10}
                  size="sm"
                  onChange={(v) => handleHumanityChange(v)}
                  activeColor="bg-indigo-500"
                />
              </div>
            </div>

            {/* Salute */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-2 text-xs font-mono uppercase text-indigo-400 font-bold mb-3">
                <HeartPulse className="w-4 h-4 text-red-500" />
                <span>Tracciatore Salute</span>
              </div>
              <HealthTracker
                health={character.health}
                onChange={(updated) => onUpdateCharacter({ ...character, health: updated })}
              />
            </div>
          </div>

          {/* SEZIONE MERITI, PREGI & DIFETTI */}
          <div className="bg-slate-950/40 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <h4 className="text-xs font-mono uppercase text-amber-400 font-bold flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Pregi, Difetti & Meriti Speciali</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-400">
                {character.meritsFlaws?.length || 0} Tratti Attivi
              </span>
            </div>

            {(!character.meritsFlaws || character.meritsFlaws.length === 0) ? (
              <p className="text-xs text-slate-500 font-serif italic py-2">
                Nessun pregio o merito speciale registrato sulla scheda.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {character.meritsFlaws.map((mf) => (
                  <div
                    key={mf.id}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-serif font-bold text-sm text-slate-100 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{mf.name}</span>
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold shrink-0 ${
                        mf.type === 'merit'
                          ? 'bg-amber-950/80 border border-amber-600/70 text-amber-300'
                          : 'bg-red-950/80 border border-red-600/70 text-red-300'
                      }`}>
                        {mf.type === 'merit' ? 'Merito' : 'Difetto'} ({mf.cost > 0 ? `+${mf.cost}` : mf.cost} pt)
                      </span>
                    </div>
                    {mf.description && (
                      <p className="text-xs text-slate-400 leading-relaxed font-serif">
                        {mf.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SEZIONE BIOGRAFIA, ORIGINI & GUIDA ALL'INTERPRETAZIONE */}
          {(character.backgroundNotes || character.notes) && (
            <div className="bg-slate-950/40 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <h4 className="text-xs font-mono uppercase text-cyan-400 font-bold flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  <span>Biografia, Origini & Guida all&apos;Interpretazione</span>
                </h4>
                <span className="text-[10px] font-mono text-slate-400">
                  🎭 Profilo Narrativo Ufficiale
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/90 text-xs sm:text-sm text-slate-200 font-serif leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                {character.backgroundNotes || character.notes}
              </div>
            </div>
          )}

          {/* SEZIONE 4: INVENTARIO & EQUIPAGGIAMENTO GDR (Bloccato da modifiche arbitrarie) */}
          <div className="bg-slate-950/40 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <h4 className="text-xs font-mono uppercase text-indigo-400 font-bold flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-400" />
                <span>Inventario & Equipaggiamento GDR</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-400">
                🔒 Oggetti gestiti dalla Storia e dal Narratore
              </span>
            </div>

            <StructuredInventoryView
              character={character}
              onUpdateCharacter={onUpdateCharacter}
              allowEdit={false}
            />
          </div>
        </div>

        {/* MODAL CONFERMA SPESA XP (REGOLE UFFICIALI WOD) */}
        {pendingUpgrade && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-amber-600/70 rounded-3xl p-6 shadow-2xl space-y-4 animate-fadeIn">
              <div className="flex items-center space-x-3 text-amber-400">
                <Sparkles className="w-6 h-6 shrink-0 animate-pulse" />
                <h4 className="font-serif font-black text-lg text-slate-100">
                  Avanzamento Tratto (Regole D10)
                </h4>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Tratto Selezionato:</span>
                  <span className="font-bold text-slate-100">{pendingUpgrade.traitLabel}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-slate-800 pt-2">
                  <span className="text-slate-400">Incremento:</span>
                  <span className="font-bold text-indigo-400">
                    Livello {pendingUpgrade.oldVal} ➔ {pendingUpgrade.newVal}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-slate-800 pt-2">
                  <span className="text-slate-400">Costo XP Standard:</span>
                  <span className="font-bold text-amber-300 text-base">{pendingUpgrade.cost} XP</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-slate-800 pt-2">
                  <span className="text-slate-400">XP Guadagnati dal Narratore:</span>
                  <span className={exp.current >= pendingUpgrade.cost ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                    {exp.current} XP
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">XP Residui dopo l'acquisto:</span>
                  <span className={exp.current >= pendingUpgrade.cost ? 'text-slate-200 font-bold' : 'text-red-500 font-bold'}>
                    {exp.current - pendingUpgrade.cost >= 0 ? `${exp.current - pendingUpgrade.cost} XP` : 'Insufficienti!'}
                  </span>
                </div>
              </div>

              {exp.current < pendingUpgrade.cost && (
                <div className="flex items-center space-x-2 text-xs text-red-400 font-mono bg-red-950/40 p-2.5 rounded-xl border border-red-800/60">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Punti Esperienza insufficienti ({pendingUpgrade.cost - exp.current} mancanti). Ottienili giocando la storia!</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPendingUpgrade(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-serif text-xs uppercase font-bold cursor-pointer transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  disabled={exp.current < pendingUpgrade.cost}
                  onClick={confirmUpgrade}
                  className={`flex-1 py-2.5 rounded-xl font-serif text-xs uppercase font-bold transition-all shadow-md ${
                    exp.current >= pendingUpgrade.cost
                      ? 'bg-gradient-to-r from-amber-600 to-indigo-700 hover:from-amber-500 text-white cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  Spendi {pendingUpgrade.cost} XP
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL STORICO SPESE XP */}
        {isHistoryOpen && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-lg w-full bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[80vh] flex flex-col animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2 text-indigo-400">
                  <History className="w-5 h-5" />
                  <h4 className="font-serif font-black text-lg text-slate-100">
                    Registro Punti Esperienza (XP)
                  </h4>
                </div>
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs font-mono">
                {(!exp.history || exp.history.length === 0) ? (
                  <div className="text-center py-8 text-slate-500 font-serif italic">
                    Nessun avanzamento o punto esperienza registrato finora.
                  </div>
                ) : (
                  exp.history.map((h, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl border flex justify-between items-center ${
                        h.type === 'gain'
                          ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                          : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-200">
                          {h.type === 'gain' ? `+${h.amount} XP Guadagnati` : `-${h.amount} XP Spesi`}
                        </div>
                        <div className="text-[11px] text-slate-400">{h.reason}</div>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(h.timestamp).toLocaleDateString()} {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
