import type { ProfessionId } from "./content";

export type TradeId = ProfessionId | "firstaid" | "cooking" | "fishing";
export type TrainingRank = 1 | 2 | 3 | 4;
export const TRAINING_RANKS = [
  {
    rank: 1 as TrainingRank,
    name: "Apprentice",
    cap: 75,
    skill: 1,
    level: 1,
    gold: 0,
  },
  {
    rank: 2 as TrainingRank,
    name: "Journeyman",
    cap: 150,
    skill: 50,
    level: 5,
    gold: 30,
  },
  {
    rank: 3 as TrainingRank,
    name: "Expert",
    cap: 225,
    skill: 125,
    level: 10,
    gold: 90,
  },
  {
    rank: 4 as TrainingRank,
    name: "Artisan",
    cap: 300,
    skill: 200,
    level: 20,
    gold: 180,
  },
] as const;
export const SECONDARY_TRADES = [
  {
    id: "firstaid" as const,
    name: "First Aid",
    icon: "heart",
    description: "Craft healing supplies from cloth.",
  },
  {
    id: "cooking" as const,
    name: "Cooking",
    icon: "fish",
    description: "Meals grant +15 health for one expedition.",
  },
  {
    id: "fishing" as const,
    name: "Fishing",
    icon: "fish",
    description: "Walk to pools to catch fish and practice.",
  },
];
export const SPECIALIZATION_REQUIREMENTS = {
  skill: 150,
  rank: 3,
  level: 12,
  gold: 100,
} as const;
export type SpecializationId =
  | "armorsmith"
  | "weaponsmith"
  | "gnomish"
  | "goblin"
  | "elemental"
  | "tribal"
  | "dragonscale";
export interface ProfessionSpecialization {
  id: SpecializationId;
  profession: ProfessionId;
  name: string;
  icon: string;
  description: string;
  recipeId: string;
}
export const SPECIALIZATIONS: ProfessionSpecialization[] = [
  {
    id: "armorsmith",
    profession: "blacksmithing",
    name: "Armorsmith",
    icon: "shield",
    description: "Forge a plate cuirass for health, armor and attack speed.",
    recipeId: "craft_bastion_cuirass",
  },
  {
    id: "weaponsmith",
    profession: "blacksmithing",
    name: "Weaponsmith",
    icon: "sword",
    description:
      "Forge a melee weapon for damage, critical chance and attack speed.",
    recipeId: "craft_tempered_edge",
  },
  {
    id: "gnomish",
    profession: "engineering",
    name: "Gnomish Engineer",
    icon: "gear",
    description:
      "Build precision goggles for critical chance, attack speed and collecting experience.",
    recipeId: "craft_precision_goggles",
  },
  {
    id: "goblin",
    profession: "engineering",
    name: "Goblin Engineer",
    icon: "bomb",
    description:
      "Assemble economical batches of nine bombs for dangerous surrounds.",
    recipeId: "goblin_bomb_crate",
  },
  {
    id: "elemental",
    profession: "leatherworking",
    name: "Elemental Leatherworker",
    icon: "lightning",
    description: "Craft a leather hood for damage, attack speed and armor.",
    recipeId: "craft_stormhide_hood",
  },
  {
    id: "tribal",
    profession: "leatherworking",
    name: "Tribal Leatherworker",
    icon: "paw",
    description:
      "Craft a spirit talisman for health, regeneration and critical chance.",
    recipeId: "craft_spirit_talisman",
  },
  {
    id: "dragonscale",
    profession: "leatherworking",
    name: "Dragonscale Leatherworker",
    icon: "shield",
    description: "Craft scale mail for armor, health and critical chance.",
    recipeId: "craft_scaleguard_vest",
  },
];
export function rankForSkill(skill: number): TrainingRank {
  return (TRAINING_RANKS.find((r) => skill <= r.cap) || TRAINING_RANKS[3]).rank;
}
