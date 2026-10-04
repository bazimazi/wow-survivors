import type { GearDef, Stats } from "./content";
import type { FactionId } from "./factions";
import type { WardrobeSource } from "./wardrobe";

export const CAMPAIGN_METRICS = [
  "kills",
  "encounters",
  "guardians",
  "victories",
] as const;
export type CampaignMetric = (typeof CAMPAIGN_METRICS)[number];
export type CampaignCounts = Record<CampaignMetric, number>;
export interface CampaignProgress {
  chapter: number;
  attempt: string | null;
  progress: CampaignCounts;
}
export interface CampaignSnapshot {
  faction: FactionId;
  chapter: number;
  attempt: string;
}
export interface CampaignProof extends CampaignSnapshot {
  progress: CampaignCounts;
}
export interface CampaignChapter {
  name: string;
  story: string;
  zone: string;
  level: number;
  points: number;
  goals: Partial<CampaignCounts>;
  gold: number;
  xp: number;
  reputation: number;
  gear?: string;
}
export const CAMPAIGN_FACTIONS: FactionId[] = [
  "timbermaw",
  "thorium",
  "argent",
];
const routes = {
  timbermaw: {
    name: "The Keeper's Trail",
    envoy: "Envoy Mossbough",
    outdoor: "elwynn",
    dungeon: "deadmines",
    cloak: "Keeper's Trailcloak",
    trinket: "Heart of the Ancient Grove",
    icon: "paw",
    cloakStats: { crit: 6, speed: 8, magnet: 20 },
    trinketStats: { power: 10, crit: 8, speed: 8 },
    chapters: [
      "A trail worth keeping",
      "Wisdom among the stones",
      "Below the broken road",
      "The keeper's promise",
    ],
    stories: [
      "Mossbough asks you to protect the paths used by the visiting forest envoys.",
      "Reclaim the trail's landmarks and break Hogger's hold on the forest.",
      "Follow the stolen supplies into Deadmines. Defeat its guardians before the convoy can pass.",
      "Bring down VanCleef and open a safe passage for the forest's keepers.",
    ],
  },
  thorium: {
    name: "Embers of the Brotherhood",
    envoy: "Smith Cinderhand",
    outdoor: "westfall",
    dungeon: "ragefire",
    cloak: "Cinderhand's Forged Mantle",
    trinket: "Brotherhood Forgeheart",
    icon: "anvil",
    cloakStats: { armor: 8, health: 28, regen: 0.2 },
    trinketStats: { armor: 8, health: 36, regen: 0.4 },
    chapters: [
      "The supply road",
      "Steel for the frontier",
      "A furnace in the dark",
      "The last ember",
    ],
    stories: [
      "Cinderhand's forge cannot work while the supply roads are overrun.",
      "Secure Westfall's landmarks and defeat the Defias Captain to restore the convoy route.",
      "The smiths trace a stolen shipment to Ragefire. Break through the first guardians.",
      "Defeat Bazzalan and reclaim the furnace routes for the Brotherhood.",
    ],
  },
  argent: {
    name: "A Lantern Against the Moon",
    envoy: "Warden Dawnmere",
    outdoor: "tirisfal",
    dungeon: "shadowfang",
    cloak: "Dawnmere's Vigil Cloak",
    trinket: "Beacon of the Last Watch",
    icon: "sun",
    cloakStats: { power: 10, haste: 6, regen: 0.3 },
    trinketStats: { power: 14, haste: 8, regen: 0.3 },
    chapters: [
      "The watch begins",
      "Lights in the mist",
      "Beyond the keep's gate",
      "Dawn over Shadowfang",
    ],
    stories: [
      "Dawnmere needs a safe watch through the restless ground of Tirisfal.",
      "Restore the lost landmarks and defeat the Gravekeeper before the lanterns go dark.",
      "Follow the restless spirits into Shadowfang Keep. Put two of its guardians to rest.",
      "Defeat Arugal and carry the lantern through the entire keep.",
    ],
  },
};
export const campaignCloakId = (faction: FactionId) =>
  `campaign_${faction}_cloak`;
export const campaignTrinketId = (faction: FactionId) =>
  `exalted_${faction}_trinket`;
export const CAMPAIGNS = Object.fromEntries(
  CAMPAIGN_FACTIONS.map((faction) => {
    const r = routes[faction];
    const chapters: CampaignChapter[] = [
      {
        name: r.chapters[0],
        story: r.stories[0],
        zone: r.outdoor,
        level: 1,
        points: 0,
        goals: { kills: 180, encounters: 2 },
        gold: 80,
        xp: 100,
        reputation: 100,
      },
      {
        name: r.chapters[1],
        story: r.stories[1],
        zone: r.outdoor,
        level: 5,
        points: 150,
        goals: { encounters: 3, victories: 1 },
        gold: 110,
        xp: 180,
        reputation: 150,
      },
      {
        name: r.chapters[2],
        story: r.stories[2],
        zone: r.dungeon,
        level: faction === "argent" ? 15 : 10,
        points: 500,
        goals: { guardians: 2 },
        gold: 150,
        xp: 250,
        reputation: 200,
      },
      {
        name: r.chapters[3],
        story: r.stories[3],
        zone: r.dungeon,
        level: 15,
        points: 1100,
        goals: { victories: 1 },
        gold: 200,
        xp: 350,
        reputation: 300,
        gear: campaignCloakId(faction),
      },
    ];
    return [faction, { name: r.name, envoy: r.envoy, chapters }];
  }),
) as Record<
  FactionId,
  { name: string; envoy: string; chapters: CampaignChapter[] }
>;
export const CAMPAIGN_GEAR: GearDef[] = CAMPAIGN_FACTIONS.flatMap((faction) => {
  const r = routes[faction];
  return [
    {
      id: campaignCloakId(faction),
      name: r.cloak,
      slot: "back",
      icon: "cape",
      rarity: "rare",
      level: 15,
      stats: r.cloakStats as Partial<Stats>,
      value: 110,
      description: `A keepsake from ${r.envoy}. Awarded once for completing ${r.name}.`,
    },
    {
      id: campaignTrinketId(faction),
      name: r.trinket,
      slot: "trinket",
      icon: r.icon,
      rarity: "epic",
      level: 20,
      stats: r.trinketStats as Partial<Stats>,
      value: 250,
      description: `An Exalted quartermaster reward for completing ${r.name}.`,
    },
  ];
});
export const CAMPAIGN_SOURCES: Record<string, WardrobeSource> =
  Object.fromEntries(
    CAMPAIGN_FACTIONS.map((faction) => [
      campaignCloakId(faction),
      { type: "campaign", faction, chapter: 3 },
    ]),
  );
export const freshCampaignCounts = (): CampaignCounts => ({
  kills: 0,
  encounters: 0,
  guardians: 0,
  victories: 0,
});
export const freshCampaign = (): CampaignProgress => ({
  chapter: 0,
  attempt: null,
  progress: freshCampaignCounts(),
});
export function validCampaignSnapshot(raw: unknown): raw is CampaignSnapshot {
  if (!raw || typeof raw !== "object") return false;
  const p = raw as CampaignSnapshot;
  return (
    CAMPAIGN_FACTIONS.includes(p.faction) &&
    Number.isInteger(p.chapter) &&
    p.chapter >= 0 &&
    p.chapter < 4 &&
    typeof p.attempt === "string" &&
    /^[a-zA-Z0-9_-]{1,80}$/.test(p.attempt)
  );
}
export function boundedCampaignCounts(
  raw: unknown,
  faction: FactionId,
  chapter: number,
): CampaignCounts {
  const counts = freshCampaignCounts(),
    goals = CAMPAIGNS[faction].chapters[chapter]?.goals || {};
  for (const metric of CAMPAIGN_METRICS) {
    const value = (raw as Partial<CampaignCounts> | null)?.[metric];
    counts[metric] =
      typeof value === "number" && Number.isFinite(value)
        ? Math.min(goals[metric] || 0, Math.max(0, Math.floor(value)))
        : 0;
  }
  return counts;
}
export function validateCampaignProof(raw: unknown): CampaignProof[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<FactionId>(),
    proofs: CampaignProof[] = [];
  for (const p of raw.slice(0, 12)) {
    if (!validCampaignSnapshot(p) || seen.has(p.faction)) continue;
    seen.add(p.faction);
    proofs.push({
      faction: p.faction,
      chapter: p.chapter,
      attempt: p.attempt,
      progress: boundedCampaignCounts(
        (p as CampaignProof).progress,
        p.faction,
        p.chapter,
      ),
    });
  }
  return proofs;
}
export function campaignRunCounts(
  snapshot: CampaignSnapshot,
  run: {
    zoneId: string;
    kills: number;
    encounters?: number;
    dungeonBosses?: number;
    victory: boolean;
  },
): CampaignCounts {
  if (
    CAMPAIGNS[snapshot.faction].chapters[snapshot.chapter].zone !== run.zoneId
  )
    return freshCampaignCounts();
  return boundedCampaignCounts(
    {
      kills: run.kills,
      encounters: run.encounters,
      guardians: run.dungeonBosses,
      victories: run.victory ? 1 : 0,
    },
    snapshot.faction,
    snapshot.chapter,
  );
}
