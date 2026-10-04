export class Sound {
  enabled = true;
  private context: AudioContext | null = null;
  private lastCast = 0;
  unlock() {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === "suspended") void this.context.resume();
    } catch {
      /* Audio is optional. */
    }
  }
  tone(
    freq: number,
    duration = 0.08,
    type: OscillatorType = "sine",
    volume = 0.035,
    endFreq = freq,
  ) {
    if (!this.enabled || !this.context) return;
    const ctx = this.context,
      oscillator = ctx.createOscillator(),
      gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, endFreq),
      ctx.currentTime + duration,
    );
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  }
  cast() {
    const now = performance.now();
    if (now - this.lastCast < 220) return;
    this.lastCast = now;
    this.tone(420, 0.055, "sine", 0.012, 180);
  }
  hit() {
    this.tone(80, 0.12, "triangle", 0.055, 35);
  }
  click() {
    this.tone(600, 0.065, "sine", 0.025, 450);
  }
  active() {
    this.tone(180, 0.3, "triangle", 0.04, 680);
  }
  levelup() {
    this.tone(520, 0.25, "sine", 0.04, 1040);
  }
  reward() {
    this.tone(660, 0.25, "sine", 0.04, 1320);
  }
}
