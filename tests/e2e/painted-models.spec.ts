import { test, expect } from "@playwright/test";

test("fallback gameplay retains the original painted heroes, forms and companions", async ({
  page,
}) => {
  await page.route(/\/art\/[a-z]+-motion\.webp$/, (route) => route.abort());
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { GameEngine } = await import("/src/engine.ts");
    const { GameRenderer } = await import("/src/renderer.ts");
    const { CLASSES, ZONES } = await import("/src/content.ts");
    const { heroStats, freshSave } = await import("/src/progression.ts");
    const heroes = [],
      forms = [],
      pets = [];
    for (const hero of CLASSES) {
      const g = new GameEngine({
        classId: hero.id,
        zone: ZONES[0],
        stats: heroStats(freshSave(), hero.id),
        professions: {},
        seed: 123,
      });
      const canvas = document.createElement("canvas");
      canvas.style.cssText = "width:320px;height:240px";
      document.body.append(canvas);
      const r = new GameRenderer(canvas, g);
      await r.ready();
      r.animation = false;
      g.config.classCombat = false;
      const sources: string[] = [];
      const original = r.drawCrop.bind(r);
      r.drawCrop = (image: HTMLImageElement, ...args: any[]) => {
        sources.push(new URL(image.src).pathname);
        return original(image, ...args);
      };
      g.player.facing = Math.PI / 2;
      r.player();
      const front = sources.at(-1);
      g.player.facing = -Math.PI / 2;
      r.player();
      heroes.push({ id: hero.id, front, back: sources.at(-1) });
      if (hero.id === "druid") {
        g.config.classCombat = true;
        for (const form of ["cat", "bear", "moonkin"]) {
          g.player.kit.form = form;
          r.player();
          forms.push({ form, source: sources.at(-1) });
        }
      }
      if (hero.id === "warlock") {
        for (const [id, file] of [
          ["imp", "infernal"],
          ["totem", "fire-elemental"],
          ["beast", "wrath-wolf"],
        ]) {
          const pet = { spellId: id, x: 0, y: 0, timer: 0 };
          r.pet(pet, g.player, 1);
          const base = sources.at(-1);
          r.pet(pet, g.player, 5);
          pets.push({ base, evolved: sources.at(-1), file });
        }
      }
      canvas.remove();
    }
    return { heroes, forms, pets };
  });
  expect(result.heroes).toHaveLength(9);
  for (const hero of result.heroes)
    expect(hero, hero.id).toMatchObject({
      front: "/art/hero-sprites.png",
      back: "/art/hero-backs.png",
    });
  expect(result.forms).toEqual([
    { form: "cat", source: "/art/druid-forms.png" },
    { form: "bear", source: "/art/companions.png" },
    { form: "moonkin", source: "/art/druid-forms.png" },
  ]);
  for (const pet of result.pets)
    expect(pet).toMatchObject({
      base: "/art/companions.png",
      evolved: `/art/${pet.file}.webp`,
    });
});
