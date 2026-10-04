# Wow Survivors

A playable, single-player survival roguelite inspired by Vampire Survivors and the world of original WoW Classic. Choose a class, survive an expedition, bring home loot, and prepare a stronger build for the next adventure.

## Play locally

```powershell
npm install
npm run dev
```

Open the local address printed by Vite. The current development session is running at **http://127.0.0.1:5176**. Vite chooses another port when the default is occupied.

```powershell
npm run build
npm run preview
```

The production build is in `dist/` and can be served by any static web host. Requires Node 20.19+ or 22.12+ and a modern browser. All artwork and fonts are bundled locally. No backend, accounts, API keys, or runtime third-party requests are required.

## The adventure

- **Nine playable classes:** Warrior, Mage, Rogue, Hunter, Paladin, Priest, Shaman, Warlock, and Druid. Each has its own automatic attacks, active skill, passive, resource and stat profile.
- **54 class abilities:** 36 free core abilities and 18 optional Classic-inspired techniques. Learn spells during expeditions, increase their ranks, and evolve them at rank five. Hunter and Warlock begin with companions.
- **Class trainers and spellbooks:** learn a personal technique at character levels 5 and 12 for 40 and 120 gold. Prepare four known abilities at camp for free. Starter attacks and companions stay prepared; the other slots can be changed or restored. Training is permanent, while expedition spell ranks reset. New techniques include bleeds, curses, healing, roots and a low-health finisher.
- **Four outdoor zones:** Elwynn Forest (6 minutes), Westfall (7), Tirisfal Glades (8), and Duskwood (9), plus the final boss fights. Defeat 120 enemies to unlock Westfall; complete an expedition for Tirisfal. Duskwood requires a Shadowfang Keep clear and selected character level 20, with eight creature types, six Night Watch landmarks, Stitches' cleaver and lingering poison, twelve rare world items and a guaranteed epic trophy.
- **Ragefire Chasm:** four volcanic arenas beneath Orgrimmar, with Oggleflint, Taragaman, Jergosh and Bazzalan. Eight alternating boss attacks, stronger second phases, fifteen exclusive rare rewards and original creature art. Clear Tirisfal and reach character level 10 to enter.
- **The Deadmines dungeon:** three consecutive arenas beneath Westfall and aboard the Ironclad, with Sneed's Shredder, Mr. Smite and Edwin VanCleef. Carry your build between stages, choose recovery boons and secure rare boss equipment. Defeat the Westfall boss and reach character level 10 to enter.
- **Shadowfang Keep:** four haunted castle arenas, Silverlaine, Springvale, Fenrus and Arugal, eight alternating attacks and sixteen original rare rewards. Clear Ragefire Chasm and reach character level 15 to enter. Worgs and worgen support Skinning; Arugal warns his teleport landing before moving.
- **A complete run loop:** mixed enemy waves, experience gems, three-choice upgrades, elite enemies, treasure chests, gathering, telegraphed attacks, final bosses, victory or defeat, and persistent rewards.
- **World encounters:** six landmarks per zone, a discovery compass and minimap markers. Choose expedition blessings at shrines, defeat marked cache guards for equipment, or defend ritual circles for materials, gold, healing and XP.
- **Distinct boss fights:** Hogger's charges and stomps, the Defias Captain's firing lanes and dynamite, and the Gravekeeper's soul rings and grave eruptions. Each has an enraged phase, visible warnings and a dedicated health/attack HUD.
- **Persistent character progression:** character XP and levels up to 60, three six-node talent trees per class (162 nodes total), prerequisite-gated ranks, 21 allocatable points across 42 possible ranks, and free respecs. Advanced talents specialize named attacks with damage, cast speed, extra projectiles, larger areas, piercing, reduced resource costs or life steal.
- **Equipment:** 189 items across ten slots, including shoulders, cloaks, belts and leggings; four rarities; class, armor and character-level eligibility; equipping, selling and disenchanting. Forty-five rare items come from dungeon guardians and nine class relics come from personal trials. The acquisition guide lists fifty-two pieces for the four expanded slots. Four crafted armor sets have cumulative two-, three- and six-piece bonuses. Item comparisons include gained and lost set bonuses and enchantments.
- **Class trials:** an independent three-chapter journey for every hero, with 27 claimable chapters in total. Practice starter spells and active abilities, master another spell, evolve an attack and defeat a boss. Earn class XP, gold, dust and a class-exclusive rare relic.
- **Professions:** learn any two of the nine primary trades. Gather herbs, ore and leather; collect cloth from enemies; use 75 recipes to craft weapons, armor, charms, healing supplies and bombs. Recipes unlock at skill milestones, and trivial recipes stop granting skill. Three faction patterns require Honored standing and skill 125. Cooking, First Aid and Fishing are available to every character.
- **Training and crafting paths:** Apprentice, Journeyman, Expert and Artisan trainers raise skill caps from 75 to 300. All six crafting trades and Cooking/First Aid have recipes to reach 300. Choose Armorsmith/Weaponsmith, Gnomish/Goblin Engineer, or Elemental/Tribal/Dragonscale Leatherworker to unlock specialized rewards. Changing paths has a reviewed gold cost and keeps crafted equipment.
- **24 materials:** four grades each of herbs, ore, leather, cloth, dust and fish. Advanced recipes spend advanced supplies. Gathering practice respects resource difficulty and trained caps; a field compass shows eligible or locked nodes, exact requirements and expected skill gain.
- **Profession quests:** 48 optional projects across all twelve trades. Accept gathering expeditions, grade-matched crafting work and practical healing, bomb or meal objectives. Reviewed turn-ins consume exact materials and reward gold and selected-hero XP. Complete each chain at skill 300 for one of twelve permanent level-20 epic mastery trinkets. Progress spans your roster; trainers remain available independently.
- **Permanent enchantments:** twelve formulas augment weapons, chest armor, hands and boots at the Armory. Review bonuses, replacement changes, gold/material costs and skill gain before applying. Effects follow the shared item across heroes and remain after unlearning Enchanting.
- **Mounts and travel forms:** a stable with two personal riding ranks, ten racial steeds, two class-trial steeds and Druid/Shaman forms. Select a travel option per hero, summon in a clear space and explore at +40%, +60% or +100% speed. Travel pauses new attacks and ends on damage or successful combat actions; final bosses and dungeons require combat on foot.
- **Faction outposts:** build shared reputation with Timbermaw Hold, Thorium Brotherhood and Argent Dawn. Accept nine repeatable commissions, claim bonus rewards, and purchase nine quartermaster items or three profession patterns. The visiting outposts, missions, rewards and shortened reputation thresholds are original adaptations.
- **Faction campaigns:** three shared-roster stories with twelve sequential chapters connecting outdoor patrols and landmarks to Deadmines, Ragefire and Shadowfang. Accept before departure, secure progress across partial returns, review chapter rewards and earn three universal rare cloaks. Completing a campaign and reaching Exalted unlocks its level-20 epic quartermaster trinket for 500 G.
- **Quests and journal:** eleven claimable objectives, character XP and gold rewards, saved landmark and dungeon guardian counts, expedition history and persistent zone clears.
- **Quality of life:** local saves, validated save import/export, sound and visual settings, keyboard controls, touch movement and active-ability controls, automatic pause on focus loss, and responsive camp screens.

Runs have separate levels from your persistent character. Run spells and temporary upgrades reset; character levels, talents, gold, gear, materials, supplies, professions and quests remain. Loot is credited when you finish or return to camp. Healing supplies and bombs are consumed when used. A cooked meal is used automatically at expedition start for +15 maximum health.

## Controls

| Key               | Action                           |
| ----------------- | -------------------------------- |
| WASD / arrow keys | Move                             |
| Space             | Class active ability             |
| Shift             | Dash while moving                |
| Q                 | Use a healing supply             |
| E                 | Use a crafted bomb               |
| F                 | Interact with a landmark         |
| G                 | Toggle the gathering compass     |
| R                 | Summon / cancel / dismiss travel |
| 1 / 2 / 3         | Choose an upgrade or blessing    |
| Escape / P        | Pause or resume                  |

Abilities attack automatically. Move toward experience gems and treasure chests to collect them. Walk near herb or ore nodes with the matching profession to gather them. Fish are gathered from pools without occupying a primary profession slot. Skinning recovers leather from defeated wolves.

Gathering grades open at skills **1 / 50 / 125 / 225** and character levels **1 / 5 / 10 / 20**. Their practice ends at skill **50 / 125 / 225 / 300**, subject to your trained cap; trivial resources still provide materials. Elwynn has node grades I–II, Westfall I–III, and Tirisfal I–IV. Higher grades lie farther from camp. Press **G** or tap **Gather** to find a node, filter its family or inspect locked resources. Dismount before collecting. Later wolf kills yield a usable leather grade; non-wolf cloth drops and encounter rewards improve with run progression and character level. Dungeon nodes rise by room through grade III.

Professions shows all 24 resources and acquisition guides. Recipe requirements below 50 / 50–124 / 125–224 / 225+ consume grades I / II / III / IV. Disenchanting recovers dust by equipment level 1 / 5 / 10 / 18; the last threshold matches Artisan crafted gear. Existing saves keep their original six stocks as grade I and begin with zero advanced supplies. Equipment and enchantments remain usable.

Follow the compass to discover landmarks. Interact within 85 world units using F or the on-screen button. Shrine choices pause time and can be cancelled; blessings last for the current expedition. A cache requires defeating all three marked guards. A ritual requires 20 seconds inside its circle and slowly loses progress outside. One defended encounter can be active at a time. New encounters stop when the final boss arrives; active ones can still finish.

The **Ragefire Chasm** route has 60-, 75-, 90- and 90-second survival stages plus four guardian fights. It unlocks after a Tirisfal clear; the selected hero needs level 10. Every class can enter all three dungeons. The arena edge is solid, while exterior lava and interior decorations establish the setting. Follow the boss HUD and leave marked attack areas. All four guardians must fall for a Ragefire victory. Each dungeon has its own Journal milestone.

**Shadowfang Keep** opens after a persistent Ragefire clear and selected hero level 15. Its dining hall, watch chamber, worg library and moonlit tower last 75 / 90 / 105 / 120 seconds plus guardian fights. Defeat Silverlaine, Springvale, Fenrus and Arugal in order to win. Shadow Port marks its landing before Arugal jumps; sidestep the landing blast and reconnect during the next attack. Worgs, worgen and Fenrus use the existing Skinning skill, level and practice rules. The castle has no herb, mining or fishing nodes. Guardian rewards and cloth use grade III for eligible entrants; guild projects still require their own named destinations. Recovery and partial returns use the same rules as the earlier routes.

The **Deadmines** has 90-, 105- and 120-second survival stages, plus time to defeat each guardian. Recovery pauses the clock: press 1, 2 or 3, or tap a boon to continue with 30% maximum health restored and full resource. Your run spells, upgrades, supplies and loot carry forward. You can return during recovery and keep collected rewards; dungeon victory requires all three guardians. Equip new loot at camp. Dungeon stages replace outdoor landmarks and grant no outdoor faction reputation or commission progress. Older saves infer cleared zones from retained victories; a Westfall victory already removed from the twenty-entry history needs another clear to establish its unlock.

Visit **Outposts** before setting out to accept one commission. Its objective counts future returns from the matching zone, across any number of expeditions and heroes. Claim rewards manually; character XP goes to your selected hero. Elwynn earns Timbermaw reputation, Westfall earns Thorium reputation, and Tirisfal earns Argent reputation. Reputation also accumulates without a commission, including on defeat. Patterns remain learned after changing professions, but crafting still needs the matching trade and skill.

Visit **Professions** to train the next rank: Journeyman at skill 50/character level 5 for 30 G; Expert at skill 125/level 10 for 90 G; Artisan at skill 200/level 20 for 180 G. Training increases the skill cap without granting skill. At a cap, you can still gather materials and craft supplies or gear. Craft previews show the actual skill gain. Crafting paths require skill 150, Expert training, character level 12 and 100 G. Unlearning a primary profession removes its skill, trained rank and path, while crafted items and learned faction patterns remain. These requirements and fees are compressed original designs for the survival game.

Visit the **Journal** to accept your selected hero's class trial. Chapters open at character levels 1, 5 and 10; claim each chapter before accepting the next. Only future runs by that hero count. Starter casts need a valid target, active uses must successfully spend their resource/cooldown, and rank/evolution objectives need actual spell upgrades. Objectives can accumulate across separate returns, including defeats. Pause shows this run's pending progress; results show saved progress. Older saves begin with unaccepted trials and receive no retroactive credit.

Learn **Enchanting**, then visit the **Armory** and choose an item at the enchanting table. Formulas unlock at skills 1, 50, 125 and 225. One effect belongs to each owned item, and its bonuses apply while equipped. Replacing an effect pays the new cost and removes the old bonus; applying the identical formula again is blocked. Selling or disenchanting destroys the enchantment, so reacquired equipment starts clean. Practice and disenchanting respect trained skill caps.

Visit the **Stable** to train Trail riding at character level 12 for 100 G, then buy your race's regular steed for 200 G. Swift riding opens at level 20 for 350 G, with swift steeds costing 650 G. Purchased steeds are shared by heroes of the same race; each hero needs its own riding training. Druid Travel Form and Shaman Ghost Wolf train at level 8 for 40 G without riding. Completing the Paladin or Warlock's three class trials unlocks its level-10 class steed without a riding fee, including trials completed in older saves. Choose one option per hero, or travel on foot.

Press **R** or tap **Travel** outdoors while standing still, at least 160 world units from living enemies and four seconds after the last accepted hit. Summoning takes 1.25 seconds for steeds or 0.6 seconds for forms; moving or a nearby enemy interrupts it. Travel multiplies ordinary movement speed, without adding camp combat stats. New spells, orbit strikes and pet attacks wait while summoning or travelling; existing effects resolve normally. A hit or successful class ability, dash, supply use or landmark interaction dismounts you. Dismount to gather at nodes. Dungeon arenas and the final outdoor boss prevent summoning.

Visit **Outposts** to accept a campaign chapter from a visiting envoy. Chapters require Neutral / Friendly / Honored / Revered standing and character levels 1 / 5 / 10 / 15 (Argent dungeon entry needs level 15). Each chapter names its exact destination. Progress is shared across your roster and counts only future runs started with that chapter accepted. Defeat actual guardians for dungeon progress; clearing the entire dungeon completes the final chapter. Review and claim rewards before accepting the next chapter. Abandoning a chapter resets its current progress and preserves earlier claims. Cloaks are awarded once; Exalted trinkets follow ordinary quartermaster ownership and purchase rules.

## Research and production notes

[Research and design](docs/RESEARCH.md) records the source study, scope, class matrix, system adaptations, architecture, balance targets and long-term roadmap. The implementation deliberately compresses Classic's progression into short survival expeditions; this is not a one-to-one recreation of WoW.

[Original art and prompts](docs/ART.md) records the built-in image generation prompts, eight local illustrations/atlases, and authored dungeon SVG/Canvas graphics. [Validation notes](docs/VALIDATION.md) describe checks, measurements and known limits. Font licenses are included in `public/fonts/`.

The current release is **0.16**, adding Duskwood, Stitches, thirteen level-20 items, a Night Watch milestone and nine original creature sprites. [Release notes](docs/RELEASE-0.16.md) document the source study, progression design, save compatibility and verification. [0.15](docs/RELEASE-0.15.md) added three faction campaigns, twelve chapters, three cloak rewards and three Exalted trinkets. [0.14](docs/RELEASE-0.14.md) added Shadowfang Keep, four guardians, eight attacks, sixteen rare rewards and nine creature sprites. [0.13](docs/RELEASE-0.13.md) added four equipment slots, forty items, twenty recipes, six-piece crafted sets and an acquisition guide. [0.12](docs/RELEASE-0.12.md) added class trainers and spellbooks; [0.11](docs/RELEASE-0.11.md) added profession projects; [0.10](docs/RELEASE-0.10.md) added graded materials; [0.9](docs/RELEASE-0.9.md) added Ragefire Chasm; [0.8](docs/RELEASE-0.8.md) added travel; [0.7](docs/RELEASE-0.7.md) added class trials and enchantments; [0.6](docs/RELEASE-0.6.md) added the Deadmines; [0.5](docs/RELEASE-0.5.md) added profession training; [0.4](docs/RELEASE-0.4.md) added outposts; [0.3](docs/RELEASE-0.3.md) added world encounters; [0.2](docs/RELEASE-0.2.md) added specializations and sets. Full vanilla talent trees, additional spell families and gear slots, expanded profession adventures, further faction stories, more dungeon routes, authored walk animations and cooperative play are future phases.

## Verification

```powershell
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run format:check
```

`npm test` checks the headless simulation and progression rules. Browser tests exercise the real UI and keyboard play, including level-up selection, pausing, returning to camp, save reloads, crafting, class selection, mobile overflow and a 400-enemy render scene. The browser suite starts a dedicated server on port 5176 when one is not already running there.

```powershell
npm run balance
npm run balance -- --advanced
npm run balance -- --dungeon --entry
npm run balance -- --dungeon
npm run balance -- --dungeon --ragefire --entry
npm run balance -- --wardrobe
npm run balance -- --wardrobe --dungeon --entry
npm run balance -- --dungeon --shadowfang --entry --wardrobe
npm run balance -- --campaign=argent
node scripts/check-campaign-balance.mjs
node scripts/check-shadowfang-balance.mjs
node scripts/check-wardrobe-balance.mjs
node scripts/capture.mjs
node scripts/capture-progression.mjs
node scripts/capture-factions.mjs
node scripts/capture-training.mjs
node scripts/capture-dungeon.mjs
node scripts/capture-ragefire.mjs
node scripts/capture-character.mjs
node scripts/capture-travel.mjs
node scripts/capture-resources.mjs
node scripts/capture-guild.mjs
node scripts/capture-spellbook.mjs
node scripts/capture-wardrobe.mjs
node scripts/capture-shadowfang.mjs
node scripts/capture-campaigns.mjs
```

The balance script runs an explicit movement policy for every class across three seeds and reports first-upgrade times and complete expedition outcomes. Advanced mode checks a level-21 character with a 21-point hybrid build and all six equipment slots filled in Tirisfal. Dungeon mode checks prepared level-21 builds, or level-10 builds with `--entry`, through all three Deadmines stages using production timings and boss health. Add `--ragefire` to check all four Ragefire stages or `--shadowfang` for the level-15 entry to Shadowfang Keep. Add `--spellbook` to train eligible techniques and prepare them through the real progression functions; entry-level dungeon heroes can learn the first technique. Add `--wardrobe` for ten legally equipped slots: a six-piece crafted set and Artisan cape at level 21, or four set pieces, a Journeyman cape and level-10 world leggings/belt at level-10 dungeon entry. Shadowfang entry uses six set pieces and an Expert cape at level 15. Add `--campaign=timbermaw`, `--campaign=thorium` or `--campaign=argent` to compare a legal level-21 seven-slot build wearing its cloak and Exalted trinket, using the actual equip/purchase transactions and seeded completion/standing. These prepared profiles use real craft/equip actions; they do not measure time to obtain the gear. The default core-only profile is preserved. Add `--duskwood --entry` for prepared level-20 outdoor builds, with `--wardrobe` for ten equipped slots; `node scripts/check-duskwood-balance.mjs` checks these profiles and compares the original three against v0.15. `node scripts/capture-duskwood.mjs` captures the guide, all nine creature silhouettes and camp/boss layouts at six widths. Add `--class=warrior` to inspect one class. These diagnostics do not establish human win rates or final game balance. The capture scripts save desktop, mobile, combat and progression screenshots in `output/screenshots/` using the local server on port 5176. Progressed examples use an isolated fixture and leave the player’s save untouched.

## Project structure

| File                                                                                                                    | Responsibility                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/content.ts`                                                                                                        | Class, skill, talent, equipment, profession, recipe, zone and quest definitions                   |
| `src/engine.ts`                                                                                                         | Fixed-step combat, enemy AI, spatial queries, resources, upgrades and run outcomes                |
| `src/expedition.ts`                                                                                                     | Landmark definitions, blessings, boss identities and shared telegraph geometry                    |
| `src/dungeon.ts`, `src/dungeon-ui.ts`, `src/dungeon-renderer.ts`                                                        | Route definitions, recovery/rewards, cave/deck/volcanic floors and Tauren graphics                |
| `src/campaigns.ts`, `src/campaign-ui.ts`, `src/campaigns.css`                                                           | Faction chapter definitions, six rewards, objective previews, timelines and reviewed claims       |
| `src/shadowfang.ts`, `src/shadowfang-renderer.ts`                                                                       | Haunted dungeon stages, guardians, exact loot sources, measured creature crops and castle floors  |
| `src/ragefire.ts`                                                                                                       | Eleven original Ragefire guardian rewards, integrated into the shared equipment catalog           |
| `src/factions.ts`, `src/faction-ui.ts`                                                                                  | Faction content, commission definitions and outpost presentation                                  |
| `src/training.ts`, `src/training-ui.ts`                                                                                 | Profession ranks, crafting paths, trainer cards and specialization previews                       |
| `src/class-trials.ts`, `src/class-trial-ui.ts`                                                                          | Personal trial chapters, class relic definitions and progress presentation                        |
| `src/enchanting.ts`, `src/enchanting-ui.ts`                                                                             | Formula definitions, item effects, table and replacement reviews                                  |
| `src/character.css`                                                                                                     | Class trial, enchanting table and review layouts                                                  |
| `src/travel.ts`, `src/stable-ui.ts`, `src/stable.css`                                                                   | Travel definitions, stable/trainer reviews and responsive travel presentation                     |
| `src/resources.ts`, `src/resource-ui.ts`, `src/resources.css`                                                           | Material grades, gathering requirements, camp storage and the fieldwork compass                   |
| `src/spellbook.ts`, `src/spellbook-ui.ts`, `src/spellbook.css`                                                          | Class technique catalog, preparation repair, mentor reviews and responsive spellbook presentation |
| `src/wardrobe.ts`, `src/wardrobe-ui.ts`, `src/wardrobe.css`                                                             | Original equipment additions, six-piece bonuses, acquisition guide and slot filters               |
| `src/progression.ts`                                                                                                    | Persistent progression, transactions, eligibility, quest rewards and save validation              |
| `src/renderer.ts`                                                                                                       | Canvas world, sprite atlases, effects, minimap and cached terrain texture                         |
| `src/main.ts`                                                                                                           | Camp navigation, dialogs, controls, UI, storage and game loop integration                         |
| `src/profession-quests.ts`, `src/profession-quest-ui.ts`, `src/profession-quests.css`                                   | Shared profession projects, mastery rewards and the responsive guild workbench                    |
| `src/audio.ts`                                                                                                          | Procedural sound effects; no downloaded game audio                                                |
| `src/style.css`, `src/progression.css`, `src/expedition.css`, `src/factions.css`, `src/training.css`, `src/dungeon.css` | Responsive camp interface, trainers, outposts, dungeon recovery and battlefield HUD               |
| `tests/`                                                                                                                | Simulation, progression and browser checks                                                        |

To add content, extend the typed definitions in `content.ts`. New behavior belongs in the simulation; keep Canvas rendering and DOM UI separate from combat rules. Saves are versioned under `wow-survivors-save-v1` in local storage.
