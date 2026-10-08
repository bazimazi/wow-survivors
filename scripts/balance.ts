import {
  equipmentSnapshot,
  itemCondition,
  weaponSkillCap,
} from "../src/item-progression";
import { CLASSES, GEAR_SETS, MATERIALS, ZONES } from "../src/content";
import { distanceSq, GameEngine } from "../src/engine";
import { telegraphContains } from "../src/expedition";
import {
  freshSave,
  heroStats,
  heroSpellBonuses,
  learnTalent,
  equip,
  trainDualWield,
  trainWeaponType,
  craft,
  learnProfession,
  forgetProfession,
  applyEnchantment,
  trainClassTechnique,
  prepareClassSpell,
  buyOffer,
  settleRun,
  attuneEquipment,
} from "../src/progression";
import { CAMPAIGN_FACTIONS, campaignCloakId } from "../src/campaigns";
import type { FactionId } from "../src/factions";
import { CLASS_TECHNIQUES, lockedClassSpell } from "../src/spellbook";
import { dualWieldClass } from "../src/dual-wield";
import { rangedClass, RANGED_CLASSES } from "../src/ranged";
import {
  advancedWeaponType,
  WEAPON_TRAINING,
  trainedWeaponRanged,
  trainedWeaponOneHanded,
} from "../src/weapon-training";

// A simple, repeatable player policy: collect XP, keep personal space,
// use the class ability when surrounded, and spend the starter healing supplies.
// This measures progression pacing; it is not a substitute for human playtesting.
const dungeon = process.argv.includes("--dungeon");
const shadowfang = process.argv.includes("--shadowfang");
const entry = process.argv.includes("--entry");
const duskwood = process.argv.includes("--duskwood");
const cloudAware = process.argv.includes("--cloud-aware");
const entryLevel = duskwood ? 20 : shadowfang ? 15 : 10;
const spellbook = process.argv.includes("--spellbook");
const weaponTypeArg = process.argv
  .find((arg) => arg.startsWith("--weapon-type="))
  ?.slice(14);
if (weaponTypeArg !== undefined && !advancedWeaponType(weaponTypeArg))
  throw Error("Unknown weapon type profile");
const weaponType = advancedWeaponType(weaponTypeArg)
  ? weaponTypeArg
  : undefined;
const equipmentProgression = process.argv.includes("--equipment-progression");
const practiced = process.argv.includes("--practiced");
const attuned = process.argv.includes("--attuned");
const ranged =
  process.argv.includes("--ranged") || !!weaponType || equipmentProgression;
const dualWield = process.argv.includes("--dual-wield") || ranged;
const offhands = process.argv.includes("--offhands") || dualWield;
const necklaces = process.argv.includes("--necklaces") || offhands;
const wristEnchant = process.argv.includes("--wrist-enchant");
const accessories =
  process.argv.includes("--accessories") || necklaces || wristEnchant;
const wardrobe = process.argv.includes("--wardrobe") || accessories;
const campaign = process.argv
  .find((arg) => arg.startsWith("--campaign="))
  ?.slice(11) as FactionId | undefined;
if (campaign && !CAMPAIGN_FACTIONS.includes(campaign))
  throw Error("Unknown campaign profile");
const advanced =
  process.argv.includes("--advanced") ||
  dungeon ||
  duskwood ||
  spellbook ||
  wardrobe ||
  !!campaign;
for (const c of CLASSES) {
  const classFilter = process.argv
    .find((arg) => arg.startsWith("--class="))
    ?.slice(8);
  if (classFilter && c.id !== classFilter) continue;
  const firstLevels: number[] = [];
  const outcomes: unknown[] = [];
  for (const [seedIndex, seed] of [42, 123, 2026].entries()) {
    const treeIndex = dungeon ? 0 : seedIndex;
    let potions = 3,
      bombs = 1;
    const save = freshSave();
    save.selectedClass = c.id;
    if (advanced) {
      save.heroes[c.id].level =
        (dungeon || duskwood) && entry ? entryLevel : 21;
      for (const n of c.trees[treeIndex].nodes)
        for (let i = 0; i < n.max; i++) learnTalent(save, n.id);
      // Spend the remaining seven points in a secondary path, as a player
      // preparing for Heroic content can do with the full 21-point budget.
      for (const n of c.trees[(treeIndex + 1) % 3].nodes.slice(0, 3))
        for (let i = 0; i < n.max; i++) learnTalent(save, n.id);
      const set = GEAR_SETS.find((s) => s.armor === c.armor)!;
      for (const slot of ["hands", "head", "chest"]) {
        const id = `${set.id}_${slot}`;
        save.inventory.push(id);
        equip(save, id);
      }
      const weapon =
        c.id === "hunter"
          ? "longbow"
          : ["warrior", "rogue", "paladin"].includes(c.id)
            ? "defias_blade"
            : "ember_staff";
      for (const id of [weapon, "shadow_boots", "lionheart"]) {
        save.inventory.push(id);
        equip(save, id);
      }
    }
    if (wardrobe) {
      const set = GEAR_SETS.find((s) => s.armor === c.armor)!;
      save.gold = 10000;
      for (const id of Object.keys(MATERIALS) as (keyof typeof MATERIALS)[])
        save.materials[id] = 1000;
      learnProfession(save, set.profession);
      save.professions[set.profession] = 175;
      save.training[set.profession] = 3;
      const heroLevel = save.heroes[c.id].level;
      for (const slot of heroLevel >= 15
        ? ["shoulders", "waist", "legs"]
        : ["shoulders"]) {
        const id = `${set.id}_${slot}`;
        if (!craft(save, `craft_${id}`) || !equip(save, id)) throw Error(id);
      }
      learnProfession(save, "tailoring");
      save.professions.tailoring =
        heroLevel >= 18
          ? 225
          : Math.max(
              save.professions.tailoring || 0,
              heroLevel >= 12 ? 150 : 75,
            );
      save.training.tailoring =
        heroLevel >= 18
          ? 4
          : (Math.max(save.training.tailoring || 1, heroLevel >= 12 ? 3 : 2) as
              2 | 3);
      const cape =
        heroLevel >= 18
          ? "runebound_drape"
          : heroLevel >= 12
            ? "silken_windcloak"
            : "woolen_wayfarer_cape";
      if (!craft(save, `craft_${cape}`) || !equip(save, cape))
        throw Error(cape);
      if (heroLevel < 15)
        for (const id of ["duskbinder_belt", "mourningweave_leggings"]) {
          // Entry profiles represent a prepared hero owning eligible level-10 world loot.
          save.inventory.push(id);
          if (!equip(save, id)) throw Error(id);
        }
      if (Object.keys(save.heroes[c.id].equipment).length !== 10)
        throw Error("Incomplete loadout");
    }
    if (accessories) {
      const set = GEAR_SETS.find((s) => s.armor === c.armor)!;
      const heroLevel = save.heroes[c.id].level;
      save.professions[set.profession] = heroLevel >= 18 ? 225 : 125;
      save.training[set.profession] = heroLevel >= 18 ? 4 : 3;
      const wrists = `${heroLevel >= 18 ? "artisan" : "expert"}_${c.armor}_bracers`;
      if (!craft(save, `craft_${wrists}`) || !equip(save, wrists))
        throw Error(wrists);
      // Prepared source-specific ownership fixtures; this does not measure acquisition time.
      for (const id of heroLevel >= 15
        ? ["tirisfal_ring", "mooncurse_ring"]
        : ["foundry_signet", "corsair_band"]) {
        save.inventory.push(id);
        if (!equip(save, id)) throw Error(id);
      }
      if (Object.keys(save.heroes[c.id].equipment).length !== 13)
        throw Error("Incomplete accessory loadout");
    }
    if (necklaces) {
      const id =
        save.heroes[c.id].level >= 15 ? "moonlit_pendant" : "ironclad_pendant";
      // Prepared guardian ownership; equip still enforces level/class/slot rules.
      save.inventory.push(id);
      if (
        !equip(save, id) ||
        Object.keys(save.heroes[c.id].equipment).length !== 14
      )
        throw Error("Incomplete necklace loadout");
    }
    if (wristEnchant) {
      const set = GEAR_SETS.find((s) => s.armor === c.armor)!;
      // The cape remains owned after unlearning its trade, freeing a primary slot.
      if (
        set.profession !== "tailoring" &&
        !forgetProfession(save, "tailoring")
      )
        throw Error("Could not free a profession slot");
      if (!learnProfession(save, "enchanting"))
        throw Error("Could not learn Enchanting");
      const artisan = save.heroes[c.id].level >= 18;
      save.professions.enchanting = artisan ? 225 : 125;
      save.training.enchanting = artisan ? 4 : 3;
      if (
        !applyEnchantment(
          save,
          save.heroes[c.id].equipment.wrists!,
          artisan ? "wrists_recovery" : "wrists_focus",
        )
      )
        throw Error("Could not enchant bracers");
    }
    if (offhands && !["rogue", "hunter"].includes(c.id)) {
      const shield = ["warrior", "paladin", "shaman"].includes(c.id);
      const artisan = save.heroes[c.id].level >= 18;
      const weapon = `${artisan ? "duskwood" : "westfall"}_${shield ? "mace" : "spellblade"}`;
      const held = `${artisan ? "artisan" : "expert"}_${shield ? "shield" : "focus"}`;
      if (!shield && !save.professions.enchanting) {
        if (
          save.professions.tailoring &&
          c.armor !== "cloth" &&
          !forgetProfession(save, "tailoring")
        )
          throw Error("Could not free a profession slot");
        if (!learnProfession(save, "enchanting"))
          throw Error("Could not learn Enchanting");
      }
      const trade = shield ? "blacksmithing" : "enchanting";
      save.professions[trade] = artisan ? 225 : 125;
      save.training[trade] = artisan ? 4 : 3;
      // Prepared ownership from a named local discovery; acquisition time is not measured.
      save.inventory.push(weapon);
      if (
        !craft(save, `craft_${held}`) ||
        !equip(save, weapon) ||
        !equip(save, held) ||
        Object.keys(save.heroes[c.id].equipment).length !== 15
      )
        throw Error("Invalid off-hand loadout");
    }
    if (dualWield && dualWieldClass(c.id)) {
      const artisan = save.heroes[c.id].level >= 18;
      if (!save.professions.blacksmithing) {
        const finishedTrade = save.professions.tailoring
          ? "tailoring"
          : "leatherworking";
        if (
          !forgetProfession(save, finishedTrade) ||
          !learnProfession(save, "blacksmithing")
        )
          throw Error(
            "Could not prepare blade crafting within two primary professions",
          );
      }
      save.professions.blacksmithing = artisan ? 225 : 125;
      save.training.blacksmithing = artisan ? 4 : 3;
      const weapon = `${artisan ? "duskwood" : "westfall"}_duelist_blade`;
      const secondary = `${artisan ? "artisan" : "expert"}_duelist_blade`;
      // Named local ownership fixture; training, crafting and both placements are real transactions.
      save.inventory.push(weapon);
      if (
        !trainDualWield(save) ||
        !craft(save, `craft_${secondary}`) ||
        !equip(save, weapon) ||
        !equip(save, secondary, "offhand") ||
        Object.keys(save.heroes[c.id].equipment).length !== 15
      )
        throw Error("Invalid dual-wield loadout");
    }
    if (ranged && rangedClass(c.id)) {
      const wand = RANGED_CLASSES.wand.includes(c.id),
        profession = wand ? "enchanting" : "engineering";
      if (!save.professions[profession]) {
        const finishedTrade = Object.keys(save.professions).find(
          (p) => p !== profession,
        ) as keyof typeof save.professions;
        if (
          !forgetProfession(save, finishedTrade) ||
          !learnProfession(save, profession)
        )
          throw Error(
            "Could not prepare ranged crafting within two primary professions",
          );
      }
      const artisan = save.heroes[c.id].level >= 18,
        id = `${artisan ? "artisan" : "expert"}_${wand ? "wand" : "thrown"}`;
      save.professions[profession] = artisan ? 225 : 125;
      save.training[profession] = artisan ? 4 : 3;
      if (
        !craft(save, `craft_${id}`) ||
        !equip(save, id) ||
        Object.keys(save.heroes[c.id].equipment).length !== 16
      )
        throw Error("Invalid ranged loadout");
    }
    if (weaponType && WEAPON_TRAINING[weaponType].classes.includes(c.id)) {
      const profession = trainedWeaponRanged(weaponType)
        ? "engineering"
        : "blacksmithing";
      if (!save.professions[profession]) {
        const finishedTrade = Object.keys(save.professions).find(
          (p) => p !== profession,
        ) as keyof typeof save.professions;
        if (
          !forgetProfession(save, finishedTrade) ||
          !learnProfession(save, profession)
        )
          throw Error(
            "Could not prepare weapon crafting within two primary professions",
          );
      }
      const artisan = save.heroes[c.id].level >= 18,
        tier = artisan ? "artisan" : "expert";
      save.professions[profession] = artisan ? 225 : 125;
      save.training[profession] = artisan ? 4 : 3;
      const id = `${tier}_${weaponType}`;
      if (!trainWeaponType(save, weaponType) || !craft(save, `craft_${id}`))
        throw Error("Invalid weapon training or craft");
      if (trainedWeaponOneHanded(weaponType) && dualWieldClass(c.id)) {
        const primary = `${artisan ? "duskwood" : "westfall"}_${weaponType}`;
        save.inventory.push(primary);
        if (!equip(save, primary) || !equip(save, id, "offhand"))
          throw Error("Invalid trained weapon pair");
      } else if (!equip(save, id))
        throw Error("Invalid trained primary weapon");
    }
    if (spellbook) {
      const replace = c.spells
        .filter((id) => !lockedClassSpell(c.id, id, c.spells))
        .reverse();
      for (const t of CLASS_TECHNIQUES.filter((t) => t.classId === c.id))
        if (trainClassTechnique(save, t.spell.id))
          prepareClassSpell(save, replace.shift()!, t.spell.id);
    }
    if (campaign) {
      // Prepared completion/standing fixtures measure legal reward equipment in combat,
      // not the time required to earn the campaign or its reputation.
      save.campaigns[campaign].chapter = 4;
      save.reputation[campaign] = 2000;
      save.gold = 10000;
      const cloak = campaignCloakId(campaign);
      save.inventory.push(cloak);
      if (
        !equip(save, cloak) ||
        !buyOffer(save, `${campaign}_exalted`) ||
        !equip(save, `exalted_${campaign}_trinket`)
      )
        throw Error("Invalid campaign reward profile");
    }
    if (equipmentProgression) {
      save.ammunition = 9999;
      if (practiced)
        for (const type of Object.keys(save.heroes[c.id].weaponSkills))
          save.heroes[c.id].weaponSkills[
            type as keyof (typeof save.heroes)[typeof c.id]["weaponSkills"]
          ] = weaponSkillCap(save.heroes[c.id].level);
      if (attuned) {
        if (!save.professions.enchanting) {
          const trade = Object.keys(
            save.professions,
          )[0] as keyof typeof save.professions;
          forgetProfession(save, trade);
          learnProfession(save, "enchanting");
        }
        save.professions.enchanting = 225;
        save.training.enchanting = 4;
        const item =
          save.heroes[c.id].equipment.ranged ||
          save.heroes[c.id].equipment.weapon!;
        if (!attuneEquipment(save, item, "force"))
          throw Error("Invalid personal attunement");
      }
    }
    const stats = heroStats(save, c.id),
      zone = dungeon
        ? ZONES.find(
            (z) =>
              z.id ===
              (shadowfang
                ? "shadowfang"
                : process.argv.includes("--ragefire")
                  ? "ragefire"
                  : "deadmines"),
          )!
        : duskwood
          ? ZONES.find((z) => z.id === "duskwood")!
          : ZONES[advanced ? 2 : 0];
    const g = new GameEngine({
      classId: c.id,
      zone,
      stats,
      spellBonuses: heroSpellBonuses(save, c.id),
      ...(equipmentProgression
        ? {
            equipment: equipmentSnapshot(save),
            onAmmunition: () =>
              save.ammunition > 0 ? (--save.ammunition, true) : false,
          }
        : {}),
      ...(spellbook
        ? {
            characterLevel: save.heroes[c.id].level,
            spellbook: save.heroes[c.id].spellbook,
          }
        : {}),
      ...(wardrobe || shadowfang || duskwood
        ? { characterLevel: save.heroes[c.id].level }
        : {}),
      professions: { herbalism: 1, skinning: 1 },
      seed,
      onConsume: (type) => {
        if (type === "potions" && potions > 0) {
          potions--;
          return true;
        }
        if (type === "bombs" && bombs > 0) {
          bombs--;
          return true;
        }
        return false;
      },
    });
    let firstLevel = 0;
    for (
      let i = 0;
      i < (zone.duration + (dungeon ? 240 : 120)) * 60 && !g.ended;
      i++
    ) {
      if (g.checkpoint)
        g.continueDungeon(
          g.player.hp < g.player.maxHp * 0.7 ? "guard" : "edge",
        );
      if (g.choosing) {
        if (!firstLevel) firstLevel = g.time;
        const choice =
          g.upgrades.find((u) => u.type === "spell" && u.rank === 1) ||
          g.upgrades.find((u) => u.type === "spell") ||
          g.upgrades.find((u) => u.stat === "power") ||
          g.upgrades[0];
        g.chooseUpgrade(choice.id);
      }
      if (i % 12 === 0) {
        let nearest = null,
          best = Infinity;
        for (const p of g.pickups) {
          if (p.kind !== "xp" && p.kind !== "chest") continue;
          const d = distanceSq(g.player, p);
          if (d < best) {
            best = d;
            nearest = p;
          }
        }
        let mx = 0,
          my = 0,
          close = 0;
        if (nearest) {
          mx = nearest.x - g.player.x;
          my = nearest.y - g.player.y;
          const len = Math.hypot(mx, my) || 1;
          mx /= len;
          my /= len;
        } else {
          mx = Math.cos(g.time * 0.17);
          my = Math.sin(g.time * 0.17);
        }
        for (const e of g.enemies) {
          const d = Math.sqrt(distanceSq(e, g.player));
          if (d < 100) {
            close++;
            const strength = ((100 - d) / 100) * 1.3;
            mx += ((g.player.x - e.x) / (d || 1)) * strength;
            my += ((g.player.y - e.y) / (d || 1)) * strength;
          }
        }
        if (
          g.boss &&
          (dungeon ? !nearest || best > 400 ** 2 : g.pickups.length === 0)
        ) {
          const dx = g.boss.x - g.player.x,
            dy = g.boss.y - g.player.y,
            d = Math.hypot(dx, dy);
          if (d > 150) {
            mx = dx / d;
            my = dy / d;
          }
        }
        const warnings = g.hazards.filter(
          (h) => h.warning > 0 || (cloudAware && h.linger && h.life > 0),
        );
        const threatened = warnings.some(
          (h) =>
            telegraphContains(h, g.player) ||
            telegraphContains(h, {
              x: g.player.x + mx * 100,
              y: g.player.y + my * 100,
            }),
        );
        if (threatened) {
          let best = -Infinity;
          for (let i = 0; i < 16; i++) {
            const angle = (i * Math.PI * 2) / 16,
              x = Math.cos(angle),
              y = Math.sin(angle);
            const unsafe = [90, 190].reduce(
              (n, d) =>
                n +
                warnings.filter((h) =>
                  telegraphContains(h, {
                    x: g.player.x + x * d,
                    y: g.player.y + y * d,
                  }),
                ).length,
              0,
            );
            const bounds = g.movementBounds;
            const outside =
              Math.abs(g.player.x + x * 190) > bounds.x ||
              Math.abs(g.player.y + y * 190) > bounds.y;
            const score =
              -unsafe * 10 + x * mx + y * my - (dungeon && outside ? 20 : 0);
            if (score > best) {
              best = score;
              g.setInput(x, y);
            }
          }
        } else g.setInput(mx, my);
        if (close >= 2) g.activate();
        if (close >= 7) g.useBomb();
        if (g.player.hp < g.player.maxHp - 44) g.usePotion();
        if (threatened) g.dash();
      }
      if (equipmentProgression && i % 165 === 0) g.attackEquipment();
      g.update(1 / 60);
    }
    firstLevels.push(firstLevel);
    if (
      equipmentProgression &&
      g.ended &&
      !settleRun(save, g.result(), g.professionGains)
    )
      throw Error("Equipment settlement failed");
    outcomes.push({
      ...(equipmentProgression
        ? {
            practiced,
            attuned,
            ammunitionUsed: 9999 - save.ammunition,
            weaponHits: g.weaponHits,
            weaponSkills: save.heroes[c.id].weaponSkills,
            conditions: equipmentSnapshot(save).items.map((id) => ({
              id,
              condition: itemCondition(save, id),
            })),
          }
        : {}),
      ...(weaponType
        ? { weaponTraining: save.heroes[c.id].weaponTraining }
        : {}),
      ...(ranged ? { ranged: !!save.heroes[c.id].equipment.ranged } : {}),
      ...(dualWield ? { dualWield: save.heroes[c.id].dualWield } : {}),
      seed,
      ...(wardrobe
        ? { equipment: save.heroes[c.id].equipment, campStats: stats }
        : {}),
      ...(wristEnchant ? { enchantments: save.enchantments } : {}),
      ...(spellbook
        ? {
            healing: Math.round(g.totalHealing),
            prepared: g.preparedSpells,
            learned: g.spells.map((s) => s.id),
            damage: Math.round(g.totalDamage),
          }
        : {}),
      ...(advanced ? { specialization: c.trees[treeIndex].name } : {}),
      seconds: Math.floor(g.time),
      kills: g.kills,
      level: g.level,
      victory: g.victory,
      ...(dungeon
        ? {
            bosses: g.dungeonBosses,
            stage: g.dungeonStageIndex + 1,
            damage: Math.round(g.totalDamage),
          }
        : {}),
      hp: Math.ceil(g.player.hp),
      ...(!g.ended
        ? {
            timedOut: true,
            bossHp: Math.ceil(g.boss?.hp || 0),
            bossDistance: g.boss
              ? Math.round(Math.sqrt(distanceSq(g.boss, g.player)))
              : null,
            bossPresent: g.enemies.includes(g.boss!),
            bossPosition: g.boss
              ? {
                  x: Math.round(g.boss.x),
                  y: Math.round(g.boss.y),
                  dead: g.boss.dead,
                  speed: g.boss.speed,
                  frozenUntil: g.boss.frozenUntil,
                  stillUntil: g.bossState.stillUntil,
                }
              : null,
            player: { x: Math.round(g.player.x), y: Math.round(g.player.y) },
            nearestPickup: g.pickups.length
              ? Math.round(
                  Math.min(
                    ...g.pickups.map((p) => Math.sqrt(distanceSq(p, g.player))),
                  ),
                )
              : null,
            spells: g.spells.map((s) => s.id),
          }
        : {}),
    });
  }
  console.log(
    JSON.stringify({
      class: c.name,
      ...(spellbook ? { spellbook: "trainer techniques prepared" } : {}),
      ...(campaign ? { campaign } : {}),
      ...(weaponType ? { weaponType } : {}),
      ...(ranged ? { ranged: rangedClass(c.id) } : {}),
      ...(dualWield ? { dualWield: dualWieldClass(c.id) } : {}),
      profile: dungeon
        ? `level-${entry ? entryLevel : 21} / ${entry ? entryLevel : 21}-point hybrid / ${weaponType === "polearm" && WEAPON_TRAINING.polearm.classes.includes(c.id) ? (rangedClass(c.id) ? "fifteen" : "fourteen") : ranged && rangedClass(c.id) ? "sixteen" : (dualWield && dualWieldClass(c.id)) || (offhands && !["rogue", "hunter"].includes(c.id)) ? "fifteen" : necklaces ? "fourteen" : accessories ? "thirteen" : wardrobe ? "ten" : "six"} equipped slots / ${shadowfang ? "Shadowfang Keep" : process.argv.includes("--ragefire") ? "Ragefire Chasm" : "Deadmines"}`
        : advanced
          ? `level-21 / 21-point hybrid / ${weaponType === "polearm" && WEAPON_TRAINING.polearm.classes.includes(c.id) ? (rangedClass(c.id) ? "fifteen" : "fourteen") : ranged && rangedClass(c.id) ? "sixteen" : (dualWield && dualWieldClass(c.id)) || (offhands && !["rogue", "hunter"].includes(c.id)) ? "fifteen" : necklaces ? "fourteen" : accessories ? "thirteen" : wardrobe ? "ten" : campaign ? "seven" : "six"} equipped slots / Tirisfal`
          : "starter / Elwynn",
      firstLevelSeconds: firstLevels.map((n) => Math.round(n)),
      outcomes,
    }),
  );
}
