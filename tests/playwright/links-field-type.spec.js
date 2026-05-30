/**
 * Tests for issue #115: the new "links" field type.
 *
 * A links field holds an ordered list of mixed targets:
 *   - internal posts/pages/museum objects: { type: 'post', post_id, label? }
 *   - external URLs: { type: 'url', url, label }
 *
 * This spec exercises the data path end-to-end: define a "links" field
 * on a kind via REST, create an object whose meta carries an items list,
 * then render the object page and assert the public renderer emits the
 * expected `ul.wpm-links` markup with anchors.
 *
 * The editor UI (LinkControl popover) is left to manual / future testing
 * — driving the popover from Playwright is fragile, and the storage
 * shape is what matters for downstream consumers.
 */

const { test, expect } = require("@playwright/test");
const { loginAsAdmin, setupMuseumTest, createSimpleObjectKind } = require("./utils");

test.describe("Links field type (#115)", () => {
  let objectPostType;
  let linksFieldSlug;
  let internalTargetPostId;
  let internalTargetTitle;
  let internalTargetLink;
  let objectPostId;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await setupMuseumTest(page);
    await createSimpleObjectKind(page, "Links Field Test Obj");

    await page.goto("/wp-admin/");
    await page.waitForLoadState("domcontentloaded");
    const nonce = await page.evaluate(() => window.wpApiSettings?.nonce);

    const kindsResp = await page.request.get(
      "/wp-json/wp-museum/v1/mobject_kinds",
      { headers: { "X-WP-Nonce": nonce } }
    );
    const kinds = await kindsResp.json();
    const kind = kinds.find((k) => k.label === "Links Field Test Obj");
    objectPostType = kind.type_name;

    // Add a links-type field to the kind via the fields REST endpoint.
    linksFieldSlug = "associated-links";
    const fieldsPayload = {
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
        data: fieldsPayload,
        headers: { "X-WP-Nonce": nonce },
      }
    );
    expect(fieldResp.ok()).toBe(true);

    // Internal link target: a regular WP page.
    internalTargetTitle = "Links Field Internal Target";
    const targetResp = await page.request.post("/wp-json/wp/v2/pages", {
      data: { title: internalTargetTitle, status: "publish" },
      headers: { "X-WP-Nonce": nonce },
    });
    const targetData = await targetResp.json();
    internalTargetPostId = targetData.id;
    internalTargetLink = targetData.link;

    // Create the museum object with a mixed links field value.
    const linksValue = [
      {
        type: "post",
        post_id: internalTargetPostId,
        url: targetData.link,
        label: "", // empty label — renderer should fall back to post title
      },
      {
        type: "url",
        url: "https://example.com/external",
        label: "External example",
      },
      {
        type: "url",
        url: "https://example.com/no-label",
        label: "", // no label — renderer should fall back to the URL itself
      },
    ];
    // Mirror the editor-time post template so the object-meta block actually
    // renders on the frontend; REST creation bypasses the post-type template.
    const objectContent =
      `<!-- wp:wp-museum/object-meta-block /-->\n` +
      `<!-- wp:wp-museum/object-image-attachments-block /-->\n` +
      `<!-- wp:wp-museum/child-objects-block /-->\n`;

    const objResp = await page.request.post(
      `/wp-json/wp/v2/${objectPostType}`,
      {
        data: {
          title: "Links Field Test Object",
          status: "publish",
          content: objectContent,
          meta: { [linksFieldSlug]: linksValue },
        },
        headers: { "X-WP-Nonce": nonce },
      }
    );
    expect(objResp.ok()).toBe(true);
    objectPostId = (await objResp.json()).id;

    await page.close();
  });

  test("REST: links field round-trips with mixed items", async ({ page }) => {
    await loginAsAdmin(page);

    const resp = await page.request.get(
      `/wp-json/wp/v2/${objectPostType}/${objectPostId}`
    );
    const body = await resp.json();
    const stored = body.meta?.[linksFieldSlug];
    expect(Array.isArray(stored)).toBe(true);
    expect(stored.length).toBe(3);
    expect(stored[0].type).toBe("post");
    expect(stored[0].post_id).toBe(internalTargetPostId);
    expect(stored[1].type).toBe("url");
    expect(stored[1].url).toBe("https://example.com/external");
    expect(stored[1].label).toBe("External example");
  });

  test("Frontend: object page renders ul.wpm-links with resolved anchors", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    await page.goto(`/?p=${objectPostId}`);
    await page.waitForLoadState("domcontentloaded");

    const list = page.locator("ul.wpm-links");
    await expect(list).toHaveCount(1);
    const anchors = list.locator("li a");
    await expect(anchors).toHaveCount(3);

    // Internal link: href resolves to the target page's current permalink
    // (not the stored snapshot), and label falls back to post title since
    // the stored label was empty.
    const internalAnchor = anchors.nth(0);
    const internalHref = await internalAnchor.getAttribute("href");
    expect(internalHref).toBeTruthy();
    const internalUrl = new URL(internalHref, page.url());
    const targetUrl = new URL(internalTargetLink);
    expect(internalUrl.pathname.replace(/\/$/, "")).toBe(
      targetUrl.pathname.replace(/\/$/, "")
    );
    await expect(internalAnchor).toHaveText(internalTargetTitle);

    // External link with explicit label.
    await expect(anchors.nth(1)).toHaveAttribute(
      "href",
      "https://example.com/external"
    );
    await expect(anchors.nth(1)).toHaveText("External example");

    // External link with no label — label falls back to the URL.
    await expect(anchors.nth(2)).toHaveAttribute(
      "href",
      "https://example.com/no-label"
    );
    await expect(anchors.nth(2)).toHaveText("https://example.com/no-label");
  });
});
