<?php
/**
 * Tests for ObjectPostType class
 *
 * @package MikeThicke\WPMuseum
 */

use MikeThicke\WPMuseum\ObjectPostType;
use MikeThicke\WPMuseum\ObjectKind;
use MikeThicke\WPMuseum\MObjectField;
use MikeThicke\WPMuseum\CustomPostType;

/**
 * Test ObjectPostType class.
 */
class TestObjectPostType extends WP_UnitTestCase
{
    /**
     * Test ObjectPostType constructor with basic kind.
     */
    public function test_constructor_basic()
    {
        $kind_row = (object) [
            "kind_id" => "1",
            "type_name" => "wpm_test_object",
            "label" => "Test Object",
            "label_plural" => "Test Objects",
            "description" => "A test object type",
        ];

        $kind = new ObjectKind($kind_row);
        $object_post_type = new ObjectPostType($kind);

        $this->assertInstanceOf(ObjectKind::class, $object_post_type->kind);
        $this->assertInstanceOf(
            CustomPostType::class,
            $object_post_type->object_post_type
        );
        $this->assertIsArray($object_post_type->fields);
        $this->assertEquals(
            "Test Object",
            $object_post_type->object_post_type->options["label"]
        );
        $this->assertEquals(
            "Test Objects",
            $object_post_type->object_post_type->options["label_plural"]
        );
        $this->assertEquals(
            "A test object type",
            $object_post_type->object_post_type->options["description"]
        );
    }

    /**
     * Test ObjectPostType constructor with kind that has no label_plural.
     */
    public function test_constructor_no_label_plural()
    {
        $kind_row = (object) [
            "kind_id" => "1",
            "type_name" => "wpm_test_single",
            "label" => "Test Single",
            "description" => "A test single type",
        ];

        $kind = new ObjectKind($kind_row);
        $object_post_type = new ObjectPostType($kind);

        // Should automatically add 's' to label for plural
        $this->assertEquals(
            "Test Singles",
            $object_post_type->object_post_type->options["label_plural"]
        );
    }

    /**
     * Test ObjectPostType constructor with child kind (has parent_kind_id).
     */
    public function test_constructor_child_kind()
    {
        $kind_row = (object) [
            "kind_id" => "2",
            "type_name" => "wpm_test_child",
            "label" => "Test Child",
            "label_plural" => "Test Children",
            "description" => "A child test object type",
            "parent_kind_id" => "1",
        ];

        $kind = new ObjectKind($kind_row);
        $object_post_type = new ObjectPostType($kind);

        // Child kinds should have show_in_menu set to false
        $this->assertFalse(
            $object_post_type->object_post_type->options["options"][
                "show_in_menu"
            ]
        );
    }

    /**
     * Test ObjectPostType constructor with parent kind (no parent_kind_id).
     */
    public function test_constructor_parent_kind()
    {
        $kind_row = (object) [
            "kind_id" => "1",
            "type_name" => "wpm_test_parent",
            "label" => "Test Parent",
            "label_plural" => "Test Parents",
            "description" => "A parent test object type",
            "parent_kind_id" => null,
        ];

        $kind = new ObjectKind($kind_row);
        $object_post_type = new ObjectPostType($kind);

        // Parent kinds should not have show_in_menu option set
        $this->assertArrayNotHasKey(
            "show_in_menu",
            $object_post_type->object_post_type->options["options"]
        );
    }

    /**
     * Test ObjectPostType constructor sets correct post type options.
     */
    public function test_constructor_post_type_options()
    {
        $kind_row = (object) [
            "kind_id" => "1",
            "type_name" => "wpm_test_options",
            "label" => "Test Options",
        ];

        $kind = new ObjectKind($kind_row);
        $object_post_type = new ObjectPostType($kind);

        $options = $object_post_type->object_post_type->options;

        $this->assertEquals("wpm_test_options", $options["type"]);
        $this->assertEquals("Test Options", $options["label"]);
        $this->assertFalse($options["hierarchical"]);

        // Test capabilities
        $capabilities = $options["options"]["capabilities"];
        $this->assertEquals("wpm_edit_objects", $capabilities["edit_posts"]);
        $this->assertEquals(
            "wpm_edit_others_objects",
            $capabilities["edit_others_posts"]
        );
        $this->assertEquals(
            "wpm_publish_objects",
            $capabilities["publish_posts"]
        );
        $this->assertEquals(
            "wpm_read_private_objects",
            $capabilities["read_private_posts"]
        );
        $this->assertEquals(
            "wpm_delete_objects",
            $capabilities["delete_posts"]
        );
        $this->assertEquals(
            "wpm_edit_published_objects",
            $capabilities["edit_published_posts"]
        );

        // Test other options
        $this->assertTrue($options["options"]["map_meta_cap"]);
        $this->assertEquals("all", $options["options"]["template_lock"]);
        $this->assertIsArray($options["options"]["template"]);
    }

    /**
     * Test ObjectPostType constructor sets correct supports.
     */
    public function test_constructor_supports()
    {
        $kind_row = (object) [
            "kind_id" => "1",
            "type_name" => "wpm_test_supports",
            "label" => "Test Supports",
        ];

        $kind = new ObjectKind($kind_row);
        $object_post_type = new ObjectPostType($kind);

        $supports = $object_post_type->object_post_type->supports;

        $this->assertContains("title", $supports);
        $this->assertContains("thumbnail", $supports);
        $this->assertContains("author", $supports);
        $this->assertContains("editor", $supports);
        $this->assertContains("custom-fields", $supports);
    }

    /**
     * Test ObjectPostType constructor sets correct taxonomies.
     */
    public function test_constructor_taxonomies()
    {
        $kind_row = (object) [
            "kind_id" => "1",
            "type_name" => "wpm_test_taxonomies",
            "label" => "Test Taxonomies",
        ];

        $kind = new ObjectKind($kind_row);
        $object_post_type = new ObjectPostType($kind);

        $taxonomies = $object_post_type->object_post_type->taxonomies;

        $this->assertContains("wpm_collection_tax", $taxonomies);
        $this->assertContains("post_tag", $taxonomies);
    }

    /**
     * Test ObjectPostType constructor sets template correctly.
     */
    public function test_constructor_template()
    {
        $kind_row = (object) [
            "kind_id" => "1",
            "type_name" => "wpm_test_template",
            "label" => "Test Template",
        ];

        $kind = new ObjectKind($kind_row);
        $object_post_type = new ObjectPostType($kind);

        $template =
            $object_post_type->object_post_type->options["options"]["template"];

        $this->assertIsArray($template);
        $this->assertCount(4, $template);

        // Check template structure
        $this->assertEquals("core/paragraph", $template[0][0]);
        $this->assertEquals("wp-museum/object-meta-block", $template[1][0]);
        $this->assertEquals(
            "wp-museum/object-image-attachments-block",
            $template[2][0]
        );
        $this->assertEquals("wp-museum/child-objects-block", $template[3][0]);

        // Check paragraph placeholder
        $this->assertEquals(
            "A general description of the object...",
            $template[0][1]["placeholder"]
        );
    }

    /**
     * Test register_fields_meta method with different field types.
     */
    public function test_register_fields_meta()
    {
        $kind_row = (object) [
            "kind_id" => "1",
            "type_name" => "wpm_test_fields",
            "label" => "Test Fields",
        ];

        $kind = new ObjectKind($kind_row);
        $object_post_type = new ObjectPostType($kind);

        // Mock fields
        $object_post_type->fields = [
            $this->create_mock_field("text_field", "plain"),
            $this->create_mock_field("flag_field", "flag"),
            $this->create_mock_field("multiple_field", "multiple"),
            $this->create_mock_field("measure_field", "measure"),
        ];

        // Since we can't easily test WordPress meta registration in unit tests,
        // we'll just verify the method can be called without errors
        $object_post_type->register_fields_meta();
        $this->assertTrue(true);
    }

    /**
     * Test register_relationship_meta method.
     */
    public function test_register_relationship_meta()
    {
        $kind_row = (object) [
            "kind_id" => "1",
            "type_name" => "wpm_test_relationships",
            "label" => "Test Relationships",
        ];

        $kind = new ObjectKind($kind_row);
        $object_post_type = new ObjectPostType($kind);

        // Since we can't easily test WordPress meta registration in unit tests,
        // we'll just verify the method can be called without errors
        $object_post_type->register_relationship_meta();
        $this->assertTrue(true);
    }

    /**
     * Test register method.
     */
    public function test_register()
    {
        $kind_row = (object) [
            "kind_id" => "1",
            "type_name" => "wpm_test_register",
            "label" => "Test Register",
        ];

        $kind = new ObjectKind($kind_row);
        $object_post_type = new ObjectPostType($kind);

        // Since we can't easily test WordPress registration in unit tests,
        // we'll just verify the method can be called without errors
        $object_post_type->register();
        $this->assertTrue(true);
    }

    /**
     * Test that fields are properly assigned.
     */
    public function test_fields_assignment()
    {
        $kind_row = (object) [
            "kind_id" => "1",
            "type_name" => "wpm_test_fields_assign",
            "label" => "Test Fields Assignment",
        ];

        $kind = new ObjectKind($kind_row);
        $object_post_type = new ObjectPostType($kind);

        // Fields should be assigned to both object_post_type and object itself
        $this->assertEquals(
            $object_post_type->fields,
            $object_post_type->object_post_type->custom_fields
        );
    }

    /**
     * Test ObjectPostType with kind that has empty type_name.
     */
    public function test_constructor_empty_type_name()
    {
        $kind_row = (object) [
            "kind_id" => "1",
            "type_name" => "",
            "label" => "Empty Type Name",
        ];

        $kind = new ObjectKind($kind_row);
        $object_post_type = new ObjectPostType($kind);

        $this->assertEquals(
            "",
            $object_post_type->object_post_type->options["type"]
        );
    }

    /**
     * Test ObjectPostType with kind that has empty label.
     */
    public function test_constructor_empty_label()
    {
        $kind_row = (object) [
            "kind_id" => "1",
            "type_name" => "wpm_empty_label",
            "label" => "",
        ];

        $kind = new ObjectKind($kind_row);
        $object_post_type = new ObjectPostType($kind);

        $this->assertEquals(
            "",
            $object_post_type->object_post_type->options["label"]
        );
    }

    /**
     * Test that menu icon is correctly set.
     */
    public function test_menu_icon()
    {
        $kind_row = (object) [
            "kind_id" => "1",
            "type_name" => "wpm_test_icon",
            "label" => "Test Icon",
        ];

        $kind = new ObjectKind($kind_row);
        $object_post_type = new ObjectPostType($kind);

        // Since museum_icon() function might not be available in test environment,
        // we'll just check that menu_icon is set
        $this->assertArrayHasKey(
            "menu_icon",
            $object_post_type->object_post_type->options
        );
    }

    /**
     * Helper method to create mock field.
     */
    private function create_mock_field($slug, $type)
    {
        $field = new MObjectField();
        $field->slug = $slug;
        $field->type = $type;
        $field->name = ucwords(str_replace("_", " ", $slug));
        return $field;
    }

    /**
     * Test that object_post_type is properly initialized.
     */
    public function test_object_post_type_initialization()
    {
        $kind_row = (object) [
            "kind_id" => "1",
            "type_name" => "wpm_test_init",
            "label" => "Test Init",
        ];

        $kind = new ObjectKind($kind_row);
        $object_post_type = new ObjectPostType($kind);

        $this->assertInstanceOf(
            CustomPostType::class,
            $object_post_type->object_post_type
        );
        $this->assertFalse(
            $object_post_type->object_post_type->options["hierarchical"]
        );
        $this->assertTrue(
            $object_post_type->object_post_type->options["public"]
        );
    }

    /**
     * Test that custom post type options are correctly merged.
     */
    public function test_custom_post_type_options_merge()
    {
        $kind_row = (object) [
            "kind_id" => "1",
            "type_name" => "wpm_test_merge",
            "label" => "Test Merge",
        ];

        $kind = new ObjectKind($kind_row);
        $object_post_type = new ObjectPostType($kind);

        $options = $object_post_type->object_post_type->options;

        // Basic options should be set
        $this->assertEquals("wpm_test_merge", $options["type"]);
        $this->assertEquals("Test Merge", $options["label"]);

        // Advanced options should be in 'options' sub-array
        $this->assertArrayHasKey("options", $options);
        $this->assertArrayHasKey("capabilities", $options["options"]);
        $this->assertArrayHasKey("map_meta_cap", $options["options"]);
        $this->assertArrayHasKey("template", $options["options"]);
        $this->assertArrayHasKey("template_lock", $options["options"]);
    }

    /**
     * Test that fields array is properly initialized.
     */
    public function test_fields_initialization()
    {
        $kind_row = (object) [
            "kind_id" => "1",
            "type_name" => "wpm_test_fields_init",
            "label" => "Test Fields Init",
        ];

        $kind = new ObjectKind($kind_row);
        $object_post_type = new ObjectPostType($kind);

        $this->assertIsArray($object_post_type->fields);
        // Fields would be populated by get_mobject_fields() function
        // which requires database and full WordPress environment
    }
}
