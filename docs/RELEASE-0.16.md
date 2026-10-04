# v0.16 — Duskwood and the Night Watch

## Design recorded before implementation

The original publisher's [2006 World of Warcraft Atlas regional index](https://ptgmedia.pearsoncmg.com/imprint_downloads/brady/connected/wowatlas/RegionalIndices_hr.pdf), Duskwood pages 28–29 (zero-based PDF pages), associates wolves and Nightbane worgen with Brightwood, undead with Raven Hill and Tranquil Gardens, Defias with Yorgen and ogres with Vul'Gol. Blizzard's [Stitches historical lore](https://news.blizzard.com/en-gb/article/15053030/stitches-hero-week) connects Abercrombie's creation to Darkshire and the Night Watch. The index was studied as text; its map was not visually inspected. These references inform setting and identities. Combat patterns, expedition structure, equipment and progression below are original adaptations; the Heroes of the Storm ability list is not a reference for Classic combat.

## Scope

Add a fourth outdoor expedition, making seven destinations. Duskwood requires a persistent Shadowfang Keep clear and selected character level 20. Survive nine minutes, then defeat Stitches. Use difficulty 1.8 initially and base boss health 46; evaluate prepared combat before changing those values. Other destinations retain their existing spawning, loot and balance.

Introduce eight ordinary creature types: dire wolf, black widow, rotted one, skeletal raider, Nightbane worgen, skeletal mage, Splinter Fist ogre and Defias night blade. Wolves and spiders appear first; undead join at 35 seconds, worgen and mages at 150, and the full roster at 300. Only wolves and worgen are skinnable. Six existing landmark mechanics receive local identities: Night Watch lantern, Raven Hill supplies, Tranquil Gardens vigil, Brightwood lantern, Yorgen strongbox and Vul'Gol watchfire. Existing grade I–IV gathering gates apply. This destination does not advance another destination's guild projects, commissions or faction campaign objectives.

Add twelve level-20 rare world items covering all ten slots and melee, Hunter and caster weapons. Local cache and elite pools respect class, armor and level eligibility. Defeating Stitches always awards an exclusive level-20 epic trinket, Watchkeeper's Oath. It cannot drop from ordinary encounters. The four-slot acquisition guide gains four world items (shoulders, back, waist and legs), taking it from 48 to 52 pieces. Add a once-only Night Watch Journal milestone for the persistent clear; retain save version/key v1 and old-save compatibility. No new recipes or faction.

## Stitches encounter

Alternate a captured-direction cleaver fan and captured-position embalming spills. Phase one warns three cleaver lanes for 1.35 seconds and one spill for 1.65 seconds. Below half health, five lanes extend farther and two spills cover separate positions. Cleaver lanes deal one hit. A spill becomes a green cloud lasting 3.2 seconds, with an initial hit and three further ticks 0.8 seconds apart; shared player invulnerability prevents simultaneous clouds multiplying a hit. Move outside the marked boundary to avoid ticks. Only live-caster clouds persist; defeat cancels them. Warning and cloud timers freeze during pause and upgrade choices. Keep the 48-hazard cap and existing circle/line containment and player defenses. Original boss patterns remain unchanged.

## Presentation and verification plan

Create an original transparent nine-creature atlas, a native vector camp scene, cemetery/forest scenery, green cloud boundaries and readable active-cloud labels. Preview entry gates, six landmarks, boss tactics and guaranteed trophy before departure. Keep eight navigation tabs and responsive controls across six established widths.

Test entry and persistence, all nine classes' loot eligibility, actual landmark and gathering operations, new spawning/skinning, both boss phases, warning geometry, repeated cloud damage, movement avoidance, pause/choice freezes, orphan cleanup, bounded hazards, real boss-only victory and trophy settlement. Browser checks exercise production selection, combat, settlement, Journal claim, equip/reload and responsive preview. Compare existing seeded combat profiles and evaluate legal level-20 Duskwood builds. Record measured results and limits after implementation.

## Implemented progression and combat

Duskwood is the seventh destination and fourth outdoor expedition. Both entry requirements are enforced for the selected hero; persistent clears survive the retained history limit and save reload. The catalog has **189 items**, **75 recipes**, ten equipment slots and **52 acquisition-guide pieces**. The twelve local rare items cover every slot, with three class-role weapons. Caches and elites check level, class and armor eligibility; ordinary encounters cannot award the Stitches trophy. Existing six destinations retain their spawning and loot rules.

Stitches alternates the captured-direction three/five-lane cleaver and one/two captured-position spills. A cloud hits initially, then three more times over its 3.2-second duration. Its green boundary remains visible with an active-cloud label; player defenses and shared invulnerability apply. Ownerless clouds disappear, death clears hazards and surviving the timer alone cannot finish this expedition. Warning and cloud timers freeze during pause, upgrades and shrine choices. The final trophy gives +16% damage, +50 health, +7 armor and +0.8 regeneration. An existing profession-reward comparison caught that the initial +9 armor made the Blacksmithing mastery trinket obsolete; +7 preserves its armor advantage. First clear enables a once-only Journal claim of 250 gold, 300 character XP and six Dream Dust.

The original nine-creature atlas uses genuine alpha and measured aspect-preserving crops. [Art notes](ART-0.16.md) contain provenance, exact prompt and saved paths. The native vector camp scene shows the lantern road and cemetery. The guide previews entry, all six landmarks, both boss patterns, the twelve random rewards and the guaranteed trophy. During Stitches' fight the exploration and travel panels collapse to leave more space for warnings, especially on phones.

## Prepared combat comparisons

Three seeds for every class use the existing movement, upgrade, active-skill and supply policy. Duskwood entry uses a legal level-20, twenty-point hybrid build with six owned/equipped baseline items. The ten-slot profile crafts and equips its six-piece armor set and Artisan cape through progression transactions; funds, materials and training are preparation fixtures. Neither profile starts with Duskwood rewards. All earlier profiles are JSON-identical to v0.15.

| Profile                                | Victories | First upgrade | Successful finish |
| -------------------------------------- | --------- | ------------- | ----------------- |
| Existing starter                       | 27 / 27   | 6–48s         | 364–419s          |
| Existing core heroic                   | 19 / 27   | 6–45s         | 482–548s          |
| Existing trainer heroic                | 23 / 27   | 6–45s         | 482–562s          |
| Duskwood level-20 six-slot entry       | 16 / 27   | 5–47s         | 542–578s          |
| Duskwood level-20 ten-slot preparation | 24 / 27   | 5–47s         | 541–562s          |

No run times out. A separate `--cloud-aware` movement variant considers active poison as well as warnings; both Duskwood profiles retain the same victory counts and finish ranges. The diagnostic duration is actual survival plus boss combat. These are seeded prepared-build comparisons, not human win rates, optimal builds, loot acquisition rates, time to level 20 or estimates of how quickly a player clears the prerequisite dungeons. Human playtesting remains necessary for progression pacing and encounter difficulty. Initial difficulty 1.8 and base boss health 46 were retained.

Raw reports: `output/balance-0.16-*.jsonl`; summary: `output/duskwood-balance-0.16.json`. Reproduce with `node scripts/check-duskwood-balance.mjs`, then `node scripts/check-duskwood-balance.mjs --cloud-aware`.

## Verification evidence

The full simulation/progression suite passes **281/281**, including 23 new Duskwood checks. They cover both access gates and old saves, all-class cache/elite eligibility across seeds, actual guards and cache completion, frontier gathering, wolf/worgen skinning, ranged casters, timed rosters, four poison ticks at multiple frame durations (including the timestep clamp), body containment, overlapping clouds, safe movement, pause/choice freezes, owner cleanup, bounded hazards, all-class boss death, guaranteed trophy settlement, duplicate salvage, selected-hero equipment, persistent clear and once-only Journal rewards. Destination-specific guild and faction campaign progress remains unchanged by Duskwood runs. Strict TypeScript and production build pass.

Nine new browser flows exercise production selection, keyboard combat, repeated poison damage, pause and escape, cache/shrine/ritual completion, fieldwork, victory, Journal claim, equipment and reload. Fixtures expose an engine reference only inside the routed test page, control health/XP/time and select a random cache reward; combat, supply consumption, encounter rewards and settlement use production code. No runtime test hook is shipped.

All **105 browser cases** are verified across the full regression run and final targeted checks. The full run passed 104/105, exposing an older Ragefire test that excluded Jergosh's third eligible wardrobe reward. It now selects the actually received item from the production stage pool. All **17/17 Duskwood and Ragefire checks** pass after that correction and the final boss-HUD adjustment. Logs are `output/browser-0.16.log` and `output/browser-0.16-followup.log`; the latter records the resolved failure.

Captures verify camp and active-boss layouts at 360 / 390 / 760 / 800 / 1024 / 1440, seven destinations, six landmark previews and eight navigation tabs. The acquisition capture checks 52 pieces, ten slots, nine class filters and all 48 camp-page/width combinations. All seven combat atlases decode; a 400-enemy Duskwood scene remains finite and bounded. Desktop camp, phone boss and all nine cropped silhouettes were visually inspected. Reports are `output/duskwood-layout-0.16.json` and `output/wardrobe-layout-0.16.json`; screenshots are `output/screenshots/duskwood-*.png`. Reproduce with `node scripts/capture-duskwood.mjs` and `node scripts/capture-wardrobe.mjs`.
