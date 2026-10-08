# v0.25 — Necklaces and bracer enchantments

## Design recorded before implementation — 7 October 2026

Continue the equipment roadmap with one neck position, bringing each hero to fourteen sockets. Add eleven original universal necklaces: one local discovery for each outdoor region and seven guardian rewards across the three dungeon routes. World equipment levels are 4/7/12/20; Deadmines and Ragefire rewards require level 10, Shadowfang rewards level 15. No new armor sets, crafted jewelry or profession is introduced. Existing shared item IDs, version-1 saves and equip/sale/duplicate-settlement rules continue to apply; old neck positions start empty.

Add four original wrist formulas at Enchanting skills 1/50/125/225, spending the matching material grades and gold through existing reviewed, atomic application/replacement. Offer health, armor, focus and recovery alternatives, with one permanent effect per bracer. Applied effects follow the shared item across heroes and survive unlearning the trade. Necklaces and rings receive no formulas. Preserve the twelve existing formulas and their exact costs/bonuses. Derive eligible targets and catalog counts from the formula definitions, include wrists in the table, and show readable position labels and exact costs.

Extend sockets, Armory filters, the acquisition guide and expedition previews. Each necklace has an explicit local or guardian source; caches enforce local source and character level, while elite chests can preserve gear for a later level. Add an original SVG necklace icon. Check old saves/imports, each actual reward source, cross-region exclusions, exact comparisons, armor/level/skill/material gates and trained practice caps, all four real formula applications and reviewed replacement, shared ownership and once-only settlement. Exercise keyboard and touch, all nine classes, six widths and 44px controls. Compare prepared thirteen-slot and fourteen-slot builds, including enchanted bracers, using production combat and real equip/enchant transactions; record the limits of seeded acquisition fixtures.

Run unit, type/build, browser and formatting checks; inspect current-release captures and preserve historical evidence. Off-hands, handedness, dual wielding, affixes, personal item instances and further profession/faction content remain separate designs.

## Research

Blizzard's [original manual](https://assets.blz-contentstack.com/v3/assets/blt3452e3b114fab0cd/blt2e9295db02a222fc/6025bcbb6968b53d529edb2a/media_manual_classic_enUS.pdf), printed pages 58–59, describes one necklace position and distinguishes jewelry from armor; necklaces arrive later than initial wrist armor and rings. Printed pages 101–102 describe equipment enchantments and disenchanting supplies. These relationships inform this phase. Item names, direct survival attributes, compact levels, formula fees/material amounts and shared ownership are original game designs.

## Implemented behavior

`src/necklaces.ts` defines eleven universal items and their explicit sources. The catalog contains **224 items, 83 recipes, fourteen sockets and sixteen enchantments**. Four local uncommon necklaces require levels 4/7/12/20 in Elwynn, Westfall, Tirisfal and Duskwood. Seven rare pendants come from Smite and VanCleef; Taragaman and Bazzalan; Silverlaine, Fenrus and Arugal. Deadmines/Ragefire items require level 10 and Shadowfang items level 15. The guardian pools now contain 18/20/22 items, totaling 60.

The **87-item guide across seven families** shows world/guardian sources and eligibility, and the satchel can filter necklaces. Local caches enforce source and level; elite treasure can preserve higher-level local gear. Crafted items and guardian rewards cannot leak into the new world pools. Duskwood's preview shows fifteen local discoveries plus its guaranteed epic trophy. Necklaces have no armor restrictions, recipes, set membership or enchantments.

Appending the neck position leaves old version-1 loadouts empty there and preserves their complete stats. Import validation accepts only owned, eligible neck items in that position and rejects forged jewelry effects. Other heroes can share the same item. Equip comparisons include every changed stat; ownership protects sales across heroes. Rewards settle once into inventory and remain unequipped until a camp action.

Four original formulas extend the existing reviewed, atomic Enchanting flow:

| Formula            | Skill | Fee  | Exact materials              | Equipped effect               |
| ------------------ | ----- | ---- | ---------------------------- | ----------------------------- |
| Wristward Vigor    | 1     | 12 G | 3 Strange Dust, 1 Peacebloom | +10 health                    |
| Wristguard         | 50    | 25 G | 4 Soul Dust, 2 Tin Ore       | +3 armor                      |
| Spellthread Focus  | 125   | 50 G | 6 Vision Dust, 3 Kingsblood  | +4% damage, +2% attack speed  |
| Evergreen Recovery | 225   | 95 G | 8 Dream Dust, 4 Sungrass     | +24 health, +0.4 regeneration |

The target selector derives supported positions from formula definitions and includes eligible owned bracers. Catalog/target/review labels use readable equipment names. Ownership, armor, character level, known trade, formula skill, gold and exact material grades remain required. One effect follows each shared item; identical reapplication is blocked, replacement consumes its fresh cost, unlearning retains the effect, and destruction clears it. The twelve earlier formulas and all crafting recipes retain their values. Rings and necklaces have no formulas.

Existing training behavior is preserved: an eligible formula can apply at the trained cap while gaining zero practice; the next rank restores capped practice. Accepted guild work receives matching-grade application credit once per successful transaction.

## Prepared-build diagnostics

`node scripts/check-necklace-balance.mjs` runs nine classes across three seeds in each of four profiles (**108 attempts**), using production combat and real crafting, equipment and enchantment transactions. Necklace/ring ownership, character levels, profession skill/ranks and ingredients are prepared fixtures. Non-tailors unlearn Tailoring after crafting their cape to free a primary slot for Enchanting; the owned cape remains wearable. Level-21 bracers receive recovery, and level-10 entry bracers receive focus. This measures prepared builds, not acquisition time, random-drop fairness or human win rates.

| Profile                                            | Victories | First upgrade | Successful finish | Timeouts |
| -------------------------------------------------- | --------- | ------------- | ----------------- | -------- |
| Level-21 thirteen-slot Tirisfal                    | 24/27     | 5–29 s        | 481–501 s         | 0        |
| Level-21 fourteen-slot Tirisfal                    | 22/27     | 5–29 s        | 482–504 s         | 1        |
| Level-21 fourteen-slot, enchanted wrists           | 23/27     | 5–29 s        | 481–504 s         | 1        |
| Level-10 fourteen-slot Deadmines, enchanted wrists | 27/27     | 5–13 s        | 324–363 s         | 0        |

The thirteen-slot report is identical to saved v0.24 equipment, camp stats, upgrades and combat outcomes. All new profiles equip fourteen eligible items; enchanted profiles record the applied wrist effect and exact added stats. Equipment does not improve every seed under this movement policy: different haste/damage changes subsequent combat and random decisions. No encounter or spell values were retuned.

Both timed-out runs are the Warrior's Protection build at seed 2026: it survives with 2,927 kills but remains 1,681 units from the living Gravekeeper at the 600-second diagnostic budget. The report retains the boss/player positions and health instead of discarding these stalls. This exposes a limitation of the simple pickup/chase movement policy; these outcomes do not establish human completion rates. Ingredient costs, reward pacing and alternatives still need human playtesting. Evidence: `output/necklace-balance-0.25.json` and `output/balance-0.25-{thirteen-slot-heroic,fourteen-slot-heroic,fourteen-slot-heroic-enchanted,fourteen-slot-deadmines-entry-enchanted}.jsonl`.

## Verification

Implementation is complete. All **183 browser cases** are verified: the complete run passed 182 cases in **9.7 minutes** and exposed one older Deadmines assertion that assumed a specific random staff reward. The enlarged pool can award other eligible gear. That test now equips the item actually secured in its expedition history, retaining the real three-guardian victory, Journal claim, save and reload checks. All **eight dungeon cases** then passed in **47.1 seconds**; gameplay code was unchanged during that correction. Logs: `output/browser-0.25.log` (initial run) and `output/dungeon-browser-0.25.log` (corrected dungeon suite). The suites regenerated 95 historical tracked artifacts, which were restored; current-release reports and eight captures are retained. Repository formatting and `git diff --check` pass; `output/format-0.25.log` records formatting.

All **374 unit checks** pass, including twelve new necklace/wrist checks. They cover unique definitions and recorded sources; legacy stats and canonical imports; all-class eligibility and exact comparisons; ownership, level, skill, gold, grade and duplicate transaction rejection; all four formula costs/bonuses and trained practice caps; accepted guild credit; shared effects after unlearning; protected sales, destruction and clean reacquisition; and actual spell damage. Strict TypeScript and the production build pass. Logs: `output/tests-0.25.log` and `output/build-0.25.log`.

Actual guarded-cache/elite combat reaches all four local necklaces across 480 region/seed pairs, excluding other regions and guardian rewards; novice caches cannot award a level-4 necklace. All seven rare pendants are earned through actual kills in their recorded guardian rooms, with once-only settlement and later equip. These fixtures accelerate room timers, reduce target health and provide extra health and bomb capacity; they verify reward and transaction plumbing rather than encounter difficulty.

All **seven new browser cases** pass (**23.5 seconds** in the focused run). They cover old loadouts, readable source filters, exact equip/replacement comparisons, cross-hero sale protection, grade costs, reviewed cancellation and keyboard confirmation, touch replacement, accepted guild credit and duplicate blocking, shared effects after unlearning/reload, level/skill gates, actual cache and two-room guardian reward flows, partial returns and once-only settlement. Routed fixtures expose the engine without production test hooks, accelerate timers and set selected targets to one health; supplies still pass through the actual consumption transaction. Log: `output/necklace-browser-0.25.log`. Reproduce with `npx playwright test tests/e2e/necklaces.spec.ts`.

All nine classes at **360, 390, 760, 800, 1024 and 1440 pixels** fit fourteen camp sockets, eleven necklace discoveries and four wrist formulas without horizontal overflow. Camp/formula controls are at least 44px in all **54 combinations**, recorded in `output/necklace-layout-0.25.json`. Enchantment review controls, including the enlarged close button, meet 44px at all six widths. Eight desktop/phone captures were visually inspected: `output/screenshots/necklace-{camp,guide}-{1440,390}-0.25.png` and `output/screenshots/wrist-{formulas,replacement}-{1440,390}-0.25.png`. Review captures finish their CSS entry animation.

Save schema/key and automatic first-free-port startup remain compatible. Off-hands, weapon handedness, dual wielding, durability, affixes and personal item instances remain future designs.
