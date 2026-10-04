import type { GearDef, Stats, Slot } from "./content";
import type { DungeonStage } from "./dungeon";
import type { WardrobeSource } from "./wardrobe";

export const SHADOWFANG_STAGES: DungeonStage[] = [
  {
    id: "haunted-hall",
    name: "The Haunted Dining Hall",
    description: "Drive the restless servants from the old Baron's hall.",
    duration: 75,
    bounds: { x: 700, y: 590 },
    boss: "Baron Silverlaine",
    enemy: "silverlaine",
    baseHealth: 44,
    enemies: ["keep_servitor", "keep_worgen", "keep_guard"],
    tactic: "Step inside the shadow ring. Leave the haunted circles.",
    loot: [
      "silverlaine_heirloom",
      "haunted_mantle",
      "servitor_cinch",
      "moonwatch_hauberk",
    ],
    gold: 60,
    materials: { cloth: 5, dust: 1 },
  },
  {
    id: "watch-chamber",
    name: "The Watch Commander's Chamber",
    description: "Break the spectral guard at the stairs to the battlements.",
    duration: 90,
    bounds: { x: 650, y: 650 },
    boss: "Commander Springvale",
    enemy: "springvale",
    baseHealth: 48,
    enemies: ["keep_guard", "keep_servitor", "keep_worgen"],
    tactic: "Leave the hammer circles. Move between the holy lanes.",
    loot: [
      "commanders_oath",
      "watchguard_gauntlets",
      "battlement_boots",
      "vigilant_edge",
    ],
    gold: 65,
    materials: { cloth: 4, dust: 2 },
  },
  {
    id: "worg-library",
    name: "The Worg-guarded Library",
    description: "Clear the lupine pack below Arugal's tower.",
    duration: 105,
    bounds: { x: 710, y: 570 },
    boss: "Fenrus the Devourer",
    enemy: "fenrus",
    baseHealth: 54,
    enemies: ["keep_worg", "keep_worgen", "keep_void"],
    tactic: "Sidestep the lunge. Escape the saliva blasts.",
    loot: [
      "fenrus_pelt_cloak",
      "lupine_tracker_legs",
      "moonhowl_longbow",
      "moonfang_girdle",
    ],
    gold: 70,
    materials: { leather: 5, dust: 1 },
  },
  {
    id: "moonlit-tower",
    name: "The Moonlit Tower",
    description: "End the archmage's hold on Shadowfang Keep.",
    duration: 120,
    bounds: { x: 640, y: 700 },
    boss: "Archmage Arugal",
    enemy: "arugal",
    baseHealth: 48,
    enemies: ["keep_void", "keep_worgen", "keep_guard"],
    tactic: "Dodge the void lanes. Leave the marked Shadow Port landing.",
    loot: [
      "moonlit_focus",
      "tower_staff",
      "dreadwatch_helm",
      "moonveil_raiment",
    ],
    gold: 110,
    materials: { cloth: 5, dust: 3 },
  },
];
export const SHADOWFANG_GEAR: GearDef[] = [];
export const SHADOWFANG_SOURCES: Record<string, WardrobeSource> = {};
function trophy(
  id: string,
  name: string,
  slot: Slot,
  icon: string,
  stats: Partial<Stats>,
  stage: number,
  armor?: GearDef["armor"],
  classes?: GearDef["classes"],
) {
  SHADOWFANG_GEAR.push({
    id,
    name,
    slot,
    icon,
    stats,
    armor,
    classes,
    rarity: "rare",
    level: 15,
    value: slot === "weapon" ? 125 : 100,
    description: "A hard-won keepsake from the haunted castle.",
  });
  SHADOWFANG_SOURCES[id] = { type: "dungeon", zone: "shadowfang", stage };
}
trophy(
  "silverlaine_heirloom",
  "Silverlaine's Heirloom",
  "trinket",
  "gem",
  { health: 26, regen: 0.4, armor: 4 },
  0,
);
trophy(
  "haunted_mantle",
  "Haunted Mantle",
  "shoulders",
  "shoulders",
  { power: 8, haste: 6, armor: 4 },
  0,
  "cloth",
);
trophy(
  "servitor_cinch",
  "Servitor's Cinch",
  "waist",
  "belt",
  { crit: 6, speed: 5, armor: 5 },
  0,
  "leather",
);
trophy(
  "moonwatch_hauberk",
  "Moonwatch Hauberk",
  "chest",
  "robe",
  { armor: 14, health: 28, haste: 5 },
  0,
  "mail",
);
trophy(
  "commanders_oath",
  "Commander's Oath",
  "trinket",
  "shield",
  { armor: 10, health: 35 },
  1,
);
trophy(
  "watchguard_gauntlets",
  "Watchguard Gauntlets",
  "hands",
  "gloves",
  { armor: 10, power: 9, haste: 4 },
  1,
  "plate",
);
trophy(
  "battlement_boots",
  "Battlement Boots",
  "boots",
  "boot",
  { health: 24, speed: 8, armor: 6 },
  1,
);
trophy(
  "vigilant_edge",
  "Vigilant Edge",
  "weapon",
  "sword",
  { power: 24, crit: 8 },
  1,
  undefined,
  ["warrior", "rogue", "paladin"],
);
trophy(
  "fenrus_pelt_cloak",
  "Fenrus's Pelt Cloak",
  "back",
  "cape",
  { crit: 7, speed: 6, armor: 5 },
  2,
);
trophy(
  "lupine_tracker_legs",
  "Lupine Tracker's Leggings",
  "legs",
  "legs",
  { power: 9, crit: 6, armor: 8, health: 18 },
  2,
  "leather",
);
trophy(
  "moonhowl_longbow",
  "Moonhowl Longbow",
  "weapon",
  "bow",
  { power: 26, haste: 6 },
  2,
  undefined,
  ["hunter"],
);
trophy(
  "moonfang_girdle",
  "Moonfang Girdle",
  "waist",
  "belt",
  { armor: 8, health: 24, haste: 5 },
  2,
  "mail",
);
trophy(
  "moonlit_focus",
  "Moonlit Focus",
  "trinket",
  "rune",
  { power: 18, haste: 8, regen: 0.3 },
  3,
);
trophy(
  "tower_staff",
  "Moonlit Tower Staff",
  "weapon",
  "staff",
  { power: 26, regen: 0.4 },
  3,
  undefined,
  ["mage", "priest", "druid", "warlock", "shaman"],
);
trophy(
  "dreadwatch_helm",
  "Dreadwatch Helm",
  "head",
  "helmet",
  { armor: 12, health: 32, crit: 5 },
  3,
  "plate",
);
trophy(
  "moonveil_raiment",
  "Moonveil Raiment",
  "chest",
  "robe",
  { power: 12, health: 24, haste: 7, armor: 6 },
  3,
  "cloth",
);

export const SHADOWFANG_SPRITES: Record<string, number> = {
  keep_worg: 0,
  keep_worgen: 1,
  keep_servitor: 2,
  keep_guard: 3,
  keep_void: 4,
  silverlaine: 5,
  springvale: 6,
  fenrus: 7,
  arugal: 8,
};
export const isSkinnable = (type: string) =>
  [
    "wolf",
    "keep_worg",
    "keep_worgen",
    "fenrus",
    "dusk_wolf",
    "dusk_worgen",
  ].includes(type);
