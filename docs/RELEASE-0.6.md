# Wow Survivors 0.6 — the Deadmines

## Design before implementation

The three outdoor expeditions provide a complete survival loop, but there is no dungeon journey with intermediate bosses. This release adds a three-stage Deadmines expedition: the Mast Room, the Ironclad approach and the Captain's Deck. Each stage has its own arena, survival timer and boss. Defeating the first two bosses opens a paused recovery choice before proceeding; only defeating Edwin VanCleef completes the dungeon.

The original [BradyGames Deadmines guide](https://ptgmedia.pearsoncmg.com/imprint_downloads/brady/wow/deadmines/Deadmines%20HRBW.pdf) describes a dungeon beneath Westfall, mechanical workrooms, the Ironclad ship, Sneed's Shredder, Mr. Smite and Edwin VanCleef. These identities and the mine-to-ship setting inform this adaptation. Three compact arenas, timings, solo access for every class, telegraphed attacks, recovery choices and item statistics are original designs. This is a selected-boss survival journey, not the full original dungeon or its group combat rules.

## Rules

- Unlock the dungeon by defeating the Westfall boss. Enter with the selected hero at character level 10 or higher. Cleared zones persist separately from the twenty-entry history; older saves infer clears from retained victories.
- Survive 90 seconds in the Mast Room, 105 seconds on the Ironclad Approach and 120 seconds on the Captain's Deck, then defeat each stage's boss. Boss fights can extend these times. Run level, spells, upgrades, supplies and accrued rewards persist between stages.
- Sneed's Shredder marks saw lanes and furnace blasts. Mr. Smite marks hammer blows and expanding stomp rings. VanCleef marks crossing blade lanes and calls blackguards during ambushes. Each boss intensifies below half health. Telegraphs use the same visible/collision geometry as outdoor bosses.
- Each defeated boss immediately awards one class/armor-eligible rare item, gold and materials. After the first two bosses, choose a temporary boon: damage, defense/regeneration or speed/pickup radius. Boons can stack. Continuing also restores 30% maximum health and all resource, clears the old arena and starts the next stage at its entrance.
- Recovery choices freeze the clock and do not consume supplies. A return-to-camp action retains defeated-boss rewards without granting dungeon victory. Rewards settle once, and partial boss progress appears in results/history. Final victory awards a journal objective.
- Dungeon arenas have finite visible boundaries shared by movement, dash, active movement and enemy spawns. Cave floors, mine machinery and ship decking are authored with Canvas shapes and existing local sprites. Dungeon stages replace outdoor landmarks; they do not grant the existing outdoor faction reputation or advance zone-specific commissions.
- Version-1 saves remain supported. New fields default safely, malformed dungeon progress is bounded, and old outdoor rules remain intact. Active dungeon runs, like outdoor runs, do not resume after reload.

## Verification

The complete suite passes: **83 simulation/progression tests and 30 browser integration tests**, plus strict TypeScript checking and the production build. Thirteen new simulation tests cover stage timing, both attacks and phases of each boss, recovery/input freezes, carried builds, boundaries, partial rewards, duplicate settlement, save migration and clear persistence. Every class receives eligible guardian loot across three seeds and defeats a guardian with its real automatic attack. Eight new browser tests cover camp eligibility, keyboard recovery, partial return, complete victory, journal claim, equipment/reload, touch controls, all three boss HUDs and a dense dungeon render scene.

Production-timing dungeon diagnostics completed all 27 prepared level-10 cases and all 27 level-21 cases: nine classes across three seeds per build. Runs took 330–363 seconds and 326–358 seconds respectively; first upgrades occurred within 5–14 seconds. These builds have all six equipment slots filled, allocated talents and supplies. The policy knows world state, avoids warnings and chooses recovery boons; these results do not establish a new-player or human win rate. No encounter statistics were retuned to force the diagnostic to win.

The 400-enemy dungeon render check averaged 1.27 ms of CPU time with a 1.9 ms 95th percentile over 60 Chromium frames across the three rooms. This excludes presentation and is specific to the development machine. All local sprite atlases loaded. Desktop and phone captures of the route, guardians, recovery and results were inspected; fixture runs shorten arrival/health for flow coverage and do not change production encounters.

## Content and limits

The catalog now contains **82 equipment items, 55 recipes and nine journal objectives**. The ten new rare items require character level 10 and appear in stage-specific reward pools. The dungeon-clear journal reward is claimed manually at camp. Save version 1 remains supported; cleared zones survive history trimming. An older Westfall win already absent from retained history cannot be inferred and needs another clear.

This route selects three bosses from the original dungeon. Additional Deadmines bosses, the cannon sequence, original quests, a complete navigable map and cooperative encounters remain future content. Props are scenery, while each arena's outer boundary constrains combat. Reloading does not resume an unfinished run. Further human sessions are needed to assess boss readability, difficulty, build diversity and reward pacing.
