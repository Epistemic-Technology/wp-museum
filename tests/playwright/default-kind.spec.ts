/**
 * Tests for issue #4: bundled default kind on first activation.
 *
 * A fresh install used to land the admin on an empty Museum Objects
 * screen, which made the plugin feel broken until they manually
 * configured a kind. The activation hook now reads
 * `data/default-kind.json` and installs a starter "Object" kind with
 * common fields (Catalogue Number, Description, Location, Date,
 * Date Examined, Related) when no kinds exist yet.
 *
 * The installer is idempotent — it skips if any kind is already
 * present, so re-activating the plugin doesn't duplicate or stomp
 * existing data.
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin, setupMuseumTest } from "./utils";
import type { MObjectField, ObjectKind } from "../../src/types";

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
    const nonce: string = await page.evaluate(
      () => (window as any).wpApiSettings?.nonce
    );

    const resp = await page.request.get(
      "/wp-json/wp-museum/v1/mobject_kinds",
      { headers: { "X-WP-Nonce": nonce } }
    );
    expect(resp.ok()).toBe(true);
    const kinds: ObjectKind[] = await resp.json();

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
    const nonce: string = await page.evaluate(
      () => (window as any).wpApiSettings?.nonce
    );

    const kindsResp = await page.request.get(
      "/wp-json/wp-museum/v1/mobject_kinds",
      { headers: { "X-WP-Nonce": nonce } }
    );
    const kind = ((await kindsResp.json()) as ObjectKind[]).find(
      (k) => k.label === "Object"
    );
    expect(kind).toBeTruthy();

    const fieldsResp = await page.request.get(
      `/wp-json/wp-museum/v1/${kind.type_name}/fields`,
      { headers: { "X-WP-Nonce": nonce } }
    );
    const fields: MObjectField[] = Object.values(await fieldsResp.json());
    const byName = Object.fromEntries(fields.map((f) => [f.name, f]));

    expect(byName["Catalogue Number"]).toBeTruthy();
    expect(byName["Catalogue Number"].type).toBe("plain");
    expect(byName["Catalogue Number"].required).toBe(true);

    expect(byName["Description"]?.type).toBe("rich");
    expect(byName["Location"]?.type).toBe("plain");
    expect(byName["Date"]?.type).toBe("date");
    expect(byName["Date Examined"]?.type).toBe("date");
    expect(byName["Related"]?.type).toBe("links");

    // cat_field_id on the kind should point at Catalogue Number.
    expect(byName["Catalogue Number"].field_id).toBe(kind.cat_field_id);
  });
});
