import React, { useState } from 'react';
import {
  X,
  Swords,
  Crosshair,
  Dices,
  Flame,
  Image as ImageIcon,
  Search,
  Shield,
  Zap,
  Skull,
  BookOpen,
  ZoomIn,
} from 'lucide-react';
import {
  SCREEN_MELEE_WEAPONS,
  SCREEN_MELEE_NOTES,
  SCREEN_RANGED_WEAPONS,
  SCREEN_RANGED_NOTES,
  SCREEN_EXPLOSIVES,
  SCREEN_ARMOR,
  SCREEN_ARMOR_NOTES,
  SCREEN_OFFICIAL_ROLLS,
  SCREEN_COMBAT_MODIFIERS,
  SCREEN_DIFFICULTY_GRADES,
  SCREEN_STRENGTH_FEATS,
  SCREEN_MORALITY_SINS,
  SCREEN_MANIFESTATION_MODS,
  SCREEN_ELECTRICITY,
  SCREEN_FIRE_SIZE,
  SCREEN_FIRE_HEAT,
  SCREEN_POISONS,
  SCREEN_HEALING_RATES,
} from '../utils/storytellerScreenData';

import {
  BLOOD_POTENCY_TABLE,
  WEREWOLF_FORMS_TABLE,
  GNOSIS_TABLE,
  MAGE_PATHS_TABLE,
} from '../utils/wodSupernaturalRules';
import { UNIFIED_XP_COST_TABLE } from '../utils/experienceRules';

interface StorytellerScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ScreenTab = 'combat' | 'weapons' | 'lineages' | 'rolls' | 'hazards' | 'scans';

const ORIGINAL_SCANS = [
  {
    id: 1,
    title: 'Tavola 1: Combattimento, Prese, Modificatori & Occultamento',
    src: '/storyteller-screen/pannello_4_combattimento_prese_occultamento.jpg',
  },
  {
    id: 2,
    title: 'Tavola 2: Armi a Distanza, Elenco delle Prove, Risultati & Costi XP',
    src: '/storyteller-screen/pannello_3_distanza_prove_esperienza.jpg',
  },
  {
    id: 3,
    title: 'Tavola 3: Armi da Mischia, Armature, Elettricità, Fuoco, Veleni & Guarigione',
    src: '/storyteller-screen/pannello_2_mischia_armature_fuoco_veleni.jpg',
  },
  {
    id: 4,
    title: 'Tavola 4: Esplosivi, Azioni Prolungate, Oggetti, Forza & Moralità',
    src: '/storyteller-screen/pannello_1_esplosivi_oggetti_moralita.jpg',
  },
];

export const StorytellerScreenModal: React.FC<StorytellerScreenModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<ScreenTab>('combat');
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomedScan, setZoomedScan] = useState<{ title: string; src: string } | null>(null);

  if (!isOpen) return null;

  const q = searchQuery.trim().toLowerCase();

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-amber-700/60 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-slate-950 via-amber-950/30 to-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-950/80 border border-amber-600/60 flex items-center justify-center text-amber-400 shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-black text-lg sm:text-xl text-slate-100 tracking-wide">
                  Schermo del Narratore
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-950/90 text-amber-300 border border-amber-700/70">
                  Chronica D10 Engine • Motore Universale
                </span>
              </div>
              <p className="text-xs text-slate-400 font-serif">
                Tabelle ufficiali di combattimento, armi, prove, azioni prolungate, pericoli, oggetti e moralità
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca regola, arma o prova..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Chiudi Schermo del Narratore"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto bg-slate-950 border-b border-slate-800 px-3 sm:px-6 pt-2 gap-1.5 shrink-0">
          {[
            { id: 'combat', label: 'Combattimento & Prese', icon: Swords },
            { id: 'weapons', label: 'Armi, Armature & Esplosivi', icon: Crosshair },
            { id: 'lineages', label: 'Stirpi (Vampiri, Lupi, Maghi) & PE', icon: Skull },
            { id: 'rolls', label: 'Elenco Prove, Azioni & XP', icon: Dices },
            { id: 'hazards', label: 'Fuoco, Veleni, Oggetti & Moralità', icon: Flame },
            { id: 'scans', label: 'Tavole Originali (4 Pagine)', icon: ImageIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ScreenTab)}
                className={`px-3.5 py-2.5 rounded-t-xl font-mono text-xs font-bold flex items-center space-x-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 border-amber-500 text-amber-300 shadow'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-900/90">
          {/* ============================================================== */}
          {/* TAB 1: COMBATTIMENTO, PRESE, MODIFICATORI & OCCULTAMENTO       */}
          {/* ============================================================== */}
          {activeTab === 'combat' && (
            <div className="space-y-6">
              {/* Fasi del Combattimento */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-slate-950/90 border border-amber-800/50 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <h3 className="font-serif font-bold text-sm uppercase tracking-wider text-amber-300">
                      Prima Fase: Iniziativa
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Tutti tirano per l'Iniziativa: il valore corrisponde al risultato di{' '}
                    <strong className="text-amber-300 font-mono">1d10 + Destrezza + Autocontrollo</strong>. Il
                    personaggio con il grado di Iniziativa più alto agisce per primo. In alternativa, è possibile
                    ritardare l'azione a un momento successivo della lista di Iniziativa, o fino al turno seguente.
                  </p>

                  <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 pt-2">
                    <Swords className="w-4 h-4 text-red-400" />
                    <h3 className="font-serif font-bold text-sm uppercase tracking-wider text-red-300">
                      Seconda Fase: Attacco (Tiro Unico Attacco + Danno)
                    </h3>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                      <strong className="text-slate-100">Combattimento ravvicinato senza armi:</strong>{' '}
                      <span className="font-mono text-indigo-300">Forza + Lotta</span>, meno la{' '}
                      <strong>Difesa</strong> e l'<strong>Armatura</strong> del bersaglio.
                    </li>
                    <li className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                      <strong className="text-slate-100">Combattimento ravvicinato con armi:</strong>{' '}
                      <span className="font-mono text-indigo-300">Forza + Armi da Mischia (+ Danno Arma)</span>, meno
                      la <strong>Difesa</strong> e l'<strong>Armatura</strong> del bersaglio.
                    </li>
                    <li className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                      <strong className="text-slate-100">Combattimento a distanza (armi da fuoco e archi):</strong>{' '}
                      <span className="font-mono text-indigo-300">Destrezza + Armi da Fuoco (+ Danno Arma)</span>, meno
                      l'<strong>Armatura</strong> del bersaglio.
                    </li>
                    <li className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                      <strong className="text-slate-100">Combattimento a distanza (armi da lancio):</strong>{' '}
                      <span className="font-mono text-indigo-300">Destrezza + Atletica (+ Danno Arma)</span>, meno la{' '}
                      <strong>Difesa</strong> e l'<strong>Armatura</strong> del bersaglio.
                    </li>
                  </ul>
                  <div className="bg-amber-950/30 border border-amber-700/40 rounded-xl p-2.5 text-xs text-amber-200">
                    <strong>Regola del Danno Diretto:</strong> Aggiungere i dadi bonus derivati dall'arma usata o dagli
                    effetti applicati, poi sottrarre Difesa/Armatura e le penalità per le circostanze sfavorevoli.
                    Tirate la riserva che rimane: <strong>ogni successo equivale a 1 punto Salute di danno inflitto</strong>,
                    il cui tipo (C / L / A) è determinato dalla natura dell'attacco.
                  </div>
                </div>

                {/* Tabella Riassuntiva delle Prese & Occultamento */}
                <div className="space-y-4">
                  <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                    <h3 className="font-serif font-bold text-sm uppercase tracking-wider text-indigo-300 border-b border-slate-800 pb-2">
                      Tabella Riassuntiva delle Prese (Lotta)
                    </h3>
                    <ul className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
                      <li>
                        • <strong>Afferrare:</strong> L'attaccante tira{' '}
                        <span className="font-mono text-indigo-300">Forza + Lotta - Difesa</span> della vittima.
                      </li>
                      <li>
                        • <strong>Liberarsi:</strong> La vittima tira{' '}
                        <span className="font-mono text-indigo-300">Forza + Lotta - Forza</span> dell'attaccante (1
                        successo libera dalla presa).
                      </li>
                      <li>
                        • <strong>Sopraffare / Manovra:</strong> Tirare{' '}
                        <span className="font-mono text-indigo-300">Forza + Lotta - Forza</span> dell'avversario. Con 1
                        successo si compie una manovra a scelta:
                      </li>
                    </ul>
                    <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] font-mono text-amber-300">
                      <div className="bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">• Gettare a terra</div>
                      <div className="bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">• Danneggiare</div>
                      <div className="bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">• Immobilizzare</div>
                      <div className="bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">• Estrarre un'arma</div>
                      <div className="bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">• Attaccare con arma</div>
                      <div className="bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">• Rivolgere l'arma</div>
                      <div className="bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">• Disarmare</div>
                      <div className="bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">• Farsi scudo umano</div>
                    </div>
                  </div>

                  {/* Occultamento & Gradi di Sfida */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                      <h4 className="font-serif font-bold text-xs uppercase text-emerald-300 border-b border-slate-800 pb-1">
                        Occultamento e Copertura
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        <li><strong className="text-amber-300 font-mono">-1 Scarso:</strong> sedia da ufficio, cespuglio</li>
                        <li><strong className="text-amber-300 font-mono">-2 Parziale:</strong> cofano di un'auto</li>
                        <li><strong className="text-amber-300 font-mono">-3 Considerevole:</strong> dietro un'auto o in buca</li>
                        <li><strong className="text-emerald-300 font-mono">Copertura Piena:</strong> totalmente coperto (gli attacchi colpiscono la barriera)</li>
                      </ul>
                    </div>

                    <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5 space-y-1.5">
                      <h4 className="font-serif font-bold text-xs uppercase text-indigo-300 border-b border-slate-800 pb-1">
                        Applicare i Modificatori
                      </h4>
                      <div className="space-y-1 text-[11px]">
                        {SCREEN_DIFFICULTY_GRADES.map((g) => (
                          <div key={g.mod} className="flex justify-between">
                            <span className={`font-mono font-bold ${g.mod.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                              {g.mod}
                            </span>
                            <span className="text-slate-300 truncate ml-2">{g.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tutti i Modificatori di Combattimento */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="font-serif font-bold text-sm uppercase tracking-wider text-amber-300 border-b border-slate-800 pb-2">
                  Possibili Modificatori di Combattimento (Tabella Completa)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {SCREEN_COMBAT_MODIFIERS.filter(
                    (m) => !q || m.name.toLowerCase().includes(q) || m.effect.toLowerCase().includes(q)
                  ).map((mod) => (
                    <div key={mod.name} className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-2.5 text-xs">
                      <span className="font-serif font-bold text-amber-300 block">{mod.name}</span>
                      <span className="text-slate-300">{mod.effect}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: ARMI DA MISCHIA, ARMI A DISTANZA, ESPLOSIVI & ARMATURE  */}
          {/* ============================================================== */}
          {activeTab === 'weapons' && (
            <div className="space-y-6">
              {/* Tabella Armi da Mischia */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="font-serif font-bold text-sm uppercase tracking-wider text-amber-300">
                  🗡️ Tabella delle Armi da Mischia (Forza + Armi da Mischia)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px]">
                        <th className="py-2 px-3">Tipo</th>
                        <th className="py-2 px-3">Danno</th>
                        <th className="py-2 px-3">Taglia / Forza Min.</th>
                        <th className="py-2 px-3">Costo (Risorse)</th>
                        <th className="py-2 px-3">Speciale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {SCREEN_MELEE_WEAPONS.filter(
                        (w) => !q || w.type.toLowerCase().includes(q) || w.special.toLowerCase().includes(q)
                      ).map((w) => (
                        <tr key={w.type} className="hover:bg-slate-900/60">
                          <td className="py-2 px-3 font-bold text-slate-200">{w.type}</td>
                          <td className="py-2 px-3 font-mono text-red-400 font-bold">{w.damage}</td>
                          <td className="py-2 px-3 font-mono text-slate-300">{w.size}</td>
                          <td className="py-2 px-3 font-mono text-amber-400">{w.cost}</td>
                          <td className="py-2 px-3 text-slate-300">{w.special}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-slate-900/70 rounded-xl p-3 text-[11px] text-slate-400 space-y-1">
                  {SCREEN_MELEE_NOTES.map((n, i) => (
                    <p key={i}>• {n}</p>
                  ))}
                </div>
              </div>

              {/* Tabella Armi a Distanza */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="font-serif font-bold text-sm uppercase tracking-wider text-indigo-300">
                  🔫 Tabella delle Armi a Distanza (Destrezza + Armi da Fuoco)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px]">
                        <th className="py-2 px-3">Tipo</th>
                        <th className="py-2 px-3">Danno</th>
                        <th className="py-2 px-3">Gittata (B/M/L m)</th>
                        <th className="py-2 px-3">Caricatore</th>
                        <th className="py-2 px-3">Forza Min.</th>
                        <th className="py-2 px-3">Taglia</th>
                        <th className="py-2 px-3">Costo</th>
                        <th className="py-2 px-3">Esempio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {SCREEN_RANGED_WEAPONS.filter(
                        (w) => !q || w.type.toLowerCase().includes(q) || w.example.toLowerCase().includes(q)
                      ).map((w) => (
                        <tr key={w.type} className="hover:bg-slate-900/60">
                          <td className="py-2 px-3 font-bold text-slate-200">{w.type}</td>
                          <td className="py-2 px-3 font-mono text-red-400 font-bold">{w.damage}</td>
                          <td className="py-2 px-3 font-mono text-indigo-300">{w.range}</td>
                          <td className="py-2 px-3 font-mono text-slate-300">{w.magazine}</td>
                          <td className="py-2 px-3 font-mono text-slate-300">{w.minStrength}</td>
                          <td className="py-2 px-3 font-mono text-slate-300">{w.size}</td>
                          <td className="py-2 px-3 font-mono text-amber-400">{w.cost}</td>
                          <td className="py-2 px-3 text-slate-300">{w.example}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-slate-900/70 rounded-xl p-3 text-[11px] text-slate-400 space-y-1">
                  {SCREEN_RANGED_NOTES.map((n, i) => (
                    <p key={i}>• {n}</p>
                  ))}
                </div>
              </div>

              {/* Esplosivi & Armature */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Esplosivi */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h3 className="font-serif font-bold text-sm uppercase tracking-wider text-orange-400">
                    💣 Tabella degli Esplosivi (Destrezza + Atletica)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                          <th className="py-1.5 px-2">Tipo</th>
                          <th className="py-1.5 px-2">Mod. Lancio</th>
                          <th className="py-1.5 px-2">Area</th>
                          <th className="py-1.5 px-2">Danno</th>
                          <th className="py-1.5 px-2">Esempio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {SCREEN_EXPLOSIVES.map((ex) => (
                          <tr key={ex.type} className="hover:bg-slate-900/60">
                            <td className="py-2 px-2 font-bold text-slate-200">{ex.type}</td>
                            <td className="py-2 px-2 font-mono text-emerald-400">{ex.throwMod}</td>
                            <td className="py-2 px-2 font-mono text-slate-300">{ex.blastArea}</td>
                            <td className="py-2 px-2 font-mono text-red-400 font-bold">{ex.damage}</td>
                            <td className="py-2 px-2 text-slate-300">{ex.example}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Armature */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h3 className="font-serif font-bold text-sm uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Shield className="w-4 h-4" />
                    <span>Tabella delle Armature (Moderne & Antiche)</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                          <th className="py-1.5 px-2">Classe</th>
                          <th className="py-1.5 px-2">Valore (M/F)</th>
                          <th className="py-1.5 px-2">Forza</th>
                          <th className="py-1.5 px-2">Difesa</th>
                          <th className="py-1.5 px-2">Velocità</th>
                          <th className="py-1.5 px-2">Costo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {SCREEN_ARMOR.map((ar) => (
                          <tr key={ar.name} className="hover:bg-slate-900/60">
                            <td className="py-2 px-2 font-bold text-slate-200">
                              {ar.name}{' '}
                              <span className="text-[10px] font-mono text-slate-500">({ar.era})</span>
                            </td>
                            <td className="py-2 px-2 font-mono text-emerald-400 font-bold">{ar.rating}</td>
                            <td className="py-2 px-2 font-mono text-slate-300">{ar.minStrength}</td>
                            <td className="py-2 px-2 font-mono text-red-400">{ar.defensePenalty}</td>
                            <td className="py-2 px-2 font-mono text-red-400">{ar.speedPenalty}</td>
                            <td className="py-2 px-2 font-mono text-amber-400">{ar.cost}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-slate-900/70 rounded-xl p-2.5 text-[11px] text-slate-400 space-y-1">
                    {SCREEN_ARMOR_NOTES.map((n, i) => (
                      <p key={i}>• {n}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: ELENCO DELLE PROVE, AZIONI PROLUNGATE & COSTI XP        */}
          {/* ============================================================== */}
          {activeTab === 'rolls' && (
            <div className="space-y-6">
              {/* Elenco Ufficiale delle 26 Prove */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="font-serif font-bold text-sm uppercase tracking-wider text-indigo-300">
                  🎲 Elenco Ufficiale delle Prove dello Schermo del Narratore
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {SCREEN_OFFICIAL_ROLLS.filter(
                    (r) => !q || r.action.toLowerCase().includes(q) || r.pool.toLowerCase().includes(q)
                  ).map((r) => (
                    <div
                      key={r.action}
                      className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-serif font-bold text-xs text-slate-100">{r.action}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                          {r.type}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-amber-300 mt-1.5 font-semibold">{r.pool}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risultati Azioni Istantanee, Azioni Prolungate e Costi XP */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Risultati Azione Istantanea */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                  <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-amber-300 border-b border-slate-800 pb-2">
                    Risultati per Azione Istantanea (Dadi d10 ≥ 8)
                  </h4>
                  <ul className="space-y-2 text-xs">
                    <li className="bg-red-950/30 border border-red-800/50 p-2 rounded-xl">
                      <strong className="text-red-400 block">Fallimento Critico (Drammatico)</strong>
                      <span className="text-slate-300">Un risultato di 1 su un singolo tiro di opportunità (Chance Die).</span>
                    </li>
                    <li className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <strong className="text-slate-300 block">Fallimento</strong>
                      <span className="text-slate-400">Nessun successo ottenuto nel tiro.</span>
                    </li>
                    <li className="bg-emerald-950/30 border border-emerald-800/50 p-2 rounded-xl">
                      <strong className="text-emerald-400 block">Successo</strong>
                      <span className="text-slate-300">Uno o più successi ottenuti nel tiro (8, 9, 10). I 10 si ritirano!</span>
                    </li>
                    <li className="bg-amber-950/40 border border-amber-600/60 p-2 rounded-xl">
                      <strong className="text-amber-300 block">Successo Eccezionale</strong>
                      <span className="text-slate-200">Cinque o più successi ottenuti nel tiro!</span>
                    </li>
                  </ul>
                </div>

                {/* Azioni Prolungate */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                  <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-indigo-300 border-b border-slate-800 pb-2">
                    Regola Generale: Azioni Prolungate
                  </h4>
                  <div className="text-xs space-y-1">
                    <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Ritmo dell'Attività (1 Tiro =)</div>
                    <div className="flex justify-between text-slate-300"><span>Rapido:</span><span className="font-mono">1 turno (3 sec)</span></div>
                    <div className="flex justify-between text-slate-300"><span>Spedito:</span><span className="font-mono">10 minuti</span></div>
                    <div className="flex justify-between text-slate-300"><span>Esteso:</span><span className="font-mono">30 minuti</span></div>
                    <div className="flex justify-between text-slate-300"><span>Protratto:</span><span className="font-mono">1 ora</span></div>
                    <div className="flex justify-between text-slate-300"><span>Faticoso:</span><span className="font-mono">1 giorno</span></div>
                    <div className="flex justify-between text-slate-300"><span>Snervante:</span><span className="font-mono">1 settimana / mese</span></div>
                  </div>
                  <div className="text-xs space-y-1 pt-2 border-t border-slate-800">
                    <div className="text-[10px] font-mono uppercase text-amber-400 font-bold">Sfida (Successi Necessari)</div>
                    <div className="flex justify-between text-slate-300"><span>Semplice / Rilassata:</span><span className="font-mono font-bold text-amber-300">5 successi</span></div>
                    <div className="flex justify-between text-slate-300"><span>Impegnativa / Laboriosa:</span><span className="font-mono font-bold text-amber-300">10 successi</span></div>
                    <div className="flex justify-between text-slate-300"><span>Elaborata / Difficile:</span><span className="font-mono font-bold text-amber-300">15 successi</span></div>
                    <div className="flex justify-between text-slate-300"><span>Complessa / Scoraggiante:</span><span className="font-mono font-bold text-amber-300">20 successi</span></div>
                    <div className="flex justify-between text-slate-300"><span>Intricata / Epica:</span><span className="font-mono font-bold text-amber-300">25 successi</span></div>
                  </div>
                </div>

                {/* Costi dell'Esperienza & Matrice 3x3 */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-emerald-300 border-b border-slate-800 pb-2">
                    Costi dell'Esperienza (Tabella Ufficiale)
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between bg-slate-900 p-2 rounded-lg">
                      <span className="text-slate-200 font-bold">Attributo:</span>
                      <span className="font-mono text-amber-300">Nuovo pallino × 5</span>
                    </div>
                    <div className="flex justify-between bg-slate-900 p-2 rounded-lg">
                      <span className="text-slate-200 font-bold">Abilità:</span>
                      <span className="font-mono text-amber-300">Nuovo pallino × 3</span>
                    </div>
                    <div className="flex justify-between bg-slate-900 p-2 rounded-lg">
                      <span className="text-slate-200 font-bold">Specializzazione:</span>
                      <span className="font-mono text-amber-300">3 Punti fissi</span>
                    </div>
                    <div className="flex justify-between bg-slate-900 p-2 rounded-lg">
                      <span className="text-slate-200 font-bold">Pregio:</span>
                      <span className="font-mono text-amber-300">Nuovo pallino × 2</span>
                    </div>
                    <div className="flex justify-between bg-slate-900 p-2 rounded-lg">
                      <span className="text-slate-200 font-bold">Moralità:</span>
                      <span className="font-mono text-amber-300">Nuovo pallino × 3</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-[10px] font-mono uppercase text-indigo-300 font-bold block mb-1.5">
                      Matrice 3×3 Uso Attributi
                    </span>
                    <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-center">
                      <div className="text-slate-500">Uso</div>
                      <div className="text-indigo-400 font-bold">Mentali</div>
                      <div className="text-red-400 font-bold">Fisici</div>
                      <div className="text-amber-400 font-bold">Sociali</div>
                      <div className="text-slate-400 text-left">Prestanza</div>
                      <div className="bg-slate-900 p-1 rounded">Intelligenza</div>
                      <div className="bg-slate-900 p-1 rounded">Forza</div>
                      <div className="bg-slate-900 p-1 rounded">Presenza</div>
                      <div className="text-slate-400 text-left">Accuratezza</div>
                      <div className="bg-slate-900 p-1 rounded">Prontezza</div>
                      <div className="bg-slate-900 p-1 rounded">Destrezza</div>
                      <div className="bg-slate-900 p-1 rounded">Ascendente</div>
                      <div className="text-slate-400 text-left">Resistenza</div>
                      <div className="bg-slate-900 p-1 rounded">Fermezza</div>
                      <div className="bg-slate-900 p-1 rounded">Costituzione</div>
                      <div className="bg-slate-900 p-1 rounded">Autocontrollo</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: PERICOLI AMBIENTALI, OGGETTI, FORZA & MORALITÀ          */}
          {/* ============================================================== */}
          {activeTab === 'hazards' && (
            <div className="space-y-6">
              {/* Fuoco, Elettricità, Veleni e Guarigione */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Fuoco ed Elettricità */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-orange-400 border-b border-slate-800 pb-2">
                    🔥 Dettagli Fuoco & ⚡ Elettricità
                  </h4>
                  <div className="space-y-1 text-xs">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">Dimensioni del Fuoco (Danno/turno)</span>
                    {SCREEN_FIRE_SIZE.map((f) => (
                      <div key={f.size} className="flex justify-between text-slate-300">
                        <span>{f.size}:</span>
                        <span className="font-mono text-red-400 font-bold">{f.damage}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1 text-xs pt-2 border-t border-slate-800">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">Calore del Fuoco (Mod. Danno)</span>
                    {SCREEN_FIRE_HEAT.map((h) => (
                      <div key={h.heat} className="flex justify-between text-slate-300">
                        <span>{h.heat}:</span>
                        <span className="font-mono text-amber-400 font-bold">{h.mod}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1 text-xs pt-2 border-t border-slate-800">
                    <span className="text-[10px] font-mono uppercase text-cyan-400 block">Sorgenti di Elettricità</span>
                    {SCREEN_ELECTRICITY.map((e) => (
                      <div key={e.source} className="flex justify-between text-slate-300">
                        <span>{e.source}:</span>
                        <span className="font-mono text-cyan-300 font-bold">{e.damage}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Veleni e Guarigione */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-emerald-400 border-b border-slate-800 pb-2">
                    ☠️ Veleni, Tossine & Guarigione
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    {SCREEN_POISONS.map((p) => (
                      <div key={p.poison} className="flex justify-between text-slate-300 bg-slate-900/70 p-1.5 rounded-lg">
                        <span className="truncate mr-2">{p.poison}</span>
                        <span className="font-mono text-emerald-400 font-bold shrink-0">Toss. {p.toxicity}</span>
                      </div>
                    ))}
                    <p className="text-[11px] text-slate-400 pt-1">
                      <strong>Resistere al Veleno:</strong> Tirare{' '}
                      <span className="font-mono text-amber-300">Fermezza + Autocontrollo</span> in azione istintiva e
                      contrastata contro la Tossicità.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800 space-y-1.5 text-xs">
                    <span className="text-[10px] font-mono uppercase text-red-400 font-bold block">
                      Tempi di Guarigione Naturale
                    </span>
                    {SCREEN_HEALING_RATES.map((h) => (
                      <div key={h.type} className="flex justify-between text-slate-300">
                        <span>{h.type}:</span>
                        <span className="font-mono text-amber-300">{h.time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Oggetti (Durezza & Taglia) + Manifestazione */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-indigo-300 border-b border-slate-800 pb-2">
                    🧱 Gli Oggetti & Manifestazione Spiriti
                  </h4>
                  <div className="text-xs space-y-1">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">Durezza Materiali</span>
                    <div className="flex justify-between text-slate-300"><span>Legno, plastica dura, vetro spesso:</span><span className="font-mono font-bold">1</span></div>
                    <div className="flex justify-between text-slate-300"><span>Pietra, alluminio:</span><span className="font-mono font-bold">2</span></div>
                    <div className="flex justify-between text-slate-300"><span>Ferro, acciaio:</span><span className="font-mono font-bold">3</span></div>
                    <div className="text-[11px] text-slate-400 pt-1">
                      Taglia Oggetti: Pistola (1), Spada (2), Lancia (4), Porta (5), Auto sportiva (10), Fuoristrada (15), Autocarro (20).
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-800 space-y-1 text-xs">
                    <span className="text-[10px] font-mono uppercase text-indigo-300 font-bold block">
                      Modificatori alla Manifestazione
                    </span>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {SCREEN_MANIFESTATION_MODS.map((m) => (
                        <div key={m.place} className="flex justify-between text-[11px] text-slate-300">
                          <span>{m.place}</span>
                          <span className={`font-mono font-bold ${m.mod.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                            {m.mod}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Forza & Sollevamento + Moralità */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Forza & Sollevamento */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h4 className="font-serif font-bold text-sm uppercase tracking-wider text-amber-300">
                    💪 Tabella Forza, Prove & Sollevamento (Forza 1 - 15)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                    {SCREEN_STRENGTH_FEATS.map((s) => (
                      <div key={s.strength} className="flex items-center justify-between bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
                        <div>
                          <span className="font-mono font-bold text-amber-400 mr-2">For {s.strength}:</span>
                          <span className="text-slate-200">{s.feat}</span>
                        </div>
                        <span className="font-mono text-indigo-300 text-[11px] shrink-0 ml-2">{s.weight}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gerarchia dei Peccati / Moralità */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h4 className="font-serif font-bold text-sm uppercase tracking-wider text-purple-300 flex items-center gap-2">
                    <Skull className="w-4 h-4 text-purple-400" />
                    <span>Gerarchia dei Peccati (Moralità 10 - 1)</span>
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    {SCREEN_MORALITY_SINS.map((m) => (
                      <div key={m.level} className="flex items-center justify-between bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800">
                        <div className="flex items-center space-x-2.5">
                          <span className="w-6 h-6 rounded-full bg-purple-950 border border-purple-700 text-purple-300 font-mono font-bold flex items-center justify-center shrink-0">
                            {m.level}
                          </span>
                          <span className="text-slate-200">{m.sin}</span>
                        </div>
                        <span className="font-mono text-amber-300 text-[11px] shrink-0 ml-2">{m.dice}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB STIRPI SOPRANNATURALI (VAMPIRI, LUPI MANNARI, MAGHI) & PE  */}
          {/* ============================================================== */}
          {activeTab === 'lineages' && (
            <div className="space-y-6">
              {/* 1. VAMPIRI: TABELLA POTENZA DEL SANGUE */}
              <div className="bg-slate-950/90 border border-red-900/60 rounded-2xl p-4 space-y-3">
                <h3 className="font-serif font-bold text-sm uppercase tracking-wider text-red-400">
                  🧛 Sezione 2 Compendio — Vampiri: Potenza del Sangue (1–10), Vitae & Vulnerabilità
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px]">
                        <th className="py-2 px-3">Potenza</th>
                        <th className="py-2 px-3">Max Vitae</th>
                        <th className="py-2 px-3">Vitae / Turno</th>
                        <th className="py-2 px-3">Limite Tratti</th>
                        <th className="py-2 px-3">Restrizione Alimentare</th>
                        <th className="py-2 px-3">Durata Torpore (x Umanità)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {BLOOD_POTENCY_TABLE.map((row) => (
                        <tr key={row.level} className="hover:bg-slate-900/60">
                          <td className="py-1.5 px-3 font-bold text-red-400">Grado {row.level}</td>
                          <td className="py-1.5 px-3 text-slate-200">{row.maxVitae}</td>
                          <td className="py-1.5 px-3 text-amber-300">{row.vitaePerTurn} / turno</td>
                          <td className="py-1.5 px-3 text-indigo-300">{row.traitMax} pallini</td>
                          <td className="py-1.5 px-3 text-slate-300 font-sans">{row.feedingRestriction}</td>
                          <td className="py-1.5 px-3 text-purple-300">{row.baseTorporDuration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-slate-900/80 rounded-xl p-3 text-xs text-slate-300 space-y-1">
                  <p>• <strong>Spesa Vitae:</strong> 1 Vitae al risveglio notturno • 1 Vitae = cura 2 Contundenti [/] o 1 Letale [X] (azione istantanea) • 5 Vitae + 1 Volontà = cura 1 Aggravato [*] nel riposo diurno.</p>
                  <p>• <strong>Frenesia & Rötschreck:</strong> Tiro di <span className="font-mono text-amber-300">Fermezza + Autocontrollo + Potenza del Sangue</span>.</p>
                  <p>• <strong>Vulnerabilità:</strong> I proiettili normali infliggono danni Contundenti [/]. Luce Solare e Fuoco infliggono danni Aggravati [*]. Paletto nel cuore (-3 dadi, 5+ successi) paralizza il vampiro.</p>
                </div>
              </div>

              {/* 2. LUPI MANNARI: LE 5 FORME URATHA */}
              <div className="bg-slate-950/90 border border-amber-900/60 rounded-2xl p-4 space-y-3">
                <h3 className="font-serif font-bold text-sm uppercase tracking-wider text-amber-400">
                  🐺 Sezione 3 Compendio — Stirpe Mutalupo: Le 5 Forme, Rigenerazione & Argento
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px]">
                        <th className="py-2 px-3">Forma</th>
                        <th className="py-2 px-3">Forza</th>
                        <th className="py-2 px-3">Destrezza</th>
                        <th className="py-2 px-3">Costituzione</th>
                        <th className="py-2 px-3">Taglia</th>
                        <th className="py-2 px-3">Salute Extra</th>
                        <th className="py-2 px-3">Velocità</th>
                        <th className="py-2 px-3">Note & Armi Naturali</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {WEREWOLF_FORMS_TABLE.map((f) => (
                        <tr key={f.id} className="hover:bg-slate-900/60">
                          <td className="py-2 px-3 font-bold text-amber-300">
                            {f.name} <span className="text-[10px] text-slate-400 block">{f.subtitle}</span>
                          </td>
                          <td className="py-2 px-3 text-slate-200">{f.strengthMod >= 0 ? `+${f.strengthMod}` : f.strengthMod}</td>
                          <td className="py-2 px-3 text-slate-200">{f.dexterityMod >= 0 ? `+${f.dexterityMod}` : f.dexterityMod}</td>
                          <td className="py-2 px-3 text-slate-200">{f.staminaMod >= 0 ? `+${f.staminaMod}` : f.staminaMod}</td>
                          <td className="py-2 px-3 text-indigo-300">{5 + f.sizeMod}</td>
                          <td className="py-2 px-3 text-emerald-400">+{f.healthBonus} caselle</td>
                          <td className="py-2 px-3 text-amber-300">+{f.speedBonus}</td>
                          <td className="py-2 px-3 text-slate-300 font-sans text-[11px]">{f.specialNotes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-slate-900/80 rounded-xl p-3 text-xs text-slate-300 space-y-1">
                  <p>• <strong>Rigenerazione:</strong> Cura 1 danno Contundente [/] per turno automaticamente. Spende 1 Essenza per curare 1 danno Letale [X] istantaneamente (azione riflessa).</p>
                  <p>• <strong>Argento:</strong> Le armi d'argento infliggono danni Aggravati [*] non rigenerabili coi poteri rapidi (in forma umana standard infliggono danni Letali).</p>
                </div>
              </div>

              {/* 3. MAGHI: GNOSI, 5 CAMMINI & PARADOSSO */}
              <div className="bg-slate-950/90 border border-indigo-900/60 rounded-2xl p-4 space-y-3">
                <h3 className="font-serif font-bold text-sm uppercase tracking-wider text-indigo-300">
                  🔮 Sezione 4 Compendio — Sapienti dell'Arcano: Potere Arcano, 5 Cammini & Sovraccarico
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px]">
                          <th className="py-1.5 px-2">Gnosi</th>
                          <th className="py-1.5 px-2">Max Mana</th>
                          <th className="py-1.5 px-2">Mana/Turno</th>
                          <th className="py-1.5 px-2">Dadi Paradosso Base</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {GNOSIS_TABLE.map((g) => (
                          <tr key={g.level} className="hover:bg-slate-900/60">
                            <td className="py-1 px-2 font-bold text-indigo-400">Grado {g.level}</td>
                            <td className="py-1 px-2 text-slate-200">{g.maxMana}</td>
                            <td className="py-1 px-2 text-cyan-300">{g.manaPerTurn} / turno</td>
                            <td className="py-1 px-2 text-amber-300">{g.baseParadoxDice} dadi</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-mono uppercase text-indigo-300 font-bold">
                      I 5 Cammini (Paths) & Affinità Arcana
                    </div>
                    {MAGE_PATHS_TABLE.map((p) => (
                      <div key={p.id} className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-xs">
                        <div className="font-bold text-amber-300">
                          {p.name} <span className="text-slate-400 font-normal">({p.realm})</span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-300 mt-0.5">
                          • Dominanti (x6 PE): <span className="text-emerald-300 font-bold">{p.rulingArcana.join(', ')}</span> • Inferiore (x8 PE):{' '}
                          <span className="text-red-300 font-bold">{p.inferiorArcanum}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. TABELLA UNIFICATA DEI COSTI PUNTI ESPERIENZA (PE) */}
              <div className="bg-slate-950/90 border border-emerald-900/60 rounded-2xl p-4 space-y-3">
                <h3 className="font-serif font-bold text-sm uppercase tracking-wider text-emerald-300">
                  ⭐ Sezione 5 Compendio — Tabella Unificata dei Costi Punti Esperienza (PE)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {UNIFIED_XP_COST_TABLE.map((row: { trait: string; formula: string }) => (
                    <div
                      key={row.trait}
                      className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-200 font-medium">{row.trait}</span>
                      <span className="font-mono font-bold text-amber-300 shrink-0 ml-2">{row.formula}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 5: TAVOLE ORIGINALI SCANSIONATE (ZOOMABILI)                */}
          {/* ============================================================== */}
          {activeTab === 'scans' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400 font-serif">
                Clicca su una qualsiasi delle 4 tavole originali dello Schermo del Narratore per ingrandirla a tutto schermo:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ORIGINAL_SCANS.map((scan) => (
                  <div
                    key={scan.id}
                    onClick={() => setZoomedScan(scan)}
                    className="group bg-slate-950 border border-slate-800 hover:border-amber-500/80 rounded-2xl overflow-hidden shadow-lg cursor-pointer transition-all"
                  >
                    <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                      <span className="font-serif font-bold text-xs text-amber-300">{scan.title}</span>
                      <span className="text-[11px] font-mono text-indigo-300 flex items-center gap-1 group-hover:text-white">
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>Ingrandisci</span>
                      </span>
                    </div>
                    <div className="max-h-96 overflow-hidden bg-black flex items-center justify-center">
                      <img
                        src={scan.src}
                        alt={scan.title}
                        className="w-full h-auto object-contain group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Zoom Immagine Originale */}
      {zoomedScan && (
        <div
          onClick={() => setZoomedScan(null)}
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-2 sm:p-6 cursor-zoom-out"
        >
          <div className="w-full max-w-6xl flex items-center justify-between mb-3 px-2">
            <h3 className="font-serif font-bold text-sm sm:text-base text-amber-300">{zoomedScan.title}</h3>
            <button
              onClick={() => setZoomedScan(null)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono cursor-pointer"
            >
              Chiudi Zoom ✕
            </button>
          </div>
          <div className="w-full h-full overflow-auto flex items-start justify-center">
            <img
              src={zoomedScan.src}
              alt={zoomedScan.title}
              className="max-w-none w-full md:w-[1100px] h-auto rounded-xl border border-slate-700 shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

