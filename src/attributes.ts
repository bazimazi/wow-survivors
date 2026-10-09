import type { Stats } from "./content";

export const ATTRIBUTE_KEYS = [
  "strength",
  "agility",
  "stamina",
  "intellect",
  "spirit",
] as const;
export const RESISTANCE_KEYS = [
  "fire",
  "frost",
  "nature",
  "shadow",
  "arcane",
] as const;
export type Attribute = (typeof ATTRIBUTE_KEYS)[number];
export type DamageSchool = (typeof RESISTANCE_KEYS)[number] | "physical";
export type Attributes = Record<Attribute, number>;
export type Resistances = Record<(typeof RESISTANCE_KEYS)[number], number>;
export const emptyAttributes = (): Attributes =>
  Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, 0])) as Attributes;
export const emptyResistances = (): Resistances =>
  Object.fromEntries(RESISTANCE_KEYS.map((key) => [key, 0])) as Resistances;
export function attributeBonuses(a: Attributes): Partial<Stats> {
  return {
    power: a.strength * 0.5 + a.intellect * 0.5,
    crit: a.agility * 0.2,
    speed: a.agility * 0.1,
    health: a.stamina * 3,
    regen: a.spirit * 0.04,
  };
}
export function resistanceMultiplier(resistance: number): number {
  return (
    1 -
    Math.min(
      0.6,
      Math.max(0, Number.isFinite(resistance) ? resistance : 0) / 100,
    )
  );
}
export function rolledProperties(seed: number, tier: number) {
  const statKeys = [
    "power",
    "health",
    "armor",
    "haste",
    "crit",
    "regen",
  ] as const;
  const stat = statKeys[seed % statKeys.length],
    amount = [2, 6, 1, 1.5, 1, 0.1][seed % statKeys.length] * tier;
  return {
    stats: { [stat]: amount } as Partial<Stats>,
    attributes: {
      [ATTRIBUTE_KEYS[Math.floor(seed / 7) % 5]]: tier * 2,
    } as Partial<Attributes>,
    resistances: {
      [RESISTANCE_KEYS[Math.floor(seed / 37) % 5]]: tier * 3,
    } as Partial<Resistances>,
  };
}
