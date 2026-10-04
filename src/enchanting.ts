import { gradedCosts } from "./resources";
import type { Material, Slot, Stats } from "./content";

export interface Enchantment {
  id: string;
  name: string;
  slot: Slot;
  skill: number;
  gold: number;
  costs: Partial<Record<Material, number>>;
  stats: Partial<Stats>;
}
export const ENCHANTMENTS: Enchantment[] = [
  {
    id: "weapon_force",
    name: "Lesser Force",
    slot: "weapon",
    skill: 1,
    gold: 15,
    costs: { dust: 2 },
    stats: { power: 6 },
  },
  {
    id: "chest_vitality",
    name: "Lesser Vitality",
    slot: "chest",
    skill: 1,
    gold: 15,
    costs: { dust: 2, cloth: 2 },
    stats: { health: 12 },
  },
  {
    id: "hands_quickness",
    name: "Quickened Hands",
    slot: "hands",
    skill: 50,
    gold: 25,
    costs: { dust: 3, ore: 1 },
    stats: { haste: 3 },
  },
  {
    id: "boots_stride",
    name: "Trail Stride",
    slot: "boots",
    skill: 50,
    gold: 25,
    costs: { dust: 3, leather: 1 },
    stats: { speed: 4 },
  },
  {
    id: "weapon_precision",
    name: "Focused Precision",
    slot: "weapon",
    skill: 125,
    gold: 45,
    costs: { dust: 5, ore: 2 },
    stats: { crit: 5 },
  },
  {
    id: "chest_ward",
    name: "Ironward",
    slot: "chest",
    skill: 125,
    gold: 45,
    costs: { dust: 5, cloth: 3 },
    stats: { armor: 5 },
  },
  {
    id: "hands_force",
    name: "Battlewoven Hands",
    slot: "hands",
    skill: 125,
    gold: 45,
    costs: { dust: 5, leather: 3 },
    stats: { power: 5 },
  },
  {
    id: "boots_seeking",
    name: "Seeker's Reach",
    slot: "boots",
    skill: 125,
    gold: 45,
    costs: { dust: 5, leather: 3 },
    stats: { magnet: 12 },
  },
  {
    id: "weapon_swiftness",
    name: "Greater Swiftness",
    slot: "weapon",
    skill: 225,
    gold: 80,
    costs: { dust: 8, ore: 4 },
    stats: { haste: 7 },
  },
  {
    id: "chest_aegis",
    name: "Greater Aegis",
    slot: "chest",
    skill: 225,
    gold: 80,
    costs: { dust: 8, cloth: 6 },
    stats: { health: 32, armor: 3 },
  },
  {
    id: "hands_precision",
    name: "Surehand",
    slot: "hands",
    skill: 225,
    gold: 80,
    costs: { dust: 8, leather: 6 },
    stats: { crit: 7 },
  },
  {
    id: "boots_wayfarer",
    name: "Wayfarer's Grace",
    slot: "boots",
    skill: 225,
    gold: 80,
    costs: { dust: 8, herbs: 4 },
    stats: { speed: 7, regen: 0.3 },
  },
];
for (const formula of ENCHANTMENTS)
  formula.costs = gradedCosts(formula.costs, formula.skill);
export const ENCHANTMENT_MAP = Object.fromEntries(
  ENCHANTMENTS.map((e) => [e.id, e]),
);
