import React, { useState, useEffect } from 'react';
import { ambientAudio, AMBIENT_CATALOG, SFX_CATALOG } from '../services/ambientAudio';
import type { AmbientTrack, SfxEffect } from '../services/ambientAudio';
import {
  Volume2,
  VolumeX,
  CloudRain,
  Flame,
  Beer,
  Swords,
  Bell,
  Wind,
  HeartPulse,
  Clock,
  Link,
  Square,
  Sparkles,
  Upload,
  AlertCircle,
  Music,
} from 'lucide-react';

export const AmbientPlayer: React.FC = () => {
  const [currentTrack, setCurrentTrack] = useState<AmbientTrack>(ambientAudio.getCurrentTrack());
  const [volume, setVolume] = useState<number>(ambientAudio.getVolume());
  const [isOpen, setIsOpen] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState(ambientAudio.getCustomUrl());
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(ambientAudio.getLastError());
  const [youtubeId, setYoutubeId] = useState<string | null>(ambientAudio.getYouTubeVideoId());

  useEffect(() => {
    const unsubTrack = ambientAudio.subscribe((t) => setCurrentTrack(t));
    const unsubErr = ambientAudio.subscribeError((err) => setAudioError(err));
    const unsubYt = ambientAudio.subscribeYouTube((yt) => setYoutubeId(yt));
    return () => {
      unsubTrack();
      unsubErr();
      unsubYt();
    };
  }, []);

  const handleTrackSelect = (track: AmbientTrack) => {
    if (track === 'custom') {
      setShowCustomInput(true);
      return;
    }
    setShowCustomInput(false);
    ambientAudio.play(track);
  };

  const handlePlayCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrlInput.trim()) return;
    ambientAudio.play('custom', customUrlInput.trim());
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      ambientAudio.playFile(file);
      setShowCustomInput(false);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    ambientAudio.setVolume(val);
  };

  const handlePlaySfx = (sfx: SfxEffect) => {
    ambientAudio.playSfx(sfx);
  };

  const isPlaying = currentTrack !== 'off';

  const getTrackIcon = (id: AmbientTrack) => {
    switch (id) {
      case 'rain_thunder':
        return <CloudRain className="w-4 h-4 text-cyan-400" />;
      case 'wind':
        return <Wind className="w-4 h-4 text-slate-300" />;
      case 'campfire':
        return <Flame className="w-4 h-4 text-amber-400" />;
      case 'saloon':
        return <Beer className="w-4 h-4 text-amber-500" />;
      case 'churchbells':
        return <Bell className="w-4 h-4 text-purple-400" />;
      case 'combat_drums':
        return <Swords className="w-4 h-4 text-red-400" />;
      case 'heartbeat':
        return <HeartPulse className="w-4 h-4 text-rose-500 animate-pulse" />;
      case 'clock':
        return <Clock className="w-4 h-4 text-amber-300" />;
      case 'custom':
        return <Music className="w-4 h-4 text-indigo-400" />;
      default:
        return <VolumeX className="w-4 h-4 text-slate-500" />;
    }
  };

  const getCurrentTrackLabel = () => {
    if (currentTrack === 'custom') {
      return ambientAudio.getCustomTitle() || 'Audio Personalizzato';
    }
    const found = AMBIENT_CATALOG.find((t) => t.id === currentTrack);
    return found ? found.label.split('&')[0].trim() : 'Audio';
  };

  return (
    <div className="relative">
      {/* Player YouTube in background (se l'utente ha inserito un link YouTube) */}
      {youtubeId && (
        <iframe
          className="hidden"
          width="0"
          height="0"
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&loop=1&playlist=${youtubeId}&controls=0`}
          title="YouTube Ambient Audio"
          allow="autoplay; encrypted-media"
        />
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border shadow-sm shrink-0 ${
          isPlaying
            ? 'bg-indigo-950/90 border-indigo-500 text-indigo-200 shadow-[0_0_12px_rgba(99,102,241,0.4)]'
            : 'bg-slate-900 border-slate-700/80 hover:border-slate-500 text-slate-400'
        }`}
        title={`Colonna Sonora & Suoni d'Ambiente: ${getCurrentTrackLabel()}`}
      >
        {isPlaying ? (
          <Volume2 className="w-4 h-4 text-indigo-400 animate-pulse" />
        ) : (
          <VolumeX className="w-4 h-4 text-slate-500" />
        )}
      </button>

      {/* Pannello Dropdown Atmosfera & Soundboard */}
      {isOpen && (
        <div className="absolute right-0 top-11 z-50 w-84 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 p-4 space-y-3.5 animate-fadeIn text-xs">
          {/* Header e Regolazione Volume */}
          <div className="space-y-2 border-b border-slate-800 pb-3">
            <div className="flex items-center justify-between font-mono uppercase text-slate-400 font-bold">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span className="truncate max-w-[170px]">{getCurrentTrackLabel()}</span>
              </span>
              {isPlaying ? (
                <button
                  type="button"
                  onClick={() => ambientAudio.stop()}
                  className="px-2 py-0.5 rounded bg-red-950/80 border border-red-700/80 text-red-300 text-[10px] flex items-center gap-1 hover:bg-red-900 cursor-pointer"
                >
                  <Square className="w-2.5 h-2.5" />
                  <span>Spegni</span>
                </button>
              ) : (
                <span className="text-slate-500 text-[10px]">Silenzio</span>
              )}
            </div>

            {/* Slider Volume Sempre Disponibile */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] font-mono text-slate-400 min-w-[45px]">
                Vol: {Math.round(volume * 100)}%
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
                className="flex-1 h-1.5 bg-slate-800 rounded-lg accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Banner Errore Audio (se presente) */}
          {audioError && (
            <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-800/80 text-[11px] text-red-200 leading-relaxed flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-red-300">Problema Riproduzione Audio:</span>
                <span>{audioError}</span>
              </div>
            </div>
          )}

          {/* Soundboard Rapida One-Shot (Sparo, Tuono, Ululato) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-400 font-bold">
              <span>Effetti One-Shot Tavolo:</span>
              <span className="text-[9px] text-amber-400">Tocca per lanciare</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {SFX_CATALOG.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handlePlaySfx(s.id)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 border border-slate-800 hover:border-slate-700 text-center transition-all cursor-pointer"
                >
                  <div className="text-base mb-0.5">{s.icon}</div>
                  <div className="font-serif text-[10px] text-slate-200 truncate">{s.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Lista Tracce d'Ambiente Reali */}
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
              Tracce Loop Continue:
            </div>
            {AMBIENT_CATALOG.map((item) => {
              const isSel = currentTrack === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTrackSelect(item.id)}
                  className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                    isSel
                      ? 'bg-indigo-950/90 border border-indigo-500 text-white font-bold shadow-sm'
                      : 'bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-slate-950 shrink-0">{getTrackIcon(item.id)}</div>
                    <div className="min-w-0">
                      <div className="font-serif text-xs truncate">{item.label}</div>
                      <div className="text-[9px] text-slate-400 truncate font-mono">{item.description}</div>
                    </div>
                  </div>
                  {isSel && <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 ml-1.5 animate-pulse" />}
                </button>
              );
            })}

            {/* Opzione Audio Personalizzato */}
            <button
              type="button"
              onClick={() => handleTrackSelect('custom')}
              className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                currentTrack === 'custom'
                  ? 'bg-indigo-950/90 border border-indigo-500 text-white font-bold'
                  : 'bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 text-slate-300'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-slate-950 shrink-0">
                  <Link className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <div className="font-serif text-xs">Link Web / YouTube / File Personale</div>
                  <div className="text-[9px] text-slate-400 font-mono">YouTube, Dropbox, Google Drive, MP3 o file locale</div>
                </div>
              </div>
              {currentTrack === 'custom' && <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 ml-1.5 animate-pulse" />}
            </button>
          </div>

          {/* Form Inserimento URL Personalizzato o Caricamento File */}
          {showCustomInput && (
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2.5">
              {/* Tasto Carica File Diretto dal Computer o Telefono */}
              <label className="w-full py-2 px-3 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-700/70 text-indigo-200 font-serif font-bold text-xs flex items-center justify-center space-x-2 cursor-pointer transition-all active:scale-[0.98]">
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>Carica File Audio (.mp3, .wav, .ogg)</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <div className="flex items-center my-1">
                <div className="flex-1 border-t border-slate-800" />
                <span className="px-2 text-[10px] font-mono uppercase text-slate-500">oppure incolla link</span>
                <div className="flex-1 border-t border-slate-800" />
              </div>

              <form onSubmit={handlePlayCustom} className="space-y-2">
                <input
                  type="text"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="Link YouTube, Dropbox o file MP3 online..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />

                {/* Esempi test rapidi */}
                <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-400">
                  <span className="text-slate-500">Esempi:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomUrlInput('https://actions.google.com/sounds/v1/weather/rain_heavy.ogg');
                      ambientAudio.play('custom', 'https://actions.google.com/sounds/v1/weather/rain_heavy.ogg');
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono cursor-pointer"
                  >
                    Stream OGG
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomUrlInput('https://www.youtube.com/watch?v=jfKfPfyJRdk');
                      ambientAudio.play('custom', 'https://www.youtube.com/watch?v=jfKfPfyJRdk');
                    }}
                    className="px-1.5 py-0.5 rounded bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 font-mono cursor-pointer"
                  >
                    YouTube Lofi
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!customUrlInput.trim()}
                  className="w-full py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-40 text-white font-serif font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Avvia Riproduzione Link
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
