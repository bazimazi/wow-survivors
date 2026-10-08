import { weaponTrainingAllows, WEAPON_TYPE_LABELS } from "./weapon-training";
import type { AdvancedWeaponType } from "./weapon-training";
import { SLOT_LABELS, GEAR_MAP } from "./content";
import type { ClassId, GearDef, Slot } from "./content";
import {
  secondaryWeapon,
  dualWieldClass,
  DUAL_WIELD_RULES,
} from "./dual-wield";

export const RING_SLOTS = ["finger1", "finger2"] as const;
export const isRingSlot = (slot: string): slot is (typeof RING_SLOTS)[number] =>
  (RING_SLOTS as readonly string[]).includes(slot);
export function gearFitsSlot(gear: GearDef | undefined, slot: string): boolean {
  return (
    !!gear &&
    (gear.slot === slot ||
      (isRingSlot(gear.slot) && isRingSlot(slot)) ||
      (slot === "ranged" && !!gear.rangedType) ||
      (slot === "offhand" && secondaryWeapon(gear)))
  );
}
export function gearSlotLabel(slot: Slot): string {
  return isRingSlot(slot) ? "Ring" : SLOT_LABELS[slot];
}

export function hasOneHandedWeapon(
  equipment: Partial<Record<Slot, string>>,
): boolean {
  return GEAR_MAP[equipment.weapon || ""]?.weaponHands === 1;
}
export function displacedOffhand(
  equipment: Partial<Record<Slot, string>>,
  gear: GearDef | undefined,
  target: Slot = gear?.slot || "weapon",
): string | undefined {
  return (target === "weapon" && gear?.weaponHands === 2) ||
    (target === "ranged" && !!gear && equipment.weapon === gear.id)
    ? equipment.offhand
    : undefined;
}
export function rangedMultiplier(
  classId: ClassId,
  hero: {
    level: number;
    equipment: Partial<Record<Slot, string>>;
    weaponTraining?: readonly AdvancedWeaponType[];
  },
): number {
  const g = GEAR_MAP[hero.equipment.ranged || ""];
  return g?.rangedType &&
    weaponTrainingAllows(classId, hero, g) &&
    hero.level >= (g.level || 1) &&
    (!g.classes || g.classes.includes(classId)) &&
    g.id !== hero.equipment.weapon &&
    g.id !== hero.equipment.offhand
    ? 1
    : 0;
}
export function offhandMultiplier(
  classId: ClassId,
  hero: {
    level: number;
    dualWield: boolean;
    weaponTraining?: readonly AdvancedWeaponType[];
    equipment: Partial<Record<Slot, string>>;
  },
): number {
  const main = GEAR_MAP[hero.equipment.weapon || ""],
    held = GEAR_MAP[hero.equipment.offhand || ""];
  if (
    !main ||
    !held ||
    !weaponTrainingAllows(classId, hero, main) ||
    !weaponTrainingAllows(classId, hero, held) ||
    main.weaponHands !== 1 ||
    main.id === held.id ||
    hero.level < (main.level || 1) ||
    hero.level < (held.level || 1) ||
    (main.classes && !main.classes.includes(classId)) ||
    (held.classes && !held.classes.includes(classId))
  )
    return 0;
  if (held.slot === "offhand") return 1;
  return secondaryWeapon(held) &&
    dualWieldClass(classId) &&
    hero.dualWield === true &&
    hero.level >= DUAL_WIELD_RULES.level
    ? DUAL_WIELD_RULES.factor
    : 0;
}
export function gearUseLabel(gear: GearDef, slot: Slot = gear.slot): string {
  if (slot === "ranged" && gear.rangedType)
    return `Ranged · ${gear.rangedType === "thrown" ? "Thrown set" : gear.rangedType === "wand" ? "Wand" : gear.rangedType === "gun" ? "Gun" : gear.rangedType === "crossbow" ? "Crossbow" : "Bow"} · 100% item/enchantment bonuses · independent of weapon hands`;
  if (slot === "offhand" && secondaryWeapon(gear))
    return "Off-hand · Secondary weapon · 50% item/enchantment bonuses · requires Dual Wield and one-handed weapon";
  if (gear.slot === "weapon")
    return `Weapon · ${gear.weaponType ? WEAPON_TYPE_LABELS[gear.weaponType] + " · " : ""}${gear.weaponHands === 2 ? "Two-handed · occupies off-hand" : "One-handed"}`;
  if (gear.slot === "offhand")
    return `Off-hand · ${gear.offhandType === "shield" ? "Shield" : "Held focus"} · requires one-handed weapon`;
  return gearSlotLabel(gear.slot);
}
