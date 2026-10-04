# Release 0.9 — Ragefire Chasm

## Design established before implementation

Extend the dungeon system with a second, independently unlocked route. Ragefire Chasm has four guardians: Oggleflint, Taragaman the Hungerer, Jergosh the Invoker and Bazzalan. Survival stages last 60, 75, 90 and 90 seconds, followed by their fights. A Tirisfal clear unlocks the destination; the selected hero must reach level 10. All classes can enter. These gates, timing, linear route, rare rewards and solo access are original adaptations.

Each guardian alternates two readable attacks and strengthens them below half health. Oggleflint uses a cleaving fan and falling stones; Taragaman uses a fire ring and charging uppercut; Jergosh uses shadow lanes and summons void spirits; Bazzalan uses a blade dash and poison circles. Ground warnings resolve at their original marked positions. There are no invisible damaging lava zones: solid arena bounds enclose the playable floor. The lava, rocks, pillars and cult symbols establish the setting without adding unannounced collision.

Recovery, secured partial rewards, continuing run builds and shared boons use the existing dungeon rules. Route definitions supply stage counts, prerequisites, minimum levels, enemies, tactics and result text. Validation and settlement must use the selected route's guardian count, preserving three-guardian Deadmines records. Dungeon clears are tracked independently of aggregate dungeon wins.

Original loot pools must contain a usable reward for every class in every stage. Dungeon equipment remains exclusive to its route; ordinary chest drops must not acquire it. A new Journal milestone requires a Ragefire clear specifically; the existing Brotherhood milestone must continue to require a Deadmines clear specifically.

## Source study

[Blizzard's Classic Orgrimmar tour](https://news.blizzard.com/en-gb/article/23156369/wow-classic-city-tour-orgrimmar) locates the dungeon in the Cleft of Shadow. [BradyGames' original Ragefire guide](https://ptgmedia.pearsoncmg.com/imprint_downloads/brady/wow/ragefirechasm/ragefire_chasm_hrgs.pdf), pages 1–4, supplies the Classic creature roster, lava setting and four encounter identities. The survival attack geometry, stats, loot names and stage sequence are authored for this game. Later expansions' redesigned Ragefire encounters are outside this scope.

## Verification

- Implemented four arenas, all eight attack patterns and intensified phases, stage-local creature rosters, ore nodes, solid bounds and three recovery breaks. Eleven rare items bring the equipment catalog to 102. Both dungeon milestones use their own persistent clear, and the Journal now has ten objectives.
- Version-1 saves keep their existing heroes, inventories, claims and Deadmines records. Guardian counts are validated against each route; negative/excess counts cannot fabricate a history victory. Partial Ragefire returns credit up to four guardians without a clear. Class-trial evidence retains all four boss kills after reload. Retained legacy victories still establish persistent clears; already claimed milestones remain claimed.
- **127 simulation/progression tests and 51 browser tests passed**, with strict TypeScript checking, production build and formatting. Twelve new simulation checks include all nine classes across three seeds and four loot pools, both attacks/phases, independent unlocks and milestones, complete versus partial settlement, malformed saves, build/recovery continuity, local enemy rosters and bounds. Eight new browser flows exercise real victory and partial-return transactions, saved loot/equipment, correct Journal claims, keyboard recovery/pause, phone taps, four rendered guardians and dense rendering. Arrival/health are shortened only in isolated UI fixtures; simulation and balance runs use production rules.
- Camp and Journal were captured at 360, 390, 760, 800, 1024 and 1440 pixels without horizontal overflow or browser errors. Phone navigation and recovery choices meet the checked 44-pixel target height. Screenshots include the cave preview, all guardians, third recovery, partial return and full victory. The new transparent atlas decodes in the runtime.
- The all-class level-10 diagnostic, with a 10-point hybrid build and six equipped slots, completed **27/27** production-timing Ragefire runs. First upgrades took approximately 5–13 seconds; victories took approximately 332–387 seconds. These are prepared scripted builds and do not establish human win rates.
- On this desktop browser, an 80-frame Ragefire scene across four arenas with 400 enemies averaged **1.65 ms** for simulation plus Canvas submission, with **3.9 ms p95**. Outdoor and Deadmines regression scenes also passed. Measurements exclude presentation and do not predict mobile FPS.

## Remaining production work

The route is playable, but human difficulty/feel testing remains necessary. Creature art is a static atlas with procedural bobbing and facing; authored animations, a cave soundtrack, branching navigation, environmental knockback/lava damage, faithful Classic item stats and full original dungeon quest chains remain future work. See [research](RESEARCH.md), [validation](VALIDATION.md) and [art provenance/prompts](ART.md).
