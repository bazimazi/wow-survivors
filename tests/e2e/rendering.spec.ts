import { test, expect } from "@playwright/test";

test("original sprite atlases load and a dense scene renders with bounded entities", async ({
  page,
}) => {
  await page.goto("/");
  const metrics = await page.evaluate(async () => {
    const { GameEngine } = await import("/src/engine.ts");
    const { GameRenderer } = await import("/src/renderer.ts");
    const { ZONES } = await import("/src/content.ts");
    const { freshSave, heroStats } = await import("/src/progression.ts");
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "width:1280px;height:720px;position:fixed;inset:0;";
    document.body.append(canvas);
    const g = new GameEngine({
      classId: "mage",
      zone: ZONES[0],
      stats: { ...heroStats(freshSave()), health: 10000 },
      professions: {},
      seed: 123,
    });
    const template = g.enemies[0],
      types = [
        "wolf",
        "kobold",
        "gnoll",
        "skeleton",
        "ghoul",
        "wraith",
        "defias",
        "golem",
      ];
    g.enemies = Array.from({ length: 400 }, (_, i) => ({
      ...template,
      id: i,
      type: types[i % 8],
      x: Math.cos(i * 2.4) * (140 + (i % 480)),
      y: Math.sin(i * 2.4) * (140 + (i % 280)),
      hp: 1000,
      maxHp: 1000,
    }));
    const r = new GameRenderer(canvas, g),
      artLoaded = await r.ready();
    const costs: number[] = [];
    for (let i = 0; i < 60; i++) {
      await new Promise(requestAnimationFrame);
      const start = performance.now();
      g.update(1 / 60);
      r.render();
      costs.push(performance.now() - start);
    }
    costs.sort((a, b) => a - b);
    return {
      artLoaded,
      enemies: g.enemies.length,
      averageMs: Number(
        (costs.reduce((a, b) => a + b) / costs.length).toFixed(2),
      ),
      p95Ms: Number(costs[Math.floor(costs.length * 0.95)].toFixed(2)),
    };
  });
  expect(metrics.artLoaded).toBe(true);
  expect(metrics.enemies).toBeLessThanOrEqual(400);
  expect(metrics.averageMs).toBeLessThan(100);
  console.log("Dense scene CPU measurements:", JSON.stringify(metrics));
  await page.screenshot({ path: "output/screenshots/dense-battlefield.png" });
});
