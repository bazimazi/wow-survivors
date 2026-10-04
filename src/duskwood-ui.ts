import { DUSKWOOD_GEAR } from "./duskwood";
import { createLandmarks, ENCOUNTER_RULES } from "./expedition";
import { expeditionRestriction, zoneUnlocked } from "./progression";
import type { SaveData } from "./progression";
import { icon } from "./icons";

export function duskwoodOptionText(s: SaveData): string {
  return zoneUnlocked(s, "duskwood")
    ? "9 min · level 20+"
    : "Clear Shadowfang Keep · level 20+";
}
export function renderDuskwoodPreview(s: SaveData): string {
  if (s.selectedZone !== "duskwood") return "";
  const gate = expeditionRestriction(s, "duskwood");
  return `<section class="duskwood-preview" aria-label="Duskwood expedition guide"><div class="section-heading"><div><div class="eyebrow">THE NIGHT WATCH NEEDS YOU</div><h2>A road through the dark</h2><p>Nine minutes of survival, then Stitches. Explore for blessings and equipment before the final fight.</p></div><span class="subtle-label">LEVEL 20+</span></div>${gate ? `<p class="duskwood-gate">${icon("lock", 16)} ${gate}</p>` : ""}<ol class="duskwood-landmarks">${createLandmarks(
    "duskwood",
  )
    .map(
      (l) =>
        `<li>${icon(ENCOUNTER_RULES[l.kind].icon, 20)}<span><b>${l.name}</b><small>${ENCOUNTER_RULES[l.kind].label}</small></span></li>`,
    )
    .join(
      "",
    )}</ol><div class="duskwood-tactics"><div>${icon("sword", 22)}<b>Read the cleaver lanes</b><p>Stitches aims before swinging. Sidestep the marked fan; below half health it grows wider.</p></div><div>${icon("leaf", 22)}<b>Keep out of green clouds</b><p>Leave the spill during its warning. Poison remains for 3.2 seconds and hits every 0.8 seconds.</p></div><div>${icon("shield", 22)}<b>Watchkeeper’s Oath</b><p>Guaranteed epic trinket from Stitches: +16% damage, +50 health, +7 armor and +0.8 regeneration. Level 20 to equip.</p></div></div><details class="dungeon-loot-guide"><summary>Preview Duskwood equipment</summary><div><section><h4>Guarded caches and elites · one eligible reward</h4>${DUSKWOOD_GEAR.filter(
    (g) => g.dropZones,
  )
    .map(
      (g) =>
        `<p>${icon(g.icon, 17)}<b>${g.name}</b><small>${g.armor || "All armor types"} · ${g.slot} · level 20${g.classes ? ` · ${g.classes.join(" / ")}` : ""}</small></p>`,
    )
    .join(
      "",
    )}</section></div></details><p class="dungeon-note">Grade I–IV resources use your profession and character requirements. A first victory unlocks the Night Watch’s reward in the Journal. Faction and guild objectives still require their named destinations.</p></section>`;
}
