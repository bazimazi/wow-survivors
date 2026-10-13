import { test, expect } from "@playwright/test";
test.use({ hasTouch: true });

test("all eight menus stay inside the game frame with one scrollbar-free reader at phone and desktop sizes", async ({
  page,
}) => {
  await page.goto("/");
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of [
      "Expedition",
      "Talents",
      "Spellbook",
      "Armory",
      "Professions",
      "Outposts",
      "Journal",
      "Stable",
    ]) {
      await page.getByRole("button", { name, exact: true }).click();
      const report = await page.evaluate(() => {
        const view = document.querySelector<HTMLElement>(".main-content")!;
        return {
          pageHeight: document.documentElement.scrollHeight,
          pageWidth: document.documentElement.scrollWidth,
          width: innerWidth,
          height: innerHeight,
          bars: getComputedStyle(view).scrollbarWidth,
          readers: [...document.querySelectorAll<HTMLElement>("*")].filter(
            (el) =>
              el.clientHeight > 0 &&
              el.scrollHeight > el.clientHeight + 3 &&
              /auto|scroll/.test(getComputedStyle(el).overflowY),
          ).length,
          controls: [
            ...document.querySelectorAll<HTMLElement>(
              ".game-page-nav > *, .site-footer > .text-button",
            ),
          ].map((el) => el.getBoundingClientRect().toJSON()),
        };
      });
      expect(report.pageHeight, name).toBe(report.height);
      expect(report.pageWidth, name).toBe(report.width);
      expect(report.bars, name).toBe("none");
      expect(report.readers, name).toBeLessThanOrEqual(1);
      for (const control of report.controls) {
        expect(control.left, name).toBeGreaterThanOrEqual(0);
        expect(control.right, name).toBeLessThanOrEqual(width);
        expect(control.bottom, name).toBeLessThanOrEqual(900);
      }
    }
  }
});

test("page turns, section shortcuts, keyboard and wheel navigation keep long collections accessible", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Professions", exact: true }).click();
  const view = page.locator(".main-content");
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  expect(await view.evaluate((el) => el.scrollTop)).toBeGreaterThan(100);
  await page
    .getByRole("button", { name: "Previous page", exact: true })
    .click();
  expect(await view.evaluate((el) => el.scrollTop)).toBe(0);
  await page
    .getByRole("combobox", { name: "Jump to section" })
    .selectOption({ label: "At the crafting table" });
  expect(await view.evaluate((el) => el.scrollTop)).toBeGreaterThan(100);
  await page.locator(".site-footer .game-page-count").click();
  await page.keyboard.press("End");
  expect(
    await view.evaluate(
      (el) => el.scrollTop + el.clientHeight >= el.scrollHeight - 2,
    ),
  ).toBe(true);
  await page.keyboard.press("Home");
  expect(await view.evaluate((el) => el.scrollTop)).toBe(0);
  await page.mouse.move(400, 300);
  await page.mouse.wheel(0, 500);
  await expect
    .poll(() => view.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(100);
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test("dialog page controls remain visible, background scrolling is disabled and close restores menu access", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const dialog = page.getByRole("dialog"),
    reader = dialog.locator(".dialog-content");
  expect(
    await page.locator("#app").evaluate((el) => (el as HTMLElement).inert),
  ).toBe(true);
  expect(
    await page
      .locator(".main-content")
      .evaluate((el) => getComputedStyle(el).overflowY),
  ).toBe("hidden");
  await dialog.getByRole("button", { name: "Next page", exact: true }).click();
  expect(await reader.evaluate((el) => el.scrollTop)).toBeGreaterThan(100);
  await page.keyboard.press("End");
  expect(
    await reader.evaluate(
      (el) => el.scrollTop + el.clientHeight >= el.scrollHeight - 2,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  expect(
    await page.locator("#app").evaluate((el) => (el as HTMLElement).inert),
  ).toBe(false);
  await page.getByRole("button", { name: "Armory", exact: true }).click();
  await expect(page.locator(".main-content")).toHaveAttribute(
    "data-page",
    "armory",
  );
});

test.describe("native touch paging", () => {
  test.use({ isMobile: true });
  test("phone swipes move the reader while the outer game frame stays fixed", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Professions", exact: true }).tap();
    const reader = page.locator(".main-content"),
      box = (await reader.boundingBox())!;
    const session = await page.context().newCDPSession(page);
    const x = box.x + box.width * 0.7,
      y = box.y + box.height * 0.8;
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (let i = 1; i <= 8; i++)
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: y - i * 30 }],
      });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect
      .poll(() => reader.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(100);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight),
    ).toBe(844);
    await session.detach();
  });
});
