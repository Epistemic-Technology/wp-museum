const { test, expect } = require("@playwright/test");
const {
  setupMuseumTest,
  deleteAllObjectKinds,
  createObjectKind,
  postTypeFromSlug,
  dismissEditorModals,
} = require("./utils");

/**
 * Reproduce the tab-navigation bug in the object-meta block editor.
 *
 * When editing a museum object, keyboard tab navigation through the field
 * inputs works as expected for plain inputs, but as soon as focus enters a
 * RichText field and Tab is pressed, focus escapes the object-meta block
 * (e.g., into the block toolbar or the post-settings sidebar) instead of
 * landing on the next field. This test reproduces that behaviour.
 */

const KIND_LABEL = "Tab Test Instrument";
const KIND_SLUG = "tab-test-instrument";
const POST_TYPE = postTypeFromSlug(KIND_SLUG);

const FIELDS = [
  { name: "Field A", type: "plain" },
  { name: "Field B", type: "rich" },
  { name: "Field C", type: "plain" },
  { name: "Field D", type: "rich" },
  { name: "Field E", type: "plain" },
];

test.describe("Object meta tab navigation", () => {
  test.beforeEach(async ({ page }) => {
    await setupMuseumTest(page);
    await deleteAllObjectKinds(page);
    await createObjectKind(page, {
      label: KIND_LABEL,
      labelPlural: `${KIND_LABEL}s`,
      description: "Object kind for tab-navigation test",
      fields: FIELDS,
    });
  });

  test.afterEach(async ({ page }) => {
    await deleteAllObjectKinds(page);
  });

  test("tab moves between fields without escaping the object-meta block", async ({
    page,
  }) => {
    await page.goto(`/wp-admin/post-new.php?post_type=${POST_TYPE}`);
    await page.waitForLoadState("domcontentloaded");

    // Bail early if the post type wasn't created.
    const invalidPostType = page.locator(
      '.wp-die-message:has-text("Invalid post type")',
    );
    if (await invalidPostType.isVisible({ timeout: 2000 })) {
      throw new Error(
        `Post type ${POST_TYPE} not registered — object kind creation likely failed.`,
      );
    }

    await dismissEditorModals(page);

    // Wait for the object-meta block to render its field rows.
    const fieldsContainer = page.locator(".object-meta-fields-container");
    await fieldsContainer.waitFor({ state: "visible", timeout: 15000 });

    // Wait for one row per field defined above.
    await expect(fieldsContainer.locator(".object-meta-row")).toHaveCount(
      FIELDS.length,
      { timeout: 15000 },
    );

    // Focus the first field's input.
    const firstInput = fieldsContainer.locator('input[name="field-a"]');
    await firstInput.click();
    await expect(firstInput).toBeFocused();

    // Helper: returns true iff document.activeElement is inside the
    // object-meta-fields-container.
    const focusIsInsideFields = () =>
      page.evaluate(() => {
        const container = document.querySelector(
          ".object-meta-fields-container",
        );
        return !!(
          container &&
          document.activeElement &&
          container.contains(document.activeElement)
        );
      });

    // Helper: a short description of where focus currently is, useful for
    // diagnostics when the test fails.
    const describeFocus = () =>
      page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return "<no active element>";
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : "";
        const cls = el.className
          ? `.${String(el.className).trim().replace(/\s+/g, ".")}`
          : "";
        const name = el.getAttribute("name");
        const aria = el.getAttribute("aria-label");
        return `${tag}${id}${cls}${name ? `[name="${name}"]` : ""}${
          aria ? `[aria-label="${aria}"]` : ""
        }`;
      });

    // Returns the ordered list of focusable elements inside the field
    // container, as identifiers we can compare against describeFocus().
    const fieldFocusableIds = () =>
      page.evaluate(() => {
        const container = document.querySelector(
          ".object-meta-fields-container",
        );
        if (!container) return [];
        const selector = [
          'input:not([disabled]):not([type="hidden"])',
          "select:not([disabled])",
          "textarea:not([disabled])",
          '[contenteditable="true"]',
        ].join(",");
        return Array.from(container.querySelectorAll(selector)).map((el) => {
          const tag = el.tagName.toLowerCase();
          const name = el.getAttribute("name");
          const cls = el.className
            ? `.${String(el.className).trim().replace(/\s+/g, ".")}`
            : "";
          return `${tag}${cls}${name ? `[name="${name}"]` : ""}`;
        });
      });

    const expectedSequence = await fieldFocusableIds();
    expect(
      expectedSequence.length,
      "expected at least one focusable per field row",
    ).toBeGreaterThanOrEqual(FIELDS.length);

    // Tab through every field. After each Tab, focus must still be inside
    // the object-meta fields container AND must have advanced to the next
    // focusable in DOM order.
    for (let i = 0; i < expectedSequence.length - 1; i++) {
      const before = await describeFocus();
      await page.keyboard.press("Tab");
      // Give the editor a moment to settle (block toolbars can appear).
      await page.waitForTimeout(150);
      const stillInside = await focusIsInsideFields();
      const after = await describeFocus();
      expect(
        stillInside,
        `Tab #${i + 1} from ${before} escaped the object-meta block: focus now at ${after}`,
      ).toBe(true);
      expect(
        after,
        `Tab #${i + 1} should have moved from ${before} to ${expectedSequence[i + 1]}, got ${after}`,
      ).toBe(expectedSequence[i + 1]);
    }
  });
});
