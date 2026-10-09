import { renderEndgameGuide } from "./endgame-ui";
import { renderFinalJourney, renderEpilogueReview } from "./final-journey-ui";
import { journeySnapshots } from "./final-journey";
import { acceptEpilogue, claimEpilogue, epilogueReady } from "./progression";
import {
  renderItemState,
  renderEquipmentWorkshop,
  renderRepairReview,
  renderAttunementReview,
  renderEquipmentResult,
} from "./item-progression-ui";
import {
  equipmentSnapshot,
  repairItems,
  repairQuote,
  buyAmmunition,
  protectedItem,
} from "./item-progression";
import {
  renderWeaponTraining,
  renderWeaponTrainingReview,
} from "./weapon-training-ui";
import {
  advancedWeaponType,
  WEAPON_TRAINING,
  WEAPON_TYPE_LABELS,
} from "./weapon-training";
import { attuneEquipment, trainWeaponType } from "./progression";
import "./resources.css";
import "./profession-quests.css";
import {
  renderProfessionGuild,
  renderGuildClaimReview,
  renderProfessionQuestCamp,
  renderProfessionQuestStatus,
} from "./profession-quest-ui";
import type { GuildFilter } from "./profession-quest-ui";
import {
  PROFESSION_QUESTS,
  PROFESSION_TRADES,
  isMasteryGear,
} from "./profession-quests";
import {
  renderResources,
  renderFieldwork,
  updateFieldwork,
  disenchantText,
} from "./resource-ui";
import "./style.css";
import "./progression.css";
import "./expedition.css";
import "./factions.css";
import "./campaigns.css";
import { renderCampaignStatus, renderCampaignReview } from "./campaign-ui";
import { CAMPAIGN_FACTIONS } from "./campaigns";
import {
  acceptCampaign,
  abandonCampaign,
  claimCampaign,
  campaignReady,
  campaignSnapshots,
} from "./progression";
import "./training.css";
import "./dungeon.css";
import "./character.css";
import "./stable.css";
import "./spellbook.css";
import "./wardrobe.css";
import "./duskwood.css";
import "./controller.css";
import "./music.css";
import { musicScene } from "./music";
import { MusicPlayer } from "./music-player";
import { ControllerInput, CONTROLLER_BINDINGS } from "./controller";
import {
  captureControllerFocus,
  confirmControllerFocus,
  cycleControllerFocus,
  ensureControllerFocus,
  moveControllerFocus,
  renderControllerHelp,
  scrollControllerMenu,
  updateControllerHints,
} from "./controller-ui";
import { duskwoodOptionText, renderDuskwoodPreview } from "./duskwood-ui";
import { renderWardrobe, WARDROBE_CATALOG_SOURCES } from "./wardrobe-ui";
import type { WardrobeFilters } from "./wardrobe-ui";
import { isWardrobeSlot } from "./wardrobe";
import {
  gearFitsSlot,
  gearUseLabel,
  displacedOffhand,
  hasOneHandedWeapon,
  offhandMultiplier,
  isRingSlot,
  RING_SLOTS,
} from "./equipment";
import {
  renderRingReview,
  renderWeaponReview,
  renderDualWieldPanel,
  renderDualWieldTrainingReview,
  renderWeaponHandReview,
  renderHandSwapReview,
  renderRangedReview,
} from "./equipment-ui";
import {
  secondaryWeapon,
  dualWieldClass,
  DUAL_WIELD_RULES,
} from "./dual-wield";
import "./equipment.css";
import {
  renderSpellbook,
  renderSpellbookCamp,
  renderTechniqueReview,
  renderPreparationReview,
} from "./spellbook-ui";
import {
  renderStable,
  renderTravelReview,
  renderTravelCamp,
} from "./stable-ui";
import { TRAVEL_RULES } from "./travel";
import {
  renderClassTrial,
  renderTrialStatus,
  renderTrialCamp,
} from "./class-trial-ui";
import {
  renderEnchantingTable,
  renderItemEnchantment,
  renderEnchantmentReview,
} from "./enchanting-ui";
import { dungeonRoute, DUNGEON_BOONS } from "./dungeon";
import {
  renderDungeonPreview,
  dungeonOptionText,
  renderCheckpoint,
  renderDungeonResult,
  renderDungeonBoons,
} from "./dungeon-ui";
import { SPECIALIZATIONS, SPECIALIZATION_REQUIREMENTS } from "./training";
import type { TradeId } from "./training";
import {
  renderTraining,
  renderSecondaryTraining,
  renderSpecializations,
  renderRecipeTraining,
  renderSkillCaps,
  specializationRecipePreview,
} from "./training-ui";
import { COMMISSIONS, FACTIONS, reputationStanding } from "./factions";
import type { FactionId } from "./factions";
import {
  renderCommissionStatus,
  renderFactionCamp,
  renderFactionResult,
  renderOutposts,
} from "./faction-ui";
import { BLESSINGS, ENCOUNTER_RULES } from "./expedition";
import {
  CLASSES,
  CLASS_MAP,
  GEAR_MAP,
  GEAR_SETS,
  SLOTS,
  SLOT_ICONS,
  SLOT_LABELS,
  MATERIALS,
  PROFESSIONS,
  QUESTS,
  RARITY_COLORS,
  RECIPES,
  SPELLS,
  STAT_LABELS,
  ZONES,
} from "./content";
import type {
  ClassId,
  Material,
  ProfessionId,
  Slot,
  Stat,
  SpellBonus,
} from "./content";
import {
  availableTalents,
  talentTrees,
  talentRequirement,
  changeTalentMode,
  canCraft,
  canEquip,
  canLearnTalent,
  claimQuest,
  questProgress,
  craft,
  characterXpRequired,
  equip,
  unequip,
  trainDualWield,
  dualWieldRestriction,
  swapWeaponHands,
  forgetProfession,
  heroStats,
  heroAttributes,
  heroResistances,
  heroSpellBonuses,
  equipRestriction,
  equippedSets,
  gearComparison,
  equipmentTarget,
  recipeSkill,
  learnProfession,
  learnTalent,
  persist,
  readSave,
  respec,
  sellGear,
  settleRun,
  spentTalents,
  validateSave,
  zoneUnlocked,
  expeditionRestriction,
  acceptCommission,
  abandonCommission,
  claimCommission,
  buyOffer,
  actualCraftSkillGain,
  craftRestriction,
  trainingInfo,
  trainProfession,
  specializeProfession,
  specializationRestriction,
  acceptClassTrial,
  claimClassTrial,
  classTrialReady,
  applyEnchantment,
  enchantmentRestriction,
  selectedTravel,
  selectTravel,
  ridingRestriction,
  trainRiding,
  travelPurchaseRestriction,
  purchaseTravel,
  acceptProfessionQuest,
  abandonProfessionQuest,
  claimProfessionQuest,
  professionQuestReady,
  professionQuestSnapshots,
  classTechniqueRestriction,
  trainClassTechnique,
  prepareClassSpell,
  restoreClassSpells,
} from "./progression";
import type { RunRecord, SaveData } from "./progression";
import { GameEngine } from "./engine";
import type { GameEvent } from "./engine";
import { GameRenderer } from "./renderer";
import { icon, logo } from "./icons";
import { Sound } from "./audio";

type Page =
  | "camp"
  | "talents"
  | "spellbook"
  | "armory"
  | "professions"
  | "journal"
  | "outposts"
  | "stable";
const app = document.querySelector<HTMLDivElement>("#app")!;
const modalRoot = document.querySelector<HTMLDivElement>("#modal-root")!;
const toastRoot = document.querySelector<HTMLDivElement>("#toast-root")!;
const loaded = readSave();
let save = loaded.save;
const pageFromUrl = (): Page => {
  const candidate = location.hash.slice(1);
  return [
    "camp",
    "talents",
    "spellbook",
    "armory",
    "professions",
    "journal",
    "outposts",
    "stable",
  ].includes(candidate)
    ? (candidate as Page)
    : "camp";
};
let page: Page = pageFromUrl(),
  bagFilter = "usable",
  recipeFilter = "known",
  guildFilter: GuildFilter = "known",
  enchantTarget = "";
let outpostFaction: FactionId =
  FACTIONS.find((f) => f.zoneId === save.selectedZone)?.id || "timbermaw";
let bagSlot: Slot | "all" = "all";
let partnerClass: ClassId | "" = "";
function partyRestriction(zone: string) {
  return partnerClass && partnerClass !== save.selectedClass
    ? expeditionRestriction({ ...save, selectedClass: partnerClass }, zone)
    : null;
}
const wardrobeFilters: WardrobeFilters = {
  open: false,
  slot: "all",
  source: "all",
  usable: true,
};
let game: GameEngine | null = null,
  renderer: GameRenderer | null = null;
let pendingImport: SaveData | null = null;
let modalKind = "",
  lastFocus: HTMLElement | null = null;
const sound = new Sound();
sound.enabled = save.settings.sound;
const music = new MusicPlayer();
music.configure(save.settings.music, save.settings.musicVolume);
const keys = new Set<string>();
const controller = new ControllerInput();
let controllerMode = false;
let controllerMovement = { x: 0, y: 0 };
let touchMovement = { x: 0, y: 0 };
let controllerStatus = "Connect a controller and press a button to detect it.";
const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const time = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
const portrait = (index: number, css = "") =>
  `<div class="portrait ${css}" style="background-position:${(index % 3) * 50}% ${Math.floor(index / 3) * 50}%" role="img" aria-label="${CLASSES[index].race} ${CLASSES[index].name}"></div>`;
const button = (action: string, label: string, css = "button", extra = "") =>
  `<button class="${css}" data-action="${action}" ${extra}>${label}</button>`;
const heroSelect = () =>
  `<label class="hero-select">${icon(save.selectedClass, 18)}<span class="sr-only">Current hero</span><select id="hero-switch">${CLASSES.map((c) => `<option value="${c.id}" ${save.selectedClass === c.id ? "selected" : ""}>${c.name} · Level ${save.heroes[c.id].level}</option>`).join("")}</select></label>`;
const statValue = (stat: Stat, amount: number) =>
  `${Number(amount.toFixed(1))}${["power", "haste", "crit", "speed", "magnet"].includes(stat) ? "%" : ""}`;
function writeSave() {
  if (!persist(save))
    toast(
      "Your browser could not save progress. Export your save in Settings.",
      "info",
    );
}
function toast(message: string, type = "check") {
  toastRoot.replaceChildren();
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `${icon(type, 18)}<span>${escapeHtml(message)}</span>`;
  toastRoot.append(el);
  setTimeout(() => {
    el.classList.add("leaving");
    setTimeout(() => el.remove(), 250);
  }, 4200);
}
function header() {
  const guildReady = PROFESSION_TRADES.filter((t) =>
    professionQuestReady(save, t),
  ).length;
  const activeCommission = COMMISSIONS.find(
    (c) => c.id === save.commission?.id,
  );
  const outpostReady =
    CAMPAIGN_FACTIONS.filter((f) => campaignReady(save, f)).length +
    Number(
      !!save.commission &&
        save.commission.progress >= (activeCommission?.goal || Infinity),
    );
  const ready =
    QUESTS.filter(
      (q) =>
        !save.claimedQuests.includes(q.id) &&
        questProgress(save, q.id) >= q.goal,
    ).length + Number(classTrialReady(save));
  const nav: [Page, string, string][] = [
    ["camp", "camp", "Expedition"],
    ["talents", "spark", "Talents"],
    ["spellbook", "book", "Spellbook"],
    ["armory", "sword", "Armory"],
    ["professions", "anvil", "Professions"],
    ["outposts", "shield", "Outposts"],
    ["journal", "book", "Journal"],
    ["stable", "horse", "Stable"],
  ];
  return `<header class="site-header"><a class="brand" href="#" data-action="nav" data-id="camp" aria-label="Wow Survivors home">${logo}<div><span class="brand-top">WOW</span><span class="brand-bottom">SURVIVORS</span></div></a><nav aria-label="Main navigation">${nav.map(([id, i, label]) => `<button class="nav-link ${page === id ? "active" : ""}" data-action="nav" data-id="${id}">${icon(i, 17)}<span>${label}</span>${id === "professions" && guildReady ? `<b class="nav-count" aria-hidden="true">${guildReady}</b>` : id === "journal" && ready ? `<b class="nav-count" aria-hidden="true">${ready}</b>` : id === "outposts" && outpostReady ? `<b class="nav-count" aria-hidden="true">${outpostReady}</b>` : ""}</button>`).join("")}</nav><div class="header-tools"><div class="gold-balance" title="Gold">${icon("coin", 18)}<span>${save.gold.toLocaleString()}</span><small>G</small></div>${button("settings", icon("gear", 20), "icon-button", 'aria-label="Settings" title="Settings"')}</div></header>`;
}
function footer() {
  return `<footer class="site-footer"><span><i class="status-dot"></i> A world of adventure. Your journey.</span><span>WOW SURVIVORS <i>·</i> <span class="muted">RELEASE 1.0</span></span>${button("controls", `${icon("info", 14)} How to play`, "text-button")}</footer>`;
}
function render() {
  if (game) return;
  if (partnerClass === save.selectedClass) partnerClass = "";
  const restoreFocus = controllerMode ? captureControllerFocus(app) : null;
  document.body.classList.remove("in-game");
  app.innerHTML = `${header()}<main class="main-content">${{ camp: renderCamp, talents: renderTalents, armory: renderArmory, professions: renderProfessions, journal: renderJournal, outposts: renderOutpostsPage, stable: renderStablePage, spellbook: renderSpellbookPage }[page]()}</main>${footer()}`;
  restoreFocus?.();
  refreshControllerHints();
}
function renderCamp() {
  const c = CLASS_MAP[save.selectedClass],
    h = save.heroes[c.id],
    stats = heroStats(save),
    z = ZONES.find((z) => z.id === save.selectedZone)!;
  return `<section class="welcome-row"><div><div class="eyebrow"><span class="tiny-line"></span> YOUR NEXT CHAPTER</div><h1>Azeroth awaits<span class="gold-text">.</span></h1><p>Choose your path. Face the horde. Become a legend.</p></div><div class="camp-summary"><div>${icon("sword", 18)}<span><b>${save.totals.kills.toLocaleString()}</b> enemies defeated</span></div><div>${icon("crown", 18)}<span><b>${save.totals.wins}</b> expeditions completed</span></div></div></section>
  <div class="camp-layout"><div class="camp-main"><section class="world-card zone-${z.id}" aria-label="Selected expedition"><div class="world-image"></div><div class="world-overlay"></div><div class="world-top"><span class="world-label">${icon("map", 15)} ${z.id === "ragefire" ? "KALIMDOR" : "EASTERN KINGDOMS"}</span><span class="zone-badge"><i></i> ${z.dungeon ? "DUNGEON" : z.id === "elwynn" ? "RECOMMENDED" : z.id === "westfall" ? "CHALLENGING" : "DANGEROUS"}</span></div><div class="world-content"><div class="world-kicker">${z.subtitle}</div><h2>${z.name}</h2><p>${z.description}</p><div class="world-meta"><span>${icon("shield", 15)} ${z.difficulty === 1 ? "Normal" : z.difficulty < 1.5 ? "Veteran" : "Heroic"}</span><span>${icon("whirl", 15)} ${z.dungeon ? `${dungeonRoute(z.id)!.stages.length} stages · ${time(z.duration)} + boss fights` : `${Math.round(z.duration / 60)} minute expedition`}</span><span>${icon("target", 15)} ${partnerClass ? "Local co-op" : "Solo survival"}</span></div><label class="coop-selector">Journey mode<select id="coop-hero"><option value="">Solo expedition</option>${CLASSES.filter(
    (hero) => hero.id !== c.id,
  )
    .map(
      (hero) =>
        `<option value="${hero.id}" ${partnerClass === hero.id ? "selected" : ""}>Local co-op · ${hero.name} · Lv. ${save.heroes[hero.id].level}</option>`,
    )
    .join(
      "",
    )}</select></label>${partnerClass && partnerClass !== c.id ? `<p class="coop-intro">P1: WASD + Space. P2: arrows + Enter. Stand near a fallen ally for three seconds to revive them. Both heroes earn character XP; supplies and treasure are shared. ${partyRestriction(z.id) || ""}</p>` : ""}${button("begin", `Begin ${z.dungeon ? "Dungeon" : "Expedition"} ${icon("arrow", 19)}`, "button primary expedition-button", expeditionRestriction(save, z.id) || partyRestriction(z.id) ? `disabled title="${expeditionRestriction(save, z.id) || partyRestriction(z.id)}"` : "")}<small class="world-hint">${expeditionRestriction(save, z.id) || (z.dungeon ? "Rare boss loot. Recover between stages. One final victory." : "Your abilities attack automatically. You make the next move.")}</small></div><div class="world-coordinates"><span>ELWYNN & BEYOND</span><i>01 — ${String(ZONES.length).padStart(2, "0")}</i></div></section>
  <div class="zone-strip" aria-label="Choose expedition">${ZONES.map(
    (zone, i) => {
      const unlocked = zoneUnlocked(save, zone.id);
      return `<button class="zone-option ${zone.id === z.id ? "selected" : ""} ${!unlocked ? "locked" : ""}" data-action="zone" data-id="${zone.id}" aria-pressed="${zone.id === z.id}" title="${zone.unlockText}"><div class="zone-mini ${zone.id}">${icon(unlocked ? zone.icon : "lock", 23)}</div><span><b>${zone.name}</b><small>${zone.dungeon ? dungeonOptionText(save, zone.id) : zone.id === "duskwood" ? duskwoodOptionText(save) : unlocked ? `${Math.round(zone.duration / 60)} min · ${i === 0 ? "Normal" : i === 1 ? "Veteran" : "Heroic"}` : i === 1 ? `${save.totals.kills} / 120 defeated` : "Complete an expedition"}</small></span>${icon(zone.id === z.id ? "check" : unlocked ? "chevron" : "lock", 15)}</button>`;
    },
  ).join("")}</div>
  ${renderDungeonPreview(save)}${renderDuskwoodPreview(save)}${renderFactionCamp(save)}${renderCampaignStatus(save, undefined, save.selectedZone)}${renderTrialCamp(save)}${renderProfessionQuestCamp(save)}${renderTravelCamp(save)}${renderSpellbookCamp(save)}<section class="hero-roster"><div class="section-heading"><div><div class="eyebrow">NINE CLASSES. ENDLESS POSSIBILITIES.</div><h2>Choose your hero</h2></div><span class="subtle-label">CLASSIC ROSTER ${icon("spark", 15)}</span></div><div class="class-grid">${CLASSES.map((hero) => `<button class="class-card ${hero.id === c.id ? "selected" : ""}" style="--class-color:${hero.color}" data-action="hero" data-id="${hero.id}" aria-pressed="${hero.id === c.id}">${portrait(hero.portrait)}<span class="class-copy"><b>${hero.name}</b><small>${hero.subtitle}</small><span class="class-level">LV. ${save.heroes[hero.id].level}</span></span><span class="class-symbol">${icon(hero.id, 19)}</span>${hero.id === c.id ? '<i class="class-selected-dot"></i>' : ""}</button>`).join("")}</div></section>
  <div class="journey-tip">${icon("book", 24)}<div><b>Every expedition leaves a mark.</b><p>Bring home gold, equipment, and materials. Build your character for the adventure ahead.</p></div>${button("nav", `View journal ${icon("arrow", 16)}`, "text-button", 'data-id="journal"')}</div></div>
  <aside class="hero-sheet" style="--class-color:${c.color}"><div class="sheet-label"><span>YOUR ADVENTURER</span><span>${icon("spark", 14)} LV. ${h.level}</span></div><div class="hero-art">${portrait(c.portrait)}<div class="hero-art-gradient"></div><div class="hero-art-name"><span>${c.race} · ${c.faction}</span><h2>${c.name}</h2><p>${c.subtitle}</p></div><div class="hero-art-emblem">${icon(c.id, 24)}</div></div><div class="sheet-body"><p class="hero-description">${c.description}</p><div class="hero-stats"><div>${icon("heart", 17)}<b>${Math.round(stats.health)}</b><span>Health</span></div><div>${icon("sword", 17)}<b>+${Math.round(stats.power)}%</b><span>Damage</span></div><div>${icon("target", 17)}<b>${Math.round(stats.crit)}%</b><span>Critical</span></div></div><div class="sheet-divider"></div><div class="sheet-section-label">STARTING ABILITIES</div><div class="starting-ability"><span class="ability-icon">${icon(SPELLS[c.spells[0]].icon, 23)}</span><div><b>${SPELLS[c.spells[0]].name}</b><small>Automatic attack</small></div><span class="micro-tag">RANK 1</span></div><div class="starting-ability"><span class="ability-icon active-skill">${icon(c.id, 22)}</span><div><b>${c.active}</b><small>${c.activeCooldown}s cooldown</small></div><kbd>SPACE</kbd></div><div class="passive-note">${icon("spark", 15)}<div><b>${c.passive}</b><p>${c.passiveDescription}</p></div></div><div class="sheet-divider"></div><div class="equipment-heading"><span class="sheet-section-label">EQUIPMENT</span>${button("nav", "Manage", "text-button", 'data-id="armory"')}</div><div class="equipment-row">${SLOTS.map(
    (slot) => {
      const gear = GEAR_MAP[h.equipment[slot] || ""];
      return `<button class="equipment-socket ${gear ? "filled" : ""}" data-action="browse-slot" data-id="${slot}" title="${gear ? `${gear.name} · ${gearUseLabel(gear, slot)}` : slot === "offhand" && !hasOneHandedWeapon(h.equipment) ? "Off-hand requires a one-handed weapon" : `Empty ${SLOT_LABELS[slot].toLowerCase()} slot`}" aria-label="${gear ? gear.name : `Empty ${SLOT_LABELS[slot].toLowerCase()} slot`}">${icon(gear?.icon || SLOT_ICONS[slot], 24)}<small>${SLOT_LABELS[slot]}</small></button>`;
    },
  ).join(
    "",
  )}</div><div class="talent-callout"><span>${icon("spark", 16)} <b>${availableTalents(h)}</b> talent ${availableTalents(h) === 1 ? "point" : "points"} available</span>${button("nav", icon("arrow", 17), "icon-button", 'data-id="talents" aria-label="Spend talent points"')}</div><div class="hero-xp"><div><span>CHARACTER LEVEL ${h.level}</span><span>${h.xp} / ${characterXpRequired(h.level)} XP</span></div><div class="progress-track"><i style="width:${(h.xp / characterXpRequired(h.level)) * 100}%"></i></div></div></div></aside></div>
  <section class="controls-strip"><span class="controls-title">THE ART OF SURVIVAL</span><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</span><span><kbd>SPACE</kbd> Class ability</span><span><kbd>SHIFT</kbd> Dash</span><span><kbd>Q</kbd> Heal</span><span><kbd>ESC</kbd> Pause</span></section>`;
}
function pageTitle(kicker: string, title: string, description: string) {
  return `<section class="page-title"><div><div class="eyebrow"><span class="tiny-line"></span>${kicker}</div><h1>${title}</h1><p>${description}</p></div>${heroSelect()}</section>`;
}
function renderStablePage() {
  return (
    pageTitle(
      "A COMPANION FOR THE ROAD",
      "The stable",
      "Train riding, choose a steed and explore the open world with a quicker step.",
    ) + renderStable(save)
  );
}
function renderSpellbookPage() {
  return (
    pageTitle(
      "LEARN. PREPARE. MASTER.",
      "The spellbook",
      "Visit your class trainer and prepare four abilities for your next expedition.",
    ) + renderSpellbook(save)
  );
}
function describeSpellBonus(b: SpellBonus): string {
  const labels: Record<keyof SpellBonus, string> = {
    power: "damage",
    haste: "attack speed",
    crit: "critical chance",
    area: "area / orbit radius",
    projectiles: "additional shots / chain targets",
    pierce: "additional pierce",
    leech: "life steal",
    costReduction: "resource cost reduction",
  };
  return Object.entries(b)
    .map(
      ([k, v]) =>
        `+${Number(v!.toFixed(1))}${["projectiles", "pierce"].includes(k) ? "" : "%"} ${labels[k as keyof SpellBonus]}`,
    )
    .join(" · ");
}
function renderSpellSpecialization(): string {
  const bonuses = heroSpellBonuses(save);
  return Object.keys(bonuses).length
    ? `<section class="specialization-summary"><div class="section-heading"><h2>Your specialized attacks</h2><span class="subtle-label">IN ADDITION TO GLOBAL STATS</span></div><div>${Object.entries(
        bonuses,
      )
        .map(
          ([id, b]) =>
            `<article><span class="ability-icon">${icon(SPELLS[id].icon, 23)}</span><div><b>${SPELLS[id].name}</b><p>${describeSpellBonus(b)}</p></div></article>`,
        )
        .join("")}</div></section>`
    : "";
}
function renderGearSet(id: string): string {
  const set = GEAR_SETS.find((s) => s.id === id)!;
  const pieces =
    equippedSets(save).find((s) => s.definition.id === id)?.pieces || 0;
  return `<div class="gear-set-preview"><b>${set.name} <small>${pieces} / 6 equipped</small></b>${set.bonuses
    .map(
      (b) =>
        `<span class="set-bonus ${pieces >= b.pieces ? "active" : ""}">${icon(pieces >= b.pieces ? "check" : "lock", 12)} (${b.pieces}) ${Object.entries(
          b.stats,
        )
          .map(
            ([stat, value]) =>
              `+${statValue(stat as Stat, value!)} ${STAT_LABELS[stat as Stat]}`,
          )
          .join(", ")}</span>`,
    )
    .join("")}</div>`;
}
function renderTalents() {
  const c = CLASS_MAP[save.selectedClass],
    h = save.heroes[c.id],
    stats = heroStats(save),
    classic = h.talentMode === "classic";
  return `${pageTitle("CHARACTER PROGRESSION", "Shape your legend.", "Three paths. Your build. Talent bonuses carry into every expedition.")}<div class="progression-banner">${portrait(c.portrait)}<div><b>${c.name} <span class="muted">· Level ${h.level}</span></b><span>${spentTalents(h)} points invested · ${classic ? "51 points available by level 60 · talents begin at level 10" : "21 points available by level 21 · 42 possible ranks"}.</span></div><span class="point-count">${icon("spark", 21)} ${availableTalents(h)} <small>available</small></span>${button("respec", "Reset talents", "button quiet", `${!spentTalents(h) ? "disabled" : ""}`)}</div><div class="save-actions"><button class="button quiet" data-action="review-talent-mode" data-id="${classic ? "survivor" : "classic"}" ${!classic && h.level < 10 ? "disabled" : ""}>${classic ? "Switch to Survivor talents" : "Switch to Classic talents · level 10"}</button><p class="page-note">${classic ? "Vanilla names, rank caps, rows and prerequisites. Effects are adapted for this survival game." : "A compact path with a point from level 1. The Classic path offers the complete tree structure."}</p></div><div class="talent-trees">${talentTrees(
    save,
  )
    .map((t) => {
      const spent = t.nodes.reduce((a, n) => a + (h.talents[n.id] || 0), 0);
      return `<section class="talent-tree" style="--tree-color:${t.color}"><div class="tree-header">${icon(c.id, 25)}<div><h2>${t.name}</h2><span>${spent} points invested</span></div></div><div class="tree-nodes">${t.nodes
        .map((n, i) => {
          const rank = h.talents[n.id] || 0,
            allowed = canLearnTalent(save, c.id, n.id),
            requirement = talentRequirement(save, c.id, n.id);
          return `<div class="talent-node ${rank ? "learned" : ""} ${requirement ? "gated" : ""}"><div class="talent-node-top"><span class="talent-icon">${icon(n.icon, 27)}</span><div><h3>${n.name}</h3><span>${rank} / ${n.max} ranks</span></div><div class="rank-pips">${Array.from({ length: n.max }, (_, j) => `<i class="${j < rank ? "filled" : ""}"></i>`).join("")}</div></div>${classic ? `<small class="muted">Tier ${(n as import("./classic-talents").ClassicTalent).row} · ${n.required} points in earlier rows</small>` : ""}<p>${n.description}</p>${button("talent", rank === n.max ? `${icon("check", 15)} Fully trained` : requirement ? `${icon("lock", 14)} ${requirement}` : availableTalents(h) <= 0 ? "Earn a talent point" : "+ Train talent", "button quiet", `data-id="${n.id}" ${!allowed ? "disabled" : ""}`)}</div>`;
        })
        .join("")}</div></section>`;
    })
    .join(
      "",
    )}</div><div class="stat-summary"><span>YOUR CURRENT BONUSES</span>${(["power", "haste", "crit", "armor", "regen"] as Stat[]).map((k) => `<div><small>${STAT_LABELS[k]}</small><b>${statValue(k, stats[k])}</b></div>`).join("")}</div>${renderSpellSpecialization()}<p class="page-note">${classic ? "One point per level from 10 to 60. The 51-point budget cannot fill all three trees." : "Choose a specialization: your 21-point budget cannot fill all three trees. One talent point is granted at level 1."} Character levels and talent choices persist between expeditions. You can reset talents for free to try another build.</p>`;
}
function renderArmory() {
  const c = CLASS_MAP[save.selectedClass],
    h = save.heroes[c.id],
    stats = heroStats(save);
  const activeSets = equippedSets(save);
  const items = save.inventory
    .filter((id) => bagFilter === "all" || canEquip(c.id, id))
    .filter((id) => bagSlot === "all" || gearFitsSlot(GEAR_MAP[id], bagSlot))
    .sort(
      (a, b) =>
        ["epic", "rare", "uncommon", "common"].indexOf(GEAR_MAP[a].rarity) -
        ["epic", "rare", "uncommon", "common"].indexOf(GEAR_MAP[b].rarity),
    );
  return `${pageTitle("EQUIPMENT & INVENTORY", "Ready for the road.", "Equip your discoveries. Every attribute matters when the horde arrives.")}${renderWeaponTraining(save)}${renderEquipmentWorkshop(save)}${renderDualWieldPanel(save)}<div class="armory-layout"><aside class="loadout-panel"><h2>Current loadout</h2><p class="muted">${c.name} · ${c.armor.charAt(0).toUpperCase() + c.armor.slice(1)} armor and lighter</p>${SLOTS.map(
    (slot) => {
      const g = GEAR_MAP[h.equipment[slot] || ""];
      return `<div class="loadout-slot"><span class="gear-icon" style="color:${g ? RARITY_COLORS[g.rarity] : "#716f60"}">${icon(g?.icon || SLOT_ICONS[slot], 26)}</span><div><small>${(g ? gearUseLabel(g, slot) : SLOT_LABELS[slot]).toUpperCase()}</small><b style="color:${g ? RARITY_COLORS[g.rarity] : "#918f82"}">${g?.name || "Empty slot"}</b>${g ? renderItemEnchantment(save, g.id) + renderItemState(save, g.id) : ""}</div>${g ? button("unequip", icon("close", 15), "icon-button", `data-id="${slot}" aria-label="Unequip ${g.name}"`) : button("browse-slot", "Browse", "button quiet browse-slot", `data-id="${slot}" aria-label="Browse ${SLOT_LABELS[slot].toLowerCase()}"`)}</div>`;
    },
  ).join(
    "",
  )}<div class="sheet-divider"></div><div class="loadout-stats">${Object.entries(
    stats,
  )
    .map(
      ([k, v]) =>
        `<div><span>${STAT_LABELS[k as Stat]}</span><b>${statValue(k as Stat, v)}</b></div>`,
    )
    .join(
      "",
    )}</div><div class="loadout-stats" aria-label="Attributes and resistances">${Object.entries(
    { ...heroAttributes(save), ...heroResistances(save) },
  )
    .map(
      ([key, value]) =>
        `<div><span>${key}${["fire", "frost", "nature", "shadow", "arcane"].includes(key) ? " resistance" : ""}</span><b>${Number(value.toFixed(1))}</b></div>`,
    )
    .join(
      "",
    )}</div><p class="page-note">Strength and intellect add damage; agility adds critical chance and speed; stamina adds health; spirit adds recovery. Magical resistance reduces its school by up to 60%.</p><div class="equipped-set-bonuses">${activeSets.map((s) => renderGearSet(s.definition.id)).join("")}</div><div class="passive-note">${icon("info", 17)}<p>Armor reduces incoming damage. Lighter armor is usable; weapons remain class restricted. Off-hands require a one-handed weapon. Equipping a two-handed primary removes this hero’s off-hand. Ranged equipment works independently of both hands.</p></div></aside><section class="bag-panel"><div class="section-heading"><h2>Your satchel <span class="muted">${items.length} / 1000</span></h2><div class="segmented"><button data-action="bag-filter" data-id="usable" class="${bagFilter === "usable" ? "active" : ""}">Usable</button><button data-action="bag-filter" data-id="all" class="${bagFilter === "all" ? "active" : ""}">All items</button></div></div><div class="bag-slot-toolbar"><label for="bag-slot">Equipment slot</label><select id="bag-slot"><option value="all">All slots</option>${SLOTS.map((slot) => `<option value="${slot}" ${bagSlot === slot ? "selected" : ""}>${SLOT_LABELS[slot]}</option>`).join("")}</select></div>${!items.length ? `<p class="bag-empty">No owned items match these filters. Explore the acquisition guide below or choose another slot.</p>` : ""}<div class="gear-grid">${items
    .map((id) => {
      const g = GEAR_MAP[id],
        equipped = Object.values(h.equipment).includes(id),
        restriction = equipRestriction(
          save,
          id,
          ["offhand", "ranged"].includes(bagSlot)
            ? (bagSlot as "offhand" | "ranged")
            : undefined,
        ),
        comparison = equipped
          ? {}
          : gearComparison(
              save,
              id,
              ["offhand", "ranged"].includes(bagSlot)
                ? (bagSlot as "offhand" | "ranged")
                : undefined,
            ),
        inUse = Object.values(save.heroes).some((h) =>
          Object.values(h.equipment).includes(id),
        ),
        starter =
          id.startsWith("starter_") ||
          isMasteryGear(id) ||
          ["cloth", "leather", "mail", "plate"].includes(id);
      return `<article class="gear-card" data-gear-id="${id}" style="--rarity-color:${RARITY_COLORS[g.rarity]}"><div class="gear-card-head"><span class="gear-icon">${icon(g.icon, 29)}</span><div><span class="rarity-label">${g.rarity}</span><h3>${g.name}</h3><small>${gearUseLabel(g, h.equipment.ranged === id || bagSlot === "ranged" ? "ranged" : h.equipment.offhand === id || bagSlot === "offhand" ? "offhand" : g.slot)}${g.armor ? ` · ${g.armor}` : ""}${g.level ? ` · Level ${g.level}` : ""}</small></div></div><p class="gear-flavor">${g.description}</p><div class="gear-bonuses">${Object.entries(
        g.stats,
      )
        .map(
          ([k, v]) =>
            `<span>+${statValue(k as Stat, v)} ${STAT_LABELS[k as Stat]}</span>`,
        )
        .join(
          "",
        )}</div>${renderItemEnchantment(save, id)}${renderItemState(save, id)}${g.set ? renderGearSet(g.set) : ""}${
        Object.keys(comparison).length
          ? `<div class="gear-comparison"><small>IF EQUIPPED · INCLUDES SET BONUSES</small>${Object.entries(
              comparison,
            )
              .map(
                ([key, value]) =>
                  `<span class="${value! > 0 ? "positive" : "negative"}">${value! > 0 ? "+" : ""}${statValue(key as Stat, value!)} ${STAT_LABELS[key as Stat]}</span>`,
              )
              .join("")}</div>`
          : ""
      }<div class="gear-actions">${!protectedItem(id) ? button("review-attunement", "Attune item", "button quiet", `data-id="${id}"`) : ""}${repairQuote(save, [id]).ids.length ? button("review-repair", "Repair item", "button quiet", `data-id="${id}"`) : ""}${restriction?.startsWith("Train ") && advancedWeaponType(g.weaponType) && !h.weaponTraining.includes(g.weaponType) ? button("review-weapon-training", "View weapon training", "button quiet", `data-id="${g.weaponType}"`) : ""}${button("equip", equipped ? `${icon("check", 14)} Equipped` : restriction || "Equip item", "button quiet", `data-id="${id}" ${equipped || !!restriction ? "disabled" : ""}`)}${g.slot === "weapon" && g.rangedType ? button("review-ranged", "Place ranged weapon", "button quiet", `data-id="${id}" ${equipRestriction(save, id, "ranged") ? "disabled" : ""}`) : ""}${!starter && !inUse ? button("sell", `${icon("coin", 14)} ${g.value}`, "text-button", `data-id="${id}" title="Sell item"`) : ""}${save.professions.enchanting && !starter && !inUse ? button("disenchant", icon("spark", 17), "icon-button", `data-id="${id}" title="Disenchant into ${disenchantText(id)}" aria-label="Disenchant ${g.name}"`) : ""}</div></article>`;
    })
    .join(
      "",
    )}</div><p class="page-note">Elite enemies drop treasure chests. Final bosses award rare or epic equipment. Items already owned are converted into gold when an expedition ends.</p></section></div>${renderWardrobe(save, wardrobeFilters)}${renderEndgameGuide(save)}${renderEnchantingTable(save, enchantTarget)}`;
}
function renderCraftedItem(id: string): string {
  const item = GEAR_MAP[id];
  if (!item) return "";
  return `<div class="recipe-output"><div class="gear-bonuses">${Object.entries(
    item.stats,
  )
    .map(
      ([stat, value]) =>
        `<span>+${statValue(stat as Stat, value!)} ${STAT_LABELS[stat as Stat]}</span>`,
    )
    .join("")}</div>${item.set ? renderGearSet(item.set) : ""}</div>`;
}
function renderProfessions() {
  const learned = Object.keys(save.professions),
    c = CLASS_MAP[save.selectedClass];
  return `${pageTitle("GATHER. CRAFT. PREPARE.", "An honest day’s work.", "The world provides. Turn its resources into an edge for your next expedition.")}${renderProfessionGuild(save, guildFilter)}${renderResources(save)}<div class="profession-title"><h2>Primary professions <span class="muted">${learned.length} / 2</span></h2><p>Learn two trades. Gathering and crafting professions work best together.</p></div><div class="profession-grid">${PROFESSIONS.map(
    (p) => {
      const skill = save.professions[p.id];
      return `<article class="profession-card ${skill ? "learned" : ""}" style="--profession-color:${p.color}"><div class="profession-head"><span class="profession-icon">${icon(p.icon, 26)}</span><div><h3>${p.name}</h3><small>${p.type}</small></div>${skill ? '<span class="learned-dot"></span>' : ""}</div><p>${p.description}</p><small class="profession-pair">${p.pair}</small>${skill ? `${renderTraining(save, p.id)}<div class="profession-foot"><span>${icon("check", 13)} Learned</span>${button("forget-profession", "Unlearn", "text-button", `data-id="${p.id}"`)}</div>` : button("learn-profession", learned.length >= 2 ? "Two professions learned" : "+ Learn profession", "button quiet", `data-id="${p.id}" ${learned.length >= 2 ? "disabled" : ""}`)}</article>`;
    },
  ).join(
    "",
  )}</div>${renderSecondaryTraining(save)}${renderSpecializations(save)}<p class="trade-progress-guide">Practice recipes to earn skill. Apprentice caps at 75; train Journeyman, Expert and Artisan to extend it to 150, 225 and 300. Trainer requirements use your selected hero; trained ranks and crafting paths are shared by your roster.</p><p class="page-note">Enchanting also augments owned equipment. Visit the Armory to choose an item, review a formula and apply its permanent bonus. <button class="text-button" data-action="nav" data-id="armory">Visit the enchanting table →</button></p><div class="section-heading crafting-title"><div><div class="eyebrow">A LITTLE PREPARATION GOES A LONG WAY</div><h2>At the crafting table</h2></div><span class="subtle-label">${icon("potion", 16)} ${save.supplies.potions} heals <i>·</i> ${icon("bomb", 16)} ${save.supplies.bombs} bombs</span></div><div class="recipe-toolbar"><label for="recipe-filter">Show recipes</label><select id="recipe-filter">${[["known", "Known professions"], ["all", "All recipes"], ...PROFESSIONS.filter((p) => p.type === "Crafting").map((p) => [p.id, p.name]), ["firstaid", "First Aid"], ["cooking", "Cooking"]].map(([id, name]) => `<option value="${id}" ${recipeFilter === id ? "selected" : ""}>${name}</option>`).join("")}</select><span>Recipes unlock as you practice. Simple recipes eventually stop granting skill.</span></div><div class="recipe-grid">${RECIPES.filter(
    (r) =>
      recipeFilter === "all" ||
      (recipeFilter === "known"
        ? r.profession === "firstaid" ||
          r.profession === "cooking" ||
          !!save.professions[r.profession]
        : r.profession === recipeFilter),
  )
    .map((r) => {
      const known =
          r.profession === "firstaid" ||
          r.profession === "cooking" ||
          !!save.professions[r.profession],
        affordable = canCraft(save, r.id),
        skill = recipeSkill(save, r),
        gain = actualCraftSkillGain(save, r),
        restriction = craftRestriction(save, r.id),
        patternMissing =
          r.requiresPattern && !save.learnedRecipes.includes(r.id),
        reputationMissing =
          r.reputation &&
          save.reputation[r.reputation.faction] < r.reputation.points;
      return `<article data-recipe-id="${r.id}" class="recipe-card ${!known ? "unknown" : ""}"><div class="recipe-head"><span class="ability-icon">${icon(r.icon, 24)}</span><div><h3>${r.name}</h3><small>${r.profession === "firstaid" ? "First Aid" : r.profession === "cooking" ? "Cooking" : PROFESSIONS.find((p) => p.id === r.profession)!.name} ${r.quantity > 1 ? `· creates ${r.quantity}` : ""}</small></div></div><p>${r.description}</p>${renderCraftedItem(r.output)}${renderRecipeTraining(save, r.id)}${r.reputation ? `<div class="recipe-reputation"><span class="${reputationMissing ? "negative" : ""}">${FACTIONS.find((f) => f.id === r.reputation!.faction)!.name} · ${reputationStanding(r.reputation.points).name} (${save.reputation[r.reputation.faction]} / ${r.reputation.points})</span><span>${patternMissing ? "Quartermaster pattern not learned" : "Quartermaster pattern learned"}</span><button class="text-button" data-action="nav" data-id="outposts" data-faction="${r.reputation.faction}">Visit quartermaster →</button></div>` : ""}<div class="recipe-mastery"><span class="${skill < r.skill ? "negative" : ""}">Requires skill ${r.skill}</span><span>${known ? (skill < r.skill ? `Your skill: ${skill}` : gain ? `+${gain} skill per craft` : skill >= trainingInfo(save, r.profession).cap && trainingInfo(save, r.profession).rank < 4 ? "Skill cap reached · visit trainer" : "No skill gain") : "Profession not learned"}</span></div><div class="recipe-cost">${Object.entries(
        r.cost,
      )
        .map(
          ([m, qty]) =>
            `<span class="${save.materials[m as Material] < qty! ? "insufficient" : ""}">${icon(MATERIALS[m as Material].icon, 14)} ${qty} ${MATERIALS[m as Material].name}</span>`,
        )
        .join(
          "",
        )}${r.gold ? `<span class="${save.gold < r.gold ? "insufficient" : ""}">${icon("coin", 14)} ${r.gold} G</span>` : ""}</div>${save.inventory.includes(r.output) && GEAR_MAP[r.output] ? button("craft-copy", save.inventory.length >= 1000 ? "Satchel full" : "Craft independent copy", "button quiet", `data-id="${r.id}" ${!affordable || save.inventory.length >= 1000 ? "disabled" : ""}`) : ""}${button("craft", restriction || `Craft ${icon("arrow", 15)}`, "button quiet", `data-id="${r.id}" ${!affordable ? "disabled" : ""}`)}</article>`;
    })
    .join(
      "",
    )}</div><p class="page-note">Primary professions are shared across your roster. All characters know the three secondary skills. ${c.name} can use healing supplies with Q and bombs with E.</p>`;
}
function renderOutpostsPage() {
  return `${pageTitle("ALLIES ON THE ROAD", "A reputation worth earning.", "Take a commission. Prove yourself. Return for the rewards.")}${renderOutposts(save, outpostFaction)}`;
}
function renderJournal() {
  return `${pageTitle("THE ADVENTURER’S JOURNAL", "Every legend starts somewhere.", "Complete objectives, claim your rewards, and find your next destination.")}<div class="journal-stats">${[
    ["sword", "Enemies defeated", save.totals.kills],
    ["camp", "Expeditions", save.totals.runs],
    ["crown", "Victories", save.totals.wins],
    ["compass", "Landmarks completed", save.totals.encounters],
    ["anvil", "Dungeon guardians", save.totals.dungeonBosses],
    ["crown", "Dungeon clears", save.totals.dungeonWins],
  ]
    .map(
      ([i, n, v]) =>
        `<div>${icon(i as string, 25)}<span><small>${n}</small><b>${v}</b></span></div>`,
    )
    .join(
      "",
    )}</div>${renderFinalJourney(save)}${renderClassTrial(save)}<div class="section-heading"><h2>Quests & milestones</h2><span class="subtle-label">${save.claimedQuests.length} / ${QUESTS.length} COMPLETED</span></div><div class="quest-grid">${QUESTS.map(
    (q) => {
      const value = Math.min(q.goal, questProgress(save, q.id)),
        done = save.claimedQuests.includes(q.id),
        ready = value >= q.goal;
      return `<article class="quest-card ${done ? "completed" : ""}"><div class="quest-head"><span class="quest-icon">${icon(done ? "check" : q.icon, 24)}</span><div><h3>${q.name}</h3><p>${q.description}</p></div></div><div class="quest-progress"><div class="progress-track"><i style="width:${(value / q.goal) * 100}%"></i></div><span>${q.metric === "bestTime" ? `${time(value)} / ${time(q.goal)}` : `${value} / ${q.goal}`}</span></div><div class="quest-footer"><span>${icon("coin", 15)} ${q.gold} G <i>·</i> ${q.xp} XP</span>${button("claim", done ? `${icon("check", 14)} Claimed` : ready ? "Claim rewards" : "In progress", "button quiet", `data-id="${q.id}" ${done || !ready ? "disabled" : ""}`)}</div></article>`;
    },
  ).join(
    "",
  )}</div><div class="section-heading history-title"><h2>Your expeditions</h2><span class="subtle-label">LAST 20 ADVENTURES</span></div>${save.history.length ? `<div class="history-list">${save.history.map((r) => `<div class="history-row"><span class="history-result ${r.victory ? "victory" : ""}">${icon(r.victory ? "crown" : "sword", 22)}</span><div><b>${ZONES.find((z) => z.id === r.zoneId)?.name}</b><small>${CLASS_MAP[r.classId].name} · ${r.victory ? "Victorious" : "Fallen"} · ${new Date(r.date).toLocaleDateString("en", { month: "short", day: "numeric" })}</small></div><span>${time(r.time)} <small>survived</small></span><span>${r.kills} <small>defeated · ${dungeonRoute(r.zoneId) ? `${r.dungeonBosses || 0} / ${dungeonRoute(r.zoneId)!.stages.length} guardians` : `${r.encounters || 0} ${(r.encounters || 0) === 1 ? "landmark" : "landmarks"}`}</small></span><span class="gold-text">+${r.gold} G <small>+${r.xp} XP</small></span></div>`).join("")}</div>` : `<div class="empty-journal">${icon("map", 40)}<h3>The road is still ahead.</h3><p>Your expeditions will be recorded here. There’s no better time to begin.</p>${button("nav", `Choose an expedition ${icon("arrow", 16)}`, "button quiet", 'data-id="camp"')}</div>`}`;
}

function showModal(html: string, kind: string, css = "") {
  resetMovement();
  lastFocus = document.activeElement as HTMLElement;
  modalKind = kind;
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal ${css}" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">${html}</section></div>`;
  document.body.classList.add("has-modal");
  document.body.classList.toggle("craft-review", kind === "specialization");
  document.body.classList.toggle("enchant-review", kind === "enchantment");
  document.body.classList.toggle("has-checkpoint", kind === "checkpoint");
  refreshControllerHints();
  if (controllerMode) ensureControllerFocus(modalRoot);
  const openedDialog = modalRoot.firstElementChild;
  requestAnimationFrame(() => {
    if (
      modalRoot.firstElementChild !== openedDialog ||
      !modalKind ||
      modalRoot.contains(document.activeElement)
    )
      return;
    if (controllerMode) {
      ensureControllerFocus(modalRoot);
      return;
    }
    const el = modalRoot.querySelector<HTMLElement>(
      "button:not([disabled]),input,select,.modal",
    );
    el?.focus();
  });
}
function closeModal() {
  resetMovement();
  modalRoot.innerHTML = "";
  modalKind = "";
  document.body.classList.remove(
    "has-modal",
    "craft-review",
    "has-checkpoint",
    "enchant-review",
  );
  lastFocus?.focus();
  refreshControllerHints();
}
const modalClose = () =>
  button(
    "close-modal",
    icon("close", 20),
    "modal-close icon-button",
    'aria-label="Close dialog"',
  );
function showControls() {
  showModal(
    `${modalClose()}<div class="eyebrow">YOUR FIELD GUIDE</div><h2 id="modal-title">Survive. Grow. Return.</h2><p class="modal-intro">Move through the horde. Your spells find their targets automatically. Gather the blue experience gems to choose new spells and stronger upgrades.</p><div class="control-list">${[
      ["W A S D / ↑ ↓ ← →", "Move through the world"],
      ["SPACE", "Use your active class ability"],
      ["SHIFT", "Dash in your movement direction"],
      ["Q", "Use a healing potion or bandage"],
      ["E", "Throw a crafted bomb"],
      ["F", "Interact with a nearby landmark"],
      ["G", "Toggle gathering compass and inspect resource requirements"],
      ["R", "Summon, cancel or dismiss your selected travel option"],
      ["1 / 2 / 3", "Choose an upgrade or shrine blessing"],
      ["ESC / P", "Pause or resume your expedition"],
    ]
      .map(
        ([key, label]) => `<div><kbd>${key}</kbd><span>${label}</span></div>`,
      )
      .join(
        "",
      )}</div><p class="modal-intro">Elites arrive every two minutes. Collect their treasure, gather materials, and defeat the final boss to win. Follow the compass to six landmarks in each zone. Shrines grant expedition blessings, guarded caches award equipment, and rituals reward holding a circle for 20 seconds. Press F nearby or tap the interaction button. Gold, character XP, loot, and materials return to camp even when you fall.</p>${renderControllerHelp()}${button("close-modal", "Ready for adventure", "button primary full-width")}`,
    "controls",
  );
}
function showSettings() {
  showModal(
    `${modalClose()}<div class="eyebrow">MAKE YOURSELF AT HOME</div><h2 id="modal-title">Settings</h2><div class="settings-list">${[
      ["sound", "volume", "Sound effects", "A little magic for every action."],
      [
        "particles",
        "spark",
        "Ambient particles",
        "Fireflies, spell motes and combat bursts.",
      ],
      [
        "screenShake",
        "whirl",
        "Screen shake",
        "A subtle impact when you take damage.",
      ],
      [
        "animation",
        "boot",
        "Character animation",
        "Heroes, creatures, companions and mounts. Respects reduced motion.",
      ],
    ]
      .map(
        ([id, i, n, d]) =>
          `<label class="setting-row">${icon(i, 22)}<span><b>${n}</b><small>${d}</small></span><input type="checkbox" data-setting="${id}" ${save.settings[id as keyof SaveData["settings"]] ? "checked" : ""}/><span class="toggle"></span></label>`,
      )
      .join(
        "",
      )}</div>${renderMusicSettings()}<div class="sheet-divider"></div>${renderControllerHelp()}<div class="sheet-divider"></div><h3>Your adventure, saved</h3><p class="modal-intro">Progress is saved in this browser. Export a copy to keep it safe or move it to another device.</p><div class="save-actions">${button("export", `${icon("download", 17)} Export save`, "button quiet")}${button("import", `${icon("upload", 17)} Import save`, "button quiet")}<input type="file" id="import-file" accept=".json,application/json" hidden /></div><div class="settings-controls-link">${button("controls", `${icon("info", 16)} Controls & field guide`, "text-button")}</div>`,
    "settings",
  );
}
function renderMusicSettings() {
  const levels = [
    ...new Set([0, 25, 50, 75, 100, save.settings.musicVolume]),
  ].sort((a, b) => a - b);
  return `<section class="music-settings" aria-label="Original music"><label class="setting-row">${icon("volume", 22)}<span><b>Original music</b><small>Camp, expedition and encounter themes.</small></span><input type="checkbox" data-setting="music" ${save.settings.music ? "checked" : ""}/><span class="toggle"></span></label><div class="music-volume"><label for="music-volume">Music volume</label><select id="music-volume">${levels.map((level) => `<option value="${level}" ${level === save.settings.musicVolume ? "selected" : ""}>${level === 0 ? "Muted" : `${level}%`}</option>`).join("")}</select></div><p id="music-status" class="music-status" role="status">${music.status()}</p><p class="music-credit">Twelve original themes, composed and synthesized locally. Music and sound effects have separate controls. Combat music rests during paused choices and when the game loses focus.</p></section>`;
}
function refreshMusic() {
  const scene = musicScene({
    zone: game?.zone.id,
    boss: !!game?.boss,
    checkpoint: game?.checkpoint,
    ended: game?.ended,
    victory: game?.victory,
    paused: !!game && (game.paused || game.choosing || !!game.shrineChoice),
    health: game?.player.hp,
    maxHealth: game?.player.maxHp,
    focused: !document.hidden && document.hasFocus(),
  });
  music.update(scene.cue, scene.playing, scene.tension);
  const status = document.getElementById("music-status");
  const text = music.status();
  if (status && status.textContent !== text) status.textContent = text;
}
function showUpgrade() {
  if (!game) return;
  sound.levelup();
  showModal(
    `<div class="upgrade-star">${icon("spark", 38)}</div><div class="eyebrow centered">YOUR POWER GROWS</div><h2 id="modal-title">Level ${game.level + 1}</h2><p class="modal-intro centered">A new power. A stronger spell. The choice is yours.</p><div class="upgrade-options">${game.upgrades.map((u, i) => `<button class="upgrade-card ${u.evolution ? "evolution" : ""}" data-action="upgrade" data-id="${u.id}" style="--spell-color:${u.color}"><span class="upgrade-shortcut">${i + 1}</span><span class="upgrade-icon">${icon(u.icon, 38)}</span><span class="upgrade-type">${u.evolution ? "SPELL EVOLUTION" : u.type === "spell" ? (u.rank === 1 ? "NEW ABILITY" : `RANK ${u.rank} UPGRADE`) : "SURVIVAL BONUS"}</span><h3>${u.name}</h3><p>${u.description}</p><span class="upgrade-choose">Choose upgrade ${icon("arrow", 17)}</span></button>`).join("")}</div><small class="upgrade-footnote">Time is paused. Press 1, 2 or 3 to choose.</small>`,
    "upgrade",
    "upgrade-modal",
  );
}
function renderBlessings() {
  if (!game?.blessings.length) return "";
  return `<div class="pause-blessings">${game.blessings
    .map((id) => {
      const b = BLESSINGS.find((b) => b.id === id);
      return b
        ? `<span>${icon(b.icon, 17)}<b>${b.name}</b><small>${b.description}</small></span>`
        : "";
    })
    .join("")}</div>`;
}
function showPause() {
  if (
    !game ||
    game.ended ||
    game.choosing ||
    game.shrineChoice ||
    game.checkpoint
  )
    return;
  game.paused = true;
  keys.clear();
  game.setInput(0, 0);
  showModal(
    `<div class="eyebrow">TAKE A BREATH</div><h2 id="modal-title">Expedition paused</h2><p class="modal-intro">${game.classDef.name} · ${game.zone.name} · ${time(game.time)}</p><div class="pause-stats"><div><b>${game.kills}</b><small>Enemies defeated</small></div><div><b>${game.level}</b><small>Run level</small></div><div><b>${game.gold}</b><small>Gold collected</small></div></div><div class="pause-build">${game.spells.map((s) => `<span style="color:${SPELLS[s.id].color}">${icon(SPELLS[s.id].icon, 18)} ${s.rank === 5 ? SPELLS[s.id].evolution : SPELLS[s.id].name} <small>R${s.rank}</small></span>`).join("")}</div>${renderBlessings()}${renderDungeonBoons(game)}${renderTrialStatus(save, game.result())}${renderProfessionQuestStatus(save, game.result())}${renderCampaignStatus(save, game.result())}${save.commission ? `<div class="pause-commission">${renderCommissionStatus(save, { zoneId: game.zone.id, kills: game.kills, encounters: game.completedEncounters, victory: game.victory })}</div>` : ""}${button("resume", `${icon("play", 17)} Resume expedition`, "button primary full-width")}${button("abandon", `Return to camp ${icon("arrow", 16)}`, "button quiet full-width")}<small class="upgrade-footnote">Your collected rewards return with you.</small>`,
    "pause",
  );
}
function resume() {
  if (
    !game ||
    game.choosing ||
    game.shrineChoice ||
    game.checkpoint ||
    game.ended
  )
    return;
  game.paused = false;
  closeModal();
}
function showResult(result: RunRecord, reputationEarned: number) {
  sound.reward();
  const mats = Object.entries(result.materials);
  showModal(
    `<div class="result-emblem ${result.victory ? "victory" : ""}">${icon(result.victory ? "crown" : "sword", 38)}</div><div class="eyebrow centered">${result.victory ? (result.zoneId === "deadmines" ? "THE BROTHERHOOD IS BROKEN" : result.zoneId === "ragefire" ? "THE SEARING BLADE IS SILENCED" : result.zoneId === "shadowfang" ? "THE MOONLIT CURSE IS BROKEN" : "THE FOREST WILL REMEMBER") : "THE ROAD DOES NOT END HERE"}</div><h2 id="modal-title">${result.victory ? "A legend begins." : "Until the next adventure."}</h2><p class="modal-intro centered">${CLASS_MAP[result.classId].name} · ${ZONES.find((z) => z.id === result.zoneId)!.name}</p><div class="result-stats"><div><b>${time(result.time)}</b><small>Survived</small></div><div><b>${result.kills}</b><small>Defeated</small></div><div><b>${result.level}</b><small>Run level</small></div></div><div class="result-rewards"><span>${icon("coin", 21)}<b>+${result.gold}</b> gold</span><span>${icon("spark", 21)}<b>+${result.xp}</b> character XP</span></div>${mats.length ? `<div class="result-materials">${mats.map(([m, n]) => `<span>${icon(MATERIALS[m as Material].icon, 16)} ${n} ${MATERIALS[m as Material].name}</span>`).join("")}</div>` : ""}${result.loot.length ? `<div class="result-loot">${result.loot.map((id) => `<span style="color:${RARITY_COLORS[GEAR_MAP[id].rarity]}">${icon(GEAR_MAP[id].icon, 23)} ${GEAR_MAP[id].name}</span>`).join("")}</div>` : ""}${dungeonRoute(result.zoneId) ? renderDungeonResult(result) : `<div class="result-exploration">${icon("compass", 19)}<b>${result.encounters || 0} / 6</b> landmarks completed</div>`}${renderEquipmentResult(save, result)}${renderFactionResult(save, result, reputationEarned)}${renderSkillCaps(save)}${renderTrialStatus(save)}${renderProfessionQuestStatus(save)}${renderCampaignStatus(save)}${result.party ? `<p class="result-level">Your ${CLASS_MAP[result.party.classId].name} partner also earns ${result.xp} character XP. The party’s gold, treasure and materials are paid once.</p>` : ""}<p class="result-level">Your ${CLASS_MAP[result.classId].name} is now character level <b>${save.heroes[result.classId].level}</b>. ${availableTalents(save.heroes[result.classId])} talent points available.</p>${button("camp", `Return to camp ${icon("arrow", 18)}`, "button primary full-width")}`,
    "result",
    "result-modal",
  );
}
function handleGameEvent(event: GameEvent) {
  if (event.type === "cast") sound.cast();
  if (event.type === "hit") sound.hit();
  if (event.type === "active") sound.active();
  if (event.type === "levelup") showUpgrade();
  if (event.type === "shrine") showShrine();
  if (event.type === "checkpoint" && game) {
    keys.clear();
    game.setInput(0, 0);
    toastRoot.replaceChildren();
    showModal(renderCheckpoint(game), "checkpoint", "checkpoint-modal");
  }
  if (
    ["pickup", "elite", "boss", "active", "discovery", "encounter"].includes(
      event.type,
    ) &&
    event.message
  )
    toast(
      event.message,
      event.type === "boss"
        ? "skull"
        : event.type === "elite"
          ? "sword"
          : "spark",
    );
  if (event.type === "end")
    queueMicrotask(() => {
      if (!game) return;
      const result = game.result();
      const faction = FACTIONS.find((f) => f.zoneId === result.zoneId);
      const reputationBefore = faction ? save.reputation[faction.id] : 0;
      settleRun(save, result, game.professionGains);
      writeSave();
      showResult(
        result,
        faction ? save.reputation[faction.id] - reputationBefore : 0,
      );
    });
}
function startGame() {
  closeModal();
  const zone = ZONES.find((z) => z.id === save.selectedZone)!;
  if (expeditionRestriction(save, zone.id) || partyRestriction(zone.id)) return;
  const food = save.supplies.food > 0;
  if (food) save.supplies.food--;
  writeSave();
  keys.clear();
  game = new GameEngine({
    classId: save.selectedClass,
    ...(partnerClass && partnerClass !== save.selectedClass
      ? {
          partner: {
            classId: partnerClass,
            stats: heroStats(save, partnerClass),
            characterLevel: save.heroes[partnerClass].level,
            spellbook: save.heroes[partnerClass].spellbook,
            spellBonuses: heroSpellBonuses(save, partnerClass),
            resistances: heroResistances(save, partnerClass),
            equipment: equipmentSnapshot({
              ...save,
              selectedClass: partnerClass,
            }),
          },
        }
      : {}),
    zone,
    stats: heroStats(save),
    resistances: heroResistances(save),
    journey: journeySnapshots(save),
    equipment: equipmentSnapshot(save),
    onAmmunition: () => {
      if (save.ammunition <= 0) return false;
      save.ammunition--;
      writeSave();
      return true;
    },
    spellBonuses: heroSpellBonuses(save),
    spellbook: save.heroes[save.selectedClass].spellbook,
    professions: { ...save.professions },
    fishingSkill: save.secondary.fishing,
    gatheringCaps: Object.fromEntries(
      (["herbalism", "mining", "skinning", "fishing"] as const).map((id) => [
        id,
        trainingInfo(save, id).cap,
      ]),
    ),
    characterLevel: save.heroes[save.selectedClass].level,
    travelId: selectedTravel(save)?.id,
    professionQuests: professionQuestSnapshots(save),
    campaigns: campaignSnapshots(save),
    trialChapter: save.heroes[save.selectedClass].classTrial.active
      ? save.heroes[save.selectedClass].classTrial.chapter
      : undefined,
    food,
    onEvent: handleGameEvent,
    onAction: (action) => renderer?.onAction(action),
    onEnemyAction: (action) => renderer?.onEnemyAction(action),
    onDeath: (action) => renderer?.onDeath(action),
    onConsume: (type) => {
      if (save.supplies[type] <= 0) return false;
      save.supplies[type]--;
      writeSave();
      return true;
    },
  });
  document.body.classList.add("in-game");
  app.innerHTML = `<main class="game-shell ${game.partner ? "coop-game" : ""} ${zone.dungeon ? "dungeon-game" : ""}" data-zone="${zone.id}"><canvas id="game-canvas" aria-label="Wow Survivors survival battlefield"></canvas><div class="game-xp-track"><i id="run-xp-fill"></i></div><div class="game-top"><div class="player-hud">${portrait(game.classDef.portrait)}<div class="player-hud-info"><div><b>${game.classDef.name}</b><span id="run-level">LEVEL 1</span></div><div class="health-track"><i id="health-fill"></i><span id="health-text"></span></div><div class="resource-track"><i id="resource-fill" class="${game.classDef.resource.toLowerCase()}"></i><span id="resource-text"></span></div></div></div><div class="game-timer"><span>${zone.name}</span><b id="run-time">00:00</b><small id="run-objective">Survive ${Math.round(zone.duration / 60)} minutes, then defeat ${zone.boss}</small></div><div class="game-counters"><span>${icon("sword", 18)}<b id="run-kills">0</b></span><span>${icon("coin", 18)}<b id="run-gold">0</b></span>${button("pause", icon("pause", 21), "game-pause", 'aria-label="Pause expedition"')}</div></div>${game.partner ? `<aside class="partner-hud" aria-label="Cooperative partner"><b>P2 · ${game.partner.classDef.name}</b><span id="partner-health"></span><small id="partner-status">Arrows move · Enter class ability</small><button class="button quiet" data-action="partner-active">P2 ability · Enter</button></aside>` : ""}<section class="boss-hud" id="boss-hud" hidden aria-label="Dungeon guardian or final boss"><div><b id="boss-name"></b><span id="boss-phase"></span></div><div class="boss-health-track"><i id="boss-health-fill"></i></div><p id="boss-attack"></p></section><aside class="world-hud" aria-label="Exploration"><div class="exploration-heading">${icon("compass", 16)}<b id="landmark-count">LANDMARKS 0 / 6</b><span id="blessing-count"></span><button class="fieldwork-toggle" id="fieldwork-toggle" data-action="fieldwork" aria-expanded="false" aria-controls="fieldwork-panel">Gather</button></div><div id="explore-panel"><div class="landmark-compass"><span id="compass-arrow">↑</span><div><b id="landmark-name"></b><small id="landmark-hint"></small></div></div><div id="encounter-status" hidden><div class="encounter-progress"><i id="encounter-fill"></i></div><small id="encounter-detail"></small></div><button data-action="interact" id="landmark-button" class="landmark-button" hidden><kbd>F</kbd><span id="landmark-interact"></span>${icon("arrow", 15)}</button><small id="landmark-preview" hidden></small></div>${renderFieldwork()}</aside><button data-action="travel" id="travel-button" class="travel-action" aria-label="Travel" aria-pressed="false">${icon("horse", 23)}<span><b id="travel-label">Travel</b><small id="travel-hint"></small></span><kbd>R</kbd><i id="travel-channel" class="travel-channel"></i></button>${game.shootingWeapon || game.equipment.primary ? `<button data-action="shoot" id="shoot-button" class="equipment-shoot"><span>${icon(game.shootingWeapon ? GEAR_MAP[game.shootingWeapon.item].icon : "sword", 20)} ${game.shootingWeapon ? "Shoot" : "Strike"} <kbd>T</kbd></span><small id="shot-status"></small></button>` : ""}<div class="game-bottom"><div class="spell-loadout" id="spell-loadout"></div><div class="game-actions"><button data-action="active" id="active-button" class="action-slot"><span class="action-symbol">${icon(game.classDef.id, 24)}</span><b>${game.classDef.active}</b><kbd>SPACE</kbd><i id="active-cooldown"></i></button><button data-action="dash" class="action-slot compact"><span class="action-symbol">${icon("boot", 23)}</span><b id="dash-text">Dash</b><kbd>SHIFT</kbd></button><button data-action="heal" class="action-slot compact"><span class="action-symbol">${icon("potion", 23)}</span><b id="potion-count">${save.supplies.potions}</b><kbd>Q</kbd></button><button data-action="bomb" class="action-slot compact"><span class="action-symbol">${icon("bomb", 23)}</span><b id="bomb-count">${save.supplies.bombs}</b><kbd>E</kbd></button></div></div><div class="game-tutorial" id="game-tutorial">${icon("info", 18)}<span><b>Keep moving.</b> Your spells attack automatically. Collect blue gems to grow stronger.</span><kbd>WASD</kbd></div><div class="touch-controls"><div class="touch-pad" id="touch-pad"><div id="touch-stick"></div></div><button data-action="active" aria-label="Class ability">${icon(game.classDef.id, 28)}</button></div></main>`;
  renderer = new GameRenderer(
    document.querySelector<HTMLCanvasElement>("#game-canvas")!,
    game,
  );
  renderer.particles = save.settings.particles;
  renderer.shake = save.settings.screenShake;
  renderer.animation = save.settings.animation;
  updateHud();
  setupTouch();
  refreshControllerHints();
}
function showShrine() {
  if (!game?.shrineChoice) return;
  keys.clear();
  game.setInput(0, 0);
  sound.levelup();
  showModal(
    `<div class="upgrade-star">${icon("rune", 38)}</div><div class="eyebrow centered">AN ANCIENT BLESSING</div><h2 id="modal-title">${game.shrineChoice.name}</h2><p class="modal-intro centered">Choose a blessing. Its power lasts until this expedition ends.</p><div class="upgrade-options">${BLESSINGS.map((b, i) => `<button class="upgrade-card blessing-card" data-action="blessing" data-id="${b.id}" style="--spell-color:${b.color}"><span class="upgrade-shortcut">${i + 1}</span><span class="upgrade-icon">${icon(b.icon, 38)}</span><span class="upgrade-type">EXPEDITION BLESSING</span><h3>${b.name}</h3><p>${b.description}</p><span class="upgrade-choose">Receive blessing ${icon("arrow", 17)}</span></button>`).join("")}</div>${button("leave-shrine", "Leave the shrine", "text-button shrine-leave")}<small class="upgrade-footnote">Time is paused. Press 1, 2 or 3 to choose, or Escape to leave.</small>`,
    "shrine",
    "upgrade-modal",
  );
}
let spellMarkup = "";
function updateHud() {
  if (!game) return;
  updateFieldwork(game);
  const p = game.player;
  if (game.partner) {
    const buddy = game.partner,
      health = document.getElementById("partner-health"),
      status = document.getElementById("partner-status");
    if (health)
      health.textContent = `${Math.max(0, Math.ceil(buddy.player.hp))} / ${Math.ceil(buddy.player.maxHp)} HP`;
    if (status)
      status.textContent =
        buddy.player.hp <= 0
          ? `Downed · revive ${Math.round((buddy.revive / 3) * 100)}% · stand within 90 units`
          : p.hp <= 0
            ? `P1 downed · revive ${Math.round((game.revivePrimary / 3) * 100)}%`
            : `Arrows move · Enter ability · ${Math.ceil(buddy.player.activeCooldown)}s cooldown`;
  }
  const shotStatus = document.getElementById("shot-status");
  if (shotStatus)
    shotStatus.textContent =
      game.time < game.shotReadyAt
        ? `${Math.ceil(game.shotReadyAt - game.time)}s cooldown`
        : !game.shootingWeapon
          ? "Melee · within 150"
          : ["bow", "gun", "crossbow"].includes(
                GEAR_MAP[game.shootingWeapon!.item].rangedType || "",
              )
            ? `${save.ammunition} ammunition`
            : "No ammunition needed";
  const text = (id: string, value: string) => {
    const e = document.getElementById(id);
    if (e) e.textContent = value;
  };
  const width = (id: string, n: number) => {
    const e = document.getElementById(id);
    if (e) e.style.width = `${Math.max(0, Math.min(100, n))}%`;
  };
  text("run-time", time(game.time));
  text("run-kills", String(game.kills));
  text("run-gold", String(game.gold));
  text("run-level", `LEVEL ${game.level}`);
  text("health-text", `${Math.max(0, Math.ceil(p.hp))} / ${p.maxHp}`);
  text(
    "resource-text",
    `${game.classDef.resource} · ${Math.floor(p.resource)}`,
  );
  width("health-fill", (p.hp / p.maxHp) * 100);
  width("resource-fill", p.resource);
  width("run-xp-fill", (game.xp / game.xpNeeded) * 100);
  text("potion-count", String(save.supplies.potions));
  text("bomb-count", String(save.supplies.bombs));
  const travelButton = document.getElementById(
    "travel-button",
  ) as HTMLButtonElement | null;
  if (travelButton) {
    const t = game.travelOption,
      summoning = game.travel.channel > 0;
    const reason = game.travelRestriction;
    travelButton.disabled = !game.travelling && !!reason;
    travelButton.setAttribute("aria-pressed", String(game.travel.active));
    travelButton.setAttribute("aria-describedby", "travel-hint");
    travelButton.dataset.state = game.travel.active
      ? "travelling"
      : summoning
        ? "summoning"
        : "walking";
    text(
      "travel-label",
      game.travel.active
        ? "Return to combat"
        : summoning
          ? "Cancel summon"
          : "Travel",
    );
    text(
      "travel-hint",
      game.travel.active
        ? `${t!.name} · +${t!.speed}% speed`
        : summoning
          ? `${game.travel.channel.toFixed(1)}s · stand still`
          : reason || t!.name,
    );
    const duration =
      t?.kind === "form" ? TRAVEL_RULES.formSummon : TRAVEL_RULES.summon;
    width(
      "travel-channel",
      summoning ? (1 - game.travel.channel / duration) * 100 : 0,
    );
  }
  text(
    "dash-text",
    p.dashCooldown > 0 ? `${p.dashCooldown.toFixed(1)}s` : "Dash",
  );
  const cd = document.getElementById("active-cooldown");
  if (cd) {
    cd.style.height = `${(p.activeCooldown / game.classDef.activeCooldown) * 100}%`;
    cd.textContent =
      p.activeCooldown > 0 ? `${Math.ceil(p.activeCooldown)}s` : "";
  }
  if (game.boss)
    text(
      "run-objective",
      `${game.bossName} · ${Math.max(0, Math.ceil(game.boss.hp))} / ${Math.ceil(game.boss.maxHp)} HP`,
    );
  const bossHud = document.getElementById("boss-hud");
  if (bossHud) bossHud.hidden = !game.boss;
  document
    .querySelector(".game-shell")
    ?.classList.toggle("has-boss", !!game.boss);
  if (game.boss) {
    text("boss-name", game.bossName);
    text("boss-phase", game.bossState.phase === 2 ? "ENRAGED" : "PHASE I");
    width("boss-health-fill", (game.boss.hp / game.boss.maxHp) * 100);
    const warning = game.bossState.attackUntil - game.time;
    text(
      "boss-attack",
      warning > 0
        ? `${game.bossState.attackName} · ${warning.toFixed(1)}s`
        : game.bossIdentity.tactic,
    );
  }
  text(
    "landmark-count",
    `LANDMARKS ${game.completedEncounters} / ${game.landmarks.length}`,
  );
  text(
    "blessing-count",
    game.blessings.length
      ? `${game.blessings.length} ${game.blessings.length === 1 ? "blessing" : "blessings"}`
      : "",
  );
  const blessingCount = document.getElementById("blessing-count");
  if (blessingCount)
    blessingCount.title = game.blessings
      .map((id) => BLESSINGS.find((b) => b.id === id)!.description)
      .join("\n");
  const landmark = game.compassLandmark;
  if (game.boss) {
    text("landmark-name", game.bossName);
    text(
      "landmark-hint",
      `${game.dungeonStage ? "Dungeon guardian" : "Final encounter"} · ${Math.ceil(Math.hypot(game.boss.x - p.x, game.boss.y - p.y) / 10)} m away`,
    );
    const arrow = document.getElementById("compass-arrow");
    if (arrow)
      arrow.style.transform = `rotate(${Math.atan2(game.boss.y - p.y, game.boss.x - p.x) + Math.PI / 2}rad)`;
  } else if (landmark) {
    text(
      "landmark-name",
      landmark.discovered ? landmark.name : "Unknown landmark",
    );
    const distance = Math.hypot(landmark.x - p.x, landmark.y - p.y);
    text(
      "landmark-hint",
      game.boss
        ? "Finish the boss to end your expedition"
        : `${ENCOUNTER_RULES[landmark.kind].label} · ${Math.ceil(distance / 10)} m away`,
    );
    const arrow = document.getElementById("compass-arrow");
    if (arrow)
      arrow.style.transform = `rotate(${Math.atan2(landmark.y - p.y, landmark.x - p.x) + Math.PI / 2}rad)`;
  } else {
    text("landmark-name", "Every landmark completed");
    text("landmark-hint", "Prepare for the final boss");
  }
  const active = game.landmarks.find((l) => l.state === "active");
  const status = document.getElementById("encounter-status");
  if (status) status.hidden = !active;
  if (active) {
    width(
      "encounter-fill",
      active.kind === "ritual"
        ? (active.progress / 20) * 100
        : active.progress * 100,
    );
    text(
      "encounter-detail",
      active.kind === "ritual"
        ? `${Math.floor(active.progress)} / 20s · ${Math.hypot(active.x - p.x, active.y - p.y) <= 175 ? "Defend the circle" : "Return to the circle · progress fading"}`
        : `${Math.round(active.progress * 3)} / 3 guards defeated`,
    );
  }
  const nearby = game.nearbyLandmark;
  const interactButton = document.getElementById(
    "landmark-button",
  ) as HTMLButtonElement | null;
  if (interactButton) {
    interactButton.hidden = !nearby;
    interactButton.disabled =
      game.paused || game.choosing || !!game.shrineChoice || game.ended;
    interactButton.title = nearby
      ? ENCOUNTER_RULES[nearby.kind].description
      : "";
  }
  if (nearby)
    text(
      "landmark-interact",
      nearby.kind === "shrine"
        ? "Receive a blessing"
        : nearby.kind === "cache"
          ? "Challenge the guards"
          : "Begin the ritual",
    );
  const preview = document.getElementById("landmark-preview");
  if (preview) {
    preview.hidden = !nearby;
    preview.textContent = nearby
      ? ENCOUNTER_RULES[nearby.kind].description
      : "";
  }
  if (game.dungeonStage) {
    const stage = game.dungeonStage;
    text(
      "landmark-count",
      `GUARDIANS ${game.dungeonBosses} / ${game.dungeonRoute!.stages.length}`,
    );
    text(
      "blessing-count",
      game.dungeonBoons.length ? `${game.dungeonBoons.length} boons` : "",
    );
    if (blessingCount)
      blessingCount.title = game.dungeonBoons
        .map((id) => DUNGEON_BOONS.find((b) => b.id === id)!.description)
        .join("\n");
    if (!game.boss) {
      text(
        "run-objective",
        `Stage ${game.dungeonStageIndex + 1} · ${time(Math.max(0, stage.duration - game.dungeonStageTime))} until ${stage.boss}`,
      );
      text("landmark-name", stage.name);
      text("landmark-hint", stage.description);
      const arrow = document.getElementById("compass-arrow");
      if (arrow) {
        arrow.textContent = String(game.dungeonStageIndex + 1);
        arrow.style.transform = "";
      }
    } else {
      const arrow = document.getElementById("compass-arrow");
      if (arrow) arrow.textContent = "↑";
    }
    if (status) status.hidden = false;
    width(
      "encounter-fill",
      game.boss
        ? (1 - game.boss.hp / game.boss.maxHp) * 100
        : Math.min(100, (game.dungeonStageTime / stage.duration) * 100),
    );
    text(
      "encounter-detail",
      `Stage ${game.dungeonStageIndex + 1} / ${game.dungeonRoute!.stages.length} · ${game.boss ? "Defeat the guardian" : "Hold your ground and grow stronger"}`,
    );
  }
  document
    .getElementById("game-tutorial")
    ?.classList.toggle("hidden", game.time > 14 || game.travelling);
  const markup =
    game.spells
      .map(
        (s) =>
          `<div class="run-spell ${s.rank === 5 ? "evolved" : ""}" style="--spell-color:${SPELLS[s.id].color}" title="${SPELLS[s.id].description}">${icon(SPELLS[s.id].icon, 25)}<span>${s.rank === 5 ? SPELLS[s.id].evolution : SPELLS[s.id].name}</span><div>${Array.from({ length: 5 }, (_, i) => `<i class="${i < s.rank ? "filled" : ""}"></i>`).join("")}</div></div>`,
      )
      .join("") +
    game.preparedSpells
      .filter((id) => !game!.spells.some((s) => s.id === id))
      .map(
        (id) =>
          `<div class="run-spell unlearned" style="--spell-color:${SPELLS[id].color}" title="Prepared: ${SPELLS[id].name}. Learn through an expedition upgrade.">${icon(SPELLS[id].icon, 25)}<span>${SPELLS[id].name}</span><small>PREPARED · CHOOSE UPGRADE</small></div>`,
      )
      .join("");
  if (markup !== spellMarkup) {
    spellMarkup = markup;
    const el = document.getElementById("spell-loadout");
    if (el) el.innerHTML = markup;
  }
}
function setupTouch() {
  const pad = document.getElementById("touch-pad")!,
    stick = document.getElementById("touch-stick")!;
  let pointer = -1;
  const move = (e: PointerEvent) => {
    if (e.pointerId !== pointer || !game) return;
    const r = pad.getBoundingClientRect(),
      dx = e.clientX - r.left - r.width / 2,
      dy = e.clientY - r.top - r.height / 2,
      len = Math.hypot(dx, dy),
      scale = Math.min(38, len) / (len || 1);
    stick.style.transform = `translate(${dx * scale}px,${dy * scale}px)`;
    if (modalKind) return;
    touchMovement = { x: dx / 38, y: dy / 38 };
    syncInput();
  };
  pad.addEventListener("pointerdown", (e) => {
    pointer = e.pointerId;
    pad.setPointerCapture(pointer);
    move(e);
  });
  pad.addEventListener("pointermove", move);
  const end = () => {
    pointer = -1;
    stick.style.transform = "";
    touchMovement = { x: 0, y: 0 };
    syncInput();
  };
  pad.addEventListener("pointerup", end);
  pad.addEventListener("pointercancel", end);
}
function returnToCamp() {
  game = null;
  renderer = null;
  keys.clear();
  spellMarkup = "";
  page = "camp";
  history.replaceState(null, "", "#camp");
  closeModal();
  render();
  window.scrollTo(0, 0);
}

document.addEventListener("click", (e) => {
  const target = (e.target as HTMLElement).closest<HTMLElement>(
    "[data-action]",
  );
  if (!target || target.hasAttribute("disabled")) return;
  e.preventDefault();
  sound.unlock();
  sound.click();
  const action = target.dataset.action!,
    id = target.dataset.id || "";
  if (action === "nav") {
    if (game) return;
    page = id as Page;
    if (FACTIONS.some((f) => f.id === target.dataset.faction))
      outpostFaction = target.dataset.faction as FactionId;
    history.pushState(null, "", `#${page}`);
    render();
    window.scrollTo(0, 0);
  }
  if (action === "hero") {
    save.selectedClass = id as ClassId;
    writeSave();
    render();
  }
  if (action === "zone") {
    if (!zoneUnlocked(save, id)) {
      toast(ZONES.find((z) => z.id === id)!.unlockText, "lock");
      return;
    }
    save.selectedZone = id;
    writeSave();
    render();
  }
  if (action === "begin") startGame();
  if (action === "faction" && FACTIONS.some((f) => f.id === id)) {
    outpostFaction = id as FactionId;
    render();
  }
  if (action === "faction-zone" && zoneUnlocked(save, id)) {
    save.selectedZone = id;
    page = "camp";
    history.pushState(null, "", "#camp");
    writeSave();
    render();
    window.scrollTo(0, 0);
  }
  if (action === "accept-commission" && acceptCommission(save, id)) {
    writeSave();
    render();
    toast("Commission accepted. Set out for its expedition zone.", "book");
  }
  if (action === "claim-commission" && claimCommission(save)) {
    sound.reward();
    writeSave();
    render();
    toast(
      "Commission rewards claimed. You can take another commission.",
      "crown",
    );
  }
  if (action === "abandon-commission" && save.commission) {
    const c = COMMISSIONS.find((c) => c.id === save.commission!.id)!;
    showModal(
      `${modalClose()}<div class="eyebrow">CHANGE YOUR MISSION</div><h2 id="modal-title">Abandon ${c.name}?</h2><p class="modal-intro">Your ${save.commission.progress} / ${c.goal} progress on this commission will be discarded. Reputation already earned from expeditions stays with you. You can accept this commission again at zero progress.</p><div class="save-actions">${button("close-modal", "Keep commission", "button quiet")}${button("confirm-abandon-commission", "Abandon commission", "button primary")}</div>`,
      "commission",
    );
  }
  if (action === "confirm-abandon-commission") {
    abandonCommission(save);
    writeSave();
    closeModal();
    render();
  }
  if (action === "accept-campaign" && acceptCampaign(save, id as FactionId)) {
    writeSave();
    render();
    toast(
      "Campaign chapter accepted. Future expeditions count from now.",
      "book",
    );
  }
  if (
    action === "review-campaign-claim" &&
    campaignReady(save, id as FactionId)
  )
    showModal(
      modalClose() + renderCampaignReview(save, id as FactionId),
      "campaign",
    );
  if (action === "abandon-campaign" && save.campaigns[id as FactionId]?.attempt)
    showModal(
      modalClose() + renderCampaignReview(save, id as FactionId, true),
      "campaign",
    );
  if (
    action === "confirm-campaign-claim" ||
    action === "confirm-campaign-abandon"
  ) {
    const expected = {
      faction: id as FactionId,
      chapter: Number(target.dataset.chapter),
      attempt: target.dataset.attempt || "",
    };
    const succeeded =
      action === "confirm-campaign-claim"
        ? target.dataset.hero === save.selectedClass &&
          claimCampaign(save, id as FactionId, expected)
        : abandonCampaign(save, id as FactionId, expected);
    if (succeeded) {
      writeSave();
      closeModal();
      render();
      sound.reward();
      toast(
        action === "confirm-campaign-claim"
          ? "Campaign rewards claimed. Visit the envoy for your next chapter."
          : "Chapter abandoned. Claimed chapters are retained.",
        "check",
      );
    }
  }
  if (action === "buy-offer" && buyOffer(save, id)) {
    sound.reward();
    writeSave();
    render();
    toast("Quartermaster reward purchased.", "check");
  }
  if (action === "settings") showSettings();
  if (action === "review-technique" && !classTechniqueRestriction(save, id))
    showModal(`${modalClose()}${renderTechniqueReview(save, id)}`, "spellbook");
  if (
    action === "confirm-technique" &&
    target.dataset.hero === save.selectedClass &&
    trainClassTechnique(save, id)
  ) {
    writeSave();
    closeModal();
    render();
    sound.reward();
    toast(`${SPELLS[id].name} learned. Prepare it in your spellbook.`, "book");
  }
  if (
    action === "review-prepare" &&
    [
      ...CLASS_MAP[save.selectedClass].spells,
      ...save.heroes[save.selectedClass].spellbook.learned,
    ].includes(id) &&
    !save.heroes[save.selectedClass].spellbook.prepared.includes(id)
  )
    showModal(
      `${modalClose()}${renderPreparationReview(save, id)}`,
      "spellbook",
    );
  if (
    action === "confirm-prepare" &&
    target.dataset.hero === save.selectedClass &&
    prepareClassSpell(
      save,
      document.querySelector<HTMLSelectElement>("#spellbook-replace")?.value ||
        "",
      id,
    )
  ) {
    writeSave();
    closeModal();
    render();
    toast(`${SPELLS[id].name} prepared for your next expedition.`, "book");
  }
  if (action === "restore-spellbook" && restoreClassSpells(save)) {
    writeSave();
    render();
    toast("Original four abilities restored.", "book");
  }
  if (action === "select-travel" && selectTravel(save, id)) {
    writeSave();
    render();
  }
  if (action === "travel-foot" && selectTravel(save, null)) {
    writeSave();
    render();
  }
  if (action === "review-riding" && !ridingRestriction(save))
    showModal(`${modalClose()}${renderTravelReview(save)}`, "stable");
  if (action === "review-travel" && !travelPurchaseRestriction(save, id))
    showModal(`${modalClose()}${renderTravelReview(save, id)}`, "stable");
  if (
    action === "confirm-riding" &&
    target.dataset.hero === save.selectedClass &&
    Number(target.dataset.rank) ===
      save.heroes[save.selectedClass].travel.riding + 1 &&
    trainRiding(save)
  ) {
    writeSave();
    closeModal();
    render();
    sound.reward();
    toast("Riding trained. Choose a steed at the stable.", "horse");
  }
  if (
    action === "confirm-travel" &&
    target.dataset.hero === save.selectedClass &&
    purchaseTravel(save, id)
  ) {
    writeSave();
    closeModal();
    render();
    sound.reward();
    toast(
      "Travel companion learned. Choose it for your next expedition.",
      "horse",
    );
  }
  if (action === "accept-guild" && acceptProfessionQuest(save, id as TradeId)) {
    writeSave();
    render();
    toast("Guild project accepted. Your future work counts from now.", "book");
  }
  if (
    action === "review-guild-claim" &&
    professionQuestReady(save, id as TradeId)
  )
    showModal(
      `${modalClose()}${renderGuildClaimReview(save, id as TradeId)}`,
      "guild",
    );
  if (
    action === "confirm-guild-claim" &&
    target.dataset.hero === save.selectedClass &&
    target.dataset.attempt === save.professionQuests[id as TradeId]?.attempt &&
    claimProfessionQuest(save, id as TradeId)
  ) {
    writeSave();
    closeModal();
    render();
    sound.reward();
    toast(
      "Guild project claimed. Visit the workbench for your next project.",
      "check",
    );
  }
  if (
    action === "abandon-guild" &&
    save.professionQuests[id as TradeId]?.attempt
  ) {
    showModal(
      `${modalClose()}<div class="eyebrow">GUILD FIELDWORK</div><h2 id="modal-title">Abandon ${PROFESSION_QUESTS[id as TradeId].name} project?</h2><p class="modal-intro">This project's progress will be lost. Claimed projects, mastery equipment and stored materials stay with you. Accept the project again to begin new work.</p><div class="save-actions">${button("close-modal", "Keep project", "button quiet")}${button("confirm-abandon-guild", "Abandon project", "button primary", `data-id="${id}" data-attempt="${save.professionQuests[id as TradeId].attempt}"`)}</div>`,
      "guild",
    );
  }
  if (
    action === "confirm-abandon-guild" &&
    target.dataset.attempt === save.professionQuests[id as TradeId]?.attempt &&
    abandonProfessionQuest(save, id as TradeId)
  ) {
    writeSave();
    closeModal();
    render();
    toast("Guild project abandoned. Claimed rewards are retained.", "book");
  }
  if (action === "accept-trial" && acceptClassTrial(save)) {
    writeSave();
    render();
    toast("Class trial accepted. Only this hero's future runs count.", "book");
  }
  if (action === "claim-trial" && claimClassTrial(save)) {
    sound.reward();
    writeSave();
    render();
    toast("Class chapter rewards claimed.", "crown");
  }
  if (action === "review-enchantment") {
    const item = target.dataset.item || "";
    if (!enchantmentRestriction(save, item, id))
      showModal(
        `${modalClose()}${renderEnchantmentReview(save, item, id)}`,
        "enchantment",
        "enchantment-review",
      );
  }
  if (action === "confirm-enchantment") {
    const item = target.dataset.item || "";
    if (applyEnchantment(save, item, id)) {
      sound.reward();
      writeSave();
      closeModal();
      render();
      toast("Enchantment applied. Its bonus follows the item.", "spark");
    }
  }
  if (action === "controls") showControls();
  if (action === "close-modal") {
    if (modalKind === "settings" && game) resume();
    else closeModal();
  }
  if (action === "accept-epilogue" && acceptEpilogue(save, id)) {
    writeSave();
    render();
    toast(
      "Promise accepted. Win the named expedition, then return to the Journal.",
      "book",
    );
  }
  if (action === "review-epilogue" && epilogueReady(save, id))
    showModal(modalClose() + renderEpilogueReview(save, id), "epilogue");
  if (
    action === "claim-epilogue" &&
    target.dataset.hero === save.selectedClass &&
    claimEpilogue(save, id)
  ) {
    writeSave();
    closeModal();
    render();
    toast("The promise is kept. Your conclusion is recorded.", "check");
  }
  if (action === "partner-active") {
    game?.activatePartner();
    updateHud();
  }
  if (action === "talent") {
    if (learnTalent(save, id)) {
      writeSave();
      render();
      toast("Talent trained. Your next expedition is stronger.", "spark");
    }
  }
  if (
    action === "review-talent-mode" &&
    (id === "classic" || id === "survivor")
  ) {
    const h = save.heroes[save.selectedClass];
    if (id === "survivor" || h.level >= 10)
      showModal(
        `${modalClose()}<div class="eyebrow">TALENT PATH · FREE</div><h2 id="modal-title">Switch to ${id === "classic" ? "Classic" : "Survivor"} talents?</h2><p class="modal-intro">Your ${spentTalents(h)} invested points will be refunded and all current talent bonuses reset. ${id === "classic" ? "This path grants one point per character level from 10, up to 51 at level 60. Vanilla tree structure uses survivor combat bonuses." : "This path grants up to 21 points, starting at level 1."} Equipment and learned techniques stay with your hero.</p><div class="save-actions">${button("close-modal", "Keep current path", "button quiet")}${button("confirm-talent-mode", "Switch talent path", "button primary", `data-id="${id}" data-hero="${save.selectedClass}"`)}</div>`,
        "talent-mode",
      );
  }
  if (
    action === "confirm-talent-mode" &&
    target.dataset.hero === save.selectedClass &&
    (id === "classic" || id === "survivor")
  ) {
    if (changeTalentMode(save, id)) {
      writeSave();
      closeModal();
      render();
      toast("Talent path changed. Your points are ready to invest.", "spark");
    }
  }
  if (action === "respec") {
    if (respec(save)) {
      writeSave();
      render();
      toast("Talent points refunded. Choose a new path.", "spark");
    }
  }
  if (action === "equip") {
    const ring = isRingSlot(GEAR_MAP[id]?.slot || "");
    const target =
      ring &&
      isRingSlot(bagSlot) &&
      !save.heroes[save.selectedClass].equipment[bagSlot]
        ? bagSlot
        : undefined;
    if (
      GEAR_MAP[id]?.rangedType &&
      (GEAR_MAP[id].slot === "ranged" || bagSlot === "ranged")
    ) {
      if (save.inventory.includes(id) && !equipRestriction(save, id, "ranged"))
        showModal(
          modalClose() + renderRangedReview(save, id),
          "ranged-review",
          "weapon-review hand-review ranged-review",
        );
    } else if (
      displacedOffhand(save.heroes[save.selectedClass].equipment, GEAR_MAP[id])
    ) {
      if (save.inventory.includes(id) && !equipRestriction(save, id))
        showModal(
          modalClose() + renderWeaponReview(save, id),
          "weapon-review",
          "weapon-review",
        );
    } else if (
      save.heroes[save.selectedClass].dualWield &&
      dualWieldClass(save.selectedClass) &&
      secondaryWeapon(GEAR_MAP[id])
    ) {
      if (save.inventory.includes(id) && !equipRestriction(save, id))
        showModal(
          modalClose() + renderWeaponHandReview(save, id),
          "weapon-hand-review",
          "weapon-review hand-review",
        );
    } else if (ring && !equipmentTarget(save, id)) {
      if (save.inventory.includes(id) && !equipRestriction(save, id))
        showModal(renderRingReview(save, id), "ring-review", "ring-review");
    } else if (equip(save, id, target)) {
      writeSave();
      render();
      toast(`${GEAR_MAP[id].name} equipped.`);
    }
  }
  if (
    action === "review-ranged" &&
    save.inventory.includes(id) &&
    GEAR_MAP[id]?.rangedType &&
    !equipRestriction(save, id, "ranged")
  )
    showModal(
      modalClose() + renderRangedReview(save, id),
      "ranged-review",
      "weapon-review hand-review ranged-review",
    );
  if (
    action === "equip-ranged-position" &&
    GEAR_MAP[id]?.rangedType &&
    ["weapon", "ranged"].includes(target.dataset.slot || "") &&
    equip(save, id, target.dataset.slot as Slot)
  ) {
    closeModal();
    writeSave();
    render();
    toast(`${GEAR_MAP[id].name} equipped.`);
  }
  if (
    action === "equip-ring" &&
    RING_SLOTS.includes(target.dataset.slot as (typeof RING_SLOTS)[number])
  ) {
    if (equip(save, id, target.dataset.slot as Slot)) {
      closeModal();
      writeSave();
      render();
      toast(`${GEAR_MAP[id].name} equipped.`);
    }
  }
  if (
    action === "equip-two-handed" &&
    displacedOffhand(save.heroes[save.selectedClass].equipment, GEAR_MAP[id]) &&
    equip(save, id)
  ) {
    closeModal();
    writeSave();
    render();
    toast(`${GEAR_MAP[id].name} equipped. Off-hand returned to your satchel.`);
  }
  if (
    action === "review-weapon-training" &&
    advancedWeaponType(id) &&
    WEAPON_TRAINING[id].classes.includes(save.selectedClass)
  )
    showModal(
      modalClose() + renderWeaponTrainingReview(save, id),
      "weapon-type-training",
      "weapon-review",
    );
  if (action === "train-weapon-type" && trainWeaponType(save, id)) {
    closeModal();
    writeSave();
    render();
    toast(
      `${WEAPON_TYPE_LABELS[id as keyof typeof WEAPON_TYPE_LABELS]} learned for this hero.`,
    );
  }
  if (action === "review-repair") {
    const ids =
      id === "loadout"
        ? Object.values(save.heroes[save.selectedClass].equipment)
        : [id];
    if (repairQuote(save, ids).ids.length)
      showModal(
        modalClose() + renderRepairReview(save, ids),
        "equipment-repair",
        "weapon-review",
      );
  }
  if (
    action === "confirm-repair" &&
    repairItems(
      save,
      (target.dataset.items || "").split(","),
      Number(target.dataset.cost),
    )
  ) {
    closeModal();
    writeSave();
    render();
    toast("Equipment restored to full condition.");
  }
  if (
    action === "review-attunement" &&
    save.inventory.includes(id) &&
    !protectedItem(id)
  )
    showModal(
      modalClose() + renderAttunementReview(save, id),
      "item-attunement",
      "weapon-review",
    );
  if (
    action === "confirm-attunement" &&
    attuneEquipment(save, id, target.dataset.affix || "")
  ) {
    closeModal();
    writeSave();
    render();
    toast("Affix applied. This item is now soulbound to your hero.");
  }
  if (action === "buy-ammunition" && buyAmmunition(save)) {
    writeSave();
    render();
    toast("50 ammunition added to storage.");
  }
  if (action === "review-dual-wield" && !dualWieldRestriction(save))
    showModal(
      modalClose() + renderDualWieldTrainingReview(save),
      "dual-wield-training",
      "weapon-review",
    );
  if (action === "train-dual-wield" && trainDualWield(save)) {
    closeModal();
    writeSave();
    render();
    toast("Dual Wield learned for this hero.");
  }
  if (
    action === "equip-weapon-hand" &&
    ["weapon", "offhand"].includes(target.dataset.slot || "") &&
    equip(save, id, target.dataset.slot as Slot)
  ) {
    closeModal();
    writeSave();
    render();
    toast(`${GEAR_MAP[id].name} equipped.`);
  }
  if (
    action === "review-hand-swap" &&
    offhandMultiplier(save.selectedClass, save.heroes[save.selectedClass]) ===
      DUAL_WIELD_RULES.factor
  )
    showModal(
      modalClose() + renderHandSwapReview(save),
      "weapon-hand-swap",
      "weapon-review",
    );
  if (action === "swap-weapon-hands" && swapWeaponHands(save)) {
    closeModal();
    writeSave();
    render();
    toast("Weapon hands swapped.");
  }
  if (action === "unequip" && unequip(save, id as Slot)) {
    writeSave();
    render();
  }
  if (action === "sell" || action === "disenchant") {
    if (sellGear(save, id, action === "disenchant")) {
      writeSave();
      render();
      toast(
        action === "sell"
          ? "Item sold. Gold added to your purse."
          : `Item disenchanted. ${disenchantText(id)} recovered.`,
      );
    }
  }
  if (action === "bag-filter") {
    bagFilter = id;
    render();
  }
  if (action === "toggle-wardrobe") {
    wardrobeFilters.open = !wardrobeFilters.open;
    render();
  }
  if (action === "wardrobe-usable") {
    wardrobeFilters.usable = !wardrobeFilters.usable;
    render();
  }
  if (action === "browse-slot" && SLOTS.includes(id as Slot)) {
    bagSlot = id as Slot;
    page = "armory";
    history.pushState(null, "", "#armory");
    const category = isRingSlot(bagSlot) ? "finger1" : bagSlot;
    if (isWardrobeSlot(category)) {
      wardrobeFilters.open = true;
      wardrobeFilters.slot = category;
      wardrobeFilters.source = "all";
    }
    render();
    document
      .querySelector(
        isWardrobeSlot(category) ? ".wardrobe-section" : ".bag-panel",
      )
      ?.scrollIntoView({ block: "start" });
  }
  if (action === "wardrobe-owned" && save.inventory.includes(id)) {
    bagSlot =
      ["offhand", "ranged"].includes(wardrobeFilters.slot) &&
      gearFitsSlot(GEAR_MAP[id], wardrobeFilters.slot)
        ? (wardrobeFilters.slot as "offhand" | "ranged")
        : GEAR_MAP[id].slot;
    bagFilter = "all";
    render();
    document
      .querySelector(`[data-gear-id="${id}"]`)
      ?.scrollIntoView({ block: "center" });
  }
  if (
    action === "wardrobe-craft" &&
    WARDROBE_CATALOG_SOURCES[id]?.type === "craft"
  ) {
    const source = WARDROBE_CATALOG_SOURCES[id];
    if (source.type === "craft") recipeFilter = source.profession;
    page = "professions";
    history.pushState(null, "", "#professions");
    render();
    document
      .querySelector(`[data-recipe-id="craft_${id}"]`)
      ?.scrollIntoView({ block: "center" });
  }
  if (action === "learn-profession") {
    if (learnProfession(save, id as ProfessionId)) {
      writeSave();
      render();
      toast(`${PROFESSIONS.find((p) => p.id === id)!.name} learned.`);
    }
  }
  if (action === "forget-profession") {
    const p = PROFESSIONS.find((p) => p.id === id)!;
    showModal(
      `${modalClose()}<div class="eyebrow">CHANGE YOUR TRADE</div><h2 id="modal-title">Unlearn ${p.name}?</h2><p class="modal-intro">You will lose your ${p.name} skill rank of ${save.professions[p.id]}. Your trained ranks, specialization and unfinished guild project progress will also be lost. Claimed guild projects and mastery rewards are retained. Your materials, crafted items and learned faction patterns stay with you. You can learn this profession again at skill 1.</p><div class="save-actions">${button("close-modal", "Keep profession", "button quiet")}${button("confirm-forget", "Unlearn profession", "button primary", `data-id="${id}"`)}</div>`,
      "forget",
    );
  }
  if (action === "confirm-forget") {
    forgetProfession(save, id as ProfessionId);
    writeSave();
    closeModal();
    render();
  }
  if (action === "craft" || action === "craft-copy") {
    const name = craft(save, id, action === "craft-copy");
    if (name) {
      sound.reward();
      writeSave();
      render();
      toast(`${name} crafted.`);
    }
  }
  if (action === "train-profession" && trainProfession(save, id as TradeId)) {
    writeSave();
    render();
    toast(
      `${trainingInfo(save, id as TradeId).name} trained. Your skill cap has increased.`,
      "anvil",
    );
  }
  if (
    action === "review-specialization" &&
    !specializationRestriction(save, id)
  ) {
    const spec = SPECIALIZATIONS.find((p) => p.id === id)!;
    const previous = SPECIALIZATIONS.find(
      (p) => p.id === save.professionSpecializations[spec.profession],
    );
    showModal(
      `${modalClose()}<div class="eyebrow">${previous ? "CHANGE YOUR CRAFT" : "A NEW CRAFTING PATH"}</div><h2 id="modal-title">${previous ? "Change to" : "Choose"} ${spec.name}?</h2><p class="modal-intro">${previous ? `Crafting ${previous.name} recipes will become unavailable until you return to that path. ` : ""}This costs ${SPECIALIZATION_REQUIREMENTS.gold} gold. Your profession skill, trained rank, crafted equipment and learned faction patterns stay with you. You can change paths again for the same fee.</p>${specializationRecipePreview(spec.id)}<div class="save-actions">${button("close-modal", previous ? "Keep current path" : "Keep exploring", "button quiet")}${button("confirm-specialization", `Choose ${spec.name} · ${SPECIALIZATION_REQUIREMENTS.gold} G`, "button primary", `data-id="${spec.id}"`)}</div>`,
      "specialization",
      "specialization-review",
    );
  }
  if (action === "confirm-specialization" && specializeProfession(save, id)) {
    writeSave();
    closeModal();
    render();
    toast(
      "Specialization learned. Your new recipe is in the crafting book.",
      "anvil",
    );
  }
  if (action === "claim") {
    if (claimQuest(save, id)) {
      sound.reward();
      writeSave();
      render();
      toast("Quest rewards claimed. Your adventure continues.", "crown");
    }
  }
  if (action === "upgrade" && game) {
    if (game.chooseUpgrade(id)) {
      closeModal();
      sound.reward();
      updateHud();
    }
  }
  if (action === "fieldwork" && game) {
    game.gatheringOpen = !game.gatheringOpen;
    updateHud();
  }
  if (
    action === "gather-focus" &&
    game &&
    ["eligible", "herbs", "ore", "fish"].includes(id)
  ) {
    game.gatheringFocus = id as typeof game.gatheringFocus;
    updateHud();
  }
  if (action === "dungeon-continue" && game?.continueDungeon(id)) {
    keys.clear();
    closeModal();
    sound.reward();
    updateHud();
  }
  if (action === "dungeon-return" && game?.checkpoint) {
    closeModal();
    game.finish(false);
  }
  if (action === "active") game?.activate();
  if (action === "travel" && game) {
    game.toggleTravel();
    updateHud();
  }
  if (action === "interact") game?.interact();
  if (action === "shoot") game?.attackEquipment();
  if (action === "blessing" && game?.chooseBlessing(id)) {
    closeModal();
    sound.reward();
    updateHud();
  }
  if (action === "leave-shrine" && game?.leaveShrine()) {
    closeModal();
    updateHud();
  }
  if (action === "dash") game?.dash();
  if (action === "heal") {
    if (!game?.usePotion())
      toast(
        save.supplies.potions <= 0
          ? "No healing supplies. Craft more at camp."
          : "Health is already full.",
        "info",
      );
  }
  if (action === "bomb") {
    if (!game?.useBomb())
      toast("No bombs. Learn Engineering and craft them at camp.", "info");
  }
  if (action === "pause") showPause();
  if (action === "resume") resume();
  if (action === "abandon") {
    closeModal();
    game?.finish(false);
  }
  if (action === "camp") returnToCamp();
  if (action === "export") {
    const blob = new Blob([JSON.stringify(save, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "wow-survivors-save.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Save exported. Keep it for your next adventure.");
  }
  if (action === "import") document.getElementById("import-file")?.click();
  if (action === "confirm-import" && pendingImport) {
    save = pendingImport;
    pendingImport = null;
    sound.enabled = save.settings.sound;
    music.configure(save.settings.music, save.settings.musicVolume);
    music.unlock();
    writeSave();
    closeModal();
    render();
    toast("Adventure restored from your save.");
  }
});
document.addEventListener("change", async (e) => {
  const select = e.target as HTMLSelectElement;
  if (select.id === "coop-hero") {
    partnerClass = Object.hasOwn(CLASS_MAP, select.value)
      ? (select.value as ClassId)
      : "";
    render();
    return;
  }
  if (select.id === "bag-slot") {
    bagSlot = select.value as Slot | "all";
    render();
    return;
  }
  if (select.id === "wardrobe-slot" || select.id === "wardrobe-source") {
    if (select.id === "wardrobe-slot")
      wardrobeFilters.slot = select.value as WardrobeFilters["slot"];
    else wardrobeFilters.source = select.value as WardrobeFilters["source"];
    render();
    return;
  }
  if ((e.target as HTMLSelectElement).id === "enchant-target") {
    enchantTarget = (e.target as HTMLSelectElement).value;
    render();
    return;
  }
  if ((e.target as HTMLSelectElement).id === "guild-filter") {
    guildFilter = (e.target as HTMLSelectElement).value as GuildFilter;
    render();
  }
  if ((e.target as HTMLSelectElement).id === "recipe-filter") {
    recipeFilter = (e.target as HTMLSelectElement).value;
    render();
    return;
  }
  const el = e.target as HTMLInputElement;
  if (el.id === "music-volume") {
    save.settings.musicVolume = Number(el.value);
    music.configure(save.settings.music, save.settings.musicVolume);
    music.unlock();
    writeSave();
    refreshMusic();
  }
  if (el.id === "hero-switch") {
    save.selectedClass = el.value as ClassId;
    writeSave();
    render();
  }
  if (el.dataset.setting) {
    const key = el.dataset.setting as
      "sound" | "particles" | "screenShake" | "animation" | "music";
    save.settings[key] = el.checked;
    sound.enabled = save.settings.sound;
    music.configure(save.settings.music, save.settings.musicVolume);
    if (key === "music") music.unlock();
    refreshMusic();
    writeSave();
    if (renderer) {
      renderer.particles = save.settings.particles;
      renderer.shake = save.settings.screenShake;
      renderer.animation = save.settings.animation;
    }
  }
  if (el.id === "import-file" && el.files?.[0]) {
    try {
      if (el.files[0].size > 1_000_000)
        throw new Error("Save files must be smaller than 1 MB.");
      pendingImport = validateSave(JSON.parse(await el.files[0].text()));
      showModal(
        `${modalClose()}<div class="eyebrow">RESTORE AN ADVENTURE</div><h2 id="modal-title">Import this save?</h2><p class="modal-intro">This replaces the progress currently saved in this browser. The imported adventure has <b>${pendingImport.gold} gold</b>, <b>${pendingImport.totals.runs} expeditions</b> and a level <b>${pendingImport.heroes[pendingImport.selectedClass].level} ${CLASS_MAP[pendingImport.selectedClass].name}</b>. Export your current save first if you want to keep it.</p><div class="save-actions">${button("close-modal", "Cancel", "button quiet")}${button("confirm-import", "Import adventure", "button primary")}</div>`,
        "import",
      );
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "Could not read this save file.",
        "info",
      );
      el.value = "";
    }
  }
});
document.addEventListener("change", (e) => {
  if (game && (e.target as HTMLElement).id === "gather-locked") {
    game.gatheringLocked = (e.target as HTMLInputElement).checked;
    updateHud();
  }
});
function refreshControllerHints() {
  updateControllerHints(controllerMode, !!game, !!modalKind);
  const status = document.getElementById("controller-status");
  if (status && status.textContent !== controllerStatus)
    status.textContent = controllerStatus;
}
function setControllerMode(active: boolean) {
  if (controllerMode === active) return;
  controllerMode = active;
  refreshControllerHints();
}
function resetMovement() {
  keys.clear();
  touchMovement = { x: 0, y: 0 };
  controllerMovement = { x: 0, y: 0 };
  controller.requireNeutral();
  game?.setInput(0, 0);
  game?.setPartnerInput(0, 0);
}
function goBack() {
  if (game && !game.ended) {
    if (game.shrineChoice) {
      game.leaveShrine();
      closeModal();
      updateHud();
      return;
    }
    if (game.choosing || game.checkpoint) return;
    if (game.paused) resume();
    else showPause();
  } else if (modalKind === "result") returnToCamp();
  else if (modalKind) closeModal();
}
function pollController(now: number, delta: number) {
  let devices: (Gamepad | null)[] = [];
  const apiAvailable = typeof navigator.getGamepads === "function";
  try {
    if (apiAvailable) devices = [...navigator.getGamepads()];
    else
      controllerStatus =
        "Controller access is unavailable in this browser. Keyboard and touch controls are ready.";
  } catch {
    controllerStatus =
      "Controller access is blocked. Open the game directly over HTTPS or localhost; keyboard and touch controls are ready.";
  }
  if (devices.some((p) => p?.connected)) {
    controllerStatus = devices.some(
      (p) => p?.connected && p.mapping === "standard",
    )
      ? "Standard controller detected. Press and release a button to take control."
      : "This controller has an unsupported layout. Use a standard-mapped controller or keyboard and touch controls.";
  }
  const sample = controller.sample(
    devices,
    now,
    !document.hidden && document.hasFocus(),
  );
  controllerMovement = sample.movement;
  if (sample.disconnected) {
    resetMovement();
    setControllerMode(false);
    showPause();
    toast(
      "Controller disconnected. Reconnect, release the controls and resume when ready.",
      "info",
    );
  }
  if (controller.index !== null)
    controllerStatus =
      "Standard controller connected. Release controls between screens.";
  else if (
    !devices.some((p) => p?.connected) &&
    apiAvailable &&
    !controllerStatus.includes("blocked")
  )
    controllerStatus = "Connect a controller and press a button to detect it.";
  const status = document.getElementById("controller-status");
  if (status && status.textContent !== controllerStatus)
    status.textContent = controllerStatus;
  if (sample.activity) setControllerMode(true);
  syncInput();
  if (!sample.activity) return;
  // Handle only one press per frame. A screen transition never consumes a second action.
  if (sample.pressed.includes(9)) {
    if (!modalKind || modalKind === "pause") goBack();
    return;
  }
  const menu = !game || !!modalKind;
  if (menu) {
    const root = modalKind ? modalRoot : app;
    ensureControllerFocus(root);
    if (sample.pressed.includes(1)) {
      goBack();
      return;
    }
    if (sample.pressed.includes(0)) {
      confirmControllerFocus(root);
      return;
    }
    if (sample.pressed.includes(6) || sample.pressed.includes(7)) {
      cycleControllerFocus(root, sample.pressed.includes(7) ? 1 : -1);
      return;
    }
    if (
      !game &&
      !modalKind &&
      (sample.pressed.includes(4) || sample.pressed.includes(5))
    ) {
      const tabs = [...app.querySelectorAll<HTMLElement>(".nav-link")];
      const current = tabs.findIndex((el) => el.classList.contains("active"));
      const next =
        tabs[
          (current + (sample.pressed.includes(5) ? 1 : -1) + tabs.length) %
            tabs.length
        ];
      next?.click();
      app.querySelector<HTMLElement>(".nav-link.active")?.focus();
      controller.requireNeutral();
      return;
    }
    if (sample.direction) moveControllerFocus(root, sample.direction);
    if (sample.scroll) scrollControllerMenu(root, sample.scroll * 650 * delta);
  } else {
    const binding = CONTROLLER_BINDINGS.find((b) =>
      sample.pressed.includes(b.button),
    );
    if (binding)
      app
        .querySelector<HTMLElement>(`[data-action="${binding.action}"]`)
        ?.click();
  }
}
document.addEventListener("pointerdown", () => {
  setControllerMode(false);
  music.unlock();
});
document.addEventListener("keydown", (e) => {
  music.unlock();
  setControllerMode(false);
  if (modalKind && e.key === "Tab") {
    const list = [
      ...modalRoot.querySelectorAll<HTMLElement>(
        'button:not([disabled]),input,select,[tabindex="0"]',
      ),
    ];
    if (list.length) {
      if (e.shiftKey && document.activeElement === list[0]) {
        e.preventDefault();
        list.at(-1)!.focus();
      } else if (!e.shiftKey && document.activeElement === list.at(-1)) {
        e.preventDefault();
        list[0].focus();
      }
    }
    return;
  }
  const control = e.target as HTMLElement;
  if (
    control.matches("input,select,textarea") &&
    !(game && control.id === "gather-locked" && e.key !== " ")
  )
    return;
  if (e.key === "Escape" || (game && e.key.toLowerCase() === "p")) {
    e.preventDefault();
    goBack();
    return;
  }
  if (!game) return;
  if (e.key.toLowerCase() === "g" && !modalKind && !game.ended) {
    e.preventDefault();
    game.gatheringOpen = !game.gatheringOpen;
    updateHud();
    return;
  }
  if (game.checkpoint) {
    const boon = DUNGEON_BOONS[Number(e.key) - 1];
    if (
      ["1", "2", "3"].includes(e.key) &&
      boon &&
      game.continueDungeon(boon.id)
    ) {
      e.preventDefault();
      keys.clear();
      closeModal();
      sound.reward();
      updateHud();
    }
    return;
  }
  if (game.shrineChoice) {
    const b = BLESSINGS[Number(e.key) - 1];
    if (["1", "2", "3"].includes(e.key) && b && game.chooseBlessing(b.id)) {
      e.preventDefault();
      closeModal();
      sound.reward();
      updateHud();
    }
    return;
  }
  if (game.choosing) {
    if (["1", "2", "3"].includes(e.key)) {
      e.preventDefault();
      const u = game.upgrades[Number(e.key) - 1];
      if (u) {
        game.chooseUpgrade(u.id);
        closeModal();
        sound.reward();
        updateHud();
      }
    }
    return;
  }
  if (game.paused || game.ended) return;
  if (
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Shift"].includes(
      e.key,
    )
  )
    e.preventDefault();
  keys.add(e.key.toLowerCase());
  syncInput();
  if (e.repeat) return;
  if (e.key === "Enter" && game.partner) {
    e.preventDefault();
    game.activatePartner();
  }
  if (e.key === " ") game.activate();
  if (e.key === "Shift") game.dash();
  if (e.key.toLowerCase() === "q") game.usePotion();
  if (e.key.toLowerCase() === "e") game.useBomb();
  if (e.key.toLowerCase() === "f") game.interact();
  if (e.key.toLowerCase() === "t") game.attackEquipment();
  if (e.key.toLowerCase() === "r") {
    game.toggleTravel();
    updateHud();
  }
});
document.addEventListener("keyup", (e) => {
  keys.delete(e.key.toLowerCase());
  syncInput();
});
function syncInput() {
  if (!game) return;
  if (modalKind || game.paused || game.ended) {
    game.setInput(0, 0);
    game.setPartnerInput(0, 0);
    return;
  }
  const keyboard = {
    x:
      Number(keys.has("d") || (!game.partner && keys.has("arrowright"))) -
      Number(keys.has("a") || (!game.partner && keys.has("arrowleft"))),
    y:
      Number(keys.has("s") || (!game.partner && keys.has("arrowdown"))) -
      Number(keys.has("w") || (!game.partner && keys.has("arrowup"))),
  };
  const movement =
    touchMovement.x || touchMovement.y
      ? touchMovement
      : keyboard.x || keyboard.y
        ? keyboard
        : controllerMovement;
  game.setInput(movement.x, movement.y);
  game.setPartnerInput(
    Number(keys.has("arrowright")) - Number(keys.has("arrowleft")),
    Number(keys.has("arrowdown")) - Number(keys.has("arrowup")),
  );
}
window.addEventListener("blur", () => {
  music.hold();
  resetMovement();
  if (
    game &&
    !game.ended &&
    !game.choosing &&
    !game.shrineChoice &&
    !game.checkpoint &&
    !game.paused
  )
    showPause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    music.hold();
    resetMovement();
    if (
      game &&
      !game.ended &&
      !game.choosing &&
      !game.shrineChoice &&
      !game.checkpoint &&
      !game.paused
    )
      showPause();
  }
});
window.addEventListener("resize", () => renderer?.resize());
window.addEventListener("popstate", () => {
  if (game) return;
  page = pageFromUrl();
  render();
});
let previous = performance.now(),
  accumulator = 0,
  hudTimer = 0;
function frame(now: number) {
  const delta = Math.min((now - previous) / 1000, 0.1);
  previous = now;
  pollController(now, delta);
  if (game && renderer) {
    accumulator += delta;
    while (accumulator >= 1 / 60) {
      game.update(1 / 60);
      accumulator -= 1 / 60;
    }
    renderer.render(delta);
    hudTimer += delta;
    if (hudTimer >= 0.1) {
      updateHud();
      hudTimer = 0;
    }
  } else accumulator = 0;
  refreshMusic();
  requestAnimationFrame(frame);
}
render();
requestAnimationFrame(frame);
if (loaded.recovered)
  toast(
    "A damaged save could not be read. A fresh adventure is ready.",
    "info",
  );
