import React, { useState, useEffect } from 'react';
import type { UserProfile } from '../types';
import {
  Crown,
  User,
  Shield,
  Sword,
  Key,
  Lock,
  Trash2,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  Plus,
  CheckCircle2,
  RefreshCw,
  Edit2,
} from 'lucide-react';

interface FullProfileData extends UserProfile {
  pin?: string;
}

interface ProfileManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserProfile | null;
  onUpdateActiveProfile: (updated: UserProfile) => void;
}

export const ProfileManagementModal: React.FC<ProfileManagementModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onUpdateActiveProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'my_password' | 'friends'>('my_password');
  const [masterPinAuth, setMasterPinAuth] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState('');

  // Dati profili completi (con PIN)
  const [profiles, setProfiles] = useState<FullProfileData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form cambio password Master
  const [masterName, setMasterName] = useState(currentProfile?.name || 'Master');
  const [newMasterPin, setNewMasterPin] = useState('');
  const [confirmNewMasterPin, setConfirmNewMasterPin] = useState('');
  const [masterUpdateMsg, setMasterUpdateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form aggiungi amico
  const [friendName, setFriendName] = useState('');
  const [friendPin, setFriendPin] = useState('');
  const [friendAvatar, setFriendAvatar] = useState('user');
  const [friendMsg, setFriendMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modifica inline PIN amico
  const [editingFriendId, setEditingFriendId] = useState<string | null>(null);
  const [editingFriendPin, setEditingFriendPin] = useState('');
  const [editingFriendName, setEditingFriendName] = useState('');

  // Mostra / nascondi PIN nella lista
  const [showPinsMap, setShowPinsMap] = useState<Record<string, boolean>>({});

  const fetchAdminProfiles = async (pin: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/profiles/admin-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterPin: pin }),
      });

      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
        setIsUnlocked(true);
        setUnlockError('');
        const m = data.find((p: any) => p.isMaster);
        if (m) setMasterName(m.name);
      } else {
        const err = await res.json();
        setUnlockError(err.error || 'PIN Master non valido.');
        setIsUnlocked(false);
      }
    } catch (err: any) {
      setUnlockError('Errore di connessione: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setMasterUpdateMsg(null);
      setFriendMsg(null);
      setEditingFriendId(null);
      // Se abbiamo già un PIN salvato in sessione proviamo subito
      const cachedPin = sessionStorage.getItem('chronica_master_auth_pin');
      if (cachedPin) {
        setMasterPinAuth(cachedPin);
        fetchAdminProfiles(cachedPin);
      } else {
        setIsUnlocked(false);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAdminProfiles(masterPinAuth);
    sessionStorage.setItem('chronica_master_auth_pin', masterPinAuth);
  };

  // 1. Cambia Password / Nome Master
  const handleChangeMasterPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMasterUpdateMsg(null);

    if (!newMasterPin.trim()) {
      setMasterUpdateMsg({ type: 'error', text: 'Inserisci il nuovo PIN' });
      return;
    }

    if (newMasterPin !== confirmNewMasterPin) {
      setMasterUpdateMsg({ type: 'error', text: 'Il nuovo PIN e la conferma non coincidono' });
      return;
    }

    const master = profiles.find((p) => p.isMaster);
    if (!master) return;

    try {
      const res = await fetch('/api/profiles/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterPin: masterPinAuth,
          action: 'update_pin',
          profileData: {
            id: master.id,
            newName: masterName.trim(),
            newPin: newMasterPin.trim(),
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMasterUpdateMsg({ type: 'success', text: 'Password e nome Master aggiornati con successo!' });
        setMasterPinAuth(newMasterPin.trim());
        sessionStorage.setItem('chronica_master_auth_pin', newMasterPin.trim());
        setNewMasterPin('');
        setConfirmNewMasterPin('');
        if (data.profile) {
          onUpdateActiveProfile(data.profile);
        }
        fetchAdminProfiles(newMasterPin.trim());
      } else {
        setMasterUpdateMsg({ type: 'error', text: data.error || 'Errore durante l\'aggiornamento' });
      }
    } catch (err: any) {
      setMasterUpdateMsg({ type: 'error', text: 'Errore: ' + err.message });
    }
  };

  // 2. Crea Nuovo Profilo Amico
  const handleCreateFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    setFriendMsg(null);

    if (!friendName.trim() || !friendPin.trim()) {
      setFriendMsg({ type: 'error', text: 'Nome e PIN sono obbligatori' });
      return;
    }

    try {
      const res = await fetch('/api/profiles/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterPin: masterPinAuth,
          action: 'create',
          profileData: {
            name: friendName.trim(),
            pin: friendPin.trim(),
            avatar: friendAvatar,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFriendMsg({ type: 'success', text: `Profilo per "${friendName.trim()}" creato!` });
        setFriendName('');
        setFriendPin('');
        fetchAdminProfiles(masterPinAuth);
        setTimeout(() => setFriendMsg(null), 3000);
      } else {
        setFriendMsg({ type: 'error', text: data.error || 'Errore creazione' });
      }
    } catch (err: any) {
      setFriendMsg({ type: 'error', text: 'Errore: ' + err.message });
    }
  };

  // 3. Salva Modifica Rapida Amico
  const handleSaveFriendEdit = async (profileId: string) => {
    if (!editingFriendPin.trim()) return;

    try {
      const res = await fetch('/api/profiles/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterPin: masterPinAuth,
          action: 'update_pin',
          profileData: {
            id: profileId,
            newName: editingFriendName.trim() || undefined,
            newPin: editingFriendPin.trim(),
          },
        }),
      });

      if (res.ok) {
        setEditingFriendId(null);
        fetchAdminProfiles(masterPinAuth);
      } else {
        const d = await res.json();
        alert(d.error || 'Errore modifica');
      }
    } catch {
      alert('Errore di connessione');
    }
  };

  // 4. Elimina Profilo Amico
  const handleDeleteFriend = async (profileId: string, name: string) => {
    if (!confirm(`Sei sicuro di voler eliminare il profilo di "${name}"? Le sue cronache personali rimarranno sul disco ma non potrà più accedere.`)) {
      return;
    }

    try {
      const res = await fetch('/api/profiles/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterPin: masterPinAuth,
          action: 'delete',
          profileData: { id: profileId },
        }),
      });

      if (res.ok) {
        fetchAdminProfiles(masterPinAuth);
      } else {
        const d = await res.json();
        alert(d.error || 'Errore eliminazione');
      }
    } catch {
      alert('Errore di connessione');
    }
  };

  const togglePinVisibility = (id: string) => {
    setShowPinsMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-950 border border-amber-600 text-amber-400">
              <Crown className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-serif font-black text-base sm:text-lg tracking-wider uppercase text-slate-100">
                Gestione Profili & Password
              </h3>
              <p className="text-xs text-amber-300 font-mono">
                Pannello di Amministrazione Master
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Se non ancora sbloccato con PIN Master */}
        {!isUnlocked ? (
          <div className="p-6 sm:p-8 space-y-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-amber-600/60 mx-auto flex items-center justify-center text-amber-400 shadow-lg">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="font-serif font-black text-lg text-slate-100">
                Area Riservata al Master
              </h4>
              <p className="text-xs text-slate-400 font-serif italic max-w-sm mx-auto">
                Inserisci il tuo PIN Master per gestire le password e i profili dei tuoi amici. (Di fabbrica: <code>1234</code>)
              </p>
            </div>

            <form onSubmit={handleUnlock} className="max-w-xs mx-auto space-y-3">
              <input
                type="password"
                autoFocus
                required
                value={masterPinAuth}
                onChange={(e) => {
                  setMasterPinAuth(e.target.value);
                  setUnlockError('');
                }}
                placeholder="Inserisci PIN Master..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-lg tracking-widest text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 font-mono"
              />

              {unlockError && (
                <div className="flex items-center justify-center space-x-1.5 text-red-400 text-xs font-mono">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{unlockError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 text-white font-serif font-bold text-xs rounded-xl shadow-lg cursor-pointer transition-all"
              >
                {isLoading ? 'Verifica in corso...' : 'Sblocca Pannello Master'}
              </button>
            </form>
          </div>
        ) : (
          /* PANNELLO DI GESTIONE SBLOCCATO */
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Tab Switcher */}
            <div className="bg-slate-950 border-b border-slate-800 px-6 py-2.5 flex space-x-2 shrink-0 font-mono text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('my_password')}
                className={`px-4 py-2 rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer ${
                  activeTab === 'my_password'
                    ? 'bg-amber-950 border border-amber-600 text-amber-200 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>1. La Mia Password Master</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('friends')}
                className={`px-4 py-2 rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer ${
                  activeTab === 'friends'
                    ? 'bg-indigo-900 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>2. Gestione Profili Amici ({profiles.filter((p) => !p.isMaster).length})</span>
              </button>
            </div>

            {/* Content Area */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
              {/* TAB 1: CAMBIA PASSWORD / NOME MASTER */}
              {activeTab === 'my_password' && (
                <form onSubmit={handleChangeMasterPin} className="max-w-md mx-auto space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/50 space-y-1 text-center">
                    <span className="font-serif font-bold text-amber-300 block text-sm">
                      Personalizza il Tuo Profilo Master
                    </span>
                    <p className="text-slate-400 text-xs font-serif italic">
                      Qui puoi cambiare il tuo nome visualizzato e impostare una password o PIN personalizzato che ricorderai solo tu.
                    </p>
                  </div>

                  <div className="space-y-3 bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                    <div>
                      <label className="text-xs font-mono font-bold text-slate-300">
                        Nome del Master:
                      </label>
                      <input
                        type="text"
                        required
                        value={masterName}
                        onChange={(e) => setMasterName(e.target.value)}
                        placeholder="Es: Il Tuo Nome o Master"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 mt-1 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-mono font-bold text-slate-300">
                        Nuova Password / Nuovo PIN Master:
                      </label>
                      <input
                        type="text"
                        required
                        value={newMasterPin}
                        onChange={(e) => setNewMasterPin(e.target.value)}
                        placeholder="Inserisci la nuova password o PIN..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 mt-1 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-mono font-bold text-slate-300">
                        Conferma Nuova Password / PIN:
                      </label>
                      <input
                        type="text"
                        required
                        value={confirmNewMasterPin}
                        onChange={(e) => setConfirmNewMasterPin(e.target.value)}
                        placeholder="Riscrivi la nuova password per conferma..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 mt-1 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {masterUpdateMsg && (
                    <div
                      className={`p-3 rounded-xl flex items-center space-x-2 text-xs font-mono ${
                        masterUpdateMsg.type === 'success'
                          ? 'bg-emerald-950/80 border border-emerald-600 text-emerald-300'
                          : 'bg-red-950/80 border border-red-600 text-red-300'
                      }`}
                    >
                      {masterUpdateMsg.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{masterUpdateMsg.text}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 text-white font-serif font-bold text-xs rounded-xl shadow-lg cursor-pointer transition-all"
                  >
                    Salva Nuova Password Master
                  </button>
                </form>
              )}

              {/* TAB 2: GESTIONE PROFILI AMICI */}
              {activeTab === 'friends' && (
                <div className="space-y-6">
                  {/* Lista Profili Esistenti */}
                  <div className="space-y-3">
                    <h4 className="font-serif font-bold text-slate-200 uppercase text-xs tracking-wider flex items-center justify-between">
                      <span>Profili Attualmente Attivi:</span>
                      <button
                        type="button"
                        onClick={() => fetchAdminProfiles(masterPinAuth)}
                        className="text-indigo-400 hover:text-white flex items-center space-x-1 font-mono text-[11px] cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Ricarica</span>
                      </button>
                    </h4>

                    <div className="space-y-2">
                      {profiles.map((p) => {
                        const isEditing = editingFriendId === p.id;
                        const isPinVisible = showPinsMap[p.id];

                        return (
                          <div
                            key={p.id}
                            className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                              p.isMaster
                                ? 'bg-amber-950/20 border-amber-800/60'
                                : 'bg-slate-950/70 border-slate-800'
                            }`}
                          >
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
                                {p.isMaster ? (
                                  <Crown className="w-5 h-5 text-amber-300" />
                                ) : (
                                  <User className="w-5 h-5 text-indigo-400" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                {!isEditing ? (
                                  <>
                                    <div className="flex items-center space-x-2">
                                      <span className="font-serif font-bold text-sm text-slate-100 truncate">
                                        {p.name}
                                      </span>
                                      {p.isMaster && (
                                        <span className="px-2 py-0.2 rounded bg-amber-950 border border-amber-600 text-amber-300 text-[10px] font-mono">
                                          Master
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 mt-0.5">
                                      <span>PIN:</span>
                                      <span className="font-bold text-slate-200">
                                        {isPinVisible ? p.pin : '••••'}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => togglePinVisibility(p.id)}
                                        className="text-slate-500 hover:text-slate-300 cursor-pointer"
                                        title={isPinVisible ? 'Nascondi' : 'Mostra PIN'}
                                      >
                                        {isPinVisible ? (
                                          <EyeOff className="w-3.5 h-3.5" />
                                        ) : (
                                          <Eye className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex flex-wrap gap-2 items-center">
                                    <input
                                      type="text"
                                      value={editingFriendName}
                                      onChange={(e) => setEditingFriendName(e.target.value)}
                                      placeholder="Nome..."
                                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 font-serif"
                                    />
                                    <input
                                      type="text"
                                      value={editingFriendPin}
                                      onChange={(e) => setEditingFriendPin(e.target.value)}
                                      placeholder="Nuovo PIN..."
                                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 font-mono w-28"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveFriendEdit(p.id)}
                                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold"
                                    >
                                      Salva
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingFriendId(null)}
                                      className="px-2 py-1 bg-slate-800 text-slate-400 rounded-lg text-xs"
                                    >
                                      Annulla
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Azioni profilo */}
                            {!p.isMaster && !isEditing && (
                              <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-auto">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingFriendId(p.id);
                                    setEditingFriendName(p.name);
                                    setEditingFriendPin(p.pin || '');
                                  }}
                                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center space-x-1 cursor-pointer"
                                  title="Modifica Nome o PIN"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span>Modifica</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteFriend(p.id, p.name)}
                                  className="p-1.5 bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 rounded-xl cursor-pointer"
                                  title="Elimina Profilo"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Modulo Creazione Nuovo Amico */}
                  <form onSubmit={handleCreateFriend} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex items-center space-x-1.5 text-xs font-serif font-bold text-indigo-300">
                      <Plus className="w-4 h-4 text-emerald-400" />
                      <span>Crea Profilo per un Nuovo Amico</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-mono text-slate-400">Nome dell'Amico:</label>
                        <input
                          type="text"
                          required
                          value={friendName}
                          onChange={(e) => setFriendName(e.target.value)}
                          placeholder="Es: Marco, Elena, Davide..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 mt-1 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-mono text-slate-400">PIN / Password che gli assegni:</label>
                        <input
                          type="text"
                          required
                          value={friendPin}
                          onChange={(e) => setFriendPin(e.target.value)}
                          placeholder="Es: 5555 o una parola chiave..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 mt-1 font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-slate-400">Icona Avatar:</label>
                      <div className="flex space-x-2 mt-1">
                        {[
                          { id: 'user', icon: <User className="w-4 h-4 text-indigo-400" /> },
                          { id: 'sword', icon: <Sword className="w-4 h-4 text-red-400" /> },
                          { id: 'shield', icon: <Shield className="w-4 h-4 text-emerald-400" /> },
                        ].map((item) => (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => setFriendAvatar(item.id)}
                            className={`p-2 rounded-xl border flex-1 flex justify-center cursor-pointer ${
                              friendAvatar === item.id ? 'bg-indigo-950 border-indigo-500' : 'bg-slate-900 border-slate-800'
                            }`}
                          >
                            {item.icon}
                          </button>
                        ))}
                      </div>
                    </div>

                    {friendMsg && (
                      <div
                        className={`p-2.5 rounded-xl text-xs font-mono ${
                          friendMsg.type === 'success'
                            ? 'bg-emerald-950/80 border border-emerald-600 text-emerald-300'
                            : 'bg-red-950/80 border border-red-600 text-red-300'
                        }`}
                      >
                        {friendMsg.text}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 text-white font-serif font-bold text-xs rounded-xl shadow cursor-pointer transition-all"
                    >
                      Aggiungi Profilo Amico
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

