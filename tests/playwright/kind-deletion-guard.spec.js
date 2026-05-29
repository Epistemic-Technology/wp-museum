/**
 * Tests for issue #52: kind deletion is blocked when posts still use it.
 *
 * Previously `delete_from_db()` removed the kind row and its fields with
 * no check on associated posts, leaving those posts orphaned: their
 * post_type stopped being registered (the registration is driven by the
 * kinds table) and they became inaccessible through admin UI. The fix
 * makes the REST update_items() endpoint return 409 with a post-count
 * payload when the admin tries to delete a kind that still has posts.
 */

const { test, expect } = require("@playwright/test");
const { loginAsAdmin, setupMuseumTest, createSimpleObjectKind } = require("./utils");

test.describe("Kind deletion guard (#52)", () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await setupMuseumTest(page);
    await page.close();
  });

  test("REST: deletion is blocked with 409 while posts still use the kind", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    await createSimpleObjectKind(page, "Guard Test With Posts");
    await page.goto("/wp-admin/");
    await page.waitForLoadState("domcontentloaded");
    const nonce = await page.evaluate(() => window.wpApiSettings?.nonce);

    const kindsResp = await page.request.get(
      "/wp-json/wp-museum/v1/mobject_kinds",
      { headers: { "X-WP-Nonce": nonce } }
    );
    const kinds = await kindsResp.json();
    const targetKind = kinds.find((k) => k.label === "Guard Test With Posts");
    expect(targetKind).toBeTruthy();

    const objResp = await page.request.post(
      `/wp-json/wp/v2/${targetKind.type_name}`,
      {
        data: { title: "Object Blocking Deletion", status: "publish" },
        headers: { "X-WP-Nonce": nonce },
      }
    );
    expect(objResp.ok()).toBe(true);
    const objectId = (await objResp.json()).id;

    // Attempt to delete the kind via the same payload shape the React admin
    // uses: POST the full kinds array with delete:true on the target.
    const payload = kinds.map((k) =>
      k.kind_id === targetKind.kind_id ? { ...k, delete: true } : k
    );
    const deleteResp = await page.request.post(
      "/wp-json/wp-museum/v1/mobject_kinds",
      {
        data: payload,
        headers: { "X-WP-Nonce": nonce },
      }
    );

    expect(deleteResp.status()).toBe(409);
    const errorBody = await deleteResp.json();
    expect(errorBody.code).toBe("rest_kind_has_posts");
    expect(errorBody.data.post_count).toBe(1);
    expect(errorBody.data.kind_id).toBe(targetKind.kind_id);

    // The kind must still exist.
    const recheckResp = await page.request.get(
      "/wp-json/wp-museum/v1/mobject_kinds",
      { headers: { "X-WP-Nonce": nonce } }
    );
    const recheckKinds = await recheckResp.json();
    expect(
      recheckKinds.some((k) => k.kind_id === targetKind.kind_id)
    ).toBe(true);

    // Permanently delete the post; deletion should now succeed.
    const trashResp = await page.request.delete(
      `/wp-json/wp/v2/${targetKind.type_name}/${objectId}?force=true`,
      { headers: { "X-WP-Nonce": nonce } }
    );
    expect(trashResp.ok()).toBe(true);

    const retryPayload = kinds.map((k) =>
      k.kind_id === targetKind.kind_id ? { ...k, delete: true } : k
    );
    const retryResp = await page.request.post(
      "/wp-json/wp-museum/v1/mobject_kinds",
      {
        data: retryPayload,
        headers: { "X-WP-Nonce": nonce },
      }
    );
    expect(retryResp.status()).toBe(200);

    const afterResp = await page.request.get(
      "/wp-json/wp-museum/v1/mobject_kinds",
      { headers: { "X-WP-Nonce": nonce } }
    );
    const afterKinds = await afterResp.json();
    expect(
      afterKinds.some((k) => k.kind_id === targetKind.kind_id)
    ).toBe(false);
  });

});
