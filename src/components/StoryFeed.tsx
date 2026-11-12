import React, { useState, useRef, useEffect } from 'react';
import type { CampaignConfig, Character, StoryMessage, RequiredRoll, HandoutSpec } from '../types';
import { narratorVoice, VOICE_OPTIONS, RATE_OPTIONS } from '../services/voice';
import { Send, Dices, User, Flame, Volume2, Square, MapPin, Sparkles, Feather, Package, Check, Zap, Loader2, Tv, Sliders, Heart, HeartCrack, Mic, MicOff, HelpCircle, Compass, Scroll } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { parseSuggestionRoll, extractRequiredRollFromText, cleanStoryTextFromRollBadges } from '../utils/traitLabels';
import { AskNarratorModal } from './AskNarratorModal';

interface StoryFeedProps {
  messages: StoryMessage[];
  campaign: CampaignConfig;
  character?: Character | null;
  isLoading: boolean;
  isInitiativePending?: boolean;
  hasHostRolledInitiative?: boolean;
  onRollInitiative?: () => void;
  onSendAction: (text: string) => void;
  onOpenDiceModal: () => void;
  onOpenSheetModal: () => void;
  onOpenMapModal: () => void;
  onTriggerRequiredRoll?: (roll: RequiredRoll) => void;
  onCollectItem?: (name: string, description?: string, lootId?: string) => void;
  claimedLoot?: Record<string, { playerId: string; playerName: string; itemName: string }>;
  onAskNarrator?: (question: string) => Promise<void>;
  onOpenHandoutModal?: (handout: HandoutSpec) => void;
  onOpenTacticalPanel?: () => void;
}

export const StoryFeed: React.FC<StoryFeedProps> = ({
  messages,
  campaign,
  character,
  isLoading,
  isInitiativePending,
  hasHostRolledInitiative,
  onRollInitiative,
  onSendAction,
  onOpenDiceModal,
  onOpenSheetModal,
  onOpenMapModal,
  onTriggerRequiredRoll,
  onCollectItem,
  claimedLoot = {},
  onAskNarrator,
  onOpenHandoutModal,
  onOpenTacticalPanel,
}) => {
  const [inputText, setInputText] = useState('');
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [currentVoiceSettings, setCurrentVoiceSettings] = useState(() => narratorVoice.getSettings());
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [isAskingNarrator, setIsAskingNarrator] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isListening, isSupported: isSpeechSupported, toggleListening } = useSpeechRecognition({
    onResult: (text) => setInputText(text),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const unsubscribe = narratorVoice.subscribe((isSpeaking, speakingId, isLoading, loadingId) => {
      setSpeakingMessageId(isSpeaking ? speakingId : null);
      setLoadingVoiceId(isLoading ? loadingId : null);
    });
    return () => {
      unsubscribe();
      narratorVoice.stop();
    };
  }, []);

  // Pre-carica automaticamente l'audio per l'ultimo messaggio del narratore non appena compare a schermo
  useEffect(() => {
    const lastNarrator = [...messages].reverse().find((m) => m.sender === 'narrator');
    if (lastNarrator && lastNarrator.text) {
      narratorVoice.prefetch(lastNarrator.text);
    }
  }, [messages]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    narratorVoice.stop();
    onSendAction(inputText.trim());
    setInputText('');
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (isLoading) return;
    narratorVoice.stop();
    onSendAction(suggestion);
  };

  const handleToggleVoice = (msgId: string, text: string) => {
    narratorVoice.speak(msgId, text);
  };

  const latestNarratorMessage = [...messages].reverse().find((m) => m.sender === 'narrator');

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Barra Info Cronaca & Stato Rapido PG */}
      <div className="bg-slate-950/90 border-b border-slate-800 px-4 sm:px-6 py-2.5 flex items-center justify-between backdrop-blur shrink-0 rounded-t-2xl">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.9)]" />
          <span className="font-serif font-bold text-sm sm:text-base text-slate-100 tracking-wide">
            {campaign.title}
          </span>
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">
            ({campaign.city} • {campaign.eraLabel || campaign.era}{campaign.timeOfDay ? ` • ${campaign.timeOfDay}` : ''})
          </span>
        </div>

        {/* Tasti Rapidi Scheda, Mappa e Dadi */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {/* Pulsante Mappa */}
          <button
            onClick={onOpenMapModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-indigo-500 text-xs sm:text-sm text-slate-200 rounded-xl transition-colors cursor-pointer shadow-sm"
            title="Apri Mappa della Notte"
          >
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline font-semibold">Mappa</span>
          </button>

          {character ? (
            <>
              {/* Badge Risorsa (Sangue / Gnosi) */}
              <div
                onClick={onOpenSheetModal}
                className="flex items-center space-x-2 px-3 py-1.5 bg-red-950/40 border border-red-800/60 rounded-xl text-xs sm:text-sm cursor-pointer hover:border-red-500 transition-colors shadow-sm"
                title={`${character.bloodOrEnergy.name}: ${character.bloodOrEnergy.current}/${character.bloodOrEnergy.max}`}
              >
                <Flame className="w-4 h-4 text-red-500" />
                <span className="font-mono text-slate-100 font-bold">
                  {character.bloodOrEnergy.current}
                </span>
              </div>

              {/* Badge Punti Esperienza (XP) */}
              <div
                onClick={onOpenSheetModal}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-950/40 border border-amber-700/60 rounded-xl text-xs sm:text-sm cursor-pointer hover:border-amber-500 transition-colors shadow-sm"
                title={`Punti Esperienza Disponibili: ${character.experience?.current || 0} XP (Totali: ${character.experience?.total || 0})`}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="font-mono text-amber-300 font-bold">
                  {character.experience?.current || 0} XP
                </span>
              </div>

              {/* Pulsante Scheda */}
              <button
                onClick={onOpenSheetModal}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-indigo-500 text-xs sm:text-sm text-slate-200 rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                <User className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline font-semibold">{character.name}</span>
              </button>
            </>
          ) : (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-950/50 border border-cyan-700/60 rounded-xl text-xs sm:text-sm text-cyan-300 font-serif font-bold shadow-sm">
              <Tv className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Schermo del Narratore</span>
              <span className="sm:hidden">Tavolo</span>
            </div>
          )}
        </div>
      </div>

      {/* Flusso Messaggi (Scrollabile) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Banner Fase Iniziativa per l'Host */}
        {isInitiativePending && !hasHostRolledInitiative && onRollInitiative && (
          <div className="p-4 bg-gradient-to-r from-amber-950 via-slate-900 to-red-950 border-2 border-amber-500 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-amber-900/80 rounded-xl border border-amber-500 text-amber-200 shrink-0">
                <Zap className="w-5 h-5 text-amber-300 animate-pulse" />
              </div>
              <div>
                <h4 className="font-serif font-black text-sm sm:text-base text-amber-100">
                  ⚡ FASE DI INIZIATIVA! Lo scontro ha inizio!
                </h4>
                <p className="text-xs text-amber-300/80 font-mono">
                  Lancia 1d10 + Iniziativa ({character ? character.attributes.dexterity + character.attributes.composure : 0} mod) per stabilire chi agisce per primo.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onRollInitiative}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-red-700 hover:from-amber-500 text-white font-serif font-black text-xs sm:text-sm rounded-xl shadow-lg cursor-pointer transition-all flex items-center space-x-2 shrink-0 animate-bounce"
            >
              <Dices className="w-4 h-4 text-amber-200" />
              <span>🎲 Lancia Iniziativa!</span>
            </button>
          </div>
        )}

        {messages.map((msg) => {
          const isNarrator = msg.sender === 'narrator';
          const isPlayer = msg.sender === 'player';
          const isCurrentlySpeaking = speakingMessageId === msg.id;
          const isCurrentlyLoading = loadingVoiceId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isPlayer ? 'items-end' : 'items-start'}`}
            >
              {/* Header messaggio */}
              <div className="flex items-center space-x-2 mb-1.5 px-1 text-xs font-mono text-slate-400 uppercase">
                {isNarrator ? (
                  <>
                    <span className="text-red-400 font-bold tracking-wider">IL NARRATORE</span>
                    <span>•</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {/* Tasto Voce Narrante Pulito e Non Sovrapposto */}
                    <button
                      type="button"
                      onClick={() => handleToggleVoice(msg.id, msg.text)}
                      className={`ml-2 px-2 py-0.5 rounded-md transition-all cursor-pointer inline-flex items-center space-x-1 text-xs shrink-0 ${
                        isCurrentlySpeaking
                          ? 'bg-red-950/90 border border-red-500 text-red-200 animate-pulse shadow-sm'
                          : isCurrentlyLoading
                          ? 'bg-amber-950/80 border border-amber-500 text-amber-200 animate-pulse'
                          : 'bg-slate-900/90 hover:bg-slate-800 border border-slate-700/70 text-indigo-300 hover:text-white'
                      }`}
                      title={
                        isCurrentlySpeaking
                          ? 'Ferma lettura vocale'
                          : isCurrentlyLoading
                          ? 'Caricamento voce...'
                          : 'Ascolta narrazione ad alta voce (Edge Neural HD)'
                      }
                    >
                      {isCurrentlySpeaking ? (
                        <Square className="w-3 h-3 text-red-400 fill-current shrink-0" />
                      ) : isCurrentlyLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin text-amber-400 shrink-0" />
                      ) : (
                        <Volume2 className="w-3 h-3 text-indigo-400 shrink-0" />
                      )}
                      <span className="text-[11px] font-sans font-medium capitalize">
                        {isCurrentlySpeaking ? 'Ferma' : isCurrentlyLoading ? 'Carica...' : 'Ascolta'}
                      </span>
                    </button>
                  </>
                ) : isPlayer ? (
                  <>
                    <span className="text-indigo-400 font-semibold">{msg.senderName || (character ? character.name : 'Giocatore')}</span>
                    <span>•</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </>
                ) : msg.isClarification ? (
                  <>
                    <span className="text-cyan-400 font-semibold flex items-center gap-1 font-mono">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Chiarimento Narratore</span>
                    </span>
                    <span>•</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </>
                ) : (
                  <span>SISTEMA</span>
                )}
              </div>

              {/* Badge Tiro Dado se presente */}
              {msg.rollResult && (
                <div className="mb-3 max-w-xl w-full bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 text-xs sm:text-sm font-mono space-y-2 shadow-md">
                  <div className="flex flex-wrap justify-between items-center gap-2 text-slate-300">
                    <div className="flex items-center gap-2">
                      <span>
                        Tiro:{' '}
                        <strong className="text-slate-100">
                          {msg.rollResult.attributeName || 'Tratto'}
                          {msg.rollResult.abilityName ? ` + ${msg.rollResult.abilityName}` : ''}
                        </strong>
                      </span>
                      {msg.rollResult.isChanceDie && (
                        <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-600 text-amber-300 text-[10px] font-bold">
                          Tiro di Fortuna
                        </span>
                      )}
                      {msg.rollResult.willpowerSpent && (
                        <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-600 text-indigo-300 text-[10px] font-bold">
                          Volontà (+3)
                        </span>
                      )}
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        msg.rollResult.outcome === 'botch'
                          ? 'bg-red-950 text-red-300 border border-red-700'
                          : msg.rollResult.outcome === 'exceptional'
                          ? 'bg-amber-950 text-amber-300 border border-amber-600'
                          : msg.rollResult.outcome === 'success'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {msg.rollResult.outcome === 'botch' && 'FALLIMENTO DRAMMATICO (1 SU FORTUNA)'}
                      {msg.rollResult.outcome === 'failure' && 'FALLIMENTO (0 SUCCESSI)'}
                      {msg.rollResult.outcome === 'success' && `SUCCESSO (${msg.rollResult.netSuccesses})`}
                      {msg.rollResult.outcome === 'exceptional' && `SUCCESSO ECCEZIONALE (${msg.rollResult.netSuccesses})`}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap pt-1">
                    {msg.rollResult.dice.map((d, i) => {
                      const basePool = Math.max(1, msg.rollResult?.pool || 1);
                      const isExploded = i >= basePool && (msg.rollResult?.explodedDice?.length || 0) > 0;
                      const isChance = Boolean(msg.rollResult?.isChanceDie);
                      const isSuccess = isChance ? d === 10 : d >= 8;
                      const isDramaticOne = isChance && d === 1 && i === 0;

                      return (
                        <span
                          key={i}
                          title={isExploded ? 'Dado Esploso (10-Again / 9-Again)' : undefined}
                          className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm ${
                            isDramaticOne
                              ? 'bg-red-950 border border-red-600 text-red-300 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                              : isSuccess && isExploded
                              ? 'bg-amber-950 border border-amber-400 text-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                              : isSuccess
                              ? 'bg-emerald-950 border border-emerald-600 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                              : 'bg-slate-900 border border-slate-800 text-slate-400'
                          }`}
                        >
                          {d}
                          {isExploded && (
                            <span className="absolute -top-1 -right-1 text-[8px] bg-amber-500 text-slate-950 font-black px-0.5 rounded-full">
                              💥
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Corpo Messaggio */}
              <div
                className={`max-w-3xl rounded-2xl p-5 sm:p-6 text-base sm:text-lg leading-relaxed shadow-lg ${
                  msg.isClarification
                    ? 'bg-slate-950/95 border-2 border-cyan-800/80 shadow-cyan-950/40 text-slate-200'
                    : isNarrator
                    ? 'bg-slate-950/85 border border-slate-800 text-slate-200 font-serif'
                    : isPlayer
                    ? 'bg-indigo-950/40 border border-indigo-900/60 text-slate-100 font-sans'
                    : 'bg-slate-900/40 border border-slate-800/40 text-slate-400 text-sm font-mono'
                }`}
              >
                {msg.isClarification ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-cyan-800/60 pb-2">
                      <span className="flex items-center space-x-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider">
                        <HelpCircle className="w-4 h-4 text-cyan-300" />
                        <span>Chiarimento del Narratore (Fuori Gioco)</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300 font-bold uppercase">
                        Scena Congelata
                      </span>
                    </div>
                    {msg.clarificationQuestion && (
                      <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs sm:text-sm font-sans text-slate-300 italic">
                        <strong className="text-cyan-300 not-italic">{msg.senderName || 'Giocatore'} ha chiesto:</strong> "{msg.clarificationQuestion}"
                      </div>
                    )}
                    <div className="p-3.5 bg-gradient-to-r from-cyan-950/60 via-slate-950 to-indigo-950/60 border border-cyan-600/70 rounded-xl font-serif text-sm sm:text-base text-cyan-100 leading-relaxed shadow-sm">
                      {cleanStoryTextFromRollBadges(msg.text)}
                    </div>
                  </div>
                ) : msg.text.includes('💬 Narrazione del Giocatore:') ? (
                  <div className="space-y-3">
                    <div className="whitespace-pre-wrap">
                      {cleanStoryTextFromRollBadges(msg.text.split('💬 Narrazione del Giocatore:')[0].trim())}
                    </div>
                    <div className="p-3.5 bg-gradient-to-r from-amber-950/50 via-slate-900 to-indigo-950/50 border border-amber-500/60 rounded-xl font-serif italic text-amber-100 shadow-md">
                      <div className="text-[11px] font-mono not-italic uppercase tracking-wider text-amber-400 font-bold mb-1 flex items-center gap-1.5">
                        <Feather className="w-3.5 h-3.5" />
                        <span>Dettaglio d'Azione Narrato dal Giocatore:</span>
                      </div>
                      <div className="text-sm sm:text-base text-slate-100">
                        {msg.text.split('💬 Narrazione del Giocatore:')[1].trim()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{cleanStoryTextFromRollBadges(msg.text)}</div>
                )}

                {/* Banner Premio Punti Esperienza (XP) */}
                {msg.xpAward && (
                  <div className="mt-4 p-3.5 bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/60 border border-amber-500/80 rounded-xl shadow-lg flex items-center justify-between gap-3 font-sans animate-fadeIn">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-amber-900/60 border border-amber-500 text-amber-200 shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.5)]">
                        <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                      </div>
                      <div>
                        <div className="font-serif font-black text-amber-300 text-sm sm:text-base flex items-center space-x-1.5">
                          <span>+{msg.xpAward.amount} Punti Esperienza Assegnati!</span>
                        </div>
                        <p className="text-xs text-amber-200/80 italic mt-0.5">
                          {msg.xpAward.reason}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-amber-950/90 border border-amber-600/70 text-amber-300 font-bold">
                        Ricompensa D10
                      </span>
                    </div>
                  </div>
                )}

                {/* Banner Bottino / Oggetto Narrativo Trovato */}
                {msg.itemAward && (
                  <div className="mt-4 p-3.5 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/70 border border-emerald-500/80 rounded-xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans animate-fadeIn">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-emerald-900/60 border border-emerald-500 text-emerald-200 shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.5)]">
                        <Package className="w-5 h-5 text-emerald-300 animate-pulse" />
                      </div>
                      <div>
                        <div className="font-serif font-black text-emerald-300 text-sm sm:text-base flex items-center space-x-1.5">
                          <span>🎁 Oggetto Trovato: {msg.itemAward.name}</span>
                        </div>
                        <p className="text-xs text-emerald-200/80 italic mt-0.5">
                          {msg.itemAward.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {(() => {
                        const lootId = `${msg.id}_loot`;
                        const claim = claimedLoot[lootId];
                        if (claim) {
                          return (
                            <span className="inline-flex items-center space-x-1 text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 font-bold">
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Preso da {claim.playerName}</span>
                            </span>
                          );
                        }
                        if (character && character.inventory && character.inventory.includes(msg.itemAward.name)) {
                          return (
                            <span className="inline-flex items-center space-x-1 text-xs font-mono px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold">
                              <Check className="w-3.5 h-3.5" />
                              <span>Nell'Inventario</span>
                            </span>
                          );
                        }
                        return (
                          <button
                            type="button"
                            onClick={() => onCollectItem && onCollectItem(msg.itemAward!.name, msg.itemAward!.description, lootId)}
                            className="px-3 py-1.5 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white font-serif font-bold text-xs rounded-lg shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
                          >
                            <Package className="w-3.5 h-3.5 text-emerald-200" />
                            <span>Raccogli Oggetto</span>
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Banner Danno Subito dal Protagonista */}
                {msg.playerDamageAward && (
                  <div className="mt-3 p-3 bg-gradient-to-r from-red-950/80 via-rose-950/80 to-slate-950 border border-red-600/80 rounded-xl shadow flex items-center justify-between font-sans">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1.5 rounded-lg bg-red-900 border border-red-500 text-red-200">
                        <HeartCrack className="w-4 h-4 text-red-400" />
                      </div>
                      <div>
                        <div className="text-[11px] font-mono uppercase text-red-400 font-bold tracking-wider">
                          🩸 Ferita Subita ({msg.playerDamageAward.type === 'aggravated' ? 'Danni Aggravati *' : msg.playerDamageAward.type === 'lethal' ? 'Danni Letali X' : 'Danni Contundenti /'})
                        </div>
                        <div className="text-xs text-red-200 font-serif">
                          {msg.playerDamageAward.reason || 'Danno inflitto dal Narratore'}
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-red-900/90 text-red-100 font-mono font-bold text-xs border border-red-500 shadow">
                      -{msg.playerDamageAward.points} Salute
                    </span>
                  </div>
                )}

                {/* Banner Cura Ricevuta dal Protagonista */}
                {msg.playerHealAward && (
                  <div className="mt-3 p-3 bg-gradient-to-r from-emerald-950/80 via-teal-950/80 to-slate-950 border border-emerald-600/80 rounded-xl shadow flex items-center justify-between font-sans">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1.5 rounded-lg bg-emerald-900 border border-emerald-500 text-emerald-200">
                        <Heart className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-[11px] font-mono uppercase text-emerald-400 font-bold tracking-wider">
                          💚 Salute Risanata / Cura
                        </div>
                        <div className="text-xs text-emerald-200 font-serif">
                          {msg.playerHealAward.reason || 'Cura / Riposo'}
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-900/90 text-emerald-100 font-mono font-bold text-xs border border-emerald-500 shadow">
                      +{msg.playerHealAward.points} Salute
                    </span>
                  </div>
                )}

                {/* Banner Tiro Richiesto dal Narratore (con fallback automatico da testo) */}
                {(() => {
                  const rollToRender = msg.requiredRoll || (msg.text ? extractRequiredRollFromText(msg.text) : undefined);
                  if (!rollToRender) return null;
                  return (
                    <div className="mt-4 p-4 bg-gradient-to-r from-red-950/70 via-indigo-950/70 to-slate-950 border border-red-500/80 rounded-xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 rounded-xl bg-red-900/60 border border-red-600 text-red-200 shrink-0 mt-0.5">
                          <Dices className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                          <div className="text-[11px] font-mono uppercase text-red-400 font-bold tracking-wider">
                            🎲 Tiro di Dado Richiesto dal Narratore
                          </div>
                          <div className="text-sm font-bold text-slate-100 font-serif flex flex-wrap items-center gap-1.5">
                            <span>{rollToRender.attribute} + {rollToRender.ability || 'Nessuna'} • Soglia Fissa 8+ (10-Again)</span>
                            {rollToRender.modifier !== undefined && rollToRender.modifier !== 0 && (
                              <span className={`px-2 py-0.5 text-xs font-mono font-bold rounded-lg ${
                                rollToRender.modifier < 0
                                  ? 'bg-red-950 border border-red-600 text-red-300'
                                  : 'bg-emerald-950 border border-emerald-600 text-emerald-300'
                              }`}>
                                Mod: {rollToRender.modifier > 0 ? `+${rollToRender.modifier}` : rollToRender.modifier}
                              </span>
                            )}
                          </div>
                          {rollToRender.reason && (
                            <div className="text-xs text-slate-300 italic mt-0.5">
                              {rollToRender.reason}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          narratorVoice.stop();
                          if (onTriggerRequiredRoll) {
                            onTriggerRequiredRoll(rollToRender);
                          } else {
                            onOpenDiceModal();
                          }
                        }}
                        className="px-4 py-2.5 bg-gradient-to-r from-red-700 to-indigo-700 hover:from-red-600 hover:to-indigo-600 text-white font-serif font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer shrink-0"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Lancia {rollToRender.attribute} + {rollToRender.ability || 'Dadi'}</span>
                      </button>
                    </div>
                  );
                })()}

                {/* Banner Schizzo Tattico Minimale Rilevato */}
                {msg.battlemap && (
                  <div className="mt-3 p-3.5 bg-gradient-to-r from-cyan-950/90 via-slate-900 to-indigo-950/80 border border-cyan-500/70 rounded-xl shadow-lg flex items-center justify-between gap-3 font-sans animate-fadeIn">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-cyan-900/60 border border-cyan-400 text-cyan-200 shrink-0">
                        <Compass className="w-4 h-4 text-cyan-300 animate-pulse" />
                      </div>
                      <div>
                        <div className="text-[11px] font-mono uppercase text-cyan-400 font-bold tracking-wider">
                          🧭 Schizzo Tattico Disponibile
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-cyan-100 font-serif">
                          {msg.battlemap.title || 'Mappa Tattica della Zona'}
                        </div>
                        {msg.battlemap.locationName && (
                          <div className="text-[11px] text-cyan-300/80 italic">
                            Luogo: {msg.battlemap.locationName}
                          </div>
                        )}
                      </div>
                    </div>
                    {onOpenTacticalPanel && (
                      <button
                        type="button"
                        onClick={onOpenTacticalPanel}
                        className="px-3 py-1.5 bg-gradient-to-r from-cyan-700 to-blue-700 hover:from-cyan-600 hover:to-blue-600 text-white font-serif font-bold text-xs rounded-lg shadow-md transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>Visualizza</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Banner Reperto di Gioco / Documento Antico */}
                {msg.handout && (
                  <div className="mt-3 p-3.5 bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-950/70 border-2 border-amber-600/80 rounded-xl shadow-xl flex items-center justify-between gap-3 font-sans animate-fadeIn">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-amber-900/60 border border-amber-500 text-amber-200 shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.5)]">
                        <Scroll className="w-4 h-4 text-amber-300 animate-pulse" />
                      </div>
                      <div>
                        <div className="text-[11px] font-mono uppercase text-amber-400 font-bold tracking-wider">
                          📜 Reperto Rinvenuto
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-amber-100 font-serif">
                          {msg.handout.title}
                        </div>
                        {msg.handout.subtitle && (
                          <div className="text-[11px] text-amber-300/70 italic">
                            {msg.handout.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                    {onOpenHandoutModal && (
                      <button
                        type="button"
                        onClick={() => onOpenHandoutModal(msg.handout!)}
                        className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-serif font-black text-xs rounded-xl shadow-lg transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
                      >
                        <Scroll className="w-3.5 h-3.5" />
                        <span>Ispeziona Reperto</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center space-x-3 text-indigo-400 text-sm font-serif italic py-3 px-1">
            <div className="w-3.5 h-3.5 rounded-full bg-indigo-500 animate-ping" />
            <span>Il Narratore sta contemplando l'oscurità...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Sticky Bar: Voce Narratore in Riproduzione (Accessibile ovunque mentre si legge o si scorre) */}
      {(speakingMessageId || loadingVoiceId) && (
        <div className="mx-3 sm:mx-6 mb-2 p-2 sm:p-2.5 px-3 sm:px-4 bg-gradient-to-r from-red-950 via-slate-900 to-red-950 border border-red-500/80 rounded-2xl flex items-center justify-between backdrop-blur-md shadow-[0_4px_25px_rgba(220,38,38,0.45)] shrink-0 z-30 animate-pulse">
          <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0 mr-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500 animate-ping shrink-0" />
            <div className="text-xs sm:text-sm font-serif text-red-200 truncate">
              <span className="font-bold text-white">
                {loadingVoiceId ? 'Caricamento voce narratore...' : 'Voce Narratore attiva'}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowVoiceSettings(true)}
              className="px-2 sm:px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs rounded-xl transition-all flex items-center space-x-1 cursor-pointer"
              title="Cambia voce o velocità"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Opzioni</span>
            </button>
            <button
              type="button"
              onClick={() => narratorVoice.stop()}
              className="px-3 sm:px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-mono uppercase font-bold text-xs rounded-xl transition-all flex items-center space-x-1 sm:space-x-1.5 cursor-pointer shadow hover:shadow-red-500/50"
            >
              <Square className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
              <span>Ferma</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal Impostazioni Voce Rapido */}
      {showVoiceSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl text-slate-100 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <h3 className="font-serif font-bold text-base text-white">Impostazioni Voce Narratore HD</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowVoiceSettings(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono uppercase text-slate-400 block mb-1.5 font-semibold">
                  Voce Neurale (Microsoft Edge HD)
                </label>
                <div className="space-y-1.5">
                  {VOICE_OPTIONS.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        narratorVoice.setSettings({ voice: v.id });
                        setCurrentVoiceSettings(narratorVoice.getSettings());
                      }}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                        currentVoiceSettings.voice === v.id
                          ? 'bg-indigo-950/70 border-indigo-500 text-white shadow-sm'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-xs sm:text-sm">{v.label}</div>
                        <div className="text-[11px] text-slate-400">{v.desc}</div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0 ml-2">
                        {v.gender}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-mono uppercase text-slate-400 block mb-1.5 font-semibold">
                  Velocità di Lettura
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {RATE_OPTIONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => {
                        narratorVoice.setSettings({ rate: r.value });
                        setCurrentVoiceSettings(narratorVoice.getSettings());
                      }}
                      className={`p-2 rounded-xl text-center text-xs font-medium border transition-all cursor-pointer ${
                        currentVoiceSettings.rate === r.value
                          ? 'bg-red-950/80 border-red-500 text-red-200 font-bold'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowVoiceSettings(false)}
                className="px-4 py-2 bg-gradient-to-r from-red-800 to-indigo-900 hover:from-red-700 hover:to-indigo-800 text-white rounded-xl text-xs font-semibold cursor-pointer shadow"
              >
                Salva & Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sezione Azioni Suggerite */}
      {latestNarratorMessage?.suggestedActions &&
        latestNarratorMessage.suggestedActions.length > 0 &&
        !isLoading && (
          <div className="px-3 sm:px-6 py-2.5 sm:py-3 border-t border-slate-800/80 bg-slate-950/90 space-y-2 shrink-0">
            <span className="text-xs font-mono uppercase text-slate-400 tracking-wider block font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Opzioni Tattiche Immediate (Clicca per lanciare i dadi o narrare):</span>
            </span>
            <div className="flex flex-col gap-2 w-full">
              {latestNarratorMessage.suggestedActions.map((sugg, idx) => {
                const parsed = parseSuggestionRoll(sugg);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      narratorVoice.stop();
                      if (parsed.hasRoll && onTriggerRequiredRoll) {
                        onTriggerRequiredRoll({
                          attribute: parsed.attribute || 'Destrezza',
                          ability: parsed.ability,
                          modifier: parsed.modifier,
                          difficulty: 8,
                          reason: parsed.cleanText,
                        });
                      } else {
                        handleSuggestionClick(parsed.cleanText);
                      }
                    }}
                    className="w-full p-2.5 sm:p-3 bg-slate-900/90 hover:bg-indigo-950/80 active:bg-indigo-900 border border-slate-800 hover:border-indigo-500/80 text-slate-200 hover:text-white text-xs sm:text-sm rounded-xl transition-all text-left cursor-pointer font-serif shadow-sm flex items-start sm:items-center justify-between gap-3 group"
                  >
                    <span className="italic flex-1 min-w-0 break-words whitespace-normal leading-relaxed">
                      › {parsed.cleanText}
                    </span>
                    {parsed.hasRoll ? (
                      <span className="shrink-0 mt-0.5 sm:mt-0 px-2.5 py-1 rounded-lg bg-indigo-950 border border-indigo-700/80 text-indigo-300 group-hover:text-amber-300 group-hover:border-amber-500/70 text-[11px] font-mono font-bold flex items-center space-x-1.5 transition-all shadow-sm">
                        <Dices className="w-3.5 h-3.5 text-indigo-400 group-hover:text-amber-400 group-hover:rotate-12 transition-transform" />
                        <span>{parsed.rollLabel}</span>
                      </span>
                    ) : (
                      <span className="shrink-0 mt-0.5 sm:mt-0 text-[11px] text-slate-500 font-mono">› Narra</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

      {/* Input Azione Utente */}
      <div className="p-3 sm:p-5 bg-slate-950 border-t border-slate-800 rounded-b-2xl shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2 sm:space-x-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            placeholder={isListening ? "🎙️ Sto ascoltando... Parla pure!" : "Descrivi cosa fa il tuo personaggio..."}
            className={`flex-1 bg-slate-900/90 border rounded-2xl px-5 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all ${
              isListening
                ? 'border-rose-500/80 shadow-[0_0_12px_rgba(244,63,94,0.3)] bg-slate-900/95'
                : 'border-slate-700/80 focus:border-indigo-500'
            }`}
          />

          {/* Tasto Dedicato: Chiedi al Narratore (Chiarimento Fuori Gioco) */}
          <button
            type="button"
            onClick={() => setIsAskModalOpen(true)}
            disabled={isLoading}
            title="Chiedi un chiarimento sulla scena al Narratore (senza avanzare la storia)"
            className="p-3 sm:px-3.5 sm:py-3 rounded-2xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/80 hover:border-cyan-500 text-cyan-300 hover:text-white transition-all shadow-md flex items-center space-x-1.5 cursor-pointer shrink-0 font-serif text-xs sm:text-sm font-bold"
          >
            <HelpCircle className="w-5 h-5 text-cyan-400" />
            <span className="hidden sm:inline">Chiedi al Narratore</span>
          </button>

          {/* Pulsante Riconoscimento Vocale (Speech-to-Text) */}
          <button
            type="button"
            onClick={toggleListening}
            disabled={isLoading}
            title={
              !isSpeechSupported
                ? 'Riconoscimento vocale non supportato da questo browser'
                : isListening
                ? 'Termina registrazione vocale'
                : 'Detta a voce la tua azione'
            }
            className={`p-3 rounded-2xl transition-all shadow-lg flex items-center justify-center shrink-0 cursor-pointer ${
              isListening
                ? 'bg-rose-600 text-white animate-pulse shadow-[0_0_15px_rgba(225,29,72,0.8)] border border-rose-400'
                : 'bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:border-indigo-500'
            }`}
          >
            {isListening ? (
              <MicOff className="w-6 h-6 text-white animate-bounce" />
            ) : (
              <Mic className="w-6 h-6 text-indigo-400" />
            )}
          </button>

          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-3 bg-gradient-to-r from-red-800 to-indigo-900 hover:from-red-700 hover:to-indigo-800 disabled:from-slate-900 disabled:to-slate-900 disabled:text-slate-600 text-white rounded-2xl transition-all shadow-lg shadow-indigo-950/70 cursor-pointer disabled:cursor-not-allowed"
          >
            <Send className="w-6 h-6" />
          </button>
        </form>
      </div>

      {/* Modale Chiedi al Narratore (Chiarimento Fuori Gioco) */}
      <AskNarratorModal
        isOpen={isAskModalOpen}
        onClose={() => setIsAskModalOpen(false)}
        isLoading={isAskingNarrator}
        onSubmitQuestion={async (q) => {
          if (onAskNarrator) {
            setIsAskingNarrator(true);
            try {
              await onAskNarrator(q);
            } finally {
              setIsAskingNarrator(false);
            }
          }
        }}
      />
    </div>
  );
};
