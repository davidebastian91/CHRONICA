import React, { useState } from 'react';
import {
  BookOpen,
  Dices,
  Swords,
  Droplet,
  Moon,
  Sparkles,
  X,
  Smartphone,
  Tv,
  HelpCircle,
  Shield,
  HeartPulse,
  Zap,
} from 'lucide-react';

interface QuickGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GuideTab = 'tutorial' | 'core' | 'combat' | 'vampire' | 'werewolf' | 'mage_hunter' | 'multiplayer';

export const QuickGuideModal: React.FC<QuickGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<GuideTab>('tutorial');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 px-5 sm:px-6 py-3.5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-950 border border-indigo-700/80 text-indigo-400">
              <HelpCircle className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-serif font-black text-sm sm:text-base tracking-wider uppercase text-slate-100 flex items-center gap-2">
                <span>Tutorial & Manuale Chronica</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 border border-amber-600/70 text-amber-300 font-normal">
                  Guida Ufficiale
                </span>
              </h3>
              <p className="text-[11px] text-indigo-300 font-mono">
                Come Muoversi nell'Interfaccia • Regole D10 • Guida per Nuovi Giocatori
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher Rapido per Volume */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-3 py-2 flex space-x-1.5 overflow-x-auto shrink-0 font-mono text-xs">
          {[
            { id: 'tutorial', label: 'Come Muoversi nel Gioco', icon: <Sparkles className="w-3.5 h-3.5 text-amber-300" /> },
            { id: 'core', label: 'Regole Base D10', icon: <BookOpen className="w-3.5 h-3.5" /> },
            { id: 'combat', label: 'Combattimento & Tattica', icon: <Swords className="w-3.5 h-3.5" /> },
            { id: 'vampire', label: 'Stirpe Vampirica', icon: <Droplet className="w-3.5 h-3.5 text-red-400" /> },
            { id: 'werewolf', label: 'Stirpe Mutalupo', icon: <Moon className="w-3.5 h-3.5 text-amber-400" /> },
            { id: 'mage_hunter', label: 'Stirpe Arcana & Cacciatori', icon: <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> },
            { id: 'multiplayer', label: 'Tavolo & Cellulari', icon: <Smartphone className="w-3.5 h-3.5 text-emerald-400" /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as GuideTab)}
              className={`px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer ${
                activeTab === t.id
                  ? 'bg-indigo-900 text-white font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-slate-200 text-xs sm:text-sm leading-relaxed">
          {/* TAB 0: TUTORIAL INTERFACCIA - COME MUOVERSI NEL GIOCO */}
          {activeTab === 'tutorial' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/80 border border-indigo-700/60 space-y-2">
                <div className="flex items-center space-x-2 text-amber-300 font-serif font-black text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Benvenuto su Chronica: Come Funziona il Gioco</span>
                </div>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  In Chronica giochi una storia interattiva vivente. L'<strong>IA Narratore</strong> interpreta il ruolo del Master: descrive l'ambiente, i colpi di scena, i PNG nemici o alleati, e risponde in tempo reale a qualsiasi azione compiuta dai giocatori!
                </p>
              </div>

              {/* Le 4 Aree dell'Interfaccia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <span className="font-mono text-indigo-300 font-bold flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-950 border border-indigo-500 flex items-center justify-center text-[10px] text-indigo-300">1</span>
                    <span>Il Feed della Storia (Al Centro)</span>
                  </span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Qui scorre la narrazione principale. Puoi ascoltare la voce narrante premendo sull'altoparlante, rileggere gli eventi precedenti o visualizzare lo stato della scena.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <span className="font-mono text-amber-300 font-bold flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-950 border border-amber-500 flex items-center justify-center text-[10px] text-amber-300">2</span>
                    <span>Opzioni Rapide & Azione Libera</span>
                  </span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Sotto ogni messaggio del Narratore puoi cliccare su una delle <strong>opzioni rapide</strong>, oppure digitare qualsiasi azione tu voglia nel <strong>campo di testo</strong> in basso.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <span className="font-mono text-red-400 font-bold flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-red-950 border border-red-500 flex items-center justify-center text-[10px] text-red-300">3</span>
                    <span>Tiri di Dado & Combattimento</span>
                  </span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Quando un'azione è rischiosa o entri in scontro, compare il pulsante <strong>[Lancia Dado]</strong>. Il sistema somma i tuoi tratti ed estrae i successi (soglia 8+) calcolando i danni in un unico tiro.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <span className="font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-500 flex items-center justify-center text-[10px] text-emerald-300">4</span>
                    <span>Scheda Personaggio & Munizioni</span>
                  </span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    In alto a destra trovi la tua <strong>Scheda Personaggio</strong>: consulta le caselle di Salute (da Sano a Incapacitato), ricarica le munizioni e gestisci armi e meriti.
                  </p>
                </div>
              </div>

              {/* Giocare Insieme da Smartphone */}
              <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-800/60 flex items-start space-x-3 text-xs">
                <Smartphone className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-slate-100">Vuoi giocare con gli amici dal cellulare?</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Apri il menu <strong>"Tavolo Condiviso"</strong> o inquadra il <strong>QR Code</strong> con lo smartphone. Tutti i partecipanti potranno scegliere il proprio personaggio del Cast, lanciare i dadi dal proprio telefono e agire a turno, mentre il PC proietta la cronaca per l'intero tavolo!
                  </p>
                </div>
              </div>
            </div>
          )}
          {/* TAB 1: REGOLE FONDAMENTALI STORYTELLER */}
          {activeTab === 'core' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-800/60 space-y-1.5">
                <div className="flex items-center space-x-2 font-serif font-bold text-indigo-300">
                  <Dices className="w-4 h-4 text-indigo-400" />
                  <span>La Riserva di Dadi D10 (Chronica Engine)</span>
                </div>
                <p className="text-slate-300 text-xs font-serif leading-relaxed">
                  Ogni azione si risolve sommando i pallini di un <strong>Attributo</strong> e di un'<strong>Abilità</strong> dalla tua scheda:
                </p>
                <div className="p-2 bg-slate-950/80 rounded-xl font-mono text-xs text-amber-300 font-bold text-center border border-slate-800">
                  Attributo + Abilità (+/- Modificatori Tattici) = Numero di Dadi d10
                </div>
                <p className="text-[11px] text-slate-400 italic">
                  Esempio: Destrezza (3) + Armi da Fuoco (2) = Tiri 5 dadi d10.
                </p>
              </div>

              {/* Successi, Difficoltà e Botch */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <span className="font-mono text-emerald-400 font-bold block flex items-center gap-1">
                    <span className="w-5 h-5 rounded bg-emerald-950 border border-emerald-600 flex items-center justify-center text-[10px]">6+</span>
                    <span>Difficoltà Standard</span>
                  </span>
                  <p className="text-slate-400 text-[11px]">
                    La difficoltà base è sempre <strong>6</strong>. Ogni dado che mostra 6 o più è <strong>1 Successo</strong>. Più è ardua l'azione, più alta è la difficoltà (7, 8 o 9).
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <span className="font-mono text-red-400 font-bold block flex items-center gap-1">
                    <span className="w-5 h-5 rounded bg-red-950 border border-red-600 flex items-center justify-center text-[10px]">1</span>
                    <span>La Regola dell'Uno</span>
                  </span>
                  <p className="text-slate-400 text-[11px]">
                    Ogni risultato di <strong>1</strong> cancella uno dei tuoi successi! I successi rimasti dopo la sottrazione sono i tuoi <strong>Successi Netti</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <span className="font-mono text-amber-400 font-bold block flex items-center gap-1">
                    <span className="w-5 h-5 rounded bg-amber-950 border border-amber-600 flex items-center justify-center text-[10px]">☠️</span>
                    <span>Fallimento Critico (Botch)</span>
                  </span>
                  <p className="text-slate-400 text-[11px]">
                    Se ottieni <strong>zero successi</strong> e c'è almeno un risultato di <strong>1</strong>, l'azione è un disastro imprevisto (arma inceppata, allarme scattato, caduta).
                  </p>
                </div>
              </div>

              {/* I 3 Tipi di Danno e Salute */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4" />
                  <span>I 3 Tipi di Danno (Contundente, Letale, Aggravato)</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <strong className="text-slate-100 block font-mono">1. Danno da Urto (/)</strong>
                    <span className="text-slate-400">Pugni, calci, mazze spuntate, cadute lievi. I vampiri lo dimezzano automaticamente.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <strong className="text-amber-300 block font-mono">2. Danno Letale (✕)</strong>
                    <span className="text-slate-400">Proiettili, lame, spade, asce. Fatale per gli umani; i vampiri possono assorbirlo con Costituzione.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <strong className="text-red-400 block font-mono">3. Danno Aggravato (✦)</strong>
                    <span className="text-slate-400">Fuoco, luce del sole, zanne e artigli sovrannaturali. Letale per chiunque, guaribile solo con giorni di riposo o molto sangue.</span>
                  </div>
                </div>
              </div>

              {/* Forza di Volontà */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300">Forza di Volontà (Willpower):</strong> Puoi spendere 1 punto temporaneo di Volontà per garantirti <strong>1 Successo Automatico</strong> su un tiro cruciale, oppure per resistere alla paura, alla frenesia e al controllo mentale.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMBATTIMENTO & TATTICA */}
          {activeTab === 'combat' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <Swords className="w-4 h-4 text-indigo-400" />
                  <span>I 4 Passaggi del Round di Combattimento (Chronica D10)</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <strong className="text-amber-400 font-mono block">1. Iniziativa nel Round</strong>
                    <p className="text-slate-300 text-[11px]">
                      Formula: <strong>Destrezza + Prontezza di Spirito + 1d10 + (Penalità Ferite)</strong>.
                    </p>
                    <p className="text-slate-400 text-[10px]">
                      Chi totalizza il punteggio più alto dichiara per ultimo (vede cosa fanno gli altri) e agisce per primo!
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <strong className="text-indigo-400 font-mono block">2. Attacco & Schivata</strong>
                    <p className="text-slate-300 text-[11px]">
                      Attacco: <strong>Destrezza + Rissa / Mischia / Armi da Fuoco</strong> (Diff standard 6).
                    </p>
                    <p className="text-slate-400 text-[10px]">
                      Difesa: Il difensore può schivare con <em>Destrezza + Schivare</em>. Ogni successo di schivata cancella 1 successo dell'attaccante.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <strong className="text-red-400 font-mono block">3. Riserva di Danno Arma</strong>
                    <p className="text-slate-300 text-[11px]">
                      Formula: <strong>Base Danno Arma (+ Forza se corpo a corpo) + Successi Extra d'Attacco</strong>.
                    </p>
                    <p className="text-slate-400 text-[10px]">
                      Ogni successo per colpire oltre il primo aggiunge <strong>+1 dado</strong> al tiro di danno. Si tirano tutti a <strong>Difficoltà 6</strong> (ogni dado ≥ 6 = 1 ferita potenziale).
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <strong className="text-emerald-400 font-mono block">4. Assorbimento (Soak Roll)</strong>
                    <p className="text-slate-300 text-[11px]">
                      Tiro a Difficoltà 6: ogni successo assorbito cancella 1 ferita in arrivo.
                    </p>
                    <p className="text-slate-400 text-[10px]">
                      • <em>Contundente</em>: Costituzione per tutti.
                      <br />• <em>Letale</em>: Costituzione solo per Sovrannaturali (i mortali non assorbono senza armatura!).
                      <br />• <em>Aggravato</em>: Solo con disciplina Robustezza (Fortitude).
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabella Ufficiale Danni delle Armi */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-300 flex items-center gap-1.5">
                  <Swords className="w-3.5 h-3.5 text-red-400" />
                  <span>Tabella Ufficiale Danni e Armi (Chronica Engine)</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
                    <span>👊 Pugno / Rissa:</span>
                    <strong className="text-amber-300">Forza [/ Contundente]</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
                    <span>🥋 Calcio Pesante:</span>
                    <strong className="text-amber-300">Forza + 1 [/ Contundente] (Diff 7)</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
                    <span>🗡️ Coltello / Pugnale:</span>
                    <strong className="text-red-400">Forza + 1 [✕ Letale]</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
                    <span>⚔️ Spada Corta / Machete:</span>
                    <strong className="text-red-400">Forza + 2 [✕ Letale]</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
                    <span>⚔️ Spada Larga / Katana:</span>
                    <strong className="text-red-400">Forza + 3 [✕ Letale]</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
                    <span>🗡️ Spadone a Due Mani:</span>
                    <strong className="text-red-400">Forza + 4 [✕ Letale] (Diff 7)</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
                    <span>🏏 Mazza / Bastone:</span>
                    <strong className="text-amber-300">Forza + 2 [/ Contundente]</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
                    <span>🔫 Pistola Leggera (.22/9mm):</span>
                    <strong className="text-red-400">4 Dadi [✕ Letale] (Portata 12m)</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
                    <span>🔫 Pistola Pesante (.45 ACP):</span>
                    <strong className="text-red-400">5 Dadi [✕ Letale] (Portata 20m)</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
                    <span>💥 Revolver .44 Magnum:</span>
                    <strong className="text-red-400">6 Dadi [✕ Letale] (Portata 30m)</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
                    <span>💥 Fucile a Pompa (Calibro 12):</span>
                    <strong className="text-red-400">8 Dadi [✕ Letale] (Pallettoni)</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
                    <span>🎯 Fucile d'Assalto (AK-47 / AR):</span>
                    <strong className="text-red-400">7 Dadi [✕ Letale] (Portata 60m)</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
                    <span>🏹 Arco Composito:</span>
                    <strong className="text-red-400">Forza + 1 [✕ Letale] (Portata 35m)</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
                    <span>🧛 Morso Vampirico / Zanne:</span>
                    <strong className="text-purple-400">Forza + 1 [✦ AGGRAVATO] (Diff 5)</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
                    <span>🐺 Artigli della Bestia (Mutalupo):</span>
                    <strong className="text-purple-400">Forza + 2 [✦ AGGRAVATO]</strong>
                  </div>
                </div>
              </div>

              {/* Manovre Tattiche Ufficiali */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
                  Manovre Tattiche Speciali (Selezionabili nel Lancio Dadi):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <strong className="text-slate-100 font-serif">🎯 Prendere la Mira (+1 Dado)</strong>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Passi 1 turno intero a mirare senza agire: ricevi +1 dado al tiro del turno successivo (max = Percezione).
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <strong className="text-slate-100 font-serif">⚡ Raffica Controllata (+2 Dadi)</strong>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Scarichi 3 colpi rapidi su un singolo bersaglio: ricevi +2 dadi, ma consumi 3 proiettili.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <strong className="text-slate-100 font-serif">🗡️ Attacco a Sorpresa (+2 Dadi)</strong>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Colpisci alle spalle o dall'ombra: il bersaglio non può schivare nel primo turno.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <strong className="text-slate-100 font-serif">🧱 Bersaglio con Riparo (-1 o -2 Dadi)</strong>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Se il nemico è riparato dietro un'auto, cassa o muretto, subisci penalità alla riserva d'attacco.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STIRPE VAMPIRICA */}
          {activeTab === 'vampire' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-red-950/30 border border-red-900/60 space-y-1.5">
                <div className="flex items-center space-x-2 font-serif font-bold text-red-300">
                  <Droplet className="w-4 h-4 text-red-400" />
                  <span>Stirpe Vampirica (I Predatori della Notte)</span>
                </div>
                <p className="text-slate-300 text-xs font-serif leading-relaxed">
                  I vampiri sono creature immortali legate all'ombra, alimentate dall'essenza vitale e perennemente in bilico tra la loro coscienza e la fame primordiale.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <strong className="text-red-400 font-mono block">1. Riserva di Sangue / Vitae</strong>
                  <p className="text-slate-400 text-[11px]">
                    I Punti Sangue servono per: risvegliarsi ogni notte, guarire le ferite, potenziare temporaneamente gli Attributi Fisici o alimentare i poteri sovrannaturali di stirpe.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <strong className="text-amber-400 font-mono block">2. La Sete & Frenesia</strong>
                  <p className="text-slate-400 text-[11px]">
                    Sotto provocazione estrema, fame o dolore acuto, la fame primordiale tenta di prendere il sopravvento. Si tira <strong>Autocontrollo</strong>: con zero successi scatta una furia cieca e incontrollabile.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <strong className="text-indigo-400 font-mono block">3. Paura del Fuoco e del Sole</strong>
                  <p className="text-slate-400 text-[11px]">
                    Il terrore istintivo del Fuoco e della Luce Solare (danni aggravati). Richiede un tiro di <strong>Coraggio / Fermezza</strong>: se fallito, il personaggio fugge in preda al panico.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <strong className="text-emerald-400 font-mono block">4. Umanità & Coscienza</strong>
                  <p className="text-slate-400 text-[11px]">
                    Misura il legame con la propria empatia morale. Atti crudeli e violenza gratuita richiedono prove di morale per evitare la caduta nella completa mostruosità.
                  </p>
                </div>
              </div>

              {/* Le Leggi della Notte */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1.5">
                <span className="font-mono text-slate-300 font-bold uppercase text-[11px] block text-red-300">
                  Le Leggi Fondamentali dell'Ombra:
                </span>
                <p className="text-slate-400 text-[11px]">
                  <strong>1. Il Segreto</strong> (mai svelarsi alla luce del sole ai mortali) • <strong>2. Il Territorio</strong> (rispetta i confini altrui) • <strong>3. La Discendenza</strong> (non creare nuova stirpe senza consenso del clan) • <strong>4. La Responsabilità</strong> (rispondi delle colpe dei tuoi protetti) • <strong>5. La Giustizia</strong> (solo i vertici del dominio possono decretare la condanna finale).
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: MUTALUPI: LA FURIA */}
          {activeTab === 'werewolf' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-900/60 space-y-1.5">
                <div className="flex items-center space-x-2 font-serif font-bold text-amber-300">
                  <Moon className="w-4 h-4 text-amber-400" />
                  <span>Stirpe Mutalupo (I Guerrieri del Branco)</span>
                </div>
                <p className="text-slate-300 text-xs font-serif leading-relaxed">
                  I mutalupi sono protettori primordiali della natura e del loro territorio, capaci di mutare forma e attingere alla ferocia degli spiriti guardiani.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <strong className="text-amber-400 font-mono block">1. Furia & Connessione Spirituale</strong>
                  <p className="text-slate-400 text-[11px]">
                    <strong>Furia:</strong> l'impeto da battaglia per compiere azioni esplosive ed entrare in forma bellica.  
                    <strong>Spirito:</strong> l'affinità con i mondi intangibili e le energie naturali.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <strong className="text-red-400 font-mono block">2. La Vulnerabilità: L'Argento</strong>
                  <p className="text-slate-400 text-[11px]">
                    L'argento puro brucia la carne dei mutalupi, infliggendo <strong>Danno Aggravato</strong> che non può essere rigenerato con la normale guarigione rapida.
                  </p>
                </div>
              </div>

              {/* Le 5 Forme di Mutazione */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
                  Le 5 Forme di Mutazione del Branco:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <strong className="text-slate-200 block">Forma Umana</strong>
                    <span className="text-slate-400">Aspetto civile per muoversi inosservati tra la popolazione.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <strong className="text-amber-300 block">Forma Semi-Umana</strong>
                    <span className="text-slate-400">Corporatura imponente e muscolosa (+2 Forza, +2 Costituzione).</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-red-800/80 bg-red-950/20">
                    <strong className="text-red-400 block">Forma da Battaglia</strong>
                    <span className="text-slate-300">Colosso da guerra di quasi 3 metri con zanne e artigli (+4 Forza, +1 Destrezza, +3 Costituzione). Danno aggravato naturale.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <strong className="text-amber-300 block">Forma Fera Primordiale</strong>
                    <span className="text-slate-400">Grande predatore a 4 zampe ideale per inseguimenti rapidi (+3 Forza, +2 Destrezza).</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 sm:col-span-2">
                    <strong className="text-slate-200 block">Forma Lupina Naturale</strong>
                    <span className="text-slate-400">Forma indistinguibile da un vero animale selvatico (+1 Destrezza, +2 Costituzione). Sensi sviluppatissimi.</span>
                  </div>
                </div>
              </div>

              {/* Il Terrore Primordiale */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                <strong className="text-indigo-300 block mb-0.5">Il Terrore Primordiale:</strong>
                <span className="text-slate-400 text-[11px]">
                  I testimoni mortali comuni che assistono alla Forma da Battaglia vengono sopraffatti da un terrore ancestrale istintivo, reagendo con fuga disperata o shock psicologico.
                </span>
              </div>
            </div>
          )}

          {/* TAB 5: SAPIENTI ARCANI & CACCIATORI */}
          {activeTab === 'mage_hunter' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-900/60 space-y-1.5">
                <div className="flex items-center space-x-2 font-serif font-bold text-indigo-300">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Sapienti Arcani & Cacciatori Mortali</span>
                </div>
                <p className="text-slate-300 text-xs font-serif leading-relaxed">
                  Gli studiosi dell'arcano piegano le leggi naturali attraverso la volontà e la conoscenza; i Cacciatori e i Mortali combattono l'ignoto con coraggio, pianificazione, fede e arsenali specializzati.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* MAGHI */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <span className="font-mono text-indigo-400 font-bold uppercase block flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>I Sapienti dell'Arcano</span>
                  </span>
                  <div className="space-y-1.5 text-[11px] text-slate-300">
                    <div>
                      <strong className="text-slate-100">Potere Arcano & Vie Magiche:</strong> Il punteggio arcano determina la riserva di dadi per manipolare le forze della realtà (Forze, Tempo, Spazio, Materia, Mente, Spirito, Fato).
                    </div>
                    <div>
                      <strong className="text-amber-400">Magia Sottile vs Evidente:</strong>
                      <span className="text-slate-400 block mt-0.5">
                        • <em>Sottile:</em> l'incantesimo appare come un evento naturale o una coincidenza.
                        • <em>Evidente:</em> l'effetto infrange palesemente la fisica (fulmini dalle dita, teletrasporto).
                      </span>
                    </div>
                    <div>
                      <strong className="text-red-400">Il Sovraccarico (Contraccolpo):</strong> Forzare la realtà oltre i limiti può generare risonanze ostili e contraccolpi fisici o mentali sull'incantatore.
                    </div>
                  </div>
                </div>

                {/* CACCIATORI & MORTALI */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <span className="font-mono text-emerald-400 font-bold uppercase block flex items-center gap-1.5">
                    <Shield className="w-4 h-4" />
                    <span>Cacciatori Organizzati & Mortali</span>
                  </span>
                  <div className="space-y-1.5 text-[11px] text-slate-300">
                    <div>
                      <strong className="text-slate-100">Fede Incrollabile & Risolutezza:</strong> Il potere della determinazione e del rigore morale per resistere al condizionamento mentale e alla paura.
                    </div>
                    <div>
                      <strong className="text-emerald-400">Disciplina Tattica:</strong> I veterani dell'indagine occulta sanno riconoscere le tracce delle creature e mantenere il sangue freddo davanti all'inconoscibile.
                    </div>
                    <div>
                      <strong className="text-amber-400">Equipaggiamento Speciale & Fuoco:</strong> Privi di poteri sovrumani, i cacciatori usano ingegno, trappole balistiche, armi incendiarie, luce ultravioletta e munizioni caricate a leghe specifiche per colpire le vulnerabilità nemiche.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: TAVOLO & MULTIPLAYER */}
          {activeTab === 'multiplayer' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-900/60 space-y-1.5">
                <div className="flex items-center space-x-2 font-serif font-bold text-emerald-300">
                  <Tv className="w-4 h-4 text-emerald-400" />
                  <span>Come Giocare Insieme (Schermo PC + Smartphone)</span>
                </div>
                <p className="text-slate-300 text-xs font-serif leading-relaxed">
                  Chronica trasforma una serata tra amici in un vero tavolo da gioco senza bisogno di installare app dagli store:
                </p>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <Tv className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-100 block">1. Il PC fa da Schermo del Tavolo (Narratore)</strong>
                    <span className="text-slate-400 text-[11px]">
                      Clicca su <em>"Stanza Tavolo"</em> in alto per mostrare il QR Code e il codice stanza (es. <code>CHR-7721</code>).
                    </span>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <Smartphone className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-100 block">2. I Giocatori inquadrano il QR Code col Telefono</strong>
                    <span className="text-slate-400 text-[11px]">
                      Si apre subito la scheda giocatore mobile: scelgono nome, stirpe e archetipo in 10 secondi.
                    </span>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <Dices className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-100 block">3. Lancio Dadi Sincronizzato & Blocco Furbi</strong>
                    <span className="text-slate-400 text-[11px]">
                      Quando il Narratore richiede un tiro, il pulsante appare sul telefono. I risultati appaiono all'istante sullo schermo del PC. L'inventario è protetto: gli oggetti possono essere raccolti solo se trovati nella narrazione!
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-5 sm:px-6 py-3 border-t border-slate-800 flex justify-between items-center shrink-0">
          <span className="text-[11px] font-mono text-slate-500">
            Regole motore universale Chronica D10 Engine
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md cursor-pointer transition-colors"
          >
            Chiudi Guida
          </button>
        </div>
      </div>
    </div>
  );
};
