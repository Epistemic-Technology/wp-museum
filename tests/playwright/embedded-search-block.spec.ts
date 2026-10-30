import { test, expect, type Page } from "@playwright/test";
import { setupMuseumTest } from "./utils";

/**
 * The embedded-search block is rendered in PHP as a GET form. These tests
 * create the pages through the REST API (no editor round trip) and check
 * what the form sends to the search page.
 */

async function restNonce(page: Page): Promise<string> {
  const response = await page.request.get(
    "/wp-admin/admin-ajax.php?action=rest-nonce",
  );
  return (await response.text()).trim();
}

async function createPublishedPage(
  page: Page,
  title: string,
  content: string,
): Promise<string> {
  const nonce = await restNonce(page);
  const response = await page.request.post("/wp-json/wp/v2/pages", {
    headers: { "X-WP-Nonce": nonce },
    data: { title, content, status: "publish" },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const body = await response.json();
  return body.link as string;
}

test.describe("Embedded Search Block (PHP rendered)", () => {
  let searchPageUrl: string;
  let embeddedPageUrl: string;

  test.beforeEach(async ({ page }) => {
    await setupMuseumTest(page);
    searchPageUrl = await createPublishedPage(
      page,
      "Embedded target search page",
      '<!-- wp:wp-museum/basic-search {"acceptGETRequest":true} /-->',
    );
    embeddedPageUrl = await createPublishedPage(
      page,
      "Embedded search page",
      `<!-- wp:wp-museum/embedded-search ${JSON.stringify({
        searchPageURL: searchPageUrl,
        advancedSearchURL: "https://example.org/advanced/",
        showTitleToggle: true,
        headerText: "Search the Collection",
      })} /-->`,
    );
  });

  test("renders a form without a view script", async ({ page }) => {
    await page.goto(embeddedPageUrl);
    await page.waitForLoadState("domcontentloaded");

    const form = page.locator("form.wpm-embedded-search-form");
    await expect(form).toBeVisible();
    await expect(form).toHaveAttribute("method", "get");
    await expect(form).toHaveAttribute("action", searchPageUrl);
    await expect(page.locator(".wpm-embedded-search-block h2")).toHaveText(
      "Search the Collection",
    );
    await expect(
      page.locator(".wpm-embedded-search-advanced-search-link a"),
    ).toHaveAttribute("href", "https://example.org/advanced/");

    // The block no longer ships a frontend script.
    await expect(
      page.locator('script[src*="embedded-search/front"]'),
    ).toHaveCount(0);
    await expect(page.locator(".wpm-embedded-search-block-frontend")).toHaveCount(0);
  });

  test("submits the search text and title-only flag to the search page", async ({
    page,
  }) => {
    await page.goto(embeddedPageUrl);
    await page.fill(
      ".wpm-embedded-search-form .main-input-area input[type='text']",
      "brass",
    );
    await page.click(".wpm-embedded-search-form .wpm-embedded-search-button");
    await page.waitForLoadState("domcontentloaded");

    const url = new URL(page.url());
    expect(url.origin + url.pathname).toBe(
      new URL(searchPageUrl).origin + new URL(searchPageUrl).pathname,
    );
    expect(url.searchParams.get("searchText")).toBe("brass");
    // The form sends a hidden onlyTitle=0 followed by the checkbox's
    // onlyTitle=1, and PHP keeps the last one; read it the same way.
    expect(url.searchParams.getAll("onlyTitle").at(-1)).toBe("1");

    // The basic-search block on the target page picks the term up.
    await expect(
      page.locator(".wpm-basic-search-block input[type='text']"),
    ).toHaveValue("brass");
  });

  test("unchecking the toggle sends onlyTitle=0", async ({ page }) => {
    await page.goto(embeddedPageUrl);
    await page.uncheck(
      ".wpm-embedded-search-form .wpm-embedded-search-title-toggle input[type='checkbox']",
    );
    await page.fill(
      ".wpm-embedded-search-form .main-input-area input[type='text']",
      "lens",
    );
    await page.click(".wpm-embedded-search-form .wpm-embedded-search-button");
    await page.waitForLoadState("domcontentloaded");

    const url = new URL(page.url());
    expect(url.searchParams.getAll("onlyTitle").at(-1)).toBe("0");
    await expect(
      page.locator(".wpm-basic-search-block .wpm-embedded-search-title-toggle input[type='checkbox']"),
    ).not.toBeChecked();
  });
});
