import { CLASS_MAP } from "./content";
import { RIDING_RANKS, TRAVEL_OPTIONS, TRAVEL_MAP } from "./travel";
import type { TravelOption } from "./travel";
import {
  selectedTravel,
  travelSelectionRestriction,
  travelPurchaseRestriction,
  ridingRestriction,
} from "./progression";
import type { SaveData } from "./progression";
import { icon } from "./icons";

export const travelArt = (t: TravelOption, css = "") =>
  `<div class="travel-art ${css} ${t.rank === 2 ? "swift" : ""}" style="--travel-x:${(t.sprite % 3) * 50}%;--travel-y:${Math.floor(t.sprite / 3) * 50}%" role="img" aria-label="${t.name}"></div>`;

function card(s: SaveData, t: TravelOption): string {
  const h = s.heroes[s.selectedClass],
    useRestriction = travelSelectionRestriction(s, t.id),
    buyRestriction = travelPurchaseRestriction(s, t.id);
  const owned =
    t.kind === "mount"
      ? s.mounts.includes(t.id)
      : t.kind === "form"
        ? h.travel.form
        : h.classTrial.chapter === 3;
  const selected = h.travel.selected === t.id;
  return `<article class="travel-card ${selected ? "selected" : ""}" data-travel="${t.id}">${travelArt(t)}<div class="travel-card-copy"><small>${t.kind === "class" ? "CLASS TRIAL REWARD" : t.kind === "form" ? "CLASS TRAVEL FORM" : t.rank === 2 ? "SWIFT RACIAL STEED" : "RACIAL STEED"} · LEVEL ${t.level}</small><h3>${t.name}</h3><p>${t.description}</p><div class="travel-card-meta"><b>+${t.speed}% travel speed</b><span>${t.kind === "class" ? "No riding fee" : t.kind === "form" ? "No riding rank" : RIDING_RANKS[t.rank - 1].name}</span></div><p class="travel-eligibility">${selected ? "Selected for this hero's next outdoor expedition." : owned ? useRestriction || "Ready for this hero." : t.kind === "class" ? useRestriction : buyRestriction || `${t.price} G · ${t.kind === "form" ? "Personal training" : "Shared with eligible heroes of this race"}`}</p>${owned ? `<button class="button ${selected ? "quiet" : "primary"}" data-action="select-travel" data-id="${t.id}" ${useRestriction || selected ? "disabled" : ""}>${selected ? "Selected" : "Select for expedition"}</button>` : t.kind === "class" ? `<button class="button quiet" data-action="nav" data-id="journal">View class trial ${icon("arrow", 15)}</button>` : `<button class="button quiet" data-action="review-travel" data-id="${t.id}" ${buyRestriction ? "disabled" : ""}>${t.kind === "form" ? "Learn form" : "Purchase steed"} · ${t.price} G</button>`}</div></article>`;
}
export function renderStable(s: SaveData): string {
  const c = CLASS_MAP[s.selectedClass],
    h = s.heroes[c.id],
    selected = selectedTravel(s);
  const options = TRAVEL_OPTIONS.filter(
    (t) => t.race === c.race || t.classId === c.id,
  );
  const preview =
    selected || options.find((t) => t.kind !== "mount") || options[0];
  const next = RIDING_RANKS[h.travel.riding],
    restriction = ridingRestriction(s);
  return `<div class="stable-layout"><section class="stable-preview" aria-label="Selected travel option"><div class="eyebrow">THE OPEN ROAD</div><h2>${selected ? selected.name : "A companion for the journey"}</h2>${travelArt(preview, "featured")}<div class="stable-preview-copy"><span>${selected ? `+${selected.speed}% movement while travelling` : "Currently travelling on foot"}</span><p>${selected ? "Press R or tap Travel during an outdoor expedition. New attacks wait until you return to combat." : "Train and choose a steed or class form below. Travel helps you reach distant gathering nodes and landmarks."}</p>${selected ? `<button class="button quiet" data-action="travel-foot">Travel on foot instead</button>` : ""}</div></section><aside class="riding-trainer"><span class="stable-emblem">${icon("horse", 34)}</span><div class="eyebrow">RIDING MASTER</div><h2>Learn the trail</h2><p>Riding is trained separately for each hero. Your collection is shared; your Mage's training does not train your Warrior.</p><div class="riding-ranks">${RIDING_RANKS.map((r) => `<div class="riding-rank ${h.travel.riding >= r.rank ? "trained" : ""}"><span>${icon(h.travel.riding >= r.rank ? "check" : "lock", 19)}</span><div><b>${r.name}</b><small>Character level ${r.level} · ${r.gold} G</small></div></div>`).join("")}</div>${next ? `<button class="button primary" data-action="review-riding" ${restriction ? "disabled" : ""}>Train ${next.name} · ${next.gold} G</button><small class="trainer-restriction">${restriction || "Training unlocks this rank's steeds. Buy a steed separately."}</small>` : `<p class="riding-complete">${icon("check", 18)} Both riding ranks trained.</p>`}<p class="page-note">Class steeds and travel forms require no riding rank.</p></aside></div><section class="stable-collection"><div class="section-heading"><div><div class="eyebrow">${c.race.toUpperCase()} · ${c.name.toUpperCase()}</div><h2>Your travel companions</h2></div><span class="subtle-label">${s.mounts.length} / 10 PURCHASED</span></div><div class="travel-grid">${options.map((t) => card(s, t)).join("")}</div></section><section class="travel-guide"><h3>${icon("compass", 21)} Travel and combat</h3><p>Stand still in a clear space to summon: 1.25 seconds for a steed, 0.6 seconds for a form. Moving or an approaching enemy cancels the summon. Wait four seconds after a hit and stay at least 160 world units from living enemies.</p><p>Travel pauses new spells, orbit strikes and companion attacks. Existing projectiles and areas finish normally. A hit, successful class ability, dash, supply use or landmark interaction returns you to combat. Dismount to gather. Final bosses and dungeon arenas require fighting on foot.</p></section><details class="stable-catalog"><summary>Explore the other racial steeds</summary><p>Each race keeps its own companions. Switch heroes to train and purchase their steeds.</p><div class="stable-catalog-grid">${TRAVEL_OPTIONS.filter(
    (t) => t.kind === "mount" && t.race !== c.race,
  )
    .map(
      (t) =>
        `<div>${travelArt(t)}<b>${t.name}</b><span>${t.race} · +${t.speed}% speed · ${t.price} G</span></div>`,
    )
    .join("")}</div></details>`;
}
export function renderTravelReview(s: SaveData, id?: string): string {
  const c = CLASS_MAP[s.selectedClass],
    h = s.heroes[c.id],
    t = id ? TRAVEL_MAP[id] : null,
    rank = RIDING_RANKS[h.travel.riding];
  const name = t?.name || rank?.name || "Riding",
    cost = t?.price ?? rank?.gold ?? 0;
  return `<div class="stable-review">${t ? travelArt(t) : `<span class="stable-emblem">${icon("horse", 44)}</span>`}<div class="eyebrow">${c.name.toUpperCase()} · LEVEL ${h.level}</div><h2 id="modal-title">${t ? (t.kind === "form" ? "Learn" : "Purchase") : "Train"} ${name}</h2><p>${t ? (t.kind === "form" ? "This form belongs to this hero and requires no riding rank." : "This steed joins the shared stable. Other eligible heroes of this race can use it once they train the required riding rank.") : "This riding rank belongs to this hero. Training unlocks eligible steeds for purchase; it does not include a steed."}</p><div class="stable-review-cost"><span>Gold cost</span><b>${cost} G</b></div><p>${t ? `+${t.speed}% travel speed. ${h.travel.selected ? "Your current travel selection stays selected." : "This will be selected for your next outdoor expedition."}` : `Unlocks ${rank?.rank === 2 ? "swift" : "regular"} racial steeds. Your current steed stays selected.`}</p><div class="modal-actions"><button class="button quiet" data-action="close-modal">Cancel</button><button class="button primary" data-action="${t ? "confirm-travel" : "confirm-riding"}" data-id="${id || ""}" data-hero="${c.id}" data-rank="${rank?.rank || 0}">Confirm · ${cost} G</button></div></div>`;
}
export function renderTravelCamp(s: SaveData): string {
  const t = selectedTravel(s);
  return `<div class="travel-camp">${icon("horse", 26)}<div><b>${t ? t.name : "Visit the stable"}</b><p>${t ? `+${t.speed}% travel speed outdoors. Press R to summon in a clear space.` : "Train riding, collect racial steeds or learn your class's travel option."}</p></div><button class="button quiet" data-action="nav" data-id="stable">Manage travel ${icon("arrow", 15)}</button></div>`;
}
