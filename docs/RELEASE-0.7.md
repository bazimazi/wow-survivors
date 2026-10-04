# Wow Survivors 0.7 — class trials and enchanting

## Design before implementation

The nine heroes already have class spells and talents, but no personal quest journey. Enchanting currently crafts equipment and recycles loot without augmenting an item. This release addresses both gaps in two connected phases: class trials that teach the existing combat system, then permanent item enchantments that deepen camp preparation.

Blizzard's [Classic class-quest announcement](https://news.blizzard.com/en-us/article/23302789/wow-classic-class-quests-and-new-reputation-rewards) describes trainer-led chains and class-specific rare rewards. The [original manual](https://assets.blz-contentstack.com/v3/assets/blt3452e3b114fab0cd/blt2e9295db02a222fc/6025bcbb6968b53d529edb2a/media_manual_classic_enUS.pdf), printed pages 101–102, connects magical equipment augmentation, formulas and disenchanting ingredients. Our trial chapters, compressed level gates, relics, formula bonuses and fees are original designs. They do not reproduce level-50 quest chains, original rewards or the multiplayer trade window.

## Phase one: class trials

- Every hero has an independent three-chapter trial, managed in the Journal. Accept chapters manually; only future runs by that hero contribute. Progress accumulates across defeat, early return and victory. Claim each chapter before starting the next.
- Chapter one, character level 1: cast the starter spell forty times against a valid target and successfully use the active ability twice.
- Chapter two, level 5: reach rank three in the class's second spell and defeat an elite. These can happen in different runs. Companion/orbit spells can satisfy rank requirements.
- Chapter three, level 10: evolve any class spell to rank five and defeat an outdoor boss or dungeon guardian. These can also happen in different runs.
- Chapters award gold and selected-hero XP; chapter two adds dust, and chapter three awards one original class-exclusive level-10 rare relic. Acceptance snapshots the chapter into the run, preventing progress from crossing a claim or acceptance boundary. Old saves start with unaccepted trials, without retroactive credit.

## Phase two: equipment enchantments

- Twelve formulas at skills 1, 50, 125 and 225 affect weapon, chest, hands or boots. Learn Enchanting to apply them at the Armory's table. Formula and item eligibility, gold and materials are checked before any charge.
- One enchantment belongs to each owned item. The existing inventory shares one copy of an item across the roster, so its enchantment follows that item to every hero wearing it. It persists after unequipping and forgetting Enchanting. Selling or disenchanting the item destroys its enchantment; reacquiring it starts clean.
- Review the item, previous/new enchantment, exact stat changes, cost and skill gain before applying or replacing. Reapplying the same formula is blocked. Replacement overwrites the old effect and consumes a fresh cost.
- Bonuses contribute to hero stats, real combat and replacement comparisons alongside talents and sets. Enchantment practice follows recipe difficulty and trained caps. Disenchanting skill gains also respect the trained cap.
- Version-1 saves remain supported. Unknown formulas, unowned items and mismatched slots are removed during validation.

## Verification

The complete suite passes: **99 simulation/progression tests and 36 browser integration tests**. Sixteen new simulation tests cover all nine class chains and relic eligibility, future-run/class/chapter isolation, bounded accumulation, duplicate settlement/claims, level gates, migration and malformed fields. Actual combat produces valid cast/active evidence, rank upgrades, elite/boss kill evidence and increased damage from a permanent weapon enchantment. Formula checks cover atomic fees and materials, class/slot/level/skill gates, replacement, shared equipment, lost bonuses in comparisons, forgetting Enchanting, selling/reacquiring, diminishing practice and trained caps.

Six new browser flows cover explicit acceptance, hero switching, real casts/active use and saved returns, an actual rank-five evolution through upgrade choices, final relic claim/equipment/reload, review cancellation/application/replacement, shared chest effects after forgetting the profession, and phone tapping. The evolution fixture supplies starting XP for quicker real choices; an already completed boss objective represents a previous return. These fixtures do not establish human completion pacing. All saves are isolated from the player's browser.

The layout capture reports no browser errors or horizontal overflow in Journal, Armory, Professions and Expedition at 360, 390, 760, 800, 1,024 and 1,440px, including the complete formula catalog. Narrow navigation and enchantment confirmation targets meet the 44px minimum. Trial, table, loadout and replacement screenshots were inspected.

The regression render checks loaded the original atlases and held entity limits: outdoor 400-enemy CPU average 1.48 ms/95th percentile 2.3 ms; dungeon average 1.33 ms/95th percentile 1.8 ms over 60 frames each. These development-machine CPU timings exclude presentation and do not predict performance on other devices.

## Content and limits

The catalog now contains **91 equipment items, 55 crafting recipes, twelve enchantment formulas, nine journal milestones and 27 class-trial chapters**. Existing version-1 saves migrate without awarding old trial progress. Active expeditions do not resume after reload, so pending trial evidence follows the same return-to-camp rule as other run rewards.

Trials use the existing spells, elites and guardians; they do not add dedicated quest maps or faithfully reproduce vanilla class quest routes. Enchantment bonuses are static stats, with one shared copy of each item and no formula for head/trinket slots. Human playtesting is still needed for chapter level gates, completion pacing, relic balance, formula costs and the combined strength of talents, sets and enchants.
