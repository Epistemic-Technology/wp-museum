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
 * At the time this was written the block also rendered no results, because
 * PaginatedObjectList was handed `objects` where it expects `mObjects` (the
 * other half of #131, since fixed under #147). This test still asserts on the
 * absence of the crash rather than on rendered results.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/131
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/147
 */

import { test, expect } from "@playwright/test";
import {
  loginAsAdmin,
  setupMuseumTest,
  createSimpleObjectKind,
  dismissEditorModals,
} from "./utils";

const RUN_ID = `${Date.now()}`;

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

    const pageResp = await page.request.post("/wp-json/wp/v2/pages", {
      data: {
        title: `Basic Search Editor Test ${RUN_ID}`,
        status: "publish",
        content: `<!-- wp:wp-museum/basic-search /-->`,
      },
      headers: { "X-WP-Nonce": nonce },
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
});
