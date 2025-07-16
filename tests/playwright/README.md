# Playwright Testing Utilities for Museum for WordPress

This directory contains Playwright end-to-end tests and utilities for the Museum for WordPress plugin.

## Setup

Tests are configured to run against the local development environment using Lando. The base URL is set to `https://wp-test.lndo.site` in the Playwright configuration.

### Prerequisites

- Lando environment set up and running
- WordPress site accessible at `https://wp-test.lndo.site`
- Admin credentials configured (see Environment Variables below)

### Environment Variables

The following environment variables can be set to customize test behavior:

- `TEST_WP_ADMIN_USER` - WordPress admin username (default: "admin")
- `TEST_WP_ADMIN_PASS` - WordPress admin password (default: "admin")
- `TEST_WP_ADMIN_EMAIL` - WordPress admin email (default: "admin@test.com")

## Running Tests

```bash
# Run all Playwright tests
lando playwright

# Run with HTML reporter
lando playwright-html

# Run specific test file
lando playwright tests/playwright/plugin-basic-functionality.spec.js

# Run tests sequentially (recommended for login-heavy tests)
lando playwright --workers=1

# Run specific test by name
lando playwright --grep="can activate Museum for WordPress plugin"

# Run utility validation tests
lando playwright tests/playwright/utils-validation.spec.js

# Run a specific utility test
lando playwright --grep="createObjectKind creates a complete object kind"
```

## Test Utilities

The `utils.js` file provides common functionality for WordPress and Museum plugin testing:

### `loginAsAdmin(page, adminUser?, adminPass?)`

Logs in as WordPress admin user. Handles various edge cases including:
- Checking if already logged in
- Browser-specific timing issues
- Login verification across different browsers

```javascript
const { loginAsAdmin } = require("./utils");

test("my test", async ({ page }) => {
  await loginAsAdmin(page);
  // Now logged in as admin
});
```

### `activatePlugin(page, pluginName, pluginSlug?)`

Activates a WordPress plugin by name. Safe to call multiple times - won't fail if plugin is already active.

```javascript
const { activatePlugin } = require("./utils");

test("my test", async ({ page }) => {
  await loginAsAdmin(page);
  await activatePlugin(page, "Hello Dolly");
});
```

### `activateMuseumPlugin(page)`

Convenience function to activate the Museum for WordPress plugin specifically.

```javascript
const { activateMuseumPlugin } = require("./utils");

test("my test", async ({ page }) => {
  await loginAsAdmin(page);
  await activateMuseumPlugin(page);
});
```

### `setupMuseumTest(page, adminUser?, adminPass?)`

Combined function that logs in as admin AND activates the Museum plugin. This is the recommended starting point for most Museum-related tests.

```javascript
const { setupMuseumTest } = require("./utils");

test("museum functionality", async ({ page }) => {
  await setupMuseumTest(page);
  // Now logged in as admin with Museum plugin active
  // ... test Museum functionality
});
```

### `deleteAllObjectKinds(page)`

Delete all existing object kinds for test cleanup.

```javascript
const { deleteAllObjectKinds } = require("./utils");

await deleteAllObjectKinds(page);
```

### `createObjectKind(page, kindData)`

Create a museum object kind with specified configuration.

```javascript
const { createObjectKind } = require("./utils");

await createObjectKind(page, {
  label: "Instrument",
  labelPlural: "Instruments", 
  description: "Scientific instruments",
  categorized: true,
  fields: [
    { name: "Manufacturer", type: "plain", required: true },
    { name: "Date", type: "date", public: true },
    { name: "Materials", type: "plain", quickBrowse: true }
  ]
});
```

### `createSimpleObjectKind(page, name)`

Create a basic object kind with default fields (Manufacturer, Materials, Accession Number).

```javascript
const { createSimpleObjectKind } = require("./utils");

const kindSlug = await createSimpleObjectKind(page, "Scientific Instrument");
// Returns: "scientific-instrument"
```

### `createMuseumObject(page, postType, objectData)`

Create a museum object of a specific kind.

```javascript
const { createMuseumObject } = require("./utils");

await createMuseumObject(page, "scientific-instrument", {
  title: "Victorian Microscope",
  content: "A brass compound microscope from the Victorian era.",
  fields: {
    manufacturer: "Ernst Leitz",
    materials: "Brass, glass",
    "accession-number": "2024.001"
  }
});
```

### `createPageWithBlock(page, title, blockName, blockSelector)`

Create a WordPress page with a specific museum block.

```javascript
const { createPageWithBlock } = require("./utils");

const pageUrl = await createPageWithBlock(
  page,
  "Search Page",
  "Basic Search",
  ".wp-block-wp-museum-basic-search"
);
```

### `dismissEditorModals(page)`

Dismiss WordPress editor modals (pattern inserter, welcome guide) that appear when creating new posts/pages.

```javascript
const { dismissEditorModals } = require("./utils");

await page.goto("/wp-admin/post-new.php?post_type=page");
await dismissEditorModals(page);
// Editor is now ready for interaction
```

## Test Files

### `wordpress-basic-functionality.spec.js`
Basic WordPress functionality tests including:
- Front page loads
- Admin login works

### `plugin-basic-functionality.spec.js`
Museum for WordPress plugin tests including:
- Plugin activation
- Admin menu creation
- Settings page access

### `museum-object-kinds.spec.js`
Tests for Museum object kinds functionality (existing).

### `basic-search-block.spec.js`
Tests for the Basic Search block including:
- Adding the block to a page
- Search with "Only search titles" checked (default)
- Search with "Only search titles" unchecked (searches title, content, and custom fields)
- Search results pagination
- Keyboard navigation (Enter key)
- Empty search handling

### `utils-validation.spec.js`
Tests for validating the utility functions including:
- `createObjectKind` - Creates complex object kinds with multiple fields
- `createSimpleObjectKind` - Creates basic object kinds with default fields
- `createMuseumObject` - Creates objects with custom field values
- `dismissEditorModals` - Properly handles WordPress editor modals
- `createPage` - Creates pages with content
- `insertMuseumBlock` - Inserts museum blocks into the editor
- `createPageWithBlock` - Creates complete pages with museum blocks
- `deleteAllObjectKinds` - Removes all object kinds for cleanup
- Error handling and complex workflows using multiple utilities

## Best Practices

1. **Use `setupMuseumTest()` for Museum tests** - This ensures both login and plugin activation
2. **Run tests sequentially for reliability** - Use `--workers=1` flag to avoid login conflicts
3. **Check existing utilities** - Before writing custom login/activation code, use the provided utilities
4. **Handle async operations** - Always await utility functions as they return Promises
5. **Use descriptive test names** - Test names should clearly indicate what functionality is being tested

## Troubleshooting

### Login Issues
- Try running tests with `--workers=1` to avoid concurrent login attempts
- Check that credentials are correct in environment variables
- Verify WordPress site is accessible at the configured base URL

### Plugin Activation Issues
- Ensure the plugin is properly installed in the WordPress site
- Check that the plugin name matches exactly (case-sensitive)
- Verify admin user has permission to activate plugins

### Timeout Issues
- The utilities include built-in waits and retries
- For slow environments, consider increasing timeouts in individual tests
- Use `page.waitForLoadState("networkidle")` for dynamic content

## Configuration

Playwright configuration is in `playwright.config.js`. Key settings:
- Base URL: `https://wp-test.lndo.site`
- Browsers: Chromium, Firefox, WebKit
- Global setup: `global-setup.js` (loads environment variables)
- Parallel execution: Enabled by default (disable with `--workers=1`)