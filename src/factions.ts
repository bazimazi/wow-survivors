export type FactionId = "timbermaw" | "thorium" | "argent";
export interface Faction {
  id: FactionId;
  name: string;
  zoneId: string;
  icon: string;
  color: string;
  title: string;
  description: string;
}
export const FACTIONS: Faction[] = [
  {
    id: "timbermaw",
    name: "Timbermaw Hold",
    zoneId: "elwynn",
    icon: "paw",
    color: "#9fc28d",
    title: "Keep the trails safe.",
    description:
      "A visiting envoy asks you to protect the forest paths and recover the wisdom hidden among their stones.",
  },
  {
    id: "thorium",
    name: "Thorium Brotherhood",
    zoneId: "westfall",
    icon: "anvil",
    color: "#dfa66e",
    title: "Earn your place at the forge.",
    description:
      "The camp's smiths need safe supply routes through the fields. They reward dependable adventurers with their finest work.",
  },
  {
    id: "argent",
    name: "Argent Dawn",
    zoneId: "tirisfal",
    icon: "sun",
    color: "#d9c783",
    title: "Carry a light into the dark.",
    description:
      "An Argent emissary gathers volunteers to reclaim lost ground and break the grip of the restless dead.",
  },
];
export const REPUTATION_TIERS = [
  { name: "Neutral", points: 0 },
  { name: "Friendly", points: 150 },
  { name: "Honored", points: 500 },
  { name: "Revered", points: 1100 },
  { name: "Exalted", points: 2000 },
] as const;
export const REPUTATION_CAP = 2000;
export function reputationStanding(points: number) {
  const index = REPUTATION_TIERS.filter((t) => points >= t.points).length - 1;
  const tier = REPUTATION_TIERS[Math.max(0, index)];
  const next = REPUTATION_TIERS[Math.max(0, index) + 1];
  return {
    ...tier,
    next,
    progress: next
      ? Math.max(
          0,
          Math.min(1, (points - tier.points) / (next.points - tier.points)),
        )
      : 1,
  };
}
export interface Commission {
  id: string;
  faction: FactionId;
  zoneId: string;
  name: string;
  description: string;
  metric: "kills" | "encounters" | "victory";
  goal: number;
  gold: number;
  xp: number;
  reputation: number;
  icon: string;
}
export const COMMISSIONS: Commission[] = FACTIONS.flatMap((f, i) => [
  {
    id: `${f.id}_patrol`,
    faction: f.id,
    zoneId: f.zoneId,
    name: ["Forest Watch", "Supply Road Patrol", "The Restless Dead"][i],
    description: [
      "Defeat enemies along Elwynn's forest trails.",
      "Clear enemies from the fields of Westfall.",
      "Thin the hostile ranks in Tirisfal.",
    ][i],
    metric: "kills" as const,
    goal: [150, 240, 300][i],
    gold: 70,
    xp: 80,
    reputation: 65,
    icon: "sword",
  },
  {
    id: `${f.id}_survey`,
    faction: f.id,
    zoneId: f.zoneId,
    name: ["Wisdom of the Woods", "Field Recovery", "Lights in the Gloom"][i],
    description:
      "Complete three landmarks in this zone, across any number of expeditions.",
    metric: "encounters" as const,
    goal: 3,
    gold: 90,
    xp: 100,
    reputation: 90,
    icon: "compass",
  },
  {
    id: `${f.id}_boss`,
    faction: f.id,
    zoneId: f.zoneId,
    name: ["Break the Pack", "A Captain's Reckoning", "Silence the Grave"][i],
    description: [
      "Defeat Hogger at the end of an Elwynn expedition.",
      "Defeat the Defias Captain at the end of a Westfall expedition.",
      "Defeat the Gravekeeper at the end of a Tirisfal expedition.",
    ][i],
    metric: "victory" as const,
    goal: 1,
    gold: 120,
    xp: 140,
    reputation: 120,
    icon: "crown",
  },
]);
export interface QuartermasterOffer {
  id: string;
  faction: FactionId;
  points: number;
  gold: number;
  gearId?: string;
  recipeId?: string;
  campaign?: FactionId;
}
export const QUARTERMASTER_OFFERS: QuartermasterOffer[] = [
  {
    id: "timbermaw_token",
    faction: "timbermaw",
    points: 150,
    gold: 140,
    gearId: "trail_token",
  },
  {
    id: "timbermaw_boots",
    faction: "timbermaw",
    points: 1100,
    gold: 280,
    gearId: "woodland_stride",
  },
  {
    id: "timbermaw_pattern",
    faction: "timbermaw",
    points: 500,
    gold: 75,
    recipeId: "craft_trailguard",
  },
  {
    id: "thorium_token",
    faction: "thorium",
    points: 150,
    gold: 140,
    gearId: "forge_token",
  },
  {
    id: "thorium_boots",
    faction: "thorium",
    points: 1100,
    gold: 280,
    gearId: "forge_march",
  },
  {
    id: "thorium_pattern",
    faction: "thorium",
    points: 500,
    gold: 75,
    recipeId: "craft_forgeguard",
  },
  {
    id: "argent_token",
    faction: "argent",
    points: 150,
    gold: 140,
    gearId: "dawn_token",
  },
  {
    id: "argent_boots",
    faction: "argent",
    points: 1100,
    gold: 280,
    gearId: "dawn_stride",
  },
  {
    id: "argent_pattern",
    faction: "argent",
    points: 500,
    gold: 75,
    recipeId: "craft_lantern_hood",
  },
  ...(["timbermaw", "thorium", "argent"] as FactionId[]).map((faction) => ({
    id: `${faction}_exalted`,
    faction,
    points: 2000,
    gold: 500,
    gearId: `exalted_${faction}_trinket`,
    campaign: faction,
  })),
];
