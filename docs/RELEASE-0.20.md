# v0.20 — Creature locomotion

## Design recorded before implementation

Continue the animation roadmap with locomotion for every illustrated outdoor and dungeon enemy, including elites and guardians, plus the code-drawn Mr. Smite and missing-image fallbacks. Reuse the original world, Ragefire, Shadowfang and Duskwood atlases. Bipeds, robes and quadrupeds reuse the existing authored gaits; original heavy, arachnid, slither and hover rigs suit stone creatures, spiders, earthborers and spirits. These are texture deformations over the existing illustrations.

Observe actual positions and simulation time without adding animation fields to the engine or consuming random numbers. Distance sets phase; actor identity offsets initial phase. Frozen enemies hold their pose, stationary guardians return to neutral during warning pauses, and large teleports reset the baseline. Facing follows horizontal movement and remains stable when idle. Existing health bars, control outlines, damage flashes and encounter warnings retain their presentation.

Give creatures a separate 128-frame cache and a fair, bounded queue that builds one frame per render. Keep the hero/companion/travel cache's 192-frame capacity and two-frame budget. Visible creature misses use the neutral illustration while waiting, and earlier requests cannot be starved by foreground actors. Together these caches retain at most 320 padded 144-pixel canvases, about 25.3 MiB of RGBA storage, plus temporary construction canvases. Turning animation off or enabling reduced motion clears queued work and draws neutral actors.

Use the existing Character animation setting and version-1 save data. Verify all enemy mappings and native Canvas frames, real movement/slow/freeze and guardian warnings/teleports, cache fairness and limits, disabled/reduced motion, missing images and dense moving crowds. Inspect contact sheets and phone/desktop captures. Encounter balance, rewards and simulation rules stay compatible. Casting, attacks, deaths and newly illustrated directional views remain later phases.

## Implemented behavior

All **36 illustrated creature identities** use renderer-only gait state over **35 distinct crops**, with Blackguards sharing the Defias illustration. Every current outdoor/dungeon roster and illustrated guardian has rendering metadata in `src/creature-animation.ts`. Elites and guardians scale both illustration and stride. Actual horizontal movement determines facing, including separation and charges; idle retains its previous facing. Mr. Smite and missing-image/unknown-creature code drawings use observed gait keys instead of wall-clock leg oscillation.

The four new rigs add smaller foot displacement for heavy bipeds, alternating spider leg groups with restrained body transfer, a traveling earthborer wave and lower-trail spirit sway. Existing biped, robe and quadruped rigs handle the remaining creatures. Eight raster poses per crop reuse the padded mesh from release 0.19. Corrected world/Ragefire crop measurements remove neighboring fragments and retain complete staffs/limbs in neutral and animated drawing. Original PNG assets are unchanged; [art notes](ART.md) record exact measurements and contact sheets.

Creature freezing is independent of global pause: an enemy's current pose holds while the rest of combat continues. Slow effects naturally reduce cadence through observed distance. Guardian warning pauses return the stationary actor to neutral; the actual Arugal teleport resolves to a neutral baseline, then resumes movement. Large jumps, skipped simulation time and rewinds retain the existing baseline safeguards.

The creature LRU retains **128 frames** with at most **128 queued misses**. FIFO construction builds at most **one creature frame per render**, including after the cache reaches capacity. It shares cached crops across actors and releases canvas backing stores on eviction. Hero/companion/travel animation retains its independent **192-frame / two-build** allowance. Cold creature misses use the source illustration while awaiting construction. Animation disabled or live reduced motion clears queued work, uses neutral drawings and keeps simulation running. Save schema/key and free-port startup remain compatible.

## Verification evidence

All **321 unit checks** and **141 browser cases** pass; the full browser regression finishes in 6.8 minutes. Six new unit checks cover roster coverage, crop scaling, identity phase offsets, queue fairness, construction limits, bounded waiting/storage, eviction disposal/cancellation and independent hero budgets. Geometry checks now cover all eight rigs and every gait pose. Strict type checking, production build and repository formatting pass.

The **seven new browser cases** pass. Native pixel checks cover 35 crops × eight poses, with eight distinct frames, intact visible silhouettes, changing pixels and no alpha at the padded outer two-pixel border. Four contact sheets and phone/desktop encounter captures were visually inspected. Real engine cases exercise movement, slow/freeze continuation, idle/facing, guardian warnings and Arugal's actual teleport, missing atlases/Mr. Smite, animation disabling, live reduced motion, keyboard movement and paused warning presentation.

The native-clock crowd diagnostic advances the real engine with **400 mixed-roster moving enemies**, yields to animation frames between renders and compares sampled gameplay state/RNG before and after every draw. All 36 identities move, all 35 crops receive cached frames, storage/waiting stays within 128, and construction stays at one even during eviction churn. Hero frames build independently. This mixed-destination fixture is heavier than any production roster. Local Canvas CPU time excludes engine updates and display presentation; it does not establish mobile FPS or physical-device animation feel. Exact results and regression commands appear in [Validation](VALIDATION.md).

These original rigs animate existing illustrations and horizontal mirroring. Casting, attack/death poses, separately painted directional views and physical-device feel remain later production work.
