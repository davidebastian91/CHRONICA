import React, { useState } from 'react';
import type { HandoutSpec } from '../types';
import { X, Scroll, Shield, Eye, EyeOff } from 'lucide-react';

interface HandoutViewModalProps {
  handout: HandoutSpec | null;
  isOpen: boolean;
  onClose: () => void;
}

export const HandoutViewModal: React.FC<HandoutViewModalProps> = ({ handout, isOpen, onClose }) => {
  const [showSecret, setShowSecret] = useState(false);

  if (!isOpen || !handout) return null;

  const isRunic = handout.type === 'runic_stone';
  const isParchment = handout.type === 'parchment' || handout.type === 'scroll';
  const isDispatch = handout.type === 'military_dispatch' || handout.type === 'bounty_poster';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="relative max-w-2xl w-full flex flex-col max-h-[90vh]">
        {/* Pulsante Chiusura Flottante */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 z-20 w-9 h-9 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center shadow-2xl cursor-pointer transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* =================================================================== */}
        {/* STILE 1: TAVOLA RUNICA ANTICA (Per Grom / Monastero di Oakhaven)   */}
        {/* =================================================================== */}
        {isRunic && (
          <div className="relative bg-[#0d1117] border-4 border-slate-700 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(34,211,238,0.25)] text-slate-100 overflow-y-auto">
            {/* Effetto texture pietra di basalto */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

            <div className="text-center space-y-2 mb-6 border-b border-cyan-900/60 pb-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 bg-cyan-950/80 px-3 py-1 rounded-full border border-cyan-800/80">
                ᚱᚢᚾᚨ • Antica Incisione Runica della Cripta
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-black text-cyan-200 tracking-wide mt-1">
                {handout.title}
              </h2>
              {handout.subtitle && (
                <p className="text-xs text-slate-400 font-mono italic">{handout.subtitle}</p>
              )}
            </div>

            {/* Simboli Runici Decorativi */}
            <div className="my-4 p-4 rounded-2xl bg-cyan-950/30 border border-cyan-800/50 text-center font-mono text-cyan-300 text-lg sm:text-xl tracking-[0.4em] select-none shadow-inner">
              ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ • ᚺ ᚾ ᛁ ᛃ ᛇ ᛈ • ᛏ ᛒ ᛖ ᛗ ᛚ ᛜ ᛞ ᛟ
            </div>

            {/* Testo Tradotto */}
            <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-3 font-serif text-sm sm:text-base text-slate-200 leading-relaxed whitespace-pre-wrap">
              {handout.content}
            </div>

            {/* Sezione Rivelazione Segreta (Tiro Occulto) */}
            {handout.secretReveal && (
              <div className="mt-4 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/70 border border-cyan-700/80 text-cyan-200 font-serif font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{showSecret ? 'Nascondi Interpretazione Esoterica' : 'Decifra Iscrizione Occulta (Tiro Superato)'}</span>
                </button>

                {showSecret && (
                  <div className="mt-3 p-4 rounded-xl bg-indigo-950/60 border border-indigo-700 text-xs sm:text-sm text-indigo-200 font-serif italic leading-relaxed animate-fade-in">
                    🔮 <strong>Iscrizione Nascosta:</strong> {handout.secretReveal}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* STILE 2: PERGAMENA CON CERALACCA (Re Valerius / Contratti Imperiali) */}
        {/* =================================================================== */}
        {isParchment && (
          <div className="relative bg-[#f5e6c8] border-8 border-[#3e2717] rounded-3xl p-6 sm:p-10 shadow-[0_0_60px_rgba(0,0,0,0.8)] text-[#2d1b0e] overflow-y-auto max-h-[85vh]">
            {/* Texture pergamena ingiallita */}
            <div className="absolute inset-0 bg-[radial-gradient(#c2a677_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

            {/* Sigillo Reale di Ceralacca in alto a destra */}
            <div className="absolute top-4 right-6 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-red-700 to-red-950 border-4 border-amber-900 shadow-2xl flex flex-col items-center justify-center text-amber-200 text-center select-none rotate-6">
              <span className="text-[7px] font-mono uppercase font-bold tracking-tighter">SIGILLO REALE</span>
              <Shield className="w-6 h-6 text-amber-300 drop-shadow-md" />
              <span className="text-[6px] font-mono tracking-widest mt-0.5">AETHELGARD</span>
            </div>

            <div className="pr-16 mb-6 border-b-2 border-[#8c6747]/40 pb-4">
              <span className="text-[10px] font-serif uppercase tracking-widest text-[#8c6747] font-bold block">
                MANDATO UFFICIALE DELLA CORONA
              </span>
              <h2 className="text-xl sm:text-3xl font-serif font-black text-[#2d1b0e] tracking-tight mt-1">
                {handout.title}
              </h2>
              {handout.subtitle && (
                <p className="text-xs text-[#5c3e23] font-serif italic mt-0.5">{handout.subtitle}</p>
              )}
            </div>

            {/* Contenuto Calligrafico */}
            <div className="font-serif text-sm sm:text-base text-[#2d1b0e] leading-relaxed whitespace-pre-wrap py-2 border-l-2 border-[#8c6747]/40 pl-4 my-2">
              {handout.content}
            </div>

            {/* Firma e Autore */}
            <div className="mt-6 pt-4 border-t-2 border-[#8c6747]/40 flex items-center justify-between text-xs font-serif italic text-[#5c3e23]">
              <span>Registrato negli Archivi di Palazzo</span>
              <span className="font-bold text-[#2d1b0e] not-italic text-sm">
                {handout.authorOrSeal || 'Re Valerius di Aethelgard'}
              </span>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STILE 3: DISPACCIO MILITARE / TAGLIA (Guerra di Confine)            */}
        {/* =================================================================== */}
        {isDispatch && (
          <div className="relative bg-[#1a1c23] border-4 border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 overflow-y-auto">
            <div className="border-b-2 border-red-700/70 pb-3 mb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                  DISPACCIO TATTICO SEGRETO
                </span>
                <h2 className="text-lg sm:text-2xl font-serif font-bold text-slate-100 mt-1">
                  {handout.title}
                </h2>
              </div>
              <div className="w-10 h-10 rounded-full bg-red-900/40 border border-red-700 flex items-center justify-center text-red-400">
                <Scroll className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 text-sm font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">
              {handout.content}
            </div>

            {handout.authorOrSeal && (
              <div className="mt-4 text-right text-xs font-mono text-slate-400">
                Firmato: <span className="text-slate-200 font-bold">{handout.authorOrSeal}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
