# Release 0.12 — class trainers and prepared spellbooks

## Design before implementation

Add eighteen optional Classic-inspired class techniques, two for each of the nine heroes. The original four abilities remain free. Each hero learns techniques permanently from a camp mentor at character levels 5 and 12 for 40 and 120 gold. Training is explicit, reviewed, atomic and personal to that hero; learning does not automatically change the next run's prepared abilities. Old version-1 saves retain all progress and begin with the original four-ability preparation.

Prepare four abilities at camp, replacing an unlocked slot with any known class ability. The starting attack and Hunter/Warlock companion stay prepared, preserving class identity and starter-cast trials. Preparation and restoration of the original four cost nothing. Run spell ranks and evolutions still reset; three-choice upgrades only offer the four prepared abilities, and the run keeps its four-spell limit. A run snapshots the spellbook; unknown, foreign, untrained, under-level and duplicate entries are repaired. Preparing away the second core ability displays a warning when the active class trial requires its rank-three mastery.

| Class   | Level 5 technique | Level 12 technique |
| ------- | ----------------- | ------------------ |
| Warrior | Rend              | Heroic Strike      |
| Mage    | Frost Nova        | Flamestrike        |
| Rogue   | Rupture           | Eviscerate         |
| Hunter  | Serpent Sting     | Volley             |
| Paladin | Holy Light        | Hammer of Wrath    |
| Priest  | Renew             | Holy Fire          |
| Shaman  | Flame Shock       | Frost Shock        |
| Warlock | Curse of Agony    | Searing Pain       |
| Druid   | Rejuvenation      | Starfire           |

Bleeds, stings and curses apply bounded, non-stacking effects to their target. Automatic casting spreads a spell to nearby unmarked enemies instead of repeatedly overwriting the same effect. Periodic ticks do not critically strike; Holy Fire and Flame Shock have an initial impact that can. Curse of Agony's later ticks grow stronger. Enemy death, arena replacement and run completion discard obsolete effects. Renew and Rejuvenation apply finite healing ticks without stacking; Holy Light heals immediately and can critically heal. Healing casts wait for injury, sufficient resource and expiration of an existing matching effect. Healing spells do not consume supplies or advance profession supply-use objectives. All periodic clocks freeze in pause, choices and recovery; existing effects can finish during travel, while new casts wait for dismount.

Heroic Strike and Eviscerate hit one nearby target; combo points, weapon swing queues and threat are outside this adaptation. Frost Nova briefly roots ordinary enemies and slows bosses. Hammer of Wrath only launches at a target with at most 20% health. Ground fire and Volley use existing bounded area behavior, with Flamestrike adding an initial impact. New abilities share compatible named spell talents with a listed core ability; power, speed and resource modifiers apply, while unsupported area/projectile/leech/critical perks are excluded. The existing talent amounts and ordinary encounter values remain unchanged.

The Spellbook camp page shows the mentor, six class abilities, original/learned/locked state, school, resource cost, range, cast timing, periodic behavior, evolution and current compatible talent bonuses. Reviewed training and free preparation have distinct actions. Four prepared slots explain which abilities start automatically and which require an expedition upgrade. The camp preview and empty battle slots name prepared choices. The eighth navigation destination uses the existing two-row phone layout. All new controls have at least 44px targets; the page and dialogs fit desktop and phone widths.

## Research

The original [Blizzard manual](https://assets.blz-contentstack.com/v3/assets/blt3452e3b114fab0cd/blt2e9295db02a222fc/6025bcbb6968b53d529edb2a/media_manual_classic_enUS.pdf), printed pages 27–29, 39 and 54–55, describes paying class trainers to learn level-gated abilities and choosing learned abilities for the action bar. This adaptation uses those relationships with short-run preparation and original compressed fees/gates.

Original client spell tooltips, mirrored by ClassicDB, establish the selected abilities' roles: [Rend](https://classicdb.ch/?spell=772), [Heroic Strike](https://classicdb.ch/?spell=78), [Frost Nova](https://classicdb.ch/?spell=122), [Flamestrike](https://classicdb.ch/?spell=2120), [Rupture](https://classicdb.ch/?spell=1943), [Eviscerate](https://classicdb.ch/?spell=2098), [Serpent Sting](https://classicdb.ch/?spell=1978), [Volley](https://classicdb.ch/?spell=1510), [Holy Light](https://classicdb.ch/?spell=635), [Hammer of Wrath](https://classicdb.ch/?spell=24275), [Renew](https://classicdb.ch/?spell=139), [Holy Fire](https://classicdb.ch/?spell=14914), [Flame Shock](https://classicdb.ch/?spell=8050), [Frost Shock](https://classicdb.ch/?spell=8056), [Curse of Agony](https://classicdb.ch/?spell=980), [Searing Pain](https://classicdb.ch/?spell=5676), [Rejuvenation](https://classicdb.ch/?spell=774) and [Starfire](https://classicdb.ch/?spell=2912). Some database detail tables disagree with the visible resource tooltip, so the ability's role is used rather than copying those numbers. No modern expansion or Season of Discovery ability is added.

Mentors, learned gates, prices, damage/healing values, timings, target spread, talent links and evolved names are original survival-game rules. These do not reproduce a complete vanilla spell rank list, party healing, Rogue combo points, threat or Hunter channeling.

## Verification

Implementation is complete. Strict TypeScript checking, the production build, formatting and all **193 simulation/progression tests** pass. Twenty-seven new checks exercise the eighteen techniques at ranks one and five, exact personal training transactions, free protected preparation, bounded import/migration, immutable run snapshots, actual cast and tick behavior, resource gates, supported talent links, pause/travel/recovery, evolution and class-trial proof. The complete **71-test browser regression suite** passes.

Eight browser flows cover reviewed learning and cancellation, saved slot replacement and companion locks, omitted mastery warnings, actual prepared level-up choices, damage/root/healing behavior, paused clocks, returns without supply consumption, old saves, six viewport widths and dense periodic rendering. The capture script checks all nine books and all eight camp destinations across six widths with a ready reward badge. An initial 14px tablet-header overflow was corrected and the failing layout check now passes. Captures use isolated saves and were visually inspected; see [validation](VALIDATION.md) and `output/spellbook-layout-0.12.json`.

Five all-class, three-seed diagnostics completed without timeouts. Starter Elwynn remains **27/27**, and core-only level-21 Tirisfal remains **19/27**, with JSON reports identical to the earlier baseline. With both techniques prepared, level-21 Tirisfal completes **23/27**. Level-10 Deadmines and Ragefire each complete **27/27** with the first eligible technique. These use production encounter values and real training/preparation/upgrade actions. The optional `--spellbook` balance flag records prepared/learned abilities and actual healing.

Learning is a build choice. Hunter's two-technique Heroic preparation wins one of three seeds versus three with its original four; replacing Multi-Shot can lose projectile talent coverage and immediate damage, and the policy does not deliberately hold enemies inside Volley. Human playtesting is still needed for alternative preparations, trainer prices, area placement and defensive slot value. Encounter statistics and core abilities were not retuned to improve the diagnostic results.
