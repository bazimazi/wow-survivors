import {
  GEAR_MAP,
  STAT_LABELS,
  RARITY_COLORS,
  ZONES,
  MATERIALS,
} from "./content";
import type { Stat, Material } from "./content";
import { materialFor } from "./resources";
import { dungeonRoute, DUNGEON_BOONS } from "./dungeon";
import { zoneUnlocked } from "./progression";
import type { SaveData, RunRecord } from "./progression";
import type { GameEngine } from "./engine";
import { icon } from "./icons";

const clock = (n: number) =>
  `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
export function renderDungeonPreview(s: SaveData): string {
  const route = dungeonRoute(s.selectedZone);
  if (!route) return "";
  return `<section class="dungeon-preview" aria-label="Dungeon route"><div class="section-heading"><div><div class="eyebrow">${route.stages.length === 3 ? "THREE" : "FOUR"} GUARDIANS. ONE JOURNEY.</div><h2>Into ${route.name}</h2><p>${clock(route.stages.reduce((n, stage) => n + stage.duration, 0))} of survival, plus ${route.stages.length} boss fights. Bring your best build.</p></div><span class="subtle-label">CHARACTER LEVEL ${route.minLevel}+</span></div><ol class="dungeon-route">${route.stages.map((stage, i) => `<li><span>${i + 1}</span><div><h3>${stage.name}</h3><b>${stage.boss}</b><p>${clock(stage.duration)} survival · then defeat the guardian</p><small>${stage.tactic}</small></div></li>`).join("")}</ol><div class="dungeon-provisions"><span>${icon("chest", 20)}<b>Rare loot from every boss</b><small>Rewards stay with you on a partial return. Equipment is used back at camp.</small></span><span>${icon("camp", 20)}<b>Recover between stages</b><small>Choose a boon, restore 30% health and refill resource. Your run build continues.</small></span></div><details class="dungeon-loot-guide"><summary>Preview dungeon equipment</summary><div>${route.stages
    .map(
      (stage) =>
        `<section><h4>${stage.boss} · one reward</h4>${stage.loot
          .map((id) => {
            const g = GEAR_MAP[id];
            return `<p>${icon(g.icon, 17)}<b>${g.name}</b><small>${g.armor || "All armor types"} · ${g.slot} · level ${g.level}${g.classes ? ` · ${g.classes.join(" / ")}` : ""}</small></p>`;
          })
          .join("")}</section>`,
    )
    .join(
      "",
    )}</div></details><p class="dungeon-note">Solo access for every class. Dungeon stages replace outdoor landmarks. Outdoor commissions advance in their named zones.</p></section>`;
}
export function dungeonOptionText(s: SaveData, id = s.selectedZone): string {
  const route = dungeonRoute(id)!;
  return zoneUnlocked(s, id)
    ? `${route.stages.length} stages · level ${route.minLevel}+`
    : ZONES.find((z) => z.id === route.prerequisite)?.dungeon
      ? `Clear ${ZONES.find((z) => z.id === route.prerequisite)!.name}`
      : `Defeat the ${route.prerequisite === "westfall" ? "Westfall" : "Tirisfal"} boss`;
}
export function renderCheckpoint(g: GameEngine): string {
  const stage = g.dungeonStage!;
  const route = g.dungeonRoute!;
  const next = route.stages[g.dungeonStageIndex + 1];
  const item = GEAR_MAP[g.lastDungeonReward!];
  return `<div class="eyebrow centered">GUARDIAN ${g.dungeonBosses} / ${route.stages.length} DEFEATED</div><h2 id="modal-title">A moment to recover.</h2><p class="modal-intro centered">${stage.boss} has fallen. Next: ${next.name}.</p><div class="checkpoint-reward" style="--reward-color:${RARITY_COLORS[item.rarity]}">${icon(item.icon, 30)}<div><small>SECURED FOR YOUR RETURN</small><b>${item.name}</b><span>${stage.gold} gold · ${Object.entries(
    stage.materials,
  )
    .map(
      ([id, n]) =>
        `${n} ${MATERIALS[materialFor(MATERIALS[id as Material].family, g.lootResourceTier)].name}`,
    )
    .join(" · ")}</span><span>${Object.entries(item.stats)
    .map(
      ([stat, value]) =>
        `+${value}${["power", "haste", "crit", "speed", "magnet"].includes(stat) ? "%" : ""} ${STAT_LABELS[stat as Stat]}`,
    )
    .join(
      " · ",
    )}</span></div></div><p class="checkpoint-rest">Continue with 30% maximum health restored and full ${g.classDef.resource.toLowerCase()}. Choose a boon for the remaining dungeon; repeat choices stack.</p><div class="checkpoint-options">${DUNGEON_BOONS.map((b, i) => `<button class="checkpoint-choice" data-action="dungeon-continue" data-id="${b.id}"><span>${icon(b.icon, 25)}<kbd>${i + 1}</kbd></span><b>${b.name}</b><p>${b.description}</p><small>Continue to stage ${g.dungeonStageIndex + 2} ${icon("arrow", 15)}</small></button>`).join("")}</div><button class="button quiet full-width" data-action="dungeon-return">Return to camp with secured rewards</button><small class="upgrade-footnote">Time is paused. Press 1, 2 or 3 to choose and continue.</small>`;
}
export function renderDungeonResult(r: RunRecord): string {
  const route = dungeonRoute(r.zoneId);
  if (!route) return "";
  const count = r.dungeonBosses || 0;
  return `<div class="result-dungeon"><b>${count} / ${route.stages.length} guardians defeated</b><span>${r.victory ? route.victoryText : "Your secured dungeon rewards return with you."}</span><ol>${route.stages.map((stage, i) => `<li class="${i < count ? "complete" : ""}">${icon(i < count ? "check" : "lock", 16)} ${stage.boss}</li>`).join("")}</ol></div>`;
}
export function renderDungeonBoons(g: GameEngine): string {
  if (!g.dungeonBoons.length) return "";
  return `<div class="pause-blessings">${DUNGEON_BOONS.flatMap((b) => {
    const count = g.dungeonBoons.filter((id) => id === b.id).length;
    return count
      ? [
          `<span>${icon(b.icon, 17)}<b>${b.name}${count > 1 ? ` ×${count}` : ""}</b><small>${Object.entries(
            b.stats,
          )
            .map(
              ([stat, value]) =>
                `+${Number((value! * count).toFixed(1))}${["power", "speed", "magnet"].includes(stat) ? "%" : ""} ${STAT_LABELS[stat as Stat]}`,
            )
            .join(" · ")}</small></span>`,
        ]
      : [];
  }).join("")}</div>`;
}
