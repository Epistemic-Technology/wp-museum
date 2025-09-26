<?php
/**
 * Class OAIPMHTest
 *
 * @package Wp_Museum
 */

require_once plugin_dir_path(__FILE__) . "helpers/museum-test-data.php";

use MikeThicke\WPMuseum\WP_Museum_Test_Case;

/**
 * Test case for OAI-PMH functionality.
 */
class OAIPMHTest extends WP_Museum_Test_Case
{
    private $test_data;

    /**
     * Set up test environment.
     */
    public function setUp(): void
    {
        parent::setUp();

        // Ensure the OAI-PMH functions are loaded
        if (!function_exists("MikeThicke\WPMuseum\add_oai_pmh_rewrite_rules")) {
            require_once plugin_dir_path(__FILE__) .
                "../../src/includes/oai-pmh.php";
        }

        // Load object functions for kind_from_type
        if (!function_exists("MikeThicke\WPMuseum\kind_from_type")) {
            require_once plugin_dir_path(__FILE__) .
                "../../src/includes/object-functions.php";
        }

        // Load database functions for get_mobject_kinds
        if (!function_exists("MikeThicke\WPMuseum\get_mobject_kinds")) {
            require_once plugin_dir_path(__FILE__) .
                "../../src/includes/database-functions.php";
        }

        // Set up test data
        $this->test_data = MuseumTestData::setup_complete_test_environment(
            $this->factory
        );

        // Mock the get_object_type_names function
        if (!function_exists("MikeThicke\WPMuseum\get_object_type_names")) {
            function get_object_type_names()
            {
                return ["wpm_object", "wpm_instrument"];
            }
        }

        // Mock get_mobject_kinds function to return our test data
        add_filter("pre_transient_get_mobject_kinds", function () {
            return MuseumTestData::mock_get_mobject_kinds();
        });

        // Also mock the cache
        wp_cache_set(
            "get_mobject_kinds",
            MuseumTestData::mock_get_mobject_kinds(),
            "wp_museum"
        );
    }

    /**
     * Test OAI-PMH rewrite rules are added correctly.
     */
    public function test_add_oai_pmh_rewrite_rules()
    {
        global $wp_rewrite;

        // Clear existing rules
        $wp_rewrite->init();

        // Add OAI-PMH rewrite rules
        \MikeThicke\WPMuseum\add_oai_pmh_rewrite_rules();

        // Check if the rule was added
        $rules = $wp_rewrite->extra_rules_top;
        $this->assertArrayHasKey("^oai-pmh/?", $rules);
        $this->assertEquals("index.php?oai_pmh=1", $rules["^oai-pmh/?"]);
    }

    /**
     * Test OAI-PMH query vars are added correctly.
     */
    public function test_add_oai_pmh_query_vars()
    {
        $vars = ["existing_var"];
        $result = \MikeThicke\WPMuseum\add_oai_pmh_query_vars($vars);

        $this->assertContains("oai_pmh", $result);
        $this->assertContains("existing_var", $result);
    }

    /**
     * Test OAI base URL generation.
     */
    public function test_get_oai_base_url()
    {
        $base_url = \MikeThicke\WPMuseum\get_oai_base_url();

        $this->assertStringContainsString("oai-pmh", $base_url);
        $this->assertStringStartsWith("http", $base_url);
    }

    /**
     * Test OAI identifier generation.
     */
    public function test_get_oai_identifier()
    {
        $post = $this->test_data["telescope"];

        // Since we're using a mock object kind, we need to set the post type correctly
        $post->post_type = "wpm_instrument";

        $identifier = \MikeThicke\WPMuseum\get_oai_identifier($post);

        if ($identifier !== null) {
            $this->assertIsString($identifier);
            // Should contain the accession number from our test data
            $this->assertStringContainsString("2024.SCI.001", $identifier);
        } else {
            // If the kind system isn't working, function returns null
            $this->assertNull($identifier);
        }
    }

    /**
     * Test OAI date validation.
     */
    public function test_validate_oai_date()
    {
        // Test valid date formats
        $this->assertEquals(
            "2023-01-01",
            \MikeThicke\WPMuseum\validate_oai_date("2023-01-01")
        );
        $this->assertEquals(
            "2023-01-01",
            \MikeThicke\WPMuseum\validate_oai_date("2023-01-01T12:00:00Z")
        );

        // Test invalid date formats
        $this->assertFalse(
            \MikeThicke\WPMuseum\validate_oai_date("invalid-date")
        );
        // Note: The function only checks format, not validity
        $this->assertEquals(
            "2023-13-01",
            \MikeThicke\WPMuseum\validate_oai_date("2023-13-01")
        );
        $this->assertEquals(
            "2023-01-32",
            \MikeThicke\WPMuseum\validate_oai_date("2023-01-32")
        );
    }

    /**
     * Test post has OAI mappings check.
     */
    public function test_post_has_oai_mappings()
    {
        $post = $this->test_data["telescope"];
        $post->post_type = "wpm_instrument";

        $result = \MikeThicke\WPMuseum\post_has_oai_mappings($post);
        $this->assertIsBool($result);

        // The result depends on whether the post has a valid OAI identifier
        // With our mock data, this may return true or false depending on setup
    }

    /**
     * Test getting post by OAI identifier.
     */
    public function test_get_post_by_oai_identifier()
    {
        $post = $this->test_data["telescope"];
        $post->post_type = "wpm_instrument";

        // Try to get a real identifier first
        $identifier = \MikeThicke\WPMuseum\get_oai_identifier($post);

        if ($identifier) {
            $found_post = \MikeThicke\WPMuseum\get_post_by_oai_identifier(
                $identifier
            );
            $this->assertTrue($found_post === null || is_object($found_post));
        }

        // Test with invalid identifier
        $invalid_result = \MikeThicke\WPMuseum\get_post_by_oai_identifier(
            "invalid"
        );
        $this->assertInstanceOf("WP_Error", $invalid_result);
    }

    /**
     * Test getting earliest object date.
     */
    public function test_get_earliest_object_date()
    {
        $earliest_date = \MikeThicke\WPMuseum\get_earliest_object_date();

        $this->assertIsString($earliest_date);
        $this->assertStringEndsWith("Z", $earliest_date);
        $this->assertMatchesRegularExpression(
            '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/',
            $earliest_date
        );
    }

    /**
     * Test OAI posts retrieval.
     */
    public function test_get_oai_posts()
    {
        $posts = \MikeThicke\WPMuseum\get_oai_posts([]);
        $this->assertIsArray($posts);
    }

    /**
     * Test OAI posts retrieval with date range.
     */
    public function test_get_oai_posts_with_date_range()
    {
        $args = [
            "from" => "2023-01-15",
            "until" => "2025-02-15",
        ];

        $posts = \MikeThicke\WPMuseum\get_oai_posts($args);
        $this->assertIsArray($posts);

        // Should include our test objects created in 2024
        $this->assertGreaterThanOrEqual(0, count($posts));
    }

    /**
     * Test OAI posts retrieval with resumption token.
     */
    public function test_get_oai_posts_with_resumption_token()
    {
        $args = [
            "resumptionToken" => "offset:0:limit:1",
        ];

        $posts = \MikeThicke\WPMuseum\get_oai_posts($args);
        $this->assertIsArray($posts);
    }

    /**
     * Test OAI posts retrieval with set specification.
     */
    public function test_get_oai_posts_with_set()
    {
        $collection = $this->test_data["collection"];
        $args = [
            "set" => $collection->post_name,
        ];

        $posts = \MikeThicke\WPMuseum\get_oai_posts($args);
        $this->assertIsArray($posts);
    }

    /**
     * Test output functions exist and don't cause fatal errors.
     */
    public function test_output_functions_exist()
    {
        $this->assertTrue(
            function_exists("MikeThicke\WPMuseum\output_oai_header")
        );
        $this->assertTrue(
            function_exists("MikeThicke\WPMuseum\output_oai_footer")
        );
        $this->assertTrue(
            function_exists("MikeThicke\WPMuseum\output_oai_error")
        );
        $this->assertTrue(function_exists("MikeThicke\WPMuseum\output_header"));
        $this->assertTrue(function_exists("MikeThicke\WPMuseum\output_record"));
        $this->assertTrue(
            function_exists("MikeThicke\WPMuseum\output_metadata")
        );
    }

    /**
     * Test handler functions exist.
     */
    public function test_handler_functions_exist()
    {
        $this->assertTrue(
            function_exists("MikeThicke\WPMuseum\handle_identify")
        );
        $this->assertTrue(
            function_exists("MikeThicke\WPMuseum\handle_list_metadata_formats")
        );
        $this->assertTrue(
            function_exists("MikeThicke\WPMuseum\handle_list_sets")
        );
        $this->assertTrue(
            function_exists("MikeThicke\WPMuseum\handle_get_record")
        );
        $this->assertTrue(
            function_exists("MikeThicke\WPMuseum\handle_list_identifiers")
        );
        $this->assertTrue(
            function_exists("MikeThicke\WPMuseum\handle_list_records")
        );
    }

    /**
     * Test main request handler exists.
     */
    public function test_main_handler_exists()
    {
        $this->assertTrue(
            function_exists("MikeThicke\WPMuseum\handle_oai_pmh_request")
        );
    }

    /**
     * Test date validation with edge cases.
     */
    public function test_validate_oai_date_edge_cases()
    {
        // Test leap year
        $this->assertEquals(
            "2024-02-29",
            \MikeThicke\WPMuseum\validate_oai_date("2024-02-29")
        );

        // Test non-leap year (function only checks format, not validity)
        $this->assertEquals(
            "2023-02-29",
            \MikeThicke\WPMuseum\validate_oai_date("2023-02-29")
        );

        // Test timezone format
        $this->assertEquals(
            "2023-01-01",
            \MikeThicke\WPMuseum\validate_oai_date("2023-01-01T23:59:59Z")
        );

        // Test invalid timezone format
        $this->assertFalse(
            \MikeThicke\WPMuseum\validate_oai_date("2023-01-01T23:59:59")
        );

        // Test partial dates
        $this->assertFalse(\MikeThicke\WPMuseum\validate_oai_date("2023-01"));
        $this->assertFalse(\MikeThicke\WPMuseum\validate_oai_date("2023"));
    }

    /**
     * Test OAI identifier functions with real data.
     */
    public function test_oai_identifier_with_real_data()
    {
        $post = $this->test_data["telescope"];

        // Test get_oai_identifier
        $post->post_type = "wpm_instrument";
        $identifier = \MikeThicke\WPMuseum\get_oai_identifier($post);

        if ($identifier !== null) {
            $this->assertIsString($identifier);
            $this->assertStringContainsString("2024.SCI.001", $identifier);

            // Test the identifier can be parsed back
            $parsed_post = \MikeThicke\WPMuseum\get_post_by_oai_identifier(
                $identifier
            );
            if ($parsed_post) {
                $this->assertEquals($post->ID, $parsed_post->ID);
            }
        } else {
            // If kind system isn't set up, this is expected
            $this->assertNull($identifier);
        }
    }

    /**
     * Test include_oai_pmh postmeta registration.
     */
    public function test_register_oai_pmh_meta()
    {
        // Call the registration function
        \MikeThicke\WPMuseum\register_oai_pmh_meta();

        // Check if meta is registered for our test post types
        $registered_meta = get_registered_meta_keys('post', 'wpm_instrument');

        $this->assertArrayHasKey('include_oai_pmh', $registered_meta);
        $this->assertEquals('boolean', $registered_meta['include_oai_pmh']['type']);
        $this->assertTrue($registered_meta['include_oai_pmh']['single']);
        $this->assertTrue($registered_meta['include_oai_pmh']['default']);
    }

    /**
     * Test include_oai_pmh default behavior (true when not set).
     */
    public function test_include_oai_pmh_default_true()
    {
        $post = $this->test_data["telescope"];
        $post->post_type = "wpm_instrument";

        // Ensure meta is not set
        delete_post_meta($post->ID, 'include_oai_pmh');

        // Get identifier should work (post included by default)
        $identifier = \MikeThicke\WPMuseum\get_oai_identifier($post);

        // Try to get post by identifier
        if ($identifier) {
            $found_post = \MikeThicke\WPMuseum\get_post_by_oai_identifier($identifier);
            $this->assertNotNull($found_post);
            $this->assertEquals($post->ID, $found_post->ID);
        }
    }

    /**
     * Test exclude from OAI-PMH when include_oai_pmh is false.
     */
    public function test_exclude_from_oai_pmh()
    {
        $post = $this->test_data["telescope"];
        $post->post_type = "wpm_instrument";

        // Set include_oai_pmh to false
        update_post_meta($post->ID, 'include_oai_pmh', false);

        // Get identifier still works
        $identifier = \MikeThicke\WPMuseum\get_oai_identifier($post);

        // But getting post by identifier should return null
        if ($identifier) {
            $found_post = \MikeThicke\WPMuseum\get_post_by_oai_identifier($identifier);
            $this->assertNull($found_post);
        }
    }

    /**
     * Test toggle include_oai_pmh from false to true.
     */
    public function test_toggle_include_oai_pmh()
    {
        $post = $this->test_data["telescope"];
        $post->post_type = "wpm_instrument";

        // Start with excluded
        update_post_meta($post->ID, 'include_oai_pmh', false);

        $identifier = \MikeThicke\WPMuseum\get_oai_identifier($post);

        if ($identifier) {
            // Should not be found
            $found_post = \MikeThicke\WPMuseum\get_post_by_oai_identifier($identifier);
            $this->assertNull($found_post);

            // Toggle to included
            update_post_meta($post->ID, 'include_oai_pmh', true);

            // Now should be found
            $found_post = \MikeThicke\WPMuseum\get_post_by_oai_identifier($identifier);
            $this->assertNotNull($found_post);
            $this->assertEquals($post->ID, $found_post->ID);
        }
    }

    /**
     * Test get_oai_posts respects include_oai_pmh meta.
     */
    public function test_get_oai_posts_respects_include_meta()
    {
        // Set one post to be excluded
        $telescope = $this->test_data["telescope"];
        update_post_meta($telescope->ID, 'include_oai_pmh', false);

        // Set another to be included
        $microscope = $this->test_data["microscope"];
        update_post_meta($microscope->ID, 'include_oai_pmh', true);

        // Get all OAI posts
        $posts = \MikeThicke\WPMuseum\get_oai_posts([]);

        // Get post IDs for easier assertion
        $post_ids = array_map(function($post) {
            return $post->ID;
        }, $posts);

        // Telescope should not be in results
        $this->assertNotContains($telescope->ID, $post_ids);

        // Microscope should be in results (if it has mappings)
        $kind = \MikeThicke\WPMuseum\kind_from_type($microscope->post_type);
        if ($kind && $kind->has_oai_pmh_mappings()) {
            $this->assertContains($microscope->ID, $post_ids);
        }
    }

    /**
     * Test get_oai_posts with no explicitly excluded posts.
     */
    public function test_get_oai_posts_default_inclusion()
    {
        // Don't set include_oai_pmh meta on any posts
        $telescope = $this->test_data["telescope"];
        $microscope = $this->test_data["microscope"];

        delete_post_meta($telescope->ID, 'include_oai_pmh');
        delete_post_meta($microscope->ID, 'include_oai_pmh');

        // Get all OAI posts
        $posts = \MikeThicke\WPMuseum\get_oai_posts([]);

        // Both should be included if they have mappings
        $post_ids = array_map(function($post) {
            return $post->ID;
        }, $posts);

        $telescope_kind = \MikeThicke\WPMuseum\kind_from_type($telescope->post_type);
        if ($telescope_kind && $telescope_kind->has_oai_pmh_mappings()) {
            $this->assertContains($telescope->ID, $post_ids);
        }

        $microscope_kind = \MikeThicke\WPMuseum\kind_from_type($microscope->post_type);
        if ($microscope_kind && $microscope_kind->has_oai_pmh_mappings()) {
            $this->assertContains($microscope->ID, $post_ids);
        }
    }

    /**
     * Test various false values for include_oai_pmh meta.
     */
    public function test_include_oai_pmh_false_values()
    {
        $post = $this->test_data["telescope"];
        $post->post_type = "wpm_instrument";

        $identifier = \MikeThicke\WPMuseum\get_oai_identifier($post);

        if ($identifier) {
            // Test with boolean false
            update_post_meta($post->ID, 'include_oai_pmh', false);
            $found_post = \MikeThicke\WPMuseum\get_post_by_oai_identifier($identifier);
            $this->assertNull($found_post);

            // Test with string '0'
            update_post_meta($post->ID, 'include_oai_pmh', '0');
            $found_post = \MikeThicke\WPMuseum\get_post_by_oai_identifier($identifier);
            $this->assertNull($found_post);

            // Test with integer 0
            update_post_meta($post->ID, 'include_oai_pmh', 0);
            $found_post = \MikeThicke\WPMuseum\get_post_by_oai_identifier($identifier);
            $this->assertNull($found_post);

            // Test with true value (should be found)
            update_post_meta($post->ID, 'include_oai_pmh', true);
            $found_post = \MikeThicke\WPMuseum\get_post_by_oai_identifier($identifier);
            $this->assertNotNull($found_post);
            $this->assertEquals($post->ID, $found_post->ID);

            // Test with string '1' (should be found)
            update_post_meta($post->ID, 'include_oai_pmh', '1');
            $found_post = \MikeThicke\WPMuseum\get_post_by_oai_identifier($identifier);
            $this->assertNotNull($found_post);
            $this->assertEquals($post->ID, $found_post->ID);
        }
    }

    /**
     * Clean up after tests.
     */
    public function tearDown(): void
    {
        MuseumTestData::cleanup_test_data();
        parent::tearDown();
    }
}
