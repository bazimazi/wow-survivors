import type { ClassId, Stats } from "./content";

export type TrialMetric =
  "casts" | "actives" | "mastery" | "elites" | "evolutions" | "bosses";
export interface ClassTrialProgress {
  chapter: number;
  active: boolean;
  progress: Partial<Record<TrialMetric, number>>;
}
export interface ClassProof {
  chapter: number;
  casts: number;
  actives: number;
  mastery: number;
  elites: number;
  evolutions: number;
  bosses: number;
}
export const TRIAL_CHAPTERS = [
  {
    name: "First lessons",
    level: 1,
    goals: { casts: 40, actives: 2 },
    gold: 50,
    xp: 150,
  },
  {
    name: "A practiced hand",
    level: 5,
    goals: { mastery: 1, elites: 1 },
    gold: 100,
    xp: 300,
  },
  {
    name: "A class of your own",
    level: 10,
    goals: { evolutions: 1, bosses: 1 },
    gold: 150,
    xp: 500,
  },
] as const;
export const CLASS_TRIALS: Record<
  ClassId,
  {
    name: string;
    mentor: string;
    relic: string;
    description: string;
    stats: Partial<Stats>;
  }
> = {
  warrior: {
    name: "The steel within",
    mentor: "Veteran of the front line",
    relic: "Vanguard's Insignia",
    description:
      "Earn your place through sweeping steel, a decisive charge and a mastered whirlwind.",
    stats: { power: 10, armor: 8, health: 18 },
  },
  mage: {
    name: "The frostbound lesson",
    mentor: "Keeper of the arcane archive",
    relic: "Frostbound Prism",
    description:
      "Control the field with frost, break a siege with Blizzard and unleash an evolved spell.",
    stats: { power: 12, haste: 7, regen: 0.3 },
  },
  rogue: {
    name: "A shadow's promise",
    mentor: "Watcher of the hidden path",
    relic: "Shadowstep Token",
    description:
      "Practice precise strikes, escape with Vanish and master the orbiting Blade Flurry.",
    stats: { crit: 10, haste: 5, speed: 3 },
  },
  hunter: {
    name: "The patient marksman",
    mentor: "Ranger of the wild trails",
    relic: "Trailkeeper's Lens",
    description:
      "Use distance well, disengage from danger and turn Multi-Shot into a practiced volley.",
    stats: { power: 10, crit: 7, magnet: 15 },
  },
  paladin: {
    name: "An oath made real",
    mentor: "Warden of the morning light",
    relic: "Oathkeeper's Seal",
    description:
      "Strike with conviction, hold under Divine Shield and learn to consecrate the ground.",
    stats: { power: 8, armor: 8, regen: 0.7 },
  },
  priest: {
    name: "Faith through the storm",
    mentor: "Archivist of the sanctuary",
    relic: "Sanctuary Prayer Beads",
    description:
      "Balance Smite with protection, practice Shadow Word: Pain and reveal the strength of faith.",
    stats: { power: 10, health: 20, regen: 0.6 },
  },
  shaman: {
    name: "The answering elements",
    mentor: "Speaker for the four winds",
    relic: "Stormspeaker's Stone",
    description:
      "Answer with lightning, hold foes with Earthbind and master the leaping chain.",
    stats: { power: 12, crit: 7, health: 12 },
  },
  warlock: {
    name: "Power at a price",
    mentor: "Scholar of the sealed grimoire",
    relic: "Bound Ember Shard",
    description:
      "Shape shadow, recover through Drain Life and practice the spread of Corruption.",
    stats: { power: 12, haste: 5, health: 18 },
  },
  druid: {
    name: "The wild remembers",
    mentor: "Guardian of the green circle",
    relic: "Wildheart Seed",
    description:
      "Call Wrath, stand in Bear Form and master Moonfire before earning nature's trust.",
    stats: { power: 10, regen: 0.6, speed: 5 },
  },
};
export const trialRelicId = (classId: ClassId) => `trial_${classId}_relic`;
export const freshTrial = (): ClassTrialProgress => ({
  chapter: 0,
  active: false,
  progress: {},
});
