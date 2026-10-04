# Release 0.3 — Encounters & boss identities

## Design before implementation

The previous release connects combat to talents, equipment and crafting. Its world still offers little reason to choose a route, and all three bosses share one attack pattern. This release gives movement meaningful destinations and makes the final fight depend on the selected zone.

Classic's exploration, quests, equipment and trade skills provide the foundation documented in [RESEARCH.md](RESEARCH.md). The shrines, rituals, rewards and boss attacks here are original survival-game rules, not reproductions of Classic encounters.

## Scope

- Six fixed landmarks in each zone: two shrines, two guarded caches and two rituals. Placement is authored, while enemy and loot outcomes use the expedition seed.
- Nearby discovery reveals world labels and minimap markers. A compass guides the player to an unfinished landmark. F or a visible touch/click button interacts within 85 world units.
- Shrines pause time and offer three expedition-only blessings. Choosing consumes that shrine exactly once; leaving preserves it. Two shrines can supply the same blessing.
- Caches require defeating three marked guards. They award a usable uncommon item, gold, run XP and materials. Level requirements apply to the loot pool.
- Rituals require 20 seconds inside a clearly marked 175-unit circle. Progress decays at half speed outside. Reinforcements arrive while progressing. Rewards include healing, gold, XP and materials.
- One defended encounter is active at a time; shrines can still be visited while its guards or ritual remain active. Cache guards use zone-specific enemy identities.
- Landmarks cannot start during the final boss fight. An active cache or ritual can still finish. Pausing, level-up choices and shrine choices freeze encounter timers.
- Hogger alternates a telegraphed charge and a close stomp. The Defias Captain alternates firing lanes and dynamite. The Gravekeeper alternates a ring with a safe center and targeted grave eruptions. Below half health, each pattern intensifies.
- Telegraph damage resolves once after its warning, using the same geometry as the renderer. Boss names, phase, health and attack instructions have their own HUD.
- Completed encounters persist through run settlement, appear in results/history and advance two exploration quests. Existing version-1 saves default the new counter to zero.

## Verification plan

Test hazard geometry and one-time damage, both phases of every boss, shrine cancellation/stacking, guards before reward, ritual range/decay/pause, reward settlement and old-save repair. Exercise real keyboard and click flows, narrow layouts, rendering of each telegraph, and the existing combat/progression browser suite. Rerun seeded simulations with geometry-aware avoidance as a diagnostic, not a human win-rate estimate.

## Save compatibility

Verified with 45 simulation/progression tests, 14 browser tests, seeded full expeditions, original atlas decoding, and desktop/touch screenshots. Detailed measurements and limits are in [VALIDATION.md](VALIDATION.md).

The storage key and version remain unchanged. The new `totals.encounters` and optional run-history count default to zero for older saves. Talent, equipment, recipe and existing quest identifiers retain their meanings. Completed encounter rewards settle with the expedition; active progress and blessings reset for the next run. Multiple copies of the same loot collected during one run now each receive their proper duplicate-item gold conversion at settlement.
