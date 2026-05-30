/**
 * Tests for issue #115 (follow-up): /wp/v2/search matches catalogue IDs.
 *
 * LinkControl in the editor hits core's `/wp/v2/search` to populate its
 * autocomplete. Out of the box that endpoint only searches title /
 * excerpt / content. The plugin extends the SQL search clause (via the
 * `posts_search` filter) to also match each museum kind's cat field
 * meta, so admins can find objects by ID like "MAGIC.42" — not just by
 * title.
 */

const { test, expect } = require("@playwright/test");
const { loginAsAdmin, setupMuseumTest, createSimpleObjectKind } = require("./utils");

test.describe("Cat ID search via /wp/v2/search (#115)", () => {
  let objectPostType;
  let catFieldSlug;
  let objectPostId;
  const catIdValue = "MAGIC.42";

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await setupMuseumTest(page);
    await createSimpleObjectKind(page, "Cat Search Test Obj");

    await page.goto("/wp-admin/");
    await page.waitForLoadState("domcontentloaded");
    const nonce = await page.evaluate(() => window.wpApiSettings?.nonce);

    const kindsResp = await page.request.get(
      "/wp-json/wp-museum/v1/mobject_kinds",
      { headers: { "X-WP-Nonce": nonce } }
    );
    const kinds = await kindsResp.json();
    const kind = kinds.find((k) => k.label === "Cat Search Test Obj");
    objectPostType = kind.type_name;

    // Look up the Accession Number field; we'll designate it as the cat
    // field for this kind.
    const fieldsResp = await page.request.get(
      `/wp-json/wp-museum/v1/${objectPostType}/fields`,
      { headers: { "X-WP-Nonce": nonce } }
    );
    const fields = await fieldsResp.json();
    const accessionField = Object.values(fields).find(
      (f) => f.name === "Accession Number"
    );
    expect(accessionField).toBeTruthy();
    catFieldSlug = accessionField.slug;

    // Update the kind to point cat_field_id at Accession Number.
    const updatedKinds = kinds.map((k) =>
      k.kind_id === kind.kind_id
        ? { ...k, cat_field_id: accessionField.field_id }
        : k
    );
    const kindUpdateResp = await page.request.post(
      "/wp-json/wp-museum/v1/mobject_kinds",
      {
        data: updatedKinds,
        headers: { "X-WP-Nonce": nonce },
      }
    );
    expect(kindUpdateResp.ok()).toBe(true);

    // Create a museum object with the cat ID value and a benign title.
    // We deliberately pick a title that does NOT contain the cat ID so
    // a match on /wp/v2/search?s=MAGIC.42 can only come from the meta.
    const objResp = await page.request.post(
      `/wp-json/wp/v2/${objectPostType}`,
      {
        data: {
          title: "Silent Spectroscope",
          status: "publish",
          meta: { [catFieldSlug]: catIdValue },
        },
        headers: { "X-WP-Nonce": nonce },
      }
    );
    expect(objResp.ok()).toBe(true);
    objectPostId = (await objResp.json()).id;

    await page.close();
  });

  test("/wp/v2/search?s=<cat-id> returns the matching object", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    const resp = await page.request.get(
      `/wp-json/wp/v2/search?search=${encodeURIComponent(catIdValue)}&subtype=${objectPostType}&per_page=20`
    );
    expect(resp.ok()).toBe(true);
    const results = await resp.json();
    expect(Array.isArray(results)).toBe(true);
    expect(results.some((r) => r.id === objectPostId)).toBe(true);
  });

  test("title-based search still works (regression guard)", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    const resp = await page.request.get(
      `/wp-json/wp/v2/search?search=Spectroscope&subtype=${objectPostType}&per_page=20`
    );
    expect(resp.ok()).toBe(true);
    const results = await resp.json();
    expect(results.some((r) => r.id === objectPostId)).toBe(true);
  });

  test("unrelated search term returns no false positives", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    const resp = await page.request.get(
      `/wp-json/wp/v2/search?search=zzz-impossible-string-xyz&subtype=${objectPostType}&per_page=20`
    );
    expect(resp.ok()).toBe(true);
    const results = await resp.json();
    expect(results.some((r) => r.id === objectPostId)).toBe(false);
  });
});
