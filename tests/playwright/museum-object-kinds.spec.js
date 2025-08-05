const { test, expect } = require("@playwright/test");
const { loginAsAdmin, deleteAllObjectKinds } = require("./utils");
const fs = require("fs");
const path = require("path");

/**
 * Handle saving - simplified for manual save only
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
async function handleSave(page) {
  const saveButton = page.locator('button:has-text("Save Changes")');
  await saveButton.click();
  // Wait a moment for the save to complete
  await page.waitForTimeout(1000);
}

/**
 * Count the number of object kinds displayed on the objects admin page
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<number>} Number of object kinds found
 */
async function countObjectKinds(page) {
  // Navigate to Museum Administration > Objects
  await page.goto("/wp-admin/admin.php?page=wpm-react-admin-objects");
  await page.waitForLoadState("networkidle");

  // Wait for React app to load
  await page.waitForSelector(".museum-admin-main", { timeout: 15000 });

  // Count the number of Delete buttons (one per object kind)
  const deleteButtons = page.locator('button:has-text("Delete")');
  return await deleteButtons.count();
}

test.describe("Museum Object Kinds", () => {
  test("can create a basic object kind", async ({ page }) => {
    await loginAsAdmin(page);

    // Clean up any existing object kinds before starting
    await deleteAllObjectKinds(page);

    // Navigate to Museum Administration > Objects
    await page.goto("/wp-admin/admin.php?page=wpm-react-admin-objects");
    await page.waitForLoadState("domcontentloaded");

    // Wait for React app to load
    await page.waitForSelector(".museum-admin-main, #wpm-react-admin-app-container-objects", { timeout: 10000 });

    // Click "Add New Object Type" button
    await page.click('button:has-text("Add New Object Type")');

    // Wait for the edit page to load
    await page.waitForSelector(".edit-header h1", { timeout: 10000 });

    // Verify we're on the edit page
    const headerText = await page.textContent(".edit-header h1");
    expect(headerText).toBe("New Object Type");

    // Fill in object kind basic information
    await page.locator(".kind-label-input").fill("Test Instrument");

    await page.locator(".kind-label-plural-input").fill("Test Instruments");

    await page.locator(".kind-description-textarea").fill("A test scientific instrument for automated testing");

    // Add a basic field
    await page.click('button:has-text("Add New Field")');

    // Wait for network operations to complete after field creation
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);

    // Wait for the field accordion to be added and stabilized
    await page.waitForSelector("[id^='field-accordion-']", { timeout: 10000 });

    // Wait for DOM to stabilize
    await page.waitForTimeout(500);

    // The new field should be expanded by default, but ensure it's expanded
    const fieldAccordion = page.locator("[id^='field-accordion-']").first();
    const isCollapsed = await fieldAccordion.evaluate((el) =>
      el.classList.contains("collapsed"),
    );
    if (isCollapsed) {
      await fieldAccordion.locator(".expand-toggle").click();
      await page.waitForTimeout(300);
    }

    // Wait for field content to be visible and stable
    await page.waitForSelector(".field-content", { timeout: 5000 });
    await page.waitForTimeout(500);

    // Fill in field details - wait for each element to be stable
    await page.waitForSelector(
      '.field-section:has(label:has-text("Label")) input',
      { timeout: 5000 },
    );
    const fieldLabelInput = page
      .locator('.field-section:has(label:has-text("Label")) input')
      .first();
    await fieldLabelInput.waitFor({ state: "visible" });
    await fieldLabelInput.fill("Test Field");

    await page.waitForSelector(
      '.field-section:has(label:has-text("Type")) select',
      { timeout: 5000 },
    );
    const typeSelect = page
      .locator('.field-section:has(label:has-text("Type")) select')
      .first();
    await typeSelect.waitFor({ state: "visible" });
    await typeSelect.selectOption("plain");

    // Save the object kind
    await handleSave(page);

    // Navigate back to main page
    await page.click('button:has-text("← Back to Objects")');

    // Wait for main page to load
    await page.waitForSelector(".museum-admin-main, #wpm-react-admin-app-container-objects", { timeout: 10000 });

    // Navigate back to main objects page and count object kinds
    const objectKindCount = await countObjectKinds(page);

    // Verify exactly one object kind was created
    expect(objectKindCount).toBe(1);

    // Verify the new object kind appears in the list
    await expect(page.locator("text=Test Instrument").first()).toBeVisible();

    // Cleanup: Delete all object kinds
    await deleteAllObjectKinds(page);
  });

  test(
    "can create object kind matching instrument schema and export matches expected JSON",
    async ({ page }) => {
      await loginAsAdmin(page);

      // Clean up any existing object kinds before starting
      await deleteAllObjectKinds(page);
      // Load the expected instrument schema from test data
      const instrumentSchemaPath = path.join(
        __dirname,
        "../data/museum/instrument-simplified.json",
      );
      const expectedSchema = JSON.parse(
        fs.readFileSync(instrumentSchemaPath, "utf8"),
      );

      // Navigate to Museum Administration > Objects
      await page.goto("/wp-admin/admin.php?page=wpm-react-admin-objects");
      await page.waitForLoadState("domcontentloaded");

      // Wait for React app to load
      await page.waitForSelector(".museum-admin-main, #wpm-react-admin-app-container-objects", { timeout: 10000 });

      // Click "Add New Object Type" button
      await page.click('button:has-text("Add New Object Type")');

      // Wait for the edit page to load
      await page.waitForSelector(".edit-header h1", { timeout: 10000 });

      // Fill in object kind basic information to match instrument schema
      await page.locator(".kind-label-input").click();
      await page.keyboard.press("ControlOrMeta+a");
      await page
        .locator(".kind-label-input")
        .fill(expectedSchema.label);

      await page.locator(".kind-label-plural-input").click();
      await page.keyboard.press("ControlOrMeta+a");
      await page
        .locator(".kind-label-plural-input")
        .fill(expectedSchema.label_plural);

      await page.locator(".kind-description-textarea").click();
      await page.keyboard.press("ControlOrMeta+a");
      await page
        .locator(".kind-description-textarea")
        .fill(expectedSchema.description);

      if (expectedSchema.categorized) {
        await page.locator(".kind-categorized-checkbox").check();
      }

      // Add fields to match the instrument schema
      const fieldsArray = Object.values(expectedSchema.fields).sort(
        (a, b) => a.display_order - b.display_order,
      );

      for (const fieldData of fieldsArray) {
        // Click "Add New Field" button
        await page.click('button:has-text("Add New Field")');

        // Wait for network operations to complete after field creation
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(500);

        // Wait for the new field accordion to appear
        await page.waitForSelector("[id^='field-accordion-']", {
          timeout: 10000,
        });

        // Wait for DOM to stabilize
        await page.waitForTimeout(500);

        // Get the last field accordion (the newly added one)
        const fieldAccordion = page.locator("[id^='field-accordion-']").last();

        // Ensure the field is expanded (new fields should be expanded by default)
        const isCollapsed = await fieldAccordion.evaluate((el) =>
          el.classList.contains("collapsed"),
        );
        if (isCollapsed) {
          await fieldAccordion.locator(".expand-toggle").click();
          await page.waitForTimeout(500);
        }

        // Wait for field content to be visible and stable
        await page.waitForSelector(".field-content", { timeout: 5000 });
        await page.waitForTimeout(500);

        // Get the field content within this accordion
        const fieldContent = fieldAccordion.locator(".field-content");

        // Fill in field information - wait for each element to be stable
        await fieldContent
          .locator('.field-section:has(label:has-text("Label")) input')
          .waitFor({ state: "visible" });
        const fieldNameInput = fieldContent.locator(
          '.field-section:has(label:has-text("Label")) input',
        );
        await fieldNameInput.fill(fieldData.name);

        await fieldContent
          .locator('.field-section:has(label:has-text("Type")) select')
          .waitFor({ state: "visible" });
        const typeSelect = fieldContent.locator(
          '.field-section:has(label:has-text("Type")) select',
        );
        await typeSelect.selectOption(fieldData.type);

        // Set field options using the new checkbox structure
        if (fieldData.public) {
          await fieldContent
            .locator(
              '.checkbox-group:has(label:has-text("Public")) input[type="checkbox"]',
            )
            .check();
        } else {
          await fieldContent
            .locator(
              '.checkbox-group:has(label:has-text("Public")) input[type="checkbox"]',
            )
            .uncheck();
        }
        if (fieldData.required) {
          await fieldContent
            .locator(
              '.checkbox-group:has(label:has-text("Required")) input[type="checkbox"]',
            )
            .check();
        }
        if (fieldData.quick_browse) {
          await fieldContent
            .locator(
              '.checkbox-group:has(label:has-text("Quick Browse")) input[type="checkbox"]',
            )
            .check();
        }

        // Fill help text if present
        if (fieldData.help_text) {
          await fieldContent
            .locator('.field-section:has(label:has-text("Help Text")) input')
            .waitFor({ state: "visible" });
          const helpTextInput = fieldContent.locator(
            '.field-section:has(label:has-text("Help Text")) input',
          );
          await helpTextInput.click();
          await page.keyboard.press("ControlOrMeta+a");
          await helpTextInput.pressSequentially(fieldData.help_text, {
            delay: 25,
          });
        }

        // Set max length if specified and field type supports it
        if (
          fieldData.max_length &&
          fieldData.max_length > 0 &&
          (fieldData.type === "plain" || fieldData.type === "rich")
        ) {
          await fieldContent
            .locator('.field-section:has(label:has-text("Max Length")) input')
            .waitFor({ state: "visible" });
          const maxLengthInput = fieldContent.locator(
            '.field-section:has(label:has-text("Max Length")) input',
          );
          await maxLengthInput.click();
          await page.keyboard.press("ControlOrMeta+a");
          await maxLengthInput.pressSequentially(
            fieldData.max_length.toString(),
            { delay: 25 },
          );
        }

        // Set field schema if present
        if (fieldData.field_schema) {
          await fieldContent
            .locator('.field-section:has(label:has-text("Field Schema")) input')
            .waitFor({ state: "visible" });
          const fieldSchemaInput = fieldContent.locator(
            '.field-section:has(label:has-text("Field Schema")) input',
          );
          await fieldSchemaInput.click();
          await page.keyboard.press("ControlOrMeta+a");
          await fieldSchemaInput.pressSequentially(fieldData.field_schema, {
            delay: 25,
          });
        }
      }

      // Save the object kind
      await handleSave(page);

      // Navigate back to main objects page and count object kinds
      const objectKindCount = await countObjectKinds(page);

      // Verify exactly one object kind was created
      expect(objectKindCount).toBe(1);

      // Find the created object kind and click Export Kind
      const instrumentRow = page.locator('div:has-text("Instrument")').first();
      await instrumentRow.locator('button:has-text("Export Kind")').click();

      // Wait for download to start
      const downloadPromise = page.waitForEvent("download");
      const download = await downloadPromise;

      // Save the downloaded file temporarily
      const downloadPath = path.join(__dirname, "temp-export.json");
      await download.saveAs(downloadPath);

      // Read and parse the exported JSON
      const exportedContent = fs.readFileSync(downloadPath, "utf8");
      const exportedSchema = JSON.parse(exportedContent);

      // Clean up temp file
      fs.unlinkSync(downloadPath);

      // Compare key properties (excluding auto-generated IDs and system fields)
      expect(exportedSchema.label).toBe(expectedSchema.label);
      expect(exportedSchema.label_plural).toBe(expectedSchema.label_plural);
      expect(exportedSchema.description).toBe(expectedSchema.description);
      expect(exportedSchema.hierarchical).toBe(expectedSchema.hierarchical);

      // Verify fields structure exists and has correct count
      expect(exportedSchema.fields).toBeDefined();
      expect(Object.keys(exportedSchema.fields)).toHaveLength(
        Object.keys(expectedSchema.fields).length,
      );

      // Check each field has the expected properties
      for (const [fieldId, expectedField] of Object.entries(
        expectedSchema.fields,
      )) {
        const exportedField = Object.values(exportedSchema.fields).find(
          (f) => f.slug === expectedField.slug,
        );
        expect(exportedField).toBeDefined();
        expect(exportedField.name).toBe(expectedField.name);
        expect(exportedField.type).toBe(expectedField.type);
        expect(exportedField.public).toBe(expectedField.public);
        expect(exportedField.required).toBe(expectedField.required);
        expect(exportedField.quick_browse).toBe(expectedField.quick_browse);

        if (expectedField.help_text) {
          expect(exportedField.help_text).toBe(expectedField.help_text);
        }

        if (expectedField.max_length) {
          expect(exportedField.max_length).toBe(expectedField.max_length);
        }

        if (expectedField.field_schema) {
          expect(exportedField.field_schema).toBe(expectedField.field_schema);
        }
      }

      // Cleanup: Delete all object kinds
      await deleteAllObjectKinds(page);
    },
    { timeout: 120000 },
  );

  test("can navigate to objects admin page successfully", async ({ page }) => {
    await loginAsAdmin(page);
    // Navigate to Museum Administration > Objects
    await page.goto("/wp-admin/admin.php?page=wpm-react-admin-objects");
    await page.waitForLoadState("networkidle");

    // Check that the page has the React container first
    await expect(
      page.locator("#wpm-react-admin-app-container-objects"),
    ).toBeVisible();

    // Wait for React app to load with a longer timeout
    await page.waitForSelector(".museum-admin-main", { timeout: 15000 });

    // Verify page loaded correctly
    await expect(
      page.locator('h1:has-text("Museum Administration")'),
    ).toBeVisible();

    // Verify Add New Object Type button is present
    await expect(
      page.locator('button:has-text("Add New Object Type")'),
    ).toBeVisible();
  });
});
