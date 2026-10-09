# Release 1.0 — the northern road

This release completes the finite survivor-game expansion in [COMPLETION.md](COMPLETION.md). Older version-1 saves retain their selected hero, compact talent builds, loadouts, training, items, professions, campaigns and settings. The local save key and schema version remain unchanged; missing new fields receive safe defaults.

## Builds and class techniques

The optional Classic path adds 432 nodes across all 27 trees. Names, rank caps, row/column facts and explicit prerequisite links follow the Vanilla structure. One point becomes available at character level 10, reaching 51 at level 60. Earlier-row investment and required talent ranks both gate learning. Imported builds are reconstructed in order and cannot exceed the budget. The existing 162-node Survivor path retains its 21-point budget and effects.

Switching paths uses a free review that refunds the current ranks. Combat bonuses are original survivor adaptations, displayed on each node; these do not reproduce Vanilla spell effects. Invested signature talents teach the matching optional technique for free when its character-level requirement is met. Permanently learned techniques remain learned through reset or path changes.

Twenty-seven further techniques bring the catalog to 81 abilities: 36 core and 45 optional, five per class. Trainer levels 20/30/40 add 240/360/480 G purchases after the existing level-5/12 techniques. Four abilities remain prepared, with starters and class companions locked. Timed support buffs grant damage, haste, critical chance, armor, shields or resources; their rank-scaled bonuses expire without removing unrelated run upgrades. Combat choices and pause hold their timers. Healing, damage and crowd-control techniques retain bounded ranks and compatible upgrade bonuses.

## Equipment and combat properties

The catalog now contains 384 definitions and 151 recipes. Repeated expedition rewards create independent item IDs after the first canonical copy. Copy crafting is explicit and pays the full recipe cost; the existing duplicate-refund craft option stays available. Each independent copy has a deterministic bounded stat, primary-attribute and resistance roll. Repairs, condition, soulbinding, enchantments, attunements, equip protection and sale/disenchant cleanup use the full copy ID. Two copies of one ring can fill both finger positions. The satchel is bounded at 1,000 owned items; full-bag expedition gear converts to half its vendor value.

Five primary attributes contribute through valid, intact equipped items:

| Attribute | Combat contribution per point               |
| --------- | ------------------------------------------- |
| Strength  | +0.5% damage                                |
| Agility   | +0.2% critical chance, +0.1% movement speed |
| Stamina   | +3 maximum health                           |
| Intellect | +0.5% damage                                |
| Spirit    | +0.04 health regeneration per second        |

Fire, frost, nature, shadow and arcane resistance reduce matching incoming damage by 1% per point, capped at 60%. Existing armor reduction also applies. Physical damage receives no magical-resistance reduction. New hostile projectiles and northern boss hazards declare their school. Existing gear remains unchanged unless an independent copy carries a roll; base attributes are authored on the new northern items. Secondary weapon properties use the same half-contribution as their other equipment bonuses.

## Destinations and conclusions

Scarlet Monastery opens after a Duskwood clear at selected-character level 25. Four connected rooms face Arcanist Doan, Herod, Scarlet Commander Mograine and High Inquisitor Whitemane. Library wards, arcane detonation, spinning blades, charges and spreading circles have visible warnings. Whitemane's half-health resurrection restores a commander; she cannot fall until that guard is defeated, including when a large hit would skip the threshold. Each room awards an eligible cathedral relic and offers the established recovery choices.

Eastern Plaguelands opens after a cathedral clear at level 40. Six original frontier landmarks, shadow lanes and lingering nature clouds lead to the Blight Herald. Twenty-four Dawnward armor pieces form four six-piece sets, with cumulative bonuses at two, four and six pieces. Eligible armor appears in caches and elite chests; the final guardian guarantees a head piece matching the defeating hero's armor class. Twenty-four Artisan recipes at skill 250 use eight grade-four primary materials, three Dream Dust and 120 G. The Armory's northern guide lists exact guardian, workshop and conclusion sources.

The Journal adds fifteen once-only conclusions: three faction epilogues after their four-chapter campaigns, and twelve guild promises after their four-project mastery chains. Guild conclusions require Artisan training and actual skill 225 or above. Accept before departure, win the named destination with the current acceptance token, and deliver six exact grade-four materials for a guild conclusion. Partial returns and stale tokens cannot provide victory credit. Reviews show rewards and costs; cancellation is inert and repeated settlement/claims pay nothing. Faction conclusions award three original epic relics. Both northern clears and all fifteen claimed promises reveal the completed journey; builds and expeditions remain playable.

## Presentation and local co-op

The new transparent [back-facing hero atlas](../public/art/hero-backs.png) provides distinct rear views for all nine classes. Movement direction selects front/back art, including seated mount riders, while existing gait, combat and death frame machinery stays bounded. Reduced-motion mode keeps static directional views. [ART.md](ART.md) records the built-in image generation mode, complete prompt and crop verification. Original synthesized cathedral and blight scores bring the music catalog to twelve themes.

Camp can pair the primary hero with another roster class. Both must meet the destination's character-level requirement. P1 uses WASD/Space; P2 uses arrows/Enter. Both have independent movement, health, resources, gear, prepared automatic abilities and class actives. P2 starts with a starter attack and any locked companion; their other prepared abilities enter at shared run levels 3/6/9 and gain ranks with shared progression. P1 chooses upgrade bonuses for their own build. A common camera and separation limit keep both visible: at most 480 units, shrinking with the viewport (280 units at 390px). A fallen ally anchors the party within revival reach. Stand within 90 units of a fallen ally for three uninterrupted seconds to revive them at 35% health; incidental healing cannot revive a fallen hero, and both falling ends the expedition. Dungeon recovery returns both to the room entrance.

Encounters target a living nearby actor; enemy projectiles and hazards can damage either player. Co-op adds an ordinary enemy per spawn interval. Either living player can collect treasure and experience; healing pickups restore the collector. P1 manages supplies, travel and gathering, while either hero can hold a ritual. Both receive character XP and personal weapon practice; gold, materials, loot and roster objectives settle once. A shared item wears at most once per return, using the greater actor wear amount. Existing controller/touch inputs manage P1; P2 needs the keyboard. This implements local play on one save; online transport, trading and a second gamepad are outside this mode.

## Verification and repository size

[VALIDATION.md](VALIDATION.md) records unit, browser, production-build and prepared combat results. New coverage exercises legal Classic builds for every class, imports and dependencies, permanent signature learning, independent copies and costs, actual attribute/resistance damage, support expiry/pause, guardian resurrection, all twelve real guild victories, stale/once-only conclusions, independent party movement/combat/revival and settlement, and native directional Canvas frames.

Only runtime artwork and font licenses are bundled. Generated captures, downloaded research and diagnostic reports stay in ignored `output/`; the ten required small balance fixtures remain tracked. `npm run check:repo` rejects unreferenced runtime media or tracked generated output. Development and preview keep the existing first-free-port behavior.
