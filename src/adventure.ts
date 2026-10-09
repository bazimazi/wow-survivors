import type { Stats } from "./content";
import type { RunRecord, SaveData } from "./progression";

export const DIFFICULTIES = {
  explorer: {
    name: "Explorer",
    description: "Room to learn. 30% less incoming damage; full progression.",
    damage: 0.7,
    health: 0.85,
    spawn: 1,
    reward: 1,
  },
  adventurer: {
    name: "Adventurer",
    description:
      "The original challenge. Read the battlefield and forge a build.",
    damage: 1,
    health: 1,
    spawn: 1,
    reward: 1,
  },
  heroic: {
    name: "Heroic",
    description:
      "30% more damage, 20% tougher enemies, denser hordes. +25% gold & XP.",
    damage: 1.3,
    health: 1.2,
    spawn: 1.15,
    reward: 1.25,
  },
} as const;
export type Difficulty = keyof typeof DIFFICULTIES;
export const OATHS = [
  {
    id: "balanced",
    name: "The Unbound",
    icon: "spark",
    role: "Adapt & discover",
    description: "Your original class strengths. No trade-offs.",
    stats: {},
  },
  {
    id: "vanguard",
    name: "The Vanguard",
    icon: "shield",
    role: "Hold your ground",
    description: "+25 health, +4 armor. −5% movement speed.",
    stats: { health: 25, armor: 4, speed: -5 },
  },
  {
    id: "spellbinder",
    name: "The Spellbinder",
    icon: "rune",
    role: "Power at a price",
    description: "+12% damage, +8% haste. −20 maximum health.",
    stats: { power: 12, haste: 8, health: -20 },
  },
  {
    id: "wayfarer",
    name: "The Wayfarer",
    icon: "compass",
    role: "Explore & outmaneuver",
    description: "+12% speed, +40% pickup radius. −4 armor.",
    stats: { speed: 12, magnet: 40, armor: -4 },
  },
] satisfies {
  id: string;
  name: string;
  icon: string;
  role: string;
  description: string;
  stats: Partial<Stats>;
}[];
export const RELICS = [
  {
    id: "compass",
    name: "Wayfinder’s Compass",
    icon: "compass",
    milestone: "first_return",
    description: "+30% pickup radius. Bring the battlefield’s rewards closer.",
    stats: { magnet: 30 },
  },
  {
    id: "ember",
    name: "Ember of Resolve",
    icon: "sword",
    milestone: "hunter",
    description: "+8% damage. A small flame that refuses to go out.",
    stats: { power: 8 },
  },
  {
    id: "wind",
    name: "Windrunner’s Feather",
    icon: "boot",
    milestone: "explorer",
    description: "Dash recharges in 3 seconds instead of 4.",
    stats: {},
  },
  {
    id: "aegis",
    name: "Aegis of Dawn",
    icon: "shield",
    milestone: "first_win",
    description: "Begin each expedition with a 30-point shield for 60 seconds.",
    stats: {},
  },
] satisfies {
  id: string;
  name: string;
  icon: string;
  milestone: string;
  description: string;
  stats: Partial<Stats>;
}[];
export const KEYSTONES = [
  {
    id: "storm",
    name: "Storm Conduit",
    icon: "rune",
    color: "#8dcfff",
    tag: "CRITICAL · CHAIN",
    description:
      "Critical hits arc to up to 2 nearby enemies for 45% of the hit. Each arc has a 0.4s cooldown.",
  },
  {
    id: "blood",
    name: "Crimson Harvest",
    icon: "heart",
    color: "#f69b9b",
    tag: "KILLS · SUSTAIN",
    description:
      "Every fifth defeat restores 4 health. Keep fighting to keep living.",
  },
  {
    id: "windstep",
    name: "Tempest Step",
    icon: "boot",
    color: "#9fdfca",
    tag: "DASH · BURST",
    description:
      "Dashing unleashes a 140-radius nova for 35 damage, scaled by power. Dash recharges 1s sooner.",
  },
  {
    id: "gravity",
    name: "Gravity Well",
    icon: "whirl",
    color: "#c5adff",
    tag: "MOMENTUM · EXPERIENCE",
    description:
      "Every tenth consecutive defeat pulls all experience gems toward you. +35% pickup radius.",
  },
  {
    id: "executioner",
    name: "Last Judgment",
    icon: "sword",
    color: "#f3c77e",
    tag: "LOW HEALTH · FINISHER",
    description:
      "Deal 35% more damage to enemies below 30% health. Finish the dangerous ones first.",
  },
  {
    id: "reserve",
    name: "Second Wind",
    icon: "leaf",
    color: "#b4df91",
    tag: "DEFENSE · RECOVERY",
    description:
      "Once per expedition, a lethal hit restores 35% health and grants 2s of invulnerability.",
  },
] as const;
export type KeystoneId = (typeof KEYSTONES)[number]["id"];
export interface AdventureProgress {
  difficulty: Difficulty;
  oath: string;
  relic: string;
  claimed: string[];
  contracts: number;
  bestStreak: number;
}
export interface AdventureProof {
  difficulty: Difficulty;
  oath: string;
  relic: string;
  keystones: KeystoneId[];
  peakStreak: number;
  damageTaken: number;
  dashes: number;
  actives: number;
  contracts: string[];
}
export const freshAdventure = (): AdventureProgress => ({
  difficulty: "adventurer",
  oath: "balanced",
  relic: "",
  claimed: [],
  contracts: 0,
  bestStreak: 0,
});
const record = (raw: unknown): Record<string, unknown> =>
  raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
const count = (value: unknown, max = 1_000_000) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(0, Math.floor(value)))
    : 0;
export function normalizeAdventure(raw: unknown): AdventureProgress {
  const v = record(raw);
  return {
    difficulty:
      typeof v.difficulty === "string" &&
      Object.hasOwn(DIFFICULTIES, v.difficulty)
        ? (v.difficulty as Difficulty)
        : "adventurer",
    oath: OATHS.find((o) => o.id === v.oath)?.id || "balanced",
    relic: RELICS.find((r) => r.id === v.relic)?.id || "",
    claimed: Array.isArray(v.claimed)
      ? [
          ...new Set(
            v.claimed.filter(
              (id): id is string =>
                typeof id === "string" && MILESTONES.some((m) => m.id === id),
            ),
          ),
        ]
      : [],
    contracts: count(v.contracts),
    bestStreak: count(v.bestStreak),
  };
}
export function normalizeAdventureProof(
  raw: unknown,
): AdventureProof | undefined {
  if (!raw || typeof raw !== "object") return;
  const v = record(raw),
    p = normalizeAdventure(raw);
  return {
    difficulty: p.difficulty,
    oath: p.oath,
    relic: p.relic,
    keystones: Array.isArray(v.keystones)
      ? [
          ...new Set(
            v.keystones.filter((id): id is KeystoneId =>
              KEYSTONES.some((k) => k.id === id),
            ),
          ),
        ].slice(0, 3)
      : [],
    peakStreak: count(v.peakStreak),
    damageTaken: count(v.damageTaken),
    dashes: count(v.dashes),
    actives: count(v.actives),
    contracts: Array.isArray(v.contracts)
      ? [
          ...new Set(
            v.contracts.filter((id): id is string =>
              CONTRACTS.some((c) => c.id === id),
            ),
          ),
        ]
      : [],
  };
}
export const MILESTONES = [
  {
    id: "first_return",
    name: "The first chapter",
    description: "Return from your first expedition.",
    goal: 1,
    gold: 35,
    metric: (s: SaveData) => s.totals.runs,
  },
  {
    id: "hunter",
    name: "Against the horde",
    description: "Defeat 200 enemies across your journeys.",
    goal: 200,
    gold: 60,
    metric: (s: SaveData) => s.totals.kills,
  },
  {
    id: "explorer",
    name: "Leave the beaten path",
    description: "Complete 5 world landmarks.",
    goal: 5,
    gold: 60,
    metric: (s: SaveData) => s.totals.encounters,
  },
  {
    id: "first_win",
    name: "A legend begins",
    description: "Win an expedition.",
    goal: 1,
    gold: 75,
    metric: (s: SaveData) => s.totals.wins,
  },
  {
    id: "momentum",
    name: "In the flow",
    description: "Reach a 30-defeat momentum streak.",
    goal: 30,
    gold: 100,
    metric: (s: SaveData) => s.adventure.bestStreak,
  },
  {
    id: "contracts",
    name: "Above and beyond",
    description: "Complete 12 expedition objectives.",
    goal: 12,
    gold: 120,
    metric: (s: SaveData) => s.adventure.contracts,
  },
  {
    id: "guardian",
    name: "Dungeon delver",
    description: "Defeat 8 dungeon guardians.",
    goal: 8,
    gold: 150,
    metric: (s: SaveData) => s.totals.dungeonBosses,
  },
  {
    id: "veteran",
    name: "The long road",
    description: "Win 10 expeditions.",
    goal: 10,
    gold: 200,
    metric: (s: SaveData) => s.totals.wins,
  },
] as const;
export function relicUnlocked(s: SaveData, id: string): boolean {
  const r = RELICS.find((r) => r.id === id),
    m = MILESTONES.find((m) => m.id === r?.milestone);
  return !!m && m.metric(s) >= m.goal;
}
export function claimMilestone(s: SaveData, id: string): boolean {
  const m = MILESTONES.find((m) => m.id === id);
  if (!m || s.adventure.claimed.includes(id) || m.metric(s) < m.goal)
    return false;
  s.adventure.claimed.push(id);
  s.gold += m.gold;
  return true;
}
export function adventureStats(
  base: Stats,
  oathId: string,
  relicId: string,
): Stats {
  const stats = { ...base };
  for (const bonus of [
    OATHS.find((o) => o.id === oathId)?.stats,
    RELICS.find((r) => r.id === relicId)?.stats,
  ])
    for (const [key, value] of Object.entries(bonus || {}))
      stats[key as keyof Stats] += value;
  stats.health = Math.max(35, stats.health);
  stats.armor = Math.max(0, stats.armor);
  return stats;
}
export const CONTRACTS = [
  {
    id: "hunt",
    name: "Thin the horde",
    goal: 60,
    description: "Defeat 60 enemies",
    gold: 20,
    xp: 40,
  },
  {
    id: "explore",
    name: "Answer the wild",
    goal: 2,
    description: "Complete 2 landmarks or guardians",
    gold: 25,
    xp: 50,
  },
  {
    id: "ability",
    name: "Show your strength",
    goal: 4,
    description: "Use your class ability 4 times and defeat 20 enemies",
    gold: 20,
    xp: 40,
  },
] as const;
export function contractProgress(
  id: string,
  kills: number,
  encounters: number,
  actives: number,
): number {
  return id === "hunt"
    ? kills
    : id === "explore"
      ? encounters
      : kills >= 20
        ? actives
        : 0;
}
export function nextChapter(s: SaveData): {
  title: string;
  description: string;
  progress: number;
  goal: number;
  action: string;
  destination: string;
} {
  const ready = MILESTONES.find(
    (m) => !s.adventure.claimed.includes(m.id) && m.metric(s) >= m.goal,
  );
  if (ready)
    return {
      title: "Your story has a reward",
      description: `Claim “${ready.name}” in Mastery. Your next expedition is already waiting.`,
      progress: 1,
      goal: 1,
      action: "Open mastery",
      destination: "mastery",
    };
  if (!s.totals.runs)
    return {
      title: "Take the first step",
      description:
        "Move with WASD. Your hero attacks automatically. Gather blue gems, try Space, and bring your discoveries home.",
      progress: 0,
      goal: 1,
      action: "Read the field guide",
      destination: "controls",
    };
  if (s.totals.kills < 120)
    return {
      title: "A road to Westfall",
      description:
        "Defeat 120 enemies across expeditions to open the next frontier. Every return counts.",
      progress: s.totals.kills,
      goal: 120,
      action: "View your journey",
      destination: "journal",
    };
  if (!s.clearedZones.includes("elwynn"))
    return {
      title: "Face the forest’s guardian",
      description:
        "Survive Elwynn, evolve a spell, and defeat Hogger. Try a defensive oath if you need breathing room.",
      progress: 0,
      goal: 1,
      action: "Prepare abilities",
      destination: "spellbook",
    };
  const zone = s.clearedZones.includes("westfall")
    ? "New dungeons & deeper builds"
    : "The frontier is calling";
  return {
    title: zone,
    description:
      "Explore unlocked destinations, complete landmarks and shape your build with keystones at run levels 4, 8 and 12.",
    progress: s.clearedZones.length,
    goal: 9,
    action: "View your journey",
    destination: "journal",
  };
}
export function settleAdventure(s: SaveData, run: RunRecord): void {
  const p = normalizeAdventureProof(run.adventure);
  if (!p) return;
  s.adventure.bestStreak = Math.max(s.adventure.bestStreak, p.peakStreak);
  s.adventure.contracts += p.contracts.length;
}
