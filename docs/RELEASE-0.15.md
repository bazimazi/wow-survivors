# v0.15 — Faction campaigns and Exalted rewards

## Design recorded before implementation

Blizzard's [original manual, Adventuring chapter](https://assets.blz-contentstack.com/v3/assets/blt3452e3b114fab0cd/blt2e9295db02a222fc/6025bcbb6968b53d529edb2a/media_manual_classic_enUS.pdf) describes accepting objectives, returning to claim rewards, unlocking later quests, and abandoning unfinished quests. Its dungeon quests connect wilderness progression to harder encounters. Blizzard's [Classic reputation update](https://news.blizzard.com/en-us/article/23302789/wow-classic-class-quests-and-new-reputation-rewards) identifies Timbermaw Hold, Thorium Brotherhood and Argent Dawn as sources of reputation equipment and profession patterns.

These are structural references. The visiting envoys, routes, stories, rewards, level gates and compact reputation thresholds below are original adaptations for Wow Survivors, not recreated Classic quest chains.

## Scope and pacing

Add three shared-roster campaigns with four sequential chapters each. Timbermaw connects Elwynn to Deadmines, Thorium connects Westfall to Ragefire Chasm, and Argent connects Tirisfal to Shadowfang Keep. Each faction can have one accepted chapter; all three can run independently alongside the existing repeatable commission.

| Chapter          | Requirements to accept                                    | Future expedition objectives                             | Rewards                                                    |
| ---------------- | --------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| Patrol           | Level 1, Neutral                                          | 180 enemies and 2 landmarks in its outdoor zone          | 80 gold, 100 character XP, 100 reputation                  |
| Reclamation      | Level 5, Friendly (150)                                   | 3 landmarks and 1 final-boss victory in its outdoor zone | 110 gold, 180 XP, 150 reputation                           |
| Into the dungeon | Level 10 (Argent 15), Honored (500), destination unlocked | 2 guardians in its dungeon, across any number of visits  | 150 gold, 250 XP, 200 reputation                           |
| Final reckoning  | Level 15, Revered (1,100), destination unlocked           | 1 complete dungeon victory                               | 200 gold, 350 XP, 300 reputation and a level-15 rare cloak |

Progress accumulates across settled runs. Partial dungeon returns count actual defeated guardians; entering a room does not. Claims reward the selected hero's XP and are reviewed with that hero, chapter and attempt fixed. Acceptance gates do not prevent another roster member from helping on subsequent legal expeditions. Claiming requires completed objectives, not repeating acceptance gates. Abandonment discards only current chapter progress and changes its attempt identity on reacceptance.

Campaign completion plus Exalted (2,000), character level 20 and 500 gold unlocks one epic trinket per faction at its quartermaster. The three cloaks and three trinkets are universal equipment with distinct offense, defense and exploration tradeoffs. Cloaks are once-per-campaign rewards; trinkets can be bought again after sale, following existing quartermaster ownership rules. No new combat mechanics, recipes or compulsory material expenditures.

## Persistence and presentation

Keep save version/key v1. Old saves start with three unaccepted campaigns; past victories, stock, commissions and history never advance them. Bound imported progress and proof; preserve completed chapters without inventing rewards. Engines copy accepted chapter snapshots at departure. Only proof matching the current faction, chapter, attempt and destination can advance it, capped by both real run counters and chapter goals. Existing retained-history duplicate settlement protection applies.

Outposts shows a four-step timeline, objective bars, destination and reward previews, acceptance gates, reviewed claims and reviewed abandonment. Camp, pause and results show relevant status; pause previews unsaved progress and result shows settled progress. Keep eight navigation tabs and include ready campaigns in the Outposts badge. Extend the four-slot acquisition guide from 45 to 48 pieces with a campaign filter and direct links to the appropriate envoy.

## Verification plan

Exercise all three complete arcs, all nine classes' equipment eligibility, acceptance gates, once-only claims, stale reviews, reacceptance, independent campaigns, partial guardian returns, actual landmark completion, full dungeon victory, malformed/old saves and duplicate settlement. Browser checks cover acceptance through settlement and reload, reward review, abandonment, Exalted purchases, guide links and six responsive widths. Compare the existing starter, core heroic and trainer heroic diagnostics against v0.14. Record actual results below after implementation; seeded fixtures are correctness checks rather than estimates of human progression time.

## Implemented behavior and evidence

All twelve chapters and six items are integrated. The equipment catalog now has 176 items and still has 75 recipes and ten equipment slots. Each outpost has its original three offers plus one Exalted offer. The acquisition guide has 48 pieces, including three campaign cloaks with envoy links. Chapter objectives, exact destinations, all acceptance gates and equipment rewards are visible before acceptance; claimed steps remain visible in the timeline. Camp shows accepted work for the selected destination, pause previews pending counters, and results show settled progress. Ready campaigns join the commission in the Outposts navigation badge.

The 22 new simulation/progression checks cover all three complete arcs for every class, actual cache and shrine completion, outdoor final-boss kills, partial dungeon guardian kills, full clears, independent campaigns and commissions, selected-hero XP, acceptance gates, reviewed identities, abandoned attempts, malformed/imported proof, duplicate settlement, once-only rewards and Exalted purchase/equip/sale behavior. A real automatic melee comparison confirms the offensive trinket changes damage. The complete simulation suite passes **258/258**; strict TypeScript checking and the production build pass.

The complete browser suite passes **96/96**, including eight new flows. They use production acceptance, combat, supply consumption, settlement, review, claim, purchase and equip actions. Routed gameplay fixtures expose only a test-page engine reference and isolate encounters with high health, delayed XP choices and chosen enemy health/clocks. A patrol defeats 180 actual enemies, completes a guarded cache and shrine, pauses for pending proof, returns, cancels and confirms a reward review and reloads. Each dungeon contributes proof through two partial returns; a full Shadowfang run claims the cloak and buys/equips the Exalted trinket. Other flows exercise abandonment, the guide links and six viewport widths.

The capture script verifies **72 layouts**: three factions, four campaign states and widths 360 / 390 / 760 / 800 / 1024 / 1440, plus reviewed final claims at every width. All retain four timeline steps, four offers and eight navigation tabs; simultaneous ready chapters display badge 3. The guide capture verifies 48 pieces, ten slots, all nine class filters and all 48 camp-page/width combinations. No horizontal overflow or browser errors occur. Visual review includes desktop and phone timelines, rewards and reviews. A tablet header overflow with multiple ready badges was corrected by hiding navigation icons within its existing compact width range. Reports are `output/campaign-layout-0.15.json` and `output/wardrobe-layout-0.15.json`; screenshots are `output/screenshots/campaign-*.png`.

## Prepared combat comparisons

The existing starter, core heroic and trainer heroic reports are JSON-identical to v0.14. Three additional profiles compare legal level-21, 21-point hybrid builds wearing the campaign cloak and Exalted trinket, with seven equipped slots and original class spells. Purchasing/equipping uses the progression transactions; completion, reputation, gear ownership and funds are preparation fixtures. The movement policy, three seeds per class, three healing supplies and one bomb are unchanged.

| Profile                             | Victories | First upgrade | Successful finish |
| ----------------------------------- | --------- | ------------- | ----------------- |
| Existing starter                    | 27 / 27   | 6–48s         | 364–419s          |
| Existing core heroic                | 19 / 27   | 6–45s         | 482–548s          |
| Existing trainer heroic             | 23 / 27   | 6–45s         | 482–562s          |
| Timbermaw cloak and Exalted trinket | 16 / 27   | 5–34s         | 482–529s          |
| Thorium cloak and Exalted trinket   | 23 / 27   | 6–36s         | 481–500s          |
| Argent cloak and Exalted trinket    | 16 / 27   | 5–30s         | 482–498s          |

No run times out. These replacements trade the baseline Lionheart's +18% damage, +30 health and +8% critical chance for faction-specific attributes; they are not uniformly stronger for this movement policy. Results establish prepared combat behavior, not human win rates, optimal builds, reputation acquisition time or campaign pacing. The current chapters supply 750 reputation and require additional ordinary expeditions/commissions to reach later standings and Exalted. Human playtesting is still needed to tune that acquisition curve and reward tradeoffs. Raw reports are `output/balance-0.15-*.jsonl`; summary and unchanged-baseline comparisons are in `output/campaign-balance-0.15.json`. Reproduce with `node scripts/check-campaign-balance.mjs`.
