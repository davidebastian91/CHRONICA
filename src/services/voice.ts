// Servizio Voce Narratore: Microsoft Edge Neural Voice Streaming con Prefetch & Cache Istantanea

export type VoiceStateCallback = (
  isSpeaking: boolean,
  speakingId: string | null,
  isLoading: boolean,
  loadingId: string | null
) => void;

export type VoiceId =
  | 'it-IT-GiuseppeMultilingualNeural'
  | 'it-IT-DiegoNeural'
  | 'it-IT-IsabellaNeural'
  | 'it-IT-ElsaNeural';

export interface VoiceSettings {
  voice: VoiceId;
  rate: string; // '+0%', '+15%', '+25%'
}

export const VOICE_OPTIONS: Array<{ id: VoiceId; label: string; desc: string; gender: 'Uomo' | 'Donna' }> = [
  {
    id: 'it-IT-GiuseppeMultilingualNeural',
    label: 'Giuseppe (Consigliata)',
    desc: 'Naturale, espressiva e dinamica',
    gender: 'Uomo',
  },
  {
    id: 'it-IT-DiegoNeural',
    label: 'Diego',
    desc: 'Voce maschile calda e profonda',
    gender: 'Uomo',
  },
  {
    id: 'it-IT-IsabellaNeural',
    label: 'Isabella',
    desc: 'Voce femminile cinematografica e chiara',
    gender: 'Donna',
  },
  {
    id: 'it-IT-ElsaNeural',
    label: 'Elsa',
    desc: 'Voce femminile solenne e riflessiva',
    gender: 'Donna',
  },
];

export const RATE_OPTIONS = [
  { value: '+0%', label: 'Normale (1.0x)' },
  { value: '+15%', label: 'Dinamico (+15%)' },
  { value: '+25%', label: 'Veloce (+25%)' },
];

const SETTINGS_KEY = 'chronica_voice_settings';

const DEFAULT_SETTINGS: VoiceSettings = {
  voice: 'it-IT-GiuseppeMultilingualNeural',
  rate: '+15%',
};

class VoiceNarrator {
  private currentAudio: HTMLAudioElement | null = null;
  private isSpeaking: boolean = false;
  private currentSpeakingId: string | null = null;
  private isLoading: boolean = false;
  private currentLoadingId: string | null = null;
  private onStateChangeListeners: Array<VoiceStateCallback> = [];

  // Cache in-memory degli URL blob audio generati (latenza 0ms al click)
  private audioBlobCache = new Map<string, string>();
  private prefetchInFlight = new Set<string>();

  public getSettings(): VoiceSettings {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          voice: parsed.voice || DEFAULT_SETTINGS.voice,
          rate: parsed.rate || DEFAULT_SETTINGS.rate,
        };
      }
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  }

  public setSettings(partial: Partial<VoiceSettings>) {
    const current = this.getSettings();
    const updated = { ...current, ...partial };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    // Svuota cache per rigenerare con la nuova voce/velocità
    this.audioBlobCache.clear();
  }

  public subscribe(callback: VoiceStateCallback) {
    this.onStateChangeListeners.push(callback);
    return () => {
      this.onStateChangeListeners = this.onStateChangeListeners.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    this.onStateChangeListeners.forEach((cb) =>
      cb(this.isSpeaking, this.currentSpeakingId, this.isLoading, this.currentLoadingId)
    );
  }

  public sanitizeText(text: string): string {
    return text
      // Elimina blocchi completi tra parentesi quadre: [Tiro Richiesto: ...], [Iniziativa: ...], [[...]], ecc.
      .replace(/\[\[.*?\]\]/gs, '')
      .replace(/\[.*?\]/gs, '')
      // Rimuovi tag markdown grassetto, corsivo, codice
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/`{1,3}.*?`{1,3}/g, '')
      .replace(/^#+\s+/gm, '')
      .replace(/>\s*/gm, '')
      .replace(/^\s*[-*•]\s+/gm, '')
      // Rimuovi emoji e simboli tecnici non pronunciabili
      .replace(/[🎲⚡🛡️🗡️⚔️💥🩸💀✨🎁]/g, '')
      // Normalizza spazi e newline multipli
      .replace(/\s+/g, ' ')
      .trim();
  }

  public stop() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {
        // ignore
      }
      this.currentAudio = null;
    }
    this.isSpeaking = false;
    this.currentSpeakingId = null;
    this.isLoading = false;
    this.currentLoadingId = null;
    this.notify();
  }

  /**
   * Pre-carica l'audio in background non appena il Narratore produce il testo.
   * Quando il giocatore clicca "voce", l'audio è già pronto e parte istantaneamente.
   */
  public async prefetch(text: string): Promise<void> {
    const cleanText = this.sanitizeText(text);
    if (!cleanText) return;

    const settings = this.getSettings();
    const cacheKey = `${cleanText}___${settings.voice}___${settings.rate}`;
    if (this.audioBlobCache.has(cacheKey) || this.prefetchInFlight.has(cacheKey)) {
      return;
    }

    this.prefetchInFlight.add(cacheKey);
    try {
      const res = await fetch(
        `/api/tts?text=${encodeURIComponent(cleanText)}&voice=${encodeURIComponent(settings.voice)}&rate=${encodeURIComponent(settings.rate)}`
      );
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 200) {
          const objectUrl = URL.createObjectURL(blob);
          this.audioBlobCache.set(cacheKey, objectUrl);
        }
      }
    } catch {
      // Ignora errori di prefetch silenzioso
    } finally {
      this.prefetchInFlight.delete(cacheKey);
    }
  }

  /**
   * Riproduce il testo del narratore con la Voce Neurale HD selezionata.
   */
  public async speak(messageId: string, text: string): Promise<void> {
    // Se sta già parlando o caricando per questo messaggio, ferma (toggle)
    if (
      (this.isSpeaking && this.currentSpeakingId === messageId) ||
      (this.isLoading && this.currentLoadingId === messageId)
    ) {
      this.stop();
      return;
    }

    this.stop();

    const cleanText = this.sanitizeText(text);
    if (!cleanText) return;

    const settings = this.getSettings();
    const cacheKey = `${cleanText}___${settings.voice}___${settings.rate}`;

    // 1. Se l'audio è già pronto in cache (da prefetch), avvia subito a zero latenza
    if (this.audioBlobCache.has(cacheKey)) {
      const cachedUrl = this.audioBlobCache.get(cacheKey)!;
      this.playAudioUrl(cachedUrl, messageId);
      return;
    }

    // 2. Altrimenti entra in stato di caricamento pulito
    this.isLoading = true;
    this.currentLoadingId = messageId;
    this.notify();

    try {
      const res = await fetch(
        `/api/tts?text=${encodeURIComponent(cleanText)}&voice=${encodeURIComponent(settings.voice)}&rate=${encodeURIComponent(settings.rate)}`
      );
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const blob = await res.blob();
      if (blob.size < 200) {
        throw new Error('Payload audio non valido');
      }

      const objectUrl = URL.createObjectURL(blob);
      this.audioBlobCache.set(cacheKey, objectUrl);

      // Se nel frattempo l'utente non ha annullato la richiesta
      if (this.currentLoadingId === messageId) {
        this.isLoading = false;
        this.currentLoadingId = null;
        this.playAudioUrl(objectUrl, messageId);
      }
    } catch (err) {
      console.warn('Errore recupero Voce Neurale HD:', err);
      if (this.currentLoadingId === messageId) {
        this.isLoading = false;
        this.currentLoadingId = null;
        this.notify();
      }
    }
  }

  private playAudioUrl(url: string, messageId: string) {
    const audio = new Audio(url);
    this.currentAudio = audio;
    this.isSpeaking = true;
    this.currentSpeakingId = messageId;
    this.notify();

    audio.onended = () => {
      if (this.currentSpeakingId === messageId) {
        this.isSpeaking = false;
        this.currentSpeakingId = null;
        this.notify();
      }
    };

    audio.onerror = (e) => {
      console.warn('Errore riproduzione audio:', e);
      if (this.currentSpeakingId === messageId) {
        this.isSpeaking = false;
        this.currentSpeakingId = null;
        this.notify();
      }
    };

    audio.play().catch((err) => {
      console.warn('Play audio impedito dal browser (interazione richiesta):', err);
      if (this.currentSpeakingId === messageId) {
        this.isSpeaking = false;
        this.currentSpeakingId = null;
        this.notify();
      }
    });
  }
}

export const narratorVoice = new VoiceNarrator();
