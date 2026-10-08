import { CLASS_MAP, GEAR_MAP, SLOT_LABELS, STAT_LABELS } from "./content";
import type { Stat } from "./content";
import {
  equipRestriction,
  gearComparison,
  dualWieldRestriction,
  weaponSwapComparison,
} from "./progression";
import type { SaveData } from "./progression";
import {
  RING_SLOTS,
  gearUseLabel,
  offhandMultiplier,
  displacedOffhand,
} from "./equipment";
import { dualWieldClass, DUAL_WIELD_RULES } from "./dual-wield";
import type { Stats } from "./content";
import { icon } from "./icons";

export function renderRingReview(s: SaveData, id: string): string {
  const hero = s.heroes[s.selectedClass],
    item = GEAR_MAP[id];
  const restriction = equipRestriction(s, id);
  return `<div class="eyebrow">${CLASS_MAP[s.selectedClass].name.toUpperCase()} · RING COMPARISON</div><h2 id="modal-title">Choose a ring to replace.</h2><p class="modal-intro"><b>${item.name}</b> can fit either ring position. Compare the change to your current build, then choose a position.</p><div class="ring-choices">${RING_SLOTS.map(
    (slot) => {
      const current = GEAR_MAP[hero.equipment[slot] || ""],
        changes = Object.entries(gearComparison(s, id, slot));
      return `<article class="ring-choice" data-ring-slot="${slot}"><div class="ring-choice-heading">${icon("ring", 24)}<div><small>${SLOT_LABELS[slot]}</small><h3>${current?.name || "Empty position"}</h3></div></div><div class="gear-comparison"><small>CHANGE TO CURRENT BUILD</small>${changes.length ? changes.map(([key, value]) => `<span class="${value! > 0 ? "positive" : "negative"}">${value! > 0 ? "+" : ""}${Math.round(value! * 100) / 100}${["power", "haste", "crit", "speed", "magnet"].includes(key) ? "%" : ""} ${STAT_LABELS[key as Stat]}</span>`).join("") : "<span>No stat change</span>"}</div><button class="button quiet full-width" data-action="equip-ring" data-id="${id}" data-slot="${slot}" ${restriction ? "disabled" : ""}>${restriction || `Replace ${SLOT_LABELS[slot]}`}</button></article>`;
    },
  ).join(
    "",
  )}</div><button class="button quiet full-width" data-action="close-modal">Keep current rings</button>`;
}

export function renderWeaponReview(s: SaveData, id: string): string {
  const hero = s.heroes[s.selectedClass],
    item = GEAR_MAP[id],
    current = GEAR_MAP[hero.equipment.weapon || ""],
    offhand = GEAR_MAP[hero.equipment.offhand || ""];
  const changes = Object.entries(gearComparison(s, id));
  return `<div class="eyebrow">BOTH HANDS. ONE WEAPON.</div><h2 id="modal-title">Equip ${item.name}?</h2><p class="modal-intro">${gearUseLabel(item)}. Replaces <b>${current?.name || "your empty weapon position"}</b> and removes <b>${offhand?.name}</b> from this hero's off-hand. The removed equipment and its enchantments remain in your shared inventory.</p><div class="weapon-change gear-comparison"><small>CHANGE TO CURRENT BUILD · INCLUDES ENCHANTMENTS AND SET BONUSES</small>${changes.length ? changes.map(([key, value]) => `<span class="${value! > 0 ? "positive" : "negative"}">${value! > 0 ? "+" : ""}${Math.round(value! * 100) / 100}${["power", "haste", "crit", "speed", "magnet"].includes(key) ? "%" : ""} ${STAT_LABELS[key as Stat]}</span>`).join("") : "<span>No stat change</span>"}</div><div class="save-actions"><button class="button quiet" data-action="close-modal">Keep current equipment</button><button class="button primary" data-action="equip-two-handed" data-id="${id}">Equip ${item.name}</button></div>`;
}

const buildChanges = (changes: Partial<Stats>) =>
  `<div class="weapon-change gear-comparison"><small>CHANGE TO CURRENT BUILD · INCLUDES ENCHANTMENTS AND SET BONUSES</small>${
    Object.entries(changes)
      .map(
        ([key, value]) =>
          `<span class="${value! > 0 ? "positive" : "negative"}">${value! > 0 ? "+" : ""}${Math.round(value! * 100) / 100}${["power", "haste", "crit", "speed", "magnet"].includes(key) ? "%" : ""} ${STAT_LABELS[key as Stat]}</span>`,
      )
      .join("") || "<span>No stat change</span>"
  }</div>`;
export function renderDualWieldPanel(s: SaveData): string {
  if (!dualWieldClass(s.selectedClass)) return "";
  const hero = s.heroes[s.selectedClass],
    restriction = dualWieldRestriction(s);
  return `<section class="dual-wield-panel" aria-label="Dual Wield training"><div><h2>Dual Wield ${hero.dualWield ? "· Trained" : "· Personal training"}</h2><p>Use two distinct one-handed weapons. The secondary contributes 50% of its item and enchantment bonuses. Shields and focuses keep their full bonuses.</p><small>${CLASS_MAP[s.selectedClass].name} · Character level ${DUAL_WIELD_RULES.level} · One-time fee ${DUAL_WIELD_RULES.gold} G</small></div>${hero.dualWield ? (offhandMultiplier(s.selectedClass, hero) === DUAL_WIELD_RULES.factor ? '<button class="button quiet" data-action="review-hand-swap">Swap weapon hands</button>' : "") : `<button class="button quiet" data-action="review-dual-wield" ${restriction ? "disabled" : ""}>${restriction || `Train Dual Wield · ${DUAL_WIELD_RULES.gold} G`}</button>`}</section>`;
}
export function renderDualWieldTrainingReview(s: SaveData): string {
  return `<div class="eyebrow">${CLASS_MAP[s.selectedClass].name.toUpperCase()} · PERSONAL TRAINING</div><h2 id="modal-title">Learn Dual Wield?</h2><p class="modal-intro">Train this hero for ${DUAL_WIELD_RULES.gold} G. Equip a distinct eligible one-handed weapon in the off-hand beside a one-handed primary. Its item and enchantment bonuses contribute 50%. Training stays with this hero; equipment remains shared.</p><div class="save-actions"><button class="button quiet" data-action="close-modal">Keep current training</button><button class="button primary" data-action="train-dual-wield">Learn Dual Wield · ${DUAL_WIELD_RULES.gold} G</button></div>`;
}
export function renderWeaponHandReview(s: SaveData, id: string): string {
  const hero = s.heroes[s.selectedClass],
    item = GEAR_MAP[id];
  return `<div class="eyebrow">DUAL WIELD · CHOOSE A HAND</div><h2 id="modal-title">Place ${item.name}.</h2><p class="modal-intro">Primary weapons contribute full bonuses. Secondary weapons contribute 50% of their item and enchantment bonuses. Each item can occupy one position per hero.</p><div class="hand-choices">${(
    ["weapon", "offhand"] as const
  )
    .map((slot) => {
      const restriction = equipRestriction(s, id, slot),
        current = GEAR_MAP[hero.equipment[slot] || ""];
      return `<article class="hand-choice" data-hand-choice="${slot}"><h3>${slot === "weapon" ? "Primary hand · 100%" : "Off-hand · 50%"}</h3><p>Replaces <b>${current?.name || "an empty position"}</b>. Displaced equipment stays in your shared inventory.</p>${buildChanges(gearComparison(s, id, slot))}<button class="button quiet full-width" data-action="equip-weapon-hand" data-id="${id}" data-slot="${slot}" ${restriction ? "disabled" : ""}>${restriction || (slot === "weapon" ? "Equip primary weapon" : "Equip secondary weapon")}</button></article>`;
    })
    .join(
      "",
    )}</div><button class="button quiet full-width" data-action="close-modal">Keep current equipment</button>`;
}
export function renderHandSwapReview(s: SaveData): string {
  const e = s.heroes[s.selectedClass].equipment;
  return `<div class="eyebrow">DUAL WIELD · REVERSE YOUR PAIR</div><h2 id="modal-title">Swap weapon hands?</h2><p class="modal-intro"><b>${GEAR_MAP[e.offhand!].name}</b> becomes the primary at 100%. <b>${GEAR_MAP[e.weapon!].name}</b> becomes the secondary at 50%. Enchantments follow each shared item; other heroes keep their own placements.</p>${buildChanges(weaponSwapComparison(s))}<div class="save-actions"><button class="button quiet" data-action="close-modal">Keep current hands</button><button class="button primary" data-action="swap-weapon-hands">Swap weapon hands</button></div>`;
}

export function renderRangedReview(s: SaveData, id: string): string {
  const item = GEAR_MAP[id],
    e = s.heroes[s.selectedClass].equipment;
  const choices =
    item.slot === "weapon"
      ? (["ranged", "weapon"] as const)
      : (["ranged"] as const);
  return `<div class="eyebrow">RANGED EQUIPMENT · CHOOSE A POSITION</div><h2 id="modal-title">Place ${item.name}.</h2><p class="modal-intro">Ranged equipment contributes its full item and enchantment bonuses alongside your hand equipment. Each item occupies one position per hero. Your class abilities keep their existing attacks.</p><div class="hand-choices">${choices
    .map((slot) => {
      const restriction = equipRestriction(s, id, slot),
        current = GEAR_MAP[e[slot] || ""],
        removed = displacedOffhand(e, item, slot),
        moving = slot === "ranged" && e.weapon === id;
      return `<article class="hand-choice" data-ranged-choice="${slot}"><h3>${slot === "ranged" ? "Ranged position · 100%" : "Primary position · 100%"}</h3><p>Replaces <b>${current?.name || "an empty position"}</b>. ${moving ? `Moves <b>${item.name}</b> out of the primary position. ` : ""}${removed ? `Removes <b>${GEAR_MAP[removed].name}</b> from the off-hand. ` : ""}Displaced items and enchantments remain shared.</p>${slot === "weapon" ? `<p>${gearUseLabel(item)}</p>` : ""}${buildChanges(gearComparison(s, id, slot))}<button class="button quiet full-width" data-action="equip-ranged-position" data-id="${id}" data-slot="${slot}" ${restriction ? "disabled" : ""}>${restriction || (slot === "ranged" ? "Equip ranged position" : "Equip primary position")}</button></article>`;
    })
    .join(
      "",
    )}</div><button class="button quiet full-width" data-action="close-modal">Keep current equipment</button>`;
}
