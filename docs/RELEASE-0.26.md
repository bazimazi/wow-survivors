# v0.26 — Off-hands and weapon handedness

## Design recorded before implementation — 7 October 2026

Continue the equipment roadmap with a fifteenth off-hand position and explicit one-/two-handed fit for every weapon. Preserve existing item names, bonuses, eligibility, shared ownership and version-1 saves. An empty off-hand leaves old stats unchanged. Shields suit Warrior/Paladin/Shaman; held focuses suit Mage/Priest/Warlock/Druid. An off-hand requires an equipped one-handed weapon. Rogue/Hunter retain their current equipment choices; secondary weapons and dual wielding need a separate design. Bows remain in the compact weapon position and occupy both hands; wands use a one-handed fit there. This is an adaptation of the original distinct ranged position.

Add thirty original items: four local one-handed maces, four local caster blades, eight local off-hands (shield/focus per region), eight four-grade shield/focus crafts, and six rare guardian off-hands (one pair per dungeon). Local off-hands require levels 2/5/10/18, local weapons 3/6/11/19; guardian equipment requires 10/15. Blacksmithing makes shields and Enchanting makes focuses at skills 1/50/125/225 with ranks 1/2/3/4, exact matching-grade costs and fees. These are original production choices. Off-hands do not join armor sets or gain new formulas. Preserve all 83 older recipes and sixteen formulas.

Reject off-hand equip while wielding a two-handed weapon or no weapon. Equipping a two-handed weapon clears only that hero's off-hand, keeping the item owned; review exact full-build changes, the removed item and cancellation before committing in the UI. Removing the main weapon also clears its dependent off-hand. Imports retain the canonical main weapon and discard an incompatible off-hand regardless of raw property order. Direct stat calculation ignores incompatible off-hand bonuses. Shared sale/disenchant and once-only reward settlement continue to apply.

Show handedness/type, off-hand requirements and exact comparisons in camp, Armory, the acquisition guide and previews. Extend the guide with weapon/off-hand families and the existing late-region/dungeon weapons now belonging to those families. Keep local rewards separate from crafts/guardians and respect cache level gates; elites may preserve higher-level local gear. Add an original focus SVG icon, reusing the shield line icon.

Verify all old stats/imports, pair transactions and atomic rejection, all nine classes, two-handed removal including enchantment bonuses, all eight graded crafts/training/project rules, actual region/guardian rewards, settlement and shared ownership. Exercise keyboard/touch reviews, saves and source navigation, nine classes at six widths, 44px controls and inspect phone/desktop captures. Compare the unchanged fourteen-slot baseline with legal prepared off-hand builds through production combat and actual crafting/equip transactions; report movement-policy stalls and seeded acquisition limits. Run unit/build/browser/format checks and preserve historical artifacts. Dual wielding, a separate ranged position, weapon training, affixes, durability and personal item instances remain future designs.

## Research

Blizzard's [original manual](https://assets.blz-contentstack.com/v3/assets/blt3452e3b114fab0cd/blt2e9295db02a222fc/6025bcbb6968b53d529edb2a/media_manual_classic_enUS.pdf), printed pages 58–59, distinguishes primary/off-hand equipment, two-handed occupancy, shields and held objects, dual-wield proficiency and a separate ranged position. Printed pages 70/80/82 identify shield access for Warrior, Paladin and Shaman. These relationships inform this phase. Class focus access, compact weapon placement, original items/bonuses, production paths, level gates and costs are survival-game decisions.

## Implemented equipment and sources

All 36 weapons have explicit handedness. Existing bonuses, names and class eligibility remain unchanged. The fifteenth socket holds a shield for Warrior/Paladin/Shaman or a focus for Mage/Priest/Warlock/Druid, paired with a present one-handed weapon. Rogue/Hunter retain their existing fourteen-item builds. No extra migration equipment is granted.

Thirty original items bring the catalog to **254 items**, with **91 recipes** and the same **sixteen enchantment formulas**. Each outdoor region has a one-handed mace, caster blade, shield and focus. These uncommon local rewards come from guarded caches and elite chests; source filtering prevents crafts/guardian gear leaking into outdoor pools. Caches respect class and character level; elites retain the established ability to award local gear the hero can grow into.

| Region   | Shield / focus                              | One-handed mace / caster blade              | Off-hand / weapon level |
| -------- | ------------------------------------------- | ------------------------------------------- | ----------------------- |
| Elwynn   | Trailguard Buckler / Candlelight Focus      | Goldshire Cudgel / Northshire Spellknife    | 2 / 3                   |
| Westfall | Sentinel's Shield / Harvestlight Lantern    | Sentinel's Mace / Harvest Spellblade        | 5 / 6                   |
| Tirisfal | Stillwater Bulwark / Whispering Grimoire    | Gravewarden Mace / Whispering Spellknife    | 10 / 11                 |
| Duskwood | Nightwatch Tower Shield / Ravenhill Lantern | Nightwatch Warhammer / Ravenhill Spellblade | 18 / 19                 |

Eight rare crafts follow the existing grade, rank, payment, duplicate-output, practice and accepted profession-project rules. Blacksmithing produces shields; Enchanting produces focuses. Both use the following milestones. Crafting is independent of the selected class, while wearing the output obeys class, level and weapon fit.

| Rank / skill    | Item level / fee | Shield costs                    | Focus costs                   |
| --------------- | ---------------- | ------------------------------- | ----------------------------- |
| Apprentice / 1  | 2 / 25 G         | 6 Copper Ore + 2 Light Leather  | 4 Strange Dust + 2 Peacebloom |
| Journeyman / 50 | 5 / 40 G         | 6 Tin Ore + 2 Medium Leather    | 4 Soul Dust + 2 Briarthorn    |
| Expert / 125    | 10 / 65 G        | 6 Iron Ore + 2 Heavy Leather    | 4 Vision Dust + 2 Kingsblood  |
| Artisan / 225   | 18 / 110 G       | 6 Mithril Ore + 2 Thick Leather | 4 Dream Dust + 2 Sungrass     |

Six rare guardian off-hands use actual dungeon reward rooms:

| Dungeon    | Shield source                           | Focus source                     | Equip level |
| ---------- | --------------------------------------- | -------------------------------- | ----------- |
| Deadmines  | Sneed's Shredder — Foundry Guard        | Edwin VanCleef — Tideglass Focus | 10          |
| Ragefire   | Oggleflint — Cleft Bulwark              | Jergosh — Soulfire Focus         | 10          |
| Shadowfang | Commander Springvale — Oathbound Shield | Arugal — Eclipse Focus           | 15          |

Guardian pools now total **66 items**: Deadmines 20, Ragefire 22, Shadowfang 24. Class-specific reward filtering, shared ownership and once-only partial-return settlement remain in effect. Duskwood has nineteen local world items and its separate guaranteed epic trophy.

The source guide covers **123 pieces across nine families**: 47 world, 36 crafted, 37 dungeon and three campaign pieces. Its weapon family includes eight new regional weapons and six existing Duskwood/Shadowfang weapons newly categorized by the expanded guide. The off-hand family contains 22 items. Camp tooltips, Armory cards, source rows and outdoor/dungeon previews show handedness, shield/focus type and the one-handed requirement; recipe links show exact materials and rank/skill costs. The original focus SVG joins the existing shield/weapon icons.

## Transactions and compatibility

Off-hand equip rejects missing/two-handed weapons, wrong classes/levels, unowned items and wrong sockets without mutation. One-handed weapon replacement preserves the off-hand. A two-handed replacement clears only the selected hero's off-hand; both displaced items and their existing enchantments stay in shared ownership. The review lists the old weapon, removed off-hand and exact changes to the full build, including weapon enchantments and any set effects; keyboard/touch cancellation leaves the save untouched. Removing the main weapon also clears the dependent off-hand.

Version-1 imports validate the canonical weapon before the off-hand regardless of property order, discarding impossible/unowned/forbidden pairs and forged off-hand enchantments. Direct stat calculation ignores off-hand bonuses beside a missing/two-handed weapon. Empty off-hands preserve old stats for all nine classes. Unlearning a crafting profession keeps crafted gear; shared equipped items cannot be sold/disenchanted. All 83 older recipes and sixteen formulas retain their rules. Off-hands gain no set membership or formulas. Local startup still selects the first available port.

## Verification

All **389 unit tests** pass, including fifteen new off-hand checks. Coverage includes every weapon's fit, all nine classes, legacy imports/stats, canonical pair repair, rejected transaction atomicity, exact two-handed comparisons including weapon enchantments, one-handed replacement/unequip, all eight real crafts and training/project gates, shared ownership/unlearning, unsupported formulas and actual attack/contact-defense effects. Across 960 region/class/seed combinations, real cache/elite combat reaches all sixteen new local items without source leakage; novice caches exclude level-gated gear. Real guardian kills award all six recorded off-hands and settle once. Logs: `output/tests-0.26.log` and `output/build-0.26.log`.

The focused browser run passes **15 cases in 37.0 seconds**, including all eight new off-hand cases and the seven acquisition-guide regressions. New checks exercise actual import repair, keyboard/touch replacement review with cancellation, exact enchantment-aware changes, shared heroes, save/reload, main-weapon removal, exact Expert/Artisan crafting and accepted guild credit, unlearning, real cache/guardian rewards and partial return. All nine classes at six widths yield **54 combinations**, with fifteen sockets, 22 off-hand/14 weapon discoveries, no horizontal overflow and 44px equipment/review/close controls. Report: `output/offhand-layout-0.26.json`; log: `output/offhand-browser-0.26.log`. Six phone/desktop camp, guide and review captures were visually inspected in `output/screenshots/offhand-*-0.26.png`. Fixtures seed owned gear/materials; reward fixtures accelerate room timers/reduce target health to isolate transaction behavior.

All **191 browser cases** are verified. The full run passed 189 in 9.8 minutes; two older phone-layout assertions still expected 83 recipes instead of 91. After correcting those counts, all six affected progression/training cases passed in 18.8 seconds, preserving the actual crafting, reviewed specialization, training, layout and reload flows. Gameplay code was unchanged during this correction. Strict TypeScript, production build, repository formatting and `git diff --check` pass. The 105 historical tracked artifacts regenerated by the browser suite were restored; the v0.26 reports and six captures are retained. Full evidence and log paths are recorded in [VALIDATION.md](VALIDATION.md).

## Prepared combat evidence

`node scripts/check-offhand-balance.mjs` uses production combat and actual craft/equip transactions across nine classes, three seeds and three profiles: **81 attempts**. The one-handed alternatives are explicitly sourced regional weapons; skill, rank, ownership, levels and materials are seeded. Seven classes wear Expert/Artisan shield or focus pairs; Rogue/Hunter keep fourteen sockets filled. Enchanting crafts for caster profiles fit the two-primary-profession limit, unlearning a finished armor trade when necessary. No encounter or ability values are retuned.

| Profile                        | Victories | Timeouts | Filled sockets | First upgrade | Successful duration |
| ------------------------------ | --------- | -------- | -------------- | ------------- | ------------------- |
| Unchanged fourteen-slot heroic | 22/27     | 1        | 14             | 5–29 s        | 482–504 s           |
| Off-hand heroic                | 23/27     | 0        | 15 / 14        | 5–35 s        | 481–495 s           |
| Off-hand level-10 Deadmines    | 27/27     | 0        | 15 / 14        | 5–13 s        | 328–359 s           |

The unchanged fourteen-slot outcomes match v0.25 exactly. Its retained Warrior/Protection seed-2026 timeout is an existing movement-policy stall: the living boss remains 1,681 units away at the 600-second diagnostic limit. These profiles measure prepared builds, not acquisition time, loot luck or human win rates. Evidence: `output/offhand-balance-0.26.json` and three `output/balance-0.26-*.jsonl` reports.

## Remaining production work

Dual wielding, a distinct ranged socket, weapon proficiencies, affixes, durability, personal item instances/soulbinding and further enchantment families require separate designs. Expanded talents/spells, profession adventures, faction stories, dungeon routes, directional artwork and cooperative play remain later roadmap phases. Automated browser/layout checks do not establish physical-device or human combat feel.
