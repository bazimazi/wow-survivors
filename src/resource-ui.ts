import {
  MATERIALS,
  RESOURCE_FAMILIES,
  RESOURCE_IDS,
  RESOURCE_TIERS,
  FAMILY_INFO,
  zoneResourceTier,
} from "./resources";
import { icon } from "./icons";
import { tradeSkill, trainingInfo, disenchantMaterial } from "./progression";
import type { SaveData } from "./progression";
import { GEAR_MAP, ZONES } from "./content";
import type { GameEngine } from "./engine";

export function renderResources(s: SaveData): string {
  return `<section class="resource-store" aria-label="Material storage"><div class="section-heading"><div><div class="eyebrow">EVERY TRAIL HAS SOMETHING TO OFFER</div><h2>Your materials</h2></div><span class="subtle-label">SIX FAMILIES · FOUR GRADES</span></div><p>Gathering grades open at skills 1 / 50 / 125 / 225 and character levels 1 / 5 / 10 / 20. Recipes consume the grade matching their skill milestone. Your earlier supplies remain grade I.</p><div class="resource-families">${RESOURCE_FAMILIES.map(
    (f) => {
      const family = FAMILY_INFO[f],
        skill = family.trade ? tradeSkill(s, family.trade) : 0;
      return `<article class="resource-family" style="--material-color:${family.color}"><div class="resource-family-heading">${icon(family.icon, 23)}<h3>${family.name}</h3>${family.trade ? `<small>${skill ? `${skill} / ${trainingInfo(s, family.trade).cap}` : "Not learned"}</small>` : ""}</div><div class="resource-grades">${RESOURCE_IDS[f].map((id, i) => `<div class="resource-grade" data-material="${id}"><span class="resource-tier">${RESOURCE_TIERS[i].label}</span><span><b>${MATERIALS[id].name}</b><small>${family.trade ? `Skill ${RESOURCE_TIERS[i].skill} · level ${RESOURCE_TIERS[i].level}` : `${f === "dust" ? "Equipment" : "Hero"} level ${f === "dust" && i === 3 ? 18 : RESOURCE_TIERS[i].level}+`}</small></span><strong>${s.materials[id]}</strong></div>`).join("")}</div><details><summary>Where to find ${family.name.toLowerCase()}</summary><p>${family.source}</p>${["herbs", "ore", "fish"].includes(f) ? `<p>Elwynn: I–II. Westfall: I–III. Tirisfal: I–IV. Explore farther from camp for higher grades. Use <kbd>G</kbd> or Gather during an expedition for a field compass.</p>` : ""}</details></article>`;
    },
  ).join(
    "",
  )}</div><details class="resource-field-guide"><summary>Region survey and practice guide</summary><div>${ZONES.map((z) => `<p><b>${z.name}</b><span>${z.id === "shadowfang" ? "Skinning and cloth · no gathering nodes" : z.dungeon ? `Room-based grades I–III${z.id === "ragefire" ? " · ore only" : " · ore and fish"}` : `Distance bands through grade ${RESOURCE_TIERS[zoneResourceTier(z.id) - 1].label}`}</span></p>`).join("")}</div><p>Practice stops at skill 50 / 125 / 225 / 300 for each grade. At a trained cap, keep the materials and visit your trainer before further practice. Node collection pauses during travel. Skinning selects a usable grade from later worg, worgen and wolf kills; cloth and encounter rewards improve as the expedition advances, bounded by character level.</p></details></section>`;
}
export function renderFieldwork(): string {
  return `<section class="fieldwork-panel" id="fieldwork-panel" hidden aria-label="Gathering compass"><div class="fieldwork-families">${[
    ["eligible", "All"],
    ["herbs", "Herbs"],
    ["ore", "Ore"],
    ["fish", "Fish"],
  ]
    .map(
      ([id, name]) =>
        `<button data-action="gather-focus" data-id="${id}" aria-pressed="${id === "eligible"}">${name}</button>`,
    )
    .join(
      "",
    )}</div><label class="fieldwork-locked"><input type="checkbox" id="gather-locked"> Inspect locked nodes</label><div class="fieldwork-target"><span id="gather-arrow">↑</span><div><b id="gather-name"></b><small id="gather-distance"></small></div></div><p id="gather-reason"></p><small id="gather-practice"></small></section>`;
}
export function updateFieldwork(g: GameEngine): void {
  const panel = document.getElementById("fieldwork-panel"),
    explore = document.getElementById("explore-panel");
  if (!panel || !explore) return;
  panel.hidden = !g.gatheringOpen;
  explore.hidden = g.gatheringOpen;
  document
    .getElementById("fieldwork-toggle")
    ?.setAttribute("aria-expanded", String(g.gatheringOpen));
  const toggle = document.getElementById("fieldwork-toggle");
  if (toggle) toggle.textContent = g.gatheringOpen ? "Explore" : "Gather";
  for (const b of panel.querySelectorAll<HTMLButtonElement>(
    "[data-action='gather-focus']",
  ))
    b.setAttribute("aria-pressed", String(b.dataset.id === g.gatheringFocus));
  const set = (id: string, t: string) => {
    const e = document.getElementById(id);
    if (e) e.textContent = t;
  };
  const target = g.gatheringTarget;
  if (!target) {
    set("gather-name", "No matching nodes remain");
    set("gather-distance", "Choose another family or inspect locked nodes.");
    set("gather-reason", "");
    set("gather-practice", "");
    return;
  }
  const m = MATERIALS[target.kind],
    reason = g.nodeRestriction(target),
    trade = FAMILY_INFO[m.family].trade!;
  set("gather-name", m.name);
  set(
    "gather-distance",
    `Grade ${RESOURCE_TIERS[m.tier - 1].label} · ${Math.ceil(Math.hypot(target.x - g.player.x, target.y - g.player.y) / 10)} m away`,
  );
  set(
    "gather-reason",
    reason ||
      (g.travelling
        ? "Dismount to gather at nodes."
        : "Walk close to gather automatically."),
  );
  set(
    "gather-practice",
    `${trade[0].toUpperCase() + trade.slice(1)} ${g.gatheringSkill(trade)} / ${g.gatheringCap(trade)} · ${g.nodePractice(target) ? "+1 skill on collection" : "No skill gain"}`,
  );
  const arrow = document.getElementById("gather-arrow");
  if (arrow)
    arrow.style.transform = `rotate(${(Math.atan2(target.y - g.player.y, target.x - g.player.x) * 180) / Math.PI + 90}deg)`;
}
export function disenchantText(id: string): string {
  return `${GEAR_MAP[id].rarity === "epic" ? 4 : 2} ${MATERIALS[disenchantMaterial(id)].name}`;
}
