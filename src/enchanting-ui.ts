import { CLASS_MAP, GEAR_MAP, MATERIALS, STAT_LABELS } from "./content";
import type { Stat } from "./content";
import { ENCHANTMENTS, ENCHANTMENT_MAP } from "./enchanting";
import {
  canEquip,
  enchantmentComparison,
  enchantmentRestriction,
  enchantmentSkillGain,
  equipRestriction,
  itemEnchantment,
  trainingInfo,
} from "./progression";
import type { SaveData } from "./progression";
import { icon } from "./icons";

const statText = (key: string, value: number) =>
  `${value > 0 ? "+" : ""}${value}${["power", "haste", "crit", "speed", "magnet"].includes(key) ? "%" : ""} ${STAT_LABELS[key as Stat]}`;
const bonusText = (stats: Partial<Record<Stat, number>>) =>
  Object.entries(stats)
    .map(([key, value]) => statText(key, value!))
    .join(" · ");
const costText = (id: string) => {
  const e = ENCHANTMENT_MAP[id];
  return `${e.gold} G · ${Object.entries(e.costs)
    .map(
      ([key, count]) =>
        `${count} ${MATERIALS[key as keyof typeof MATERIALS].name}`,
    )
    .join(" · ")}`;
};
export function renderItemEnchantment(s: SaveData, itemId: string): string {
  const e = itemEnchantment(s, itemId);
  return e
    ? `<div class="item-enchantment">${icon("spark", 14)}<span><b>${e.name}</b><small>${bonusText(e.stats)}</small></span></div>`
    : "";
}
export function renderEnchantingTable(
  s: SaveData,
  requestedItem: string,
): string {
  const items = s.inventory.filter(
    (id) =>
      ["weapon", "chest", "hands", "boots"].includes(GEAR_MAP[id].slot) &&
      canEquip(s.selectedClass, id) &&
      !equipRestriction(s, id),
  );
  const equipped = s.heroes[s.selectedClass].equipment.weapon;
  const itemId = items.includes(requestedItem)
    ? requestedItem
    : items.includes(equipped || "")
      ? equipped!
      : items[0];
  const gear = GEAR_MAP[itemId],
    current = itemEnchantment(s, itemId),
    skill = s.professions.enchanting || 0;
  return `<section class="enchanting-table" aria-label="Enchanting table"><div class="section-heading"><div><div class="eyebrow">DUST INTO POSSIBILITY</div><h2>At the enchanting table</h2><p>One permanent enchantment per item. Replacing it consumes a fresh cost.</p></div><span class="subtle-label">${skill ? `ENCHANTING ${skill} / ${trainingInfo(s, "enchanting").cap}` : "ENCHANTING NOT LEARNED"}</span></div>${!skill ? `<div class="enchanting-notice">${icon("info", 19)}<span>Learn Enchanting in Professions to apply formulas. Applied effects remain if you later unlearn the trade.</span><button data-action="nav" data-id="professions" class="button quiet">Visit Professions</button></div>` : ""}${
    gear
      ? `<label class="enchant-target" for="enchant-target"><span>Item to enchant</span><select id="enchant-target">${items.map((id) => `<option value="${id}" ${id === itemId ? "selected" : ""}>${GEAR_MAP[id].name} · ${GEAR_MAP[id].slot}</option>`).join("")}</select></label><div class="enchant-current">${icon(gear.icon, 24)}<div><b>${gear.name}</b><span>${current ? `Current: ${current.name} · ${bonusText(current.stats)}` : "No enchantment applied"}</span></div></div><div class="enchantment-grid">${ENCHANTMENTS.filter(
          (e) => e.slot === gear.slot,
        )
          .map((e) => {
            const restriction = enchantmentRestriction(s, itemId, e.id),
              gain = enchantmentSkillGain(s, e.id);
            return `<article class="enchantment-card" data-formula="${e.id}"><div class="enchant-card-heading">${icon("spark", 24)}<div><small>${e.slot.toUpperCase()} · ENCHANTING ${e.skill}</small><h3>${e.name}</h3></div></div><p class="enchant-bonuses">${bonusText(e.stats)}</p><p class="enchant-cost">${costText(e.id)}</p><small class="enchant-gain">${gain ? `+${gain} skill on application` : skill ? (skill >= trainingInfo(s, "enchanting").cap ? "Skill cap reached · visit trainer" : "No skill gain at your current skill") : "Learn the trade to practice"}</small><button class="button quiet" data-action="review-enchantment" data-item="${itemId}" data-id="${e.id}" ${restriction ? "disabled" : ""}>${restriction || (current ? "Review replacement" : "Review enchantment")}</button></article>`;
          })
          .join("")}</div>`
      : '<p class="page-note">Obtain an eligible weapon, chest, hand or boot item for this hero to begin.</p>'
  }<details class="enchantment-catalog"><summary>Browse all 12 formulas</summary><div>${ENCHANTMENTS.map((e) => `<p><b>${e.name}</b><span>${e.slot} · skill ${e.skill} · ${bonusText(e.stats)}</span></p>`).join("")}</div></details><p class="page-note">Your roster shares one copy of each owned item. Its enchantment applies to every hero wearing it, including ${CLASS_MAP[s.selectedClass].name}. Selling or disenchanting destroys the effect; reacquiring the item starts clean. Head, trinket, shoulders, cloaks, belts and leggings have no formulas in this release.</p></section>`;
}
export function renderEnchantmentReview(
  s: SaveData,
  itemId: string,
  formulaId: string,
): string {
  const e = ENCHANTMENT_MAP[formulaId],
    gear = GEAR_MAP[itemId],
    current = itemEnchantment(s, itemId);
  return `<div class="eyebrow">${current ? "REPLACE AN ENCHANTMENT" : "A LASTING AUGMENTATION"}</div><h2 id="modal-title">${current ? "Replace with" : "Apply"} ${e.name}?</h2><p class="modal-intro">${gear.name} · ${gear.slot}. ${current ? `${current.name} will be removed. ` : ""}Bonuses apply while equipped. This effect follows the shared item to every hero wearing it.</p><div class="enchantment-review-stats"><p><small>CURRENT ENCHANTMENT</small><b>${current ? `${current.name} · ${bonusText(current.stats)}` : "None"}</b></p><p><small>NEW ENCHANTMENT</small><b>${e.name} · ${bonusText(e.stats)}</b></p><p><small>CHANGE TO ITEM BONUSES</small><b>${bonusText(enchantmentComparison(s, itemId, formulaId))}</b></p></div><p class="enchant-cost">Costs ${costText(e.id)} · +${enchantmentSkillGain(s, e.id)} Enchanting skill.</p><p class="modal-intro">Materials and gold are consumed on confirmation. ${current ? "The old enchantment is replaced without a refund. " : ""}The item and its set membership stay intact.</p><div class="save-actions"><button class="button quiet" data-action="close-modal">Keep current item</button><button class="button primary" data-action="confirm-enchantment" data-item="${itemId}" data-id="${e.id}">Apply ${e.name} · ${e.gold} G</button></div>`;
}
