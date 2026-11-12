import React, { useState } from 'react';
import {
  Sparkles,
  Compass,
  Dices,
  Swords,
  Smartphone,
  Shield,
  HelpCircle,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Tv,
  MessageSquare,
  Zap,
} from 'lucide-react';

interface GameTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GameTutorialModal: React.FC<GameTutorialModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(() => {
    return localStorage.getItem('chronica_tutorial_seen') === 'true';
  });

  if (!isOpen) return null;

  const handleFinish = () => {
    if (dontShowAgain) {
      localStorage.setItem('chronica_tutorial_seen', 'true');
    }
    onClose();
  };

  const steps = [
    {
      id: 'welcome',
      badge: 'Passo 1 di 5 • Benvenuto',
      title: 'Cos\'è Chronica?',
      subtitle: 'Il tuo Tavolo di Gioco di Ruolo guidato da un\'IA Master',
      icon: <Sparkles className="w-6 h-6 text-amber-300" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Benvenuto in <strong>Chronica</strong>! È una piattaforma interattiva che trasforma il tuo dispositivo in una vera sessione di gioco di ruolo dal vivo.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-800/60 space-y-1.5">
              <div className="flex items-center space-x-2 text-indigo-300 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <span>IA Narratore Master</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Narra gli eventi, descrive gli ambienti, interpreta i comprimari e reagisce a ogni tua scelta.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="flex items-center space-x-2 text-slate-200 font-bold text-xs">
                <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Libertà di Ambientazione</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Dal Far West al Fantasy, dal Giappone feudale al moderno tattico, o carica la tua trama da file Word/Excel.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="flex items-center space-x-2 text-slate-200 font-bold text-xs">
                <Dices className="w-4 h-4 text-red-400 shrink-0" />
                <span>Regolamento D10 (Chronica Engine)</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Riserva di dadi D10, soglie di successo dinamiche, salute a 7 stadi e combattimenti tattici cinematografici per qualsiasi genere narrativo.
              </p>
            </div>
          </div>
          <div className="p-3 bg-amber-950/30 border border-amber-700/50 rounded-xl flex items-center space-x-2 text-xs text-amber-200">
            <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Non serve alcuna preparazione complessa: basta leggere e decidere cosa fare!</span>
          </div>
        </div>
      ),
    },
    {
      id: 'actions',
      badge: 'Passo 2 di 5 • Come Agire',
      title: 'Come Muoversi nella Storia',
      subtitle: 'Scegli un\'opzione o scrivi qualsiasi azione in libertà',
      icon: <MessageSquare className="w-6 h-6 text-indigo-400" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            In ogni momento dell'avventura hai a disposizione due modi per far avanzare la cronaca:
          </p>
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-indigo-700/60 space-y-2">
              <span className="text-xs font-mono font-bold uppercase text-indigo-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>1. Opzioni Rapide Suggerite (1-Click)</span>
              </span>
              <p className="text-slate-400 text-xs">
                Al termine di ogni descrizione del Narratore troverai 3 o 4 pulsanti di scelta tattica o d'indagine. Cliccane uno per agire all'istante:
              </p>
              <div className="flex flex-wrap gap-2 pt-1 pointer-events-none opacity-90">
                <span className="px-3 py-1.5 rounded-xl bg-indigo-950 border border-indigo-600 text-indigo-200 text-xs font-serif">
                  🔍 "Esamino i documenti sulla scrivania..."
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-serif">
                  🚪 "Apro la porta sul retro con cautela..."
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-red-950/70 border border-red-700 text-red-200 text-xs font-serif">
                  ⚔️ "Estraggo l'arma e intimo l'alt..."
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <span className="text-xs font-mono font-bold uppercase text-emerald-400 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" />
                <span>2. Casella di Testo Libera (Creatività Totale)</span>
              </span>
              <p className="text-slate-400 text-xs">
                Vuoi fare qualcosa di inaspettato o dire una battuta specifica? Scrivilo direttamente nel campo in basso (es. <em>"Cerco di distrarre la guardia lanciando una pietra"</em> o <em>"Parlo sottovoce al mio compagno"</em>). L'IA comprenderà le tue intenzioni e adatterà la storia!
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'dice_combat',
      badge: 'Passo 3 di 5 • Meccaniche & Tiri',
      title: 'Lancio dei Dadi & Combattimento',
      subtitle: 'Il motore a riserva di dadi (D10) con soglia di successo 8+',
      icon: <Dices className="w-6 h-6 text-red-400" />,
      content: (
        <div className="space-y-3.5">
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Quando un'azione comporta un pericolo, un confronto o un attacco, il Narratore richiede un <strong>tiro di dado</strong>:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/60 space-y-1.5">
              <span className="font-mono text-indigo-300 font-bold block flex items-center gap-1">
                <span>🎲 Il Pulsante del Tiro</span>
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Sotto il messaggio del Narratore comparirà un pulsante lampeggiante (es. <em>[Tira Destrezza + Armi da Fuoco]</em>). Cliccalo per aprire il lanciatore dadi con il pool già calcolato dalla tua scheda!
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
              <span className="font-mono text-emerald-400 font-bold block flex items-center gap-1">
                <span>🎯 Successi & Soglia 8+</span>
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Ogni dado che mostra <strong>8, 9 o 10</strong> è un successo. I 10 esplodono (regola 10-Again). Basta anche 1 solo successo netto per riuscire nell'intento!
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-red-950/20 border border-red-800/50 space-y-1.5">
            <span className="font-mono text-xs text-red-400 font-bold uppercase flex items-center gap-1.5">
              <Swords className="w-4 h-4" />
              <span>Combattimento Rapido a Tiro Unico</span>
            </span>
            <p className="text-slate-300 text-xs leading-relaxed">
              Nessun rallentamento: ogni successo ottenuto in attacco infligge direttamente 1 punto di danno alla Salute del nemico. Armatura e Difesa riducono i colpi in automatico.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'sheet_inventory',
      badge: 'Passo 4 di 5 • Scheda Personaggio',
      title: 'Scheda, Salute & Inventario',
      subtitle: 'Tieni d\'occhio ferite, abilità e cartucce',
      icon: <Shield className="w-6 h-6 text-emerald-400" />,
      content: (
        <div className="space-y-3.5">
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Cliccando sul tuo nome o sul pulsante <strong>"Scheda Personaggio"</strong> in alto (o su smartphone), visualizzi:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="font-mono text-red-400 font-bold block">❤️ Caselle di Salute</span>
              <p className="text-slate-400 text-[11px]">
                Da "Sano" fino a "Incapacitato". Man mano che subisci danni subentrano penalità ai tiri (-1, -2, -3).
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="font-mono text-amber-300 font-bold block">📊 Attributi & Abilità</span>
              <p className="text-slate-400 text-[11px]">
                I pallini che determinano quanti dadi tiri nelle prove fisiche, mentali o sociali.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="font-mono text-indigo-300 font-bold block">🎒 Armi & Munizioni</span>
              <p className="text-slate-400 text-[11px]">
                Visualizza armi impugnate, munizioni rimanenti e oggetti speciali. Puoi anche ricaricare le armi con 1 click.
              </p>
            </div>
          </div>
          <div className="p-3 bg-indigo-950/30 border border-indigo-700/50 rounded-xl text-xs text-indigo-200">
            💡 <em>L'IA Narratore tiene conto delle munizioni reali: se finisci i colpi, l'arma scatta a vuoto e dovrai trovare riparo o combattere in mischia!</em>
          </div>
        </div>
      ),
    },
    {
      id: 'multiplayer',
      badge: 'Passo 5 di 5 • Tavolo & Smartphone',
      title: 'Multiplayer & Schermo Condiviso',
      subtitle: 'Gioca da solo o con gli amici attorno al tavolo',
      icon: <Smartphone className="w-6 h-6 text-emerald-400" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Chronica è studiato sia per giocare in <strong>solitario</strong> che per sessioni di gruppo al tavolo:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-800/60 space-y-1.5">
              <span className="font-mono text-indigo-300 font-bold flex items-center gap-1.5">
                <Tv className="w-4 h-4 text-cyan-400" />
                <span>PC come Schermo del Tavolo</span>
              </span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Avvia la cronaca sul PC e usalo come schermo centrale del Narratore: mostra il testo grande per tutti, la mappa e la voce narrante.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 space-y-1.5">
              <span className="font-mono text-emerald-300 font-bold flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Smartphone per i Giocatori</span>
              </span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Tutti i giocatori possono connettersi inquadrando il <strong>QR Code</strong> o aprendo il link della stanza. Ognuno ha la propria scheda, i propri dadi e le proprie opzioni sul telefono!
              </p>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div className="text-xs">
              <span className="text-slate-200 font-bold block">Tutto pronto per cominciare!</span>
              <span className="text-slate-400">Clicca sul pulsante qui sotto per iniziare l'avventura.</span>
            </div>
            <button
              type="button"
              onClick={handleFinish}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-serif font-bold text-xs rounded-xl shadow-lg cursor-pointer transition-all flex items-center space-x-1.5"
            >
              <span>Entra nel Gioco</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ),
    },
  ];

  const current = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modalità Tutorial */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 px-5 sm:px-6 py-3.5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-950 border border-indigo-700 text-indigo-400">
              {current.icon}
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold block">
                {current.badge}
              </span>
              <h3 className="font-serif font-black text-sm sm:text-base text-slate-100">
                {current.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl transition-colors cursor-pointer"
            title="Chiudi Tutorial"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="bg-slate-950/80 px-5 py-2 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            {steps.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentStep
                    ? 'w-8 bg-amber-400'
                    : idx < currentStep
                    ? 'w-3 bg-indigo-500'
                    : 'w-3 bg-slate-800 hover:bg-slate-700'
                }`}
                title={`Vai a: ${s.title}`}
              />
            ))}
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {current.subtitle}
          </span>
        </div>

        {/* Contenuto della Slide */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-slate-200">
          {current.content}
        </div>

        {/* Footer Navigazione */}
        <div className="bg-slate-950 px-5 sm:px-6 py-3.5 border-t border-slate-800 flex items-center justify-between shrink-0">
          <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => {
                setDontShowAgain(e.target.checked);
                if (e.target.checked) {
                  localStorage.setItem('chronica_tutorial_seen', 'true');
                } else {
                  localStorage.removeItem('chronica_tutorial_seen');
                }
              }}
              className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
            />
            <span className="text-[11px]">Non mostrare più all'avvio</span>
          </label>

          <div className="flex items-center space-x-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-mono transition-colors cursor-pointer flex items-center space-x-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Indietro</span>
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-serif transition-colors cursor-pointer flex items-center space-x-1 shadow-md shadow-indigo-950"
              >
                <span>Avanti</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-serif transition-colors cursor-pointer flex items-center space-x-1 shadow-md shadow-emerald-950"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ho Capito, Gioca!</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
