import { test, expect } from "@playwright/test";
import { CLASSES } from "../../src/content";

test("voluntary returns have an accurate Journal outcome", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Begin Expedition", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await page.locator('[data-action="abandon"]').click();
  await page.locator('[data-action="camp"]').click();
  await page.getByRole("button", { name: "Journal", exact: true }).click();
  await expect(page.locator(".history-row")).toContainText(
    "Ended without victory",
  );
  await expect(page.locator(".history-row")).not.toContainText("Fallen");
});

test("wrapped navigation stays above the reader at every layout breakpoint", async ({
  page,
}) => {
  await page.goto("/#armory");
  for (const width of [
    320, 390, 600, 601, 760, 800, 1024, 1150, 1200, 1201, 1440,
  ]) {
    await page.setViewportSize({ width, height: 900 });
    const bounds = await page.evaluate(() => ({
      reader: document.querySelector(".main-content")!.getBoundingClientRect()
        .top,
      navigation: Math.max(
        ...[
          ...document.querySelectorAll(
            ".site-header button, .site-header .brand",
          ),
        ].map((el) => el.getBoundingClientRect().bottom),
      ),
    }));
    expect(
      bounds.navigation,
      `${width}px navigation stays inside its header`,
    ).toBeLessThanOrEqual(bounds.reader + 1);
  }
});

test("phone trainer copy and talent path actions remain readable for every class", async ({
  page,
}) => {
  await page.goto("/#spellbook");
  for (const width of [320, 390, 760]) {
    await page.setViewportSize({ width, height: 844 });
    for (const hero of CLASSES) {
      await page.locator("#hero-switch").selectOption(hero.id);
      const copy = await page.locator(".spellbook-mentor > div").boundingBox();
      expect(copy!.width, `${width}: ${hero.id}`).toBeGreaterThanOrEqual(190);
      expect(
        await page
          .locator(".spellbook-mentor")
          .evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
    }
    await page.getByRole("button", { name: "Talents", exact: true }).click();
    const button = await page
      .locator('[data-action="review-talent-mode"]')
      .boundingBox();
    expect(button!.width).toBeGreaterThan(170);
    expect(button!.height).toBeLessThan(80);
    await page.getByRole("button", { name: "Spellbook", exact: true }).click();
  }
});

test("dialog updates restore their original opener and tab includes all visible controls", async ({
  page,
}) => {
  await page.goto("/");
  const prepare = page.getByRole("button", {
    name: "Difficulty & build",
    exact: true,
  });
  await prepare.click();
  await page.getByRole("button", { name: "Explorer", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(prepare).toBeFocused();
  const settings = page.getByRole("button", { name: "Settings", exact: true });
  await settings.click();
  // File inputs and the hidden paging controls are not focus destinations.
  const last = page.getByRole("button", {
    name: "Controls & field guide",
    exact: true,
  });
  await last.focus();
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => ({
    inDialog: !!document.activeElement?.closest('[role="dialog"]'),
    visible: !!(document.activeElement as HTMLElement)?.getClientRects().length,
  }));
  expect(focused).toEqual({ inDialog: true, visible: true });
  await last.click();
  await expect(page.getByRole("dialog")).toContainText("Battle Art");
  await page.keyboard.press("Escape");
  await expect(settings).toBeFocused();
});

test("camp retains class identity, passive details and sixteen working equipment shortcuts", async ({
  page,
}) => {
  await page.goto("/");
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator(".camp-loadout .passive-note")).toContainText(
      "Arcane Intellect",
    );
    await expect(page.locator(".equipment-socket")).toHaveCount(16);
    await page.locator('.equipment-socket[data-id="finger2"]').click();
    await expect(page.locator(".main-content")).toHaveAttribute(
      "data-page",
      "armory",
    );
    await expect(page.locator("#bag-slot")).toHaveValue("finger2");
    await page.getByRole("button", { name: "Expedition", exact: true }).click();
  }
});
