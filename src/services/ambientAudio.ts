// Motore Audio d'Ambiente e Soundboard di Chronica (File Audio Reali ad Alta Definizione)

export type AmbientTrack =
  | 'off'
  | 'rain_thunder'
  | 'campfire'
  | 'saloon'
  | 'combat_drums'
  | 'churchbells'
  | 'wind'
  | 'heartbeat'
  | 'clock'
  | 'custom';

export type SfxEffect = 'gunshot' | 'thunder' | 'wolf_howl';

export interface AmbientTrackInfo {
  id: AmbientTrack;
  label: string;
  category: 'meteo' | 'luoghi' | 'tensione' | 'speciale';
  path?: string;
  description: string;
}

export const AMBIENT_CATALOG: AmbientTrackInfo[] = [
  {
    id: 'rain_thunder',
    label: 'Pioggia & Tuoni Reali',
    category: 'meteo',
    path: '/audio/ambient/rain_thunder.ogg',
    description: 'Pioggia torrenziale e rombi di tuono in lontananza',
  },
  {
    id: 'wind',
    label: 'Vento del Deserto / Tormenta',
    category: 'meteo',
    path: '/audio/ambient/wind.ogg',
    description: 'Ululato del vento notturno tra gli edifici e la polvere',
  },
  {
    id: 'campfire',
    label: 'Falò & Crepitio di Legna',
    category: 'luoghi',
    path: '/audio/ambient/campfire.ogg',
    description: 'Fuoco da bivacco vivo con crepitii rilassanti',
  },
  {
    id: 'saloon',
    label: 'Saloon & Taverna di Frontiera',
    category: 'luoghi',
    path: '/audio/ambient/saloon.ogg',
    description: 'Mormorio sommesso di avventori, bicchieri e tavoli di legno',
  },
  {
    id: 'churchbells',
    label: 'Cripta & Campane Funebri',
    category: 'tensione',
    path: '/audio/ambient/churchbells.ogg',
    description: 'Rintocchi solenni e cupi di campana gotica lontana',
  },
  {
    id: 'combat_drums',
    label: 'Tamburi di Guerra & Tensione',
    category: 'tensione',
    path: '/audio/ambient/combat_drums.ogg',
    description: 'Percussioni ritmiche serrate per scontri e inseguimenti',
  },
  {
    id: 'heartbeat',
    label: 'Battito della Bestia',
    category: 'tensione',
    path: '/audio/ambient/heartbeat.ogg',
    description: 'Pulsazione cardiaca profonda per orrore personale e frenesia',
  },
  {
    id: 'clock',
    label: 'Orologio del Destino',
    category: 'tensione',
    path: '/audio/ambient/clock.ogg',
    description: 'Ticchettio sinistro per scene a tempo e suspense',
  },
];

export const SFX_CATALOG: { id: SfxEffect; label: string; icon: string; path: string }[] = [
  { id: 'gunshot', label: 'Sparo di Revolver', icon: '💥', path: '/audio/ambient/sfx/gunshot.ogg' },
  { id: 'thunder', label: 'Schianto di Tuono', icon: '⚡', path: '/audio/ambient/sfx/thunder.ogg' },
  { id: 'wolf_howl', label: 'Ululato Notturno', icon: '🐺', path: '/audio/ambient/sfx/wolf_howl.ogg' },
];

export function extractYouTubeVideoId(url: string): string | null {
  const clean = (url || '').trim();
  const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
  return match ? match[1] : null;
}

export function normalizeAudioUrl(rawUrl: string): { url: string; youtubeId?: string } {
  let clean = (rawUrl || '').trim();
  const ytId = extractYouTubeVideoId(clean);
  if (ytId) {
    return { url: clean, youtubeId: ytId };
  }

  // Dropbox: da pagina HTML a stream diretto raw audio
  if (clean.includes('dropbox.com')) {
    clean = clean.replace(/[?&]dl=0/g, '').replace(/[?&]raw=1/g, '');
    clean += (clean.includes('?') ? '&' : '?') + 'raw=1';
  }

  // Google Drive: da visualizzatore a stream di download diretto
  if (clean.includes('drive.google.com/file/d/')) {
    const match = clean.match(/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
      clean = `https://docs.google.com/uc?export=download&id=${match[1]}`;
    }
  }

  return { url: clean };
}

class AmbientAudioEngine {
  private currentAudio: HTMLAudioElement | null = null;
  private currentTrack: AmbientTrack = 'off';
  private customUrl: string = '';
  private customTitle: string = '';
  private volume: number = 0.35;
  private youtubeVideoId: string | null = null;
  private lastError: string | null = null;
  private onTrackChangeListeners: Array<(track: AmbientTrack) => void> = [];
  private onErrorListeners: Array<(err: string | null) => void> = [];
  private onYouTubeListeners: Array<(ytId: string | null) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const savedVol = localStorage.getItem('chronica_ambient_volume');
      if (savedVol) {
        this.volume = parseFloat(savedVol);
      }
    }
  }

  public subscribe(callback: (track: AmbientTrack) => void) {
    this.onTrackChangeListeners.push(callback);
    return () => {
      this.onTrackChangeListeners = this.onTrackChangeListeners.filter((cb) => cb !== callback);
    };
  }

  public subscribeError(callback: (err: string | null) => void) {
    this.onErrorListeners.push(callback);
    return () => {
      this.onErrorListeners = this.onErrorListeners.filter((cb) => cb !== callback);
    };
  }

  public subscribeYouTube(callback: (ytId: string | null) => void) {
    this.onYouTubeListeners.push(callback);
    return () => {
      this.onYouTubeListeners = this.onYouTubeListeners.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    this.onTrackChangeListeners.forEach((cb) => cb(this.currentTrack));
  }

  private notifyError() {
    this.onErrorListeners.forEach((cb) => cb(this.lastError));
  }

  private notifyYouTube() {
    this.onYouTubeListeners.forEach((cb) => cb(this.youtubeVideoId));
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (typeof window !== 'undefined') {
      localStorage.setItem('chronica_ambient_volume', this.volume.toString());
    }
    if (this.currentAudio) {
      this.currentAudio.volume = this.volume;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getCurrentTrack(): AmbientTrack {
    return this.currentTrack;
  }

  public getCustomUrl(): string {
    return this.customUrl;
  }

  public getCustomTitle(): string {
    return this.customTitle;
  }

  public getYouTubeVideoId(): string | null {
    return this.youtubeVideoId;
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  public stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.youtubeVideoId = null;
    this.notifyYouTube();
    this.currentTrack = 'off';
    this.notify();
  }

  /**
   * Riproduce un file audio caricato direttamente dall'utente dal proprio computer o telefono
   */
  public playFile(file: File) {
    this.stop();
    this.lastError = null;
    this.notifyError();

    try {
      const blobUrl = URL.createObjectURL(file);
      const audio = new Audio(blobUrl);
      audio.loop = true;
      audio.volume = this.volume;

      audio.onerror = () => {
        this.lastError = `Impossibile decodificare il file "${file.name}". Assicurati che sia un formato audio supportato (MP3, WAV, OGG).`;
        this.notifyError();
        this.stop();
      };

      audio.play().catch((err) => {
        console.warn('Riproduzione audio bloccata:', err);
        this.lastError = 'Riproduzione bloccata dal browser: clicca nuovamente per consentire l\'audio.';
        this.notifyError();
      });

      this.currentAudio = audio;
      this.currentTrack = 'custom';
      this.customTitle = file.name;
      this.notify();
    } catch (e: any) {
      this.lastError = `Errore apertura file: ${e.message}`;
      this.notifyError();
    }
  }

  public play(track: AmbientTrack, customUrlInput?: string) {
    this.lastError = null;
    this.notifyError();

    if (this.currentTrack === track && track !== 'off' && (!customUrlInput || customUrlInput === this.customUrl)) {
      this.stop();
      return;
    }

    this.stop();

    if (track === 'off') {
      return;
    }

    if (track === 'custom') {
      const input = (customUrlInput || this.customUrl).trim();
      this.customUrl = input;
      if (!input) return;

      const normalized = normalizeAudioUrl(input);

      // Se è un link YouTube: attiva il player YouTube
      if (normalized.youtubeId) {
        this.youtubeVideoId = normalized.youtubeId;
        this.currentTrack = 'custom';
        this.customTitle = 'YouTube Audio';
        this.notifyYouTube();
        this.notify();
        return;
      }

      // Altrimenti flusso audio diretto (MP3, OGG, WAV, Stream)
      this.youtubeVideoId = null;
      this.notifyYouTube();

      try {
        const audio = new Audio(normalized.url);
        audio.loop = true;
        audio.volume = this.volume;

        audio.onerror = () => {
          this.lastError = 'Impossibile riprodurre il link. Verifica che sia un link diretto a un file audio (es. che finisca per .mp3 / .ogg) o un link YouTube valido, oppure usa "Carica File".';
          this.notifyError();
          this.stop();
        };

        audio.play().catch((err) => {
          console.warn('Riproduzione audio ambiente bloccata:', err);
          this.lastError = 'Il browser ha bloccato la riproduzione o il server sorgente rifiuta lo streaming (CORS). Prova con un link YouTube o carica il file MP3 direttamente.';
          this.notifyError();
        });

        this.currentAudio = audio;
        this.currentTrack = 'custom';
        this.customTitle = 'Audio Web';
        this.notify();
      } catch (err: any) {
        this.lastError = `Errore avvio traccia: ${err.message}`;
        this.notifyError();
        this.stop();
      }
      return;
    }

    // Traccia del catalogo preimpostato
    this.youtubeVideoId = null;
    this.notifyYouTube();
    const info = AMBIENT_CATALOG.find((t) => t.id === track);
    if (!info || !info.path) return;

    try {
      const audio = new Audio(info.path);
      audio.loop = true;
      audio.volume = this.volume;

      audio.onerror = () => {
        this.lastError = `File audio per "${info.label}" non trovato.`;
        this.notifyError();
      };

      audio.play().catch((err) => {
        console.warn('Riproduzione audio catalogo interrotta:', err);
      });

      this.currentAudio = audio;
      this.currentTrack = track;
      this.customTitle = info.label;
      this.notify();
    } catch (err: any) {
      console.error('Errore avvio traccia ambiente:', err);
      this.lastError = err.message;
      this.notifyError();
      this.stop();
    }
  }

  /**
   * Riproduce un effetto sonoro rapido one-shot senza interrompere la musica di sottofondo
   */
  public playSfx(sfx: SfxEffect) {
    const item = SFX_CATALOG.find((s) => s.id === sfx);
    if (!item) return;

    try {
      const sfxAudio = new Audio(item.path);
      sfxAudio.volume = Math.min(1, this.volume * 1.3);
      sfxAudio.play().catch((err) => console.warn('Errore sfx:', err));
    } catch (err) {
      console.warn('Errore play sfx:', err);
    }
  }
}

export const ambientAudio = new AmbientAudioEngine();
