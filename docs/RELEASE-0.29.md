# v0.29 — Weapon-type training

## Design recorded before implementation — 8 October 2026

Continue the equipment roadmap with personal weapon training. Blizzard's [original manual](https://assets.blz-contentstack.com/v3/assets/blt3452e3b114fab0cd/blt2e9295db02a222fc/6025bcbb6968b53d529edb2a/media_manual_classic_enUS.pdf), printed pages 80–84 and 94, connects class-specific weapon access to trainer purchases. This phase follows that relationship: one-handed axes for Warrior/Hunter/Paladin/Shaman, and two-handed polearms for Warrior/Hunter/Paladin. These class lists are a selected subset of historical access. Compressed levels, fees, item names and stats are original survival-game rules. The manual's pre-release racial restrictions are excluded.

Preserve every existing weapon's class access, placement, stats and enchantments. Explicit weapon-type metadata covers the 69 existing weapons without inferring types from icons. Older families remain established training; version-1 saves with no new field retain all their builds. New personal `weaponTraining` stores only advanced families, sanitized before loadouts: recognized strings, allowed class, minimum level, unique canonical order. Missing/malformed fields grant no new training. Training is permanent for that hero, survives respec and trade unlearning, and never grants equipment or changes another hero.

Axes train at level 3 for 40 G; polearms at level 5 for 55 G. Purchases show a cancellable review, charge once atomically and recheck eligibility on confirmation. Training unlocks equipment access; automatic class attacks retain their current behavior. Weapon skill practice, accuracy ratings, other weapon families, ammunition and extra shoot actions remain separate designs. Both the Armory satchel and discovery guide show missing training and a direct trainer action. Static class-usable filtering includes trainable gear so it remains discoverable.

Add 22 original items: axe/polearm for each of four outdoor regions, four crafting grades and three dungeons. Axes work as primary weapons or eligible trained Warrior/Hunter secondary weapons; polearms occupy both hands. Ranged equipment remains independent. All placements, comparisons, enchantments, shared ownership, sale/destruction protection and reviewed off-hand removal use the existing transactions. Import and direct stats reject untrained or unsupported new weapons and dependent off-hands. Training and crafting remain separate: any Blacksmith can make the gear, while wearing it checks the hero.

Local levels are 3/6/11/19 for axes, 5/6/11/19 for polearms. Craft levels are 3/5/10/18 and 5/5/10/18, at skills 1/50/125/225 and ranks 1/2/3/4. Axe power is 8/14/20/26 with critical chance 1/2/3/4; polearm power is 10/17/24/31 with haste 1/2/3/4. Eight Blacksmithing recipes cost 35/55/85/140 G and 8 matching-grade ore + 2 leather for axes, 45/65/95/150 G and 10 ore + 2 cloth for polearms. Guardians grant axes with power 19/20/24 and critical chance 4/4/5, or polearms with power 22/23/28 and haste 4/4/5, at levels 10/10/15. Axe guardians: Sneed/Taragaman/Springvale; polearms: Smite/Bazzalan/Fenrus. Outdoor pools enforce class/level but allow a discovery before training; crafts and guardian rewards stay outside those pools. Reuse the established SVG icon system, adding two original vector symbols.

Verify all seven class/family purchases, exact payment and atomic failures, canonical import repair, old-save stats, trained/untrained direct stats, both hands, two-handed reviews, full enchantment comparisons, all eight graded crafts and actual local/guardian settlement. Browser checks cover keyboard/touch purchase cancellation/confirmation/reload, class switching, trainer links, crafting, enchantments, import and actual guardian return. Measure nine classes at six widths and 44px controls; inspect desktop/phone captures. Prepared combat diagnostics compare the unchanged ranged profile with real training/craft/equip transactions for axe and polearm builds, preserving acquisition and movement-policy limits. Complete unit/build/browser/format checks and restore historical artifacts.

## Implemented equipment and training

Personal training adds two new families without changing the sixteen equipment positions or any older weapon's class access, fit, stats or enchantments. The Armory has a keyboard-accessible expandable trainer with established families, class-eligible choices, exact levels/fees and trained status. Satchel and discovery cards link missing family training directly to its review. Blocked reviews explain the current level/gold gate. Confirmation rechecks eligibility, charges exactly once and changes only the selected hero's training.

Twenty-two additions bring the catalog to **309 items, 111 recipes and sixteen unchanged formulas**. Axes train at level 3 for 40 G; polearms at level 5 for 55 G. Warrior/Hunter can use trained axes in either hand after their separate Dual Wield purchase. Paladin/Shaman can carry axes beside shields. Polearms occupy both hands; ranged gear remains independent. Class abilities remain automatic and class-driven.

| Source     | Axe / polearm prefix | Axe / polearm level | Axe / polearm power | Critical chance / haste |
| ---------- | -------------------- | ------------------- | ------------------- | ----------------------- |
| Elwynn     | Goldshire            | 3 / 5               | 8 / 10              | 1                       |
| Westfall   | Dustroad             | 6 / 6               | 14 / 17             | 2                       |
| Tirisfal   | Stillwater           | 11 / 11             | 20 / 24             | 3                       |
| Duskwood   | Nightwatch           | 19 / 19             | 26 / 31             | 4                       |
| Deadmines  | Ironclad             | 10 / 10             | 19 / 22             | 4                       |
| Ragefire   | Emberwatch           | 10 / 10             | 20 / 23             | 4                       |
| Shadowfang | Moonwatch            | 15 / 15             | 24 / 28             | 5                       |

Axe names end in **Handaxe**; polearms in **Glaive**. Guardian axes come from Sneed, Taragaman and Commander Springvale; polearms from Smite, Bazzalan and Fenrus. Dungeon pools now contain **81 items**: Deadmines 25, Ragefire 27 and Shadowfang 29. Duskwood has **24 local items** plus its separate guaranteed trophy. Outdoor class/level filtering permits discovery before training; craft/guardian gear stays outside those pools.

| Blacksmith rank / skill | Prefix     | Axe / polearm level | Axe / polearm fee | Axe materials                   | Polearm materials                  |
| ----------------------- | ---------- | ------------------- | ----------------- | ------------------------------- | ---------------------------------- |
| Apprentice / 1          | Campmade   | 3 / 5               | 35 / 45 G         | 8 Copper Ore + 2 Light Leather  | 10 Copper Ore + 2 Linen Cloth      |
| Journeyman / 50         | Riveted    | 5 / 5               | 55 / 65 G         | 8 Tin Ore + 2 Medium Leather    | 10 Tin Ore + 2 Wool Cloth          |
| Expert / 125            | Fitted     | 10 / 10             | 85 / 95 G         | 8 Iron Ore + 2 Heavy Leather    | 10 Iron Ore + 2 Silk Cloth         |
| Artisan / 225           | Masterwork | 18 / 18             | 140 / 150 G       | 8 Mithril Ore + 2 Thick Leather | 10 Mithril Ore + 2 Mageweave Cloth |

Craft power/extra bonuses follow the four outdoor grades. Crafts do not require the selected hero's weapon training: making the item and learning to wear it are separate transactions. Actual grade, skill, rank, payment, capped practice, duplicate refunds and accepted profession-project rules apply.

The discovery guide lists **178 unique items**: 67 world, 56 craft, 52 dungeon and three campaign discoveries. Its weapon filter has 47 items, off-hand 50 and ranged 24; axes appear in either appropriate hand filter without duplicate catalog rows. Class-usable filtering includes a hero's trainable items so their sources remain discoverable.

## Transactions and compatibility

All 91 weapon items have explicit family metadata, including the 69 established weapons. Acolyte's Wand, Living Branch and starter maces use their defined identities rather than their icons. Existing family metadata changes no eligibility. New families use personal, permanent `weaponTraining`; missing fields normalize to an empty advanced-training list and grant no gear. Imports accept recognized unique strings in canonical order only for an eligible class at the training level, then validate loadouts in the existing primary/off-hand/ranged order. Untrained primaries and their dependent off-hands are removed. Valid training, pairs and shared enchantments survive reload/export/import.

Equip and swap transactions reject missing training atomically. Direct stats ignore unsupported/untrained/unowned/underlevel/wrong-position new weapons and invalid dependent off-hands. A legal secondary axe contributes 50% of both item and enchantment bonuses. Reviews compare complete builds including replaced primaries, removed off-hands, item effects and sets. Other heroes keep their own training, loadouts and shared effects. Training survives respec and trade unlearning; equipped shared gear retains sale/destruction protection. Destroying and reacquiring an item starts without its former enchantment.

Local startup continues to choose the first available port. No encounter or class ability values are retuned.

## Verification

All **425 unit tests** pass, including twelve new weapon-training checks. Strict TypeScript and the production build pass. The new checks cover explicit metadata for all 91 weapons; every old class-eligible primary with a missing training field; all seven class/family purchases; exact once-only fees, personal state and atomic rejections; canonical import repair; exact enchanted axe placements and two-handed polearm replacements; invalid direct-stat/dependent-off-hand guards; shared effects, sale/destruction and clean reacquisition. All eight actual graded crafts verify costs, skill/rank/payment gates, capped practice, duplicate refunds and accepted project credit independently of the selected hero's training. Real cache/elite combat reaches all eight local weapons across **1,280 class/region/seed combinations**, without source/class leakage, plus 60 novice cache checks. Actual combat secures all six guardian rewards and settles once; reward selection is controlled to isolate their source/transaction rules. Logs: `output/tests-0.29.log` and `output/build-0.29.log`.

The focused new browser run passes **6/6 cases in 45.1 seconds**. It exercises keyboard and touch review/cancel/confirm, exact costs, shared hero independence, enchanted hand comparisons, shield/pair removal, ranged retention, reload, level/gold gates, confirmed file-import repair, actual Expert Blacksmith crafting/project credit, trainer/source links, full weapon enchantment payment and actual Sneed combat with once-only partial return. The earlier discovery-guide regression passed all seven cases. Nine classes at six widths (360 / 390 / 760 / 800 / 1024 / 1440) produce **54 combinations**, only class-eligible training choices, 47 weapon discoveries, no horizontal overflow and 44px trainer/card/guide/review controls. Measurements round to a thousandth of a CSS pixel. Report: `output/weapon-training-layout-0.29.json`; browser log: `output/weapon-training-browser-0.29.log`.

Six desktop/phone purchase, Armory and two-handed replacement captures were visually inspected: `output/screenshots/weapon-training-{purchase,armory,replacement}-{1440,390}-0.29.png`. They wait for entry animations and transient toasts. Fixtures seed equipment/materials and accelerate guardian timing/health/reward selection to isolate transactions; these checks do not measure acquisition time, encounter difficulty or physical-device feel. Reproduce with `npx playwright test tests/e2e/weapon-training.spec.ts`.

All **211 unique browser cases** are verified. The full sweep passed **206 cases in 12.8 minutes**; five older catalog/tooltip expectations needed updates for weapon-family text, new off-hand craft/guardian sources and the 111-recipe catalog. The targeted recheck passes **5/5 in 14.3 seconds**, with no implementation changes after the full sweep. Coverage reconciliation is recorded in `output/weapon-training-browser-0.29.json`; logs: `output/browser-0.29.log` and `output/browser-recheck-0.29.log`. The full sweep also passes all six new training cases and all other combat, animation, controller, music, progression, acquisition and dungeon cases.

Repository formatting, the README check and `git diff --check` pass. Browser runs regenerated **126 historical tracked artifacts**, which were restored; current-release reports and six captures remain. Formatting log: `output/format-check-0.29.log`. Reproduce with `npm test`, `npm run build`, `npm run test:e2e` and `npm run format:check`.

## Prepared combat evidence

`node scripts/check-weapon-training-balance.mjs` records **135 attempts** across nine classes, three seeds and five profiles using production combat. The unchanged ranged report matches v0.28 exactly. New profiles use actual personal weapon training, graded Blacksmith crafts and equip transactions after the earlier actual ranged/Dual Wield preparation. Warrior/Hunter axes form distinct local/crafted pairs; Paladin/Shaman axes replace their primary beside a shield. Warrior/Hunter/Paladin polearms remove the dependent off-hand. Other classes retain the ranged profile. All obey the two-primary-profession limit by unlearning a finished trade when necessary; its equipment remains owned.

| Profile                    | Victories | Timeouts | Filled sockets | First upgrade | Successful duration |
| -------------------------- | --------- | -------- | -------------- | ------------- | ------------------- |
| Unchanged ranged heroic    | 25/27     | 0        | 16 / 15        | 5–35 s        | 481–508 s           |
| Axe heroic                 | 25/27     | 0        | 16 / 15        | 5–29 s        | 481–508 s           |
| Polearm heroic             | 24/27     | 0        | 14 / 15 / 16   | 5–26 s        | 481–505 s           |
| Axe level-10 Deadmines     | 27/27     | 0        | 16 / 15        | 5–13 s        | 321–362 s           |
| Polearm level-10 Deadmines | 27/27     | 0        | 14 / 15 / 16   | 5–13 s        | 323–351 s           |

Ownership, level, skills, ranks and materials are prepared fixtures. These are build diagnostics, not human win rates or gear-acquisition measurements. Movement-policy timeouts remain reportable outcomes. No encounter/ability values were retuned. Evidence: `output/weapon-training-balance-0.29.json` and five `output/balance-0.29-*.jsonl` reports.

## Remaining production work

Further weapon families, weapon skill practice/accuracy, ammunition, extra shoot actions, affixes, durability, personal item instances/soulbinding and further enchantment families need separate designs. Expanded talents/spells, profession adventures, faction stories, dungeon routes, directional artwork and cooperative play remain later roadmap phases.
