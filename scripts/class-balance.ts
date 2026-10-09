import { CLASSES, ZONES } from "../src/content";
import { freshSave, heroStats } from "../src/progression";
import { GameEngine, distanceSq } from "../src/engine";
import { telegraphContains } from "../src/expedition";
import { DIFFICULTIES } from "../src/adventure";
import type { Difficulty } from "../src/adventure";
import { mkdirSync, writeFileSync } from "node:fs";

// Deterministic novice-build diagnostics; these are not human win-rate estimates.
const results: object[] = [];
for (const difficulty of Object.keys(DIFFICULTIES) as Difficulty[]) {
  for (const c of CLASSES)
    for (const seed of [42, 123, 2026]) {
      let potions = 3,
        bombs = 1,
        firstLevel = 0;
      const g = new GameEngine({
        classCombat: true,
        classId: c.id,
        zone: ZONES[0],
        stats: heroStats(freshSave(), c.id),
        professions: {},
        seed,
        adventure: { difficulty, oath: "balanced", relic: "" },
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
      for (let frame = 0; frame < 480 * 60 && !g.ended; frame++) {
        if (g.choosing) {
          if (!firstLevel) firstLevel = g.time;
          const choice =
            g.upgrades.find((u) => u.type === "spell" && u.rank === 1) ||
            g.upgrades.find((u) => u.type === "spell") ||
            g.upgrades.find((u) => u.id === "reserve") ||
            g.upgrades.find((u) => u.id === "blood") ||
            g.upgrades.find((u) => u.stat === "power") ||
            g.upgrades[0];
          g.chooseUpgrade(choice.id);
        }
        if (frame % 12 === 0) {
          const pickup = g.pickups
            .filter((p) => p.kind === "xp" || p.kind === "chest")
            .sort(
              (a, b) => distanceSq(a, g.player) - distanceSq(b, g.player),
            )[0];
          let x = pickup ? pickup.x - g.player.x : Math.cos(g.time * 0.17),
            y = pickup ? pickup.y - g.player.y : Math.sin(g.time * 0.17);
          const len = Math.hypot(x, y) || 1;
          x /= len;
          y /= len;
          let close = 0;
          for (const e of g.enemies) {
            const d = Math.sqrt(distanceSq(e, g.player));
            if (d < 100) {
              close++;
              const strength = ((100 - d) / 100) * 1.3;
              x += ((g.player.x - e.x) / (d || 1)) * strength;
              y += ((g.player.y - e.y) / (d || 1)) * strength;
            }
          }
          if (g.boss && !pickup && distanceSq(g.player, g.boss) > 150 ** 2) {
            x = g.boss.x - g.player.x;
            y = g.boss.y - g.player.y;
          }
          const danger = g.hazards.filter(
            (h) => h.warning > 0 || (h.linger && h.life > 0),
          );
          const threatened = danger.some((h) => telegraphContains(h, g.player));
          if (threatened) {
            let score = -Infinity;
            for (let i = 0; i < 16; i++) {
              const dx = Math.cos((i * Math.PI) / 8),
                dy = Math.sin((i * Math.PI) / 8);
              const unsafe = [90, 190].reduce(
                (n, d) =>
                  n +
                  danger.filter((h) =>
                    telegraphContains(h, {
                      x: g.player.x + dx * d,
                      y: g.player.y + dy * d,
                    }),
                  ).length,
                0,
              );
              const candidate = -unsafe * 10 + dx * x + dy * y;
              if (candidate > score) {
                score = candidate;
                g.setInput(dx, dy);
              }
            }
          } else g.setInput(x, y);
          const kit = g.player.kit;
          const nearest = g.enemies
            .filter((e) => !e.dead)
            .sort(
              (a, b) => distanceSq(a, g.player) - distanceSq(b, g.player),
            )[0];
          const range = nearest
            ? Math.sqrt(distanceSq(nearest, g.player))
            : Infinity;
          // Each pilot responds to its class loop instead of spamming a universal nova.
          if (
            ["mage", "hunter"].includes(c.id) &&
            range > 220 &&
            !threatened &&
            !pickup
          )
            g.setInput(0, 0);
          if (c.id === "warrior" && close > 0 && g.player.resource >= 25)
            g.activate();
          if (c.id === "mage" && range < 230) g.activate();
          if (c.id === "rogue" && kit.points >= 3 && range < 150) g.activate();
          if (c.id === "hunter" && range < 250) g.activate();
          if (c.id === "paladin" && kit.points >= 2 && range < 180)
            g.activate();
          if (
            c.id === "priest" &&
            (kit.points >= 4 || g.player.hp < g.player.maxHp * 0.6)
          )
            g.activate();
          if (c.id === "shaman" && range < 250) g.activate();
          if (
            c.id === "warlock" &&
            (kit.points > 0 ||
              (g.player.hp > g.player.maxHp * 0.65 && g.player.resource < 60))
          )
            g.activate();
          if (c.id === "druid") {
            const form = close >= 3 ? "bear" : range < 150 ? "cat" : "moonkin";
            if (kit.form !== form) g.activate();
          }
          if (
            (c.id === "warrior" || c.id === "rogue") &&
            range < 220 &&
            range > 90 &&
            !threatened
          ) {
            g.setInput(nearest.x - g.player.x, nearest.y - g.player.y);
            g.dash();
          }
          if (c.id === "rogue" && range < 90 && !threatened) g.dash();
          if (close >= 7) g.useBomb();
          if (g.player.hp < g.player.maxHp - 44) g.usePotion();
          if (threatened) g.dash();
        }
        g.update(1 / 60);
      }
      const r = g.result();
      results.push({
        class: c.id,
        seed,
        difficulty,
        victory: g.victory,
        ended: g.ended,
        time: Math.round(g.time),
        level: g.level,
        kills: g.kills,
        firstLevel: +firstLevel.toFixed(1),
        peakStreak: g.peakStreak,
        keystones: g.keystones,
        contracts: r.adventure?.contracts,
        gold: r.gold,
        xp: r.xp,
      });
    }
}
mkdirSync("output", { recursive: true });
writeFileSync("output/class-balance.json", JSON.stringify(results, null, 2));
for (const difficulty of Object.keys(DIFFICULTIES)) {
  const sample = results.filter(
    (r: any) => r.difficulty === difficulty,
  ) as any[];
  console.log(
    JSON.stringify({
      difficulty,
      runs: sample.length,
      wins: sample.filter((r) => r.victory).length,
      timeouts: sample.filter((r) => !r.ended).length,
      firstLevelRange: [
        Math.min(...sample.map((r) => r.firstLevel)),
        Math.max(...sample.map((r) => r.firstLevel)),
      ],
      averageLevel: +(
        sample.reduce((n, r) => n + r.level, 0) / sample.length
      ).toFixed(1),
    }),
  );
}
