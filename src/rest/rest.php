<?php
/**
 * Registers REST routes and endpoints.
 *
 * REST root: /wp-json/wp-museum/v1
 *
 * ## General ##
 * /site_data                        Overview data for the site.
 * /admin_options                    Site-wide options.
 * /search                           For advanced search of objects.
 *
 * ## Objects ##
 * /<object type>/[?s=|<field>=]     Objects with post type <object type>.
 * /<object type>/<post id>          Specific object.
 * /<object type>/<post id>/images   Images associated with object.
 * /<object type>/<post id>/children Child objects of object.
 * /all/[?s=|<field>=]               All museum objects, regardless of type.
 * /all/<post id>                    Specific object.
 * /all/<post id>/images             Images associated with object.
 * /all/<post id>/children           Child objects of object.
 * /<object type>/fields             All fields for <object type>.
 *
 * ## Kinds ##
 * /mobject_kinds                  Object kinds
 * /mobject_kinds/<object type>    A specific kind with <object type>.
 *
 * ## Collections ##
 * /collections/[?s=]              All museum collections.
 * /collections/<post id>          A specific collection.
 * /collections/<post id>/objects  Objects associated with a collection.
 *
 * ## Remote Clients ##
 * /remote_clients                All remote clients
 * /register_remote               Register a remote client.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

const DEFAULT_NUMBERPOSTS = 50;

/**
 * Register REST endpoints.
 */
function rest_routes() {
	/**
	 * Registers the following routes:
	 *
	 * /<object type>/[?s=|<field>=]     Objects with post type <object type>.
	 * /<object type>/<post id>          Specific object.
	 * /<object type>/<post id>/children Child objects of object.
	 * /all/[?s=|<field>=]               All museum objects, regardless of type.
	 * /all/<post id>                    Specific object.
	 * /all/<post id>/children           Child objects of object.
	 */
	$museum_objects_controller = new Objects_Controller();
	$museum_objects_controller->register_routes();

	/**
	 * Registers the following routes:
	 *
	 * /mobject_kinds                  Object kinds
	 * /mobject_kinds/<object type>    A specific kind with <object type>.
	 */
	$museum_kinds_controller = new Kinds_Controller();
	$museum_kinds_controller->register_routes();

	/**
	 * Registers the following routes:
	 *
	 * /collections/[?s=]              All museum collections.
	 * /collections/<post id>          A specific collection.
	 */
	$museum_collections_controller = new Collections_Controller();
	$museum_collections_controller->register_routes();

	/**
	 * Registers the following routes:
	 *
	 * /<object type>/<post id>/images   Images associated with object.
	 * /all/<post id>/images             Images associated with object.
	 */
	$object_image_controller = new Object_Image_Controller();
	$object_image_controller->register_routes();

	/**
	 * Registers the following route:
	 *
	 * /<object type>/fields             All fields for <object type>.
	 */
	$object_fields_controller = new Object_Fields_Controller();
	$object_fields_controller->register_routes();

	/**
 * Registers the following route:
	 *
	 * /admin_options                    Site-wide options.
	 */
	$admin_options_controller = new Admin_Options_Controller();
	$admin_options_controller->register_routes();

	/**
	 * Registers the following route:
	 *
	 * /site_data                        Overview data for the site.
	 */
	$site_data_controller = new Site_Data_Controller();
	$site_data_controller->register_routes();

	/**
	 * Registers the following routes:
	 *
	 * /remote_clients                Retrieve or update data for all remote clients.
	 * /register_remote               Register a remote client.
	 */
	$remote_client_controller = new Remote_Client_Controller();
	$remote_client_controller->register_routes();
}
