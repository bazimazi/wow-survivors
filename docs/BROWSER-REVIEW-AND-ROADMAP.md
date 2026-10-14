# Wow Survivors browser review and expansion plan

Reviewed October 14, 2026. Direction: a polished 2D action roguelite with expressive characters and deeper combat.

Wow Survivors has substantial RPG breadth: nine classes, five outdoor destinations, four dungeon routes, equipment, talents, professions and persistent journeys. Its presentation and moment-to-moment play are less developed than its content catalog. The next investment should make each encounter, character and location more distinctive, with a clear first adventure that teaches those strengths.

## Browser coverage

The review used actual Chromium windows in isolated browser profiles. All eight main menus and their 31 desktop page turns were visited at 1440 × 1000. All eight menus were also captured at 390 × 844. Camp services, expedition preparation, the field guide, Mastery and Settings were reviewed through their page turns, along with Pause, Results and dungeon recovery choices.

Keyboard movement, mouse charge/release and class signatures were exercised for all nine classes. All nine destinations and 20 guardian scenes were captured: five outdoor bosses and the 15 rooms across Deadmines, Ragefire, Shadowfang and Scarlet Monastery. Late-game captures used an explicit level-40 test save and accelerated simulation time; they establish visual coverage rather than campaign difficulty or human win rates. These capture sessions reported no browser page errors. Screenshots are under `output/review-before/`, `output/review-after/` and `output/living-combat/`.

## Screen findings

| Screen      | Desktop pages | What works                                                                                                                | What needs development                                                                                                                                                                       |
| ----------- | ------------: | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Expedition  |             2 | The illustrated departure screen, nine-class roster and clear launch action give the game its strongest first impression. | The opening run should teach aiming, charge timing and class mechanics through a short playable sequence. The large preview needs articulated movement while preserving its original detail. |
| Talents     |             3 | Three class paths and permanent choices give builds direction.                                                            | Similar rectangles dominate the tree. Add meaningful connections, specialization previews and visible changes to the hero's combat identity.                                                 |
| Spellbook   |             3 | Preparation and permanent training are understandable.                                                                    | Explain which abilities combine and let players try a prepared build in a practice arena. Show actual animated spell examples rather than relying on stat descriptions.                      |
| Armory      |             5 | Equipment gates, comparisons and upkeep are substantial.                                                                  | Sixteen slots form a long narrow column beside large empty areas. Replace that arrangement with a character equipment view, a compact inventory and a focused comparison pane.               |
| Professions |             7 | Gathering, crafting and guild projects connect expeditions to preparation.                                                | Guild projects precede learning a first trade. Put the chosen trade, useful next recipe and its missing materials first; move distant locked recipes into a searchable catalog.              |
| Outposts    |             4 | Faction journeys create a reason to revisit regions.                                                                      | Envoys need faces, place identity and scenes. Repeated green cards make the three factions feel too similar.                                                                                 |
| Journal     |             4 | Trials, milestones and expedition history preserve long-term goals.                                                       | Prioritize the currently accepted goals and their next destination. Conclusions occupy prominent space before a new player has a first victory.                                              |
| Stable      |             3 | The illustrated mount gives this service an immediate identity.                                                           | Animate the mount preview, differentiate ordinary and swift variants, and connect travel to actual routes and discoveries.                                                                   |

Settings and the field guide remain readable and paged, but their repeated controller instructions consume much of both dialogs. Recovery and Results communicate the paid rewards; they would benefit from distinct loot reveals and a direct next goal.

## Combat and art findings

Outdoor destinations share much of the same forest floor, tree and pond vocabulary. Westfall and the Plaguelands need their own ground, vegetation, structures and silhouettes. Dungeon layouts differ mechanically, but their floors and props are much flatter than the painted heroes. Fishing ponds appear in several indoor arenas. Mr. Smite still uses a visibly simpler geometric character drawing, creating a conspicuous break in the art style.

Hero motion sheets contain four run silhouettes in each facing. Several retain nearly the same leading leg, and switching complete illustrations produces abrupt changes. The richer texture rig was bypassed by the motion-sheet path, including its hit recoil. Automatic attacks provide frequent effects, but the game needs more enemies that demand different responses and more voluntary objectives that compete with simply circling for gems.

## Changes implemented in this pass

### Living hero motion

Heroes now use continuous texture joints over a coherent run silhouette. Hips, knees, arms and cloth interpolate between poses, and running feet remain active under attack gestures. Starts and stops use the existing stride weights. Idle breathing and upper-body movement animate the painted stance, and the authored hero path now receives hit recoil. Attack lean and reach also interpolate.

The camp preview uses the same articulated idle system at a higher texture resolution so its large illustration retains detail. Motion settings and the simulation clock still govern gameplay animation; pauses retain each actor's surface. The renderer reuses one skin per actor and shares a bounded cache of pose geometry. In dense crowds, heroes receive priority and their joints sample at 30 Hz while positions continue through the normal renderer; ordinary enemies retain shared gait frames.

These improvements retain the existing artwork. Fully authored directional movement, expressions, turn poses and complete attack transitions remain an art-production milestone.

### Optional Field Hunts

Outdoor expeditions offer a violet Field Hunt at 40 seconds and then every 95 seconds, stopping before the final boss window. Each offer lasts 25 seconds. Follow its compass arrow or minimap marker, approach the rune and press F or use the interaction button to awaken a champion. Ignoring an offer has no penalty.

The duel lasts up to 40 seconds. A ward reduces incoming damage to 35%. A fully charged Battle Art breaks it for five seconds, during which the champion takes 165% damage. The breaking hit receives the increased damage and interrupts an outstanding champion warning. Champions alternate a warned charge lane and a close pulse; both use existing hazard collision and presentation rules.

Victory adds 45 gold plus 15 per elapsed 95-second interval, drops 24 run XP, restores 15% maximum health to living party members, refreshes dash and signature cooldowns, and briefly attracts gems. Normal elite loot remains available. Expiry removes the champion without a defeat or treasure payout. Pauses and choices freeze both offer and duel timers. Dungeon routes retain their existing encounters.

The HUD explains the ward and its opening on desktop and phone, labels the quarry as a champion, and records completed hunts on Results and in saved expedition history. Older saves retain their progression. The field guide now describes the encounter.

### Accurate destination guidance

Locked dungeon labels now use the destination's content definition. Scarlet Monastery previously inherited a Tirisfal prerequisite label even though its actual entry rule requires Duskwood.

## Expansion milestones

### 1 Complete one exemplary adventure

Build a polished Elwynn expedition that demonstrates the intended quality from departure to return. Introduce movement, one aimed attack, one dodge, the class signature, a first upgrade, one optional hunt and Hogger through playable beats. Include a quiet recovery moment and a memorable loot reveal. Test whether new players understand each decision without opening the guide.

Use this adventure as the standard for the other destinations. Judge it by character readability, combat decisions, recovery pacing, player comprehension and stable frame time.

### 2 Establish character and creature production

Create an animation specification with consistent body proportions, grounded feet, weapon attachment points and at least eight readable facing directions. Author idle, walk, run, turn, charge, attack, cast, hurt and death sequences. Separate upper-body actions from locomotion where the art permits it. Produce Warrior and Mage first, then a quadruped enemy and a humanoid enemy to validate the complete pipeline before expanding all nine classes.

Add distinct enemy roles: a pursuing pack member, a ranged enemy that maintains distance, a shield bearer that opens after attacking, a charger with a commitment window, and a support caster that becomes a target priority. Each role needs a recognizable silhouette, anticipation, attack and recovery. Replace geometric boss placeholders and give guardians animations specific to their attack patterns.

### 3 Give regions authored geography

Create separate visual kits for forest, farmland, haunted woodland, volcanic cave, ship interior and cathedral. Add recognizable routes, encounter clearings, structures, elevation cues and foreground occlusion with consistent collision. Replace generic indoor resource props with resources that belong to the room. Introduce branching expedition objectives such as rescue, escort and sabotage that use this geography.

### 4 Make preparation visual and focused

Rebuild Armory around a hero equipment view and inventory. Give each service a distinct visual identity and one primary task. Let Spellbook preview combinations in a practice arena. Put current profession work and accepted Journal goals ahead of locked catalog entries. Show talent and equipment consequences through an immediate hero/stat preview.

### 5 Develop replay and production quality

Add meaningful ability modifiers, enemy combinations, branching objectives and zone-specific rewards after the exemplary adventure plays well. Evaluate class difficulty with human sessions and seeded simulations separately. Measure time to the first upgrade, meaningful choices per minute, encounter completion, damage causes and whether players understand their next goal.

Profile representative desktop and phone devices before promising 60 FPS. The existing 400-enemy Canvas stress case remains far above a 16.7 ms total frame budget despite meeting its current regression threshold. Evaluate sprite batching and a GPU renderer using a visual-parity prototype before migrating the game. Add audio mixing, accessibility checks, save recovery, device coverage and consistent asset review to each milestone's completion criteria.

## Verification

All 546 unit tests and the production build pass. Across the affected run and final recheck, 39 distinct browser cases pass. They exercise the full Hunt flow, charged attacks for every class, co-op recovery, rendered subframe changes, surface reuse, pause, reduced motion, desktop and phone controls, camp layouts and existing combat behavior. Final affected browser checks and measured timings are recorded in [Validation](VALIDATION.md).
