/**
 * Tests for issue #37: public_description rendered on the object page.
 *
 * The admin can set a per-field "Public Description" textarea; previously
 * it was stored and exposed via REST but never rendered. The customizer
 * setting `mobject_style.field_description_display` now controls how it
 * appears: none | inline | expander | tooltip (default: inline).
 *
 * This spec verifies the default (inline) mode end-to-end: a field with
 * a public_description renders <div class="wpm_field-description"> below
 * the value. The other three modes are PHP string-dispatches and are
 * left to manual QA — there's no REST-exposed way to flip the
 * mobject_style customizer option from a test.
 */

const { test, expect } = require("@playwright/test");
const { loginAsAdmin, setupMuseumTest, createSimpleObjectKind } = require("./utils");

test.describe("Field descriptions on object page (#37)", () => {
  let objectPostType;
  let descriptionText;
  let objectPostId;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await setupMuseumTest(page);
    await createSimpleObjectKind(page, "Field Description Test Obj");

    await page.goto("/wp-admin/");
    await page.waitForLoadState("domcontentloaded");
    const nonce = await page.evaluate(() => window.wpApiSettings?.nonce);

    const kindsResp = await page.request.get(
      "/wp-json/wp-museum/v1/mobject_kinds",
      { headers: { "X-WP-Nonce": nonce } }
    );
    const kind = (await kindsResp.json()).find(
      (k) => k.label === "Field Description Test Obj"
    );
    objectPostType = kind.type_name;

    // Attach a public_description to the Accession Number field.
    const fieldsResp = await page.request.get(
      `/wp-json/wp-museum/v1/${objectPostType}/fields`,
      { headers: { "X-WP-Nonce": nonce } }
    );
    const fields = await fieldsResp.json();
    const accessionField = Object.values(fields).find(
      (f) => f.name === "Accession Number"
    );
    expect(accessionField).toBeTruthy();

    descriptionText = "Unique inventory ID assigned by the museum.";
    const updatedField = {
      ...accessionField,
      public_description: descriptionText,
    };
    const fieldUpdateResp = await page.request.post(
      `/wp-json/wp-museum/v1/${objectPostType}/fields`,
      {
        data: { [accessionField.field_id]: updatedField },
        headers: { "X-WP-Nonce": nonce },
      }
    );
    expect(fieldUpdateResp.ok()).toBe(true);

    // Object with the object-meta block in its content so the renderer runs.
    const objectContent =
      `<!-- wp:wp-museum/object-meta-block /-->\n` +
      `<!-- wp:wp-museum/object-image-attachments-block /-->\n` +
      `<!-- wp:wp-museum/child-objects-block /-->\n`;
    const objResp = await page.request.post(
      `/wp-json/wp/v2/${objectPostType}`,
      {
        data: {
          title: "Test Object With Description",
          status: "publish",
          content: objectContent,
          meta: { [accessionField.slug]: "T.123" },
        },
        headers: { "X-WP-Nonce": nonce },
      }
    );
    expect(objResp.ok()).toBe(true);
    objectPostId = (await objResp.json()).id;

    await page.close();
  });

  test("inline mode (default): description renders below the field value", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto(`/?p=${objectPostId}`);
    await page.waitForLoadState("domcontentloaded");

    const description = page.locator("div.wpm_field-description");
    await expect(description).toHaveCount(1);
    await expect(description).toHaveText(descriptionText);
  });

  test("fields without a public_description don't render an empty container", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto(`/?p=${objectPostId}`);
    await page.waitForLoadState("domcontentloaded");

    // Three fields total; only Accession Number got a description.
    const descriptions = page.locator(
      "div.wpm_field-description, details.wpm_field-description"
    );
    await expect(descriptions).toHaveCount(1);
  });
});
