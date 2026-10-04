# Wow Survivors 0.4 — faction outposts

## Design before implementation

The next progression loop gives expeditions a purpose after the first victory: accept a commission, return with reputation, and unlock equipment or a profession pattern. Reputation and commissions are shared by the roster; commission XP goes to the hero selected when the reward is claimed.

Blizzard's [Classic class quests and reputation rewards article](https://news.blizzard.com/en-us/article/23302789/wow-classic-class-quests-and-new-reputation-rewards) documents crafting rewards for Argent Dawn, Timbermaw Hold, and Thorium Brotherhood. Those three factions provide the inspiration. Visiting emissaries at this game's Elwynn, Westfall, and Tirisfal camps, their commissions, item names, item statistics, and shortened reputation thresholds are original adaptations. These are not recreations of Classic faction locations or quests.

### Rules

- Neutral 0, Friendly 150, Honored 500, Revered 1,100, Exalted 2,000. Reputation caps at Exalted and is never spent.
- The Elwynn emissary represents Timbermaw Hold; Westfall represents Thorium Brotherhood; Tirisfal represents Argent Dawn. Reputation is earned for the expedition's zone.
- Returning grants up to 60 reputation from kills (one per 12), up to 12 from survival (one per 30 seconds), 15 per completed landmark (maximum six), and 80 for defeating the final boss. Failed expeditions keep earned contribution; an immediate empty return earns none.
- Nine repeatable commissions: a patrol, three landmarks, and one final boss for each zone. One commission may be active at a time. Only expeditions settled after acceptance in the matching zone contribute. Progress carries across expeditions and heroes, caps at the goal, and needs a manual claim. Claiming clears the commission; accepting it again starts at zero.
- Abandoning a commission discards its progress after an in-game confirmation. It does not remove earned expedition reputation.
- Six quartermaster items require reputation, gold, and the selected hero's character level. Three patterns require gold, Honored reputation, and the matching crafting profession at skill 125. Crafting a pattern's item is separate from learning it; the resulting gear requires character level 10 and suitable armor eligibility to equip. Purchases check all requirements before deducting gold; owned items and learned patterns cannot be bought again.
- Patterns remain learned when a profession is forgotten. Crafting still requires the profession, skill, reputation, materials, and gold. New items do not enter ordinary loot pools.
- Existing saves load with zero faction reputation, no commission, and no learned faction patterns. No past expedition is credited retroactively.

### Delivery and verification

Implemented data and transaction rules first, followed by the Outposts page, camp objective preview, pause objective preview, result reputation feedback, and profession unlock explanations. A ready commission adds an Outposts navigation badge; claims identify the hero who will receive XP. Reputation reward rules can be expanded on the page, and every locked offer explains its next unmet requirement.

The catalog now contains 58 equipment pieces and 32 recipes. The six direct faction rewards are three universal trinkets at character level 5 and three universal boots at level 10. The three patterns create leather gloves, mail gauntlets, and a cloth hood. Existing equipment and recipe identifiers keep their meaning.

The version-1 save gains `reputation`, `commission`, `learnedRecipes`, and a completed-commission total. Validation repairs malformed values, clamps reputation at 2,000 and active progress at the goal, and allows only known pattern identifiers. Settlement retains the existing duplicate-run guard. Pattern knowledge is independent of current profession rank.

Verification passed: **56 simulation/progression tests, 18 browser tests, strict TypeScript checking, production build and formatting checks**. Browser coverage includes an accepted commission progressed through a real shrine visit and return; persistence; reviewed abandonment; a manual claim followed by fresh repeat acceptance; buying/equipping gear; learning a pattern, crafting/equipping its item and changing professions; and touch outpost navigation. Layout checks pass at 360, 390, 760, 800, 1,024, 1,280 and 1,440 pixels, with 44px navigation targets on narrow screens. Screenshots are in `output/screenshots/`.

Combat rules were not retuned for this release. Long-term reputation pacing, reward power and material costs still need human playtesting. Existing boss and class diagnostics are documented in [validation notes](VALIDATION.md).
