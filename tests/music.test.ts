import test from "node:test";
import assert from "node:assert/strict";
import {
  MUSIC_SCORES,
  MusicTransport,
  midiFrequency,
  musicScene,
  musicStep,
} from "../src/music";
import type { MusicCue } from "../src/music";
import { MusicPlayer, MAX_MUSIC_VOICES } from "../src/music-player";
import { freshSave, validateSave } from "../src/progression";

test("twelve original scores form bounded, deterministic, finite four-bar arrangements", () => {
  assert.equal(Object.keys(MUSIC_SCORES).length, 12);
  assert.equal(
    new Set(Object.values(MUSIC_SCORES).map((s) => JSON.stringify(s.melody)))
      .size,
    12,
  );
  const before = JSON.stringify(MUSIC_SCORES);
  for (const cue of Object.keys(MUSIC_SCORES) as MusicCue[]) {
    assert.equal(MUSIC_SCORES[cue].roots.length, 4);
    for (let step = 0; step < 96; step++) {
      const notes = musicStep(cue, step, 20, true);
      assert.ok(notes.length <= 6);
      for (const note of notes) {
        assert.ok(note.midi >= 24 && note.midi <= 90);
        assert.ok(Number.isFinite(midiFrequency(note.midi)));
        assert.ok(note.duration > 0 && note.duration < 5);
        assert.ok(note.gain > 0 && note.gain <= 0.04);
        assert.equal(note.at, 20);
      }
      assert.deepEqual(notes, musicStep(cue, step % 32, 20, true));
    }
  }
  assert.equal(JSON.stringify(MUSIC_SCORES), before);
});
test("scene selection covers all destinations, guardians, recovery and paused returns", () => {
  const destinations = {
    elwynn: "woodland",
    westfall: "frontier",
    tirisfal: "haunted",
    duskwood: "haunted",
    deadmines: "mine",
    ragefire: "ember",
    shadowfang: "haunted",
    scarlet: "cathedral",
    plaguelands: "blight",
  };
  assert.equal(musicScene({ focused: true }).cue, "camp");
  for (const [zone, cue] of Object.entries(destinations)) {
    assert.equal(musicScene({ zone, focused: true }).cue, cue);
    assert.equal(musicScene({ zone, boss: true, focused: true }).cue, "boss");
    assert.equal(
      musicScene({ zone, checkpoint: true, boss: true, focused: true }).cue,
      "recovery",
    );
    assert.equal(
      musicScene({
        zone,
        ended: true,
        victory: true,
        paused: true,
        focused: true,
      }).cue,
      "victory",
    );
    assert.equal(
      musicScene({ zone, ended: true, paused: true, focused: true }).cue,
      "defeat",
    );
    assert.equal(
      musicScene({ zone, ended: true, paused: true, focused: true }).playing,
      true,
    );
  }
});
test("paused/focus-lost scenes stop playback and danger pulse respects actual health", () => {
  assert.equal(
    musicScene({ zone: "elwynn", focused: true, paused: true }).playing,
    false,
  );
  assert.equal(musicScene({ focused: false }).playing, false);
  for (const health of [25, 100, NaN, Infinity])
    assert.equal(
      musicScene({ zone: "elwynn", health, maxHealth: 100, focused: true })
        .tension,
      false,
    );
  assert.equal(
    musicScene({ zone: "elwynn", health: 24, maxHealth: 100, focused: true })
      .tension,
    true,
  );
  assert.equal(
    musicScene({
      zone: "elwynn",
      health: 0,
      maxHealth: 100,
      ended: true,
      focused: true,
    }).tension,
    false,
  );
  assert.equal(
    musicStep("boss", 0, 0).some((n) => n.voice === "pulse"),
    false,
  );
  assert.equal(
    musicStep("boss", 0, 0, true).filter((n) => n.voice === "pulse").length,
    1,
  );
});
test("pause rewinds unplayed lookahead and resumes the same musical step after any delay", () => {
  const t = new MusicTransport();
  const first = t.update(0, "woodland", true);
  assert.ok(first.length > 0);
  assert.equal(t.step, 1);
  t.update(0.01, "woodland", false);
  assert.equal(t.step, 0);
  assert.deepEqual(t.update(100, "woodland", false), []);
  const resumed = t.update(101, "woodland", true);
  assert.deepEqual(
    resumed.map((n) => [n.voice, n.midi]),
    first.map((n) => [n.voice, n.midi]),
  );
  assert.ok(resumed.every((n) => Math.abs(n.at - 101.015) < 1e-8));
});
test("late frames skip expired beats and repeated updates do not schedule catch-up bursts", () => {
  const t = new MusicTransport();
  t.update(0, "boss", true);
  const notes = t.update(100, "boss", true, true);
  assert.ok(notes.length <= 6);
  assert.ok(notes.every((n) => n.at >= 100 && n.at <= 100.16));
  assert.deepEqual(t.update(100, "boss", true), []);
  assert.deepEqual(t.update(NaN, "boss", true), []);
  assert.deepEqual(t.update(-1, "boss", true), []);
});
test("changing a scene resets its score while frozen updates cannot advance it", () => {
  const t = new MusicTransport();
  t.update(0, "camp", true);
  t.update(10, "camp", true);
  t.update(10.01, "boss", false);
  assert.equal(t.step, 0);
  assert.equal(t.cue, "boss");
  for (let now = 11; now < 20; now++) t.update(now, "boss", false);
  assert.equal(t.step, 0);
  assert.deepEqual(
    t.update(20, "boss", true).map((n) => n.midi),
    musicStep("boss", 0, 0).map((n) => n.midi),
  );
});
test("old and malformed saves keep music opt-in and clamp volume without altering effect settings", () => {
  const old = freshSave() as any;
  delete old.settings.music;
  delete old.settings.musicVolume;
  old.settings.sound = false;
  assert.equal(validateSave(old).settings.music, false);
  assert.equal(validateSave(old).settings.musicVolume, 50);
  assert.equal(validateSave(old).settings.sound, false);
  for (const [input, expected] of [
    [-2, 0],
    [999, 100],
    [37.8, 37],
    ["80", 50],
    [NaN, 50],
    [Infinity, 50],
  ] as const) {
    old.settings.music = "true";
    old.settings.musicVolume = input;
    const migrated = validateSave(old);
    assert.equal(migrated.settings.music, false);
    assert.equal(migrated.settings.musicVolume, expected);
  }
  old.settings.music = true;
  old.settings.musicVolume = 75;
  assert.deepEqual(validateSave(JSON.parse(JSON.stringify(old))).settings, {
    sound: false,
    particles: true,
    screenShake: true,
    animation: true,
    music: true,
    musicVolume: 75,
    largeText: false,
    highContrast: false,
  });
});

function fakeContext() {
  const nodes: any[] = [];
  const param = () => ({
    value: 0,
    events: [] as any[],
    cancelScheduledValues(at: number) {
      this.events.push(["cancel", at]);
    },
    setValueAtTime(value: number, at: number) {
      this.value = value;
      this.events.push(["set", value, at]);
    },
    linearRampToValueAtTime(value: number, at: number) {
      this.events.push(["ramp", value, at]);
    },
    exponentialRampToValueAtTime(value: number, at: number) {
      this.events.push(["exponential", value, at]);
    },
    setTargetAtTime(value: number, at: number) {
      this.events.push(["target", value, at]);
    },
  });
  const node = () => {
    const n: any = {
      gain: param(),
      frequency: param(),
      Q: param(),
      connect() {},
      disconnect() {},
      starts: [] as number[],
      stops: [] as number[],
      start(at: number) {
        this.starts.push(at);
      },
      stop(at: number) {
        this.stops.push(at);
      },
      onended: null,
    };
    nodes.push(n);
    return n;
  };
  const context: any = {
    currentTime: 0,
    state: "running",
    destination: {},
    createGain: node,
    createBiquadFilter: node,
    createOscillator: node,
    async resume() {
      this.state = "running";
    },
  };
  return { context, nodes };
}
test("audio remains lazy when disabled and context/resume failures stay outside gameplay", async () => {
  let created = 0;
  const p = new MusicPlayer(() => {
    created++;
    throw Error("Unavailable");
  });
  p.unlock();
  p.update("camp", true);
  assert.equal(created, 0);
  p.configure(true, 50);
  p.unlock();
  assert.equal(created, 1);
  assert.match(p.status(), /unavailable/);
  const { context } = fakeContext();
  context.state = "suspended";
  context.resume = () => Promise.reject(Error("Autoplay blocked"));
  const blocked = new MusicPlayer(() => context);
  blocked.configure(true, 50);
  blocked.unlock();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.match(blocked.status(), /Click or press a key/);
});
test("cue transitions fade in the new bus and rapid changes bound voices and buses", () => {
  const { context, nodes } = fakeContext(),
    p = new MusicPlayer(() => context);
  p.configure(true, 75);
  p.unlock();
  p.update("camp", true);
  assert.match(p.status(), /Now playing: Lanterns/);
  for (let i = 1; i < 100; i++) {
    context.currentTime = i * 0.01;
    p.update(i % 2 ? "boss" : "haunted", true, true);
    const bus = (p as any).bus;
    assert.ok(
      bus.gain.events.some(
        (event: any[]) => event[0] === "ramp" && event[1] === 1,
      ),
    );
    assert.ok((p as any).voices.size <= MAX_MUSIC_VOICES);
    assert.ok((p as any).buses.size <= 2);
  }
  assert.ok(nodes.some((n) => n.starts.length));
  context.currentTime = 1;
  p.hold();
  // A paused crossfade must release both the new score and its retiring layers.
  for (const bus of (p as any).buses)
    assert.deepEqual(bus.gain.events.at(-1), ["ramp", 0, 1.06]);
});
test("muting stops scheduled sources and resuming keeps one graph with the selected volume", () => {
  const { context, nodes } = fakeContext(),
    p = new MusicPlayer(() => context);
  p.configure(true, 50);
  p.unlock();
  p.update("camp", true);
  const master = (p as any).master;
  context.currentTime = 0.01;
  p.configure(true, 0);
  assert.match(p.status(), /muted/);
  const sources = nodes.filter((n) => n.starts.length);
  assert.ok(sources.every((n) => n.stops.at(-1) <= 0.071));
  p.configure(true, 100);
  p.update("camp", true);
  assert.equal((p as any).master, master);
  assert.ok(
    master.gain.events.some((e: any[]) => e[0] === "target" && e[1] === 1),
  );
});
