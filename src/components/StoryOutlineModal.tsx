import React, { useState } from 'react';
import type { CampaignConfig, CustomStoryOutline } from '../types';
import { X, BookOpen, Upload, FileText, Check, AlertCircle, Save, Sparkles, Trash2 } from 'lucide-react';

interface StoryOutlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: CampaignConfig;
  onUpdateStoryOutline: (outline: CustomStoryOutline | undefined) => void;
}

export const StoryOutlineModal: React.FC<StoryOutlineModalProps> = ({
  isOpen,
  onClose,
  campaign,
  onUpdateStoryOutline,
}) => {
  const currentOutline = campaign.customStoryOutline;
  const [content, setContent] = useState<string>(currentOutline?.content || '');
  const [fileName, setFileName] = useState<string | undefined>(currentOutline?.fileName);
  const [isSavedRecently, setIsSavedRecently] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
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
        setContent(data.text || '');
      } else {
        throw new Error('Errore estrazione');
      }
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        setContent((event.target?.result as string) || '');
      };
      reader.readAsText(file);
    }
  };

  const handleSave = () => {
    const trimmed = content.trim();
    if (!trimmed) {
      onUpdateStoryOutline(undefined);
    } else {
      const words = trimmed.split(/\s+/).filter(Boolean).length;
      onUpdateStoryOutline({
        fileName: fileName || 'Canovaccio_Master.txt',
        content: trimmed,
        uploadedAt: Date.now(),
        wordCount: words,
      });
    }
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 2500);
  };

  const handleClear = () => {
    if (confirm('Vuoi rimuovere il canovaccio di trama? L\'IA tornerà a improvvisare liberamente.')) {
      setContent('');
      setFileName(undefined);
      onUpdateStoryOutline(undefined);
    }
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = content.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-purple-950/50 overflow-hidden flex flex-col h-[88vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-purple-950/80 to-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-950 border border-purple-700/80 text-purple-300">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-black text-base sm:text-lg tracking-wider uppercase text-slate-100 flex items-center gap-2">
                <span>Canovaccio & Trama della Cronaca</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-900/60 border border-purple-600/80 text-purple-200">
                  Guida IA Attiva
                </span>
              </h3>
              <p className="text-xs text-purple-200 font-mono mt-0.5">
                {campaign.title} • {campaign.city} ({campaign.eraLabel || campaign.era})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden space-y-4">
          {/* Barra Info & Carica File */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 border border-slate-800 rounded-xl p-3 shrink-0">
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-300">
              <FileText className="w-4 h-4 text-purple-400" />
              <span>
                {fileName ? (
                  <>
                    File: <strong className="text-purple-300">{fileName}</strong> •{' '}
                  </>
                ) : (
                  'Bozza Manuale • '
                )}
                {wordCount} parole ({charCount} caratteri)
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <label className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-serif font-bold text-slate-200 flex items-center space-x-1.5 cursor-pointer transition-colors shadow">
                <Upload className="w-3.5 h-3.5 text-purple-400" />
                <span>Carica File (.txt, .md)</span>
                <input
                  type="file"
                  accept=".txt,.md,.text,text/plain,text/markdown"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {content.trim() && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1.5 bg-slate-800/80 hover:bg-red-950 border border-slate-700 hover:border-red-700 rounded-xl text-slate-400 hover:text-red-300 transition-colors cursor-pointer"
                  title="Elimina canovaccio"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Editor Testo Trama */}
          <div className="flex-1 flex flex-col min-h-0 bg-slate-950/90 border border-slate-800 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
              <span>Testo del Canovaccio (letto dall'IA a ogni turno):</span>
              <span className="text-purple-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Puoi aggiungere note o nuovi snodi in qualsiasi momento</span>
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Incolla o scrivi qui la trama della tua cronaca:
- Premessa della storia e mistero iniziale
- Capitolo 1: Gli indizi e l'agguato iniziale
- Fazioni coinvolte e nomi dei PNG chiave
- I segreti nascosti che i giocatori devono scoprire
- Condizione di resa dei conti o gran finale..."
              className="flex-1 w-full bg-transparent text-slate-200 font-serif text-sm sm:text-base leading-relaxed p-2 resize-none focus:outline-none"
            />
          </div>

          {/* Banner Istruzioni per l'Autore */}
          <div className="bg-purple-950/30 border border-purple-800/40 rounded-xl p-3 text-xs text-purple-200 font-serif flex items-start gap-2.5 shrink-0">
            <AlertCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Come usa questo testo l'IA:</strong> Il Narratore AI non rivelerà l'intera trama ai giocatori, ma la userà come canovaccio guida permanente per orchestrare incontri, rivelare indizi e far comparire i PNG descritti al momento drammaticamente opportuno.
            </p>
          </div>

          {/* Footer & Tasto Salva */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 shrink-0">
            <span className="text-xs text-slate-400 font-serif italic">
              {isSavedRecently ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-4 h-4" /> Canovaccio salvato! L'IA adatterà la narrazione da subito.
                </span>
              ) : (
                'Modifica il testo o carica una nuova bozza, poi clicca Salva.'
              )}
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-serif text-xs rounded-xl cursor-pointer"
              >
                Chiudi
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 text-white font-serif font-bold text-xs rounded-xl shadow-lg flex items-center space-x-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Salva Modifiche Trama</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

