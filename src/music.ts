export type MusicCue =
  | "camp"
  | "woodland"
  | "frontier"
  | "haunted"
  | "mine"
  | "ember"
  | "cathedral"
  | "blight"
  | "boss"
  | "recovery"
  | "victory"
  | "defeat";
export type MusicVoice = "lead" | "pad" | "bass" | "pulse";
export interface MusicScore {
  title: string;
  tempo: number;
  melody: readonly number[];
  roots: readonly number[];
  major?: boolean;
}
/** Original melodies, harmony and rhythms, authored for this game. 0 is a rest. */
export const MUSIC_SCORES: Record<MusicCue, MusicScore> = {
  camp: {
    title: "Lanterns at Rest",
    tempo: 66,
    major: true,
    melody: [72, 0, 67, 69, 0, 67, 64, 0, 65, 0, 69, 67, 64, 62, 60, 0],
    roots: [48, 53, 45, 55],
  },
  woodland: {
    title: "Under Green Boughs",
    tempo: 80,
    major: true,
    melody: [67, 71, 74, 0, 72, 71, 69, 67, 64, 0, 67, 69, 71, 69, 67, 0],
    roots: [43, 48, 52, 50],
  },
  frontier: {
    title: "Dust on the Road",
    tempo: 88,
    melody: [69, 0, 72, 76, 74, 72, 69, 0, 67, 69, 0, 72, 71, 67, 64, 0],
    roots: [45, 41, 48, 43],
  },
  haunted: {
    title: "Beyond the Lantern",
    tempo: 64,
    melody: [74, 0, 77, 76, 0, 74, 72, 0, 69, 0, 70, 69, 65, 0, 62, 0],
    roots: [38, 46, 43, 45],
  },
  mine: {
    title: "Timber and Iron",
    tempo: 74,
    melody: [64, 0, 67, 66, 64, 0, 62, 59, 60, 0, 64, 67, 66, 62, 59, 0],
    roots: [40, 36, 45, 38],
  },
  ember: {
    title: "Beneath the Ember",
    tempo: 92,
    melody: [67, 70, 0, 74, 73, 70, 67, 0, 65, 0, 66, 67, 70, 69, 65, 0],
    roots: [43, 39, 46, 41],
  },
  cathedral: {
    title: "Stone and Vows",
    tempo: 78,
    melody: [65, 0, 69, 72, 74, 72, 69, 0, 67, 0, 65, 64, 62, 64, 65, 0],
    roots: [41, 46, 38, 45],
  },
  blight: {
    title: "The Last Beacon",
    tempo: 68,
    melody: [71, 0, 74, 0, 76, 74, 71, 69, 67, 0, 69, 71, 66, 0, 64, 0],
    roots: [40, 48, 45, 47],
  },
  boss: {
    title: "Stand Your Ground",
    tempo: 120,
    melody: [69, 69, 72, 76, 0, 74, 72, 71, 69, 0, 67, 69, 72, 71, 67, 64],
    roots: [33, 41, 36, 40],
  },
  recovery: {
    title: "A Small Fire",
    tempo: 60,
    major: true,
    melody: [69, 0, 64, 0, 66, 0, 69, 0, 71, 0, 73, 71, 69, 0, 64, 0],
    roots: [45, 50, 54, 52],
  },
  victory: {
    title: "The Road Remembers",
    tempo: 96,
    major: true,
    melody: [72, 76, 79, 0, 81, 79, 76, 72, 74, 77, 79, 77, 76, 74, 72, 0],
    roots: [48, 53, 55, 48],
  },
  defeat: {
    title: "Until Another Dawn",
    tempo: 54,
    melody: [69, 0, 0, 67, 64, 0, 65, 0, 62, 0, 64, 0, 60, 0, 57, 0],
    roots: [45, 41, 38, 40],
  },
};
export interface MusicState {
  zone?: string;
  boss?: boolean;
  checkpoint?: boolean;
  ended?: boolean;
  victory?: boolean;
  paused?: boolean;
  focused: boolean;
  health?: number;
  maxHealth?: number;
}
export function musicScene(state: MusicState) {
  let cue: MusicCue = "camp";
  if (state.zone) {
    cue = state.ended
      ? state.victory
        ? "victory"
        : "defeat"
      : state.checkpoint
        ? "recovery"
        : state.boss
          ? "boss"
          : state.zone === "scarlet"
            ? "cathedral"
            : state.zone === "plaguelands"
              ? "blight"
              : state.zone === "elwynn"
                ? "woodland"
                : state.zone === "westfall"
                  ? "frontier"
                  : state.zone === "deadmines"
                    ? "mine"
                    : state.zone === "ragefire"
                      ? "ember"
                      : "haunted";
  }
  return {
    cue,
    playing:
      state.focused && (!state.paused || !!state.ended || !!state.checkpoint),
    tension:
      !!state.zone &&
      !state.ended &&
      !state.checkpoint &&
      Number.isFinite(state.health) &&
      (state.maxHealth || 0) > 0 &&
      state.health! / state.maxHealth! < 0.25,
  };
}
export interface MusicNote {
  voice: MusicVoice;
  midi: number;
  at: number;
  duration: number;
  gain: number;
}
export const midiFrequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
export function musicStep(
  cue: MusicCue,
  step: number,
  at: number,
  tension = false,
): MusicNote[] {
  const score = MUSIC_SCORES[cue],
    index = ((step % 32) + 32) % 32;
  const duration = 30 / score.tempo,
    root = score.roots[Math.floor(index / 8)];
  const notes: MusicNote[] = [];
  const note = (
    voice: MusicVoice,
    midi: number,
    length: number,
    gain: number,
  ) => notes.push({ voice, midi, at, duration: duration * length, gain });
  const melody = score.melody[index % score.melody.length];
  if (melody) note("lead", melody, 0.9, cue === "boss" ? 0.025 : 0.02);
  if (index % 8 === 0)
    for (const interval of [0, score.major ? 4 : 3, 7])
      note("pad", root + 12 + interval, 7.5, 0.009);
  if (index % 4 === 0) note("bass", root, 1.6, 0.035);
  if (tension && index % 2 === 0) note("pulse", 33, 0.4, 0.026);
  return notes;
}

/** Audio-clock transport with a bounded lookahead and resumable future steps. */
export class MusicTransport {
  cue: MusicCue = "camp";
  step = 0;
  playing = false;
  private nextAt = 0;
  private heldDelay = 0.025;
  private scheduled: { step: number; at: number }[] = [];

  update(now: number, cue: MusicCue, playing: boolean, tension = false) {
    if (!Number.isFinite(now) || now < 0) return [];
    if (cue !== this.cue) {
      this.cue = cue;
      this.step = 0;
      this.playing = false;
      this.scheduled = [];
      this.heldDelay = 0.025;
    }
    this.scheduled = this.scheduled.filter((s) => s.at >= now);
    if (!playing) {
      if (this.playing) {
        const future = this.scheduled[0];
        if (future) {
          this.step = future.step;
          this.heldDelay = future.at - now;
        } else this.heldDelay = Math.max(0.005, this.nextAt - now);
        this.scheduled = [];
      }
      this.playing = false;
      return [];
    }
    if (!this.playing) {
      this.nextAt = now + Math.max(0.005, this.heldDelay);
      this.playing = true;
    }
    const duration = 30 / MUSIC_SCORES[cue].tempo;
    if (this.nextAt < now - 0.025) {
      const skipped = Math.ceil((now - this.nextAt) / duration);
      this.step += skipped;
      this.nextAt += skipped * duration;
    }
    const notes: MusicNote[] = [];
    for (let count = 0; count < 4 && this.nextAt < now + 0.16; count++) {
      const at = Math.max(now + 0.005, this.nextAt);
      notes.push(...musicStep(cue, this.step, at, tension));
      this.scheduled.push({ step: this.step++, at });
      this.nextAt += duration;
    }
    return notes;
  }
}
