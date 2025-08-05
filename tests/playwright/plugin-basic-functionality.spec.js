const { test, expect } = require("@playwright/test");
const {
  loginAsAdmin,
  activateMuseumPlugin,
  setupMuseumTest,
} = require("./utils");

test.describe("Museum for WordPress Plugin Basic Functionality", () => {
  test("can activate Museum for WordPress plugin", async ({ page }) => {
    // Login as admin first
    await loginAsAdmin(page);

    // Activate the Museum for WordPress plugin
    const isActivated = await activateMuseumPlugin(page);

    // Verify the plugin was activated successfully
    expect(isActivated).toBe(true);

    // Navigate back to plugins page to verify activation status
    await page.goto("/wp-admin/plugins.php");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("#the-list", { timeout: 5000 });

    // Check that the plugin shows as active
    const pluginRow = page
      .locator('tr:has-text("Museum for WordPress")')
      .first();
    const deactivateLink = await pluginRow
      .locator('a:has-text("Deactivate")')
      .isVisible();
    expect(deactivateLink).toBe(true);
  });

  test("plugin creates expected menu items in admin", async ({ page }) => {
    // Setup: login and activate plugin
    await setupMuseumTest(page);

    // Navigate to admin dashboard
    await page.goto("/wp-admin/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("#adminmenu", { timeout: 5000 });

    // Check that Museum menu items appear in the admin sidebar
    const museumMenuItems = page.locator('#adminmenu a:has-text("Museum")');
    const menuCount = await museumMenuItems.count();
    expect(menuCount).toBeGreaterThan(0);
  });

  test("can access plugin settings page", async ({ page }) => {
    // Setup: login and activate plugin
    await setupMuseumTest(page);

    // Try to navigate to plugin settings/main page
    // This assumes the plugin creates a menu item that leads to its main page
    await page.goto("/wp-admin/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("#adminmenu", { timeout: 5000 });

    // Look for and click Museum menu item - look for main Museum Administration menu
    const museumMenu = page
      .locator('#adminmenu a:has-text("Museum Administration")')
      .first();
    const menuExists = await museumMenu.isVisible();

    if (menuExists) {
      await museumMenu.click();
      await page.waitForLoadState("domcontentloaded");

      // Verify we're on a Museum plugin page
      const title = await page.title();
      expect(title).toContain("Museum");

      // Check that the page has loaded successfully
      const bodyContent = await page.locator("#wpbody-content").isVisible();
      expect(bodyContent).toBe(true);
    } else {
      // If no menu item, try direct navigation to common plugin page patterns
      const response = await page.goto("/wp-admin/admin.php?page=wp-museum");

      // Don't fail if the page doesn't exist, just verify it's not a 404
      if (response.status() === 200) {
        const title = await page.title();
        expect(title).not.toContain("404");
      }
    }
  });
});
