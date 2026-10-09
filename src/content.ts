import {
  TRAINED_WEAPON_GEAR,
  TRAINED_WEAPON_RECIPES,
  LEGACY_WEAPON_TYPES,
} from "./weapon-training";
import type { WeaponType } from "./weapon-training";
import { MATERIALS, gradedCosts } from "./resources";
export { MATERIALS } from "./resources";
export type { Material } from "./resources";
import type { Material } from "./resources";
import { instanceCatalog } from "./item-instances";
import type { Attributes, Resistances } from "./attributes";
import { RAGEFIRE_GEAR } from "./ragefire";
import { DUSKWOOD_GEAR, DUSKWOOD_ZONE } from "./duskwood";
import { ENDGAME_GEAR, ENDGAME_RECIPES, ENDGAME_ZONES } from "./endgame";
import { SHADOWFANG_GEAR } from "./shadowfang";
import { CAMPAIGN_GEAR } from "./campaigns";
import { PROFESSION_MASTERY_GEAR } from "./profession-quests";
import { CLASS_TECHNIQUES } from "./spellbook";
import { ACCESSORY_GEAR, ACCESSORY_RECIPES } from "./accessories";
import { NECKLACE_GEAR } from "./necklaces";
import { OFFHAND_GEAR, OFFHAND_RECIPES } from "./offhands";
import { DUAL_WIELD_GEAR, DUAL_WIELD_RECIPES } from "./dual-wield";
import { RANGED_GEAR, RANGED_RECIPES, LEGACY_RANGED } from "./ranged";
import {
  WARDROBE_GEAR,
  WARDROBE_RECIPES,
  WARDROBE_SET_BONUSES,
} from "./wardrobe";
import type { FactionId } from "./factions";
import type { SpecializationId, TrainingRank } from "./training";
import { CLASS_TRIALS, trialRelicId } from "./class-trials";

export type ClassId =
  | "warrior"
  | "mage"
  | "rogue"
  | "hunter"
  | "paladin"
  | "priest"
  | "shaman"
  | "warlock"
  | "druid";
export type SpellKind =
  | "projectile"
  | "nova"
  | "orbit"
  | "chain"
  | "ground"
  | "pet"
  | "melee"
  | "dot"
  | "heal"
  | "buff";
export type Stat =
  | "power"
  | "health"
  | "armor"
  | "haste"
  | "crit"
  | "speed"
  | "regen"
  | "magnet";
export type Stats = Record<Stat, number>;
export const SLOTS = [
  "weapon",
  "chest",
  "head",
  "hands",
  "boots",
  "trinket",
  "shoulders",
  "back",
  "waist",
  "legs",
  "wrists",
  "finger1",
  "finger2",
  "neck",
  "offhand",
  "ranged",
] as const;
export type Slot = (typeof SLOTS)[number];
export const SLOT_ICONS: Record<Slot, string> = {
  weapon: "sword",
  chest: "robe",
  head: "helmet",
  hands: "gloves",
  boots: "boot",
  trinket: "gem",
  shoulders: "shoulders",
  back: "cape",
  waist: "belt",
  legs: "legs",
  wrists: "bracers",
  finger1: "ring",
  finger2: "ring",
  neck: "necklace",
  offhand: "shield",
  ranged: "bow",
};
export const SLOT_LABELS: Record<Slot, string> = {
  weapon: "Weapon",
  chest: "Chest",
  head: "Head",
  hands: "Hands",
  boots: "Boots",
  trinket: "Trinket",
  shoulders: "Shoulders",
  back: "Cloak",
  waist: "Belt",
  legs: "Leggings",
  wrists: "Wrists",
  finger1: "Ring I",
  finger2: "Ring II",
  neck: "Necklace",
  offhand: "Off-hand",
  ranged: "Ranged",
};

export type ProfessionId =
  | "alchemy"
  | "blacksmithing"
  | "enchanting"
  | "engineering"
  | "herbalism"
  | "leatherworking"
  | "mining"
  | "skinning"
  | "tailoring";

export interface SpellDef {
  id: string;
  name: string;
  icon: string;
  kind: SpellKind;
  color: string;
  damage: number;
  cooldown: number;
  range: number;
  count: number;
  description: string;
  evolution: string;
  slow?: number;
  cost?: number;
  periodic?: { ticks: number; interval: number; ramp?: boolean };
  impact?: number;
  singleTarget?: boolean;
  freeze?: number;
  executeBelow?: number;
  buff?: {
    duration: number;
    stats?: Partial<Stats>;
    shield?: number;
    resource?: number;
  };
}
export interface TalentDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  stat: Stat;
  value: number;
  max: number;
  required: number;
  spellIds?: string[];
  bonus?: SpellBonus;
  grantsTechnique?: string;
}
export interface SpellBonus {
  power?: number;
  haste?: number;
  crit?: number;
  area?: number;
  projectiles?: number;
  pierce?: number;
  leech?: number;
  costReduction?: number;
}
export interface TalentTree {
  name: string;
  color: string;
  nodes: TalentDef[];
}
export interface ClassDef {
  id: ClassId;
  name: string;
  subtitle: string;
  race: string;
  faction: "Alliance" | "Horde";
  color: string;
  portrait: number;
  armor: "cloth" | "leather" | "mail" | "plate";
  resource: "Mana" | "Energy" | "Rage";
  health: number;
  speed: number;
  armorValue: number;
  description: string;
  passive: string;
  passiveDescription: string;
  active: string;
  activeDescription: string;
  activeCooldown: number;
  spells: string[];
  trees: TalentTree[];
}
const spell = (
  id: string,
  name: string,
  icon: string,
  kind: SpellKind,
  color: string,
  damage: number,
  cooldown: number,
  range: number,
  count: number,
  description: string,
  evolution: string,
  extra: Partial<SpellDef> = {},
): SpellDef => ({
  id,
  name,
  icon,
  kind,
  color,
  damage,
  cooldown,
  range,
  count,
  description,
  evolution,
  ...extra,
});
export const SPELLS: Record<string, SpellDef> = Object.fromEntries(
  [
    spell(
      "cleave",
      "Cleave",
      "sword",
      "melee",
      "#d2b399",
      30,
      0.9,
      110,
      1,
      "Sweep your blade through nearby enemies.",
      "Mortal Strike",
    ),
    spell(
      "whirlwind",
      "Whirlwind",
      "whirl",
      "nova",
      "#e2c5aa",
      32,
      3.1,
      145,
      1,
      "A spinning strike hits every enemy around you.",
      "Bladestorm",
      { cost: 15 },
    ),
    spell(
      "thunderclap",
      "Thunder Clap",
      "lightning",
      "nova",
      "#83a9d2",
      22,
      3.8,
      175,
      1,
      "Shock and slow nearby enemies.",
      "Avatar of Thunder",
      { slow: 0.5, cost: 10 },
    ),
    spell(
      "frostbolt",
      "Frostbolt",
      "snow",
      "projectile",
      "#8ed9ef",
      24,
      0.8,
      650,
      1,
      "A piercing shard of frost slows its target.",
      "Glacial Lance",
      { slow: 0.45, cost: 3 },
    ),
    spell(
      "blizzard",
      "Blizzard",
      "snow",
      "ground",
      "#a0d9f1",
      18,
      4,
      140,
      1,
      "A frozen storm falls over the nearest enemy.",
      "Frozen Orb",
      { slow: 0.5, cost: 10 },
    ),
    spell(
      "arcane",
      "Arcane Explosion",
      "spark",
      "nova",
      "#c5a3f0",
      28,
      2.6,
      150,
      1,
      "Release a ring of pure arcane energy.",
      "Arcane Supernova",
      { cost: 6 },
    ),
    spell(
      "sinister",
      "Sinister Strike",
      "dagger",
      "melee",
      "#e7d788",
      36,
      0.65,
      115,
      1,
      "A swift strike targets enemies within reach.",
      "Eviscerate",
      { cost: 10 },
    ),
    spell(
      "flurry",
      "Blade Flurry",
      "dagger",
      "orbit",
      "#efce70",
      17,
      0.6,
      100,
      2,
      "Whirling blades carve through surrounding foes.",
      "Killing Spree",
    ),
    spell(
      "poison",
      "Deadly Poison",
      "drop",
      "ground",
      "#9ed478",
      15,
      3.2,
      120,
      1,
      "Spread poison beneath the closest enemy.",
      "Venomous Tempest",
      { cost: 5 },
    ),
    spell(
      "shot",
      "Auto Shot",
      "bow",
      "projectile",
      "#b4d78c",
      27,
      0.8,
      700,
      1,
      "Shoot arrows at the closest enemy.",
      "Aimed Shot",
    ),
    spell(
      "multishot",
      "Multi-Shot",
      "bow",
      "projectile",
      "#dddc9c",
      24,
      1.8,
      680,
      3,
      "Fire a spreading volley of arrows.",
      "Volley",
    ),
    spell(
      "beast",
      "Beast Companion",
      "paw",
      "pet",
      "#d6b082",
      25,
      1,
      350,
      1,
      "A loyal wolf hunts nearby enemies.",
      "Bestial Wrath",
    ),
    spell(
      "holystrike",
      "Holy Strike",
      "sword",
      "melee",
      "#f1d796",
      33,
      0.95,
      120,
      1,
      "Smite nearby foes with a radiant blade.",
      "Crusader Strike",
    ),
    spell(
      "consecration",
      "Consecration",
      "sun",
      "ground",
      "#f2d08a",
      20,
      4,
      140,
      1,
      "Sanctify the ground beneath your feet.",
      "Hallowed Ground",
      { cost: 8 },
    ),
    spell(
      "judgment",
      "Judgment",
      "sun",
      "chain",
      "#fff0ad",
      38,
      2,
      400,
      2,
      "Holy light leaps between nearby foes.",
      "Divine Judgment",
      { cost: 6 },
    ),
    spell(
      "smite",
      "Smite",
      "sun",
      "projectile",
      "#ffedbd",
      28,
      0.85,
      650,
      1,
      "A bolt of holy light strikes your foe.",
      "Holy Fire",
      { cost: 3 },
    ),
    spell(
      "pain",
      "Shadow Word: Pain",
      "skull",
      "ground",
      "#b596d1",
      20,
      3.1,
      130,
      1,
      "Shadow magic consumes a group of enemies.",
      "Devouring Plague",
      { cost: 8 },
    ),
    spell(
      "holynova",
      "Holy Nova",
      "sun",
      "nova",
      "#f7dbab",
      24,
      3.2,
      170,
      1,
      "Holy energy damages enemies and restores health.",
      "Divine Star",
      { cost: 8 },
    ),
    spell(
      "lightning",
      "Lightning Bolt",
      "lightning",
      "projectile",
      "#89c5f4",
      28,
      0.9,
      650,
      1,
      "Hurl elemental lightning at your foe.",
      "Stormstrike",
      { cost: 3 },
    ),
    spell(
      "chainlightning",
      "Chain Lightning",
      "lightning",
      "chain",
      "#b9e7ff",
      27,
      2.2,
      430,
      4,
      "Lightning jumps between clustered enemies.",
      "Thunderstorm",
      { cost: 8 },
    ),
    spell(
      "totem",
      "Searing Totem",
      "totem",
      "pet",
      "#ffa972",
      28,
      1.1,
      380,
      1,
      "A fire totem shoots at nearby enemies.",
      "Fire Elemental",
    ),
    spell(
      "shadowbolt",
      "Shadow Bolt",
      "skull",
      "projectile",
      "#b2a0e5",
      32,
      0.95,
      650,
      1,
      "A bolt of shadow pierces the darkness.",
      "Chaos Bolt",
      { cost: 3 },
    ),
    spell(
      "corruption",
      "Corruption",
      "drop",
      "ground",
      "#a1c47c",
      19,
      3.2,
      145,
      1,
      "Corrupt the ground beneath your enemies.",
      "Seed of Corruption",
      { cost: 8 },
    ),
    spell(
      "imp",
      "Summon Imp",
      "flame",
      "pet",
      "#afdb8e",
      23,
      0.85,
      350,
      1,
      "An imp flings fel fire into the horde.",
      "Infernal",
    ),
    spell(
      "wrath",
      "Wrath",
      "leaf",
      "projectile",
      "#bad78a",
      26,
      0.8,
      650,
      1,
      "Strike the enemy with the fury of nature.",
      "Starfire",
      { cost: 3 },
    ),
    spell(
      "moonfire",
      "Moonfire",
      "moon",
      "ground",
      "#aabfed",
      21,
      3,
      145,
      1,
      "Call down lunar fire on a group of foes.",
      "Starfall",
      { cost: 8 },
    ),
    spell(
      "thorns",
      "Thorns",
      "leaf",
      "orbit",
      "#86b77e",
      21,
      0.75,
      100,
      3,
      "Nature’s thorns circle and protect you.",
      "Force of Nature",
    ),
    spell(
      "execute",
      "Execute",
      "sword",
      "melee",
      "#e7b591",
      60,
      2.2,
      115,
      1,
      "A crushing finishing strike cuts through nearby foes.",
      "Colossus Smash",
      { cost: 15 },
    ),
    spell(
      "fireball",
      "Fireball",
      "flame",
      "projectile",
      "#efaa72",
      36,
      1.2,
      650,
      1,
      "Hurl a blazing ball of fire into the advancing horde.",
      "Pyroblast",
      { cost: 5 },
    ),
    spell(
      "throw",
      "Throwing Knife",
      "dagger",
      "projectile",
      "#d6d1a0",
      24,
      1.15,
      560,
      2,
      "Throw a pair of sharp knives at the closest enemy.",
      "Shadow Knives",
      { cost: 8 },
    ),
    spell(
      "trap",
      "Explosive Trap",
      "flame",
      "ground",
      "#e8b16e",
      30,
      5,
      130,
      1,
      "Ignite a cluster of enemies with an explosive trap.",
      "Scorched Earth",
      { cost: 8 },
    ),
    spell(
      "hammer",
      "Hammer of Wrath",
      "sun",
      "projectile",
      "#f4dba2",
      46,
      2.5,
      600,
      1,
      "Send a hammer of radiant light through your enemies.",
      "Avenging Wrath",
      { cost: 8 },
    ),
    spell(
      "mindblast",
      "Mind Blast",
      "skull",
      "chain",
      "#ba9de3",
      42,
      2.8,
      400,
      2,
      "Unleash a burst of shadow that echoes between foes.",
      "Mind Flay",
      { cost: 8 },
    ),
    spell(
      "magma",
      "Magma Totem",
      "totem",
      "ground",
      "#e99b67",
      28,
      4.5,
      130,
      1,
      "The earth erupts into searing magma beneath a group of foes.",
      "Elemental Fury",
      { cost: 8 },
    ),
    spell(
      "immolate",
      "Immolate",
      "flame",
      "ground",
      "#ddaa71",
      22,
      3.8,
      135,
      1,
      "Set your enemies ablaze with lingering demonic fire.",
      "Hellfire",
      { cost: 8 },
    ),
    spell(
      "hurricane",
      "Hurricane",
      "whirl",
      "ground",
      "#a5ccb5",
      22,
      4.5,
      165,
      1,
      "Call a violent natural storm over the advancing horde.",
      "Typhoon",
      { slow: 0.7, cost: 10 },
    ),
  ].map((s) => [s.id, s]),
);
Object.assign(
  SPELLS,
  Object.fromEntries(CLASS_TECHNIQUES.map((t) => [t.spell.id, t.spell])),
);

const tree = (
  name: string,
  color: string,
  nodes: [string, string, Stat, number, string][],
): TalentTree => ({
  name,
  color,
  nodes: nodes.map(([id, title, stat, value, description], i) => ({
    id,
    name: title,
    icon: {
      power: "sword",
      health: "heart",
      armor: "shield",
      haste: "whirl",
      crit: "target",
      speed: "boot",
      regen: "leaf",
      magnet: "spark",
    }[stat],
    stat,
    value,
    max: i === 2 ? 1 : 3,
    required: i * 3,
    description,
  })),
});
export const CLASSES: ClassDef[] = [
  {
    id: "warrior",
    name: "Warrior",
    subtitle: "Steel & fury",
    race: "Human",
    faction: "Alliance",
    color: "#c69b7d",
    portrait: 0,
    armor: "plate",
    resource: "Rage",
    health: 145,
    speed: 190,
    armorValue: 12,
    description:
      "Stand at the heart of the horde. Every sweeping strike turns a desperate stand into a battlefield of your making.",
    passive: "Battle Hardened",
    passiveDescription: "+12 armor. Taking damage builds rage.",
    active: "Charge",
    activeDescription:
      "Rush forward, crush nearby foes and become briefly invulnerable.",
    activeCooldown: 12,
    spells: ["cleave", "whirlwind", "thunderclap", "execute"],
    trees: [
      tree("Arms", "#c9a986", [
        [
          "w_deep",
          "Deep Wounds",
          "crit",
          4,
          "+4% critical strike chance per rank.",
        ],
        ["w_twohand", "Two-Handed Mastery", "power", 6, "+6% damage per rank."],
        ["w_mortal", "Mortal Precision", "power", 18, "+18% damage."],
      ]),
      tree("Fury", "#c87963", [
        [
          "w_cruel",
          "Cruelty",
          "crit",
          4,
          "+4% critical strike chance per rank.",
        ],
        ["w_flurry", "Flurry", "haste", 5, "+5% attack speed per rank."],
        [
          "w_blood",
          "Bloodthirst",
          "regen",
          1.2,
          "Regenerate 1.2 health per second.",
        ],
      ]),
      tree("Protection", "#8aafbf", [
        ["w_tough", "Toughness", "armor", 4, "+4 armor per rank."],
        ["w_last", "Last Stand", "health", 12, "+12 maximum health per rank."],
        ["w_wall", "Shield Wall", "armor", 15, "+15 armor."],
      ]),
    ],
  },
  {
    id: "mage",
    name: "Mage",
    subtitle: "Frost & arcana",
    race: "Human",
    faction: "Alliance",
    color: "#81c5dc",
    portrait: 1,
    armor: "cloth",
    resource: "Mana",
    health: 100,
    speed: 205,
    armorValue: 2,
    description:
      "Freeze the advancing horde, weave storms of ice, and turn the battlefield into a canvas of arcane destruction.",
    passive: "Arcane Intellect",
    passiveDescription: "+15% experience gained. Frost spells slow enemies.",
    active: "Frost Nova",
    activeDescription:
      "Freeze every nearby enemy for 3 seconds and deal frost damage.",
    activeCooldown: 14,
    spells: ["frostbolt", "blizzard", "arcane", "fireball"],
    trees: [
      tree("Arcane", "#b49be0", [
        ["m_focus", "Arcane Focus", "power", 5, "+5% spell damage per rank."],
        [
          "m_meditation",
          "Arcane Meditation",
          "regen",
          0.35,
          "+0.35 health regeneration per rank.",
        ],
        ["m_power", "Arcane Power", "power", 20, "+20% spell damage."],
      ]),
      tree("Fire", "#d48b65", [
        [
          "m_ignite",
          "Ignite",
          "crit",
          4,
          "+4% spell critical chance per rank.",
        ],
        ["m_flame", "Flame Throwing", "power", 6, "+6% spell damage per rank."],
        [
          "m_combustion",
          "Combustion",
          "crit",
          12,
          "+12% critical strike chance.",
        ],
      ]),
      tree("Frost", "#82c3d5", [
        [
          "m_frost",
          "Improved Frostbolt",
          "haste",
          5,
          "+5% casting speed per rank.",
        ],
        ["m_ice", "Ice Shards", "power", 6, "+6% spell damage per rank."],
        ["m_barrier", "Ice Barrier", "health", 45, "+45 maximum health."],
      ]),
    ],
  },
  {
    id: "rogue",
    name: "Rogue",
    subtitle: "Shadows & poison",
    race: "Human",
    faction: "Alliance",
    color: "#e2ce80",
    portrait: 2,
    armor: "leather",
    resource: "Energy",
    health: 105,
    speed: 230,
    armorValue: 5,
    description:
      "Slip between your enemies, deliver a deadly strike, and disappear before the horde can close around you.",
    passive: "Lethality",
    passiveDescription: "+12% critical chance and increased movement speed.",
    active: "Vanish",
    activeDescription: "Become untouchable for 4 seconds and move 40% faster.",
    activeCooldown: 18,
    spells: ["sinister", "flurry", "poison", "throw"],
    trees: [
      tree("Assassination", "#b5c184", [
        ["r_malice", "Malice", "crit", 4, "+4% critical chance per rank."],
        ["r_venom", "Vile Poisons", "power", 6, "+6% damage per rank."],
        ["r_cold", "Cold Blood", "crit", 15, "+15% critical chance."],
      ]),
      tree("Combat", "#d6af74", [
        [
          "r_strike",
          "Improved Strike",
          "haste",
          5,
          "+5% attack speed per rank.",
        ],
        [
          "r_endurance",
          "Endurance",
          "health",
          12,
          "+12 maximum health per rank.",
        ],
        ["r_adrenaline", "Adrenaline Rush", "haste", 18, "+18% attack speed."],
      ]),
      tree("Subtlety", "#ac92bd", [
        [
          "r_elusive",
          "Elusiveness",
          "speed",
          4,
          "+4% movement speed per rank.",
        ],
        ["r_opportunity", "Opportunity", "power", 6, "+6% damage per rank."],
        ["r_premed", "Premeditation", "crit", 15, "+15% critical chance."],
      ]),
    ],
  },
  {
    id: "hunter",
    name: "Hunter",
    subtitle: "Bow & beast",
    race: "Dwarf",
    faction: "Alliance",
    color: "#aacb7c",
    portrait: 3,
    armor: "mail",
    resource: "Mana",
    health: 115,
    speed: 215,
    armorValue: 6,
    description:
      "Keep your distance and loose a relentless volley. Your faithful companion watches the paths you cannot.",
    passive: "Hawk Eye",
    passiveDescription:
      "+20% pickup radius. Start with a loyal wolf companion.",
    active: "Disengage",
    activeDescription:
      "Leap away from danger and leave a freezing trap behind.",
    activeCooldown: 12,
    spells: ["shot", "multishot", "beast", "trap"],
    trees: [
      tree("Beast Mastery", "#aaab75", [
        [
          "h_endurance",
          "Endurance Training",
          "health",
          12,
          "+12 maximum health per rank.",
        ],
        ["h_fury", "Unleashed Fury", "power", 6, "+6% damage per rank."],
        ["h_bestial", "Bestial Wrath", "haste", 18, "+18% attack speed."],
      ]),
      tree("Marksmanship", "#a6c786", [
        [
          "h_lethal",
          "Lethal Shots",
          "crit",
          4,
          "+4% critical chance per rank.",
        ],
        ["h_mortal", "Mortal Shots", "power", 6, "+6% damage per rank."],
        ["h_trueshot", "Trueshot Aura", "power", 20, "+20% damage."],
      ]),
      tree("Survival", "#b7a481", [
        ["h_path", "Pathfinding", "speed", 4, "+4% movement speed per rank."],
        [
          "h_survivor",
          "Survivalist",
          "health",
          12,
          "+12 maximum health per rank.",
        ],
        ["h_deterrence", "Deterrence", "armor", 15, "+15 armor."],
      ]),
    ],
  },
  {
    id: "paladin",
    name: "Paladin",
    subtitle: "Faith & steel",
    race: "Human",
    faction: "Alliance",
    color: "#dd9cba",
    portrait: 4,
    armor: "plate",
    resource: "Mana",
    health: 140,
    speed: 190,
    armorValue: 10,
    description:
      "Hold your ground in sacred light. Consecrate the earth and bring a merciful end to the restless dead.",
    passive: "Blessing of Light",
    passiveDescription: "Regenerate 0.6 health per second. +10 armor.",
    active: "Divine Shield",
    activeDescription: "Become immune to all damage for 5 seconds.",
    activeCooldown: 24,
    spells: ["holystrike", "consecration", "judgment", "hammer"],
    trees: [
      tree("Holy", "#dec58b", [
        ["p_intellect", "Divine Intellect", "power", 5, "+5% damage per rank."],
        [
          "p_light",
          "Healing Light",
          "regen",
          0.35,
          "+0.35 health regeneration per rank.",
        ],
        ["p_favor", "Divine Favor", "crit", 15, "+15% critical chance."],
      ]),
      tree("Protection", "#9aaabe", [
        ["p_tough", "Toughness", "armor", 4, "+4 armor per rank."],
        [
          "p_kings",
          "Blessing of Kings",
          "health",
          12,
          "+12 maximum health per rank.",
        ],
        ["p_holyshield", "Holy Shield", "armor", 15, "+15 armor."],
      ]),
      tree("Retribution", "#d7959c", [
        [
          "p_conviction",
          "Conviction",
          "crit",
          4,
          "+4% critical chance per rank.",
        ],
        ["p_crusade", "Crusade", "power", 6, "+6% damage per rank."],
        ["p_vengeance", "Vengeance", "power", 20, "+20% damage."],
      ]),
    ],
  },
  {
    id: "priest",
    name: "Priest",
    subtitle: "Light & shadow",
    race: "Human",
    faction: "Alliance",
    color: "#dfded2",
    portrait: 5,
    armor: "cloth",
    resource: "Mana",
    health: 105,
    speed: 200,
    armorValue: 2,
    description:
      "Balance restorative light with consuming shadow. The horde will learn that a healer can be its reckoning.",
    passive: "Spirit Tap",
    passiveDescription:
      "Recover health from Holy Nova. +0.4 health regeneration.",
    active: "Power Word: Shield",
    activeDescription:
      "Gain 45 absorption for 8 seconds and knock enemies back.",
    activeCooldown: 16,
    spells: ["smite", "pain", "holynova", "mindblast"],
    trees: [
      tree("Discipline", "#b6baca", [
        [
          "pr_fortitude",
          "Fortitude",
          "health",
          12,
          "+12 maximum health per rank.",
        ],
        ["pr_focus", "Inner Focus", "haste", 5, "+5% casting speed per rank."],
        ["pr_infusion", "Power Infusion", "power", 20, "+20% damage."],
      ]),
      tree("Holy", "#d9cd9e", [
        [
          "pr_renew",
          "Improved Renew",
          "regen",
          0.35,
          "+0.35 health regeneration per rank.",
        ],
        [
          "pr_special",
          "Holy Specialization",
          "crit",
          4,
          "+4% critical chance per rank.",
        ],
        ["pr_spirit", "Spiritual Guidance", "power", 20, "+20% damage."],
      ]),
      tree("Shadow", "#ac95c6", [
        [
          "pr_spirittap",
          "Spirit Tap",
          "regen",
          0.35,
          "+0.35 health regeneration per rank.",
        ],
        ["pr_darkness", "Darkness", "power", 6, "+6% damage per rank."],
        ["pr_shadow", "Shadowform", "armor", 15, "+15 armor."],
      ]),
    ],
  },
  {
    id: "shaman",
    name: "Shaman",
    subtitle: "Storm & earth",
    race: "Orc",
    faction: "Horde",
    color: "#7ca8e1",
    portrait: 6,
    armor: "mail",
    resource: "Mana",
    health: 120,
    speed: 205,
    armorValue: 6,
    description:
      "Answer the call of the elements. Set down your totems and let lightning find a path through your enemies.",
    passive: "Elemental Focus",
    passiveDescription: "+8% spell critical chance. Totems act as companions.",
    active: "Earthbind",
    activeDescription:
      "Root nearby enemies for 4 seconds and call down lightning.",
    activeCooldown: 15,
    spells: ["lightning", "chainlightning", "totem", "magma"],
    trees: [
      tree("Elemental", "#7aa9d3", [
        ["s_concussion", "Concussion", "power", 5, "+5% damage per rank."],
        [
          "s_fury",
          "Elemental Fury",
          "crit",
          4,
          "+4% critical chance per rank.",
        ],
        ["s_mastery", "Elemental Mastery", "power", 20, "+20% damage."],
      ]),
      tree("Enhancement", "#c5a178", [
        ["s_flurry", "Flurry", "haste", 5, "+5% attack speed per rank."],
        ["s_tough", "Toughness", "armor", 4, "+4 armor per rank."],
        ["s_storm", "Stormstrike", "power", 20, "+20% damage."],
      ]),
      tree("Restoration", "#8fb39b", [
        [
          "s_healing",
          "Healing Focus",
          "regen",
          0.35,
          "+0.35 health regeneration per rank.",
        ],
        [
          "s_endurance",
          "Ancestral Resolve",
          "health",
          12,
          "+12 maximum health per rank.",
        ],
        ["s_tide", "Mana Tide", "haste", 18, "+18% casting speed."],
      ]),
    ],
  },
  {
    id: "warlock",
    name: "Warlock",
    subtitle: "Fel & shadow",
    race: "Undead",
    faction: "Horde",
    color: "#b698d2",
    portrait: 7,
    armor: "cloth",
    resource: "Mana",
    health: 110,
    speed: 200,
    armorValue: 3,
    description:
      "Make a pact with the darkness. Spread corruption, summon a demon, and turn the life of your enemies into your own.",
    passive: "Fel Bond",
    passiveDescription:
      "Start with an imp companion. Drain Life restores health.",
    active: "Drain Life",
    activeDescription: "Drain nearby enemies for damage and restore 30 health.",
    activeCooldown: 16,
    spells: ["shadowbolt", "corruption", "imp", "immolate"],
    trees: [
      tree("Affliction", "#94b17a", [
        ["wl_suppress", "Suppression", "power", 5, "+5% damage per rank."],
        [
          "wl_siphon",
          "Siphon Life",
          "regen",
          0.35,
          "+0.35 health regeneration per rank.",
        ],
        ["wl_mastery", "Shadow Mastery", "power", 20, "+20% damage."],
      ]),
      tree("Demonology", "#b598c7", [
        [
          "wl_embrace",
          "Demonic Embrace",
          "health",
          12,
          "+12 maximum health per rank.",
        ],
        ["wl_bond", "Fel Stamina", "armor", 4, "+4 armor per rank."],
        ["wl_soullink", "Soul Link", "armor", 15, "+15 armor."],
      ]),
      tree("Destruction", "#cb8f76", [
        ["wl_bane", "Bane", "haste", 5, "+5% casting speed per rank."],
        ["wl_ruin", "Ruin", "crit", 4, "+4% critical chance per rank."],
        ["wl_burn", "Shadowburn", "power", 20, "+20% damage."],
      ]),
    ],
  },
  {
    id: "druid",
    name: "Druid",
    subtitle: "Moon & wild",
    race: "Night Elf",
    faction: "Alliance",
    color: "#daaa72",
    portrait: 8,
    armor: "leather",
    resource: "Mana",
    health: 120,
    speed: 215,
    armorValue: 5,
    description:
      "Walk the path between moonlight and the wild. Call the stars, grow living thorns, and become the forest’s guardian.",
    passive: "Gift of the Wild",
    passiveDescription: "+10% movement speed and +0.4 health regeneration.",
    active: "Bear Form",
    activeDescription:
      "Gain armor and health regeneration for 6 seconds; maul nearby enemies.",
    activeCooldown: 18,
    spells: ["wrath", "moonfire", "thorns", "hurricane"],
    trees: [
      tree("Balance", "#acbce0", [
        [
          "d_wrath",
          "Improved Wrath",
          "haste",
          5,
          "+5% casting speed per rank.",
        ],
        ["d_moon", "Moonfury", "power", 6, "+6% damage per rank."],
        ["d_moonkin", "Moonkin Form", "crit", 15, "+15% critical chance."],
      ]),
      tree("Feral", "#c39973", [
        ["d_ferocity", "Ferocity", "power", 5, "+5% damage per rank."],
        ["d_hide", "Thick Hide", "armor", 4, "+4 armor per rank."],
        ["d_swift", "Feral Swiftness", "speed", 15, "+15% movement speed."],
      ]),
      tree("Restoration", "#8daf87", [
        [
          "d_rejuv",
          "Rejuvenation",
          "regen",
          0.35,
          "+0.35 health regeneration per rank.",
        ],
        [
          "d_heart",
          "Heart of the Wild",
          "health",
          12,
          "+12 maximum health per rank.",
        ],
        [
          "d_swiftmend",
          "Swiftmend",
          "regen",
          1.2,
          "+1.2 health regeneration per second.",
        ],
      ]),
    ],
  },
];
// Advanced nodes preserve the original nodes and saved identifiers. New talents
// specialize attacks rather than adding another global stat to every build.
const specializations: Record<ClassId, [string[], SpellBonus, string][]> = {
  warrior: [
    [
      ["cleave", "execute"],
      { crit: 15 },
      "+15% critical chance for Cleave and Execute.",
    ],
    [
      ["whirlwind", "cleave"],
      { area: 35 },
      "Cleave and Whirlwind have 35% larger areas.",
    ],
    [
      ["thunderclap"],
      { area: 40, costReduction: 30 },
      "Thunder Clap has 40% more area and costs 30% less rage.",
    ],
  ],
  mage: [
    [
      ["arcane"],
      { area: 40, costReduction: 25 },
      "Arcane Explosion has 40% more area and costs 25% less mana.",
    ],
    [
      ["fireball"],
      { projectiles: 1 },
      "Fireball launches one additional projectile.",
    ],
    [
      ["frostbolt", "blizzard"],
      { area: 30, pierce: 1 },
      "Blizzard has 30% more area. Frostbolt pierces one additional enemy.",
    ],
  ],
  rogue: [
    [["poison"], { leech: 3 }, "Heal for 3% of damage dealt by Deadly Poison."],
    [["flurry"], { area: 35 }, "Blade Flurry orbits 35% farther from you."],
    [
      ["throw", "sinister"],
      { crit: 15, pierce: 1 },
      "+15% critical chance for Sinister Strike and Throwing Knife; knives pierce another enemy.",
    ],
  ],
  hunter: [
    [
      ["beast"],
      { power: 25, haste: 15 },
      "Your companion gains 25% damage and 15% attack speed.",
    ],
    [
      ["shot", "multishot"],
      { projectiles: 1 },
      "Auto Shot and Multi-Shot launch one additional arrow.",
    ],
    [["trap"], { area: 40 }, "Explosive Trap covers 40% more area."],
  ],
  paladin: [
    [
      ["judgment", "hammer"],
      { leech: 3 },
      "Heal for 3% of damage dealt by Judgment and Hammer of Wrath.",
    ],
    [["consecration"], { area: 40 }, "Consecration covers 40% more area."],
    [
      ["holystrike", "hammer"],
      { crit: 15 },
      "+15% critical chance for Holy Strike and Hammer of Wrath.",
    ],
  ],
  priest: [
    [
      ["smite", "holynova"],
      { costReduction: 30, area: 25 },
      "Smite and Holy Nova cost 30% less mana; Holy Nova has 25% more area.",
    ],
    [
      ["holynova", "smite"],
      { leech: 3 },
      "Heal for 3% of damage dealt by Smite and Holy Nova.",
    ],
    [
      ["pain", "mindblast"],
      { crit: 15 },
      "+15% critical chance for Shadow Word: Pain and Mind Blast.",
    ],
  ],
  shaman: [
    [
      ["lightning", "chainlightning"],
      { projectiles: 2 },
      "Lightning Bolt launches two additional bolts; Chain Lightning jumps to two additional targets.",
    ],
    [
      ["totem"],
      { power: 25, haste: 15 },
      "Searing Totem gains 25% damage and 15% attack speed.",
    ],
    [
      ["magma", "totem"],
      { leech: 3 },
      "Heal for 3% of damage dealt by Magma Totem and Searing Totem.",
    ],
  ],
  warlock: [
    [
      ["corruption", "immolate"],
      { leech: 3 },
      "Heal for 3% of damage dealt by Corruption and Immolate.",
    ],
    [["imp"], { projectiles: 1 }, "Your imp fires an additional bolt."],
    [
      ["shadowbolt", "immolate"],
      { crit: 15 },
      "+15% critical chance for Shadow Bolt and Immolate.",
    ],
  ],
  druid: [
    [
      ["wrath", "moonfire"],
      { projectiles: 1, area: 35 },
      "Wrath launches one additional projectile; Moonfire has 35% more area.",
    ],
    [
      ["thorns"],
      { area: 30, power: 25 },
      "Thorns orbit 30% farther out and deal 25% more damage.",
    ],
    [
      ["moonfire", "hurricane"],
      { leech: 3 },
      "Heal for 3% of damage dealt by Moonfire and Hurricane.",
    ],
  ],
};
for (const c of CLASSES)
  c.trees.forEach((t, i) => {
    const [spellIds, bonus, description] = specializations[c.id][i];
    const names = spellIds.map((id) => SPELLS[id].name).join(" and ");
    t.nodes.push(
      {
        id: `${c.id}_${i}_focus`,
        name: `${t.name} Attunement`,
        icon: SPELLS[spellIds[0]].icon,
        description: `+8% damage per rank for ${names}.`,
        stat: "power",
        value: 8,
        max: 3,
        required: 7,
        spellIds,
      },
      {
        id: `${c.id}_${i}_rhythm`,
        name: `${t.name} Rhythm`,
        icon: "whirl",
        description: `+6% attack speed per rank for ${names}.`,
        stat: "haste",
        value: 6,
        max: 3,
        required: 10,
        spellIds,
      },
      {
        id: `${c.id}_${i}_mastery`,
        name: `${t.name} Mastery`,
        icon: c.id,
        description,
        stat: "power",
        value: 0,
        max: 1,
        required: 13,
        spellIds,
        bonus,
      },
    );
  });
export const CLASS_MAP = Object.fromEntries(
  CLASSES.map((c) => [c.id, c]),
) as Record<ClassId, ClassDef>;

export interface GearDef {
  id: string;
  name: string;
  slot: Slot;
  icon: string;
  rarity: "common" | "uncommon" | "rare" | "epic";
  armor?: ClassDef["armor"];
  classes?: ClassId[];
  stats: Partial<Stats>;
  attributes?: Partial<Attributes>;
  resistances?: Partial<Resistances>;
  description: string;
  value: number;
  level?: number;
  set?: string;
  dropZones?: string[];
  weaponHands?: 1 | 2;
  weaponType?: WeaponType;
  offhandType?: "shield" | "focus";
  rangedType?: "bow" | "wand" | "thrown" | "gun" | "crossbow";
}
export interface GearSet {
  id: string;
  name: string;
  armor: ClassDef["armor"];
  profession: ProfessionId;
  material: Material;
  bonuses: { pieces: number; stats: Partial<Stats> }[];
}
export const GEAR_SETS: GearSet[] = [
  {
    id: "spellweave",
    name: "Spellweaver’s Regalia",
    armor: "cloth",
    profession: "tailoring",
    material: "cloth",
    bonuses: [
      { pieces: 2, stats: { haste: 8 } },
      { pieces: 3, stats: { power: 15, magnet: 10 } },
    ],
  },
  {
    id: "pathfinder",
    name: "Pathfinder’s Pursuit",
    armor: "leather",
    profession: "leatherworking",
    material: "leather",
    bonuses: [
      { pieces: 2, stats: { crit: 8 } },
      { pieces: 3, stats: { speed: 10, magnet: 20 } },
    ],
  },
  {
    id: "ironwarden",
    name: "Ironwarden’s Watch",
    armor: "mail",
    profession: "blacksmithing",
    material: "ore",
    bonuses: [
      { pieces: 2, stats: { armor: 10 } },
      { pieces: 3, stats: { health: 40, regen: 0.5 } },
    ],
  },
  {
    id: "oathsteel",
    name: "Oathsteel Vanguard",
    armor: "plate",
    profession: "blacksmithing",
    material: "ore",
    bonuses: [
      { pieces: 2, stats: { power: 10 } },
      { pieces: 3, stats: { armor: 15, crit: 5 } },
    ],
  },
];
export const GEAR: GearDef[] = [
  ...CAMPAIGN_GEAR,
  ...CLASSES.map((c) => ({
    id: `starter_${c.id}`,
    name: {
      warrior: "Worn Greatsword",
      mage: "Apprentice’s Staff",
      rogue: "Balanced Daggers",
      hunter: "Hunting Bow",
      paladin: "Novice’s Warhammer",
      priest: "Acolyte’s Wand",
      shaman: "Stormcaller’s Mace",
      warlock: "Shadowed Staff",
      druid: "Living Branch",
    }[c.id],
    slot: "weapon" as Slot,
    icon: {
      warrior: "sword",
      mage: "staff",
      rogue: "dagger",
      hunter: "bow",
      paladin: "sword",
      priest: "staff",
      shaman: "totem",
      warlock: "staff",
      druid: "leaf",
    }[c.id],
    rarity: "common" as const,
    classes: [c.id],
    stats: { power: 5 },
    description: "A trusted companion for the road ahead.",
    value: 8,
  })),
  {
    id: "cloth",
    name: "Linen Robe",
    slot: "chest",
    icon: "robe",
    rarity: "common",
    armor: "cloth",
    stats: { health: 8, armor: 2 },
    description: "Simple robes, stitched by hand.",
    value: 8,
  },
  {
    id: "leather",
    name: "Worn Leather Vest",
    slot: "chest",
    icon: "robe",
    rarity: "common",
    armor: "leather",
    stats: { health: 10, armor: 4 },
    description: "Supple leather that has seen better days.",
    value: 8,
  },
  {
    id: "mail",
    name: "Chainmail Hauberk",
    slot: "chest",
    icon: "robe",
    rarity: "common",
    armor: "mail",
    stats: { health: 12, armor: 5 },
    description: "Linked rings to turn aside a blade.",
    value: 8,
  },
  {
    id: "plate",
    name: "Recruit’s Breastplate",
    slot: "chest",
    icon: "robe",
    rarity: "common",
    armor: "plate",
    stats: { health: 14, armor: 7 },
    description: "Heavy steel, honest protection.",
    value: 8,
  },
  {
    id: "copper_sword",
    name: "Copper Longsword",
    slot: "weapon",
    icon: "sword",
    rarity: "uncommon",
    classes: ["warrior", "paladin", "rogue"],
    stats: { power: 14, crit: 3 },
    description: "Forged in a campfire, tempered for battle.",
    value: 35,
  },
  {
    id: "azure_robe",
    name: "Azure Linen Robe",
    slot: "chest",
    icon: "robe",
    rarity: "uncommon",
    armor: "cloth",
    stats: { power: 9, health: 15, armor: 3 },
    description: "Arcane thread shimmers across the seams.",
    value: 32,
  },
  {
    id: "ranger_vest",
    name: "Ranger’s Jerkin",
    slot: "chest",
    icon: "robe",
    rarity: "uncommon",
    armor: "leather",
    stats: { crit: 5, health: 20, armor: 7 },
    description: "Made for a hunter’s quiet footfalls.",
    value: 32,
  },
  {
    id: "enchanted_charm",
    name: "Lesser Mystic Charm",
    slot: "trinket",
    icon: "gem",
    rarity: "uncommon",
    stats: { power: 10, regen: 0.3 },
    description: "A small enchantment, a lasting advantage.",
    value: 35,
  },
  {
    id: "forest_boots",
    name: "Foreststrider Boots",
    slot: "boots",
    icon: "boot",
    rarity: "uncommon",
    stats: { speed: 8, armor: 3 },
    description: "Leave nothing but footprints.",
    value: 25,
  },
  {
    id: "gnoll_claw",
    name: "Gnoll Fang Pendant",
    slot: "trinket",
    icon: "gem",
    rarity: "uncommon",
    stats: { crit: 6, power: 5 },
    description: "A trophy taken from the pack.",
    value: 28,
  },
  {
    id: "ember_staff",
    name: "Emberwood Staff",
    slot: "weapon",
    icon: "staff",
    rarity: "rare",
    classes: ["mage", "priest", "warlock", "druid", "shaman"],
    stats: { power: 22, haste: 6 },
    description: "A spark lives in the heartwood.",
    value: 75,
  },
  {
    id: "defias_blade",
    name: "Defias Shadowblade",
    slot: "weapon",
    icon: "dagger",
    rarity: "rare",
    classes: ["warrior", "rogue", "paladin"],
    stats: { power: 20, crit: 9 },
    description: "It remembers the dark alleys of Westfall.",
    value: 75,
  },
  {
    id: "longbow",
    name: "Eagle Eye Longbow",
    slot: "weapon",
    icon: "bow",
    rarity: "rare",
    classes: ["hunter"],
    stats: { power: 24, crit: 7 },
    description: "No horizon is beyond its reach.",
    value: 75,
  },
  {
    id: "warden_plate",
    name: "Warden’s Breastplate",
    slot: "chest",
    icon: "robe",
    rarity: "rare",
    armor: "plate",
    stats: { health: 45, armor: 15 },
    description: "A bulwark against the long night.",
    value: 70,
  },
  {
    id: "mooncloth",
    name: "Moonwoven Vestments",
    slot: "chest",
    icon: "robe",
    rarity: "rare",
    armor: "cloth",
    stats: { health: 25, power: 13, regen: 0.6 },
    description: "Woven from threads touched by moonlight.",
    value: 70,
  },
  {
    id: "shadow_boots",
    name: "Shadowstep Boots",
    slot: "boots",
    icon: "boot",
    rarity: "rare",
    stats: { speed: 12, crit: 6 },
    description: "Even the shadows cannot hear you.",
    value: 65,
  },
  {
    id: "lionheart",
    name: "Lionheart Talisman",
    slot: "trinket",
    icon: "shield",
    rarity: "epic",
    stats: { power: 18, health: 30, crit: 8 },
    description: "Courage is the only magic it needs.",
    value: 150,
  },
];
GEAR.push(
  ...GEAR_SETS.filter((set) => !set.id.startsWith("dawnward_")).flatMap((set) =>
    (["hands", "head", "chest"] as Slot[]).map((slot, i) => ({
      id: `${set.id}_${slot}`,
      name: `${{ spellweave: "Spellwoven", pathfinder: "Pathfinder", ironwarden: "Ironwarden", oathsteel: "Oathsteel" }[set.id]} ${{ hands: "Gloves", head: "Crown", chest: "Vestments" }[slot as "hands" | "head" | "chest"]}`,
      slot,
      icon: SLOT_ICONS[slot],
      rarity: "rare" as const,
      armor: set.armor,
      set: set.id,
      level: [3, 5, 8][i],
      stats: {
        cloth: { power: 5, health: 12, armor: 3 },
        leather: { crit: 3, speed: 3, armor: 5 },
        mail: { armor: 7, health: 18 },
        plate: { armor: 10, health: 20 },
      }[set.armor],
      description: `Handcrafted as part of ${set.name}.`,
      value: 45 + i * 15,
    })),
  ),
);
GEAR.push(
  {
    id: "field_goggles",
    name: "Field Engineer’s Goggles",
    slot: "head",
    icon: "helmet",
    rarity: "uncommon",
    stats: { crit: 6, magnet: 12 },
    level: 3,
    description: "Spot treasures through the smoke and chaos.",
    value: 35,
  },
  {
    id: "reinforced_bow",
    name: "Reinforced Hunting Bow",
    slot: "weapon",
    icon: "bow",
    rarity: "rare",
    classes: ["hunter"],
    stats: { power: 22, haste: 5 },
    level: 5,
    description: "A resilient bow, wrapped in carefully cured leather.",
    value: 65,
  },
  {
    id: "greater_charm",
    name: "Greater Mystic Charm",
    slot: "trinket",
    icon: "gem",
    rarity: "rare",
    stats: { power: 16, haste: 7 },
    level: 5,
    description: "A practiced enchanter’s promise of power.",
    value: 65,
  },
  {
    id: "runed_charm",
    name: "Runed Dawnstone",
    slot: "trinket",
    icon: "spark",
    rarity: "epic",
    stats: { power: 22, regen: 0.8 },
    level: 8,
    description: "A reservoir of magic, bound within a copper lattice.",
    value: 110,
  },
  {
    id: "scout_circlet",
    name: "Goldshire Scout’s Circlet",
    slot: "head",
    icon: "helmet",
    rarity: "uncommon",
    armor: "cloth",
    stats: { crit: 4, haste: 3 },
    level: 2,
    dropZones: ["elwynn"],
    description: "Eyes open. The forest is never empty.",
    value: 30,
  },
  {
    id: "gnoll_grips",
    name: "Gnollhide Grips",
    slot: "hands",
    icon: "gloves",
    rarity: "uncommon",
    armor: "leather",
    stats: { power: 7, crit: 4 },
    level: 2,
    dropZones: ["elwynn"],
    description: "Rough hide, scavenged from the pack.",
    value: 30,
  },
  {
    id: "kobold_cap",
    name: "Candlekeeper’s Cap",
    slot: "head",
    icon: "helmet",
    rarity: "uncommon",
    stats: { health: 14, magnet: 8 },
    level: 2,
    dropZones: ["elwynn"],
    description: "An unlikely light for the road ahead.",
    value: 30,
  },
  {
    id: "defias_mask",
    name: "Defias Ambusher’s Mask",
    slot: "head",
    icon: "helmet",
    rarity: "rare",
    armor: "leather",
    stats: { crit: 8, speed: 4 },
    level: 4,
    dropZones: ["westfall"],
    description: "Red cloth and a forgotten oath.",
    value: 65,
  },
  {
    id: "harvest_gauntlets",
    name: "Harvester’s Gauntlets",
    slot: "hands",
    icon: "gloves",
    rarity: "rare",
    armor: "mail",
    stats: { armor: 10, haste: 5 },
    level: 4,
    dropZones: ["westfall"],
    description: "Salvaged mechanisms give every strike an edge.",
    value: 65,
  },
  {
    id: "grave_hood",
    name: "Gravekeeper’s Hood",
    slot: "head",
    icon: "helmet",
    rarity: "rare",
    armor: "cloth",
    stats: { haste: 8, health: 25 },
    level: 6,
    dropZones: ["tirisfal"],
    description: "The silence beneath it is strangely comforting.",
    value: 75,
  },
  {
    id: "duskguard_hands",
    name: "Duskguard Handguards",
    slot: "hands",
    icon: "gloves",
    rarity: "rare",
    armor: "plate",
    stats: { armor: 12, health: 25 },
    level: 6,
    dropZones: ["tirisfal"],
    description: "A final defense against the gathering dark.",
    value: 75,
  },
);
GEAR.push(
  {
    id: "trail_token",
    name: "Trailkeeper's Token",
    slot: "trinket",
    icon: "paw",
    rarity: "rare",
    level: 5,
    stats: { crit: 6, speed: 5, magnet: 15 },
    description:
      "A pledge to keep the forest paths open. Timbermaw quartermaster reward.",
    value: 60,
  },
  {
    id: "woodland_stride",
    name: "Woodland Striders",
    slot: "boots",
    icon: "boot",
    rarity: "epic",
    level: 10,
    stats: { speed: 12, crit: 6, armor: 5 },
    description:
      "Walk lightly, even when the forest is watching. Timbermaw quartermaster reward.",
    value: 100,
  },
  {
    id: "forge_token",
    name: "Forgekeeper's Seal",
    slot: "trinket",
    icon: "anvil",
    rarity: "rare",
    level: 5,
    stats: { power: 10, armor: 6, health: 20 },
    description: "A promise hammered into metal. Thorium quartermaster reward.",
    value: 60,
  },
  {
    id: "forge_march",
    name: "Forge March Sabatons",
    slot: "boots",
    icon: "boot",
    rarity: "epic",
    level: 10,
    stats: { armor: 12, haste: 8, speed: 6 },
    description:
      "Unyielding strength for the long road. Thorium quartermaster reward; usable by every class.",
    value: 100,
  },
  {
    id: "dawn_token",
    name: "Lantern of the Dawn",
    slot: "trinket",
    icon: "sun",
    rarity: "rare",
    level: 5,
    stats: { haste: 8, regen: 0.6, health: 20 },
    description:
      "A steady light against the gathering dark. Argent quartermaster reward.",
    value: 60,
  },
  {
    id: "dawn_stride",
    name: "Dawnward Steps",
    slot: "boots",
    icon: "boot",
    rarity: "epic",
    level: 10,
    stats: { health: 45, regen: 1, speed: 8 },
    description:
      "Keep walking until the sun returns. Argent quartermaster reward.",
    value: 100,
  },
  {
    id: "trailguard_gloves",
    name: "Trailguard Gloves",
    slot: "hands",
    icon: "gloves",
    rarity: "rare",
    armor: "leather",
    level: 10,
    stats: { armor: 7, crit: 5, haste: 5, speed: 4 },
    description: "Crafted from a pattern shared by the Timbermaw envoy.",
    value: 85,
  },
  {
    id: "forgeguard_gauntlets",
    name: "Forgeguard Gauntlets",
    slot: "hands",
    icon: "gloves",
    rarity: "rare",
    armor: "mail",
    level: 10,
    stats: { armor: 12, power: 7, health: 25 },
    description: "Crafted from a plan entrusted by the Brotherhood's smiths.",
    value: 95,
  },
  {
    id: "lantern_hood",
    name: "Lantern Keeper's Hood",
    slot: "head",
    icon: "helmet",
    rarity: "rare",
    armor: "cloth",
    level: 10,
    stats: { haste: 8, power: 9, health: 20 },
    description: "Crafted from a pattern carried by the Argent emissary.",
    value: 90,
  },
);
GEAR.push(
  {
    id: "bastion_cuirass",
    name: "Bastion Cuirass",
    slot: "chest",
    icon: "robe",
    rarity: "rare",
    armor: "plate",
    level: 12,
    stats: { health: 45, armor: 18, haste: 6 },
    description: "An Armorsmith's answer to a closing circle of enemies.",
    value: 120,
  },
  {
    id: "tempered_edge",
    name: "Tempered Edge",
    slot: "weapon",
    icon: "sword",
    rarity: "rare",
    classes: ["warrior", "rogue", "paladin"],
    level: 12,
    stats: { power: 30, crit: 7, haste: 5 },
    description: "A Weaponsmith's blade, balanced for relentless attacks.",
    value: 120,
  },
  {
    id: "precision_goggles",
    name: "Gnomish Precision Goggles",
    slot: "head",
    icon: "helmet",
    rarity: "rare",
    level: 12,
    stats: { crit: 12, haste: 8, magnet: 15 },
    description:
      "A Gnomish Engineer's lens keeps the smallest opportunity in focus.",
    value: 110,
  },
  {
    id: "stormhide_hood",
    name: "Stormhide Hood",
    slot: "head",
    icon: "helmet",
    rarity: "rare",
    armor: "leather",
    level: 12,
    stats: { power: 14, haste: 8, armor: 5 },
    description:
      "Elemental Leatherworking weaves a restless storm into supple hide.",
    value: 110,
  },
  {
    id: "spirit_talisman",
    name: "Trail Spirit Talisman",
    slot: "trinket",
    icon: "paw",
    rarity: "rare",
    level: 12,
    stats: { health: 30, regen: 0.9, crit: 8 },
    description: "A Tribal Leatherworker's gift for the long hunt.",
    value: 110,
  },
  {
    id: "scaleguard_vest",
    name: "Scaleguard Vest",
    slot: "chest",
    icon: "robe",
    rarity: "rare",
    armor: "mail",
    level: 12,
    stats: { armor: 10, health: 30, crit: 10 },
    description:
      "Dragonscale Leatherworking turns resilient scales into a sure defense.",
    value: 120,
  },
  {
    id: "distiller_stone",
    name: "Distiller's Stone",
    slot: "trinket",
    icon: "potion",
    rarity: "rare",
    level: 12,
    stats: { health: 18, regen: 1.2, power: 10 },
    description: "A carefully distilled charm for strength between skirmishes.",
    value: 110,
  },
  {
    id: "starwoven_raiment",
    name: "Starwoven Raiment",
    slot: "chest",
    icon: "robe",
    rarity: "rare",
    armor: "cloth",
    level: 12,
    stats: { power: 14, haste: 10, health: 25, armor: 8 },
    description: "Expert weaving gives starlight a place to settle.",
    value: 120,
  },
  {
    id: "resonant_focus",
    name: "Resonant Focus",
    slot: "trinket",
    icon: "gem",
    rarity: "rare",
    level: 12,
    stats: { power: 18, haste: 6, magnet: 18 },
    description:
      "An Expert enchanter's focus calls power and experience alike.",
    value: 110,
  },
  {
    id: "masterwork_helm",
    name: "Masterwork Bastion Helm",
    slot: "head",
    icon: "helmet",
    rarity: "epic",
    armor: "plate",
    level: 18,
    stats: { armor: 16, health: 45, power: 10 },
    description: "Artisan metalwork built to stand through the final assault.",
    value: 160,
  },
  {
    id: "gyro_core",
    name: "Gyro Balance Core",
    slot: "trinket",
    icon: "gear",
    rarity: "epic",
    level: 18,
    stats: { haste: 12, speed: 8, magnet: 20 },
    description: "An Artisan mechanism that turns momentum into opportunity.",
    value: 160,
  },
  {
    id: "prowler_boots",
    name: "Masterwork Prowler Boots",
    slot: "boots",
    icon: "boot",
    rarity: "epic",
    armor: "leather",
    level: 18,
    stats: { speed: 10, crit: 10, armor: 8, haste: 5 },
    description: "Artisan hidework for a hunter who never breaks stride.",
    value: 160,
  },
  {
    id: "starwoven_crown",
    name: "Starwoven Crown",
    slot: "head",
    icon: "helmet",
    rarity: "epic",
    armor: "cloth",
    level: 18,
    stats: { power: 18, haste: 10, health: 30 },
    description: "An Artisan's patient stitches hold a canopy of stars.",
    value: 160,
  },
  {
    id: "prismatic_waystone",
    name: "Prismatic Waystone",
    slot: "trinket",
    icon: "spark",
    rarity: "epic",
    level: 18,
    stats: { power: 26, crit: 9, regen: 0.5 },
    description:
      "An Artisan enchantment that shines brightest at the end of the road.",
    value: 160,
  },
);
GEAR.push(
  {
    id: "miner_token",
    name: "Miner's Resolve",
    description: "A worn token carried through the Mast Room's darkest shifts.",
    slot: "trinket",
    rarity: "rare",
    icon: "rune",
    level: 10,
    stats: { health: 20, armor: 5 },
    value: 90,
  },
  {
    id: "tunnelwalker_boots",
    name: "Tunnelwalker's Boots",
    description: "Sure footing among the workshop's broken machinery.",
    slot: "boots",
    armor: "leather",
    rarity: "rare",
    icon: "boot",
    level: 10,
    stats: { speed: 7, armor: 4, crit: 4 },
    value: 90,
  },
  {
    id: "foundry_grips",
    name: "Foundry Spellgrips",
    description: "Cloth gloves threaded with the workshop's lingering heat.",
    slot: "hands",
    armor: "cloth",
    rarity: "rare",
    icon: "gloves",
    level: 10,
    stats: { power: 12, regen: 0.4 },
    value: 90,
  },
  {
    id: "dockmaster_maul",
    name: "Dockmaster's Maul",
    description: "A heavy boarding weapon claimed from Mr. Smite.",
    slot: "weapon",
    classes: ["warrior", "paladin"],
    rarity: "rare",
    icon: "paladin",
    level: 10,
    stats: { power: 22, crit: 6 },
    value: 110,
  },
  {
    id: "rigging_longbow",
    name: "Rigging Longbow",
    description: "A steady bow built to watch the Ironclad's approaches.",
    slot: "weapon",
    classes: ["hunter"],
    rarity: "rare",
    icon: "bow",
    level: 10,
    stats: { power: 20, haste: 5, crit: 5 },
    value: 110,
  },
  {
    id: "rigging_staff",
    name: "Tidecaller's Staff",
    description: "Salt and spellwork still cling to its carved wood.",
    slot: "weapon",
    classes: ["mage", "priest", "warlock", "shaman", "druid"],
    rarity: "rare",
    icon: "staff",
    level: 10,
    stats: { power: 18, haste: 8, regen: 0.4 },
    value: 110,
  },
  {
    id: "boarding_sabre",
    name: "Boarding Sabre",
    description: "A nimble blade made for close quarters on a crowded deck.",
    slot: "weapon",
    classes: ["rogue"],
    rarity: "rare",
    icon: "sword",
    level: 10,
    stats: { power: 22, crit: 8 },
    value: 110,
  },
  {
    id: "corsair_regalia",
    name: "Corsair's Regalia",
    description: "Fine spellwoven cloth recovered from the Captain's Deck.",
    slot: "chest",
    armor: "cloth",
    rarity: "rare",
    icon: "robe",
    level: 10,
    stats: { power: 12, haste: 6, health: 18 },
    value: 120,
  },
  {
    id: "brotherhood_jerkin",
    name: "Brotherhood Jerkin",
    description:
      "Supple armor worn by the Ironclad's most trusted blackguards.",
    slot: "chest",
    armor: "leather",
    rarity: "rare",
    icon: "robe",
    level: 10,
    stats: { health: 24, crit: 8, armor: 8 },
    value: 120,
  },
  {
    id: "captains_seal",
    name: "The Captain's Seal",
    description: "Proof that the Brotherhood's command has been broken.",
    slot: "trinket",
    rarity: "rare",
    icon: "crown",
    level: 10,
    stats: { power: 12, armor: 6, regen: 0.5 },
    value: 120,
  },
);
GEAR.push(...RAGEFIRE_GEAR);
GEAR.push(
  ...CLASSES.map((c): GearDef => ({
    id: trialRelicId(c.id),
    name: CLASS_TRIALS[c.id].relic,
    slot: "trinket",
    icon: c.id,
    rarity: "rare",
    classes: [c.id],
    level: 10,
    value: 120,
    stats: CLASS_TRIALS[c.id].stats,
    description: `A relic earned by completing ${CLASS_TRIALS[c.id].name}, the ${c.name} class trial.`,
  })),
);
GEAR.push(...PROFESSION_MASTERY_GEAR);
GEAR.push(...WARDROBE_GEAR);
GEAR.push(...ACCESSORY_GEAR);
GEAR.push(
  ...NECKLACE_GEAR,
  ...OFFHAND_GEAR,
  ...DUAL_WIELD_GEAR,
  ...RANGED_GEAR,
  ...TRAINED_WEAPON_GEAR,
);
GEAR.push(...SHADOWFANG_GEAR, ...DUSKWOOD_GEAR);
for (const set of GEAR_SETS) set.bonuses.push(WARDROBE_SET_BONUSES[set.id]);
GEAR.push(...ENDGAME_GEAR);
for (const armor of ["cloth", "leather", "mail", "plate"] as const)
  GEAR_SETS.push({
    id: `dawnward_${armor}`,
    name: `Dawnward ${armor}`,
    armor,
    profession:
      armor === "cloth"
        ? "tailoring"
        : armor === "leather"
          ? "leatherworking"
          : "blacksmithing",
    material:
      armor === "cloth" ? "cloth" : armor === "leather" ? "leather" : "ore",
    bonuses: [
      { pieces: 2, stats: { health: 30 } },
      { pieces: 4, stats: { power: 10 } },
      { pieces: 6, stats: { regen: 0.8, armor: 6 } },
    ],
  });
// Explicit fit preserves item identity; wands and branches are not inferred from icons.
const TWO_HANDED_WEAPONS = new Set([
  "starter_warrior",
  "starter_mage",
  "starter_hunter",
  "starter_warlock",
  "starter_druid",
  "ember_staff",
  "longbow",
  "reinforced_bow",
  "dockmaster_maul",
  "rigging_longbow",
  "rigging_staff",
  "ash_bow",
  "ember_branch",
  "moonhowl_longbow",
  "tower_staff",
  "ravenhill_bow",
  "twilight_staff",
]);
for (const g of GEAR)
  if (g.slot === "weapon")
    g.weaponHands ??= TWO_HANDED_WEAPONS.has(g.id) ? 2 : 1;
for (const g of GEAR)
  if (LEGACY_WEAPON_TYPES[g.id]) g.weaponType = LEGACY_WEAPON_TYPES[g.id];
for (const g of GEAR)
  if (LEGACY_RANGED[g.id]) g.rangedType = LEGACY_RANGED[g.id];
export const GEAR_MAP = instanceCatalog(
  Object.fromEntries(GEAR.map((g) => [g.id, g])) as Record<string, GearDef>,
);
export const RARITY_COLORS = {
  common: "#aaa99e",
  uncommon: "#9bc27d",
  rare: "#80b3df",
  epic: "#bd95d9",
};
export const STAT_LABELS: Record<Stat, string> = {
  power: "Damage",
  health: "Health",
  armor: "Armor",
  haste: "Attack speed",
  crit: "Critical chance",
  speed: "Move speed",
  regen: "Health / sec",
  magnet: "Pickup radius",
};
export interface ProfessionDef {
  id: ProfessionId;
  name: string;
  icon: string;
  type: "Gathering" | "Crafting";
  description: string;
  color: string;
  pair: string;
}
export const PROFESSIONS: ProfessionDef[] = [
  {
    id: "herbalism",
    name: "Herbalism",
    icon: "leaf",
    type: "Gathering",
    description: "Gather herbs of increasing grades as your skill grows.",
    color: "#98b887",
    pair: "Pairs with Alchemy",
  },
  {
    id: "alchemy",
    name: "Alchemy",
    icon: "potion",
    type: "Crafting",
    description: "Brew healing potions and prepare for the next expedition.",
    color: "#b194c5",
    pair: "Uses herb grades",
  },
  {
    id: "mining",
    name: "Mining",
    icon: "pickaxe",
    type: "Gathering",
    description: "Mine copper, tin, iron and mithril as your skill grows.",
    color: "#c79b75",
    pair: "Pairs with Blacksmithing or Engineering",
  },
  {
    id: "blacksmithing",
    name: "Blacksmithing",
    icon: "anvil",
    type: "Crafting",
    description: "Forge weapons for warriors, rogues and paladins.",
    color: "#b5a58c",
    pair: "Uses ore grades",
  },
  {
    id: "engineering",
    name: "Engineering",
    icon: "gear",
    type: "Crafting",
    description: "Construct bombs that can break a dangerous surround.",
    color: "#c5b36b",
    pair: "Uses ore and cloth grades",
  },
  {
    id: "skinning",
    name: "Skinning",
    icon: "dagger",
    type: "Gathering",
    description: "Recover usable leather grades from defeated wolves.",
    color: "#b7a079",
    pair: "Pairs with Leatherworking",
  },
  {
    id: "leatherworking",
    name: "Leatherworking",
    icon: "paw",
    type: "Crafting",
    description: "Craft supple armor with protection and precision.",
    color: "#b89a72",
    pair: "Uses leather grades",
  },
  {
    id: "tailoring",
    name: "Tailoring",
    icon: "robe",
    type: "Crafting",
    description: "Turn cloth dropped by enemies into enchanted robes.",
    color: "#86b9c8",
    pair: "Uses cloth grades; pairs with Enchanting",
  },
  {
    id: "enchanting",
    name: "Enchanting",
    icon: "spark",
    type: "Crafting",
    description: "Disenchant unwanted gear and fashion mystic charms.",
    color: "#b59bd0",
    pair: "Uses dust grades",
  },
];
export interface Recipe {
  id: string;
  name: string;
  profession: ProfessionId | "cooking" | "firstaid";
  icon: string;
  description: string;
  cost: Partial<Record<Material, number>>;
  gold: number;
  skill: number;
  output: string;
  quantity: number;
  reputation?: { faction: FactionId; points: number };
  requiresPattern?: boolean;
  specialization?: SpecializationId;
  trainingRank?: TrainingRank;
}
export const RECIPES: Recipe[] = [
  {
    id: "healing",
    name: "Lesser Healing Potion",
    profession: "alchemy",
    icon: "potion",
    description: "Restore 45 health. Press Q during an expedition.",
    cost: { herbs: 2 },
    gold: 5,
    skill: 1,
    output: "potions",
    quantity: 3,
  },
  {
    id: "sword",
    name: "Copper Longsword",
    profession: "blacksmithing",
    icon: "sword",
    description: "+14% damage, +3% critical chance.",
    cost: { ore: 5 },
    gold: 15,
    skill: 1,
    output: "copper_sword",
    quantity: 1,
  },
  {
    id: "bomb",
    name: "Rough Copper Bomb",
    profession: "engineering",
    icon: "bomb",
    description: "Blast nearby enemies for 120 damage. Press E in combat.",
    cost: { ore: 3, cloth: 1 },
    gold: 5,
    skill: 1,
    output: "bombs",
    quantity: 3,
  },
  {
    id: "jerkin",
    name: "Ranger’s Jerkin",
    profession: "leatherworking",
    icon: "robe",
    description: "+20 health, +7 armor, +5% critical chance.",
    cost: { leather: 5 },
    gold: 15,
    skill: 1,
    output: "ranger_vest",
    quantity: 1,
  },
  {
    id: "robe",
    name: "Azure Linen Robe",
    profession: "tailoring",
    icon: "robe",
    description: "+9% damage, +15 health, +3 armor.",
    cost: { cloth: 6 },
    gold: 15,
    skill: 1,
    output: "azure_robe",
    quantity: 1,
  },
  {
    id: "charm",
    name: "Lesser Mystic Charm",
    profession: "enchanting",
    icon: "gem",
    description: "+10% damage and +0.3 health regeneration.",
    cost: { dust: 2 },
    gold: 10,
    skill: 1,
    output: "enchanted_charm",
    quantity: 1,
  },
  {
    id: "bandage",
    name: "Linen Bandage",
    profession: "firstaid",
    icon: "heart",
    description:
      "A healing supply for your next expedition. Restores 45 health.",
    cost: { cloth: 2 },
    gold: 0,
    skill: 1,
    output: "potions",
    quantity: 1,
  },
  {
    id: "food",
    name: "Grilled Smallfish",
    profession: "cooking",
    icon: "fish",
    description:
      "A well-fed expedition grants +15 maximum health. One meal per run.",
    cost: { fish: 2 },
    gold: 0,
    skill: 1,
    output: "food",
    quantity: 1,
  },
];
RECIPES.push(
  ...GEAR_SETS.filter((set) => !set.id.startsWith("dawnward_")).flatMap((set) =>
    (["hands", "head", "chest"] as Slot[]).map((slot, i) => {
      const item = GEAR_MAP[`${set.id}_${slot}`];
      return {
        id: `craft_${item.id}`,
        name: item.name,
        profession: set.profession,
        icon: item.icon,
        description: `${set.name} set piece. Requires character level ${item.level} to equip.`,
        cost: { [set.material]: [5, 7, 9][i], ...(i > 0 ? { dust: 1 } : {}) },
        gold: [20, 30, 40][i],
        skill: [25, 50, 75][i],
        output: item.id,
        quantity: 1,
      };
    }),
  ),
);
RECIPES.push(
  {
    id: "healing_batch",
    name: "Field Healing Kit",
    profession: "alchemy",
    icon: "potion",
    description:
      "A prepared batch of six healing supplies. Each restores 45 health.",
    cost: { herbs: 4 },
    gold: 8,
    skill: 25,
    output: "potions",
    quantity: 6,
  },
  {
    id: "healing_reserve",
    name: "Expedition Healing Reserve",
    profession: "alchemy",
    icon: "potion",
    description:
      "Eight healing supplies for a long journey. Each restores 45 health.",
    cost: { herbs: 6, cloth: 1 },
    gold: 10,
    skill: 75,
    output: "potions",
    quantity: 8,
  },
  {
    id: "bomb_batch",
    name: "Copper Bomb Crate",
    profession: "engineering",
    icon: "bomb",
    description:
      "A carefully packed reserve of six bombs. Each deals 120 damage.",
    cost: { ore: 6, cloth: 2 },
    gold: 8,
    skill: 50,
    output: "bombs",
    quantity: 6,
  },
  {
    id: "craft_goggles",
    name: "Field Engineer’s Goggles",
    profession: "engineering",
    icon: "helmet",
    description:
      "+6% critical chance and +12% pickup radius. Requires character level 3.",
    cost: { ore: 4, leather: 2 },
    gold: 20,
    skill: 25,
    output: "field_goggles",
    quantity: 1,
  },
  {
    id: "craft_bow",
    name: "Reinforced Hunting Bow",
    profession: "leatherworking",
    icon: "bow",
    description: "+22% damage and +5% attack speed. Hunter; character level 5.",
    cost: { leather: 8, ore: 3 },
    gold: 35,
    skill: 50,
    output: "reinforced_bow",
    quantity: 1,
  },
  {
    id: "craft_greater_charm",
    name: "Greater Mystic Charm",
    profession: "enchanting",
    icon: "gem",
    description:
      "+16% damage and +7% attack speed. Requires character level 5.",
    cost: { dust: 5 },
    gold: 35,
    skill: 50,
    output: "greater_charm",
    quantity: 1,
  },
  {
    id: "craft_runed_charm",
    name: "Runed Dawnstone",
    profession: "enchanting",
    icon: "spark",
    description:
      "+22% damage and +0.8 health per second. Requires character level 8.",
    cost: { dust: 8, ore: 3 },
    gold: 60,
    skill: 100,
    output: "runed_charm",
    quantity: 1,
  },
  {
    id: "bandage_roll",
    name: "Heavy Linen Bandage Roll",
    profession: "firstaid",
    icon: "heart",
    description: "Three healing supplies. Each restores 45 health.",
    cost: { cloth: 5 },
    gold: 0,
    skill: 25,
    output: "potions",
    quantity: 3,
  },
  {
    id: "trail_rations",
    name: "Smallfish Trail Rations",
    profession: "cooking",
    icon: "fish",
    description:
      "Prepare three meals. Each grants +15 maximum health for one expedition.",
    cost: { fish: 5, herbs: 1 },
    gold: 0,
    skill: 25,
    output: "food",
    quantity: 3,
  },
);
RECIPES.push(
  {
    id: "craft_trailguard",
    name: "Trailguard Gloves",
    profession: "leatherworking",
    icon: "gloves",
    description:
      "Timbermaw leather gloves. Requires character level 10 to equip.",
    cost: { leather: 14, herbs: 6, ore: 4 },
    gold: 65,
    skill: 125,
    output: "trailguard_gloves",
    quantity: 1,
    reputation: { faction: "timbermaw", points: 500 },
    requiresPattern: true,
  },
  {
    id: "craft_forgeguard",
    name: "Forgeguard Gauntlets",
    profession: "blacksmithing",
    icon: "gloves",
    description:
      "Thorium mail gauntlets. Requires character level 10 to equip.",
    cost: { ore: 18, cloth: 8 },
    gold: 80,
    skill: 125,
    output: "forgeguard_gauntlets",
    quantity: 1,
    reputation: { faction: "thorium", points: 500 },
    requiresPattern: true,
  },
  {
    id: "craft_lantern_hood",
    name: "Lantern Keeper's Hood",
    profession: "tailoring",
    icon: "helmet",
    description: "Argent cloth headwear. Requires character level 10 to equip.",
    cost: { cloth: 18, dust: 7 },
    gold: 75,
    skill: 125,
    output: "lantern_hood",
    quantity: 1,
    reputation: { faction: "argent", points: 500 },
    requiresPattern: true,
  },
);
RECIPES.push(
  {
    id: "craft_bastion_cuirass",
    name: "Bastion Cuirass",
    profession: "blacksmithing",
    icon: "robe",
    description: "Plate chest armor. Requires character level 12 to equip.",
    cost: { ore: 20, leather: 6 },
    gold: 85,
    skill: 150,
    trainingRank: 3,
    specialization: "armorsmith",
    output: "bastion_cuirass",
    quantity: 1,
  },
  {
    id: "craft_tempered_edge",
    name: "Tempered Edge",
    profession: "blacksmithing",
    icon: "sword",
    description:
      "Warrior, Rogue or Paladin weapon. Requires character level 12 to equip.",
    cost: { ore: 20, dust: 4 },
    gold: 85,
    skill: 150,
    trainingRank: 3,
    specialization: "weaponsmith",
    output: "tempered_edge",
    quantity: 1,
  },
  {
    id: "craft_precision_goggles",
    name: "Gnomish Precision Goggles",
    profession: "engineering",
    icon: "helmet",
    description:
      "Precision headwear, usable by every class at character level 12.",
    cost: { ore: 14, leather: 8, dust: 4 },
    gold: 75,
    skill: 150,
    trainingRank: 3,
    specialization: "gnomish",
    output: "precision_goggles",
    quantity: 1,
  },
  {
    id: "goblin_bomb_crate",
    name: "Goblin Bomb Crate",
    profession: "engineering",
    icon: "bomb",
    description:
      "Nine bombs. Each deals 120 damage to nearby enemies. Press E in combat.",
    cost: { ore: 8, cloth: 3 },
    gold: 10,
    skill: 150,
    trainingRank: 3,
    specialization: "goblin",
    output: "bombs",
    quantity: 9,
  },
  {
    id: "craft_stormhide_hood",
    name: "Stormhide Hood",
    profession: "leatherworking",
    icon: "helmet",
    description: "Leather headwear. Requires character level 12 to equip.",
    cost: { leather: 18, dust: 5 },
    gold: 75,
    skill: 150,
    trainingRank: 3,
    specialization: "elemental",
    output: "stormhide_hood",
    quantity: 1,
  },
  {
    id: "craft_spirit_talisman",
    name: "Trail Spirit Talisman",
    profession: "leatherworking",
    icon: "paw",
    description:
      "A restorative trinket, usable by every class at character level 12.",
    cost: { leather: 14, herbs: 8, dust: 3 },
    gold: 75,
    skill: 150,
    trainingRank: 3,
    specialization: "tribal",
    output: "spirit_talisman",
    quantity: 1,
  },
  {
    id: "craft_scaleguard_vest",
    name: "Scaleguard Vest",
    profession: "leatherworking",
    icon: "robe",
    description: "Mail chest armor. Requires character level 12 to equip.",
    cost: { leather: 18, ore: 8 },
    gold: 85,
    skill: 150,
    trainingRank: 3,
    specialization: "dragonscale",
    output: "scaleguard_vest",
    quantity: 1,
  },
  {
    id: "craft_distiller_stone",
    name: "Distiller's Stone",
    profession: "alchemy",
    icon: "potion",
    description:
      "An Expert charm, usable by every class at character level 12.",
    cost: { herbs: 16, dust: 5, ore: 4 },
    gold: 75,
    skill: 150,
    trainingRank: 3,
    output: "distiller_stone",
    quantity: 1,
  },
  {
    id: "craft_starwoven_raiment",
    name: "Starwoven Raiment",
    profession: "tailoring",
    icon: "robe",
    description:
      "Expert cloth chest armor. Requires character level 12 to equip.",
    cost: { cloth: 22, dust: 6 },
    gold: 85,
    skill: 150,
    trainingRank: 3,
    output: "starwoven_raiment",
    quantity: 1,
  },
  {
    id: "craft_resonant_focus",
    name: "Resonant Focus",
    profession: "enchanting",
    icon: "gem",
    description:
      "An Expert charm, usable by every class at character level 12.",
    cost: { dust: 10, ore: 6 },
    gold: 75,
    skill: 150,
    trainingRank: 3,
    output: "resonant_focus",
    quantity: 1,
  },
  {
    id: "artisan_healing_batch",
    name: "Artisan Healing Batch",
    profession: "alchemy",
    icon: "potion",
    description:
      "Twelve healing supplies. Each restores 45 health. Press Q in combat.",
    cost: { herbs: 6, dust: 2 },
    gold: 12,
    skill: 225,
    trainingRank: 4,
    output: "potions",
    quantity: 12,
  },
  {
    id: "craft_masterwork_helm",
    name: "Masterwork Bastion Helm",
    profession: "blacksmithing",
    icon: "helmet",
    description:
      "Artisan plate headwear. Requires character level 18 to equip.",
    cost: { ore: 30, leather: 10, dust: 5 },
    gold: 130,
    skill: 225,
    trainingRank: 4,
    output: "masterwork_helm",
    quantity: 1,
  },
  {
    id: "craft_gyro_core",
    name: "Gyro Balance Core",
    profession: "engineering",
    icon: "gear",
    description:
      "An Artisan trinket, usable by every class at character level 18.",
    cost: { ore: 24, dust: 8, cloth: 8 },
    gold: 130,
    skill: 225,
    trainingRank: 4,
    output: "gyro_core",
    quantity: 1,
  },
  {
    id: "craft_prowler_boots",
    name: "Masterwork Prowler Boots",
    profession: "leatherworking",
    icon: "boot",
    description: "Artisan leather boots. Requires character level 18 to equip.",
    cost: { leather: 28, herbs: 8, dust: 5 },
    gold: 130,
    skill: 225,
    trainingRank: 4,
    output: "prowler_boots",
    quantity: 1,
  },
  {
    id: "craft_starwoven_crown",
    name: "Starwoven Crown",
    profession: "tailoring",
    icon: "helmet",
    description:
      "Artisan cloth headwear. Requires character level 18 to equip.",
    cost: { cloth: 30, dust: 10 },
    gold: 130,
    skill: 225,
    trainingRank: 4,
    output: "starwoven_crown",
    quantity: 1,
  },
  {
    id: "craft_prismatic_waystone",
    name: "Prismatic Waystone",
    profession: "enchanting",
    icon: "spark",
    description:
      "An Artisan charm, usable by every class at character level 18.",
    cost: { dust: 16, ore: 10 },
    gold: 130,
    skill: 225,
    trainingRank: 4,
    output: "prismatic_waystone",
    quantity: 1,
  },
  {
    id: "bandage_bundle",
    name: "Field Bandage Bundle",
    profession: "firstaid",
    icon: "heart",
    description: "Six healing supplies. Each restores 45 health.",
    cost: { cloth: 8 },
    gold: 0,
    skill: 75,
    trainingRank: 2,
    output: "potions",
    quantity: 6,
  },
  {
    id: "expert_bandages",
    name: "Expert Bandage Kit",
    profession: "firstaid",
    icon: "heart",
    description: "Nine healing supplies. Each restores 45 health.",
    cost: { cloth: 10 },
    gold: 0,
    skill: 150,
    trainingRank: 3,
    output: "potions",
    quantity: 9,
  },
  {
    id: "artisan_bandages",
    name: "Artisan Field Dressing Kit",
    profession: "firstaid",
    icon: "heart",
    description: "Eighteen healing supplies. Each restores 45 health.",
    cost: { cloth: 12 },
    gold: 0,
    skill: 225,
    trainingRank: 4,
    output: "potions",
    quantity: 18,
  },
  {
    id: "hearty_rations",
    name: "Hearty Trail Rations",
    profession: "cooking",
    icon: "fish",
    description:
      "Six meals. Each grants +15 maximum health for one expedition.",
    cost: { fish: 8, herbs: 3 },
    gold: 0,
    skill: 75,
    trainingRank: 2,
    output: "food",
    quantity: 6,
  },
  {
    id: "expert_rations",
    name: "Expert Expedition Rations",
    profession: "cooking",
    icon: "fish",
    description:
      "Nine meals. Each grants +15 maximum health for one expedition.",
    cost: { fish: 10, herbs: 4 },
    gold: 0,
    skill: 150,
    trainingRank: 3,
    output: "food",
    quantity: 9,
  },
  {
    id: "artisan_feast",
    name: "Artisan Journey Feast",
    profession: "cooking",
    icon: "fish",
    description:
      "Twelve meals. Each grants +15 maximum health for one expedition.",
    cost: { fish: 12, herbs: 5 },
    gold: 0,
    skill: 225,
    trainingRank: 4,
    output: "food",
    quantity: 12,
  },
);
RECIPES.push({
  id: "workshop_bomb_bundle",
  name: "Workshop Bomb Bundle",
  profession: "engineering",
  icon: "bomb",
  description:
    "Six bombs assembled for practice. Each deals 120 damage to nearby enemies.",
  cost: { ore: 5, cloth: 2 },
  gold: 8,
  skill: 75,
  trainingRank: 2,
  output: "bombs",
  quantity: 6,
});
RECIPES.push(...WARDROBE_RECIPES);
RECIPES.push(
  ...ACCESSORY_RECIPES,
  ...OFFHAND_RECIPES,
  ...DUAL_WIELD_RECIPES,
  ...RANGED_RECIPES,
  ...TRAINED_WEAPON_RECIPES,
);
RECIPES.push(...ENDGAME_RECIPES);
for (const recipe of RECIPES)
  recipe.cost = gradedCosts(recipe.cost, recipe.skill);
export interface ZoneDef {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  difficulty: number;
  duration: number;
  palette: string[];
  enemies: string[];
  boss: string;
  unlock: number;
  unlockText: string;
  icon: string;
  reward: string;
  dungeon?: boolean;
  prerequisite?: string;
  minLevel?: number;
}
export const ZONES: ZoneDef[] = [
  {
    id: "elwynn",
    name: "Elwynn Forest",
    subtitle: "The first adventure",
    description:
      "Beyond the warm light of Goldshire, something stirs between the trees. The forest is no longer yours alone.",
    difficulty: 1,
    duration: 360,
    palette: ["#283e2c", "#344b30", "#1d3327", "#587145", "#b9b07d"],
    enemies: ["wolf", "kobold", "gnoll"],
    boss: "Hogger",
    unlock: 0,
    unlockText: "Available to all adventurers",
    icon: "leaf",
    reward: "Lionheart Talisman",
  },
  {
    id: "westfall",
    name: "Westfall",
    subtitle: "Dust & defiance",
    description:
      "The fields are quiet. Too quiet. Outlaws gather at the old watchtower, and the harvest has turned against you.",
    difficulty: 1.35,
    duration: 420,
    palette: ["#615332", "#71603a", "#4b432b", "#a18d50", "#c7b989"],
    enemies: ["wolf", "defias", "golem"],
    boss: "Defias Captain",
    unlock: 120,
    unlockText: "Defeat 120 enemies to unlock",
    icon: "sun",
    reward: "Defias Shadowblade",
  },
  {
    id: "tirisfal",
    name: "Tirisfal Glades",
    subtitle: "Whispers of the fallen",
    description:
      "Beneath a pale moon, the dead have forgotten how to rest. Follow the lanterns. Do not follow the whispers.",
    difficulty: 1.65,
    duration: 480,
    palette: ["#293a39", "#344543", "#1d2b30", "#526566", "#8fb5b2"],
    enemies: ["skeleton", "ghoul", "wraith"],
    boss: "The Gravekeeper",
    unlock: -1,
    unlockText: "Complete an expedition to unlock",
    icon: "moon",
    reward: "Moonwoven Vestments",
  },
];
ZONES.push({
  id: "deadmines",
  name: "The Deadmines",
  subtitle: "Beneath Westfall",
  description:
    "From the roaring workshop to the Ironclad's upper deck, break the Defias Brotherhood one guardian at a time.",
  difficulty: 1.45,
  duration: 315,
  palette: ["#303336", "#414344", "#23292c", "#776a51", "#bca173"],
  enemies: ["defias", "kobold", "golem"],
  boss: "Edwin VanCleef",
  unlock: -2,
  unlockText: "Defeat the Westfall boss to unlock",
  icon: "anvil",
  reward: "Rare dungeon equipment",
  dungeon: true,
});
ZONES.push({
  id: "ragefire",
  name: "Ragefire Chasm",
  subtitle: "Beneath Orgrimmar",
  description:
    "Descend into the Cleft of Shadow. Break the trogg refuge, cross the molten caverns and silence the Searing Blade.",
  difficulty: 1.4,
  duration: 315,
  palette: ["#291c1d", "#463035", "#1c181e", "#bd6a3b", "#eca865"],
  enemies: ["trogg", "earthborer", "cultist"],
  boss: "Bazzalan",
  unlock: -2,
  unlockText: "Defeat the Tirisfal boss to unlock",
  icon: "fire",
  reward: "Rare dungeon equipment",
  dungeon: true,
});
ZONES.push({
  id: "shadowfang",
  name: "Shadowfang Keep",
  subtitle: "Above Silverpine Forest",
  description:
    "Climb the haunted castle above Pyrewood. Break the spectral watch, silence the worg pack and confront Arugal beneath the moon.",
  difficulty: 1.6,
  duration: 390,
  palette: ["#222430", "#363747", "#151b29", "#74668d", "#a9b9cf"],
  enemies: ["keep_servitor", "keep_worgen", "keep_guard"],
  boss: "Archmage Arugal",
  unlock: -2,
  unlockText: "Clear Ragefire Chasm to unlock",
  icon: "moon",
  reward: "Rare castle equipment",
  dungeon: true,
});
ZONES.push(DUSKWOOD_ZONE, ...ENDGAME_ZONES);
export interface QuestDef {
  zoneId?: string;
  id: string;
  name: string;
  description: string;
  metric:
    | "kills"
    | "gathered"
    | "bestTime"
    | "crafts"
    | "wins"
    | "runs"
    | "encounters"
    | "dungeonWins";
  goal: number;
  gold: number;
  xp: number;
  icon: string;
  materials?: Partial<Record<Material, number>>;
}
export const QUESTS: QuestDef[] = [
  {
    id: "firstblood",
    name: "A Threat in the Woods",
    description: "Defeat 50 enemies on any expedition.",
    metric: "kills",
    goal: 50,
    gold: 75,
    xp: 80,
    icon: "sword",
  },
  {
    id: "holdline",
    name: "Hold the Line",
    description: "Survive for 2 minutes in a single expedition.",
    metric: "bestTime",
    goal: 120,
    gold: 90,
    xp: 100,
    icon: "shield",
  },
  {
    id: "gather",
    name: "Honest Work",
    description: "Gather 10 materials during your expeditions.",
    metric: "gathered",
    goal: 10,
    gold: 65,
    xp: 80,
    icon: "pickaxe",
    materials: { herbs: 3, ore: 3 },
  },
  {
    id: "craft",
    name: "Made by Hand",
    description: "Craft 3 recipes at camp.",
    metric: "crafts",
    goal: 3,
    gold: 85,
    xp: 100,
    icon: "anvil",
    materials: { cloth: 4, dust: 2 },
  },
  {
    id: "return",
    name: "The Road Goes On",
    description: "Finish 3 expeditions, victorious or fallen.",
    metric: "runs",
    goal: 3,
    gold: 120,
    xp: 120,
    icon: "map",
  },
  {
    id: "victory",
    name: "A Legend Begins",
    description: "Defeat a final boss and complete an expedition.",
    metric: "wins",
    goal: 1,
    gold: 200,
    xp: 180,
    icon: "crown",
  },
  {
    id: "explorer",
    name: "Off the Beaten Path",
    description: "Complete 6 landmarks across your expeditions.",
    metric: "encounters",
    goal: 6,
    gold: 120,
    xp: 130,
    icon: "map",
    materials: { herbs: 4, ore: 4 },
  },
  {
    id: "pathfinder",
    name: "Every Stone Has a Story",
    description: "Complete 18 landmarks across your expeditions.",
    metric: "encounters",
    goal: 18,
    gold: 240,
    xp: 220,
    icon: "compass",
    materials: { dust: 6, cloth: 8 },
  },
];
QUESTS.push({
  id: "deadmines-clear",
  zoneId: "deadmines",
  name: "Break the Brotherhood",
  description: "Defeat Edwin VanCleef and complete the Deadmines.",
  metric: "dungeonWins",
  goal: 1,
  gold: 120,
  xp: 300,
  icon: "anvil",
  materials: { ore: 6, dust: 3 },
});

QUESTS.push({
  id: "ragefire-clear",
  zoneId: "ragefire",
  name: "Silence the Searing Blade",
  description: "Defeat all four guardians and complete Ragefire Chasm.",
  metric: "dungeonWins",
  goal: 1,
  gold: 120,
  xp: 300,
  icon: "fire",
  materials: { cloth: 6, dust: 3 },
});
QUESTS.push({
  id: "shadowfang-clear",
  zoneId: "shadowfang",
  name: "Break the Moonlit Curse",
  description: "Defeat all four guardians and complete Shadowfang Keep.",
  metric: "dungeonWins",
  goal: 1,
  gold: 180,
  xp: 400,
  icon: "moon",
  materials: { cloth: 6, dust: 5 },
});
QUESTS.push({
  id: "nightwatch",
  name: "The Lanterns of Darkshire",
  description:
    "Defeat Stitches in Duskwood. Return to claim the Night Watch’s thanks.",
  metric: "wins",
  zoneId: "duskwood",
  goal: 1,
  gold: 250,
  xp: 300,
  icon: "moon",
  materials: { dream_dust: 6 },
});
