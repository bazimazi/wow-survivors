import { ENDGAME_GEAR, SCARLET_STAGES } from "./endgame";
import { EPILOGUES } from "./final-journey";
import { baseGearId } from "./item-instances";
import { canEquip } from "./progression";
import { RECIPES, MATERIALS, RARITY_COLORS } from "./content";
import type { Material } from "./content";
import type { SaveData } from "./progression";
import { icon } from "./icons";

export function renderEndgameGuide(s: SaveData) {
  const items = ENDGAME_GEAR.filter((g) => canEquip(s.selectedClass, g.id));
  return `<details class="final-journey endgame-guide"><summary>${icon("map", 23)} Northern equipment guide · ${items.length} class-usable discoveries</summary><p>The cathedral drops one eligible relic per guardian. Eastern Plaguelands caches and elite chests offer Dawnward armor; Artisan workshops can craft the same pieces. Each further expedition drop becomes an independent rolled copy.</p><div class="quest-grid">${items
    .map((g) => {
      const copies = s.inventory.filter((id) => baseGearId(id) === g.id).length,
        recipe = RECIPES.find((r) => r.output === g.id),
        guardians = SCARLET_STAGES.filter((stage) =>
          stage.loot.includes(g.id),
        ).map((stage) => stage.boss),
        conclusion = EPILOGUES.find((q) => q.gear === g.id);
      const properties = Object.entries({
        ...g.attributes,
        ...Object.fromEntries(
          Object.entries(g.resistances || {}).map(([key, value]) => [
            `${key} resistance`,
            value,
          ]),
        ),
      })
        .map(([key, value]) => `+${value} ${key}`)
        .join(" · ");
      return `<article class="quest-card" data-endgame-gear="${g.id}"><h3 style="color:${RARITY_COLORS[g.rarity]}">${icon(g.icon, 22)} ${g.name}</h3><p>Level ${g.level} · ${g.armor || "Class-usable"} · ${copies} owned ${copies === 1 ? "copy" : "copies"}</p><p>${properties}</p><p>${guardians.length ? guardians.join(" / ") : conclusion ? `Journal · ${conclusion.name}` : "Eastern Plaguelands · Elite chests and guarded caches"}</p>${
        recipe
          ? `<p>Craft · ${recipe.profession} ${recipe.skill} · Artisan · ${recipe.gold} G · ${Object.entries(
              recipe.cost,
            )
              .map(
                ([key, value]) => `${value} ${MATERIALS[key as Material].name}`,
              )
              .join(
                " · ",
              )}</p><button class="button quiet" data-action="nav" data-id="professions">Visit workshop</button>`
          : `<button class="button quiet" data-action="nav" data-id="${conclusion ? "journal" : "camp"}">${conclusion ? "Visit Journal" : "Choose expedition"}</button>`
      }</article>`;
    })
    .join("")}</div></details>`;
}
