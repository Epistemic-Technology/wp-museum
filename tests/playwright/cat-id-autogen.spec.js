/**
 * Tests for issue #30: per-kind auto-generation of catalogue IDs.
 *
 * The cat field is required for the admin to publish an object. Museums
 * without a pre-existing numbering system used to be blocked on day one.
 * This feature lets the admin toggle `cat_id_auto_generate` on a kind
 * (with an optional prefix and zero-pad width); when an object is saved
 * with the cat field empty, the next sequential value is generated.
 *
 * Manual cat IDs are never overwritten — auto-gen only fills empties.
 */

const { test, expect } = require("@playwright/test");
const { loginAsAdmin, setupMuseumTest } = require("./utils");

const PREFIX = "OBJ-";
const PAD = 4;
const OBJECT_CONTENT =
  `<!-- wp:wp-museum/object-meta-block /-->\n` +
  `<!-- wp:wp-museum/object-image-attachments-block /-->\n` +
  `<!-- wp:wp-museum/child-objects-block /-->\n`;

test.describe("Auto-generate catalogue IDs (#30)", () => {
  let objectPostType;
  let catFieldSlug;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await setupMuseumTest(page);

    await page.goto("/wp-admin/");
    await page.waitForLoadState("domcontentloaded");
    const nonce = await page.evaluate(() => window.wpApiSettings?.nonce);

    // The bundled default kind (#4) ships with Catalogue Number as the
    // cat field — perfect base to enable auto-generation on.
    const kindsResp = await page.request.get(
      "/wp-json/wp-museum/v1/mobject_kinds",
      { headers: { "X-WP-Nonce": nonce } }
    );
    const allKinds = await kindsResp.json();
    const kind = allKinds.find((k) => k.label === "Object");
    expect(kind).toBeTruthy();
    objectPostType = kind.type_name;

    const fieldsResp = await page.request.get(
      `/wp-json/wp-museum/v1/${objectPostType}/fields`,
      { headers: { "X-WP-Nonce": nonce } }
    );
    const fields = Object.values(await fieldsResp.json());
    const catField = fields.find((f) => f.name === "Catalogue Number");
    expect(catField).toBeTruthy();
    catFieldSlug = catField.slug;

    const updatedKinds = allKinds.map((k) =>
      k.kind_id === kind.kind_id
        ? {
            ...k,
            cat_id_auto_generate: true,
            cat_id_prefix: PREFIX,
            cat_id_pad_length: PAD,
          }
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

    await page.close();
  });

  test("first saved object with empty cat field gets prefix + padded 1", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/wp-admin/");
    await page.waitForLoadState("domcontentloaded");
    const nonce = await page.evaluate(() => window.wpApiSettings?.nonce);

    const resp = await page.request.post(`/wp-json/wp/v2/${objectPostType}`, {
      data: {
        title: "Auto-gen Test Object 1",
        status: "publish",
        content: OBJECT_CONTENT,
      },
      headers: { "X-WP-Nonce": nonce },
    });
    expect(resp.ok()).toBe(true);
    const id = (await resp.json()).id;

    const check = await page.request.get(
      `/wp-json/wp/v2/${objectPostType}/${id}`,
      { headers: { "X-WP-Nonce": nonce } }
    );
    const stored = (await check.json()).meta?.[catFieldSlug];
    expect(stored).toBe(`${PREFIX}0001`);
  });

  test("subsequent objects increment past the existing max", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/wp-admin/");
    await page.waitForLoadState("domcontentloaded");
    const nonce = await page.evaluate(() => window.wpApiSettings?.nonce);

    const titles = [
      "Auto-gen Test Object 2",
      "Auto-gen Test Object 3",
      "Auto-gen Test Object 4",
    ];
    const generated = [];
    for (const title of titles) {
      const resp = await page.request.post(
        `/wp-json/wp/v2/${objectPostType}`,
        {
          data: { title, status: "publish", content: OBJECT_CONTENT },
          headers: { "X-WP-Nonce": nonce },
        }
      );
      expect(resp.ok()).toBe(true);
      const id = (await resp.json()).id;
      const check = await page.request.get(
        `/wp-json/wp/v2/${objectPostType}/${id}`,
        { headers: { "X-WP-Nonce": nonce } }
      );
      generated.push((await check.json()).meta?.[catFieldSlug]);
    }

    // Each generated ID should be greater than the previous when compared
    // numerically (strips the prefix). We don't hard-code the values
    // because the first test in this file already consumed "0001".
    const numeric = generated.map((v) => parseInt(v.replace(PREFIX, ""), 10));
    expect(numeric[1]).toBe(numeric[0] + 1);
    expect(numeric[2]).toBe(numeric[1] + 1);
    // All are padded to PAD digits.
    for (const v of generated) {
      expect(v).toMatch(new RegExp(`^${PREFIX}\\d{${PAD}}$`));
    }
  });

  test("manually supplied cat IDs are not overwritten", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/wp-admin/");
    await page.waitForLoadState("domcontentloaded");
    const nonce = await page.evaluate(() => window.wpApiSettings?.nonce);

    const manualId = "MANUAL-123";
    const resp = await page.request.post(`/wp-json/wp/v2/${objectPostType}`, {
      data: {
        title: "Manual Cat ID Object",
        status: "publish",
        content: OBJECT_CONTENT,
        meta: { [catFieldSlug]: manualId },
      },
      headers: { "X-WP-Nonce": nonce },
    });
    expect(resp.ok()).toBe(true);
    const id = (await resp.json()).id;

    const check = await page.request.get(
      `/wp-json/wp/v2/${objectPostType}/${id}`,
      { headers: { "X-WP-Nonce": nonce } }
    );
    const stored = (await check.json()).meta?.[catFieldSlug];
    expect(stored).toBe(manualId);
  });
});
