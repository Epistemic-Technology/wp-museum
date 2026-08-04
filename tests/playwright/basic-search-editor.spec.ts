/**
 * Regression test for the basic-search block's editor search.
 *
 * onSearch compared incoming parameters against `currentSearchParams`, an
 * identifier the editor component never declared (the frontend component
 * holds it as state; this one did not). ES modules are strict, so searching
 * with any changed non-page parameter threw:
 *
 *   ReferenceError: currentSearchParams is not defined
 *
 * The other half of #131 was a prop mismatch: PaginatedObjectList was handed
 * `objects` where it expects `mObjects`, so the list always received
 * undefined and the preview stayed empty however many objects matched. The
 * second test covers that by searching for objects that do exist.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/131
 */

import { test, expect } from "@playwright/test";
import {
  loginAsAdmin,
  setupMuseumTest,
  createSimpleObjectKind,
  dismissEditorModals,
} from "./utils";
import type { ObjectKind } from "../../src/types";

const RUN_ID = `${Date.now()}`;
// A single distinctive token, so the WP `s` search matches these objects and
// nothing else in the test database.
const MATCH_TOKEN = `astrolabe${RUN_ID}`;
const OBJECT_COUNT = 3;

test.describe("Basic Search block in the editor (#131)", () => {
  let pageId: number;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await setupMuseumTest(page);
    // A kind must exist for the search endpoint to have anything to query.
    await createSimpleObjectKind(page, `BSearch Obj ${RUN_ID}`);

    await page.goto("/wp-admin/");
    await page.waitForLoadState("domcontentloaded");
    const nonce: string = await page.evaluate(
      () => (window as any).wpApiSettings?.nonce,
    );
    const headers = { "X-WP-Nonce": nonce };

    const kindsResp = await page.request.get(
      "/wp-json/wp-museum/v1/mobject_kinds",
      { headers },
    );
    const kinds: ObjectKind[] = await kindsResp.json();
    const objectPostType = kinds[kinds.length - 1].type_name;

    for (let i = 1; i <= OBJECT_COUNT; i++) {
      const objectResp = await page.request.post(
        `/wp-json/wp/v2/${objectPostType}`,
        {
          data: {
            title: `${MATCH_TOKEN} ${i}`,
            status: "publish",
          },
          headers,
        },
      );
      expect(objectResp.ok()).toBeTruthy();
    }

    const pageResp = await page.request.post("/wp-json/wp/v2/pages", {
      data: {
        title: `Basic Search Editor Test ${RUN_ID}`,
        status: "publish",
        content: `<!-- wp:wp-museum/basic-search /-->`,
      },
      headers,
    });
    pageId = (await pageResp.json()).id;

    await page.close();
  });

  test("searching in the editor does not throw a ReferenceError", async ({
    page,
  }) => {
    // beforeAll authenticated a different context; wp-admin needs this one
    // logged in too. Log in before attaching listeners so unrelated admin
    // console noise from the login round trip is not collected.
    await loginAsAdmin(page);

    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    await page.goto(`/wp-admin/post.php?post=${pageId}&action=edit`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector(".block-editor-writing-flow", { timeout: 30000 });

    // The welcome-guide overlay swallows pointer events on a fresh install.
    await dismissEditorModals(page);

    const searchInput = page.locator("#wpm-embedded-search-input");
    await expect(searchInput).toBeVisible({ timeout: 30000 });

    // Change a non-page parameter — the branch that read the undeclared
    // identifier — and run the search.
    await searchInput.fill(`sextant ${RUN_ID}`);
    await page
      .locator("button.wpm-embedded-search-button.is-primary")
      .first()
      .click();

    // Give the search handler and its REST round trip time to run.
    await page.waitForTimeout(4000);

    const referenceErrors = [...pageErrors, ...consoleErrors].filter((text) =>
      text.includes("currentSearchParams"),
    );
    expect(referenceErrors).toEqual([]);

    // The search box must still be interactive; a throw inside the React
    // event handler would have left the editor's error boundary in place.
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveValue(`sextant ${RUN_ID}`);
  });

  test("the editor preview lists matching objects", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto(`/wp-admin/post.php?post=${pageId}&action=edit`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector(".block-editor-writing-flow", { timeout: 30000 });
    await dismissEditorModals(page);

    const searchInput = page.locator("#wpm-embedded-search-input");
    await expect(searchInput).toBeVisible({ timeout: 30000 });

    await searchInput.fill(MATCH_TOKEN);
    await page
      .locator("button.wpm-embedded-search-button.is-primary")
      .first()
      .click();

    // PaginatedObjectList renders ObjectList, which emits one .object-row per
    // result inside .search-results.
    const resultRows = page.locator(".search-results .object-row");
    await expect(resultRows).toHaveCount(OBJECT_COUNT, { timeout: 30000 });
    await expect(resultRows.first()).toContainText(MATCH_TOKEN);
  });
});
