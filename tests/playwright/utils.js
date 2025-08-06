const { expect } = require("@playwright/test");

/**
 * Utility functions for WordPress Playwright tests
 *
 * This module provides common functionality for testing WordPress sites with Playwright:
 * - Admin login functionality
 * - Plugin activation/deactivation
 * - Museum for WordPress specific helpers
 *
 * @example
 * // Basic usage in a test file:
 * const { loginAsAdmin, activateMuseumPlugin, setupMuseumTest } = require("./utils");
 *
 * test("my test", async ({ page }) => {
 *   await loginAsAdmin(page);
 *   // or
 *   await setupMuseumTest(page); // login + activate plugin
 * });
 */

/**
 * Login as WordPress admin user
 *
 * This function handles the complete login process, including:
 * - Checking if already logged in
 * - Navigating to login page
 * - Filling credentials
 * - Verifying successful login
 * - Handling various browser-specific timing issues
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string|null} adminUser - Admin username (defaults to TEST_WP_ADMIN_USER env var or 'admin')
 * @param {string|null} adminPass - Admin password (defaults to TEST_WP_ADMIN_PASS env var or 'admin')
 * @returns {Promise<string>} The username that was logged in
 *
 * @example
 * // Login with default credentials
 * const username = await loginAsAdmin(page);
 *
 * @example
 * // Login with custom credentials
 * const username = await loginAsAdmin(page, "myuser", "mypass");
 *
 * @throws {Error} If login fails or cannot be verified
 */
async function loginAsAdmin(page, adminUser = null, adminPass = null) {
  
  // Get credentials from parameters or environment variables
  const username = adminUser || process.env.TEST_WP_ADMIN_USER || "admin";
  const password = adminPass || process.env.TEST_WP_ADMIN_PASS || "admin";
  
  console.log(`Starting login process for user: ${username}`);

  // First check if we're already logged in by trying to access admin
  await page.goto("/wp-admin/");
  await page.waitForLoadState("domcontentloaded");

  // Check if we're already in admin area
  const currentUrl = page.url();
  
  if (
    currentUrl.includes("/wp-admin/") &&
    !currentUrl.includes("wp-login.php")
  ) {
    const adminBarExists = await page.locator("#wpadminbar").isVisible();
    const dashboardExists = await page.locator("#wpbody-content").isVisible();
    const adminMenuExists = await page.locator("#adminmenu").isVisible();
    

    if (adminBarExists || dashboardExists || adminMenuExists) {
      console.log("Already logged in, skipping login process");
      return username;
    }
  }

  // Wait for login form to load
  await page.waitForLoadState("domcontentloaded");

  // Check if login form exists
  const loginFormExists = await page
    .locator("#loginform")
    .isVisible({ timeout: 5000 });
  
  if (!loginFormExists) {
    console.log('Login form not found, attempting reload');
    // Try a page refresh in case of loading issues
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    const retryFormExists = await page
      .locator("#loginform")
      .isVisible({ timeout: 5000 });
    if (!retryFormExists) {
      throw new Error("Login form not found on login page after retry");
    }
  }
  

  // Clear any existing values and fill in login credentials
  await page.locator("#user_login").fill(username);
  await page.waitForTimeout(100);
  await page.locator("#user_pass").fill(password);
  await page.waitForTimeout(100);

  await page.locator("#user_pass").press("Enter");
  await page.waitForNavigation({ waitUntil: "domcontentloaded" });

  // Check if we're on login page with error
  const currentUrlAfterLogin = page.url();
  
  if (currentUrlAfterLogin.includes("wp-login.php")) {
    const loginError = await page.locator("#login_error").isVisible();
    if (loginError) {
      const errorText = await page.locator("#login_error").textContent();
      console.error(`Login failed: ${errorText}`);
      throw new Error(`Login failed: ${errorText}`);
    }
  }

  await page.goto("/wp-admin/");
  await page.waitForLoadState("domcontentloaded");

  // Verify we're in admin area
  const finalUrl = page.url();
  
  const adminBarExists = await page.locator("#wpadminbar").isVisible();
  const dashboardExists = await page.locator("#wpbody-content").isVisible();
  const adminMenuExists = await page.locator("#adminmenu").isVisible();

  const isInAdmin =
    finalUrl.includes("/wp-admin/") &&
    (adminBarExists || dashboardExists || adminMenuExists);


  if (!isInAdmin) {
    console.error('Login verification failed', {
      url: finalUrl,
      adminBar: adminBarExists,
      dashboard: dashboardExists,
      adminMenu: adminMenuExists
    });
    throw new Error(
      `Login verification failed. Current URL: ${finalUrl}, Admin elements found: bar=${adminBarExists}, dashboard=${dashboardExists}, menu=${adminMenuExists}`,
    );
  }

  console.log(`Successfully logged in as ${username}`);
  return username;
}

/**
 * Activate a WordPress plugin
 *
 * This function will:
 * - Navigate to the plugins page
 * - Check if plugin is already active
 * - Activate the plugin if not already active
 * - Verify activation was successful
 * - Not fail if plugin is already activated
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} pluginName - Display name of the plugin to activate
 * @param {string|null} pluginSlug - Plugin slug/identifier (optional, will be derived from name if not provided)
 * @returns {Promise<boolean>} True if plugin is active after the operation
 *
 * @example
 * // Activate by plugin name
 * await activatePlugin(page, "Hello Dolly");
 *
 * @example
 * // Activate with specific slug
 * await activatePlugin(page, "Hello Dolly", "hello-dolly");
 *
 * @throws {Error} If plugin cannot be found or activation fails
 */
async function activatePlugin(page, pluginName, pluginSlug = null) {
  // Derive plugin slug from name if not provided
  const slug =
    pluginSlug ||
    pluginName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "");

  // Navigate to plugins page
  await page.goto("/wp-admin/plugins.php");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForSelector("#the-list", { timeout: 10000 });

  // Check if plugin is already active
  const pluginRow = page
    .locator(`tr[data-slug="${slug}"], tr:has-text("${pluginName}")`)
    .first();
  const isActive = await pluginRow.locator(".plugin-title strong").isVisible();

  if (isActive) {
    // Plugin is already active, verify by checking for "Deactivate" link
    const deactivateLink = await pluginRow
      .locator('a:has-text("Deactivate")')
      .isVisible();
    if (deactivateLink) {
      return true;
    }
  }

  // Try to find and click activate link
  const activateLink = pluginRow.locator('a:has-text("Activate")');
  const activateLinkExists = await activateLink.isVisible();

  if (activateLinkExists) {
    await Promise.all([
      page.waitForLoadState("domcontentloaded"),
      activateLink.click(),
    ]);

    // Wait for success message or page reload
    await page.waitForTimeout(500);

    // Verify activation by checking for success notice or deactivate link
    const successNotice = page.locator(
      '.notice-success:has-text("Plugin activated")',
    );
    const deactivateLink = pluginRow.locator('a:has-text("Deactivate")');

    const isActivated =
      (await successNotice.isVisible()) || (await deactivateLink.isVisible());

    if (isActivated) {
      console.log(`Plugin "${pluginName}" activated successfully`);
      return true;
    } else {
      throw new Error(`Failed to activate plugin "${pluginName}"`);
    }
  } else {
    // Plugin might already be active or not found
    const pluginExists = await pluginRow.isVisible();
    if (pluginExists) {
      // Check if it's already active by looking for deactivate link
      const deactivateLink = await pluginRow
        .locator('a:has-text("Deactivate")')
        .isVisible();
      if (deactivateLink) {
        console.log(`Plugin "${pluginName}" is already active`);
        return true;
      } else {
        throw new Error(`Plugin "${pluginName}" found but cannot be activated`);
      }
    } else {
      throw new Error(`Plugin "${pluginName}" not found`);
    }
  }
}

/**
 * Activate the Museum for WordPress plugin specifically
 *
 * This is a convenience wrapper around activatePlugin() for the main
 * Museum for WordPress plugin. It uses the correct plugin name and slug.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<boolean>} True if plugin is active after the operation
 *
 * @example
 * await activateMuseumPlugin(page);
 *
 * @throws {Error} If plugin cannot be found or activation fails
 */
async function activateMuseumPlugin(page) {
  return await activatePlugin(page, "Museum for WordPress", "wp-museum");
}

/**
 * Ensure admin is logged in and Museum plugin is activated
 *
 * This is a convenience function that combines loginAsAdmin() and
 * activateMuseumPlugin() for tests that need both operations.
 * Most Museum for WordPress tests should use this function.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string|null} adminUser - Admin username (optional, uses env vars or defaults)
 * @param {string|null} adminPass - Admin password (optional, uses env vars or defaults)
 * @returns {Promise<void>}
 *
 * @example
 * // Setup for a typical Museum test
 * test("museum functionality", async ({ page }) => {
 *   await setupMuseumTest(page);
 *   // Now logged in as admin with Museum plugin active
 *   // ... rest of test
 * });
 *
 * @example
 * // Setup with custom credentials
 * await setupMuseumTest(page, "customuser", "custompass");
 *
 * @throws {Error} If login or plugin activation fails
 */
async function setupMuseumTest(page, adminUser = null, adminPass = null) {
  await loginAsAdmin(page, adminUser, adminPass);
  await activateMuseumPlugin(page);
}

/**
 * Delete all existing object kinds for test cleanup
 *
 * This function navigates to the objects admin page and deletes all
 * existing object kinds by clicking their Delete buttons and confirming
 * the deletion dialogs. Useful for cleaning up before/after tests.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<void>}
 *
 * @example
 * // Clean up all object kinds before a test
 * await deleteAllObjectKinds(page);
 *
 * @throws {Error} If navigation or deletion operations fail
 */
async function deleteAllObjectKinds(page) {
  // Navigate to Museum Administration > Objects
  await page.goto("/wp-admin/admin.php?page=wpm-react-admin-objects");
  await page.waitForLoadState("domcontentloaded");

  // Wait for React app to load with optimized selector
  await page.waitForSelector(
    ".museum-admin-main, #wpm-react-admin-app-container-objects",
    { timeout: 10000 },
  );

  // Set up dialog handler to automatically accept deletion confirmations
  // Remove any existing dialog handlers to avoid conflicts
  page.removeAllListeners("dialog");

  // Set up dialog handler to automatically accept deletion confirmations
  page.on("dialog", (dialog) => dialog.accept());

  // Keep deleting until no more delete buttons exist
  let hasDeleteButtons = true;
  while (hasDeleteButtons) {
    // Look for any Delete buttons
    const deleteButtons = page.locator('button:has-text("Delete")');
    const deleteButtonCount = await deleteButtons.count();

    if (deleteButtonCount === 0) {
      hasDeleteButtons = false;
      break;
    }

    // Click the first Delete button
    await deleteButtons.first().click();

    // Wait for deletion to process
    await page.waitForTimeout(200);

    // Wait for DOM to update
    await page.waitForLoadState("domcontentloaded");
  }
}

/**
 * Create a museum object kind
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {Object} kindData - Object kind configuration
 * @param {string} kindData.label - Singular label for the kind
 * @param {string} kindData.labelPlural - Plural label for the kind
 * @param {string} kindData.description - Description of the kind
 * @param {string} kindData.slug - URL slug for the kind (auto-generated if not provided)
 * @param {boolean} kindData.categorized - Whether objects can be categorized
 * @param {Array} kindData.fields - Array of field definitions
 * @returns {Promise<void>}
 *
 * @example
 * await createObjectKind(page, {
 *   label: "Instrument",
 *   labelPlural: "Instruments",
 *   description: "Scientific instruments",
 *   fields: [
 *     { name: "Manufacturer", type: "plain", required: true },
 *     { name: "Date", type: "date" }
 *   ]
 * });
 */
async function createObjectKind(page, kindData) {
  console.log(`Creating object kind: ${kindData.label}`);
  
  // Navigate to Museum Administration > Objects
  await page.goto("/wp-admin/admin.php?page=wpm-react-admin-objects");
  await page.waitForLoadState("domcontentloaded");

  // Wait for React app to load with optimized selector
  await page.waitForSelector(
    ".museum-admin-main, #wpm-react-admin-app-container-objects",
    { timeout: 10000 },
  );

  // Click "Add New Object Type" button
  const addButton = page.locator('button:has-text("Add New Object Type")');
  if (!(await addButton.isVisible({ timeout: 5000 }))) {
    throw new Error('Could not find Add New Object Type button');
  }
  await addButton.click();

  // Wait for the edit page to load
  await page.waitForSelector(".edit-header h1", { timeout: 10000 });

  // Fill in basic information
  const labelInput = page.locator('.kind-label-input');
  if (await labelInput.isVisible({ timeout: 5000 })) {
    await labelInput.fill(kindData.label);
  } else {
    throw new Error('Could not find label input');
  }

  await page
    .locator(".kind-label-plural-input")
    .fill(kindData.labelPlural || kindData.label + "s");

  if (kindData.description) {
    await page.locator(".kind-description-textarea").fill(kindData.description);
  }

  if (kindData.categorized) {
    await page.locator(".kind-categorized-checkbox").check();
  }

  // Add fields if provided
  if (kindData.fields && kindData.fields.length > 0) {
    for (const field of kindData.fields) {
      await page.click('button:has-text("Add New Field")');
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(500);

      // Wait for the field accordion
      await page.waitForSelector("[id^='field-accordion-']", {
        timeout: 10000,
      });
      await page.waitForTimeout(500);

      // Get the last field accordion (newly added)
      const fieldAccordion = page.locator("[id^='field-accordion-']").last();

      // Make sure the accordion is expanded by clicking on it if needed
      const accordionButton = fieldAccordion.locator("button").first();
      const isExpanded = await accordionButton.getAttribute("aria-expanded");
      if (isExpanded === "false") {
        await accordionButton.click();
        await page.waitForTimeout(500);
      }

      const fieldContent = fieldAccordion.locator(".field-content");

      // Fill field name with more robust selector options
      const fieldNameSelectors = [
        '.field-section:has(label:has-text("Label")) input',
        '.field-section:has(label:has-text("Name")) input',
        'input[name*="name"]',
        'input[placeholder*="name"]',
        '.field-content input[type="text"]',
      ];

      let fieldNameInput = null;
      for (const selector of fieldNameSelectors) {
        try {
          fieldNameInput = fieldContent.locator(selector);
          await fieldNameInput.waitFor({ state: "visible", timeout: 5000 });
          break;
        } catch (error) {
          console.log(
            `Field name selector ${selector} not found, trying next...`,
          );
        }
      }

      if (!fieldNameInput) {
        await page.screenshot({ path: "debug-no-field-input.png" });
        throw new Error("Could not find field name input");
      }

      await fieldNameInput.fill(field.name);

      // Set field type
      const typeSelectors = [
        '.field-section:has(label:has-text("Type")) select',
        'select[name*="type"]',
        ".field-content select",
      ];

      let typeSelect = null;
      for (const selector of typeSelectors) {
        try {
          typeSelect = fieldContent.locator(selector);
          if (await typeSelect.isVisible({ timeout: 3000 })) {
            console.log(`Found type select: ${selector}`);
            break;
          }
        } catch (error) {
          console.log(`Type selector ${selector} not found`);
        }
      }

      if (typeSelect) {
        await typeSelect.selectOption(field.type || "plain");
      }

      // Set field options
      if (field.required) {
        await fieldContent
          .locator(
            '.checkbox-group:has(label:has-text("Required")) input[type="checkbox"]',
          )
          .check();
      }
      if (field.public !== false) {
        // Default to public
        await fieldContent
          .locator(
            '.checkbox-group:has(label:has-text("Public")) input[type="checkbox"]',
          )
          .check();
      }
      if (field.quickBrowse) {
        await fieldContent
          .locator(
            '.checkbox-group:has(label:has-text("Quick Browse")) input[type="checkbox"]',
          )
          .check();
      }
    }
  }

  // Save the object kind
  console.log("Saving object kind...");
  const saveButton = page.locator('button:has-text("Save Changes")');
  await saveButton.click();
  await page.waitForTimeout(1500);

  // Check for success indicator (green "Last saved" message)
  const savedIndicator = page.locator(
    '.header-actions:has-text("Last saved:")',
  );

  if (await savedIndicator.isVisible({ timeout: 10000 })) {
    console.log("Object kind saved successfully");
  } else {
    // Check for error messages
    const errorMessage = page.locator(".notice-error, .error");
    if (await errorMessage.isVisible({ timeout: 5000 })) {
      const errorText = await errorMessage.textContent();
      console.log(`Error saving object kind: ${errorText}`);
      await page.screenshot({ path: "debug-save-error.png" });
    } else {
      console.log("No clear success/error message found");
      await page.screenshot({ path: "debug-save-unknown.png" });
    }
  }

  // Wait for WordPress to process the new post type
  await page.waitForTimeout(2000);

  // Verify the post type was created by checking the admin menu or posts list
  let slug = kindData.label.toLowerCase().replace(/\s+/g, "-");
  slug = postTypeFromSlug(slug);
  console.log(`Checking if post type ${slug} was created...`);

  // Try to navigate to the post type listing to verify it exists
  await page.goto(`/wp-admin/edit.php?post_type=${slug}`);
  await page.waitForTimeout(2000);

  const invalidPostType = page.locator(
    '.wp-die-message:has-text("Invalid post type")',
  );
  if (await invalidPostType.isVisible({ timeout: 3000 })) {
    console.log(`Post type ${slug} is not available yet, waiting more...`);
    await page.waitForTimeout(5000);

    // Try once more
    await page.goto(`/wp-admin/edit.php?post_type=${slug}`);
    await page.waitForTimeout(2000);

    if (await invalidPostType.isVisible({ timeout: 3000 })) {
      await page.screenshot({
        path: `debug-post-type-creation-failed-${slug}.png`,
      });
      throw new Error(
        `Post type ${slug} was not created successfully after saving object kind`,
      );
    }
  }

  console.log(`Post type ${slug} is available`);
}

/**
 * Create a simple museum object kind with basic fields
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} name - Name for the object kind (e.g., "Scientific Instrument")
 * @returns {Promise<string>} The slug of the created kind
 */
async function createSimpleObjectKind(page, name = "Test Object") {
  const slug = name.toLowerCase().replace(/\s+/g, "-");

  // Navigate to Museum Administration > Objects to check if kind already exists
  await page.goto("/wp-admin/admin.php?page=wpm-react-admin-objects");
  await page.waitForLoadState("domcontentloaded");

  // Wait for React app to load with optimized selector
  await page.waitForSelector(
    ".museum-admin-main, #wpm-react-admin-app-container-objects",
    { timeout: 10000 },
  );

  // Check if the object kind already exists by looking for it in the list
  const existingKindSelector = `.object-kind-row:has-text("${name}")`;
  const existingKind = await page.locator(existingKindSelector).first();

  if (await existingKind.isVisible({ timeout: 1000 })) {
    console.log(`Object kind "${name}" already exists, skipping creation`);
    return slug;
  }

  // If it doesn't exist, create it
  await createObjectKind(page, {
    label: name,
    labelPlural: name + "s",
    description: `${name} for testing`,
    fields: [
      { name: "Manufacturer", type: "plain" },
      { name: "Materials", type: "plain" },
      { name: "Accession Number", type: "plain" },
    ],
  });

  return slug;
}

function postTypeFromSlug(slug) {
  let postType = "wpm_" + slug;
  postType = postType.substring(0, 19);
  return postType;
}

/**
 * Create a museum object
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} postType - The post type slug (e.g., "scientific-instrument")
 * @param {Object} objectData - Object data
 * @param {string} objectData.title - Object title
 * @param {string} objectData.content - Object content/description
 * @param {Object} objectData.fields - Custom field values (key-value pairs)
 * @returns {Promise<void>}
 */
async function createMuseumObject(page, postType, objectData) {
  console.log(`Creating museum object with post type: ${postType}`);
  await page.goto(`/wp-admin/post-new.php?post_type=${postType}`);
  await page.waitForTimeout(1500);

  // Wait for editor to fully load by checking for specific elements
  await page.waitForLoadState("domcontentloaded");

  // Check if we got an "Invalid post type" error
  const invalidPostType = page.locator(
    '.wp-die-message:has-text("Invalid post type")',
  );
  if (await invalidPostType.isVisible({ timeout: 3000 })) {
    await page.screenshot({ path: `debug-invalid-post-type-${postType}.png` });
    throw new Error(
      `Invalid post type: ${postType}. The object kind may not have been created properly.`,
    );
  }

  // Take a screenshot for debugging
  await page.screenshot({ path: `debug-editor-${postType}.png` });

  // Check if we're in classic or block editor with multiple detection methods
  const blockEditorSelectors = [
    ".block-editor-writing-flow",
    ".edit-post-visual-editor",
    ".block-editor-block-list__layout",
    ".editor-post-title__input",
  ];

  let isBlockEditor = false;
  for (const selector of blockEditorSelectors) {
    try {
      if (await page.locator(selector).isVisible({ timeout: 5000 })) {
        isBlockEditor = true;
        console.log(`Detected block editor using selector: ${selector}`);
        break;
      }
    } catch (error) {
      console.log(`Block editor selector ${selector} not found`);
    }
  }

  // Wait for the editor to be ready by checking for key elements
  if (isBlockEditor) {
    // For block editor, wait for the title input to be ready
    await page.waitForSelector(
      ".editor-post-title__input, h1[aria-label='Add title']",
      { timeout: 10000 },
    );
  } else {
    // For classic editor, wait for the title input or post form
    await page.waitForSelector("#title, input[name='post_title'], #poststuff", {
      timeout: 10000,
    });
  }

  if (isBlockEditor) {
    // Handle modals
    await dismissEditorModals(page);

    // Add title with multiple selectors
    const titleSelectors = [
      ".editor-post-title__input",
      'h1[aria-label="Add title"]',
      ".wp-block-post-title",
      'input[placeholder*="title"]',
    ];

    let titleInput = null;
    for (const selector of titleSelectors) {
      try {
        titleInput = page.locator(selector);
        await titleInput.waitFor({ state: "visible", timeout: 5000 });
        break;
      } catch (error) {
      }
    }

    if (!titleInput) {
      await page.screenshot({ path: "debug-no-title-input.png" });
      throw new Error("Could not find title input in block editor");
    }

    await titleInput.fill(objectData.title);

    // Add content
    const contentSelectors = [
      ".wp-block-post-content > :first-child",
      ".block-editor-block-list__layout",
    ];

    let contentArea = null;
    for (const selector of contentSelectors) {
      try {
        contentArea = page.locator(selector);
        await contentArea.waitFor({ state: "visible", timeout: 5000 });
        break;
      } catch (error) {
      }
    }

    if (contentArea && objectData.content) {
      await contentArea.click();
      await contentArea.fill(objectData.content);
    }

    // Fill custom fields if metabox is present (block editor)
    if (objectData.fields) {
      for (const [fieldName, fieldValue] of Object.entries(objectData.fields)) {
        // Convert field name to slug format (e.g., \"Accession Number\" -> \"accession-number\")
        const fieldSlug = fieldName.toLowerCase().replace(/\\s+/g, "-");

        // Try multiple selector patterns for the field
        const fieldSelectors = [
          `input[name=\"${fieldSlug}\"]`,
          `textarea[name=\"${fieldSlug}\"]`,
          `input[name*=\"${fieldSlug}\"]`,
          `textarea[name*=\"${fieldSlug}\"]`,
          `input[id*=\"${fieldSlug}\"]`,
          `textarea[id*=\"${fieldSlug}\"]`,
        ];

        let fieldInput = null;
        for (const selector of fieldSelectors) {
          try {
            fieldInput = page.locator(selector).first();
            if (await fieldInput.isVisible({ timeout: 1000 })) {
              break;
            }
          } catch (error) {
          }
        }

        if (fieldInput && (await fieldInput.isVisible({ timeout: 1000 }))) {
          await fieldInput.fill(fieldValue);
        } else {
        }
      }
    }

    // Publish
    await page.click('button:has-text("Publish")');
    await page.waitForSelector(".editor-post-publish-panel");
    await page.click('.editor-post-publish-panel button:has-text("Publish")');
    await page.waitForTimeout(1000);
  } else {
    // Classic editor or custom post type editor
    console.log("Using classic editor or custom post type editor");

    // Try multiple title selectors for different post types
    const titleSelectors = [
      "#title",
      'input[name="post_title"]',
      'input[id*="title"]',
      '.wp-admin input[type="text"]',
      '#poststuff input[type="text"]',
    ];

    let titleInput = null;
    for (const selector of titleSelectors) {
      try {
        titleInput = page.locator(selector);
        await titleInput.waitFor({ state: "visible", timeout: 5000 });
        break;
      } catch (error) {
        console.log(`Title selector ${selector} not found in classic editor`);
      }
    }

    if (!titleInput) {
      await page.screenshot({ path: "debug-no-classic-title.png" });
      throw new Error("Could not find title input in classic editor");
    }

    await titleInput.fill(objectData.title);

    // Try multiple content selectors
    const contentSelectors = [
      "#content",
      'textarea[name="content"]',
      'textarea[id*="content"]',
      "#poststuff textarea",
    ];

    let contentInput = null;
    for (const selector of contentSelectors) {
      try {
        contentInput = page.locator(selector);
        if (await contentInput.isVisible({ timeout: 3000 })) {
          console.log(`Found content input: ${selector}`);
          break;
        }
      } catch (error) {
        console.log(`Content selector ${selector} not found in classic editor`);
      }
    }

    if (contentInput && objectData.content) {
      await contentInput.fill(objectData.content);
    }

    // Fill custom fields if metabox is present
    if (objectData.fields) {
      for (const [fieldName, fieldValue] of Object.entries(objectData.fields)) {
        // Convert field name to slug format (e.g., "Accession Number" -> "accession-number")
        const fieldSlug = fieldName.toLowerCase().replace(/\s+/g, "-");

        // Try multiple selector patterns for the field
        const fieldSelectors = [
          `input[name="${fieldSlug}"]`,
          `textarea[name="${fieldSlug}"]`,
          `input[name*="${fieldSlug}"]`,
          `textarea[name*="${fieldSlug}"]`,
          `input[id*="${fieldSlug}"]`,
          `textarea[id*="${fieldSlug}"]`,
        ];

        let fieldInput = null;
        for (const selector of fieldSelectors) {
          try {
            fieldInput = page.locator(selector).first();
            if (await fieldInput.isVisible({ timeout: 1000 })) {
              break;
            }
          } catch (error) {
          }
        }

        if (fieldInput && (await fieldInput.isVisible({ timeout: 1000 }))) {
          await fieldInput.fill(fieldValue);
        } else {
        }
      }
    }

    // Try multiple publish button selectors
    const publishSelectors = [
      "#publish",
      'input[name="publish"]',
      'input[value="Publish"]',
      '.submitdiv input[type="submit"]',
    ];

    let publishButton = null;
    for (const selector of publishSelectors) {
      try {
        publishButton = page.locator(selector);
        if (await publishButton.isVisible({ timeout: 3000 })) {
          console.log(`Found publish button: ${selector}`);
          break;
        }
      } catch (error) {
        console.log(`Publish selector ${selector} not found`);
      }
    }

    if (publishButton) {
      await publishButton.click();
      await page.waitForTimeout(3000);
    }
  }
}

/**
 * Dismiss WordPress editor modals (pattern inserter, welcome guide)
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<void>}
 */
async function dismissEditorModals(page) {
  // Wait briefly for any modals to appear
  await page.waitForTimeout(1000);

  // Try multiple approaches to close pattern chooser modal
  const modalExists = await page.locator('.components-modal__screen-overlay').first().isVisible({ timeout: 1000 });
  if (modalExists) {
    console.log('Modal overlay detected, attempting to close...');
    
    // Try clicking the X button with multiple selectors
    const closeSelectors = [
      'button[aria-label="Close"]',
      '.components-modal__header button',
      '.components-modal__header .components-button',
      'button:has-text("×")',
      'button[aria-label*="Close"]',
      '[role="button"][aria-label="Close"]'
    ];

    let modalClosed = false;
    for (const selector of closeSelectors) {
      try {
        const closeButton = page.locator(selector).first();
        if (await closeButton.isVisible({ timeout: 1000 })) {
          console.log(`Trying close button: ${selector}`);
          await closeButton.click({ force: true, timeout: 3000 });
          await page.waitForTimeout(500);
          modalClosed = !(await page.locator('.components-modal__screen-overlay').first().isVisible({ timeout: 1000 }));
          if (modalClosed) {
            console.log('Modal closed successfully');
            break;
          }
        }
      } catch (error) {
        console.log(`Close button ${selector} failed: ${error.message}`);
      }
    }

    // If modal still exists, try escape key
    if (!modalClosed) {
      console.log('Trying escape key');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  }

  // Try to click "Start blank" if available
  const startBlankButton = page
    .locator('button:has-text("Start blank"), button:has-text("Skip")')
    .first();
  if (await startBlankButton.isVisible({ timeout: 1500 })) {
    await startBlankButton.click();
    await page.waitForTimeout(500);
  }

  // Final cleanup with escape keys
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  // Wait for editor to stabilize
  await page.waitForTimeout(1000);
}

/**
 * Create a WordPress page with content
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {Object} pageData - Page data
 * @param {string} pageData.title - Page title
 * @param {string} pageData.content - Page content (can include block markup)
 * @returns {Promise<string>} URL of the created page
 */
async function createPage(page, pageData) {
  await page.goto("/wp-admin/post-new.php?post_type=page");
  await page.waitForTimeout(2000);

  const isBlockEditor = await page
    .locator(".block-editor-writing-flow")
    .isVisible({ timeout: 3000 });

  if (isBlockEditor) {
    await dismissEditorModals(page);
    await page.waitForSelector(".editor-post-title__input", { timeout: 10000 });
    await page.fill(".editor-post-title__input", pageData.title);

    if (pageData.content) {
      await page.click(
        ".block-editor-default-block-appender__content, .wp-block-post-content",
      );
      await page.keyboard.type(pageData.content);
    }

    // Fill custom fields if metabox is present (block editor)
    if (pageData.fields) {
      for (const [fieldName, fieldValue] of Object.entries(pageData.fields)) {
        // Convert field name to slug format (e.g., \"Accession Number\" -> \"accession-number\")
        const fieldSlug = fieldName.toLowerCase().replace(/\\s+/g, "-");

        // Try multiple selector patterns for the field
        const fieldSelectors = [
          `input[name=\"${fieldSlug}\"]`,
          `textarea[name=\"${fieldSlug}\"]`,
          `input[name*=\"${fieldSlug}\"]`,
          `textarea[name*=\"${fieldSlug}\"]`,
          `input[id*=\"${fieldSlug}\"]`,
          `textarea[id*=\"${fieldSlug}\"]`,
        ];

        let fieldInput = null;
        for (const selector of fieldSelectors) {
          try {
            fieldInput = page.locator(selector).first();
            if (await fieldInput.isVisible({ timeout: 1000 })) {
              break;
            }
          } catch (error) {
          }
        }

        if (fieldInput && (await fieldInput.isVisible({ timeout: 1000 }))) {
          await fieldInput.fill(fieldValue);
        } else {
        }
      }
    }

    // Publish
    await page.click('button:has-text("Publish")');
    await page.waitForSelector(".editor-post-publish-panel");
    await page.click('.editor-post-publish-panel button:has-text("Publish")');
    await page.waitForSelector(
      '.components-snackbar:has-text("published"), .editor-post-publish-panel__postpublish',
    );

    // Get URL
    const viewLink = await page.waitForSelector(
      '.post-publish-panel__postpublish-buttons a:has-text("View"), a:has-text("View Page")',
    );
    return await viewLink.getAttribute("href");
  } else {
    // Classic editor
    await page.fill("#title", pageData.title);
    await page.fill("#content", pageData.content || "");
    await page.click("#publish");
    await page.waitForLoadState("networkidle");

    const viewLink = await page.locator("#sample-permalink a, .view a").first();
    return await viewLink.getAttribute("href");
  }
}

/**
 * Insert a museum block in the block editor
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} blockName - Block name to search for (e.g., "basic search", "object grid")
 * @param {string} blockSelector - CSS selector to verify block was inserted
 * @returns {Promise<void>}
 */
async function insertMuseumBlock(page, blockName, blockSelector) {
  // Wait for editor to be ready and look for various inserter button variations
  await page.waitForTimeout(1000);

  let inserterButton = null;
  const inserterSelectors = [
    'button[aria-label="Block Inserter"]',
    'button[aria-label="Toggle block inserter"]',
    'button[aria-label="Add block"]',
    ".block-editor-inserter__toggle",
    ".edit-post-header-toolbar__inserter-toggle",
    'button[aria-label*="Insert"]',
    'button[aria-label*="Add"]',
  ];

  for (const selector of inserterSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 2000 });
      inserterButton = selector;
      console.log(`Found inserter button: ${selector}`);
      break;
    } catch (error) {
      console.log(`Inserter selector ${selector} not found, trying next...`);
    }
  }

  if (!inserterButton) {
    throw new Error("Could not find block inserter button");
  }

  // Open block inserter
  await page.click(inserterButton);
  await page.waitForTimeout(800);

  // Wait for inserter panel to open - try multiple selectors
  let searchInput = null;
  const searchSelectors = [
    ".block-editor-inserter__search input",
    ".block-editor-inserter__search-input",
    ".components-search-control__input",
    ".block-editor-inserter__search .components-base-control__field input",
    'input[placeholder*="Search"]',
    'input[placeholder*="search"]',
    ".block-editor-inserter__main-area input",
    ".block-editor-inserter__content input",
  ];

  for (const selector of searchSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      searchInput = selector;
      break;
    } catch (error) {
    }
  }

  if (!searchInput) {
    await page.screenshot({ path: "debug-no-search.png" });
    throw new Error("Could not find search input in inserter");
  }

  // Search for the block
  await page.fill(searchInput, blockName);
  await page.waitForTimeout(800);

  // Wait for search results and click the block
  const blockSelectors = [
    `.block-editor-block-types-list__item:has-text("${blockName}")`,
    `.block-editor-block-types-list__list-item:has-text("${blockName}")`,
    `.components-button:has-text("${blockName}")`,
    `button:has-text("${blockName}")`,
  ];

  let blockButton = null;
  for (const selector of blockSelectors) {
    try {
      blockButton = page.locator(selector).first();
      await blockButton.waitFor({ state: "visible", timeout: 5000 });
      break;
    } catch (error) {
    }
  }

  if (!blockButton) {
    await page.screenshot({ path: "debug-no-block-button.png" });
    throw new Error(`Could not find block button for "${blockName}"`);
  }

  await blockButton.click();

  // Wait for block to be inserted
  await page.waitForSelector(blockSelector, { timeout: 10000 });
}

/**
 * Create a page with a museum block
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} title - Page title
 * @param {string} blockName - Block name to insert
 * @param {string} blockSelector - CSS selector for the block
 * @returns {Promise<string>} URL of the created page
 */
async function createPageWithBlock(page, title, blockName, blockSelector) {
  await page.goto("/wp-admin/post-new.php?post_type=page");
  await page.waitForTimeout(1500);

  // Wait for editor to be fully loaded - try multiple selectors
  try {
    await page.waitForSelector(".block-editor-writing-flow", {
      timeout: 10000,
    });
  } catch (error) {
    console.log("Block editor not detected, checking for classic editor...");
    // Check if we're in classic editor instead
    const isClassic = await page
      .locator("#post-body")
      .isVisible({ timeout: 5000 });
    if (isClassic) {
      throw new Error(
        "Classic editor detected - this function requires block editor",
      );
    }
    throw error;
  }

  await page.waitForTimeout(1000);

  await dismissEditorModals(page);

  // Wait for title input to be ready
  await page.waitForSelector(".editor-post-title__input", { timeout: 10000 });
  await page.fill(".editor-post-title__input", title);

  await insertMuseumBlock(page, blockName, blockSelector);

  // Publish
  await page.click('button:has-text("Publish")');
  await page.waitForSelector(".editor-post-publish-panel");
  await page.click('.editor-post-publish-panel button:has-text("Publish")');
  await page.waitForSelector(
    '.components-snackbar:has-text("published"), .editor-post-publish-panel__postpublish',
  );

  // Get URL
  const viewLink = await page.waitForSelector(
    '.post-publish-panel__postpublish-buttons a:has-text("View"), a:has-text("View Page")',
  );
  return await viewLink.getAttribute("href");
}

module.exports = {
  loginAsAdmin,
  activatePlugin,
  activateMuseumPlugin,
  setupMuseumTest,
  deleteAllObjectKinds,
  createObjectKind,
  createSimpleObjectKind,
  createMuseumObject,
  dismissEditorModals,
  createPage,
  insertMuseumBlock,
  createPageWithBlock,
  postTypeFromSlug,
};
