# Wow Survivors 0.8 — riding and travel

## Design before implementation

Exploration already rewards visits to gathering nodes and six outdoor landmarks, but travel has no persistent progression. This phase adds a camp stable, personal riding training, shared racial steeds, class-trial steeds and Druid/Shaman travel forms.

Blizzard's [Classic primer](https://news.blizzard.com/en-us/article/23090134/wow-classic-primer-for-new-players) places the first purchased mount and riding training at level 40. The [original manual](https://assets.blz-contentstack.com/v3/assets/blt3452e3b114fab0cd/blt2e9295db02a222fc/6025bcbb6968b53d529edb2a/media_manual_classic_enUS.pdf), printed page 108, connects racial mounts, Paladin/Warlock quest rewards and Druid/Shaman animal travel forms. The manual contains pre-release details such as Tauren plainsrunning, which this roster does not implement. Our shortened gates, prices, stable ownership and combat restrictions below are original survivor-game designs.

## Riding and travel rules

- Riding belongs to each hero. Train the first rank at character level 12 for 100 G; train the second at level 20 for 350 G. Training grants no equipment stats and never resets talents or professions.
- Five racial mounts cost 200 G each and give 60% travel speed; five swift versions cost 650 G and give 100%. A purchased steed is shared by eligible heroes of that race, but each hero needs its own training. Purchases and training are reviewed before charging.
- Completing all three existing Paladin or Warlock trial chapters unlocks an original class steed, without a riding fee. Existing completed trials also unlock these rewards. They give 60% travel speed and require character level 10.
- Druid Travel Form and Shaman Ghost Wolf train at level 8 for 40 G, give 40% travel speed and use no riding rank. These choices belong to the relevant hero.
- Select one travel option per hero at the stable, or choose to travel on foot. The expedition snapshots that selection. Speed multiplies the hero's ordinary movement speed while travelling, without altering camp combat stats.
- Press R or tap the travel action to summon, cancel or dismount. Summoning takes 1.25 seconds for steeds and 0.6 seconds for forms, requires standing still, no accepted damage in the last four seconds and no living enemy within 160 world units. Pause and upgrade choices freeze the channel.
- Moving cancels a summon. Accepted damage dismounts and starts the four-second lock, even if a shield absorbs the hit. Successful active ability, dash, supply use or landmark interaction returns the hero to combat. Failed actions do not dismiss travel. Gathering at nodes requires being on foot; materials from defeated enemies still follow ordinary loot rules.
- New automatic casts, orbit strikes and pet attacks stop while summoning or travelling; already created projectiles and areas resolve normally. Pets follow while travelling. The final outdoor boss dismounts the hero and prevents remounting; dungeon arenas prohibit travel.
- Version-1 saves remain compatible. Unknown, unowned, wrong-race and ineligible selections are cleared. Ownership, personal training and selections survive reload and export/import.

## Verification

The complete suite passes: **115 simulation/progression tests and 43 browser integration tests**, plus strict TypeScript checking and the production build. Sixteen new headless checks exercise all ten purchase options, every hero's personal training, race/level/rank/funds gates, atomic fees, shared ownership, independent selections, both real final class-trial claims, existing completed trials, forms, malformed saves and unchanged camp combat stats.

Actual fixed-step simulation verifies the 40/60/100% speed multipliers, stationary summon cancellation, pause/upgrade freezes, shielded-hit dismounts and the four-second lock, invulnerability, successful versus failed action dismissal, stopped ranged/orbit/pet attacks and resumed offense, existing projectile resolution, node gathering, landmark interaction, boss arrival and dungeon restrictions.

Seven new browser flows cover reviewed training/purchase cancellation and confirmation, hero switching and shared use, swift upgrades, saved selections and choosing to walk, a real final Paladin trial claim, keyboard summon/pause/resume/movement/active use, both forms through phone taps, and dungeon restrictions. Progressed saves are isolated fixtures; these checks do not establish player acquisition pacing.

Layout capture checks all seven camp pages at 360, 390, 760, 800, 1,024 and 1,440px, including the expanded stable catalog, with no horizontal overflow or browser errors. Narrow navigation and confirmation/travel controls meet the 44px minimum. Stable, review, mounted play, class steed and nine-silhouette gallery captures were inspected. The phone navigation now uses two rows of four columns to fit the seventh destination.

The regression render checks decoded all four combat atlases and preserved entity limits. Outdoor 400-enemy CPU average: 1.52 ms, 95th percentile 2.2 ms; dungeon: 1.35 ms and 2.3 ms over sixty sampled frames each. These development-machine CPU measurements exclude presentation and do not establish performance on other devices.

## Art and limits

The new original RGBA atlas provides nine silhouettes for the stable and battlefield. Swift racial steeds reuse the same illustration with a gold glow. Riders use a cropped upper body from the existing hero atlas; forms replace the hero. Bobbing and mirroring provide motion, without authored walk cycles. The generation prompt and provenance are recorded in [ART.md](ART.md).

Travel is an outdoor exploration tool, with no mounted attacks, flight paths, flying mounts or persisted mid-run travel state. Race restrictions follow the current fixed hero roster; there is no cross-race reputation purchase route. The existing class trial chain unlocks class steeds rather than introducing separate vanilla mount quest routes. Human sessions are still needed to tune mount prices, late-run summoning opportunities and the balance between travelling and collecting combat XP.
