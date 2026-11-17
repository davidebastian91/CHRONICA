import React, { useState } from 'react';
import {
  X,
  Sparkles,
  FileText,
  Upload,
  Loader2,
  Copy,
  Check,
  Download,
  ArrowRight,
  BookOpen,
  Users,
  Compass,
  MapPin,
  Wand2,
} from 'lucide-react';

export interface ForgedStoryResult {
  title: string;
  location: string;
  era: string;
  customEraDescription?: string;
  initialLight?: string;
  summary: string;
  storyOutline: string;
  characters: any[];
  fullExportText: string;
}

interface StoryForgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToCampaign: (forged: ForgedStoryResult) => void;
}

export const StoryForgeModal: React.FC<StoryForgeModalProps> = ({
  isOpen,
  onClose,
  onApplyToCampaign,
}) => {
  const [storyInput, setStoryInput] = useState('');
  const [charactersInput, setCharactersInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExtractingFile, setIsExtractingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ForgedStoryResult | null>(null);
  const [activeTab, setActiveTab] = useState<'outline' | 'characters' | 'export'>('outline');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'story' | 'chars') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtractingFile(true);
    setError(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          resolve(res.split(',')[1] || res);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const fileBase64 = await base64Promise;

      const res = await fetch('/api/extract-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64, fileName: file.name }),
      });

      if (res.ok) {
        const data = await res.json();
        const extracted = (data.text || '').trim();
        if (target === 'story') {
          setStoryInput((prev) => (prev ? `${prev}\n\n${extracted}` : extracted));
        } else {
          setCharactersInput((prev) => (prev ? `${prev}\n\n${extracted}` : extracted));
        }
      } else {
        throw new Error('Impossibile estrarre il testo dal file.');
      }
    } catch {
      // Fallback a lettura testo locale
      const reader = new FileReader();
      reader.onload = (event) => {
        const txt = (event.target?.result as string) || '';
        if (target === 'story') {
          setStoryInput((prev) => (prev ? `${prev}\n\n${txt}` : txt));
        } else {
          setCharactersInput((prev) => (prev ? `${prev}\n\n${txt}` : txt));
        }
      };
      reader.readAsText(file);
    } finally {
      setIsExtractingFile(false);
    }
  };

  const handleForge = async () => {
    if (!storyInput.trim() || storyInput.trim().length < 20) {
      setError('Inserisci almeno un paragrafo della tua storia o canovaccio.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/forge-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyText: storyInput,
          charactersText: charactersInput,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Errore HTTP ${res.status}`);
      }

      const data: ForgedStoryResult = await res.json();
      setResult(data);
    } catch (err: any) {
      console.error('Errore compilazione trama:', err);
      setError(err.message || 'Errore durante la compilazione della storia con l\'IA.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const textToCopy = result.fullExportText || result.storyOutline;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result) return;
    const textToSave = result.fullExportText || result.storyOutline;
    const blob = new Blob([textToSave], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${result.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Bibbia_Regia_Chronica.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-indigo-950/80 flex flex-col h-[92vh] overflow-hidden">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-950 px-4 sm:px-6 py-3.5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-900/60 border border-purple-500/70 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.4)]">
              <Wand2 className="w-5 h-5 text-purple-300 animate-pulse" />
            </div>
            <div>
              <h3 className="font-serif font-black text-sm sm:text-base text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <span>Atelier della Trama & Cast</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 border border-purple-500/80 text-purple-200">
                  Compilatore IA
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Incolla il tuo racconto, romanzo o appunti sparsi: l'IA li trasforma nella Bibbia tecnica e nel Cast per Chronica.
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

        {/* CORPO */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {!result ? (
            /* =================================================================== */
            /* FASE 1: INSERIMENTO MATERIALE GREZZO                                */
            /* =================================================================== */
            <div className="space-y-5 max-w-4xl mx-auto">
              <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-950 p-4 rounded-xl border border-indigo-800/50 text-xs sm:text-sm text-slate-300 leading-relaxed">
                💡 <strong className="text-purple-300">Come funziona:</strong> Incolla qui sotto la storia che hai scritto a romanzo, gli appunti su Word, capitoli di libro o schemi sparsi. L'IA la organizzerà in <strong>Atti, bivi, indizi segreti e schede personaggio D10</strong>, pronta da giocare o scaricare su file!
              </div>

              {error && (
                <div className="p-3 bg-red-950/80 border border-red-500/80 rounded-xl text-red-200 text-xs sm:text-sm">
                  ⚠️ {error}
                </div>
              )}

              {/* Area 1: Trama / Romanzo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-serif font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    <span>La tua Trama / Canovaccio / Capitolo di Romanzo:</span>
                  </label>

                  <label className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs text-indigo-300 cursor-pointer transition-colors shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Carica File (.docx / .txt)</span>
                    <input
                      type="file"
                      accept=".docx,.txt,.doc"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'story')}
                    />
                  </label>
                </div>

                <textarea
                  value={storyInput}
                  onChange={(e) => setStoryInput(e.target.value)}
                  placeholder="Incolla qui la tua trama... Puoi scrivere a mo' di romanzo, mettere appunti disordinati, una sinossi o un capitolo intero. Ad esempio: 'I tre compagni Kael, Grom e Silas si ritrovano alle porte della Fortezza di Grigioferro durante una tempesta. Kael cerca vendetta per la sua famiglia, mentre Grom nasconde un manufatto...'"
                  rows={9}
                  className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl p-3.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 font-sans leading-relaxed shadow-inner"
                />
              </div>

              {/* Area 2: Personaggi e Note (Facoltativa) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-serif font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span>Note sui Personaggi o Protagonisti (Facoltativo):</span>
                  </label>

                  <label className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs text-purple-300 cursor-pointer transition-colors shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Carica Note (.docx / .txt)</span>
                    <input
                      type="file"
                      accept=".docx,.txt,.doc"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'chars')}
                    />
                  </label>
                </div>

                <textarea
                  value={charactersInput}
                  onChange={(e) => setCharactersInput(e.target.value)}
                  placeholder="Se hai già descrizioni sui personaggi (nomi, carattere, armi, classi, ruoli), incollale qui. Altrimenti l'IA li ricaverà automaticamente dal testo della storia."
                  rows={4}
                  className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl p-3 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 font-sans leading-relaxed shadow-inner"
                />
              </div>

              {/* Pulsante Azione */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleForge}
                  disabled={isProcessing || isExtractingFile}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-600 to-amber-600 hover:from-purple-600 hover:to-amber-500 text-white font-serif font-black text-sm uppercase tracking-wider shadow-xl shadow-purple-950/60 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-200" />
                      <span>Elaborazione Trama & Calcolo D10 in corso...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                      <span>Compila e Organizza per il Narratore IA</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* =================================================================== */
            /* FASE 2: RISULTATO STRUTTURATO (BIBBIA & CAST)                       */
            /* =================================================================== */
            <div className="space-y-5">
              {/* Scheda Riepilogo Rilevato */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/80 via-slate-950 to-indigo-950/80 border border-purple-600/60 shadow-lg flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-900 border border-purple-400 text-purple-200 uppercase font-bold">
                      Cronaca Generata
                    </span>
                    <span className="text-xs font-mono text-amber-300 font-bold flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5" />
                      <span>{result.customEraDescription || result.era}</span>
                    </span>
                    <span className="text-xs font-mono text-slate-300 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{result.location}</span>
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-serif font-black text-slate-100">
                    {result.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 font-serif italic max-w-3xl">
                    "{result.summary}"
                  </p>
                </div>

                {/* Pulsante Inizia Subito la Campagna */}
                <button
                  type="button"
                  onClick={() => {
                    onApplyToCampaign(result);
                    onClose();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 text-white font-serif font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg flex items-center space-x-2 cursor-pointer transition-all"
                >
                  <span>Applica & Crea Campagna</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Tasti Navigazione Schede del Risultato */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('outline')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-serif font-bold flex items-center space-x-1.5 cursor-pointer transition-colors ${
                      activeTab === 'outline'
                        ? 'bg-purple-950 border border-purple-500 text-purple-200'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                    <span>Bibbia a 3 Atti & Regole</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('characters')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-serif font-bold flex items-center space-x-1.5 cursor-pointer transition-colors ${
                      activeTab === 'characters'
                        ? 'bg-purple-950 border border-purple-500 text-purple-200'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                    <span>Cast & Schede D10 ({result.characters.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('export')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-serif font-bold flex items-center space-x-1.5 cursor-pointer transition-colors ${
                      activeTab === 'export'
                        ? 'bg-purple-950 border border-purple-500 text-purple-200'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                    <span>File di Testo da Scaricare</span>
                  </button>
                </div>

                {/* Azioni di Esportazione Rapida */}
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs text-slate-200 flex items-center space-x-1.5 cursor-pointer transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-indigo-400" />}
                    <span>{copied ? 'Copiato!' : 'Copia'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs text-slate-200 flex items-center space-x-1.5 cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Scarica (.txt)</span>
                  </button>
                </div>
              </div>

              {/* CONTENUTO SCHEDA ATTIVA */}
              {activeTab === 'outline' && (
                <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl font-serif text-sm text-slate-200 whitespace-pre-wrap leading-relaxed shadow-inner">
                  {result.storyOutline}
                </div>
              )}

              {activeTab === 'characters' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.characters.map((ch: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-purple-600/70 transition-all space-y-2 shadow-md"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                        <span className="font-serif font-black text-sm text-purple-300">
                          {ch.name}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-200">
                          {ch.concept || 'Protagonista'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 italic font-serif">
                        {ch.backgroundNotes || ch.bio || 'Personaggio del Cast pronto all\'uso.'}
                      </p>
                      {ch.factionOrClan && (
                        <div className="text-[11px] font-mono text-slate-400">
                          Fazione: <strong className="text-slate-200">{ch.factionOrClan}</strong>
                        </div>
                      )}
                      {ch.attributes && (
                        <div className="p-2 rounded bg-slate-900 border border-slate-800/80 text-[10px] font-mono text-slate-300 grid grid-cols-3 gap-1">
                          <span>FOR: {ch.attributes.strength || 2}</span>
                          <span>DES: {ch.attributes.dexterity || 2}</span>
                          <span>COS: {ch.attributes.stamina || 2}</span>
                          <span>INT: {ch.attributes.intelligence || 2}</span>
                          <span>PRO: {ch.attributes.wits || 2}</span>
                          <span>RIS: {ch.attributes.resolve || 2}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'export' && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400 font-sans">
                    Questo è il testo completo generato: puoi copiarlo, leggerlo o salvarlo come documento di testo per conservare la trama della tua campagna.
                  </div>
                  <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-300 whitespace-pre-wrap max-h-[400px] overflow-y-auto shadow-inner">
                    {result.fullExportText}
                  </pre>
                </div>
              )}

              {/* Pulsante Torna a Modifica */}
              <div className="pt-2 flex justify-between items-center border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-serif cursor-pointer"
                >
                  ← Inserisci un'altra storia
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onApplyToCampaign(result);
                    onClose();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 text-white font-serif font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg flex items-center space-x-2 cursor-pointer transition-all"
                >
                  <span>Applica & Crea Campagna Subito</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
