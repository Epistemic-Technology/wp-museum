<?php
/**
 * Museum for WordPress
 *
 * @package MikeThicke\WPMuseum
 * @author Mike Thicke
 *
 * @wordpress-plugin
 * Plugin Name: Museum for WordPress
 * Description: Manages a database of museum objects.
 * Version: 0.7.5
 * Requires at least: 6.2
 * Author: Mike Thicke
 * Author URI: http://www.mikethicke.com
 * Text Domain: wp-museum
 */

namespace MikeThicke\WPMuseum;

const WPM_PREFIX = "wpm_"; // Prefix for database tables.
const CSS_VERSION = "0.5.3"; // Change to force reload of CSS.
const SCRIPT_VERSION = "0.5.2"; // Change to force reload of JS.
const CACHE_GROUP = "MikeThicke\WPMuseum"; // For caching db queries.
const DB_VERSION = "0.6.69"; // Change to update db structure.
const DB_SHOW_ERRORS = true; // Have WP report db errors.
const IMAGE_DIR = "wp-museum"; // Directory to save exported images.
const REST_NAMESPACE = "wp-museum/v1"; // Root for rest routes.

if ( ! function_exists( 'get_plugin_data' ) ) {
	require_once ABSPATH . 'wp-admin/includes/plugin.php';
}
$plugin_data = get_plugin_data( __FILE__, false, false );
define('WPM_PLUGIN_VERSION', $plugin_data['Version']);

/**
 * Is this a development build of the plugin?
 *
 * The development build and release build could have different directory
 * structures, primarily for transpiled code in blocks. Running release.sh
 * automatically sets this to false.
 *
 * @see blocks/blocks.php
 */
const DEV_BUILD = true;

/**
 * Default number of posts per page to retrieve in query_associated_objects.
 *
 * @see collection-functions.php::query_associated_objects()
 */
const DEF_POSTS_PER_PAGE = 20;

/**
 * Plugin name, for action hooks.
 */
define("PLUGIN_BASENAME", plugin_basename(__FILE__));

/**
 * For dev builds, wp-musuem.php is one directory up, so that the build
 * will be detected by WordPress as a plugin.
 */
if (DEV_BUILD) {
    $require_prefix = "src/";
} else {
    $require_prefix = "";
}

if (DEV_BUILD) {
    define("WPM_BASE_URL", plugin_dir_url(__FILE__) . "src/");
    define("WPM_BUILD_DIR", plugin_dir_path(__FILE__) . "build/");
    define("WPM_BUILD_URL", plugin_dir_url(__FILE__) . "build/");
} else {
    define("WPM_BASE_URL", plugin_dir_url(__FILE__));
    define("WPM_BUILD_DIR", plugin_dir_path(__FILE__) . "react/");
    define("WPM_BUILD_URL", plugin_dir_url(__FILE__) . "react/");
}

if (DEV_BUILD) {
    global $wpdb;
    $wpdb->show_errors = true;
}

/*
 * Classes
 */
require_once $require_prefix . "classes/class-customposttype.php";
require_once $require_prefix . "classes/class-metabox.php";
require_once $require_prefix . "classes/class-objectposttype.php";
require_once $require_prefix . "classes/class-objectkind.php";
require_once $require_prefix . "classes/class-oai-pmh-mappings.php";
require_once $require_prefix . "classes/class-mobjectfield.php";
require_once $require_prefix . "classes/class-remoteclient.php";

/*
 * Functions
 */
require_once $require_prefix . "includes/database-functions.php";
require_once $require_prefix . "includes/object-functions.php";
require_once $require_prefix . "includes/collection-functions.php";
require_once $require_prefix . "includes/collection-taxonomy.php";
require_once $require_prefix . "includes/custom-post-type-functions.php";
require_once $require_prefix . "includes/display-functions.php";
require_once $require_prefix . "admin/customization.php";
require_once $require_prefix . "admin/admin-icon.php";
require_once $require_prefix . "includes/remote.php";
require_once $require_prefix . "includes/cleanup.php";
require_once $require_prefix . "includes/migration.php";

/*
 * Scripts
 */
require_once $require_prefix . "actions-filters.php";
require_once $require_prefix . "includes/capabilities.php";
require_once $require_prefix . "includes/object-post-types.php";
require_once $require_prefix . "includes/object-ajax.php";
require_once $require_prefix . "includes/collection-post-type.php";
require_once $require_prefix . "admin/quick-browse.php";
require_once $require_prefix . "admin/import-export.php";
require_once $require_prefix . "includes/database-upgrade.php";
require_once $require_prefix . "admin-react/admin-react.php";

/*
 * Blocks
 */
require_once $require_prefix . "blocks/blocks.php";

/**
 * Rest
 */
require_once $require_prefix . "rest/trait-preparable-from-schema.php";
require_once $require_prefix . "rest/trait-with-id-arg.php";
require_once $require_prefix . "rest/rest.php";
require_once $require_prefix . "rest/rest-helper-functions.php";
require_once $require_prefix . "rest/class-objects-controller.php";
require_once $require_prefix . "rest/class-kinds-controller.php";
require_once $require_prefix . "rest/class-admin-options-controller.php";
require_once $require_prefix . "rest/class-collections-controller.php";
require_once $require_prefix . "rest/class-object-fields-controller.php";
require_once $require_prefix . "rest/class-object-image-controller.php";
require_once $require_prefix . "rest/class-remote-client-controller.php";
require_once $require_prefix . "rest/class-site-data-controller.php";

/**
 * OAI-PMH
 */
require_once $require_prefix . "includes/oai-pmh.php";

/**
 * Widgets
 */
require_once $require_prefix . "widgets/class-associated-collection-widget.php";
require_once $require_prefix . "widgets/class-collection-tree-widget.php";
