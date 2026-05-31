/**
 * Tests for issue #4: bundled default kind on first activation.
 *
 * A fresh install used to land the admin on an empty Museum Objects
 * screen, which made the plugin feel broken until they manually
 * configured a kind. The activation hook now reads
 * `data/default-kind.json` and installs a starter "Object" kind with
 * common fields (Accession Number, Description, Materials, Date,
 * Dimensions) when no kinds exist yet.
 *
 * The installer is idempotent — it skips if any kind is already
 * present, so re-activating the plugin doesn't duplicate or stomp
 * existing data.
 */

const { test, expect } = require("@playwright/test");
const { loginAsAdmin, setupMuseumTest } = require("./utils");

test.describe("Default kind on activation (#4)", () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await setupMuseumTest(page);
    await page.close();
  });

  test("a fresh install ships an 'Object' kind", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/wp-admin/");
    await page.waitForLoadState("domcontentloaded");
    const nonce = await page.evaluate(() => window.wpApiSettings?.nonce);

    const resp = await page.request.get(
      "/wp-json/wp-museum/v1/mobject_kinds",
      { headers: { "X-WP-Nonce": nonce } }
    );
    expect(resp.ok()).toBe(true);
    const kinds = await resp.json();

    const defaultKind = kinds.find((k) => k.label === "Object");
    expect(defaultKind).toBeTruthy();
    expect(defaultKind.label_plural).toBe("Objects");
    expect(defaultKind.cat_field_id).toBeGreaterThan(0);
  });

  test("default kind has the expected fields with the right types", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/wp-admin/");
    await page.waitForLoadState("domcontentloaded");
    const nonce = await page.evaluate(() => window.wpApiSettings?.nonce);

    const kindsResp = await page.request.get(
      "/wp-json/wp-museum/v1/mobject_kinds",
      { headers: { "X-WP-Nonce": nonce } }
    );
    const kind = (await kindsResp.json()).find((k) => k.label === "Object");
    expect(kind).toBeTruthy();

    const fieldsResp = await page.request.get(
      `/wp-json/wp-museum/v1/${kind.type_name}/fields`,
      { headers: { "X-WP-Nonce": nonce } }
    );
    const fields = Object.values(await fieldsResp.json());
    const byName = Object.fromEntries(fields.map((f) => [f.name, f]));

    expect(byName["Accession Number"]).toBeTruthy();
    expect(byName["Accession Number"].type).toBe("plain");
    expect(byName["Accession Number"].required).toBe(true);

    expect(byName["Description"]).toBeTruthy();
    expect(byName["Description"].type).toBe("rich");

    expect(byName["Materials"]?.type).toBe("plain");
    expect(byName["Date"]?.type).toBe("date");
    expect(byName["Dimensions"]?.type).toBe("measure");

    // cat_field_id on the kind should point at Accession Number.
    expect(byName["Accession Number"].field_id).toBe(kind.cat_field_id);
  });
});
