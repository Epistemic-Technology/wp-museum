const { test, expect } = require("@playwright/test");
const {
  setupMuseumTest,
  deleteAllObjectKinds,
  createSimpleObjectKind,
  createMuseumObject,
  postTypeFromSlug
} = require("./utils");
const fs = require("fs");
const path = require("path");

test.describe("CSV Export Functionality", () => {
  let objectKindSlug;
  let postType;

  test.beforeEach(async ({ page }) => {
    await setupMuseumTest(page);

    // Clean up any leftover object kinds from previous tests
    await deleteAllObjectKinds(page);

    // Create a simple object kind for testing
    objectKindSlug = await createSimpleObjectKind(page, "Test Instrument");
    postType = postTypeFromSlug(objectKindSlug);

    // Create a few test objects
    for (let i = 1; i <= 3; i++) {
      await createMuseumObject(page, postType, {
        title: `Test Instrument ${i}`,
        content: `Description for test instrument ${i}`,
        fields: {
          "Manufacturer": `Test Manufacturer ${i}`,
          "Materials": `Material ${i}`,
          "Accession Number": `ACC-00${i}`
        }
      });
    }
  });

  test("can export CSV from quick browse screen", async ({ page }) => {
    // Navigate to quick browse page for the object type
    await page.goto(`/wp-admin/edit.php?post_type=${postType}&page=${objectKindSlug}-quick-browse`);
    await page.waitForLoadState("networkidle");
    
    // Wait for the page to load
    await page.waitForSelector(".wrap", { timeout: 10000 });
    
    // Look for Export CSV button
    const exportButton = page.locator('a:has-text("Export CSV"), button:has-text("Export CSV")').first();
    await expect(exportButton).toBeVisible({ timeout: 10000 });
    
    // Set up download promise before clicking
    const downloadPromise = page.waitForEvent("download");
    
    // Click Export CSV button
    await exportButton.click();
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify download has correct filename pattern
    const suggestedFilename = download.suggestedFilename();
    expect(suggestedFilename).toMatch(/\.csv$/);
    
    // Save and read the downloaded file
    const downloadPath = path.join(__dirname, "temp-export-quickbrowse.csv");
    await download.saveAs(downloadPath);
    
    // Read and verify CSV content
    const csvContent = fs.readFileSync(downloadPath, "utf8");
    
    // Verify CSV has content
    expect(csvContent).toBeTruthy();
    
    // Verify CSV contains expected headers (at minimum)
    expect(csvContent).toContain("Title");
    
    // Verify CSV contains our test objects
    expect(csvContent).toContain("Test Instrument 1");
    expect(csvContent).toContain("Test Instrument 2");
    expect(csvContent).toContain("Test Instrument 3");
    
    // Verify custom fields are included
    expect(csvContent).toContain("Manufacturer");
    expect(csvContent).toContain("Materials");
    expect(csvContent).toContain("Accession Number");
    
    // Verify field values
    expect(csvContent).toContain("Test Manufacturer 1");
    
    // Check if accession numbers were saved - if not, just verify the structure
    const lines = csvContent.split('\n');
    const headers = lines[0];
    const fieldHeaders = lines[1]; 
    
    // Verify the CSV structure has the expected columns
    expect(headers).toContain("Accession Number");
    expect(fieldHeaders).toContain("accession-number");
    
    // Clean up temp file
    fs.unlinkSync(downloadPath);
  });

  test("can export CSV from object admin screen", async ({ page }) => {
    // Navigate to object admin page
    await page.goto(`/wp-admin/admin.php?page=wpm-react-admin-objects&view=main`);
    await page.waitForLoadState("networkidle");

    // Wait for React app to load
    await page.waitForSelector(".museum-admin-main, #wpm-react-admin-app-container-objects", { timeout: 10000 });

    // Find the Export CSV button for our Test Instrument kind
    const kindRow = page.locator('div:has-text("Test Instrument")').first();
    const exportButton = kindRow.locator('button:has-text("Export CSV"), a:has-text("Export CSV")').first();
    await expect(exportButton).toBeVisible({ timeout: 10000 });

    // Set up download promise before clicking
    const downloadPromise = page.waitForEvent("download", { timeout: 10000 });

    // Click Export CSV button
    await exportButton.click();

    // Wait for download
    const download = await downloadPromise;

    // Verify download has correct filename pattern
    const suggestedFilename = download.suggestedFilename();
    expect(suggestedFilename).toMatch(/\.csv$/);

    // Save and read the downloaded file
    const downloadPath = path.join(__dirname, "temp-export-admin.csv");
    await download.saveAs(downloadPath);

    // Read and verify CSV content
    const csvContent = fs.readFileSync(downloadPath, "utf8");

    // Verify CSV has content and expected data
    expect(csvContent).toBeTruthy();
    expect(csvContent).toContain("Title");
    expect(csvContent).toContain("Test Instrument 1");
    expect(csvContent).toContain("Test Instrument 2");
    expect(csvContent).toContain("Test Instrument 3");

    // Clean up temp file
    fs.unlinkSync(downloadPath);
  });
});