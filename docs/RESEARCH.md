# Wow Survivors — research and design decisions

Initial research: October 2, 2026; dungeon, character progression and travel studies: October 3. Target: original / vanilla Classic fantasy, rather than expansion classes, retail progression or Season of Discovery runes.

## Duskwood study — October 4, 2026

The original publisher’s [2006 Atlas regional index](https://ptgmedia.pearsoncmg.com/imprint_downloads/brady/connected/wowatlas/RegionalIndices_hr.pdf) identifies Duskwood’s local creature groups and settlements. Blizzard’s [Stitches historical lore](https://news.blizzard.com/en-gb/article/15053030/stitches-hero-week) connects the abomination to Abercrombie, Darkshire and the Night Watch. The latter article’s Heroes of the Storm abilities were excluded from the Classic study. Release 0.16 uses original wave schedules, six survival landmarks, equipment and two boss patterns with a persistent poison mechanic. [Recorded design and verification](RELEASE-0.16.md).

## Reference study

- [Blizzard: Classic primer](https://news.blizzard.com/en-us/article/23090134/wow-classic-primer-for-new-players): nine classes; Alliance-only Paladins and Horde-only Shamans; three talent trees per class; talents start at level 10; trainable spell ranks; class weapon restrictions; two primary professions and three secondary professions. Our playable roster represents valid class/race/faction combinations. Persistent training starts earlier to make short expeditions rewarding.
- [Blizzard: first steps and class guide](https://news.blizzard.com/en-us/article/23317716/taking-your-first-steps-in-world-of-warcraft-classic): class identities cover melee, ranged weapons, elemental magic, holy/shadow magic, demons, pets and shapeshifting. Armor access distinguishes fragile casters from armored fighters. Our roster uses the original specialization names and expresses each identity through attacks, active abilities and build choices.
- [Blizzard: original game manual](https://assets.blz-contentstack.com/v3/assets/blt3452e3b114fab0cd/blt2e9295db02a222fc/6025bcbb6968b53d529edb2a/media_manual_classic_enUS.pdf): equipment, attributes, resource management, quests, trade skills and exploration form interlocking progression systems. We compress equipment to six meaningful slots, make spellcasting automatic, and preserve gathering-to-crafting dependencies.
- [poncle: Vampire Survivors on Steam](https://store.steampowered.com/app/1794680/Vampire_Survivors/): survival against growing crowds, experience collection, offensive upgrades, run-earned currency and permanent power-ups. Our adaptation preserves this escalating spatial combat loop, with a compact spell loadout and three choices whenever a run level is earned.
- [poncle: original itch.io release](https://poncle.itch.io/vampire-survivors): the developer's original playable release and guidance establish the minimal-input survival premise and weapon-growth structure. We use five spell ranks and an explicit rank-five evolution choice, rather than copying the original game's weapon/passive/chest requirements.
- [Blizzard: Classic class quests and new reputation rewards](https://news.blizzard.com/en-us/article/23302789/wow-classic-class-quests-and-new-reputation-rewards): reputation opens crafting rewards with Argent Dawn, Timbermaw Hold and Thorium Brotherhood, including tailoring, leatherworking, blacksmithing and enchanting recipes. Release 0.4 adapts that relationship into visiting camp emissaries, repeatable expedition commissions, quartermaster equipment and profession patterns. Camp placements, commissions, item names/stats, account-wide reputation and compressed thresholds are original designs; they do not reproduce Classic locations, quests or reputation numbers. See [release 0.4](RELEASE-0.4.md).

The original manual's attribute and resource sections (printed pages 46–48) distinguish attack power, critical chance, health, mana and regeneration. Its item section (printed pages 60–62) explains color-coded rarity and disenchanting. This release exposes the resulting combat bonuses directly: damage, critical chance, health, armor, haste, speed, regeneration and pickup radius. Mana funds spell casts, energy funds Rogue attacks, and Warrior combat generates rage for area attacks. Gear uses common, uncommon, rare and epic qualities; Enchanting converts spare equipment into crafting materials. Four original crafted sets add multi-piece bonuses. Primary attributes, durability and resistances are reserved for a later progression pass.

These are source-grounded observations. The durations, balance, talents, recipes and simplified rules below are original design choices for this game, not claims that they reproduce WoW or Vampire Survivors exactly.

## Systems adaptation

| System            | Survival-game adaptation                                                                       | Purpose                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Combat            | Automatic class spells; movement, dash, one active class ability                               | Positioning stays the central skill                     |
| Spell progression | Class-specific attacks, rank upgrades, stat choices; signature spells evolve at rank five      | Give every run a readable build trajectory              |
| Resource          | Automatically regenerated mana/energy, combat-generated rage                                   | Preserve class flavor without spell-bar micromanagement |
| Talents           | Three named trees per class; six nodes per tree; targeted spell mastery and prerequisite gates | Persistent specialization with reversible respec        |
| Equipment         | Weapon, chest, head, hands, boots and trinket; rarity, set bonuses and eligibility             | Loot changes the next expedition immediately            |
| Professions       | Two of nine primary professions; gathering nodes, drops, recipes and skill ranks               | Connect exploration, materials, crafting and combat     |
| Secondary skills  | First Aid, Cooking, Fishing support healing and preparation                                    | Give survival tools separate from offensive builds      |
| Quests            | Kill, gather and survive objectives with claimable rewards                                     | Guide early progression and zone discovery              |
| World             | Elwynn Forest, Westfall, Tirisfal Glades; distinct terrain, enemy sets and bosses              | Make expedition selection consequential                 |
| Meta progression  | Character XP, talent points, gold, inventory, professions and achievements persist             | Reward failed runs without removing the challenge       |

## Class identity matrix

| Class   | Starter attack  | Additional attacks                          | Active ability     | Three trees                             |
| ------- | --------------- | ------------------------------------------- | ------------------ | --------------------------------------- |
| Warrior | Cleave          | Whirlwind, Thunder Clap, Execute            | Charge             | Arms / Fury / Protection                |
| Mage    | Frostbolt       | Blizzard, Arcane Explosion, Fireball        | Frost Nova         | Arcane / Fire / Frost                   |
| Rogue   | Sinister Strike | Blade Flurry, Deadly Poison, Throwing Knife | Vanish             | Assassination / Combat / Subtlety       |
| Hunter  | Auto Shot       | Multi-Shot, Beast Companion, Explosive Trap | Disengage          | Beast Mastery / Marksmanship / Survival |
| Paladin | Holy Strike     | Consecration, Judgment, Hammer of Wrath     | Divine Shield      | Holy / Protection / Retribution         |
| Priest  | Smite           | Shadow Word: Pain, Holy Nova, Mind Blast    | Power Word: Shield | Discipline / Holy / Shadow              |
| Shaman  | Lightning Bolt  | Chain Lightning, Searing Totem, Magma Totem | Earthbind          | Elemental / Enhancement / Restoration   |
| Warlock | Shadow Bolt     | Corruption, Summon Imp, Immolate            | Drain Life         | Affliction / Demonology / Destruction   |
| Druid   | Wrath           | Moonfire, Thorns, Hurricane                 | Bear Form          | Balance / Feral / Restoration           |

Automatic attacks, orbiting Blade Flurry, combat-generated resources, and evolved spell names are survivor-genre adaptations. Some evolution names draw from later Warcraft abilities; the roster, starting class identities and named talent trees use the vanilla-era foundation. Hunters and Shamans can equip mail immediately in this compressed progression. Talents begin at character level 1, with one point per level up to a 21-point budget. Each tree offers 14 ranks, so 42 ranks compete for that budget. The advanced nodes and crafted sets are original designs described in [release 0.2](RELEASE-0.2.md). The full vanilla 51-point talent structure is a later content expansion.

## Complete first playable release

1. A polished camp with all nine playable heroes, zone selection and visible build stats.
2. A complete expedition: start, movement, automatic attacks, telegraphed enemy attacks, XP collection, paused level-up choices, elites, loot, gathering, final boss, victory/death and saved rewards.
3. Talent allocation and respec with real effects in combat.
4. Equipment collection, eligibility, equip/unequip and selling.
5. All nine primary professions selectable; recipes and gathering behavior; consumables used in runs; secondary profession actions.
6. Journal objectives, unlocks, local save export/import and settings.
7. Automated balance/invariant tests and browser verification of the full interaction flow.

## Long-term scope

The full ambition includes more zones and dungeon expeditions; additional class skills and faithful vanilla talent trees; more gear slots, affixes and sets; expanded profession recipes and quests; expanded faction campaigns and unlock quests; more elite/boss mechanics; authored music and animation; controllers; and optional cooperative play. These require separate content and production passes. Release 0.4 adds the first faction reputation and repeatable commission loop, 0.5 adds profession trainers, seven crafting paths and practice through skill 300, 0.6 adds the first dungeon journey, 0.7 adds personal class trials and permanent equipment enchantments, 0.8 adds riding, racial/class steeds and travel forms, 0.9 adds Ragefire Chasm, 0.10 adds four material grades and gathering practice through 300, and 0.11 adds optional profession projects and mastery equipment. The data-driven boundaries allow those systems to grow without rewriting the combat simulation.

## Profession training study

Release 0.5 returns to the [Classic primer](https://news.blizzard.com/en-us/article/23090134/wow-classic-primer-for-new-players), which identifies crafting specializations for Blacksmithing, Engineering and Leatherworking. Its seven named paths are used here. The [original manual](https://assets.blz-contentstack.com/v3/assets/blt3452e3b114fab0cd/blt2e9295db02a222fc/6025bcbb6968b53d529edb2a/media_manual_classic_enUS.pdf), printed pages 92–100, connects gathering/crafting practice, rank caps, trainer visits and recipe difficulty. Our camp training, compressed eligibility and fees, reversible path switching and new equipment are original adaptations. [Release 0.5](RELEASE-0.5.md) records those rules. Alchemy, Tailoring and Enchanting receive advanced recipes rather than additional specialization trees.

## Dungeon study

The original publisher's [BradyGames Deadmines guide](https://ptgmedia.pearsoncmg.com/imprint_downloads/brady/wow/deadmines/Deadmines%20HRBW.pdf) was read and its Mast Room and Ironclad Cove maps inspected. It establishes the Westfall entrance, mechanical mine rooms, ship setting, Tauren Mr. Smite and VanCleef's blackguards. Release 0.6 adapts three selected bosses into consecutive solo survival arenas. Other original bosses, the cannon sequence, quests and group combat are outside this route.

The design adds a 90/105/120-second stage schedule, telegraphed boss attacks, finite arenas, ten original rare items and paused recovery choices. These are original survival-game rules. One run build carries through every stage; each defeated guardian secures loot, while only the final guardian grants dungeon victory. Boons and a fixed rest heal let the player adjust between fights without turning camp equipment management into a mid-run menu. A Westfall clear and selected-character level 10 connect entry to existing progression. See [release 0.6](RELEASE-0.6.md).

## Class trial and enchantment study

Release 0.7 revisits Blizzard's [class-quest announcement](https://news.blizzard.com/en-us/article/23302789/wow-classic-class-quests-and-new-reputation-rewards), which connects trainers, personal quest chains and class-specific rare rewards. It also revisits the [original manual](https://assets.blz-contentstack.com/v3/assets/blt3452e3b114fab0cd/blt2e9295db02a222fc/6025bcbb6968b53d529edb2a/media_manual_classic_enUS.pdf), printed pages 101–102, on equipment augmentation and disenchanting ingredients.

The adaptation adds three original trial chapters per hero, accepted at levels 1, 5 and 10. Future-run evidence teaches starter casts, active skills, rank upgrades, evolution and guardian combat. Chapters accumulate across returns rather than resetting on defeat. Nine original relics provide a final equipment reward. A separate Armory table applies twelve permanent stat formulas to existing items. One effect follows each shared item; reviewed replacements charge atomically, and practice respects the existing trained caps. These are compressed solo systems, rather than the original level-50 quest routes or multiplayer enchanting window. See [release 0.7](RELEASE-0.7.md).

## Riding and travel study

Release 0.8 revisits the [Classic primer](https://news.blizzard.com/en-us/article/23090134/wow-classic-primer-for-new-players) on level-40 riding and purchased mounts, and the [original manual](https://assets.blz-contentstack.com/v3/assets/blt3452e3b114fab0cd/blt2e9295db02a222fc/6025bcbb6968b53d529edb2a/media_manual_classic_enUS.pdf), printed page 108, on racial steeds, Paladin/Warlock quest mounts and Druid/Shaman animal travel forms. The manual predates some launch decisions: its Tauren plainsrunning description is not a shipped racial-mount rule and is not implemented here. Expansion and modern class-mount articles were excluded from the vanilla study.

The adaptation uses two personal riding ranks at character levels 12 and 20, ten shared racial steeds, two class-trial steeds and two personal travel forms. A stationary summon and clear-space check connect travel to choosing an exploration route. New attacks stop while travelling; hits and successful combat actions dismiss the form or steed, and final bosses/dungeons require combat on foot. Fees, shortened gates, 40/60/100% speed choices, cooldown rules and shared stable ownership are original balance decisions. The stable and battlefield use a new original transparent atlas. See [release 0.8](RELEASE-0.8.md).

## Ragefire route study — 3 October 2026

[Blizzard’s Classic Orgrimmar tour](https://news.blizzard.com/en-gb/article/23156369/wow-classic-city-tour-orgrimmar) and [BradyGames’ original Ragefire guide](https://ptgmedia.pearsoncmg.com/imprint_downloads/brady/wow/ragefirechasm/ragefire_chasm_hrgs.pdf), especially pages 1 and 4, establish the Cleft of Shadow location, volcanic environment, trogg/elemental/cultist roster and original four encounter identities. Taragaman’s fire and uppercut identity and Bazzalan’s assassin identity inform the adaptation. The guide is a historical source with occasional quest-table inconsistencies; its quest rewards and numeric rules were not imported. The game does not use the later redesigned dungeon.

Release 0.9 makes a linear four-stage solo route: 60/75/90/90 seconds plus fights, Tirisfal-clear unlock, hero level 10, eight original telegraphed patterns and eleven original rare items. Jergosh precedes Bazzalan for a final assassin encounter; this is an authored sequence rather than a reproduction of the guide’s branching path. Lava lies beyond solid arena bounds; no lethal bridge knockback or invisible floor damage is claimed. Route data replaces Deadmines assumptions in simulation, previews, results, guardian counts, settlement and history validation. Route-specific milestones derive from persistent clears, preserving earlier claims. See [release 0.9](RELEASE-0.9.md).

## Architecture and constraints

TypeScript + Vite, with a Canvas 2D renderer and DOM menus. Content definitions are separate from simulation and persistence. The fixed-step simulation can run without a browser for tests. A spatial grid avoids comparing every projectile against every enemy. Entity and particle limits bound load. World props use a deterministic seed and chunk-local generation. Save data is validated and versioned, with recoverable import errors and explicit export.

Art direction: original painterly portraits and forest illustration, muted pine/teal, parchment gold, restrained ornate framing; original transparent character and environment sprite atlases in combat, with a cached procedural terrain texture. No extracted Blizzard assets. Generated art prompts and provenance are saved in ART.md.

## Balance targets

Six-minute introductory expeditions, elites at two-minute intervals and a final boss. First level-up is intended within the first 45 seconds, with ranged classes advancing earlier; several offensive choices in the first minute. Each class currently has four automatic spell families, and ranks cap at five. Time and zone difficulty scale spawn rate, enemy health and mixed formations. Release 0.3 replaces the shared boss pattern with Hogger's charge/stomp, the Defias Captain's firing lanes/dynamite and the Gravekeeper's soul ring/grave eruptions. Below half health, attacks intensify and accelerate. These are original encounter designs, detailed in [release 0.3](RELEASE-0.3.md). Six optional landmarks per zone reward route choices with expedition blessings, equipment and crafting materials. A surviving player must still defeat the final boss to win. Rewards are settled once; returning early preserves collected loot, materials, gold, character XP and completed encounter credit, with no victory bonus.

## Materials and gathering study

Release 0.10 revisits the original manual's trade-skill chapters and the [Classic profession index](https://www.wow-professions.com/classic). Six families provide a compact four-grade economy: Peacebloom / Briarthorn / Kingsblood / Sungrass; Copper / Tin / Iron / Mithril; Light / Medium / Heavy / Thick Leather; Linen / Wool / Silk / Mageweave Cloth; Strange / Soul / Vision / Dream Dust; and Smallfish / Bristle Whisker Catfish / Mithril Head Trout / Spotted Yellowtail. The names are cross-checked against the Classic [Herbalism](https://www.wow-professions.com/classic/herbalism-leveling-guide-classic-wow), [Mining](https://www.wow-professions.com/classic/mining-leveling-guide-classic-wow), [Leatherworking](https://www.wow-professions.com/classic/leatherworking-leveling-guide-classic-wow), [First Aid](https://www.wow-professions.com/classic/first-aid-leveling-guide-classic-wow), [Enchanting](https://www.wow-professions.com/classic/enchanting-leveling-guide-classic-wow) and [Fishing/Cooking](https://www.wow-professions.com/classic/fishing-and-cooking-leveling-guide-classic-wow) guides.

Classic uses different requirements for individual resources. This game instead uses shared gathering gates at skills 1/50/125/225 and character levels 1/5/10/20, deterministic practice, guaranteed distance bands and a compass for finding eligible resources. These are original rules for short expeditions; the compressed zone distribution is not a claim about vanilla spawn locations. Existing recipes retain outputs and fees but consume the grade matching their skill milestone. Disenchanting uses equipment levels 1/5/10/18 so existing Artisan gear supports Dream Dust. Tirisfal encounters also offer dust, providing the first advanced inputs before crafting an Artisan item. See [release 0.10](RELEASE-0.10.md).

## Class trainer and spellbook adaptation (release 0.12)

The original Blizzard manual describes paying a class trainer for abilities unlocked by character level, then choosing learned abilities for the action bar. Removing a shortcut keeps the learned ability in the spellbook. Its discussion of costs, cooldowns and companion commands supports separating permanent learning from expedition preparation. The manual and eighteen original client spell tooltips were reviewed before implementation; direct references and adaptation boundaries are in [release 0.12](RELEASE-0.12.md).

Each hero keeps four free core abilities and can learn two techniques at levels 5 and 12 for 40 and 120 gold. Four prepared choices define the expedition upgrade pool. Starter attacks and Hunter/Warlock companions remain protected. Learning belongs to one hero, preparation costs nothing, and old saves keep their original preparation. An active mastery trial warns when its required core ability is omitted.

Rend, Rupture, Serpent Sting and Curse of Agony introduce finite target effects; Agony ramps its later ticks. Holy Fire and Flame Shock combine impact with periodic damage. Holy Light, Renew and Rejuvenation offer self-healing without consuming crafted supplies or earning profession-use credit. Frost Nova controls ordinary enemies, Hammer of Wrath targets enemies at 20% health, and the remaining techniques add focused strikes, fire, frost, arcane and ground attacks. Numerical values, mentor names, evolved forms, automatic target spread and compatible talent links are original survival rules. Combo points, weapon queues, threat, party healing, stationary channels and a full vanilla rank catalog remain outside this phase. No modern expansion or Season of Discovery skill is introduced.

## Profession quest adaptation (release 0.11)

The original quest text for [Triage](https://classicdb.ch/?quest=6624) asks the player to treat injured patients; [Clamlette Surprise](https://classicdb.ch/?quest=6610) requires ingredient delivery. [Nat Pagle, Angler Extreme](https://www.wowhead.com/classic/quest=6607/nat-pagle-angler-extreme) combines fishing with regional travel. The Classic [First Aid](https://www.wow-professions.com/classic/first-aid-leveling-guide-classic-wow) and [Fishing/Cooking](https://www.wow-professions.com/classic/fishing-and-cooking-leveling-guide-classic-wow) guides explain the profession-training context. Database and guide entry-level metadata sometimes differ; this adaptation uses the activity structure and original compressed requirements, rather than treating those numbers as interchangeable.

The game adds four explicitly accepted, shared projects to each of twelve trades, at skills 1/50/125/225 and hero levels 1/5/10/20. Trainers remain independent. Successful future work earns progress: exact-grade collection in named regions, recipe transactions, equipment enchant applications, healing while injured, bombs damaging enemies and one minute of active survival with a consumed meal. The original NPC patient minigame and four rare quest fish are not reproduced. Existing professions, specializations and faction recipes determine which crafting work is available. Expert Fishing visits the Deadmines third room; its twelve direct catches require at least two visits to that room.

Each reviewed turn-in exchanges materials for gold and selected-hero XP; skill 300 and the final project award permanent mastery equipment. The twelve mentors, forty-eight projects, equipment and fees are original designs. Mastery bonuses offer build choices: the Enchanting prism trades the existing Prismatic Waystone’s critical chance for haste, avoiding a reward that is strictly worse than the item needed to earn it. Automated reachability checks do not establish human acquisition time or balance. See [release 0.11](RELEASE-0.11.md).

## Equipment expansion adaptation (release 0.13)

The original [Blizzard manual](https://assets.blz-contentstack.com/v3/assets/blt3452e3b114fab0cd/blt2e9295db02a222fc/6025bcbb6968b53d529edb2a/media_manual_classic_enUS.pdf), printed pages 58–61, identifies shoulders, back, waist and legs among armor slots, describes class/level restrictions and explains bonuses from equipped armor sets. Original client tooltips mirrored by ClassicDB distinguish [cloth shoulders](https://classicdb.ch/?item=4314), a [back-slot cloak](https://classicdb.ch/?item=2570) and [mail leggings](https://classicdb.ch/?item=2865). These historical relationships inform this phase; the survival game's gates and numbers remain compressed original rules.

Four new slots bring each hero to ten equipment positions. Forty original additions have explicit outdoor, crafting or guardian sources. Each zone supplies four discoveries; twenty recipes extend the four crafted sets and introduce cloaks and alternative Artisan leggings; eight guardian trophies join their appropriate dungeon rooms. The original armor hierarchy and item ownership model continue to apply. All classes can wear cloaks, and each outdoor slot has an accessible cloth option. Caches enforce character level and keep new crafts/guardian items out of their pools; elite chests can award local equipment for future levels.

Crafted outfits now offer cumulative bonuses at two, three and six equipped pieces. The earlier bonuses stay intact; changing one of six pieces loses only the sixth bonus, which the item comparison includes. Crafted alternatives trade set completion for attributes. The Armory guide shows exact sources, graded materials, recipe fees, ownership, equip restrictions and current access, while satchel filters combine slot and class usability.

Ten-slot diagnostics measure prepared builds using real craft/equip actions, rather than time to obtain ingredients or dungeon luck. Wrists, rings, off-hands, weapon handedness, dual wielding, durability and soulbinding remain future designs. Adding personal item instances or additional formulas needs a separate reviewed design; existing version-1 shared equipment and enchantments remain compatible. See [release 0.13](RELEASE-0.13.md).

## Shadowfang Keep study — 4 October 2026

The original publisher's [BradyGames Shadowfang Keep guide](https://ptgmedia.pearsoncmg.com/imprint_downloads/brady/wow/sk/sklr.pdf) was reviewed before implementation. Its Silverpine setting, haunted population, room sequence, gathering identity and guardian abilities informed this phase. The selected encounters belong to the original dungeon; Cataclysm replacements and seasonal systems are outside this design.

The adaptation is a four-stage survival route gated by a Ragefire clear and character level 15, with 390 seconds of survival plus fights. Original warning geometry, recovery rules, sixteen item definitions and a Journal objective connect it to existing progression. Arugal's bounded teleport resolves after its warning and pauses with the combat clock; melee builds have time to reconnect. Worg/worgen hides reuse Skinning gates and practice, while destination-specific guild evidence remains unchanged. Save version 1 and existing IDs remain compatible. Sources, omitted encounters and implementation boundaries are in [release 0.14](RELEASE-0.14.md); original art prompts and measured crop geometry are in [art notes](ART.md).

## Faction campaign study — 4 October 2026

Blizzard's [original manual, Adventuring chapter](https://assets.blz-contentstack.com/v3/assets/blt3452e3b114fab0cd/blt2e9295db02a222fc/6025bcbb6968b53d529edb2a/media_manual_classic_enUS.pdf) connects accepted objectives, explicit turn-ins, subsequent quests and dungeon adventures. It allows abandoning unfinished quests and returning to accept them again. Blizzard's [Classic reputation update](https://news.blizzard.com/en-us/article/23302789/wow-classic-class-quests-and-new-reputation-rewards) identifies Argent Dawn, Timbermaw Hold and Thorium Brotherhood as sources of equipment and profession-pattern rewards. These structures informed the next phase.

The adaptation adds twelve original chapters across three independent shared-roster campaigns. Outdoor patrols and landmarks lead into the existing Deadmines, Ragefire and Shadowfang routes. The envoys, route stories, compact gates and six equipment rewards are original game content. Accepted snapshots and matching attempt identities prevent older runs from completing newly accepted work. Final claims award rare cloaks; completed campaigns and Exalted standing open level-20 quartermaster trinkets. Permanent chapter records survive reload without creating rewards during migration. See [release 0.15](RELEASE-0.15.md) for the design recorded before implementation and its verification limits.

## Quality gates

- Build and strict type checking pass.
- All classes produce damage and have functional active abilities.
- Pausing freezes simulation and resource timers.
- Upgrades cannot exceed rank or loadout limits.
- Talent prerequisites, armor rules, profession limits and recipe costs are enforced in pure functions.
- Win/death rewards cannot be duplicated; reload retains progression.
- Browser flow covers keyboard movement, upgrades, talents, crafting, equipment, quests, settings and narrow viewports.
