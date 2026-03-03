/**
 * Tests for issue #118: Advanced search block with unlimited results.
 *
 * When an advanced-search block is configured with fixSearch + runOnLoad
 * to display a collection's objects, and resultsPerPage is set to -1
 * (Unlimited), all objects should be returned on a single page.
 *
 * Previously the pagination calculation in class-objects-controller.php
 * did max_pages = ceil(total / per_page), which produced a negative value
 * when per_page was -1 and caused a 400 error. Now per_page=-1 is handled
 * as a special case (max_pages = 1).
 */

const { test, expect } = require("@playwright/test");
const { loginAsAdmin, setupMuseumTest, createSimpleObjectKind } = require("./utils");

test.describe("Advanced search unlimited results (#118)", () => {
  let objectPostType;
  let collectionPostId;
  let pageWithBlockId;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await setupMuseumTest(page);

    // Create an object kind
    await createSimpleObjectKind(page, "Limit Test Obj");

    // Get the REST nonce
    await page.goto("/wp-admin/");
    await page.waitForLoadState("domcontentloaded");
    const nonce = await page.evaluate(() => window.wpApiSettings?.nonce);

    // Determine the object post type
    const kindsResp = await page.request.get(
      "/wp-json/wp-museum/v1/mobject_kinds",
      { headers: { "X-WP-Nonce": nonce } }
    );
    const kinds = await kindsResp.json();
    objectPostType = kinds[0].type_name;
    console.log(`Object post type: ${objectPostType}`);

    // Create a collection
    const collResp = await page.request.post(
      "/wp-json/wp/v2/wpm_collection",
      {
        data: { title: "Limit Test Collection", status: "publish" },
        headers: { "X-WP-Nonce": nonce },
      }
    );
    const collData = await collResp.json();
    collectionPostId = collData.id;
    console.log(`Collection ID: ${collectionPostId}`);

    // Get the collection taxonomy term
    const termsResp = await page.request.get(
      "/wp-json/wp/v2/wpm_collection_tax?per_page=100",
      { headers: { "X-WP-Nonce": nonce } }
    );
    const terms = await termsResp.json();
    let termId = null;
    if (Array.isArray(terms)) {
      for (const t of terms) {
        if (t.name === "Limit Test Collection") {
          termId = t.id;
          break;
        }
      }
    }
    if (!termId) {
      const newTermResp = await page.request.post(
        "/wp-json/wp/v2/wpm_collection_tax",
        {
          data: { name: "Limit Test Collection" },
          headers: { "X-WP-Nonce": nonce },
        }
      );
      if (newTermResp.ok()) {
        termId = (await newTermResp.json()).id;
      }
    }
    console.log(`Term ID: ${termId}`);

    // Create 25 objects assigned to the collection
    for (let i = 1; i <= 25; i++) {
      await page.request.post(`/wp-json/wp/v2/${objectPostType}`, {
        data: {
          title: `Test Object ${String(i).padStart(2, "0")}`,
          status: "publish",
          ...(termId ? { wpm_collection_tax: [termId] } : {}),
        },
        headers: { "X-WP-Nonce": nonce },
      });
    }
    console.log("Created 25 test objects");

    // Create a page with an advanced-search block configured for unlimited
    // results, fixSearch, runOnLoad, and a defaultSearch filtering by collection
    const defaultSearch = JSON.stringify({
      selectedCollections: [collectionPostId],
    });
    const blockMarkup = `<!-- wp:wp-museum/advanced-search {"fixSearch":true,"runOnLoad":true,"resultsPerPage":-1,"defaultSearch":${JSON.stringify(defaultSearch)}} --><!-- /wp:wp-museum/advanced-search -->`;

    const pageResp = await page.request.post("/wp-json/wp/v2/pages", {
      data: {
        title: "Unlimited Results Test",
        status: "publish",
        content: blockMarkup,
      },
      headers: { "X-WP-Nonce": nonce },
    });
    const pageData = await pageResp.json();
    pageWithBlockId = pageData.id;
    console.log(`Page with block: ${pageWithBlockId}`);

    await page.close();
  });

  test("REST API: per_page=-1 returns all results", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    // This is exactly what the advanced-search front.js does when
    // resultsPerPage is set to -1 (Unlimited)
    const response = await page.request.post("/wp-json/wp-museum/v1/search", {
      data: {
        selectedCollections: [collectionPostId],
        per_page: -1,
        status: "publish",
        page: 1,
      },
    });

    const statusCode = response.status();
    const body = await response.json();
    console.log(`per_page=-1 status: ${statusCode}`);
    console.log(`Response: ${JSON.stringify(body).substring(0, 300)}`);

    // Fixed: The API now returns all 25 results when per_page=-1
    expect(statusCode).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(25);

    const totalPages = response.headers()["x-wp-totalpages"];
    expect(parseInt(totalPages)).toBe(1);
  });

  test("REST API: per_page=20 works correctly (baseline)", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    const response = await page.request.post("/wp-json/wp-museum/v1/search", {
      data: {
        selectedCollections: [collectionPostId],
        per_page: 20,
        status: "publish",
        page: 1,
      },
    });

    expect(response.ok()).toBe(true);
    const results = await response.json();
    const total = response.headers()["x-wp-total"];
    console.log(`per_page=20: ${results.length} results, ${total} total`);

    expect(results.length).toBe(20);
    expect(parseInt(total)).toBe(25);
  });

  test("Frontend: page with fixSearch + unlimited shows all results", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    await page.goto(`/?p=${pageWithBlockId}`);
    await page.waitForLoadState("domcontentloaded");

    const blockContainer = page.locator(".wpm-advanced-search-block-frontend");
    await expect(blockContainer).toHaveCount(1);

    // Wait for the React component to mount and load results
    const firstObject = blockContainer.locator(".object-grid-box-wrapper").first();
    await expect(firstObject).toBeVisible({ timeout: 15000 });

    // Count displayed objects - all 25 should appear
    const objectCount = await blockContainer
      .locator(".object-grid-box-wrapper")
      .count();
    console.log(`Objects displayed with unlimited: ${objectCount}`);

    // Fixed: All 25 objects now appear because per_page=-1 works correctly
    expect(objectCount).toBe(25);
  });
});
