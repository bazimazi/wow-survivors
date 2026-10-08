import { CLASS_MAP, GEAR_MAP, MATERIALS, STAT_LABELS } from "./content";
import type { Stat } from "./content";
import type { SaveData, RunRecord } from "./progression";
import {
  AFFIXES,
  affixQuote,
  itemCondition,
  itemOwner,
  itemAffixStats,
  knownWeaponTypes,
  weaponSkillCap,
  weaponAccuracy,
  repairQuote,
  protectedItem,
} from "./item-progression";
import type { AffixId } from "./item-progression";
import { WEAPON_TYPE_LABELS } from "./weapon-training";
import { icon } from "./icons";

const bonusLabel = (key: string, value: number) =>
  `+${Math.round(value * 100) / 100}${["power", "haste", "crit", "speed", "magnet"].includes(key) ? "%" : ""} ${STAT_LABELS[key as Stat]}`;

export function renderItemState(s: SaveData, id: string): string {
  if (protectedItem(id)) return "";
  const condition = itemCondition(s, id),
    owner = itemOwner(s, id),
    affix = s.itemStates[id]?.affix;
  return `<div class="item-state ${!condition ? "negative" : ""}"><span>Condition ${condition} / 100${condition ? "" : " · Broken · bonuses inactive"}</span>${owner ? `<span>Soulbound to ${CLASS_MAP[owner].name}</span>` : ""}${
    affix
      ? `<span>${AFFIXES[affix].name} · ${Object.entries(itemAffixStats(s, id))
          .map(([k, v]) => bonusLabel(k, v!))
          .join(" · ")}</span>`
      : ""
  }</div>`;
}
export function renderEquipmentWorkshop(s: SaveData): string {
  const h = s.heroes[s.selectedClass],
    quote = repairQuote(s, Object.values(h.equipment));
  return `<details class="equipment-workshop" aria-label="Equipment workshop"><summary>${icon("anvil", 24)}<span><b>Equipment workshop</b><small>${quote.ids.length} worn equipped items · ${s.ammunition} ammunition in storage</small></span></summary><div class="weapon-training-content"><p>Equipment wears on return: 3 condition per full minute, plus 10 when defeated, up to 20 per expedition. Broken pieces lose item, enchantment, affix and set bonuses. Starter equipment stays usable. Repair costs apply to the shared item.</p><div class="workshop-actions"><button class="button quiet" data-action="review-repair" data-id="loadout" ${quote.ids.length ? "" : "disabled"}>Repair equipped items · ${quote.gold} G</button><button class="button quiet" data-action="buy-ammunition" ${s.gold < 10 || s.ammunition > 9949 ? "disabled" : ""}>Buy 50 ammunition · 10 G</button></div><p>Equip a bow, gun, crossbow, wand or throwing set to take an extra shot with T, the Shoot button or RT / R2. Without a ranged weapon, Strike practices your primary in melee range. Equipment attacks share a 2.5-second cooldown. Bows, guns and crossbows consume one stored round per accepted shot; wands and throwing sets use none. Your automatic class spells keep their own costs.</p><h3>Personal weapon practice</h3><p>Every eight landed weapon hits earn one skill, up to five times character level (maximum 300). A skill deficit reduces weapon accuracy by up to 15%. Magic, periodic effects, companions and supplies do not practice weapons.</p><div class="weapon-practice-grid">${knownWeaponTypes(
    s,
  )
    .map(
      (type) =>
        `<div data-practice="${type}"><b>${WEAPON_TYPE_LABELS[type]}</b><span>${h.weaponSkills[type] || 1} / ${weaponSkillCap(h.level)} · ${Math.round(weaponAccuracy({ item: "", type, skill: h.weaponSkills[type] || 1, cap: weaponSkillCap(h.level) }) * 100)}%</span></div>`,
    )
    .join("")}</div></div></details>`;
}
export function renderRepairReview(s: SaveData, requested: readonly string[]) {
  const quote = repairQuote(s, requested);
  return `<div class="eyebrow">CAMP REPAIRS</div><h2 id="modal-title">Restore ${quote.ids.length} equipment ${quote.ids.length === 1 ? "piece" : "pieces"}?</h2><p class="modal-intro">Pay ${quote.gold} G to restore these owned items to 100 condition. Enchantments, affixes and bindings stay intact. Shared pieces are repaired for every hero.</p><div class="repair-list">${quote.ids.map((id) => `<p><b>${GEAR_MAP[id].name}</b> · ${itemCondition(s, id)} → 100</p>`).join("")}</div><div class="save-actions"><button class="button quiet" data-action="close-modal">Keep current condition</button><button class="button primary" data-action="confirm-repair" data-items="${quote.ids.join(",")}" data-cost="${quote.gold}" ${!quote.ids.length || s.gold < quote.gold ? "disabled" : ""}>Repair equipment · ${quote.gold} G</button></div>`;
}
export function renderAttunementReview(s: SaveData, id: string) {
  const owner = itemOwner(s, id);
  return `<div class="eyebrow">ENCHANTING · PERSONAL EQUIPMENT</div><h2 id="modal-title">Attune ${GEAR_MAP[id].name}.</h2><p class="modal-intro">Choose one original affix. Confirming permanently binds this owned item to your ${CLASS_MAP[s.selectedClass].name}; other heroes cannot equip it. Unequip it from other heroes first. Replacing an affix pays a fresh cost. Selling or disenchanting removes the item and all of its effects.</p>${owner ? `<p>Soulbound to ${CLASS_MAP[owner].name}.</p>` : ""}<div class="weapon-training-grid affix-choices">${(
    Object.keys(AFFIXES) as AffixId[]
  )
    .map((affix) => {
      const quote = affixQuote(s, id, affix),
        candidate: SaveData = {
          ...s,
          itemStates: {
            ...s.itemStates,
            [id]: {
              condition: itemCondition(s, id),
              owner: s.selectedClass,
              affix,
            },
          },
        };
      return `<article data-affix="${affix}"><h3>${AFFIXES[affix].name}</h3><p>${Object.entries(
        itemAffixStats(candidate, id),
      )
        .map(([key, value]) => bonusLabel(key, value!))
        .join(
          " · ",
        )}</p><small>${quote.gold} G · ${quote.count} ${MATERIALS[quote.dust].name}</small><button class="button quiet" data-action="confirm-attunement" data-id="${id}" data-affix="${affix}" ${quote.restriction ? "disabled" : ""}>${quote.restriction || `Bind and apply ${AFFIXES[affix].name}`}</button></article>`;
    })
    .join(
      "",
    )}</div><button class="button quiet full-width" data-action="close-modal">Keep current item</button>`;
}
export function renderEquipmentResult(s: SaveData, run: RunRecord) {
  if (!run.equipmentProof) return "";
  const h = s.heroes[run.classId];
  const skills = Object.entries(run.equipmentProof.weaponHits).filter(
    ([, hits]) => hits! >= 8,
  );
  const worn = run.equipmentProof.items.filter(
    (id) =>
      !protectedItem(id) &&
      s.inventory.includes(id) &&
      itemCondition(s, id) < 100,
  );
  return `<div class="equipment-result">${worn.length ? `<p>${worn.length} equipped items need repair. Visit the Armory workshop.</p>` : ""}${skills.map(([type]) => `<p>${WEAPON_TYPE_LABELS[type as keyof typeof WEAPON_TYPE_LABELS]} practice · ${h.weaponSkills[type as keyof typeof WEAPON_TYPE_LABELS]} / ${weaponSkillCap(h.level)}</p>`).join("")}</div>`;
}
