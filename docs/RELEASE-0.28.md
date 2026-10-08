# v0.28 — Separate ranged equipment

## Design recorded before implementation — 8 October 2026

Continue the equipment roadmap with a sixteenth ranged position. Blizzard's [original manual](https://assets.blz-contentstack.com/v3/assets/blt3452e3b114fab0cd/blt2e9295db02a222fc/6025bcbb6968b53d529edb2a/media_manual_classic_enUS.pdf), printed pages 58–59, distinguishes ranged equipment from primary/off-hand equipment and permits simultaneous use. Its class chapters identify caster wands and physical ranged weapons. This phase uses that relationship; compact class access, original rewards, costs and numerical bonuses are survival-game decisions. Ammunition, additional shoot actions, weapon-type training and durability remain later designs.

Preserve all nine older builds and version-1 saves without free migration gear or automatic movement. Explicitly mark the seven existing bows and Acolyte's Wand as ranged-capable while retaining their legacy primary fit, handedness, class access and enchantments. Default pure equip and the existing Equip item UI retain their primary behavior. Add a separate reviewed Place ranged weapon action for legacy items, including equipped items. New wands/thrown sets fit only the ranged position. Wands suit Mage/Priest/Warlock; thrown sets suit Warrior/Rogue/Hunter. Paladin/Shaman/Druid retain their existing equipment choices.

Ranged item and existing weapon enchantment bonuses contribute 100%, independently of one-/two-handed primary equipment and Dual Wield. Do not introduce another attack stream, alter class animations or require ranged equipment for existing spells. One shared item cannot occupy multiple positions on one hero. Moving a legacy primary into ranged clears that primary and its dependent off-hand; moving it back reviews the dependent off-hand removal. Changing/removing unrelated primary equipment keeps ranged equipment. Reviews show the displaced items and exact full-build changes, with keyboard/touch cancellation. Other heroes retain their placements and effects.

Canonical imports validate primary/off-hand before ranged, repair duplicates/forbidden/unowned/underlevel items and preserve valid pairs regardless of raw property order. Direct stats ignore invalid ranged placements. Extend existing weapon formulas to new ranged items without changing any formula's costs/bonuses. Preserve shared sale/destruction protections, unlearning and once-only settlement.

Add twenty-two original ranged items: eight local rewards (wand/thrown per outdoor region, levels 3/6/11/19), eight graded crafts (Enchanting wands and Engineering thrown sets at skills 1/50/125/225, ranks 1/2/3/4, levels 2/5/10/18) and six guardian rewards (wand/thrown per dungeon, levels 10/10/15). Local/crafted power progresses 6/10/14/18, with wand haste or thrown critical chance 1/2/3/4. Both craft families cost 30/50/75/125 G. Wands use 4 matching-grade dust + 2 ore; thrown sets use 6 ore + 2 cloth. Guardian power is 15/16/18 with haste/critical chance 3/3/4. Keep older bonuses, sources, 95 recipes and sixteen formulas intact. Extend the acquisition guide with a ranged filter that also finds its existing bows, without duplicating entries. Reuse existing SVG icons.

Verify all-class legacy stats, imports, legal coexistence, exact moves/replacements/enchantments, atomic rejections, shared ownership, all eight actual crafts with grades/payment/training/project credit, actual local/guardian rewards and combat effects. Browser checks cover keyboard/touch reviews/cancel/reload, crafting/enchanting/source links/import, actual guardian settlement, nine classes at six widths and 44px controls. Inspect desktop/phone captures. Compare unchanged v0.27 dual-wield combat with legal prepared ranged builds through production training/craft/equip transactions, reporting seeded acquisition and movement-policy limits. Run unit/build/browser/format checks and preserve historical artifacts.

## Implemented equipment and sources

The sixteenth socket holds ranged equipment independently of either hand. Bows retain their existing Hunter access; new wands suit Mage/Priest/Warlock and thrown sets suit Warrior/Rogue/Hunter. Paladin/Shaman/Druid keep their existing choices. Ranged item/enchantment bonuses contribute **100%**, alongside two-handed primaries, one-handed shield/focus pairs or trained dual-wield pairs. Existing spells and animations remain class-driven.

Twenty-two additions bring the catalog to **287 items and 103 recipes**, with sixteen unchanged enchantment formulas. The seven older bows and Acolyte's Wand retain their primary fit, handedness, names, class restrictions, stats and effects; they also fit ranged when explicitly placed there. New ranged rewards fit only ranged. All nine legacy saves keep their builds and receive no new gear or automatic moves.

Eight uncommon local items come from their region's guarded caches and elite chests. Caches enforce class and character level; elites retain the established higher-level local gear rule. Craft/guardian items stay outside outdoor pools.

| Region   | Wand / throwing set prefix | Level | Power | Wand haste / thrown critical chance |
| -------- | -------------------------- | ----- | ----- | ----------------------------------- |
| Elwynn   | Northshire                 | 3     | 6     | 1                                   |
| Westfall | Dustroad                   | 6     | 10    | 2                                   |
| Tirisfal | Stillwater                 | 11    | 14    | 3                                   |
| Duskwood | Nightwatch                 | 19    | 18    | 4                                   |

Eight rare crafts use actual grade/rank/skill/payment rules, duplicate-output refunds, capped practice and accepted profession-project credit. Enchanting creates wands; Engineering creates throwing sets. Crafting is independent of the selected class; wearing the output obeys class/level restrictions.

| Rank / skill    | Prefix     | Level / fee | Wand materials                | Throwing set materials            | Power / extra bonus |
| --------------- | ---------- | ----------- | ----------------------------- | --------------------------------- | ------------------- |
| Apprentice / 1  | Campmade   | 2 / 30 G    | 4 Strange Dust + 2 Copper Ore | 6 Copper Ore + 2 Linen Cloth      | 6 / 1               |
| Journeyman / 50 | Riveted    | 5 / 50 G    | 4 Soul Dust + 2 Tin Ore       | 6 Tin Ore + 2 Wool Cloth          | 10 / 2              |
| Expert / 125    | Fitted     | 10 / 75 G   | 4 Vision Dust + 2 Iron Ore    | 6 Iron Ore + 2 Silk Cloth         | 14 / 3              |
| Artisan / 225   | Masterwork | 18 / 125 G  | 4 Dream Dust + 2 Mithril Ore  | 6 Mithril Ore + 2 Mageweave Cloth | 18 / 4              |

Six rare guardian rewards use actual recorded rooms, class filtering and once-only partial-return settlement.

| Dungeon    | Prefix     | Wand guardian  | Throwing set guardian | Equip level | Power / extra bonus |
| ---------- | ---------- | -------------- | --------------------- | ----------- | ------------------- |
| Deadmines  | Ironclad   | Edwin VanCleef | Sneed's Shredder      | 10          | 15 / 3              |
| Ragefire   | Emberwatch | Jergosh        | Taragaman             | 10          | 16 / 3              |
| Shadowfang | Moonwatch  | Arugal         | Baron Silverlaine     | 15          | 18 / 4              |

Dungeon pools contain **75 items**: Deadmines 23, Ragefire 25 and Shadowfang 27. Duskwood has twenty-two local items plus the separately presented guaranteed epic trophy. The guide lists **156 unique pieces across ten families**: 59 world, 48 crafted, 46 dungeon and three campaign rewards. Its ranged filter has 24 choices: the 22 additions plus its two existing Duskwood/Shadowfang bows. Other older ranged items retain their existing acquisition paths. Opening an owned guide item keeps the ranged satchel filter.

## Transactions and compatibility

Existing Equip item behavior keeps legacy bow/wand primaries compatible. A separate **Place ranged weapon** action opens reviewed choices for them, even while equipped. New ranged items open their placement review through Equip item. Reviews list replacements, primary moves, dependent off-hand removal and exact complete-build changes including enchantments/set effects. Keyboard/touch cancellation leaves the save unchanged. Changing unrelated primary equipment keeps ranged equipment; moving a primary into ranged clears its dependent off-hand. Moving a bow back to primary clears the ranged copy and reviews the off-hand removal. Each item occupies one position on one hero, while other heroes retain shared placements/effects.

Canonical version-1 import validates primary/off-hand before ranged and repairs duplicate, unowned, underlevel, forbidden or incompatible ranged placements regardless of raw property order. Direct stats ignore class/level/fit/duplicate violations. Unsupported classes and unowned/underlevel/wrong-position equip reject without mutation. Shared ranged items cannot be sold/disenchanted while any hero wears them. Unlearning keeps owned equipment/effects; destroying and reacquiring starts without an old enchantment.

The existing weapon formulas now support new ranged items, including their reviewed bonus comparisons, exact costs and full contribution. All sixteen formula definitions and 95 older recipes are unchanged. Shields/focuses remain unsupported enchantment targets. Local startup still selects the first available port.

## Verification

All **413 unit tests** pass, including twelve new ranged checks. Strict TypeScript and the production build pass. Coverage verifies eight legacy ranged-capable items, all nine older builds, six-class coexistence, exact enchanted moves/replacements, dependent off-hand clearing, atomic invalid transactions, canonical import repair, shared effects/sale/destruction/unlearning and actual Hunter/Mage damage without another spell family. All eight actual crafts verify exact graded costs, rank/skill/gold/material gates, capped practice, duplicate refunds and accepted project credit. Real cache/elite combat reaches all eight local items across **1,920 region/class/seed combinations**, excluding source leakage and novice-cache violations. Actual guardian combat secures all six room-specific rewards and settles once; reward selection is controlled to isolate the source/transaction rule. Logs: `output/tests-0.28.log` and `output/build-0.28.log`.

The focused browser run passes **15/15 cases in 1.6 minutes**, including all seven new ranged cases and eight off-hand regressions. It exercises keyboard/touch placement/cancellation, full-build comparisons, bow/wand moves and dependent off-hand removal, saved melee/ranged coexistence, unchanged shared heroes, exact Expert Engineering/Enchanting crafts and project credit, source navigation, full weapon enchantment applications/reviews, explicit file-import repair, actual Sneed combat and once-only partial return. Log: `output/ranged-browser-0.28.log`; reproduce with `npx playwright test tests/e2e/ranged.spec.ts tests/e2e/offhands.spec.ts`. The earlier dual-wield/guide focused regression also passed its fourteen cases.

Nine classes at six widths (360 / 390 / 760 / 800 / 1024 / 1440) produce **54 combinations** with sixteen sockets, 24 ranged discoveries, no horizontal overflow and 44px ranged actions/equipment/review/close controls. Measurements round to a thousandth of a CSS pixel to account for coordinate subtraction. Six desktop/phone placement, Armory and enchantment captures were visually inspected after entry animations and transient toasts finished. Report: `output/ranged-layout-0.28.json`; captures: `output/screenshots/ranged-{placement,armory,enchantment}-{1440,390}-0.28.png`. Fixtures seed ownership/materials and accelerate guardian timers/reduce health/control reward selection to isolate acquisition transactions. These checks do not establish physical-device feel or encounter difficulty.

The complete browser regression passes **205/205 cases in 11.5 minutes**, including all seven new ranged flows and the existing progression, combat, animation, controller, music, acquisition and dungeon suites. The full run additionally verifies confirmed bow moves back to primary, dependent off-hand removal, enchantment persistence and restoration of the ranged/melee pair. Log: `output/browser-0.28.log`.

Repository formatting and `git diff --check` pass. The browser suites regenerated **120 historical tracked artifacts**, which were restored; current-release reports and six captures are retained. Formatting log: `output/format-check-0.28.log`. Full evidence is recorded in [VALIDATION.md](VALIDATION.md).

## Prepared combat evidence

`node scripts/check-ranged-balance.mjs` records **81 attempts** across nine classes, three seeds and three profiles using production combat. The old dual-wield heroic outcomes match v0.27 exactly. New profiles use actual graded Enchanting/Engineering crafts and equip transactions alongside the earlier actual Dual Wield training/crafts. Six eligible classes fill sixteen sockets; Paladin/Shaman/Druid retain fifteen. All respect the two-primary-profession limit, unlearning a finished trade where necessary while preserving its equipment. Ownership, levels, skills, ranks and materials are seeded. No ability or encounter values are retuned.

| Profile                     | Victories | Timeouts | Filled sockets | First upgrade | Successful duration |
| --------------------------- | --------- | -------- | -------------- | ------------- | ------------------- |
| Unchanged dual-wield heroic | 22/27     | 0        | 15             | 5–35 s        | 481–503 s           |
| Ranged heroic               | 25/27     | 0        | 16 / 15        | 5–35 s        | 481–508 s           |
| Ranged level-10 Deadmines   | 27/27     | 0        | 16 / 15        | 5–13 s        | 323–363 s           |

These are prepared-build diagnostics, not acquisition-time measurements or human win rates. Timeouts remain diagnostic outcomes rather than being suppressed. Evidence: `output/ranged-balance-0.28.json` and three `output/balance-0.28-*.jsonl` reports.

## Remaining production work

Ammunition, additional shoot actions, weapon-type training, affixes, durability, personal item instances/soulbinding and further enchantment families require separate designs. Expanded talents/spells, profession adventures, faction stories, dungeon routes, directional artwork and cooperative play remain later roadmap phases.
