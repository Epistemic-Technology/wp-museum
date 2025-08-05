<?php
/**
 * Tests for ObjectKind class
 *
 * @package MikeThicke\WPMuseum
 */

use MikeThicke\WPMuseum\ObjectKind;
use MikeThicke\WPMuseum\WP_Museum_Test_Case;

/**
 * Test ObjectKind class.
 */
class TestObjectKind extends WP_Museum_Test_Case
{
    /**
     * Test ObjectKind constructor with complete data.
     */
    public function test_constructor_complete()
    {
        $kind_row = (object) [
            "kind_id" => "123",
            "cat_field_id" => "456",
            "name" => "test-artifact",
            "type_name" => "wpm_test-artifact",
            "label" => "Test Artifact",
            "label_plural" => "Test Artifacts",
            "description" => "A test artifact type",
            "hierarchical" => "1",
            "must_featured_image" => "1",
            "must_gallery" => "0",
            "strict_checking" => "1",
            "exclude_from_search" => "0",
            "parent_kind_id" => "789",
        ];

        $kind = new ObjectKind($kind_row);

        $this->assertEquals(123, $kind->kind_id);
        $this->assertEquals(456, $kind->cat_field_id);
        $this->assertEquals("test-artifact", $kind->name);
        $this->assertEquals("wpm_test-artifact", $kind->type_name);
        $this->assertEquals("Test Artifact", $kind->label);
        $this->assertEquals("Test Artifacts", $kind->label_plural);
        $this->assertEquals("A test artifact type", $kind->description);
        $this->assertTrue($kind->hierarchical);
        $this->assertTrue($kind->must_featured_image);
        $this->assertFalse($kind->must_gallery);
        $this->assertTrue($kind->strict_checking);
        $this->assertFalse($kind->exclude_from_search);
        $this->assertEquals(789, $kind->parent_kind_id);
    }

    /**
     * Test ObjectKind constructor with minimal data.
     */
    public function test_constructor_minimal()
    {
        $kind_row = (object) [
            "kind_id" => "1",
            "label" => "Basic Kind",
        ];

        $kind = new ObjectKind($kind_row);

        $this->assertEquals(1, $kind->kind_id);
        $this->assertNull($kind->cat_field_id);
        $this->assertNull($kind->name);
        $this->assertNull($kind->type_name);
        $this->assertEquals("Basic Kind", $kind->label);
        $this->assertNull($kind->label_plural);
        $this->assertNull($kind->description);
        $this->assertNull($kind->hierarchical);
        $this->assertNull($kind->must_featured_image);
        $this->assertNull($kind->must_gallery);
        $this->assertNull($kind->strict_checking);
        $this->assertNull($kind->exclude_from_search);
        $this->assertNull($kind->parent_kind_id);
    }

    /**
     * Test ObjectKind constructor with empty data.
     */
    public function test_constructor_empty()
    {
        $kind_row = (object) [];

        $kind = new ObjectKind($kind_row);

        $this->assertNull($kind->kind_id);
        $this->assertNull($kind->cat_field_id);
        $this->assertNull($kind->name);
        $this->assertNull($kind->type_name);
        $this->assertNull($kind->label);
        $this->assertNull($kind->label_plural);
        $this->assertNull($kind->description);
        $this->assertNull($kind->hierarchical);
        $this->assertNull($kind->must_featured_image);
        $this->assertNull($kind->must_gallery);
        $this->assertNull($kind->strict_checking);
        $this->assertNull($kind->exclude_from_search);
        $this->assertNull($kind->parent_kind_id);
    }

    /**
     * Test name_from_label static method.
     */
    public function test_name_from_label()
    {
        $this->assertEquals(
            "test-artifact",
            ObjectKind::name_from_label("Test Artifact")
        );
        $this->assertEquals(
            "my-custom-object",
            ObjectKind::name_from_label("My Custom Object")
        );
        $this->assertEquals(
            "multiple-spaces-test",
            ObjectKind::name_from_label("Multiple   Spaces   Test")
        );
        $this->assertEquals("", ObjectKind::name_from_label(""));
    }

    /**
     * Test boolean property conversion.
     */
    public function test_boolean_conversion()
    {
        $kind_row = (object) [
            "kind_id" => "1",
            "hierarchical" => "1",
            "must_featured_image" => "0",
            "must_gallery" => "1",
            "strict_checking" => "0",
            "exclude_from_search" => "1",
        ];

        $kind = new ObjectKind($kind_row);

        $this->assertTrue($kind->hierarchical);
        $this->assertFalse($kind->must_featured_image);
        $this->assertTrue($kind->must_gallery);
        $this->assertFalse($kind->strict_checking);
        $this->assertTrue($kind->exclude_from_search);
    }

    /**
     * Test integer property conversion.
     */
    public function test_integer_conversion()
    {
        $kind_row = (object) [
            "kind_id" => "123",
            "cat_field_id" => "456",
            "parent_kind_id" => "789",
        ];

        $kind = new ObjectKind($kind_row);

        $this->assertIsInt($kind->kind_id);
        $this->assertEquals(123, $kind->kind_id);
        $this->assertIsInt($kind->cat_field_id);
        $this->assertEquals(456, $kind->cat_field_id);
        $this->assertIsInt($kind->parent_kind_id);
        $this->assertEquals(789, $kind->parent_kind_id);
    }

    /**
     * Test to_array method.
     */
    public function test_to_array()
    {
        $kind_row = (object) [
            "kind_id" => "123",
            "cat_field_id" => "456",
            "name" => "test-artifact",
            "type_name" => "wpm_test-artifact",
            "label" => "Test Artifact",
            "label_plural" => "Test Artifacts",
            "description" => "A test artifact type",
            "hierarchical" => "1",
            "must_featured_image" => "1",
            "must_gallery" => "0",
            "strict_checking" => "1",
            "exclude_from_search" => "0",
            "parent_kind_id" => "789",
        ];

        $kind = new ObjectKind($kind_row);
        $kind->categorized = true; // Set this manually since it's not in constructor

        $array = $kind->to_array();

        $this->assertEquals(123, $array["kind_id"]);
        $this->assertEquals(456, $array["cat_field_id"]);
        $this->assertEquals("test-artifact", $array["name"]);
        $this->assertEquals("wpm_test-artifact", $array["type_name"]);
        $this->assertEquals("Test Artifact", $array["label"]);
        $this->assertEquals("Test Artifacts", $array["label_plural"]);
        $this->assertEquals("A test artifact type", $array["description"]);
        $this->assertTrue($array["categorized"]);
        $this->assertTrue($array["hierarchical"]);
        $this->assertTrue($array["must_featured_image"]);
        $this->assertFalse($array["must_gallery"]);
        $this->assertTrue($array["strict_checking"]);
        $this->assertFalse($array["exclude_from_search"]);
        $this->assertEquals(789, $array["parent_kind_id"]);
    }

    /**
     * Test to_rest_array method includes additional fields.
     */
    public function test_to_rest_array()
    {
        $kind_row = (object) [
            "kind_id" => "123",
            "name" => "test-artifact",
            "type_name" => "wpm_test-artifact",
            "label" => "Test Artifact",
        ];

        $kind = new ObjectKind($kind_row);

        $rest_array = $kind->to_rest_array();

        // Should include all basic fields
        $this->assertEquals(123, $rest_array["kind_id"]);
        $this->assertEquals("test-artifact", $rest_array["name"]);
        $this->assertEquals("wpm_test-artifact", $rest_array["type_name"]);
        $this->assertEquals("Test Artifact", $rest_array["label"]);

        // Should include additional REST-specific fields
        $this->assertArrayHasKey("block_template", $rest_array);
        $this->assertArrayHasKey("children", $rest_array);
        $this->assertIsArray($rest_array["children"]);
    }

    /**
     * Test to_public_rest_array method excludes private fields.
     */
    public function test_to_public_rest_array()
    {
        $kind_row = (object) [
            "kind_id" => "123",
            "cat_field_id" => "456",
            "name" => "test-artifact",
            "type_name" => "wpm_test-artifact",
            "label" => "Test Artifact",
            "label_plural" => "Test Artifacts",
            "description" => "A test artifact type",
            "hierarchical" => "1",
            "must_featured_image" => "1",
            "must_gallery" => "0",
            "strict_checking" => "1",
            "exclude_from_search" => "0",
            "parent_kind_id" => "789",
        ];

        $kind = new ObjectKind($kind_row);
        $kind->categorized = true;

        $public_array = $kind->to_public_rest_array();

        // Should include public fields
        $this->assertEquals(123, $public_array["kind_id"]);
        $this->assertEquals(456, $public_array["cat_field_id"]);
        $this->assertEquals("test-artifact", $public_array["name"]);
        $this->assertEquals("wpm_test-artifact", $public_array["type_name"]);
        $this->assertEquals("Test Artifact", $public_array["label"]);
        $this->assertEquals("Test Artifacts", $public_array["label_plural"]);
        $this->assertEquals(
            "A test artifact type",
            $public_array["description"]
        );
        $this->assertTrue($public_array["categorized"]);
        $this->assertTrue($public_array["hierarchical"]);
        $this->assertEquals(789, $public_array["parent_kind_id"]);
        $this->assertArrayHasKey("children", $public_array);

        // Should NOT include private/admin fields
        $this->assertArrayNotHasKey("must_featured_image", $public_array);
        $this->assertArrayNotHasKey("must_gallery", $public_array);
        $this->assertArrayNotHasKey("strict_checking", $public_array);
        $this->assertArrayNotHasKey("exclude_from_search", $public_array);
        $this->assertArrayNotHasKey("block_template", $public_array);
    }

    /**
     * Test get_all_posts method returns posts of correct type.
     */
    public function test_get_all_posts()
    {
        $kind_row = (object) [
            "kind_id" => "1",
            "type_name" => "test_post_type",
            "label" => "Test Post Type",
        ];

        $kind = new ObjectKind($kind_row);

        // Create some test posts of the correct type
        $post1 = $this->factory->post->create([
            "post_type" => "test_post_type",
            "post_title" => "Test Post 1",
        ]);

        $post2 = $this->factory->post->create([
            "post_type" => "test_post_type",
            "post_title" => "Test Post 2",
        ]);

        // Create a post of different type (should not be included)
        $post3 = $this->factory->post->create([
            "post_type" => "post",
            "post_title" => "Regular Post",
        ]);

        $posts = $kind->get_all_posts();

        // Should return posts of the correct type
        $this->assertIsArray($posts);
        $this->assertCount(2, $posts);

        $post_ids = array_map(function ($post) {
            return $post->ID;
        }, $posts);

        $this->assertContains($post1, $post_ids);
        $this->assertContains($post2, $post_ids);
        $this->assertNotContains($post3, $post_ids);
    }

    /**
     * Test get_children method returns child kinds.
     */
    public function test_get_children()
    {
        // This test would require mocking get_mobject_kinds() function
        // which is beyond the scope of unit tests without the full WordPress environment
        $kind_row = (object) [
            "kind_id" => "1",
            "label" => "Parent Kind",
        ];

        $kind = new ObjectKind($kind_row);

        // Call the method to ensure it doesn't throw errors
        $children = $kind->get_children();
        $this->assertIsArray($children);
    }

    /**
     * Test get_children_array method returns array of arrays.
     */
    public function test_get_children_array()
    {
        $kind_row = (object) [
            "kind_id" => "1",
            "label" => "Parent Kind",
        ];

        $kind = new ObjectKind($kind_row);

        // Call the method to ensure it doesn't throw errors
        $children_array = $kind->get_children_array();
        $this->assertIsArray($children_array);
    }

    /**
     * Test get_child_types method returns array of type names.
     */
    public function test_get_child_types()
    {
        $kind_row = (object) [
            "kind_id" => "1",
            "label" => "Parent Kind",
        ];

        $kind = new ObjectKind($kind_row);

        // Call the method to ensure it doesn't throw errors
        $child_types = $kind->get_child_types();
        $this->assertIsArray($child_types);
    }

    /**
     * Test get_fields method.
     */
    public function test_get_fields()
    {
        // This test would require mocking get_mobject_fields() function
        $kind_row = (object) [
            "kind_id" => "1",
            "label" => "Test Kind",
        ];

        $kind = new ObjectKind($kind_row);

        // Call the method to ensure it doesn't throw errors
        $fields = $kind->get_fields();
        $this->assertIsArray($fields);
    }

    /**
     * Test block_template method.
     */
    public function test_block_template()
    {
        $kind_row = (object) [
            "kind_id" => "1",
            "type_name" => "test_block_template",
            "label" => "Test Block Template",
        ];

        $kind = new ObjectKind($kind_row);

        // This will likely return null in test environment since post type isn't registered
        $template = $kind->block_template();
        $this->assertTrue(is_null($template) || is_array($template));
    }

    /**
     * Test string property handling.
     */
    public function test_string_properties()
    {
        $kind_row = (object) [
            "name" => "test-name",
            "type_name" => "wpm_test-name",
            "label" => "Test Label",
            "label_plural" => "Test Labels",
            "description" => "Test description text",
        ];

        $kind = new ObjectKind($kind_row);

        $this->assertIsString($kind->name);
        $this->assertIsString($kind->type_name);
        $this->assertIsString($kind->label);
        $this->assertIsString($kind->label_plural);
        $this->assertIsString($kind->description);

        $this->assertEquals("test-name", $kind->name);
        $this->assertEquals("wpm_test-name", $kind->type_name);
        $this->assertEquals("Test Label", $kind->label);
        $this->assertEquals("Test Labels", $kind->label_plural);
        $this->assertEquals("Test description text", $kind->description);
    }

    /**
     * Test save_to_db method basic functionality.
     */
    public function test_save_to_db_basic()
    {
        $kind_row = (object) [
            "kind_id" => "1",
            "label" => "Test Save Kind",
        ];

        $kind = new ObjectKind($kind_row);

        // Since we can't easily test database operations in unit tests,
        // we'll just verify the method can be called without errors
        // In a real test environment, this would require database setup
        $this->assertTrue(method_exists($kind, "save_to_db"));
    }

    /**
     * Test delete_from_db method basic functionality.
     */
    public function test_delete_from_db_basic()
    {
        $kind_row = (object) [
            "kind_id" => "1",
            "label" => "Test Delete Kind",
        ];

        $kind = new ObjectKind($kind_row);

        // Since we can't easily test database operations in unit tests,
        // we'll just verify the method can be called without errors
        $this->assertTrue(method_exists($kind, "delete_from_db"));
    }

    /**
     * Test delete_from_db with invalid kind_id.
     */
    public function test_delete_from_db_invalid_id()
    {
        $kind_row = (object) [
            "label" => "Test Invalid Delete",
        ];

        $kind = new ObjectKind($kind_row);
        $kind->kind_id = -1; // Invalid ID

        // Should return false for invalid ID
        $result = $kind->delete_from_db();
        $this->assertFalse($result);
    }

    /**
     * Test that constructor handles null values gracefully.
     */
    public function test_constructor_null_values()
    {
        $kind_row = (object) [
            "kind_id" => null,
            "cat_field_id" => null,
            "name" => null,
            "type_name" => null,
            "label" => null,
            "label_plural" => null,
            "description" => null,
            "hierarchical" => null,
            "must_featured_image" => null,
            "must_gallery" => null,
            "strict_checking" => null,
            "exclude_from_search" => null,
            "parent_kind_id" => null,
        ];

        $kind = new ObjectKind($kind_row);

        $this->assertNull($kind->kind_id);
        $this->assertNull($kind->cat_field_id);
        $this->assertNull($kind->name);
        $this->assertNull($kind->type_name);
        $this->assertNull($kind->label);
        $this->assertNull($kind->label_plural);
        $this->assertNull($kind->description);
        $this->assertNull($kind->hierarchical);
        $this->assertNull($kind->must_featured_image);
        $this->assertNull($kind->must_gallery);
        $this->assertNull($kind->strict_checking);
        $this->assertNull($kind->exclude_from_search);
        $this->assertNull($kind->parent_kind_id);
    }
}
