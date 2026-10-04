export const RESOURCE_IDS = {
  herbs: ["herbs", "briarthorn", "kingsblood", "sungrass"],
  ore: ["ore", "tin_ore", "iron_ore", "mithril_ore"],
  leather: ["leather", "medium_leather", "heavy_leather", "thick_leather"],
  cloth: ["cloth", "wool_cloth", "silk_cloth", "mageweave_cloth"],
  dust: ["dust", "soul_dust", "vision_dust", "dream_dust"],
  fish: ["fish", "catfish", "mithril_trout", "yellowtail"],
} as const;
export type MaterialFamily = keyof typeof RESOURCE_IDS;
export type Material = (typeof RESOURCE_IDS)[MaterialFamily][number];
export type ResourceTier = 1 | 2 | 3 | 4;
export type GatheringTrade = "herbalism" | "mining" | "skinning" | "fishing";
export type NodeFamily = "herbs" | "ore" | "fish";
export const RESOURCE_FAMILIES = Object.keys(RESOURCE_IDS) as MaterialFamily[];
export const RESOURCE_TIERS = [
  { tier: 1, skill: 1, level: 1, trivial: 50, label: "I", range: "Near camp" },
  {
    tier: 2,
    skill: 50,
    level: 5,
    trivial: 125,
    label: "II",
    range: "Outer trails",
  },
  {
    tier: 3,
    skill: 125,
    level: 10,
    trivial: 225,
    label: "III",
    range: "Far reaches",
  },
  {
    tier: 4,
    skill: 225,
    level: 20,
    trivial: 300,
    label: "IV",
    range: "Frontier",
  },
] as const;
export const FAMILY_INFO = {
  herbs: {
    name: "Herbs",
    icon: "leaf",
    color: "#9bbe8b",
    trade: "herbalism",
    source: "Gather herb nodes with Herbalism.",
  },
  ore: {
    name: "Ore",
    icon: "pickaxe",
    color: "#ca9b6f",
    trade: "mining",
    source: "Gather deposits with Mining; dungeon rooms also provide ore.",
  },
  leather: {
    name: "Leather",
    icon: "paw",
    color: "#c8ad83",
    trade: "skinning",
    source:
      "Skin defeated wolves and worgen outdoors or in Shadowfang Keep. Your skill and character level set the usable grade.",
  },
  cloth: {
    name: "Cloth",
    icon: "robe",
    color: "#c7c5b7",
    trade: null,
    source:
      "Drops from non-wolf enemies. Higher grades appear later in expeditions.",
  },
  dust: {
    name: "Dust",
    icon: "spark",
    color: "#ac99d2",
    trade: null,
    source:
      "Disenchant unequipped items; equipment levels 1 / 5 / 10 / 18 determine the grade. Artisan gear yields Dream Dust. Tirisfal encounters also grant dust.",
  },
  fish: {
    name: "Fish",
    icon: "fish",
    color: "#87bfc9",
    trade: "fishing",
    source:
      "Walk to fishing pools. Fishing is a secondary trade for every hero.",
  },
} as const;
const names = {
  herbs: ["Peacebloom", "Briarthorn", "Kingsblood", "Sungrass"],
  ore: ["Copper Ore", "Tin Ore", "Iron Ore", "Mithril Ore"],
  leather: [
    "Light Leather",
    "Medium Leather",
    "Heavy Leather",
    "Thick Leather",
  ],
  cloth: ["Linen Cloth", "Wool Cloth", "Silk Cloth", "Mageweave Cloth"],
  dust: ["Strange Dust", "Soul Dust", "Vision Dust", "Dream Dust"],
  fish: [
    "Smallfish",
    "Bristle Whisker Catfish",
    "Mithril Head Trout",
    "Spotted Yellowtail",
  ],
};
export interface MaterialDef {
  name: string;
  icon: string;
  color: string;
  family: MaterialFamily;
  tier: ResourceTier;
}
export const MATERIALS = Object.fromEntries(
  RESOURCE_FAMILIES.flatMap((family) =>
    RESOURCE_IDS[family].map((id, i): [Material, MaterialDef] => [
      id,
      {
        icon: FAMILY_INFO[family].icon,
        color: FAMILY_INFO[family].color,
        name: names[family][i],
        family,
        tier: (i + 1) as ResourceTier,
      },
    ]),
  ),
) as Record<Material, MaterialDef>;
export const materialFor = (family: MaterialFamily, tier: number): Material =>
  RESOURCE_IDS[family][Math.max(0, Math.min(3, Math.floor(tier) - 1))];
export const tierForSkill = (skill: number): ResourceTier =>
  skill >= 225 ? 4 : skill >= 125 ? 3 : skill >= 50 ? 2 : 1;
export const tierForLevel = (level: number): ResourceTier =>
  level >= 20 ? 4 : level >= 10 ? 3 : level >= 5 ? 2 : 1;
export const zoneResourceTier = (zone: string): ResourceTier =>
  zone === "tirisfal" || zone === "duskwood" ? 4 : zone === "elwynn" ? 2 : 3;
export const distanceTier = (distance: number): ResourceTier =>
  distance < 700 ? 1 : distance < 1300 ? 2 : distance < 1900 ? 3 : 4;
export function gradedCosts(
  costs: Partial<Record<Material, number>>,
  skill: number,
): Partial<Record<Material, number>> {
  return Object.fromEntries(
    Object.entries(costs).map(([id, n]) => [
      materialFor(MATERIALS[id as Material].family, tierForSkill(skill)),
      n,
    ]),
  );
}
export function gatheringRestriction(
  id: Material,
  skill: number,
  level: number,
): string | null {
  const m = MATERIALS[id],
    trade = FAMILY_INFO[m.family].trade;
  if (!trade) return "This material is recovered from loot.";
  if (!skill)
    return `Learn ${trade[0].toUpperCase() + trade.slice(1)} in Professions.`;
  const tier = RESOURCE_TIERS[m.tier - 1];
  if (level < tier.level) return `Requires character level ${tier.level}.`;
  if (skill < tier.skill)
    return `Requires ${trade[0].toUpperCase() + trade.slice(1)} ${tier.skill}.`;
  return null;
}
export function gatheringPractice(
  id: Material,
  skill: number,
  cap: number,
): number {
  const tier = RESOURCE_TIERS[MATERIALS[id].tier - 1];
  return skill >= tier.skill && skill < tier.trivial && skill < cap ? 1 : 0;
}
