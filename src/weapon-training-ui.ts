import { CLASS_MAP, GEAR } from "./content";
import type { SaveData } from "./progression";
import { canEquip, weaponTrainingRestriction } from "./progression";
import {
  ADVANCED_WEAPON_TYPES,
  WEAPON_TRAINING,
  WEAPON_TYPE_LABELS,
  advancedWeaponType,
} from "./weapon-training";
import type { AdvancedWeaponType } from "./weapon-training";
import { icon } from "./icons";

export function renderWeaponTraining(s: SaveData): string {
  const hero = s.heroes[s.selectedClass],
    choices = ADVANCED_WEAPON_TYPES.filter((t) =>
      WEAPON_TRAINING[t].classes.includes(s.selectedClass),
    ),
    established = [
      ...new Set(
        GEAR.filter(
          (g) =>
            g.weaponType &&
            !advancedWeaponType(g.weaponType) &&
            canEquip(s.selectedClass, g.id),
        ).map((g) => WEAPON_TYPE_LABELS[g.weaponType!]),
      ),
    ];
  return `<details class="weapon-training-panel" aria-label="Weapon training"><summary>${icon("sword", 24)}<span><b>Weapon training</b><small>${CLASS_MAP[s.selectedClass].name} · ${hero.weaponTraining.length} / ${choices.length} advanced families trained</small></span></summary><div class="weapon-training-content"><p>Training stays with this hero. Gear stays in your shared inventory; class abilities keep their automatic attacks.</p><p class="established-weapons"><b>Established training:</b> ${established.join(" · ")}</p><div class="weapon-training-grid">${choices
    .map((type) => {
      const rule = WEAPON_TRAINING[type],
        trained = hero.weaponTraining.includes(type),
        restriction = weaponTrainingRestriction(s, type);
      return `<article data-weapon-training="${type}"><h3>${icon(rule.icon, 24)} ${WEAPON_TYPE_LABELS[type]}${trained ? " · Trained" : ""}</h3><p>${rule.description}</p><small>Character level ${rule.level} · One-time fee ${rule.gold} G</small>${trained ? '<p class="positive">Ready to equip eligible items.</p>' : `<button class="button quiet" data-action="review-weapon-training" data-id="${type}">View training · ${rule.gold} G</button>${restriction ? `<p class="training-restriction">${restriction}</p>` : ""}`}</article>`;
    })
    .join(
      "",
    )}</div>${choices.length ? "" : "<p>This hero knows all weapon families currently available to their class.</p>"}</div></details>`;
}
export function renderWeaponTrainingReview(
  s: SaveData,
  type: AdvancedWeaponType,
): string {
  const rule = WEAPON_TRAINING[type],
    restriction = weaponTrainingRestriction(s, type);
  return `<div class="eyebrow">${CLASS_MAP[s.selectedClass].name.toUpperCase()} · PERSONAL WEAPON TRAINING</div><h2 id="modal-title">Learn ${WEAPON_TYPE_LABELS[type]}?</h2><p class="modal-intro">Pay ${rule.gold} G once to train this hero. Requires character level ${rule.level}. ${rule.description} Equipment must still meet its own class and level requirements.</p><p class="modal-intro">Training unlocks the weapon family. Obtain its items through exploration, Blacksmithing, Engineering or dungeon guardians. Other heroes need their own training.</p>${restriction ? `<p class="training-restriction" role="status">${restriction}</p>` : ""}<div class="save-actions"><button class="button quiet" data-action="close-modal">Keep current training</button><button class="button primary" data-action="train-weapon-type" data-id="${type}" ${restriction ? "disabled" : ""}>Learn ${WEAPON_TYPE_LABELS[type]} · ${rule.gold} G</button></div>`;
}
