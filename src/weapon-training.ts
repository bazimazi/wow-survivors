import type { ClassId, GearDef, Recipe } from "./content";
import type { WardrobeSource } from "./wardrobe";
import type { TrainingRank } from "./training";

export const WEAPON_TYPE_LABELS = {
  sword: "One-handed swords",
  greatsword: "Two-handed swords",
  dagger: "Daggers",
  mace: "One-handed maces",
  maul: "Two-handed maces",
  staff: "Staves",
  bow: "Bows",
  wand: "Wands",
  thrown: "Thrown weapons",
  axe: "One-handed axes",
  polearm: "Polearms",
  greataxe: "Two-handed axes",
  fist: "Fist weapons",
  gun: "Guns",
  crossbow: "Crossbows",
};
export type WeaponType = keyof typeof WEAPON_TYPE_LABELS;
export const ADVANCED_WEAPON_TYPES = [
  "axe",
  "polearm",
  "greataxe",
  "fist",
  "gun",
  "crossbow",
] as const;
export type AdvancedWeaponType = (typeof ADVANCED_WEAPON_TYPES)[number];
export const WEAPON_TRAINING = {
  axe: {
    classes: ["warrior", "hunter", "paladin", "shaman"] as readonly ClassId[],
    level: 3,
    gold: 40,
    icon: "axe",
    description:
      "Use a one-handed axe with a shield, or in a trained Warrior/Hunter weapon pair.",
  },
  polearm: {
    classes: ["warrior", "hunter", "paladin"] as readonly ClassId[],
    level: 5,
    gold: 55,
    icon: "polearm",
    description:
      "Use a two-handed polearm. It occupies the off-hand; ranged equipment stays independent.",
  },
  greataxe: {
    classes: ["warrior", "hunter", "paladin"] as readonly ClassId[],
    level: 5,
    gold: 55,
    icon: "greataxe",
    description:
      "Use a two-handed axe. It occupies the off-hand; ranged equipment stays independent.",
  },
  fist: {
    classes: [
      "warrior",
      "rogue",
      "hunter",
      "shaman",
      "druid",
    ] as readonly ClassId[],
    level: 3,
    gold: 40,
    icon: "fist",
    description:
      "Use a one-handed fist weapon with an eligible shield, focus or trained weapon pair.",
  },
  gun: {
    classes: ["warrior", "rogue", "hunter"] as readonly ClassId[],
    level: 3,
    gold: 40,
    icon: "gun",
    description:
      "Equip a gun in the independent ranged position. Equipment shots consume ammunition.",
  },
  crossbow: {
    classes: ["warrior", "rogue", "hunter"] as readonly ClassId[],
    level: 5,
    gold: 55,
    icon: "crossbow",
    description:
      "Equip a crossbow in the independent ranged position. Equipment shots consume ammunition.",
  },
};
export const advancedWeaponType = (type: unknown): type is AdvancedWeaponType =>
  ADVANCED_WEAPON_TYPES.some((id) => id === type);
export function normalizeWeaponTraining(
  classId: ClassId,
  level: number,
  raw: unknown,
): AdvancedWeaponType[] {
  return ADVANCED_WEAPON_TYPES.filter(
    (type) =>
      Array.isArray(raw) &&
      raw.includes(type) &&
      WEAPON_TRAINING[type].classes.includes(classId) &&
      level >= WEAPON_TRAINING[type].level,
  );
}
export function weaponTrainingAllows(
  classId: ClassId,
  hero: { level: number; weaponTraining?: readonly AdvancedWeaponType[] },
  gear: GearDef | undefined,
): boolean {
  const type = gear?.weaponType;
  return (
    !advancedWeaponType(type) ||
    (WEAPON_TRAINING[type].classes.includes(classId) &&
      hero.level >= WEAPON_TRAINING[type].level &&
      Array.isArray(hero.weaponTraining) &&
      hero.weaponTraining.includes(type))
  );
}

// Older item identities are explicit. Icons do not determine weapon families.
export const LEGACY_WEAPON_TYPES: Record<string, WeaponType> = {
  starter_warrior: "greatsword",
  starter_mage: "staff",
  starter_rogue: "dagger",
  starter_hunter: "bow",
  starter_paladin: "mace",
  starter_priest: "wand",
  starter_shaman: "mace",
  starter_warlock: "staff",
  starter_druid: "staff",
  copper_sword: "sword",
  ember_staff: "staff",
  defias_blade: "dagger",
  longbow: "bow",
  reinforced_bow: "bow",
  tempered_edge: "sword",
  dockmaster_maul: "maul",
  rigging_longbow: "bow",
  rigging_staff: "staff",
  boarding_sabre: "sword",
  slag_blade: "sword",
  ash_bow: "bow",
  ember_branch: "staff",
  vigilant_edge: "sword",
  moonhowl_longbow: "bow",
  tower_staff: "staff",
  nightwatch_blade: "sword",
  ravenhill_bow: "bow",
  twilight_staff: "staff",
};

export const trainedWeaponRanged = (type: AdvancedWeaponType) =>
  type === "gun" || type === "crossbow";
export const trainedWeaponOneHanded = (type: AdvancedWeaponType) =>
  type === "axe" || type === "fist";
const itemNames = {
  axe: "Handaxe",
  polearm: "Glaive",
  greataxe: "Greataxe",
  fist: "Knuckles",
  gun: "Rifle",
  crossbow: "Crossbow",
};
export const TRAINED_WEAPON_GEAR: GearDef[] = [];
export const TRAINED_WEAPON_RECIPES: Recipe[] = [];
export const TRAINED_WEAPON_SOURCES: Record<string, WardrobeSource> = {};
function add(
  id: string,
  name: string,
  type: AdvancedWeaponType,
  level: number,
  power: number,
  bonus: number,
  source: WardrobeSource,
  value: number,
) {
  const rule = WEAPON_TRAINING[type];
  TRAINED_WEAPON_GEAR.push({
    id,
    name,
    slot: trainedWeaponRanged(type) ? "ranged" : "weapon",
    weaponType: type,
    ...(trainedWeaponRanged(type)
      ? { rangedType: type as "gun" | "crossbow" }
      : {
          weaponHands: trainedWeaponOneHanded(type)
            ? (1 as const)
            : (2 as const),
        }),
    classes: [...rule.classes],
    icon: rule.icon,
    level,
    rarity: source.type === "world" ? "uncommon" : "rare",
    stats: {
      power,
      [trainedWeaponOneHanded(type) || trainedWeaponRanged(type)
        ? "crit"
        : "haste"]: bonus,
    },
    description: `${rule.description} Requires personal ${WEAPON_TYPE_LABELS[type]} training.`,
    value,
    ...(source.type === "world" ? { dropZones: [source.zone] } : {}),
  });
  TRAINED_WEAPON_SOURCES[id] = source;
}
for (const [zone, prefix, level, axePower, polearmPower, bonus] of [
  ["elwynn", "Goldshire", 3, 8, 10, 1],
  ["westfall", "Dustroad", 6, 14, 17, 2],
  ["tirisfal", "Stillwater", 11, 20, 24, 3],
  ["duskwood", "Nightwatch", 19, 26, 31, 4],
] as const)
  for (const type of ADVANCED_WEAPON_TYPES)
    add(
      `${zone}_${type}`,
      `${prefix} ${itemNames[type]}`,
      type,
      Math.max(level, WEAPON_TRAINING[type].level),
      trainedWeaponOneHanded(type) || trainedWeaponRanged(type)
        ? axePower
        : polearmPower,
      bonus,
      { type: "world", zone },
      level * 3 + 20,
    );
for (const [rank, tier, skill, level, fee, axePower, polearmPower, bonus] of [
  [1, "apprentice", 1, 3, 35, 8, 10, 1],
  [2, "journeyman", 50, 5, 55, 14, 17, 2],
  [3, "expert", 125, 10, 85, 20, 24, 3],
  [4, "artisan", 225, 18, 140, 26, 31, 4],
] as const)
  for (const type of ADVANCED_WEAPON_TYPES) {
    const id = `${tier}_${type}`,
      recipe = `craft_${id}`,
      gold =
        fee +
        (!trainedWeaponOneHanded(type) && !trainedWeaponRanged(type) ? 10 : 0),
      profession = trainedWeaponRanged(type)
        ? ("engineering" as const)
        : ("blacksmithing" as const),
      name = `${["Campmade", "Riveted", "Fitted", "Masterwork"][rank - 1]} ${itemNames[type]}`;
    add(
      id,
      name,
      type,
      Math.max(level, WEAPON_TRAINING[type].level),
      trainedWeaponOneHanded(type) || trainedWeaponRanged(type)
        ? axePower
        : polearmPower,
      bonus,
      { type: "craft", profession, skill, recipe },
      Math.floor(gold / 2),
    );
    TRAINED_WEAPON_RECIPES.push({
      id: recipe,
      name,
      profession,
      icon: WEAPON_TRAINING[type].icon,
      description: WEAPON_TRAINING[type].description,
      skill,
      trainingRank: rank as TrainingRank,
      gold,
      cost: trainedWeaponOneHanded(type)
        ? { ore: 8, leather: 2 }
        : { ore: trainedWeaponRanged(type) ? 8 : 10, cloth: 2 },
      output: id,
      quantity: 1,
    });
  }
for (const [
  zone,
  axeStage,
  polearmStage,
  prefix,
  level,
  axePower,
  polearmPower,
  bonus,
] of [
  ["deadmines", 0, 1, "Ironclad", 10, 19, 22, 4],
  ["ragefire", 1, 3, "Emberwatch", 10, 20, 23, 4],
  ["shadowfang", 1, 2, "Moonwatch", 15, 24, 28, 5],
] as const)
  for (const type of ADVANCED_WEAPON_TYPES)
    add(
      `${zone}_${type}`,
      `${prefix} ${itemNames[type]}`,
      type,
      level,
      trainedWeaponOneHanded(type) || trainedWeaponRanged(type)
        ? axePower
        : polearmPower,
      bonus,
      {
        type: "dungeon",
        zone,
        stage:
          trainedWeaponOneHanded(type) || type === "gun"
            ? axeStage
            : polearmStage,
      },
      level * 5 + 30,
    );
export const trainedWeaponDungeonLoot = (zone: string, stage: number) =>
  Object.entries(TRAINED_WEAPON_SOURCES)
    .filter(
      ([, s]) => s.type === "dungeon" && s.zone === zone && s.stage === stage,
    )
    .map(([id]) => id);
