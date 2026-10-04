import type { ClassId, GearDef, Stats, ZoneDef } from "./content";

export const DUSKWOOD_SPRITES: Record<string, number> = {
  dusk_wolf: 0,
  dusk_spider: 1,
  dusk_rotted: 2,
  dusk_raider: 3,
  dusk_worgen: 4,
  dusk_mage: 5,
  dusk_ogre: 6,
  dusk_defias: 7,
  stitches: 8,
};
export const DUSKWOOD_ZONE: ZoneDef = {
  id: "duskwood",
  name: "Duskwood",
  subtitle: "Keep the lanterns burning",
  description:
    "The Night Watch holds a road through the dark. Beyond its lanterns, Raven Hill wakes and something stitched together is coming for Darkshire.",
  difficulty: 1.8,
  duration: 540,
  palette: ["#242e37", "#303c42", "#19252f", "#526665", "#9db2b8"],
  enemies: Object.keys(DUSKWOOD_SPRITES).filter((id) => id !== "stitches"),
  boss: "Stitches",
  unlock: -2,
  prerequisite: "shadowfang",
  minLevel: 20,
  unlockText: "Clear Shadowfang Keep to unlock; character level 20 to enter",
  icon: "moon",
  reward: "Watchkeeper's Oath",
};
export function duskwoodRoster(time: number): string[] {
  return DUSKWOOD_ZONE.enemies.slice(
    0,
    time < 35 ? 2 : time < 150 ? 4 : time < 300 ? 6 : 8,
  );
}
const melee: ClassId[] = ["warrior", "rogue", "paladin"];
const casters: ClassId[] = ["mage", "priest", "warlock", "shaman", "druid"];
function item(
  id: string,
  name: string,
  slot: GearDef["slot"],
  icon: string,
  stats: Partial<Stats>,
  armor?: GearDef["armor"],
  classes?: ClassId[],
): GearDef {
  return {
    id,
    name,
    slot,
    icon,
    stats,
    armor,
    classes,
    level: 20,
    rarity: "rare",
    value: 135,
    description: "Recovered along the Night Watch's lantern road.",
    dropZones: ["duskwood"],
  };
}
export const DUSKWOOD_GEAR: GearDef[] = [
  item(
    "nightwatch_blade",
    "Night Watch Longsword",
    "weapon",
    "sword",
    { power: 24, crit: 6 },
    undefined,
    melee,
  ),
  item(
    "ravenhill_bow",
    "Raven Hill Longbow",
    "weapon",
    "bow",
    { power: 21, haste: 8 },
    undefined,
    ["hunter"],
  ),
  item(
    "twilight_staff",
    "Twilight Lantern Staff",
    "weapon",
    "staff",
    { power: 21, haste: 6, regen: 0.5 },
    undefined,
    casters,
  ),
  item(
    "mistmantle_robes",
    "Mistmantle Vestments",
    "chest",
    "robe",
    { health: 48, power: 11, armor: 5 },
    "cloth",
  ),
  item(
    "brightwood_shoulders",
    "Brightwood Mantle",
    "shoulders",
    "shoulders",
    { armor: 8, health: 30, crit: 5 },
    "leather",
  ),
  item(
    "vulgol_legs",
    "Vul'Gol Trailguard",
    "legs",
    "legs",
    { armor: 13, health: 38, power: 6 },
    "mail",
  ),
  item(
    "dawnwatch_head",
    "Dawnwatch Greathelm",
    "head",
    "helm",
    { armor: 17, health: 36, crit: 4 },
    "plate",
  ),
  item("lantern_cloak", "Lanternkeeper's Cloak", "back", "cape", {
    armor: 6,
    speed: 6,
    health: 25,
  }),
  item("ember_belt", "Last Ember Sash", "waist", "belt", {
    health: 28,
    haste: 6,
    regen: 0.4,
  }),
  item("nightwatch_gloves", "Night Watch Grips", "hands", "glove", {
    power: 10,
    haste: 7,
    armor: 4,
  }),
  item("roadwarden_boots", "Roadwarden's Boots", "boots", "boot", {
    speed: 10,
    armor: 7,
    health: 25,
  }),
  item("ravenglass_token", "Ravenglass Token", "trinket", "gem", {
    power: 12,
    crit: 7,
    magnet: 20,
  }),
  {
    id: "watchkeeper_oath",
    name: "Watchkeeper's Oath",
    slot: "trinket",
    icon: "shield",
    level: 20,
    rarity: "epic",
    stats: { power: 16, health: 50, armor: 7, regen: 0.8 },
    value: 260,
    description:
      "Stitches has fallen. Carry the Night Watch's promise into the next darkness.",
  },
];
