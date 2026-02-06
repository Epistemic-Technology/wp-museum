<?php
/**
 * Tests for MObjectField class
 *
 * @package MikeThicke\WPMuseum
 */

use MikeThicke\WPMuseum\MObjectField;
use MikeThicke\WPMuseum\WP_Museum_Test_Case;

/**
 * Test MObjectField class.
 */
class TestMObjectField extends WP_Museum_Test_Case
{
    /**
     * Test MObjectField constructor creates empty instance.
     */
    public function test_constructor()
    {
        $field = new MObjectField();

        $this->assertInstanceOf(MObjectField::class, $field);
        $this->assertNull($field->field_id);
        $this->assertNull($field->slug);
        $this->assertNull($field->kind_id);
        $this->assertNull($field->name);
        $this->assertNull($field->type);
        $this->assertNull($field->display_order);
        $this->assertNull($field->public);
        $this->assertNull($field->required);
        $this->assertNull($field->quick_browse);
        $this->assertNull($field->help_text);
        $this->assertNull($field->detailed_instructions);
        $this->assertNull($field->public_description);
        $this->assertNull($field->field_schema);
        $this->assertNull($field->max_length);
        $this->assertNull($field->dimensions);
        $this->assertNull($field->units);
        $this->assertNull($field->factors);
    }

    /**
     * Test from_database static method with complete data.
     */
    public function test_from_database_complete()
    {
        $row = (object) [
            "field_id" => "123",
            "kind_id" => "456",
            "name" => "Test Field",
            "type" => "plain",
            "display_order" => "5",
            "public" => "1",
            "required" => "0",
            "quick_browse" => "1",
            "help_text" => "This is help text",
            "detailed_instructions" => "These are detailed instructions",
            "public_description" => "This is a public description",
            "field_schema" => '^[A-Z]+$',
            "max_length" => "255",
            "units" => "cm",
            "factors" => '["option1", "option2", "option3"]',
            "dimensions" => '{"n": 3, "labels": ["Length", "Width", "Height"]}',
        ];

        $field = MObjectField::from_database($row);

        $this->assertEquals(123, $field->field_id);
        $this->assertEquals(456, $field->kind_id);
        $this->assertEquals("Test Field", $field->name);
        $this->assertEquals("plain", $field->type);
        $this->assertEquals(5, $field->display_order);
        $this->assertTrue($field->public);
        $this->assertFalse($field->required);
        $this->assertTrue($field->quick_browse);
        $this->assertEquals("This is help text", $field->help_text);
        $this->assertEquals(
            "These are detailed instructions",
            $field->detailed_instructions
        );
        $this->assertEquals(
            "This is a public description",
            $field->public_description
        );
        $this->assertEquals('^[A-Z]+$', $field->field_schema);
        $this->assertEquals(255, $field->max_length);
        $this->assertEquals("cm", $field->units);
        $this->assertEquals(["option1", "option2", "option3"], $field->factors);
        $this->assertEquals(
            ["n" => 3, "labels" => ["Length", "Width", "Height"]],
            $field->dimensions
        );
        $this->assertNotEmpty($field->slug);
    }

    /**
     * Test from_database with minimal data.
     */
    public function test_from_database_minimal()
    {
        $row = (object) [
            "field_id" => "1",
            "kind_id" => "2",
            "name" => "Minimal Field",
            "type" => "plain",
            "display_order" => "1",
            "public" => "0",
            "required" => "0",
            "quick_browse" => "0",
            "help_text" => "",
            "detailed_instructions" => "",
            "public_description" => "",
            "field_schema" => "",
            "max_length" => "0",
            "units" => "",
            "factors" => null,
            "dimensions" => null,
        ];

        $field = MObjectField::from_database($row);

        $this->assertEquals(1, $field->field_id);
        $this->assertEquals(2, $field->kind_id);
        $this->assertEquals("Minimal Field", $field->name);
        $this->assertEquals("plain", $field->type);
        $this->assertEquals(1, $field->display_order);
        $this->assertFalse($field->public);
        $this->assertFalse($field->required);
        $this->assertFalse($field->quick_browse);
        $this->assertEquals("", $field->help_text);
        $this->assertEquals("", $field->detailed_instructions);
        $this->assertEquals("", $field->public_description);
        $this->assertEquals("", $field->field_schema);
        $this->assertEquals(0, $field->max_length);
        $this->assertEquals("", $field->units);
        $this->assertEquals([], $field->factors);
        $this->assertNotEmpty($field->slug);
    }

    /**
     * Test from_database with invalid JSON in factors.
     */
    public function test_from_database_invalid_factors_json()
    {
        $row = (object) [
            "field_id" => "1",
            "kind_id" => "2",
            "name" => "Invalid JSON Field",
            "type" => "factor",
            "display_order" => "1",
            "public" => "1",
            "required" => "0",
            "quick_browse" => "0",
            "help_text" => "",
            "detailed_instructions" => "",
            "public_description" => "",
            "field_schema" => "",
            "max_length" => "0",
            "units" => "",
            "factors" => "invalid json string",
            "dimensions" => null,
        ];

        $field = MObjectField::from_database($row);

        $this->assertEquals([], $field->factors);
    }

    /**
     * Test from_rest static method with complete data.
     */
    public function test_from_rest_complete()
    {
        $field_data = [
            "field_id" => 123,
            "kind_id" => 456,
            "name" => "REST Field",
            "type" => "rich",
            "display_order" => 3,
            "public" => 1,
            "required" => 1,
            "quick_browse" => 0,
            "help_text" => "REST help text",
            "detailed_instructions" => "REST detailed instructions",
            "public_description" => "REST public description",
            "field_schema" => '^[0-9]+$',
            "max_length" => 500,
            "units" => "kg",
            "factors" => ["factor1", "factor2"],
            "dimensions" => ["n" => 2, "labels" => ["X", "Y"]],
        ];

        $field = MObjectField::from_rest($field_data);

        $this->assertEquals(123, $field->field_id);
        $this->assertEquals(456, $field->kind_id);
        $this->assertEquals("REST Field", $field->name);
        $this->assertEquals("rich", $field->type);
        $this->assertEquals(3, $field->display_order);
        $this->assertTrue($field->public);
        $this->assertTrue($field->required);
        $this->assertFalse($field->quick_browse);
        $this->assertEquals("REST help text", $field->help_text);
        $this->assertEquals(
            "REST detailed instructions",
            $field->detailed_instructions
        );
        $this->assertEquals(
            "REST public description",
            $field->public_description
        );
        $this->assertEquals('^[0-9]+$', $field->field_schema);
        $this->assertEquals(500, $field->max_length);
        $this->assertEquals("kg", $field->units);
        $this->assertEquals(["factor1", "factor2"], $field->factors);
        $this->assertEquals(
            ["n" => 2, "labels" => ["X", "Y"]],
            $field->dimensions
        );
        $this->assertNotEmpty($field->slug);
    }

    /**
     * Test from_rest with minimal data.
     */
    public function test_from_rest_minimal()
    {
        $field_data = [
            "field_id" => 0,
            "kind_id" => 1,
            "name" => "Basic REST Field",
            "type" => "plain",
            "factors" => null,
            "dimensions" => null,
        ];

        $field = MObjectField::from_rest($field_data);

        $this->assertEquals(0, $field->field_id);
        $this->assertEquals(1, $field->kind_id);
        $this->assertEquals("Basic REST Field", $field->name);
        $this->assertEquals("plain", $field->type);
        $this->assertEquals([], $field->factors);
        $this->assertNotEmpty($field->slug);
    }

    /**
     * Test set_dimensions method with object input.
     */
    public function test_set_dimensions_object()
    {
        $field = new MObjectField();

        $dimensions = (object) [
            "n" => 3,
            "labels" => ["Length", "Width", "Height"],
        ];

        $field->set_dimensions($dimensions);

        $this->assertEquals(3, $field->dimensions["n"]);
        $this->assertEquals(
            ["Length", "Width", "Height"],
            $field->dimensions["labels"]
        );
    }

    /**
     * Test set_dimensions method with array input.
     */
    public function test_set_dimensions_array()
    {
        $field = new MObjectField();

        $dimensions = [
            "n" => 2,
            "labels" => ["X", "Y"],
        ];

        $field->set_dimensions($dimensions);

        $this->assertEquals(2, $field->dimensions["n"]);
        $this->assertEquals(["X", "Y"], $field->dimensions["labels"]);
    }

    /**
     * Test set_dimensions method with invalid object (missing properties).
     */
    public function test_set_dimensions_invalid_object()
    {
        $field = new MObjectField();
        $original_dimensions = $field->dimensions;

        $invalid_dimensions = (object) [
            "n" => 3,
            // Missing 'labels' property
        ];

        $field->set_dimensions($invalid_dimensions);

        // Should not change dimensions if invalid
        $this->assertEquals($original_dimensions, $field->dimensions);
    }

    /**
     * Test set_dimensions method with invalid array (missing keys).
     */
    public function test_set_dimensions_invalid_array()
    {
        $field = new MObjectField();
        $original_dimensions = $field->dimensions;

        $invalid_dimensions = [
            "n" => 3,
            // Missing 'labels' key
        ];

        $field->set_dimensions($invalid_dimensions);

        // Should not change dimensions if invalid
        $this->assertEquals($original_dimensions, $field->dimensions);
    }

    /**
     * Test set_dimensions method with invalid labels (not array).
     */
    public function test_set_dimensions_invalid_labels()
    {
        $field = new MObjectField();
        $original_dimensions = $field->dimensions;

        $invalid_dimensions = [
            "n" => 3,
            "labels" => "not an array",
        ];

        $field->set_dimensions($invalid_dimensions);

        // Should not change dimensions if labels is not an array
        $this->assertEquals($original_dimensions, $field->dimensions);
    }

    /**
     * Test to_array method.
     */
    public function test_to_array()
    {
        $field = new MObjectField();
        $field->field_id = 123;
        $field->slug = "test-slug";
        $field->kind_id = 456;
        $field->name = "Test Field";
        $field->type = "plain";
        $field->display_order = 5;
        $field->public = true;
        $field->required = false;
        $field->quick_browse = true;
        $field->help_text = "Help text";
        $field->detailed_instructions = "Instructions";
        $field->public_description = "Description";
        $field->field_schema = '^[A-Z]+$';
        $field->max_length = 255;
        $field->dimensions = ["n" => 2, "labels" => ["X", "Y"]];
        $field->units = "cm";
        $field->factors = ["option1", "option2"];

        $array = $field->to_array();

        $this->assertEquals(123, $array["field_id"]);
        $this->assertEquals("test-slug", $array["slug"]);
        $this->assertEquals(456, $array["kind_id"]);
        $this->assertEquals("Test Field", $array["name"]);
        $this->assertEquals("plain", $array["type"]);
        $this->assertEquals(5, $array["display_order"]);
        $this->assertTrue($array["public"]);
        $this->assertFalse($array["required"]);
        $this->assertTrue($array["quick_browse"]);
        $this->assertEquals("Help text", $array["help_text"]);
        $this->assertEquals("Instructions", $array["detailed_instructions"]);
        $this->assertEquals("Description", $array["public_description"]);
        $this->assertEquals('^[A-Z]+$', $array["field_schema"]);
        $this->assertEquals(255, $array["max_length"]);
        $this->assertEquals(
            ["n" => 2, "labels" => ["X", "Y"]],
            $array["dimensions"]
        );
        $this->assertEquals("cm", $array["units"]);
        $this->assertEquals(["option1", "option2"], $array["factors"]);
    }

    /**
     * Test to_json_array method.
     */
    public function test_to_json_array()
    {
        $field = new MObjectField();
        $field->field_id = 123;
        $field->name = "Test Field";
        $field->dimensions = ["n" => 2, "labels" => ["X", "Y"]];
        $field->factors = ["option1", "option2"];

        $json_array = $field->to_json_array();

        $this->assertEquals(123, $json_array["field_id"]);
        $this->assertEquals("Test Field", $json_array["name"]);
        $this->assertEquals(
            '{"n":2,"labels":["X","Y"]}',
            $json_array["dimensions"]
        );
        $this->assertEquals('["option1","option2"]', $json_array["factors"]);
    }

    /**
     * Test slug generation from name.
     */
    public function test_slug_generation_from_name()
    {
        // We need to test the private method indirectly through from_database or from_rest
        $row = (object) [
            "field_id" => "-1", // Negative ID to simulate new field
            "kind_id" => "1",
            "name" => "Test Field Name",
            "type" => "plain",
            "display_order" => "1",
            "public" => "1",
            "required" => "0",
            "quick_browse" => "0",
            "help_text" => "",
            "detailed_instructions" => "",
            "public_description" => "",
            "field_schema" => "",
            "max_length" => "0",
            "units" => "",
            "factors" => null,
            "dimensions" => null,
        ];

        $field = MObjectField::from_database($row);

        // Slug should be derived from name: lowercase, spaces to dashes, special chars removed
        $this->assertEquals("test-field-name", $field->slug);
    }

    /**
     * Test slug generation with special characters.
     */
    public function test_slug_generation_special_chars()
    {
        $row = (object) [
            "field_id" => "-1",
            "kind_id" => "1",
            "name" => 'Test Field! @#$% Name',
            "type" => "plain",
            "display_order" => "1",
            "public" => "1",
            "required" => "0",
            "quick_browse" => "0",
            "help_text" => "",
            "detailed_instructions" => "",
            "public_description" => "",
            "field_schema" => "",
            "max_length" => "0",
            "units" => "",
            "factors" => null,
            "dimensions" => null,
        ];

        $field = MObjectField::from_database($row);

        // Special characters should be removed
        $this->assertEquals("test-field-name", $field->slug);
    }

    /**
     * Test different field types.
     */
    public function test_field_types()
    {
        $types = [
            "plain",
            "rich",
            "date",
            "factor",
            "multiple",
            "measure",
            "flag",
        ];

        foreach ($types as $type) {
            $row = (object) [
                "field_id" => "1",
                "kind_id" => "1",
                "name" => "Test {$type} Field",
                "type" => $type,
                "display_order" => "1",
                "public" => "1",
                "required" => "0",
                "quick_browse" => "0",
                "help_text" => "",
                "detailed_instructions" => "",
                "public_description" => "",
                "field_schema" => "",
                "max_length" => "0",
                "units" => "",
                "factors" => null,
                "dimensions" => null,
            ];

            $field = MObjectField::from_database($row);
            $this->assertEquals($type, $field->type);
        }
    }

    /**
     * Test boolean field properties.
     */
    public function test_boolean_properties()
    {
        $row = (object) [
            "field_id" => "1",
            "kind_id" => "1",
            "name" => "Boolean Test Field",
            "type" => "plain",
            "display_order" => "1",
            "public" => "1",
            "required" => "1",
            "quick_browse" => "1",
            "help_text" => "",
            "detailed_instructions" => "",
            "public_description" => "",
            "field_schema" => "",
            "max_length" => "0",
            "units" => "",
            "factors" => null,
            "dimensions" => null,
        ];

        $field = MObjectField::from_database($row);

        $this->assertTrue($field->public);
        $this->assertTrue($field->required);
        $this->assertTrue($field->quick_browse);

        // Test with false values
        $row->public = "0";
        $row->required = "0";
        $row->quick_browse = "0";

        $field = MObjectField::from_database($row);

        $this->assertFalse($field->public);
        $this->assertFalse($field->required);
        $this->assertFalse($field->quick_browse);
    }

    /**
     * Test measure field with dimensions.
     */
    public function test_measure_field_with_dimensions()
    {
        $row = (object) [
            "field_id" => "1",
            "kind_id" => "1",
            "name" => "Measurement Field",
            "type" => "measure",
            "display_order" => "1",
            "public" => "1",
            "required" => "0",
            "quick_browse" => "0",
            "help_text" => "",
            "detailed_instructions" => "",
            "public_description" => "",
            "field_schema" => "",
            "max_length" => "0",
            "units" => "cm",
            "factors" => null,
            "dimensions" => '{"n": 3, "labels": ["Length", "Width", "Height"]}',
        ];

        $field = MObjectField::from_database($row);

        $this->assertEquals("measure", $field->type);
        $this->assertEquals("cm", $field->units);
        $this->assertEquals(3, $field->dimensions["n"]);
        $this->assertEquals(
            ["Length", "Width", "Height"],
            $field->dimensions["labels"]
        );
    }

    /**
     * Test factor field with factors.
     */
    public function test_factor_field_with_factors()
    {
        $row = (object) [
            "field_id" => "1",
            "kind_id" => "1",
            "name" => "Factor Field",
            "type" => "factor",
            "display_order" => "1",
            "public" => "1",
            "required" => "0",
            "quick_browse" => "0",
            "help_text" => "",
            "detailed_instructions" => "",
            "public_description" => "",
            "field_schema" => "",
            "max_length" => "0",
            "units" => "",
            "factors" => '["Red", "Green", "Blue", "Yellow"]',
            "dimensions" => null,
        ];

        $field = MObjectField::from_database($row);

        $this->assertEquals("factor", $field->type);
        $this->assertEquals(
            ["Red", "Green", "Blue", "Yellow"],
            $field->factors
        );
    }
}
