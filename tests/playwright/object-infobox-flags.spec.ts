/**
 * Front-end rendering of flag fields in the Object Infobox block.
 *
 * The editor stores each field's already-formatted value in the block's
 * `fieldData` attribute, and render.php escapes and echoes whatever is there.
 * Flag fields were never formatted — the branch meant to turn them into
 * Yes/No tested for a field type ('tinyint') that no longer exists against a
 * value (1) that flags never have — so the raw JSON boolean was saved and the
 * front end printed "1" for true and nothing at all for false.
 *
 * Posts saved before the fix still hold raw booleans, so render.php now
 * formats them too. This drives that path directly: the block markup below is
 * exactly what such a post contains.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/143
 */

import { test, expect } from "@playwright/test";
import { setupMuseumTest } from "./utils";

const RUN_ID = `${Date.now()}`;

/** Block markup holding raw booleans, as saved before the fix. */
const legacyAttributes = {
  objectID: 0,
  title: `Infobox Flags ${RUN_ID}`,
  excerpt: "",
  displayImage: false,
  displayTitle: true,
  displayExcerpt: false,
  linkToObject: false,
  fields: { f1: true, f2: true, f3: true },
  fieldData: {
    f1: { name: "On Display", content: true },
    f2: { name: "Is Fragile", content: false },
    f3: { name: "Maker", content: "Zeiss" },
  },
};

test.describe("Object Infobox flag fields (#143)", () => {
  let pageUrl: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await setupMuseumTest(page);

    await page.goto("/wp-admin/");
    await page.waitForLoadState("domcontentloaded");
    const nonce: string = await page.evaluate(
      () => (window as any).wpApiSettings?.nonce,
    );

    const content = `<!-- wp:wp-museum/object-infobox ${JSON.stringify(
      legacyAttributes,
    )} /-->`;

    const pageResp = await page.request.post("/wp-json/wp/v2/pages", {
      data: {
        title: `Infobox Flags Test ${RUN_ID}`,
        status: "publish",
        content,
      },
      headers: { "X-WP-Nonce": nonce },
    });
    expect(pageResp.ok()).toBeTruthy();
    pageUrl = (await pageResp.json()).link;

    await page.close();
  });

  test("renders the block without a fatal error", async ({ page }) => {
    const response = await page.goto(pageUrl);

    expect(response?.status()).toBe(200);
    await expect(page.locator(".infobox-content-wrapper")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      "There has been a critical error",
    );
  });

  test("prints a set flag as Yes and an unset flag as No", async ({ page }) => {
    await page.goto(pageUrl);

    const onDisplay = page
      .locator("li", { hasText: "On Display:" })
      .locator(".field-data");
    const isFragile = page
      .locator("li", { hasText: "Is Fragile:" })
      .locator(".field-data");

    await expect(onDisplay).toHaveText(/^\s*Yes\s*$/);
    await expect(isFragile).toHaveText(/^\s*No\s*$/);
  });

  test("does not print a raw boolean", async ({ page }) => {
    await page.goto(pageUrl);

    // true used to escape to "1"; false escaped to the empty string, leaving
    // the field label with nothing after it.
    const onDisplay = page
      .locator("li", { hasText: "On Display:" })
      .locator(".field-data");

    await expect(onDisplay).not.toHaveText(/^\s*1\s*$/);
    await expect(onDisplay).not.toHaveText(/^\s*$/);
  });

  test("leaves non-flag fields alone", async ({ page }) => {
    await page.goto(pageUrl);

    const maker = page
      .locator("li", { hasText: "Maker:" })
      .locator(".field-data");

    await expect(maker).toHaveText(/^\s*Zeiss\s*$/);
  });
});
