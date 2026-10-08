import type { ClassId, GearDef, Recipe } from "./content";
import type { WardrobeSource } from "./wardrobe";
import type { TrainingRank } from "./training";

export const DUAL_WIELD_RULES = {
  classes: ["warrior", "rogue", "hunter"] as readonly ClassId[],
  level: 10,
  gold: 60,
  factor: 0.5,
};
export const dualWieldClass = (id: ClassId) =>
  DUAL_WIELD_RULES.classes.includes(id);
export const secondaryWeapon = (g: GearDef | undefined): boolean =>
  !!g &&
  g.slot === "weapon" &&
  g.weaponHands === 1 &&
  (!g.classes || g.classes.some(dualWieldClass));

export const DUAL_WIELD_GEAR: GearDef[] = [];
export const DUAL_WIELD_RECIPES: Recipe[] = [];
export const DUAL_WIELD_SOURCES: Record<string, WardrobeSource> = {};
function add(
  id: string,
  name: string,
  level: number,
  power: number,
  crit: number,
  source: WardrobeSource,
  value: number,
) {
  DUAL_WIELD_GEAR.push({
    id,
    name,
    slot: "weapon",
    weaponHands: 1,
    weaponType: "sword",
    icon: "sword",
    classes: [...DUAL_WIELD_RULES.classes],
    level,
    rarity: source.type === "world" ? "uncommon" : "rare",
    stats: { power, crit },
    value,
    description:
      "A one-handed blade. Trained dual wielders can use it in either hand.",
    ...(source.type === "world" ? { dropZones: [source.zone] } : {}),
  });
  DUAL_WIELD_SOURCES[id] = source;
}
for (const [zone, name, level, power, crit] of [
  ["elwynn", "Goldshire Shortsword", 3, 8, 2],
  ["westfall", "Dustroad Sabre", 6, 14, 3],
  ["tirisfal", "Stillwater Cutter", 11, 20, 4],
  ["duskwood", "Ravenhill Sabre", 19, 26, 5],
] as const)
  add(
    `${zone}_duelist_blade`,
    name,
    level,
    power,
    crit,
    { type: "world", zone },
    level * 3 + 15,
  );
for (const [rank, tier, skill, level, gold, power, crit] of [
  [1, "apprentice", 1, 2, 35, 8, 1],
  [2, "journeyman", 50, 5, 55, 14, 2],
  [3, "expert", 125, 10, 85, 20, 3],
  [4, "artisan", 225, 18, 140, 26, 4],
] as const) {
  const id = `${tier}_duelist_blade`,
    recipe = `craft_${id}`;
  const name = `${["Campmade", "Riveted", "Fitted", "Masterwork"][rank - 1]} Duelist Blade`;
  add(
    id,
    name,
    level,
    power,
    crit,
    { type: "craft", profession: "blacksmithing", skill, recipe },
    Math.floor(gold / 2),
  );
  DUAL_WIELD_RECIPES.push({
    id: recipe,
    name,
    profession: "blacksmithing",
    icon: "sword",
    description:
      "One-handed. Can serve as a secondary weapon after Dual Wield training.",
    skill,
    trainingRank: rank as TrainingRank,
    gold,
    cost: { ore: 8, leather: 2 },
    output: id,
    quantity: 1,
  });
}
for (const [zone, stage, id, name, level, power, crit] of [
  ["deadmines", 1, "ironclad_duelist", "Ironclad Duelist Blade", 10, 21, 4],
  ["ragefire", 3, "emberedge_duelist", "Emberedge Duelist Blade", 10, 22, 3],
  ["shadowfang", 2, "fangguard_duelist", "Fangguard Duelist Blade", 15, 25, 5],
] as const)
  add(
    id,
    name,
    level,
    power,
    crit,
    { type: "dungeon", zone, stage },
    level * 5 + 30,
  );
export const dualWieldDungeonLoot = (zone: string, stage: number) =>
  Object.entries(DUAL_WIELD_SOURCES)
    .filter(
      ([, s]) => s.type === "dungeon" && s.zone === zone && s.stage === stage,
    )
    .map(([id]) => id);
