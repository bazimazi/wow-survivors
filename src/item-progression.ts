import { CLASSES, CLASS_MAP, GEAR, GEAR_MAP } from "./content";
import type { ClassId, Stats } from "./content";
import type { SaveData, RunRecord } from "./progression";
import { weaponTrainingAllows, WEAPON_TYPE_LABELS } from "./weapon-training";
import type { WeaponType } from "./weapon-training";
import { gearFitsSlot, offhandMultiplier, rangedMultiplier } from "./equipment";
import { materialFor, tierForLevel } from "./resources";
import { rolledProperties } from "./attributes";

export interface ItemState {
  condition: number;
  owner?: ClassId;
  affix?: AffixId;
  roll?: number;
}
export const AFFIXES = {
  force: { name: "of Force", stats: { power: 3 } },
  vitality: { name: "of Vitality", stats: { health: 9 } },
  guard: { name: "of Guarding", stats: { armor: 2 } },
  precision: { name: "of Precision", stats: { crit: 2 } },
  haste: { name: "of Haste", stats: { haste: 2 } },
  recovery: { name: "of Recovery", stats: { regen: 0.15 } },
} satisfies Record<string, { name: string; stats: Partial<Stats> }>;
export type AffixId = keyof typeof AFFIXES;
export interface WeaponPractice {
  item: string;
  type: WeaponType;
  skill: number;
  cap: number;
}
export interface EquipmentSnapshot {
  items: readonly string[];
  primary?: WeaponPractice;
  secondary?: WeaponPractice;
  ranged?: WeaponPractice;
}
export interface EquipmentProof {
  items: string[];
  weaponHits: Partial<Record<WeaponType, number>>;
  defeated?: boolean;
}
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const bounded = (value: unknown, fallback: number, cap: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(cap, Math.floor(value)))
    : fallback;
export const weaponSkillCap = (level: number) =>
  Math.min(300, Math.max(5, Math.floor(level) * 5));
export function knownWeaponTypes(
  s: SaveData,
  classId = s.selectedClass,
): WeaponType[] {
  return Object.keys(WEAPON_TYPE_LABELS).filter((type) =>
    GEAR.some(
      (g) =>
        g.weaponType === type &&
        (!g.classes || g.classes.includes(classId)) &&
        weaponTrainingAllows(classId, s.heroes[classId], g),
    ),
  ) as WeaponType[];
}
export function normalizeWeaponSkills(
  s: SaveData,
  classId: ClassId,
  raw: unknown,
) {
  const cap = weaponSkillCap(s.heroes[classId].level);
  // Missing pre-0.30 skills preserve established accuracy; explicit new records start at 1.
  return Object.fromEntries(
    knownWeaponTypes(s, classId).map((type) => [
      type,
      Math.max(1, bounded(record(raw)[type], raw === undefined ? cap : 1, cap)),
    ]),
  ) as Partial<Record<WeaponType, number>>;
}
const itemClassAllows = (id: string, classId: ClassId) => {
  const gear = GEAR_MAP[id],
    armors = ["cloth", "leather", "mail", "plate"];
  return (
    !!gear &&
    (!gear.classes || gear.classes.includes(classId)) &&
    (!gear.armor ||
      armors.indexOf(gear.armor) <= armors.indexOf(CLASS_MAP[classId].armor))
  );
};
const itemTier = (id: string) =>
  (GEAR_MAP[id]?.level || 1) >= 18 ? 4 : tierForLevel(GEAR_MAP[id]?.level || 1);
export function normalizeItemStates(
  s: SaveData,
  raw: unknown,
): Record<string, ItemState> {
  const states: Record<string, ItemState> = {};
  for (const id of s.inventory) {
    if (!Object.hasOwn(record(raw), id)) continue;
    const data = record(record(raw)[id]);
    const owner = CLASSES.find(
      (c) =>
        !protectedItem(id) && c.id === data.owner && itemClassAllows(id, c.id),
    )?.id;
    const affix =
      typeof data.affix === "string" &&
      Object.hasOwn(AFFIXES, data.affix) &&
      owner &&
      !protectedItem(id)
        ? (data.affix as AffixId)
        : undefined;
    states[id] = {
      condition: protectedItem(id) ? 100 : bounded(data.condition, 100, 100),
      ...(owner ? { owner } : {}),
      ...(affix ? { affix } : {}),
      ...(id.includes("~") &&
      typeof data.roll === "number" &&
      Number.isFinite(data.roll)
        ? { roll: bounded(data.roll, 0, 4294967295) }
        : {}),
    };
  }
  return states;
}
export function protectedItem(id: string) {
  return (
    id.startsWith("starter_") ||
    ["cloth", "leather", "mail", "plate"].includes(id)
  );
}
export const itemCondition = (s: SaveData, id: string) =>
  protectedItem(id) ? 100 : bounded(s.itemStates?.[id]?.condition, 100, 100);
export const itemOwner = (s: SaveData, id: string) => s.itemStates?.[id]?.owner;
export function attunementStats(id: string, affix: AffixId): Partial<Stats> {
  return Object.fromEntries(
    Object.entries(AFFIXES[affix].stats).map(([key, value]) => [
      key,
      value * itemTier(id),
    ]),
  );
}
export function itemAffixStats(s: SaveData, id: string): Partial<Stats> {
  const affix = s.itemStates?.[id]?.affix;
  const result = itemRoll(s, id)?.stats || {};
  if (!affix || !Object.hasOwn(AFFIXES, affix)) return result;
  for (const [key, value] of Object.entries(attunementStats(id, affix)))
    result[key as keyof Stats] = (result[key as keyof Stats] || 0) + value;
  return result;
}
export function itemRoll(s: SaveData, id: string) {
  const seed = s.itemStates?.[id]?.roll;
  return id.includes("~") && typeof seed === "number"
    ? rolledProperties(seed, itemTier(id))
    : null;
}
export function equipmentSnapshot(s: SaveData): EquipmentSnapshot {
  const classId = s.selectedClass,
    h = s.heroes[classId],
    items: string[] = [];
  const result: EquipmentSnapshot = { items };
  for (const [slot, id] of Object.entries(h.equipment)) {
    const gear = GEAR_MAP[id];
    if (
      !s.inventory.includes(id) ||
      !gearFitsSlot(gear, slot) ||
      h.level < (gear?.level || 1) ||
      !itemClassAllows(id, classId) ||
      !weaponTrainingAllows(classId, h, gear) ||
      (itemOwner(s, id) && itemOwner(s, id) !== classId) ||
      (slot === "offhand" && !offhandMultiplier(classId, h)) ||
      (slot === "ranged" && !rangedMultiplier(classId, h))
    )
      continue;
    items.push(id);
    if (!gear.weaponType || !itemCondition(s, id)) continue;
    const practice = {
      item: id,
      type: gear.weaponType,
      skill: bounded(
        h.weaponSkills?.[gear.weaponType],
        1,
        weaponSkillCap(h.level),
      ),
      cap: weaponSkillCap(h.level),
    };
    if (slot === "weapon") result.primary = practice;
    if (slot === "offhand") result.secondary = practice;
    if (slot === "ranged") result.ranged = practice;
  }
  return result;
}
export function weaponAccuracy(weapon: WeaponPractice, hits = 0): number {
  return (
    1 -
    Math.min(
      0.15,
      Math.max(
        0,
        weapon.cap - Math.min(weapon.cap, weapon.skill + Math.floor(hits / 8)),
      ) * 0.002,
    )
  );
}
export function settleEquipment(
  s: SaveData,
  run: RunRecord,
  worn = new Map<string, number>(),
) {
  const proof = run.equipmentProof;
  if (!proof || !Array.isArray(proof.items)) return;
  const h = s.heroes[run.classId];
  const items = [...new Set(proof.items)].filter(
    (id) =>
      typeof id === "string" &&
      s.inventory.includes(id) &&
      GEAR_MAP[id] &&
      (!itemOwner(s, id) || itemOwner(s, id) === run.classId),
  );
  const wear = Math.min(
    20,
    Math.floor(Math.max(0, run.time) / 60) * 3 +
      (proof.defeated === true ? 10 : 0),
  );
  for (const id of items) {
    if (protectedItem(id) || !wear) continue;
    const additional = Math.max(0, wear - (worn.get(id) || 0));
    worn.set(id, Math.max(wear, worn.get(id) || 0));
    s.itemStates[id] = {
      ...s.itemStates[id],
      condition: Math.max(0, itemCondition(s, id) - additional),
    };
  }
  for (const type of knownWeaponTypes(s, run.classId)) {
    if (!items.some((id) => GEAR_MAP[id].weaponType === type)) continue;
    const hits = bounded(
      record(proof.weaponHits)[type],
      0,
      Math.max(0, run.time) * 60,
    );
    h.weaponSkills[type] = Math.min(
      weaponSkillCap(h.level),
      (h.weaponSkills[type] || 1) + Math.floor(hits / 8),
    );
  }
}
export function repairQuote(s: SaveData, requested: readonly string[]) {
  const ids = [...new Set(requested)].filter(
    (id) =>
      s.inventory.includes(id) &&
      itemCondition(s, id) < 100 &&
      (!itemOwner(s, id) || itemOwner(s, id) === s.selectedClass),
  );
  return {
    ids,
    gold: ids.reduce(
      (sum, id) =>
        sum +
        Math.max(
          1,
          Math.ceil((GEAR_MAP[id].value * (100 - itemCondition(s, id))) / 500),
        ),
      0,
    ),
  };
}
export function repairItems(
  s: SaveData,
  requested: readonly string[],
  expectedGold: number,
): boolean {
  const quote = repairQuote(s, requested);
  if (!quote.ids.length || quote.gold !== expectedGold || s.gold < quote.gold)
    return false;
  s.gold -= quote.gold;
  for (const id of quote.ids)
    s.itemStates[id] = { ...s.itemStates[id], condition: 100 };
  return true;
}
export function affixQuote(s: SaveData, id: string, affix: string) {
  const gear = Object.hasOwn(GEAR_MAP, id) ? GEAR_MAP[id] : undefined;
  const tier = itemTier(id),
    dust = materialFor("dust", tier),
    count = 2 + tier;
  let restriction: string | null = null;
  if (!gear || !s.inventory.includes(id) || !Object.hasOwn(AFFIXES, affix))
    restriction = "Choose an owned item and an affix.";
  else if (protectedItem(id))
    restriction = "Starter equipment cannot be attuned.";
  else if (itemOwner(s, id) && itemOwner(s, id) !== s.selectedClass)
    restriction = `Soulbound to ${CLASS_MAP[itemOwner(s, id)!].name}.`;
  else if (
    !itemClassAllows(id, s.selectedClass) ||
    !weaponTrainingAllows(s.selectedClass, s.heroes[s.selectedClass], gear)
  )
    restriction = "This hero cannot use the item.";
  else if (s.heroes[s.selectedClass].level < (gear.level || 1))
    restriction = `Requires character level ${gear.level}.`;
  else if (
    CLASSES.some(
      (c) =>
        c.id !== s.selectedClass &&
        Object.values(s.heroes[c.id].equipment).includes(id),
    )
  )
    restriction = "Unequip this item from other heroes before binding it.";
  else if (s.itemStates[id]?.affix === affix) restriction = "Already attuned.";
  else if ((s.professions.enchanting || 0) < [1, 50, 125, 225][tier - 1])
    restriction = `Requires Enchanting ${[1, 50, 125, 225][tier - 1]}.`;
  else if (s.gold < tier * 25 || s.materials[dust] < count)
    restriction = "Not enough gold or dust.";
  return {
    gold: tier * 25,
    dust,
    count,
    skill: [1, 50, 125, 225][tier - 1],
    restriction,
  };
}
export function attuneItem(s: SaveData, id: string, affix: string): boolean {
  const quote = affixQuote(s, id, affix);
  if (quote.restriction) return false;
  s.gold -= quote.gold;
  s.materials[quote.dust] -= quote.count;
  s.itemStates[id] = {
    ...s.itemStates[id],
    condition: itemCondition(s, id),
    owner: s.selectedClass,
    affix: affix as AffixId,
  };
  return true;
}
export function buyAmmunition(s: SaveData): boolean {
  if (s.gold < 10 || s.ammunition > 9949) return false;
  s.gold -= 10;
  s.ammunition += 50;
  return true;
}
