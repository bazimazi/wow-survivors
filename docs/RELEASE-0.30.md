# v0.30 — Equipment practice, upkeep and personal attunement

## Scope and sources

Continue the remaining equipment roadmap and remove generated repository artifacts. The [original Blizzard manual](https://assets.blz-contentstack.com/v3/assets/blt3452e3b114fab0cd/blt2e9295db02a222fc/6025bcbb6968b53d529edb2a/media_manual_classic_enUS.pdf), printed pages 58–62 and 94, describes ranged Shoot actions/ammunition, weapon practice improving accuracy, soulbinding, durability and repairs. Class descriptions inform the added families; obsolete pre-release racial restrictions are excluded. Shortened gates, numerical rules, selectable affixes and equipment names are original survival adaptations.

This completes a substantial equipment pass. The broader roadmap still includes full vanilla talent trees, additional spells, profession/faction adventures, more routes, directional illustrations and optional cooperation. Multiple independently rolled copies and multiplayer item trading are not implemented.

## Weapon families and acquisition

| New family      | Classes                               | Level | Training fee | Equipment position           | Crafting      |
| --------------- | ------------------------------------- | ----- | ------------ | ---------------------------- | ------------- |
| Two-handed axes | Warrior, Hunter, Paladin              | 5     | 55 G         | Primary, both hands          | Blacksmithing |
| Fist weapons    | Warrior, Rogue, Hunter, Shaman, Druid | 3     | 40 G         | Primary or trained secondary | Blacksmithing |
| Guns            | Warrior, Rogue, Hunter                | 3     | 40 G         | Ranged                       | Engineering   |
| Crossbows       | Warrior, Rogue, Hunter                | 5     | 55 G         | Ranged                       | Engineering   |

Each family has four world discoveries, four graded crafts and three guardian rewards: **44 additional items and 16 recipes**. Existing axe/polearm prices, items and access stay compatible. Twenty-one eligible class/family training combinations cover the six advanced families. Crafts use real grade/rank/skill/cost transactions and accepted profession-project credit; equipment access still requires personal training.

Totals: **353 equipment definitions, 127 recipes, 135 weapons, 24 enchantment formulas and sixteen positions**. The guide lists **222 unique pieces**: 83 world, 72 craft, 64 guardian and three campaign sources. It includes 69 primary, 61 off-hand and 46 ranged choices, with legitimate overlap between positions. Dungeon pools contain 29 Deadmines, 31 Ragefire and 33 Shadowfang rewards; Duskwood has 28 local discoveries plus its separate guaranteed trophy.

## Personal practice and equipment attacks

Each hero saves weapon-family skill independently. Known old families begin at 5 on a fresh hero; new purchases begin at 1. Eight landed direct weapon hits earn one point, capped at five times persistent character level, up to 300. A deficit reduces weapon accuracy by 0.2 percentage points per missing point, at most 15%. Practice improves accuracy during the expedition and settles on return. Magic, periodic ticks, companions and supplies earn no weapon practice. Hunter arrows credit only a usable ranged family, never an equipped melee pair or a broken ranged item.

The optional **T / equipment button / RT or R2** action shoots a valid ranged weapon, or strikes with the primary within 150 units when no ranged weapon is available. Both share a 2.5-second cooldown. Shots target within 650 units. Bows, guns and crossbows consume one stored ammunition per accepted shot, including misses. Wands, throwing sets and melee strikes consume none. No target, pause, choices, recovery, completed runs and cooldown reject before charging. Camp sells fifty ammunition for 10 G, up to 9,999 stored. Automatic class abilities retain their existing resource costs.

Combat uses a frozen starting equipment/skill snapshot. It does not read changing camp gear during a run. Accepted optional attacks report ordinary presentation actions. Phone Shoot/Strike and Travel controls occupy separate horizontal regions.

## Condition and repairs

Return settlement removes three condition per full minute from starting owned equipment, plus ten on actual defeat, capped at twenty per expedition. Voluntary returns have no defeat penalty. Starting weapons and basic starter armor remain at 100; newly obtained rewards remain pristine. Wear is settled with rewards once, using the existing run identity guard.

A zero-condition piece retains its placement but loses its item, enchantment and affix bonuses and set contribution. Other pieces keep their bonuses. The Armory shows condition and a clear broken label. Individual and equipped-loadout repairs open a cancellable review and cost `ceil(value × missingCondition / 500)`, at least 1 G per damaged piece. Confirmation rechecks the exact quote, ownership and funds. Repairs preserve enchantments, bindings and affixes; shared pieces are repaired for the roster.

## Affixes, binding and enchantments

Enchanting can attune an eligible nonstarter item with one of six original affixes: Force, Vitality, Guarding, Precision, Haste or Recovery. Bonuses scale with the item's material grade; level-18 Artisan gear uses grade IV. Costs are 25/50/75/100 G and 3/4/5/6 matching-grade dust, requiring Enchanting 1/50/125/225. Successful applications practice within the trained cap and credit accepted matching-grade guild work. Same-effect and failed applications grant nothing.

The review explicitly states that confirmation permanently binds that owned item to the selected hero. Equipment on another hero must be unequipped first. Other heroes cannot equip or swap its bound weapons. Replacing an affix consumes a new cost and retains binding. Affixes coexist with the existing single enchantment, contribute 50% on a trained secondary, and enter complete-build comparisons. Sale/disenchanting removes all item state; reacquisition starts pristine. Duplicate craft/loot refunds keep the existing owned piece and its effects.

Four cloak and four shield/focus formulas add graded enchantments without changing earlier formulas. Secondary weapons continue using weapon formulas. Rings/necklaces and other unsupported positions remain outside this formula catalog.

The inventory retains **one owned copy per equipment definition**, with optional condition/owner/affix state. This supports personal attunement without pretending to implement multiple rolled instances or replacing all established shared loadouts.

## Save compatibility and repository cleanup

Save version and local-storage key remain 1. Missing old item state means pristine/unbound equipment; ammunition defaults to zero. Pre-0.30 saves without skill records migrate their previously known families to the current skill cap, preserving established accuracy without granting unpaid training. Explicit skill records are bounded and limited to trained/class-eligible families. Imports sanitize item ownership, condition, affixes and ammunition before canonical loadouts; another hero's bound placements are removed.

Removed **369 generated files totaling 158,737,044 bytes**: 276 screenshots, one downloaded PDF and generated reports. `output/` is ignored. All eighteen runtime assets/license files remain, totaling 19,997,504 bytes; no bitmap was added. Nineteen required historical baselines were preserved, then twelve identical profiles consolidated into three, leaving **ten fixtures totaling 122,449 bytes** in `tests/fixtures/balance/`. Every comparison script reads those fixtures and creates its own output directory.

`npm run check:repo` checks runtime asset references, output exclusion and surviving tracked artifacts. Historical documentation retains the original evidence paths with a notice that captures are now local/regeneratable. Cleanup changes the current tree and prevents future output growth; it does not rewrite Git history.

## Verification

All **444 unit tests** pass, including nineteen new equipment checks and expanded existing training/acquisition checks covering all twenty-one purchases, twenty-four crafts, twenty-four local rewards and eighteen actual guardian reward sources. Strict TypeScript and the production build pass.

Browser, visual, full combat and final repository checks are recorded in [validation notes](VALIDATION.md). Generated evidence remains local under ignored `output/`.
