const { test, expect } = require("@playwright/test");
const { setupMuseumTest, deleteAllObjectKinds } = require("./utils");

/**
 * Tests for HTML entity decoding in Museum for WordPress
 * 
 * These tests ensure that HTML entities like &amp;, &lt;, &gt;, &quot;, etc.
 * are properly decoded and displayed as their actual characters in the frontend.
 */

test.describe("HTML Entity Decoding", () => {
  // Test data with various HTML entities
  const testEntities = {
    ampersand: {
      encoded: "Arts &amp; Crafts",
      decoded: "Arts & Crafts"
    },
    quotes: {
      encoded: "&quot;The Great Exhibition&quot;",
      decoded: '"The Great Exhibition"'
    },
    apostrophe: {
      encoded: "King&#039;s Collection",
      decoded: "King's Collection"
    },
    lessThan: {
      encoded: "Size &lt; 10cm",
      decoded: "Size < 10cm"
    },
    greaterThan: {
      encoded: "Weight &gt; 5kg",
      decoded: "Weight > 5kg"
    },
    combined: {
      encoded: "Arts &amp; Crafts: &quot;Victorian Era&quot; &lt;1900&gt;",
      decoded: 'Arts & Crafts: "Victorian Era" <1900>'
    }
  };

  test.beforeEach(async ({ page }) => {
    await setupMuseumTest(page);
    await deleteAllObjectKinds(page);
  });

  test("HTML entities in object titles are decoded correctly", async ({ page }) => {
    // Create an object kind first
    await page.goto("/wp-admin/admin.php?page=wpm-react-admin-objects");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector(".museum-admin-main", { timeout: 15000 });
    
    // Create object kind
    await page.click('button:has-text("Add New Object Type")');
    await page.fill('input[placeholder="Enter object type name"]', "Test Objects");
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(1000);

    // Create objects with HTML entities in titles
    for (const [key, entity] of Object.entries(testEntities)) {
      await page.goto("/wp-admin/post-new.php?post_type=wpm-test-objects");
      await page.waitForLoadState("networkidle");
      
      // Fill in the title with the decoded version (WordPress will encode it)
      await page.fill('input[name="post_title"]', entity.decoded);
      
      // Publish the post
      await page.click('button:has-text("Publish")');
      await page.waitForTimeout(500);
      
      // Confirm publish if needed
      const confirmButton = page.locator('.editor-post-publish-panel__header-publish-button button:has-text("Publish")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      await page.waitForTimeout(1000);
    }

    // Visit the frontend and check object titles
    await page.goto("/");
    
    // Navigate to a page that displays objects (this may vary based on your setup)
    // You might need to create a page with object grid or list blocks first
    // For now, let's check the individual object pages
    
    // Go to the objects archive page
    await page.goto("/wpm-test-objects/");
    
    // Check that all entities are decoded properly
    for (const [key, entity] of Object.entries(testEntities)) {
      const titleElement = page.locator(`text="${entity.decoded}"`).first();
      await expect(titleElement).toBeVisible();
      
      // Ensure the encoded version is NOT visible
      const encodedElement = page.locator(`text="${entity.encoded}"`);
      await expect(encodedElement).not.toBeVisible();
    }
  });

  test("HTML entities in collection names are decoded correctly", async ({ page }) => {
    // Navigate to Collections admin page
    await page.goto("/wp-admin/edit-tags.php?taxonomy=wpm-collection&post_type=wpm-museum-object");
    await page.waitForLoadState("networkidle");
    
    // Add collections with HTML entities
    for (const [key, entity] of Object.entries(testEntities)) {
      await page.fill('input#tag-name', entity.decoded);
      await page.fill('input#tag-slug', `test-collection-${key}`);
      await page.click('input#submit');
      await page.waitForTimeout(500);
    }
    
    // Create a page with collection listing
    await page.goto("/wp-admin/post-new.php?post_type=page");
    await page.waitForLoadState("networkidle");
    
    // Add title
    await page.fill('input[name="post_title"]', "Test Collections Page");
    
    // Add collection block
    await page.click('button[aria-label="Add block"]');
    await page.fill('input[placeholder="Search"]', "collection");
    await page.click('button:has-text("Collection"):visible');
    
    // Publish the page
    await page.click('button:has-text("Publish")');
    await page.waitForTimeout(500);
    
    const confirmButton = page.locator('.editor-post-publish-panel__header-publish-button button:has-text("Publish")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    
    await page.waitForTimeout(1000);
    
    // View the page
    const viewButton = page.locator('a:has-text("View Page")').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
    } else {
      await page.goto("/test-collections-page/");
    }
    
    // Check that collection names are decoded
    for (const [key, entity] of Object.entries(testEntities)) {
      const collectionElement = page.locator(`text="${entity.decoded}"`).first();
      await expect(collectionElement).toBeVisible();
      
      // Ensure encoded version is not visible
      const encodedElement = page.locator(`text="${entity.encoded}"`);
      await expect(encodedElement).not.toBeVisible();
    }
  });

  test("HTML entities in object grids are decoded correctly", async ({ page }) => {
    // First create an object kind
    await page.goto("/wp-admin/admin.php?page=wpm-react-admin-objects");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector(".museum-admin-main", { timeout: 15000 });
    
    await page.click('button:has-text("Add New Object Type")');
    await page.fill('input[placeholder="Enter object type name"]', "Grid Test Objects");
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(1000);
    
    // Create test objects
    const testObject = testEntities.ampersand;
    await page.goto("/wp-admin/post-new.php?post_type=wpm-grid-test-objects");
    await page.waitForLoadState("networkidle");
    
    await page.fill('input[name="post_title"]', testObject.decoded);
    await page.click('button:has-text("Publish")');
    await page.waitForTimeout(500);
    
    const confirmButton = page.locator('.editor-post-publish-panel__header-publish-button button:has-text("Publish")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    await page.waitForTimeout(1000);
    
    // Create a page with object grid block
    await page.goto("/wp-admin/post-new.php?post_type=page");
    await page.waitForLoadState("networkidle");
    
    await page.fill('input[name="post_title"]', "Object Grid Test");
    
    // Add object grid block
    await page.click('button[aria-label="Add block"]');
    await page.fill('input[placeholder="Search"]', "object grid");
    await page.click('button:has-text("Object Grid"):visible');
    
    // Publish and view
    await page.click('button:has-text("Publish")');
    await page.waitForTimeout(500);
    
    const publishConfirm = page.locator('.editor-post-publish-panel__header-publish-button button:has-text("Publish")');
    if (await publishConfirm.isVisible()) {
      await publishConfirm.click();
    }
    await page.waitForTimeout(1000);
    
    const viewButton = page.locator('a:has-text("View Page")').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
    } else {
      await page.goto("/object-grid-test/");
    }
    
    // Check that the object title in the grid is decoded
    const gridTitle = page.locator(`.wpm-object-grid text="${testObject.decoded}"`).first();
    await expect(gridTitle).toBeVisible();
    
    // Ensure encoded version is not visible
    const encodedTitle = page.locator(`.wpm-object-grid text="${testObject.encoded}"`);
    await expect(encodedTitle).not.toBeVisible();
  });

  test("HTML entities in object metadata fields are decoded correctly", async ({ page }) => {
    // Create object kind with custom fields
    await page.goto("/wp-admin/admin.php?page=wpm-react-admin-objects");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector(".museum-admin-main", { timeout: 15000 });
    
    await page.click('button:has-text("Add New Object Type")');
    await page.fill('input[placeholder="Enter object type name"]', "Metadata Test Objects");
    
    // Add a custom field
    await page.click('button:has-text("Add Field")');
    await page.fill('input[placeholder="Field name"]', "Description");
    
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(1000);
    
    // Create an object with HTML entities in metadata
    await page.goto("/wp-admin/post-new.php?post_type=wpm-metadata-test-objects");
    await page.waitForLoadState("networkidle");
    
    await page.fill('input[name="post_title"]', "Test Object with Metadata");
    
    // Fill in the description field with HTML entities
    const descriptionField = page.locator('textarea[name*="description"], input[name*="description"]').first();
    if (await descriptionField.isVisible()) {
      await descriptionField.fill(testEntities.combined.decoded);
    }
    
    // Publish
    await page.click('button:has-text("Publish")');
    await page.waitForTimeout(500);
    
    const confirmButton = page.locator('.editor-post-publish-panel__header-publish-button button:has-text("Publish")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    await page.waitForTimeout(1000);
    
    // View the object
    const viewButton = page.locator('a:has-text("View"):visible, a:has-text("View Metadata Test Object"):visible').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
    }
    
    // Check that metadata is decoded
    const metadataElement = page.locator(`text="${testEntities.combined.decoded}"`).first();
    await expect(metadataElement).toBeVisible();
    
    // Ensure encoded version is not visible
    const encodedMetadata = page.locator(`text="${testEntities.combined.encoded}"`);
    await expect(encodedMetadata).not.toBeVisible();
  });

  test("HTML entities in search results are decoded correctly", async ({ page }) => {
    // Create object kind
    await page.goto("/wp-admin/admin.php?page=wpm-react-admin-objects");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector(".museum-admin-main", { timeout: 15000 });
    
    await page.click('button:has-text("Add New Object Type")');
    await page.fill('input[placeholder="Enter object type name"]', "Search Test Objects");
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(1000);
    
    // Create an object with HTML entities
    await page.goto("/wp-admin/post-new.php?post_type=wpm-search-test-objects");
    await page.waitForLoadState("networkidle");
    
    await page.fill('input[name="post_title"]', testEntities.quotes.decoded);
    await page.click('button:has-text("Publish")');
    await page.waitForTimeout(500);
    
    const confirmButton = page.locator('.editor-post-publish-panel__header-publish-button button:has-text("Publish")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    await page.waitForTimeout(1000);
    
    // Create a page with search block
    await page.goto("/wp-admin/post-new.php?post_type=page");
    await page.waitForLoadState("networkidle");
    
    await page.fill('input[name="post_title"]', "Search Test Page");
    
    // Add search block
    await page.click('button[aria-label="Add block"]');
    await page.fill('input[placeholder="Search"]', "museum search");
    const searchBlock = page.locator('button:has-text("Basic Search"), button:has-text("Museum Search")').first();
    if (await searchBlock.isVisible()) {
      await searchBlock.click();
    }
    
    // Publish and view
    await page.click('button:has-text("Publish")');
    await page.waitForTimeout(500);
    
    const publishConfirm = page.locator('.editor-post-publish-panel__header-publish-button button:has-text("Publish")');
    if (await publishConfirm.isVisible()) {
      await publishConfirm.click();
    }
    await page.waitForTimeout(1000);
    
    const viewButton = page.locator('a:has-text("View Page")').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
    } else {
      await page.goto("/search-test-page/");
    }
    
    // Perform a search
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("Exhibition");
      await searchInput.press("Enter");
      await page.waitForTimeout(1000);
      
      // Check search results
      const resultTitle = page.locator(`text="${testEntities.quotes.decoded}"`).first();
      await expect(resultTitle).toBeVisible();
      
      // Ensure encoded version is not visible
      const encodedResult = page.locator(`text="${testEntities.quotes.encoded}"`);
      await expect(encodedResult).not.toBeVisible();
    }
  });
});