import {
  CLASS_KITS,
  createClassState,
  classSpeed,
  classResource,
  classDamage,
  recordClassHit,
  recordClassKill,
  classSignature,
  updateClass,
} from "./class-combat";
import type { ClassWorld } from "./class-combat";
import { weaponAccuracy } from "./item-progression";
import {
  DIFFICULTIES,
  KEYSTONES,
  CONTRACTS,
  contractProgress,
  adventureStats,
} from "./adventure";
import type { Difficulty, KeystoneId } from "./adventure";
import type { EquipmentSnapshot, WeaponPractice } from "./item-progression";
import type { WeaponType } from "./weapon-training";
import { resistanceMultiplier } from "./attributes";
import type { DamageSchool, Resistances } from "./attributes";
import { EPILOGUE_MAP, validJourneySnapshot } from "./final-journey";
import type { JourneySnapshot } from "./final-journey";
import {
  MATERIALS as RESOURCE_MAP,
  FAMILY_INFO,
  materialFor,
  tierForLevel,
  tierForSkill,
  zoneResourceTier,
  distanceTier,
  gatheringRestriction,
  gatheringPractice,
} from "./resources";
import type { GatheringTrade, NodeFamily } from "./resources";
import { rankForSkill, TRAINING_RANKS } from "./training";
import { CLASS_MAP, GEAR, GEAR_MAP, MATERIALS, SPELLS } from "./content";
import { WARDROBE_SOURCES } from "./wardrobe";
import { ACCESSORY_SOURCES } from "./accessories";
import { NECKLACE_SOURCES } from "./necklaces";
import { OFFHAND_SOURCES } from "./offhands";
import { DUAL_WIELD_SOURCES } from "./dual-wield";
import { RANGED_SOURCES } from "./ranged";
import { TRAINED_WEAPON_SOURCES } from "./weapon-training";
import { validCampaignSnapshot, campaignRunCounts } from "./campaigns";
import type { CampaignSnapshot } from "./campaigns";
import { duskwoodRoster } from "./duskwood";
import { isSkinnable } from "./shadowfang";
import type {
  ClassDef,
  ClassId,
  Material,
  ProfessionId,
  SpellDef,
  SpellBonus,
  Stat,
  Stats,
  ZoneDef,
} from "./content";
import type { RunRecord } from "./progression";
import { normalizeSpellbook } from "./spellbook";
import type { SpellbookProgress } from "./spellbook";
import {
  BLESSINGS,
  BOSS_IDENTITIES,
  createLandmarks,
  ENCOUNTER_RULES,
  telegraphContains,
  ZONE_MATERIALS,
} from "./expedition";
import type { Landmark, Telegraph } from "./expedition";
import { dungeonRoute, DUNGEON_BOONS } from "./dungeon";
import { TRAVEL_MAP, TRAVEL_RULES } from "./travel";
import type { TravelOption } from "./travel";
import {
  PROFESSION_QUESTS,
  professionGoals,
  professionDelivery,
  validProfessionSnapshot,
} from "./profession-quests";
import type {
  ProfessionQuestSnapshot,
  ProfessionProof,
} from "./profession-quests";

export interface Vec {
  x: number;
  y: number;
}
export interface Enemy extends Vec {
  id: number;
  type: string;
  hp: number;
  maxHp: number;
  radius: number;
  speed: number;
  damage: number;
  elite: boolean;
  boss: boolean;
  slowUntil: number;
  slow: number;
  frozenUntil: number;
  flash: number;
  attackTimer: number;
  dead: boolean;
  guard?: boolean;
  dots?: Record<string, PeriodicEffect>;
}
export interface PeriodicEffect {
  damage: number;
  interval: number;
  timer: number;
  ticksLeft: number;
  totalTicks: number;
  ramp?: boolean;
}
export interface Projectile extends Vec {
  classId?: ClassId;
  spellId?: string;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  color: string;
  life: number;
  pierce: number;
  slow: number;
  hit: Set<number>;
  enemy?: boolean;
  school?: DamageSchool;
}
export interface Pickup extends Vec {
  kind: "xp" | "gold" | "heal" | "chest";
  value: number;
  loot?: string;
}
export interface Area extends Vec {
  spellId?: string;
  radius: number;
  damage: number;
  color: string;
  life: number;
  maxLife: number;
  timer: number;
  slow: number;
}
export interface Effect extends Vec {
  kind: "ring" | "line" | "burst" | "class";
  classId?: ClassId;
  motif?: "cast" | "signature" | "dash";
  facing?: number;
  color: string;
  radius: number;
  life: number;
  maxLife: number;
  end?: Vec;
}
export interface DamageText extends Vec {
  value: string;
  color: string;
  life: number;
}
export interface Node extends Vec {
  id: number;
  kind: Material;
  depleted: boolean;
}
export interface Hazard extends Telegraph {
  school?: DamageSchool;
  warning: number;
  maxWarning?: number;
  life: number;
  damage: number;
  chargeId?: number;
  teleportId?: number;
  casterId?: number;
  linger?: number;
  tickTimer?: number;
  resolved?: boolean;
}
export interface Pet extends Vec {
  spellId: string;
  timer: number;
}
export interface SpellState {
  id: string;
  rank: number;
  timer: number;
  orbitTimer: number;
}
export interface Upgrade {
  id: string;
  type: "spell" | "stat" | "keystone";
  name: string;
  description: string;
  icon: string;
  color: string;
  rank?: number;
  stat?: Stat;
  value?: number;
  evolution?: boolean;
}
export type GameEvent = {
  type:
    | "levelup"
    | "hit"
    | "cast"
    | "pickup"
    | "elite"
    | "boss"
    | "end"
    | "active"
    | "discovery"
    | "encounter"
    | "shrine"
    | "checkpoint";
  classId?: ClassId;
  message?: string;
  amount?: number;
  victory?: boolean;
};
/** Accepted actions for optional presentation; references are never stored by the engine. */
export interface CombatAction {
  actor: Vec;
  time: number;
  facing: number;
  spellId?: string;
  spellKind?: SpellDef["kind"];
  ability?: ClassId;
}
/** Accepted enemy actions for optional renderer observation. */
export interface EnemyAction {
  actor: Enemy;
  time: number;
  facing: number;
  kind: "contact" | "projectile" | "telegraph";
  warning: number;
  zoneId: string;
  pattern?: number;
}
export type DeathAction =
  | { kind: "enemy"; actor: Enemy; time: number }
  | {
      kind: "player";
      actor: GameEngine["player"];
      time: number;
      bear: boolean;
    };
export interface EngineConfig {
  classCombat?: boolean;
  adventure?: { difficulty: Difficulty; oath: string; relic: string };
  partner?: PartnerConfig;
  classId: ClassId;
  zone: ZoneDef;
  stats: Stats;
  resistances?: Partial<Resistances>;
  journey?: JourneySnapshot[];
  spellBonuses?: Record<string, SpellBonus>;
  spellbook?: SpellbookProgress;
  professions: Partial<Record<ProfessionId, number>>;
  fishingSkill?: number;
  gatheringCaps?: Partial<Record<GatheringTrade, number>>;
  seed?: number;
  food?: boolean;
  characterLevel?: number;
  trialChapter?: number;
  professionQuests?: ProfessionQuestSnapshot[];
  campaigns?: CampaignSnapshot[];
  travelId?: string;
  onEvent?: (event: GameEvent) => void;
  onAction?: (action: CombatAction) => void;
  onEnemyAction?: (action: EnemyAction) => void;
  onDeath?: (action: DeathAction) => void;
  onConsume?: (type: "potions" | "bombs") => boolean;
  equipment?: EquipmentSnapshot;
  onAmmunition?: () => boolean;
}
export interface PartnerConfig {
  classId: ClassId;
  stats: Stats;
  characterLevel: number;
  spellbook?: SpellbookProgress;
  spellBonuses?: Record<string, SpellBonus>;
  resistances?: Partial<Resistances>;
  equipment?: EquipmentSnapshot;
}
export interface PartnerState {
  config: PartnerConfig;
  player: GameEngine["player"];
  classDef: ClassDef;
  stats: Stats;
  prepared: string[];
  spells: SpellState[];
  equipment: EquipmentSnapshot;
  weaponHits: Partial<Record<WeaponType, number>>;
  healingEffects: Record<string, PeriodicEffect>;
  buffs: GameEngine["timedBuffs"];
  input: Vec;
  revive: number;
  pet?: Pet;
}

export class Random {
  state: number;
  constructor(seed: number) {
    this.state = seed >>> 0 || 1;
  }
  next(): number {
    let n = this.state;
    n ^= n << 13;
    n ^= n >>> 17;
    n ^= n << 5;
    this.state = n >>> 0;
    return this.state / 4294967296;
  }
  between(min: number, max: number): number {
    return min + (max - min) * this.next();
  }
  pick<T>(items: T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }
}
export const distanceSq = (a: Vec, b: Vec) =>
  (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
export const WORLD_SIZE = 2400;
const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

class SpatialGrid {
  cells = new Map<string, Enemy[]>();
  size = 100;
  rebuild(enemies: Enemy[]) {
    this.cells.clear();
    for (const e of enemies)
      if (!e.dead) {
        const key = `${Math.floor(e.x / this.size)},${Math.floor(e.y / this.size)}`;
        const list = this.cells.get(key);
        if (list) list.push(e);
        else this.cells.set(key, [e]);
      }
  }
  near(pos: Vec, radius: number): Enemy[] {
    const result: Enemy[] = [];
    for (
      let x = Math.floor((pos.x - radius) / this.size);
      x <= Math.floor((pos.x + radius) / this.size);
      x++
    )
      for (
        let y = Math.floor((pos.y - radius) / this.size);
        y <= Math.floor((pos.y + radius) / this.size);
        y++
      ) {
        const list = this.cells.get(`${x},${y}`);
        if (list) result.push(...list);
      }
    return result;
  }
}

export class GameEngine {
  keystones: KeystoneId[] = [];
  rerolls = 2;
  streak = 0;
  streakTimer = 0;
  peakStreak = 0;
  damageTaken = 0;
  dashCount = 0;
  adventureActives = 0;
  private stormReadyAt = 0;
  private secondWindActors = new WeakSet<object>();
  private partnerActing = false;
  partner: PartnerState | null = null;
  revivePrimary = 0;
  private commanderRevived = false;
  private revivedCommander: Enemy | null = null;
  timedBuffs: Record<string, { until: number; stats: Partial<Stats> }> = {};
  readonly preparedSpells: readonly string[];
  healingEffects: Record<string, PeriodicEffect> = {};
  healingBySpell: Record<string, number> = {};
  totalHealing = 0;
  readonly travelOption: TravelOption | null;
  travel = { active: false, channel: 0, lock: 0 };
  private trialCasts = 0;
  private trialActives = 0;
  private trialElites = 0;
  private trialBosses = 0;
  classDef: ClassDef;
  zone: ZoneDef;
  stats: Stats;
  rng: Random;
  player = {
    x: 0,
    y: 0,
    hp: 100,
    maxHp: 100,
    resource: 100,
    invulnerable: 0,
    shield: 0,
    shieldTimer: 0,
    activeBuff: 0,
    facing: 0,
    kit: createClassState(),
    dashTimer: 0,
    dashCooldown: 0,
    activeCooldown: 0,
    hurt: 0,
  };
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  pickups: Pickup[] = [];
  areas: Area[] = [];
  effects: Effect[] = [];
  texts: DamageText[] = [];
  nodes: Node[] = [];
  hazards: Hazard[] = [];
  landmarks: Landmark[] = [];
  shrineChoice: Landmark | null = null;
  blessings: string[] = [];
  bossState = {
    phase: 1,
    attackIndex: 0,
    attackName: "",
    attackUntil: 0,
    stillUntil: 0,
  };
  pets: Pet[] = [];
  spells: SpellState[] = [];
  upgrades: Upgrade[] = [];
  materials: Partial<Record<Material, number>> = {};
  professionGains: Partial<Record<ProfessionId | "fishing", number>> = {};
  loot: string[] = [];
  time = 0;
  kills = 0;
  gold = 0;
  xp = 0;
  xpNeeded = 14;
  level = 1;
  paused = false;
  choosing = false;
  ended = false;
  victory = false;
  width = 1280;
  height = 720;
  input = { x: 0, y: 0 };
  totalDamage = 0;
  professionProof: ProfessionProof[] = [];
  private campaignSnapshots: CampaignSnapshot[] = [];
  private foodQuestCounted = false;
  damageBySpell: Record<string, number> = {};
  boss: Enemy | null = null;
  dungeonStageIndex = 0;
  dungeonStageTime = 0;
  dungeonBosses = 0;
  checkpoint = false;
  dungeonBoons: string[] = [];
  lastDungeonReward: string | null = null;
  private id = 0;
  private spawnTimer = 0.8;
  private eliteCount = 0;
  private waveCount = 0;
  private grid = new SpatialGrid();
  equipment: EquipmentSnapshot;
  weaponHits: Partial<Record<WeaponType, number>> = {};
  shotReadyAt = 0;
  private config: EngineConfig;
  private runId: string;

  constructor(config: EngineConfig) {
    this.config = {
      ...config,
      professions: { ...config.professions },
      gatheringCaps: { ...config.gatheringCaps },
    };
    const items = [...new Set(config.equipment?.items || [])].filter(
      (id) =>
        Object.hasOwn(GEAR_MAP, id) &&
        (!GEAR_MAP[id].classes ||
          GEAR_MAP[id].classes!.includes(config.classId)) &&
        (config.characterLevel || 1) >= (GEAR_MAP[id].level || 1),
    );
    const practice = (value: WeaponPractice | undefined, ranged = false) => {
      const gear = value && GEAR_MAP[value.item];
      if (
        !value ||
        !items.includes(value.item) ||
        gear?.weaponType !== value.type ||
        (ranged && !gear.rangedType)
      )
        return undefined;
      const cap = Math.min(300, Math.max(5, (config.characterLevel || 1) * 5));
      return Object.freeze({
        item: value.item,
        type: value.type,
        cap,
        skill: Number.isFinite(value.skill)
          ? Math.max(1, Math.min(cap, Math.floor(value.skill)))
          : 1,
      });
    };
    this.equipment = Object.freeze({
      items: Object.freeze(items),
      primary: practice(config.equipment?.primary),
      secondary: practice(config.equipment?.secondary),
      ranged: practice(config.equipment?.ranged, true),
    });
    this.classDef = CLASS_MAP[config.classId];
    this.preparedSpells = Object.freeze(
      normalizeSpellbook(
        config.classId,
        config.characterLevel || 1,
        config.spellbook,
        this.classDef.spells,
      ).prepared,
    );
    const questTrades = new Set<string>();
    const campaignFactions = new Set<string>();
    for (const q of (config.campaigns || []).slice(0, 12)) {
      if (!validCampaignSnapshot(q) || campaignFactions.has(q.faction))
        continue;
      campaignFactions.add(q.faction);
      this.campaignSnapshots.push(
        Object.freeze({
          faction: q.faction,
          chapter: q.chapter,
          attempt: q.attempt,
        }),
      );
    }
    for (const quest of config.professionQuests || []) {
      if (!validProfessionSnapshot(quest) || questTrades.has(quest.trade))
        continue;
      questTrades.add(quest.trade);
      this.professionProof.push({ ...quest, gathered: 0, uses: 0 });
    }
    const travel =
      config.travelId && Object.hasOwn(TRAVEL_MAP, config.travelId)
        ? TRAVEL_MAP[config.travelId]
        : null;
    this.travelOption =
      travel &&
      (!travel.classId || travel.classId === config.classId) &&
      (!travel.race || travel.race === this.classDef.race)
        ? { ...travel }
        : null;
    this.zone = config.zone;
    this.stats = config.adventure
      ? adventureStats(
          config.stats,
          config.adventure.oath,
          config.adventure.relic,
        )
      : { ...config.stats };
    this.rng = new Random(config.seed ?? Math.floor(Math.random() * 2 ** 31));
    this.runId = `run-${Date.now()}-${this.rng.state}-${Math.floor(Math.random() * 1e9)}`;
    this.player.maxHp = this.stats.health + (config.food ? 15 : 0);
    this.player.hp = this.player.maxHp;
    if (config.adventure?.relic === "aegis") {
      this.player.shield = 30;
      this.player.shieldTimer = 60;
    }
    this.player.resource = this.resourceKind === "Rage" ? 30 : 100;
    this.landmarks = this.zone.dungeon ? [] : createLandmarks(this.zone.id);
    this.addSpell(this.classDef.spells[0]);
    if (this.classDef.id === "hunter" || this.classDef.id === "warlock")
      this.addSpell(this.classDef.spells[2]);
    // A few gathering landmarks are guaranteed close to the starting camp.
    this.nodes = [
      { id: 0, kind: "herbs", x: 180, y: 100, depleted: false },
      { id: 1, kind: "ore", x: -210, y: -100, depleted: false },
      { id: 2, kind: "fish", x: 100, y: -245, depleted: false },
    ];
    // Every supported band has reliable nodes in each family.
    for (let tier = 2; tier <= zoneResourceTier(this.zone.id); tier++)
      for (const [j, family] of ["herbs", "ore", "fish"].entries()) {
        const angle = j * 2.094,
          radius = [0, 0, 950, 1550, 2150][tier];
        this.nodes.push({
          id: this.nodes.length,
          kind: materialFor(family as NodeFamily, tier),
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          depleted: false,
        });
      }
    for (let i = this.nodes.length; i < 170; i++) {
      const family = this.rng.pick(["herbs", "ore", "fish"] as const);
      const x = this.rng.between(-WORLD_SIZE + 120, WORLD_SIZE - 120),
        y = this.rng.between(-WORLD_SIZE + 120, WORLD_SIZE - 120);
      this.nodes.push({
        id: i,
        kind: materialFor(
          family,
          Math.min(
            zoneResourceTier(this.zone.id),
            distanceTier(Math.hypot(x, y)),
          ),
        ),
        x,
        y,
        depleted: false,
      });
    }
    if (this.zone.dungeon) this.prepareDungeonRoom();
    for (let i = 0; i < 7; i++) this.spawnEnemy(360 + i * 20);
    if (
      config.partner &&
      config.partner.classId !== config.classId &&
      CLASS_MAP[config.partner.classId]
    ) {
      const buddy = config.partner,
        partnerStats = config.adventure
          ? adventureStats(
              buddy.stats,
              config.adventure.oath,
              config.adventure.relic,
            )
          : { ...buddy.stats },
        def = CLASS_MAP[buddy.classId],
        book = normalizeSpellbook(
          buddy.classId,
          buddy.characterLevel,
          buddy.spellbook,
          def.spells,
        );
      const validItems = [...new Set(buddy.equipment?.items || [])].filter(
        (id) =>
          Object.hasOwn(GEAR_MAP, id) &&
          (!GEAR_MAP[id].classes ||
            GEAR_MAP[id].classes!.includes(buddy.classId)) &&
          buddy.characterLevel >= (GEAR_MAP[id].level || 1),
      );
      this.partner = {
        config: { ...buddy },
        classDef: def,
        stats: partnerStats,
        player: {
          ...this.player,
          kit: createClassState(),
          x: 90,
          maxHp: partnerStats.health,
          hp: partnerStats.health,
          resource: def.resource === "Rage" ? 30 : 100,
        },
        prepared: book.prepared,
        spells: book.prepared
          .filter(
            (id) =>
              id === def.spells[0] ||
              (["hunter", "warlock"].includes(def.id) && id === def.spells[2]),
          )
          .map((id) => ({ id, rank: 1, timer: 0.2, orbitTimer: 0 })),
        equipment: { ...buddy.equipment, items: validItems },
        weaponHits: {},
        healingEffects: {},
        buffs: {},
        input: { x: 0, y: 0 },
        revive: 0,
      };
      const companion = this.partner.spells.find(
        (spell) => SPELLS[spell.id].kind === "pet",
      );
      if (companion)
        this.partner.pet = { x: 130, y: 0, spellId: companion.id, timer: 0.5 };
    }
  }
  setPartnerInput(x: number, y: number) {
    if (!this.partner) return;
    const length = Math.hypot(x, y);
    this.partner.input =
      Number.isFinite(length) && length
        ? { x: x / Math.max(1, length), y: y / Math.max(1, length) }
        : { x: 0, y: 0 };
  }
  private withPartner<T>(action: () => T): T | undefined {
    const buddy = this.partner;
    if (!buddy) return undefined;
    const original = {
      player: this.player,
      stats: this.stats,
      classDef: this.classDef,
      config: this.config,
      spells: this.spells,
      equipment: this.equipment,
      weaponHits: this.weaponHits,
      healingEffects: this.healingEffects,
      timedBuffs: this.timedBuffs,
      casts: this.trialCasts,
      actives: this.trialActives,
    };
    const events: GameEvent[] = [];
    this.primaryActor = original.player;
    this.primaryClassId = original.classDef.id;
    this.partnerActing = true;
    this.player = buddy.player;
    this.stats = buddy.stats;
    this.classDef = buddy.classDef;
    this.spells = buddy.spells;
    this.equipment = buddy.equipment;
    this.weaponHits = buddy.weaponHits;
    this.healingEffects = buddy.healingEffects;
    this.timedBuffs = buddy.buffs;
    this.config = {
      ...original.config,
      ...buddy.config,
      partner: undefined,
      trialChapter: undefined,
      onEvent: (event) => events.push(event),
    };
    try {
      return action();
    } finally {
      this.primaryActor = null;
      this.primaryClassId = null;
      this.partnerActing = false;
      this.player = original.player;
      this.stats = original.stats;
      this.classDef = original.classDef;
      this.config = original.config;
      this.spells = original.spells;
      this.equipment = original.equipment;
      this.weaponHits = original.weaponHits;
      this.healingEffects = original.healingEffects;
      this.timedBuffs = original.timedBuffs;
      this.trialCasts = original.casts;
      this.trialActives = original.actives;
      for (const event of events) this.emit(event);
    }
  }
  activatePartner(): boolean {
    if (
      !this.partner ||
      this.partner.player.hp <= 0 ||
      this.paused ||
      this.choosing ||
      this.checkpoint ||
      this.shrineChoice ||
      this.ended
    )
      return false;
    return this.withPartner(() => this.activate()) || false;
  }
  dashPartner(): boolean {
    return this.partner ? this.withPartner(() => this.dash()) || false : false;
  }
  private hurtActor(
    actor: GameEngine["player"],
    damage: number,
    school: DamageSchool = "physical",
  ) {
    return actor === this.partner?.player
      ? this.withPartner(() => this.hurtPlayer(damage, school))
      : this.hurtPlayer(damage, school);
  }
  private tetherParty() {
    const buddy = this.partner;
    if (!buddy) return;
    const a = this.player,
      b = buddy.player;
    const limit = Math.max(
      120,
      Math.min(480, Math.min(this.width, this.height) - 110),
    );
    const separation = Math.hypot(a.x - b.x, a.y - b.y);
    if (separation <= limit) return;
    // Fallen actors stay where they fell; the living ally remains within reach and view.
    const anchor = b.hp <= 0 ? b : a,
      mover = b.hp <= 0 ? a : b;
    mover.x = anchor.x + ((mover.x - anchor.x) * limit) / separation;
    mover.y = anchor.y + ((mover.y - anchor.y) * limit) / separation;
  }
  private updatePartner(dt: number) {
    const buddy = this.partner;
    if (!buddy) return;
    const p = buddy.player,
      primary = this.player;
    this.tetherParty();
    if (p.hp <= 0 || primary.hp <= 0) {
      const close = distanceSq(p, primary) <= 90 ** 2;
      if (p.hp <= 0 && primary.hp > 0) {
        buddy.revive = close ? buddy.revive + dt : 0;
        if (buddy.revive >= 3) {
          p.hp = p.maxHp * 0.35;
          p.invulnerable = 2;
          buddy.revive = 0;
          this.emit({
            type: "pickup",
            message: "Your partner is back on their feet.",
          });
        }
      } else if (primary.hp <= 0 && p.hp > 0) {
        this.revivePrimary = close ? this.revivePrimary + dt : 0;
        if (this.revivePrimary >= 3) {
          primary.hp = primary.maxHp * 0.35;
          primary.invulnerable = 2;
          this.revivePrimary = 0;
          this.emit({
            type: "pickup",
            message: "Your partner helped you back into the fight.",
          });
        }
      }
    }
    if (p.hp <= 0) {
      p.kit.anchors = [];
      p.kit.curses.clear();
      return;
    }
    for (const key of [
      "invulnerable",
      "activeBuff",
      "dashTimer",
      "dashCooldown",
      "activeCooldown",
      "hurt",
    ] as const)
      p[key] = Math.max(0, p[key] - dt);
    if (p.shieldTimer > 0 && (p.shieldTimer -= dt) <= 0) p.shield = 0;
    p.hp = Math.min(p.maxHp, p.hp + buddy.stats.regen * dt);
    const partnerResource = this.classCombat
      ? classResource(buddy.classDef.id, p.kit)
      : buddy.classDef.resource;
    if (partnerResource !== "Rage")
      p.resource = Math.min(
        100,
        p.resource +
          (partnerResource === "Energy" ? 20 : 14 + buddy.stats.regen * 2) * dt,
      );
    const speed =
        buddy.classDef.speed *
        (1 + buddy.stats.speed / 100) *
        (this.config.classCombat ? classSpeed(buddy.classDef.id, p.kit) : 1) *
        (p.dashTimer > 0 ? 3.5 : 1),
      bounds = this.movementBounds;
    p.x = clamp(
      p.x + (p.dashTimer > 0 ? p.kit.dashX : buddy.input.x) * speed * dt,
      -bounds.x,
      bounds.x,
    );
    p.y = clamp(
      p.y + (p.dashTimer > 0 ? p.kit.dashY : buddy.input.y) * speed * dt,
      -bounds.y,
      bounds.y,
    );
    if ((buddy.input.x || buddy.input.y) && p.dashTimer <= 0)
      p.facing = Math.atan2(buddy.input.y, buddy.input.x);
    this.tetherParty();
    const unlocked = buddy.prepared.slice(
      0,
      Math.min(4, 1 + Math.floor(this.level / 3)),
    );
    for (const id of unlocked)
      if (!buddy.spells.some((spell) => spell.id === id)) {
        buddy.spells.push({ id, rank: 1, timer: 0.2, orbitTimer: 0 });
        if (SPELLS[id].kind === "pet" && !buddy.pet)
          buddy.pet = { x: p.x + 55, y: p.y + 20, spellId: id, timer: 0.5 };
      }
    for (const spell of buddy.spells)
      spell.rank = Math.min(5, 1 + Math.floor((this.level - 1) / 4));
    if (buddy.pet) {
      const pet = buddy.pet,
        target =
          (this.config.classCombat
            ? this.enemies.find(
                (e) =>
                  !e.dead &&
                  e.id === p.kit.target &&
                  distanceSq(e, p) < 800 ** 2,
              )
            : undefined) || this.nearest(p, 500),
        follow =
          pet.spellId === "beast" && target
            ? target
            : { x: p.x + 55, y: p.y + 20 },
        dx = follow.x - pet.x,
        dy = follow.y - pet.y,
        length = Math.hypot(dx, dy) || 1,
        step = Math.min(length, 260 * dt);
      pet.x += (dx / length) * step;
      pet.y += (dy / length) * step;
    }
    this.withPartner(() => {
      if (this.config.classCombat)
        updateClass(this.classWorld(), dt, !!(buddy.input.x || buddy.input.y));
      for (const [id, buff] of Object.entries(buddy.buffs))
        if (this.time >= buff.until) {
          for (const [key, value] of Object.entries(buff.stats))
            buddy.stats[key as Stat] -= value!;
          delete buddy.buffs[id];
        }
      for (const [id, effect] of Object.entries(buddy.healingEffects)) {
        effect.timer -= dt;
        if (effect.timer <= 0 && effect.ticksLeft > 0) {
          this.healPlayer(effect.damage, id, false);
          effect.ticksLeft--;
          effect.timer += effect.interval;
        }
        if (effect.ticksLeft <= 0) delete buddy.healingEffects[id];
      }
      for (const state of buddy.spells) {
        const def = SPELLS[state.id];
        state.timer -= dt;
        if (state.timer > 0) continue;
        if (def.kind === "orbit") {
          for (const point of this.orbitPositions(state))
            for (const enemy of this.grid.near(point, 40))
              if (distanceSq(point, enemy) < (enemy.radius + 20) ** 2)
                this.damageEnemy(
                  enemy,
                  this.spellDamage(def, state.rank) * 0.42,
                  def.id,
                );
          state.timer =
            0.24 /
            (1 +
              (buddy.stats.haste +
                (buddy.config.spellBonuses?.[def.id]?.haste || 0)) /
                100);
        } else if (def.kind === "pet" && buddy.pet) {
          const pet = buddy.pet,
            target =
              (this.config.classCombat
                ? this.enemies.find(
                    (e) =>
                      !e.dead &&
                      e.id === p.kit.target &&
                      distanceSq(e, p) < 800 ** 2,
                  )
                : undefined) || this.nearest(p, 500);
          if (
            target &&
            (def.id !== "beast" || distanceSq(pet, target) < 100 ** 2)
          ) {
            if (def.id === "beast")
              this.damageEnemy(
                target,
                this.spellDamage(def, state.rank),
                def.id,
              );
            else this.shoot(pet, target, def, state.rank, 0);
            this.action(pet, target, def);
            state.timer = def.cooldown;
          }
        } else
          state.timer = this.castSpell(def, state.rank)
            ? (def.cooldown *
                (this.config.classCombat &&
                this.classDef.id === "druid" &&
                p.kit.form === "cat" &&
                def.id === this.classDef.spells[0]
                  ? 0.55
                  : 1)) /
              (1 + buddy.stats.haste / 100)
            : 0.12;
        if (this.ended || this.checkpoint) break;
      }
    });
  }
  get dungeonRoute() {
    return this.zone.dungeon ? dungeonRoute(this.zone.id) : undefined;
  }
  get dungeonStage() {
    return this.dungeonRoute?.stages[this.dungeonStageIndex] || null;
  }
  get bossName(): string {
    return this.dungeonStage?.boss || this.zone.boss;
  }
  get bossIdentity() {
    return this.dungeonStage || BOSS_IDENTITIES[this.zone.id];
  }
  get movementBounds() {
    const b = this.dungeonStage?.bounds;
    return b ? { x: b.x - 14, y: b.y - 14 } : { x: WORLD_SIZE, y: WORLD_SIZE };
  }
  private prepareDungeonRoom() {
    this.player.x = 0;
    this.player.y = 0;
    if (this.partner) {
      this.partner.player.x = 90;
      this.partner.player.y = 0;
      this.partner.player.hp = Math.max(
        this.partner.player.hp,
        this.partner.player.maxHp * 0.5,
      );
    }
    if (this.zone.id === "shadowfang") {
      this.nodes = [];
      return;
    }
    this.nodes = Array.from({ length: 8 }, (_, i) => ({
      id: this.dungeonStageIndex * 10 + i,
      kind:
        i < 5 || this.zone.id === "ragefire"
          ? materialFor(
              "ore",
              this.zone.id === "scarlet"
                ? 4
                : Math.min(3, this.dungeonStageIndex + 1),
            )
          : materialFor(
              "fish",
              this.zone.id === "scarlet"
                ? 4
                : Math.min(3, this.dungeonStageIndex + 1),
            ),
      x: (i % 2 ? 1 : -1) * (260 + Math.floor(i / 2) * 65),
      y: -310 + Math.floor(i / 2) * 190,
      depleted: false,
    }));
  }
  continueDungeon(boonId: string): boolean {
    const boon = DUNGEON_BOONS.find((b) => b.id === boonId);
    if (
      !this.checkpoint ||
      this.ended ||
      this.paused ||
      !boon ||
      this.dungeonStageIndex >= this.dungeonRoute!.stages.length - 1
    )
      return false;
    for (const [stat, value] of Object.entries(boon.stats))
      this.stats[stat as Stat] += value!;
    this.dungeonBoons.push(boon.id);
    this.player.hp = Math.min(
      this.player.maxHp,
      this.player.hp + this.player.maxHp * 0.3,
    );
    this.player.resource = 100;
    this.player.invulnerable = 1;
    this.player.dashTimer = 0;
    this.setInput(0, 0);
    this.dungeonStageIndex++;
    this.dungeonStageTime = 0;
    this.checkpoint = false;
    this.boss = null;
    this.bossState = {
      phase: 1,
      attackIndex: 0,
      attackName: "",
      attackUntil: 0,
      stillUntil: 0,
    };
    this.enemies = [];
    this.projectiles = [];
    this.hazards = [];
    this.areas = [];
    this.effects = [];
    for (const actor of [
      this.player,
      ...(this.partner ? [this.partner.player] : []),
    ]) {
      actor.kit.anchors = [];
      actor.kit.curses.clear();
      actor.kit.target = null;
      if (
        this.classDef.id === "rogue" ||
        (actor === this.partner?.player && this.partner.classDef.id === "rogue")
      )
        actor.kit.points = 0;
    }
    this.texts = [];
    // Loose treasure becomes secured before leaving this room.
    for (const item of this.pickups) {
      if (item.kind === "xp")
        this.xp += item.value * (this.classDef.id === "mage" ? 1.15 : 1);
      if (item.kind === "gold") this.gold += item.value;
      if (item.kind === "chest" && item.loot) this.loot.push(item.loot);
    }
    this.pickups = [];
    this.spawnTimer = 0.8;
    this.eliteCount = 0;
    this.waveCount = 0;
    this.prepareDungeonRoom();
    for (const pet of this.pets) {
      pet.x = this.player.x + 60;
      pet.y = this.player.y;
    }
    for (let i = 0; i < 7; i++) this.spawnEnemy(360 + i * 20);
    return true;
  }
  private emit(event: GameEvent) {
    this.config.onEvent?.({
      ...event,
      classId: event.classId || this.classDef.id,
    });
  }
  private action(
    actor: Vec,
    target?: Vec,
    spell?: SpellDef,
    ability?: ClassId,
  ) {
    if (this.config.classCombat) {
      const facing = target
        ? Math.atan2(target.y - actor.y, target.x - actor.x)
        : this.player.facing;
      if (!ability)
        this.classWorld().visual(
          actor,
          spell?.kind === "melee" ? 95 : 45,
          "cast",
          facing,
        );
      if (actor === this.player) {
        this.player.kit.motionAt = this.time;
        this.player.kit.motionFacing = facing;
      }
    }
    this.config.onAction?.({
      actor,
      time: this.time,
      facing: target
        ? Math.atan2(target.y - actor.y, target.x - actor.x)
        : this.player.facing,
      spellId: spell?.id,
      spellKind: spell?.kind,
      ability,
    });
  }
  private classWorld(): ClassWorld {
    const actor = this.player;
    return {
      id: this.classDef.id,
      actor,
      time: this.time,
      power: this.stats.power,
      enemies: this.enemies,
      allies: [
        actor,
        ...(this.partner
          ? [this.partnerActing ? this.primaryActor! : this.partner.player]
          : []),
      ].filter(Boolean),
      damage: (enemy, amount, source) =>
        this.damageEnemy(enemy, amount, source, false),
      visual: (at, radius, motif, facing = actor.facing) =>
        this.addEffect({
          kind: "class",
          classId: this.classDef.id,
          motif,
          facing,
          x: at.x,
          y: at.y,
          radius,
          color: this.classDef.color,
          life: motif === "dash" ? 0.5 : 0.65,
        }),
    };
  }
  private primaryActor: GameEngine["player"] | null = null;
  private primaryClassId: ClassId | null = null;
  private enemyAction(
    actor: Enemy,
    kind: EnemyAction["kind"],
    warning = 0,
    pattern?: number,
    facing?: number,
  ) {
    if (actor.dead) return;
    this.config.onEnemyAction?.({
      actor,
      time: this.time,
      facing:
        facing ?? Math.atan2(this.player.y - actor.y, this.player.x - actor.x),
      kind,
      warning,
      zoneId: this.zone.id,
      pattern,
    });
  }
  setViewport(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
  setInput(x: number, y: number) {
    const len = Math.hypot(x, y);
    this.input.x = len > 1 ? x / len : x;
    this.input.y = len > 1 ? y / len : y;
  }
  private addSpell(id: string) {
    this.spells.push({ id, rank: 1, timer: 0.1, orbitTimer: 0 });
    if (SPELLS[id].kind === "pet")
      this.pets.push({
        spellId: id,
        x: this.player.x + 60,
        y: this.player.y,
        timer: 0.5,
      });
  }

  get signatureReady(): boolean {
    const p = this.player;
    if (
      p.hp <= 0 ||
      this.paused ||
      this.choosing ||
      this.checkpoint ||
      this.shrineChoice ||
      this.ended ||
      p.activeCooldown > 0
    )
      return false;
    if (!this.classCombat)
      return p.resource >= (this.classDef.resource === "Rage" ? 25 : 20);
    if (this.classDef.id === "warrior") return p.resource >= 25;
    if (this.classDef.id === "rogue")
      return (
        p.resource >= 20 &&
        p.kit.points > 0 &&
        this.enemies.some(
          (e) =>
            !e.dead && e.id === p.kit.target && distanceSq(e, p) <= 170 ** 2,
        )
      );
    if (this.classDef.id === "warlock")
      return p.kit.points > 0 || p.hp > p.maxHp * 0.15 + 1;
    return true;
  }
  get resourceKind(): "Mana" | "Energy" | "Rage" {
    return this.classCombat
      ? classResource(this.classDef.id, this.player.kit)
      : this.classDef.resource;
  }
  get classCombat(): boolean {
    return !!this.config.classCombat;
  }
  get travelling(): boolean {
    return this.travel.active || this.travel.channel > 0;
  }
  get travelRestriction(): string | null {
    if (this.zone.dungeon) return "Travel is unavailable in dungeons.";
    if (!this.travelOption)
      return "Select a mount or travel form at the stable.";
    if (this.boss && !this.boss.dead) return "Face the final boss on foot.";
    if (this.travel.lock > 0)
      return `Wait ${this.travel.lock.toFixed(1)}s after a hit.`;
    if (this.input.x || this.input.y || this.player.dashTimer > 0)
      return "Stand still to summon.";
    if (this.player.activeBuff > 0 && this.classDef.id === "druid")
      return "Leave Bear Form before travelling.";
    if (
      this.enemies.some(
        (e) =>
          !e.dead && distanceSq(e, this.player) < TRAVEL_RULES.enemyRadius ** 2,
      )
    )
      return "Move away from nearby enemies.";
    return null;
  }
  toggleTravel(): boolean {
    if (this.player.hp <= 0) return false;
    if (
      this.paused ||
      this.choosing ||
      this.shrineChoice ||
      this.checkpoint ||
      this.ended
    )
      return false;
    if (this.travelling) {
      this.stopTravel();
      return true;
    }
    if (this.travelRestriction) return false;
    this.travel.channel =
      this.travelOption!.kind === "form"
        ? TRAVEL_RULES.formSummon
        : TRAVEL_RULES.summon;
    return true;
  }
  private stopTravel() {
    this.travel.active = false;
    this.travel.channel = 0;
  }
  update(dt: number) {
    if (
      this.paused ||
      this.choosing ||
      this.shrineChoice ||
      this.checkpoint ||
      this.ended
    )
      return;
    dt = Math.min(dt, 0.05);
    this.time += dt;
    if (this.config.adventure) {
      this.streakTimer = Math.max(0, this.streakTimer - dt);
      if (this.streakTimer === 0) this.streak = 0;
    }
    for (const [id, buff] of Object.entries(this.timedBuffs))
      if (this.time >= buff.until) {
        for (const [key, value] of Object.entries(buff.stats))
          this.stats[key as Stat] -= value!;
        delete this.timedBuffs[id];
      }
    if (this.config.food && this.time >= 60 && !this.foodQuestCounted) {
      this.foodQuestCounted = true;
      this.recordProfessionUse("meals");
    }
    if (this.dungeonStage) this.dungeonStageTime += dt;
    const p = this.player;
    this.travel.lock = Math.max(0, this.travel.lock - dt);
    if (this.travel.channel > 0) {
      if (this.travelRestriction) this.stopTravel();
      else {
        this.travel.channel = Math.max(0, this.travel.channel - dt);
        if (!this.travel.channel) this.travel.active = true;
      }
    }
    for (const key of [
      "invulnerable",
      "activeBuff",
      "dashTimer",
      "dashCooldown",
      "activeCooldown",
      "hurt",
    ] as const)
      p[key] = Math.max(0, p[key] - dt);
    if (p.shieldTimer > 0) {
      p.shieldTimer -= dt;
      if (p.shieldTimer <= 0) p.shield = 0;
    }
    if (p.hp > 0)
      p.hp = Math.min(
        p.maxHp,
        p.hp +
          (this.stats.regen +
            (p.activeBuff > 0 && this.classDef.id === "druid" ? 5 : 0)) *
            dt,
      );
    if (this.resourceKind !== "Rage")
      p.resource = Math.min(
        100,
        p.resource +
          (this.resourceKind === "Energy" ? 20 : 14 + this.stats.regen * 2) *
            dt,
      );
    const speed =
      this.classDef.speed *
      (1 + this.stats.speed / 100) *
      (this.travel.active ? 1 + this.travelOption!.speed / 100 : 1) *
      (this.config.classCombat ? classSpeed(this.classDef.id, p.kit) : 1) *
      (p.dashTimer > 0 ? 3.5 : 1) *
      (p.activeBuff > 0 && this.classDef.id === "rogue" ? 1.4 : 1);
    const bounds = this.movementBounds;
    p.x = clamp(
      p.x +
        (p.hp > 0 ? (p.dashTimer > 0 ? p.kit.dashX : this.input.x) : 0) *
          speed *
          dt,
      -bounds.x,
      bounds.x,
    );
    p.y = clamp(
      p.y +
        (p.hp > 0 ? (p.dashTimer > 0 ? p.kit.dashY : this.input.y) : 0) *
          speed *
          dt,
      -bounds.y,
      bounds.y,
    );
    if ((this.input.x || this.input.y) && p.dashTimer <= 0)
      p.facing = Math.atan2(this.input.y, this.input.x);

    if (this.config.classCombat)
      updateClass(this.classWorld(), dt, !!(this.input.x || this.input.y));
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && !this.boss) {
      const spawnCount = Math.min(
        4,
        1 + Math.floor(this.time / 100) + (this.partner ? 1 : 0),
      );
      for (let i = 0; i < spawnCount; i++) this.spawnEnemy();
      this.spawnTimer +=
        Math.max(0.28, 1.05 - this.time / 600) /
        this.zone.difficulty /
        (this.config.adventure
          ? DIFFICULTIES[this.config.adventure.difficulty].spawn
          : 1);
    }
    const stageTime = this.dungeonStage ? this.dungeonStageTime : this.time;
    const duration = this.dungeonStage?.duration ?? this.zone.duration;
    const elite = Math.floor(stageTime / (this.dungeonStage ? 60 : 120));
    if (elite > this.eliteCount && stageTime < duration && !this.boss) {
      this.eliteCount = elite;
      this.spawnEnemy(420, true);
      this.emit({
        type: "elite",
        message: "An elite approaches. Defeat it for treasure.",
      });
    }
    const wave = Math.floor(stageTime / 45);
    if (wave > this.waveCount && !this.boss) {
      this.waveCount = wave;
      for (let i = 0; i < 12 + wave * 2; i++)
        this.spawnEnemy(500, false, (i * Math.PI * 2) / (12 + wave * 2));
    }
    if (stageTime >= duration && !this.boss) {
      this.stopTravel();
      this.gatheringOpen = false;
      this.boss = this.spawnEnemy(400, false, undefined, true);
      this.emit({
        type: "boss",
        message: `${this.bossName} has arrived. ${this.dungeonStage && this.dungeonStageIndex < this.dungeonRoute!.stages.length - 1 ? "Defeat this guardian to reach the next stage." : "Defeat the boss to complete your expedition."}`,
      });
    }

    this.updatePeriodicEffects(dt);
    if (this.ended || this.checkpoint) return;
    this.grid.rebuild(this.enemies);
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.flash = Math.max(0, e.flash - dt);
      const concealed = this.classCombat && p.kit.concealedUntil > this.time,
        buddyConcealed =
          this.classCombat &&
          !!this.partner &&
          this.partner.player.kit.concealedUntil > this.time;
      const focus =
        this.partner &&
        this.partner.player.hp > 0 &&
        (p.hp <= 0 ||
          (concealed && !buddyConcealed) ||
          (distanceSq(e, this.partner.player) < distanceSq(e, p) &&
            (!buddyConcealed || concealed)))
          ? this.partner.player
          : p;
      const pursuit =
        this.classCombat &&
        focus.kit.concealedUntil > this.time &&
        focus.kit.decoy
          ? focus.kit.decoy
          : focus;
      const dx = pursuit.x - e.x,
        dy = pursuit.y - e.y,
        length = Math.hypot(dx, dy) || 1;
      if (
        e.frozenUntil <= this.time &&
        !(e.boss && this.bossState.stillUntil > this.time)
      ) {
        const slow = e.slowUntil > this.time ? e.slow : 1;
        e.x += (dx / length) * e.speed * slow * dt;
        e.y += (dy / length) * e.speed * slow * dt;
        for (const other of this.grid.near(e, 30)) {
          if (e.id >= other.id || other.dead) continue;
          const sx = e.x - other.x,
            sy = e.y - other.y,
            sl = Math.hypot(sx, sy);
          if (sl > 0.1 && sl < e.radius + other.radius) {
            const push = (e.radius + other.radius - sl) * 0.16;
            e.x += (sx / sl) * push;
            e.y += (sy / sl) * push;
            other.x -= (sx / sl) * push;
            other.y -= (sy / sl) * push;
          }
        }
      }
      if (
        (this.classCombat
          ? distanceSq(e, focus) < (e.radius + 14) ** 2
          : length < e.radius + 14) &&
        !focus.invulnerable &&
        this.hurtActor(focus, e.damage)
      )
        this.enemyAction(e, "contact");
      e.attackTimer -= dt;
      if (e.boss) {
        const phase = e.hp < e.maxHp * 0.5 ? 2 : 1;
        if (phase !== this.bossState.phase) {
          this.bossState.phase = phase;
          if (this.zone.id === "deadmines" && this.dungeonStageIndex === 2)
            for (let i = 0; i < 2; i++)
              this.spawnEnemy(280, false, undefined, false, "blackguard");
          this.emit({
            type: "boss",
            message: this.bossName + " is enraged. Watch for stronger attacks!",
          });
        }
        if (e.attackTimer <= 0 && length < 650) this.castBossAttack(e);
      } else if (
        (e.type === "wraith" ||
          e.type === "defias" ||
          e.type === "cultist" ||
          e.type === "dusk_mage") &&
        e.attackTimer <= 0 &&
        !(this.classCombat && focus.kit.concealedUntil > this.time) &&
        length < 650
      ) {
        e.attackTimer = 5.5;
        if (this.projectiles.length < 500) {
          this.projectiles.push({
            x: e.x,
            y: e.y,
            vx: (dx / length) * 180,
            vy: (dy / length) * 180,
            damage: e.damage,
            radius: 5,
            color: "#ed9874",
            life: 4,
            pierce: 0,
            slow: 1,
            hit: new Set(),
            enemy: true,
            school:
              e.type === "defias"
                ? "physical"
                : e.type === "cultist"
                  ? "fire"
                  : "shadow",
          });
          this.enemyAction(e, "projectile", 0, undefined, Math.atan2(dy, dx));
        }
      }
      if (this.dungeonStage) {
        e.x = clamp(e.x, -bounds.x + e.radius, bounds.x - e.radius);
        e.y = clamp(e.y, -bounds.y + e.radius, bounds.y - e.radius);
      }
      if (!e.boss && distanceSq(e, p) > 1500 ** 2) {
        const angle = this.rng.between(0, Math.PI * 2);
        e.x = p.x + Math.cos(angle) * 620;
        e.y = p.y + Math.sin(angle) * 620;
      }
    }
    this.grid.rebuild(this.enemies);
    for (const state of this.spells) {
      if (this.travelling || p.hp <= 0) continue;
      const def = SPELLS[state.id];
      if (def.kind === "orbit") {
        state.orbitTimer -= dt;
        if (state.orbitTimer <= 0) {
          state.orbitTimer =
            0.24 /
            (1 +
              (this.stats.haste +
                (this.config.spellBonuses?.[def.id]?.haste || 0)) /
                100);
          for (const point of this.orbitPositions(state))
            for (const e of this.grid.near(point, 40))
              if (distanceSq(point, e) < (e.radius + 20) ** 2)
                this.damageEnemy(
                  e,
                  this.spellDamage(def, state.rank) * 0.42,
                  state.id,
                );
        }
      } else if (def.kind !== "pet") {
        state.timer -= dt;
        if (state.timer <= 0) {
          if (this.castSpell(def, state.rank))
            state.timer =
              (def.cooldown *
                (this.config.classCombat &&
                this.classDef.id === "druid" &&
                this.player.kit.form === "cat" &&
                def.id === this.classDef.spells[0]
                  ? 0.55
                  : 1) *
                Math.max(0.3, 1 - (state.rank - 1) * 0.09)) /
              (1 +
                (this.stats.haste +
                  (this.config.spellBonuses?.[def.id]?.haste || 0)) /
                  100);
          else state.timer = 0.12;
        }
      }
    }
    for (const pet of this.pets) {
      const def = SPELLS[pet.spellId],
        state = this.spells.find((s) => s.id === pet.spellId)!;
      const target =
        this.travelling || p.hp <= 0
          ? null
          : (this.config.classCombat
              ? this.enemies.find(
                  (e) =>
                    !e.dead &&
                    e.id === p.kit.target &&
                    distanceSq(e, p) < 800 ** 2,
                )
              : undefined) || this.nearest(p, 500);
      const follow =
        pet.spellId === "beast" && target
          ? target
          : {
              x: p.x + Math.cos(this.time) * 65,
              y: p.y + Math.sin(this.time) * 65,
            };
      const dx = follow.x - pet.x,
        dy = follow.y - pet.y,
        len = Math.hypot(dx, dy) || 1;
      const step = Math.min(len, 260 * dt);
      pet.x += (dx / len) * step;
      pet.y += (dy / len) * step;
      if (!this.travelling) pet.timer -= dt;
      if (pet.timer <= 0 && target) {
        pet.timer =
          (def.cooldown /
            (1 +
              (this.stats.haste +
                (this.config.spellBonuses?.[def.id]?.haste || 0)) /
                100)) *
          (1 - (state.rank - 1) * 0.1);
        if (pet.spellId === "beast") {
          if (distanceSq(pet, target) < 100 ** 2) {
            this.damageEnemy(target, this.spellDamage(def, state.rank), def.id);
            this.action(pet, target, def);
            this.addEffect({
              kind: "burst",
              x: target.x,
              y: target.y,
              radius: 25,
              color: def.color,
              life: 0.2,
            });
          }
        } else {
          const before = this.projectiles.length;
          const count =
            1 + (this.config.spellBonuses?.[def.id]?.projectiles || 0);
          for (let i = 0; i < count; i++)
            this.shoot(
              pet,
              target,
              def,
              state.rank,
              (i - (count - 1) / 2) * 0.12,
            );
          if (this.projectiles.length > before) this.action(pet, target, def);
        }
      }
    }
    for (const a of this.areas) {
      a.life -= dt;
      a.timer -= dt;
      if (a.timer <= 0) {
        a.timer = 0.45;
        for (const e of this.grid.near(a, a.radius + 30))
          if (distanceSq(a, e) < (a.radius + e.radius) ** 2) {
            this.damageEnemy(e, a.damage, a.spellId || "area");
            if (a.slow < 1) {
              e.slow = a.slow;
              e.slowUntil = this.time + 1;
            }
          }
      }
    }
    this.areas = this.areas.filter((a) => a.life > 0);
    for (const shot of this.projectiles) {
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.life -= dt;
      if (shot.enemy) {
        for (const actor of [p, ...(this.partner ? [this.partner.player] : [])])
          if (
            actor.hp > 0 &&
            distanceSq(shot, actor) < (shot.radius + 14) ** 2
          ) {
            this.hurtActor(actor, shot.damage, shot.school || "shadow");
            shot.life = 0;
            break;
          }
        continue;
      }
      for (const e of this.grid.near(shot, 45)) {
        if (
          e.dead ||
          shot.hit.has(e.id) ||
          distanceSq(shot, e) > (e.radius + shot.radius) ** 2
        )
          continue;
        this.damageEnemy(e, shot.damage, shot.spellId || "projectile");
        shot.hit.add(e.id);
        if (shot.slow < 1) {
          e.slowUntil = this.time + 2.4;
          e.slow = shot.slow;
        }
        if (shot.pierce-- <= 0) {
          shot.life = 0;
          break;
        }
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.life > 0);
    for (const hazard of this.hazards) {
      if (
        hazard.casterId !== undefined &&
        !this.enemies.some((e) => e.id === hazard.casterId && !e.dead)
      ) {
        hazard.life = 0;
        continue;
      }
      hazard.warning -= dt;
      hazard.life -= dt;
      if (!hazard.resolved && hazard.warning <= 0) {
        hazard.resolved = true;
        if (hazard.linger) hazard.tickTimer = 0.8;
        if (hazard.teleportId !== undefined) {
          const caster = this.enemies.find(
            (e) => e.id === hazard.teleportId && e.boss && !e.dead,
          );
          if (!caster) {
            hazard.life = 0;
            continue;
          }
          const bounds = this.movementBounds;
          caster.x = clamp(
            hazard.x,
            -bounds.x + caster.radius,
            bounds.x - caster.radius,
          );
          caster.y = clamp(
            hazard.y,
            -bounds.y + caster.radius,
            bounds.y - caster.radius,
          );
        }
        this.addEffect({
          kind: hazard.shape === "line" ? "line" : "ring",
          x: hazard.x,
          y: hazard.y,
          end: hazard.end,
          radius: hazard.radius,
          color: hazard.linger
            ? "#a7c876"
            : hazard.teleportId !== undefined
              ? "#bf9df4"
              : "#ee9279",
          life: 0.4,
        });
        if (telegraphContains(hazard, p))
          this.hurtActor(p, hazard.damage, hazard.school || "physical");
        if (this.partner && telegraphContains(hazard, this.partner.player))
          this.hurtActor(
            this.partner.player,
            hazard.damage,
            hazard.school || "physical",
          );
        if (hazard.chargeId !== undefined && hazard.end) {
          const charger = this.enemies.find(
            (e) => e.id === hazard.chargeId && !e.dead,
          );
          if (charger) {
            charger.x = hazard.end.x;
            charger.y = hazard.end.y;
          }
        }
      } else if (hazard.linger && hazard.resolved && hazard.life > 0) {
        hazard.tickTimer = (hazard.tickTimer ?? 0.8) - dt;
        if (hazard.tickTimer <= 0) {
          hazard.tickTimer += 0.8;
          if (telegraphContains(hazard, p))
            this.hurtActor(p, hazard.damage, hazard.school || "physical");
          if (this.partner && telegraphContains(hazard, this.partner.player))
            this.hurtActor(
              this.partner.player,
              hazard.damage,
              hazard.school || "physical",
            );
        }
      }
    }
    this.hazards = this.hazards.filter((h) => h.life > 0);
    this.updateEncounters(dt);
    this.collectPickups(dt);
    this.gatherNodes();
    this.enemies = this.enemies.filter((e) => !e.dead);
    for (const e of this.effects) e.life -= dt;
    this.effects = this.effects.filter((e) => e.life > 0);
    for (const t of this.texts) {
      t.life -= dt;
      t.y -= dt * 30;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
    this.updatePartner(dt);
    if (p.hp <= 0 && (!this.partner || this.partner.player.hp <= 0))
      this.finish(false);
    if (!this.ended && !this.checkpoint && this.xp >= this.xpNeeded)
      this.openUpgrade();
  }

  private spawnEnemy(
    radius?: number,
    elite = false,
    angle?: number,
    boss = false,
    forcedType?: string,
  ): Enemy | null {
    if (this.enemies.length >= 400 && !elite && !boss) return null;
    const a = angle ?? this.rng.between(0, Math.PI * 2);
    const r =
      radius ?? Math.max(450, Math.hypot(this.width / 2, this.height / 2) + 70);
    const type =
      forcedType ||
      (boss
        ? this.bossIdentity?.enemy || this.zone.enemies[2]
        : this.rng.pick(
            this.zone.id === "duskwood"
              ? duskwoodRoster(this.time)
              : (this.dungeonStage?.enemies || this.zone.enemies).slice(
                  0,
                  (this.dungeonStage ? this.dungeonStageTime : this.time) < 35
                    ? 2
                    : 3,
                ),
          ));
    const base = {
      dusk_wolf: [32, 84, 10, 12],
      dusk_spider: [36, 61, 10, 13],
      dusk_rotted: [58, 59, 12, 15],
      dusk_raider: [46, 67, 11, 13],
      dusk_worgen: [64, 73, 13, 15],
      dusk_mage: [44, 58, 12, 14],
      dusk_ogre: [100, 43, 15, 19],
      dusk_defias: [49, 85, 12, 13],
      stitches: [46, 57, 12, 32],
      keep_worg: [30, 84, 9, 12],
      keep_worgen: [44, 69, 11, 14],
      keep_servitor: [30, 57, 9, 12],
      keep_guard: [48, 55, 11, 14],
      keep_void: [52, 50, 11, 15],
      silverlaine: [55, 55, 11, 17],
      springvale: [70, 58, 12, 18],
      fenrus: [75, 79, 12, 20],
      arugal: [50, 56, 11, 16],
      trogg: [30, 60, 9, 13],
      earthborer: [24, 78, 8, 12],
      molten: [48, 46, 11, 15],
      cultist: [32, 60, 9, 12],
      voidwalker: [46, 52, 10, 15],
      oggleflint: [55, 57, 11, 18],
      taragaman: [70, 60, 12, 20],
      jergosh: [44, 55, 11, 15],
      bazzalan: [50, 80, 11, 16],
      wolf: [24, 82, 8, 12],
      kobold: [30, 58, 9, 12],
      gnoll: [50, 62, 12, 15],
      defias: [38, 64, 10, 13],
      blackguard: [48, 85, 11, 13],
      golem: [90, 43, 14, 18],
      smite: [70, 62, 12, 18],
      skeleton: [32, 70, 9, 12],
      ghoul: [52, 68, 12, 15],
      wraith: [42, 75, 11, 14],
    }[type] || [30, 60, 8, 12];
    const hp =
      (boss ? this.bossIdentity?.baseHealth || base[0] : base[0]) *
      (1 + this.time / 240) *
      this.zone.difficulty *
      (boss ? 42 : elite ? 7 : 1) *
      (this.config.adventure
        ? DIFFICULTIES[this.config.adventure.difficulty].health
        : 1);
    const e: Enemy = {
      id: this.id++,
      x: clamp(
        this.player.x + Math.cos(a) * r,
        this.dungeonStage ? -this.movementBounds.x + 32 : -WORLD_SIZE - 200,
        this.dungeonStage ? this.movementBounds.x - 32 : WORLD_SIZE + 200,
      ),
      y: clamp(
        this.player.y + Math.sin(a) * r,
        this.dungeonStage ? -this.movementBounds.y + 32 : -WORLD_SIZE - 200,
        this.dungeonStage ? this.movementBounds.y - 32 : WORLD_SIZE + 200,
      ),
      type,
      hp,
      maxHp: hp,
      radius: boss ? 32 : elite ? 23 : base[3],
      speed:
        base[1] * (1 + this.time / 1400) * (boss ? 0.65 : elite ? 1.15 : 1),
      damage: base[2] * (boss ? 2.5 : elite ? 1.5 : 1),
      elite,
      boss,
      slowUntil: 0,
      slow: 1,
      frozenUntil: 0,
      flash: 0,
      attackTimer: 3,
      dead: false,
    };
    this.enemies.push(e);
    return e;
  }
  private warn(h: Omit<Hazard, "life" | "maxWarning">) {
    if (this.hazards.length < 48)
      this.hazards.push({
        ...h,
        maxWarning: h.warning,
        life: h.warning + (h.linger || 0.45),
      });
  }
  private castBossAttack(e: Enemy) {
    const previousHazards = this.hazards.length;
    const phase = this.bossState.phase,
      alternate = this.bossState.attackIndex++ % 2;
    const p =
        this.partner &&
        this.partner.player.hp > 0 &&
        (this.player.hp <= 0 ||
          distanceSq(e, this.partner.player) < distanceSq(e, this.player))
          ? this.partner.player
          : this.player,
      aim = Math.atan2(p.y - e.y, p.x - e.x);
    const point = { x: p.x, y: p.y };
    let warning = 1.3;
    e.attackTimer = phase === 2 ? 3.4 : 4.6;
    if (this.dungeonStage) {
      if (this.zone.id === "ragefire")
        this.castRagefireAttack(e, phase, alternate, point, aim);
      else if (this.zone.id === "scarlet")
        this.castScarletAttack(e, phase, alternate, point, aim);
      else if (this.zone.id === "shadowfang")
        this.castShadowfangAttack(e, phase, alternate, point, aim);
      else this.castDungeonAttack(e, phase, alternate, point, aim);
      if (this.hazards.length > previousHazards)
        this.enemyAction(
          e,
          "telegraph",
          this.bossState.attackUntil - this.time,
          alternate,
          aim,
        );
      return;
    } else if (this.zone.id === "plaguelands") {
      warning = alternate ? 1.8 : 1.35;
      this.bossState.attackName = alternate
        ? "Blight clouds · Leave the green circles"
        : "Shadow storm · Move between the lanes";
      if (alternate) {
        for (let i = 0; i < (phase === 2 ? 5 : 3); i++)
          this.warn({
            x: point.x + Math.cos(i * 2.4) * (i ? 180 : 0),
            y: point.y + Math.sin(i * 2.4) * (i ? 180 : 0),
            radius: 95,
            warning,
            damage: e.damage,
            linger: 5,
            tickTimer: 0,
            school: "nature",
          });
      } else {
        for (let i = -2; i <= 2; i++)
          this.warn({
            x: e.x,
            y: e.y,
            shape: "line",
            end: {
              x: e.x + Math.cos(aim + i * 0.45) * 650,
              y: e.y + Math.sin(aim + i * 0.45) * 650,
            },
            radius: 18,
            warning,
            damage: e.damage * 1.6,
            school: "shadow",
          });
      }
    } else if (this.zone.id === "duskwood") {
      if (!alternate) {
        warning = 1.35;
        this.bossState.attackName = "Cleaver sweep · Sidestep the lanes";
        const count = phase === 2 ? 5 : 3,
          reach = phase === 2 ? 430 : 350;
        for (let i = 0; i < count; i++) {
          const direction = aim + (i - (count - 1) / 2) * 0.4;
          this.warn({
            x: e.x,
            y: e.y,
            shape: "line",
            radius: 27,
            warning,
            damage: e.damage * 1.2,
            end: {
              x: clamp(
                e.x + Math.cos(direction) * reach,
                -WORLD_SIZE,
                WORLD_SIZE,
              ),
              y: clamp(
                e.y + Math.sin(direction) * reach,
                -WORLD_SIZE,
                WORLD_SIZE,
              ),
            },
          });
        }
      } else {
        warning = 1.65;
        this.bossState.attackName = "Embalmer’s spill · Leave the green clouds";
        const spots = [point];
        if (phase === 2)
          spots.push({
            x: clamp(
              point.x + Math.cos(aim + Math.PI / 2) * 180,
              -WORLD_SIZE,
              WORLD_SIZE,
            ),
            y: clamp(
              point.y + Math.sin(aim + Math.PI / 2) * 180,
              -WORLD_SIZE,
              WORLD_SIZE,
            ),
          });
        for (const spot of spots)
          this.warn({
            ...spot,
            radius: 85,
            warning,
            damage: e.damage * 0.55,
            linger: 3.2,
            casterId: e.id,
          });
      }
    } else if (this.zone.id === "elwynn") {
      if (!alternate) {
        this.bossState.attackName = "Savage charge · Sidestep the lane";
        const reach = Math.min(600, Math.hypot(p.x - e.x, p.y - e.y) + 180);
        this.warn({
          x: e.x,
          y: e.y,
          shape: "line",
          end: {
            x: clamp(e.x + Math.cos(aim) * reach, -WORLD_SIZE, WORLD_SIZE),
            y: clamp(e.y + Math.sin(aim) * reach, -WORLD_SIZE, WORLD_SIZE),
          },
          radius: phase === 2 ? 58 : 42,
          warning,
          damage: e.damage * 1.6,
          chargeId: e.id,
        });
      } else {
        this.bossState.attackName = "Earthshaking stomp · Leave the circle";
        this.warn({
          x: e.x,
          y: e.y,
          radius: phase === 2 ? 180 : 140,
          warning,
          damage: e.damage * 1.8,
        });
        if (phase === 2)
          this.warn({
            ...point,
            radius: 90,
            warning: 1.6,
            damage: e.damage * 1.3,
          });
        for (let i = 0; i < (phase === 2 ? 3 : 2); i++) this.spawnEnemy(300);
      }
    } else if (this.zone.id === "westfall") {
      if (!alternate) {
        warning = 1.15;
        this.bossState.attackName = "Crossfire · Move between the lanes";
        const half = phase === 2 ? 2 : 1;
        for (let i = -half; i <= half; i++) {
          const angle = aim + i * 0.3;
          this.warn({
            x: e.x,
            y: e.y,
            shape: "line",
            end: {
              x: e.x + Math.cos(angle) * 600,
              y: e.y + Math.sin(angle) * 600,
            },
            radius: 15,
            warning,
            damage: e.damage * 1.5,
          });
        }
      } else {
        warning = 1.65;
        this.bossState.attackName = "Dynamite · Escape the blast circles";
        this.warn({ ...point, radius: 105, warning, damage: e.damage * 1.9 });
        for (const side of [-1, 1])
          this.warn({
            x: point.x + Math.cos(p.facing + Math.PI / 2) * 165 * side,
            y: point.y + Math.sin(p.facing + Math.PI / 2) * 165 * side,
            radius: phase === 2 ? 110 : 75,
            warning,
            damage: e.damage * 1.5,
          });
        for (let i = 0; i < (phase === 2 ? 3 : 1); i++) this.spawnEnemy(300);
      }
    } else {
      warning = 1.8;
      if (!alternate) {
        this.bossState.attackName =
          "Soul ring · Safe inside or beyond the ring";
        this.warn({
          x: e.x,
          y: e.y,
          shape: "ring",
          radius: phase === 2 ? 310 : 270,
          innerRadius: phase === 2 ? 95 : 115,
          warning,
          damage: e.damage * 1.7,
        });
      } else {
        this.bossState.attackName = "Grave eruption · Leave the marked graves";
        this.warn({ ...point, radius: 90, warning, damage: e.damage * 1.7 });
        const count = phase === 2 ? 4 : 2;
        for (let i = 0; i < count; i++) {
          const angle = aim + (i * Math.PI * 2) / count;
          this.warn({
            x: point.x + Math.cos(angle) * 175,
            y: point.y + Math.sin(angle) * 175,
            radius: 85,
            warning,
            damage: e.damage * 1.4,
          });
        }
        for (let i = 0; i < (phase === 2 ? 4 : 2); i++) this.spawnEnemy(310);
      }
    }
    this.bossState.attackUntil = this.time + warning;
    this.bossState.stillUntil = this.time + warning;
    if (this.hazards.length > previousHazards)
      this.enemyAction(e, "telegraph", warning, alternate, aim);
  }

  private castScarletAttack(
    e: Enemy,
    phase: number,
    alternate: number,
    point: Vec,
    aim: number,
  ) {
    const stage = this.dungeonStageIndex,
      warning = alternate ? 1.7 : 1.4;
    if (stage === 0) {
      this.bossState.attackName = alternate
        ? "Arcane Detonation · Leave the library circle"
        : "Arcane lanes · Sidestep";
      if (alternate)
        this.warn({
          x: e.x,
          y: e.y,
          radius: phase === 2 ? 260 : 220,
          warning,
          damage: e.damage * 1.8,
          school: "arcane",
        });
      else
        for (const offset of [-0.45, 0, 0.45])
          this.warn({
            x: e.x,
            y: e.y,
            shape: "line",
            end: {
              x: e.x + Math.cos(aim + offset) * 550,
              y: e.y + Math.sin(aim + offset) * 550,
            },
            radius: 20,
            warning,
            damage: e.damage * 1.5,
            school: "arcane",
          });
    } else if (stage === 1 && alternate) {
      this.bossState.attackName = "Blades of Light · Stay outside the spin";
      this.warn({
        x: e.x,
        y: e.y,
        radius: 190,
        warning,
        damage: e.damage * 0.8,
        linger: 4,
        tickTimer: 0,
      });
    } else if (stage < 3 && !alternate) {
      this.bossState.attackName = "Crusader charge · Sidestep the lane";
      this.warn({
        x: e.x,
        y: e.y,
        shape: "line",
        end: { x: point.x, y: point.y },
        radius: 38,
        warning,
        damage: e.damage * 1.6,
        chargeId: e.id,
      });
    } else {
      this.bossState.attackName =
        stage === 3
          ? "Cathedral judgment · Escape the marked circles"
          : "Consecrated ground · Leave the circles";
      for (let i = 0; i < (phase === 2 ? 4 : 2); i++)
        this.warn({
          x: point.x + Math.cos((i * Math.PI) / 2) * (i ? 140 : 0),
          y: point.y + Math.sin((i * Math.PI) / 2) * (i ? 140 : 0),
          radius: 95,
          warning,
          damage: e.damage * 1.3,
        });
    }
    this.bossState.attackUntil = this.time + warning;
    this.bossState.stillUntil = this.time + warning;
  }
  private castShadowfangAttack(
    e: Enemy,
    phase: number,
    alternate: number,
    point: Vec,
    aim: number,
  ) {
    const warning = alternate ? 1.65 : 1.4,
      bounds = this.movementBounds;
    const circle = (x: number, y: number, radius: number) =>
      this.warn({
        x: clamp(x, -bounds.x + 32, bounds.x - 32),
        y: clamp(y, -bounds.y + 32, bounds.y - 32),
        radius,
        warning,
        damage: e.damage * 1.6,
      });
    const line = (angle: number, radius: number, charge = false) =>
      this.warn({
        x: e.x,
        y: e.y,
        shape: "line",
        end: {
          x: clamp(e.x + Math.cos(angle) * 560, -bounds.x + 35, bounds.x - 35),
          y: clamp(e.y + Math.sin(angle) * 560, -bounds.y + 35, bounds.y - 35),
        },
        radius,
        warning,
        damage: e.damage * 1.5,
        ...(charge ? { chargeId: e.id } : {}),
      });
    if (e.type === "silverlaine") {
      if (!alternate) {
        this.bossState.attackName =
          "Veil of shadow · Safe inside or beyond the ring";
        this.warn({
          x: e.x,
          y: e.y,
          shape: "ring",
          radius: phase === 2 ? 300 : 260,
          innerRadius: phase === 2 ? 95 : 115,
          warning,
          damage: e.damage * 1.7,
        });
      } else {
        this.bossState.attackName =
          "Haunted hall · Leave the circles and clear the servants";
        circle(point.x, point.y, phase === 2 ? 115 : 90);
        for (const side of [-1, 1])
          circle(point.x + side * 175, point.y, phase === 2 ? 85 : 65);
        for (let i = 0; i < (phase === 2 ? 3 : 2); i++)
          this.spawnEnemy(
            280,
            false,
            aim + (i * Math.PI * 2) / (phase === 2 ? 3 : 2),
            false,
            "keep_servitor",
          );
      }
    } else if (e.type === "springvale") {
      if (!alternate) {
        this.bossState.attackName =
          "Hammer of justice · Leave the hammer circles";
        circle(point.x, point.y, phase === 2 ? 130 : 100);
        if (phase === 2)
          for (const side of [-1, 1]) circle(point.x + side * 185, point.y, 70);
      } else {
        this.bossState.attackName = "Holy watch · Move between the lanes";
        for (const offset of [-0.42, 0, 0.42])
          line(aim + offset, phase === 2 ? 32 : 23);
        if (phase === 2)
          for (const offset of [-0.84, 0.84]) line(aim + offset, 20);
      }
    } else if (e.type === "fenrus") {
      if (!alternate) {
        this.bossState.attackName =
          "Devourer's lunge · Sidestep the charging lane";
        line(aim, phase === 2 ? 60 : 42, true);
        if (phase === 2)
          for (const side of [-1, 1]) circle(point.x, point.y + side * 175, 70);
      } else {
        this.bossState.attackName = "Toxic saliva · Escape the blast circles";
        circle(point.x, point.y, phase === 2 ? 120 : 90);
        const count = phase === 2 ? 4 : 2;
        for (let i = 0; i < count; i++)
          circle(
            point.x + Math.cos(aim + (i * Math.PI * 2) / count) * 185,
            point.y + Math.sin(aim + (i * Math.PI * 2) / count) * 185,
            65,
          );
      }
    } else {
      if (!alternate) {
        this.bossState.attackName =
          "Void bolts · Move between the shadow lanes";
        const half = phase === 2 ? 2 : 1;
        for (let i = -half; i <= half; i++) line(aim + i * 0.33, 18);
      } else {
        this.bossState.attackName = "Shadow Port · Leave the marked landing";
        // Short, alternating dais jumps leave melee builds time to reconnect.
        this.warn({
          x: e.x >= 0 ? -220 : 220,
          y: e.y >= 0 ? -140 : 140,
          radius: phase === 2 ? 150 : 115,
          warning,
          damage: e.damage * 1.8,
          teleportId: e.id,
        });
        if (phase === 2) circle(point.x, point.y, 80);
      }
    }
    this.bossState.attackUntil = this.time + warning;
    this.bossState.stillUntil = this.time + warning;
  }

  private castRagefireAttack(
    e: Enemy,
    phase: number,
    alternate: number,
    point: Vec,
    aim: number,
  ) {
    const warning = alternate ? 1.7 : 1.4;
    const bounds = this.movementBounds;
    const line = (angle: number, radius: number, charge = false) =>
      this.warn({
        x: e.x,
        y: e.y,
        shape: "line",
        end: {
          x: clamp(e.x + Math.cos(angle) * 570, -bounds.x + 35, bounds.x - 35),
          y: clamp(e.y + Math.sin(angle) * 570, -bounds.y + 35, bounds.y - 35),
        },
        radius,
        warning,
        damage: e.damage * 1.5,
        ...(charge ? { chargeId: e.id } : {}),
      });
    const circle = (x: number, y: number, radius: number) =>
      this.warn({
        x: clamp(x, -bounds.x + 20, bounds.x - 20),
        y: clamp(y, -bounds.y + 20, bounds.y - 20),
        radius,
        warning,
        damage: e.damage * 1.6,
      });
    if (e.type === "oggleflint") {
      if (!alternate) {
        this.bossState.attackName = "Stone cleave · Step between the lanes";
        for (const offset of [-0.42, 0, 0.42])
          line(aim + offset, phase === 2 ? 32 : 23);
        if (phase === 2)
          for (const offset of [-0.84, 0.84]) line(aim + offset, 22);
      } else {
        this.bossState.attackName = "Cave-in · Leave the falling-stone circles";
        circle(point.x, point.y, phase === 2 ? 105 : 85);
        for (let i = 0; i < (phase === 2 ? 4 : 2); i++) {
          const angle = aim + (i * Math.PI * 2) / (phase === 2 ? 4 : 2);
          circle(
            point.x + Math.cos(angle) * 180,
            point.y + Math.sin(angle) * 180,
            65,
          );
        }
      }
    } else if (e.type === "taragaman") {
      if (!alternate) {
        this.bossState.attackName =
          "Fire nova · Safe inside or beyond the ring";
        this.warn({
          x: e.x,
          y: e.y,
          shape: "ring",
          radius: phase === 2 ? 310 : 260,
          innerRadius: phase === 2 ? 90 : 115,
          warning,
          damage: e.damage * 1.7,
        });
      } else {
        this.bossState.attackName =
          "Molten uppercut · Sidestep the charging lane";
        line(aim, phase === 2 ? 60 : 42, true);
        if (phase === 2)
          for (const side of [-1, 1])
            circle(
              point.x + Math.cos(aim + Math.PI / 2) * side * 170,
              point.y + Math.sin(aim + Math.PI / 2) * side * 170,
              75,
            );
      }
    } else if (e.type === "jergosh") {
      if (!alternate) {
        this.bossState.attackName =
          "Shadow volley · Move between the shadow lanes";
        const half = phase === 2 ? 2 : 1;
        for (let i = -half; i <= half; i++) line(aim + i * 0.34, 18);
      } else {
        this.bossState.attackName =
          "Void summons · Leave the sigils and clear the minions";
        circle(point.x, point.y, phase === 2 ? 125 : 95);
        for (let i = 0; i < (phase === 2 ? 3 : 2); i++) {
          this.spawnEnemy(
            280,
            false,
            aim + (i * Math.PI * 2) / (phase === 2 ? 3 : 2),
            false,
            "voidwalker",
          );
        }
        if (phase === 2) circle(e.x, e.y, 90);
      }
    } else {
      if (!alternate) {
        this.bossState.attackName = "Blade dash · Sidestep the assassin's lane";
        line(aim, phase === 2 ? 50 : 34, true);
        if (phase === 2)
          for (const side of [-1, 1]) line(aim + side * 0.55, 18);
      } else {
        this.bossState.attackName = "Venom burst · Escape the poison circles";
        circle(point.x, point.y, phase === 2 ? 115 : 90);
        const count = phase === 2 ? 4 : 2;
        for (let i = 0; i < count; i++) {
          const angle = aim + Math.PI / 2 + (i * Math.PI * 2) / count;
          circle(
            point.x + Math.cos(angle) * 180,
            point.y + Math.sin(angle) * 180,
            70,
          );
        }
      }
    }
    this.bossState.attackUntil = this.time + warning;
    this.bossState.stillUntil = this.time + warning;
  }

  private castDungeonAttack(
    e: Enemy,
    phase: number,
    alternate: number,
    point: Vec,
    aim: number,
  ) {
    const warning = alternate ? 1.65 : 1.35;
    const bounds = this.movementBounds;
    const line = (angle: number, offset = 0, radius = 28) => {
      const x = e.x + Math.cos(angle + Math.PI / 2) * offset;
      const y = e.y + Math.sin(angle + Math.PI / 2) * offset;
      this.warn({
        x,
        y,
        shape: "line",
        end: {
          x: clamp(x + Math.cos(angle) * 600, -bounds.x, bounds.x),
          y: clamp(y + Math.sin(angle) * 600, -bounds.y, bounds.y),
        },
        radius,
        warning,
        damage: e.damage * 1.5,
      });
    };
    if (this.dungeonStageIndex === 0) {
      if (!alternate) {
        this.bossState.attackName = "Saw sweep · Sidestep the lanes";
        line(aim, 0, 38);
        if (phase === 2) {
          line(aim, -125, 25);
          line(aim, 125, 25);
        }
      } else {
        this.bossState.attackName = "Furnace blast · Leave the hot circles";
        this.warn({
          ...point,
          radius: phase === 2 ? 125 : 95,
          warning,
          damage: e.damage * 1.7,
        });
        if (phase === 2)
          for (const side of [-1, 1])
            this.warn({
              x: clamp(point.x + side * 175, -bounds.x, bounds.x),
              y: point.y,
              radius: 75,
              warning,
              damage: e.damage * 1.3,
            });
      }
    } else if (this.dungeonStageIndex === 1) {
      if (!alternate) {
        this.bossState.attackName = "Hammerfall · Leave the hammer circles";
        this.warn({
          ...point,
          radius: phase === 2 ? 135 : 100,
          warning,
          damage: e.damage * 1.8,
        });
        if (phase === 2)
          this.warn({
            x: e.x,
            y: e.y,
            radius: 150,
            warning,
            damage: e.damage * 1.5,
          });
      } else {
        this.bossState.attackName =
          "War stomp · Safe inside or beyond the ring";
        this.warn({
          x: e.x,
          y: e.y,
          shape: "ring",
          radius: phase === 2 ? 310 : 260,
          innerRadius: phase === 2 ? 80 : 105,
          warning,
          damage: e.damage * 1.7,
        });
      }
    } else {
      if (!alternate) {
        this.bossState.attackName = "Crossing blades · Move between the lanes";
        for (const side of [-1, 1]) {
          line(aim + side * 0.28, 0, 22);
          if (phase === 2) line(aim + side * 0.65, 0, 18);
        }
      } else {
        this.bossState.attackName =
          "Blackguard ambush · Escape the marked ground";
        this.warn({
          ...point,
          radius: phase === 2 ? 130 : 100,
          warning,
          damage: e.damage * 1.7,
        });
        for (let i = 0; i < (phase === 2 ? 3 : 2); i++)
          this.spawnEnemy(260, false, undefined, false, "blackguard");
      }
    }
    this.bossState.attackUntil = this.time + warning;
    this.bossState.stillUntil = this.time + warning;
  }

  get completedEncounters(): number {
    return this.landmarks.filter((l) => l.state === "complete").length;
  }
  get nearbyLandmark(): Landmark | null {
    if (this.boss || this.ended) return null;
    const active = this.landmarks.some((l) => l.state === "active");
    return (
      this.landmarks.find(
        (l) =>
          l.state === "ready" &&
          (!active || l.kind === "shrine") &&
          distanceSq(l, this.player) <= 85 ** 2,
      ) || null
    );
  }
  get compassLandmark(): Landmark | null {
    const available = this.landmarks.filter((l) => l.state !== "complete");
    return (
      available.find((l) => l.state === "active") ||
      available.sort(
        (a, b) => distanceSq(a, this.player) - distanceSq(b, this.player),
      )[0] ||
      null
    );
  }
  interact(): boolean {
    if (
      this.paused ||
      this.choosing ||
      this.shrineChoice ||
      this.checkpoint ||
      this.ended
    )
      return false;
    const l = this.nearbyLandmark;
    if (!l) return false;
    l.discovered = true;
    if (l.kind === "shrine") {
      this.stopTravel();
      this.shrineChoice = l;
      this.emit({ type: "shrine" });
      return true;
    }
    if (l.kind === "cache") {
      // Reserve all guards before changing state, so capped scenes cannot award free caches.
      if (this.enemies.length > 397) {
        this.emit({
          type: "encounter",
          message: "Clear a few enemies before opening this cache.",
        });
        return false;
      }
      for (let i = 0; i < 3; i++) {
        const guardType =
          this.zone.id === "elwynn"
            ? "gnoll"
            : this.zone.id === "westfall"
              ? "defias"
              : this.zone.id === "duskwood"
                ? "dusk_rotted"
                : "ghoul";
        const guard = this.spawnEnemy(
          120,
          false,
          (i * Math.PI * 2) / 3,
          false,
          guardType,
        )!;
        guard.guard = true;
        guard.hp *= 2;
        guard.maxHp = guard.hp;
        guard.damage *= 1.15;
        l.guardIds.push(guard.id);
      }
    }
    l.state = "active";
    this.stopTravel();
    l.spawnTimer = 3;
    this.emit({
      type: "encounter",
      message:
        l.name +
        " · " +
        (l.kind === "cache"
          ? "Defeat the three marked guards."
          : "Stay inside the circle for 20 seconds."),
    });
    return true;
  }
  chooseBlessing(id: string): boolean {
    const l = this.shrineChoice,
      blessing = BLESSINGS.find((b) => b.id === id);
    if (!l || !blessing || this.ended || this.paused || this.choosing)
      return false;
    for (const [stat, value] of Object.entries(blessing.stats))
      this.stats[stat as Stat] += value!;
    this.blessings.push(id);
    l.state = "complete";
    this.shrineChoice = null;
    this.emit({
      type: "encounter",
      message: blessing.name + " acquired for this expedition.",
    });
    return true;
  }
  leaveShrine(): boolean {
    if (!this.shrineChoice || this.ended) return false;
    this.shrineChoice = null;
    return true;
  }
  private updateEncounters(dt: number) {
    for (const l of this.landmarks) {
      if (!l.discovered && distanceSq(l, this.player) <= 500 ** 2) {
        l.discovered = true;
        this.emit({
          type: "discovery",
          message:
            "Discovered " + l.name + " · " + ENCOUNTER_RULES[l.kind].label,
        });
      }
      if (l.state !== "active" || this.ended) continue;
      if (l.kind === "cache") {
        const alive = l.guardIds.filter((id) =>
          this.enemies.some((e) => e.id === id && !e.dead),
        ).length;
        l.progress = (3 - alive) / 3;
        if (!alive) this.rewardEncounter(l);
      } else if (l.kind === "ritual") {
        if (
          (this.player.hp > 0 && distanceSq(l, this.player) <= 175 ** 2) ||
          (this.partner &&
            this.partner.player.hp > 0 &&
            distanceSq(l, this.partner.player) <= 175 ** 2)
        ) {
          l.progress = Math.min(20, l.progress + dt);
          l.spawnTimer -= dt;
          if (l.spawnTimer <= 0) {
            l.spawnTimer += 5;
            for (let i = 0; i < 3; i++) this.spawnEnemy(280);
          }
        } else l.progress = Math.max(0, l.progress - dt * 0.5);
        if (l.progress >= 20) this.rewardEncounter(l);
      }
    }
  }
  private rewardEncounter(l: Landmark) {
    if (l.state !== "active") return;
    l.state = "complete";
    const isCache = l.kind === "cache";
    this.gold += isCache ? 30 : 40;
    this.xp += isCache ? 16 : 24;
    const material = this.rng.pick(
      ZONE_MATERIALS[this.zone.id] || ZONE_MATERIALS.elwynn,
    );
    this.gather(
      materialFor(RESOURCE_MAP[material].family, this.lootResourceTier),
      isCache ? 3 : 5,
    );
    let reward = isCache
      ? "30 gold, 16 run XP, 3 materials"
      : "40 gold, 24 run XP, 5 materials, 25 health";
    if (isCache) {
      const armorRank = ["cloth", "leather", "mail", "plate"];
      const pool = GEAR.filter((g) => {
        const source =
          WARDROBE_SOURCES[g.id] ||
          ACCESSORY_SOURCES[g.id] ||
          NECKLACE_SOURCES[g.id] ||
          OFFHAND_SOURCES[g.id] ||
          DUAL_WIELD_SOURCES[g.id] ||
          RANGED_SOURCES[g.id] ||
          TRAINED_WEAPON_SOURCES[g.id];
        const local = ["duskwood", "plaguelands"].includes(this.zone.id)
          ? g.dropZones?.includes(this.zone.id)
          : source
            ? source.type === "world" && g.dropZones?.includes(this.zone.id)
            : g.rarity === "uncommon";
        return (
          local &&
          !g.id.startsWith("starter_") &&
          (!g.classes || g.classes.includes(this.classDef.id)) &&
          (!g.armor ||
            armorRank.indexOf(g.armor) <=
              armorRank.indexOf(this.classDef.armor)) &&
          (g.level || 1) <= (this.config.characterLevel || 1)
        );
      });
      if (pool.length) {
        const item = this.rng.pick(pool);
        this.loot.push(item.id);
        reward += ", " + item.name;
      }
    } else {
      const recipient = this.player.hp > 0 ? this.player : this.partner?.player;
      if (recipient && recipient.hp > 0)
        recipient.hp = Math.min(recipient.maxHp, recipient.hp + 25);
    }
    this.emit({ type: "encounter", message: l.name + " complete · " + reward });
  }
  private nearest(
    pos: Vec,
    radius: number,
    exclude: Set<number> = new Set(),
    accepts: (enemy: Enemy) => boolean = () => true,
  ): Enemy | null {
    let nearest: Enemy | null = null,
      best = radius ** 2;
    for (const e of this.grid.near(pos, radius))
      if (!e.dead && !exclude.has(e.id) && accepts(e)) {
        const d = distanceSq(pos, e);
        if (d < best) {
          best = d;
          nearest = e;
        }
      }
    return nearest;
  }
  private spellDamage(def: SpellDef, rank: number) {
    return (
      def.damage *
      (1 + this.stats.power / 100) *
      (1 + (this.config.spellBonuses?.[def.id]?.power || 0) / 100) *
      (1 + (rank - 1) * 0.3) *
      (rank === 5 ? 1.45 : 1)
    );
  }
  private castSpell(def: SpellDef, rank: number): boolean {
    if (
      this.classCombat &&
      this.classDef.id === "druid" &&
      this.player.kit.form !== "moonkin" &&
      def.id !== this.classDef.spells[0] &&
      ["projectile", "ground", "dot", "chain", "heal"].includes(def.kind)
    )
      return false;
    if (
      this.config.classCombat &&
      this.classDef.id === "druid" &&
      def.id === this.classDef.spells[0] &&
      this.player.kit.form !== "moonkin"
    ) {
      const bear = this.player.kit.form === "bear",
        range = bear ? 150 : 110,
        target = this.nearest(this.player, range + 30);
      if (!target || (!bear && this.player.resource < 15)) return false;
      const empowered = bear && this.player.resource >= 20;
      this.player.resource -= bear ? (empowered ? 20 : 0) : 15;
      for (const e of this.enemies)
        if (
          !e.dead &&
          distanceSq(e, this.player) < (range + e.radius) ** 2 &&
          (bear || e === target)
        ) {
          this.damageEnemy(
            e,
            this.spellDamage(def, rank) *
              (bear ? (empowered ? 1.2 : 0.85) : 1.5),
            def.id,
          );
          if (bear) {
            e.slow = 0.55;
            e.slowUntil = this.time + 1.2;
          }
        }
      this.action(this.player, target, { ...def, kind: "melee" });
      this.emit({ type: "cast" });
      return true;
    }
    const bonus = this.config.spellBonuses?.[def.id] || {},
      area = 1 + (bonus.area || 0) / 100;
    const cost =
      (def.cost || 0) * (1 - clamp(bonus.costReduction || 0, 0, 85) / 100);
    if (this.player.resource < cost) return false;
    const damage = this.spellDamage(def, rank);
    if (def.kind === "buff" && def.buff) {
      if (this.timedBuffs[def.id] || !this.nearest(this.player, 500))
        return false;
      this.player.resource -= cost;
      const stats = Object.fromEntries(
        Object.entries(def.buff.stats || {}).map(([key, value]) => [
          key,
          value! * (1 + (rank - 1) * 0.15),
        ]),
      ) as Partial<Stats>;
      for (const [key, value] of Object.entries(stats))
        this.stats[key as Stat] += value!;
      this.timedBuffs[def.id] = { until: this.time + def.buff.duration, stats };
      if (def.buff.shield) {
        this.player.shield = Math.max(
          this.player.shield,
          def.buff.shield * (1 + (rank - 1) * 0.2),
        );
        this.player.shieldTimer = Math.max(
          this.player.shieldTimer,
          def.buff.duration,
        );
      }
      this.player.resource = Math.min(
        100,
        this.player.resource + (def.buff.resource || 0),
      );
      this.addEffect({
        kind: "ring",
        x: this.player.x,
        y: this.player.y,
        radius: 55,
        color: def.color,
        life: 0.4,
      });
      this.action(this.player, undefined, def);
      this.emit({ type: "cast" });
      return true;
    }
    if (def.kind === "heal") {
      if (this.player.hp >= this.player.maxHp || this.healingEffects[def.id])
        return false;
      this.player.resource -= cost;
      if (def.periodic)
        this.healingEffects[def.id] = this.periodicEffect(def, damage);
      else {
        const critical =
          this.rng.next() <
          Math.min(0.8, (this.stats.crit + (bonus.crit || 0)) / 100);
        this.healPlayer(damage * (critical ? 1.5 : 1), def.id, critical);
      }
      this.addEffect({
        kind: "ring",
        x: this.player.x,
        y: this.player.y,
        radius: 45,
        color: def.color,
        life: 0.38,
      });
      this.action(this.player, undefined, def);
      this.emit({ type: "cast" });
      return true;
    }
    const targetRange =
      def.kind === "dot" || def.executeBelow || def.singleTarget
        ? def.range
        : def.kind === "melee" || def.kind === "nova"
          ? def.range * (1 + (rank - 1) * 0.1) * area + 30
          : 800;
    const marked =
      this.classCombat &&
      ["rogue", "hunter"].includes(this.classDef.id) &&
      def.id === this.classDef.spells[0]
        ? this.enemies.find(
            (e) =>
              !e.dead &&
              e.id === this.player.kit.target &&
              distanceSq(e, this.player) <= targetRange ** 2,
          )
        : undefined;
    const target =
      marked ||
      this.nearest(
        this.player,
        def.kind === "dot" || def.executeBelow || def.singleTarget
          ? def.range
          : def.kind === "melee" || def.kind === "nova"
            ? def.range * (1 + (rank - 1) * 0.1) * area + 30
            : 800,
        new Set(),
        (e) =>
          def.kind === "dot"
            ? !e.dots?.[def.id]
            : !def.executeBelow || e.hp <= e.maxHp * def.executeBelow,
      );
    if (!target) return false;
    this.player.resource -= cost;
    if (def.id === this.classDef.spells[0]) this.trialCasts++;
    if (def.kind === "dot") {
      if (def.impact) this.damageEnemy(target, damage * def.impact, def.id);
      if (!target.dead)
        (target.dots ||= {})[def.id] = this.periodicEffect(def, damage);
      this.addEffect({
        kind: "ring",
        x: target.x,
        y: target.y,
        radius: target.radius + 10,
        color: def.color,
        life: 0.38,
      });
    } else if (
      def.singleTarget ||
      (this.classCombat &&
        this.classDef.id === "rogue" &&
        def.id === this.classDef.spells[0])
    ) {
      this.damageEnemy(target, damage, def.id);
      this.addEffect({
        kind: "line",
        x: this.player.x,
        y: this.player.y,
        end: { x: target.x, y: target.y },
        radius: 0,
        color: def.color,
        life: 0.24,
      });
    } else if (def.kind === "projectile") {
      const count =
        def.count +
        (rank >= 3 ? 1 : 0) +
        (rank === 5 ? 1 : 0) +
        (bonus.projectiles || 0);
      for (let i = 0; i < count; i++)
        this.shoot(
          this.player,
          target!,
          def,
          rank,
          (i - (count - 1) / 2) * 0.12,
        );
    } else if (def.kind === "nova" || def.kind === "melee") {
      const radius = def.range * (1 + (rank - 1) * 0.1) * area;
      for (const e of this.grid.near(this.player, radius + 35))
        if (distanceSq(e, this.player) < (radius + e.radius) ** 2) {
          this.damageEnemy(e, damage, def.id);
          if (def.slow) {
            e.slow = def.slow;
            e.slowUntil = this.time + 2;
          }
          if (def.freeze && !e.boss) e.frozenUntil = this.time + def.freeze;
        }
      this.addEffect({
        kind: "ring",
        x: this.player.x,
        y: this.player.y,
        radius,
        color: def.color,
        life: 0.38,
      });
      if (def.id === "holynova")
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 3 + rank);
    } else if (def.kind === "ground") {
      const pos = def.id === "consecration" ? this.player : target!;
      const life = 2.5 + rank * 0.3;
      if (this.areas.length < 30)
        this.areas.push({
          x: pos.x,
          y: pos.y,
          spellId: def.id,
          radius: def.range * (1 + (rank - 1) * 0.12) * area,
          damage: damage * 0.45,
          color: def.color,
          life,
          maxLife: life,
          timer: 0,
          slow: def.slow || 1,
        });
      if (def.impact) {
        const radius = def.range * (1 + (rank - 1) * 0.12) * area;
        for (const e of this.grid.near(pos, radius + 35))
          if (distanceSq(e, pos) < (radius + e.radius) ** 2)
            this.damageEnemy(e, damage * def.impact, def.id);
      }
    } else if (def.kind === "chain") {
      let previous: Vec = this.player,
        next: Enemy | null = target;
      const hit = new Set<number>();
      for (
        let i = 0;
        next && i < def.count + rank - 1 + (bonus.projectiles || 0);
        i++
      ) {
        this.damageEnemy(next, damage, def.id);
        hit.add(next.id);
        this.addEffect({
          kind: "line",
          x: previous.x,
          y: previous.y,
          end: { x: next.x, y: next.y },
          radius: 0,
          color: def.color,
          life: 0.24,
        });
        previous = next;
        next = this.nearest(previous, 240, hit);
      }
    }
    this.action(this.player, target, def);
    this.emit({ type: "cast" });
    return true;
  }
  private periodicEffect(def: SpellDef, damage: number): PeriodicEffect {
    const periodic = def.periodic!;
    return {
      damage,
      interval: periodic.interval,
      timer: periodic.interval,
      ticksLeft: periodic.ticks,
      totalTicks: periodic.ticks,
      ramp: periodic.ramp,
    };
  }
  private healPlayer(amount: number, source: string, critical = false) {
    if (this.player.hp <= 0) return;
    const healed = Math.min(amount, this.player.maxHp - this.player.hp);
    if (healed <= 0) return;
    this.player.hp += healed;
    this.totalHealing += healed;
    this.healingBySpell[source] = (this.healingBySpell[source] || 0) + healed;
    if (this.texts.length < 90)
      this.texts.push({
        x: this.player.x,
        y: this.player.y - 25,
        value: `+${Math.round(healed)}${critical ? "!" : ""}`,
        color: "#acdbaa",
        life: 0.6,
      });
  }
  private updatePeriodicEffects(dt: number) {
    for (const [id, effect] of Object.entries(
      this.player.hp > 0 ? this.healingEffects : {},
    )) {
      effect.timer -= dt;
      while (effect.timer <= 0 && effect.ticksLeft > 0) {
        this.healPlayer(effect.damage, id);
        effect.ticksLeft--;
        effect.timer += effect.interval;
      }
      if (!effect.ticksLeft) delete this.healingEffects[id];
    }
    for (const e of this.enemies) {
      if (e.dead || !e.dots) continue;
      for (const [id, effect] of Object.entries(e.dots)) {
        effect.timer -= dt;
        while (effect.timer <= 0 && effect.ticksLeft > 0 && !e.dead) {
          const multiplier = effect.ramp
            ? 1 +
              ((effect.totalTicks - effect.ticksLeft) /
                Math.max(1, effect.totalTicks - 1)) *
                0.5
            : 1;
          this.damageEnemy(e, effect.damage * multiplier, id, false);
          effect.ticksLeft--;
          effect.timer += effect.interval;
          if (this.ended || this.checkpoint) return;
        }
        if (e.dots && (!effect.ticksLeft || e.dead)) delete e.dots[id];
      }
    }
  }
  private shoot(
    from: Vec,
    target: Vec,
    def: SpellDef,
    rank: number,
    offset: number,
  ) {
    if (this.projectiles.length >= 500) return;
    const angle = Math.atan2(target.y - from.y, target.x - from.x) + offset;
    this.projectiles.push({
      spellId: def.id,
      ...(this.config.classCombat ? { classId: this.classDef.id } : {}),
      x: from.x,
      y: from.y,
      vx: Math.cos(angle) * 420,
      vy: Math.sin(angle) * 420,
      damage: this.spellDamage(def, rank),
      radius: rank === 5 ? 9 : 5,
      color: def.color,
      life: def.range / 420 + 0.4,
      pierce:
        (rank >= 3 ? 2 : 0) + (this.config.spellBonuses?.[def.id]?.pierce || 0),
      slow: def.slow || 1,
      hit: new Set(),
    });
  }
  orbitPositions(
    state: SpellState,
    actor = this.player,
    bonuses = this.config.spellBonuses,
  ): Vec[] {
    const def = SPELLS[state.id],
      count = def.count + Math.floor(state.rank / 2),
      radius =
        (def.range + state.rank * 7) *
        (1 + (bonuses?.[def.id]?.area || 0) / 100);
    return Array.from({ length: count }, (_, i) => {
      const a = this.time * 2.8 + (i * Math.PI * 2) / count;
      return {
        x: actor.x + Math.cos(a) * radius,
        y: actor.y + Math.sin(a) * radius,
      };
    });
  }
  private damageEnemy(
    e: Enemy,
    amount: number,
    source: string,
    canCrit = true,
  ) {
    if (!this.partnerActing && this.partner?.prepared.includes(source)) {
      this.withPartner(() => this.damageEnemy(e, amount, source, canCrit));
      return;
    }
    if (e.dead || this.ended || this.checkpoint) return;
    const weapon =
      source === "equipment-strike"
        ? this.equipment.primary
        : source === "equipment-shot"
          ? this.shootingWeapon
          : ["shot", "multishot", "aimedshot"].includes(source)
            ? this.shootingWeapon
            : canCrit &&
                (SPELLS[source]?.kind === "melee" ||
                  ["flurry", "whirlwind"].includes(source))
              ? this.equipment.primary
              : undefined;
    if (weapon) {
      const accuracy = weaponAccuracy(
        weapon,
        this.weaponHits[weapon.type] || 0,
      );
      if (accuracy < 1 && this.rng.next() >= accuracy) {
        if (this.texts.length < 90)
          this.texts.push({
            x: e.x,
            y: e.y - e.radius,
            value: "Miss",
            color: "#b5b1a4",
            life: 0.6,
          });
        return;
      }
    }
    const bonus = this.config.spellBonuses?.[source] || {};
    const critical =
        canCrit &&
        this.rng.next() <
          Math.min(0.8, (this.stats.crit + (bonus.crit || 0)) / 100),
      rawDamage = amount * (critical ? 1.8 : 1);
    let damage =
      rawDamage *
      (1 +
        (this.config.adventure && source !== "keystone_storm"
          ? Math.min(3, Math.floor(this.streak / 10)) * 0.05
          : 0));
    if (
      source !== "keystone_storm" &&
      this.keystones.includes("executioner") &&
      e.hp / e.maxHp < 0.3
    )
      damage *= 1.35;
    if (e.boss && this.zone.id === "scarlet" && this.dungeonStageIndex === 3) {
      if (!this.commanderRevived && e.hp - damage <= e.maxHp / 2) {
        this.commanderRevived = true;
        this.revivedCommander = this.spawnEnemy(200, true, 0, false, "defias");
        if (this.revivedCommander) {
          this.revivedCommander.hp = this.revivedCommander.maxHp =
            e.maxHp * 0.3;
          this.revivedCommander.guard = true;
        }
        this.bossState.attackName =
          "Arise, my champion · Defeat the resurrected commander";
        damage = Math.max(0, Math.min(damage, e.hp - e.maxHp / 2));
      } else if (this.revivedCommander && !this.revivedCommander.dead)
        damage = Math.min(damage, Math.max(0, e.hp - 1));
    }
    if (this.config.classCombat)
      damage *= classDamage(this.classWorld(), e, source);
    const dealt = Math.min(e.hp, damage);
    if (weapon && dealt > 0) {
      this.weaponHits[weapon.type] = (this.weaponHits[weapon.type] || 0) + 1;
      if (
        weapon === this.equipment.primary &&
        this.equipment.secondary &&
        this.equipment.secondary.type !== weapon.type
      )
        this.weaponHits[this.equipment.secondary.type] =
          (this.weaponHits[this.equipment.secondary.type] || 0) + 1;
    }
    this.totalDamage += dealt;
    this.damageBySpell[source] = (this.damageBySpell[source] || 0) + dealt;
    if (bonus.leech && this.player.hp > 0)
      this.player.hp = Math.min(
        this.player.maxHp,
        this.player.hp + (dealt * bonus.leech) / 100,
      );
    if (this.config.classCombat && dealt > 0)
      recordClassHit(this.classWorld(), e, source, this.classDef.spells[0]);
    e.hp -= damage;
    e.flash = 0.12;
    if (
      critical &&
      this.keystones.includes("storm") &&
      this.time >= this.stormReadyAt
    ) {
      this.stormReadyAt = this.time + 0.4;
      const targets = this.enemies
        .filter(
          (target) =>
            target !== e && !target.dead && distanceSq(target, e) < 180 ** 2,
        )
        .sort((a, b) => distanceSq(a, e) - distanceSq(b, e))
        .slice(0, 2);
      for (const target of targets) {
        this.addEffect({
          kind: "line",
          x: e.x,
          y: e.y,
          end: { x: target.x, y: target.y },
          radius: 3,
          color: "#8dcfff",
          life: 0.22,
        });
        this.damageEnemy(target, dealt * 0.45, "keystone_storm", false);
      }
    }
    if (this.resourceKind === "Rage")
      this.player.resource = Math.min(100, this.player.resource + 2);
    if (this.texts.length < 90)
      this.texts.push({
        x: e.x + this.rng.between(-8, 8),
        y: e.y - e.radius,
        value: `${Math.round(damage)}${critical ? "!" : ""}`,
        color: critical ? "#ffe2a0" : "#e5e4d7",
        life: 0.6,
      });
    if (e.hp <= 0) {
      e.dead = true;
      if (this.config.classCombat) {
        const world = this.classWorld();
        recordClassKill(world, e);
        const other = this.partnerActing
            ? this.primaryActor
            : this.partner?.player,
          otherId = this.partnerActing
            ? this.primaryClassId
            : this.partner?.classDef.id;
        if (other && otherId)
          recordClassKill({ ...world, id: otherId, actor: other }, e);
      }
      delete e.dots;
      this.config.onDeath?.({ kind: "enemy", actor: e, time: this.time });
      this.kills++;
      if (this.config.adventure) {
        this.streak++;
        this.streakTimer = 5;
        this.peakStreak = Math.max(this.peakStreak, this.streak);
        if (
          this.keystones.includes("blood") &&
          this.kills % 5 === 0 &&
          this.player.hp > 0
        )
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 4);
        if (this.keystones.includes("gravity") && this.streak % 10 === 0)
          for (const gem of this.pickups)
            if (gem.kind === "xp") {
              gem.x = this.player.x + this.rng.between(-25, 25);
              gem.y = this.player.y + this.rng.between(-25, 25);
            }
      }
      if (e.elite && !e.boss) this.trialElites++;
      if (e.boss) this.trialBosses++;
      this.dropPickup({
        x: e.x,
        y: e.y,
        kind: "xp",
        value: e.boss ? 35 : e.elite ? 20 : 2,
      });
      if (this.rng.next() < 0.24 || e.elite)
        this.dropPickup({
          x: e.x + 12,
          y: e.y + 8,
          kind: "gold",
          value: e.elite ? 20 : 1,
        });
      if (this.rng.next() < 0.035)
        this.dropPickup({ x: e.x - 10, y: e.y, kind: "heal", value: 18 });
      if (
        this.config.professions.skinning &&
        isSkinnable(e.type) &&
        this.rng.next() < 0.45
      )
        this.gather(
          materialFor(
            "leather",
            Math.min(
              tierForLevel(this.config.characterLevel || 1),
              tierForSkill(this.gatheringSkill("skinning")),
              1 + Math.floor(this.time / 90),
            ),
          ),
          1,
          "skinning",
        );
      if (!isSkinnable(e.type) && this.rng.next() < 0.12)
        this.gather(materialFor("cloth", this.lootResourceTier), 1);
      if (
        e.elite &&
        (this.zone.id !== "duskwood" || (this.config.characterLevel || 1) >= 20)
      ) {
        const pool = [
          ...(["duskwood", "plaguelands"].includes(this.zone.id)
            ? []
            : [
                "forest_boots",
                "gnoll_claw",
                "ember_staff",
                "defias_blade",
                "longbow",
                "warden_plate",
                "shadow_boots",
                "mooncloth",
              ]),
          ...GEAR.filter((g) => g.dropZones?.includes(this.zone.id)).map(
            (g) => g.id,
          ),
        ];
        this.dropPickup({
          x: e.x,
          y: e.y,
          kind: "chest",
          value: 0,
          loot: this.rng.pick(
            pool.filter(
              (id) =>
                (!GEAR_MAP[id].classes ||
                  GEAR_MAP[id].classes!.includes(this.classDef.id)) &&
                (!["duskwood", "plaguelands"].includes(this.zone.id) ||
                  (GEAR_MAP[id].level || 1) <=
                    (this.config.characterLevel || 1)) &&
                (!GEAR_MAP[id].armor ||
                  ["cloth", "leather", "mail", "plate"].indexOf(
                    GEAR_MAP[id].armor!,
                  ) <=
                    ["cloth", "leather", "mail", "plate"].indexOf(
                      this.classDef.armor,
                    )),
            ),
          ),
        });
      }
      this.addEffect({
        kind: "burst",
        x: e.x,
        y: e.y,
        radius: e.radius + 8,
        color: "#b9c89a",
        life: 0.25,
      });
      if (e.boss) {
        if (this.dungeonStage) {
          const stage = this.dungeonStage;
          const armorTypes = ["cloth", "leather", "mail", "plate"];
          const pool = stage.loot.filter((id) => {
            const item = GEAR_MAP[id];
            return (
              (!item.classes || item.classes.includes(this.classDef.id)) &&
              (!item.armor ||
                armorTypes.indexOf(item.armor) <=
                  armorTypes.indexOf(this.classDef.armor))
            );
          });
          const reward = this.rng.pick(pool);
          this.loot.push(reward);
          this.lastDungeonReward = reward;
          this.gold += stage.gold;
          for (const [id, amount] of Object.entries(stage.materials))
            this.gather(
              materialFor(
                RESOURCE_MAP[id as Material].family,
                Math.min(
                  tierForLevel(this.config.characterLevel || 1),
                  this.zone.id === "scarlet"
                    ? 4
                    : this.zone.id === "shadowfang"
                      ? 3
                      : this.dungeonStageIndex + 1,
                  this.zone.id === "scarlet" ? 4 : 3,
                ),
              ),
              amount!,
            );
          this.dungeonBosses++;
          this.boss = null;
          this.hazards = [];
          this.projectiles = [];
          this.enemies = [];
          this.areas = [];
          if (this.dungeonStageIndex === this.dungeonRoute!.stages.length - 1)
            this.finish(true);
          else {
            this.checkpoint = true;
            this.emit({ type: "checkpoint" });
          }
          return;
        }
        this.loot.push(
          this.zone.id === "plaguelands"
            ? `dawnward_${this.classDef.armor}_head`
            : this.zone.id === "duskwood"
              ? "watchkeeper_oath"
              : this.zone.id === "elwynn"
                ? "lionheart"
                : this.zone.id === "westfall"
                  ? this.classDef.id === "hunter"
                    ? "longbow"
                    : ["mage", "priest", "warlock", "shaman", "druid"].includes(
                          this.classDef.id,
                        )
                      ? "ember_staff"
                      : "defias_blade"
                  : "mooncloth",
        );
        this.gold += 100;
        if (this.zone.id === "duskwood") this.hazards = [];
        this.finish(true);
      }
    }
  }
  private hurtPlayer(damage: number, school: DamageSchool = "physical") {
    const p = this.player;
    if (p.hp <= 0 || p.invulnerable || this.ended || this.checkpoint)
      return false;
    this.stopTravel();
    this.travel.lock = TRAVEL_RULES.damageLock;
    const armor =
      this.stats.armor +
      (p.activeBuff > 0 && this.classDef.id === "druid" ? 45 : 0) +
      (this.config.classCombat &&
      this.classDef.id === "druid" &&
      p.kit.form === "bear"
        ? 35
        : 0) +
      (this.config.classCombat &&
      p.kit.anchors.some(
        (a) => a.kind === "earth" && distanceSq(a, p) < 165 ** 2,
      )
        ? 18
        : 0) +
      (this.config.classCombat &&
      this.classDef.id === "warrior" &&
      !(this.partnerActing
        ? this.partner!.input.x || this.partner!.input.y
        : this.input.x || this.input.y)
        ? 12
        : 0);
    let taken = Math.max(1, damage * (100 / (100 + armor * 3)));
    if (school !== "physical")
      taken *= resistanceMultiplier(this.config.resistances?.[school] || 0);
    if (this.config.adventure)
      taken *= DIFFICULTIES[this.config.adventure.difficulty].damage;
    if (p.shield > 0) {
      const absorb = Math.min(p.shield, taken);
      p.shield -= absorb;
      if (
        this.config.classCombat &&
        this.classDef.id === "priest" &&
        absorb > 0
      )
        p.kit.points = Math.min(5, p.kit.points + 1);
      taken -= absorb;
    }
    p.hp -= taken;
    if (this.config.adventure && taken > 0) {
      this.damageTaken += taken;
      this.streak = 0;
      this.streakTimer = 0;
    }
    p.invulnerable = 0.65;
    if (
      p.hp <= 0 &&
      this.keystones.includes("reserve") &&
      !this.secondWindActors.has(p)
    ) {
      this.secondWindActors.add(p);
      p.hp = p.maxHp * 0.35;
      p.invulnerable = 2;
      this.addEffect({
        kind: "ring",
        x: p.x,
        y: p.y,
        radius: 100,
        color: "#b4df91",
        life: 0.7,
      });
      this.emit({ type: "active", message: "Second Wind · a new chance" });
    }
    p.hurt = 0.25;
    if (this.resourceKind === "Rage")
      p.resource = Math.min(100, p.resource + 15);
    this.emit({ type: "hit", amount: taken });
    return true;
  }
  private addEffect(effect: Omit<Effect, "maxLife">) {
    if (this.effects.length < 100)
      this.effects.push({ ...effect, maxLife: effect.life });
  }
  private dropPickup(pickup: Pickup) {
    if (this.pickups.length < 650 || pickup.kind === "chest")
      this.pickups.push(pickup);
    else if (pickup.kind === "xp" || pickup.kind === "gold") {
      const existing = this.pickups.find((p) => p.kind === pickup.kind);
      if (existing) existing.value += pickup.value;
    }
  }
  private collectPickups(dt: number) {
    const actors = [
      { player: this.player, stats: this.stats, classId: this.classDef.id },
      ...(this.partner
        ? [
            {
              player: this.partner.player,
              stats: this.partner.stats,
              classId: this.partner.classDef.id,
            },
          ]
        : []),
    ].filter((a) => a.player.hp > 0);
    if (!actors.length) return;
    this.pickups = this.pickups.filter((item) => {
      const actor = actors.reduce((closest, next) =>
          distanceSq(item, next.player) < distanceSq(item, closest.player)
            ? next
            : closest,
        ),
        p = actor.player;
      const radius = 90 * (1 + actor.stats.magnet / 100),
        dist = Math.sqrt(distanceSq(item, p));
      if (dist < radius && item.kind !== "chest") {
        const move = Math.min(dist, 360 * dt);
        item.x += ((p.x - item.x) / (dist || 1)) * move;
        item.y += ((p.y - item.y) / (dist || 1)) * move;
      }
      if (dist > (item.kind === "chest" ? 35 : 20)) return true;
      if (item.kind === "xp")
        this.xp += item.value * (actor.classId === "mage" ? 1.15 : 1);
      if (item.kind === "gold") this.gold += item.value;
      if (item.kind === "heal") p.hp = Math.min(p.maxHp, p.hp + item.value);
      if (item.kind === "chest" && item.loot) {
        this.loot.push(item.loot);
        this.emit({
          type: "pickup",
          message: `Looted ${GEAR_MAP[item.loot].name}`,
        });
      }
      return false;
    });
  }
  private gatherNodes() {
    if (this.travelling || this.player.hp <= 0) return;
    for (const n of this.nodes) {
      if (n.depleted || distanceSq(n, this.player) > 38 ** 2) continue;
      if (this.nodeRestriction(n)) continue;
      const prof = FAMILY_INFO[RESOURCE_MAP[n.kind].family]
        .trade as GatheringTrade;
      n.depleted = true;
      this.gather(n.kind, 2, prof);
      this.emit({
        type: "pickup",
        message: `Gathered 2 ${MATERIALS[n.kind].name}`,
      });
    }
  }
  gatheringFocus: "eligible" | NodeFamily = "eligible";
  gatheringLocked = false;
  gatheringOpen = false;
  gatheringCap(trade: GatheringTrade): number {
    const skill =
      trade === "fishing"
        ? this.config.fishingSkill || 1
        : this.config.professions[trade] || 0;
    return (
      this.config.gatheringCaps?.[trade] ||
      TRAINING_RANKS[rankForSkill(skill) - 1].cap
    );
  }
  gatheringSkill(trade: GatheringTrade): number {
    const start =
      trade === "fishing"
        ? this.config.fishingSkill || 1
        : this.config.professions[trade] || 0;
    return start
      ? Math.min(
          this.gatheringCap(trade),
          start + (this.professionGains[trade] || 0),
        )
      : 0;
  }
  nodeRestriction(node: Node): string | null {
    const trade = FAMILY_INFO[RESOURCE_MAP[node.kind].family].trade;
    return gatheringRestriction(
      node.kind,
      trade ? this.gatheringSkill(trade) : 0,
      this.config.characterLevel || 1,
    );
  }
  nodePractice(node: Node): number {
    const trade = FAMILY_INFO[RESOURCE_MAP[node.kind].family].trade;
    return !trade || this.nodeRestriction(node)
      ? 0
      : gatheringPractice(
          node.kind,
          this.gatheringSkill(trade),
          this.gatheringCap(trade),
        );
  }
  get gatheringTarget(): Node | null {
    return (
      this.nodes
        .filter(
          (n) =>
            !n.depleted &&
            (this.gatheringFocus === "eligible" ||
              RESOURCE_MAP[n.kind].family === this.gatheringFocus) &&
            (this.gatheringLocked || !this.nodeRestriction(n)),
        )
        .sort(
          (a, b) => distanceSq(a, this.player) - distanceSq(b, this.player),
        )[0] || null
    );
  }
  get lootResourceTier(): number {
    const stage = this.dungeonStage
      ? this.zone.id === "scarlet"
        ? 4
        : this.zone.id === "shadowfang"
          ? 3
          : this.dungeonStageIndex + 1
      : 1 + Math.floor(this.time / 90);
    return Math.min(
      tierForLevel(this.config.characterLevel || 1),
      zoneResourceTier(this.zone.id),
      stage,
    );
  }
  private gather(
    material: Material,
    amount: number,
    profession?: ProfessionId | "fishing",
  ) {
    this.materials[material] = (this.materials[material] || 0) + amount;
    if (profession)
      for (const proof of this.professionProof) {
        const def = PROFESSION_QUESTS[proof.trade];
        if (
          proof.trade === profession &&
          material === professionDelivery(proof.trade, proof.chapter) &&
          def.destinations?.[proof.chapter].includes(this.zone.id)
        )
          proof.gathered = Math.min(
            professionGoals(proof.trade, proof.chapter).gathered,
            proof.gathered + amount,
          );
      }
    if (
      profession &&
      gatheringPractice(
        material,
        this.gatheringSkill(profession as GatheringTrade),
        this.gatheringCap(profession as GatheringTrade),
      )
    )
      this.professionGains[profession] =
        (this.professionGains[profession] || 0) + 1;
  }
  activate(): boolean {
    if (this.player.hp <= 0) return false;
    if (this.config.classCombat) {
      if (
        this.paused ||
        this.choosing ||
        this.shrineChoice ||
        this.checkpoint ||
        this.ended ||
        this.player.activeCooldown > 0
      )
        return false;
      if (!classSignature(this.classWorld())) return false;
      this.stopTravel();
      this.trialActives++;
      if (this.config.adventure) this.adventureActives++;
      this.action(this.player, undefined, undefined, this.classDef.id);
      this.emit({
        type: "active",
        message: CLASS_KITS[this.classDef.id].action,
      });
      return true;
    }
    const p = this.player,
      cost = this.resourceKind === "Rage" ? 25 : 20;
    if (
      this.paused ||
      this.choosing ||
      this.shrineChoice ||
      this.checkpoint ||
      this.ended ||
      p.activeCooldown > 0 ||
      p.resource < cost
    )
      return false;
    p.resource -= cost;
    this.stopTravel();
    this.trialActives++;
    if (this.config.adventure) this.adventureActives++;
    p.activeCooldown = this.classDef.activeCooldown;
    const id = this.classDef.id;
    if (id === "rogue") {
      p.invulnerable = 4;
      p.activeBuff = 4;
    }
    if (id === "paladin") p.invulnerable = 5;
    if (id === "priest") {
      p.shield = 45;
      p.shieldTimer = 8;
    }
    if (id === "druid") p.activeBuff = 6;
    if (id === "warrior" || id === "hunter") {
      const sign = id === "hunter" ? -1 : 1;
      p.x = clamp(
        p.x + Math.cos(p.facing) * 170 * sign,
        -this.movementBounds.x,
        this.movementBounds.x,
      );
      p.y = clamp(
        p.y + Math.sin(p.facing) * 170 * sign,
        -this.movementBounds.y,
        this.movementBounds.y,
      );
      p.invulnerable = 1;
    }
    if (
      id === "warlock" &&
      this.enemies.some((e) => !e.dead && distanceSq(e, p) < 190 ** 2)
    )
      p.hp = Math.min(p.maxHp, p.hp + 30);
    const radius = ["mage", "shaman"].includes(id) ? 260 : 190;
    for (const e of this.enemies)
      if (!e.dead && distanceSq(e, p) < radius ** 2) {
        this.damageEnemy(
          e,
          id === "paladin" || id === "rogue"
            ? 15
            : 65 * (1 + this.stats.power / 100),
          "active",
        );
        if (["mage", "shaman", "hunter"].includes(id))
          e.frozenUntil = this.time + (id === "shaman" ? 4 : 3);
        if (id === "priest") {
          const a = Math.atan2(e.y - p.y, e.x - p.x);
          e.x += Math.cos(a) * 80;
          e.y += Math.sin(a) * 80;
        }
      }
    this.addEffect({
      kind: "ring",
      x: p.x,
      y: p.y,
      radius,
      color: this.classDef.color,
      life: 0.7,
    });
    this.action(p, undefined, undefined, id);
    this.emit({ type: "active", message: this.classDef.active });
    return true;
  }
  dash(): boolean {
    if (this.player.hp <= 0) return false;
    if (
      this.paused ||
      this.choosing ||
      this.shrineChoice ||
      this.checkpoint ||
      this.ended ||
      this.player.dashCooldown > 0
    )
      return false;
    this.player.dashCooldown = Math.max(
      2,
      4 -
        Number(this.config.adventure?.relic === "wind") -
        Number(this.keystones.includes("windstep")),
    );
    this.stopTravel();
    const p = this.player,
      k = p.kit,
      input = this.partnerActing ? this.partner!.input : this.input,
      length = Math.hypot(input.x, input.y);
    k.dashX = length ? input.x / length : Math.cos(p.facing);
    k.dashY = length ? input.y / length : Math.sin(p.facing);
    p.facing = Math.atan2(k.dashY, k.dashX);
    k.dashHits.clear();
    p.dashTimer = 0.22;
    p.invulnerable = Math.max(p.invulnerable, 0.3);
    if (this.config.classCombat) {
      this.classWorld().visual(p, 90, "dash", p.facing);
      if (this.classDef.id === "mage") {
        p.x = clamp(
          p.x + k.dashX * 190,
          -this.movementBounds.x,
          this.movementBounds.x,
        );
        p.y = clamp(
          p.y + k.dashY * 190,
          -this.movementBounds.y,
          this.movementBounds.y,
        );
        p.dashTimer = 0;
        this.classWorld().visual(p, 70, "dash", p.facing);
      }
      if (this.classDef.id === "rogue") {
        k.decoy = { x: p.x, y: p.y };
        k.concealedUntil = this.time + 2;
        p.invulnerable = Math.max(p.invulnerable, 0.6);
      }
      if (this.classDef.id === "priest")
        k.anchors.push({
          kind: "prayer",
          x: p.x,
          y: p.y,
          until: this.time + 3,
          pulse: this.time,
          strength: 0,
        });
      this.emit({ type: "active", message: CLASS_KITS[this.classDef.id].dash });
    }
    if (this.config.adventure) this.dashCount++;
    if (this.keystones.includes("windstep")) {
      this.addEffect({
        kind: "ring",
        x: this.player.x,
        y: this.player.y,
        radius: 140,
        color: "#9fdfca",
        life: 0.4,
      });
      for (const e of this.enemies)
        if (!e.dead && distanceSq(e, this.player) <= (140 + e.radius) ** 2)
          this.damageEnemy(
            e,
            35 * (1 + this.stats.power / 100),
            "keystone_windstep",
            false,
          );
    }
    return true;
  }
  get shootingWeapon(): WeaponPractice | undefined {
    const weapon = this.equipment.ranged || this.equipment.primary;
    return weapon && GEAR_MAP[weapon.item]?.rangedType ? weapon : undefined;
  }
  shootEquipment(): boolean {
    const weapon = this.shootingWeapon;
    if (
      !weapon ||
      this.paused ||
      this.choosing ||
      this.shrineChoice ||
      this.checkpoint ||
      this.ended ||
      this.time < this.shotReadyAt
    )
      return false;
    const target = this.nearest(this.player, 650);
    if (!target) return false;
    if (
      ["bow", "gun", "crossbow"].includes(
        GEAR_MAP[weapon.item].rangedType || "",
      ) &&
      !this.config.onAmmunition?.()
    )
      return false;
    this.shotReadyAt = this.time + 2.5;
    this.stopTravel();
    this.damageEnemy(
      target,
      20 * (1 + this.stats.power / 100),
      "equipment-shot",
    );
    this.addEffect({
      kind: "line",
      x: this.player.x,
      y: this.player.y,
      end: { x: target.x, y: target.y },
      color: "#d9d2ae",
      radius: 3,
      life: 0.18,
    });
    this.config.onAction?.({
      actor: this.player,
      time: this.time,
      facing: Math.atan2(target.y - this.player.y, target.x - this.player.x),
      spellKind: "projectile",
    });
    this.emit({ type: "cast", message: "Equipment shot" });
    return true;
  }
  attackEquipment(): boolean {
    if (this.player.hp <= 0) return false;
    if (this.shootingWeapon) return this.shootEquipment();
    const weapon = this.equipment.primary;
    if (
      !weapon ||
      this.paused ||
      this.choosing ||
      this.shrineChoice ||
      this.checkpoint ||
      this.ended ||
      this.time < this.shotReadyAt
    )
      return false;
    const target = this.nearest(this.player, 150);
    if (!target) return false;
    this.shotReadyAt = this.time + 2.5;
    this.stopTravel();
    this.damageEnemy(
      target,
      20 * (1 + this.stats.power / 100),
      "equipment-strike",
    );
    this.addEffect({
      kind: "line",
      x: this.player.x,
      y: this.player.y,
      end: { x: target.x, y: target.y },
      color: "#e0c9a0",
      radius: 12,
      life: 0.18,
    });
    this.config.onAction?.({
      actor: this.player,
      time: this.time,
      facing: Math.atan2(target.y - this.player.y, target.x - this.player.x),
      spellKind: "melee",
    });
    this.emit({ type: "cast", message: "Equipment strike" });
    return true;
  }
  private recordProfessionUse(field: "healing" | "bombs" | "meals") {
    for (const proof of this.professionProof)
      if (PROFESSION_QUESTS[proof.trade].field === field)
        proof.uses = Math.min(
          professionGoals(proof.trade, proof.chapter).uses,
          proof.uses + 1,
        );
  }
  usePotion(): boolean {
    if (this.player.hp <= 0) return false;
    if (
      this.paused ||
      this.choosing ||
      this.shrineChoice ||
      this.checkpoint ||
      this.ended ||
      this.player.hp >= this.player.maxHp ||
      !this.config.onConsume?.("potions")
    )
      return false;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 45);
    this.recordProfessionUse("healing");
    this.stopTravel();
    this.addEffect({
      kind: "ring",
      x: this.player.x,
      y: this.player.y,
      radius: 60,
      color: "#a6d29d",
      life: 0.5,
    });
    this.emit({ type: "pickup", message: "Restored 45 health" });
    return true;
  }
  useBomb(): boolean {
    if (this.player.hp <= 0) return false;
    if (
      this.paused ||
      this.choosing ||
      this.shrineChoice ||
      this.checkpoint ||
      this.ended ||
      !this.config.onConsume?.("bombs")
    )
      return false;
    this.stopTravel();
    const beforeDamage = this.totalDamage;
    for (const e of this.enemies)
      if (distanceSq(e, this.player) < 280 ** 2)
        this.damageEnemy(e, 120, "bomb");
    if (this.totalDamage > beforeDamage) this.recordProfessionUse("bombs");
    this.addEffect({
      kind: "ring",
      x: this.player.x,
      y: this.player.y,
      radius: 280,
      color: "#e9b37b",
      life: 0.7,
    });
    this.emit({ type: "active", message: "Copper Bomb" });
    return true;
  }
  private openUpgrade() {
    this.choosing = true;
    this.upgrades = this.generateUpgrades();
    this.emit({ type: "levelup" });
  }
  generateUpgrades(): Upgrade[] {
    if (this.config.adventure && [3, 7, 11].includes(this.level)) {
      const pool = KEYSTONES.filter((k) => !this.keystones.includes(k.id));
      const choices: Upgrade[] = [];
      while (choices.length < 3 && pool.length) {
        const index = Math.floor(this.rng.next() * pool.length);
        const k = pool.splice(index, 1)[0];
        choices.push({ ...k, type: "keystone" });
      }
      return choices;
    }
    const choices: Upgrade[] = [];
    for (const id of this.preparedSpells) {
      const current = this.spells.find((s) => s.id === id),
        def = SPELLS[id];
      if (
        (current && current.rank >= 5) ||
        (!current && this.spells.length >= 4)
      )
        continue;
      const rank = (current?.rank || 0) + 1;
      choices.push({
        id,
        type: "spell",
        name: rank === 5 ? def.evolution : def.name,
        icon: def.icon,
        color: def.color,
        rank,
        evolution: rank === 5,
        description: current
          ? rank === 5
            ? `Evolve ${def.name}. Greatly increased ${def.kind === "buff" ? "support bonuses" : def.kind === "heal" ? "healing" : "damage"} and faster casts.`
            : `Increase ${def.kind === "buff" ? "support bonuses" : def.kind === "heal" ? "healing" : "damage"} by 30% and reduce cooldown.`
          : def.description,
      });
    }
    const stats: [Stat, string, string, number, string][] = [
      [
        "power",
        "Battle Training",
        "sword",
        12,
        "Deal 12% more damage and healing with every ability.",
      ],
      [
        "health",
        "Endurance",
        "heart",
        25,
        "Gain 25 maximum health and recover 25 health.",
      ],
      ["haste", "Quickening", "whirl", 10, "Cast and attack 10% faster."],
      ["speed", "Fleet of Foot", "boot", 8, "Move 8% faster."],
      [
        "armor",
        "Iron Resolve",
        "shield",
        5,
        "Gain 5 armor to reduce incoming damage.",
      ],
      [
        "magnet",
        "Gathering Instinct",
        "spark",
        25,
        "Increase experience pickup radius by 25%.",
      ],
      ["regen", "Renewal", "leaf", 0.6, "Regenerate 0.6 health every second."],
      ["crit", "Precision", "target", 7, "Gain 7% critical strike chance."],
    ];
    for (const [stat, name, icon, value, description] of stats)
      choices.push({
        id: `stat_${stat}`,
        type: "stat",
        name,
        icon,
        value,
        stat,
        description:
          stat === "regen" && this.classDef.resource === "Mana"
            ? `${description} Also regenerate 1.2 extra mana per second.`
            : description,
        color: "#d0b782",
      });
    // Guarantee a spell choice while there is one to learn or rank up.
    const spellChoices = choices.filter((c) => c.type === "spell"),
      rest = choices.filter((c) => c.type === "stat");
    const output: Upgrade[] = [];
    if (spellChoices.length) {
      const first = this.rng.pick(spellChoices);
      output.push(first);
      choices.splice(choices.indexOf(first), 1);
    }
    while (output.length < 3) {
      const selected = this.rng.pick(choices.length ? choices : rest);
      output.push(selected);
      choices.splice(choices.indexOf(selected), 1);
    }
    return output;
  }
  rerollUpgrades(): boolean {
    if (
      !this.config.adventure ||
      !this.choosing ||
      this.ended ||
      this.rerolls <= 0
    )
      return false;
    const previous = this.upgrades
      .map((u) => u.id)
      .sort()
      .join();
    for (let i = 0; i < 8; i++) {
      this.upgrades = this.generateUpgrades();
      if (
        this.upgrades
          .map((u) => u.id)
          .sort()
          .join() !== previous
      )
        break;
    }
    this.rerolls--;
    return true;
  }
  chooseUpgrade(id: string): boolean {
    const choice = this.upgrades.find((c) => c.id === id);
    if (!this.choosing || !choice) return false;
    if (choice.type === "keystone") {
      const k = KEYSTONES.find((k) => k.id === id);
      if (!k || this.keystones.includes(k.id) || this.keystones.length >= 3)
        return false;
      this.keystones.push(k.id);
      if (k.id === "gravity") this.stats.magnet += 35;
    } else if (choice.type === "spell") {
      const s = this.spells.find((s) => s.id === id);
      if (
        !this.preparedSpells.includes(id) ||
        (s && s.rank >= 5) ||
        (!s && this.spells.length >= 4)
      )
        return false;
      if (s) s.rank = Math.min(5, s.rank + 1);
      else if (this.spells.length < 4) this.addSpell(id);
    } else if (choice.stat && choice.value) {
      this.stats[choice.stat] += choice.value;
      if (choice.stat === "health") {
        this.player.maxHp += choice.value;
        if (this.player.hp > 0)
          this.player.hp = Math.min(
            this.player.maxHp,
            this.player.hp + choice.value,
          );
      }
    }
    this.xp -= this.xpNeeded;
    this.level++;
    this.xpNeeded = 8 + this.level * 6;
    this.choosing = false;
    this.upgrades = [];
    return true;
  }
  finish(victory: boolean) {
    if (this.ended) return;
    if (
      victory &&
      ["duskwood", "plaguelands"].includes(this.zone.id) &&
      this.trialBosses < 1
    )
      return;
    if (
      victory &&
      this.zone.dungeon &&
      this.dungeonBosses < this.dungeonRoute!.stages.length
    )
      return;
    this.ended = true;
    if (!victory && this.player.hp <= 0)
      this.config.onDeath?.({
        kind: "player",
        actor: this.player,
        time: this.time,
        bear:
          this.classDef.id === "druid" &&
          (this.player.activeBuff > 0 ||
            (this.classCombat && this.player.kit.form === "bear")),
      });
    this.healingEffects = {};
    for (const e of this.enemies) delete e.dots;
    this.shrineChoice = null;
    this.victory = victory;
    this.emit({ type: "end", victory });
  }
  result(): RunRecord {
    const contracts = this.config.adventure
      ? CONTRACTS.filter(
          (c) =>
            contractProgress(
              c.id,
              this.kills,
              this.completedEncounters + this.dungeonBosses,
              this.adventureActives,
            ) >= c.goal,
        )
      : [];
    const multiplier = this.config.adventure
      ? DIFFICULTIES[this.config.adventure.difficulty].reward
      : 1;
    return {
      ...(this.config.adventure
        ? {
            adventure: {
              ...this.config.adventure,
              keystones: [...this.keystones],
              peakStreak: this.peakStreak,
              damageTaken: Math.floor(this.damageTaken),
              dashes: this.dashCount,
              actives: this.adventureActives,
              contracts: contracts.map((c) => c.id),
            },
          }
        : {}),
      id: this.runId,
      classId: this.classDef.id,
      zoneId: this.zone.id,
      victory: this.victory,
      time: this.time,
      kills: this.kills,
      level: this.level,
      gold:
        Math.floor(
          (this.gold + Math.floor(this.time / 8) + (this.victory ? 75 : 0)) *
            multiplier,
        ) + contracts.reduce((n, c) => n + c.gold, 0),
      xp:
        Math.floor(
          (this.kills * 1.5 + this.time * 0.4 + (this.victory ? 180 : 0)) *
            multiplier,
        ) + contracts.reduce((n, c) => n + c.xp, 0),
      materials: { ...this.materials },
      loot: [...this.loot],
      ...(this.partner
        ? {
            party: {
              classId: this.partner.classDef.id,
              equipmentProof: {
                items: [...this.partner.equipment.items],
                weaponHits: { ...this.partner.weaponHits },
                defeated: this.ended && this.partner.player.hp <= 0,
              },
            },
          }
        : {}),
      ...(this.victory
        ? {
            journeyProof: (this.config.journey || [])
              .filter(
                (q) =>
                  validJourneySnapshot(q) &&
                  EPILOGUE_MAP[q.id].zone === this.zone.id,
              )
              .slice(0, 15)
              .map((q) => ({ ...q })),
          }
        : {}),
      ...(this.config.equipment
        ? {
            equipmentProof: {
              items: [...this.equipment.items],
              weaponHits: { ...this.weaponHits },
              defeated: this.ended && this.player.hp <= 0,
            },
          }
        : {}),
      encounters: this.completedEncounters,
      ...(this.campaignSnapshots.length
        ? {
            campaignProof: this.campaignSnapshots.map((snapshot) => ({
              ...snapshot,
              progress: campaignRunCounts(snapshot, {
                zoneId: this.zone.id,
                kills: this.kills,
                encounters: this.completedEncounters,
                dungeonBosses: this.dungeonBosses,
                victory: this.victory,
              }),
            })),
          }
        : {}),
      ...(this.professionProof.length
        ? { professionProof: this.professionProof.map((p) => ({ ...p })) }
        : {}),
      ...(this.config.trialChapter === undefined
        ? {}
        : {
            classProof: {
              chapter: this.config.trialChapter,
              casts: this.trialCasts,
              actives: this.trialActives,
              mastery: this.spells.some(
                (s) => s.id === this.classDef.spells[1] && s.rank >= 3,
              )
                ? 1
                : 0,
              elites: this.trialElites,
              evolutions: this.spells.some((s) => s.rank === 5) ? 1 : 0,
              bosses: this.trialBosses,
            },
          }),
      ...(this.zone.dungeon ? { dungeonBosses: this.dungeonBosses } : {}),
      date: new Date().toISOString(),
    };
  }
}
