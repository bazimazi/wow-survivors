export const HORDE_FIRST = 20;
export const HORDE_INTERVAL = 35;
export const HORDE_WARNING = 4;
const DIRECTIONS = ["EAST", "SOUTH", "WEST", "NORTH"] as const;
const CHAPTERS = [
  "THE FIRST HUNT",
  "THE HORDE GATHERS",
  "NO SAFE GROUND",
  "INTO THE STORM",
  "THE LAST STAND",
];

/** Deterministic pacing depends only on the simulation clock, including after pause. */
export function encounterBeat(time: number, duration: number) {
  const t = Math.max(0, time);
  const wave = Math.max(0, Math.floor((t - HORDE_FIRST) / HORDE_INTERVAL) + 1);
  const nextAt = HORDE_FIRST + wave * HORDE_INTERVAL;
  const remaining = Math.max(0, nextAt - t);
  const chapter = Math.min(CHAPTERS.length - 1, Math.floor(t / 60));
  const active = nextAt < duration;
  // After a horde, leave a few seconds to collect gems and reposition.
  const since = wave
    ? t - (HORDE_FIRST + (wave - 1) * HORDE_INTERVAL)
    : Infinity;
  return {
    wave,
    nextAt,
    remaining,
    chapter,
    title: CHAPTERS[chapter],
    direction: DIRECTIONS[wave % 4],
    angle: ((wave % 4) * Math.PI) / 2,
    warning: active && remaining <= HORDE_WARNING,
    active,
    pressure: since < 7 ? 0.4 : remaining < 12 ? 1.2 : 0.85,
    count: Math.min(30, 8 + wave * 3),
    progress: Math.min(1, t / duration),
  };
}
