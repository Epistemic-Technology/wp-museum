/**
 * End-to-end coverage for collection-objects pagination.
 *
 * Nothing previously exercised the paginated path: the existing
 * collection-objects specs cover resultsPerPage=-1 (a single unpaginated
 * page) only. These tests drive a collection large enough to span two pages
 * and assert the control renders, the first page is capped, and page two
 * holds the remainder.
 *
 * NOTE: these do NOT distinguish the #137 fix. That defect —
 *
 *   setTotalPages( response.headers.get( 'X-WP-TotalPages' || 0 ) ... )
 *
 * — reads correctly in practice, because 'X-WP-TotalPages' || 0 evaluates to
 * the truthy header name, so get() gets the right argument. The misplaced
 * fallback matters only when the header is absent, where the old code stored
 * null and the fixed code stores 0; both are falsy for totalPages > 1. The
 * fix is a correctness and typing cleanup rather than a behaviour change, and
 * it is verified by these tests continuing to pass.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/137
 */

import { test, expect } from "@playwright/test";
import { setupMuseumTest, createSimpleObjectKind } from "./utils";
import type { ObjectKind } from "../../src/types";

// A collection's objects are matched through its taxonomy term, and terms are
// keyed by title. Re-running the suite against a dirty database would
// otherwise create a second collection post whose title-matched term already
// belongs to the first, leaving the new collection empty.
const RUN_ID = `${Date.now()}`;
const COLLECTION_TITLE = `CObj Paging Collection ${RUN_ID}`;

const RESULTS_PER_PAGE = 20;
const OBJECT_COUNT = 25;

test.describe("Collection Objects pagination (#137)", () => {
  let collectionId: number;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await setupMuseumTest(page);
    await createSimpleObjectKind(page, `CObj Paging Obj ${RUN_ID}`);

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

    const collResp = await page.request.post("/wp-json/wp/v2/wpm_collection", {
      data: {
        title: COLLECTION_TITLE,
        status: "publish",
        content: `<!-- wp:wp-museum/collection-objects /-->`,
      },
      headers,
    });
    collectionId = (await collResp.json()).id;

    const termsResp = await page.request.get(
      "/wp-json/wp/v2/wpm_collection_tax?per_page=100",
      { headers },
    );
    const terms = await termsResp.json();
    let termId: number | null = Array.isArray(terms)
      ? (terms.find((t: { name: string; id: number }) => t.name === COLLECTION_TITLE)
          ?.id ?? null)
      : null;
    if (!termId) {
      const newTermResp = await page.request.post(
        "/wp-json/wp/v2/wpm_collection_tax",
        { data: { name: COLLECTION_TITLE }, headers },
      );
      expect(newTermResp.ok()).toBeTruthy();
      termId = (await newTermResp.json()).id;
    }

    // 25 objects at the default 20 per page yields exactly two pages.
    for (let i = 1; i <= OBJECT_COUNT; i++) {
      await page.request.post(`/wp-json/wp/v2/${objectPostType}`, {
        data: {
          title: `Paging Obj ${RUN_ID} ${String(i).padStart(2, "0")}`,
          status: "publish",
          wpm_collection_tax: [termId],
        },
        headers,
      });
    }

    await page.close();
  });

  /** Open the collection page and wait for the grid to finish loading. */
  const openCollection = async (page: import("@playwright/test").Page) => {
    await page.goto(`/?p=${collectionId}`);
    await page.waitForLoadState("domcontentloaded");
    const block = page.locator(".wpm-collection-objects-block");
    await expect(block).toHaveCount(1);
    // The grid appears only once the REST search resolves.
    await expect(block.locator(".wpm-object-grid")).toBeVisible({
      timeout: 30000,
    });
    return block;
  };

  test("renders a pagination control when the collection spans multiple pages", async ({
    page,
  }) => {
    const block = await openCollection(page);
    // withPagination renders the control both above and below the grid.
    await expect(block.locator(".pagination").first()).toBeVisible();
    // Two pages for 25 objects at 20 per page.
    await expect(
      block.locator(".pagination button[aria-label='Go to page 2']").first(),
    ).toBeVisible();
    await expect(
      block.locator(".pagination button[aria-label='Go to page 3']"),
    ).toHaveCount(0);
  });

  test("shows only the first page of objects", async ({ page }) => {
    const block = await openCollection(page);
    const shown = await block.locator(".object-grid-box-wrapper").count();
    expect(shown).toBe(RESULTS_PER_PAGE);
  });

  test("navigating to page two shows the remaining objects", async ({
    page,
  }) => {
    const block = await openCollection(page);
    const firstPageTitles = await block
      .locator(".object-grid-caption-div h3")
      .allInnerTexts();

    await block
      .locator(".pagination button[aria-label='Go to page 2']")
      .first()
      .click();

    // Page two holds the remainder: 25 - 20 = 5.
    await expect
      .poll(async () => block.locator(".object-grid-box-wrapper").count(), {
        timeout: 30000,
      })
      .toBe(OBJECT_COUNT - RESULTS_PER_PAGE);

    const secondPageTitles = await block
      .locator(".object-grid-caption-div h3")
      .allInnerTexts();
    expect(secondPageTitles).not.toEqual(firstPageTitles);
    for (const title of secondPageTitles) {
      expect(firstPageTitles).not.toContain(title);
    }
  });
});
