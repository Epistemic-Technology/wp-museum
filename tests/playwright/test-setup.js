/**
 * Optimized test setup utilities for faster, more reliable Playwright tests
 */

const { setupMuseumTest, deleteAllObjectKinds } = require('./utils');

/**
 * Shared test state to minimize redundant operations
 */
let isPluginActivated = false;
let adminLoginState = null;

/**
 * Fast setup that reuses login state and plugin activation
 */
async function fastSetup(page) {
  if (!isPluginActivated) {
    await setupMuseumTest(page);
    isPluginActivated = true;
    // Store login state
    adminLoginState = await page.context().storageState();
  } else if (adminLoginState) {
    // Reuse stored login state
    await page.context().addCookies(adminLoginState.cookies);
  }
}

/**
 * Clean setup for tests that need a fresh object kinds state
 */
async function cleanSetup(page) {
  await fastSetup(page);
  // Only delete object kinds if there are any
  await page.goto("/wp-admin/admin.php?page=wpm-react-admin-objects");
  await page.waitForLoadState("domcontentloaded");
  
  const hasObjectKinds = await page.locator('button:has-text("Delete")').count() > 0;
  if (hasObjectKinds) {
    await deleteAllObjectKinds(page);
  }
}

/**
 * Reset shared state (for use between test files)
 */
function resetTestState() {
  isPluginActivated = false;
  adminLoginState = null;
}

module.exports = {
  fastSetup,
  cleanSetup,
  resetTestState
};