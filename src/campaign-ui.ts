import {
  CLASS_MAP,
  GEAR_MAP,
  RARITY_COLORS,
  STAT_LABELS,
  ZONES,
} from "./content";
import type { Stat } from "./content";
import { FACTIONS, reputationStanding } from "./factions";
import type { FactionId } from "./factions";
import {
  CAMPAIGNS,
  CAMPAIGN_FACTIONS,
  campaignCloakId,
  campaignTrinketId,
} from "./campaigns";
import type { CampaignCounts } from "./campaigns";
import {
  campaignAcceptRestriction,
  campaignReady,
  campaignProgressPreview,
  expeditionRestriction,
} from "./progression";
import type { SaveData, RunRecord } from "./progression";
import { icon } from "./icons";

const labels = {
  kills: "Enemies defeated",
  encounters: "Landmarks completed",
  guardians: "Dungeon guardians defeated",
  victories: "Final-boss victories",
};
const zoneName = (id: string) => ZONES.find((z) => z.id === id)!.name;
function objectives(s: SaveData, faction: FactionId, run?: RunRecord) {
  const q = s.campaigns[faction],
    chapter = CAMPAIGNS[faction].chapters[q.chapter],
    progress = campaignProgressPreview(s, faction, run);
  if (!chapter) return "";
  return `<div class="campaign-objectives">${Object.entries(chapter.goals)
    .map(([key, goal]) => {
      const metric = key as keyof CampaignCounts,
        n = progress[metric];
      return `<div><span>${labels[metric]}<b>${n} / ${goal}</b></span><div class="progress-track" role="progressbar" aria-label="${labels[metric]}" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${n}"><i style="width:${(n / goal!) * 100}%"></i></div></div>`;
    })
    .join("")}</div>`;
}
function gearPreview(id: string) {
  const g = GEAR_MAP[id];
  return `<div class="campaign-gear" style="--rarity-color:${RARITY_COLORS[g.rarity]}">${icon(g.icon, 25)}<div><b>${g.name}</b><small>${g.rarity} · Level ${g.level} · All classes</small><span>${Object.entries(
    g.stats,
  )
    .map(
      ([stat, n]) =>
        `+${n}${["power", "crit", "speed", "magnet", "haste"].includes(stat) ? "%" : ""} ${STAT_LABELS[stat as Stat]}`,
    )
    .join(" · ")}</span></div></div>`;
}
export function renderCampaign(s: SaveData, faction: FactionId) {
  const f = FACTIONS.find((f) => f.id === faction)!,
    campaign = CAMPAIGNS[faction],
    q = s.campaigns[faction],
    chapter = campaign.chapters[q.chapter];
  const restriction = campaignAcceptRestriction(s, faction),
    ready = campaignReady(s, faction),
    destinationRestriction = chapter
      ? expeditionRestriction(s, chapter.zone)
      : null;
  return `<section class="campaign" data-campaign="${faction}" style="--faction-color:${f.color}" aria-label="${f.name} campaign"><div class="campaign-heading"><div><span class="eyebrow">${campaign.envoy} · FACTION CAMPAIGN</span><h2>${campaign.name}</h2></div><span class="campaign-seal">${icon(q.chapter === 4 ? "check" : f.icon, 32)}<small>${q.chapter} / 4 CLAIMED</small></span></div><ol class="campaign-timeline">${campaign.chapters.map((c, i) => `<li class="${i < q.chapter ? "complete" : i === q.chapter ? "current" : "locked"}" ${i === q.chapter ? 'aria-current="step"' : ""}><span>${i < q.chapter ? icon("check", 15) : i + 1}</span><div><b>${c.name}</b><small>${zoneName(c.zone)} · Lv. ${c.level} · ${reputationStanding(c.points).name}</small><em>${i < q.chapter ? "Claimed" : i === q.chapter ? (q.attempt ? (ready ? "Ready to claim" : "Accepted") : "Next chapter") : "Complete earlier chapter"}</em></div></li>`).join("")}</ol>${chapter ? `<div class="campaign-current"><div><span class="eyebrow">CHAPTER ${q.chapter + 1} · ${zoneName(chapter.zone)}</span><h3>${chapter.name}</h3><p>${chapter.story}</p>${objectives(s, faction)}<p class="campaign-reward">${icon("coin", 16)} ${chapter.gold} G · ${chapter.xp} character XP · ${chapter.reputation} reputation${chapter.gear ? " · Rare cloak" : ""}</p><small>Future expeditions count after acceptance. Progress carries across returns; each chapter can be claimed once. Reward XP goes to your ${CLASS_MAP[s.selectedClass].name}.</small></div><div class="campaign-controls">${q.attempt ? (ready ? `<button class="button primary" data-action="review-campaign-claim" data-id="${faction}">Review chapter rewards</button>` : `<button class="button quiet" data-action="faction-zone" data-id="${chapter.zone}" ${destinationRestriction ? "disabled" : ""}>${destinationRestriction || `Prepare in ${zoneName(chapter.zone)}`}</button>`) : `<button class="button primary" data-action="accept-campaign" data-id="${faction}" ${restriction ? "disabled" : ""}>${restriction || "Accept chapter"}</button>`}${q.attempt ? `<button class="text-button" data-action="abandon-campaign" data-id="${faction}">Abandon chapter</button>` : ""}</div></div>` : `<div class="campaign-completed">${icon("crown", 24)}<div><h3>Campaign complete</h3><p>${campaign.envoy} honors your service. Your cloak reward has been claimed. Reach Exalted and character level 20 to purchase the quartermaster's epic trinket below.</p></div></div>`}<details class="campaign-rewards"><summary>Campaign equipment rewards</summary>${gearPreview(campaignCloakId(faction))}<p>Complete and claim all four chapters for this cloak. Awarded once.</p>${gearPreview(campaignTrinketId(faction))}<p>Complete this campaign · Exalted (2,000) · Character level 20 · 500 G at the quartermaster.</p></details></section>`;
}
export function renderCampaignStatus(
  s: SaveData,
  run?: RunRecord,
  zone?: string,
) {
  return CAMPAIGN_FACTIONS.filter((f) => {
    const q = s.campaigns[f],
      chapter = CAMPAIGNS[f].chapters[q.chapter];
    return q.attempt && chapter && (!zone || chapter.zone === zone);
  })
    .map((faction) => {
      const q = s.campaigns[faction],
        c = CAMPAIGNS[faction].chapters[q.chapter],
        p = campaignProgressPreview(s, faction, run),
        ready = Object.entries(c.goals).every(
          ([m, n]) => p[m as keyof CampaignCounts] >= n!,
        );
      return `<div class="campaign-status" data-campaign-status="${faction}"><small>${ready ? "CAMPAIGN READY" : run ? "CAMPAIGN ON RETURN" : "ACTIVE CAMPAIGN"} · ${FACTIONS.find((f) => f.id === faction)!.name}</small><b>${c.name}</b><span>${zoneName(c.zone)} · ${Object.entries(
        c.goals,
      )
        .map(
          ([m, n]) =>
            `${p[m as keyof CampaignCounts]} / ${n} ${labels[m as keyof CampaignCounts].toLowerCase()}`,
        )
        .join(
          " · ",
        )}</span>${!run ? `<button class="text-button" data-action="nav" data-id="outposts" data-faction="${faction}">Visit envoy →</button>` : ""}</div>`;
    })
    .join("");
}
export function renderCampaignReview(
  s: SaveData,
  faction: FactionId,
  abandon = false,
) {
  const q = s.campaigns[faction],
    c = CAMPAIGNS[faction].chapters[q.chapter];
  return `<div class="eyebrow">${CAMPAIGNS[faction].envoy}</div><h2 id="modal-title">${abandon ? "Abandon" : "Claim"} ${c.name}?</h2><p class="modal-intro">${abandon ? "Current chapter progress will be discarded. Claimed chapters and rewards stay with your roster. Reaccept this chapter to begin again." : `${c.gold} gold · ${c.xp} XP for your ${CLASS_MAP[s.selectedClass].name} · ${c.reputation} ${FACTIONS.find((f) => f.id === faction)!.name} reputation. This chapter's rewards can be claimed once.`}</p>${objectives(s, faction)}${!abandon && c.gear ? gearPreview(c.gear) : ""}<div class="save-actions"><button class="button quiet" data-action="close-modal">${abandon ? "Keep chapter" : "Keep for later"}</button><button class="button primary" data-action="confirm-campaign-${abandon ? "abandon" : "claim"}" data-id="${faction}" data-chapter="${q.chapter}" data-attempt="${q.attempt}" data-hero="${s.selectedClass}">${abandon ? "Abandon chapter" : "Claim chapter rewards"}</button></div>`;
}
