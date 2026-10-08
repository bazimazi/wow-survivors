import type { ClassId, GearDef, Recipe, Stats } from "./content";
import type { WardrobeSource } from "./wardrobe";
import type { TrainingRank } from "./training";

export const SHIELD_CLASSES: ClassId[] = ["warrior", "paladin", "shaman"];
export const FOCUS_CLASSES: ClassId[] = ["mage", "priest", "warlock", "druid"];
export const OFFHAND_GEAR: GearDef[] = [];
export const OFFHAND_RECIPES: Recipe[] = [];
export const OFFHAND_SOURCES: Record<string, WardrobeSource> = {};
function add(
  id: string,
  name: string,
  kind: "shield" | "focus" | "mace" | "blade",
  level: number,
  stats: Partial<Stats>,
  source: WardrobeSource,
  value: number,
) {
  const held = kind === "shield" || kind === "focus";
  OFFHAND_GEAR.push({
    id,
    name,
    slot: held ? "offhand" : "weapon",
    level,
    stats,
    value,
    classes: [
      ...(kind === "shield" || kind === "mace"
        ? SHIELD_CLASSES
        : FOCUS_CLASSES),
    ],
    icon:
      kind === "shield"
        ? "shield"
        : kind === "focus"
          ? "focus"
          : kind === "blade"
            ? "dagger"
            : "paladin",
    ...(held
      ? { offhandType: kind as "shield" | "focus" }
      : {
          weaponHands: 1 as const,
          weaponType: kind === "mace" ? ("mace" as const) : ("dagger" as const),
        }),
    rarity: source.type === "world" ? "uncommon" : "rare",
    description: held
      ? "A companion for a one-handed weapon, carried in your off-hand."
      : "A balanced one-handed weapon that leaves room for an off-hand.",
    ...(source.type === "world" ? { dropZones: [source.zone] } : {}),
  });
  OFFHAND_SOURCES[id] = source;
}
for (const [
  zone,
  level,
  shield,
  focus,
  mace,
  blade,
  shieldStats,
  focusStats,
  maceStats,
  bladeStats,
] of [
  [
    "elwynn",
    2,
    "Trailguard Buckler",
    "Candlelight Focus",
    "Goldshire Cudgel",
    "Northshire Spellknife",
    { armor: 3, health: 12 },
    { power: 3, haste: 1 },
    { power: 7, crit: 2 },
    { power: 8, haste: 2 },
  ],
  [
    "westfall",
    5,
    "Sentinel's Shield",
    "Harvestlight Lantern",
    "Sentinel's Mace",
    "Harvest Spellblade",
    { armor: 4, health: 16 },
    { power: 4, haste: 2 },
    { power: 13, armor: 2 },
    { power: 14, haste: 3 },
  ],
  [
    "tirisfal",
    10,
    "Stillwater Bulwark",
    "Whispering Grimoire",
    "Gravewarden Mace",
    "Whispering Spellknife",
    { armor: 5, health: 20 },
    { power: 6, crit: 3 },
    { power: 19, crit: 4 },
    { power: 20, haste: 4 },
  ],
  [
    "duskwood",
    18,
    "Nightwatch Tower Shield",
    "Ravenhill Lantern",
    "Nightwatch Warhammer",
    "Ravenhill Spellblade",
    { armor: 7, health: 26 },
    { power: 7, haste: 3, regen: 0.2 },
    { power: 24, armor: 3 },
    { power: 25, haste: 5 },
  ],
] as const) {
  const source: WardrobeSource = { type: "world", zone };
  add(
    `${zone}_shield`,
    shield,
    "shield",
    level,
    shieldStats,
    source,
    level * 3 + 20,
  );
  add(
    `${zone}_focus`,
    focus,
    "focus",
    level,
    focusStats,
    source,
    level * 3 + 20,
  );
  add(
    `${zone}_mace`,
    mace,
    "mace",
    level + 1,
    maceStats,
    source,
    level * 3 + 25,
  );
  add(
    `${zone}_spellblade`,
    blade,
    "blade",
    level + 1,
    bladeStats,
    source,
    level * 3 + 25,
  );
}
for (const [rank, tier, skill, level, fee, value, shieldStats, focusStats] of [
  [
    1,
    "apprentice",
    1,
    2,
    25,
    15,
    { armor: 3, health: 8 },
    { power: 3, haste: 1 },
  ],
  [
    2,
    "journeyman",
    50,
    5,
    40,
    28,
    { armor: 4, health: 14 },
    { power: 4, haste: 2 },
  ],
  [
    3,
    "expert",
    125,
    10,
    65,
    45,
    { armor: 6, health: 20 },
    { power: 6, haste: 3 },
  ],
  [
    4,
    "artisan",
    225,
    18,
    110,
    70,
    { armor: 8, health: 28 },
    { power: 8, haste: 4, regen: 0.2 },
  ],
] as const)
  for (const kind of ["shield", "focus"] as const) {
    const id = `${tier}_${kind}`,
      recipe = `craft_${id}`,
      profession = kind === "shield" ? "blacksmithing" : "enchanting";
    const name = `${["Campmade", "Riveted", "Fitted", "Masterwork"][rank - 1]} ${kind === "shield" ? "Bulwark" : "Starlight Focus"}`;
    add(
      id,
      name,
      kind,
      level,
      kind === "shield" ? shieldStats : focusStats,
      { type: "craft", profession, skill, recipe },
      value,
    );
    OFFHAND_RECIPES.push({
      id: recipe,
      name,
      profession,
      icon: kind === "shield" ? "shield" : "focus",
      description:
        "An off-hand for a one-handed weapon. Its bonuses apply while equipped.",
      skill,
      trainingRank: rank as TrainingRank,
      gold: fee,
      cost: kind === "shield" ? { ore: 6, leather: 2 } : { dust: 4, herbs: 2 },
      output: id,
      quantity: 1,
    });
  }
for (const [zone, stage, id, name, kind, level, stats] of [
  [
    "deadmines",
    0,
    "shredder_guard",
    "Foundry Guard",
    "shield",
    10,
    { armor: 6, health: 20 },
  ],
  [
    "deadmines",
    2,
    "tideglass_focus",
    "Tideglass Focus",
    "focus",
    10,
    { power: 6, haste: 3 },
  ],
  [
    "ragefire",
    0,
    "cleft_bulwark",
    "Cleft Bulwark",
    "shield",
    10,
    { armor: 5, regen: 0.3 },
  ],
  [
    "ragefire",
    2,
    "soulfire_focus",
    "Soulfire Focus",
    "focus",
    10,
    { power: 7, crit: 3 },
  ],
  [
    "shadowfang",
    1,
    "oathbound_shield",
    "Oathbound Shield",
    "shield",
    15,
    { armor: 7, health: 26 },
  ],
  [
    "shadowfang",
    3,
    "eclipse_focus",
    "Eclipse Focus",
    "focus",
    15,
    { power: 8, haste: 4 },
  ],
] as const)
  add(
    id,
    name,
    kind,
    level,
    stats,
    { type: "dungeon", zone, stage },
    level * 5 + 25,
  );
export function offhandDungeonLoot(zone: string, stage: number) {
  return Object.entries(OFFHAND_SOURCES)
    .filter(
      ([, s]) => s.type === "dungeon" && s.zone === zone && s.stage === stage,
    )
    .map(([id]) => id);
}
