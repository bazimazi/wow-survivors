# Combat foundations — 1.4

This pass changes how the player acts during a fight. Every class has an aimed Battle Art from the beginning of an expedition, supported by new hero animation sheets and richer spell impacts.

## Play controls

- Move with WASD. Aim with the mouse; hold left mouse or V to charge, then release to fire. A quick tap works, while a full charge takes 0.7 seconds and deals more damage.
- Charging slows movement to 55% and holds automatic spells. Space cancels into the class dash without spending the Battle Art cooldown. This creates a commitment window while leaving an escape available.
- Right mouse or C uses the existing class signature. Q heals, E throws a bomb, T uses equipment, and Escape pauses.
- On controller, hold LT/L2, aim with the right stick, and release the trigger. The class signature and dodge retain A/Cross and B/Circle.
- On touch, hold the new Battle Art button and release. The movement stick controls facing while charging. The button also accepts a held Enter or Space when keyboard focused.

## Class Battle Arts

| Class   | Battle Art       | What it does                                                    |
| ------- | ---------------- | --------------------------------------------------------------- |
| Warrior | Sundering Strike | A frontal cleave that knocks enemies away.                      |
| Mage    | Ice Lance        | A piercing aimed missile; full charge freezes ordinary enemies. |
| Rogue   | Shadow Lunge     | A forward lunge and directional cut with brief evasion.         |
| Hunter  | Piercing Shot    | A fast shot that rewards lining up several enemies.             |
| Paladin | Dawn Hammer      | An impact on targeted ground, limited by casting range.         |
| Priest  | Purifying Ray    | A straight beam; hitting enemies restores up to twelve health.  |
| Shaman  | Storm Surge      | Lightning jumps through up to six distinct nearby targets.      |
| Warlock | Soul Implosion   | A targeted blast that pulls surviving ordinary enemies inward.  |
| Druid   | Thorn Spear      | A piercing thorn; full charge roots ordinary enemies.           |

Battle Arts have independent cooldowns and scale with character power and expedition level. Bosses resist the freeze and displacement effects. Fast missiles use swept collision, so a target between simulation samples still gets hit. Pauses, upgrade choices and losing focus cancel held input. Class signatures, prepared spells, progression and co-op remain part of the combat loop; the new aimed Battle Art is controlled by player one.

## Animation and effects

Nine new hero sheets provide 144 illustrated run and action poses. Front and back cycles include changed leg positions, raised weapons, torso turns, releases and follow-through. Foot registration, small body motion and facing selection connect them to movement and accepted attacks. Form and mount rigs continue to animate their existing artwork.

Holy, shadow, storm and nature now have painted impact sequences. Projectiles leave short retained trails. Battle Arts have ground footprints, charge feedback, directional slashes, piercing cores, lightning branches and placed impact volumes. Their hits produce stronger recoil, sparks, sound and optional camera response. The charge and cooldown button communicates readiness without a separate menu.

The renderer precomputes small hero frames once and bounds expensive simultaneous impact textures. Gameplay timing, damage and random state stay inside the simulation. Reduced motion and effect settings remain available.

## Validation

Unit checks cover aiming, piercing, charged crowd control, cooldowns, movement cost, dash cancellation, paused release, directional hit shapes, range limits, healing, chain uniqueness and swept collision. Browser checks exercise mouse, keyboard, touch and controller input, every hero sheet, pause behavior, reduced motion, existing class combat and dense scenes with 400 enemies. Visual captures are under ignored `output/combat-1.4/`.

See [artwork and exact prompts](combat-animation-art.md).

## Production milestones toward the larger ambition

This is still a 2D game in development. The new sheets are short four-pose cycles, and most creatures still use the existing procedural rigs. A world-class production standard requires further work beyond this build:

1. Establish a reference encounter with a complete enemy roster, attack anticipation, evasion and stagger rules, and repeated playtesting of the first ten minutes.
2. Expand hero animation into longer directional cycles with independent movement and upper-body actions, authored hit reactions, interrupts, deaths and transitions. Apply the same animation standard to enemies.
3. Give every skill an authored cast, travel, impact and lingering effect sequence with matching audio and clear damage footprints. Tune readability under dense combat before adding more visual effects.
4. Build encounter variety and progression around meaningful decisions, then validate balance, performance, accessibility, content quality and replayability throughout a sustained production cycle.

These are future milestones, not features claimed by this release.
