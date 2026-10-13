import { test, expect } from "@playwright/test";

test("home choice panels paginate instead of opening a scrolling browser menu at phone and desktop sizes", async ({
  page,
}) => {
  await page.goto("/");
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    const hero = page.locator("#coop-hero");
    const initial = await hero.inputValue();
    await hero.scrollIntoViewIfNeeded();
    await hero.click();
    const panel = page.locator(".game-picker");
    await expect(panel).toBeVisible();
    const box = (await panel.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(box.y + box.height).toBeLessThanOrEqual(844);
    await panel.getByRole("button", { name: "Next choices" }).click();
    await panel.getByRole("option", { name: /Warlock/ }).click();
    await expect(hero).toHaveValue("warlock");
    await expect(panel).toHaveCount(0);
    await hero.focus();
    await page.keyboard.press("Enter");
    await expect(panel).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(hero).toBeFocused();
    const bars = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("*")]
        .filter(
          (el) =>
            el.clientHeight > 0 &&
            /auto|scroll/.test(getComputedStyle(el).overflowY),
        )
        .map((el) => getComputedStyle(el).scrollbarWidth),
    );
    expect(bars.every((value) => value === "none")).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await hero.selectOption(initial);
  }
});
