import React, { useState, useEffect, useRef } from 'react';
import type { UserProfile, SavedChronicleHeader, CampaignConfig, Character, StoryMessage } from '../types';
import {
  fetchServerSaves,
  loadChronicleFromServer,
  deleteChronicleFromServer,
  saveChronicleToServer,
  exportChronicleToFile,
  importChronicleFromFile,
  type ChronicleSaveData,
} from '../services/storage';
import {
  BookOpen,
  Play,
  Trash2,
  Plus,
  RefreshCw,
  X,
  User,
  Crown,
  MapPin,
  Calendar,
  MessageSquare,
  Save,
  LogOut,
  Download,
  Upload,
  CheckCircle2,
  Users,
} from 'lucide-react';

interface ChronicleSlotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserProfile | null;
  activeCampaign?: CampaignConfig | null;
  activeCharacter?: Character;
  activeMessages?: StoryMessage[];
  onLoadChronicle: (data: ChronicleSaveData) => void;
  onSaveAndExitToMenu: () => Promise<void>;
  onStartNewCampaign: () => void;
  onChangeProfile: () => void;
}

export const ChronicleSlotsModal: React.FC<ChronicleSlotsModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  activeCampaign,
  activeCharacter,
  activeMessages = [],
  onLoadChronicle,
  onSaveAndExitToMenu,
  onStartNewCampaign,
  onChangeProfile,
}) => {
  const [saves, setSaves] = useState<SavedChronicleHeader[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Default tassativo a false: per privacy mostra solo le cronache del profilo attivo!
  const [showAllSaves, setShowAllSaves] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMaster = !!currentProfile?.isMaster;
  // Solo il Master può attivare la vista globale di tutti gli account
  const effectiveShowAll = isMaster && showAllSaves;

  const loadSaves = async () => {
    setIsLoading(true);
    try {
      const filterId = !currentProfile ? 'all' : effectiveShowAll ? 'all' : currentProfile.id;
      const list = await fetchServerSaves(filterId);
      const sorted = [...list].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      setSaves(sorted as any);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSaves();
      setSaveFeedback(null);
    }
  }, [isOpen, currentProfile?.id, effectiveShowAll]);

  if (!isOpen) return null;

  const handleManualSave = async () => {
    if (!activeCampaign || !activeCharacter) return;
    const ok = await saveChronicleToServer(
      activeCampaign,
      activeCharacter,
      activeMessages,
      currentProfile?.id || 'default',
      currentProfile?.name || 'Narratore'
    );
    if (ok) {
      setSaveFeedback('✅ Cronaca salvata con successo!');
      loadSaves();
      setTimeout(() => setSaveFeedback(null), 3000);
    } else {
      setSaveFeedback('⚠️ Errore durante il salvataggio.');
    }
  };

  const handleSaveAndExit = async () => {
    await onSaveAndExitToMenu();
    onClose();
  };

  const handleSelect = async (id: string) => {
    if (activeCampaign && activeCharacter && activeMessages.length > 0) {
      await saveChronicleToServer(
        activeCampaign,
        activeCharacter,
        activeMessages,
        currentProfile?.id || 'default',
        currentProfile?.name || 'Narratore'
      );
    }
    const data = await loadChronicleFromServer(id);
    if (data) {
      onLoadChronicle(data);
      onClose();
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Sei sicuro di voler eliminare definitivamente la cronaca "${title}"?`)) {
      await deleteChronicleFromServer(id);
      loadSaves();
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importChronicleFromFile(file);
      await saveChronicleToServer(
        data.campaign,
        data.character,
        data.messages,
        currentProfile?.id || 'default',
        currentProfile?.name || 'Narratore'
      );
      onLoadChronicle(data);
      onClose();
    } catch (err: any) {
      alert('Impossibile caricare il file: ' + (err.message || 'Formato non valido'));
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto overflow-x-hidden">
      <div className="w-full max-w-3xl my-auto bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] min-w-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 flex items-center justify-between shrink-0 min-w-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 flex-1 mr-2">
            <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-700 text-indigo-300 shrink-0">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 className="font-serif font-black text-sm sm:text-lg tracking-wider uppercase text-slate-100 truncate">
                  Salva & Carica Cronaca
                </h3>
                {currentProfile?.isMaster ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-950 border border-amber-600 text-amber-300 text-[10px] font-mono flex items-center space-x-1 shrink-0">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span className="truncate max-w-[80px] sm:max-w-[120px]">{currentProfile.name}</span>
                  </span>
                ) : currentProfile ? (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-700 text-indigo-300 text-[10px] font-mono flex items-center space-x-1 shrink-0">
                    <User className="w-3 h-3 text-indigo-400" />
                    <span className="truncate max-w-[80px] sm:max-w-[120px]">{currentProfile.name}</span>
                  </span>
                ) : null}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-serif line-clamp-1 mt-0.5">
                Salva la partita in corso, chiudi la sessione o riprendi una cronaca precedente
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto overflow-x-hidden flex-1 min-w-0 w-full max-w-full">
          {/* BOX PARTITA ATTUALMENTE IN CORSO */}
          {activeCampaign && activeCharacter && (
            <div className="bg-gradient-to-r from-emerald-950/50 via-slate-950 to-indigo-950/50 border-2 border-emerald-600/70 rounded-2xl p-3.5 sm:p-5 space-y-3 shadow-lg min-w-0 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-200 font-bold inline-block mb-1">
                    ● Cronaca Attualmente in Corso
                  </span>
                  <h4 className="font-serif font-black text-base sm:text-lg text-white break-words">
                    {activeCampaign.title}
                  </h4>
                  <p className="text-xs text-slate-300 font-serif break-words mt-0.5">
                    Protagonista: <strong>{activeCharacter.name}</strong> ({activeCharacter.factionOrClan}) • Luogo:{' '}
                    {activeCampaign.city} • {activeMessages.length} messaggi
                  </p>
                </div>

                {saveFeedback && (
                  <div className="flex items-center space-x-1.5 text-xs font-mono font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-600 px-3 py-1.5 rounded-xl shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{saveFeedback}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={handleManualSave}
                  className="flex-1 sm:flex-initial px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-serif font-bold text-xs rounded-xl shadow flex items-center justify-center space-x-1.5 cursor-pointer transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Salva Ora</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAndExit}
                  className="flex-1 sm:flex-initial px-3.5 py-2 bg-gradient-to-r from-amber-700 to-red-800 hover:from-amber-600 hover:to-red-700 text-white font-serif font-bold text-xs rounded-xl shadow flex items-center justify-center space-x-1.5 cursor-pointer transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Salva & Esci</span>
                </button>

                <button
                  type="button"
                  onClick={() => exportChronicleToFile(activeCampaign, activeCharacter, activeMessages)}
                  className="w-full sm:w-auto px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
                  title="Scarica una copia di sicurezza (.json) sul computer"
                >
                  <Download className="w-4 h-4 text-indigo-400" />
                  <span>Scarica File (.json)</span>
                </button>
              </div>
            </div>
          )}

          {/* Barra Azioni Archivio */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80 min-w-0 w-full">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={ async () => {
                  if (activeCampaign && activeCharacter && activeMessages.length > 0) {
                    await saveChronicleToServer(
                      activeCampaign,
                      activeCharacter,
                      activeMessages,
                      currentProfile?.id || 'default',
                      currentProfile?.name || 'Narratore'
                    );
                  }
                  onStartNewCampaign();
                  onClose();
                }}
                className="flex-1 sm:flex-initial px-3.5 py-2 bg-gradient-to-r from-indigo-700 to-slate-800 hover:from-indigo-600 border border-indigo-500/60 text-white font-serif font-bold text-xs rounded-xl shadow flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-amber-300" />
                <span>Nuova Cronaca</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-mono text-xs rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Importa File (.json)</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-between sm:justify-end">
              {/* Tab Filtro: Solo per il Master c'è la possibilità di vedere le cronache degli altri giocatori */}
              {isMaster && (
                <div className="flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded-xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAllSaves(false)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                      !showAllSaves
                        ? 'bg-gradient-to-r from-indigo-700 to-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Mostra solo le tue cronache personali"
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-300" />
                    <span>Le mie Cronache</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAllSaves(true)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                      showAllSaves
                        ? 'bg-gradient-to-r from-indigo-700 to-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Mostra le cronache salvate sul server da tutti gli account"
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-300" />
                    <span>Tutti gli Account</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={onChangeProfile}
                className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 hover:text-white text-xs font-mono flex items-center space-x-1 cursor-pointer"
                title="Cambia account giocatore"
              >
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>Profilo</span>
              </button>

              <button
                type="button"
                onClick={loadSaves}
                disabled={isLoading}
                className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                title="Aggiorna lista"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Lista Cronache Salvate */}
          <div className="w-full min-w-0">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-3 flex items-center justify-between">
              <span>
                📂 {effectiveShowAll ? 'Tutte le Cronache Salvate sul Server' : `Le Mie Cronache (${currentProfile?.name || 'Account Attivo'})`} ({saves.length})
              </span>
            </h4>

            {saves.length === 0 ? (
              <div className="text-center py-10 bg-slate-950/50 border border-slate-800/80 rounded-2xl space-y-2">
                <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="font-serif font-bold text-slate-300 text-sm">
                  Nessuna cronaca salvata in archivio
                </h4>
                <p className="text-xs text-slate-500 font-serif max-w-sm mx-auto">
                  Avvia una nuova cronaca o clicca su "Salva Cronaca Ora" durante una partita per ritrovarla qui.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 w-full min-w-0">
                {saves.map((s) => {
                  const isCurrentActive = activeCampaign?.id === s.id;
                  return (
                    <div
                      key={s.id}
                      className={`w-full min-w-0 border rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 transition-all ${
                        isCurrentActive
                          ? 'bg-indigo-950/30 border-indigo-500/80'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1.5 w-full min-w-0 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 min-w-0 w-full">
                          <h4 className="font-serif font-black text-sm sm:text-base text-slate-100 break-words min-w-0 flex-1">
                            {s.title}
                          </h4>
                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                            {isCurrentActive && (
                              <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 text-[10px] font-mono font-bold">
                                In corso
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-lg bg-indigo-950/80 border border-indigo-800 text-indigo-300 text-[10px] font-mono">
                              {s.era}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-400 font-serif min-w-0">
                          {/* Badge Autore */}
                          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono shrink-0">
                            {s.authorName === 'Al Bocia' || s.profileId === 'master' ? (
                              <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                            ) : (
                              <User className="w-3 h-3 text-indigo-400 shrink-0" />
                            )}
                            <span className="text-slate-300 font-bold">
                              Autore: {s.authorName || (s.profileId === 'master' ? 'Al Bocia' : 'Giocatore')}
                            </span>
                          </span>

                          <span className="flex items-center space-x-1 min-w-0 max-w-[140px] sm:max-w-none">
                            <strong className="text-slate-200 font-normal truncate">PG: {s.characterName}</strong>
                          </span>
                          <span className="flex items-center space-x-1 min-w-0 max-w-[140px] sm:max-w-none">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">{s.city}</span>
                          </span>
                          <span className="flex items-center space-x-1 font-mono text-[11px] shrink-0">
                            <MessageSquare className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>{s.messagesCount} scambi</span>
                          </span>
                          {s.updatedAt && (
                            <span className="flex items-center space-x-1 font-mono text-[10px] text-slate-500 shrink-0">
                              <Calendar className="w-3 h-3 shrink-0" />
                              <span>
                                {new Date(s.updatedAt).toLocaleDateString()}{' '}
                                {new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pulsanti Azione */}
                      <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => handleSelect(s.id)}
                          className="flex-1 sm:flex-initial px-4 py-2 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 text-white font-serif font-bold text-xs rounded-xl shadow flex items-center justify-center space-x-1.5 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>{isCurrentActive ? 'Ricarica' : 'Carica Cronaca'}</span>
                        </button>

                        {(isMaster || s.profileId === currentProfile?.id) && (
                          <button
                            type="button"
                            onClick={() => handleDelete(s.id, s.title)}
                            className="p-2 bg-slate-900 hover:bg-red-950/80 border border-slate-800 hover:border-red-700 rounded-xl text-slate-400 hover:text-red-300 cursor-pointer transition-colors shrink-0"
                            title="Elimina Cronaca"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

