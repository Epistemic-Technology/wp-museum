const { test, expect } = require("@playwright/test");
const {
  setupMuseumTest,
  createSimpleObjectKind,
  deleteAllObjectKinds,
} = require("./utils");

test.describe("Basic Utility Validation", () => {
  test("core utilities work correctly", async ({ page }) => {
    // Setup museum test environment
    await setupMuseumTest(page);
    
    // Clean up any existing kinds
    await deleteAllObjectKinds(page);
    
    // Create a simple object kind
    const slug = await createSimpleObjectKind(page, "Test Item");
    
    // Verify the slug is correct
    expect(slug).toBe("test-item");
    
    // Navigate to objects page to verify creation
    await page.goto("/wp-admin/admin.php?page=wpm-react-admin-objects");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector(".museum-admin-main", { timeout: 15000 });
    
    // Check that the kind exists
    const kindExists = await page.locator('text="Test Item"').isVisible();
    expect(kindExists).toBe(true);
    
    // Clean up
    await deleteAllObjectKinds(page);
    
    // Verify cleanup worked
    const deleteButtons = await page.locator('button:has-text("Delete")').count();
    expect(deleteButtons).toBe(0);
  });
});