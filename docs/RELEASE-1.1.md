# Beyond the Horde — Release 1.1

The game has enough destinations and equipment to sustain a journey. This release improves how players understand that journey, make distinct builds, recover from failure, and see their own progress.

## Design and research

Research reviewed on October 9, 2026:

- [Supergiant’s Hades FAQ](https://www.supergiantgames.com/blog/hades-faq/) describes challenge as relative to the player, difficulty modifiers, permanent progression and combinations that change between runs. Our adaptation is three transparent challenge settings, earned relic choices, and distinct combat keystones. Explorer earns the same progression as Adventurer. The numeric balance values here are our own design decisions, not values endorsed by the reference.
- [Xbox accessibility guideline 108](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/108) recommends configurable difficulty and explaining what each option changes. Challenge cards list the exact enemy and reward modifiers. Difficulty is chosen before departure to keep each run internally consistent.
- [Xbox accessibility guideline 101](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/101) covers legible text and configurable text presentation. [Guideline 102](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/102) covers contrast. This release adds larger-text and high-contrast options, numeric progress and persistent text labels. These improvements do not constitute a claim of full XAG compliance; remapping, localization, assistive narration and full text/contrast auditing still need dedicated work.
- [Deep Rock Galactic: Survivor’s official developer announcements](https://steamcommunity.com/app/2321470/announcements/?l=english) describe expanded weapon tags, synergy upgrades and mastery progression. Our interpretation is that players should be able to read a build’s purpose: critical/chain, kills/sustain, dash/burst, momentum/experience, finisher and defense/recovery. Keystones introduce different rules instead of filling every choice with a small additive stat.

The existing local artwork, animations, original music, dungeon mechanics, item ownership rules and class systems remain the foundation. The new visual treatment uses those assets, clearer spacing and readable choice cards. No new runtime service or account is required.

## The playable loop

1. The camp’s chapter briefing points to a concrete next step or an earned reward.
2. Choose a hero, destination, challenge, oath and at most one earned relic. The departure card summarizes the choice. Shape your build jumps directly to preparation; Set out with this build launches from there.
3. Attack automatically, move deliberately, use class abilities and dash. Build a five-second defeat chain for a capped momentum damage bonus.
4. At run levels 4, 8 and 12, choose one of three offered keystones. Each keystone can be taken once. Two free rerolls are shared across ordinary and keystone choices for the whole expedition.
5. Complete any of three optional objectives. A partial return still settles completed objectives, equipment and XP.
6. Review the result, retry immediately or prepare at camp. Claim once-only mastery gold and equip a freely switchable earned relic.

## Exact rules

### Challenge and oaths

| Setting    | Enemy health | Incoming damage | Spawn frequency | Base gold / XP |
| ---------- | -----------: | --------------: | --------------: | -------------: |
| Explorer   |          85% |             70% |            100% |           100% |
| Adventurer |         100% |            100% |            100% |           100% |
| Heroic     |         120% |            130% |            115% |           125% |

Challenge applies to every destination, including dungeon guardians. Fixed objective payouts are added after the challenge multiplier. Loot, unlock gates, reputation and material grades follow their existing rules.

| Oath            | Benefits                       | Trade-off  |
| --------------- | ------------------------------ | ---------- |
| The Unbound     | Original class strengths       | None       |
| The Vanguard    | +25 health, +4 armor           | −5% speed  |
| The Spellbinder | +12% power, +8% haste          | −20 health |
| The Wayfarer    | +12% speed, +40% pickup radius | −4 armor   |

Health cannot fall below 35 and armor cannot fall below zero from these modifiers. Equipment and talent stats are not rewritten. The engine applies a copy of the expedition bonuses.

### Keystones

| Keystone        | Behavior                                                                                                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Storm Conduit   | A critical hit arcs to the two closest living enemies within 180 units for 45% of damage dealt. Shared 0.4-second cooldown; secondary hits cannot critically chain or reapply momentum/finisher multipliers. |
| Crimson Harvest | Every fifth party defeat heals the acting hero by 4, capped at maximum health. Does not revive a downed hero.                                                                                                |
| Tempest Step    | A successful dash deals a 35-damage, power-scaled nova within 140 units plus target radius. Reduces dash cooldown by one second.                                                                             |
| Gravity Well    | +35% pickup radius. Every tenth consecutive defeat moves existing XP gems within pickup reach. Gold, chests and other drops stay in place.                                                                   |
| Last Judgment   | +35% damage against enemies below 30% maximum health.                                                                                                                                                        |
| Second Wind     | The first lethal damage hit per hero restores 35% maximum health and grants two seconds of invulnerability. Resets next expedition.                                                                          |

At a turning point, all three cards are keystones. Ordinary choices still guarantee an eligible spell. The run gains one level and consumes its required XP exactly once after either kind of choice.

Momentum gives 5%, 10% and 15% damage at 10, 20 and 30 defeats, capped thereafter. Each defeat refreshes the five-second window. Actual health damage breaks the chain; a fully absorbed hit does not. The timer uses simulation time and freezes on pause, choices and recovery.

### Mastery and relics

Eight milestones recognize first return, 200 defeats, five landmarks, first victory, a 30-defeat chain, 12 completed objectives, eight guardians and ten victories. Each gold claim is recorded once. Relics unlock from achievement progress independently of reward claims:

- First return: Wayfinder’s Compass, +30% pickup radius.
- 200 defeats: Ember of Resolve, +8% power.
- Five landmarks: Windrunner’s Feather, −1 second dash recharge.
- First victory: Aegis of Dawn, a 30-point starting shield lasting up to 60 seconds.

Feather and Tempest Step combine to a minimum two-second dash recharge. Only one relic can be equipped. Selection is free. Existing recorded totals count toward mastery; malformed or unearned selections are removed on import.

The party shares the oath, relic, challenge, momentum and objectives. Keystones affect both heroes, and Second Wind keeps a separate once-per-run rescue for each hero. Objectives count accepted class ability uses from both heroes; canceled actions and failed cooldown attempts do not count. Dungeon stage transitions retain run choices and progress.

## Validation

See [validation notes](VALIDATION.md) for the actual checks and outcomes. The new tests cover real damage, cooldowns, rescue, XP handling, old-save repair, reward idempotency, earned access, keyboard choices, retry, accessibility settings and mobile layouts. Browser combat fixtures accelerate setup to isolate behavior; they are not human playtests.

`npx tsx scripts/adventure-balance.ts` runs every class through three seeds and three challenge settings using starter builds and a deterministic movement policy. Its report is written to ignored `output/adventure-balance.json`. This can expose timeouts and class outliers; it cannot estimate novice enjoyment, player retention or human win rates.

## The next quality gate: people playing

Use a small consent-based playtest with five people unfamiliar with the game and five people familiar with survivor games. Watch two expeditions and a return to camp without coaching. Do not collect personal data or send telemetry from this local game.

Record locally:

- Time to the first intentional movement, active skill and upgrade choice.
- Whether each person can explain run levels versus character levels, an oath’s trade-off and their chosen keystone.
- Confusion or hesitation between death, settlement, mastery and the next expedition.
- Whether the HUD hides an enemy or warning on their actual device.
- Whether the second build feels different, and whether they voluntarily want another run.

Prioritize repeated confusion over feature requests. Then retune challenge and progression from observed players, audit contrast/text across every existing screen, add remappable controls, and develop more authored encounter choices and character reactions. “World-class” is an outcome to earn through those iterations; this release does not claim that automated checks alone establish it.
