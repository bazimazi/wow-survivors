import { CLASS_MAP, GEAR_MAP, MATERIALS, STAT_LABELS, ZONES } from "./content";
import type { Stat } from "./content";
import {
  PROFESSION_QUESTS,
  PROFESSION_TRADES,
  PROFESSION_PROJECTS,
  professionGoals,
  professionDelivery,
  masteryGearId,
} from "./profession-quests";
import type { ProfessionMetric } from "./profession-quests";
import {
  professionProjectRestriction,
  professionQuestClaimRestriction,
  professionQuestReady,
  tradeSkill,
} from "./progression";
import type { SaveData, RunRecord } from "./progression";
import type { TradeId } from "./training";
import { TRAINING_RANKS } from "./training";
import { icon } from "./icons";

export type GuildFilter = "known" | "all" | TradeId;
export function professionGoalLabel(
  trade: TradeId,
  chapter: number,
  metric: ProfessionMetric,
): string {
  const q = PROFESSION_QUESTS[trade],
    p = PROFESSION_PROJECTS[chapter];
  if (metric === "gathered")
    return `Collect ${MATERIALS[professionDelivery(trade, chapter)].name} directly in ${q.destinations![chapter].map((id) => ZONES.find((z) => z.id === id)!.name).join(" or ")}`;
  if (metric === "crafts")
    return `Complete grade ${p.label} crafts${trade === "enchanting" ? " or apply grade-matched equipment enchants" : ""}`;
  return q.field === "healing"
    ? "Use healing supplies while injured"
    : q.field === "bombs"
      ? "Hit an enemy with a bomb"
      : "Survive 60 seconds with a meal on an expedition";
}
function masteryPreview(trade: TradeId): string {
  const g = GEAR_MAP[masteryGearId(trade)];
  return `<div class="guild-mastery">${icon(g.icon, 24)}<div><small>MASTERY REWARD · EPIC TRINKET · LEVEL 20</small><b>${g.name}</b><p>${Object.entries(
    g.stats,
  )
    .map(
      ([stat, value]) =>
        `+${value}${["power", "crit", "haste", "speed", "magnet"].includes(stat) ? "%" : ""} ${STAT_LABELS[stat as Stat]}`,
    )
    .join(" · ")}</p></div></div>`;
}
function objectives(s: SaveData, trade: TradeId, run?: RunRecord): string {
  const quest = s.professionQuests[trade],
    goals = professionGoals(trade, quest.chapter);
  const proof = run?.professionProof?.find(
    (p) =>
      p.trade === trade &&
      p.chapter === quest.chapter &&
      p.attempt === quest.attempt,
  );
  return `<ul class="guild-objectives">${(
    Object.keys(goals) as ProfessionMetric[]
  )
    .filter((metric) => goals[metric])
    .map((metric) => {
      const pending = metric === "crafts" ? 0 : proof?.[metric] || 0;
      const value = Math.min(goals[metric], quest.progress[metric] + pending);
      return `<li><span>${professionGoalLabel(trade, quest.chapter, metric)}</span><strong>${value} / ${goals[metric]}</strong><div class="progress-track" role="progressbar" aria-label="${PROFESSION_QUESTS[trade].name} ${metric}" aria-valuemin="0" aria-valuemax="${goals[metric]}" aria-valuenow="${value}"><i style="width:${(value / goals[metric]) * 100}%"></i></div></li>`;
    })
    .join("")}</ul>`;
}
export function renderProfessionGuild(
  s: SaveData,
  filter: GuildFilter,
): string {
  const trades = PROFESSION_TRADES.filter(
    (trade) =>
      filter === "all" ||
      (filter === "known" ? tradeSkill(s, trade) > 0 : trade === filter),
  );
  return `<section class="profession-guild" aria-label="Profession quests"><div class="section-heading"><div><div class="eyebrow">A TRADE WORTH MASTERING</div><h2>The guild workbench</h2></div><span class="subtle-label">${PROFESSION_TRADES.reduce((sum, t) => sum + s.professionQuests[t].chapter, 0)} / 48 projects claimed</span></div><p>Take on optional projects from camp mentors. Accept before you craft or set out; only future work counts. Projects and rewards are shared by your roster. Complete all four projects and reach skill 300 to earn a mastery trinket.</p><div class="guild-toolbar"><label for="guild-filter">Show guild projects</label><select id="guild-filter">${[["known", "Known professions"], ["all", "All professions"], ...PROFESSION_TRADES.map((t) => [t, PROFESSION_QUESTS[t].name])].map(([id, label]) => `<option value="${id}" ${filter === id ? "selected" : ""}>${label}</option>`).join("")}</select><span>Trainer ranks remain available independently.</span></div><div class="guild-grid">${trades
    .map((trade) => {
      const q = PROFESSION_QUESTS[trade],
        quest = s.professionQuests[trade],
        p = PROFESSION_PROJECTS[quest.chapter];
      const restriction = professionProjectRestriction(s, trade),
        ready = professionQuestReady(s, trade);
      const material = p ? professionDelivery(trade, quest.chapter) : null;
      return `<article class="guild-card ${ready ? "ready" : ""}" data-guild-trade="${trade}"><div class="guild-card-heading">${icon(q.icon, 28)}<div><small>${q.mentor}</small><h3>${q.name}</h3></div><span>${quest.chapter}/4</span></div><ol class="guild-timeline" aria-label="${q.name} project ranks">${TRAINING_RANKS.map((rank, i) => `<li class="${i < quest.chapter ? "claimed" : i === quest.chapter ? "current" : ""}"><span>${i < quest.chapter ? "✓" : i + 1}</span>${rank.name}</li>`).join("")}</ol>${p ? `<h4>${q.projects[quest.chapter]}</h4><p class="guild-gates">${TRAINING_RANKS[p.rank - 1].name} · skill ${p.skill}+ · character level ${p.level}+</p>${objectives(s, trade)}${quest.chapter === 2 && ["blacksmithing", "engineering", "leatherworking"].includes(trade) ? `<p class="guild-gates">Grade III work uses specialization recipes at skill 150.${trade === "engineering" ? " Choose a Gnomish or Goblin path below." : " A learned faction pattern at skill 125 also counts."}</p>` : ""}<p class="guild-delivery ${s.materials[material!] < p.delivery ? "insufficient" : ""}">${icon(MATERIALS[material!].icon, 17)} Turn in ${p.delivery} ${MATERIALS[material!].name} <small>${s.materials[material!]} in storage</small></p><p class="guild-rewards">Reward: ${p.gold} G · ${p.xp} selected hero XP${quest.chapter === 3 ? " · mastery trinket" : ""}</p>${quest.chapter === 3 ? `<p class="guild-gates">Final turn-in also requires skill 300. Current skill: ${tradeSkill(s, trade)} / 300.</p>` : ""}<button class="button ${ready ? "primary" : "quiet"}" data-action="${quest.attempt ? "review-guild-claim" : "accept-guild"}" data-id="${trade}" ${quest.attempt ? (!ready ? "disabled" : "") : restriction ? "disabled" : ""}>${quest.attempt ? (ready ? "Review turn-in" : "Project in progress") : "Accept project"}</button>${quest.attempt ? `<button class="text-button guild-abandon" data-action="abandon-guild" data-id="${trade}">Abandon project</button><small class="guild-state">${professionQuestClaimRestriction(s, trade) || "Ready to turn in at camp."}</small>` : restriction ? `<small class="guild-state">${restriction}</small>` : ""}` : `<p class="guild-completed">${icon("check", 20)} All four projects claimed. Your permanent mastery trinket is available in the Armory.</p>`}${masteryPreview(trade)}</article>`;
    })
    .join(
      "",
    )}</div><p class="page-note">Gathering requires the specified grade and region; caches and other material rewards do not count. Crafting uses the recipe's grade, with one credit per successful craft. Meals count once per expedition after one minute. Healing and bombs use your shared supplies. Progress saves on victory, defeat or return to camp.</p></section>`;
}
export function renderGuildClaimReview(s: SaveData, trade: TradeId): string {
  const quest = s.professionQuests[trade],
    p = PROFESSION_PROJECTS[quest.chapter],
    material = professionDelivery(trade, quest.chapter);
  return `<div class="eyebrow">${PROFESSION_QUESTS[trade].name.toUpperCase()} · PROJECT ${quest.chapter + 1}</div><h2 id="modal-title">Turn in ${PROFESSION_QUESTS[trade].projects[quest.chapter]}</h2><p class="modal-intro">${PROFESSION_QUESTS[trade].mentor} is ready to review your work.</p><div class="guild-review"><p><b>Deliver</b><span>${p.delivery} ${MATERIALS[material].name}</span></p><p><b>Remaining in storage</b><span>${s.materials[material] - p.delivery}</span></p><p><b>Receive</b><span>${p.gold} G · ${p.xp} ${CLASS_MAP[s.selectedClass].name} XP</span></p></div>${quest.chapter === 3 ? masteryPreview(trade) : ""}<p class="page-note">Turn-in consumes the displayed materials and completes this project for your roster.${quest.chapter === 3 ? " Your mastery trinket is permanent and can be equipped by any level 20 hero." : " Accept the next project when you meet its requirements."}</p><button class="button primary full-width" data-action="confirm-guild-claim" data-id="${trade}" data-attempt="${quest.attempt}" data-hero="${s.selectedClass}">Turn in materials and claim rewards</button><button class="button quiet full-width" data-action="close-modal">Keep working</button>`;
}
export function renderProfessionQuestStatus(
  s: SaveData,
  run?: RunRecord,
): string {
  const active = PROFESSION_TRADES.filter((t) => s.professionQuests[t].attempt);
  if (!active.length) return "";
  return `<details class="guild-status" ${run ? "" : "open"}><summary>Guild projects · ${active.length} active</summary><p>${run ? "This expedition's progress is recorded when you return." : "Progress saved. Review completed projects at the guild workbench."}</p>${active.map((trade) => `<div><b>${PROFESSION_QUESTS[trade].name} · ${PROFESSION_QUESTS[trade].projects[s.professionQuests[trade].chapter]}</b>${objectives(s, trade, run)}${!run && professionQuestReady(s, trade) ? `<small>Ready to turn in.</small>` : ""}</div>`).join("")}</details>`;
}
export function renderProfessionQuestCamp(s: SaveData): string {
  const active = PROFESSION_TRADES.filter((t) => s.professionQuests[t].attempt);
  if (!active.length) return "";
  const ready = active.filter((t) => professionQuestReady(s, t)).length;
  return `<div class="trial-camp guild-camp">${icon("anvil", 25)}<div><b>The guild workbench</b><p>${ready ? `${ready} project${ready === 1 ? "" : "s"} ready to turn in.` : `${active.length} active project${active.length === 1 ? "" : "s"}. Prepare crafts at camp or continue fieldwork on your next expedition.`}</p></div><button class="button quiet" data-action="nav" data-id="professions">View guild projects ${icon("arrow", 15)}</button></div>`;
}
