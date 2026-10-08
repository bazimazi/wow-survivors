# v0.19 — Authored character walk cycles

## Design recorded before implementation

Continue the research roadmap's animation phase with eight authored gait poses for all nine heroes, their wolf/imp companions, Bear Form, mounted travel and both travel forms. Retain the original illustrated atlases and animate their limbs and torso through continuous texture deformation. This is an original code-authored rigging pass, without new generated artwork or copied game frames. Walking uses alternating foot contact/lift, counter-swing and body weight transfer; mounts/forms use a quadruped gait, and moving totems use a restrained sway.

Drive gait phase from observed world distance and the simulation clock, rather than held input or wall-clock time. Idle actors use the original neutral illustration. Paused combat, upgrade/blessing choices, recovery, results and focus loss hold the pose. Teleports and clock resets establish a new neutral baseline. Track live actor objects weakly, without altering simulation state, random calls, collision radii, spell timers, travel speed, progression or balance.

Cache deformed frames at a bounded resolution with a fixed capacity and per-render construction budget. Reuse frames across actors and mirror at drawing time. Existing missing-image fallbacks remain available. [MDN's Canvas optimization guidance](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) supports pre-rendering repeated artwork into offscreen canvases; [the reduced-motion media query](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) provides the device preference. Add a saved Character animation toggle and respect reduced motion in the renderer. Migrate older version-1 saves safely.

## Verification plan

Test deterministic movement-driven phase, neutral idle, stopped/blocked movement, independent actors, mirrored facing, pause/continuation, clock resets, teleport handling, finite bounded deformation and save migration. Native Canvas browser checks must verify actual changed limb pixels and intact atlas crops for all heroes, companions, Bear Form and travel sprites. Exercise production keyboard/controller/touch movement, pause, upgrades, travel, settings/reload and reduced motion. Capture a pose contact sheet and gameplay at phone/desktop widths, inspect them visually, and compare dense-scene bounds/CPU measurements. Run the complete unit/browser/build/format checks and document limits.

Creature-specific walking/attack/death cycles, separately illustrated directional frames and class-specific casting animations remain later art-production work. This release implements character locomotion rather than claiming a complete animation library.

## Implemented behavior

Four original rigs cover nine hero illustrations, wolf/imp/Bear Form/fire totem and nine travel sprites. Eight key poses define contact, recoil, passing and high point for alternating feet. Continuous texture weights keep limb/torso joins connected; robes use a lower hem/foot region, quadrupeds shift their leg pairs, and totems sway. Mounted riders retain their seated crop with gait-synchronized weight transfer. Measured hero row boundaries and small overlapping-row masks remove stray neighboring boots/staff pixels from idle and animated art.

`ActorAnimator` observes world positions in a WeakMap. Distance advances phase, horizontal movement updates facing, and unchanged position selects the neutral illustration even when input is held against a wall. Repeated paused renders retain phase without adding time. Large position jumps, invalid positions, long simulation-clock gaps and clock reversal cannot create spurious strides. The simulation and its random stream are unaffected.

`createAnimationFrame` rasterizes an 8 × 12 texture mesh into a 128-pixel interior with eight pixels of padding. A per-renderer LRU retains at most **192 frames**, approximately **15.2 MiB of RGBA backing stores**, plus temporary construction canvases. No more than **two frames are constructed per render**; missing entries fall back to the neutral source image until their frame can be cached. Hits remain a single cached draw. Eviction zeros the old canvas dimensions to release its backing store. Existing creature drawing retains its original sprites/bobbing, which also stops when character motion is disabled.

Settings adds **Character animation**, enabled by default for new and older saves. Turning it off keeps movement and combat available with neutral illustrations. The renderer reads the live device reduced-motion preference, so changes take effect without a reload. Keyboard, pointer/touch and the existing controller navigation can reach the toggle. Save schema/key remains v1; music and effects retain their independent settings.

## Verification evidence

All **315 unit checks** and **134 browser cases** pass, including eight new unit checks and ten new browser flows. Strict type checking, production build and formatting also pass. The native 400-enemy render diagnostic averages **1.68 ms CPU / 2.2 ms p95** on this machine and confirms rendering leaves sampled simulation state and RNG unchanged.

Results and exact commands are recorded in [Validation](VALIDATION.md). The new cases cover movement phase and actor isolation, blocked movement, pause/resume, teleports and clock resets, finite non-folding geometry, LRU construction/disposal, old-save migration and actual browser rendering/input. Pixel checks cover **22 crops × 8 poses**. Contact sheets show intact silhouettes, changing feet and counter-swing, with no alpha at the padded frame's outer two pixels. Phone and desktop settings fit all six established widths.

The dense-scene diagnostic uses native performance time, yielding to animation frames between samples. It confirms 400 finite enemies, renderer-only state, bounded cached frames and working movement when hero art cannot load. CPU measurements exclude display presentation and do not establish mobile FPS. Full regression, type checking, build and formatting results appear in the validation notes.

These rigs animate the existing three-quarter illustrations and mirror horizontal facing; they do not create new front/back perspectives, occluded limb artwork or casting/attack/death poses. Visual feel on physical devices and animation direction remain manual production review.
