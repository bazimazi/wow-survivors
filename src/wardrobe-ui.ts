import {
  MATERIALS,
  PROFESSIONS,
  RECIPES,
  SLOT_LABELS,
  RARITY_COLORS,
  STAT_LABELS,
  ZONES,
} from "./content";
import type { Stat } from "./content";
import type { SaveData } from "./progression";
import {
  canEquip,
  craftRestriction,
  equipRestriction,
  expeditionRestriction,
} from "./progression";
import { dungeonRoute } from "./dungeon";
import { WARDROBE_GEAR, WARDROBE_SLOTS, WARDROBE_SOURCES } from "./wardrobe";
import type { WardrobeSlot, WardrobeSource } from "./wardrobe";
import { icon } from "./icons";
import { SHADOWFANG_GEAR, SHADOWFANG_SOURCES } from "./shadowfang";
import { DUSKWOOD_GEAR } from "./duskwood";
import { CAMPAIGN_GEAR, CAMPAIGN_SOURCES, CAMPAIGNS } from "./campaigns";
import { FACTIONS } from "./factions";
import { isWardrobeSlot } from "./wardrobe";
export const WARDROBE_CATALOG = [
  ...WARDROBE_GEAR,
  ...DUSKWOOD_GEAR.filter((g) => isWardrobeSlot(g.slot)),
  ...CAMPAIGN_GEAR.filter((g) => isWardrobeSlot(g.slot)),
  ...SHADOWFANG_GEAR.filter((g) => isWardrobeSlot(g.slot)),
];
export const WARDROBE_CATALOG_SOURCES = {
  ...WARDROBE_SOURCES,
  ...CAMPAIGN_SOURCES,
  ...SHADOWFANG_SOURCES,
};

export interface WardrobeFilters {
  open: boolean;
  slot: WardrobeSlot | "all";
  source: WardrobeSource["type"] | "all";
  usable: boolean;
}
function sourceText(s: SaveData, id: string): string {
  const source = WARDROBE_CATALOG_SOURCES[id];
  if (source.type === "campaign") {
    const campaign = CAMPAIGNS[source.faction],
      q = s.campaigns[source.faction];
    return `<b>${FACTIONS.find((f) => f.id === source.faction)!.name} · ${campaign.envoy}</b><span>Claim all four chapters of ${campaign.name}. One guaranteed cloak reward.</span><span class="wardrobe-ready">${q.chapter} / 4 chapters claimed${q.chapter === 4 ? " · Reward already claimed" : " · Level 15 required for final chapter"}</span>`;
  }
  const zone =
    source.type !== "craft" ? ZONES.find((z) => z.id === source.zone)! : null;
  if (source.type === "craft") {
    const recipe = RECIPES.find((r) => r.id === source.recipe)!;
    const profession = PROFESSIONS.find((p) => p.id === source.profession)!;
    const restriction = craftRestriction(s, recipe.id);
    return `<b>${profession.name} · Skill ${recipe.skill}</b><span>${recipe.gold} G · ${Object.entries(
      recipe.cost,
    )
      .map(
        ([material, n]) =>
          `${n} ${MATERIALS[material as keyof typeof MATERIALS].name}`,
      )
      .join(
        " · ",
      )}</span><span class="${restriction ? "wardrobe-restriction" : "wardrobe-ready"}">${restriction || "Ready to craft"}</span>`;
  }
  const restriction = expeditionRestriction(s, source.zone);
  if (source.type === "dungeon") {
    const stage = dungeonRoute(source.zone)!.stages[source.stage];
    return `<b>${zone!.name} · ${stage.boss}</b><span>${stage.name} · One random class-eligible reward per guardian.</span><span class="${restriction ? "wardrobe-restriction" : "wardrobe-ready"}">${restriction || `Expedition available · Character level ${dungeonRoute(source.zone)!.minLevel} required`}</span>`;
  }
  return `<b>${zone!.name} · Elite chests and guarded caches</b><span>Caches respect your character level. Elite chests may hold gear to grow into.</span><span class="${restriction ? "wardrobe-restriction" : "wardrobe-ready"}">${restriction || "Expedition available"}</span>`;
}
export function renderWardrobe(s: SaveData, filters: WardrobeFilters): string {
  const items = WARDROBE_CATALOG.filter(
    (g) =>
      (filters.slot === "all" || g.slot === filters.slot) &&
      (filters.source === "all" ||
        WARDROBE_CATALOG_SOURCES[g.id].type === filters.source) &&
      (!filters.usable || canEquip(s.selectedClass, g.id)),
  );
  return `<section class="wardrobe-section"><button class="wardrobe-toggle" data-action="toggle-wardrobe" aria-expanded="${filters.open}" aria-controls="wardrobe-catalog">${icon("book", 22)}<span><b>Plan your next discovery</b><small>Shoulders, cloaks, belts and leggings · ${WARDROBE_CATALOG.length} pieces</small></span>${icon(filters.open ? "close" : "arrow", 18)}</button><div id="wardrobe-catalog" ${filters.open ? "" : "hidden"}><p>Complete your outfit through exploration, crafting, dungeon guardians and faction campaigns. This guide shows the new equipment, including pieces you haven't found yet.</p><div class="wardrobe-toolbar"><label>Equipment slot<select id="wardrobe-slot"><option value="all">All four slots</option>${WARDROBE_SLOTS.map((slot) => `<option value="${slot}" ${filters.slot === slot ? "selected" : ""}>${SLOT_LABELS[slot]}</option>`).join("")}</select></label><label>Acquisition<select id="wardrobe-source">${[
    ["all", "All sources"],
    ["world", "Outdoor discoveries"],
    ["craft", "Crafted equipment"],
    ["dungeon", "Dungeon guardians"],
    ["campaign", "Faction campaigns"],
  ]
    .map(
      ([id, label]) =>
        `<option value="${id}" ${filters.source === id ? "selected" : ""}>${label}</option>`,
    )
    .join(
      "",
    )}</select></label><button data-action="wardrobe-usable" class="button quiet" aria-pressed="${filters.usable}">${filters.usable ? "Showing class-usable" : "Showing all classes"}</button><span aria-live="polite">${items.length} ${items.length === 1 ? "piece" : "pieces"}</span></div><div class="wardrobe-grid">${items
    .map((g) => {
      const owned = s.inventory.includes(g.id),
        restriction = equipRestriction(s, g.id);
      return `<article class="wardrobe-card" data-wardrobe-id="${g.id}" style="--rarity-color:${RARITY_COLORS[g.rarity]}"><div class="gear-card-head"><span class="gear-icon">${icon(g.icon, 27)}</span><div><span class="rarity-label">${g.rarity} · ${owned ? "Owned" : "Undiscovered"}</span><h3>${g.name}</h3><small>${SLOT_LABELS[g.slot]} · ${g.armor || "All classes"} · Level ${g.level}</small></div></div><div class="gear-bonuses">${Object.entries(
        g.stats,
      )
        .map(
          ([stat, n]) =>
            `<span>+${n}${["power", "haste", "crit", "speed", "magnet"].includes(stat) ? "%" : ""} ${STAT_LABELS[stat as Stat]}</span>`,
        )
        .join(
          "",
        )}</div>${g.set ? `<span class="wardrobe-set">Six-piece crafted set · Bonuses at 2, 3 and 6 pieces</span>` : ""}<div class="wardrobe-source">${sourceText(s, g.id)}</div>${restriction ? `<p class="wardrobe-restriction">To wear: ${restriction}</p>` : ""}<div class="wardrobe-actions">${owned ? `<button class="button quiet" data-action="wardrobe-owned" data-id="${g.id}">Show in satchel</button>` : ""}${WARDROBE_CATALOG_SOURCES[g.id].type === "craft" ? `<button class="button quiet" data-action="wardrobe-craft" data-id="${g.id}">View crafting</button>` : ""}${WARDROBE_CATALOG_SOURCES[g.id].type === "campaign" ? `<button class="button quiet" data-action="nav" data-id="outposts" data-faction="${(WARDROBE_CATALOG_SOURCES[g.id] as Extract<WardrobeSource, { type: "campaign" }>).faction}">Visit envoy</button>` : ""}</div></article>`;
    })
    .join(
      "",
    )}</div>${!items.length ? '<p class="wardrobe-empty">No pieces match these filters. Choose another slot or source.</p>' : ""}</div></section>`;
}
