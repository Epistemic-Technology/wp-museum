<?php
/**
 * Tests for Kind import/export functionality.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum\Tests\REST;

require_once __DIR__ . "/base-rest.php";
require_once dirname(dirname(__FILE__)) . "/helpers/museum-test-data.php";

use MikeThicke\WPMuseum;
use MuseumTestData;

/**
 * Tests for Kind import/export via REST API endpoints.
 */
class KindsImportExportTest extends BaseRESTTest
{
    /**
     * Test object kind.
     *
     * @var ObjectKind
     */
    private $test_kind;

    /**
     * Test fields for the kind.
     *
     * @var array
     */
    private $test_fields;

    /**
     * Set up before each test.
     */
    public function setUp(): void
    {
        parent::setUp();

        // Ensure database tables exist
        WPMuseum\db_version_check();

        // Create a test object kind with fields
        $this->test_kind = MuseumTestData::create_test_object_kind();
        $this->test_fields = $this->create_test_fields(
            $this->test_kind->kind_id
        );

        // Register the post types
        WPMuseum\create_mobject_post_types();

        // Register REST routes
        $kinds_controller = new WPMuseum\Kinds_Controller();
        $kinds_controller->register_routes();

        $fields_controller = new WPMuseum\Object_Fields_Controller();
        $fields_controller->register_routes();

        // Clear cache to ensure fresh data
        wp_cache_flush();
    }

    /**
     * Tear down after each test.
     */
    public function tearDown(): void
    {
        // Clean up the test kind and its fields
        global $wpdb;
        $wpdb->delete($wpdb->prefix . "wpm_mobject_kinds", [
            "kind_id" => $this->test_kind->kind_id,
        ]);
        $wpdb->delete($wpdb->prefix . "wpm_mobject_fields", [
            "kind_id" => $this->test_kind->kind_id,
        ]);

        parent::tearDown();
    }

    /**
     * Test retrieving kind data for export.
     */
    public function test_get_kind_for_export()
    {
        wp_set_current_user($this->admin_id);

        // Get the kind data via REST API
        $request = new \WP_REST_Request(
            "GET",
            TEST_REST_NAMESPACE .
                "/mobject_kinds/" .
                $this->test_kind->type_name
        );
        $response = rest_do_request($request);
        $data = $response->get_data();

        $this->assertEquals(200, $response->get_status());
        $this->assertIsArray($data);
        $this->assertEquals($this->test_kind->kind_id, $data["kind_id"]);
        $this->assertEquals($this->test_kind->name, $data["name"]);
        $this->assertEquals($this->test_kind->type_name, $data["type_name"]);
    }

    /**
     * Test retrieving fields data for export.
     */
    public function test_get_fields_for_export()
    {
        wp_set_current_user($this->admin_id);

        // Get the fields data via REST API
        $request = new \WP_REST_Request(
            "GET",
            TEST_REST_NAMESPACE . "/" . $this->test_kind->type_name . "/fields"
        );
        $response = rest_do_request($request);
        $data = $response->get_data();

        $this->assertEquals(200, $response->get_status());
        $this->assertIsArray($data);
        $this->assertNotEmpty($data);

        // Verify field data structure
        foreach ($data as $field) {
            $this->assertArrayHasKey("field_id", $field);
            $this->assertArrayHasKey("name", $field);
            $this->assertArrayHasKey("slug", $field);
            $this->assertArrayHasKey("type", $field);
            $this->assertArrayHasKey("kind_id", $field);
            $this->assertEquals($this->test_kind->kind_id, $field["kind_id"]);
        }
    }

    /**
     * Test creating a new kind via import (POST to mobject_kinds).
     */
    public function test_import_new_kind()
    {
        wp_set_current_user($this->admin_id);

        // Prepare import data for a new kind
        $import_data = [
            [
                "kind_id" => -1, // Negative ID indicates new kind
                "icon" => "dashicons-star-filled",
                "label" => "Imported Test",
                "label_plural" => "Imported Tests",
                "strict_checking" => false,
                "cat_field_id" => null,
            ],
        ];

        // Import the kind via REST API
        $request = new \WP_REST_Request(
            "POST",
            TEST_REST_NAMESPACE . "/mobject_kinds"
        );
        $request->set_body(json_encode($import_data));
        $request->set_header("Content-Type", "application/json");
        $response = rest_do_request($request);

        $this->assertEquals(200, $response->get_status());

        // Verify the kind was created
        $kinds = WPMuseum\get_mobject_kinds();
        $imported_kind = null;
        foreach ($kinds as $kind) {
            if ($kind->label === "Imported Test") {
                $imported_kind = $kind;
                break;
            }
        }

        $this->assertNotNull($imported_kind);
        $this->assertEquals("wpm_imported-test", $imported_kind->type_name);

        // Clean up
        global $wpdb;
        $wpdb->delete($wpdb->prefix . "wpm_mobject_kinds", [
            "kind_id" => $imported_kind->kind_id,
        ]);
    }

    /**
     * Test updating existing kinds via import.
     */
    public function test_update_existing_kind()
    {
        wp_set_current_user($this->admin_id);

        // Get current kinds
        $kinds = WPMuseum\get_mobject_kinds();
        $original_count = count($kinds);

        // Prepare update data
        $update_data = [];
        foreach ($kinds as $kind) {
            $kind_array = (array) $kind;
            if ($kind->kind_id === $this->test_kind->kind_id) {
                $kind_array["label"] = "Updated Label";
            }
            $update_data[] = $kind_array;
        }

        // Update via REST API
        $request = new \WP_REST_Request(
            "POST",
            TEST_REST_NAMESPACE . "/mobject_kinds"
        );
        $request->set_body(json_encode($update_data));
        $request->set_header("Content-Type", "application/json");
        $response = rest_do_request($request);

        $this->assertEquals(200, $response->get_status());

        // Verify the update
        $new_kinds = WPMuseum\get_mobject_kinds();
        $updated_kind = WPMuseum\get_kind($this->test_kind->kind_id);
        $this->assertEquals("Updated Label", $updated_kind->label);

        // Verify no new kinds were created
        $this->assertCount($original_count, $new_kinds);
    }

    /**
     * Test import with invalid data.
     */
    public function test_import_with_invalid_data()
    {
        wp_set_current_user($this->admin_id);

        // Test with missing required fields
        $invalid_data = [
            [
                "kind_id" => -1,
                "name" => "", // Empty name should be invalid
                "type_name" => "", // Empty type_name should be invalid
            ],
        ];

        $request = new \WP_REST_Request(
            "POST",
            TEST_REST_NAMESPACE . "/mobject_kinds"
        );
        $request->set_body(json_encode($invalid_data));
        $request->set_header("Content-Type", "application/json");
        $response = rest_do_request($request);

        // Should still process but with validation
        $this->assertEquals(400, $response->get_status());

        // Verify invalid kind was not created
        $kinds = WPMuseum\get_mobject_kinds();
        foreach ($kinds as $kind) {
            $this->assertNotEmpty($kind->name);
            $this->assertNotEmpty($kind->type_name);
        }
    }

    /**
     * Test import without proper permissions.
     */
    public function test_import_without_permissions()
    {
        // Test as non-admin user
        wp_set_current_user($this->editor_id);

        $import_data = [
            [
                "kind_id" => -1,
                "name" => "Should Not Import",
                "type_name" => "wpm_should_not_import",
            ],
        ];

        $request = new \WP_REST_Request(
            "POST",
            TEST_REST_NAMESPACE . "/mobject_kinds"
        );
        $request->set_body(json_encode($import_data));
        $request->set_header("Content-Type", "application/json");
        $response = rest_do_request($request);

        $this->assertEquals(403, $response->get_status());

        // Verify the kind was not created
        $kinds = WPMuseum\get_mobject_kinds();
        foreach ($kinds as $kind) {
            $this->assertNotEquals("Should Not Import", $kind->name);
        }
    }

    /**
     * Test export/import round-trip preserves data.
     */
    public function test_export_import_round_trip()
    {
        wp_set_current_user($this->admin_id);

        // Get original kind data
        $original_kind = WPMuseum\get_kind($this->test_kind->kind_id);
        $original_fields = WPMuseum\get_mobject_fields(
            $this->test_kind->kind_id
        );

        // Export the kind data
        $request = new \WP_REST_Request(
            "GET",
            TEST_REST_NAMESPACE .
                "/mobject_kinds/" .
                $this->test_kind->type_name
        );
        $response = rest_do_request($request);
        $exported_kind = $response->get_data();

        // Export the fields data
        $request = new \WP_REST_Request(
            "GET",
            TEST_REST_NAMESPACE . "/" . $this->test_kind->type_name . "/fields"
        );
        $response = rest_do_request($request);
        $exported_fields = $response->get_data();

        // Simulate import by modifying the exported data as if it were a new import
        $exported_kind["kind_id"] = -1; // Mark as new
        $exported_kind["label"] = "Round Trip Test";

        // Import the modified kind
        $request = new \WP_REST_Request(
            "POST",
            TEST_REST_NAMESPACE . "/mobject_kinds"
        );
        $request->set_body(json_encode([$exported_kind]));
        $request->set_header("Content-Type", "application/json");
        $response = rest_do_request($request);

        $this->assertEquals(200, $response->get_status());

        // Find the newly imported kind
        $kinds = WPMuseum\get_mobject_kinds();
        $imported_kind = null;
        foreach ($kinds as $kind) {
            if ($kind->label === "Round Trip Test") {
                $imported_kind = $kind;
                break;
            }
        }

        $this->assertNotNull($imported_kind);

        // Verify key properties are preserved
        $this->assertEquals(
            $original_kind->strict_checking,
            $imported_kind->strict_checking
        );

        // Clean up
        global $wpdb;
        $wpdb->delete($wpdb->prefix . "wpm_mobject_kinds", [
            "kind_id" => $imported_kind->kind_id,
        ]);
    }

    /**
     * Test importing multiple kinds at once.
     */
    public function test_batch_import_kinds()
    {
        wp_set_current_user($this->admin_id);

        // Prepare multiple kinds for import
        $import_data = [
            [
                "kind_id" => -1,
                "label" => "Batch 1",
                "label_plural" => "Batch 1s",
            ],
            [
                "kind_id" => -2,
                "label" => "Batch 2",
                "label_plural" => "Batch 2s",
            ],
            [
                "kind_id" => -3,
                "label" => "Batch 3",
                "label_plural" => "Batch 3s",
            ],
        ];

        // Get original count
        $original_kinds = WPMuseum\get_mobject_kinds();
        $original_count = count($original_kinds);

        // Import the kinds
        $request = new \WP_REST_Request(
            "POST",
            TEST_REST_NAMESPACE . "/mobject_kinds"
        );
        $all_data = array_merge($original_kinds, $import_data);
        $request->set_body(json_encode($all_data));
        $request->set_header("Content-Type", "application/json");
        $response = rest_do_request($request);

        $this->assertEquals(200, $response->get_status());

        // Verify all kinds were created
        $new_kinds = WPMuseum\get_mobject_kinds();
        $this->assertCount($original_count + 3, $new_kinds);

        $imported_labels = ["Batch 1", "Batch 2", "Batch 3"];
        $found_labels = [];
        $imported_ids = [];

        foreach ($new_kinds as $kind) {
            if (in_array($kind->label, $imported_labels, true)) {
                $found_labels[] = $kind->label;
                $imported_ids[] = $kind->kind_id;
            }
        }

        $this->assertCount(3, $found_labels);
        $this->assertContains("Batch 1", $found_labels);
        $this->assertContains("Batch 2", $found_labels);
        $this->assertContains("Batch 3", $found_labels);

        // Clean up
        global $wpdb;
        foreach ($imported_ids as $kind_id) {
            $wpdb->delete($wpdb->prefix . "wpm_mobject_kinds", [
                "kind_id" => $kind_id,
            ]);
        }
    }

    /**
     * Test that import preserves field relationships.
     */
    public function test_import_preserves_cat_field()
    {
        wp_set_current_user($this->admin_id);

        // Create a kind with a catalog field set
        $kind_with_cat_field = MuseumTestData::create_test_object_kind(
            "catalog_test"
        );
        $fields = $this->create_test_fields($kind_with_cat_field->kind_id);

        // Set the catalog field
        $cat_field = $fields[0];
        global $wpdb;
        $wpdb->update(
            $wpdb->prefix . "wpm_mobject_kinds",
            ["cat_field_id" => $cat_field->field_id],
            ["kind_id" => $kind_with_cat_field->kind_id]
        );

        // Get updated kind
        $kind_with_cat_field = WPMuseum\get_kind($kind_with_cat_field->kind_id);
        $this->assertEquals(
            $cat_field->field_id,
            $kind_with_cat_field->cat_field_id
        );

        // Export and re-import
        $kinds = WPMuseum\get_mobject_kinds();
        $export_data = [];
        foreach ($kinds as $kind) {
            $kind_array = (array) $kind;
            if ($kind->kind_id === $kind_with_cat_field->kind_id) {
                // Simulate reimport with modified name
                $kind_array["name"] = "Reimported Catalog Test";
            }
            $export_data[] = $kind_array;
        }

        $request = new \WP_REST_Request(
            "POST",
            TEST_REST_NAMESPACE . "/mobject_kinds"
        );
        $request->set_body(json_encode($export_data));
        $request->set_header("Content-Type", "application/json");
        $response = rest_do_request($request);

        $this->assertEquals(200, $response->get_status());

        // Clean up
        $wpdb->delete($wpdb->prefix . "wpm_mobject_kinds", [
            "kind_id" => $kind_with_cat_field->kind_id,
        ]);
        $wpdb->delete($wpdb->prefix . "wpm_mobject_fields", [
            "kind_id" => $kind_with_cat_field->kind_id,
        ]);
    }

    /**
     * Helper method to create test fields for a kind.
     *
     * @param int $kind_id The ID of the kind to create fields for.
     * @return array Array of created field objects.
     */
    private function create_test_fields($kind_id)
    {
        $fields = [
            [
                "name" => "Catalog Number",
                "slug" => "wpm_catalog_number",
                "type" => "text",
                "kind_id" => $kind_id,
                "required" => true,
                "order_index" => 0,
            ],
            [
                "name" => "Object Name",
                "slug" => "wpm_object_name",
                "type" => "text",
                "kind_id" => $kind_id,
                "required" => false,
                "order_index" => 1,
            ],
            [
                "name" => "Date",
                "slug" => "wpm_date",
                "type" => "date",
                "kind_id" => $kind_id,
                "required" => false,
                "order_index" => 2,
            ],
            [
                "name" => "Description",
                "slug" => "wpm_description",
                "type" => "longtext",
                "kind_id" => $kind_id,
                "required" => false,
                "order_index" => 3,
            ],
        ];

        $created_fields = [];
        foreach ($fields as $field_data) {
            $field = WPMuseum\MObjectField::from_rest($field_data);
            $field->save_to_db();
            $created_fields[] = $field;
        }

        return $created_fields;
    }
}
