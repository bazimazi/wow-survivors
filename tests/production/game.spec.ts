import { test, expect } from "@playwright/test";

test("static production build loads local assets, plays an expedition and preserves saves", async ({
  page,
}) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => requests.push(request.url()));
  page.on("requestfailed", (request) =>
    errors.push(`${request.url()}: ${request.failure()?.errorText}`),
  );
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()}: ${response.url()}`);
  });

  await page.goto("/");
  await expect(page).toHaveTitle("Wow Survivors");
  await expect(page.locator(".class-card")).toHaveCount(9);
  await page.getByRole("button", { name: "Mage Frost & arcana" }).click();
  await page.reload();
  await expect(page.locator(".hero-art-name h2")).toHaveText("Mage");
  await page.getByRole("button", { name: "Begin Expedition" }).click();
  await expect(page.locator("#game-canvas")).toBeVisible();
  await expect(page.locator("#run-time")).not.toHaveText("00:00");
  await expect
    .poll(() =>
      page.locator("#game-canvas").evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        return canvas
          .getContext("2d")!
          .getImageData(0, 0, canvas.width, canvas.height)
          .data.some((value, index) => index % 4 !== 3 && value > 80);
      }),
    )
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Expedition paused" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Return to camp" }).click();
  await expect(
    page.getByRole("heading", { name: "Until the next adventure." }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Journal", exact: true }).click();
  await expect(page.locator(".history-row")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".history-row")).toHaveCount(1);
  await page.evaluate(() => document.fonts.ready);

  const origin = new URL(page.url()).origin;
  const urls = requests.map((url) => new URL(url));
  expect(urls.every((url) => url.origin === origin)).toBe(true);
  expect(urls.some((url) => /^\/assets\/.+\.js$/.test(url.pathname))).toBe(
    true,
  );
  expect(urls.some((url) => /^\/assets\/.+\.css$/.test(url.pathname))).toBe(
    true,
  );
  expect(urls.some((url) => url.pathname.startsWith("/art/"))).toBe(true);
  expect(urls.some((url) => url.pathname.startsWith("/fonts/"))).toBe(true);
  expect(
    urls.some((url) => /^\/(src\/|@vite\/|@id\/)/.test(url.pathname)),
  ).toBe(false);
  expect(errors).toEqual([]);
});
