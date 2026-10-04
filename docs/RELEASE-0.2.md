# 0.2 — specialization and crafted equipment

The first release gives each class a complete survival loop. Its progression needs longer-lived choices: all 21 talent ranks can eventually be purchased, crafting has only starter recipes, and armor lacks equipment sets.

This pass adds six nodes to each talent tree, preserving the original three and their saved identifiers. Each tree offers 14 ranks; a character still has a 21-point budget across 42 possible ranks. The advanced nodes improve specific attacks and unlock an attack modifier such as additional projectiles, larger areas, reduced resource costs or life steal. This is an original survival-game adaptation, not the full vanilla talent catalog.

Equipment gains head and hands slots. Four original crafted armor sets offer cumulative two- and three-piece bonuses. Comparison values include lost and gained set bonuses. Character-level restrictions supplement armor and weapon eligibility. Zone drops supply additional head and hand items; crafting remains a separate route to complete sets.

Recipes unlock at skill milestones, and low-level recipes eventually stop granting skill. Apprentice, Journeyman, Expert and Artisan labels describe current skill bands; higher proficiency does not require a separate trainer transaction in this adaptation. The [official Classic Stormwind city guide](https://worldofwarcraft.blizzard.com/en-us/news/23149291/wow-classic-city-tour-stormwind) identifies trainers with those distinct proficiency titles. Exact recipe thresholds, costs, crafted items and set bonuses here are original design choices.

The save remains version 1 because these additions are compatible: existing fields and equipment identifiers retain their meaning, and new talent nodes and empty slots need no migration. Imports still enforce point budgets, talent prerequisites, class restrictions and character-level restrictions.

Verification must cover targeted spell effects in actual simulation, mutually constrained trees, two/three-piece set activation and removal, comparisons, level-gated equipment, recipe skill thresholds and diminishing gains, legacy save loading, and the actual browser flows. Layout checks include mobile screens with the expanded loadout and longer recipe catalog.

Implemented catalog: nine classes, 162 talent nodes, 49 equipment items, four three-piece crafted sets and 29 recipes. The automated suite contains 32 simulation/progression checks and seven browser checks. Save files remain compatible with 0.1. The production build and responsive layout checks pass; balance diagnostics and their limits are recorded in [VALIDATION.md](VALIDATION.md).
