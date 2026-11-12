import React, { useState, useEffect } from 'react';
import type { CampaignConfig, Character, StoryMessage } from '../types';
import { saveAISettings } from '../services/ai';
import {
  exportChronicleToFile,
  importChronicleFromFile,
  saveChronicleToServer,
  fetchServerSaves,
  loadChronicleFromServer,
  deleteChronicleFromServer,
  type ServerSaveSummary,
  type ChronicleSaveData,
} from '../services/storage';
import { X, Key, Server, RefreshCw, CheckCircle, ShieldCheck, Download, Upload, HardDrive, Trash2, Volume2 } from 'lucide-react';
import { narratorVoice, VOICE_OPTIONS, RATE_OPTIONS } from '../services/voice';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign?: CampaignConfig | null;
  character?: Character | null;
  messages?: StoryMessage[];
  onLoadChronicle?: (data: ChronicleSaveData) => void;
  onResetCampaign?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  campaign,
  character,
  messages,
  onLoadChronicle,
  onResetCampaign,
}) => {
  const [apiKey, setApiKey] = useState(localStorage.getItem('chronica_gemini_key') || '');
  const [model, setModel] = useState('gemini-3.5-flash-lite');
  const [voiceSettings, setVoiceSettingsState] = useState(() => narratorVoice.getSettings());
  const [isSaved, setIsSaved] = useState(false);
  const [serverSaves, setServerSaves] = useState<ServerSaveSummary[]>([]);
  const [serverMsg, setServerMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchServerSaves().then(setServerSaves);
      setVoiceSettingsState(narratorVoice.getSettings());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveAISettings = () => {
    saveAISettings({ apiKey: apiKey.trim(), model });
    narratorVoice.setSettings(voiceSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleExportFile = () => {
    if (campaign && messages) {
      exportChronicleToFile(campaign, character || null, messages);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onLoadChronicle) return;
    try {
      const data = await importChronicleFromFile(file);
      onLoadChronicle(data);
      onClose();
    } catch (err: any) {
      alert(`Errore caricamento file: ${err.message}`);
    }
  };

  const handleSaveToServer = async () => {
    if (!campaign || !messages) return;
    const ok = await saveChronicleToServer(campaign, character || null, messages);
    if (ok) {
      setServerMsg('Cronaca salvata con successo sul disco del server!');
      fetchServerSaves().then(setServerSaves);
      setTimeout(() => setServerMsg(null), 3000);
    } else {
      setServerMsg('Impossibile salvare sul server (verifica che sia attivo).');
      setTimeout(() => setServerMsg(null), 3000);
    }
  };

  const handleLoadFromServer = async (id: string) => {
    if (!onLoadChronicle) return;
    const data = await loadChronicleFromServer(id);
    if (data) {
      onLoadChronicle(data);
      onClose();
    }
  };

  const handleDeleteFromServer = async (id: string) => {
    if (confirm('Vuoi eliminare definitivamente questo salvataggio dal server?')) {
      await deleteChronicleFromServer(id);
      fetchServerSaves().then(setServerSaves);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl shadow-indigo-950/60 overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5 text-indigo-400">
            <Key className="w-5 h-5 text-indigo-400" />
            <h3 className="font-serif font-bold text-base tracking-wider uppercase text-slate-100">
              Impostazioni & Gestione Salvataggi
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-7 text-sm text-slate-200 overflow-y-auto">
          {/* SEZIONE 1: GESTIONE SALVATAGGI FISICI (EXPORT / IMPORT) */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center space-x-2 text-indigo-300 font-serif font-bold text-base">
              <HardDrive className="w-5 h-5 text-indigo-400" />
              <span>Salvataggi su File & Backup</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Puoi scaricare l'intera cronaca come file fisico sul tuo computer/telefono, oppure salvarla direttamente sul disco del tuo server Linux di casa.
            </p>

            <div className="flex flex-wrap gap-3">
              {/* Scarica File */}
              <button
                type="button"
                disabled={!campaign}
                onClick={handleExportFile}
                className="px-4 py-2.5 bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/80 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Scarica File Backup (.json)</span>
              </button>

              {/* Salva su Server */}
              <button
                type="button"
                disabled={!campaign}
                onClick={handleSaveToServer}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-2 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
              >
                <Server className="w-4 h-4 text-indigo-400" />
                <span>Salva su Disco Server</span>
              </button>

              {/* Carica File */}
              <label className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-2 transition-colors cursor-pointer shadow-sm">
                <Upload className="w-4 h-4 text-amber-300" />
                <span>Ripristina da File (.json)</span>
                <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
              </label>
            </div>

            {serverMsg && (
              <p className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/80 p-2 rounded-xl">
                ✓ {serverMsg}
              </p>
            )}

            {/* Lista Salvataggi su Server se presenti */}
            {serverSaves.length > 0 && (
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <span className="text-xs font-mono uppercase text-slate-400 font-bold block">
                  Cronache Salvate sul Server Linux ({serverSaves.length}):
                </span>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {serverSaves.map((s) => (
                    <div
                      key={s.id}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-200">{s.title}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {s.characterName} • {s.city} ({s.messagesCount} scene)
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleLoadFromServer(s.id)}
                          className="px-3 py-1 bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg font-semibold cursor-pointer"
                        >
                          Carica
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFromServer(s.id)}
                          className="p-1 text-slate-500 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SEZIONE 2: CHIAVE API GEMINI */}
          <div className="space-y-2.5">
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 flex items-start space-x-3 text-emerald-300">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-bold text-emerald-200 text-sm">Chiave Server Attiva & Pronta</p>
                <p className="text-emerald-300/85">
                  La chiave Gemini è già configurata centralmente sul tuo server di casa. Tutti i dispositivi (PC e cellulari dei tuoi amici) giocano con l'IA sbloccata senza dover digitare nulla.
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <label className="font-mono uppercase text-slate-400 font-bold tracking-wider flex items-center space-x-2 text-xs">
                <span>Chiave Personale di Override (Opzionale)</span>
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 underline"
              >
                Google AI Studio ↗
              </a>
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Lascia vuoto per usare la chiave del server"
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none font-mono text-sm"
            />
          </div>

          {/* SEZIONE 3: MODELLO */}
          <div className="space-y-2">
            <label className="font-mono uppercase text-slate-300 font-bold tracking-wider text-xs sm:text-sm">
              Modello AI Attivo
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none text-sm"
            >
              <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite (Consigliato: rapido, illimitato)</option>
              <option value="gemini-flash-lite-latest">Gemini Flash-Lite Latest (Alta disponibilità)</option>
              <option value="gemini-3.7-flash">Gemini 3.7 Flash</option>
              <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite</option>
            </select>
          </div>

          {/* SEZIONE 4: VOCE NARRATORE HD */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center space-x-2">
              <Volume2 className="w-4 h-4 text-amber-400" />
              <label className="font-mono uppercase text-slate-300 font-bold tracking-wider text-xs sm:text-sm">
                Voce Narratore (Microsoft Edge Neurale HD)
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {VOICE_OPTIONS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVoiceSettingsState({ ...voiceSettings, voice: v.id })}
                  className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    voiceSettings.voice === v.id
                      ? 'bg-indigo-950/70 border-indigo-500 text-white'
                      : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs">{v.label}</div>
                    <div className="text-[11px] text-slate-400">{v.desc}</div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0 ml-2">
                    {v.gender}
                  </span>
                </button>
              ))}
            </div>

            <div>
              <span className="text-xs font-mono uppercase text-slate-400 block mb-1">Velocità Voce</span>
              <div className="grid grid-cols-3 gap-2">
                {RATE_OPTIONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setVoiceSettingsState({ ...voiceSettings, rate: r.value })}
                    className={`p-2 rounded-xl text-center text-xs font-medium border transition-all cursor-pointer ${
                      voiceSettings.rate === r.value
                        ? 'bg-red-950/80 border-red-500 text-red-200 font-bold'
                        : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* BOTTONI AZIONE FINALI */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
            {onResetCampaign && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Vuoi davvero resettare la cronaca corrente e crearne una nuova?')) {
                    onResetCampaign();
                    onClose();
                  }
                }}
                className="text-red-400 hover:text-red-300 flex items-center space-x-1.5 text-xs sm:text-sm cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Ricomincia Nuova Cronaca</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveAISettings}
              className="ml-auto px-5 py-2.5 bg-gradient-to-r from-red-800 to-indigo-900 hover:from-red-700 hover:to-indigo-800 text-white rounded-xl font-semibold flex items-center space-x-2 transition-all cursor-pointer shadow-md text-sm"
            >
              {isSaved ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : null}
              <span>{isSaved ? 'Impostazioni Salvate!' : 'Salva Impostazioni'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
