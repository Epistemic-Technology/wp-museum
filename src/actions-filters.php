<?php
/**
 * All actions and filters should go here, except those that are part of classes
 * (@see class-customposttype.php for example) or where it would cause unnessessary
 * complication (@see collection-post-type.php).
 *
 * @link https://developer.wordpress.org/reference/functions/add_action/
 * @link https://developer.wordpress.org/reference/functions/add_filter/
 * @link https://codex.wordpress.org/Plugin_API/Action_Reference Actions
 * @link https://codex.wordpress.org/Plugin_API/Filter_Reference Filters
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

/*****************************************************************************
 *
 * Global Actions
 */

// Stop auto refresh of pages when debugging.
if (defined("WP_DEBUG") && WP_DEBUG === true) {
    add_action(
        "init",
        function () {
            wp_deregister_script("heartbeat");
        },
        1
    );
    add_action("init", function () {
        flush_rewrite_rules();
    });
}

/**
 * Flush rewrite rules on plugin activation.
 */
register_activation_hook(__FILE__, function () {
    add_action("init", function () {
        flush_rewrite_rules();
    });
});

/**
 * Remove capabilities upon plugin deactivation (cleans up db).
 *
 * @see capabilities.php::remove_museum_capabilities()
 */
register_deactivation_hook(
    PLUGIN_BASENAME,
    __NAMESPACE__ . '\remove_museum_capabilities'
);

/**
 * Delete options and tables on plugin deletion.
 *
 * (If clear_data_on_uninstall is false, will not delete any data on uninstall.)
 *
 * @see cleanup.php:do_cleanup()
 */
register_uninstall_hook(PLUGIN_BASENAME, __NAMESPACE__ . "\do_cleanup");

/**
 * Creates and registers museum object post types from database.
 *
 * @see object-post-types.php::create_mobject_post_types()
 */
add_action("init", __NAMESPACE__ . "\create_mobject_post_types", 1);

/**
 * Check database version and update table schemas if necessary
 *
 * @see database-functions.php::db_version_check()
 */
add_action("plugins_loaded", __NAMESPACE__ . "\db_version_check", 10);

/**
 * Generate image sizes for post row thumbnails.
 *
 * @see display.php::generat_image_sizes()
 */
add_action("plugins_loaded", __NAMESPACE__ . "\generate_image_sizes");

/**
 * Register REST routes.
 *
 * @see rest.php::rest_routes()
 */
add_action("rest_api_init", __NAMESPACE__ . '\rest_routes');

/**
 * Register widgets
 *
 * @see widgets/class-associated-collection-widget.php
 * @see widget/class-collection-tree-widget.php
 */
add_action(
    "widgets_init",
    __NAMESPACE__ . '\register_associated_collection_widget'
);
add_action("widgets_init", __NAMESPACE__ . '\register_collection_tree_widget');

/**
 * Add OAI-PMH rewrite rules.
 *
 * @see oai-pmh.php::add_oai_pmh_rewrite_rules()
 */
add_action("init", __NAMESPACE__ . "\add_oai_pmh_rewrite_rules");

/**
 * Add OAI-PMH query vars.
 *
 * @see oai-pmh.php::add_oai_pmh_query_vars()
 */
add_filter("query_vars", __NAMESPACE__ . "\add_oai_pmh_query_vars");

/**
 * Handle OAI-PMH requests.
 *
 * @see oai-pmh.php::handle_oai_pmh_request()
 */
add_action("template_redirect", __NAMESPACE__ . "\handle_oai_pmh_request");

/*****************************************************************************
 *
 * Global Filters
 */

/**
 * Allows for targetted searches of post_title and post_content.
 *
 * @see custom-post-type-functions.php::post_search_filter()
 */
add_filter("posts_where", __NAMESPACE__ . "\post_search_filter", 10, 2);

/**
 * Add post_title and post_content to WP_QUERY query vars.
 *
 * @see custom-post-type-functions.php::add_title_content_query_vars()
 * @see custom-post-type-functions.php::post_search_filter()
 */
add_filter("query_vars", __NAMESPACE__ . "\add_title_content_query_vars");

/*****************************************************************************
 *
 * Global Filters
 */

/**
 * Allows for targetted searches of post_title and post_content.
 *
 * @see custom-post-type-functions.php::post_search_filter()
 */
add_filter("posts_where", __NAMESPACE__ . "\post_search_filter", 10, 2);

/**
 * Add post_title and post_content to WP_QUERY query vars.
 *
 * @see custom-post-type-functions.php::add_title_content_query_vars()
 * @see custom-post-type-functions.php::post_search_filter()
 */
add_filter("query_vars", __NAMESPACE__ . "\add_title_content_query_vars");

add_filter(
    "posts_results",
    __NAMESPACE__ . "\add_object_results_to_main_search_query",
    10,
    2
);

/*****************************************************************************
 *
 * Admin Actions
 */

/**
 * Add appropriate capabilities for museum object post types.
 *
 * @see capabilities.php::add_museum_capabilities()
 */
add_action("admin_init", __NAMESPACE__ . "\add_museum_capabilities");

/**
 * Adds a link to the parent post for child posts.
 *
 * @see object-post-types.php::add_object_parent_link
 */
add_action("edit_form_top", __NAMESPACE__ . "\add_object_parent_link");

/**
 * Adds a div to top of edit post pages for museum object post types to report
 * problems (eg. failing to assign post to a category).
 *
 * @see object-post-types.php::add_object_problem_div()
 */
add_action("admin_notices", __NAMESPACE__ . "\add_object_problem_div");

/**
 * Adds quick browse page to all museum object post types.
 *
 * @see quick-browse.php::add_quick_browse()
 */
add_action("admin_menu", __NAMESPACE__ . "\add_quick_browse");

/**
 * Output csv to save.
 *
 * @see import-export.php::export_csv
 */
add_action("admin_menu", __NAMESPACE__ . '\export_csv');

/**
 * Adds javascript to upload image attachments to object posts.
 *
 * @see object-ajax.php::wpm_media_box_enqueue
 */
add_action("admin_enqueue_scripts", __NAMESPACE__ . "\wpm_media_box_enqueue");

/**
 * Creates settings for customizer.
 */
add_action("customize_register", __NAMESPACE__ . '\register_customization');

add_action("admin_enqueue_scripts", __NAMESPACE__ . '\enqueue_admin_react');

add_action("admin_menu", __NAMESPACE__ . "\create_admin_react_pages");

/**
 * Enqueues admin scripts
 *
 * @see admin/admin-style.css
 */
add_action("admin_enqueue_scripts", function () {
    wp_enqueue_style(
        WPM_PREFIX . "admin-styles",
        WPM_BASE_URL . "admin/admin-style.css",
        [],
        CSS_VERSION
    );
});

/*****************************************************************************
 *
 * Admin Filters
 */

/**
 * Add 'Museum' category to Gutenberg block categories.
 *
 * @see blocks.php::add_museum_block_category()
 */
add_filter(
    "block_categories_all",
    __NAMESPACE__ . "\add_museum_block_category"
);

/*****************************************************************************
 *
 * Frontend Actions
 */

/**
 * Enqueue fancybox javascript for frontend.
 *
 * @see object-ajax::enqueue_javascript()
 */
add_action("wp_enqueue_scripts", __NAMESPACE__ . '\enqueue_javascript');

/**
 * Generates CSS for museum objects, and inserts into page header
 * for front end display.
 *
 * @see display.php::object_css()
 */
add_action("wp_head", __NAMESPACE__ . "\object_css");

/**
 * Generates CSS for collections, and inserts into page header
 * for front end display.
 *
 * @see display.php::object_css()
 */
add_action("wp_head", __NAMESPACE__ . "\collection_css");

/**
 * Load general css for frontend.
 */
add_action("wp_enqueue_scripts", function () {
    wp_enqueue_style(
        WPM_PREFIX . "frontend-styles",
        plugin_dir_url(__FILE__) . "style.css",
        [],
        CSS_VERSION
    );
});

/**
 * Add post status and visibility indiccator to the WP admin bar.
 *
 * @see display.php::post_status_indicator()
 */
add_action("admin_bar_menu", __NAMESPACE__ . "\post_status_indicator", 50, 1);

/*****************************************************************************
 *
 * Frontend Filters
 */

/**
 * Filter to add link text to content containing text patterns matching
 * schema (regular expression) of object's id field as set in object
 * admin page.
 *
 * @see object-post-types.php::link_objects_by_id()
 */
add_filter("the_content", __NAMESPACE__ . "\link_objects_by_id");

/**
 * Generates excerpts for museum objects.
 *
 * @see display.php::mobject_excerpt_filter()
 */
add_filter("get_the_excerpt", __NAMESPACE__ . "\mobject_excerpt_filter", 10, 2);

/**
 * Adds collection breadcrumbs to museum object posts.
 *
 * @see display.php::mobject_collection_breadcrumbs()
 */
add_filter(
    "the_content",
    __NAMESPACE__ . "\mobject_collection_breadcrumbs",
    10,
    2
);

add_filter(
    "post_thumbnail_id",
    __NAMESPACE__ . '\filter_object_thumbnail_id',
    10,
    2
);

/*****************************************************************************
 *
 * AJAX
 */

/**
 * Creates a new post with same type as current post and sets current post as its parent.
 *
 * @see object-ajax.php::create_new_obj_aj()
 */
add_action("wp_ajax_create_new_obj_aj", __NAMESPACE__ . "\create_new_obj_aj");

/**
 * Remove an image attachment from an object.
 *
 * @see object-ajax.php::remove_image_attachment_aj()
 */
add_action(
    "wp_ajax_remove_image_attachment_aj",
    __NAMESPACE__ . '\remove_image_attachment_aj'
);

/**
 * Moves an image attachment for object post types when the left or right arrows are clicked.
 *
 * @see object-ajax.php::swap_image_order_aj()
 */
add_action(
    "wp_ajax_swap_image_order_aj",
    __NAMESPACE__ . "\swap_image_order_aj"
);

/**
 * Adds images to object image box after selection/upload through WP Media popup.
 *
 * @see object-ajax.php::add_gallery_images_aj()
 */
add_action(
    "wp_ajax_add_gallery_images_aj",
    __NAMESPACE__ . "\add_gallery_images_aj"
);

/**
 * Generates zip file of object images and makes available for download.
 *
 * @see import-export.php::export_images_aj()
 */
add_action("wp_ajax_export_images_aj", __NAMESPACE__ . '\export_images_aj');

/**
 * Deletes a kind from the museum administration page.
 *
 * @see object-admin-functions.php::delete_kind_aj()
 */
add_action("wp_ajax_delete_kind_aj", __NAMESPACE__ . "\delete_kind_aj");

/**
 * Deletes an image backup zip from the museum administration page.
 *
 * @see object-admin-functions.php::delete_image_zip_aj()
 */
add_action(
    "wp_ajax_delete_image_zip_aj",
    __NAMESPACE__ . "\delete_image_zip_aj"
);

/**
 * Redirects cateogry pages to collection pages.
 *
 * @see collection-functions.php::collection_redirect()
 */
add_action("template_redirect", __NAMESPACE__ . "\collection_redirect");
