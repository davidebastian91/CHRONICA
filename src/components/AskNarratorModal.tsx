import React, { useState } from 'react';
import { HelpCircle, Mic, MicOff, Send, X, Loader2, Sparkles } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface AskNarratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitQuestion: (question: string) => Promise<void>;
  isLoading?: boolean;
}

export const AskNarratorModal: React.FC<AskNarratorModalProps> = ({
  isOpen,
  onClose,
  onSubmitQuestion,
  isLoading = false,
}) => {
  const [questionText, setQuestionText] = useState('');

  const { isListening, isSupported: isSpeechSupported, toggleListening } = useSpeechRecognition({
    onResult: (text) => setQuestionText(text),
  });

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQ = questionText.trim();
    if (!cleanQ || isLoading) return;
    await onSubmitQuestion(cleanQ);
    setQuestionText('');
    onClose();
  };

  const handleSuggestion = (s: string) => {
    setQuestionText(s);
  };

  const QUICK_QUESTIONS = [
    '🎯 Quanti nemici vedo esattamente e dove sono posizionati?',
    '🛡️ Ci sono coperture solide dietro cui ripararmi?',
    '👁️ Com\'è la visibilità e l\'illuminazione della zona?',
    '🚪 Quali sono le uscite o le vie di fuga più vicine?',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border border-cyan-800/80 rounded-2xl shadow-2xl shadow-cyan-950/60 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-cyan-950/80 to-slate-950 px-4 sm:px-5 py-3 border-b border-cyan-900/60 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-700 text-cyan-300">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm sm:text-base text-slate-100 flex items-center gap-2">
                <span>Chiedi al Narratore</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300 font-bold uppercase">
                  Fuori Gioco (OOC)
                </span>
              </h3>
              <p className="text-[11px] font-mono text-cyan-300/90">
                La scena resta congelata • Nessun turno sprecato né attacchi subiti
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo Modale */}
        <div className="p-4 sm:p-5 space-y-3.5">
          <p className="text-xs text-slate-300 leading-relaxed font-serif">
            Fai una domanda all'arbitro di gioco sull'ambiente, sui dettagli visibili o sulla disposizione
            degli avversari per pianificare al meglio la tua prossima mossa:
          </p>

          {/* Domande rapide */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Chiarimenti Rapidi Suggeriti:</span>
            </span>
            <div className="flex flex-col gap-1.5">
              {QUICK_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSuggestion(q)}
                  className="text-left px-3 py-1.5 rounded-lg bg-slate-950/80 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-700 text-xs text-slate-300 hover:text-cyan-200 transition-all font-serif cursor-pointer"
                >
                  › {q}
                </button>
              ))}
            </div>
          </div>

          {/* Form Domanda */}
          <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t border-slate-800">
            <div className="relative">
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                disabled={isLoading}
                rows={3}
                placeholder={
                  isListening
                    ? '🎙️ Sto ascoltando... Parla pure, sto trascrivendo!'
                    : 'Es: Quanti nemici vedo da qui? Ci sono coperture? Che armi impugnano?'
                }
                className={`w-full bg-slate-950 border rounded-xl p-3 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all resize-none ${
                  isListening
                    ? 'border-rose-500 ring-1 ring-rose-500 bg-slate-900/90 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                    : 'border-slate-700 focus:border-cyan-500'
                }`}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              {/* Tasto Microfono Vocale */}
              <button
                type="button"
                onClick={toggleListening}
                disabled={isLoading}
                title={
                  !isSpeechSupported
                    ? 'Riconoscimento vocale non supportato'
                    : isListening
                    ? 'Interrompi registrazione'
                    : 'Detta la domanda a voce'
                }
                className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse border border-rose-400 shadow-md'
                    : 'bg-slate-800 border border-slate-700 text-cyan-300 hover:text-white hover:border-cyan-500'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4 text-white animate-bounce" />
                    <span>In ascolto...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 text-cyan-400" />
                    <span>Detta a Voce</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-3.5 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 cursor-pointer"
                >
                  Annulla
                </button>

                <button
                  type="submit"
                  disabled={!questionText.trim() || isLoading}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-700 to-indigo-700 hover:from-cyan-600 hover:to-indigo-600 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-serif font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center space-x-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Chiedo al Narratore...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Chiedi Chiarimento</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

