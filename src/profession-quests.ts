import type { GearDef, Stats } from "./content";
import type { TradeId } from "./training";
import { materialFor, RESOURCE_TIERS } from "./resources";
import type { MaterialFamily } from "./resources";

export type ProfessionMetric = "gathered" | "crafts" | "uses";
export interface ProfessionQuestProgress {
  chapter: number;
  attempt: string | null;
  progress: Record<ProfessionMetric, number>;
}
export interface ProfessionQuestSnapshot {
  trade: TradeId;
  chapter: number;
  attempt: string;
}
export interface ProfessionProof extends ProfessionQuestSnapshot {
  gathered: number;
  uses: number;
}
interface ProfessionQuestDef {
  name: string;
  mentor: string;
  icon: string;
  family: MaterialFamily;
  gathering?: boolean;
  field?: "healing" | "bombs" | "meals";
  projects: [string, string, string, string];
  destinations?: [string[], string[], string[], string[]];
  reward: string;
  stats: Partial<Stats>;
}
export const PROFESSION_QUESTS: Record<TradeId, ProfessionQuestDef> = {
  herbalism: {
    name: "Herbalism",
    mentor: "Botanist Willowmere",
    icon: "leaf",
    family: "herbs",
    gathering: true,
    projects: [
      "First blooms",
      "The thornwood survey",
      "Kingsblood on the frontier",
      "A Sungrass expedition",
    ],
    destinations: [["elwynn"], ["elwynn"], ["westfall"], ["tirisfal"]],
    reward: "Botanist's Moonstone",
    stats: { power: 12, regen: 0.5, magnet: 30 },
  },
  mining: {
    name: "Mining",
    mentor: "Prospector Flintvein",
    icon: "pickaxe",
    family: "ore",
    gathering: true,
    projects: [
      "A copper appraisal",
      "Tin beneath the fields",
      "Iron in the deep places",
      "Mithril of the north",
    ],
    destinations: [
      ["elwynn"],
      ["westfall"],
      ["westfall", "deadmines", "ragefire"],
      ["tirisfal"],
    ],
    reward: "Prospector's Lodestone",
    stats: { health: 35, armor: 6, magnet: 30 },
  },
  skinning: {
    name: "Skinning",
    mentor: "Tracker Ashpelt",
    icon: "paw",
    family: "leather",
    gathering: true,
    projects: [
      "A clean first hide",
      "The Westfall hunt",
      "Heavy hides for the guild",
      "The patient tracker",
    ],
    destinations: [
      ["elwynn"],
      ["westfall"],
      ["westfall"],
      ["elwynn", "westfall"],
    ],
    reward: "Tracker's Fetish",
    stats: { crit: 6, speed: 12, regen: 0.4 },
  },
  fishing: {
    name: "Fishing",
    mentor: "Angler Reedbrook",
    icon: "fish",
    family: "fish",
    gathering: true,
    projects: [
      "The first catch",
      "Catfish along the coast",
      "Pools beneath the Ironclad",
      "Yellowtail in the mist",
    ],
    destinations: [["elwynn"], ["westfall"], ["deadmines"], ["tirisfal"]],
    reward: "Angler's Lucky Charm",
    stats: { crit: 5, magnet: 50, health: 25 },
  },
  alchemy: {
    name: "Alchemy",
    mentor: "Apothecary Amberwick",
    icon: "potion",
    family: "herbs",
    field: "healing",
    projects: [
      "A field-tested remedy",
      "A travelling apothecary",
      "Remedies under pressure",
      "The lifebloom project",
    ],
    reward: "Lifebloom Vial",
    stats: { health: 25, regen: 1.2, power: 8 },
  },
  blacksmithing: {
    name: "Blacksmithing",
    mentor: "Smith Ironbough",
    icon: "anvil",
    family: "ore",
    projects: [
      "The first hammer strokes",
      "A journeyman's steel",
      "Work for the front line",
      "The anvilheart project",
    ],
    reward: "Anvilheart",
    stats: { power: 10, armor: 8, health: 30 },
  },
  engineering: {
    name: "Engineering",
    mentor: "Tinkerer Sparkwhistle",
    icon: "gear",
    family: "ore",
    field: "bombs",
    projects: [
      "A working prototype",
      "The live-fire test",
      "Precision in the field",
      "The clockwork project",
    ],
    reward: "Clockwork Capacitor",
    stats: { power: 10, haste: 8, magnet: 25 },
  },
  leatherworking: {
    name: "Leatherworking",
    mentor: "Leatherworker Mossstitch",
    icon: "paw",
    family: "leather",
    projects: [
      "The first careful stitches",
      "A stronger binding",
      "Armor for the wild trails",
      "The wildstitch project",
    ],
    reward: "Wildstitch Charm",
    stats: { haste: 8, speed: 12, armor: 5 },
  },
  tailoring: {
    name: "Tailoring",
    mentor: "Weaver Starspindle",
    icon: "robe",
    family: "cloth",
    projects: [
      "The first woven pattern",
      "Thread with purpose",
      "Vestments of the guild",
      "The starthread project",
    ],
    reward: "Starthread Spool",
    stats: { power: 14, haste: 6, regen: 0.5 },
  },
  enchanting: {
    name: "Enchanting",
    mentor: "Runekeeper Dawnscript",
    icon: "spark",
    family: "dust",
    projects: [
      "A first inscription",
      "Focused enchantments",
      "Runes of lasting power",
      "The prismatic project",
    ],
    reward: "Runekeeper's Prism",
    stats: { power: 22, haste: 10, regen: 0.5 },
  },
  firstaid: {
    name: "First Aid",
    mentor: "Surgeon Silverleaf",
    icon: "heart",
    family: "cloth",
    field: "healing",
    projects: [
      "A prepared field medic",
      "Aid on the road",
      "Treatment under pressure",
      "The surgeon's oath",
    ],
    reward: "Field Surgeon's Seal",
    stats: { health: 50, regen: 1.2, armor: 3 },
  },
  cooking: {
    name: "Cooking",
    mentor: "Cook Hearthwillow",
    icon: "fish",
    family: "fish",
    field: "meals",
    projects: [
      "Provisions for the road",
      "A warm travelling meal",
      "Feeding an expedition",
      "The hearthkeeper's feast",
    ],
    reward: "Hearthkeeper's Medallion",
    stats: { health: 35, regen: 0.7, speed: 8 },
  },
};
export const PROFESSION_TRADES = Object.keys(PROFESSION_QUESTS) as TradeId[];
export const PROFESSION_PROJECTS = RESOURCE_TIERS.map((t, i) => ({
  ...t,
  rank: i + 1,
  gathered: [8, 10, 12, 16][i],
  crafts: [2, 3, 4, 6][i],
  delivery: [2, 3, 4, 6][i],
  gold: [30, 60, 90, 150][i],
  xp: [100, 200, 350, 600][i],
}));
export function professionGoals(
  trade: TradeId,
  chapter: number,
): Record<ProfessionMetric, number> {
  const q = PROFESSION_QUESTS[trade],
    p = PROFESSION_PROJECTS[chapter];
  if (!q || !p) return { gathered: 0, crafts: 0, uses: 0 };
  return {
    gathered: q.gathering ? p.gathered : 0,
    crafts: q.gathering ? 0 : p.crafts,
    uses:
      q.field === "healing"
        ? [1, 2, 3, 4][chapter]
        : q.field === "bombs"
          ? [1, 1, 2, 3][chapter]
          : q.field === "meals"
            ? [1, 1, 2, 2][chapter]
            : 0,
  };
}
export const professionDelivery = (trade: TradeId, chapter: number) =>
  materialFor(PROFESSION_QUESTS[trade].family, chapter + 1);
export const masteryGearId = (trade: TradeId) => `mastery_${trade}`;
export const freshProfessionQuest = (): ProfessionQuestProgress => ({
  chapter: 0,
  attempt: null,
  progress: { gathered: 0, crafts: 0, uses: 0 },
});
export const PROFESSION_MASTERY_GEAR: GearDef[] = PROFESSION_TRADES.map(
  (trade) => ({
    id: masteryGearId(trade),
    name: PROFESSION_QUESTS[trade].reward,
    icon: PROFESSION_QUESTS[trade].icon,
    slot: "trinket",
    rarity: "epic",
    level: 20,
    value: 0,
    stats: PROFESSION_QUESTS[trade].stats,
    description: `Earned by completing all four ${PROFESSION_QUESTS[trade].name} guild projects and reaching skill 300. A permanent mastery reward.`,
  }),
);
export function validProfessionSnapshot(
  raw: unknown,
): raw is ProfessionQuestSnapshot {
  if (!raw || typeof raw !== "object") return false;
  const p = raw as Record<string, unknown>;
  return (
    typeof p.trade === "string" &&
    Object.hasOwn(PROFESSION_QUESTS, p.trade) &&
    typeof p.chapter === "number" &&
    Number.isInteger(p.chapter) &&
    p.chapter >= 0 &&
    p.chapter < 4 &&
    typeof p.attempt === "string" &&
    /^[a-zA-Z0-9-]{1,64}$/.test(p.attempt)
  );
}
export const isMasteryGear = (id: string) =>
  PROFESSION_TRADES.some((trade) => masteryGearId(trade) === id);
