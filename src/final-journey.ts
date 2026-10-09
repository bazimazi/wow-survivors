import { FACTIONS } from "./factions";
import { PROFESSION_QUESTS, PROFESSION_TRADES } from "./profession-quests";
import { materialFor } from "./resources";
import type { Material } from "./resources";
import type { FactionId } from "./factions";
import type { TradeId } from "./training";
import type { SaveData } from "./progression";

export interface JourneyEntry {
  attempt: string | null;
  complete: boolean;
  claimed: boolean;
}
export type JourneyProgress = Record<string, JourneyEntry>;
export interface JourneySnapshot {
  id: string;
  attempt: string;
}
export const EPILOGUES = [
  ...FACTIONS.map((f) => ({
    id: `faction_${f.id}`,
    name: `${f.name}: The Last Promise`,
    icon: f.icon,
    faction: f.id as FactionId | undefined,
    trade: undefined as TradeId | undefined,
    zone: f.id === "thorium" ? "scarlet" : "plaguelands",
    material: undefined as Material | undefined,
    count: 0,
    gear: `epilogue_${f.id}`,
    gold: 350,
    xp: 1500,
    story:
      f.id === "timbermaw"
        ? "The recovered grove lore guides a final beacon through the blight. Return with news that the northern paths can live again."
        : f.id === "argent"
          ? "Carry the Dawn's vigil to the blighted frontier. The last beacon will stand because you kept the promise."
          : "Secure the cathedral road for the Brotherhood's supply caravan. A forge and a safe passage finish the work begun in Westfall.",
  })),
  ...PROFESSION_TRADES.map((trade) => ({
    id: `guild_${trade}`,
    name: `${PROFESSION_QUESTS[trade].name}: A Guild for Tomorrow`,
    icon: PROFESSION_QUESTS[trade].icon,
    faction: undefined as FactionId | undefined,
    trade: trade as TradeId | undefined,
    zone: "plaguelands",
    material: materialFor(PROFESSION_QUESTS[trade].family, 4) as
      Material | undefined,
    count: 6,
    gear: undefined as string | undefined,
    gold: 250,
    xp: 1200,
    story: `${PROFESSION_QUESTS[trade].mentor} asks for one final frontier victory and a delivery of six Artisan materials. Your completed mastery project becomes a lasting workshop for the next adventurer.`,
  })),
];
export const EPILOGUE_MAP = Object.fromEntries(EPILOGUES.map((q) => [q.id, q]));
export function normalizeJourney(raw: unknown): JourneyProgress {
  const data =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const result: JourneyProgress = {};
  for (const q of EPILOGUES) {
    const value = data[q.id];
    if (!value || typeof value !== "object") continue;
    const entry = value as Record<string, unknown>,
      attempt =
        typeof entry.attempt === "string" &&
        entry.attempt.length > 0 &&
        entry.attempt.length <= 128
          ? entry.attempt
          : null;
    result[q.id] = {
      attempt: entry.claimed === true ? null : attempt,
      complete: !!attempt && entry.complete === true,
      claimed: entry.claimed === true,
    };
  }
  return result;
}
export function journeySnapshots(s: SaveData): JourneySnapshot[] {
  return EPILOGUES.flatMap((q) =>
    s.journey[q.id]?.attempt && !s.journey[q.id].claimed
      ? [{ id: q.id, attempt: s.journey[q.id].attempt! }]
      : [],
  );
}
export function validJourneySnapshot(raw: JourneySnapshot): boolean {
  return (
    !!raw &&
    Object.hasOwn(EPILOGUE_MAP, raw.id) &&
    typeof raw.attempt === "string" &&
    raw.attempt.length > 0 &&
    raw.attempt.length <= 128
  );
}
export function journeyComplete(s: SaveData) {
  return (
    s.clearedZones.includes("scarlet") &&
    s.clearedZones.includes("plaguelands") &&
    EPILOGUES.every((q) => s.journey[q.id]?.claimed)
  );
}
