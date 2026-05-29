/**
 * Tests for issue #118: collection-objects block respects resultsPerPage.
 *
 * The collection-objects block previously had a `resultsPerPage` attribute
 * declared in block.json but it was dead — the editor exposed no control,
 * render.php only emitted data-post-ID, and front.js used a hardcoded
 * default of 20. These tests verify the attribute now flows end-to-end
 * and that resultsPerPage=-1 (Unlimited) returns every object in the
 * collection.
 */

const { test, expect } = require("@playwright/test");
const { loginAsAdmin, setupMuseumTest, createSimpleObjectKind } = require("./utils");

test.describe("Collection Objects block resultsPerPage (#118)", () => {
  let unlimitedCollectionId;
  let defaultCollectionId;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await setupMuseumTest(page);

    await createSimpleObjectKind(page, "CObj Limit Test Obj");

    await page.goto("/wp-admin/");
    await page.waitForLoadState("domcontentloaded");
    const nonce = await page.evaluate(() => window.wpApiSettings?.nonce);

    const kindsResp = await page.request.get(
      "/wp-json/wp-museum/v1/mobject_kinds",
      { headers: { "X-WP-Nonce": nonce } }
    );
    const kinds = await kindsResp.json();
    const objectPostType = kinds[0].type_name;

    // Helper: create a collection post (with a collection-objects block in
    // its content), look up its taxonomy term, and assign N objects to it.
    const createPopulatedCollection = async (title, blockMarkup, count) => {
      const collResp = await page.request.post(
        "/wp-json/wp/v2/wpm_collection",
        {
          data: { title, status: "publish", content: blockMarkup },
          headers: { "X-WP-Nonce": nonce },
        }
      );
      const collId = (await collResp.json()).id;

      const termsResp = await page.request.get(
        "/wp-json/wp/v2/wpm_collection_tax?per_page=100",
        { headers: { "X-WP-Nonce": nonce } }
      );
      const terms = await termsResp.json();
      let termId = Array.isArray(terms)
        ? (terms.find((t) => t.name === title) || {}).id
        : null;
      if (!termId) {
        const newTermResp = await page.request.post(
          "/wp-json/wp/v2/wpm_collection_tax",
          {
            data: { name: title },
            headers: { "X-WP-Nonce": nonce },
          }
        );
        if (newTermResp.ok()) {
          termId = (await newTermResp.json()).id;
        }
      }

      for (let i = 1; i <= count; i++) {
        await page.request.post(`/wp-json/wp/v2/${objectPostType}`, {
          data: {
            title: `${title} Obj ${String(i).padStart(2, "0")}`,
            status: "publish",
            ...(termId ? { wpm_collection_tax: [termId] } : {}),
          },
          headers: { "X-WP-Nonce": nonce },
        });
      }

      return collId;
    };

    unlimitedCollectionId = await createPopulatedCollection(
      "CObj Unlimited Collection",
      `<!-- wp:wp-museum/collection-objects {"resultsPerPage":-1} /-->`,
      25
    );
    defaultCollectionId = await createPopulatedCollection(
      "CObj Default Collection",
      `<!-- wp:wp-museum/collection-objects /-->`,
      25
    );

    await page.close();
  });

  test("Frontend: collection page with resultsPerPage=-1 shows all objects", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    await page.goto(`/?p=${unlimitedCollectionId}`);
    await page.waitForLoadState("domcontentloaded");

    const blockContainer = page.locator(".wpm-collection-objects-block");
    await expect(blockContainer).toHaveCount(1);

    // The data-results-per-page attribute proves render.php is forwarding
    // the attribute. Without the fix it would not exist at all.
    await expect(blockContainer).toHaveAttribute("data-results-per-page", "-1");

    const firstObject = blockContainer.locator(".object-grid-box-wrapper").first();
    await expect(firstObject).toBeVisible({ timeout: 15000 });

    const objectCount = await blockContainer
      .locator(".object-grid-box-wrapper")
      .count();
    expect(objectCount).toBe(25);
  });

  test("Frontend: collection page with default resultsPerPage shows 20 objects", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    await page.goto(`/?p=${defaultCollectionId}`);
    await page.waitForLoadState("domcontentloaded");

    const blockContainer = page.locator(".wpm-collection-objects-block");
    await expect(blockContainer).toHaveCount(1);
    await expect(blockContainer).toHaveAttribute("data-results-per-page", "20");

    const firstObject = blockContainer.locator(".object-grid-box-wrapper").first();
    await expect(firstObject).toBeVisible({ timeout: 15000 });

    const objectCount = await blockContainer
      .locator(".object-grid-box-wrapper")
      .count();
    expect(objectCount).toBe(20);
  });
});
