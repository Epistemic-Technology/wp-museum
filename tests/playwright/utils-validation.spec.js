const { test, expect } = require("@playwright/test");
const {
  loginAsAdmin,
  setupMuseumTest,
  deleteAllObjectKinds,
  createObjectKind,
  createSimpleObjectKind,
  createMuseumObject,
  dismissEditorModals,
  createPage,
  insertMuseumBlock,
  createPageWithBlock,
} = require("./utils");

test.describe("Utility Functions Validation", () => {
  test.beforeEach(async ({ page }) => {
    // Most tests need admin access and museum plugin
    await setupMuseumTest(page);
  });

  test("createObjectKind creates a complete object kind", async ({ page }) => {
    // Clean up first
    await deleteAllObjectKinds(page);

    // Create a complex object kind
    await createObjectKind(page, {
      label: "Test Artifact",
      labelPlural: "Test Artifacts",
      description: "Archaeological artifacts for testing",
      categorized: true,
      fields: [
        { name: "Discovery Date", type: "date", required: true },
        { name: "Location", type: "plain", public: true, quickBrowse: true },
        { name: "Description", type: "rich", public: true },
        { name: "Condition Notes", type: "plain" },
      ],
    });

    // Navigate back to objects page to verify
    await page.goto("/wp-admin/admin.php?page=wpm-react-admin-objects");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector(".museum-admin-main", { timeout: 15000 });

    // Verify the kind was created - use more specific selector
    const kindExists = await page
      .locator('.kind-label:has-text("Test Artifact")')
      .isVisible();
    expect(kindExists).toBe(true);

    // Click on the Edit button for the kind to edit and verify fields
    await page
      .locator('div:has-text("Test Artifact")')
      .locator('button:has-text("Edit")')
      .click();
    await page.waitForSelector(".edit-header h1", { timeout: 10000 });

    // Verify basic info
    const labelValue = await page.locator(".kind-label-input").inputValue();
    expect(labelValue).toBe("Test Artifact");

    const pluralValue = await page
      .locator(".kind-label-plural-input")
      .inputValue();
    expect(pluralValue).toBe("Test Artifacts");

    const descValue = await page
      .locator(".kind-description-textarea")
      .inputValue();
    expect(descValue).toBe("Archaeological artifacts for testing");

    const categorizedChecked = await page
      .locator(".kind-categorized-checkbox")
      .isChecked();
    expect(categorizedChecked).toBe(true);

    // Verify fields were created (should have 4 field accordions)
    await page.waitForTimeout(1000); // Give React time to render
    const fieldAccordions = await page
      .locator("[id^='field-accordion-']")
      .count();
    expect(fieldAccordions).toBe(4);

    // Clean up
    await deleteAllObjectKinds(page);
  });

  test("createSimpleObjectKind creates basic object kind with default fields", async ({
    page,
  }) => {
    // Clean up first
    await deleteAllObjectKinds(page);

    // Create simple object kind
    const slug = await createSimpleObjectKind(page, "Test Instrument");
    expect(slug).toBe("test-instrument");

    // Navigate to objects page to verify
    await page.goto("/wp-admin/admin.php?page=wpm-react-admin-objects");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector(".museum-admin-main", { timeout: 15000 });

    // Verify the kind was created - use more specific selector
    const kindExists = await page
      .locator('.kind-label:has-text("Test Instrument")')
      .isVisible();
    expect(kindExists).toBe(true);

    // Verify we can navigate to create a new object of this type
    const wpPostType = `wpm_${slug}`;
    await page.goto(`/wp-admin/post-new.php?post_type=${wpPostType}`);
    await page.waitForLoadState("domcontentloaded");

    // Wait for editor to load
    await page.waitForTimeout(2000);

    // Should either show classic editor or block editor
    const hasEditor = await page
      .locator("#title, .editor-post-title__input")
      .isVisible({ timeout: 5000 });
    expect(hasEditor).toBe(true);

    // Clean up
    await deleteAllObjectKinds(page);
  });

  test("createMuseumObject creates object with custom fields", async ({
    page,
  }) => {
    // Clean up first
    await deleteAllObjectKinds(page);

    // Create object kind first
    const slug = await createSimpleObjectKind(page, "Test Equipment");

    // Create an object - use WordPress post type format
    const wpPostType = `wpm_${slug}`;
    await createMuseumObject(page, wpPostType, {
      title: "Test Oscilloscope",
      content: "A vintage oscilloscope used for testing electronic signals.",
      fields: {
        manufacturer: "Tektronix",
        materials: "Metal, glass, plastic",
        "accession-number": "TEST.2024.001",
      },
    });

    // Navigate to the objects list to verify
    await page.goto(`/wp-admin/edit.php?post_type=${wpPostType}`);
    await page.waitForLoadState("networkidle");

    // Verify object was created - use more specific selector
    const objectExists = await page
      .locator('a.row-title:has-text("Test Oscilloscope")')
      .isVisible();
    expect(objectExists).toBe(true);

    // Clean up
    await deleteAllObjectKinds(page);
  });

  test("dismissEditorModals handles pattern and welcome modals", async ({
    page,
  }) => {
    // Create a new page to trigger modals
    await page.goto("/wp-admin/post-new.php?post_type=page");

    // Dismiss modals
    await dismissEditorModals(page);

    // Verify we can interact with the editor
    const editorReady = await page
      .locator(".editor-post-title__input, #title")
      .isVisible({ timeout: 10000 });
    expect(editorReady).toBe(true);

    // Should be able to type in title
    if (await page.locator(".editor-post-title__input").isVisible()) {
      await page.fill(
        ".editor-post-title__input",
        "Test Page After Modal Dismiss",
      );
      const titleValue = await page
        .locator(".editor-post-title__input")
        .textContent();
      expect(titleValue.trim()).toBe("Test Page After Modal Dismiss");
    }
  });

  test("createPage creates page with content", async ({ page }) => {
    const pageUrl = await createPage(page, {
      title: "Test Page with Content",
      content:
        "This is test content for the page. It should appear in the page body.",
    });

    expect(pageUrl).toBeTruthy();
    expect(pageUrl).toContain("http");

    // Visit the page to verify
    await page.goto(pageUrl);
    await page.waitForLoadState("networkidle");

    // Verify title is visible
    const titleVisible = await page
      .locator('h1:has-text("Test Page with Content")')
      .isVisible();
    expect(titleVisible).toBe(true);

    // Verify content is visible (content might be mixed with theme content)
    const contentVisible = await page
      .locator(':has-text("This is test content for the page")')
      .first()
      .isVisible();
    expect(contentVisible).toBe(true);
  });

  test("insertMuseumBlock adds block to editor", async ({ page }) => {
    // Start creating a new page
    await page.goto("/wp-admin/post-new.php?post_type=page");
    await dismissEditorModals(page);

    // Add title
    await page.fill(".editor-post-title__input", "Test Block Insertion");

    // Insert a museum block - use Object Gallery since it's available
    await insertMuseumBlock(
      page,
      "Object Gallery",
      ".wp-block-wp-museum-object-gallery",
    );

    // Verify block was inserted
    const blockInserted = await page
      .locator(".wp-block-wp-museum-object-gallery")
      .isVisible();
    expect(blockInserted).toBe(true);
  });

  test("createPageWithBlock creates complete page with museum block", async ({
    page,
  }) => {
    const pageUrl = await createPageWithBlock(
      page,
      "Test Page with Object Gallery",
      "Object Gallery",
      ".wp-block-wp-museum-object-gallery",
    );

    expect(pageUrl).toBeTruthy();

    // Visit the page
    await page.goto(pageUrl);
    await page.waitForLoadState("networkidle");

    // Verify page title
    const titleVisible = await page
      .locator('h1:has-text("Test Page with Object Gallery")')
      .isVisible();
    expect(titleVisible).toBe(true);

    // The block should render some container on the frontend
    // (actual content depends on whether objects exist)
    const hasBlockContainer = await page
      .locator('[class*="object-gallery"], [class*="museum"]')
      .first()
      .isVisible();
    expect(hasBlockContainer).toBe(true);
  });

  test("deleteAllObjectKinds removes all object kinds", async ({ page }) => {
    // Create multiple object kinds
    await createSimpleObjectKind(page, "Test Kind 1");
    await createSimpleObjectKind(page, "Test Kind 2");
    await createSimpleObjectKind(page, "Test Kind 3");

    // Navigate to verify they exist
    await page.goto("/wp-admin/admin.php?page=wpm-react-admin-objects");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector(".museum-admin-main", { timeout: 15000 });

    // Count delete buttons (one per kind)
    let deleteButtonCount = await page
      .locator('button:has-text("Delete")')
      .count();
    expect(deleteButtonCount).toBe(3);

    // Delete all
    await deleteAllObjectKinds(page);

    // Verify all are gone
    deleteButtonCount = await page.locator('button:has-text("Delete")').count();
    expect(deleteButtonCount).toBe(0);
  });

  test("complex workflow using multiple utilities", async ({ page }) => {
    // Clean slate
    await deleteAllObjectKinds(page);

    // Create an object kind with specific fields
    await createObjectKind(page, {
      label: "Artwork",
      labelPlural: "Artworks",
      description: "Paintings, sculptures, and other artworks",
      fields: [
        { name: "Artist", type: "plain", required: true, public: true },
        { name: "Year Created", type: "date", public: true },
        { name: "Medium", type: "plain", public: true, quickBrowse: true },
        { name: "Dimensions", type: "plain", public: true },
      ],
    });

    // Create several artworks
    await createMuseumObject(page, "wpm_artwork", {
      title: "Starry Night",
      content:
        "A famous post-impressionist painting depicting a swirling night sky.",
      fields: {
        artist: "Vincent van Gogh",
        medium: "Oil on canvas",
        dimensions: "73.7 cm × 92.1 cm",
      },
    });

    await createMuseumObject(page, "wpm_artwork", {
      title: "The Thinker",
      content: "A bronze sculpture of a man in deep contemplation.",
      fields: {
        artist: "Auguste Rodin",
        medium: "Bronze",
        dimensions: "189 cm × 98 cm × 145 cm",
      },
    });

    // Create a page with object gallery to display them
    const galleryPageUrl = await createPageWithBlock(
      page,
      "Artwork Gallery",
      "Object Gallery",
      ".wp-block-wp-museum-object-gallery",
    );

    // Create a page with search block
    const searchPageUrl = await createPageWithBlock(
      page,
      "Search Artworks",
      "Basic Search",
      ".wp-block-wp-museum-basic-search",
    );

    // Verify the search page works
    await page.goto(searchPageUrl);
    await page.waitForLoadState("networkidle");

    // Search for "Starry"
    await page.fill(".wpm-embedded-search input[type='text']", "Starry");
    await page.click(".wpm-embedded-search-button:has-text('Search')");
    await page.waitForTimeout(2000);

    // Should find Starry Night
    const searchResults = await page
      .locator(".object-grid-box-wrapper")
      .count();
    expect(searchResults).toBeGreaterThan(0);

    // Clean up
    await deleteAllObjectKinds(page);
  });
});
