/**
 * Tests for issue #117: collection breadcrumbs link to the collection post.
 *
 * Previously `object_collection_terms_string()` built breadcrumb links via
 * `get_term_link()`, sending visitors to the bare taxonomy archive
 * (`/wpm_collection_tax/{slug}/`). The fix resolves each term back to its
 * corresponding wpm_collection post and links there instead, so users land
 * on the curated collection page.
 */

const { test, expect } = require("@playwright/test");
const { loginAsAdmin, setupMuseumTest, createSimpleObjectKind } = require("./utils");

test.describe("Collection breadcrumbs link to collection post (#117)", () => {
  let objectPostType;
  let collectionLink;
  let objectPostId;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await setupMuseumTest(page);

    await createSimpleObjectKind(page, "Breadcrumb Test Obj");

    await page.goto("/wp-admin/");
    await page.waitForLoadState("domcontentloaded");
    const nonce = await page.evaluate(() => window.wpApiSettings?.nonce);

    const kindsResp = await page.request.get(
      "/wp-json/wp-museum/v1/mobject_kinds",
      { headers: { "X-WP-Nonce": nonce } }
    );
    objectPostType = (await kindsResp.json())[0].type_name;

    // Create a collection. save_post auto-creates the matching taxonomy term
    // and writes the term ID into wpm_collection_term_id post meta.
    const collTitle = "Breadcrumb Test Collection";
    const collResp = await page.request.post("/wp-json/wp/v2/wpm_collection", {
      data: { title: collTitle, status: "publish" },
      headers: { "X-WP-Nonce": nonce },
    });
    const collData = await collResp.json();
    collectionLink = collData.link;

    // Find the auto-created taxonomy term by name so we can assign objects.
    const termsResp = await page.request.get(
      `/wp-json/wp/v2/wpm_collection_tax?search=${encodeURIComponent(collTitle)}&per_page=10`,
      { headers: { "X-WP-Nonce": nonce } }
    );
    const terms = await termsResp.json();
    const termId = Array.isArray(terms)
      ? (terms.find((t) => t.name === collTitle) || {}).id
      : null;
    expect(termId).toBeTruthy();

    const objResp = await page.request.post(`/wp-json/wp/v2/${objectPostType}`, {
      data: {
        title: "Breadcrumb Test Object",
        status: "publish",
        wpm_collection_tax: [termId],
      },
      headers: { "X-WP-Nonce": nonce },
    });
    objectPostId = (await objResp.json()).id;

    await page.close();
  });

  test("breadcrumb on object page links to collection post, not taxonomy archive", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    await page.goto(`/?p=${objectPostId}`);
    await page.waitForLoadState("domcontentloaded");

    const breadcrumbLink = page.locator(".wpm-obj-categories a").first();
    await expect(breadcrumbLink).toBeVisible();

    const href = await breadcrumbLink.getAttribute("href");
    expect(href).toBeTruthy();

    // The link should resolve to the same URL as the collection post.
    // Using URL parsing to normalize (e.g., trailing slashes, query strings).
    const linkUrl = new URL(href, page.url());
    const collectionUrl = new URL(collectionLink);
    expect(linkUrl.pathname.replace(/\/$/, "")).toBe(
      collectionUrl.pathname.replace(/\/$/, "")
    );

    // Belt-and-suspenders: must not point at the bare taxonomy archive.
    expect(href).not.toContain("wpm_collection_tax");
  });
});
