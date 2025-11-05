<?php
/**
 * Class for creating WordPress custom post types.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

/**
 * Represents a WordPress custom post type.
 */
class CustomPostType
{
    /**
     * Basic options for post type
     *
     * @var [] $options Array of options for custom post type.
     * @link: https://developer.wordpress.org/reference/functions/register_post_type/
     */
    public $options = [
        "type" => "post",
        "label" => "Post",
        "label_plural" => "Posts",
        "description" => "",
        "public" => true,
        "hierarchical" => true,
        "menu_icon" => "dashicons-format-aside", // See: https://developer.wordpress.org/resource/dashicons/.
        "options" => [],
        "rewrite" => true,
        "has_archive" => true,
    ];

    /**
     * Slug for the main meta box.
     *
     * @var string $meta_name
     */
    public $meta_name = "post_meta";

    /**
     * Label for the main meta box.
     *
     * @var string $meta_label
     */
    public $meta_label = "Post Meta";

    /**
     * Array of fields for the main meta box.
     *
     * @var [string => [string]] $meta_box_fields
     * @see CustomPostType::add_meta_field()
     */
    public $meta_box_fields = [];

    /**
     * WordPress post features supported by this post type.
     *
     * Possible options:
     *    * 'title'
     *    * 'editor' (content)
     *    * 'author'
     *    * 'thumbnail' (featured image) (current theme must also support Post Thumbnails)
     *    * 'excerpt'
     *    * 'trackbacks'
     *    * 'custom-fields' (see Custom_Fields, aka meta-data)
     *    * 'comments' (also will see comment count balloon on edit screen)
     *    * 'revisions' (will store revisions)
     *    * 'page-attributes' (template and menu order) (hierarchical must be true)
     *    * 'post-formats' (see Post_Formats)
     *
     * @var [string] $supports
     * @see CustomPostType::add_support()
     * @link https://codex.wordpress.org/Function_Reference/post_type_support
     */
    public $supports = ["title", "editor", "author"];

    /**
     * List of taxononomy identifiers for custom post type.
     *
     * @var [string] $taxonomies
     * @see CustomPostType::add_taxonomy()
     */
    public $taxonomies = [];

    /**
     * List of metaboxes attached to this custom post type.
     *
     * @var [MetaBox] $custom_metas
     * @see CustomPostType::add_custom_meta()
     * @see MetaBox
     */
    public $custom_metas = [];

    /**
     * List of custom fields attached to this custom post type.
     *
     * @var [CustomField] $custom_fields
     * @see CustomField
     */
    public $custom_fields = [];

    /**
     * Whether to include custom post type in WordPress loop.
     *
     * @var bool $include_in_loop
     */
    public $include_in_loop = true;

    /**
     * Path to template file for displaying custom post type.
     *
     * @var string $template_path
     */
    public $template_path = "";

    /**
     * Constructor.
     *
     * @param array $options Array of key-value pairs of options.
     * @see CustomPostType::$options
     * @link https://developer.wordpress.org/reference/functions/register_post_type/
     */
    public function __construct($options)
    {
        foreach ($options as $key => $value) {
            $this->options[$key] = $value;
        }

        $this->meta_name = $this->options["type"] . "_meta";
        $this->meta_label = $this->options["label"] . " Options";
    }

    /**
     * Add support to post type.
     *
     * @param [string]|string $supports Array of strings to add multiple support options,
     *                                  or string to add one support option.
     * @link https://codex.wordpress.org/Function_Reference/post_type_supports
     */
    public function add_support($supports)
    {
        if (gettype($supports) === "string") {
            $this->supports[] = $supports;
        } elseif (gettype($supports) === "array") {
            $this->supports = array_merge($this->supports, $supports);
        }
    }

    /**
     * Add taxonomy to post type.
     *
     * @param [string]|string $taxonomy Array of strings to add multiple taxonomies,
     *                                  or string to add one taxonomy.
     * @link https://developer.wordpress.org/reference/functions/register_post_type/
     */
    public function add_taxonomy($taxonomy)
    {
        if ("string" === gettype($taxonomy)) {
            $this->taxonomies[] = $taxonomy;
        } elseif ("array" === gettype($taxonomy)) {
            $this->taxonomies = array_merge($this->taxonomies, $taxonomy);
        }
    }

    /**
     * Add custom metabox to post type that will appear on edit screen.
     *
     * @param MetaBox $new_meta The metabox to attach to post type.
     * @see MetaBox
     */
    public function add_custom_meta(MetaBox $new_meta)
    {
        $this->custom_metas[] = $new_meta;
    }

    /**
     * Register a custom post meta.
     *
     * @param string $name Name of the meta that will be used to identify the meta value.
     * @param string $type Data type of the meta.
     * @param string $description Description of the meta.
     * @param Array  $options Further options.
     *
     * @see https://developer.wordpress.org/reference/functions/register_meta/
     */
    public function register_post_meta(
        $name,
        $type = "string",
        $description = "",
        $options = []
    ) {
        if (!$options) {
            $options = [];
        }
        $args = array_merge(
            [
                "type" => $type,
                "description" => $description,
                "single" => true,
                "show_in_rest" => true,
            ],
            $options
        );
        register_post_meta($this->options["type"], $name, $args);
    }
    /**
     * Add a field to main metabox.
     *
     * @param string             $field_name Name of the field (will be name of option in templates, etc.).
     * @param string             $field_label Label of field in metabox form.
     * @param string             $field_type Type of field (text|textarea|select|radio|checkbox).
     * @param [string => string] $options Options for field element display:
     *                                 * 'style': CSS style for element
     *                                 * 'width': Width value for element.
     *                                 * 'data_type': Data type of field ('string', 'boolean', 'integer',
     *                                   'number', 'array', and 'object').
     */
    public function add_meta_field(
        $field_name,
        $field_label,
        $field_type = "text",
        $options = []
    ) {
        $this->meta_box_fields[$field_name] = [
            "label" => $field_label,
            "type" => $field_type,
            "options" => $options,
        ];

        $this->register_post_meta(
            $field_name,
            $options["data_type"] ?? "string",
            $field_name
        );
    }

    /**
     * Display all metaboxes in edit page of post.
     *
     * @param \WP_POST $post The post.
     */
    public function display_meta_boxes(\WP_POST $post)
    {
        if (count($this->meta_box_fields) > 0) {
            $this->main_meta_box($post);
        }
        foreach ($this->custom_metas as $cm) {
            $cm->add();
        }
    }

    /**
     * Display main metabox in edit page of post.
     *
     * @param \WP_POST $post The post.
     */
    public function main_meta_box(\WP_POST $post)
    {
        add_meta_box($this->meta_name, $this->meta_label, function () use (
            $post
        ) {
            wp_nonce_field(
                $this->meta_name . "_nonce",
                $this->meta_name . "_nonce"
            );
            echo '<table class="form-table">';
            foreach ($this->meta_box_fields as $field_name => $field_array) {
                $field_value = trim(
                    get_post_meta($post->ID, $field_name, true)
                );
                $field_label = $field_array["label"];
                $field_type = $field_array["type"];
                $field_options = $field_array["options"];

                if (isset($field_options["style"])) {
                    $style = $field_options["style"];
                } elseif (isset($field_options["width"])) {
                    $style = "width: {$field_options["width"]};";
                } else {
                    $style = "width: 100%;";
                    if ("textarea" === $field_type) {
                        $style .= " height: 5em;";
                    }
                }
                echo "<tr>
							<th><label for='" .
                    esc_html($field_name) .
                    "'>" .
                    esc_html($field_label) .
                    '</label></th>
							<td>';
                switch ($field_type) {
                    case "text":
                        echo "<input id='" .
                            esc_html($field_name) .
                            "'
								        name='" .
                            esc_html($field_name) .
                            "'
								        type='text'
								        value=' " .
                            esc_html($field_value) .
                            "'
										style='" .
                            esc_html($style) .
                            "'
								/>";
                        break;
                    case "textarea":
                        echo "<textarea id='" .
                            esc_html($field_name) .
                            "'
								           name='" .
                            esc_html($field_name) .
                            "'
										   style='" .
                            esc_html($style) .
                            "'>" .
                            esc_html($field_value) .
                            "</textarea>";
                        break;
                    case "select":
                        echo "<select id='" .
                            esc_html($field_name) .
                            "'
								         name='" .
                            esc_html($field_name) .
                            "'
								         style='" .
                            esc_html($style) .
                            "'";
                        if (
                            isset($field_options->multiple) &&
                            true === $field_options->multiple
                        ) {
                            echo " multiple ";
                        }
                        if (isset($field_options->size)) {
                            echo " size='" .
                                esc_html($field_options->size) .
                                "' ";
                        }
                        foreach (
                            $field_options["options"]
                            as $option_value => $option_label
                        ) {
                            echo "<option value='" .
                                esc_html($option_value) .
                                "' ";
                            if (intval($field_value) === $option_value) {
                                echo " selected ";
                            }
                            echo ">" . esc_html($option_label) . "</option>";
                        }
                        echo "</select>";
                        break;
                    case "radio":
                        foreach (
                            $field_options["options"]
                            as $option_value => $option_label
                        ) {
                            echo "<input type='radio' name='" .
                                esc_html($field_name) .
                                "' value='" .
                                esc_html($option_value) .
                                "' ";
                            if ($option_value === $field_value) {
                                echo " checked ";
                            }
                            echo ">" . esc_html($option_label) . "<br />";
                        }
                        break;
                    case "checkbox":
                        if (isset($field_options["options"])) {
                            foreach (
                                $field_options["options"]
                                as $option_value => $option_label
                            ) {
                                echo "<input type='checkbox' id='" .
                                    esc_html($field_name . "_" . $option_value) .
                                    "' name='" .
                                    esc_html($field_name) .
                                    "' value='" .
                                    esc_html($option_value) .
                                    "'";
                                if ($option_value === $field_value) {
                                    echo " checked='checked'";
                                }
                                echo " /><label for='" .
                                    esc_html($field_name . "_" . $option_value) .
                                    "'>" .
                                    esc_html($option_label) .
                                    "</label><br />";
                            }
                        } else {
                            echo "<input type='checkbox' id='" .
                                esc_html($field_name) .
                                "' name='" .
                                esc_html($field_name) .
                                "' value='1'";
                            if ("1" === $field_value) {
                                echo " checked='checked'";
                            }
                            echo " />";
                        }
                        break;
                }
                echo "</td></tr>";
            }
            echo "</table>";
        }); // /add_meta_box().
    }

    /**
     * Callback to save custom post fields.
     *
     * @param int $post_id ID of post.
     */
    public function save_main_metabox($post_id)
    {
        $post = get_post($post_id);
        $is_revision = wp_is_post_revision($post_id);

        if ($post->post_type !== $this->options["type"] || $is_revision) {
            return;
        }

        foreach ($this->meta_box_fields as $field_name => $field_data) {
            // phpcs:disable WordPress.Security.NonceVerification
            if (isset($_POST[$field_name])) {
                // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
                $field_value = trim(wp_unslash($_POST[$field_name]));
                if (isset($field_value) && "" !== $field_value) {
                    update_post_meta($post_id, $field_name, $field_value);
                } else {
                    delete_post_meta($post_id, $field_name);
                }
            } elseif ("checkbox" === $field_data["type"]) {
                update_post_meta($post_id, $field_name, "0");
            }
        }
    }

    /**
     * Adds post type to query. Helper function for add_to_search and add_to_loop.
     *
     * @param WP_QUERY $query The query.
     * @see CustomPostType::add_to_search()
     * @see CustomPostType::add_to_loop()
     */
    private function add_to_query($query)
    {
        if (!is_admin()) {
            $post_types = [];
            $query_post_type = $query->get("post_type");
            if (!is_null($query_post_type)) {
                $post_types = $query_post_type;
            }
            if (!$post_types) {
                return $query;
            }
            if (!is_array($post_types)) {
                $post_types = [$post_types];
            }
            if (!in_array($this->options["type"], $post_types, true)) {
                $post_types[] = $this->options["type"];
            }
            $query->set("post_type", $post_types);
        }
        return $query;
    }

    /**
     * Adds this post type to searches.
     *
     * @param WP_QUERY $query The query.
     * @link https://webdevstudios.com/2015/09/01/search-everything-within-custom-post-types/
     */
    public function add_to_search($query)
    {
        if (
            $query->is_search() &&
            $query->is_main_query() &&
            !empty($query->get("s"))
        ) {
            $this->add_to_query($query);
        }
    }
    /**
     * Add this post type to list of post types retrieved by the WordPress loop.
     * A hook to call this during pre_get_posts is added on registration if
     * include_in_loop is true.
     *
     * @param WP_QUERY $query The query.
     * @link https://stackoverflow.com/questions/29669534/include-custom-post-type-in-wordpress-loop
     */
    public function add_to_loop($query)
    {
        if ($query->is_main_query()) {
            $this->add_to_query($query);
        }
    }

    /**
     * Callback to add $this->template_path to template search.
     *
     * @param string $single Path to default template.
     * @return string Path to template for this post type.
     * @link https://wordpress.stackexchange.com/questions/17385/custom-post-type-templates-from-plugin-folder
     */
    public function add_custom_template($single)
    {
        global $post;
        if (!$post) {
            return $single;
        }

        /* Checks for single template by post type */
        if ($post->post_type === $this->options["type"]) {
            if (file_exists($this->template_path)) {
                return $this->template_path;
            }
        }
        return $single;
    }

    /**
     * Creates array of labels based on this->label and this->label_plural.
     *
     * @return [string] The labels.
     * @link https://typerocket.com/ultimate-guide-to-custom-post-types-in-wordpress/
     */
    private function labels()
    {
        $p_lower = strtolower($this->options["label_plural"]);
        $s_lower = strtolower($this->options["label"]);

        return [
            "name" => $this->options["label_plural"],
            "singular_name" => $this->options["label"],
            "add_new_item" => "New {$this->options["label"]}",
            "edit_item" => "Edit {$this->options["label"]}",
            "view_item" => "View {$this->options["label"]}",
            "view_items" => "View {$this->options["label_plural"]}",
            "search_items" => "Search {$this->options["label_plural"]}",
            "not_found" => "No $p_lower found",
            "not_found_in_trash" => "No $p_lower found in trash",
            "parent_item_colon" => "Parent {$this->options["label"]}",
            "all_items" => "All {$this->options["label_plural"]}",
            "archives" => "{$this->options["label"]} Archives",
            "attributes" => "{$this->options["label"]} Attributes",
            "insert_into_item" => "Insert into $s_lower",
            "uploaded_to_this_item" => "Uploaded to this $s_lower",
        ];
    }

    /**
     * Register the post type. This should be the final function called after
     * setting up the post type.
     *
     * @link https://typerocket.com/ultimate-guide-to-custom-post-types-in-wordpress/
     */
    public function register()
    {
        $arguments = [
            "public" => $this->options["public"],
            "description" => $this->options["description"],
            "labels" => $this->labels(),
            "menu_icon" => $this->options["menu_icon"],
            "supports" => $this->supports,
            "taxonomies" => $this->taxonomies,
            "hierarchical" => $this->options["hierarchical"],
            "rewrite" => $this->options["rewrite"],
            "show_in_rest" => true,
            "register_meta_box_cb" => [$this, "display_meta_boxes"],
        ];
        if (count($this->meta_box_fields) > 0) {
            add_action("pre_post_update", [$this, "save_main_metabox"], 10);
        }

        add_action("init", function () use ($arguments) {
            $arguments = $arguments + $this->options["options"];
            register_post_type($this->options["type"], $arguments);
            if ($arguments["hierarchical"]) {
                add_post_type_support(
                    $this->options["type"],
                    "page-attributes"
                );
            }
        });

        add_action("pre_get_posts", [$this, "add_to_search"]);
        if ($this->include_in_loop) {
            add_action("pre_get_posts", [$this, "add_to_loop"]);
        }

        if ("" !== $this->template_path) {
            add_filter("single_template", [$this, "add_custom_template"]);
        }
    }
}
