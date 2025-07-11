<?php
/**
 * Simple OAI-PMH test to verify basic functionality
 *
 * @package Wp_Museum
 */

require_once plugin_dir_path(__FILE__) . "helpers/museum-test-data.php";

/**
 * Simple test case for OAI-PMH functionality verification.
 */
class OAIPMHSimpleTest extends WP_UnitTestCase
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
     * Test that OAI-PMH functions exist and are callable.
     */
    public function test_oai_pmh_functions_exist()
    {
        $functions = [
            "MikeThicke\\WPMuseum\\add_oai_pmh_rewrite_rules",
            "MikeThicke\\WPMuseum\\handle_oai_pmh_request",
            "MikeThicke\\WPMuseum\\get_oai_identifier",
            "MikeThicke\\WPMuseum\\validate_oai_date",
        ];

        foreach ($functions as $function) {
            $this->assertTrue(
                function_exists($function),
                "Function $function does not exist"
            );
        }
    }

    /**
     * Test basic OAI identifier generation.
     */
    public function test_basic_oai_identifier()
    {
        $post = $this->test_data["telescope"];
        $post->post_type = "wpm_instrument";

        $identifier = \MikeThicke\WPMuseum\get_oai_identifier($post);

        // Should either return a string identifier or null
        $this->assertTrue(is_string($identifier) || is_null($identifier));

        if ($identifier) {
            // Should contain our test accession number
            $this->assertStringContainsString("2024.SCI.001", $identifier);
        }
    }

    /**
     * Test date validation basic functionality.
     */
    public function test_date_validation_basic()
    {
        // Valid dates
        $this->assertEquals(
            "2023-01-01",
            \MikeThicke\WPMuseum\validate_oai_date("2023-01-01")
        );
        $this->assertEquals(
            "2023-01-01",
            \MikeThicke\WPMuseum\validate_oai_date("2023-01-01T12:00:00Z")
        );

        // Invalid format
        $this->assertFalse(\MikeThicke\WPMuseum\validate_oai_date("invalid"));
    }

    /**
     * Test OAI base URL generation.
     */
    public function test_oai_base_url()
    {
        $base_url = \MikeThicke\WPMuseum\get_oai_base_url();

        $this->assertIsString($base_url);
        $this->assertStringContainsString("oai-pmh", $base_url);
        $this->assertStringStartsWith("http", $base_url);
    }

    /**
     * Test error output format.
     */
    public function test_error_output()
    {
        ob_start();
        \MikeThicke\WPMuseum\output_oai_error("badVerb", "Test error");
        $output = ob_get_clean();

        $this->assertStringContainsString(
            '<?xml version="1.0" encoding="UTF-8"?>',
            $output
        );
        $this->assertStringContainsString(
            '<error code="badVerb">Test error</error>',
            $output
        );
    }

    /**
     * Test Identify response basic structure.
     */
    public function test_identify_response_structure()
    {
        $args = ["verb" => "Identify"];

        ob_start();
        \MikeThicke\WPMuseum\handle_identify($args);
        $output = ob_get_clean();

        $this->assertStringContainsString("<Identify>", $output);
        $this->assertStringContainsString("<repositoryName>", $output);
        $this->assertStringContainsString("<baseURL>", $output);
        $this->assertStringContainsString("<protocolVersion>", $output);
        $this->assertStringContainsString("</Identify>", $output);
    }

    /**
     * Test ListMetadataFormats response basic structure.
     */
    public function test_list_metadata_formats_structure()
    {
        $args = ["verb" => "ListMetadataFormats"];

        ob_start();
        \MikeThicke\WPMuseum\handle_list_metadata_formats($args);
        $output = ob_get_clean();

        $this->assertStringContainsString("<ListMetadataFormats>", $output);
        $this->assertStringContainsString("<metadataFormat>", $output);
        $this->assertStringContainsString(
            "<metadataPrefix>oai_dc</metadataPrefix>",
            $output
        );
    }

    /**
     * Test ListSets response basic structure.
     */
    public function test_list_sets_structure()
    {
        $args = ["verb" => "ListSets"];

        ob_start();
        \MikeThicke\WPMuseum\handle_list_sets($args);
        $output = ob_get_clean();

        $this->assertStringContainsString("<ListSets>", $output);
        $this->assertStringContainsString("<set>", $output);
        $this->assertStringContainsString("<setSpec>", $output);
        $this->assertStringContainsString("<setName>", $output);

        // Should contain our test collection
        $this->assertStringContainsString("scientific-instruments", $output);
    }

    /**
     * Test that collection data is set up correctly.
     */
    public function test_collection_data_setup()
    {
        $collection = $this->test_data["collection"];
        $telescope = $this->test_data["telescope"];
        $microscope = $this->test_data["microscope"];

        // Verify collection exists
        $this->assertInstanceOf(WP_Post::class, $collection);
        $this->assertEquals("wpm_collection", $collection->post_type);
        $this->assertEquals(
            "Scientific Instruments Collection",
            $collection->post_title
        );

        // Verify objects exist
        $this->assertInstanceOf(WP_Post::class, $telescope);
        $this->assertInstanceOf(WP_Post::class, $microscope);
        $this->assertEquals("Brass Telescope", $telescope->post_title);
        $this->assertEquals("Victorian Microscope", $microscope->post_title);
    }

    /**
     * Test that object metadata is set up correctly.
     */
    public function test_object_metadata_setup()
    {
        $telescope = $this->test_data["telescope"];

        // Check that metadata was added correctly
        $accession = get_post_meta($telescope->ID, "accession-number", true);
        $name = get_post_meta($telescope->ID, "name", true);
        $manufacturer = get_post_meta($telescope->ID, "manufacturer", true);

        $this->assertEquals("2024.SCI.001", $accession);
        $this->assertEquals("Brass Telescope", $name);
        $this->assertEquals("Zeiss", $manufacturer);
    }

    /**
     * Test mock object kind functionality.
     */
    public function test_mock_object_kind()
    {
        $kinds = MuseumTestData::mock_get_mobject_kinds();
        $this->assertIsArray($kinds);
        $this->assertArrayHasKey(1, $kinds);

        $kind = $kinds[1];
        $this->assertTrue($kind->has_oai_pmh_mappings());

        $mappings = $kind->get_oai_pmh_mappings();
        $this->assertIsObject($mappings);
        $this->assertObjectHasProperty("identifier", $mappings);
        $this->assertObjectHasProperty("title", $mappings);
        $this->assertObjectHasProperty("creator", $mappings);
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
