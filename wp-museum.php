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
 * Version: 0.6.12
 * Author: Mike Thicke
 * Author URI: http://www.mikethicke.com
 * Text Domain: wp-museum
 */

namespace MikeThicke\WPMuseum;

const WPM_PREFIX     = 'wpm_';                 // Prefix for database tables.
const CSS_VERSION    = '0.5.2';                // Change to force reload of CSS.
const SCRIPT_VERSION = '0.5.2';                // Change to force reload of JS.
const CACHE_GROUP    = 'MikeThicke\WPMuseum';  // For caching db queries.
const DB_VERSION     = '0.5.23';               // Change to update db structure.
const DB_SHOW_ERRORS = true;                   // Have WP report db errors.
const IMAGE_DIR      = 'wp-museum';            // Directory to save exported images.
const REST_NAMESPACE = 'wp-museum/v1';         // Root for rest routes.

/**
 * Is this a development build of the plugin?
 *
 * The development build and release build could have different directory structures,
 * primarily for transpiled code in blocks.
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
 * For dev builds, wp-musuem.php is one directory up, so that the build
 * will be detected by WordPress as a plugin.
 */
if ( DEV_BUILD ) {
	$require_prefix = 'src/';
} else {
	$require_prefix = '';
}

if ( DEV_BUILD ) {
	define( 'WPM_BASE_URL', plugin_dir_url( __FILE__ ) . 'src/' );
} else {
	define( 'WPM_BASE_URL', plugin_dir_url( __FILE__ ) );
}

if ( DEV_BUILD ) {
	$wpdb->show_errors = true;
}

/**
 * Combine Query
 *
 * Plugin for combining WordPress queries. Used by museum objects to include
 * meta fields in the default WordPress search.
 *
 * @link https://github.com/birgire/wp-combine-queries
 * @version 1.0.5
 */
require_once $require_prefix . 'dependencies/wp-combine-queries/combined-query.php';

/*
 * Classes
 */
require_once $require_prefix . 'classes/class-customposttype.php';
require_once $require_prefix . 'classes/class-metabox.php';
require_once $require_prefix . 'classes/class-objectposttype.php';
require_once $require_prefix . 'classes/class-objectkind.php';
require_once $require_prefix . 'classes/class-mobjectfield.php';
require_once $require_prefix . 'classes/class-remoteclient.php';

/*
 * Functions
 */
require_once $require_prefix . 'general/database-functions.php';
require_once $require_prefix . 'general/object-functions.php';
require_once $require_prefix . 'general/collection-functions.php';
require_once $require_prefix . 'admin/object-admin-functions.php';
require_once $require_prefix . 'general/custom-post-type-functions.php';
require_once $require_prefix . 'general/rest.php';
require_once $require_prefix . 'public/display.php';
require_once $require_prefix . 'admin/customization.php';
require_once $require_prefix . 'admin/admin-icon.php';
require_once $require_prefix . 'general/remote.php';

/*
 * Scripts
 */
require_once $require_prefix . 'actions-filters.php';
require_once $require_prefix . 'general/capabilities.php';
require_once $require_prefix . 'general/object-post-types.php';
require_once $require_prefix . 'general/object-ajax.php';
require_once $require_prefix . 'general/collection-post-type.php';
require_once $require_prefix . 'admin/quick-browse.php';
require_once $require_prefix . 'admin/import-export.php';
require_once $require_prefix . 'general/database-upgrade.php';
require_once $require_prefix . 'admin-react/admin-react.php';

/*
 * Blocks
 */
require_once $require_prefix . 'blocks/blocks.php';
require_once $require_prefix . 'blocks/collection-block-frontend.php';
require_once $require_prefix . 'blocks/object-infobox-frontend.php';
require_once $require_prefix . 'blocks/object-gallery-frontend.php';
require_once $require_prefix . 'blocks/objectposttype-block.php';
require_once $require_prefix . 'blocks/object-image-attachments-block.php';
require_once $require_prefix . 'blocks/child-objects-block.php';
require_once $require_prefix . 'blocks/advanced-search-block.php';
require_once $require_prefix . 'blocks/collection-objects-block.php';

