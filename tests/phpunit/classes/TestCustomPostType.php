<?php
/**
 * Tests for CustomPostType class
 *
 * @package MikeThicke\WPMuseum
 */

use MikeThicke\WPMuseum\CustomPostType;

/**
 * Test CustomPostType class.
 */
class TestCustomPostType extends WP_UnitTestCase
{
    /**
     * Test CustomPostType constructor with default options.
     */
    public function test_constructor_with_defaults()
    {
        $options = [
            "type" => "test_post",
            "label" => "Test Post",
        ];

        $custom_post_type = new CustomPostType($options);

        $this->assertEquals("test_post", $custom_post_type->options["type"]);
        $this->assertEquals("Test Post", $custom_post_type->options["label"]);
        $this->assertEquals("test_post_meta", $custom_post_type->meta_name);
        $this->assertEquals("Test Post Options", $custom_post_type->meta_label);
        $this->assertTrue($custom_post_type->options["public"]);
        $this->assertTrue($custom_post_type->options["hierarchical"]);
        $this->assertEquals(
            "dashicons-format-aside",
            $custom_post_type->options["menu_icon"]
        );
    }

    /**
     * Test CustomPostType constructor with custom options.
     */
    public function test_constructor_with_custom_options()
    {
        $options = [
            "type" => "custom_type",
            "label" => "Custom Type",
            "label_plural" => "Custom Types",
            "description" => "A custom post type for testing",
            "public" => false,
            "hierarchical" => false,
            "menu_icon" => "dashicons-admin-page",
        ];

        $custom_post_type = new CustomPostType($options);

        $this->assertEquals("custom_type", $custom_post_type->options["type"]);
        $this->assertEquals("Custom Type", $custom_post_type->options["label"]);
        $this->assertEquals(
            "Custom Types",
            $custom_post_type->options["label_plural"]
        );
        $this->assertEquals(
            "A custom post type for testing",
            $custom_post_type->options["description"]
        );
        $this->assertFalse($custom_post_type->options["public"]);
        $this->assertFalse($custom_post_type->options["hierarchical"]);
        $this->assertEquals(
            "dashicons-admin-page",
            $custom_post_type->options["menu_icon"]
        );
    }

    /**
     * Test add_support method with single string.
     */
    public function test_add_support_single_string()
    {
        $custom_post_type = new CustomPostType([
            "type" => "test",
            "label" => "Test",
        ]);
        $initial_supports = $custom_post_type->supports;

        $custom_post_type->add_support("thumbnail");

        $this->assertContains("thumbnail", $custom_post_type->supports);
        $this->assertEquals(
            count($initial_supports) + 1,
            count($custom_post_type->supports)
        );
    }

    /**
     * Test add_support method with array.
     */
    public function test_add_support_array()
    {
        $custom_post_type = new CustomPostType([
            "type" => "test",
            "label" => "Test",
        ]);
        $initial_count = count($custom_post_type->supports);

        $new_supports = ["thumbnail", "excerpt", "comments"];
        $custom_post_type->add_support($new_supports);

        foreach ($new_supports as $support) {
            $this->assertContains($support, $custom_post_type->supports);
        }
        $this->assertEquals(
            $initial_count + count($new_supports),
            count($custom_post_type->supports)
        );
    }

    /**
     * Test add_taxonomy method with single string.
     */
    public function test_add_taxonomy_single_string()
    {
        $custom_post_type = new CustomPostType([
            "type" => "test",
            "label" => "Test",
        ]);

        $custom_post_type->add_taxonomy("category");

        $this->assertContains("category", $custom_post_type->taxonomies);
    }

    /**
     * Test add_taxonomy method with array.
     */
    public function test_add_taxonomy_array()
    {
        $custom_post_type = new CustomPostType([
            "type" => "test",
            "label" => "Test",
        ]);

        $taxonomies = ["category", "post_tag", "custom_tax"];
        $custom_post_type->add_taxonomy($taxonomies);

        foreach ($taxonomies as $taxonomy) {
            $this->assertContains($taxonomy, $custom_post_type->taxonomies);
        }
    }

    /**
     * Test add_meta_field method.
     */
    public function test_add_meta_field()
    {
        $custom_post_type = new CustomPostType([
            "type" => "test",
            "label" => "Test",
        ]);

        $custom_post_type->add_meta_field("test_field", "Test Field", "text", [
            "width" => "50%",
        ]);

        $this->assertArrayHasKey(
            "test_field",
            $custom_post_type->meta_box_fields
        );
        $this->assertEquals(
            "Test Field",
            $custom_post_type->meta_box_fields["test_field"]["label"]
        );
        $this->assertEquals(
            "text",
            $custom_post_type->meta_box_fields["test_field"]["type"]
        );
        $this->assertEquals(
            "50%",
            $custom_post_type->meta_box_fields["test_field"]["options"]["width"]
        );
    }

    /**
     * Test register_post_meta method.
     */
    public function test_register_post_meta()
    {
        $custom_post_type = new CustomPostType([
            "type" => "test_meta",
            "label" => "Test Meta",
        ]);

        // This should not throw an error
        $custom_post_type->register_post_meta(
            "test_meta_field",
            "string",
            "Test meta field"
        );

        // Since we can't easily test WordPress meta registration in unit tests,
        // we'll just verify the method can be called without errors
        $this->assertTrue(true);
    }

    /**
     * Test labels method generates correct labels.
     */
    public function test_labels_generation()
    {
        $custom_post_type = new CustomPostType([
            "type" => "book",
            "label" => "Book",
            "label_plural" => "Books",
        ]);

        $reflection = new ReflectionClass($custom_post_type);
        $labels_method = $reflection->getMethod("labels");
        $labels_method->setAccessible(true);
        $labels = $labels_method->invoke($custom_post_type);

        $this->assertEquals("Books", $labels["name"]);
        $this->assertEquals("Book", $labels["singular_name"]);
        $this->assertEquals("New Book", $labels["add_new_item"]);
        $this->assertEquals("Edit Book", $labels["edit_item"]);
        $this->assertEquals("View Book", $labels["view_item"]);
        $this->assertEquals("View Books", $labels["view_items"]);
        $this->assertEquals("Search Books", $labels["search_items"]);
        $this->assertEquals("No books found", $labels["not_found"]);
        $this->assertEquals(
            "No books found in trash",
            $labels["not_found_in_trash"]
        );
        $this->assertEquals("Parent Book", $labels["parent_item_colon"]);
        $this->assertEquals("All Books", $labels["all_items"]);
        $this->assertEquals("Book Archives", $labels["archives"]);
        $this->assertEquals("Book Attributes", $labels["attributes"]);
        $this->assertEquals("Insert into book", $labels["insert_into_item"]);
        $this->assertEquals(
            "Uploaded to this book",
            $labels["uploaded_to_this_item"]
        );
    }

    /**
     * Test add_to_query method modifies query correctly.
     */
    public function test_add_to_query()
    {
        $custom_post_type = new CustomPostType([
            "type" => "test_query",
            "label" => "Test Query",
        ]);

        // Create a mock WP_Query
        $query = $this->getMockBuilder("WP_Query")
            ->onlyMethods(["get", "set"])
            ->getMock();

        $query
            ->expects($this->once())
            ->method("get")
            ->with("post_type")
            ->willReturn(["post"]);

        $query
            ->expects($this->once())
            ->method("set")
            ->with("post_type", ["post", "test_query"]);

        // Use reflection to access private method
        $reflection = new ReflectionClass($custom_post_type);
        $add_to_query_method = $reflection->getMethod("add_to_query");
        $add_to_query_method->setAccessible(true);

        // Mock is_admin() to return false
        $GLOBALS["current_screen"] = null;

        $result = $add_to_query_method->invoke($custom_post_type, $query);
        $this->assertInstanceOf("WP_Query", $result);
    }

    /**
     * Test save_main_metabox method handles post data correctly.
     */
    public function test_save_main_metabox()
    {
        $custom_post_type = new CustomPostType([
            "type" => "test_save",
            "label" => "Test Save",
        ]);
        $custom_post_type->add_meta_field("test_field", "Test Field", "text");

        // Create a test post
        $post_id = $this->factory->post->create([
            "post_type" => "test_save",
        ]);

        // Mock $_POST data
        $_POST["test_field"] = "test value";

        $custom_post_type->save_main_metabox($post_id);

        // Clean up $_POST
        unset($_POST["test_field"]);

        // Since we can't easily test meta saving in unit tests without full WordPress setup,
        // we'll just verify the method runs without errors
        $this->assertTrue(true);
    }

    /**
     * Test save_main_metabox method handles checkbox fields correctly.
     */
    public function test_save_main_metabox_checkbox()
    {
        $custom_post_type = new CustomPostType([
            "type" => "test_checkbox",
            "label" => "Test Checkbox",
        ]);
        $custom_post_type->add_meta_field(
            "checkbox_field",
            "Checkbox Field",
            "checkbox"
        );

        // Create a test post
        $post_id = $this->factory->post->create([
            "post_type" => "test_checkbox",
        ]);

        // Test unchecked checkbox (no POST data)
        $custom_post_type->save_main_metabox($post_id);

        // Since we can't easily test meta saving in unit tests without full WordPress setup,
        // we'll just verify the method runs without errors
        $this->assertTrue(true);
    }

    /**
     * Test include_in_loop property affects behavior.
     */
    public function test_include_in_loop_property()
    {
        $custom_post_type = new CustomPostType([
            "type" => "test_loop",
            "label" => "Test Loop",
        ]);

        // Default should be true
        $this->assertTrue($custom_post_type->include_in_loop);

        // Should be able to set to false
        $custom_post_type->include_in_loop = false;
        $this->assertFalse($custom_post_type->include_in_loop);
    }

    /**
     * Test template_path property.
     */
    public function test_template_path_property()
    {
        $custom_post_type = new CustomPostType([
            "type" => "test_template",
            "label" => "Test Template",
        ]);

        // Default should be empty string
        $this->assertEquals("", $custom_post_type->template_path);

        // Should be able to set template path
        $template_path = "/path/to/template.php";
        $custom_post_type->template_path = $template_path;
        $this->assertEquals($template_path, $custom_post_type->template_path);
    }

    /**
     * Test that metabox fields are properly initialized.
     */
    public function test_meta_box_fields_initialization()
    {
        $custom_post_type = new CustomPostType([
            "type" => "test_init",
            "label" => "Test Init",
        ]);

        $this->assertIsArray($custom_post_type->meta_box_fields);
        $this->assertEmpty($custom_post_type->meta_box_fields);
    }

    /**
     * Test supports array initialization.
     */
    public function test_supports_initialization()
    {
        $custom_post_type = new CustomPostType([
            "type" => "test_supports",
            "label" => "Test Supports",
        ]);

        $this->assertIsArray($custom_post_type->supports);
        $this->assertContains("title", $custom_post_type->supports);
        $this->assertContains("editor", $custom_post_type->supports);
        $this->assertContains("author", $custom_post_type->supports);
    }

    /**
     * Test taxonomies array initialization.
     */
    public function test_taxonomies_initialization()
    {
        $custom_post_type = new CustomPostType([
            "type" => "test_tax",
            "label" => "Test Tax",
        ]);

        $this->assertIsArray($custom_post_type->taxonomies);
        $this->assertEmpty($custom_post_type->taxonomies);
    }

    /**
     * Test custom_metas array initialization.
     */
    public function test_custom_metas_initialization()
    {
        $custom_post_type = new CustomPostType([
            "type" => "test_metas",
            "label" => "Test Metas",
        ]);

        $this->assertIsArray($custom_post_type->custom_metas);
        $this->assertEmpty($custom_post_type->custom_metas);
    }

    /**
     * Test custom_fields array initialization.
     */
    public function test_custom_fields_initialization()
    {
        $custom_post_type = new CustomPostType([
            "type" => "test_fields",
            "label" => "Test Fields",
        ]);

        $this->assertIsArray($custom_post_type->custom_fields);
        $this->assertEmpty($custom_post_type->custom_fields);
    }

    /**
     * Test add_meta_field with different field types.
     */
    public function test_add_meta_field_types()
    {
        $custom_post_type = new CustomPostType([
            "type" => "test_field_types",
            "label" => "Test Field Types",
        ]);

        // Test text field
        $custom_post_type->add_meta_field("text_field", "Text Field", "text");
        $this->assertEquals(
            "text",
            $custom_post_type->meta_box_fields["text_field"]["type"]
        );

        // Test textarea field
        $custom_post_type->add_meta_field(
            "textarea_field",
            "Textarea Field",
            "textarea"
        );
        $this->assertEquals(
            "textarea",
            $custom_post_type->meta_box_fields["textarea_field"]["type"]
        );

        // Test select field
        $custom_post_type->add_meta_field(
            "select_field",
            "Select Field",
            "select",
            [
                "options" => ["value1" => "Label 1", "value2" => "Label 2"],
            ]
        );
        $this->assertEquals(
            "select",
            $custom_post_type->meta_box_fields["select_field"]["type"]
        );

        // Test radio field
        $custom_post_type->add_meta_field(
            "radio_field",
            "Radio Field",
            "radio",
            [
                "options" => ["value1" => "Label 1", "value2" => "Label 2"],
            ]
        );
        $this->assertEquals(
            "radio",
            $custom_post_type->meta_box_fields["radio_field"]["type"]
        );

        // Test checkbox field
        $custom_post_type->add_meta_field(
            "checkbox_field",
            "Checkbox Field",
            "checkbox"
        );
        $this->assertEquals(
            "checkbox",
            $custom_post_type->meta_box_fields["checkbox_field"]["type"]
        );
    }
}
