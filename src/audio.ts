import type { ClassId } from "./content";
import type { CombatAction, ImpactAction, Vec } from "./engine";
import { SPELLS } from "./content";
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
  private lastImpact = 0;
  private noiseBuffer: AudioBuffer | null = null;
  private walking = new WeakMap<
    object,
    { x: number; y: number; distance: number }
  >();
  private lastStep = 0;
  walk(actor: object & Vec, enabled: boolean, stone: boolean) {
    const old = this.walking.get(actor),
      travel = old ? Math.hypot(actor.x - old.x, actor.y - old.y) : 0;
    const next = { x: actor.x, y: actor.y, distance: old?.distance || 0 };
    if (!enabled || travel > 80) next.distance = 0;
    else next.distance += travel;
    this.walking.set(actor, next);
    if (next.distance < 24 || !enabled) return;
    next.distance %= 24;
    const now = performance.now();
    if (now - this.lastStep < 115) return;
    this.lastStep = now;
    this.noise(0.055, stone ? 1500 : 900, 0.009);
    this.tone(stone ? 160 : 110, 0.04, "triangle", 0.008, 55);
  }
  private noise(duration: number, frequency: number, volume: number) {
    if (!this.enabled || !this.context) return;
    const ctx = this.context;
    if (!this.noiseBuffer) {
      this.noiseBuffer = ctx.createBuffer(
        1,
        ctx.sampleRate * 0.5,
        ctx.sampleRate,
      );
      const samples = this.noiseBuffer.getChannelData(0);
      let seed = 731;
      for (let i = 0; i < samples.length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
        samples[i] = ((seed >>> 0) / 4294967295) * 2 - 1;
      }
    }
    const source = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter(),
      gain = ctx.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 0.7;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    source.stop(ctx.currentTime + duration);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }
  spell(action: CombatAction) {
    if (!this.enabled || !this.context || !action.spellId) return;
    if (action.battleArt) {
      this.active(action.battleArt);
      this.noise(
        0.24,
        ["warrior", "rogue", "hunter"].includes(action.battleArt) ? 1500 : 700,
        0.045,
      );
      this.tone(105, 0.18, "triangle", 0.038, 38);
      return;
    }
    const now = performance.now();
    if (now - this.lastCast < 150) return;
    this.lastCast = now;
    const icon = SPELLS[action.spellId]?.icon,
      evolved = (action.spellRank || 1) >= 5;
    const depth = evolved ? 0.85 : 1;
    if (icon === "snow") {
      this.noise(0.16, 2100, 0.018);
      this.tone(920 * depth, 0.16, "sine", 0.012, 560);
    } else if (icon === "flame" || icon === "fire" || icon === "totem") {
      this.noise(0.2, 650, 0.029);
      this.tone(130 * depth, 0.14, "triangle", 0.019, 55);
    } else if (icon === "lightning") {
      this.noise(0.09, 2500, 0.036);
      this.tone(230, 0.11, "sawtooth", 0.012, 65);
    } else if (["sun", "shield", "heart"].includes(icon || "")) {
      this.tone(660 * depth, 0.2, "sine", 0.012, 880);
      this.tone(990 * depth, 0.24, "sine", 0.006, 1320);
    } else if (icon === "skull") {
      this.noise(0.16, 270, 0.02);
      this.tone(115 * depth, 0.2, "triangle", 0.018, 60);
    } else if (icon === "sword" || icon === "dagger" || icon === "paw") {
      this.noise(0.085, 1500, 0.025);
      this.tone(350, 0.08, "triangle", 0.01, 130);
    } else if (icon === "bow") this.noise(0.105, 1100, 0.022);
    else {
      this.noise(0.16, 800, 0.013);
      this.tone(460 * depth, 0.15, "sine", 0.012, 720);
    }
  }
  impact(action: ImpactAction) {
    if (!this.enabled || !this.context) return;
    const now = performance.now();
    if (now - this.lastImpact < 120) return;
    this.lastImpact = now;
    this.noise(
      action.critical ? 0.12 : 0.055,
      action.critical ? 1700 : 850,
      action.critical ? 0.021 : 0.008,
    );
    if (action.critical) this.tone(190, 0.12, "triangle", 0.016, 55);
  }
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
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
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
