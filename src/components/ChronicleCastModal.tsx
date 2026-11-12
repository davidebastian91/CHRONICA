import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Users,
  Bot,
  Gamepad2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Swords,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import type { CampaignConfig, Character } from '../types';
import type { RoomPlayer } from '../services/multiplayer';

interface ChronicleCastModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: CampaignConfig;
  connectedPlayers?: RoomPlayer[];
  hostCharacter?: Character | null;
  onUpdateCast: (roster: Character[]) => void;
}

export const ChronicleCastModal: React.FC<ChronicleCastModalProps> = ({
  isOpen,
  onClose,
  campaign,
  connectedPlayers = [],
  hostCharacter,
  onUpdateCast,
}) => {
  const [roster, setRoster] = useState<Character[]>(() => campaign.rosterCharacters || []);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [expandedCharId, setExpandedCharId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Lista nomi giocatori già impegnati
  const activePlayerNames = new Set<string>();
  if (hostCharacter?.name) {
    activePlayerNames.add(hostCharacter.name.toLowerCase().trim());
  }
  connectedPlayers.forEach((p) => {
    if (p.character?.name) {
      activePlayerNames.add(p.character.name.toLowerCase().trim());
    } else if (p.name) {
      activePlayerNames.add(p.name.toLowerCase().trim());
    }
  });

  const getPlayerAssignment = (char: Character): string | null => {
    const charName = (char.name || '').toLowerCase().trim();
    if (hostCharacter?.name && hostCharacter.name.toLowerCase().trim() === charName) {
      return `Master (${hostCharacter.name})`;
    }
    const found = connectedPlayers.find(
      (p) => (p.character?.name || '').toLowerCase().trim() === charName || p.name.toLowerCase().trim() === charName
    );
    if (found) {
      return found.character?.name || found.name;
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMessage(null);
      setUploadStatus(null);
    }
  };

  const handleProcessFile = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus('Lettura file Word/Excel in corso...');
    setErrorMessage(null);

    try {
      // Converti file in Base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          const base64Data = res.split(',')[1] || res;
          resolve(base64Data);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(selectedFile);
      const base64Content = await base64Promise;

      setUploadStatus('Gemini 2.5 Flash sta estraendo i personaggi e strutturando le schede di gioco...');

      const response = await fetch('/api/ai/import-cast-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: base64Content,
          fileName: selectedFile.name,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Errore server HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.characters || !Array.isArray(data.characters)) {
        throw new Error('Nessun personaggio valido estratto dal file.');
      }

      const importedChars: Character[] = data.characters;
      // Unisci con il roster esistente evitando duplicati per nome
      const existingNames = new Set(roster.map((c) => c.name.toLowerCase().trim()));
      const newCharsToAdd = importedChars.filter((c) => !existingNames.has(c.name.toLowerCase().trim()));

      const updatedRoster = [...roster, ...newCharsToAdd];
      setRoster(updatedRoster);
      onUpdateCast(updatedRoster);

      setUploadStatus(
        `Importazione completata con successo! Estratti ${importedChars.length} personaggi (${newCharsToAdd.length} aggiunti al Cast).`
      );
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('Errore importazione file:', err);
      setErrorMessage(err.message || 'Si è verificato un errore durante l\'elaborazione del file.');
      setUploadStatus(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveCharacter = (id: string) => {
    const updated = roster.filter((c) => c.id !== id);
    setRoster(updated);
    onUpdateCast(updated);
  };

  const aiControlledCount = roster.filter((c) => !getPlayerAssignment(c)).length;
  const playerControlledCount = roster.length - aiControlledCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-hidden">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Intestazione */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-serif font-black text-slate-100">
                  Cast & Personaggi della Cronaca
                </h2>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[11px] font-mono rounded-full border border-amber-500/30">
                  {roster.length} Totali
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Importa file Word (.docx) o Excel (.xlsx). I giocatori da smartphone scelgono chi interpretare; il resto è mosso dall'IA Narratore.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo Scrollabile */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Sezione Caricamento File */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Upload className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                  Importa Documento Word o Foglio Excel
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">.docx, .doc, .xlsx, .xls, .csv, .txt</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.doc,.xlsx,.xls,.csv,.txt,.md"
                onChange={handleFileChange}
                disabled={isUploading}
                className="hidden"
                id="cast-file-upload"
              />
              <label
                htmlFor="cast-file-upload"
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border border-dashed text-xs font-semibold cursor-pointer transition-all ${
                  selectedFile
                    ? 'bg-indigo-950/40 border-indigo-500/80 text-indigo-200'
                    : 'bg-slate-900 hover:bg-slate-850 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                {selectedFile ? (
                  <>
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    <span className="truncate">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-slate-400" />
                    <span>Seleziona file Word o Excel dal computer</span>
                  </>
                )}
              </label>

              <button
                type="button"
                onClick={handleProcessFile}
                disabled={!selectedFile || isUploading}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold font-serif flex items-center justify-center space-x-2 shadow-lg transition-all cursor-pointer ${
                  selectedFile && !isUploading
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                    : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                }`}
              >
                {isUploading ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Analisi IA in corso...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Estrai Cast con IA</span>
                  </>
                )}
              </button>
            </div>

            {uploadStatus && (
              <div className="flex items-center space-x-2 p-3 bg-emerald-950/50 border border-emerald-800/80 rounded-xl text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{uploadStatus}</span>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-center space-x-2 p-3 bg-red-950/50 border border-red-800/80 rounded-xl text-xs text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Banner Regola Vincolante IA Narratore */}
          <div className="p-4 bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900 border border-purple-500/30 rounded-2xl flex items-start space-x-3.5">
            <div className="p-2 bg-purple-500/20 rounded-xl text-purple-300 shrink-0 mt-0.5">
              <Bot className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-purple-200 uppercase tracking-wider font-mono">
                Regola di Controllo Automatico dell'IA Narratore
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tutti i personaggi del Cast che <strong>non vengono scelti dai giocatori</strong> connessi da smartphone o dal Master saranno <strong>gestiti attivamente dall'IA Narratore</strong>. L'IA darà loro voce, reazioni coerenti, motivazioni personali e utilizzerà le loro abilità e il loro inventario nei dialoghi e nei conflitti.
              </p>
              <div className="flex items-center space-x-4 pt-1 text-[11px] font-mono">
                <span className="flex items-center space-x-1.5 text-amber-300">
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>{playerControlledCount} Guidati da Giocatori</span>
                </span>
                <span className="flex items-center space-x-1.5 text-indigo-300">
                  <Bot className="w-3.5 h-3.5" />
                  <span>{aiControlledCount} Guidati dall'IA Narratore</span>
                </span>
              </div>
            </div>
          </div>

          {/* Elenco Personaggi del Cast */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Elenco Personaggi Roster ({roster.length})
              </h3>
              {roster.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Vuoi davvero svuotare l\'intero cast della cronaca?')) {
                      setRoster([]);
                      onUpdateCast([]);
                    }
                  }}
                  className="text-[11px] text-red-400 hover:text-red-300 underline cursor-pointer"
                >
                  Svuota Cast
                </button>
              )}
            </div>

            {roster.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40 space-y-2">
                <Users className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-serif font-bold text-slate-300">Nessun personaggio nel cast</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Carica un file Word o Excel della tua vecchia cronaca oppure aggiungi personaggi per popolare la lista dei protagonisti e dei PNG.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {roster.map((char) => {
                  const assignedPlayer = getPlayerAssignment(char);
                  const isExpanded = expandedCharId === char.id;

                  return (
                    <div
                      key={char.id}
                      className="bg-slate-950 border border-slate-800 hover:border-slate-700/80 rounded-2xl overflow-hidden transition-all shadow-md"
                    >
                      {/* Riga Principale Scheda */}
                      <div className="p-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center font-bold text-base text-slate-200 shrink-0">
                            {char.creatureType === 'vampire'
                              ? '🧛'
                              : char.creatureType === 'werewolf'
                              ? '🐺'
                              : char.creatureType === 'mage'
                              ? '🔮'
                              : char.creatureType === 'hunter'
                              ? '🏹'
                              : '👤'}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-serif font-bold text-sm text-slate-100 truncate">
                                {char.name}
                              </h4>
                              {char.factionOrClan && (
                                <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono truncate max-w-[120px]">
                                  {char.factionOrClan}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 truncate">
                              {char.concept}
                              {char.virtue && char.vice && ` • ${char.virtue} / ${char.vice}`}
                            </p>
                          </div>
                        </div>

                        {/* Stato e Azioni */}
                        <div className="flex items-center space-x-2 shrink-0">
                          {assignedPlayer ? (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 rounded-xl text-[11px] font-mono font-bold text-amber-300">
                              <Gamepad2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Interpretato da</span> {assignedPlayer}
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-indigo-500/15 border border-indigo-500/30 rounded-xl text-[11px] font-mono font-bold text-indigo-300">
                              <Bot className="w-3.5 h-3.5 text-indigo-400" />
                              <span>IA Narratore</span>
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setExpandedCharId(isExpanded ? null : char.id)}
                            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                            title={isExpanded ? 'Riduci dettagli' : 'Visualizza dettagli scheda'}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveCharacter(char.id)}
                            className="p-1.5 hover:bg-red-950/60 text-slate-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                            title="Rimuovi personaggio dal Cast"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Dettagli Espansi */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-slate-900 bg-slate-900/40 text-xs space-y-3">
                          {/* Note di Background */}
                          {char.backgroundNotes && (
                            <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 text-slate-200 text-xs font-serif leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                              {char.backgroundNotes}
                            </div>
                          )}

                          {/* Statistiche Chiave */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                            <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                              <span className="text-slate-500 block">Attributi Mentali:</span>
                              <span className="text-slate-200">
                                Int {char.attributes?.intelligence || 2} • Pro {char.attributes?.wits || 2} • Fer {char.attributes?.resolve || 2}
                              </span>
                            </div>
                            <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                              <span className="text-slate-500 block">Attributi Fisici:</span>
                              <span className="text-slate-200">
                                For {char.attributes?.strength || 2} • Des {char.attributes?.dexterity || 2} • Cos {char.attributes?.stamina || 2}
                              </span>
                            </div>
                            <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                              <span className="text-slate-500 block">Attributi Sociali:</span>
                              <span className="text-slate-200">
                                Pre {char.attributes?.presence || 2} • Asc {char.attributes?.manipulation || 2} • Aut {char.attributes?.composure || 2}
                              </span>
                            </div>
                            <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                              <span className="text-slate-500 block">Tratti Derivati:</span>
                              <span className="text-slate-200">
                                Dif {char.defense || 2} • Iniz +{char.initiativeMod || 4} • Vel {char.speed || 9}
                              </span>
                            </div>
                          </div>

                          {/* Inventario & Armi */}
                          {char.structuredInventory && char.structuredInventory.length > 0 && (
                            <div>
                              <span className="text-[11px] font-mono text-slate-400 block mb-1">Dotazione ed Equipaggiamento:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {char.structuredInventory.map((item, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-slate-800/80 border border-slate-700/80 rounded text-[11px] text-slate-200 flex items-center space-x-1"
                                  >
                                    <Swords className="w-3 h-3 text-amber-400" />
                                    <span>{item.name}</span>
                                    {item.damage !== undefined && <span className="text-red-400">+{item.damage}L</span>}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            {roster.length} Personaggi • Sincronizzazione automatica con i cellulari
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-serif font-bold transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            Chiudi e Salva Modifiche
          </button>
        </div>
      </div>
    </div>
  );
};
