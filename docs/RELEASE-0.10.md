# Release 0.10 — materials and gathering progression

## Design before implementation

Replace the six-material economy with four grades in each of its six families. Existing keys, names and quantities remain the first grade; eighteen new materials begin at zero. Equipment, profession skill, training, enchantments and earlier claims remain intact. Existing recipes and formulas keep outputs and fees, but skill milestones consume corresponding grades: below 50 / 50–124 / 125–224 / 225+. There is no free conversion of old stock into advanced resources.

Herbalism, Mining, Skinning and Fishing gather at skills 1 / 50 / 125 / 225, with character levels 1 / 5 / 10 / 20. Practice stops at skill 50 / 125 / 225 / 300 for each grade and respects the trained cap. Practice within a run can unlock the next grade; snapshots of skill/cap protect the run from later camp changes. Trivial resources remain collectible. Travel still pauses node gathering. Skinning selects a grade the trained hero can gather, so high-level beasts do not remove the starting gatherer's practice path.

Outdoor nodes use predictable distance bands: first grade near camp, higher grades farther away. Elwynn supplies grades I–II, Westfall I–III, Tirisfal I–IV. Each supported band guarantees herb, ore and fish nodes; random nodes enrich it. A field compass targets the nearest undepleted node in a selected family or all eligible families, shows the material, distance, requirements and expected skill gain, and permits inspecting locked resources. Dungeon nodes rise by room up to grade III; Ragefire supplies ore rather than fish. Cloth drops and encounter caches use zone/run progression bounded by hero level. Disenchanting selects dust at equipment levels 1 / 5 / 10 / 18 and grants diminishing practice according to that grade. The final threshold uses existing Artisan gear at level 18; gathering and cloth still use character level 20.

Camp storage groups resources by family and grade with concrete acquisition guidance. Recipes, enchanting reviews, disenchant previews, gathering hints and results display exact names. Advanced-material changes require auditing all eight crafting paths to 300, every gathering path, old saves and real browser transactions. No new recipes or gear are needed in this phase.

## Research

Blizzard's [Classic primer](https://news.blizzard.com/en-gb/article/23090134/wow-classic-primer-for-new-players) establishes primary/secondary profession structure. The original manual's trade-skill chapters describe gathering inputs and recipes becoming easier with practice. Vanilla material names are cross-checked against the [Classic profession guides](https://www.wow-professions.com/classic). The shared four-grade gates, guaranteed nodes, compressed region distribution, exact deterministic skill gains and recipe costs are original survival-game rules; they do not reproduce Classic's individual node thresholds or entire material catalog.

## Verification

- Strict TypeScript checking, production build, formatting and **143 simulation/progression tests** pass. Sixteen new checks cover the 24-resource catalog, graded costs for all recipes/formulas, six-stock migration and bounds, guaranteed seeded node bands, atomic gathering gates, every grade's practice boundaries, unlocking grades within a run, snapshots, pause/upgrades/travel, compass filters and guardian closure, usable wolf hides, cloth gates, dungeon grades/rewards, advanced crafting deductions and qualified/trivial/capped disenchant practice. All four gathering trades reach 300 through real collection, settlement and paid training; the existing eight crafting-trade progression checks still pass with graded inputs.
- The complete **56-test browser suite** passes. Five new flows cover legacy stock and enchantment persistence, collecting eight Tin Ore through movement and crafting/equipping a grade-II crown, family/locked targeting and keyboard focus, mounted collection waiting for dismount, equipment-grade dust with reviewed enchantment deductions, and phone storage/guides/compass taps. Isolated fixtures change node positions/population; collection, practice, costs and settlement use production code.
- Resource storage retains all 24 rows without horizontal overflow at 360 / 390 / 760 / 800 / 1024 / 1440 pixels, with no browser errors. Phone source guides, family filters and the locked-node label have targets at least 44 pixels tall. Desktop/phone storage, field guide, compass and twelve-node grade gallery captures in `output/screenshots/` were visually inspected. Existing node art decodes for every grade.
- Refreshed scripted diagnostics: **27/27** starter Elwynn wins, **19/27** prepared Tirisfal wins, and **27/27** level-10 Ragefire wins across nine classes and three seeds, with no timeouts. First-upgrade ranges: 6–48 / 6–45 / 5–12 seconds; successful finish ranges: 364–419 / 482–548 / 325–380 seconds respectively. These movement policies do not assess human difficulty or gathering/crafting pacing. Raw reports are `output/balance-0.10-{starter,advanced,ragefire-entry}.jsonl`.
- Dense regression scenes remain bounded at 400 enemies. Simulation plus Canvas submission measured averages/p95 of **1.60/2.40 ms** outdoors, **1.59/4.40 ms** in Deadmines and **1.35/2.00 ms** in Ragefire. These local CPU measurements exclude presentation and do not establish mobile FPS.

## Implemented economy

| Family  | Grade I       | Grade II                | Grade III          | Grade IV           |
| ------- | ------------- | ----------------------- | ------------------ | ------------------ |
| Herbs   | Peacebloom    | Briarthorn              | Kingsblood         | Sungrass           |
| Ore     | Copper Ore    | Tin Ore                 | Iron Ore           | Mithril Ore        |
| Leather | Light Leather | Medium Leather          | Heavy Leather      | Thick Leather      |
| Cloth   | Linen Cloth   | Wool Cloth              | Silk Cloth         | Mageweave Cloth    |
| Dust    | Strange Dust  | Soul Dust               | Vision Dust        | Dream Dust         |
| Fish    | Smallfish     | Bristle Whisker Catfish | Mithril Head Trout | Spotted Yellowtail |

The grade follows each recipe's required skill, even when the crafter has higher skill. All 55 recipes and 12 enchantment formulas use this rule. New advanced supplies are earned through gathering, enemies, encounters and equipment recycling. Tirisfal encounters provide the initial Dream Dust before crafting Artisan equipment; recycling level-18 Artisan equipment provides another source. Returning, falling and dungeon recovery retain the existing reward rules and exact material names. Unfinished expeditions still require returning or falling to save their earned materials.

Node bands are below 700 / 1300 / 1900 world units, then the frontier, capped by region. The three original near-camp nodes retain their locations. Each supported advanced band guarantees a herb, ore and fish node; each outdoor map has 170 nodes total. Dungeon rooms have eight deposits/pools, with Ragefire providing ore only. Later wolves select the minimum of hero eligibility, current Skinning skill grade and elapsed-time grade; the zone ceiling does not cap hides, preserving a path to Thick Leather without adding creatures in this phase.

The compass occupies the existing exploration panel. Press G or Gather, select All / Herbs / Ore / Fish, and optionally inspect locked nodes. Collection and combat remain active. The compass reports current in-run skill, trained cap, requirements and actual practice gain; it closes when a guardian arrives. Checkbox focus keeps movement/pause shortcuts available, while Space toggles the checkbox. Desktop and phone controls share these rules.

## Remaining scope

The shared four-grade economy is a compressed adaptation rather than the full vanilla material catalog. Skill increases are deterministic, fishing remains proximity-based, and there are no profession quests or crafting mini-games yet. Existing node artwork is reused with grade badges; separate illustrations for every material and authored gathering animations remain future work. Human sessions are needed to tune collection routes, advanced crafting costs and long-term profession pacing.
