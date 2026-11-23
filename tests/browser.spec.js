import { test, expect } from "@playwright/test";
async function setup(page, storage = {}) {
  await page.route("**/*", (route) => {
    const u = new URL(route.request().url());
    return u.hostname === "127.0.0.1" ? route.continue() : route.abort();
  });
  await page.addInitScript((data) => {
    if (!sessionStorage.getItem("test-seeded")) {
      for (const [k, v] of Object.entries(data))
        localStorage.setItem(k, JSON.stringify(v));
      sessionStorage.setItem("test-seeded", "1");
    }
    window.__wa = [];
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.href.startsWith("https://wa.me/")) {
        window.__wa.push(this.href);
        return;
      }
      return click.call(this);
    };
  }, storage);
  await page.goto("/");
  await expect(page.locator("#grid .card")).toHaveCount(18);
}
async function add(page) {
  await page.locator('[data-a="inc"][data-id="1"]').click();
  await page.locator("[data-cart]").first().click();
}
test("Arabic and English mobile layout, search, categories and controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await expect(page.locator(".demo-notice")).toContainText("تجريبية");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/mobile-ar.png", fullPage: true });
  await page.locator("#lang").click();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.locator(".demo-notice")).toContainText("Demo");
  await page.locator("#q").fill("Beef");
  await expect(page.locator("#grid .card")).toHaveCount(6);
  await page.locator("#q").fill("");
  await page.locator('[data-c="addons"]').click();
  await expect(page.locator("#grid .card")).toHaveCount(5);
  await page.screenshot({ path: "test-results/mobile-en.png", fullPage: true });
});
for (const [label, value] of Object.entries({
  null: null,
  corrupt: { 1: 2147483648, 6: -4 },
  fraction: [{ id: 1, q: 0.5 }],
  string: [{ id: 1, q: "2" }],
  deleted: [{ id: 999, q: 5 }],
}))
  test(`saved cart ${label} is safe`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await setup(page, { "abu-cart": value });
    expect(errors).toEqual([]);
    await expect(page.locator(".fatal")).toHaveCount(0);
    expect(await page.locator("#cnt").innerText()).not.toContain("-");
  });
test("malformed order history and reservation history cannot crash drafts", async ({
  page,
}) => {
  await setup(page, { "abu-orders": null, "abu-res": {} });
  await add(page);
  await page.locator('#ordForm [name="name"]').fill("Test User");
  await page.locator('#ordForm [name="phone"]').fill("01012345678");
  await page.locator('#ordForm [name="addr"]').fill("Test address only");
  await page.locator('#ordForm [type="submit"]').click();
  await expect(page.locator(".fatal")).toHaveCount(0);
  expect(await page.evaluate(() => window.__wa.length)).toBe(1);
});
test("WhatsApp is only a draft and does not erase cart or details", async ({
  page,
}) => {
  await setup(page);
  await add(page);
  await page.locator('#ordForm [name="name"]').fill("Test User");
  await page.locator('#ordForm [name="phone"]').fill("01012345678");
  await page.locator('#ordForm [name="addr"]').fill("Test address only");
  await page.locator('#ordForm [type="submit"]').click();
  expect(await page.evaluate(() => window.__wa.length)).toBe(1);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("abu-cart"))[0].q,
    ),
  ).toBe(1);
  await page.locator("[data-cart]").first().click();
  await expect(page.locator('#ordForm [name="name"]')).toHaveValue("Test User");
  await page.reload();
  await page.locator("[data-cart]").first().click();
  await expect(page.locator("#cartBody .it")).toHaveCount(1);
});
test("invalid order never opens external handoff", async ({ page }) => {
  await setup(page);
  await add(page);
  await page.locator('#ordForm [type="submit"]').click();
  expect(await page.evaluate(() => window.__wa.length)).toBe(0);
  await expect(page.locator("#oe")).not.toBeEmpty();
});
test("line notes and drinks survive reload and reorder", async ({ page }) => {
  await setup(page, {
    "abu-cart": [{ id: 17, q: 2, note: "No ice", opt: 2 }],
    "abu-orders": [{ lines: [{ id: 1, q: "2" }] }],
  });
  await page.locator('[data-a="again"]').click();
  await expect(page.locator("#cartBody .it")).toHaveCount(2);
  await expect(page.locator("#cartBody")).toContainText("No ice");
  await page.reload();
  await page.locator("[data-cart]").first().click();
  await expect(page.locator("#cartBody .it")).toHaveCount(2);
});
test("clear is the explicit destructive cart action", async ({ page }) => {
  await setup(page);
  await add(page);
  await page.locator('[data-a="clear"]').click();
  await expect(page.locator("#cartBody .it")).toHaveCount(0);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("abu-cart"))),
  ).toEqual([]);
});
test("service worker precaches every extracted module and offline reload works", async ({
  page,
}) => {
  await setup(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const cached = await page.evaluate(async () => {
    const c = await caches.open("abu-v2-modules");
    return (await c.keys()).map((x) => new URL(x.url).pathname);
  });
  for (const file of ["styles.css", "app.js", "data.js", "cart.js", "pwa.js"])
    expect(cached).toContain("/" + file);
  await page.context().setOffline(true);
  await page.reload();
  await expect(page.locator("#grid .card")).toHaveCount(18);
});
