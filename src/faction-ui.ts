import {
  CLASS_MAP,
  GEAR_MAP,
  PROFESSIONS,
  RECIPES,
  STAT_LABELS,
  ZONES,
} from "./content";
import type { Stat } from "./content";
import {
  COMMISSIONS,
  FACTIONS,
  QUARTERMASTER_OFFERS,
  reputationStanding,
} from "./factions";
import { renderCampaign } from "./campaign-ui";
import type { FactionId } from "./factions";
import {
  commissionContribution,
  offerRestriction,
  zoneUnlocked,
} from "./progression";
import type { RunRecord, SaveData } from "./progression";
import { icon } from "./icons";

const zoneName = (id: string) => ZONES.find((z) => z.id === id)!.name;
const statText = (stat: string, value: number) =>
  `+${value}${["power", "haste", "crit", "speed", "magnet"].includes(stat) ? "%" : ""} ${STAT_LABELS[stat as Stat]}`;
export function renderCommissionStatus(
  s: SaveData,
  run?: Pick<RunRecord, "zoneId" | "kills" | "encounters" | "victory">,
): string {
  const c = COMMISSIONS.find((c) => c.id === s.commission?.id);
  if (!c || !s.commission) return "";
  const progress = Math.min(
    c.goal,
    s.commission.progress + (run ? commissionContribution(c.id, run) : 0),
  );
  return `<div class="commission-status"><span class="faction-small-icon">${icon(c.icon, 20)}</span><div><small>${progress >= c.goal ? "COMMISSION READY" : run ? "COMMISSION ON RETURN" : "ACTIVE COMMISSION"}</small><b>${c.name}</b><span>${zoneName(c.zoneId)} · ${progress} / ${c.goal} ${c.metric === "victory" ? "boss defeated" : c.metric === "encounters" ? "landmarks" : "enemies"}</span></div></div>`;
}
export function renderFactionCamp(s: SaveData): string {
  const f = FACTIONS.find((f) => f.zoneId === s.selectedZone);
  if (!f)
    return s.commission
      ? `<section class="camp-outpost">${renderCommissionStatus(s)}<p>This commission advances in its matching outdoor zone.</p></section>`
      : "";
  const standing = reputationStanding(s.reputation[f.id]);
  return `<section class="camp-outpost" style="--faction-color:${f.color}" aria-label="Faction objective"><div class="camp-outpost-heading"><span class="faction-small-icon">${icon(f.icon, 22)}</span><div><small>VISITING EMISSARY</small><b>${f.name}</b><span>${standing.name} · ${s.reputation[f.id]} reputation</span></div><button class="text-button" data-action="nav" data-id="outposts" data-faction="${f.id}">Visit outpost ${icon("arrow", 16)}</button></div>${s.commission ? renderCommissionStatus(s) : "<p>Accept a commission to earn extra gold, character XP and reputation on your next expeditions.</p>"}</section>`;
}
export function renderFactionResult(
  s: SaveData,
  run: RunRecord,
  earned: number,
): string {
  const f = FACTIONS.find((f) => f.zoneId === run.zoneId);
  if (!f) return renderCommissionStatus(s);
  const standing = reputationStanding(s.reputation[f.id]);
  return `<div class="result-reputation" style="--faction-color:${f.color}">${icon(f.icon, 22)}<div><b>${earned ? `+${earned} reputation` : standing.name === "Exalted" ? "Exalted standing" : "No reputation earned"}</b><span>${f.name} · ${standing.name} · ${s.reputation[f.id]} / 2,000</span></div></div>${renderCommissionStatus(s)}`;
}
export function renderOutposts(s: SaveData, factionId: FactionId): string {
  const f = FACTIONS.find((f) => f.id === factionId)!;
  const points = s.reputation[f.id],
    standing = reputationStanding(points),
    unlocked = zoneUnlocked(s, f.zoneId);
  const active = COMMISSIONS.find((c) => c.id === s.commission?.id);
  return `<div class="outpost-selector" aria-label="Choose faction">${FACTIONS.map((faction) => `<button class="outpost-choice ${faction.id === f.id ? "selected" : ""}" style="--faction-color:${faction.color}" data-action="faction" data-id="${faction.id}" aria-pressed="${faction.id === f.id}"><span class="faction-emblem">${icon(faction.icon, 28)}</span><span><b>${faction.name}</b><small>${zoneName(faction.zoneId)} · ${reputationStanding(s.reputation[faction.id]).name}</small></span>${icon(faction.id === f.id ? "check" : "chevron", 17)}</button>`).join("")}</div>
  <section class="outpost-banner" style="--faction-color:${f.color}"><div class="outpost-banner-copy"><span class="eyebrow">${f.name.toUpperCase()} · VISITING EMISSARY</span><h2>${f.title}</h2><p>${f.description}</p><button class="button quiet" data-action="faction-zone" data-id="${f.zoneId}" ${unlocked ? "" : "disabled"}>${icon(unlocked ? "map" : "lock", 16)} ${unlocked ? `Prepare in ${zoneName(f.zoneId)}` : ZONES.find((z) => z.id === f.zoneId)!.unlockText}</button></div><div class="standing-panel"><span class="faction-emblem large">${icon(f.icon, 42)}</span><b>${standing.name}</b><span>${points.toLocaleString()} total reputation</span><div class="progress-track" role="progressbar" aria-label="Reputation toward next standing" aria-valuemin="${standing.points}" aria-valuemax="${standing.next?.points || 2000}" aria-valuenow="${points}"><i style="width:${standing.progress * 100}%"></i></div><small>${standing.next ? `${standing.next.points - points} to ${standing.next.name}` : "Highest standing reached"}</small></div></section>
  <p class="outpost-explanation">Every return from ${zoneName(f.zoneId)} earns reputation for enemies defeated, survival, completed landmarks and a final-boss victory. Commissions add bonus rewards. Reputation is shared by all nine heroes.</p>
  <details class="reputation-rules"><summary>Reputation rewards</summary><p>Every 12 enemies: +1 reputation (up to 60). Every 30 seconds survived: +1 (up to 12). Each completed landmark: +15. Final-boss victory: +80. Earned reputation returns even if you fall. At Exalted, reputation stops at 2,000.</p></details>
  ${renderCampaign(s, factionId)}
  ${active ? `<section class="active-commission" aria-label="Active commission">${renderCommissionStatus(s)}<div class="commission-controls"><span class="muted">Reward XP goes to your ${CLASS_MAP[s.selectedClass].name}.</span>${s.commission!.progress >= active.goal ? `<button class="button primary" data-action="claim-commission">Claim ${active.gold} G · ${active.xp} XP · ${active.reputation} rep</button>` : `<span class="muted">Progress carries across expeditions.</span>`}<button class="text-button" data-action="abandon-commission">Abandon commission</button></div></section>` : ""}
  <div class="section-heading"><div><h2>Field commissions</h2><p>Accept one before setting out. Claim its rewards here, then take it again.</p></div><span class="subtle-label">${s.totals.commissions} COMPLETED</span></div><div class="commission-grid">${COMMISSIONS.filter(
    (c) => c.faction === f.id,
  )
    .map(
      (c) =>
        `<article class="commission-card ${active?.id === c.id ? "accepted" : ""}"><div class="commission-card-heading">${icon(c.icon, 24)}<h3>${c.name}</h3></div><p>${c.description}</p><div class="commission-goal">${c.goal} ${c.metric === "victory" ? "final boss" : c.metric === "encounters" ? "landmarks" : "enemies"} · ${zoneName(c.zoneId)}</div><div class="commission-rewards">${icon("coin", 14)} ${c.gold} G <span>·</span> ${c.xp} XP <span>·</span> ${c.reputation} rep</div><button class="button quiet" data-action="accept-commission" data-id="${c.id}" ${active || !unlocked ? "disabled" : ""}>${active?.id === c.id ? "Accepted" : active ? "Finish your active commission" : !unlocked ? "Unlock this expedition" : "Accept commission"}</button></article>`,
    )
    .join("")}</div>
  <div class="section-heading quartermaster-heading"><div><h2>Quartermaster</h2><p>Reputation opens the door. Gold purchases the reward.</p></div><span class="subtle-label">FRIENDLY · HONORED · REVERED · EXALTED</span></div><div class="quartermaster-grid">${QUARTERMASTER_OFFERS.filter(
    (o) => o.faction === f.id,
  )
    .map((o) => {
      const recipe = RECIPES.find((r) => r.id === o.recipeId);
      const item = GEAR_MAP[o.gearId || recipe!.output];
      const restriction = offerRestriction(s, o.id);
      const owned = o.gearId
        ? s.inventory.includes(o.gearId)
        : s.learnedRecipes.includes(o.recipeId!);
      return `<article class="quartermaster-card ${owned ? "owned" : ""}" data-offer="${o.id}"><div class="quartermaster-item"><span class="ability-icon">${icon(item.icon, 28)}</span><div><small>${recipe ? "PROFESSION PATTERN" : `${item.rarity.toUpperCase()} · ${item.slot.toUpperCase()}`}</small><h3>${recipe ? `Pattern: ${recipe.name}` : item.name}</h3></div></div><p>${recipe ? `Teaches ${PROFESSIONS.find((p) => p.id === recipe.profession)!.name} to craft this item. The pattern stays learned if you change professions.` : item.description}</p><div class="gear-bonuses">${Object.entries(
        item.stats,
      )
        .map(([stat, value]) => `<span>${statText(stat, value!)}</span>`)
        .join(
          "",
        )}</div><div class="offer-requirements"><span class="${points < o.points ? "negative" : ""}">${reputationStanding(o.points).name} · ${o.points.toLocaleString()} reputation</span><span>${recipe ? `${PROFESSIONS.find((p) => p.id === recipe.profession)!.name} ${recipe.skill} · crafts ${item.armor} ${item.slot}` : `Character level ${item.level} · all classes`}</span>${o.campaign ? `<span>Complete all four faction campaign chapters.</span>` : ""}${recipe ? `<span>Crafted item requires character level ${item.level} to equip.</span>` : ""}</div><div class="quartermaster-footer"><span>${icon("coin", 16)} ${o.gold} G</span><button class="button quiet" data-action="buy-offer" data-id="${o.id}" ${restriction ? "disabled" : ""}>${owned ? `${icon("check", 14)} ${restriction}` : restriction || (recipe ? "Learn pattern" : "Buy equipment")}</button></div>${recipe && owned ? '<button class="text-button" data-action="nav" data-id="professions">Open crafting book →</button>' : ""}</article>`;
    })
    .join(
      "",
    )}</div><p class="page-note">Neutral 0 · Friendly 150 · Honored 500 · Revered 1,100 · Exalted 2,000. Visiting outposts, commissions and rewards are original adaptations for Wow Survivors.</p>`;
}
