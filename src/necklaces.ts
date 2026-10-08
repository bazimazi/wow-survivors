import type { GearDef, Stats } from "./content";
import type { WardrobeSource } from "./wardrobe";

export const NECKLACE_GEAR: GearDef[] = [];
export const NECKLACE_SOURCES: Record<string, WardrobeSource> = {};
function add(
  id: string,
  name: string,
  level: number,
  stats: Partial<Stats>,
  source: WardrobeSource,
) {
  NECKLACE_GEAR.push({
    id,
    name,
    slot: "neck",
    level,
    stats,
    icon: "necklace",
    rarity: source.type === "world" ? "uncommon" : "rare",
    value: source.type === "world" ? level * 3 + 25 : level * 5 + 25,
    description:
      source.type === "world"
        ? "A keepsake from the roads you have travelled."
        : "A guardian's treasured pendant, earned in the depths.",
    ...(source.type === "world" ? { dropZones: [source.zone] } : {}),
  });
  NECKLACE_SOURCES[id] = source;
}
for (const [zone, name, level, stats] of [
  ["elwynn", "Goldshire Keepsake", 4, { health: 12, power: 3 }],
  ["westfall", "Sentinel's Locket", 7, { regen: 0.3, speed: 3 }],
  ["tirisfal", "Whispering Pendant", 12, { crit: 3, haste: 3 }],
  [
    "duskwood",
    "Nightwatch Medallion",
    20,
    { power: 5, health: 20, regen: 0.2 },
  ],
] as const)
  add(`${zone}_necklace`, name, level, stats, { type: "world", zone });

for (const [zone, stage, id, name, level, stats] of [
  [
    "deadmines",
    1,
    "smite_torque",
    "Deckhand's Torque",
    10,
    { armor: 3, health: 20 },
  ],
  [
    "deadmines",
    2,
    "ironclad_pendant",
    "Ironclad Pendant",
    10,
    { power: 5, haste: 3 },
  ],
  [
    "ragefire",
    1,
    "molten_heart_pendant",
    "Molten Heart Pendant",
    10,
    { health: 20, regen: 0.4 },
  ],
  [
    "ragefire",
    3,
    "cleft_shadow_charm",
    "Cleft Shadow Charm",
    10,
    { power: 4, crit: 4 },
  ],
  [
    "shadowfang",
    0,
    "baron_keepsake",
    "Baron's Keepsake",
    15,
    { armor: 4, health: 24 },
  ],
  [
    "shadowfang",
    2,
    "worgfang_necklace",
    "Worgfang Necklace",
    15,
    { crit: 5, speed: 4 },
  ],
  [
    "shadowfang",
    3,
    "moonlit_pendant",
    "Moonlit Pendant",
    15,
    { power: 6, haste: 4 },
  ],
] as const)
  add(id, name, level, stats, { type: "dungeon", zone, stage });

export function necklaceDungeonLoot(zone: string, stage: number) {
  return Object.entries(NECKLACE_SOURCES)
    .filter(
      ([, s]) => s.type === "dungeon" && s.zone === zone && s.stage === stage,
    )
    .map(([id]) => id);
}
