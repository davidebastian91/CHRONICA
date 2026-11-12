// Sistema di Haptic Feedback e Sound Effects procedurali per il lancio dei Dadi d10 (Web Audio API nativa)

class DiceSensorySystem {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx && AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Vibrazione Haptic sul dispositivo mobile (se supportata dal browser)
   */
  public triggerHaptic(type: 'shake' | 'bounce' | 'settle' | 'success' | 'ten_again' | 'botch') {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;

    try {
      switch (type) {
        case 'shake':
          // Micro-vibrazione durante l'agitazione del bussolotto
          navigator.vibrate([25, 30, 25]);
          break;
        case 'bounce':
          // Rimbalzo del singolo dado sul tavolo
          navigator.vibrate(18);
          break;
        case 'settle':
          // Dado fermo
          navigator.vibrate(35);
          break;
        case 'success':
          // Successi ottenuti (8 o 9) - vibrazione solida e decisa
          navigator.vibrate([45, 30, 60]);
          break;
        case 'ten_again':
          // 10-Again esplosivo! Doppio impulso energico di trionfo
          navigator.vibrate([70, 40, 110, 40, 150]);
          break;
        case 'botch':
          // Fallimento Drammatico (Botch) - impulso lungo, basso e cupo
          navigator.vibrate([180]);
          break;
      }
    } catch {
      // Ignora silenziosamente se i permessi vibrazione sono bloccati
    }
  }

  /**
   * Genera il suono realistico di scuotimento nel bussolotto di cuoio
   */
  public playCupShakeSound() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Rumore bianco filtrato (rumore sordo del cuoio)
      const bufferSize = ctx.sampleRate * 0.25;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(320, now);
      filter.Q.setValueAtTime(3.0, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 0.25);
    } catch {}
  }

  /**
   * Genera il suono realistico di rimbalzo del dado d10 su legno o panno
   */
  public playDiceBounceSound(intensity: number = 1.0) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Pitch randomico per simulare diversi impatti e forme poliedriche
      const baseFreq = 160 + Math.random() * 120;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.06);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);

      const vol = Math.min(0.25, 0.12 * intensity);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch {}
  }

  /**
   * Suono speciale di trionfo per i 10 (10-Again) o successi
   */
  public playSuccessChime(isTen: boolean = false) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Nota argentina (Fa diesis o Si)
      const freq = isTen ? 987.77 : 659.25; // B5 per il 10, E5 per 8/9
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.2);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isTen ? 0.45 : 0.25));

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + (isTen ? 0.45 : 0.25));
    } catch {}
  }
}

export const diceSensory = new DiceSensorySystem();

