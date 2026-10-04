import {
  CLASS_MAP,
  GEAR_MAP,
  PROFESSIONS,
  RECIPES,
  STAT_LABELS,
} from "./content";
import type { Stat } from "./content";
import {
  SECONDARY_TRADES,
  SPECIALIZATIONS,
  SPECIALIZATION_REQUIREMENTS,
  TRAINING_RANKS,
} from "./training";
import type { TradeId } from "./training";
import {
  specializationRestriction,
  tradeName,
  tradeSkill,
  trainingInfo,
  trainingRestriction,
} from "./progression";
import type { SaveData } from "./progression";
import { icon } from "./icons";

export function renderTraining(s: SaveData, id: TradeId): string {
  const skill = tradeSkill(s, id),
    rank = trainingInfo(s, id);
  const next = TRAINING_RANKS.find((r) => r.rank === rank.rank + 1);
  const restriction = trainingRestriction(s, id);
  return `<div class="trade-training" data-trade="${id}"><div class="profession-skill"><span>${rank.name}</span><b>${skill} / ${rank.cap}</b></div><div class="progress-track" role="progressbar" aria-label="${tradeName(id)} skill" aria-valuemin="0" aria-valuemax="${rank.cap}" aria-valuenow="${skill}"><i style="width:${(skill / rank.cap) * 100}%"></i></div>${next ? `<p class="trainer-requirements">${skill >= rank.cap ? "Skill cap reached. " : ""}Next: ${next.name} · cap ${next.cap}<br>Skill ${next.skill} · character level ${next.level} · ${next.gold} G</p><button class="button quiet trainer-button" data-action="train-profession" data-id="${id}" ${restriction ? "disabled" : ""}>${restriction || `Train ${next.name} · ${next.gold} G`}</button>` : '<p class="trainer-requirements">Artisan trained. Practice advanced recipes to reach skill 300.</p>'}</div>`;
}
export function renderSecondaryTraining(s: SaveData): string {
  return `<section class="secondary-training"><div class="section-heading"><div><h2>Skills for every adventurer</h2><p>Cooking, First Aid and Fishing have their own trainers and do not occupy a primary slot.</p></div></div><div class="secondary-training-grid">${SECONDARY_TRADES.map((p) => `<article class="secondary-training-card"><div class="profession-head"><span class="profession-icon">${icon(p.icon, 26)}</span><div><h3>${p.name}</h3><small>Secondary skill</small></div></div><p>${p.description}</p>${renderTraining(s, p.id)}</article>`).join("")}</div></section>`;
}
export function specializationRecipePreview(id: string): string {
  const spec = SPECIALIZATIONS.find((p) => p.id === id)!;
  const recipe = RECIPES.find((r) => r.id === spec.recipeId)!;
  const item = GEAR_MAP[recipe.output];
  return `<div class="specialization-reward"><small>UNLOCKS AT SKILL ${recipe.skill}</small><b>${icon(recipe.icon, 20)} ${recipe.name}</b>${
    item
      ? `<div class="gear-bonuses">${Object.entries(item.stats)
          .map(
            ([stat, value]) =>
              `<span>+${value}${["power", "haste", "crit", "speed", "magnet"].includes(stat) ? "%" : ""} ${STAT_LABELS[stat as Stat]}</span>`,
          )
          .join(
            "",
          )}</div><span>${item.armor || "All armor types"} · ${item.slot} · character level ${item.level}${item.classes ? ` · ${item.classes.map((c) => CLASS_MAP[c].name).join(" / ")}` : ""}</span>`
      : `<span>Creates ${recipe.quantity} bombs · 120 damage each · press E</span>`
  }</div>`;
}
export function renderSpecializations(s: SaveData): string {
  const learned = ["blacksmithing", "engineering", "leatherworking"].filter(
    (id) => s.professions[id as keyof typeof s.professions],
  );
  if (!learned.length)
    return '<p class="trade-progress-guide">Blacksmithing, Engineering and Leatherworking offer crafting paths at skill 150. Learn one of these professions to preview its specialties and equipment rewards.</p>';
  return `<section class="trade-specializations" id="trade-specializations"><div class="section-heading"><div><div class="eyebrow">THE WORK OF A MASTER</div><h2>Choose your craft</h2><p>One path per profession. Changes cost 100 G; skill and crafted items remain.</p></div><span class="subtle-label">SKILL 150 · EXPERT · LEVEL 12</span></div>${[
    ...learned,
  ]
    .map((id) => {
      const p = PROFESSIONS.find((p) => p.id === id)!;
      return `<div class="specialization-group"><h3>${icon(p.icon, 20)} ${p.name}</h3><div class="trade-specialization-grid ${id === "leatherworking" ? "three-paths" : ""}">${SPECIALIZATIONS.filter(
        (spec) => spec.profession === id,
      )
        .map((spec) => {
          const current =
            s.professionSpecializations[spec.profession] === spec.id;
          const restriction = specializationRestriction(s, spec.id);
          return `<article class="trade-specialization-card ${current ? "chosen" : ""}" data-specialization="${spec.id}"><div class="trade-specialization-heading"><span class="profession-icon">${icon(spec.icon, 26)}</span><h4>${spec.name}</h4>${current ? `<span class="specialization-selected">${icon("check", 16)} Chosen</span>` : ""}</div><p>${spec.description}</p>${specializationRecipePreview(spec.id)}<button class="button quiet" data-action="review-specialization" data-id="${spec.id}" ${restriction ? "disabled" : ""}>${restriction || (s.professionSpecializations[spec.profession] ? `Change path · ${SPECIALIZATION_REQUIREMENTS.gold} G` : `Choose path · ${SPECIALIZATION_REQUIREMENTS.gold} G`)}</button></article>`;
        })
        .join("")}</div></div>`;
    })
    .join("")}</section>`;
}
export function renderRecipeTraining(s: SaveData, id: string): string {
  const r = RECIPES.find((r) => r.id === id)!;
  if (!r.trainingRank && !r.specialization) return "";
  const rankMissing =
    r.trainingRank && trainingInfo(s, r.profession).rank < r.trainingRank;
  const spec = SPECIALIZATIONS.find((p) => p.id === r.specialization);
  const specMissing =
    spec && s.professionSpecializations[spec.profession] !== spec.id;
  return `<div class="recipe-training">${r.trainingRank ? `<span class="${rankMissing ? "negative" : ""}">${TRAINING_RANKS[r.trainingRank - 1].name} training required</span>` : ""}${spec ? `<span class="${specMissing ? "negative" : ""}">${spec.name} path required</span>` : ""}</div>`;
}
export function renderSkillCaps(s: SaveData): string {
  const capped = [
    ...PROFESSIONS.map((p) => p.id),
    ...SECONDARY_TRADES.map((p) => p.id),
  ].filter(
    (id) =>
      tradeSkill(s, id) >= trainingInfo(s, id).cap &&
      trainingInfo(s, id).rank < 4,
  );
  return capped.length
    ? `<p class="result-skill-caps">${icon("anvil", 16)} ${capped.map((id) => tradeName(id)).join(", ")} reached a skill cap. Visit the Professions trainer to continue practicing.</p>`
    : "";
}
