/**
 * Tests for issue #115 (follow-up): public renderer surfaces cat IDs
 * and honors the optional custom label override.
 *
 * - Linked internal museum objects with a cat ID render as
 *   "Title (CAT123)" on the frontend, matching the editor display.
 * - When the stored `label` field is set (the admin typed a custom
 *   label), it's used verbatim — overriding the post title for
 *   internal links and the URL for external ones.
 */

const { test, expect } = require("@playwright/test");
const { loginAsAdmin, setupMuseumTest, createSimpleObjectKind } = require("./utils");

test.describe("Links frontend: cat IDs and custom labels (#115)", () => {
  let objectPostType;
  let linksFieldSlug;
  let internalTargetPostId;
  let internalTargetTitle;
  let internalTargetCatId;
  let hostObjectPostId;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await setupMuseumTest(page);
    await createSimpleObjectKind(page, "Frontend Cat Test Obj");

    await page.goto("/wp-admin/");
    await page.waitForLoadState("domcontentloaded");
    const nonce = await page.evaluate(() => window.wpApiSettings?.nonce);

    const kindsResp = await page.request.get(
      "/wp-json/wp-museum/v1/mobject_kinds",
      { headers: { "X-WP-Nonce": nonce } }
    );
    const kinds = await kindsResp.json();
    const kind = kinds.find((k) => k.label === "Frontend Cat Test Obj");
    objectPostType = kind.type_name;

    // Set the Accession Number field as the kind's cat field so the
    // renderer has something to look up.
    const fieldsResp = await page.request.get(
      `/wp-json/wp-museum/v1/${objectPostType}/fields`,
      { headers: { "X-WP-Nonce": nonce } }
    );
    const fields = await fieldsResp.json();
    const accessionField = Object.values(fields).find(
      (f) => f.name === "Accession Number"
    );
    expect(accessionField).toBeTruthy();
    const catFieldSlug = accessionField.slug;

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

    // Add a links-type field on this kind.
    linksFieldSlug = "associated-links";
    const fieldPayload = {
      new_links_field: {
        field_id: 0,
        kind_id: kind.kind_id,
        slug: linksFieldSlug,
        name: "Associated Links",
        type: "links",
        public: true,
        required: false,
        display_order: 100,
      },
    };
    const fieldResp = await page.request.post(
      `/wp-json/wp-museum/v1/${objectPostType}/fields`,
      {
        data: fieldPayload,
        headers: { "X-WP-Nonce": nonce },
      }
    );
    expect(fieldResp.ok()).toBe(true);

    // Internal target: a museum object of the same kind, with a cat ID set.
    internalTargetTitle = "Internal Target Object";
    internalTargetCatId = "FRT.99";
    const objectContent =
      `<!-- wp:wp-museum/object-meta-block /-->\n` +
      `<!-- wp:wp-museum/object-image-attachments-block /-->\n` +
      `<!-- wp:wp-museum/child-objects-block /-->\n`;
    const targetResp = await page.request.post(
      `/wp-json/wp/v2/${objectPostType}`,
      {
        data: {
          title: internalTargetTitle,
          status: "publish",
          content: objectContent,
          meta: { [catFieldSlug]: internalTargetCatId },
        },
        headers: { "X-WP-Nonce": nonce },
      }
    );
    expect(targetResp.ok()).toBe(true);
    internalTargetPostId = (await targetResp.json()).id;

    // Host object whose links field points at:
    //   1. internal museum object, no custom label  → "Title (CAT)"
    //   2. external URL with a custom label         → label verbatim
    //   3. external URL with no label               → URL
    //   4. internal museum object with custom label → label verbatim, NO cat ID
    const linksValue = [
      {
        type: "post",
        post_id: internalTargetPostId,
        url: "",
        label: "",
      },
      {
        type: "url",
        url: "https://example.com/nyt",
        label: "New York Times",
      },
      {
        type: "url",
        url: "https://example.com/no-label",
        label: "",
      },
      {
        type: "post",
        post_id: internalTargetPostId,
        url: "",
        label: "My Favorite Spectroscope",
      },
    ];
    const hostResp = await page.request.post(
      `/wp-json/wp/v2/${objectPostType}`,
      {
        data: {
          title: "Host Object",
          status: "publish",
          content: objectContent,
          meta: { [linksFieldSlug]: linksValue },
        },
        headers: { "X-WP-Nonce": nonce },
      }
    );
    expect(hostResp.ok()).toBe(true);
    hostObjectPostId = (await hostResp.json()).id;

    await page.close();
  });

  test("internal-post link renders as 'Title (CAT)'", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/?p=${hostObjectPostId}`);
    await page.waitForLoadState("domcontentloaded");

    const anchors = page.locator("ul.wpm-links li a");
    await expect(anchors).toHaveCount(4);
    await expect(anchors.nth(0)).toHaveText(
      `${internalTargetTitle} (${internalTargetCatId})`
    );
  });

  test("internal-post link with custom label renders the label verbatim (no cat ID)", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto(`/?p=${hostObjectPostId}`);
    await page.waitForLoadState("domcontentloaded");

    const anchors = page.locator("ul.wpm-links li a");
    await expect(anchors.nth(3)).toHaveText("My Favorite Spectroscope");
  });

  test("external link with custom label renders the label verbatim", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto(`/?p=${hostObjectPostId}`);
    await page.waitForLoadState("domcontentloaded");

    const anchors = page.locator("ul.wpm-links li a");
    await expect(anchors.nth(1)).toHaveText("New York Times");
    await expect(anchors.nth(1)).toHaveAttribute(
      "href",
      "https://example.com/nyt"
    );
  });

  test("external link without label falls back to the URL", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto(`/?p=${hostObjectPostId}`);
    await page.waitForLoadState("domcontentloaded");

    const anchors = page.locator("ul.wpm-links li a");
    await expect(anchors.nth(2)).toHaveText("https://example.com/no-label");
  });
});
