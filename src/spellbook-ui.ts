import { CLASS_MAP, SPELLS } from "./content";
import type { SpellBonus, SpellDef } from "./content";
import {
  CLASS_TECHNIQUES,
  CLASS_MENTORS,
  TECHNIQUE_MAP,
  lockedClassSpell,
} from "./spellbook";
import { classTechniqueRestriction, heroSpellBonuses } from "./progression";
import type { SaveData } from "./progression";
import { icon } from "./icons";

export function spellbookTrialWarning(s: SaveData): string {
  const c = CLASS_MAP[s.selectedClass],
    h = s.heroes[c.id];
  return h.classTrial.active &&
    h.classTrial.chapter === 1 &&
    !h.spellbook.prepared.includes(c.spells[1])
    ? `<p class="spellbook-warning">${icon("info", 18)} Your active class trial needs rank 3 ${SPELLS[c.spells[1]].name}. Prepare it before an expedition to make mastery progress.</p>`
    : "";
}
const bonusLabels: Record<keyof SpellBonus, string> = {
  power: "power",
  haste: "cast speed",
  crit: "critical chance",
  area: "area",
  projectiles: "shots",
  pierce: "pierce",
  leech: "life steal",
  costReduction: "resource savings",
};
function bonusText(b: SpellBonus | undefined) {
  return (
    Object.entries(b || {})
      .map(
        ([k, v]) =>
          `+${v}${["projectiles", "pierce"].includes(k) ? "" : "%"} ${bonusLabels[k as keyof SpellBonus]}`,
      )
      .join(" · ") || "No named talent bonuses yet"
  );
}
function timing(def: SpellDef) {
  return def.periodic
    ? `Casts every ${def.cooldown}s · ${def.periodic.ticks} ${def.kind === "heal" ? "pulses" : "ticks"} · every ${def.periodic.interval}s${def.impact ? ` · ${Number((def.damage * def.impact).toFixed(1))} initial damage` : ""}`
    : def.kind === "pet"
      ? "Companion attacks automatically"
      : `Casts every ${def.cooldown}s`;
}
function spellCard(s: SaveData, id: string) {
  const c = CLASS_MAP[s.selectedClass],
    h = s.heroes[c.id],
    def = SPELLS[id],
    t = TECHNIQUE_MAP[id];
  const known = c.spells.includes(id) || h.spellbook.learned.includes(id),
    prepared = h.spellbook.prepared.includes(id);
  const restriction = t ? classTechniqueRestriction(s, id) : null;
  return `<article class="spellbook-card ${prepared ? "prepared" : ""} ${known ? "known" : "unlearned"}" data-spell="${id}" style="--spell-color:${def.color}"><div class="spellbook-card-heading"><span class="spellbook-icon">${icon(def.icon, 28)}</span><div><small>${t ? t.school.toUpperCase() : "CORE ABILITY"} · ${known ? (t ? "LEARNED" : "FREE") : `LEVEL ${t!.level}`}</small><h3>${def.name}</h3></div></div><p>${def.description}</p><div class="spellbook-numbers"><span>${def.kind === "buff" ? "Support" : def.kind === "heal" ? "Healing" : "Damage"}<b>${def.kind === "buff" ? `${def.buff!.duration}s` : def.damage}${def.periodic ? " / tick" : ""}${def.kind === "ground" ? " base" : ""}</b></span><span>${c.resource}<b>${def.cost || 0}</b></span><span>Range<b>${def.range || "Self"}</b></span></div><small class="spellbook-timing">${timing(def)} · base values before power and ranks</small><div class="spellbook-evolution">${icon("spark", 16)} Rank 5: ${def.evolution}</div><div class="spellbook-talents"><small>${t ? `SHARES COMPATIBLE TALENTS WITH ${SPELLS[t.parent].name.toUpperCase()}` : "NAMED TALENT BONUSES"}</small><p>${bonusText(heroSpellBonuses(s)[id])}</p></div>${known ? `<button class="button quiet" data-action="review-prepare" data-id="${id}" ${prepared ? "disabled" : ""}>${prepared ? `${icon("check", 17)} Prepared` : "Prepare for expedition"}</button>` : `<button class="button ${restriction ? "quiet" : "primary"}" data-action="review-technique" data-id="${id}" ${restriction ? "disabled" : ""}>${restriction || `Learn technique · ${t!.gold} G`}</button>`}</article>`;
}
export function renderSpellbook(s: SaveData) {
  const c = CLASS_MAP[s.selectedClass],
    h = s.heroes[c.id],
    extra = CLASS_TECHNIQUES.filter((t) => t.classId === c.id);
  return `<section class="spellbook-mentor"><span class="spellbook-mentor-emblem">${icon(c.id, 42)}</span><div><div class="eyebrow">${c.name.toUpperCase()} CLASS TRAINER</div><h2>${CLASS_MENTORS[c.id]}</h2><p>${extra.length} techniques to learn. Four abilities to prepare. Build a spellbook for the journey ahead.</p></div><span class="spellbook-learned">${h.spellbook.learned.length} / ${extra.length}<small>TECHNIQUES LEARNED</small></span></section><section class="spellbook-preparation" aria-label="Prepared abilities"><div class="section-heading"><div><div class="eyebrow">YOUR NEXT EXPEDITION</div><h2>Four prepared abilities</h2></div><button class="button quiet" data-action="restore-spellbook" ${h.spellbook.prepared.every((id, i) => id === c.spells[i]) ? "disabled" : ""}>Restore original four</button></div><div class="spellbook-slots">${h.spellbook.prepared.map((id, i) => `<div class="spellbook-slot" data-prepared="${id}"><span>${String(i + 1).padStart(2, "0")}</span>${icon(SPELLS[id].icon, 25)}<div><b>${SPELLS[id].name}</b><small>${lockedClassSpell(c.id, id, c.spells) ? `${icon("lock", 12)} ${id === c.spells[0] ? "Starting attack" : "Starting companion"}` : "Learn through expedition upgrades"}</small></div></div>`).join("")}</div>${spellbookTrialWarning(s)}<p class="page-note">Training stays with this hero. Preparation is free; ranks and evolutions begin fresh in each run.</p></section><section class="spellbook-collection"><div class="section-heading"><h2>Your class abilities</h2><span class="subtle-label">FOUR CORE · ${extra.length} TECHNIQUES</span></div><div class="spellbook-grid">${[...c.spells, ...extra.map((t) => t.spell.id)].map((id) => spellCard(s, id)).join("")}</div></section>`;
}
export function renderTechniqueReview(s: SaveData, id: string) {
  const c = CLASS_MAP[s.selectedClass],
    t = TECHNIQUE_MAP[id];
  return `<div class="eyebrow">${CLASS_MENTORS[c.id]} · ${c.name.toUpperCase()}</div><h2 id="modal-title">Learn ${t.spell.name}?</h2><p class="modal-intro">${t.spell.description}</p><div class="spellbook-review-change"><span>Permanent learning</span><b>${t.gold} G · character level ${t.level}+</b></div><p class="modal-intro">This technique belongs to your ${c.name}. Learning keeps your current four prepared abilities; choose a replacement afterward.</p><div class="modal-actions"><button class="button quiet" data-action="close-modal">Cancel</button><button class="button primary" data-action="confirm-technique" data-id="${id}" data-hero="${c.id}">Learn ${t.spell.name} · ${t.gold} G</button></div>`;
}
export function renderPreparationReview(s: SaveData, id: string) {
  const c = CLASS_MAP[s.selectedClass],
    prepared = s.heroes[c.id].spellbook.prepared,
    choices = prepared.filter((id) => !lockedClassSpell(c.id, id, c.spells));
  return `<div class="eyebrow">PREPARE A CLASS ABILITY · FREE</div><h2 id="modal-title">Prepare ${SPELLS[id].name}</h2><p class="modal-intro">Choose the ability to replace for the next expedition. Your starting attack${["hunter", "warlock"].includes(c.id) ? " and companion stay" : " stays"} prepared.</p><label class="spellbook-replacement">Replace prepared ability<select id="spellbook-replace">${choices.map((old, i) => `<option value="${old}" ${i === choices.length - 1 ? "selected" : ""}>${SPELLS[old].name} → ${SPELLS[id].name}</option>`).join("")}</select></label><p class="modal-intro">The replaced ability stays known. Ranks are earned through expedition upgrades. You can change preparation or restore the original four at camp.</p>${spellbookTrialWarning(s)}<div class="modal-actions"><button class="button quiet" data-action="close-modal">Keep current preparation</button><button class="button primary" data-action="confirm-prepare" data-id="${id}" data-hero="${c.id}">Prepare ${SPELLS[id].name} · free</button></div>`;
}
export function renderSpellbookCamp(s: SaveData) {
  const c = CLASS_MAP[s.selectedClass],
    h = s.heroes[c.id];
  return `<section class="spellbook-camp"><span>${icon("book", 27)}</span><div><b>${c.name} spellbook</b><p>${h.spellbook.prepared.map((id) => SPELLS[id].name).join(" · ")}</p>${spellbookTrialWarning(s)}</div><button class="button quiet" data-action="nav" data-id="spellbook">Visit class trainer ${icon("arrow", 16)}</button></section>`;
}
