<?php
/**
 * Test default OAI-PMH mappings functionality.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

/**
 * Test class for default OAI-PMH mappings.
 */
class TestOaiPmhDefaults extends \WP_UnitTestCase
{
    /**
     * Test that OaiPmhMappings can be created with defaults.
     */
    public function test_oai_pmh_mappings_with_defaults()
    {
        $mappings = OaiPmhMappings::with_defaults();

        $this->assertInstanceOf(OaiPmhMappings::class, $mappings);

        // Check that default mappings are set
        $this->assertEquals(
            "wp_post_title",
            $mappings->get_field_slug("title")
        );
        $this->assertEquals(
            "wp_post_author",
            $mappings->get_field_slug("creator")
        );
        $this->assertEquals(
            "wp_post_excerpt",
            $mappings->get_field_slug("description")
        );
        $this->assertEquals("wp_post_date", $mappings->get_field_slug("date"));
        $this->assertEquals(
            "wp_post_permalink",
            $mappings->get_field_slug("source")
        );

        // Check that unmapped fields are empty
        $this->assertEquals("", $mappings->get_field_slug("subject"));
        $this->assertEquals("", $mappings->get_field_slug("publisher"));
        $this->assertEquals("", $mappings->get_field_slug("contributor"));
        $this->assertEquals("", $mappings->get_field_slug("type"));
        $this->assertEquals("", $mappings->get_field_slug("format"));
        $this->assertEquals("", $mappings->get_field_slug("identifier"));
        $this->assertEquals("", $mappings->get_field_slug("language"));
        $this->assertEquals("", $mappings->get_field_slug("relation"));
        $this->assertEquals("", $mappings->get_field_slug("coverage"));
        $this->assertEquals("", $mappings->get_field_slug("rights"));

        // Check that default mappings have correct structure
        $title_mapping = $mappings->get_mapping("title");
        $this->assertIsArray($title_mapping);
        $this->assertEquals("wp_post_title", $title_mapping["field"]);
        $this->assertEquals("", $title_mapping["staticValue"]);

        // Check that mapping count includes default mappings
        $this->assertEquals(5, $mappings->get_mapping_count());

        // Check that has_mapping returns true for default mappings
        $this->assertTrue($mappings->has_mapping("title"));
        $this->assertTrue($mappings->has_mapping("creator"));
        $this->assertTrue($mappings->has_mapping("description"));
        $this->assertTrue($mappings->has_mapping("date"));
        $this->assertTrue($mappings->has_mapping("source"));

        // Check that has_mapping returns false for unmapped fields
        $this->assertFalse($mappings->has_mapping("subject"));
        $this->assertFalse($mappings->has_mapping("publisher"));
    }

    /**
     * Test that ObjectKind returns mappings with defaults.
     */
    public function test_object_kind_returns_default_mappings()
    {
        // Create a test object kind
        $kind_row = (object) [
            "kind_id" => 1,
            "name" => "test-kind",
            "label" => "Test Kind",
            "type_name" => "test_object",
        ];
        $kind = new ObjectKind($kind_row);

        // Get OAI-PMH mappings (should return defaults)
        $mappings = $kind->get_oai_pmh_mappings();

        $this->assertInstanceOf(OaiPmhMappings::class, $mappings);

        // Check that default mappings are applied
        $this->assertEquals(
            "wp_post_title",
            $mappings->get_field_slug("title")
        );
        $this->assertEquals(
            "wp_post_author",
            $mappings->get_field_slug("creator")
        );
        $this->assertEquals(
            "wp_post_excerpt",
            $mappings->get_field_slug("description")
        );
        $this->assertEquals("wp_post_date", $mappings->get_field_slug("date"));
        $this->assertEquals(
            "wp_post_permalink",
            $mappings->get_field_slug("source")
        );

        // Check that has_oai_pmh_mappings returns true with defaults
        $this->assertTrue($kind->has_oai_pmh_mappings());

        // Check that mapping count is correct
        $this->assertEquals(5, $mappings->get_mapping_count());
    }

    /**
     * Test that default mappings can be overridden.
     */
    public function test_default_mappings_can_be_overridden()
    {
        $mappings = OaiPmhMappings::with_defaults();

        // Override a default mapping
        $mappings->set_mapping("title", [
            "field" => "custom_title_field",
            "staticValue" => "",
        ]);

        // Check that override worked
        $this->assertEquals(
            "custom_title_field",
            $mappings->get_field_slug("title")
        );

        // Check that other defaults are still intact
        $this->assertEquals(
            "wp_post_author",
            $mappings->get_field_slug("creator")
        );
        $this->assertEquals(
            "wp_post_excerpt",
            $mappings->get_field_slug("description")
        );

        // Set a static value override
        $mappings->set_mapping("creator", [
            "field" => "",
            "staticValue" => "Museum Collection",
        ]);

        // Check that static value override worked
        $this->assertEquals(
            "Museum Collection",
            $mappings->get_static_value("creator")
        );
        $this->assertEquals("", $mappings->get_field_slug("creator"));
        $this->assertTrue($mappings->has_static_value("creator"));
    }

    /**
     * Test that validation works with default mappings.
     */
    public function test_validation_with_default_mappings()
    {
        $mappings = OaiPmhMappings::with_defaults();

        // Default WordPress fields should validate successfully
        $errors = $mappings->validate_mappings([]);
        $this->assertEmpty($errors);

        // Test with kind fields
        $kind_fields = [
            (object) ["slug" => "custom_field", "name" => "Custom Field"],
            (object) ["slug" => "another_field", "name" => "Another Field"],
        ];

        $errors = $mappings->validate_mappings($kind_fields);
        $this->assertEmpty($errors);

        // Test with invalid field mapping
        $mappings->set_mapping("title", [
            "field" => "nonexistent_field",
            "staticValue" => "",
        ]);

        $errors = $mappings->validate_mappings($kind_fields);
        $this->assertNotEmpty($errors);
        $this->assertContains(
            "Dublin Core field 'title' is mapped to non-existent kind field 'nonexistent_field'",
            $errors
        );
    }

    /**
     * Test that regular (empty) mappings still work.
     */
    public function test_regular_empty_mappings_still_work()
    {
        $mappings = new OaiPmhMappings();

        // Should have no mappings initially
        $this->assertEquals(0, $mappings->get_mapping_count());
        $this->assertFalse($mappings->has_mapping("title"));

        // Should be able to set mappings normally
        $mappings->set_mapping("title", [
            "field" => "wp_post_title",
            "staticValue" => "",
        ]);

        $this->assertEquals(1, $mappings->get_mapping_count());
        $this->assertTrue($mappings->has_mapping("title"));
        $this->assertEquals(
            "wp_post_title",
            $mappings->get_field_slug("title")
        );
    }

    /**
     * Test that default mappings can be converted to array properly.
     */
    public function test_default_mappings_to_array()
    {
        $mappings = OaiPmhMappings::with_defaults();
        $array = $mappings->to_array();

        $this->assertIsArray($array);
        $this->assertArrayHasKey("title", $array);
        $this->assertArrayHasKey("creator", $array);
        $this->assertArrayHasKey("description", $array);
        $this->assertArrayHasKey("date", $array);
        $this->assertArrayHasKey("source", $array);
        $this->assertArrayHasKey("identifier_prefix", $array);

        // Check structure of default mappings
        $this->assertEquals(
            [
                "field" => "wp_post_title",
                "staticValue" => "",
            ],
            $array["title"]
        );

        $this->assertEquals(
            [
                "field" => "wp_post_author",
                "staticValue" => "",
            ],
            $array["creator"]
        );

        // Check that unmapped fields are empty
        $this->assertEquals(
            [
                "field" => "",
                "staticValue" => "",
            ],
            $array["subject"]
        );
    }

    /**
     * Test that default mappings work with JSON serialization.
     */
    public function test_default_mappings_json_serialization()
    {
        $mappings = OaiPmhMappings::with_defaults();
        $json = $mappings->to_json();

        $this->assertIsString($json);
        $decoded = json_decode($json, true);

        $this->assertIsArray($decoded);
        $this->assertArrayHasKey("title", $decoded);
        $this->assertEquals("wp_post_title", $decoded["title"]["field"]);
        $this->assertEquals("", $decoded["title"]["staticValue"]);

        // Test that we can recreate mappings from JSON
        $recreated = OaiPmhMappings::from_json($json);
        $this->assertEquals(
            "wp_post_title",
            $recreated->get_field_slug("title")
        );
        $this->assertEquals(
            "wp_post_author",
            $recreated->get_field_slug("creator")
        );
        $this->assertEquals(5, $recreated->get_mapping_count());
    }
}
