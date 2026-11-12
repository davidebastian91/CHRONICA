import React, { useState, useEffect } from 'react';
import type { UserProfile } from '../types';
import {
  Crown,
  User,
  Shield,
  Sword,
  Plus,
  Lock,
  Trash2,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';

interface ProfileSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProfile: (profile: UserProfile) => void;
  currentProfile: UserProfile | null;
  onOpenManagement?: () => void;
  onOpenTutorial?: () => void;
}

export const ProfileSelectModal: React.FC<ProfileSelectModalProps> = ({
  isOpen,
  onClose,
  onSelectProfile,
  currentProfile,
  onOpenManagement,
  onOpenTutorial,
}) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [selectedForPin, setSelectedForPin] = useState<UserProfile | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isManaging, setIsManaging] = useState(false);

  // Form creazione nuovo profilo
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfilePin, setNewProfilePin] = useState('');
  const [masterAuthPin, setMasterAuthPin] = useState('');
  const [addError, setAddError] = useState('');
  const [newAvatar, setNewAvatar] = useState('user');
  const [showPin, setShowPin] = useState(false);

  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/profiles');
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
      }
    } catch {
      // Fallback offline locale se server non raggiungibile
      const saved = localStorage.getItem('chronica_local_profiles');
      if (saved) {
        setProfiles(JSON.parse(saved));
      } else {
        const defaultProf: UserProfile[] = [
          { id: 'master', name: 'Master / Creatore', isMaster: true, avatar: 'crown' },
        ];
        setProfiles(defaultProf);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProfiles();
      setSelectedForPin(null);
      setPinInput('');
      setPinError('');
      setIsAddingNew(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProfileClick = (p: UserProfile) => {
    setSelectedForPin(p);
    setPinInput('');
    setPinError('');
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForPin) return;

    try {
      const res = await fetch('/api/profiles/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: selectedForPin.id, pin: pinInput }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (rememberMe) {
          localStorage.setItem('chronica_active_profile', JSON.stringify(data.profile));
        } else {
          sessionStorage.setItem('chronica_active_profile', JSON.stringify(data.profile));
        }
        onSelectProfile(data.profile);
        onClose();
      } else {
        setPinError(data.error || 'PIN errato. Riprova.');
      }
    } catch {
      // Verifica offline se server irraggiungibile
      if (selectedForPin.id === 'master' && (pinInput === '1234' || pinInput === 'admin')) {
        onSelectProfile(selectedForPin);
        onClose();
      } else {
        setPinError('PIN non riconosciuto in modalità offline');
      }
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    if (!newProfileName.trim() || !newProfilePin.trim()) {
      setAddError('Nome e PIN sono obbligatori');
      return;
    }

    try {
      const res = await fetch('/api/profiles/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterPin: masterAuthPin,
          action: 'create',
          profileData: {
            name: newProfileName.trim(),
            pin: newProfilePin.trim(),
            avatar: newAvatar,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNewProfileName('');
        setNewProfilePin('');
        setIsAddingNew(false);
        fetchProfiles();
      } else {
        setAddError(data.error || 'PIN Master non valido');
      }
    } catch (err: any) {
      setAddError('Errore di connessione: ' + err.message);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    const masterPin = prompt('Inserisci il PIN del Master per confermare l\'eliminazione:');
    if (!masterPin) return;

    try {
      const res = await fetch('/api/profiles/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterPin,
          action: 'delete',
          profileData: { id: profileId },
        }),
      });

      if (res.ok) {
        fetchProfiles();
      } else {
        const d = await res.json();
        alert(d.error || 'Errore eliminazione');
      }
    } catch {
      alert('Impossibile contattare il server');
    }
  };

  const renderAvatar = (avatar: string, isMaster: boolean) => {
    if (isMaster || avatar === 'crown') {
      return <Crown className="w-8 h-8 text-amber-300" />;
    }
    if (avatar === 'sword') {
      return <Sword className="w-8 h-8 text-red-400" />;
    }
    if (avatar === 'shield') {
      return <Shield className="w-8 h-8 text-emerald-400" />;
    }
    return <User className="w-8 h-8 text-indigo-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] min-w-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-indigo-300 font-serif">
            <Lock className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-sm sm:text-base tracking-wider uppercase text-slate-100">
              Chi Sta Giocando?
            </h3>
          </div>
          {currentProfile && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {!selectedForPin && !isAddingNew && (
            <>
              <p className="text-xs text-slate-400 font-serif text-center italic">
                Seleziona il tuo profilo per accedere alle tue cronache private e ai tuoi personaggi.
              </p>

              {/* Grid Profili */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                {profiles.map((p) => {
                  const isCurrent = currentProfile?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleProfileClick(p)}
                      className={`relative p-4 rounded-2xl border flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
                        isCurrent
                          ? 'bg-indigo-950/80 border-indigo-500 shadow-lg shadow-indigo-950'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {/* Avatar Icon */}
                      <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-center mb-2 shadow-inner">
                        {renderAvatar(p.avatar, p.isMaster)}
                      </div>

                      <span className="font-serif font-bold text-xs text-slate-100 truncate w-full">
                        {p.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {p.isMaster ? 'Master' : 'Giocatore'}
                      </span>

                      {isCurrent && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                      )}

                      {/* Tasto elimina (se in modalità gestione) */}
                      {isManaging && !p.isMaster && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProfile(p.id);
                          }}
                          className="absolute -top-2 -right-2 p-1.5 bg-red-900 hover:bg-red-800 rounded-full text-white shadow-md cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Tasto Aggiungi Amico / Profilo */}
                <div
                  onClick={() => setIsAddingNew(true)}
                  className="p-4 rounded-2xl border border-dashed border-slate-700 hover:border-indigo-500 hover:bg-indigo-950/20 flex flex-col items-center justify-center text-center cursor-pointer transition-all"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center justify-center mb-2 text-indigo-400">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="font-serif font-semibold text-xs text-indigo-300">
                    Aggiungi Amico
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Nuovo Profilo</span>
                </div>
              </div>

              {/* Toggle Gestione Profili */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs">
                {onOpenManagement ? (
                  <button
                    type="button"
                    onClick={onOpenManagement}
                    className="text-amber-400 hover:text-amber-300 font-mono flex items-center space-x-1 cursor-pointer transition-colors"
                  >
                    <span>👑 Gestione Password & Profili (Master)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsManaging(!isManaging)}
                    className="text-slate-400 hover:text-slate-200 font-mono cursor-pointer transition-colors"
                  >
                    {isManaging ? 'Termina Gestione' : '⚙️ Gestisci / Rimuovi Profili'}
                  </button>
                )}
              </div>

              {onOpenTutorial && (
                <div className="pt-2 text-center border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={onOpenTutorial}
                    className="text-xs font-serif font-bold text-amber-300 hover:text-amber-200 transition-colors inline-flex items-center space-x-1.5 cursor-pointer p-1.5 rounded-xl hover:bg-amber-950/40"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Prima volta su Chronica? Scopri come si gioca (Tutorial)</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* Form Inserimento PIN per il Profilo Selezionato */}
          {selectedForPin && (
            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div className="text-center space-y-1">
                <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-700 mx-auto flex items-center justify-center shadow-md">
                  {renderAvatar(selectedForPin.avatar, selectedForPin.isMaster)}
                </div>
                <h4 className="font-serif font-black text-lg text-slate-100 mt-2">
                  {selectedForPin.name}
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  Inserisci la Password o il PIN a 4 cifre
                </p>
              </div>

              <div className="relative max-w-xs mx-auto">
                <input
                  type={showPin ? 'text' : 'password'}
                  autoFocus
                  required
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError('');
                  }}
                  placeholder="PIN / Password..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-center text-lg tracking-widest text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {pinError && (
                <div className="flex items-center justify-center space-x-1.5 text-red-400 text-xs font-mono">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{pinError}</span>
                </div>
              )}

              <div className="flex items-center justify-center space-x-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600"
                />
                <label htmlFor="rememberMe" className="cursor-pointer">
                  Ricordami su questo dispositivo
                </label>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedForPin(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Indietro
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-indigo-600 hover:from-red-500 text-white font-serif font-bold text-xs rounded-xl shadow-lg cursor-pointer"
                >
                  Sblocca Profilo
                </button>
              </div>
            </form>
          )}

          {/* Form Creazione Nuovo Profilo (Protetto da Master PIN) */}
          {isAddingNew && (
            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div className="text-center">
                <h4 className="font-serif font-black text-base text-slate-100">
                  Crea Profilo per un Amico
                </h4>
                <p className="text-xs text-slate-400 font-serif italic">
                  Dai al tuo amico un nome e un PIN a sua scelta per accedere alle sue storie.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-mono text-slate-300">Nome dell'Amico / Giocatore:</label>
                  <input
                    type="text"
                    required
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="Es: Marco, Elena, Davide..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300">PIN / Password Personale:</label>
                  <input
                    type="text"
                    required
                    value={newProfilePin}
                    onChange={(e) => setNewProfilePin(e.target.value)}
                    placeholder="Es: 5555 o una parola chiave..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 mt-1 font-mono"
                  />
                </div>

                {/* Scegli Icona Avatar */}
                <div>
                  <label className="text-xs font-mono text-slate-300">Icona Profilo:</label>
                  <div className="flex space-x-2 mt-1">
                    {[
                      { id: 'user', icon: <User className="w-4 h-4 text-indigo-400" /> },
                      { id: 'sword', icon: <Sword className="w-4 h-4 text-red-400" /> },
                      { id: 'shield', icon: <Shield className="w-4 h-4 text-emerald-400" /> },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setNewAvatar(item.id)}
                        className={`p-2.5 rounded-xl border flex-1 flex justify-center cursor-pointer ${
                          newAvatar === item.id ? 'bg-indigo-950 border-indigo-500' : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        {item.icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Autenticazione Master */}
                <div className="pt-2 border-t border-slate-800">
                  <label className="text-xs font-mono text-amber-400 font-bold flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>Conferma con PIN del Master:</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={masterAuthPin}
                    onChange={(e) => setMasterAuthPin(e.target.value)}
                    placeholder="Inserisci il tuo PIN Master..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 mt-1 font-mono"
                  />
                </div>
              </div>

              {addError && (
                <div className="text-red-400 text-xs font-mono text-center">
                  {addError}
                </div>
              )}

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 text-white font-serif font-bold text-xs rounded-xl shadow-lg cursor-pointer"
                >
                  Crea Profilo Amico
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
