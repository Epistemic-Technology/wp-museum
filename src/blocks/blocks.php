<?php
/**
 * Enqueue block scripts and css.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

/**
 * Register blocks.
 */
function register_blocks()
{
    register_block_type(WPM_BUILD_DIR . "/blocks/advanced-search");
    register_block_type(WPM_BUILD_DIR . "/blocks/basic-search");
    register_block_type(WPM_BUILD_DIR . "/blocks/collection-objects");
    register_block_type(WPM_BUILD_DIR . "/blocks/collection-main-navigation");
    register_block_type(WPM_BUILD_DIR . "/blocks/child-objects");
    register_block_type(WPM_BUILD_DIR . "/blocks/object-infobox");
    register_block_type(WPM_BUILD_DIR . "/blocks/object-gallery");
    register_block_type(WPM_BUILD_DIR . "/blocks/object-image-attachments");
    register_block_type(WPM_BUILD_DIR . "/blocks/collection");
    register_block_type(WPM_BUILD_DIR . "/blocks/embedded-search");
    register_block_type(WPM_BUILD_DIR . "/blocks/feature-collection-widget");
    register_block_type(WPM_BUILD_DIR . "/blocks/object-image");
}
add_action("init", __NAMESPACE__ . '\register_blocks');

/**
 * Registers Gutenberg block to edit museusm objects.
 *
 * This block has attributes dynamically generated from the object's fields. So
 * they are not set in block.json.
 */
function register_object_meta_block()
{
    $post_type = calculate_post_type_in_editor();
    if (!$post_type || !in_array($post_type, get_object_type_names(), true)) {
        return;
    }
    $kind = get_kind_from_typename($post_type);
    $fields = get_mobject_fields($kind->kind_id);

    $attributes = [];
    foreach ($fields as $field) {
        $field_name = $field->slug;
        if ("flag" === $field->type) {
            $type = "boolean";
        } elseif ("multiple" === $field->type) {
            $type = "array";
        } elseif ("measure" === $field->type) {
            $type = "array";
        } else {
            $type = "string";
        }
        $attributes[$field_name] = [
            "type" => $type,
            "source" => "meta",
            "meta" => $field->slug,
        ];
        if ("measure" === $field->type) {
            $attributes[$field_name]["items"] = "number";
        }
    }
    register_block_type(WPM_BUILD_DIR . "/blocks/object-meta", [
        "attributes" => $attributes,
    ]);
}

/**
 * 'wp' seems to be the earliest hook where post type is available on front end.
 */
add_action("init", __NAMESPACE__ . '\register_object_meta_block', 50);

/**
 * Helper function to calculate the post type in the editor.
 *
 * We do this because we have to selectively register blocks based on the post type,
 * and this occurs in the init hook where the post object is not yet available.
 */
function calculate_post_type_in_editor(): string|false
{
    if (isset($_GET["post_type"])) {
        return sanitize_text_field($_GET["post_type"]);
    }

    if (isset($_GET["post"])) {
        $post_id = intval($_GET["post"]);
    } else {
        // See: https://wordpress.stackexchange.com/a/307601
        $post_id = url_to_postid(
            (isset($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] === "on"
                ? "https"
                : "http") .
                "://" .
                $_SERVER["HTTP_HOST"] .
                $_SERVER["REQUEST_URI"]
        );
    }

    if (!$post_id) {
        return false;
    }

    return get_post_type($post_id);
}

/**
 * Register on admin side.
 */
//add_action( 'plugins_loaded', __NAMESPACE__ . '\register_object_meta_block' );

/**
 * Enqueues component scripts and styles.
 */
function enqueue_components()
{
    $asset_file = include WPM_BUILD_DIR . "/components.asset.php";
    wp_enqueue_script(
        WPM_PREFIX . "components",
        WPM_BUILD_URL . "/components.js",
        $asset_file["dependencies"],
        $asset_file["version"],
        true
    );

    wp_enqueue_style(
        WPM_PREFIX . "component-styles",
        WPM_BUILD_URL . "style-components.css",
        ["wp-components"],
        filemtime(WPM_BUILD_DIR . "style-components.css")
    );
}
add_action("enqueue_block_assets", __NAMESPACE__ . '\enqueue_components');

/**
 * Enqueue block frontend scripts
 */
function enqueue_block_frontend_scripts()
{
    $asset_file = include WPM_BUILD_DIR .
        "/blocks/advanced-search/front.asset.php";
    wp_enqueue_script(
        WPM_PREFIX . "advanced-search-frontend",
        WPM_BUILD_URL . "/blocks/advanced-search/front.js",
        $asset_file["dependencies"],
        $asset_file["version"],
        true
    );

    // $asset_file = include WPM_BUILD_DIR . '/blocks/basic-search/front.asset.php';
    // wp_enqueue_script(
    // 	WPM_PREFIX . 'basic-search-frontend',
    // 	WPM_BUILD_URL . '/blocks/basic-search/front.js',
    // 	$asset_file['dependencies'],
    // 	$asset_file['version'],
    // 	true
    // );

    $asset_file = include WPM_BUILD_DIR .
        "/blocks/collection-main-navigation/front.asset.php";
    wp_enqueue_script(
        WPM_PREFIX . "collection-main-navigation-frontend",
        WPM_BUILD_URL . "/blocks/collection-main-navigation/front.js",
        $asset_file["dependencies"],
        $asset_file["version"],
        true
    );
    /*
	$asset_file = include WPM_BUILD_DIR . '/blocks/collection-objects/front.asset.php';
	wp_enqueue_script(
		WPM_PREFIX . 'collection-objects-frontend',
		WPM_BUILD_URL . '/blocks/collection-objects/front.js',
		$asset_file['dependencies'],
		$asset_file['version'],
		true
	);
*/
    $asset_file = include WPM_BUILD_DIR .
        "/blocks/embedded-search/front.asset.php";
    wp_enqueue_script(
        WPM_PREFIX . "embedded-search-frontend",
        WPM_BUILD_URL . "blocks/embedded-search/front.js",
        $asset_file["dependencies"],
        $asset_file["version"],
        true
    );

    wp_enqueue_style(
        WPM_PREFIX . "museum-frontend",
        WPM_BUILD_URL . "museum-block-front.css",
        [],
        filemtime(WPM_BUILD_DIR . "museum-block-front.css")
    );
}
add_action(
    "enqueue_block_assets",
    __NAMESPACE__ . '\enqueue_block_frontend_scripts'
);

/**
 * Enqueue block editor scripts and styles
 */
function enqueue_block_editor_assets()
{
    if (!is_admin()) {
        return;
    }

    wp_enqueue_style(
        WPM_PREFIX . "museum-editor",
        WPM_BUILD_URL . "museum-block-editor.css",
        [],
        filemtime(WPM_BUILD_DIR . "museum-block-editor.css")
    );

    $post_type = calculate_post_type_in_editor();
    if ( $post_type && in_array($post_type, get_object_type_names() )) {
        $asset_file = include WPM_BUILD_DIR . "museum-oai-pmh-toggle.asset.php";
        wp_enqueue_script(
            WPM_PREFIX . "oai-pmh-toggle",
            WPM_BUILD_URL . "museum-oai-pmh-toggle.js",
            $asset_file["dependencies"],
            $asset_file["version"],
            true
        );
    }
}
add_action(
    "enqueue_block_assets",
    __NAMESPACE__ . '\enqueue_block_editor_assets'
);

/**
 * Callback to add 'Museum' block category.
 *
 * @link https://getwithgutenberg.com/2019/04/creating-a-block-category/
 *
 * @param Array $categories Array of existing categories.
 * @return Array Updated $categories array.
 */
function add_museum_block_category($categories)
{
    $category_slugs = wp_list_pluck($categories, "slug");
    if (in_array("wp-museum", $category_slugs, true)) {
        return $categories;
    } else {
        return array_merge($categories, [
            [
                "slug" => "wp-museum",
                "title" => __("Museum", "wp-museum"),
                "icon" => null,
            ],
        ]);
    }
}

/**
 * Filters the allowed blocks for the current post so that the child objects block
 * is only allowed on museum object post types.
 *
 * @param array $allowed_blocks   Array of allowed blocks.
 * @param object $editor_context  The editor context.
 * @return array                  The filtered array of allowed blocks.
 */
function filter_exclusive_blocks($allowed_blocks, $editor_context)
{
    if (!$editor_context->post) {
        return $allowed_blocks;
    }

    $post_type = get_post_type($editor_context->post->ID);

    if (in_array($post_type, get_object_type_names(), true)) {
        return $allowed_blocks;
    }

    if (true === $allowed_blocks) {
        $allowed_blocks = array_keys(
            \WP_Block_Type_Registry::get_instance()->get_all_registered()
        );
    }

    $object_exclusive_blocks = [
        "wp-museum/child-objects-block",
        "wp-museum/object-meta-block",
        "wp-museum/object-image-attachments-block",
    ];

    if (!in_array($post_type, get_object_type_names(), true)) {
        $allowed_blocks = array_filter($allowed_blocks, function ($block) use (
            $object_exclusive_blocks
        ) {
            return !in_array($block, $object_exclusive_blocks, true);
        });
    }
    return $allowed_blocks;
}
add_filter(
    "allowed_block_types_all",
    __NAMESPACE__ . '\filter_exclusive_blocks',
    10,
    2
);

/**
 * Enqueues javascript to de-register Object Meta Fields and Object Image
 * Gallery blocks for non Museum Objects, becaue they don't make sense for
 * other post types.
 */
function unregister_object_blocks_for_non_objects()
{
    global $post;
    if (!$post) {
        return;
    }
    if (!in_array($post->post_type, get_object_type_names(), true)) {
        wp_enqueue_script(
            WPM_PREFIX . "unregister-object-blocks",
            WPM_BASE_URL . "javascript/unregister-object-blocks.js",
            ["wp-blocks", "wp-dom-ready", "wp-edit-post"],
            filemtime(
                plugin_dir_path(__FILE__) .
                    "../javascript/unregister-object-blocks.js"
            ),
            true
        );
    }
}
add_action(
    "enqueue_block_editor_assets",
    __NAMESPACE__ . "\unregister_object_blocks_for_non_objects",
    50
);
