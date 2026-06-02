/**
 * Tests for issue #116: rich-text fields with entity-escaped special
 * characters inside hrefs no longer corrupt the rendered HTML.
 *
 * Real-world trigger: a DOI URL like
 *   https://doi.org/10.1130/0091-7613(1993)021<0041:FSAADO>2.3.CO;2
 * Gutenberg correctly serialises the literal "<" / ">" inside the
 * href as "&lt;" / "&gt;". The plugin's renderer used to call
 * html_entity_decode() on the field's combined HTML, which converted
 * those back to literal "<" / ">" inside the attribute — the browser
 * then parsed each "<" as a tag start, splitting the anchor and
 * cascading the broken markup through the rest of the page.
 */

const { test, expect } = require("@playwright/test");
const { loginAsAdmin, setupMuseumTest } = require("./utils");

test.describe("Rich field entity-escape preservation (#116)", () => {
  let objectPostId;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await setupMuseumTest(page);

    await page.goto("/wp-admin/");
    await page.waitForLoadState("domcontentloaded");
    const nonce = await page.evaluate(() => window.wpApiSettings?.nonce);

    // The bundled default kind (#4) ships with a "Description" field of
    // type rich — perfect target for this regression test.
    const kindsResp = await page.request.get(
      "/wp-json/wp-museum/v1/mobject_kinds",
      { headers: { "X-WP-Nonce": nonce } }
    );
    const kind = (await kindsResp.json()).find((k) => k.label === "Object");
    expect(kind).toBeTruthy();
    const postType = kind.type_name;

    const richValue =
      '<p>See ' +
      '<a href="https://doi.org/10.1130/0091-7613(1993)021&lt;0041:FSAADO&gt;2.3.CO;2">' +
      'First successful 40Ar-39Ar dating of glauconies' +
      '</a> for details.</p>';

    const objectContent =
      `<!-- wp:wp-museum/object-meta-block /-->\n` +
      `<!-- wp:wp-museum/object-image-attachments-block /-->\n` +
      `<!-- wp:wp-museum/child-objects-block /-->\n`;

    const objResp = await page.request.post(
      `/wp-json/wp/v2/${postType}`,
      {
        data: {
          title: "Entity Escape Test Object",
          status: "publish",
          content: objectContent,
          meta: {
            "catalogue-number": "ENT.116",
            description: richValue,
          },
        },
        headers: { "X-WP-Nonce": nonce },
      }
    );
    expect(objResp.ok()).toBe(true);
    objectPostId = (await objResp.json()).id;

    await page.close();
  });

  test("anchor inside rich field stays intact when href has &lt;/&gt;", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto(`/?p=${objectPostId}`);
    await page.waitForLoadState("domcontentloaded");

    // Exactly one anchor pointing at doi.org should exist. Before the
    // fix the broken markup spawned multiple stray anchors and dragged
    // unrelated page content inside them.
    const doiAnchors = page.locator('a[href*="doi.org"]');
    await expect(doiAnchors).toHaveCount(1);

    // The href as parsed by the browser must round-trip the special
    // chars. The entity form is fine; what we must NOT have is the
    // attribute being truncated at "<".
    const href = await doiAnchors.first().getAttribute("href");
    expect(href).toContain("0041:FSAADO");
    expect(href).toContain("2.3.CO;2");
  });

  test("anchor's visible text is intact (not split by the broken parse)", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto(`/?p=${objectPostId}`);
    await page.waitForLoadState("domcontentloaded");

    const anchor = page.locator('a[href*="doi.org"]').first();
    await expect(anchor).toHaveText(
      "First successful 40Ar-39Ar dating of glauconies"
    );
  });
});
