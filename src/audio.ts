import type { ClassId } from "./content";
const CLASS_VOICES: Record<ClassId, [number, OscillatorType, number]> = {
  warrior: [110, "sawtooth", 65],
  mage: [740, "sine", 1150],
  rogue: [240, "triangle", 90],
  hunter: [330, "triangle", 170],
  paladin: [660, "sine", 880],
  priest: [880, "sine", 1320],
  shaman: [170, "sawtooth", 530],
  warlock: [95, "sawtooth", 190],
  druid: [440, "triangle", 660],
};
export class Sound {
  enabled = true;
  private context: AudioContext | null = null;
  private lastCast = 0;
  unlock() {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === "suspended")
        void this.context.resume().catch(() => {});
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
  cast(classId?: ClassId) {
    const now = performance.now();
    if (now - this.lastCast < 220) return;
    this.lastCast = now;
    const [pitch, voice, end] = classId
      ? CLASS_VOICES[classId]
      : ([420, "sine", 180] as const);
    this.tone(pitch, 0.075, voice, 0.012, end);
  }
  hit() {
    this.tone(80, 0.12, "triangle", 0.055, 35);
  }
  click() {
    this.tone(600, 0.065, "sine", 0.025, 450);
  }
  active(classId?: ClassId) {
    const [pitch, voice, end] = classId
      ? CLASS_VOICES[classId]
      : ([180, "triangle", 680] as const);
    this.tone(pitch, 0.3, voice, 0.03, end);
    if (classId === "paladin" || classId === "priest")
      this.tone(pitch * 1.5, 0.4, "sine", 0.012, end * 1.5);
  }
  levelup() {
    this.tone(520, 0.25, "sine", 0.04, 1040);
  }
  reward() {
    this.tone(660, 0.25, "sine", 0.04, 1320);
  }
}
