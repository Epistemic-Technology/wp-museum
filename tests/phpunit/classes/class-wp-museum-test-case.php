<?php
/**
 * Base test case for WP Museum tests that require database tables.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

/**
 * Base test case that ensures museum database tables are created for tests.
 */
class WP_Museum_Test_Case extends \WP_UnitTestCase {

    /**
     * Set up database tables before the first test in a class runs.
     */
    public static function setUpBeforeClass(): void {
        parent::setUpBeforeClass();
        static::setup_database_tables();
    }

    /**
     * Set up database tables for testing.
     *
     * This creates the custom museum tables that are normally created
     * by the plugin activation process.
     */
    private static function setup_database_tables(): void {
        global $wpdb;

        // Temporarily disable database error output to prevent headers issues
        $original_show_errors = $wpdb->show_errors;
        $wpdb->show_errors = false;

        // Create the custom museum tables
        create_mobject_kinds_table();
        create_mobject_fields_table();
        create_remote_clients_table();

        // Restore original error reporting
        $wpdb->show_errors = $original_show_errors;
    }

    /**
     * Clean up database tables after all tests in a class are complete.
     */
    public static function tearDownAfterClass(): void {
        static::cleanup_database_tables();
        parent::tearDownAfterClass();
    }

    /**
     * Clean up database tables to prevent conflicts between test classes.
     */
    private static function cleanup_database_tables(): void {
        global $wpdb;

        // Temporarily disable database error output
        $original_show_errors = $wpdb->show_errors;
        $wpdb->show_errors = false;

        // Clean up test data from custom tables
        $kinds_table = $wpdb->prefix . WPM_PREFIX . 'mobject_kinds';
        $fields_table = $wpdb->prefix . WPM_PREFIX . 'mobject_fields';
        $clients_table = $wpdb->prefix . WPM_PREFIX . 'remote_clients';

        $wpdb->query("TRUNCATE TABLE {$kinds_table}");
        $wpdb->query("TRUNCATE TABLE {$fields_table}");
        $wpdb->query("TRUNCATE TABLE {$clients_table}");

        // Clear any cached data
        wp_cache_flush_group(CACHE_GROUP);

        // Restore original error reporting
        $wpdb->show_errors = $original_show_errors;
    }

    /**
     * Set up each individual test.
     */
    public function setUp(): void {
        parent::setUp();

        // Clear cache before each test to ensure clean state
        wp_cache_flush_group(CACHE_GROUP);
    }

    /**
     * Clean up after each individual test.
     */
    public function tearDown(): void {
        // Clear cache after each test
        wp_cache_flush_group(CACHE_GROUP);

        parent::tearDown();
    }

    /**
     * Create a test object kind in the database.
     *
     * @param array $data Optional data to override defaults.
     * @return int The created kind ID.
     */
    protected function create_test_kind($data = []): int {
        $defaults = [
            'label' => 'Test Kind',
            'description' => 'A test object kind',
            'hierarchical' => 0,
            'must_featured_image' => 0,
            'must_gallery' => 0,
            'strict_checking' => 0,
            'exclude_from_search' => 0
        ];

        $kind_data = array_merge($defaults, $data);
        return new_kind($kind_data);
    }

    /**
     * Create a test object field in the database.
     *
     * @param int   $kind_id The kind ID to associate the field with.
     * @param array $data    Optional data to override defaults.
     * @return MObjectField The created field object.
     */
    protected function create_test_field(int $kind_id, array $data = []): MObjectField {
        global $wpdb;

        $defaults = [
            'kind_id' => $kind_id,
            'name' => 'Test Field',
            'type' => 'plain',
            'display_order' => 1,
            'public' => 1,
            'required' => 0,
            'quick_browse' => 0,
            'help_text' => '',
            'detailed_instructions' => '',
            'public_description' => '',
            'field_schema' => '',
            'max_length' => 0,
            'units' => '',
            'factors' => null,
            'dimensions' => null
        ];

        $field_data = array_merge($defaults, $data);

        // Generate slug from name if not provided
        if (!isset($field_data['slug'])) {
            $field_data['slug'] = sanitize_title($field_data['name']);
        }

        $table_name = $wpdb->prefix . WPM_PREFIX . 'mobject_fields';
        $wpdb->insert($table_name, $field_data);

        $field_id = $wpdb->insert_id;
        $field_data['field_id'] = $field_id;

        return MObjectField::from_database((object) $field_data);
    }

    /**
     * Create a test remote client in the database.
     *
     * @param array $data Optional data to override defaults.
     * @return int The created client ID.
     */
    protected function create_test_remote_client(array $data = []): int {
        global $wpdb;

        $defaults = [
            'uuid' => $this->generate_uuid(),
            'title' => 'Test Museum Site',
            'url' => 'https://test.example.com',
            'blocked' => 0,
            'registration_time' => current_time('mysql')
        ];

        $client_data = array_merge($defaults, $data);

        $table_name = $wpdb->prefix . WPM_PREFIX . 'remote_clients';
        $wpdb->insert($table_name, $client_data);

        return $wpdb->insert_id;
    }

    /**
     * Generate a valid UUID v4.
     *
     * @return string A valid UUID v4 string.
     */
    private function generate_uuid(): string {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff)
        );
    }
}
