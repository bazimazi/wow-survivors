import type { ClassId } from "./content";

export interface TravelProgress {
  riding: 0 | 1 | 2;
  form: boolean;
  selected: string | null;
}
export interface TravelOption {
  id: string;
  name: string;
  kind: "mount" | "class" | "form";
  race?: string;
  classId?: ClassId;
  level: number;
  rank: 0 | 1 | 2;
  speed: number;
  price: number;
  sprite: number;
  description: string;
}
export const RIDING_RANKS: readonly {
  rank: 1 | 2;
  name: string;
  level: number;
  gold: number;
}[] = [
  { rank: 1, name: "Trail riding", level: 12, gold: 100 },
  { rank: 2, name: "Swift riding", level: 20, gold: 350 },
];
export const TRAVEL_RULES = {
  summon: 1.25,
  formSummon: 0.6,
  damageLock: 4,
  enemyRadius: 160,
  formLevel: 8,
  formGold: 40,
} as const;
const racial = [
  [
    "horse",
    "Human",
    "Chestnut Courser",
    "Swift Chestnut Courser",
    0,
    "A sure-footed companion for the roads beyond Northshire.",
  ],
  [
    "ram",
    "Dwarf",
    "Mountain Ram",
    "Swift Mountain Ram",
    1,
    "A sturdy ram raised on the slopes above Ironforge.",
  ],
  [
    "wolf",
    "Orc",
    "Duskfang Wolf",
    "Swift Duskfang Wolf",
    2,
    "A loyal pack runner with the endurance for distant trails.",
  ],
  [
    "saber",
    "Night Elf",
    "Moontrail Saber",
    "Swift Moontrail Saber",
    3,
    "A silent saber that follows the winding forest paths.",
  ],
  [
    "skeletal",
    "Undead",
    "Gravewind Steed",
    "Swift Gravewind Steed",
    4,
    "A tireless skeletal horse for the roads of Lordaeron.",
  ],
] as const;
export const TRAVEL_OPTIONS: TravelOption[] = racial.flatMap(
  ([id, race, name, swiftName, sprite, description]) => [
    {
      id,
      name,
      kind: "mount",
      race,
      level: 12,
      rank: 1,
      speed: 60,
      price: 200,
      sprite,
      description,
    },
    {
      id: `swift_${id}`,
      name: swiftName,
      kind: "mount",
      race,
      level: 20,
      rank: 2,
      speed: 100,
      price: 650,
      sprite,
      description: `${description} Trained for swifter journeys.`,
    },
  ],
);
TRAVEL_OPTIONS.push(
  {
    id: "oathbound",
    name: "Oathbound Warhorse",
    kind: "class",
    classId: "paladin",
    level: 10,
    rank: 0,
    speed: 60,
    price: 0,
    sprite: 5,
    description:
      "A radiant companion earned by completing the Paladin's three class trials.",
  },
  {
    id: "emberbound",
    name: "Emberbound Felsteed",
    kind: "class",
    classId: "warlock",
    level: 10,
    rank: 0,
    speed: 60,
    price: 0,
    sprite: 6,
    description:
      "A bound fire steed earned by completing the Warlock's three class trials.",
  },
  {
    id: "travel_form",
    name: "Travel Form",
    kind: "form",
    classId: "druid",
    level: 8,
    rank: 0,
    speed: 40,
    price: 40,
    sprite: 7,
    description:
      "Take the shape of a cheetah to cross the wilds with a lighter step.",
  },
  {
    id: "ghost_wolf",
    name: "Ghost Wolf",
    kind: "form",
    classId: "shaman",
    level: 8,
    rank: 0,
    speed: 40,
    price: 40,
    sprite: 8,
    description:
      "Become a spectral wolf and follow the spirits along the open trail.",
  },
);
export const TRAVEL_MAP = Object.fromEntries(
  TRAVEL_OPTIONS.map((t) => [t.id, t]),
);
export const freshTravel = (): TravelProgress => ({
  riding: 0,
  form: false,
  selected: null,
});
