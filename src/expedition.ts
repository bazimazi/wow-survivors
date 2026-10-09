import type { Material, Stats } from "./content";

export interface Position {
  x: number;
  y: number;
}
export interface Telegraph extends Position {
  shape?: "circle" | "line" | "ring";
  radius: number;
  end?: Position;
  innerRadius?: number;
}

/** Collision includes the player's body, matching the telegraph's visible boundary. */
export function telegraphContains(
  h: Telegraph,
  p: Position,
  bodyRadius = 14,
): boolean {
  if (h.shape === "line" && h.end) {
    const dx = h.end.x - h.x,
      dy = h.end.y - h.y;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq
      ? Math.max(
          0,
          Math.min(1, ((p.x - h.x) * dx + (p.y - h.y) * dy) / lengthSq),
        )
      : 0;
    return (
      Math.hypot(p.x - h.x - dx * t, p.y - h.y - dy * t) <=
      h.radius + bodyRadius
    );
  }
  const d = Math.hypot(p.x - h.x, p.y - h.y);
  return (
    d <= h.radius + bodyRadius &&
    (h.shape !== "ring" || d + bodyRadius >= (h.innerRadius || 0))
  );
}

export type EncounterKind = "shrine" | "cache" | "ritual";
export interface Landmark extends Position {
  id: string;
  kind: EncounterKind;
  name: string;
  discovered: boolean;
  state: "ready" | "active" | "complete";
  progress: number;
  spawnTimer: number;
  guardIds: number[];
}
export const ENCOUNTER_RULES = {
  shrine: {
    icon: "spark",
    label: "Shrine",
    description:
      "Choose a blessing for this expedition. Time pauses while you choose.",
  },
  cache: {
    icon: "chest",
    label: "Guarded cache",
    description:
      "Defeat three marked guards for equipment, 30 gold, 16 run XP and 3 materials.",
  },
  ritual: {
    icon: "rune",
    label: "Ritual",
    description:
      "Defend the circle for 20 seconds. Leaving slowly loses progress. Earn healing, 40 gold, 24 run XP and 5 materials.",
  },
} as const;
export const BLESSINGS: {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  stats: Partial<Stats>;
}[] = [
  {
    id: "might",
    name: "Blessing of Might",
    icon: "sword",
    color: "#dbac83",
    description: "+12% damage for this expedition.",
    stats: { power: 12 },
  },
  {
    id: "wind",
    name: "Blessing of the Wind",
    icon: "boot",
    color: "#9cc7c4",
    description:
      "+10% movement speed and +25% pickup radius for this expedition.",
    stats: { speed: 10, magnet: 25 },
  },
  {
    id: "resolve",
    name: "Blessing of Resolve",
    icon: "shield",
    color: "#b5c69a",
    description:
      "+8 armor and +0.6 health regeneration per second for this expedition.",
    stats: { armor: 8, regen: 0.6 },
  },
];

const NAMES: Record<string, string[]> = {
  duskwood: [
    "Night Watch Lantern",
    "Raven Hill Supplies",
    "Tranquil Gardens Vigil",
    "Brightwood Lantern",
    "Yorgen Strongbox",
    "Vul’Gol Watchfire",
  ],
  elwynn: [
    "Wayfarer's Shrine",
    "Gnoll Supply Cache",
    "Ancient Standing Stones",
    "Sunlit Sanctuary",
    "Kobold Lockbox",
    "Forest Warden's Circle",
  ],
  westfall: [
    "Pilgrim's Rest",
    "Outlaw Supply Cache",
    "Harvest Ward",
    "Weathered Wayshrine",
    "Smuggler's Lockbox",
    "Sentinel's Circle",
  ],
  tirisfal: [
    "Forgotten Sanctuary",
    "Grave-Robber's Cache",
    "Lantern Vigil",
    "Moonlit Wayshrine",
    "Buried Lockbox",
    "Restless Spirit Circle",
  ],
};
NAMES.plaguelands = [
  "Dawn's Beacon",
  "Blighted Supply Cache",
  "Purification Circle",
  "Last Wayshrine",
  "Lost Caravan",
  "Hope's Vigil",
];
export function createLandmarks(zone: string): Landmark[] {
  const positions = [
    [340, 180],
    [-500, 350],
    [0, -620],
    [-950, -900],
    [1150, -680],
    [850, 1100],
  ];
  const kinds: EncounterKind[] = [
    "shrine",
    "cache",
    "ritual",
    "shrine",
    "cache",
    "ritual",
  ];
  return positions.map(([x, y], i) => ({
    id: `${zone}-${i}`,
    x,
    y,
    kind: kinds[i],
    name: (NAMES[zone] || NAMES.elwynn)[i],
    discovered: false,
    state: "ready",
    progress: 0,
    spawnTimer: 0,
    guardIds: [],
  }));
}
export const ZONE_MATERIALS: Record<string, Material[]> = {
  plaguelands: ["cloth", "herbs", "dust"],
  duskwood: ["cloth", "herbs", "dust"],
  elwynn: ["herbs", "leather", "ore"],
  westfall: ["ore", "cloth", "leather"],
  tirisfal: ["cloth", "dust", "herbs"],
};
export const BOSS_IDENTITIES: Record<
  string,
  { enemy: string; baseHealth: number; title: string; tactic: string }
> = {
  plaguelands: {
    enemy: "wraith",
    baseHealth: 95,
    title: "Voice of the blighted wilderness",
    tactic:
      "Move between the shadow lanes. Escape the spreading nature clouds.",
  },
  duskwood: {
    enemy: "stitches",
    baseHealth: 46,
    title: "Terror of Darkshire",
    tactic:
      "Sidestep the cleaver lanes. Leave green clouds before they form and stay outside.",
  },
  elwynn: {
    enemy: "gnoll",
    baseHealth: 50,
    title: "Gnoll chieftain",
    tactic: "Sidestep the charge. Leave the stomp circle.",
  },
  westfall: {
    enemy: "defias",
    baseHealth: 90,
    title: "Outlaw commander",
    tactic: "Move between firing lanes. Avoid the dynamite.",
  },
  tirisfal: {
    enemy: "wraith",
    baseHealth: 42,
    title: "Keeper of restless souls",
    tactic: "Step inside the ring or escape its edge. Avoid the graves.",
  },
};
