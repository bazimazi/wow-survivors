import { MusicTransport, MUSIC_SCORES, midiFrequency } from "./music";
import type { MusicCue, MusicNote } from "./music";

export const MAX_MUSIC_VOICES = 32;
interface Voice {
  oscillator: OscillatorNode;
  gain: GainNode;
  bus: GainNode;
  end: number;
}

/** Instruments also accept OfflineAudioContext for audible rendering checks. */
export function scheduleMusicNote(
  context: BaseAudioContext,
  output: AudioNode,
  note: MusicNote,
) {
  const oscillator = context.createOscillator(),
    gain = context.createGain();
  oscillator.type = note.voice === "pad" ? "triangle" : "sine";
  oscillator.frequency.setValueAtTime(midiFrequency(note.midi), note.at);
  const attack = note.voice === "pad" ? 0.18 : 0.012;
  const release = note.voice === "pad" ? 0.24 : 0.08;
  const end = note.at + Math.max(note.duration, attack + 0.01) + release;
  gain.gain.setValueAtTime(0, note.at);
  gain.gain.linearRampToValueAtTime(note.gain, note.at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(gain);
  gain.connect(output);
  oscillator.start(note.at);
  oscillator.stop(end);
  return { oscillator, gain, end };
}

export class MusicPlayer {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private bus: GainNode | null = null;
  private buses = new Set<GainNode>();
  private voices = new Set<Voice>();
  private transport = new MusicTransport();
  private enabled = false;
  private volume = 50;
  private unavailable = false;
  private awaitingGesture = true;
  private resuming = false;
  private paused = true;
  private cue: MusicCue = "camp";
  private tension = false;

  constructor(private createContext = () => new AudioContext()) {}

  configure(enabled: boolean, volume: number) {
    this.enabled = enabled;
    this.volume = Number.isFinite(volume)
      ? Math.max(0, Math.min(100, volume))
      : 50;
    if (this.master && this.context) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(
        this.volume / 100,
        this.context.currentTime,
        0.04,
      );
    }
    if (!enabled || !this.volume) this.hold();
  }

  /** Call from a real user input handler; resume rejection never escapes to gameplay. */
  unlock() {
    if (!this.enabled || !this.volume || this.resuming) return;
    try {
      if (!this.context || this.context.state === "closed") {
        this.context = this.createContext();
        this.master = this.context.createGain();
        this.master.gain.value = this.volume / 100;
        this.filter = this.context.createBiquadFilter();
        this.filter.type = "lowpass";
        this.filter.frequency.value = 2400;
        this.filter.Q.value = 0.3;
        this.filter.connect(this.master);
        this.master.connect(this.context.destination);
        this.bus = null;
        this.buses.clear();
        this.voices.clear();
        this.transport = new MusicTransport();
        this.paused = true;
      }
      this.unavailable = false;
      if (this.context.state === "running") this.awaitingGesture = false;
      else {
        this.resuming = true;
        void this.context
          .resume()
          .then(() => {
            this.resuming = false;
            this.awaitingGesture = this.context?.state !== "running";
          })
          .catch(() => {
            this.resuming = false;
            this.awaitingGesture = true;
            this.hold();
          });
      }
    } catch {
      this.unavailable = true;
      this.hold();
    }
  }

  private remove(voice: Voice) {
    if (!this.voices.delete(voice)) return;
    voice.oscillator.disconnect();
    voice.gain.disconnect();
    if (
      voice.bus !== this.bus &&
      ![...this.voices].some((v) => v.bus === voice.bus)
    ) {
      voice.bus.disconnect();
      this.buses.delete(voice.bus);
    }
  }
  private fadeVoices(bus: GainNode | null, duration: number) {
    if (!this.context) return;
    const now = this.context.currentTime;
    for (const target of bus ? [bus] : this.buses) {
      target.gain.cancelScheduledValues(now);
      target.gain.setValueAtTime(target.gain.value, now);
      target.gain.linearRampToValueAtTime(0, now + duration);
    }
    for (const voice of this.voices)
      if (!bus || voice.bus === bus) {
        voice.end = Math.min(voice.end, now + duration);
        try {
          voice.oscillator.stop(voice.end);
        } catch {
          /* Already finished. */
        }
        if (!duration) this.remove(voice);
      }
  }
  private changeBus() {
    if (!this.context || !this.filter) return;
    // At most one retiring bus and one current bus during a transition.
    for (const bus of this.buses)
      if (bus !== this.bus) {
        this.fadeVoices(bus, 0);
        bus.disconnect();
        this.buses.delete(bus);
      }
    const old = this.bus;
    this.fadeVoices(old, 0.2);
    this.bus = this.context.createGain();
    this.bus.gain.value = 0;
    this.bus.connect(this.filter);
    this.buses.add(this.bus);
    if (old && ![...this.voices].some((v) => v.bus === old)) {
      old.disconnect();
      this.buses.delete(old);
    }
  }

  update(cue: MusicCue, playing: boolean, tension = false) {
    const context = this.context;
    const active =
      this.enabled &&
      this.volume > 0 &&
      playing &&
      context?.state === "running";
    if (cue !== this.cue) {
      this.cue = cue;
      this.changeBus();
      this.paused = true;
    }
    this.tension = tension;
    const notes = this.transport.update(
      context?.currentTime || 0,
      cue,
      !!active,
      tension,
    );
    if (!active) {
      if (!this.paused) this.fadeVoices(null, 0.06);
      this.paused = true;
      return;
    }
    if (!this.bus) this.changeBus();
    if (this.paused && this.bus) {
      this.bus.gain.cancelScheduledValues(context!.currentTime);
      this.bus.gain.setValueAtTime(0, context!.currentTime);
      this.bus.gain.linearRampToValueAtTime(1, context!.currentTime + 0.25);
    }
    this.paused = false;
    for (const voice of this.voices)
      if (voice.end <= context!.currentTime) this.remove(voice);
    for (const note of notes) {
      if (this.voices.size >= MAX_MUSIC_VOICES) break;
      const voice: Voice = {
        ...scheduleMusicNote(context!, this.bus!, note),
        bus: this.bus!,
      };
      this.voices.add(voice);
      voice.oscillator.onended = () => this.remove(voice);
    }
  }
  hold() {
    this.update(this.cue, false, this.tension);
  }
  status() {
    if (!this.enabled)
      return "Music is off. Enable it to hear the original score.";
    if (!this.volume) return "Music volume is muted.";
    if (this.unavailable)
      return "Music is unavailable in this browser. Gameplay remains ready.";
    if (
      !this.context ||
      this.awaitingGesture ||
      this.context.state !== "running"
    )
      return "Music is ready. Click or press a key to allow audio playback.";
    return `${this.paused ? "Music paused" : "Now playing"}: ${MUSIC_SCORES[this.cue].title}${this.tension && !this.paused ? " · danger pulse" : ""}.`;
  }
}
