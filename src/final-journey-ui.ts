import { EPILOGUES, journeyComplete } from "./final-journey";
import { epilogueRestriction, epilogueReady } from "./progression";
import type { SaveData } from "./progression";
import { MATERIALS, ZONES } from "./content";
import { icon } from "./icons";

export function renderFinalJourney(s: SaveData) {
  const count = EPILOGUES.filter((q) => s.journey[q.id]?.claimed).length,
    finished = journeyComplete(s);
  return `<section class="final-journey"><div class="section-heading"><div><div class="eyebrow">THE NORTHERN ROAD</div><h2>${finished ? "Your journey is complete." : "A promise worth keeping."}</h2></div><span>${count} / ${EPILOGUES.length} conclusions</span></div><p>${finished ? "The cathedral is quiet, the last beacon burns, and the guilds have workshops for those who follow. Thank you for carrying this adventure to its end. Expeditions, builds and cooperative journeys remain open." : "Clear Scarlet Monastery at level 25, then Eastern Plaguelands at level 40. Complete the earlier faction campaigns and guild mastery projects to accept their final promises here."}</p><details ${count || s.clearedZones.includes("scarlet") ? "open" : ""}><summary>Faction epilogues and guild conclusions</summary><div class="quest-grid">${EPILOGUES.map(
    (q) => {
      const entry = s.journey[q.id],
        restriction = epilogueRestriction(s, q.id),
        ready = epilogueReady(s, q.id);
      return `<article class="quest-card ${entry?.claimed ? "completed" : ""}" data-epilogue="${q.id}"><div class="quest-head">${icon(q.icon, 24)}<div><h3>${q.name}</h3><p>${q.story}</p></div></div><p>${entry?.complete ? "Frontier victory witnessed" : `Accept, then win in ${ZONES.find((z) => z.id === q.zone)!.name}`}${q.material ? ` · Deliver ${q.count} ${MATERIALS[q.material].name} (${s.materials[q.material]} owned)` : ""}</p><div class="quest-footer"><span>${q.gold} G · ${q.xp} XP</span><button class="button quiet" data-action="${entry?.attempt ? "review-epilogue" : "accept-epilogue"}" data-id="${q.id}" ${entry?.claimed || restriction || (entry?.attempt && !ready) ? "disabled" : ""}>${entry?.claimed ? "Completed" : restriction || (entry?.attempt ? (ready ? "Review conclusion" : "Promise accepted") : "Accept promise")}</button></div></article>`;
    },
  ).join("")}</div></details></section>`;
}
export function renderEpilogueReview(s: SaveData, id: string) {
  const q = EPILOGUES.find((q) => q.id === id)!;
  return `<div class="eyebrow">THE LAST PROMISE</div><h2 id="modal-title">Conclude ${q.name}?</h2><p>${q.story}</p><p>${q.material ? `Deliver ${q.count} ${MATERIALS[q.material].name}. ` : ""}Receive ${q.gold} G, ${q.xp} character XP${q.gear ? " and an original epic relic" : ""}. This conclusion can be claimed once.</p><div class="save-actions"><button class="button quiet" data-action="close-modal">Keep the promise open</button><button class="button primary" data-action="claim-epilogue" data-id="${id}" data-hero="${s.selectedClass}" ${epilogueReady(s, id) ? "" : "disabled"}>Conclude the story</button></div>`;
}
