import { icon } from "./icons";
import {
  DIFFICULTIES,
  OATHS,
  RELICS,
  MILESTONES,
  KEYSTONES,
  CONTRACTS,
  nextChapter,
  relicUnlocked,
  contractProgress,
} from "./adventure";
import type { SaveData, RunRecord } from "./progression";
import type { GameEngine, Upgrade } from "./engine";
import { SPELLS } from "./content";

export function renderBriefing(s: SaveData): string {
  const n = nextChapter(s);
  return `<section class="chapter-briefing" aria-label="Your next goal"><span class="chapter-mark">${icon("compass", 27)}</span><div><div class="eyebrow">THE NEXT CHAPTER</div><h2>${n.title}</h2><p>${n.description}</p></div><div class="chapter-progress"><b>${Math.min(n.progress, n.goal)}<small> / ${n.goal}</small></b><progress value="${n.progress}" max="${n.goal}" aria-label="Next chapter progress"></progress><button class="text-button" data-action="${n.destination === "mastery" || n.destination === "controls" ? n.destination : "nav"}" data-id="${n.destination}">${n.action} ${icon("arrow", 15)}</button></div></section>`;
}
export function renderAdventureSetup(s: SaveData): string {
  const d = DIFFICULTIES[s.adventure.difficulty];
  return `<section class="adventure-setup" aria-label="Expedition preparation"><div class="section-heading"><div><div class="eyebrow">MAKE THIS RUN YOURS</div><h2>An oath. A little courage.</h2></div><button class="text-button" data-action="mastery">${icon("crown", 17)} Mastery & relics</button></div><fieldset class="difficulty-options"><legend>Your challenge</legend>${Object.entries(
    DIFFICULTIES,
  )
    .map(
      ([id, v]) =>
        `<button class="difficulty-choice ${id === s.adventure.difficulty ? "selected" : ""}" data-action="difficulty" data-id="${id}" aria-pressed="${id === s.adventure.difficulty}">${icon(id === "explorer" ? "leaf" : id === "heroic" ? "crown" : "sword", 17)}${v.name}</button>`,
    )
    .join(
      "",
    )}</fieldset><p class="difficulty-description" role="status">${d.description}</p><div class="oath-grid">${OATHS.map((o) => `<button class="oath-card ${o.id === s.adventure.oath ? "selected" : ""}" data-action="oath" data-id="${o.id}" aria-pressed="${o.id === s.adventure.oath}"><span class="oath-symbol">${icon(o.icon, 24)}</span><small>${o.role}</small><b>${o.name}</b><p>${o.description}</p><span class="oath-status">${o.id === s.adventure.oath ? `${icon("check", 14)} Sworn for this run` : "Choose oath"}</span></button>`).join("")}</div><div class="relic-selector"><label for="adventure-relic">${icon("rune", 20)} Expedition relic</label><select id="adventure-relic"><option value="">No relic · travel light</option>${RELICS.map((r) => `<option value="${r.id}" ${s.adventure.relic === r.id ? "selected" : ""} ${relicUnlocked(s, r.id) ? "" : "disabled"}>${r.name}${relicUnlocked(s, r.id) ? "" : " · locked"}</option>`).join("")}</select></div><p class="relic-description">${RELICS.find((r) => r.id === s.adventure.relic)?.description || "Earn relics through mastery. Choose one freely; every relic supports a different way to play."}</p><div class="keystone-preview">${icon("spark", 20)}<span><b>Find your turning point.</b> At run levels <strong>4 · 8 · 12</strong>, choose a keystone that changes how you fight.</span></div><button class="button primary prepared-launch" data-action="launch-prepared">Set out with this build ${icon("arrow", 18)}</button></section>`;
}
export function renderMastery(s: SaveData): string {
  const completed = MILESTONES.filter((m) => m.metric(s) >= m.goal).length;
  return `<div class="eyebrow">A STORY YOU EARN</div><h2 id="modal-title">The hall of mastery</h2><p class="modal-intro">${completed} / ${MILESTONES.length} milestones · ${s.adventure.contracts} expedition objectives · best momentum ${s.adventure.bestStreak}. Relics unlock as soon as you meet their milestone, even before claiming gold.</p><div class="mastery-grid">${MILESTONES.map(
    (m) => {
      const value = Math.min(m.goal, m.metric(s)),
        ready = value >= m.goal,
        claimed = s.adventure.claimed.includes(m.id),
        relic = RELICS.find((r) => r.milestone === m.id);
      return `<article class="mastery-card ${ready ? "complete" : ""}"><span class="mastery-icon">${icon(ready ? "check" : relic?.icon || "crown", 24)}</span><div><h3>${m.name}</h3><p>${m.description}</p><progress max="${m.goal}" value="${value}" aria-label="${m.name} progress"></progress><div class="mastery-meta"><span>${value} / ${m.goal}</span><b>${relic ? `${relic.name} · ` : ""}${m.gold} G</b></div></div><button class="button ${ready && !claimed ? "primary" : "quiet"}" data-action="claim-mastery" data-id="${m.id}" ${claimed || !ready ? "disabled" : ""}>${claimed ? "Claimed" : ready ? "Claim reward" : "In progress"}</button></article>`;
    },
  ).join(
    "",
  )}</div><p class="mastery-note">Oaths and keystones are temporary. Mastery, relics, character levels and your equipment stay with you. All challenge settings earn mastery.</p>`;
}
export function upgradeContext(game: GameEngine, u: Upgrade): string {
  if (u.type === "keystone")
    return `<span class="build-tag">${KEYSTONES.find((k) => k.id === u.id)?.tag}</span><span class="upgrade-impact">New rule for your build · lasts this expedition</span>`;
  if (u.type === "spell") {
    const rank = game.spells.find((s) => s.id === u.id)?.rank || 0;
    return `<span class="build-tag">${SPELLS[u.id].kind.toUpperCase()} · ${rank ? "DEEPEN YOUR BUILD" : "EXPAND YOUR BUILD"}</span><span class="rank-pips" aria-label="Rank ${rank} to ${u.rank} of 5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= rank ? "filled" : i === u.rank ? "next" : ""}"></i>`).join("")}</span><span class="upgrade-impact">${rank ? `Rank ${rank} → ${u.rank}` : "Add to your automatic attacks"}${u.rank === 5 ? " · evolution unlocked" : ` · evolution at rank 5`}</span>`;
  }
  const stat = u.stat!;
  return `<span class="build-tag">${["health", "armor", "regen"].includes(stat) ? "SURVIVAL" : ["magnet", "speed"].includes(stat) ? "EXPLORATION" : "OFFENSE"}</span><span class="upgrade-impact">${Number(game.stats[stat].toFixed(1))} → ${Number((game.stats[stat] + (u.value || 0)).toFixed(1))}${["power", "haste", "crit", "speed", "magnet"].includes(stat) ? "%" : ""} ${stat}</span>`;
}
export function renderAdventureHud(): string {
  return `<aside class="adventure-hud" aria-label="Expedition momentum"><div class="momentum-row"><span id="momentum-label">FIND YOUR FLOW</span><b id="momentum-count">0</b></div><div class="momentum-track"><i id="momentum-fill"></i></div><small id="momentum-hint">Chain defeats. Avoid damage.</small><div id="run-keystones" class="run-keystones"></div><details class="run-contracts"><summary>Expedition objectives <span id="contract-count">0 / 3</span></summary>${CONTRACTS.map((c) => `<div class="contract-line"><span><b>${c.name}</b><small>${c.description}</small></span><strong id="contract-${c.id}">0 / ${c.goal}</strong></div>`).join("")}</details></aside>`;
}
function setText(id: string, value: string) {
  const el = document.getElementById(id);
  if (el && el.textContent !== value) el.textContent = value;
}
export function updateAdventureHud(g: GameEngine): void {
  const tier = Math.min(3, Math.floor(g.streak / 10));
  setText(
    "momentum-label",
    ["FIND YOUR FLOW", "IN THE FLOW", "UNSTOPPABLE", "LEGENDARY"][tier],
  );
  setText("momentum-count", String(g.streak));
  setText(
    "momentum-hint",
    g.streak
      ? `+${tier * 5}% damage · ${Math.ceil(g.streakTimer)}s to keep the chain`
      : "Chain defeats. Avoid damage.",
  );
  const fill = document.getElementById("momentum-fill");
  if (fill) fill.style.width = `${(g.streakTimer / 5) * 100}%`;
  const shell = document.querySelector<HTMLElement>(".adventure-hud");
  if (shell) shell.dataset.tier = String(tier);
  let complete = 0;
  for (const c of CONTRACTS) {
    const value = Math.min(
      c.goal,
      contractProgress(
        c.id,
        g.kills,
        g.completedEncounters + g.dungeonBosses,
        g.adventureActives,
      ),
    );
    if (value >= c.goal) complete++;
    setText(
      `contract-${c.id}`,
      value >= c.goal ? "✓ Complete" : `${value} / ${c.goal}`,
    );
  }
  setText("contract-count", `${complete} / 3`);
  const stones = document.getElementById("run-keystones");
  const markup = g.keystones
    .map((id) => {
      const k = KEYSTONES.find((k) => k.id === id)!;
      return `<span title="${k.name}: ${k.description}" style="--keystone:${k.color}">${icon(k.icon, 16)}<span>${k.name}</span></span>`;
    })
    .join("");
  if (stones && stones.dataset.keys !== g.keystones.join()) {
    stones.innerHTML = markup;
    stones.dataset.keys = g.keystones.join();
  }
}
export function renderAdventureResult(r: RunRecord): string {
  const p = r.adventure;
  if (!p) return "";
  const contracts = CONTRACTS.filter((c) => p.contracts.includes(c.id));
  return `<section class="adventure-result"><div class="eyebrow">YOUR BUILD. YOUR STORY.</div><div class="result-build-line"><b>${DIFFICULTIES[p.difficulty].name}</b><span>${OATHS.find((o) => o.id === p.oath)?.name || "The Unbound"}</span><span>${RELICS.find((k) => k.id === p.relic)?.name || "No relic"}</span></div><div class="adventure-result-stats"><div><b>${p.peakStreak}</b><span>Best momentum</span></div><div><b>${p.actives}</b><span>Class abilities</span></div><div><b>${p.dashes}</b><span>Dashes</span></div><div><b>${contracts.length} / 3</b><span>Objectives</span></div></div>${
    p.keystones.length
      ? `<div class="result-keystones">${p.keystones
          .map((id) => {
            const k = KEYSTONES.find((k) => k.id === id)!;
            return `<span>${icon(k.icon, 18)} ${k.name}</span>`;
          })
          .join("")}</div>`
      : ""
  }<p>${contracts.length ? `${contracts.map((c) => c.name).join(" · ")}<br>Objective rewards included above: +${contracts.reduce((n, c) => n + c.gold, 0)} gold · +${contracts.reduce((n, c) => n + c.xp, 0)} XP.` : "Next time: complete landmarks or use your class ability to earn extra objective rewards."}</p><p class="result-coaching">${p.damageTaken > 100 ? "Under pressure? Dash through danger, take a defensive keystone, or try Explorer." : p.actives < 2 ? "Your class ability can turn a fight. Try C when the horde closes in." : "Try a different oath next time. A new build can change the whole expedition."}</p></section>`;
}
