# Wow Survivors 0.5 — profession training and specializations

## Design before implementation

Professions currently display skill out of 300, but recipe practice ends much earlier and there is no trainer transaction. This release connects gathering, crafting, training, and equipment: practice to a rank cap, pay the camp trainer to extend it, then choose a crafting path and make its rewards.

Blizzard's [Classic primer](https://news.blizzard.com/en-us/article/23090134/wow-classic-primer-for-new-players) identifies Blacksmithing, Engineering and Leatherworking specializations, including the two smithing paths, two engineering paths, and three leatherworking paths. The [original manual](https://assets.blz-contentstack.com/v3/assets/blt3452e3b114fab0cd/blt2e9295db02a222fc/6025bcbb6968b53d529edb2a/media_manual_classic_enUS.pdf), printed pages 92–100, explains trade-skill ranks, trainer visits, difficult recipes, and losing skill when unlearning a profession. The rank structure and specialization names inform this design. Camp access, requirements, prices, switching rules, item names/stats and recipes are original survival-game adaptations.

### Rules

- Apprentice caps at 75; Journeyman at 150; Expert at 225; Artisan at 300. Learning a primary trade remains free and starts Apprentice at skill 1. The three secondary skills also start Apprentice.
- Train Journeyman at skill 50, selected character level 5, for 30 gold; Expert at skill 125, level 10, for 90; Artisan at skill 200, level 20, for 180. Training raises capacity, not current skill. The shared roster keeps its ranks when the selected hero changes.
- Gathering and crafting can continue at a cap, but award no skill beyond it. Craft previews show the actual gain, including a partial gain near the cap. Trivial recipes remain trivial after training.
- At skill 150, Expert rank, selected character level 12, and 100 gold, choose one path per supported profession: Armorsmith or Weaponsmith; Gnomish or Goblin Engineer; Elemental, Tribal or Dragonscale Leatherworker.
- Changing a path costs 100 gold and needs an in-game review explaining what becomes unavailable. Profession skill, rank, materials, already crafted items and faction patterns remain. Recipes require the currently selected path to craft; equipment retains its normal class/armor/level eligibility.
- Unlearning a primary profession removes its skill, rank and specialization. Crafted items and previously purchased faction patterns remain. Relearning starts Apprentice at skill 1.
- New recipes bridge every crafting trade and Cooking/First Aid to 300, with Expert and Artisan recipes. Secondary skills receive an additional Journeyman bridge. New equipment recipes cannot create gold through repeated vendor-value refunds. Consumable batch recipes use the existing healing, bomb and meal effects.
- Older saves retain all skill and receive the minimum rank that can hold it. Missing specialization data starts empty. Imports repair invalid ranks and reject specializations that do not match the learned profession and its eligibility.

### Delivery and verification

Trainer transactions and save migration were implemented before the menus and recipe content. The completed interface shows current skill against the trained cap, the next rank's requirements and fee, actual crafting gains, and specialization rewards before spending gold. Learned profession cards occupy the full row on narrow phones. Camp notifications appear one at a time and stay out of the specialization review.

This release adds **14 equipment items and 23 recipes**, bringing the catalog to **72 items and 55 recipes**. Seven paths provide Expert rewards, and all six crafting professions receive advanced recipes. Cooking and First Aid receive larger batches at three milestones. An Engineering Journeyman batch bridges the gap between simple bombs becoming trivial and Expert recipes unlocking. Batch recipes retain existing effects; transactions that would exceed supply storage are rejected before charging resources.

Version-1 saves gain trained-rank and specialization fields. Older skill values are preserved with the minimum rank that can hold them. Invalid imported rank/path combinations are repaired. Gathering skill now settles within the expedition's existing duplicate-reward guard and respects trained caps. Results identify skills that need further training.

**70 simulation/progression tests and 22 browser tests pass**, alongside the production build, strict TypeScript checking and formatting checks. New tests cover trainer costs and eligibility, partial gains at caps, capped gathering in the actual simulation, migration, all seven paths, path switching, forgetting/relearning, storage overflow, and a crafted Weaponsmith weapon changing real combat damage and attack timing.

Each crafting profession plus Cooking and First Aid can reach skill 300 through legal recipes and trainer transactions. That automated reachability check uses abundant materials/gold and simulates consuming supplies; it does not measure campaign pacing or affordability. Browser flows train, review/cancel/choose/switch paths, craft, equip and reload, including touch controls and the complete recipe catalog at 360px. Layout captures at 360, 390, 760, 800, 1,024 and 1,440px show no horizontal overflow or browser errors. Progressed captures use isolated saves.

Human playtesting is still needed for trainer fees, material costs and new equipment balance. Combat encounter behavior was not retuned. See [validation notes](VALIDATION.md) for measurements, screenshots and existing limits.
