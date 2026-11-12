import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { RoomPlayer } from '../services/multiplayer';
import { X, Users, Copy, Check, Tv, Smartphone, Shield, Flame, Wifi, Globe, RefreshCw } from 'lucide-react';

interface TabletopRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  players: RoomPlayer[];
  onToggleCinemaMode?: () => void;
  isCinemaMode?: boolean;
  onRegenerateRoomCode?: () => void;
}

export const TabletopRoomModal: React.FC<TabletopRoomModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  players,
  onToggleCinemaMode,
  isCinemaMode,
  onRegenerateRoomCode,
}) => {
  const [copied, setCopied] = useState(false);
  const [connectionMode, setConnectionMode] = useState<'wifi' | 'cellular'>('wifi');
  const [tunnelUrl, setTunnelUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/public-tunnel-url')
        .then((r) => r.json())
        .then((d) => {
          if (d?.tunnelUrl) {
            setTunnelUrl(d.tunnelUrl);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Costruisci l'URL di connessione per i telefoni
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  const host = typeof window !== 'undefined' ? window.location.host : 'localhost:5173';
  const isCurrentlyOnTunnel = typeof window !== 'undefined' && window.location.host.includes('trycloudflare.com');

  const activeBaseUrl = (connectionMode === 'cellular' && tunnelUrl)
    ? tunnelUrl.replace(/\/$/, '')
    : isCurrentlyOnTunnel
    ? `${protocol}//${host}`
    : `${protocol}//${host}`;

  const joinUrl = `${activeBaseUrl}/?room=${roomCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl shadow-indigo-950/80 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3 text-indigo-400">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
            <div>
              <h3 className="font-serif font-black text-base sm:text-lg tracking-wider uppercase text-slate-100">
                Stanza Tavolo Condiviso
              </h3>
              <p className="text-[11px] sm:text-xs text-indigo-300 font-mono">
                PC come Narratore • Cellulari come Schede Personaggio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-8 space-y-5 sm:space-y-6 text-slate-200 overflow-y-auto flex-1">
          {/* Selettore Rete Wi-Fi vs 4G / Internet Remoto */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 p-1 bg-slate-950 border border-slate-800 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => setConnectionMode('wifi')}
                className={`py-2 px-3 rounded-xl text-xs font-serif font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  connectionMode === 'wifi'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span>Wi-Fi Casa (Locale)</span>
              </button>
              <button
                type="button"
                onClick={() => setConnectionMode('cellular')}
                className={`py-2 px-3 rounded-xl text-xs font-serif font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  connectionMode === 'cellular'
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30 ring-1 ring-amber-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-4 h-4 text-amber-300" />
                <span>4G / Mobile (Internet)</span>
              </button>
            </div>

            {connectionMode === 'cellular' ? (
              <div className="px-3 py-2 rounded-xl bg-amber-950/40 border border-amber-800/60 text-[11px] text-amber-200 flex items-center space-x-2">
                <Globe className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Modalità 4G / Fuori Casa:</strong> Il QR Code usa il tunnel pubblico Cloudflare. I telefoni possono connettersi usando la connessione dati (4G/5G).
                </span>
              </div>
            ) : (
              <div className="px-3 py-2 rounded-xl bg-indigo-950/40 border border-indigo-800/60 text-[11px] text-indigo-200 flex items-center space-x-2">
                <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Modalità Wi-Fi Casa:</strong> I telefoni devono essere connessi alla stessa rete Wi-Fi del computer di casa.
                </span>
              </div>
            )}
          </div>

          {/* Sezione QR Code e Codice Stanza */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            {/* QR Code */}
            <div className="p-3 bg-white rounded-2xl shadow-xl shrink-0">
              <QRCodeSVG value={joinUrl} size={150} level="M" />
            </div>

            {/* Istruzioni e Link */}
            <div className="space-y-3 flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start space-x-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono uppercase text-slate-400 font-bold">
                  Inquadra con la Fotocamera del Telefono
                </span>
              </div>

              <div className="flex items-center justify-center sm:justify-start space-x-2">
                <h4 className="font-serif font-black text-2xl text-slate-100">
                  Codice Stanza: <span className="text-indigo-400 font-mono tracking-widest">{roomCode}</span>
                </h4>
                {onRegenerateRoomCode && (
                  <button
                    type="button"
                    onClick={onRegenerateRoomCode}
                    title="Rigenera Codice Stanza (invalida vecchie sessioni memorizzate)"
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {connectionMode === 'cellular'
                  ? 'I telefoni connessi con i dati 4G/5G possono inquadrare questo codice per unirsi istantaneamente al tavolo via Internet.'
                  : 'Tutti i telefoni connessi al Wi-Fi possono inquadrare questo codice per aprire la propria scheda e tirare i dadi dal cellulare!'}
              </p>

              {/* Tasto Copia Link */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value={joinUrl}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-mono flex-1 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-sm transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiato!' : 'Copia'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Giocatori Connessi */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-serif font-bold text-sm uppercase tracking-wider text-slate-200 flex items-center space-x-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Giocatori al Tavolo ({players.length})</span>
              </h4>
              {players.length === 0 && (
                <span className="text-xs text-amber-400/90 font-mono animate-pulse">
                  In attesa che gli amici inquadrino il QR code...
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
              {players.map((p) => (
                <div
                  key={p.id}
                  className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      <span className="font-semibold text-sm text-slate-100">{p.name}</span>
                    </div>
                    <span className="text-xs text-indigo-300 font-serif italic ml-4 block">
                      {p.character.creatureType} • {p.character.factionOrClan}
                    </span>
                  </div>

                  {/* Risorse rapide */}
                  <div className="flex items-center space-x-2 text-xs font-mono">
                    <span className="px-2 py-0.5 bg-red-950/60 border border-red-800 rounded-lg text-red-300 flex items-center space-x-1">
                      <Flame className="w-3 h-3 text-red-500" />
                      <span>{p.character.bloodOrEnergy.current}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Azioni del Tavolo */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            {onToggleCinemaMode && (
              <button
                type="button"
                onClick={onToggleCinemaMode}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-2 cursor-pointer transition-all border ${
                  isCinemaMode
                    ? 'bg-amber-950 border-amber-600 text-amber-200 shadow-md'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                }`}
              >
                <Tv className="w-4 h-4 text-amber-400" />
                <span>{isCinemaMode ? 'Disattiva Schermo TV' : 'Modalità Schermo TV / Cinema'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="ml-auto px-6 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-sm font-bold shadow-md cursor-pointer transition-colors"
            >
              Chiudi & Torna alla Storia
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

