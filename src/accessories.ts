import type { GearDef, Recipe, Stats } from "./content";
import type { WardrobeSource } from "./wardrobe";
import { gradedCosts } from "./resources";

export const ACCESSORY_GEAR: GearDef[] = [];
export const ACCESSORY_RECIPES: Recipe[] = [];
export const ACCESSORY_SOURCES: Record<string, WardrobeSource> = {};
function add(
  id: string,
  name: string,
  slot: "wrists" | "finger1",
  level: number,
  stats: Partial<Stats>,
  value: number,
  source: WardrobeSource,
  armor?: GearDef["armor"],
  rarity: GearDef["rarity"] = "rare",
) {
  ACCESSORY_GEAR.push({
    id,
    name,
    slot,
    level,
    stats,
    value,
    armor,
    rarity,
    icon: slot === "wrists" ? "bracers" : "ring",
    description:
      source.type === "craft"
        ? "Carefully fitted protection for the long expedition."
        : source.type === "dungeon"
          ? "A guardian's keepsake, won in the depths."
          : "A small discovery carrying the spirit of its homeland.",
    ...(source.type === "world" ? { dropZones: [source.zone] } : {}),
  });
  ACCESSORY_SOURCES[id] = source;
}
for (const [zone, level, wrist, ring, stats, ringStats] of [
  [
    "elwynn",
    2,
    "Northshire Wristwraps",
    "Brookstone Band",
    { health: 10, armor: 2, power: 2 },
    { power: 3, crit: 1 },
  ],
  [
    "westfall",
    5,
    "Fieldwatch Cuffs",
    "Harvest Moon Ring",
    { health: 12, armor: 3, haste: 2 },
    { regen: 0.2, magnet: 8 },
  ],
  [
    "tirisfal",
    10,
    "Gravekeeper Bindings",
    "Stillwater Signet",
    { power: 4, armor: 3, regen: 0.2 },
    { crit: 3, health: 12 },
  ],
  [
    "duskwood",
    18,
    "Nightwatch Wristwraps",
    "Ravenhill Band",
    { health: 18, armor: 4, haste: 3 },
    { power: 5, crit: 3 },
  ],
] as const) {
  add(
    `${zone}_wristwraps`,
    wrist,
    "wrists",
    level,
    stats,
    level * 3 + 20,
    { type: "world", zone },
    "cloth",
    "uncommon",
  );
  add(
    `${zone}_ring`,
    ring,
    "finger1",
    level + 1,
    ringStats,
    level * 3 + 25,
    { type: "world", zone },
    undefined,
    "uncommon",
  );
}
for (const [armor, profession, prefix, expert, artisan, baseCost] of [
  [
    "cloth",
    "tailoring",
    "Spellthread",
    { power: 5, haste: 3, armor: 2 },
    { power: 7, haste: 5, armor: 3, regen: 0.2 },
    { cloth: 8, herbs: 2 },
  ],
  [
    "leather",
    "leatherworking",
    "Trailhide",
    { health: 16, crit: 3, armor: 4 },
    { health: 22, crit: 5, armor: 5, speed: 2 },
    { leather: 8, cloth: 2 },
  ],
  [
    "mail",
    "blacksmithing",
    "Riveted",
    { power: 4, haste: 3, armor: 5 },
    { power: 6, haste: 5, armor: 7, health: 12 },
    { ore: 8, leather: 2 },
  ],
  [
    "plate",
    "blacksmithing",
    "Bulwark",
    { health: 20, armor: 7, regen: 0.1 },
    { health: 28, armor: 9, regen: 0.3 },
    { ore: 10, cloth: 2 },
  ],
] as const)
  for (const grade of ["expert", "artisan"] as const) {
    const id = `${grade}_${armor}_bracers`,
      recipe = `craft_${id}`,
      skill = grade === "expert" ? 125 : 225,
      level = grade === "expert" ? 10 : 18;
    const name = `${grade === "expert" ? "Fitted" : "Masterwork"} ${prefix} Bracers`;
    add(
      id,
      name,
      "wrists",
      level,
      grade === "expert" ? expert : artisan,
      grade === "expert" ? 65 : 110,
      { type: "craft", profession, skill, recipe },
      armor,
    );
    ACCESSORY_RECIPES.push({
      id: recipe,
      name,
      profession,
      icon: "bracers",
      skill,
      gold: grade === "expert" ? 65 : 110,
      cost: gradedCosts(baseCost, skill),
      output: id,
      quantity: 1,
      trainingRank: grade === "expert" ? 3 : 4,
      description: `${armor[0].toUpperCase() + armor.slice(1)} bracers. Requires character level ${level} to equip.`,
    });
  }
for (const [zone, stage, id, name, level, stats] of [
  [
    "deadmines",
    0,
    "foundry_signet",
    "Foundry Signet",
    10,
    { armor: 4, health: 16 },
  ],
  ["deadmines", 2, "corsair_band", "Corsair's Band", 10, { power: 5, crit: 4 }],
  [
    "ragefire",
    0,
    "stoneheart_ring",
    "Stoneheart Ring",
    10,
    { health: 20, regen: 0.3 },
  ],
  [
    "ragefire",
    2,
    "emberheart_band",
    "Emberheart Band",
    10,
    { power: 6, haste: 3 },
  ],
  [
    "ragefire",
    3,
    "shadowcleft_signet",
    "Shadowcleft Signet",
    10,
    { crit: 4, speed: 4, magnet: 10 },
  ],
  [
    "shadowfang",
    0,
    "silvermoon_signet",
    "Silvermoon Signet",
    15,
    { power: 7, regen: 0.4 },
  ],
  [
    "shadowfang",
    1,
    "oathkeeper_band",
    "Oathkeeper's Band",
    15,
    { armor: 5, health: 24 },
  ],
  [
    "shadowfang",
    3,
    "mooncurse_ring",
    "Mooncurse Ring",
    15,
    { crit: 5, haste: 5 },
  ],
] as const)
  add(id, name, "finger1", level, stats, zone === "shadowfang" ? 100 : 75, {
    type: "dungeon",
    zone,
    stage,
  });

export function accessoryDungeonLoot(zone: string, stage: number) {
  return Object.entries(ACCESSORY_SOURCES)
    .filter(
      ([, source]) =>
        source.type === "dungeon" &&
        source.zone === zone &&
        source.stage === stage,
    )
    .map(([id]) => id);
}
