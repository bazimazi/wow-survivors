# v0.27 — Dual wielding

## Design recorded before implementation — 7 October 2026

Continue the equipment roadmap with personal Dual Wield training for Warrior, Rogue and Hunter at character level 10 for 60 G. Review training before charging; keep it after reload/respec/unlearning, grant no free migration proficiency and preserve all existing builds. Use the existing fifteen sockets and version-1 save. The original manual, printed pages 58–59, connects secondary weapons to a class skill and one-handed primary equipment. The chosen classes, compressed common training gate/fee and numerical bonuses below are original survival-game decisions. [Primary reference](https://assets.blz-contentstack.com/v3/assets/blt3452e3b114fab0cd/blt2e9295db02a222fc/6025bcbb6968b53d529edb2a/media_manual_classic_enUS.pdf).

A trained hero may put a distinct eligible one-handed weapon in the off-hand beside a present one-handed primary. Its item and existing weapon enchantment bonuses contribute 50%; shields/focuses retain 100%. One shared item ID cannot occupy both hands on one hero; sharing across heroes remains allowed. Reject incompatible classes, untrained heroes, underlevel/unowned items, two-handed/missing primary weapons and copying the primary into the secondary position atomically. Moving the secondary to the primary clears the old secondary position. Provide a reviewed hand swap for a legal weapon pair, with exact full-build comparisons and cancellation. Automatic attacks/animations remain class-driven; the compact equipment abstraction does not add a second attack stream or a separate ranged position.

After training, owned eligible one-handed weapons open a primary/secondary placement review. Each option shows the displaced item, exact complete-build changes including enchantments and its eligibility reason. Two-handed replacement and main-weapon removal keep their existing dependent off-hand clearing behavior. Import validation uses canonical main-before-off-hand order and validates a strict training boolean, class, character level and distinct weapon IDs. Direct stats ignore incompatible secondary pairs. No new enchantment formulas or armor-set membership.

Add eleven original one-handed blades usable by these three classes: four local discoveries at levels 3/6/11/19, four graded Blacksmithing recipes at skills 1/50/125/225 with matching trained ranks, and three room-specific rare guardian blades at levels 10/10/15. Keep older bonuses, names, eligibility, 91 recipes and sixteen formulas unchanged. Recipe fees 35/55/85/140 G; each uses 8 matching-grade ore and 2 matching-grade leather. Preserve source separation, cache level gates, elite higher-level loot and once-only settlement. Extend the guide's off-hand filter to compatible secondary weapons and expose class restrictions, proficiency and 50% scaling in camp/Armory/reviews.

Verify all nine legacy classes, training/rejection/placement/swap transactions, fractional item/enchantment changes, imports, all four real crafts with exact costs/training/project rules, actual local/guardian rewards, shared sale/destruction guards and actual combat effects. Browser checks cover keyboard/touch training/placement/swap/cancel, reload, source navigation, rewards, all nine classes at six widths and 44px controls. Inspect desktop/phone captures. Compare the unchanged v0.26 prepared off-hand profile with legal trained dual-wield builds using real training/craft/equip functions and production combat, retaining movement-policy stalls and seeded acquisition limits. Run unit/build/browser/format checks and retain release evidence while restoring regenerated historical artifacts.

A distinct ranged position, weapon-type proficiency training, affixes, durability, personal item instances/soulbinding and further enchantment families remain later designs.

## Implemented training and equipment

Warrior, Rogue and Hunter can review and buy personal Dual Wield training at character level 10 for **60 G**. Training charges once, survives reload/respec/profession unlearning and remains separate for each hero. Older saves receive no free training. The fifteen equipment positions and version-1 save format remain compatible.

A trained hero can equip two distinct eligible one-handed weapons. Primary bonuses contribute 100%; secondary item and existing weapon enchantment bonuses contribute **50%**, including fractional values. Shields and focuses keep their full bonuses. Class-driven attacks and animations use the resulting build stats. Hunter melee pairs use the existing compact weapon position.

Eleven original blades bring the equipment catalog to **265 items and 47 weapons**, with **95 recipes** and the same **sixteen enchantment formulas**. All eleven suit Warrior/Rogue/Hunter and use the existing sword SVG.

| Region   | Local blade          | Equip level | Power / critical chance |
| -------- | -------------------- | ----------- | ----------------------- |
| Elwynn   | Goldshire Shortsword | 3           | 8 / 2                   |
| Westfall | Dustroad Sabre       | 6           | 14 / 3                  |
| Tirisfal | Stillwater Cutter    | 11          | 20 / 4                  |
| Duskwood | Ravenhill Sabre      | 19          | 26 / 5                  |

Local blades come from their recorded region's guarded caches and elite chests. Caches respect class and level gates; elites retain the existing higher-level local loot rule. Craft and guardian sources stay outside local pools.

Four Blacksmithing recipes use actual trained ranks, matching material grades, payment, duplicate-output refunds, capped practice and accepted profession-project credit. Crafting is independent of the selected class; wearing the result obeys class and level restrictions.

| Rank / skill    | Duelist Blade | Equip level / fee | Materials                       | Power / critical chance |
| --------------- | ------------- | ----------------- | ------------------------------- | ----------------------- |
| Apprentice / 1  | Campmade      | 2 / 35 G          | 8 Copper Ore + 2 Light Leather  | 8 / 1                   |
| Journeyman / 50 | Riveted       | 5 / 55 G          | 8 Tin Ore + 2 Medium Leather    | 14 / 2                  |
| Expert / 125    | Fitted        | 10 / 85 G         | 8 Iron Ore + 2 Heavy Leather    | 20 / 3                  |
| Artisan / 225   | Masterwork    | 18 / 140 G        | 8 Mithril Ore + 2 Thick Leather | 26 / 4                  |

Three rare blades enter actual guardian reward rooms, retaining class filtering and once-only partial-return settlement.

| Dungeon    | Guardian  | Blade                   | Equip level | Power / critical chance |
| ---------- | --------- | ----------------------- | ----------- | ----------------------- |
| Deadmines  | Mr. Smite | Ironclad Duelist Blade  | 10          | 21 / 4                  |
| Ragefire   | Bazzalan  | Emberedge Duelist Blade | 10          | 22 / 3                  |
| Shadowfang | Fenrus    | Fangguard Duelist Blade | 15          | 25 / 5                  |

Guardian pools now total **69 items**: Deadmines 21, Ragefire 23 and Shadowfang 25. Duskwood has twenty local world items plus its separate guaranteed epic trophy. The guide contains **134 unique pieces across nine families**: 51 world, 40 crafted, 40 dungeon and three campaign pieces. Its weapon family contains 25 discoveries. The off-hand filter includes 22 shields/focuses and seventeen eligible secondary weapons, yielding 39 choices without duplicating catalog entries. Opening an owned secondary from this filter keeps the satchel's off-hand filter.

## Reviewed transactions and compatibility

After training, an owned eligible one-handed weapon opens primary/secondary placement choices. Each lists the displaced item, restrictions and exact full-build changes, including enchantments and set effects. Reviewed hand swapping reverses the 100%/50% roles; cancellation leaves the save untouched. Shared enchantments follow their item and other heroes retain their placements.

Missing, unowned, two-handed, underlevel or class-incompatible primary equipment rejects secondary placement without mutation. The same item cannot occupy both hands on one hero. Moving a secondary to the primary clears its former position. Replacing a valid primary with another one-handed weapon preserves the secondary; main-weapon removal and the existing reviewed two-handed switch clear dependent off-hand equipment while retaining ownership and enchantments.

Imports accept only a strict true training flag on an eligible level-10 hero, then validate equipment in canonical primary-before-secondary order. Invalid, duplicated or unowned pairs are repaired regardless of raw property order. Direct stat calculation ignores invalid secondary pairs. All nine legacy builds retain their stats without training. Shared equipped gear remains protected from sale/disenchantment, and profession unlearning keeps owned gear/effects. The 91 older recipes and sixteen formulas retain their rules. Local startup still chooses the first available port.

## Verification

All **401 unit tests** pass, including twelve new dual-wield checks. Coverage includes all nine legacy classes, strict training/import repair, once-only fees and rejected transaction atomicity, exact fractional item/enchantment changes, valid placement/swaps, shared ownership/unlearning/destruction and actual Hunter combat damage. All four actual crafts verify grades, rank/skill gates, exact costs, practice, duplicate refunds and profession-project credit. Real cache/elite combat reaches all four local blades across **960 region/class/seed combinations**, excluding source leakage and novice-cache level violations. Actual guardian combat reaches all three recorded blades with once-only settlement. Strict TypeScript and the production build pass. Logs: `output/tests-0.27.log` and `output/build-0.27.log`.

The focused browser run passes **22/22 cases in 1.6 minutes**: seven new dual-wield flows, eight off-hand regressions and seven acquisition-guide regressions. New cases cover keyboard/touch training, cancellation and exact payment, both hand placements, swaps, enchantment-aware comparisons, another hero's unchanged shared pair, reload, main-weapon removal, reviewed two-handed replacement, actual Expert crafting and weapon enchanting, source navigation, explicit save-import confirmation and real Mr. Smite rewards/partial return. Log: `output/dual-wield-browser-0.27.log`; reproduce with `npx playwright test tests/e2e/dual-wield.spec.ts tests/e2e/offhands.spec.ts tests/e2e/wardrobe.spec.ts`.

All nine classes at six widths (360 / 390 / 760 / 800 / 1024 / 1440) yield **54 layout combinations** with fifteen sockets, 39 off-hand choices, 25 guide weapons and no horizontal overflow. New equipment/training/review/close controls meet 44px, accounting for coordinate rounding to a thousandth of a CSS pixel. Eight desktop/phone training, placement, Armory and swap captures were visually inspected after entry animations and transient toasts finished. Report: `output/dual-wield-layout-0.27.json`; captures: `output/screenshots/dual-wield-{training,placement,armory,swap}-{1440,390}-0.27.png`. Fixtures seed owned equipment/materials; guardian fixtures accelerate timers/reduce target health to isolate transactions. They do not establish physical-device feel or encounter difficulty.

All **198 browser cases** are verified. The complete run passed 197 in **10.4 minutes** and exposed a Duskwood preview assertion that counted the separately presented epic trophy among the local loot rows. The preview correctly lists twenty local items, including Ravenhill Sabre. After correcting the count and explicitly checking the new blade's handedness/level/classes, all **nine Duskwood cases passed in 42.9 seconds**. Gameplay code was unchanged during this correction. Logs: `output/browser-0.27.log` and `output/duskwood-browser-0.27.log`.

Repository formatting and `git diff --check` pass. The browser suites regenerated **109 historical tracked artifacts**, which were restored; current-release reports and eight captures are retained. Formatting log: `output/format-check-0.27.log`. Full evidence is recorded in [VALIDATION.md](VALIDATION.md).

## Prepared combat evidence

`node scripts/check-dual-wield-balance.mjs` records **81 attempts** across nine classes, three seeds and three prepared profiles through production combat. The existing off-hand heroic outcomes match v0.26 exactly. New profiles use actual personal training, graded Blacksmithing crafts and equip functions for Warrior/Rogue/Hunter, with two distinct sourced blades; the other six classes retain their existing shield/focus pairs. All new profiles fill fifteen sockets and obey the two-primary-profession limit, unlearning a finished armor trade where needed. Ownership, skill, rank, materials and levels are seeded. No encounter or ability values are retuned.

| Profile                       | Victories | Timeouts | Filled sockets | First upgrade | Successful duration |
| ----------------------------- | --------- | -------- | -------------- | ------------- | ------------------- |
| Unchanged off-hand heroic     | 23/27     | 0        | 15 / 14        | 5–35 s        | 481–495 s           |
| Dual-wield heroic             | 22/27     | 0        | 15             | 5–35 s        | 481–503 s           |
| Dual-wield level-10 Deadmines | 27/27     | 0        | 15             | 5–13 s        | 328–364 s           |

These are prepared-build diagnostics, not acquisition-time measurements or human win rates. Evidence: `output/dual-wield-balance-0.27.json` and three `output/balance-0.27-*.jsonl` reports. The wrapper retains movement-policy timeouts rather than hiding unsuccessful diagnostic outcomes.

## Remaining production work

A separate ranged socket, weapon-type proficiency training, affixes, durability, personal item instances/soulbinding and further enchantment families need separate designs. Expanded talents/spells, profession adventures, faction stories, dungeon routes, directional artwork and cooperative play remain later roadmap phases.
