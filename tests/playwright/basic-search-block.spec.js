const { test, expect } = require("@playwright/test");
const {
  setupMuseumTest,
  createSimpleObjectKind,
  createMuseumObject,
  createPageWithBlock,
  dismissEditorModals,
  postTypeFromSlug,
} = require("./utils");

test.describe("Basic Search Block", () => {
  test.beforeEach(async ({ page }) => {
    // Setup: login and activate plugin
    await setupMuseumTest(page);
  });

  test("can add basic search block to a page", async ({ page }) => {
    // Create a page with the basic search block using utility function
    const pageUrl = await createPageWithBlock(
      page,
      "Test Search Page",
      "Basic Search",
      ".wp-block-wp-museum-basic-search",
    );

    // Visit the published page
    await page.goto(pageUrl);
    await page.waitForLoadState("domcontentloaded");

    // Verify the search block is rendered
    const searchBlock = await page
      .locator(".wpm-basic-search-block")
      .isVisible();
    expect(searchBlock).toBe(true);

    // Verify search input exists
    const searchInput = await page
      .locator(".wpm-embedded-search .main-input-area input[type='text']")
      .isVisible();
    expect(searchInput).toBe(true);

    // Verify search button exists
    const searchButton = await page
      .locator(".wpm-embedded-search-button.is-primary")
      .isVisible();
    expect(searchButton).toBe(true);

    // Verify title toggle checkbox exists
    const titleToggle = await page
      .locator(".wpm-embedded-search-title-toggle input[type='checkbox']")
      .isVisible();
    expect(titleToggle).toBe(true);
  });

  test("search with 'Only search titles' checked (default)", async ({
    page,
  }) => {
    // Create object kind and test objects
    const kindSlug = await createSimpleObjectKind(
      page,
      "Scientific Instrument",
    );

    const postType = postTypeFromSlug(kindSlug);

    // Create test objects with searchable content
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

    // Create a search page
    const pageUrl = await createPageWithBlock(
      page,
      "Search Test Page",
      "Basic Search",
      ".wp-block-wp-museum-basic-search",
    );

    // Visit the page
    await page.goto(pageUrl);
    await page.waitForLoadState("domcontentloaded");

    // Verify the checkbox is checked by default
    const checkbox = page.locator('.wpm-embedded-search-title-toggle input[type="checkbox"]');
    const isChecked = await checkbox.isChecked();
    expect(isChecked).toBe(true);

    // Search for "Persian" which is only in the title
    await page.fill(".wpm-embedded-search .main-input-area input[type='text']", "Persian");
    await page.click(".wpm-embedded-search-button.is-primary");

    // Wait for search results
    await page.waitForTimeout(1000);

    // Should find the Persian Astrolabe
    let results = await page.locator(".object-grid-box-wrapper").count();
    expect(results).toBeGreaterThan(0);

    const persianAstrolabe = await page
      .locator(".object-grid-caption-div h3:has-text('Persian Astrolabe')")
      .isVisible();
    expect(persianAstrolabe).toBe(true);

    // Clear and search for "brass" which is in materials field, not title
    await page.fill(".wpm-embedded-search .main-input-area input[type='text']", "brass");
    await page.click(".wpm-embedded-search-button.is-primary");

    // Wait for potential results
    await page.waitForTimeout(1000);

    // Should not find any results when searching only titles
    results = await page.locator(".object-grid-box-wrapper").count();
    expect(results).toBe(0);
  });

  test("search with 'Only search titles' unchecked", async ({ page }) => {
    // Use existing objects from previous test or create new ones
    const kindSlug = await createSimpleObjectKind(
      page,
      "Scientific Instrument",
    );

    const postType = postTypeFromSlug(kindSlug);

    // Check if objects exist, if not create them
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

    // Create a search page
    const pageUrl = await createPageWithBlock(
      page,
      "Full Search Test Page",
      "Basic Search",
      ".wp-block-wp-museum-basic-search",
    );

    // Visit the page
    await page.goto(pageUrl);
    await page.waitForLoadState("domcontentloaded");

    // Uncheck the "Only search titles" checkbox
    const checkbox = page.locator('.wpm-embedded-search-title-toggle input[type="checkbox"]');
    await checkbox.uncheck();
    const isChecked = await checkbox.isChecked();
    expect(isChecked).toBe(false);

    // Search for "brass" which appears in content/materials
    await page.fill(".wpm-embedded-search .main-input-area input[type='text']", "brass");
    await page.click(".wpm-embedded-search-button.is-primary");

    // Wait for search results
    await page.waitForTimeout(1000);

    // Should find multiple objects with brass in their content
    const results = await page.locator(".object-grid-box-wrapper").count();
    expect(results).toBeGreaterThan(0);

    // Clear and search for "Ernst Leitz" which is in content
    await page.fill(".wpm-embedded-search .main-input-area input[type='text']", "Ernst Leitz");
    await page.click(".wpm-embedded-search-button.is-primary");

    // Wait for search results
    await page.waitForTimeout(1000);

    // Should find the Victorian Microscope
    const microscope = await page
      .locator(".object-grid-caption-div h3:has-text('Victorian Microscope')")
      .isVisible();
    expect(microscope).toBe(true);

    // Clear and search for "Islamic" which appears in description
    await page.fill(".wpm-embedded-search .main-input-area input[type='text']", "Islamic");
    await page.click(".wpm-embedded-search-button.is-primary");

    // Wait for search results
    await page.waitForTimeout(1000);

    // Should find the Persian Astrolabe
    const astrolabe = await page
      .locator(".object-grid-caption-div h3:has-text('Persian Astrolabe')")
      .isVisible();
    expect(astrolabe).toBe(true);
  });

  test("search with Enter key", async ({ page }) => {
    // Create a search page (assumes objects exist from previous tests)
    const pageUrl = await createPageWithBlock(
      page,
      "Enter Key Search Test",
      "Basic Search",
      ".wp-block-wp-museum-basic-search",
    );

    // Visit the page
    await page.goto(pageUrl);
    await page.waitForLoadState("domcontentloaded");

    // Type search term and press Enter
    await page.fill(".wpm-embedded-search .main-input-area input[type='text']", "Victorian");
    await page.press(".wpm-embedded-search .main-input-area input[type='text']", "Enter");

    // Wait for search results
    await page.waitForTimeout(1000);

    // Should find results
    const results = await page.locator(".object-grid-box-wrapper").count();
    expect(results).toBeGreaterThan(0);
  });

  test("empty search returns no results", async ({ page }) => {
    // Create a search page
    const pageUrl = await createPageWithBlock(
      page,
      "Empty Search Test",
      "Basic Search",
      ".wp-block-wp-museum-basic-search",
    );

    // Visit the page
    await page.goto(pageUrl);
    await page.waitForLoadState("domcontentloaded");

    // Click search without entering any text
    await page.click(".wpm-embedded-search-button.is-primary");

    // Wait a moment for potential results
    await page.waitForTimeout(1000);

    // Should have no results
    const results = await page.locator(".object-grid-box-wrapper").count();
    expect(results).toBe(0);
  });
});
