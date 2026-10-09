# Wow Survivors

A playable survival roguelite with solo and two-player local co-op inspired by Vampire Survivors and the world of original WoW Classic. Choose a class, survive an expedition, bring home loot, and prepare a stronger build for the next adventure.

## Play locally

```powershell
npm install
npm run dev
```

The game opens in your browser on the first free port starting at **5678**. The terminal prints the actual URL; an occupied port is skipped automatically. Run `npm run dev -- --no-open` to keep the browser closed, or `npm run dev -- --port 6000` to choose a different starting port.

```powershell
npm run build
npm run preview
```

Preview opens the first free port starting at **4173** and accepts the same `--port` and `--no-open` options. The production build is in `dist/` and can be served by any static web host. Requires Node 20.19+ or 22.12+ and a modern browser. All artwork and fonts are bundled locally. No backend, accounts, API keys, or runtime third-party requests are required.

## Class identity — 1.2

**Space dashes; C uses your class signature.** Dash works from a standstill in your facing direction. Touch has a dedicated dash button; controller B / Circle dashes.

All nine classes now have distinct combat loops: Rage and frontal cleaves, stationary Focus and Shatter, target-bound rogue combos, hunter range/Aim/pet commands and traps, paladin seals and holy ground, priest Grace and party protection, three elemental shaman territories, warlock health trades/curses/souls, and three druid forms with separate Mana/Energy/Rage reserves. Class-specific body motions, spell shapes, projectiles, audio, target marks, live meters, and newly illustrated Cat/Moonkin forms make those choices visible.

Read [the class guide and release notes](docs/RELEASE-1.2.md). Reproduce 81 seeded starter-build diagnostics with `npx tsx scripts/class-balance.ts`.

## Beyond the Horde — 1.1

The camp now puts your next goal, hero and expedition build in reach. Use **Shape your build** before departure, or open the crown in the header for the Hall of Mastery.

- **Three challenge settings:** Explorer reduces enemy health by 15% and incoming damage by 30%, with full progression. Adventurer retains the original challenge. Heroic adds 20% enemy health, 30% incoming damage and 15% spawn frequency, with 25% more base gold and character XP. Choose before each expedition.
- **Four expedition oaths:** keep your original class strengths with The Unbound, trade speed for durability with The Vanguard, trade health for power with The Spellbinder, or trade armor for mobility and pickup reach with The Wayfarer. The preview shows your resulting health and damage. Oaths reset their effects after the run; your selection is saved.
- **Six combat keystones:** at run levels 4, 8 and 12, choose a new rule for your build: critical-hit lightning, healing on defeats, dash novas, experience vacuum, low-health finishing damage or a once-per-hero lethal-hit rescue. Two free rerolls per expedition help shape your choices. Upgrade cards show roles, stat changes and spell evolution progress.
- **Momentum:** defeats within five seconds continue your chain. At 10 / 20 / 30 defeats, gain 5% / 10% / 15% damage. Health damage or five seconds without a defeat breaks the chain. Pauses and choices freeze it; shields protect it.
- **Three optional objectives per expedition:** defeat 60 enemies; complete two landmarks or dungeon guardians; use class abilities four times while defeating at least 20 enemies. Their gold and XP settle automatically, including on partial returns. Expand Expedition objectives in the combat HUD.
- **Eight permanent mastery milestones and four relics:** earn gold for once-only milestones, unlock relics through play, and freely choose one relic for future runs. Relics offer pickup reach, power, a shorter dash cooldown or a starting shield. Existing saves receive credit for their recorded achievements.
- **Clearer return screens:** review your oath, keystones, best momentum, ability use and objectives. One more adventure starts a fresh run with your selected build.
- **Readable UI:** a refreshed camp, stronger upgrade hierarchy, larger-text and high-contrast settings, brighter danger outlines, responsive phone layouts and retained keyboard/controller support. All settings and progression stay in your local save and exports.

In local co-op, both heroes use the chosen oath and relic, share momentum and objectives, and benefit from keystones. P1 chooses keystones. Second Wind can rescue each hero once. Storm Conduit shares one proc cooldown across the party.

Research, exact mechanics and the human-playtest plan are in [the 1.1 release notes](docs/RELEASE-1.1.md). Run `npx tsx scripts/adventure-balance.ts` for deterministic novice-build diagnostics; these are not human win-rate estimates.

## The adventure

- **Nine playable classes:** Warrior, Mage, Rogue, Hunter, Paladin, Priest, Shaman, Warlock, and Druid. Each has its own automatic attacks, active skill, passive, resource and stat profile.
- **81 class abilities:** 36 free core abilities and 45 optional Classic-inspired techniques, including timed support, shields, healing and signature specialization attacks. Learn spells during expeditions, increase their ranks, and evolve them at rank five. Hunter and Warlock begin with companions.
- **Class trainers and spellbooks:** learn five personal techniques per class at character levels 5, 12, 20, 30 and 40 for 40, 120, 240, 360 and 480 gold. Prepare four known abilities at camp for free. Starter attacks and companions stay prepared; the other slots can be changed or restored. Training is permanent, while expedition spell ranks reset. New techniques include bleeds, curses, healing, roots and a low-health finisher.
- **Five outdoor zones:** Elwynn Forest (6 minutes), Westfall (7), Tirisfal Glades (8), and Duskwood (9), plus the final boss fights. Defeat 120 enemies to unlock Westfall; complete an expedition for Tirisfal. Duskwood requires a Shadowfang Keep clear and selected character level 20, with eight creature types, six Night Watch landmarks, Stitches' cleaver and lingering poison, twenty-eight local world items and a guaranteed epic trophy.
- **Ragefire Chasm:** four volcanic arenas beneath Orgrimmar, with Oggleflint, Taragaman, Jergosh and Bazzalan. Eight alternating boss attacks, stronger second phases, thirty-one exclusive rare rewards and original creature art. Clear Tirisfal and reach character level 10 to enter.
- **The Deadmines dungeon:** three consecutive arenas beneath Westfall and aboard the Ironclad, with Sneed's Shredder, Mr. Smite and Edwin VanCleef. Carry your build between stages, choose recovery boons and secure rare boss equipment. Defeat the Westfall boss and reach character level 10 to enter.
- **Shadowfang Keep:** four haunted castle arenas, Silverlaine, Springvale, Fenrus and Arugal, eight alternating attacks and thirty-three original rare rewards. Clear Ragefire Chasm and reach character level 15 to enter. Worgs and worgen support Skinning; Arugal warns his teleport landing before moving.
- **The northern finale:** clear Duskwood and reach level 25 to enter Scarlet Monastery's four guardian rooms. Whitemane resurrects the commander for a protected final stand. Clear the cathedral and reach level 40 for Eastern Plaguelands, six frontier landmarks, shadow storms, lingering nature clouds and the original Blight Herald. Thirty-one new item definitions include six-piece Dawnward sets and three faction relics; twenty-four Artisan recipes craft the armor.
- **Concluding journeys:** after the earlier faction campaigns and guild mastery projects, accept three faction epilogues and twelve guild conclusions in the Journal. Win the named destination after acceptance, deliver exact Artisan materials where required, and review a once-only reward. Both northern clears and all fifteen conclusions display the completed journey; you can keep playing afterward.
- **Independent equipment copies:** duplicate expedition rewards and explicit copy crafts create separately owned items with a deterministic stat, attribute and resistance roll. Condition, enchantments, binding, repairs and destruction belong to each copy. Two copies of the same ring can fill both positions. The satchel holds up to 1,000 items; full-bag expedition drops convert to gold, and copy crafting requires space.
- **Primary attributes and resistances:** strength/intellect add damage, agility adds critical chance and speed, stamina adds health and spirit adds regeneration. Five magical resistance schools reduce matching enemy projectiles and hazards by up to 60%, alongside existing armor. Northern equipment and rolled copies show these properties in the Armory.
- **Local co-op:** choose another roster hero at camp. P1 uses WASD, C and Space; P2 uses arrows, Enter and Backspace. Both heroes attack automatically with their own prepared abilities, gear and resources. A shared camera and separation limit keep the party together; stand within 90 units of a fallen ally for three seconds to revive them. Both falling ends the expedition. Either living player collects pickups. Each earns character XP; gold, loot and materials settle once. P1 chooses their own upgrade bonuses and manages supplies and gathering; P2's prepared abilities gain ranks automatically. This mode uses one keyboard and one local save.
- **A complete run loop:** mixed enemy waves, experience gems, three-choice upgrades, elite enemies, treasure chests, gathering, telegraphed attacks, final bosses, victory or defeat, and persistent rewards.
- **World encounters:** six landmarks per zone, a discovery compass and minimap markers. Choose expedition blessings at shrines, defeat marked cache guards for equipment, or defend ritual circles for materials, gold, healing and XP.
- **Distinct boss fights:** Hogger's charges and stomps, the Defias Captain's firing lanes and dynamite, and the Gravekeeper's soul rings and grave eruptions. Each has an enraged phase, visible warnings and a dedicated health/attack HUD.
- **Classic talent path:** freely review a switch at level 10 to all 27 Vanilla tree structures: 432 nodes with original names, rank caps, rows and explicit prerequisites; one point per level from 10 to 60, capped at 51. Effects use survivor combat rules. Signature talents can learn their named technique for free once its character-level requirement is met. Switching refunds current ranks and retains permanently learned techniques. Older saves keep their compact path.
- **Persistent character progression:** character XP and levels up to 60, three six-node talent trees per class (162 nodes total), prerequisite-gated ranks, 21 allocatable points across 42 possible ranks, and free respecs. Advanced talents specialize named attacks with damage, cast speed, extra projectiles, larger areas, piercing, reduced resource costs or life steal.
- **Equipment:** 384 item definitions across sixteen slots, including off-hands, necklaces, wrists and two ring positions; four rarities; class, armor and character-level eligibility; equipping, selling and disenchanting. Ninety-three rare items come from dungeon guardians and nine class relics come from personal trials. The acquisition guide lists 222 pieces for ten equipment families. Rings fill empty positions; with both occupied, compare each replacement and choose or cancel. One ring can be shared between heroes and worn once per hero. Four established crafted armor sets have cumulative two-, three- and six-piece bonuses; four Dawnward sets use two, four and six pieces. Item comparisons include gained and lost set bonuses and enchantments. Shields suit Warrior/Paladin/Shaman; held focuses suit Mage/Priest/Warlock/Druid. Off-hands require a one-handed weapon. Switching to a two-handed weapon opens a review and returns the off-hand to your shared inventory; removing the main weapon also clears the off-hand. Warrior, Rogue and Hunter can learn personal Dual Wield at character level 10 for 60 G. A distinct eligible one-handed secondary contributes 50% of its item and enchantment bonuses. Review both placements or swap a legal weapon pair before committing. The separate ranged position holds bows, caster wands or thrown sets alongside hand equipment, with full item/enchantment bonuses. Older bows/wands retain their primary fit; use Place ranged weapon to review a move. Personal weapon training unlocks one-handed axes for Warrior/Hunter/Paladin/Shaman at level 3 for 40 G, and polearms for Warrior/Hunter/Paladin at level 5 for 55 G. Review a trainer purchase from the Armory, satchel or discovery guide. Two-handed axes, fist weapons, guns and crossbows also have reviewed personal training and four grades of world, crafted and guardian items. Guns and crossbows use the ranged position. Older weapon families retain their established access.
- **Equipment practice and upkeep:** weapon hits improve personal family skill and accuracy. Optional equipment shots or melee strikes use T, a touch button or RT/R2; bows, guns and crossbows consume stored ammunition. Review repairs at camp when gear wears down. Enchanting can apply one of six original affixes, permanently binding that owned item to one hero. Affixes and enchantments coexist; broken items lose their bonuses until repaired. Starter equipment stays usable.
- **Class trials:** an independent three-chapter journey for every hero, with 27 claimable chapters in total. Practice starter spells and active abilities, master another spell, evolve an attack and defeat a boss. Earn class XP, gold, dust and a class-exclusive rare relic.
- **Professions:** learn any two of the nine primary trades. Gather herbs, ore and leather; collect cloth from enemies; use 151 recipes to craft weapons, armor, charms, healing supplies and bombs. Recipes unlock at skill milestones, and trivial recipes stop granting skill. Three faction patterns require Honored standing and skill 125. Cooking, First Aid and Fishing are available to every character.
- **Training and crafting paths:** Apprentice, Journeyman, Expert and Artisan trainers raise skill caps from 75 to 300. All six crafting trades and Cooking/First Aid have recipes to reach 300. Choose Armorsmith/Weaponsmith, Gnomish/Goblin Engineer, or Elemental/Tribal/Dragonscale Leatherworker to unlock specialized rewards. Changing paths has a reviewed gold cost and keeps crafted equipment.
- **24 materials:** four grades each of herbs, ore, leather, cloth, dust and fish. Advanced recipes spend advanced supplies. Gathering practice respects resource difficulty and trained caps; a field compass shows eligible or locked nodes, exact requirements and expected skill gain.
- **Profession quests:** 48 optional projects across all twelve trades. Accept gathering expeditions, grade-matched crafting work and practical healing, bomb or meal objectives. Reviewed turn-ins consume exact materials and reward gold and selected-hero XP. Complete each chain at skill 300 for one of twelve permanent level-20 epic mastery trinkets. Progress spans your roster; trainers remain available independently.
- **Permanent enchantments:** twenty-four formulas augment weapons, chest armor, hands, boots, wrists, cloaks and off-hands at the Armory. Review bonuses, replacement changes, gold/material costs and skill gain before applying. Effects follow the shared item across heroes and remain after unlearning Enchanting.
- **Mounts and travel forms:** a stable with two personal riding ranks, ten racial steeds, two class-trial steeds and Druid/Shaman forms. Select a travel option per hero, summon in a clear space and explore at +40%, +60% or +100% speed. Travel pauses new attacks and ends on damage or successful combat actions; final bosses and dungeons require combat on foot.
- **Faction outposts:** build shared reputation with Timbermaw Hold, Thorium Brotherhood and Argent Dawn. Accept nine repeatable commissions, claim bonus rewards, and purchase nine quartermaster items or three profession patterns. The visiting outposts, missions, rewards and shortened reputation thresholds are original adaptations.
- **Faction campaigns:** three shared-roster stories with twelve sequential chapters connecting outdoor patrols and landmarks to Deadmines, Ragefire and Shadowfang. Accept before departure, secure progress across partial returns, review chapter rewards and earn three universal rare cloaks. Completing a campaign and reaching Exalted unlocks its level-20 epic quartermaster trinket for 500 G.
- **Quests and journal:** eleven claimable objectives, character XP and gold rewards, saved landmark and dungeon guardian counts, expedition history and persistent zone clears.
- **Controller support:** standard gamepads control movement, combat and menus. Stick/D-pad navigation, focus cycling, scrolling, selectors and reviewed transactions work through the existing UI. Controller hints follow the active input; disconnecting pauses combat.
- **Original adaptive music:** twelve locally synthesized themes follow camp, destinations, bosses, recovery and results, with a quiet critical-health pulse. Enable music in Settings and choose its volume independently of sound effects. Music pauses with combat choices and focus loss, then resumes its held position; older saves keep music off until enabled.
- **Character animation:** front/back hero illustrations follow movement direction, including mounted riders. Eight authored gait poses animate heroes, companions, Bear Form, travel and all outdoor/dungeon creatures. Six-pose casting, melee and ranged gestures respond to accepted hero, companion and creature actions; boss preparation follows its warning countdown. Six death poses collapse/fade creatures and guardians, with fallen hero/Bear Form poses behind immediate results. Actual movement drives footsteps; idle, pause, frozen enemies and blocked movement stay still. Heavy creatures, spiders, earthborers and floating spirits have their own rigs. Settings and the device reduced-motion preference control character motion.
- **Quality of life:** local saves, validated save import/export, sound and visual settings, keyboard controls, touch movement and active-ability controls, automatic pause on focus loss, and responsive camp screens.

Runs have separate levels from your persistent character. Run spells and temporary upgrades reset; character levels, talents, gold, gear, materials, supplies, professions and quests remain. Loot is credited when you finish or return to camp. Healing supplies and bombs are consumed when used. A cooked meal is used automatically at expedition start for +15 maximum health.

## Controls

| Key               | Action                            |
| ----------------- | --------------------------------- |
| WASD / arrow keys | Move                              |
| Space             | Dash, including from a standstill |
| C                 | Signature class ability           |
| Shift             | Dash shortcut                     |
| Q                 | Use a healing supply              |
| E                 | Use a crafted bomb                |
| F                 | Interact with a landmark          |
| T                 | Equipment shot / melee strike     |
| G                 | Toggle the gathering compass      |
| R                 | Summon / cancel / dismiss travel  |
| 1 / 2 / 3         | Choose an upgrade or blessing     |
| Escape / P        | Pause or resume                   |

In local co-op, arrows control P2, Enter uses their class ability and Backspace dashes; WASD/C/Space control P1. The existing gamepad and touch controls manage P1 and shared menus. A second gamepad, remote networking and trading are outside this local mode.

Connect a standard-mapped controller and press a button, then release it. The left stick or D-pad moves. Controller support uses button positions with Xbox / PlayStation labels:

| Controller         | Action                              |
| ------------------ | ----------------------------------- |
| A / Cross (bottom) | Class ability / confirm menu choice |
| B / Circle (right) | Dash / back                         |
| X / Square (left)  | Healing supply                      |
| Y / Triangle (top) | Crafted bomb                        |
| LB / L1            | Landmark / previous camp tab        |
| RB / R1            | Travel / next camp tab              |
| View / Create      | Gathering compass                   |
| Menu / Options     | Pause / resume                      |
| RT / R2            | Equipment attack during combat      |
| LT / RT · L2 / R2  | Previous / next menu control        |
| Right stick        | Scroll menus and reviews            |

In menus, left/right changes a focused selector; confirm toggles checkboxes and expands guides. Release controls between screens. Reconnecting a controller leaves the expedition paused until you resume. Keyboard, mouse and touch remain available. Settings and the field guide show controller status and the complete mapping. Browser access requires HTTPS or localhost and a controller the browser maps to the standard layout; unsupported layouts are reported in Settings.

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

Learn **Enchanting**, then visit the **Armory** and choose an item at the enchanting table. Formulas unlock at skills 1, 50, 125 and 225. One effect belongs to each owned item, and its bonuses apply while equipped. Replacing an effect pays the new cost and removes the old bonus; applying the identical formula again is blocked. Selling or disenchanting destroys the enchantment, so reacquired equipment starts clean. Practice and disenchanting respect trained skill caps. Eligible formulas can still be applied at the cap without earning practice; training the next rank restores practice. Rings and necklaces have no formulas.

Visit the **Stable** to train Trail riding at character level 12 for 100 G, then buy your race's regular steed for 200 G. Swift riding opens at level 20 for 350 G, with swift steeds costing 650 G. Purchased steeds are shared by heroes of the same race; each hero needs its own riding training. Druid Travel Form and Shaman Ghost Wolf train at level 8 for 40 G without riding. Completing the Paladin or Warlock's three class trials unlocks its level-10 class steed without a riding fee, including trials completed in older saves. Choose one option per hero, or travel on foot.

Press **R** or tap **Travel** outdoors while standing still, at least 160 world units from living enemies and four seconds after the last accepted hit. Summoning takes 1.25 seconds for steeds or 0.6 seconds for forms; moving or a nearby enemy interrupts it. Travel multiplies ordinary movement speed, without adding camp combat stats. New spells, orbit strikes and pet attacks wait while summoning or travelling; existing effects resolve normally. A hit or successful class ability, dash, supply use or landmark interaction dismounts you. Dismount to gather at nodes. Dungeon arenas and the final outdoor boss prevent summoning.

Visit **Outposts** to accept a campaign chapter from a visiting envoy. Chapters require Neutral / Friendly / Honored / Revered standing and character levels 1 / 5 / 10 / 15 (Argent dungeon entry needs level 15). Each chapter names its exact destination. Progress is shared across your roster and counts only future runs started with that chapter accepted. Defeat actual guardians for dungeon progress; clearing the entire dungeon completes the final chapter. Review and claim rewards before accepting the next chapter. Abandoning a chapter resets its current progress and preserves earlier claims. Cloaks are awarded once; Exalted trinkets follow ordinary quartermaster ownership and purchase rules.

## Research and production notes

[Research and design](docs/RESEARCH.md) records the source study, scope, class matrix, system adaptations, architecture, balance targets and long-term roadmap. The implementation deliberately compresses Classic's progression into short survival expeditions; this is not a one-to-one recreation of WoW.

[Original art and prompts](docs/ART.md) records the built-in image generation prompts, ten local illustrations/atlases, and authored dungeon SVG/Canvas graphics. [Validation notes](docs/VALIDATION.md) describe checks, measurements and known limits. Font licenses are included in `public/fonts/`.

The current release is **1.0**, completing the [survivor-game roadmap](docs/COMPLETION.md). [Release 1.0](docs/RELEASE-1.0.md) records the new systems, compatibility and local co-op rules.

Release **0.30** added weapon practice/accuracy, equipment shots/ammunition, wear/repairs, personal affix attunement, four further weapon families, 44 items, 16 recipes and eight enchantments. Generated evidence is now ignored; the repository keeps only runtime media and compact regression fixtures. [Release notes](docs/RELEASE-0.30.md) record compatibility and validation. [0.29](docs/RELEASE-0.29.md) added personal axe/polearm training, reviewed purchases, twenty-two rewards and eight Blacksmithing recipes. [0.28](docs/RELEASE-0.28.md) added a separate ranged socket, reviewed legacy bow/wand moves, twenty-two ranged rewards and eight graded recipes. [0.27](docs/RELEASE-0.27.md) added personal dual-wield training, reviewed hand placement/swaps and eleven blades. [0.26](docs/RELEASE-0.26.md) added off-hands, handedness, thirty items and eight recipes. [0.25](docs/RELEASE-0.25.md) added necklaces and four wrist enchantments. [0.24](docs/RELEASE-0.24.md) added wrists, paired rings, 24 items, eight graded bracer recipes and reviewed ring replacements. [0.23](docs/RELEASE-0.23.md) added death cycles for creatures, guardians, heroes and Bear Form, bounded detached visuals, immediate results/recovery and reduced-motion fallbacks. [0.22](docs/RELEASE-0.22.md) added creature attack gestures, preparation through boss warnings and bounded boss-priority frame construction. [0.21](docs/RELEASE-0.21.md) added casting, melee and ranged gestures for heroes, companions and Bear Form. [0.20](docs/RELEASE-0.20.md) added creature locomotion, four texture rigs, corrected crops and a bounded frame queue. [0.19](docs/RELEASE-0.19.md) added hero, companion and travel locomotion with reduced-motion support. [0.18](docs/RELEASE-0.18.md) added automatic free-port startup and ten original adaptive music themes with independent settings. [0.17](docs/RELEASE-0.17.md) added standard controller movement, combat actions, menu navigation, context hints and pause on disconnect. [0.16](docs/RELEASE-0.16.md) added Duskwood, Stitches, thirteen level-20 items, a Night Watch milestone and nine original creature sprites. [Release notes](docs/RELEASE-0.16.md) document the source study, progression design, save compatibility and verification. [0.15](docs/RELEASE-0.15.md) added three faction campaigns, twelve chapters, three cloak rewards and three Exalted trinkets. [0.14](docs/RELEASE-0.14.md) added Shadowfang Keep, four guardians, eight attacks, sixteen rare rewards and nine creature sprites. [0.13](docs/RELEASE-0.13.md) added four equipment slots, forty items, twenty recipes, six-piece crafted sets and an acquisition guide. [0.12](docs/RELEASE-0.12.md) added class trainers and spellbooks; [0.11](docs/RELEASE-0.11.md) added profession projects; [0.10](docs/RELEASE-0.10.md) added graded materials; [0.9](docs/RELEASE-0.9.md) added Ragefire Chasm; [0.8](docs/RELEASE-0.8.md) added travel; [0.7](docs/RELEASE-0.7.md) added class trials and enchantments; [0.6](docs/RELEASE-0.6.md) added the Deadmines; [0.5](docs/RELEASE-0.5.md) added profession training; [0.4](docs/RELEASE-0.4.md) added outposts; [0.3](docs/RELEASE-0.3.md) added world encounters; [0.2](docs/RELEASE-0.2.md) added specializations and sets. Release 1.0 closes the finite survivor-game expansion roadmap with Classic talent structures, specialization techniques, item copies/rolls, attributes/resistances, northern destinations and quest conclusions, directional hero art and local co-op. See the [completion checklist](docs/COMPLETION.md) and [1.0 release notes](docs/RELEASE-1.0.md). Future work can extend content or add networking; this release does not reproduce the entire Vanilla MMO catalog.

## Verification

```powershell
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run format:check
```

`npm test` checks the headless simulation, progression, music scheduling, character gait/caching and free-port server rules. Browser tests exercise the real UI, input, native music playback, save reloads, crafting, mobile overflow and dense combat rendering. Each browser run starts its own server on the first free port and captures its actual URL. Run `node scripts/check-local-server.mjs --browser` after building to verify development/preview fallback, capture ownership and the complete browser suite with port 5173 occupied.

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
node scripts/check-offhand-balance.mjs
node scripts/check-dual-wield-balance.mjs
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

The balance script runs an explicit movement policy for every class across three seeds and reports first-upgrade times and complete expedition outcomes. Advanced mode checks a level-21 character with a 21-point hybrid build and all six equipment slots filled in Tirisfal. Dungeon mode checks prepared level-21 builds, or level-10 builds with `--entry`, through all three Deadmines stages using production timings and boss health. Add `--ragefire` to check all four Ragefire stages or `--shadowfang` for the level-15 entry to Shadowfang Keep. Add `--spellbook` to train eligible techniques and prepare them through the real progression functions; entry-level dungeon heroes can learn the first technique. Add `--wardrobe` for ten legally equipped slots: a six-piece crafted set and Artisan cape at level 21, or four set pieces, a Journeyman cape and level-10 world leggings/belt at level-10 dungeon entry. Shadowfang entry uses six set pieces and an Expert cape at level 15. Add `--accessories` for thirteen slots: the wardrobe build plus a legally crafted Expert/Artisan bracer and two eligible rings with explicit sources. `node scripts/check-accessory-balance.mjs` compares ten-slot heroic, thirteen-slot heroic and thirteen-slot Deadmines entry profiles and writes `output/accessory-balance-0.24.json`. Add `--necklaces` for fourteen slots, including an eligible guardian pendant, and `--wrist-enchant` for a real graded application to the crafted bracer. `node scripts/check-necklace-balance.mjs` compares the unchanged thirteen-slot profile with fourteen-slot heroic, enchanted heroic and enchanted level-10 Deadmines profiles, saving `output/necklace-balance-0.25.json`; stalls in the simple movement policy remain visible as timeouts. Add `--offhands` for eligible one-handed weapon/shield or focus pairs through real craft/equip transactions, with fifteen filled sockets for seven classes and fourteen for Rogue/Hunter. `node scripts/check-offhand-balance.mjs` compares the unchanged fourteen-slot baseline with prepared off-hand heroic and Deadmines entry profiles across 81 attempts, saving `output/offhand-balance-0.26.json`. Add `--dual-wield` to train Warrior/Rogue/Hunter and prepare legal one-handed pairs using the actual training/craft/equip actions; all nine classes then fill fifteen sockets, with the other six retaining shield/focus builds. `node scripts/check-dual-wield-balance.mjs` compares the unchanged v0.26 off-hand profile with trained heroic and Deadmines entry profiles across 81 attempts, saving `output/dual-wield-balance-0.27.json`. Add `--ranged` for sixteen filled sockets on Warrior/Rogue/Hunter/Mage/Priest/Warlock, using actual graded Engineering/Enchanting crafts and ranged equip transactions; the other three classes retain fifteen. `node scripts/check-ranged-balance.mjs` compares the unchanged v0.27 dual-wield profile with ranged heroic and Deadmines entry profiles across 81 attempts, saving `output/ranged-balance-0.28.json`. Add `--weapon-type=axe` or `--weapon-type=polearm` for actual personal training, graded Blacksmithing crafts and legal placements on eligible heroes, alongside ranged equipment. Polearms clear the dependent off-hand. `node scripts/check-weapon-training-balance.mjs` compares the unchanged v0.28 ranged profile with axe/polearm heroic and Deadmines entry profiles across 135 attempts, saving `output/weapon-training-balance-0.29.json`. Add `--campaign=timbermaw`, `--campaign=thorium` or `--campaign=argent` to compare a legal level-21 seven-slot build wearing its cloak and Exalted trinket, using the actual equip/purchase transactions and seeded completion/standing. These prepared profiles use real craft/equip actions; they do not measure time to obtain the gear. The default core-only profile is preserved. Add `--duskwood --entry` for prepared level-20 outdoor builds, with `--wardrobe` for ten equipped slots; `node scripts/check-duskwood-balance.mjs` checks these profiles and compares the original three against v0.15. `node scripts/capture-duskwood.mjs` captures the guide, all nine creature silhouettes and camp/boss layouts at six widths. Add `--class=warrior` to inspect one class. These diagnostics do not establish human win rates or final game balance. The capture scripts save desktop, mobile, combat and progression screenshots in `output/screenshots/` using their own free-port server and browser, which close when the capture finishes. Set `$env:WOW_SURVIVORS_URL="http://127.0.0.1:6000/"` to capture an existing session instead; that server remains running. The actual URL is printed for each capture. Progressed examples use an isolated fixture and leave the player’s save untouched.

For equipment practice diagnostics, add `--equipment-progression` and one of `--weapon-type=gun`, `crossbow`, `fist` or `greataxe`; `--practiced --attuned` prepares capped practice and a paid personal affix. `node scripts/check-equipment-balance.mjs` verifies 135 attempts with equipment attacks, ammunition, settled condition and personal practice, saving `output/equipment-balance-0.30.json`.

Generated screenshots, downloaded sources, logs and reports belong in ignored `output/`. Historical documents record paths used at the time; those captures can be regenerated locally. The ten small fixtures in `tests/fixtures/balance/` preserve required comparisons, with identical historical profiles consolidated. Run `npm run check:repo` before committing to verify media references and cleanup. Removing generated files from the current tree does not erase older Git objects.

## Project structure

| File                                                                                                                            | Responsibility                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/content.ts`                                                                                                                | Class, skill, talent, equipment, profession, recipe, zone and quest definitions                   |
| `src/accessories.ts`, `src/equipment.ts`, `src/equipment-ui.ts`, `src/equipment.css`                                            | Wrist/ring catalogs and recipes, compatible ring positions and reviewed replacements              |
| `src/engine.ts`                                                                                                                 | Fixed-step combat, enemy AI, spatial queries, resources, upgrades and run outcomes                |
| `src/expedition.ts`                                                                                                             | Landmark definitions, blessings, boss identities and shared telegraph geometry                    |
| `src/dungeon.ts`, `src/dungeon-ui.ts`, `src/dungeon-renderer.ts`                                                                | Route definitions, recovery/rewards, cave/deck/volcanic floors and Tauren graphics                |
| `src/campaigns.ts`, `src/campaign-ui.ts`, `src/campaigns.css`                                                                   | Faction chapter definitions, six rewards, objective previews, timelines and reviewed claims       |
| `src/shadowfang.ts`, `src/shadowfang-renderer.ts`                                                                               | Haunted dungeon stages, guardians, exact loot sources, measured creature crops and castle floors  |
| `src/ragefire.ts`                                                                                                               | Eleven original Ragefire guardian rewards, integrated into the shared equipment catalog           |
| `src/factions.ts`, `src/faction-ui.ts`                                                                                          | Faction content, commission definitions and outpost presentation                                  |
| `src/training.ts`, `src/training-ui.ts`                                                                                         | Profession ranks, crafting paths, trainer cards and specialization previews                       |
| `src/class-trials.ts`, `src/class-trial-ui.ts`                                                                                  | Personal trial chapters, class relic definitions and progress presentation                        |
| `src/enchanting.ts`, `src/enchanting-ui.ts`                                                                                     | Formula definitions, item effects, table and replacement reviews                                  |
| `src/character.css`                                                                                                             | Class trial, enchanting table and review layouts                                                  |
| `src/travel.ts`, `src/stable-ui.ts`, `src/stable.css`                                                                           | Travel definitions, stable/trainer reviews and responsive travel presentation                     |
| `src/resources.ts`, `src/resource-ui.ts`, `src/resources.css`                                                                   | Material grades, gathering requirements, camp storage and the fieldwork compass                   |
| `src/spellbook.ts`, `src/spellbook-ui.ts`, `src/spellbook.css`                                                                  | Class technique catalog, preparation repair, mentor reviews and responsive spellbook presentation |
| `src/wardrobe.ts`, `src/wardrobe-ui.ts`, `src/wardrobe.css`                                                                     | Original equipment additions, six-piece bonuses, acquisition guide and slot filters               |
| `src/item-progression.ts`, `src/item-progression-ui.ts`                                                                         | Equipment snapshots, practice/accuracy, condition/repairs, attunement/binding and ammunition      |
| `src/progression.ts`                                                                                                            | Persistent progression, transactions, eligibility, quest rewards and save validation              |
| `src/renderer.ts`                                                                                                               | Canvas world, sprite atlases, effects, minimap and cached terrain texture                         |
| `src/main.ts`                                                                                                                   | Camp navigation, dialogs, controls, UI, storage and game loop integration                         |
| `src/profession-quests.ts`, `src/profession-quest-ui.ts`, `src/profession-quests.css`                                           | Shared profession projects, mastery rewards and the responsive guild workbench                    |
| `src/controller.ts`, `src/controller-ui.ts`, `src/controller.css`                                                               | Standard gamepad sampling, safe transitions, menu focus, scrolling, help and input hints          |
| `src/animation.ts`, `src/animation-canvas.ts`, `src/creature-animation.ts`, `src/combat-animation.ts`, `src/creature-combat.ts` | Locomotion/combat rigs, measured crops and bounded character/creature caching                     |
| `src/audio.ts`                                                                                                                  | Procedural sound effects; no downloaded game audio                                                |
| `src/music.ts`, `src/music-player.ts`, `src/music.css`                                                                          | Original compositions, resumable audio-clock scheduling, bounded synthesis and music controls     |
| `scripts/local-server.mjs`, `scripts/capture-session.mjs`                                                                       | Free-port development/preview, actual URLs and owned capture server/browser cleanup               |
| `src/style.css`, `src/progression.css`, `src/expedition.css`, `src/factions.css`, `src/training.css`, `src/dungeon.css`         | Responsive camp interface, trainers, outposts, dungeon recovery and battlefield HUD               |
| `tests/`                                                                                                                        | Simulation, progression and browser checks                                                        |

To add content, extend the typed definitions in `content.ts`. New behavior belongs in the simulation; keep Canvas rendering and DOM UI separate from combat rules. Saves are versioned under `wow-survivors-save-v1` in local storage.

For prepared endgame combat diagnostics, run `npm run balance -- --scarlet --entry --cloud-aware` or `npm run balance -- --plaguelands --entry --cloud-aware`. Add `--local-coop` for a second actor, or omit `--entry` for level-60 profiles. These profiles spend legal Classic talents and use actual crafting/equip transactions; the movement policy and prepared inventory do not estimate a human's win rate or progression time.
