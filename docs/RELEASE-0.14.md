# Release 0.14 — Shadowfang Keep

## Design before implementation

Add a third dungeon expedition: Shadowfang Keep in Silverpine Forest. A persistent Ragefire Chasm clear and selected hero level 15 open a four-stage solo route. Survive 75 / 90 / 105 / 120 seconds, then face Baron Silverlaine, Commander Springvale, Fenrus the Devourer and Archmage Arugal. Their dining hall, guard chamber, worg library and moonlit tower use original castle floors, distinct enemy populations and eight original telegraphed attacks. Existing outdoor and dungeon statistics remain unchanged.

Keep the established recovery loop: each guardian secures one class-eligible rare item plus gold and graded materials; a paused choice restores health/resource and grants a boon. Partial returns retain secured rewards. Only all four ordered guardians grant victory, the persistent clear and a new Journal objective. Old version-1 saves keep their clears, equipment, quests and profession progress; old Ragefire victories can establish entry through the existing retained-history migration. An unfinished run is not resumed after reload.

The new creature roster contains worgs, worgen, haunted servants, spectral guards and void spirits. Worgs, worgen and Fenrus support Skinning with existing level/skill/cap rules; the other creatures supply cloth through the existing loot rule. The castle has no herb, mining or fishing nodes, respecting the historical dungeon's gathering identity. Guardian material rewards use grade III for a level-15 entrant. Existing profession projects still require their own exact destinations and future-work evidence.

Silverlaine warns a shadow annulus and haunted circles with summoned servants. Springvale alternates hammer circles and holy lanes. Fenrus alternates a bounded lunge and marked saliva blasts. Arugal alternates void lanes and a marked Shadow Port landing blast. The teleport happens only when the warning resolves, stays inside the arena, requires a living matching guardian, and freezes with pause, upgrades and recovery. Phase two expands the patterns and increases pressure. The adaptation does not add Classic's group curse removal, stun locks, invulnerability, boss healing or school immunities.

Sixteen original level-15 rare rewards cover all ten equipment slots, including three restricted weapons and several universal alternatives. Every room has an eligible reward for every class. Their stats offer choices against the six-piece crafted sets; comparisons include lost set and enchantment bonuses. Dungeon previews list the exact guardian sources. Five new-slot trophies also extend the shoulders/cloak/belt/leggings acquisition guide from forty to forty-five entries. Recipes remain at seventy-five; the equipment catalog grows to 170.

Produce one original transparent 3×3 creature/guardian atlas using the built-in image generator, with five ordinary creatures and four guardians. Code-authored SVG and Canvas visuals provide a moonlit castle camp card and four distinguishable arena floors. Preserve alpha and copy the selected asset into the project. Inspect actual sprite crops, each guardian, warnings, recovery, victory and phone layouts. All six destinations and eight camp pages must fit six viewport widths with ready reward badges.

Validation will exercise entry/migration, every room's active clock, guardian ordering, real combat, pause and resource guards, both phases of all eight patterns, teleport resolution/cleanup, finite bounds, Skinning, exact sources, equipment eligibility, partial/full settlement and once-only Journal rewards. Run the existing regression suites, new browser flows, dense rendering, baseline combat comparisons and all-class three-seed level-15/21 dungeon profiles. Prepared diagnostics do not establish human acquisition costs or win rates.

## Research

The original publisher's [BradyGames Shadowfang Keep guide](https://ptgmedia.pearsoncmg.com/imprint_downloads/brady/wow/sk/sklr.pdf), pages 1, 3 and 5–9, establishes the Silverpine castle, worg/worgen and spirit populations, selected guardian identities, dining room, guard chamber, Fenrus's library and Arugal's tower. It describes abundant Skinning and no herb/mining nodes, Fenrus's saliva, Springvale's former Paladin identity and Arugal's Void Bolt, Thundershock and Shadow Port. Its maps and text inform the setting and encounter roles.

This route selects four of the original encounters and compresses the branching castle into solo arenas. The Ragefire prerequisite, level-15 gate, durations, patterns, material rewards, loot stats, Journal objective and recovery structure are original survival-game rules. Prisoner escorts, the full navigable castle, the other bosses, original quest rewards and group dispel mechanics are later content. Cataclysm's replacement encounters and seasonal additions are excluded.

## Verification

The implemented route follows this design. All **236 simulation/progression tests**, strict TypeScript checks, production build and formatting checks pass. Twenty new focused tests cover entry/history migration, the four-stage lifecycle, partial/full settlement, Journal isolation, all sixteen exact loot sources, gear eligibility, both phases of all eight attacks, teleport freeze/resolution/stale-caster cleanup, bounded charges, room rosters, Skinning grades/caps and guild destination evidence. Real automatic attacks from every class defeat each guardian type. Existing generic dungeon resource/source tests also include Shadowfang.

All **88 browser checks** pass, including ten new Shadowfang flows. They exercise the prerequisite, selected-hero gate, full victory, saved loot/equipment and Journal rewards, a phone partial return with direct Skinning practice, all four guardians, a paused Shadow Port and dense rendering. The final phone review shortened overlapping pending-spell labels to an XP cue; all eighteen affected Shadowfang/spellbook checks pass on rerun. Fixtures isolate encounter state and defer incidental upgrades while retaining production combat and settlement; ordinary prepared combat is checked separately below.

Six atlases decode in bounded 400-enemy scenes. Shadowfang's final local CPU average/p95 is **1.89/3.60 ms**; these measurements cover simulation and Canvas submission, not device presentation or mobile FPS. Six viewport widths fit all six destinations and eight camp pages, with no browser errors or horizontal overflow. The acquisition guide has forty-five entries, ten equipment slots and usable controls. Original sprite alpha and all nine measured crops were inspected. Real guardian, warning, recovery, victory, partial-result and phone captures are in `output/screenshots/shadowfang-*.png`.

The three existing outdoor combat reports are JSON-identical to release 0.13. All nine classes across seeds 42 / 123 / 2026 complete the new route in each prepared profile:

| Profile             | Victories | First upgrade | Successful finish |
| ------------------- | --------- | ------------- | ----------------- |
| Level 15, six slots | 27 / 27   | 5–13s         | 401–470s          |
| Level 15, ten slots | 27 / 27   | 4–12s         | 403–469s          |
| Level 21, ten slots | 27 / 27   | 5–13s         | 402–448s          |

No run times out. Legal level-15 builds allocate fifteen talent points; ten-slot entry builds craft six eligible set pieces and an Expert cape. Level-21 builds use an Artisan cape. The reports use stocked ingredients and owned equipment as preparation fixtures and original class abilities. Their reachability results do not establish human win rates, ingredient acquisition times or optimal class balance. Human testing remains needed for castle readability, loot/economy pacing and teleport pursuit. Detailed evidence and reproducible scripts are in [validation](VALIDATION.md).
