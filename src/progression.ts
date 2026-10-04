import {
  materialFor,
  tierForLevel,
  RESOURCE_TIERS,
  gatheringPractice,
  tierForSkill,
} from "./resources";
import {
  CLASSES,
  CLASS_MAP,
  GEAR,
  GEAR_MAP,
  GEAR_SETS,
  MATERIALS,
  PROFESSIONS,
  QUESTS,
  RECIPES,
  SPELLS,
  ZONES,
} from "./content";
import type {
  ClassId,
  Material,
  ProfessionId,
  Slot,
  Stats,
  SpellBonus,
  Recipe,
} from "./content";
import {
  COMMISSIONS,
  FACTIONS,
  QUARTERMASTER_OFFERS,
  REPUTATION_CAP,
  reputationStanding,
} from "./factions";
import type { FactionId } from "./factions";
import {
  rankForSkill,
  SECONDARY_TRADES,
  SPECIALIZATIONS,
  SPECIALIZATION_REQUIREMENTS,
  TRAINING_RANKS,
} from "./training";
import type { SpecializationId, TradeId, TrainingRank } from "./training";
import { dungeonRoute, DUNGEON_MAX_GUARDIANS } from "./dungeon";
import { freshTrial, TRIAL_CHAPTERS, trialRelicId } from "./class-trials";
import type {
  ClassProof,
  ClassTrialProgress,
  TrialMetric,
} from "./class-trials";
import { ENCHANTMENT_MAP } from "./enchanting";
import { freshTravel, RIDING_RANKS, TRAVEL_MAP, TRAVEL_RULES } from "./travel";
import type { TravelProgress, TravelOption } from "./travel";
import {
  PROFESSION_QUESTS,
  PROFESSION_TRADES,
  PROFESSION_PROJECTS,
  professionGoals,
  professionDelivery,
  freshProfessionQuest,
  masteryGearId,
  isMasteryGear,
  validProfessionSnapshot,
} from "./profession-quests";
import type {
  ProfessionQuestProgress,
  ProfessionQuestSnapshot,
  ProfessionProof,
  ProfessionMetric,
} from "./profession-quests";
import {
  CLASS_TECHNIQUES,
  TECHNIQUE_MAP,
  freshSpellbook,
  normalizeSpellbook,
  lockedClassSpell,
  compatibleSpellBonus,
} from "./spellbook";
import type { SpellbookProgress } from "./spellbook";
import {
  CAMPAIGNS,
  CAMPAIGN_FACTIONS,
  CAMPAIGN_METRICS,
  freshCampaign,
  freshCampaignCounts,
  validCampaignSnapshot,
  boundedCampaignCounts,
  validateCampaignProof,
  campaignRunCounts,
} from "./campaigns";
import type {
  CampaignProgress,
  CampaignSnapshot,
  CampaignProof,
  CampaignCounts,
} from "./campaigns";

export interface HeroProgress {
  level: number;
  xp: number;
  talents: Record<string, number>;
  equipment: Partial<Record<Slot, string>>;
  classTrial: ClassTrialProgress;
  travel: TravelProgress;
  spellbook: SpellbookProgress;
}
export interface SaveData {
  version: 1;
  selectedClass: ClassId;
  selectedZone: string;
  gold: number;
  heroes: Record<ClassId, HeroProgress>;
  inventory: string[];
  enchantments: Record<string, string>;
  mounts: string[];
  materials: Record<Material, number>;
  professions: Partial<Record<ProfessionId, number>>;
  supplies: { potions: number; bombs: number; food: number };
  secondary: { firstaid: number; cooking: number; fishing: number };
  reputation: Record<FactionId, number>;
  commission: { id: string; progress: number } | null;
  campaigns: Record<FactionId, CampaignProgress>;
  learnedRecipes: string[];
  training: Partial<Record<TradeId, TrainingRank>>;
  professionSpecializations: Partial<Record<ProfessionId, SpecializationId>>;
  professionQuests: Record<TradeId, ProfessionQuestProgress>;
  clearedZones: string[];
  totals: {
    kills: number;
    gathered: number;
    bestTime: number;
    crafts: number;
    wins: number;
    runs: number;
    encounters: number;
    commissions: number;
    dungeonBosses: number;
    dungeonWins: number;
  };
  claimedQuests: string[];
  history: RunRecord[];
  settings: { sound: boolean; particles: boolean; screenShake: boolean };
}
export interface RunRecord {
  id: string;
  classId: ClassId;
  zoneId: string;
  victory: boolean;
  time: number;
  kills: number;
  level: number;
  gold: number;
  xp: number;
  materials: Partial<Record<Material, number>>;
  loot: string[];
  date: string;
  encounters?: number;
  dungeonBosses?: number;
  classProof?: ClassProof;
  professionProof?: ProfessionProof[];
  campaignProof?: CampaignProof[];
}
export const SAVE_KEY = "wow-survivors-save-v1";

export function travelSelectionRestriction(
  s: SaveData,
  id: string,
  classId = s.selectedClass,
): string | null {
  const t = Object.hasOwn(TRAVEL_MAP, id) ? TRAVEL_MAP[id] : null,
    h = s.heroes[classId];
  if (!t) return "Unknown travel option.";
  if (t.classId && t.classId !== classId)
    return "This travel option belongs to another class.";
  if (t.race && t.race !== CLASS_MAP[classId].race)
    return `Requires a ${t.race} hero.`;
  if (h.level < t.level) return `Requires character level ${t.level}.`;
  if (t.kind === "class")
    return h.classTrial.chapter === 3
      ? null
      : "Complete all three class trials in the Journal.";
  if (t.kind === "form")
    return h.travel.form ? null : "Learn this travel form at the stable.";
  if (h.travel.riding < t.rank)
    return `Requires ${RIDING_RANKS[t.rank - 1].name}.`;
  return s.mounts.includes(id) ? null : "Purchase this steed at the stable.";
}
export function selectedTravel(
  s: SaveData,
  classId = s.selectedClass,
): TravelOption | null {
  const id = s.heroes[classId].travel.selected;
  return id && !travelSelectionRestriction(s, id, classId)
    ? TRAVEL_MAP[id]
    : null;
}
export function selectTravel(s: SaveData, id: string | null): boolean {
  if (id !== null && travelSelectionRestriction(s, id)) return false;
  s.heroes[s.selectedClass].travel.selected = id;
  return true;
}
export function ridingRestriction(s: SaveData): string | null {
  const h = s.heroes[s.selectedClass],
    next = RIDING_RANKS[h.travel.riding];
  if (!next) return "Both riding ranks are trained.";
  if (h.level < next.level) return `Requires character level ${next.level}.`;
  if (s.gold < next.gold) return `Requires ${next.gold} G.`;
  return null;
}
export function trainRiding(s: SaveData): boolean {
  if (ridingRestriction(s)) return false;
  const h = s.heroes[s.selectedClass],
    next = RIDING_RANKS[h.travel.riding];
  if (!next) return false;
  s.gold -= next.gold;
  h.travel.riding = next.rank;
  return true;
}
export function travelPurchaseRestriction(
  s: SaveData,
  id: string,
): string | null {
  const t = Object.hasOwn(TRAVEL_MAP, id) ? TRAVEL_MAP[id] : null,
    h = s.heroes[s.selectedClass];
  if (!t || t.kind === "class")
    return "This travel option cannot be purchased.";
  if (t.classId && t.classId !== s.selectedClass)
    return "This travel form belongs to another class.";
  if (t.race && t.race !== CLASS_MAP[s.selectedClass].race)
    return `Requires a ${t.race} hero.`;
  if (t.kind === "mount" ? s.mounts.includes(id) : h.travel.form)
    return "Already learned or owned.";
  if (h.level < t.level) return `Requires character level ${t.level}.`;
  if (h.travel.riding < t.rank)
    return `Requires ${RIDING_RANKS[t.rank - 1].name}.`;
  if (s.gold < t.price) return `Requires ${t.price} G.`;
  return null;
}
export function purchaseTravel(s: SaveData, id: string): boolean {
  if (travelPurchaseRestriction(s, id)) return false;
  const t = TRAVEL_MAP[id],
    h = s.heroes[s.selectedClass];
  s.gold -= t.price;
  if (t.kind === "form") h.travel.form = true;
  else s.mounts.push(id);
  if (!h.travel.selected) h.travel.selected = id;
  return true;
}
export function freshSave(): SaveData {
  const heroes = Object.fromEntries(
    CLASSES.map((c) => [
      c.id,
      {
        level: 1,
        xp: 0,
        talents: {},
        equipment: { weapon: `starter_${c.id}`, chest: c.armor },
        classTrial: freshTrial(),
        travel: freshTravel(),
        spellbook: freshSpellbook(c.spells),
      },
    ]),
  ) as Record<ClassId, HeroProgress>;
  return {
    version: 1,
    selectedClass: "mage",
    selectedZone: "elwynn",
    gold: 180,
    heroes,
    inventory: GEAR.filter(
      (g) =>
        g.id.startsWith("starter_") ||
        ["cloth", "leather", "mail", "plate"].includes(g.id),
    ).map((g) => g.id),
    materials: {
      ...(Object.fromEntries(
        Object.keys(MATERIALS).map((id) => [id, 0]),
      ) as Record<Material, number>),
      herbs: 6,
      ore: 6,
      leather: 6,
      cloth: 8,
      dust: 2,
      fish: 2,
    },
    enchantments: {},
    mounts: [],
    professions: {},
    supplies: { potions: 3, bombs: 1, food: 0 },
    secondary: { firstaid: 1, cooking: 1, fishing: 1 },
    reputation: { timbermaw: 0, thorium: 0, argent: 0 },
    commission: null,
    campaigns: Object.fromEntries(
      CAMPAIGN_FACTIONS.map((id) => [id, freshCampaign()]),
    ) as Record<FactionId, CampaignProgress>,
    learnedRecipes: [],
    training: { firstaid: 1, cooking: 1, fishing: 1 },
    professionSpecializations: {},
    professionQuests: Object.fromEntries(
      PROFESSION_TRADES.map((id) => [id, freshProfessionQuest()]),
    ) as Record<TradeId, ProfessionQuestProgress>,
    clearedZones: [],
    totals: {
      kills: 0,
      gathered: 0,
      bestTime: 0,
      crafts: 0,
      wins: 0,
      runs: 0,
      encounters: 0,
      commissions: 0,
      dungeonBosses: 0,
      dungeonWins: 0,
    },
    claimedQuests: [],
    history: [],
    settings: { sound: true, particles: true, screenShake: true },
  };
}
const finite = (x: unknown, fallback = 0, max = 1_000_000) =>
  typeof x === "number" && Number.isFinite(x)
    ? Math.min(max, Math.max(0, Math.floor(x)))
    : fallback;
const obj = (x: unknown): Record<string, unknown> =>
  x && typeof x === "object" && !Array.isArray(x)
    ? (x as Record<string, unknown>)
    : {};
export function validateSave(raw: unknown): SaveData {
  const data = obj(raw);
  if (data.version !== 1)
    throw new Error("This file is not a supported Wow Survivors save.");
  const s = freshSave();
  s.selectedClass =
    typeof data.selectedClass === "string" &&
    Object.hasOwn(CLASS_MAP, data.selectedClass)
      ? (data.selectedClass as ClassId)
      : s.selectedClass;
  s.selectedZone = ZONES.some((z) => z.id === data.selectedZone)
    ? (data.selectedZone as string)
    : "elwynn";
  s.gold = finite(data.gold);
  s.inventory = Array.isArray(data.inventory)
    ? [
        ...new Set(
          data.inventory.filter(
            (id): id is string =>
              typeof id === "string" && Object.hasOwn(GEAR_MAP, id),
          ),
        ),
      ]
    : s.inventory;
  const savedHeroes = obj(data.heroes);
  for (const c of CLASSES) {
    const h = obj(savedHeroes[c.id]);
    s.heroes[c.id].level = Math.max(1, finite(h.level, 1, 60));
    s.heroes[c.id].spellbook = normalizeSpellbook(
      c.id,
      s.heroes[c.id].level,
      h.spellbook,
      c.spells,
    );
    s.heroes[c.id].xp = finite(
      h.xp,
      0,
      characterXpRequired(s.heroes[c.id].level) - 1,
    );
    const trial = obj(h.classTrial),
      chapter = finite(trial.chapter, 0, 3);
    const active =
      trial.active === true &&
      chapter < 3 &&
      s.heroes[c.id].level >= TRIAL_CHAPTERS[chapter].level;
    s.heroes[c.id].classTrial = { chapter, active, progress: {} };
    if (active)
      for (const [metric, goal] of Object.entries(
        TRIAL_CHAPTERS[chapter].goals,
      ))
        s.heroes[c.id].classTrial.progress[metric as TrialMetric] = finite(
          obj(trial.progress)[metric],
          0,
          goal,
        );
    const savedTalents = obj(h.talents);
    // Rebuild trees in order so imports cannot bypass prerequisites or point budgets.
    for (const t of c.trees)
      for (const n of t.nodes) {
        const count = finite(savedTalents[n.id], 0, n.max);
        for (let i = 0; i < count; i++)
          if (canLearnTalent(s, c.id, n.id))
            s.heroes[c.id].talents[n.id] =
              (s.heroes[c.id].talents[n.id] || 0) + 1;
      }
    s.heroes[c.id].equipment = {};
    for (const [slot, id] of Object.entries(obj(h.equipment))) {
      if (
        typeof id === "string" &&
        s.inventory.includes(id) &&
        GEAR_MAP[id]?.slot === slot &&
        canEquip(c.id, id) &&
        s.heroes[c.id].level >= (GEAR_MAP[id].level || 1)
      )
        s.heroes[c.id].equipment[slot as Slot] = id;
    }
  }
  s.mounts = Array.isArray(data.mounts)
    ? [
        ...new Set(
          data.mounts.filter(
            (id): id is string =>
              typeof id === "string" &&
              Object.hasOwn(TRAVEL_MAP, id) &&
              TRAVEL_MAP[id].kind === "mount",
          ),
        ),
      ]
    : [];
  for (const c of CLASSES) {
    const h = s.heroes[c.id],
      saved = obj(obj(savedHeroes[c.id]).travel);
    h.travel.riding =
      h.level < 12
        ? 0
        : (finite(saved.riding, 0, h.level < 20 ? 1 : 2) as 0 | 1 | 2);
    h.travel.form =
      ["druid", "shaman"].includes(c.id) &&
      h.level >= TRAVEL_RULES.formLevel &&
      saved.form === true;
    h.travel.selected =
      typeof saved.selected === "string" &&
      !travelSelectionRestriction(s, saved.selected, c.id)
        ? saved.selected
        : null;
  }
  for (const [itemId, enchantId] of Object.entries(obj(data.enchantments))) {
    if (
      s.inventory.includes(itemId) &&
      typeof enchantId === "string" &&
      Object.hasOwn(ENCHANTMENT_MAP, enchantId) &&
      ENCHANTMENT_MAP[enchantId].slot === GEAR_MAP[itemId].slot
    )
      s.enchantments[itemId] = enchantId;
  }
  for (const m of Object.keys(MATERIALS) as Material[])
    s.materials[m] = finite(obj(data.materials)[m]);
  for (const p of PROFESSIONS)
    if (
      Object.keys(s.professions).length < 2 &&
      finite(obj(data.professions)[p.id]) > 0
    )
      s.professions[p.id] = finite(obj(data.professions)[p.id], 1, 300);
  for (const k of ["potions", "bombs", "food"] as const)
    s.supplies[k] = finite(obj(data.supplies)[k], 0, 999);
  for (const k of ["firstaid", "cooking", "fishing"] as const)
    s.secondary[k] = Math.max(1, finite(obj(data.secondary)[k], 1, 300));
  for (const id of [
    ...PROFESSIONS.map((p) => p.id),
    ...SECONDARY_TRADES.map((p) => p.id),
  ]) {
    const skill = tradeSkill(s, id);
    if (skill) {
      const eligible = TRAINING_RANKS.filter(
        (rank) =>
          skill >= rank.skill &&
          Object.values(s.heroes).some((h) => h.level >= rank.level),
      ).at(-1)!.rank;
      s.training[id] = Math.max(
        rankForSkill(skill),
        Math.min(eligible, finite(obj(data.training)[id], 1, 4)),
      ) as TrainingRank;
    }
  }
  for (const spec of SPECIALIZATIONS) {
    if (
      obj(data.professionSpecializations)[spec.profession] === spec.id &&
      tradeSkill(s, spec.profession) >= SPECIALIZATION_REQUIREMENTS.skill &&
      trainingInfo(s, spec.profession).rank >=
        SPECIALIZATION_REQUIREMENTS.rank &&
      Object.values(s.heroes).some(
        (h) => h.level >= SPECIALIZATION_REQUIREMENTS.level,
      )
    )
      s.professionSpecializations[spec.profession] = spec.id;
  }
  for (const trade of PROFESSION_TRADES) {
    const saved = obj(obj(data.professionQuests)[trade]),
      chapter = finite(saved.chapter, 0, 4);
    const active =
      chapter < 4 &&
      tradeSkill(s, trade) > 0 &&
      validProfessionSnapshot({ trade, chapter, attempt: saved.attempt });
    const goals = professionGoals(trade, chapter);
    s.professionQuests[trade] = {
      chapter,
      attempt: active ? (saved.attempt as string) : null,
      progress: { gathered: 0, crafts: 0, uses: 0 },
    };
    if (active)
      for (const metric of Object.keys(goals) as ProfessionMetric[])
        s.professionQuests[trade].progress[metric] = finite(
          obj(saved.progress)[metric],
          0,
          goals[metric],
        );
  }
  for (const k of Object.keys(s.totals) as (keyof SaveData["totals"])[])
    s.totals[k] = finite(obj(data.totals)[k]);
  for (const faction of FACTIONS)
    s.reputation[faction.id] = finite(
      obj(data.reputation)[faction.id],
      0,
      REPUTATION_CAP,
    );
  const commission = obj(data.commission);
  for (const faction of CAMPAIGN_FACTIONS) {
    const saved = obj(obj(data.campaigns)[faction]),
      chapter = finite(saved.chapter, 0, 4);
    const active = validCampaignSnapshot({
      faction,
      chapter,
      attempt: saved.attempt,
    });
    s.campaigns[faction] = {
      chapter,
      attempt: active ? (saved.attempt as string) : null,
      progress: active
        ? boundedCampaignCounts(saved.progress, faction, chapter)
        : freshCampaignCounts(),
    };
  }
  const definition = COMMISSIONS.find((c) => c.id === commission.id);
  if (definition)
    s.commission = {
      id: definition.id,
      progress: finite(commission.progress, 0, definition.goal),
    };
  s.learnedRecipes = Array.isArray(data.learnedRecipes)
    ? [
        ...new Set(
          data.learnedRecipes.filter(
            (id): id is string =>
              typeof id === "string" &&
              RECIPES.some((r) => r.id === id && r.requiresPattern),
          ),
        ),
      ]
    : [];
  s.claimedQuests = Array.isArray(data.claimedQuests)
    ? [
        ...new Set(
          data.claimedQuests.filter(
            (id): id is string =>
              typeof id === "string" && QUESTS.some((q) => q.id === id),
          ),
        ),
      ]
    : [];
  for (const k of ["sound", "particles", "screenShake"] as const)
    if (typeof obj(data.settings)[k] === "boolean")
      s.settings[k] = obj(data.settings)[k] as boolean;
  s.history = Array.isArray(data.history)
    ? data.history.slice(0, 20).flatMap((r) => {
        const h = obj(r);
        if (
          typeof h.id !== "string" ||
          h.id.length > 100 ||
          typeof h.classId !== "string" ||
          !Object.hasOwn(CLASS_MAP, h.classId) ||
          !ZONES.some((z) => z.id === h.zoneId)
        )
          return [];
        return [
          {
            id: h.id,
            classId: h.classId as ClassId,
            zoneId: h.zoneId as string,
            victory:
              h.victory === true &&
              (!dungeonRoute(h.zoneId as string) ||
                h.dungeonBosses ===
                  dungeonRoute(h.zoneId as string)!.stages.length),
            time: finite(h.time, 0, 7200),
            kills: finite(h.kills),
            level: finite(h.level, 1, 100),
            gold: finite(h.gold),
            xp: finite(h.xp),
            encounters: finite(h.encounters, 0, 6),
            dungeonBosses: dungeonRoute(h.zoneId as string)
              ? finite(
                  h.dungeonBosses,
                  0,
                  dungeonRoute(h.zoneId as string)!.stages.length,
                )
              : 0,
            materials: {},
            classProof: validateClassProof(h.classProof),
            professionProof: validateProfessionProof(h.professionProof),
            campaignProof: validateCampaignProof(h.campaignProof),
            loot: [],
            date:
              typeof h.date === "string" && !Number.isNaN(Date.parse(h.date))
                ? h.date
                : new Date(0).toISOString(),
          },
        ];
      })
    : [];
  s.clearedZones = [
    ...new Set([
      ...(Array.isArray(data.clearedZones)
        ? data.clearedZones.filter(
            (id): id is string =>
              typeof id === "string" && ZONES.some((z) => z.id === id),
          )
        : []),
      ...s.history.filter((r) => r.victory).map((r) => r.zoneId),
    ]),
  ];
  if (!zoneUnlocked(s, s.selectedZone)) s.selectedZone = "elwynn";
  return s;
}
export function readSave(): { save: SaveData; recovered: boolean } {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return {
      save: raw ? validateSave(JSON.parse(raw)) : freshSave(),
      recovered: false,
    };
  } catch {
    return { save: freshSave(), recovered: true };
  }
}
export function persist(s: SaveData): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}
export const characterXpRequired = (level: number) => 100 + level * 70;
export function grantXp(s: SaveData, classId: ClassId, amount: number): number {
  const h = s.heroes[classId];
  let gained = 0;
  h.xp += Math.max(0, amount);
  while (h.level < 60 && h.xp >= characterXpRequired(h.level)) {
    h.xp -= characterXpRequired(h.level);
    h.level++;
    gained++;
  }
  if (h.level === 60) h.xp = Math.min(h.xp, characterXpRequired(60) - 1);
  return gained;
}
export function talentBudget(h: HeroProgress): number {
  return Math.min(21, h.level);
}
export const spentTalents = (h: HeroProgress) =>
  Object.values(h.talents).reduce((a, b) => a + b, 0);
export const availableTalents = (h: HeroProgress) =>
  talentBudget(h) - spentTalents(h);
export function canLearnTalent(
  s: SaveData,
  classId: ClassId,
  talentId: string,
): boolean {
  const h = s.heroes[classId];
  const c = CLASS_MAP[classId];
  for (const t of c.trees) {
    const index = t.nodes.findIndex((n) => n.id === talentId);
    if (index < 0) continue;
    const node = t.nodes[index];
    const treeSpent = t.nodes
      .slice(0, index)
      .reduce((sum, n) => sum + (h.talents[n.id] || 0), 0);
    return (
      availableTalents(h) > 0 &&
      (h.talents[node.id] || 0) < node.max &&
      treeSpent >= node.required
    );
  }
  return false;
}
export function learnTalent(s: SaveData, id: string): boolean {
  const h = s.heroes[s.selectedClass];
  if (!canLearnTalent(s, s.selectedClass, id)) return false;
  h.talents[id] = (h.talents[id] || 0) + 1;
  return true;
}
export function respec(s: SaveData): boolean {
  if (!spentTalents(s.heroes[s.selectedClass])) return false;
  s.heroes[s.selectedClass].talents = {};
  return true;
}
export function canEquip(classId: ClassId, gearId: string): boolean {
  if (!Object.hasOwn(GEAR_MAP, gearId)) return false;
  const gear = GEAR_MAP[gearId];
  if (!gear) return false;
  if (gear.classes && !gear.classes.includes(classId)) return false;
  const armors = ["cloth", "leather", "mail", "plate"];
  return (
    !gear.armor ||
    armors.indexOf(gear.armor) <= armors.indexOf(CLASS_MAP[classId].armor)
  );
}
export function equip(s: SaveData, gearId: string): boolean {
  if (!s.inventory.includes(gearId) || equipRestriction(s, gearId))
    return false;
  s.heroes[s.selectedClass].equipment[GEAR_MAP[gearId].slot] = gearId;
  return true;
}
export function sellGear(s: SaveData, id: string, disenchant = false): boolean {
  if (
    !s.inventory.includes(id) ||
    id.startsWith("starter_") ||
    isMasteryGear(id) ||
    ["cloth", "leather", "mail", "plate"].includes(id)
  )
    return false;
  if (
    Object.values(s.heroes).some((h) => Object.values(h.equipment).includes(id))
  )
    return false;
  if (disenchant && !s.professions.enchanting) return false;
  s.inventory = s.inventory.filter((x) => x !== id);
  delete s.enchantments[id];
  if (disenchant) {
    const dust = disenchantMaterial(id);
    s.materials[dust] += GEAR_MAP[id].rarity === "epic" ? 4 : 2;
    const tier = RESOURCE_TIERS[MATERIALS[dust].tier - 1];
    const skill = s.professions.enchanting || 0;
    grantProfessionSkill(
      s,
      "enchanting",
      gatheringPractice(dust, skill, trainingInfo(s, "enchanting").cap)
        ? Math.min(3, tier.trivial - skill)
        : 0,
    );
  } else s.gold += GEAR_MAP[id].value;
  return true;
}
export function disenchantMaterial(id: string): Material {
  const level = GEAR_MAP[id]?.level || 1;
  // Artisan crafted equipment uses level 18; its dust supports the final workshop grade.
  return materialFor("dust", level >= 18 ? 4 : tierForLevel(level));
}
export function heroStats(s: SaveData, classId = s.selectedClass): Stats {
  const c = CLASS_MAP[classId],
    h = s.heroes[classId];
  const stats: Stats = {
    power: 0,
    health: c.health + (h.level - 1) * 3,
    armor: c.armorValue,
    haste: 0,
    crit: 5,
    speed: c.id === "druid" ? 10 : 0,
    regen:
      c.id === "paladin" ? 0.6 : ["priest", "druid"].includes(c.id) ? 0.4 : 0,
    magnet: c.id === "hunter" ? 20 : 0,
  };
  if (c.id === "rogue") stats.crit += 12;
  if (c.id === "shaman") stats.crit += 8;
  if (["warrior", "rogue", "paladin"].includes(c.id)) stats.magnet += 25;
  for (const t of c.trees)
    for (const n of t.nodes)
      if (!n.spellIds) stats[n.stat] += n.value * (h.talents[n.id] || 0);
  for (const id of Object.values(h.equipment)) {
    const gear = GEAR_MAP[id];
    if (gear)
      for (const [stat, value] of Object.entries(gear.stats))
        stats[stat as keyof Stats] += value!;
    const enchantment = itemEnchantment(s, id);
    if (enchantment)
      for (const [stat, value] of Object.entries(enchantment.stats))
        stats[stat as keyof Stats] += value!;
  }
  for (const set of equippedSets(s, classId))
    for (const bonus of set.definition.bonuses)
      if (set.pieces >= bonus.pieces)
        for (const [stat, value] of Object.entries(bonus.stats))
          stats[stat as keyof Stats] += value!;
  return stats;
}
export function classTechniqueRestriction(
  s: SaveData,
  id: string,
): string | null {
  const t = Object.hasOwn(TECHNIQUE_MAP, id) ? TECHNIQUE_MAP[id] : null,
    hero = s.heroes[s.selectedClass];
  if (!t) return "Unknown class technique.";
  if (t.classId !== s.selectedClass)
    return "This technique belongs to another class.";
  if (hero.spellbook.learned.includes(id)) return "Already learned.";
  if (hero.level < t.level) return `Requires character level ${t.level}.`;
  if (s.gold < t.gold) return `Requires ${t.gold} G.`;
  return null;
}
export function trainClassTechnique(s: SaveData, id: string): boolean {
  if (classTechniqueRestriction(s, id)) return false;
  s.gold -= TECHNIQUE_MAP[id].gold;
  s.heroes[s.selectedClass].spellbook.learned.push(id);
  return true;
}
export function prepareClassSpell(
  s: SaveData,
  replaceId: string,
  newId: string,
): boolean {
  const hero = s.heroes[s.selectedClass],
    core = CLASS_MAP[s.selectedClass].spells;
  const known = [...core, ...hero.spellbook.learned];
  const slot = hero.spellbook.prepared.indexOf(replaceId);
  if (
    !core.includes(newId) &&
    (!Object.hasOwn(TECHNIQUE_MAP, newId) ||
      TECHNIQUE_MAP[newId].classId !== s.selectedClass ||
      hero.level < TECHNIQUE_MAP[newId].level)
  )
    return false;
  if (
    slot < 0 ||
    lockedClassSpell(s.selectedClass, replaceId, core) ||
    !known.includes(newId) ||
    hero.spellbook.prepared.includes(newId)
  )
    return false;
  hero.spellbook.prepared[slot] = newId;
  return true;
}
export function restoreClassSpells(s: SaveData): boolean {
  const hero = s.heroes[s.selectedClass],
    core = CLASS_MAP[s.selectedClass].spells;
  if (hero.spellbook.prepared.every((id, i) => id === core[i])) return false;
  hero.spellbook.prepared = [...core];
  return true;
}

export function heroSpellBonuses(
  s: SaveData,
  classId = s.selectedClass,
): Record<string, SpellBonus> {
  const result: Record<string, SpellBonus> = {};
  for (const t of CLASS_MAP[classId].trees)
    for (const node of t.nodes) {
      const rank = s.heroes[classId].talents[node.id] || 0;
      if (!rank || !node.spellIds) continue;
      const bonuses = node.bonus || { [node.stat]: node.value };
      for (const id of node.spellIds) {
        const value = (result[id] ||= {});
        for (const [key, amount] of Object.entries(bonuses)) {
          const def = SPELLS[id];
          if (
            key === "area" &&
            !["melee", "nova", "orbit", "ground"].includes(def.kind)
          )
            continue;
          if (
            ["projectiles", "pierce"].includes(key) &&
            (!["projectile", "pet", "chain"].includes(def.kind) ||
              id === "beast")
          )
            continue;
          if (key === "pierce" && def.kind === "chain") continue;
          if (key === "costReduction" && !def.cost) continue;
          const field = key as keyof SpellBonus;
          value[field] = (value[field] || 0) + amount! * rank;
        }
      }
    }
  for (const t of CLASS_TECHNIQUES.filter((t) => t.classId === classId)) {
    for (const [key, amount] of Object.entries(result[t.parent] || {})) {
      const field = key as keyof SpellBonus;
      if (compatibleSpellBonus(t.spell, field))
        (result[t.spell.id] ||= {})[field] = amount;
    }
  }
  return result;
}
export function equipRestriction(s: SaveData, id: string): string | null {
  if (!canEquip(s.selectedClass, id)) return "Class restricted";
  const level = GEAR_MAP[id].level || 1;
  return s.heroes[s.selectedClass].level < level
    ? `Requires level ${level}`
    : null;
}
export function equippedSets(s: SaveData, classId = s.selectedClass) {
  const equipped = Object.values(s.heroes[classId].equipment);
  return GEAR_SETS.map((definition) => ({
    definition,
    pieces: equipped.filter((id) => GEAR_MAP[id]?.set === definition.id).length,
  })).filter((set) => set.pieces > 0);
}
export function gearComparison(s: SaveData, id: string): Partial<Stats> {
  if (equipRestriction(s, id)) return {};
  const hero = s.heroes[s.selectedClass],
    current = heroStats(s);
  const candidate: SaveData = {
    ...s,
    heroes: {
      ...s.heroes,
      [s.selectedClass]: {
        ...hero,
        equipment: { ...hero.equipment, [GEAR_MAP[id].slot]: id },
      },
    },
  };
  const next = heroStats(candidate),
    delta: Partial<Stats> = {};
  for (const k of Object.keys(current) as (keyof Stats)[])
    if (Math.abs(next[k] - current[k]) > 0.0001)
      delta[k] = next[k] - current[k];
  return delta;
}
export function professionTitle(skill: number) {
  return skill < 75
    ? "Apprentice"
    : skill < 150
      ? "Journeyman"
      : skill < 225
        ? "Expert"
        : "Artisan";
}
export function recipeSkill(s: SaveData, r: Recipe): number {
  return r.profession === "firstaid" || r.profession === "cooking"
    ? s.secondary[r.profession]
    : s.professions[r.profession] || 0;
}
export function recipeSkillGain(
  r: Pick<Recipe, "skill">,
  skill: number,
): number {
  return skill < r.skill
    ? 0
    : skill < r.skill + 25
      ? 5
      : skill < r.skill + 50
        ? 2
        : skill < r.skill + 75
          ? 1
          : 0;
}
export function learnProfession(s: SaveData, id: ProfessionId): boolean {
  if (
    !PROFESSIONS.some((p) => p.id === id) ||
    s.professions[id] ||
    Object.keys(s.professions).length >= 2
  )
    return false;
  s.professions[id] = 1;
  s.training[id] = 1;
  return true;
}
export function forgetProfession(s: SaveData, id: ProfessionId): boolean {
  if (!s.professions[id]) return false;
  delete s.professions[id];
  delete s.training[id];
  delete s.professionSpecializations[id];
  abandonProfessionQuest(s, id);
  return true;
}
export function craftRestriction(s: SaveData, id: string): string | null {
  const r = RECIPES.find((r) => r.id === id);
  if (!r) return "Unknown recipe";
  const skill = recipeSkill(s, r);
  if (!skill) return `Learn ${tradeName(r.profession)}`;
  if (skill < r.skill) return `Requires skill ${r.skill}`;
  if (r.trainingRank && trainingInfo(s, r.profession).rank < r.trainingRank)
    return `Train ${TRAINING_RANKS[r.trainingRank - 1].name}`;
  if (
    r.specialization &&
    s.professionSpecializations[r.profession as ProfessionId] !==
      r.specialization
  )
    return `Requires ${SPECIALIZATIONS.find((p) => p.id === r.specialization)!.name}`;
  if (r.requiresPattern && !s.learnedRecipes.includes(r.id))
    return "Learn quartermaster pattern";
  if (r.reputation && s.reputation[r.reputation.faction] < r.reputation.points)
    return "More reputation needed";
  if (
    r.output in s.supplies &&
    s.supplies[r.output as keyof SaveData["supplies"]] + r.quantity > 999
  )
    return "Supply storage full";
  if (
    s.gold < r.gold ||
    !Object.entries(r.cost).every(
      ([m, qty]) => s.materials[m as Material] >= qty!,
    )
  )
    return "More resources needed";
  return null;
}
export function canCraft(s: SaveData, id: string): boolean {
  return craftRestriction(s, id) === null;
}
export function craft(s: SaveData, id: string): string | null {
  const r = RECIPES.find((r) => r.id === id);
  if (!r || !canCraft(s, id)) return null;
  for (const [m, count] of Object.entries(r.cost))
    s.materials[m as Material] -= count!;
  s.gold -= r.gold;
  if (r.output in s.supplies)
    s.supplies[r.output as keyof SaveData["supplies"]] = Math.min(
      999,
      s.supplies[r.output as keyof SaveData["supplies"]] + r.quantity,
    );
  else if (!s.inventory.includes(r.output)) s.inventory.push(r.output);
  else s.gold += Math.floor(GEAR_MAP[r.output].value / 2); // Duplicate crafts turn into vendor value.
  grantProfessionSkill(s, r.profession, recipeSkillGain(r, recipeSkill(s, r)));
  s.totals.crafts++;
  recordProfessionCraft(s, r.profession, r.skill);
  return r.name;
}
export function zoneUnlocked(s: SaveData, id: string): boolean {
  const z = ZONES.find((z) => z.id === id);
  return (
    !!z &&
    (z.dungeon
      ? s.clearedZones.includes(dungeonRoute(id)?.prerequisite || "")
      : z.prerequisite
        ? s.clearedZones.includes(z.prerequisite)
        : z.unlock === -1
          ? s.totals.wins > 0
          : s.totals.kills >= z.unlock)
  );
}
export function expeditionRestriction(s: SaveData, id: string): string | null {
  const zone = ZONES.find((z) => z.id === id);
  if (!zone) return "Unknown expedition";
  if (!zoneUnlocked(s, id)) return zone.unlockText;
  const route = dungeonRoute(id);
  const minLevel = route?.minLevel || zone.minLevel || 1;
  if (s.heroes[s.selectedClass].level < minLevel)
    return `Requires character level ${minLevel}`;
  return null;
}
export function questProgress(s: SaveData, id: string): number {
  const q = QUESTS.find((q) => q.id === id);
  return q
    ? q.zoneId
      ? Number(s.clearedZones.includes(q.zoneId))
      : s.totals[q.metric]
    : 0;
}
export function claimQuest(s: SaveData, id: string): boolean {
  const q = QUESTS.find((q) => q.id === id);
  if (!q || s.claimedQuests.includes(id) || questProgress(s, id) < q.goal)
    return false;
  s.claimedQuests.push(id);
  s.gold += q.gold;
  grantXp(s, s.selectedClass, q.xp);
  for (const [m, count] of Object.entries(q.materials || {}))
    s.materials[m as Material] += count!;
  return true;
}
export function settleRun(
  s: SaveData,
  run: RunRecord,
  professionGains: Partial<Record<ProfessionId | "fishing", number>> = {},
): boolean {
  if (s.history.some((r) => r.id === run.id)) return false;
  if (
    dungeonRoute(run.zoneId) &&
    run.victory &&
    run.dungeonBosses !== dungeonRoute(run.zoneId)!.stages.length
  )
    return false;
  s.history.unshift(run);
  advanceClassTrial(s, run);
  s.history = s.history.slice(0, 20);
  s.gold += run.gold;
  grantXp(s, run.classId, run.xp);
  s.totals.kills += run.kills;
  s.totals.bestTime = Math.max(s.totals.bestTime, Math.floor(run.time));
  s.totals.runs++;
  for (const [id, amount] of Object.entries(professionGains))
    if (id === "fishing" || PROFESSIONS.some((p) => p.id === id))
      grantProfessionSkill(s, id as TradeId, amount!);
  const faction = FACTIONS.find((f) => f.zoneId === run.zoneId);
  advanceProfessionQuests(s, run);
  advanceCampaigns(s, run);
  if (faction) addReputation(s, faction.id, expeditionReputation(run));
  const commission = COMMISSIONS.find((c) => c.id === s.commission?.id);
  if (commission && s.commission)
    s.commission.progress = Math.min(
      commission.goal,
      s.commission.progress + commissionContribution(commission.id, run),
    );
  s.totals.encounters += Math.min(
    6,
    Math.max(0, Math.floor(run.encounters || 0)),
  );
  if (dungeonRoute(run.zoneId))
    s.totals.dungeonBosses += Math.min(
      dungeonRoute(run.zoneId)!.stages.length,
      Math.max(0, Math.floor(run.dungeonBosses || 0)),
    );
  if (run.victory) {
    s.totals.wins++;
    if (!s.clearedZones.includes(run.zoneId)) s.clearedZones.push(run.zoneId);
    if (dungeonRoute(run.zoneId)) s.totals.dungeonWins++;
  }
  for (const [m, count] of Object.entries(run.materials)) {
    s.materials[m as Material] += count!;
    s.totals.gathered += count!;
  }
  for (const item of run.loot) {
    if (!s.inventory.includes(item)) s.inventory.push(item);
    else s.gold += Math.floor(GEAR_MAP[item].value / 2);
  }
  return true;
}

export function campaignAcceptRestriction(
  s: SaveData,
  faction: FactionId,
): string | null {
  if (!CAMPAIGN_FACTIONS.includes(faction)) return "Unknown faction.";
  const q = s.campaigns[faction],
    chapter = CAMPAIGNS[faction].chapters[q.chapter];
  if (!chapter) return "Campaign completed.";
  if (q.attempt) return "Chapter already accepted.";
  if (s.heroes[s.selectedClass].level < chapter.level)
    return `Requires character level ${chapter.level}.`;
  if (s.reputation[faction] < chapter.points)
    return `Requires ${reputationStanding(chapter.points).name} (${chapter.points} reputation).`;
  return expeditionRestriction(s, chapter.zone);
}
export function acceptCampaign(s: SaveData, faction: FactionId): boolean {
  if (campaignAcceptRestriction(s, faction)) return false;
  s.campaigns[faction].attempt = crypto.randomUUID();
  s.campaigns[faction].progress = freshCampaignCounts();
  return true;
}
export function campaignReady(s: SaveData, faction: FactionId): boolean {
  const q = s.campaigns[faction],
    chapter = CAMPAIGNS[faction]?.chapters[q?.chapter];
  return (
    !!q?.attempt &&
    !!chapter &&
    Object.entries(chapter.goals).every(
      ([metric, goal]) => q.progress[metric as keyof CampaignCounts] >= goal!,
    )
  );
}
export function claimCampaign(
  s: SaveData,
  faction: FactionId,
  expected: CampaignSnapshot,
  hero = s.selectedClass,
): boolean {
  const q = s.campaigns[faction];
  if (
    hero !== s.selectedClass ||
    !validCampaignSnapshot(expected) ||
    expected.faction !== faction ||
    expected.chapter !== q?.chapter ||
    expected.attempt !== q.attempt ||
    !campaignReady(s, faction)
  )
    return false;
  const chapter = CAMPAIGNS[faction].chapters[q.chapter];
  s.gold += chapter.gold;
  grantXp(s, hero, chapter.xp);
  addReputation(s, faction, chapter.reputation);
  if (chapter.gear && !s.inventory.includes(chapter.gear))
    s.inventory.push(chapter.gear);
  q.chapter++;
  q.attempt = null;
  q.progress = freshCampaignCounts();
  return true;
}
export function abandonCampaign(
  s: SaveData,
  faction: FactionId,
  expected: CampaignSnapshot,
): boolean {
  const q = s.campaigns[faction];
  if (
    !validCampaignSnapshot(expected) ||
    expected.faction !== faction ||
    !q?.attempt ||
    expected.chapter !== q.chapter ||
    expected.attempt !== q.attempt
  )
    return false;
  q.attempt = null;
  q.progress = freshCampaignCounts();
  return true;
}
export function campaignSnapshots(s: SaveData): CampaignSnapshot[] {
  return CAMPAIGN_FACTIONS.filter(
    (faction) => s.campaigns[faction].attempt,
  ).map((faction) => ({
    faction,
    chapter: s.campaigns[faction].chapter,
    attempt: s.campaigns[faction].attempt!,
  }));
}
export function campaignProgressPreview(
  s: SaveData,
  faction: FactionId,
  run?: RunRecord,
): CampaignCounts {
  const q = s.campaigns[faction],
    progress = { ...q.progress };
  if (!run || !q.attempt) return progress;
  const proof = validateCampaignProof(run.campaignProof).find(
    (p) =>
      p.faction === faction &&
      p.chapter === q.chapter &&
      p.attempt === q.attempt,
  );
  if (!proof) return progress;
  const actual = campaignRunCounts(proof, run),
    goals = CAMPAIGNS[faction].chapters[q.chapter].goals;
  for (const metric of CAMPAIGN_METRICS)
    progress[metric] = Math.min(
      goals[metric] || 0,
      progress[metric] + Math.min(proof.progress[metric], actual[metric]),
    );
  return progress;
}
function advanceCampaigns(s: SaveData, run: RunRecord) {
  for (const faction of CAMPAIGN_FACTIONS)
    s.campaigns[faction].progress = campaignProgressPreview(s, faction, run);
}

export function professionProjectRestriction(
  s: SaveData,
  trade: TradeId,
  classId = s.selectedClass,
): string | null {
  if (!Object.hasOwn(PROFESSION_QUESTS, trade)) return "Unknown profession.";
  const quest = s.professionQuests[trade],
    project = PROFESSION_PROJECTS[quest.chapter];
  if (!project) return "All four guild projects are complete.";
  if (!tradeSkill(s, trade)) return `Learn ${tradeName(trade)}.`;
  if (s.heroes[classId].level < project.level)
    return `Requires character level ${project.level}.`;
  if (tradeSkill(s, trade) < project.skill)
    return `Requires skill ${project.skill}.`;
  if (trainingInfo(s, trade).rank < project.rank)
    return `Train ${TRAINING_RANKS[project.rank - 1].name}.`;
  return null;
}
export function acceptProfessionQuest(s: SaveData, trade: TradeId): boolean {
  if (
    professionProjectRestriction(s, trade) ||
    s.professionQuests[trade].attempt
  )
    return false;
  s.professionQuests[trade].attempt = crypto.randomUUID();
  s.professionQuests[trade].progress = freshProfessionQuest().progress;
  return true;
}
export function abandonProfessionQuest(s: SaveData, trade: TradeId): boolean {
  const quest = s.professionQuests[trade];
  if (!quest?.attempt) return false;
  quest.attempt = null;
  quest.progress = freshProfessionQuest().progress;
  return true;
}
export function professionQuestClaimRestriction(
  s: SaveData,
  trade: TradeId,
): string | null {
  const restriction = professionProjectRestriction(s, trade);
  if (restriction) return restriction;
  const quest = s.professionQuests[trade],
    project = PROFESSION_PROJECTS[quest.chapter];
  if (!quest.attempt) return "Accept this project first.";
  const goals = professionGoals(trade, quest.chapter);
  if (
    (Object.keys(goals) as ProfessionMetric[]).some(
      (metric) => quest.progress[metric] < goals[metric],
    )
  )
    return "Complete the project objectives.";
  if (quest.chapter === 3 && tradeSkill(s, trade) < 300)
    return "Reach skill 300 to earn your mastery reward.";
  const material = professionDelivery(trade, quest.chapter);
  if (s.materials[material] < project.delivery)
    return `Bring ${project.delivery} ${MATERIALS[material].name}.`;
  return null;
}
export const professionQuestReady = (s: SaveData, trade: TradeId) =>
  professionQuestClaimRestriction(s, trade) === null;
export function claimProfessionQuest(s: SaveData, trade: TradeId): boolean {
  if (professionQuestClaimRestriction(s, trade)) return false;
  const quest = s.professionQuests[trade],
    project = PROFESSION_PROJECTS[quest.chapter];
  s.materials[professionDelivery(trade, quest.chapter)] -= project.delivery;
  s.gold += project.gold;
  grantXp(s, s.selectedClass, project.xp);
  if (quest.chapter === 3 && !s.inventory.includes(masteryGearId(trade)))
    s.inventory.push(masteryGearId(trade));
  quest.chapter++;
  quest.attempt = null;
  quest.progress = freshProfessionQuest().progress;
  return true;
}
export function recordProfessionCraft(
  s: SaveData,
  trade: TradeId,
  recipeSkill: number,
): void {
  const quest = s.professionQuests[trade];
  if (
    !quest?.attempt ||
    professionProjectRestriction(s, trade) ||
    tierForSkill(recipeSkill) !== quest.chapter + 1
  )
    return;
  quest.progress.crafts = Math.min(
    professionGoals(trade, quest.chapter).crafts,
    quest.progress.crafts + 1,
  );
}
export function professionQuestSnapshots(
  s: SaveData,
): ProfessionQuestSnapshot[] {
  return PROFESSION_TRADES.filter(
    (trade) =>
      s.professionQuests[trade].attempt &&
      !professionProjectRestriction(s, trade),
  ).map((trade) => ({
    trade,
    chapter: s.professionQuests[trade].chapter,
    attempt: s.professionQuests[trade].attempt!,
  }));
}
export function validateProfessionProof(raw: unknown): ProfessionProof[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<TradeId>(),
    proofs: ProfessionProof[] = [];
  for (const p of raw.slice(0, 48)) {
    if (!validProfessionSnapshot(p) || seen.has(p.trade)) continue;
    seen.add(p.trade);
    const goals = professionGoals(p.trade, p.chapter),
      values = obj(p);
    proofs.push({
      trade: p.trade,
      chapter: p.chapter,
      attempt: p.attempt,
      gathered: finite(values.gathered, 0, goals.gathered),
      uses: finite(values.uses, 0, goals.uses),
    });
  }
  return proofs;
}
function advanceProfessionQuests(s: SaveData, run: RunRecord): void {
  for (const proof of validateProfessionProof(run.professionProof)) {
    const quest = s.professionQuests[proof.trade],
      def = PROFESSION_QUESTS[proof.trade];
    if (
      quest.attempt !== proof.attempt ||
      quest.chapter !== proof.chapter ||
      professionProjectRestriction(s, proof.trade, run.classId)
    )
      continue;
    const goals = professionGoals(proof.trade, proof.chapter);
    if (def.destinations?.[proof.chapter].includes(run.zoneId))
      quest.progress.gathered = Math.min(
        goals.gathered,
        quest.progress.gathered +
          Math.min(
            proof.gathered,
            finite(
              run.materials[professionDelivery(proof.trade, proof.chapter)],
            ),
          ),
      );
    if (def.field && (def.field !== "meals" || run.time >= 60))
      quest.progress.uses = Math.min(
        goals.uses,
        quest.progress.uses +
          Math.min(proof.uses, def.field === "meals" ? 1 : goals.uses),
      );
  }
}

export function validateClassProof(raw: unknown): ClassProof | undefined {
  const p = obj(raw);
  if (
    typeof p.chapter !== "number" ||
    !Number.isInteger(p.chapter) ||
    p.chapter < 0 ||
    p.chapter >= TRIAL_CHAPTERS.length
  )
    return undefined;
  return {
    chapter: p.chapter,
    casts: finite(p.casts, 0, 60000),
    actives: finite(p.actives, 0, 1000),
    mastery: finite(p.mastery, 0, 1),
    elites: finite(p.elites, 0, 100),
    evolutions: finite(p.evolutions, 0, 1),
    bosses: finite(p.bosses, 0, DUNGEON_MAX_GUARDIANS),
  };
}
export function trialAcceptanceRestriction(
  s: SaveData,
  classId = s.selectedClass,
): string | null {
  const h = s.heroes[classId],
    trial = h.classTrial;
  if (trial.chapter >= TRIAL_CHAPTERS.length) return "Class trial completed";
  if (trial.active) return "Chapter already accepted";
  const required = TRIAL_CHAPTERS[trial.chapter].level;
  return h.level < required ? `Requires character level ${required}` : null;
}
export function acceptClassTrial(s: SaveData): boolean {
  if (trialAcceptanceRestriction(s)) return false;
  const trial = s.heroes[s.selectedClass].classTrial;
  trial.active = true;
  trial.progress = {};
  return true;
}
export function classTrialReady(
  s: SaveData,
  classId = s.selectedClass,
): boolean {
  const trial = s.heroes[classId].classTrial;
  return (
    trial.active &&
    trial.chapter < TRIAL_CHAPTERS.length &&
    Object.entries(TRIAL_CHAPTERS[trial.chapter].goals).every(
      ([metric, goal]) => (trial.progress[metric as TrialMetric] || 0) >= goal,
    )
  );
}
function advanceClassTrial(s: SaveData, run: RunRecord) {
  const trial = s.heroes[run.classId].classTrial,
    proof = validateClassProof(run.classProof);
  if (!trial.active || !proof || proof.chapter !== trial.chapter) return;
  for (const [metric, goal] of Object.entries(
    TRIAL_CHAPTERS[trial.chapter].goals,
  )) {
    const key = metric as TrialMetric;
    trial.progress[key] = Math.min(
      goal,
      (trial.progress[key] || 0) + proof[key],
    );
  }
}
export function claimClassTrial(s: SaveData): boolean {
  if (!classTrialReady(s)) return false;
  const trial = s.heroes[s.selectedClass].classTrial,
    chapter = trial.chapter,
    reward = TRIAL_CHAPTERS[chapter];
  trial.chapter++;
  trial.active = false;
  trial.progress = {};
  s.gold += reward.gold;
  grantXp(s, s.selectedClass, reward.xp);
  if (chapter === 1) s.materials.dust += 4;
  if (chapter === 2) {
    const id = trialRelicId(s.selectedClass);
    if (!s.inventory.includes(id)) s.inventory.push(id);
    else s.gold += Math.floor(GEAR_MAP[id].value / 2);
  }
  return true;
}
export function itemEnchantment(s: SaveData, itemId: string) {
  const id = s.enchantments[itemId];
  return id &&
    Object.hasOwn(ENCHANTMENT_MAP, id) &&
    s.inventory.includes(itemId) &&
    GEAR_MAP[itemId]?.slot === ENCHANTMENT_MAP[id].slot
    ? ENCHANTMENT_MAP[id]
    : null;
}
export function enchantmentRestriction(
  s: SaveData,
  itemId: string,
  formulaId: string,
): string | null {
  if (!Object.hasOwn(ENCHANTMENT_MAP, formulaId)) return "Unknown formula";
  const e = ENCHANTMENT_MAP[formulaId],
    gear = GEAR_MAP[itemId];
  if (!s.inventory.includes(itemId) || !gear) return "Choose an owned item";
  if (!s.professions.enchanting) return "Learn Enchanting in Professions";
  const restriction = equipRestriction(s, itemId);
  if (restriction) return restriction;
  if (gear.slot !== e.slot) return `Requires a ${e.slot} item`;
  if (s.enchantments[itemId] === formulaId) return "Already applied";
  if (s.professions.enchanting < e.skill)
    return `Requires Enchanting ${e.skill}`;
  if (s.gold < e.gold) return "Not enough gold";
  if (
    Object.entries(e.costs).some(
      ([id, amount]) => s.materials[id as Material] < amount!,
    )
  )
    return "Not enough materials";
  return null;
}
export function enchantmentSkillGain(s: SaveData, formulaId: string): number {
  const e = ENCHANTMENT_MAP[formulaId],
    skill = s.professions.enchanting || 0;
  return e && skill
    ? Math.min(
        recipeSkillGain(e, skill),
        Math.max(0, trainingInfo(s, "enchanting").cap - skill),
      )
    : 0;
}
export function applyEnchantment(
  s: SaveData,
  itemId: string,
  formulaId: string,
): boolean {
  if (enchantmentRestriction(s, itemId, formulaId)) return false;
  const e = ENCHANTMENT_MAP[formulaId],
    gain = enchantmentSkillGain(s, formulaId);
  s.gold -= e.gold;
  for (const [id, amount] of Object.entries(e.costs))
    s.materials[id as Material] -= amount!;
  s.enchantments[itemId] = e.id;
  grantProfessionSkill(s, "enchanting", gain);
  recordProfessionCraft(s, "enchanting", e.skill);
  return true;
}
export function enchantmentComparison(
  s: SaveData,
  itemId: string,
  formulaId: string,
): Partial<Stats> {
  const old = itemEnchantment(s, itemId),
    next = ENCHANTMENT_MAP[formulaId],
    delta: Partial<Stats> = {};
  if (!next || next.slot !== GEAR_MAP[itemId]?.slot) return delta;
  for (const key of Object.keys(heroStats(s)) as (keyof Stats)[]) {
    const value = (next.stats[key] || 0) - (old?.stats[key] || 0);
    if (value) delta[key] = value;
  }
  return delta;
}

export function expeditionReputation(
  run: Pick<RunRecord, "kills" | "time" | "encounters" | "victory">,
): number {
  return (
    Math.min(60, Math.floor(Math.max(0, run.kills) / 12)) +
    Math.min(12, Math.floor(Math.max(0, run.time) / 30)) +
    15 * Math.min(6, Math.max(0, Math.floor(run.encounters || 0))) +
    (run.victory ? 80 : 0)
  );
}
export function addReputation(
  s: SaveData,
  faction: FactionId,
  amount: number,
): number {
  const before = s.reputation[faction];
  s.reputation[faction] = Math.min(
    REPUTATION_CAP,
    before + Math.max(0, Math.floor(amount)),
  );
  return s.reputation[faction] - before;
}
export function commissionContribution(
  id: string,
  run: Pick<RunRecord, "zoneId" | "kills" | "encounters" | "victory">,
): number {
  const c = COMMISSIONS.find((c) => c.id === id);
  if (!c || c.zoneId !== run.zoneId) return 0;
  return c.metric === "victory"
    ? Number(run.victory)
    : c.metric === "encounters"
      ? Math.min(6, Math.max(0, Math.floor(run.encounters || 0)))
      : Math.max(0, Math.floor(run.kills));
}
export function acceptCommission(s: SaveData, id: string): boolean {
  const c = COMMISSIONS.find((c) => c.id === id);
  if (!c || s.commission || !zoneUnlocked(s, c.zoneId)) return false;
  s.commission = { id, progress: 0 };
  return true;
}
export function abandonCommission(s: SaveData): boolean {
  if (!s.commission) return false;
  s.commission = null;
  return true;
}
export function claimCommission(s: SaveData): boolean {
  const c = COMMISSIONS.find((c) => c.id === s.commission?.id);
  if (!c || !s.commission || s.commission.progress < c.goal) return false;
  s.gold += c.gold;
  grantXp(s, s.selectedClass, c.xp);
  addReputation(s, c.faction, c.reputation);
  s.totals.commissions++;
  s.commission = null;
  return true;
}
/** A null restriction means the complete purchase can succeed. */
export function offerRestriction(s: SaveData, id: string): string | null {
  const offer = QUARTERMASTER_OFFERS.find((o) => o.id === id);
  if (!offer) return "Unknown offer";
  if (offer.gearId && s.inventory.includes(offer.gearId))
    return "Already owned";
  if (offer.recipeId && s.learnedRecipes.includes(offer.recipeId))
    return "Pattern learned";
  if (s.reputation[offer.faction] < offer.points)
    return `Requires ${reputationStanding(offer.points).name}`;
  if (offer.campaign && s.campaigns[offer.campaign].chapter !== 4)
    return "Complete all four campaign chapters";
  if (offer.gearId) {
    const restriction = equipRestriction(s, offer.gearId);
    if (restriction) return restriction;
  }
  if (offer.recipeId) {
    const recipe = RECIPES.find((r) => r.id === offer.recipeId)!;
    const profession = PROFESSIONS.find((p) => p.id === recipe.profession)!;
    if (!s.professions[profession.id]) return `Learn ${profession.name}`;
    if (recipeSkill(s, recipe) < recipe.skill)
      return `Requires ${profession.name} ${recipe.skill}`;
  }
  if (s.gold < offer.gold) return "More gold needed";
  return null;
}
export function buyOffer(s: SaveData, id: string): boolean {
  if (offerRestriction(s, id)) return false;
  const offer = QUARTERMASTER_OFFERS.find((o) => o.id === id)!;
  s.gold -= offer.gold;
  if (offer.gearId) s.inventory.push(offer.gearId);
  if (offer.recipeId) s.learnedRecipes.push(offer.recipeId);
  return true;
}

export function tradeSkill(s: SaveData, id: TradeId): number {
  const secondary = SECONDARY_TRADES.find((p) => p.id === id);
  return secondary
    ? s.secondary[secondary.id]
    : PROFESSIONS.some((p) => p.id === id)
      ? s.professions[id as ProfessionId] || 0
      : 0;
}
export function tradeName(id: TradeId): string {
  return (
    SECONDARY_TRADES.find((p) => p.id === id)?.name ||
    PROFESSIONS.find((p) => p.id === id)?.name ||
    "profession"
  );
}
export function trainingInfo(s: SaveData, id: TradeId) {
  const rank = Math.max(s.training[id] || 1, rankForSkill(tradeSkill(s, id)));
  return TRAINING_RANKS[rank - 1];
}
export function trainingRestriction(s: SaveData, id: TradeId): string | null {
  if (
    !SECONDARY_TRADES.some((p) => p.id === id) &&
    !PROFESSIONS.some((p) => p.id === id)
  )
    return "Unknown profession";
  if (!tradeSkill(s, id)) return `Learn ${tradeName(id)}`;
  const next = TRAINING_RANKS.find(
    (r) => r.rank === trainingInfo(s, id).rank + 1,
  );
  if (!next) return "Highest rank trained";
  if (tradeSkill(s, id) < next.skill) return `Requires skill ${next.skill}`;
  if (s.heroes[s.selectedClass].level < next.level)
    return `Requires character level ${next.level}`;
  if (s.gold < next.gold) return "More gold needed";
  return null;
}
export function trainProfession(s: SaveData, id: TradeId): boolean {
  if (trainingRestriction(s, id)) return false;
  const next = TRAINING_RANKS.find(
    (r) => r.rank === trainingInfo(s, id).rank + 1,
  )!;
  s.gold -= next.gold;
  s.training[id] = next.rank;
  return true;
}
export function grantProfessionSkill(
  s: SaveData,
  id: TradeId,
  amount: number,
): number {
  const before = tradeSkill(s, id);
  if (!before) return 0;
  const next = Math.min(
    trainingInfo(s, id).cap,
    before + finite(amount, 0, 300),
  );
  const secondary = SECONDARY_TRADES.find((p) => p.id === id);
  if (secondary) s.secondary[secondary.id] = next;
  else if (PROFESSIONS.some((p) => p.id === id))
    s.professions[id as ProfessionId] = next;
  return next - before;
}
export function actualCraftSkillGain(s: SaveData, r: Recipe): number {
  return Math.min(
    recipeSkillGain(r, recipeSkill(s, r)),
    Math.max(0, trainingInfo(s, r.profession).cap - recipeSkill(s, r)),
  );
}
export function specializationRestriction(
  s: SaveData,
  id: string,
): string | null {
  const spec = SPECIALIZATIONS.find((p) => p.id === id);
  if (!spec) return "Unknown specialization";
  if (!s.professions[spec.profession])
    return `Learn ${tradeName(spec.profession)}`;
  if (s.professionSpecializations[spec.profession] === spec.id)
    return "Current specialization";
  if (tradeSkill(s, spec.profession) < SPECIALIZATION_REQUIREMENTS.skill)
    return `Requires skill ${SPECIALIZATION_REQUIREMENTS.skill}`;
  if (trainingInfo(s, spec.profession).rank < SPECIALIZATION_REQUIREMENTS.rank)
    return "Train Expert";
  if (s.heroes[s.selectedClass].level < SPECIALIZATION_REQUIREMENTS.level)
    return `Requires character level ${SPECIALIZATION_REQUIREMENTS.level}`;
  if (s.gold < SPECIALIZATION_REQUIREMENTS.gold) return "More gold needed";
  return null;
}
export function specializeProfession(s: SaveData, id: string): boolean {
  if (specializationRestriction(s, id)) return false;
  const spec = SPECIALIZATIONS.find((p) => p.id === id)!;
  s.gold -= SPECIALIZATION_REQUIREMENTS.gold;
  s.professionSpecializations[spec.profession] = spec.id;
  return true;
}
