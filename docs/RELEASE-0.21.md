# v0.21 — Hero and companion combat gestures

## Design recorded before implementation

Continue the animation roadmap with six authored poses each for magical casting, melee strikes and ranged release. Apply original texture deformation to all nine heroes and their wolf/imp/totem companions, including Bear Form and code-drawn fallbacks. Reuse existing illustrations; add no extracted or generated artwork. These brief gestures respond after accepted actions, without introducing cast times, delaying damage or restricting movement.

Add an optional presentation callback carrying the acting object, simulation time, aim and spell/ability identity. Notify only when the engine accepts an automatic spell or class ability, the wolf actually bites in range, or a ranged companion launches a projectile. Failed resource/target/healing/cooldown checks, periodic damage ticks, passive orbit hits and travelling companions do not trigger gestures. Existing sound/UI events and trial/progression rules retain their behavior.

Keep combat pose state weakly in the renderer. Use the simulation clock for a short complete gesture, preserve it through pause/choices/recovery/results/focus loss, and avoid restart loops when several automatic spells succeed together. Class abilities can interrupt ordinary gestures. Aim determines gesture facing; the distance-driven locomotion tracker continues underneath and resumes after the gesture. Large clock jumps/rewinds and motion disabling discard expired gestures. The existing animation setting and live reduced-motion preference apply to combat poses.

Share the existing 192-frame character LRU and two-build-per-render budget, retaining the creature queue's independent limits. Action poses use distinct cache keys and the existing padded mesh. Keep deformation continuous, finite and non-folding within the padding. Verify successful/failed engine triggers, all nine identities and every companion/form crop, geometry, native pixel frames, paused/overlapping actions, reduced motion, unavailable art, normal input and dense rendering. Compare deterministic simulation with and without the callback. Creature combat poses, death cycles and new directional artwork remain later phases.

## Implemented behavior

All **nine heroes**, wolf/imp/fire-totem companions and **Bear Form** now respond to accepted actions with six-pose magic, melee or ranged gestures. Each 0.42-second response gathers, draws back, releases, follows through, recovers and settles. Continuous original texture weights keep feet braced while moving upper-body, weapon, head or flame regions. Original source illustrations stay intact; missing-image drawings use a small lean/reach response. [Art notes](ART.md) record the frame sheets.

The optional `EngineConfig.onAction` presentation callback carries the acting object, simulation time, aim and spell/ability identity. Successful automatic spells, healing and class abilities notify it after their gameplay effect is accepted. Wolves notify only for actual in-range bites; imps and totems notify only when a projectile is launched. Failed target/resource/heal/cooldown checks, damage ticks, orbit hits and travel do not start gestures. Existing audio/UI events and class-trial credit remain compatible.

The renderer retains weak combat state independently of simulation. Co-occurring automatic spells finish their current gesture instead of repeatedly restarting the draw-back pose. Accepted class abilities have interruption priority; cooldown retries do not interrupt. Gesture facing follows accepted aim. Movement remains responsive and observed locomotion continues underneath, resuming after the brief braced pose.

Combat time drives pose selection. Pause, upgrade/shrine choices, recovery/results and focus loss hold the response; resume continues it. Clock rewinds, expiry, travel and motion disabling discard stale gestures. The existing Character animation setting and live device reduced-motion preference apply. Re-enabling motion waits for a new action instead of replaying an old response.

Combat frames share the existing **192-frame character LRU** and **two-build-per-render** limit. The creature cache retains its independent **128-frame / 128-pending / one-build** limits, so rapid casts and crowded encounters cannot add unbounded pose work. Save schema/key, resources, cooldowns, combat timing and automatic free-port startup retain their existing behavior.

## Verification evidence

All **331 unit checks** pass, including ten new combat-animation checks. They cover action classification, all eighteen combat keys and eight rigs, finite non-folding padded geometry, actor identity/aim, overlap/interruption, time/freeze/reset/disabling, successful/failed real-engine notifications and companion range/projectile/travel guards. Same-seed comparisons across all nine classes verify identical gameplay state, RNG, existing events and run results with and without the presentation callback. Strict TypeScript and the production build pass.

The complete browser regression passes **151/151 cases** in **7.2 minutes**, including the existing animation, controller, music, profession, encounter and progression flows. Repository formatting passes. [Validation](VALIDATION.md) records commands, logs and measurements.

All **ten new browser cases** pass. Native Canvas checks produce **234 frames** across thirteen crops, three styles and six poses, with six distinct frames per crop/style and no outer-border alpha. Actual engine actions exercise all nine starters, healing, overlapping spells and priority abilities, wolf/imp/totem actions and Bear Form. Other cases cover pause/upgrades/focus recovery, animation disabling, live reduced motion, unavailable atlases and normal keyboard/phone pointer input. Contact sheets and phone/desktop captures were inspected.

The native-clock diagnostic advances real combat against **400 enemies** for 180 render samples, including ongoing hero spells and class abilities. It compares sampled gameplay state/RNG before and after every render, instruments both construction budgets and checks bounded cache/queue storage. Exact measurements and reproduction commands appear in [Validation](VALIDATION.md); local Canvas CPU time excludes engine updates and display presentation and does not establish physical-device FPS.

Creature attack gestures, death cycles, separately painted directional views and physical-device animation feel remain later production work.
