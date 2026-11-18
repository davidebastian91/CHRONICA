import React, { useState, useEffect } from 'react';
import type { HandoutSpec } from '../types';
import { 
  X, 
  Scroll, 
  Shield, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Flame, 
  Key, 
  AlertTriangle, 
  Sparkles, 
  Check, 
  Copy, 
  Binary,
  Layers
} from 'lucide-react';
import { diceSensory } from '../utils/diceHaptics';

interface HandoutViewModalProps {
  handout: HandoutSpec | null;
  isOpen: boolean;
  onClose: () => void;
  onHandoutDecoded?: (handoutId: string) => void;
}

// Generatore di testo cifrato procedurale se non presente
function generateProceduralCipher(text: string): string {
  const cipherChars = 'ᚠᚢᚦᚨᚱᚲᚺᚾᛁᛃᛇᛈᛏᛒᛖᛗᛚᛜᛞᛟ§∆¶01789ABCDEF#@%&[]<>/';
  return text
    .split('\n')
    .map((line) => {
      if (!line.trim()) return '';
      return line
        .split('')
        .map((char) => {
          if (char === ' ') return ' ';
          if (char === '«' || char === '»' || char === '"') return char;
          const idx = Math.floor(Math.random() * cipherChars.length);
          return cipherChars[idx];
        })
        .join('');
    })
    .join('\n');
}

export const HandoutViewModal: React.FC<HandoutViewModalProps> = ({ 
  handout, 
  isOpen, 
  onClose,
  onHandoutDecoded 
}) => {
  const [showSecret, setShowSecret] = useState(false);
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptProgress, setDecryptProgress] = useState(0);
  const [scrambledDisplay, setScrambledDisplay] = useState('');
  const [candleRevealed, setCandleRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Determina se il documento è originariamente cifrato
  const isNaturallyEncrypted = Boolean(
    handout?.isEncrypted || 
    (handout?.title && /cifrat|codice|critt|segreto|intercettat/i.test(handout.title)) ||
    (handout?.subtitle && /cifrat|codice|critt/i.test(handout.subtitle))
  );

  useEffect(() => {
    if (!handout) return;
    // Reset stato al cambio di handout
    setShowSecret(false);
    setCandleRevealed(false);
    setCopied(false);

    if (handout.revealed) {
      setIsDecrypted(true);
      setScrambledDisplay(handout.content);
    } else if (isNaturallyEncrypted) {
      setIsDecrypted(false);
      setScrambledDisplay(handout.cipherText || generateProceduralCipher(handout.content));
    } else {
      setIsDecrypted(true);
      setScrambledDisplay(handout.content);
    }
  }, [handout, isNaturallyEncrypted]);

  if (!isOpen || !handout) return null;

  const isRunic = handout.type === 'runic_stone';
  const isParchment = handout.type === 'parchment' || handout.type === 'scroll';
  const isBounty = handout.type === 'bounty_poster';
  const isDispatch = handout.type === 'military_dispatch' || (!isRunic && !isParchment && !isBounty);

  // Animazione scenografica di decifrazione a matrice con audio e haptics
  const handleStartDecryption = () => {
    if (isDecrypting || isDecrypted) return;
    setIsDecrypting(true);
    setDecryptProgress(0);

    const fullContent = handout.content;
    const targetLength = fullContent.length;
    let step = 0;
    const totalSteps = 16;

    const interval = setInterval(() => {
      step++;
      const currentProgress = Math.min(100, Math.round((step / totalSteps) * 100));
      setDecryptProgress(currentProgress);

      // Suono ticchettio cipher
      diceSensory.playCipherTick();

      // Crea un testo ibrido: la prima porzione è decifrata, il resto è ancora cifrato
      const decodedCharCount = Math.floor((step / totalSteps) * targetLength);
      const decodedPart = fullContent.slice(0, decodedCharCount);
      const remainingPart = generateProceduralCipher(fullContent.slice(decodedCharCount));
      setScrambledDisplay(decodedPart + remainingPart);

      if (step >= totalSteps) {
        clearInterval(interval);
        setIsDecrypting(false);
        setIsDecrypted(true);
        setScrambledDisplay(fullContent);
        diceSensory.playDecryptSuccess();
        onHandoutDecoded?.(handout.id);
      }
    }, 75);
  };

  const handleCopyText = () => {
    if (!handout) return;
    navigator.clipboard.writeText(`${handout.title}\n\n${handout.content}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fade-in overflow-y-auto">
      <div className="relative max-w-2xl w-full flex flex-col my-auto transition-all">
        {/* Pulsante Chiusura Flottante */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 z-30 w-10 h-10 rounded-full bg-slate-900 border-2 border-amber-600/70 text-amber-200 hover:text-white hover:bg-slate-800 flex items-center justify-center shadow-2xl cursor-pointer transition-transform hover:scale-110 active:scale-95"
          title="Chiudi Documento"
        >
          <X className="w-5 h-5" />
        </button>

        {/* =================================================================== */}
        {/* STILE 1: PERGAMENA ANTICA IMPERIALE / LETTERA CON CERALACCA 3D      */}
        {/* =================================================================== */}
        {isParchment && (
          <div className="relative rounded-2xl p-6 sm:p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] overflow-hidden border-8 border-[#3b2313] bg-[#eddcb9]">
            {/* Texture Pergamena Antica con sfumature realistiche e bordi bruciati */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#f8f0dc] via-[#eddcb9] to-[#c9ad7f] opacity-95 pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(#8c6747_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
            <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(43,26,14,0.65)] pointer-events-none" />

            {/* Macchie d'inchiostro seppia d'epoca */}
            <div className="absolute bottom-6 right-8 w-24 h-16 bg-[#5c3e23]/10 rounded-full blur-xl pointer-events-none" />
            <div className="absolute top-12 left-6 w-16 h-12 bg-[#5c3e23]/10 rounded-full blur-lg pointer-events-none" />

            {/* Bordo decorativo medievale a doppio filetto */}
            <div className="relative border-2 border-[#8c6747]/50 p-5 sm:p-8 rounded-lg bg-[#eddcb9]/40 backdrop-blur-[1px]">
              {/* Sigillo di Ceralacca 3D in Rilievo in Alto a Destra */}
              <div className="absolute -top-6 right-4 sm:right-8 flex flex-col items-center select-none z-10 group">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-red-600 via-red-800 to-red-950 border-4 border-amber-900/80 shadow-[0_10px_25px_rgba(153,27,27,0.7)] flex flex-col items-center justify-center text-amber-200 text-center transform rotate-3 hover:rotate-0 transition-transform cursor-pointer">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border border-amber-400/40 flex flex-col items-center justify-center bg-red-900/60 shadow-inner">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 drop-shadow-md" />
                    <span className="text-[6px] sm:text-[7px] font-serif font-black tracking-widest text-amber-200 uppercase mt-0.5">
                      AETHELGARD
                    </span>
                  </div>
                </div>
                {/* Nastro di seta vermiglio che pende dal sigillo */}
                <div className="w-3 h-8 bg-red-900/90 rounded-b shadow-md -mt-1 transform -rotate-2" />
              </div>

              {/* Intestazione Calligrafica */}
              <div className="pr-16 sm:pr-24 mb-6 pb-4 border-b-2 border-[#8c6747]/40">
                <span className="text-[10px] sm:text-xs font-serif font-bold tracking-[0.25em] text-[#7a4e28] uppercase flex items-center gap-1.5">
                  <Scroll className="w-3.5 h-3.5" />
                  DOCUMENTO UFFICIALE DEGLI ARCHIVI REALI
                </span>
                <h2 className="text-xl sm:text-3xl font-serif font-black text-[#26150a] tracking-tight mt-1 leading-snug">
                  {handout.title}
                </h2>
                {handout.subtitle && (
                  <p className="text-xs sm:text-sm text-[#5c3e23] font-serif italic mt-1 leading-relaxed">
                    « {handout.subtitle} »
                  </p>
                )}
              </div>

              {/* Corpo del Testo Calligrafico con Capolettera Medievale */}
              <div className="font-serif text-[#2a1708] text-sm sm:text-base leading-relaxed sm:leading-loose whitespace-pre-wrap py-2 selection:bg-amber-800 selection:text-amber-100">
                {/* Capolettera stilizzata per la prima lettera */}
                <span className="float-left text-4xl sm:text-5xl font-black text-[#6b1e1e] font-serif pr-2.5 pt-1 leading-none drop-shadow-sm select-none">
                  {handout.content.trim().charAt(0) || 'D'}
                </span>
                {handout.content.trim().slice(1)}
              </div>

              {/* Interazione Inchiostro Invisibile / Nota Segreta (Candela) */}
              {(handout.secretReveal || handout.secretHint) && (
                <div className="mt-6 pt-4 border-t-2 border-dashed border-[#8c6747]/40">
                  <button
                    type="button"
                    onClick={() => {
                      setCandleRevealed(!candleRevealed);
                      diceSensory.triggerHaptic('bounce');
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl font-serif text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm ${
                      candleRevealed
                        ? 'bg-amber-900 text-amber-100 hover:bg-amber-950'
                        : 'bg-amber-200/80 hover:bg-amber-300 text-amber-900 border border-amber-800/40'
                    }`}
                  >
                    <Flame className={`w-4 h-4 ${candleRevealed ? 'text-amber-400 animate-pulse' : 'text-amber-700'}`} />
                    <span>
                      {candleRevealed
                        ? 'Allontana la Candela (Nascondi Inchiostro Simpatico)'
                        : 'Accosta la Fiamma della Candela (Rivela Note a Inchiostro Invisibile)'}
                    </span>
                  </button>

                  {candleRevealed && (
                    <div className="mt-3 p-4 rounded-xl bg-amber-950 text-amber-200 border-2 border-amber-600/60 font-serif text-xs sm:text-sm leading-relaxed shadow-inner animate-fade-in">
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[11px] mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Trascrizione Reagente al Calore
                      </div>
                      <p className="italic font-mono text-[#fde68a]">
                        « {handout.secretReveal || handout.secretHint} »
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Piè di Pagina e Firma */}
              <div className="mt-8 pt-4 border-t-2 border-[#8c6747]/40 flex flex-wrap items-center justify-between gap-3 text-xs font-serif text-[#5c3e23]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-800" />
                  <span className="italic">Conservato nel Tomo di Cronaca</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] uppercase tracking-wider text-[#7a4e28] font-bold">
                    Autore / Emittente:
                  </span>
                  <span className="font-bold text-[#2a1708] text-sm">
                    {handout.authorOrSeal || 'Re Valerius di Aethelgard'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STILE 2: DISPACCIO MILITARE CIFRATO (Sindacato Elfico / Ordini)     */}
        {/* =================================================================== */}
        {isDispatch && (
          <div className="relative rounded-3xl p-5 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden border-4 border-stone-700 bg-[#16181f] text-stone-200">
            {/* Texture dossier militare con griglia tattica */}
            <div className="absolute inset-0 bg-[radial-gradient(#2d3345_1px,transparent_1px)] [background-size:16px_16px] opacity-35 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#1b1e29] via-[#14161d] to-[#0d0e13] opacity-90 pointer-events-none" />

            {/* Bordo Rinforzato con Angolari Tattici */}
            <div className="relative z-10">
              {/* Header Tattico con Timbro di Segretezza */}
              <div className="border-b-2 border-red-700/60 pb-4 mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-700 font-bold flex items-center gap-1.5 shadow-sm">
                      <Lock className="w-3 h-3 text-red-400" />
                      STRETTAMENTE RISERVATO // OCCHI SOLTANTO
                    </span>
                    {isNaturallyEncrypted && (
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-semibold ${
                        isDecrypted 
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-700' 
                          : 'bg-amber-950 text-amber-300 border-amber-700 animate-pulse'
                      }`}>
                        {isDecrypted ? '✓ DECODIFICATO' : '⚠️ CIFRARIO ATTIVO'}
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl sm:text-2xl font-serif font-black text-white tracking-wide mt-1">
                    {handout.title}
                  </h2>
                  {handout.subtitle && (
                    <p className="text-xs text-stone-400 font-mono italic">
                      {handout.subtitle}
                    </p>
                  )}
                </div>

                {/* Timbro Rosso "CLASSIFICATO" Inclinato stile Inchiostro a Tampone */}
                <div className="px-3 py-1.5 border-2 border-red-600/80 rounded bg-red-950/40 text-red-500 font-mono font-black text-xs uppercase tracking-widest transform rotate-[-8deg] shadow-lg select-none">
                  CLASSIFICATO
                </div>
              </div>

              {/* Informazioni di Crittografia e Spiegazione GDR */}
              {isNaturallyEncrypted && (
                <div className="mb-4 p-3 rounded-xl bg-stone-900/90 border border-stone-800 flex items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Binary className="w-4 h-4 text-cyan-400" />
                    <div>
                      <span className="text-stone-300 font-bold block">
                        Stato Documento: {isDecrypted ? 'Testo in Chiaro (Decifrato)' : 'Codice Cifrato Originale'}
                      </span>
                      <span className="text-stone-500 text-[11px]">
                        {isDecrypted 
                          ? 'Chiave di decifrazione applicata con successo.' 
                          : 'Il documento è scritto con un cifrario a trasposizione elfico.'}
                      </span>
                    </div>
                  </div>

                  {/* Pulsante Toggle Codice / Decifrato quando già sbloccato */}
                  {isDecrypted && !isDecrypting && (
                    <button
                      type="button"
                      onClick={() => {
                        if (scrambledDisplay === handout.content) {
                          setScrambledDisplay(handout.cipherText || generateProceduralCipher(handout.content));
                        } else {
                          setScrambledDisplay(handout.content);
                        }
                      }}
                      className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] border border-stone-700 cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <Layers className="w-3 h-3" />
                      <span>{scrambledDisplay === handout.content ? 'Vedi Codice Grezzo' : 'Vedi Traduzione'}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Box Contenuto: Cifrato / Decrittato */}
              <div className="relative bg-black/60 rounded-2xl border border-stone-800 p-4 sm:p-6 shadow-inner font-mono text-sm leading-relaxed overflow-x-auto">
                {/* Se in corso decifrazione: Overlay barra di caricamento */}
                {isDecrypting && (
                  <div className="absolute inset-0 bg-stone-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-20 space-y-3">
                    <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-widest animate-pulse">
                      <Key className="w-4 h-4" />
                      Risoluzione Matrice Cifrata... {decryptProgress}%
                    </div>
                    <div className="w-full max-w-md bg-stone-800 rounded-full h-2.5 overflow-hidden border border-cyan-800/60 shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-cyan-600 to-emerald-500 h-full transition-all duration-75"
                        style={{ width: `${decryptProgress}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-stone-400 font-mono">
                      Analisi dei glifi e traduzione del linguaggio di codice...
                    </span>
                  </div>
                )}

                <div className={`whitespace-pre-wrap transition-colors duration-300 ${
                  isDecrypted && scrambledDisplay === handout.content 
                    ? 'text-stone-200' 
                    : 'text-amber-400/90 tracking-widest select-none font-bold'
                }`}>
                  {scrambledDisplay}
                </div>
              </div>

              {/* Pulsante d'Azione: Decifra Cifrario (se non ancora decifrato) */}
              {isNaturallyEncrypted && !isDecrypted && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleStartDecryption}
                    disabled={isDecrypting}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-stone-950 font-mono font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center space-x-2.5 shadow-[0_0_25px_rgba(245,158,11,0.35)] transition-all cursor-pointer transform hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>🔓 Decifra Codice Segreto (Applica Cifrario Tattico)</span>
                  </button>
                  <p className="text-[11px] text-stone-400 font-mono text-center mt-2 italic">
                    💡 Puoi decifrarlo subito per leggere gli ordini segreti, oppure usare un tiro di Investigare/Accademiche con il Narratore!
                  </p>
                </div>
              )}

              {/* Nota Segreta / Intercettazione Critica (es. Rivelazione su Vaelen o Mandante) */}
              {isDecrypted && (handout.secretReveal || handout.secretHint) && (
                <div className="mt-4 p-4 rounded-2xl bg-red-950/50 border-2 border-red-700/80 text-red-200 space-y-2 animate-fade-in shadow-lg">
                  <div className="flex items-center gap-2 text-red-400 font-mono text-xs font-bold uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                    <span>INTERCETTAZIONE CRITICA / SEGRETO SVELATO:</span>
                  </div>
                  <p className="font-mono text-xs sm:text-sm text-red-100 font-semibold leading-relaxed">
                    « {handout.secretReveal || handout.secretHint} »
                  </p>
                </div>
              )}

              {/* Footer con Mittente/Sigillo e Azioni Rapide */}
              <div className="mt-6 pt-4 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-stone-400">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiato!' : 'Copia Testo'}</span>
                  </button>
                </div>

                <div className="text-right">
                  <span className="block text-[10px] uppercase tracking-wider text-stone-500">
                    Origine / Trasmittente:
                  </span>
                  <span className="font-bold text-stone-200">
                    {handout.authorOrSeal || 'Comando Sicari - Sindacato Elfico'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STILE 3: TAVOLA RUNICA ANTICA / MONASTERO DI OAKHAVEN               */}
        {/* =================================================================== */}
        {isRunic && (
          <div className="relative rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(34,211,238,0.3)] border-4 border-cyan-900/60 bg-[#0c1017] text-slate-100 overflow-hidden">
            {/* Texture Basalto Roccioso con venature magiche */}
            <div className="absolute inset-0 bg-[radial-gradient(#164e63_1px,transparent_1px)] [background-size:18px_18px] opacity-40 pointer-events-none" />
            <div className="absolute inset-0 shadow-[inset_0_0_90px_rgba(8,145,178,0.25)] pointer-events-none" />

            <div className="relative z-10">
              <div className="text-center space-y-2 mb-6 border-b border-cyan-800/40 pb-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-300 bg-cyan-950/80 px-3 py-1 rounded-full border border-cyan-700/60 shadow-sm">
                  ᚱᚢᚾᚨ • Antica Incisione Runica della Cripta
                </span>
                <h2 className="text-xl sm:text-3xl font-serif font-black text-cyan-200 tracking-wide mt-1">
                  {handout.title}
                </h2>
                {handout.subtitle && (
                  <p className="text-xs text-cyan-400/80 font-mono italic">{handout.subtitle}</p>
                )}
              </div>

              {/* Riquadro Simboli Runici Fluorescenti */}
              <div className="my-4 p-4 rounded-2xl bg-cyan-950/40 border border-cyan-600/50 text-center font-mono text-cyan-300 text-lg sm:text-2xl tracking-[0.5em] select-none shadow-[0_0_20px_rgba(6,182,212,0.2)] animate-pulse">
                ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ • ᚺ ᚾ ᛁ ᛃ ᛇ ᛈ • ᛏ ᛒ ᛖ ᛗ ᛚ ᛜ ᛞ ᛟ
              </div>

              {/* Testo Tradotto / Inciso */}
              <div className="bg-slate-950/90 p-5 rounded-2xl border border-cyan-900/40 font-serif text-sm sm:text-base text-slate-200 leading-relaxed whitespace-pre-wrap shadow-inner">
                {handout.content}
              </div>

              {/* Rivelazione Segreta Esoterica */}
              {(handout.secretReveal || handout.secretHint) && (
                <div className="mt-4 pt-3 border-t border-cyan-900/40">
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="w-full py-2.5 px-4 rounded-xl bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-600/70 text-cyan-200 font-serif font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span>{showSecret ? 'Nascondi Traduzione Occulta' : '✨ Decifra Iscrizione Occulta (Tiro Superato)'}</span>
                  </button>

                  {showSecret && (
                    <div className="mt-3 p-4 rounded-xl bg-indigo-950/70 border-2 border-indigo-500/60 text-xs sm:text-sm text-indigo-200 font-serif italic leading-relaxed animate-fade-in shadow-inner">
                      🔮 <strong>Iscrizione Nascosta:</strong> {handout.secretReveal || handout.secretHint}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STILE 4: MANIFESTO DI TAGLIA / WANTED POSTER (Bounty Hunter)        */}
        {/* =================================================================== */}
        {isBounty && (
          <div className="relative rounded-xl p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.9)] border-8 border-[#4a2e18] bg-[#dfc9a5] text-[#2d1b0e] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#ead9bc] to-[#c9ad7f] opacity-90 pointer-events-none" />
            <div className="relative z-10 text-center space-y-4">
              {/* Chiodo arrugginito simulato in alto */}
              <div className="w-5 h-5 rounded-full bg-stone-800 border-2 border-stone-600 mx-auto shadow-md" />

              <h1 className="text-3xl sm:text-5xl font-black font-serif tracking-widest uppercase text-[#541c1c] border-b-4 border-[#541c1c] pb-2">
                WANTED
              </h1>
              <p className="text-xs sm:text-sm font-serif font-bold uppercase tracking-wider text-[#7a4e28]">
                RICERCATO DALLA GUARDIA CITTADINA
              </p>

              <div className="my-4 py-8 px-4 border-2 border-dashed border-[#541c1c]/60 rounded bg-[#eddcb9]/60">
                <h3 className="text-xl sm:text-2xl font-serif font-black text-[#26150a]">
                  {handout.title}
                </h3>
                <p className="text-sm font-serif italic text-[#5c3e23] mt-2 leading-relaxed">
                  {handout.content}
                </p>
              </div>

              {handout.bountyReward && (
                <div className="py-3 px-6 rounded-lg bg-[#541c1c] text-amber-200 font-serif font-black text-lg sm:text-xl tracking-wider shadow-md">
                  TAGLIA: {handout.bountyReward}
                </div>
              )}

              <p className="text-xs font-serif font-bold text-[#7a4e28] uppercase pt-2">
                VIVO O MORTO • CONSEGNARE ALLA CASERMA DEL DISTRETTO
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
