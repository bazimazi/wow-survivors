import type { GearDef, Recipe, Slot, Stats, ProfessionId } from "./content";
import { DUSKWOOD_GEAR } from "./duskwood";
import type { FactionId } from "./factions";

export const WARDROBE_SLOTS = [
  "shoulders",
  "back",
  "waist",
  "legs",
  "wrists",
  "finger1",
  "neck",
  "weapon",
  "offhand",
  "ranged",
] as const;
export type WardrobeSlot = (typeof WARDROBE_SLOTS)[number];
export type WardrobeSource =
  | { type: "world"; zone: string }
  | { type: "craft"; profession: ProfessionId; skill: number; recipe: string }
  | { type: "dungeon"; zone: string; stage: number }
  | { type: "campaign"; faction: FactionId; chapter: number };

export const WARDROBE_GEAR: GearDef[] = [];
export const WARDROBE_RECIPES: Recipe[] = [];
export const WARDROBE_SOURCES: Record<string, WardrobeSource> = {};
for (const g of DUSKWOOD_GEAR)
  if ((WARDROBE_SLOTS as readonly string[]).includes(g.slot))
    WARDROBE_SOURCES[g.id] = { type: "world", zone: "duskwood" };
const icons: Record<WardrobeSlot, string> = {
  shoulders: "shoulders",
  back: "cape",
  waist: "belt",
  legs: "legs",
  wrists: "bracers",
  finger1: "ring",
  neck: "necklace",
  weapon: "sword",
  offhand: "shield",
  ranged: "bow",
};
function add(
  id: string,
  name: string,
  slot: WardrobeSlot,
  level: number,
  stats: Partial<Stats>,
  value: number,
  source: WardrobeSource,
  armor?: GearDef["armor"],
  rarity: GearDef["rarity"] = "rare",
  set?: string,
) {
  WARDROBE_GEAR.push({
    id,
    name,
    slot,
    level,
    stats,
    value,
    armor,
    rarity,
    set,
    icon: icons[slot],
    description:
      source.type === "craft"
        ? set
          ? "A fitted piece of a complete handcrafted outfit."
          : "Made for the long road and the battles along it."
        : source.type === "dungeon"
          ? "A trophy from the depths, earned from its guardian."
          : "A discovery from the trails beyond camp.",
    ...(source.type === "world" ? { dropZones: [source.zone] } : {}),
  });
  WARDROBE_SOURCES[id] = source;
}
function crafted(
  id: string,
  name: string,
  slot: WardrobeSlot,
  level: number,
  stats: Partial<Stats>,
  value: number,
  profession: ProfessionId,
  skill: number,
  gold: number,
  cost: Recipe["cost"],
  armor?: GearDef["armor"],
  rarity: GearDef["rarity"] = "rare",
  set?: string,
) {
  const recipe = `craft_${id}`;
  add(
    id,
    name,
    slot,
    level,
    stats,
    value,
    { type: "craft", profession, skill, recipe },
    armor,
    rarity,
    set,
  );
  WARDROBE_RECIPES.push({
    id: recipe,
    name,
    profession,
    icon: icons[slot],
    skill,
    gold,
    cost,
    output: id,
    quantity: 1,
    trainingRank: skill >= 225 ? 4 : skill >= 125 ? 3 : skill >= 75 ? 2 : 1,
    description: `${armor ? armor[0].toUpperCase() + armor.slice(1) : "Universal"} ${slot === "back" ? "cloak" : slot === "waist" ? "belt" : slot}. Requires character level ${level} to equip.`,
  });
}

const world = (zone: string): WardrobeSource => ({ type: "world", zone });
add(
  "trailwatch_cloak",
  "Trailwatch Cloak",
  "back",
  2,
  { power: 2, speed: 3, armor: 2 },
  20,
  world("elwynn"),
  undefined,
  "uncommon",
);
add(
  "hearthstitched_belt",
  "Hearthstitched Belt",
  "waist",
  2,
  { health: 12, armor: 3 },
  20,
  world("elwynn"),
  "cloth",
  "uncommon",
);
add(
  "northshire_leggings",
  "Northshire Leggings",
  "legs",
  2,
  { health: 18, armor: 4 },
  25,
  world("elwynn"),
  "cloth",
  "uncommon",
);
add(
  "watchkeeper_mantle",
  "Watchkeeper Mantle",
  "shoulders",
  5,
  { power: 4, haste: 3, armor: 2 },
  35,
  world("elwynn"),
  "cloth",
  "uncommon",
);
add(
  "fieldwatch_drape",
  "Fieldwatch Drape",
  "back",
  5,
  { health: 14, crit: 3, armor: 3 },
  35,
  world("westfall"),
  undefined,
  "uncommon",
);
add(
  "dustroad_sash",
  "Dustroad Sash",
  "waist",
  5,
  { power: 3, armor: 4, regen: 0.2 },
  35,
  world("westfall"),
  "cloth",
  "uncommon",
);
add(
  "harvestguard_trousers",
  "Harvestguard Trousers",
  "legs",
  5,
  { health: 22, haste: 4, armor: 5 },
  40,
  world("westfall"),
  "cloth",
  "uncommon",
);
add(
  "sentinel_shoulders",
  "Sentinel's Shoulders",
  "shoulders",
  8,
  { health: 18, armor: 5, power: 5 },
  55,
  world("westfall"),
  "cloth",
);
add(
  "gravewatch_cape",
  "Gravewatch Cape",
  "back",
  10,
  { regen: 0.4, magnet: 15, armor: 3 },
  55,
  world("tirisfal"),
);
add(
  "duskbinder_belt",
  "Duskbinder Belt",
  "waist",
  10,
  { crit: 4, armor: 5, health: 14 },
  55,
  world("tirisfal"),
  "cloth",
);
add(
  "mourningweave_leggings",
  "Mourningweave Leggings",
  "legs",
  10,
  { power: 7, haste: 4, armor: 6 },
  65,
  world("tirisfal"),
  "cloth",
);
add(
  "wraithward_mantle",
  "Wraithward Mantle",
  "shoulders",
  12,
  { power: 6, armor: 7, crit: 3 },
  70,
  world("tirisfal"),
  "cloth",
);

const sets: {
  id: string;
  name: string;
  armor: NonNullable<GearDef["armor"]>;
  profession: ProfessionId;
  material: "cloth" | "leather" | "ore";
  stats: Partial<Stats>[];
}[] = [
  {
    id: "spellweave",
    name: "Spellwoven",
    armor: "cloth",
    profession: "tailoring",
    material: "cloth",
    stats: [
      { power: 7, haste: 4, armor: 3 },
      { health: 18, haste: 5, armor: 4 },
      { power: 8, health: 22, armor: 5 },
    ],
  },
  {
    id: "pathfinder",
    name: "Pathfinder",
    armor: "leather",
    profession: "leatherworking",
    material: "leather",
    stats: [
      { crit: 4, power: 5, armor: 3 },
      { speed: 4, health: 16, armor: 4 },
      { crit: 5, haste: 4, armor: 5 },
    ],
  },
  {
    id: "ironwarden",
    name: "Ironwarden",
    armor: "mail",
    profession: "blacksmithing",
    material: "ore",
    stats: [
      { armor: 6, health: 20, haste: 3 },
      { armor: 5, health: 20, magnet: 10 },
      { armor: 7, power: 5, health: 26 },
    ],
  },
  {
    id: "oathsteel",
    name: "Oathsteel",
    armor: "plate",
    profession: "blacksmithing",
    material: "ore",
    stats: [
      { armor: 7, power: 4, health: 16 },
      { armor: 6, health: 22, haste: 3 },
      { armor: 9, health: 28, power: 6 },
    ],
  },
];
for (const set of sets) {
  for (const [i, slot] of (["shoulders", "waist", "legs"] as const).entries()) {
    const cost: Recipe["cost"] = { [set.material]: 12 + i * 2, dust: 2 };
    if (set.material === "ore") cost.cloth = 2;
    crafted(
      `${set.id}_${slot}`,
      `${set.name} ${["Shoulders", "Belt", "Leggings"][i]}`,
      slot,
      [10, 12, 15][i],
      set.stats[i],
      70 + i * 10,
      set.profession,
      125 + i * 25,
      40 + i * 5,
      cost,
      set.armor,
      "rare",
      set.id,
    );
  }
}
export const WARDROBE_SET_BONUSES: Record<
  string,
  { pieces: number; stats: Partial<Stats> }
> = {
  spellweave: { pieces: 6, stats: { regen: 0.4, magnet: 15 } },
  pathfinder: { pieces: 6, stats: { health: 20, speed: 5 } },
  ironwarden: { pieces: 6, stats: { haste: 4, magnet: 15 } },
  oathsteel: { pieces: 6, stats: { health: 20, regen: 0.4 } },
};
crafted(
  "spiritwoven_leggings",
  "Spiritwoven Leggings",
  "legs",
  18,
  { power: 12, haste: 8, health: 25, armor: 8 },
  140,
  "tailoring",
  225,
  80,
  { cloth: 20, dust: 2 },
  "cloth",
  "epic",
);
crafted(
  "wildtrail_leggings",
  "Wildtrail Leggings",
  "legs",
  18,
  { power: 9, crit: 6, speed: 5, armor: 8 },
  140,
  "leatherworking",
  225,
  80,
  { leather: 20, dust: 2 },
  "leather",
  "epic",
);
crafted(
  "stormforge_legguards",
  "Stormforge Legguards",
  "legs",
  18,
  { health: 38, armor: 10, power: 7, regen: 0.2 },
  140,
  "blacksmithing",
  225,
  80,
  { ore: 18, leather: 4, dust: 2 },
  "mail",
  "epic",
);
crafted(
  "dawnsteel_legplates",
  "Dawnsteel Legplates",
  "legs",
  18,
  { health: 38, armor: 12, power: 8, haste: 4 },
  140,
  "blacksmithing",
  225,
  80,
  { ore: 20, leather: 4, dust: 2 },
  "plate",
  "epic",
);
crafted(
  "linen_trail_cloak",
  "Linen Trail Cloak",
  "back",
  3,
  { power: 2, health: 8, armor: 2 },
  20,
  "tailoring",
  25,
  12,
  { cloth: 4 },
  undefined,
  "uncommon",
);
crafted(
  "woolen_wayfarer_cape",
  "Woolen Wayfarer Cape",
  "back",
  8,
  { crit: 3, health: 12, armor: 3 },
  45,
  "tailoring",
  75,
  25,
  { cloth: 6 },
  undefined,
  "uncommon",
);
crafted(
  "silken_windcloak",
  "Silken Windcloak",
  "back",
  12,
  { haste: 4, magnet: 12, armor: 3, health: 16 },
  80,
  "tailoring",
  150,
  45,
  { cloth: 10, dust: 2 },
);
crafted(
  "runebound_drape",
  "Runebound Drape",
  "back",
  18,
  { power: 6, regen: 0.4, armor: 4, magnet: 10 },
  140,
  "tailoring",
  225,
  75,
  { cloth: 16, dust: 2 },
  undefined,
  "epic",
);

const guardian = (zone: string, stage: number): WardrobeSource => ({
  type: "dungeon",
  zone,
  stage,
});
add(
  "shredder_drivebelt",
  "Shredder Drivebelt",
  "waist",
  10,
  { armor: 7, haste: 5, health: 14 },
  80,
  guardian("deadmines", 0),
  "mail",
);
add(
  "smite_deckgreaves",
  "Smite's Deckgreaves",
  "legs",
  10,
  { armor: 9, power: 6, health: 18 },
  80,
  guardian("deadmines", 1),
  "plate",
);
add(
  "blackguard_mantle",
  "Blackguard Mantle",
  "shoulders",
  10,
  { power: 8, crit: 5, armor: 5 },
  80,
  guardian("deadmines", 2),
  "leather",
);
add(
  "captains_cutlass_cape",
  "Captain's Cutlass Cape",
  "back",
  10,
  { speed: 5, power: 6, armor: 4 },
  80,
  guardian("deadmines", 2),
);
add(
  "stonebound_spaulders",
  "Stonebound Spaulders",
  "shoulders",
  10,
  { armor: 8, health: 22, magnet: 10 },
  80,
  guardian("ragefire", 0),
  "mail",
);
add(
  "emberhide_sash",
  "Emberhide Sash",
  "waist",
  10,
  { haste: 6, crit: 4, armor: 4 },
  80,
  guardian("ragefire", 1),
  "leather",
);
add(
  "cultist_ritual_kilt",
  "Cultist Ritual Kilt",
  "legs",
  10,
  { regen: 0.4, power: 7, armor: 5, health: 18 },
  80,
  guardian("ragefire", 2),
  "cloth",
);
add(
  "shadowstep_drape",
  "Shadowstep Drape",
  "back",
  10,
  { crit: 5, speed: 5, armor: 4 },
  80,
  guardian("ragefire", 3),
);

export function wardrobeDungeonLoot(zone: string, stage: number): string[] {
  return Object.entries(WARDROBE_SOURCES)
    .filter(
      ([, source]) =>
        source.type === "dungeon" &&
        source.zone === zone &&
        source.stage === stage,
    )
    .map(([id]) => id);
}
export const isWardrobeSlot = (slot: Slot | "all"): slot is WardrobeSlot =>
  (WARDROBE_SLOTS as readonly string[]).includes(slot);
