import { CLASS_KITS } from "./class-combat";
import { CLASS_MAP, GEAR_MAP, SPELLS, STAT_LABELS } from "./content";
import type { ClassId, Stat } from "./content";
import { CLASS_TRIALS, TRIAL_CHAPTERS, trialRelicId } from "./class-trials";
import type { TrialMetric } from "./class-trials";
import { classTrialReady, trialAcceptanceRestriction } from "./progression";
import type { RunRecord, SaveData } from "./progression";
import { icon } from "./icons";
import { TRAVEL_OPTIONS } from "./travel";

export function trialGoalLabel(classId: ClassId, metric: TrialMetric): string {
  const c = CLASS_MAP[classId];
  return {
    casts: `Cast ${SPELLS[c.spells[0]].name} against a target`,
    actives: `Use ${CLASS_KITS[classId].action} successfully`,
    mastery: `Reach rank 3 with ${SPELLS[c.spells[1]].name}`,
    elites: "Defeat an elite enemy",
    evolutions: "Evolve any class spell to rank 5",
    bosses: "Defeat an outdoor boss or dungeon guardian",
  }[metric];
}
export function renderClassTrial(s: SaveData): string {
  const id = s.selectedClass,
    c = CLASS_MAP[id],
    definition = CLASS_TRIALS[id],
    trial = s.heroes[id].classTrial;
  const restriction = trialAcceptanceRestriction(s),
    ready = classTrialReady(s),
    relic = GEAR_MAP[trialRelicId(id)];
  const steed = TRAVEL_OPTIONS.find(
    (t) => t.kind === "class" && t.classId === id,
  );
  return `<section class="class-trial" style="--trial-color:${c.color}" aria-label="${c.name} class trial"><div class="trial-heading"><span class="trial-emblem">${icon(id, 36)}</span><div><div class="eyebrow">${c.name.toUpperCase()} CLASS TRIAL · ${trial.chapter} / 3 CLAIMED</div><h2>${definition.name}</h2><p>${definition.mentor} · ${definition.description}</p></div></div><div class="trial-chapters">${TRIAL_CHAPTERS.map(
    (chapter, index) => {
      const current = trial.chapter === index,
        done = trial.chapter > index;
      return `<article class="trial-chapter ${current ? "current" : done ? "completed" : "locked"}"><div class="trial-chapter-title"><span>${icon(done ? "check" : current ? "book" : "lock", 21)}</span><div><small>CHAPTER ${index + 1} · CHARACTER LEVEL ${chapter.level}+</small><h3>${chapter.name}</h3></div></div><ul>${Object.entries(
        chapter.goals,
      )
        .map(([metric, goal]) => {
          const value = done
            ? goal
            : current
              ? Math.min(goal, trial.progress[metric as TrialMetric] || 0)
              : 0;
          return `<li><span>${trialGoalLabel(id, metric as TrialMetric)}</span><b>${value} / ${goal}</b><div class="progress-track"><i style="width:${(value / goal) * 100}%"></i></div></li>`;
        })
        .join(
          "",
        )}</ul><p class="trial-rewards">${chapter.gold} G · ${chapter.xp} ${c.name} XP${index === 1 ? " · 4 dust" : index === 2 ? ` · ${relic.name}` : ""}</p>${current ? `<button class="button ${ready ? "primary" : "quiet"}" data-action="${trial.active ? "claim-trial" : "accept-trial"}" ${trial.active ? (!ready ? "disabled" : "") : restriction ? "disabled" : ""}>${trial.active ? (ready ? "Claim chapter rewards" : "Chapter in progress") : restriction || "Accept chapter"}</button>` : `<small class="trial-state">${done ? "Rewards claimed" : "Claim the previous chapter first"}</small>`}</article>`;
    },
  ).join(
    "",
  )}</div><div class="trial-relic"><span class="gear-icon">${icon(id, 28)}</span><div><small>FINAL CLASS RELIC · RARE · TRINKET · LEVEL 10</small><b>${relic.name}</b><p>${Object.entries(
    relic.stats,
  )
    .map(
      ([key, value]) =>
        `+${value}${["power", "crit", "haste", "speed", "magnet"].includes(key) ? "%" : ""} ${STAT_LABELS[key as Stat]}`,
    )
    .join(
      " · ",
    )}</p></div>${trial.chapter === 3 ? `<span>${icon("check", 18)} Trial completed</span>` : ""}</div>${steed ? `<div class="trial-steed">${icon("horse", 25)}<div><b>${steed.name}</b><p>${trial.chapter === 3 ? "Class steed unlocked. Select it at the stable." : "Complete all three chapters to unlock this class steed."} +60% travel speed · no riding fee.</p></div><button class="button quiet" data-action="nav" data-id="stable">View stable ${icon("arrow", 15)}</button></div>` : ""}<p class="page-note">Accept a chapter before setting out. Only this hero's future returns count; objectives can be completed across different runs. Rank 3 and evolution objectives require choosing spell upgrades during a run. Progress saves on victory, defeat or return to camp.</p></section>`;
}
export function renderTrialStatus(s: SaveData, run?: RunRecord): string {
  const id = run?.classId || s.selectedClass,
    trial = s.heroes[id].classTrial;
  if (!trial.active || trial.chapter >= 3) return "";
  const proof =
    run?.classProof?.chapter === trial.chapter ? run.classProof : undefined;
  const goals = Object.entries(TRIAL_CHAPTERS[trial.chapter].goals);
  return `<div class="trial-status"><b>${icon(id, 17)} ${CLASS_TRIALS[id].name} · chapter ${trial.chapter + 1}</b>${goals.map(([key, goal]) => `<span>${trialGoalLabel(id, key as TrialMetric)} <strong>${Math.min(goal, (trial.progress[key as TrialMetric] || 0) + (proof?.[key as TrialMetric] || 0))} / ${goal}</strong></span>`).join("")}<small>${run ? "This run's progress is recorded when you return." : classTrialReady(s, id) ? "Chapter complete. Claim rewards in the Journal." : "Progress saved. Continue this hero's trial on your next run."}</small></div>`;
}
export function renderTrialCamp(s: SaveData): string {
  const trial = s.heroes[s.selectedClass].classTrial;
  if (trial.chapter >= 3) return "";
  return `<div class="trial-camp">${icon(s.selectedClass, 25)}<div><b>${CLASS_TRIALS[s.selectedClass].name}</b><p>${trial.active ? (classTrialReady(s) ? "Your chapter rewards are ready in the Journal." : `Class trial · chapter ${trial.chapter + 1}. Your next expedition can advance it.`) : `Visit the Journal to accept chapter ${trial.chapter + 1} of your class trial.`}</p></div><button class="button quiet" data-action="nav" data-id="journal">View class trial ${icon("arrow", 15)}</button></div>`;
}
