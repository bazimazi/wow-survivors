import { test, expect } from "@playwright/test";

test("painted evolved summons have distinct movement and casting poses with real transparency", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createAnimationFrame } = await import("/src/animation-canvas.ts");
    const { combatFrame } = await import("/src/combat-animation.ts");
    const results = [];
    for (const [file, rig] of [
      ["infernal", "heavy"],
      ["fire-elemental", "hover"],
      ["wrath-wolf", "quadruped"],
    ]) {
      const image = new Image();
      image.src = `/art/${file}.webp`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const c = canvas.getContext("2d")!;
      c.drawImage(image, 0, 0);
      const alpha = c.getImageData(0, 0, canvas.width, canvas.height).data;
      let transparent = 0,
        opaque = 0;
      for (let i = 3; i < alpha.length; i += 4) {
        if (alpha[i] === 0) transparent++;
        if (alpha[i] === 255) opaque++;
      }
      const crop = {
        x: 0,
        y: 0,
        width: image.naturalWidth,
        height: image.naturalHeight,
      };
      const frames = (poses: number[]) =>
        new Set(
          poses.map((frame) =>
            createAnimationFrame(image, crop, rig, frame).toDataURL(),
          ),
        ).size;
      results.push({
        transparent: transparent > 0,
        opaque: opaque > 0,
        movement: frames([0, 2, 4, 6]),
        casting: frames(
          [0, 1, 2, 3, 4, 5].map((i) =>
            combatFrame(file === "wrath-wolf" ? "bite" : "cast", i),
          ),
        ),
      });
    }
    return results;
  });
  expect(result).toEqual(
    Array.from({ length: 3 }, () => ({
      transparent: true,
      opaque: true,
      movement: 4,
      casting: 6,
    })),
  );
});

test("all spell evolutions visibly change at equal radii and remain distinct without particles or motion", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { SPELLS } = await import("/src/content.ts");
    const {
      drawSpellArea,
      drawSpellProjectile,
      drawSpellEffect,
      drawSpellOrbit,
    } = await import("/src/spell-visuals.ts");
    const { drawEvolvedPet } = await import("/src/evolution-visuals.ts");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 420;
    const c = canvas.getContext("2d")!;
    const capture = (draw: () => void) => {
      c.reset();
      c.translate(210, 210);
      c.globalAlpha = 0.8;
      c.lineWidth = 1.25;
      draw();
      if (
        c.getTransform().e !== 210 ||
        c.getTransform().f !== 210 ||
        c.globalAlpha !== 0.8 ||
        c.lineWidth !== 1.25
      )
        throw new Error("Evolution leaked Canvas state");
      return canvas.toDataURL();
    };
    let changed = 0,
      animated = 0,
      frozen = 0;
    const missing: string[] = [];
    for (const def of Object.values(SPELLS)) {
      for (const particles of [true, false]) {
        const draw = (rank: number, time: number, motion: boolean) =>
          capture(() => {
            const base = {
              x: 0,
              y: 0,
              spellId: def.id,
              spellRank: rank,
              color: def.color,
              radius: 100,
              life: 2,
              maxLife: 3,
            };
            if (def.kind === "ground")
              drawSpellArea(c, base, time, motion, particles);
            else if (def.kind === "projectile")
              drawSpellProjectile(
                c,
                { ...base, radius: 5, vx: 420, vy: 0 },
                time,
                motion,
                particles,
              );
            else if (def.kind === "orbit")
              drawSpellOrbit(
                c,
                def.id,
                { x: 70, y: 0 },
                { x: 0, y: 0 },
                time,
                motion,
                particles,
                rank,
              );
            else if (def.kind === "pet") {
              if (rank === 5)
                drawEvolvedPet(
                  c,
                  { x: 0, y: 0, spellId: def.id, timer: 0 },
                  { x: 100, y: 0 },
                  time,
                  motion,
                  particles,
                );
              else
                drawSpellEffect(
                  c,
                  { ...base, kind: "ring", life: 0.3, maxLife: 0.55 },
                  motion,
                  particles,
                );
            } else
              drawSpellEffect(
                c,
                {
                  ...base,
                  kind: def.kind === "chain" ? "line" : "ring",
                  end: { x: 90, y: 35 },
                  life: motion ? 0.55 - time * 0.08 : 0.3,
                  maxLife: 0.55,
                },
                motion,
                particles,
              );
          });
        if (draw(4, 1.1, false) !== draw(5, 1.1, false)) changed++;
        else missing.push(def.id);
        if (draw(5, 1.1, false) === draw(5, 1.3, false)) frozen++;
        if (def.kind === "ground" || def.kind === "pet") {
          if (draw(5, 1.1, true) !== draw(5, 1.3, true)) animated++;
          else missing.push(`${def.id} motion`);
        }
      }
    }
    return {
      changed,
      frozen,
      animated,
      total: Object.keys(SPELLS).length * 2,
      motionTotal:
        Object.values(SPELLS).filter(
          (s) => s.kind === "ground" || s.kind === "pet",
        ).length * 2,
      missing,
    };
  });
  expect(result.missing).toEqual([]);
  expect(result.changed).toBe(result.total);
  expect(result.frozen).toBe(result.total);
  expect(result.animated).toBe(result.motionTotal);
});

test("actual rank-five upgrades replace all summon models in the renderer, including a co-op summon", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { GameEngine } = await import("/src/engine.ts");
    const { GameRenderer } = await import("/src/renderer.ts");
    const { SPELLS, ZONES } = await import("/src/content.ts");
    const { heroStats, freshSave } = await import("/src/progression.ts");
    const results = [];
    for (const [classId, id] of [
      ["warlock", "imp"],
      ["shaman", "totem"],
      ["hunter", "beast"],
    ]) {
      const g = new GameEngine({
        classId,
        zone: ZONES[0],
        stats: heroStats(freshSave(), classId),
        professions: {},
        seed: 123,
      });
      g.spells = [{ id, rank: 4, timer: 99, orbitTimer: 0 }];
      g.pets = [{ spellId: id, x: -100, y: 0, timer: 99 }];
      g.enemies = [];
      g.paused = true;
      const canvas = document.createElement("canvas");
      canvas.style.cssText = "width:800px;height:600px";
      document.body.append(canvas);
      const r = new GameRenderer(canvas, g);
      await r.ready();
      r.animation = false;
      r.particles = false;
      r.shake = false;
      r.render(0);
      const before = canvas.toDataURL();
      g.choosing = true;
      g.upgrades = [
        {
          id,
          type: "spell",
          name: SPELLS[id].evolution,
          description: "",
          icon: SPELLS[id].icon,
          color: SPELLS[id].color,
          rank: 5,
          evolution: true,
        },
      ];
      const accepted = g.chooseUpgrade(id);
      g.effects = [];
      const state = JSON.stringify([
        g.time,
        g.player,
        g.pets,
        g.spells,
        g.rng.state,
      ]);
      r.render(0);
      const after = canvas.toDataURL();
      r.render(0);
      results.push({
        accepted,
        changed: before !== after,
        stable: after === canvas.toDataURL(),
        readOnly:
          state ===
          JSON.stringify([g.time, g.player, g.pets, g.spells, g.rng.state]),
      });
    }
    const g = new GameEngine({
      classId: "mage",
      zone: ZONES[0],
      stats: heroStats(freshSave()),
      professions: {},
      seed: 123,
      partner: {
        classId: "warlock",
        stats: heroStats(freshSave(), "warlock"),
        characterLevel: 20,
      },
    });
    g.enemies = [];
    g.partner!.pet!.x = -100;
    const state = g.partner!.spells.find((s) => s.id === "imp")!;
    state.rank = 4;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "width:800px;height:600px";
    document.body.append(canvas);
    const r = new GameRenderer(canvas, g);
    await r.ready();
    r.animation = false;
    r.particles = false;
    r.shake = false;
    r.render(0);
    const before = canvas.toDataURL();
    state.rank = 5;
    r.render(0);
    return { results, partnerChanged: before !== canvas.toDataURL() };
  });
  expect(result.results).toEqual(
    Array.from({ length: 3 }, () => ({
      accepted: true,
      changed: true,
      stable: true,
      readOnly: true,
    })),
  );
  expect(result.partnerChanged).toBe(true);
});
