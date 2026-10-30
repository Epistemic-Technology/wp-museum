import { test, expect, type Page } from "@playwright/test";
import { setupMuseumTest } from "./utils";

/**
 * The collection-main-navigation block is rendered in PHP: the collection
 * links are in the page HTML before any script runs, and a small view script
 * only wires up the excerpt toggle.
 */

async function restNonce(page: Page): Promise<string> {
  const response = await page.request.get(
    "/wp-admin/admin-ajax.php?action=rest-nonce",
  );
  return (await response.text()).trim();
}

async function restPost(
  page: Page,
  route: string,
  data: Record<string, unknown>,
): Promise<{ id: number; link: string }> {
  const response = await page.request.post(route, {
    headers: { "X-WP-Nonce": await restNonce(page) },
    data,
  });
  expect(response.ok(), await response.text()).toBe(true);
  const body = await response.json();
  return { id: body.id as number, link: body.link as string };
}

test.describe("Collection Main Navigation Block (PHP rendered)", () => {
  // Each test creates its own collections; a per-test suffix keeps the
  // locators from matching the ones earlier tests left behind.
  let suffix: string;
  let parent: { id: number; link: string };
  let child: { id: number; link: string };
  let pageUrl: string;

  test.beforeEach(async ({ page }) => {
    await setupMuseumTest(page);
    suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

    parent = await restPost(page, "/wp-json/wp/v2/wpm_collection", {
      title: `Nav Instruments ${suffix}`,
      // Collections have no excerpt field; the excerpt is derived from content.
      content: "Instruments of all kinds.",
      status: "publish",
    });
    child = await restPost(page, "/wp-json/wp/v2/wpm_collection", {
      title: `Nav Astrolabes ${suffix}`,
      content: "Astrolabes specifically.",
      status: "publish",
      parent: parent.id,
    });
    pageUrl = (
      await restPost(page, "/wp-json/wp/v2/pages", {
        title: `Collection navigation ${suffix}`,
        status: "publish",
        content:
          '<!-- wp:wp-museum/collection-main-navigation-block {"sortOrder":"Ascending"} /-->',
      })
    ).link;
  });

  test("collection links are in the server-rendered HTML", async ({
    page,
  }) => {
    // Fetch the raw document rather than the live DOM so that nothing a
    // script might have added counts.
    const html = await (await page.request.get(pageUrl)).text();

    expect(html).toContain('<nav aria-label="Collection navigation">');
    expect(html).toContain(`href="${parent.link}"`);
    expect(html).toContain(`href="${child.link}"`);
    expect(html).toContain("Astrolabes specifically.");
    expect(html).not.toContain("wpm-collection-main-navigation-front");
    expect(html).not.toContain("data-attributes=");

    // The child sits under the parent, indented one level.
    const parentIndex = html.indexOf(`href="${parent.link}"`);
    const childIndex = html.indexOf(`href="${child.link}"`);
    expect(parentIndex).toBeGreaterThan(-1);
    expect(childIndex).toBeGreaterThan(parentIndex);
    const childBox = html.slice(
      html.lastIndexOf("wpm-collection-main-navigation-collection-box indent-", childIndex),
      childIndex,
    );
    expect(childBox).toContain("indent-1");
    expect(childBox).toMatch(/margin-left:3em/);
  });

  test("the view script has no React dependencies", async ({ page }) => {
    await page.goto(pageUrl);
    await page.waitForLoadState("domcontentloaded");

    const scripts = await page
      .locator("script[src]")
      .evaluateAll((nodes) =>
        nodes.map((n) => (n as HTMLScriptElement).src),
      );
    expect(scripts.some((s) => s.includes("collection-main-navigation/front"))).toBe(true);
    expect(scripts.some((s) => /js\/dist\/components(\.min)?\.js/.test(s))).toBe(false);
    expect(scripts.some((s) => /js\/dist\/element(\.min)?\.js/.test(s))).toBe(false);
    expect(scripts.some((s) => /vendor\/react(-dom)?(\.min)?\.js/.test(s))).toBe(false);
  });

  test("the info button toggles the excerpt", async ({ page }) => {
    await page.goto(pageUrl);
    await page.waitForLoadState("domcontentloaded");

    const box = page
      .locator(".wpm-collection-main-navigation-collection-box")
      .filter({ hasText: `Nav Astrolabes ${suffix}` });
    const button = box.locator(".wpm-collection-main-navigation-collection-box-info-button");
    const excerpt = box.locator(".wpm-collection-main-navigation-collection-box-excerpt");

    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(excerpt).toHaveClass(/closed/);

    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(excerpt).toHaveClass(/open/);
    await expect(excerpt).toHaveAttribute("aria-hidden", "false");
    await expect(excerpt).toContainText("Astrolabes specifically.");

    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(excerpt).toHaveClass(/closed/);
  });

  test("clicking a collection title navigates to the collection", async ({
    page,
  }) => {
    await page.goto(pageUrl);
    await page
      .locator(".wpm-collection-main-navigation-collection-box-title a")
      .filter({ hasText: `Nav Astrolabes ${suffix}` })
      .click();
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toBe(child.link);
  });
});
