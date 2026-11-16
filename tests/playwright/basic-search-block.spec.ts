/**
 * The basic-search block on the public site.
 *
 * The block is rendered in PHP: a GET form whose `searchText` and `onlyTitle`
 * fields come back as the query string, and a results grid built on the
 * server. Each submit is a real navigation, so the tests wait for the URL
 * rather than for a REST response.
 */

import { test, expect } from "@playwright/test";
import {
  setupMuseumTest,
  createSimpleObjectKind,
  createMuseumObject,
  createPageWithBlock,
  postTypeFromSlug,
} from "./utils";

const SEARCH_INPUT = ".wpm-basic-search-block .main-input-area input[type='text']";
const SEARCH_BUTTON = ".wpm-basic-search-block .wpm-embedded-search-button.is-primary";
const TITLE_TOGGLE =
  ".wpm-basic-search-block .wpm-embedded-search-title-toggle input[type='checkbox']";
const RESULT = ".wpm-basic-search-block .object-grid-box-wrapper";

async function submitSearch(page: import("@playwright/test").Page, term: string) {
  await page.fill(SEARCH_INPUT, term);
  await page.click(SEARCH_BUTTON);
  await page.waitForURL(new RegExp(`searchText=${encodeURIComponent(term).replace(/%20/g, "(\\+|%20)")}`));
  await page.waitForLoadState("domcontentloaded");
}

test.describe("Basic Search Block", () => {
  test.beforeEach(async ({ page }) => {
    await setupMuseumTest(page);
  });

  test("renders a GET form with no script and no results", async ({ page }) => {
    const pageUrl = await createPageWithBlock(
      page,
      "Test Search Page",
      "Basic Search",
      ".wp-block-wp-museum-basic-search",
    );

    await page.goto(pageUrl);
    await page.waitForLoadState("domcontentloaded");

    const form = page.locator(".wpm-basic-search-block form.wpm-embedded-search-form");
    await expect(form).toBeVisible();
    await expect(form).toHaveAttribute("method", "get");
    await expect(page.locator(SEARCH_INPUT)).toBeVisible();
    await expect(page.locator(SEARCH_BUTTON)).toBeVisible();
    await expect(page.locator(TITLE_TOGGLE)).toBeChecked();
    await expect(page.locator(RESULT)).toHaveCount(0);

    // No React mount point and none of the old view-script stack.
    await expect(page.locator(".wpm-basic-search-block-frontend")).toHaveCount(0);
    const scripts = await page.locator("script[src]").evaluateAll((nodes) =>
      nodes.map((n) => (n as HTMLScriptElement).src),
    );
    expect(scripts.filter((src) => /basic-search\/front|components\.min\.js/.test(src))).toEqual([]);
  });

  test("search with 'Only search titles' checked (default)", async ({ page }) => {
    const kindSlug = await createSimpleObjectKind(page, "Scientific Instrument");
    const postType = postTypeFromSlug(kindSlug);

    await createMuseumObject(page, postType, {
      title: "Persian Astrolabe",
      content:
        "An exquisite 18th century Persian astrolabe with intricate Islamic geometric patterns. Made of brass with silver inlay by an unknown Persian craftsman.",
      fields: {
        manufacturer: "Unknown Persian craftsman",
        materials: "Brass with silver inlay",
        "accession-number": "2024.SCI.011",
      },
    });

    await createMuseumObject(page, postType, {
      title: "Victorian Microscope",
      content:
        "An elegant Victorian-era compound microscope featuring brass construction. Manufactured by Ernst Leitz in 1885.",
      fields: {
        manufacturer: "Ernst Leitz",
        materials: "Brass, iron, glass, mahogany",
        "accession-number": "2024.SCI.002",
      },
    });

    await createMuseumObject(page, postType, {
      title: "Surveyor's Compass",
      content:
        "A precision surveyor's compass with vernier scale. Made by W. & L.E. Gurley with brass, steel, and glass materials.",
      fields: {
        manufacturer: "W. & L.E. Gurley",
        materials: "Brass, steel, glass",
        "accession-number": "2024.SCI.010",
      },
    });

    const pageUrl = await createPageWithBlock(
      page,
      "Search Test Page",
      "Basic Search",
      ".wp-block-wp-museum-basic-search",
    );

    await page.goto(pageUrl);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(TITLE_TOGGLE)).toBeChecked();

    // "Persian" is in a title.
    await submitSearch(page, "Persian");
    expect(await page.locator(RESULT).count()).toBeGreaterThan(0);
    await expect(
      page.locator(".object-grid-caption-div h3:has-text('Persian Astrolabe')"),
    ).toBeVisible();
    // The search is in the URL and the form keeps the term and the toggle.
    expect(page.url()).toContain("searchText=Persian");
    await expect(page.locator(SEARCH_INPUT)).toHaveValue("Persian");
    await expect(page.locator(TITLE_TOGGLE)).toBeChecked();

    // "inlay" is only in content and fields, so a title-only search finds nothing.
    await submitSearch(page, "inlay");
    await expect(page.locator(RESULT)).toHaveCount(0);
    await expect(page.locator(".wpm-basic-search-block .wpm-no-results")).toBeVisible();
  });

  test("search with 'Only search titles' unchecked", async ({ page }) => {
    const kindSlug = await createSimpleObjectKind(page, "Scientific Instrument");
    const postType = postTypeFromSlug(kindSlug);

    await page.goto(`/wp-admin/edit.php?post_type=${postType}`);
    const hasObjects = await page
      .locator(".no-items")
      .isHidden({ timeout: 3000 })
      .catch(() => false);

    if (!hasObjects) {
      await createMuseumObject(page, postType, {
        title: "Persian Astrolabe",
        content:
          "An exquisite 18th century Persian astrolabe with intricate Islamic geometric patterns. Made of brass with silver inlay.",
      });
      await createMuseumObject(page, postType, {
        title: "Victorian Microscope",
        content:
          "An elegant Victorian-era compound microscope featuring brass construction. Manufactured by Ernst Leitz.",
      });
      await createMuseumObject(page, postType, {
        title: "Surveyor's Compass",
        content:
          "A precision surveyor's compass. Made with brass, steel, and glass materials.",
      });
    }

    const pageUrl = await createPageWithBlock(
      page,
      "Full Search Test Page",
      "Basic Search",
      ".wp-block-wp-museum-basic-search",
    );

    await page.goto(pageUrl);
    await page.waitForLoadState("domcontentloaded");

    await page.locator(TITLE_TOGGLE).uncheck();
    await expect(page.locator(TITLE_TOGGLE)).not.toBeChecked();

    // "brass" is in several descriptions.
    await submitSearch(page, "brass");
    expect(await page.locator(RESULT).count()).toBeGreaterThan(0);
    // The unchecked toggle survives the round trip.
    await expect(page.locator(TITLE_TOGGLE)).not.toBeChecked();

    await submitSearch(page, "Ernst Leitz");
    await expect(
      page.locator(".object-grid-caption-div h3:has-text('Victorian Microscope')"),
    ).toBeVisible();

    await submitSearch(page, "Islamic");
    await expect(
      page.locator(".object-grid-caption-div h3:has-text('Persian Astrolabe')"),
    ).toBeVisible();
  });

  test("search with Enter key", async ({ page }) => {
    const pageUrl = await createPageWithBlock(
      page,
      "Enter Key Search Test",
      "Basic Search",
      ".wp-block-wp-museum-basic-search",
    );

    await page.goto(pageUrl);
    await page.waitForLoadState("domcontentloaded");

    await page.fill(SEARCH_INPUT, "Victorian");
    await page.press(SEARCH_INPUT, "Enter");
    await page.waitForURL(/searchText=Victorian/);

    expect(await page.locator(RESULT).count()).toBeGreaterThan(0);
  });

  test("empty search returns no results", async ({ page }) => {
    const pageUrl = await createPageWithBlock(
      page,
      "Empty Search Test",
      "Basic Search",
      ".wp-block-wp-museum-basic-search",
    );

    await page.goto(pageUrl);
    await page.waitForLoadState("domcontentloaded");

    await page.click(SEARCH_BUTTON);
    await page.waitForURL(/searchText=/);

    await expect(page.locator(RESULT)).toHaveCount(0);
    await expect(page.locator(".wpm-basic-search-block .wpm-no-results")).toHaveCount(0);
  });

  test("a results page is a shareable URL", async ({ page }) => {
    const pageUrl = await createPageWithBlock(
      page,
      "Direct Link Search Test",
      "Basic Search",
      ".wp-block-wp-museum-basic-search",
    );

    const url = new URL(pageUrl);
    url.searchParams.set("searchText", "Microscope");
    url.searchParams.set("onlyTitle", "1");
    await page.goto(url.toString());
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator(SEARCH_INPUT)).toHaveValue("Microscope");
    await expect(
      page.locator(".object-grid-caption-div h3:has-text('Victorian Microscope')"),
    ).toBeVisible();
    // Object links are in the HTML, not fetched afterwards.
    const href = await page
      .locator(`${RESULT} a`)
      .first()
      .getAttribute("href");
    expect(href).toBeTruthy();
  });
});
