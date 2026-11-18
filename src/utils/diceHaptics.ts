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

  /**
   * Suono ticchettio crittografico/cifrario
   */
  public playCipherTick() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800 + Math.random() * 600, now);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
    } catch {}
  }

  /**
   * Suono di sblocco/decifrazione completata (mistero risolto o serratura segreta)
   */
  public playDecryptSuccess() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio rapido
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.06, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.25);
      });
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 30, 80]);
      }
    } catch {}
  }

  /**
   * Suono scatto a vuoto (Dry-fire: cane che batte a vuoto su camera/tamburo scarico)
   */
  public playDryFireClick() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      // Due scatti metallici ravvicinati ("CLICK-CLICK")
      [0, 0.08].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now + offset);
        osc.frequency.exponentialRampToValueAtTime(80, now + offset + 0.04);
        gain.gain.setValueAtTime(0.08, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.04);
      });
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([20, 30, 20]);
      }
    } catch {}
  }

  /**
   * Suono meccanico di ricarica arma (rotazione tamburo / inserimento caricatore o nastro)
   */
  public playReloadMechanicalSound() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      // 1. Scatto di sgancio / espulsione bossoli (0s)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(450, now);
      osc1.frequency.exponentialRampToValueAtTime(180, now + 0.07);
      gain1.gain.setValueAtTime(0.06, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.07);

      // 2. Inserimento colpi / caricatore (0.12s)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(600, now + 0.12);
      osc2.frequency.exponentialRampToValueAtTime(300, now + 0.18);
      gain2.gain.setValueAtTime(0.09, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.18);

      // 3. Chiusura tamburo / armamento otturatore (0.24s)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'square';
      osc3.frequency.setValueAtTime(220, now + 0.24);
      osc3.frequency.exponentialRampToValueAtTime(110, now + 0.32);
      gain3.gain.setValueAtTime(0.12, now + 0.24);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.24);
      osc3.stop(now + 0.32);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([30, 40, 60]);
      }
    } catch {}
  }
}

export const diceSensory = new DiceSensorySystem();

