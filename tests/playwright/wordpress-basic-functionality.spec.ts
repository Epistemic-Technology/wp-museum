import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./utils";

test.describe("WordPress Basic Functionality", () => {
  test("front page loads successfully", async ({ page }) => {
    // Navigate to the WordPress front page and verify response
    const response = await page.goto("/");

    // Verify the page returns a 200 status code
    expect(response.status()).toBe(200);

    // Wait for the page to load completely
    await page.waitForLoadState("networkidle");

    // Check that the page title is set (not empty)
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);

    // Check that the page has loaded successfully by looking for common WordPress elements
    // This checks for either the body tag or any content wrapper
    const bodyExists = await page.locator("body").isVisible();
    expect(bodyExists).toBe(true);

    // Check that the page contains some content (not completely empty)
    const bodyText = await page.locator("body").textContent();
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });

  test("can login to WordPress admin dashboard", async ({ page }) => {
    // Use utility function to login as admin
    const loggedInUser = await loginAsAdmin(page);

    // Verify we can see the main dashboard content
    const dashboardContent = await page.locator("#wpbody-content").isVisible();
    expect(dashboardContent).toBe(true);

    // Verify the login was successful and returned the username
    expect(loggedInUser).toBeTruthy();
  });
});
