# Release 0.13 — expanded equipment and acquisition guide

## Design before implementation

Expand equipment from six to ten slots: shoulders, cloak (back), belt (waist) and leggings (legs). Existing items, equipped gear, starter loadouts and version-1 saves retain their identities and attributes. New characters and existing saves begin with the four new slots empty. The shared satchel, class armor hierarchy, character level restrictions, sale protection, disenchanting, enchantments and set-aware comparisons continue to apply. The twelve enchantment formulas retain their existing supported slots.

Add forty original items with explicit acquisition paths: twelve outdoor discoveries (four per zone), twenty crafted items and eight dungeon guardian rares. Outdoor discoveries join existing elite chest and guarded cache pools; caches respect character level, while elite chests can hold equipment to grow into. Crafted and dungeon items never enter outdoor pools. Dungeon items join the appropriate guardian's existing class-filtered reward pool, with one item awarded per defeat. Owning an item converts later expedition duplicates to half its vendor value at settlement. Loot does not change the character's equipment during a run.

Each of the four crafted armor sets gains shoulders, a belt and leggings. Existing two- and three-piece bonuses remain unchanged; a modest sixth-piece bonus rewards completing the outfit. Expert recipes require skill 125 / 150 / 175 and character levels 10 / 12 / 15 to wear their outputs. Four alternative Artisan leggings require skill 225 and level 18. Four universal tailored cloaks span skills 25 / 75 / 150 / 225 and levels 3 / 8 / 12 / 18. All twenty recipes use the appropriate material grade and trained rank, and cost more than the duplicate-craft refund. Crafting uses the existing profession skill and guild project rules.

| Set                   | Additional six-piece bonus             |
| --------------------- | -------------------------------------- |
| Spellwoven Regalia    | +0.4 health/second, +15% pickup radius |
| Pathfinder's Garb     | +20 health, +5% movement speed         |
| Ironwarden Battlegear | +4% attack speed, +15% pickup radius   |
| Oathsteel Armor       | +20 health, +0.4 health/second         |

The Armory keeps the existing camp navigation. Its satchel gains a slot filter alongside class filtering. An expandable acquisition guide lists all forty additions, with slot, armor, level, stats, ownership and exact source. Source and slot filters help plan discoveries and crafts; source restrictions explain current access. Owned items link to their satchel card; crafting entries lead to the profession page. Empty new slots lead to the guide. New controls have at least 44px targets. Ten camp equipment sockets and the Armory fit phone, tablet and desktop widths.

Equipment adds power over time without changing existing abilities or encounter values. Verify the prior starter and core combat diagnostics, then run separate fully equipped profiles. Automated movement does not establish human difficulty, acquisition pacing or the best outfit. Wrists, rings, off-hands, dual wielding, durability and soulbinding remain later design work.

## Research

The original [Blizzard manual](https://assets.blz-contentstack.com/v3/assets/blt3452e3b114fab0cd/blt2e9295db02a222fc/6025bcbb6968b53d529edb2a/media_manual_classic_enUS.pdf), printed pages 58–61, describes one armor piece per equipment slot, level and class restrictions, and bonuses for collecting and equipping armor sets. It identifies back, waist and legs as early equipment and shoulders as later finds. Those relationships inform the new progression; this game's compressed gates, prices, stats and item names are original.

Original client tooltips mirrored by ClassicDB confirm slot and armor distinctions: [Linen Cloak](https://classicdb.ch/?item=2570) occupies the back, [Double-stitched Woolen Shoulders](https://classicdb.ch/?item=4314) is level-gated cloth shoulder armor, and [Rough Bronze Leggings](https://classicdb.ch/?item=2865) is level-gated mail leg armor. The guide uses these historical roles, without copying their item values or pretending to reproduce a complete Classic item database.

## Verification

Implementation is complete. Strict TypeScript checking, the production build and all **215 simulation/progression tests** pass. Twenty-two new checks exercise exact acquisition pools, actual elite/cache/guardian kills, all twenty crafting transactions, graded costs and trained caps, guild work, class/level gates, bounded imports, unchanged older equipment, shared sale protection, disenchanting, all four complete sets, comparisons when losing the sixth bonus, duplicate settlement and equipment affecting actual spell damage/healing.

All **78 browser checks** pass, including seven new flows covering the acquisition guide, combined filters, ownership links, source and equip gates, three actual crafts completing a six-piece outfit, saved comparisons/equipment, shared sale protection, old loadouts, six viewport widths and new items earned through real cache and dungeon combat. The capture script checks all nine class catalogs and all eight camp destinations at six widths with ready reward badges. New controls and camp equipment sockets measure at least 44px; no page overflows or browser errors were observed. An older three-column socket rule was corrected to allow a compact five-column grid, reducing columns when space requires. Desktop and phone captures were visually inspected; see `output/wardrobe-layout-0.13.json` and [validation](VALIDATION.md).

Six all-class, three-seed diagnostic profiles complete without timeouts. The starter Elwynn, six-slot core Tirisfal and six-slot trainer Tirisfal JSON reports are identical to release 0.12, retaining **27/27**, **19/27** and **23/27** victories. Ten-slot core Tirisfal finishes **21/27**, with first upgrades in **6–26 seconds** and successful finishes in **483–518 seconds**. Ten-slot level-10 Deadmines and Ragefire both finish **27/27**, in **327–386** and **332–369 seconds**. These profiles use real craft/equip actions and legal level gates. Entry heroes wear four set pieces, a Journeyman cape and level-10 world belt/leggings; they do not receive the six-piece bonus.

Run `node scripts/check-wardrobe-balance.mjs` to reproduce all six reports, or add `--wardrobe` to the normal balance command. These are prepared-loadout diagnostics with seeded world loot in the entry fixture, not acquisition-time measurements or human win rates. Human testing remains needed for ingredient costs, guardian drop distribution, outfit alternatives, difficulty and late-game reward pacing. Encounter values and existing spells were not retuned.
