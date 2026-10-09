import type { GearDef, Recipe, ZoneDef } from "./content";
import type { DungeonStage } from "./dungeon";

export const ENDGAME_ZONES: ZoneDef[] = [
  {
    id: "scarlet",
    name: "Scarlet Monastery",
    subtitle: "The last cathedral",
    description:
      "Cross the library and armory, then break the command of Mograine and Whitemane. Four connected guardian rooms conclude the northern road.",
    difficulty: 2,
    duration: 360,
    palette: ["#423130", "#5b423b", "#292326", "#ad8a65", "#dcbd8a"],
    enemies: ["defias", "cultist", "dusk_mage"],
    boss: "High Inquisitor Whitemane",
    unlock: -2,
    prerequisite: "duskwood",
    minLevel: 25,
    unlockText: "Clear Duskwood; character level 25 to enter",
    icon: "sun",
    reward: "Cathedral relics",
    dungeon: true,
  },
  {
    id: "plaguelands",
    name: "Eastern Plaguelands",
    subtitle: "A light beyond the blight",
    description:
      "Escort the last beacons through the blighted wilderness. Survive the Scourge's shadow storms and confront the original survivor guardian, the Blight Herald.",
    difficulty: 2.25,
    duration: 600,
    palette: ["#35372d", "#484635", "#222b29", "#91875e", "#bdc98b"],
    enemies: ["ghoul", "skeleton", "wraith"],
    boss: "Blight Herald",
    unlock: -2,
    prerequisite: "scarlet",
    minLevel: 40,
    unlockText: "Clear Scarlet Monastery; character level 40 to enter",
    icon: "leaf",
    reward: "Dawnward equipment",
  },
];
export const SCARLET_STAGES: DungeonStage[] = [
  {
    id: "scarlet-library",
    name: "The Library",
    description: "Silence Arcanist Doan's unstable wards.",
    duration: 75,
    bounds: { x: 720, y: 600 },
    boss: "Arcanist Doan",
    enemy: "dusk_mage",
    baseHealth: 70,
    enemies: ["cultist", "dusk_mage", "defias"],
    tactic: "Escape Arcane Detonation. Move between the arcane lanes.",
    loot: ["cathedral_focus", "cathedral_cloak"],
    gold: 110,
    materials: { dream_dust: 4 },
  },
  {
    id: "scarlet-armory",
    name: "The Armory",
    description: "Hold the training floor against Herod.",
    duration: 90,
    bounds: { x: 650, y: 650 },
    boss: "Herod",
    enemy: "smite",
    baseHealth: 90,
    enemies: ["defias", "blackguard", "golem"],
    tactic: "Leave Blades of Light until the spin ends. Sidestep the charge.",
    loot: ["cathedral_blade", "cathedral_ring"],
    gold: 110,
    materials: { mithril_ore: 4 },
  },
  {
    id: "scarlet-command",
    name: "The Commander's Hall",
    description: "Break Scarlet Commander Mograine's first stand.",
    duration: 90,
    bounds: { x: 650, y: 700 },
    boss: "Scarlet Commander Mograine",
    enemy: "defias",
    baseHealth: 82,
    enemies: ["blackguard", "defias", "cultist"],
    tactic: "Sidestep the crusader lanes and avoid the consecrated ground.",
    loot: ["cathedral_blade", "cathedral_cloak"],
    gold: 120,
    materials: { mageweave_cloth: 4 },
  },
  {
    id: "scarlet-cathedral",
    name: "The Cathedral",
    description:
      "Whitemane calls the fallen commander back for one final stand.",
    duration: 105,
    bounds: { x: 720, y: 720 },
    boss: "High Inquisitor Whitemane",
    enemy: "dusk_mage",
    baseHealth: 78,
    enemies: ["cultist", "blackguard", "dusk_mage"],
    tactic:
      "At half health, defeat the resurrected commander before Whitemane can fall. Avoid the spreading holy circles.",
    loot: ["cathedral_focus", "cathedral_ring"],
    gold: 220,
    materials: { dream_dust: 5, mageweave_cloth: 5 },
  },
];
export const ENDGAME_GEAR: GearDef[] = [
  {
    id: "cathedral_blade",
    name: "Dawnward Crusader Blade",
    slot: "weapon",
    icon: "sword",
    rarity: "epic",
    stats: { power: 27, crit: 5 },
    attributes: { strength: 12, stamina: 8 },
    resistances: { shadow: 12 },
    classes: ["warrior", "paladin", "rogue", "hunter"],
    weaponHands: 1,
    weaponType: "sword",
    level: 25,
    value: 240,
    description: "An original relic of the northern cathedral.",
  },
  {
    id: "cathedral_focus",
    name: "Dawnward Scripture",
    slot: "offhand",
    icon: "book",
    rarity: "epic",
    stats: { power: 14, regen: 0.6 },
    attributes: { intellect: 12, spirit: 8 },
    resistances: { arcane: 12 },
    offhandType: "focus",
    classes: ["mage", "priest", "warlock", "druid"],
    level: 25,
    value: 220,
    description: "An original relic of the library and cathedral.",
  },
  {
    id: "cathedral_ring",
    name: "Seal of the Last Dawn",
    slot: "finger1",
    icon: "ring",
    rarity: "epic",
    stats: { haste: 8, health: 28 },
    attributes: { agility: 8, stamina: 8 },
    resistances: { fire: 12 },
    level: 25,
    value: 200,
    description: "A guardian's seal, worn independently of another copy.",
  },
  {
    id: "cathedral_cloak",
    name: "Cloak of the Last Vigil",
    slot: "back",
    icon: "cape",
    rarity: "epic",
    stats: { armor: 7, health: 35 },
    attributes: { stamina: 10, spirit: 8 },
    resistances: { shadow: 15 },
    level: 25,
    value: 210,
    description: "A relic of the commander's hall.",
  },
  ...["cloth", "leather", "mail", "plate"].flatMap((armor, index) =>
    ["head", "chest", "hands", "boots", "shoulders", "legs"].map(
      (slot, piece) =>
        ({
          id: `dawnward_${armor}_${slot}`,
          name: `Dawnward ${armor[0].toUpperCase() + armor.slice(1)} ${slot}`,
          slot,
          icon: slot === "chest" ? "robe" : slot,
          rarity: "epic",
          armor,
          stats: { armor: 3 + index * 2, health: 15, power: 5 },
          attributes:
            index === 0
              ? { intellect: 6, spirit: 4 }
              : index === 1
                ? { agility: 6, stamina: 4 }
                : { strength: 6, stamina: 4 },
          resistances: {
            [["fire", "frost", "nature", "shadow", "arcane"][piece % 5]]: 8,
          },
          level: 40,
          value: 200,
          set: `dawnward_${armor}`,
          dropZones: ["plaguelands"],
          description:
            "Original endgame armor, discovered in the blighted wilderness or crafted at an Artisan workshop.",
        }) as GearDef,
    ),
  ),
  ...["timbermaw", "argent", "thorium"].map(
    (faction) =>
      ({
        id: `epilogue_${faction}`,
        name: `${faction === "timbermaw" ? "Grovekeeper" : faction === "argent" ? "Dawnkeeper" : "Roadkeeper"}'s Promise`,
        slot: "trinket",
        icon: "gem",
        rarity: "epic",
        stats: { power: 8, health: 30 },
        attributes: {
          strength: 4,
          agility: 4,
          stamina: 4,
          intellect: 4,
          spirit: 4,
        },
        resistances: { nature: 8, shadow: 8 },
        level: 40,
        value: 250,
        description:
          "A once-only reward for bringing a faction's northern story to its conclusion.",
      }) as GearDef,
  ),
];
export const ENDGAME_RECIPES: Recipe[] = ENDGAME_GEAR.filter((g) =>
  g.id.startsWith("dawnward_"),
).map((g) => ({
  id: `craft_${g.id}`,
  name: g.name,
  profession:
    g.armor === "cloth"
      ? "tailoring"
      : g.armor === "leather"
        ? "leatherworking"
        : "blacksmithing",
  icon: g.icon,
  description:
    "Craft endgame armor with primary attributes and magical resistance. Owned items can be crafted as independent copies.",
  cost: {
    [g.armor === "cloth" ? "cloth" : g.armor === "leather" ? "leather" : "ore"]:
      8,
    dust: 3,
  },
  gold: 120,
  skill: 250,
  trainingRank: 4,
  output: g.id,
  quantity: 1,
}));
