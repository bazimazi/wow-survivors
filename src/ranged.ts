import type { ClassId, GearDef, Recipe, Slot } from "./content";
import type { WardrobeSource } from "./wardrobe";
import type { TrainingRank } from "./training";

export const RANGED_CLASSES = {
  wand: ["mage", "priest", "warlock"] as ClassId[],
  thrown: ["warrior", "rogue", "hunter"] as ClassId[],
};
export const rangedClass = (id: ClassId) =>
  Object.values(RANGED_CLASSES).some((ids) => ids.includes(id));
export const LEGACY_RANGED: Record<string, "bow" | "wand"> = {
  starter_hunter: "bow",
  longbow: "bow",
  reinforced_bow: "bow",
  rigging_longbow: "bow",
  ash_bow: "bow",
  moonhowl_longbow: "bow",
  ravenhill_bow: "bow",
  starter_priest: "wand",
};
export const RANGED_GEAR: GearDef[] = [];
export const RANGED_RECIPES: Recipe[] = [];
export const RANGED_SOURCES: Record<string, WardrobeSource> = {};
function add(
  id: string,
  name: string,
  kind: "wand" | "thrown",
  level: number,
  power: number,
  bonus: number,
  source: WardrobeSource,
  value: number,
) {
  RANGED_GEAR.push({
    id,
    name,
    slot: "ranged",
    rangedType: kind,
    weaponType: kind,
    icon: kind === "wand" ? "staff" : "dagger",
    classes: [...RANGED_CLASSES[kind]],
    level,
    rarity: source.type === "world" ? "uncommon" : "rare",
    stats: { power, [kind === "wand" ? "haste" : "crit"]: bonus },
    value,
    description:
      "Ranged equipment. Its full bonuses work alongside your primary and off-hand equipment.",
    ...(source.type === "world" ? { dropZones: [source.zone] } : {}),
  });
  RANGED_SOURCES[id] = source;
}
for (const [zone, prefix, level, power, bonus] of [
  ["elwynn", "Northshire", 3, 6, 1],
  ["westfall", "Dustroad", 6, 10, 2],
  ["tirisfal", "Stillwater", 11, 14, 3],
  ["duskwood", "Nightwatch", 19, 18, 4],
] as const)
  for (const kind of ["wand", "thrown"] as const)
    add(
      `${zone}_${kind}`,
      `${prefix} ${kind === "wand" ? "Wand" : "Throwing Set"}`,
      kind,
      level,
      power,
      bonus,
      { type: "world", zone },
      level * 3 + 15,
    );
for (const [rank, tier, skill, level, gold, power, bonus] of [
  [1, "apprentice", 1, 2, 30, 6, 1],
  [2, "journeyman", 50, 5, 50, 10, 2],
  [3, "expert", 125, 10, 75, 14, 3],
  [4, "artisan", 225, 18, 125, 18, 4],
] as const)
  for (const kind of ["wand", "thrown"] as const) {
    const id = `${tier}_${kind}`,
      recipe = `craft_${id}`,
      profession = kind === "wand" ? "enchanting" : "engineering",
      name = `${["Campmade", "Riveted", "Fitted", "Masterwork"][rank - 1]} ${kind === "wand" ? "Wand" : "Throwing Set"}`;
    add(
      id,
      name,
      kind,
      level,
      power,
      bonus,
      { type: "craft", profession, skill, recipe },
      Math.floor(gold / 2),
    );
    RANGED_RECIPES.push({
      id: recipe,
      name,
      profession,
      icon: kind === "wand" ? "staff" : "dagger",
      description:
        "Ranged equipment with full bonuses alongside your hand equipment.",
      skill,
      trainingRank: rank as TrainingRank,
      gold,
      cost: kind === "wand" ? { dust: 4, ore: 2 } : { ore: 6, cloth: 2 },
      output: id,
      quantity: 1,
    });
  }
for (const [zone, wandStage, thrownStage, prefix, level, power, bonus] of [
  ["deadmines", 2, 0, "Ironclad", 10, 15, 3],
  ["ragefire", 2, 1, "Emberwatch", 10, 16, 3],
  ["shadowfang", 3, 0, "Moonwatch", 15, 18, 4],
] as const)
  for (const kind of ["wand", "thrown"] as const)
    add(
      `${zone}_${kind}`,
      `${prefix} ${kind === "wand" ? "Wand" : "Throwing Set"}`,
      kind,
      level,
      power,
      bonus,
      {
        type: "dungeon",
        zone,
        stage: kind === "wand" ? wandStage : thrownStage,
      },
      level * 5 + 30,
    );
export const rangedDungeonLoot = (zone: string, stage: number) =>
  Object.entries(RANGED_SOURCES)
    .filter(
      ([, s]) => s.type === "dungeon" && s.zone === zone && s.stage === stage,
    )
    .map(([id]) => id);
export const weaponFormulaFits = (g: GearDef | undefined, slot: Slot) =>
  !!g &&
  (g.slot === slot ||
    (slot === "weapon" && g.slot === "ranged" && !!g.rangedType));
