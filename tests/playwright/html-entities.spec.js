const { test, expect } = require("@playwright/test");
const {
  setupMuseumTest,
  deleteAllObjectKinds,
  dismissEditorModals,
} = require("./utils");

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
      decoded: "Arts & Crafts",
    },
    emdash: {
      encoded: "Victorian Era &mdash; 1837-1901",
      decoded: "Victorian Era — 1837-1901",
    },
    nbsp: {
      encoded: "Royal&nbsp;Collection",
      decoded: "Royal Collection",
    },
    lessThan: {
      encoded: "Size &lt; 10cm",
      decoded: "Size < 10cm",
    },
    greaterThan: {
      encoded: "Weight &gt; 5kg",
      decoded: "Weight > 5kg",
    },
    combined: {
      encoded: "Arts &amp; Crafts: &mdash; Victorian&nbsp;Era &lt;1900&gt;",
      decoded: "Arts & Crafts: — Victorian Era <1900>",
    },
  };

  test.beforeEach(async ({ page }) => {
    console.log("Setting up HTML entities test...");
    await setupMuseumTest(page);
    await deleteAllObjectKinds(page);
    console.log("Test setup complete.");
  });

  test("HTML entities in object titles are decoded correctly", async ({
    page,
  }) => {
    console.log("Starting HTML entities in object titles test");

    // Create an object kind first
    console.log("Navigating to object admin page...");
    await page.goto("/wp-admin/admin.php?page=wpm-react-admin-objects");
    await page.waitForSelector(".museum-admin-main", { timeout: 15000 });

    // Create object kind
    console.log("Creating new object type 'Test Object'...");
    await page.click('button:has-text("Add New Object Type")');
    await page.fill('input[name="kind-label"]', "Test Object");
    await page.fill('input[name="kind-label-plural"]', "Test Objects");
    await page.waitForTimeout(500);
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(1000);
    console.log("Object type created successfully");

    // Create objects with HTML entities in titles
    console.log("Creating objects with HTML entities...");
    for (const [key, entity] of Object.entries(testEntities)) {
      console.log(`Creating object for ${key}: "${entity.decoded}"`);
      await page.goto("/wp-admin/post-new.php?post_type=wpm_test-object");
      await page.waitForSelector('h1[aria-label="Add title"]', {
        timeout: 10000,
      });

      // Fill in the title with the decoded version (WordPress will encode it)
      console.log(`Filling title with: "${entity.decoded}"`);
      await page.fill('h1[aria-label="Add title"]', entity.decoded);

      // Publish the post
      console.log("Publishing post...");
      await page.click('button:has-text("Publish")');
      await page.waitForTimeout(500);

      // Confirm publish if needed
      const confirmButton = page.locator(
        '.editor-post-publish-panel__header-publish-button button:has-text("Publish")',
      );
      if (await confirmButton.isVisible()) {
        console.log("Confirming publish...");
        await confirmButton.click();
      }

      await page.waitForTimeout(1000);
      console.log(`Object created for ${key}`);
    }

    // Visit the frontend and check object titles
    console.log("Navigating to homepage...");
    await page.goto("/");

    // Navigate to a page that displays objects (this may vary based on your setup)
    // You might need to create a page with object grid or list blocks first
    // For now, let's check the individual object pages

    // Go to the objects archive page
    console.log("Navigating to objects edit page...");
    await page.goto("/wp-admin/edit.php?post_type=wpm_test-object");

    // Check that all entities are decoded properly
    console.log("Checking that all entities are decoded properly...");
    for (const [key, entity] of Object.entries(testEntities)) {
      console.log(
        `Checking ${key}: Looking for decoded version "${entity.decoded}"`,
      );
      const titleElement = page.locator(`text="${entity.decoded}"`).first();
      await expect(titleElement).toBeVisible();
      console.log(`✓ Found decoded version for ${key}`);

      // Ensure the encoded version is NOT visible
      console.log(
        `Checking ${key}: Ensuring encoded version "${entity.encoded}" is NOT visible`,
      );
      const encodedElement = page.locator(`text="${entity.encoded}"`);
      await expect(encodedElement).not.toBeVisible();
      console.log(`✓ Encoded version not visible for ${key}`);
    }
    console.log("Object titles test completed successfully");
  });

  // test("HTML entities in collection names are decoded correctly", async ({
  //   page,
  // }) => {
  //   console.log("Starting HTML entities in collection names test");

  //   // Navigate to Collections admin page
  //   console.log("Navigating to Collections admin page...");
  //   await page.goto(
  //     "/wp-admin/edit-tags.php?taxonomy=wpm_collection_tax&post_type=wpm_museum-object",
  //   );
  //   await page.waitForSelector("input#tag-name", { timeout: 10000 });

  //   // Add collections with HTML entities
  //   console.log("Adding collections with HTML entities...");
  //   for (const [key, entity] of Object.entries(testEntities)) {
  //     console.log(`Creating collection for ${key}: "${entity.decoded}"`);
  //     await page.fill("input#tag-name", entity.decoded);
  //     await page.fill("input#tag-slug", `test-collection-${key}`);
  //     await page.click("input#submit");
  //     await page.waitForTimeout(500);
  //     console.log(`Collection created for ${key}`);
  //   }

  //   // Create a page with collection listing
  //   console.log("Creating page with collection listing...");
  //   await page.goto("/wp-admin/post-new.php?post_type=page");
  //   await page.waitForSelector('h1[aria-label="Add title"]', {
  //     timeout: 10000,
  //   });

  //   await dismissEditorModals(page);
  //   // Add title
  //   console.log("Adding page title...");
  //   await page.fill('h1[aria-label="Add title"]', "Test Collections Page");

  //   // Add collection blocks
  //   for (const [key, entity] of Object.entries(testEntities)) {
  //     console.log(`Adding collection block for ${key}: "${entity.decoded}"`);
  //     await page.click('button[aria-label="Add block"]');
  //     await page.fill('input[placeholder="Search"]', "collection");
  //     await page.click(
  //       'button.block-editor-block-types-list__item:has-text("Collection"):visible',
  //     );
  //     await page.click('button:has-text("Search")');
  //     await page.fill('input[placeholder="Type to search..."]', entity.decoded);
  //     await page.click(
  //       `div[class="search-result-title"]:has-text("${entity.decoded}")`,
  //     );
  //   }

  //   // Wait for blocks to be added
  //   console.log("Waiting for collection blocks to be added...");
  //   await page.waitForTimeout(2000);

  //   // Check that each collection block was added successfully
  //   console.log("Verifying collection blocks were added to the page...");
  //   for (const [key, entity] of Object.entries(testEntities)) {
  //     console.log(`Checking for collection block ${key}: "${entity.decoded}"`);
  //     const collectionBlock = page.locator(`text="${entity.decoded}"`).first();
  //     await expect(collectionBlock).toBeVisible();
  //     console.log(`✓ Collection block found for ${key}`);
  //   }

  //   // Publish the page
  //   console.log("Publishing collections page...");
  //   await page.click('button:has-text("Publish")');
  //   await page.waitForTimeout(500);

  //   const confirmButton = page.locator(
  //     '.editor-post-publish-panel__header-publish-button button:has-text("Publish")',
  //   );
  //   if (await confirmButton.isVisible()) {
  //     console.log("Confirming publish...");
  //     await confirmButton.click();
  //   }

  //   await page.waitForTimeout(1000);
  //   console.log("Collections page published");

  //   // View the page
  //   console.log("Viewing the collections page...");
  //   const viewButton = page.locator('a:has-text("View Page")').first();
  //   if (await viewButton.isVisible()) {
  //     await viewButton.click();
  //   } else {
  //     await page.goto("/test-collections-page/");
  //   }

  //   // Check that collection names are decoded
  //   console.log("Checking that collection names are decoded...");
  //   for (const [key, entity] of Object.entries(testEntities)) {
  //     console.log(
  //       `Checking collection ${key}: Looking for decoded version "${entity.decoded}"`,
  //     );
  //     const collectionElement = page
  //       .locator(`text="${entity.decoded}"`)
  //       .first();
  //     await expect(collectionElement).toBeVisible();
  //     console.log(`✓ Found decoded collection name for ${key}`);

  //     // Ensure encoded version is not visible
  //     console.log(
  //       `Checking collection ${key}: Ensuring encoded version "${entity.encoded}" is NOT visible`,
  //     );
  //     const encodedElement = page.locator(`text="${entity.encoded}"`);
  //     await expect(encodedElement).not.toBeVisible();
  //     console.log(`✓ Encoded version not visible for collection ${key}`);
  //   }
  //   console.log("Collection names test completed successfully");
  // });

  //   test("HTML entities in object grids are decoded correctly", async ({
  //     page,
  //   }) => {
  //     console.log("Starting HTML entities in object grids test");

  //     // First create an object kind
  //     console.log("Creating object kind for grid test...");
  //     await page.goto("/wp-admin/admin.php?page=wpm-react-admin-objects");
  //     await page.waitForSelector(".museum-admin-main", { timeout: 15000 });

  //     await page.click('button:has-text("Add New Object Type")');
  //     await page.fill(
  //       'input[placeholder="Enter object type name"]',
  //       "Grid Test Objects",
  //     );
  //     await page.click('button:has-text("Save Changes")');
  //     await page.waitForTimeout(1000);
  //     console.log("Grid Test Objects type created");

  //     // Create test objects
  //     const testObject = testEntities.ampersand;
  //     console.log(`Creating test object with title: "${testObject.decoded}"`);
  //     await page.goto("/wp-admin/post-new.php?post_type=wpm-grid-test-objects");
  //     await page.waitForSelector('input[name="post_title"]', { timeout: 10000 });

  //     await page.fill('input[name="post_title"]', testObject.decoded);
  //     console.log("Publishing test object...");
  //     await page.click('button:has-text("Publish")');
  //     await page.waitForTimeout(500);

  //     const confirmButton = page.locator(
  //       '.editor-post-publish-panel__header-publish-button button:has-text("Publish")',
  //     );
  //     if (await confirmButton.isVisible()) {
  //       console.log("Confirming publish...");
  //       await confirmButton.click();
  //     }
  //     await page.waitForTimeout(1000);
  //     console.log("Test object created for grid");

  //     // Create a page with object grid block
  //     console.log("Creating page with object grid block...");
  //     await page.goto("/wp-admin/post-new.php?post_type=page");
  //     await page.waitForSelector('input[name="post_title"]', { timeout: 10000 });

  //     await page.fill('input[name="post_title"]', "Object Grid Test");

  //     // Add object grid block
  //     console.log("Adding object grid block...");
  //     await page.click('button[aria-label="Add block"]');
  //     await page.fill('input[placeholder="Search"]', "object grid");
  //     await page.click('button:has-text("Object Grid"):visible');

  //     // Publish and view
  //     console.log("Publishing grid test page...");
  //     await page.click('button:has-text("Publish")');
  //     await page.waitForTimeout(500);

  //     const publishConfirm = page.locator(
  //       '.editor-post-publish-panel__header-publish-button button:has-text("Publish")',
  //     );
  //     if (await publishConfirm.isVisible()) {
  //       console.log("Confirming publish...");
  //       await publishConfirm.click();
  //     }
  //     await page.waitForTimeout(1000);
  //     console.log("Grid test page created");

  //     console.log("Viewing grid test page...");
  //     const viewButton = page.locator('a:has-text("View Page")').first();
  //     if (await viewButton.isVisible()) {
  //       await viewButton.click();
  //     } else {
  //       await page.goto("/object-grid-test/");
  //     }

  //     // Check that the object title in the grid is decoded
  //     console.log(
  //       `Checking grid title: Looking for decoded version "${testObject.decoded}"`,
  //     );
  //     const gridTitle = page
  //       .locator(`.wpm-object-grid text="${testObject.decoded}"`)
  //       .first();
  //     await expect(gridTitle).toBeVisible();
  //     console.log("✓ Found decoded title in object grid");

  //     // Ensure encoded version is not visible
  //     console.log(
  //       `Checking grid title: Ensuring encoded version "${testObject.encoded}" is NOT visible`,
  //     );
  //     const encodedTitle = page.locator(
  //       `.wpm-object-grid text="${testObject.encoded}"`,
  //     );
  //     await expect(encodedTitle).not.toBeVisible();
  //     console.log("✓ Encoded version not visible in object grid");
  //     console.log("Object grid test completed successfully");
  //   });

  //   test("HTML entities in object metadata fields are decoded correctly", async ({
  //     page,
  //   }) => {
  //     console.log("Starting HTML entities in metadata fields test");

  //     // Create object kind with custom fields
  //     console.log("Creating object kind with custom fields...");
  //     await page.goto("/wp-admin/admin.php?page=wpm-react-admin-objects");
  //     await page.waitForSelector(".museum-admin-main", { timeout: 15000 });

  //     await page.click('button:has-text("Add New Object Type")');
  //     await page.fill(
  //       'input[placeholder="Enter object type name"]',
  //       "Metadata Test Objects",
  //     );

  //     // Add a custom field
  //     console.log("Adding custom Description field...");
  //     await page.click('button:has-text("Add Field")');
  //     await page.fill('input[placeholder="Field name"]', "Description");

  //     await page.click('button:has-text("Save Changes")');
  //     await page.waitForTimeout(1000);
  //     console.log("Metadata Test Objects type created with Description field");

  //     // Create an object with HTML entities in metadata
  //     console.log("Creating object with HTML entities in metadata...");
  //     await page.goto(
  //       "/wp-admin/post-new.php?post_type=wpm-metadata-test-objects",
  //     );
  //     await page.waitForSelector('input[name="post_title"]', { timeout: 10000 });

  //     await page.fill('input[name="post_title"]', "Test Object with Metadata");

  //     // Fill in the description field with HTML entities
  //     console.log(
  //       `Filling description field with: "${testEntities.combined.decoded}"`,
  //     );
  //     const descriptionField = page
  //       .locator('textarea[name*="description"], input[name*="description"]')
  //       .first();
  //     if (await descriptionField.isVisible()) {
  //       await descriptionField.fill(testEntities.combined.decoded);
  //       console.log("Description field filled");
  //     } else {
  //       console.log("Description field not found or not visible");
  //     }

  //     // Publish
  //     console.log("Publishing metadata test object...");
  //     await page.click('button:has-text("Publish")');
  //     await page.waitForTimeout(500);

  //     const confirmButton = page.locator(
  //       '.editor-post-publish-panel__header-publish-button button:has-text("Publish")',
  //     );
  //     if (await confirmButton.isVisible()) {
  //       console.log("Confirming publish...");
  //       await confirmButton.click();
  //     }
  //     await page.waitForTimeout(1000);
  //     console.log("Metadata test object created");

  //     // View the object
  //     console.log("Viewing metadata test object...");
  //     const viewButton = page
  //       .locator(
  //         'a:has-text("View"):visible, a:has-text("View Metadata Test Object"):visible',
  //       )
  //       .first();
  //     if (await viewButton.isVisible()) {
  //       await viewButton.click();
  //     }

  //     // Check that metadata is decoded
  //     console.log(
  //       `Checking metadata: Looking for decoded version "${testEntities.combined.decoded}"`,
  //     );
  //     const metadataElement = page
  //       .locator(`text="${testEntities.combined.decoded}"`)
  //       .first();
  //     await expect(metadataElement).toBeVisible();
  //     console.log("✓ Found decoded metadata");

  //     // Ensure encoded version is not visible
  //     console.log(
  //       `Checking metadata: Ensuring encoded version "${testEntities.combined.encoded}" is NOT visible`,
  //     );
  //     const encodedMetadata = page.locator(
  //       `text="${testEntities.combined.encoded}"`,
  //     );
  //     await expect(encodedMetadata).not.toBeVisible();
  //     console.log("✓ Encoded version not visible in metadata");
  //     console.log("Metadata fields test completed successfully");
  //   });

  //   test("HTML entities in search results are decoded correctly", async ({
  //     page,
  //   }) => {
  //     console.log("Starting HTML entities in search results test");

  //     // Create object kind
  //     console.log("Creating object kind for search test...");
  //     await page.goto("/wp-admin/admin.php?page=wpm-react-admin-objects");
  //     await page.waitForSelector(".museum-admin-main", { timeout: 15000 });

  //     await page.click('button:has-text("Add New Object Type")');
  //     await page.fill(
  //       'input[placeholder="Enter object type name"]',
  //       "Search Test Objects",
  //     );
  //     await page.click('button:has-text("Save Changes")');
  //     await page.waitForTimeout(1000);
  //     console.log("Search Test Objects type created");

  //     // Create an object with HTML entities
  //     console.log(
  //       `Creating search test object with title: "${testEntities.quotes.decoded}"`,
  //     );
  //     await page.goto("/wp-admin/post-new.php?post_type=wpm-search-test-objects");
  //     await page.waitForSelector('input[name="post_title"]', { timeout: 10000 });

  //     await page.fill('input[name="post_title"]', testEntities.quotes.decoded);
  //     console.log("Publishing search test object...");
  //     await page.click('button:has-text("Publish")');
  //     await page.waitForTimeout(500);

  //     const confirmButton = page.locator(
  //       '.editor-post-publish-panel__header-publish-button button:has-text("Publish")',
  //     );
  //     if (await confirmButton.isVisible()) {
  //       console.log("Confirming publish...");
  //       await confirmButton.click();
  //     }
  //     await page.waitForTimeout(1000);
  //     console.log("Search test object created");

  //     // Create a page with search block
  //     console.log("Creating page with search block...");
  //     await page.goto("/wp-admin/post-new.php?post_type=page");
  //     await page.waitForSelector('input[name="post_title"]', { timeout: 10000 });

  //     await page.fill('input[name="post_title"]', "Search Test Page");

  //     // Add search block
  //     console.log("Adding search block...");
  //     await page.click('button[aria-label="Add block"]');
  //     await page.fill('input[placeholder="Search"]', "museum search");
  //     const searchBlock = page
  //       .locator(
  //         'button:has-text("Basic Search"), button:has-text("Museum Search")',
  //       )
  //       .first();
  //     if (await searchBlock.isVisible()) {
  //       await searchBlock.click();
  //       console.log("Search block added");
  //     } else {
  //       console.log("Search block not found");
  //     }

  //     // Publish and view
  //     console.log("Publishing search test page...");
  //     await page.click('button:has-text("Publish")');
  //     await page.waitForTimeout(500);

  //     const publishConfirm = page.locator(
  //       '.editor-post-publish-panel__header-publish-button button:has-text("Publish")',
  //     );
  //     if (await publishConfirm.isVisible()) {
  //       console.log("Confirming publish...");
  //       await publishConfirm.click();
  //     }
  //     await page.waitForTimeout(1000);
  //     console.log("Search test page created");

  //     console.log("Viewing search test page...");
  //     const viewButton = page.locator('a:has-text("View Page")').first();
  //     if (await viewButton.isVisible()) {
  //       await viewButton.click();
  //     } else {
  //       await page.goto("/search-test-page/");
  //     }

  //     // Perform a search
  //     console.log("Performing search for 'Exhibition'...");
  //     const searchInput = page
  //       .locator('input[type="search"], input[placeholder*="Search"]')
  //       .first();
  //     if (await searchInput.isVisible()) {
  //       await searchInput.fill("Exhibition");
  //       await searchInput.press("Enter");
  //       await page.waitForTimeout(1000);
  //       console.log("Search performed");

  //       // Check search results
  //       console.log(
  //         `Checking search results: Looking for decoded version "${testEntities.quotes.decoded}"`,
  //       );
  //       const resultTitle = page
  //         .locator(`text="${testEntities.quotes.decoded}"`)
  //         .first();
  //       await expect(resultTitle).toBeVisible();
  //       console.log("✓ Found decoded title in search results");

  //       // Ensure encoded version is not visible
  //       console.log(
  //         `Checking search results: Ensuring encoded version "${testEntities.quotes.encoded}" is NOT visible`,
  //       );
  //       const encodedResult = page.locator(
  //         `text="${testEntities.quotes.encoded}"`,
  //       );
  //       await expect(encodedResult).not.toBeVisible();
  //       console.log("✓ Encoded version not visible in search results");
  //     } else {
  //       console.log("Search input not found or not visible");
  //     }
  //     console.log("Search results test completed successfully");
  //   });
});
