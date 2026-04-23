<?php
/**
 * Defines capabilities for exhibits, exhibits, and collections.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

/**
 * Callback to add capabilities for custom post types.
 */
function add_museum_capabilities() {
	$administrator_role = get_role( 'administrator' );
	$administrator_role->add_cap( WPM_PREFIX . 'edit_objects' );
	$administrator_role->add_cap( WPM_PREFIX . 'publish_objects' );
	$administrator_role->add_cap( WPM_PREFIX . 'delete_objects' );
	$administrator_role->add_cap( WPM_PREFIX . 'edit_others_objects' );
	$administrator_role->add_cap( WPM_PREFIX . 'edit_published_objects' );
	$administrator_role->add_cap( WPM_PREFIX . 'read_private_objects' );
	$administrator_role->add_cap( WPM_PREFIX . 'edit_collections' );
	$administrator_role->add_cap( WPM_PREFIX . 'publish_collections' );
	$administrator_role->add_cap( WPM_PREFIX . 'delete_collections' );
	$administrator_role->add_cap( WPM_PREFIX . 'edit_others_collections' );
	$administrator_role->add_cap( WPM_PREFIX . 'edit_published_collections' );
	$administrator_role->add_cap( WPM_PREFIX . 'read_private_collections' );
	$administrator_role->add_cap( WPM_PREFIX . 'edit_exhibits' );
	$administrator_role->add_cap( WPM_PREFIX . 'publish_exhibits' );
	$administrator_role->add_cap( WPM_PREFIX . 'delete_exhibits' );
	$administrator_role->add_cap( WPM_PREFIX . 'edit_others_exhibits' );
	$administrator_role->add_cap( WPM_PREFIX . 'edit_published_exhibits' );
	$administrator_role->add_cap( WPM_PREFIX . 'read_private_exhibits' );

	$editor_role = get_role( 'editor' );
	$editor_role->add_cap( WPM_PREFIX . 'edit_objects' );
	$editor_role->add_cap( WPM_PREFIX . 'publish_objects' );
	$editor_role->add_cap( WPM_PREFIX . 'delete_objects' );
	$editor_role->add_cap( WPM_PREFIX . 'edit_others_objects' );
	$editor_role->add_cap( WPM_PREFIX . 'edit_published_objects' );
	$editor_role->add_cap( WPM_PREFIX . 'read_private_objects' );
	$editor_role->add_cap( WPM_PREFIX . 'edit_collections' );
	$editor_role->add_cap( WPM_PREFIX . 'publish_collections' );
	$editor_role->add_cap( WPM_PREFIX . 'delete_collections' );
	$editor_role->add_cap( WPM_PREFIX . 'edit_others_collections' );
	$editor_role->add_cap( WPM_PREFIX . 'edit_published_collections' );
	$editor_role->add_cap( WPM_PREFIX . 'read_private_collections' );
	$editor_role->add_cap( WPM_PREFIX . 'edit_exhibits' );
	$editor_role->add_cap( WPM_PREFIX . 'publish_exhibits' );
	$editor_role->add_cap( WPM_PREFIX . 'delete_exhibits' );
	$editor_role->add_cap( WPM_PREFIX . 'edit_others_exhibits' );
	$editor_role->add_cap( WPM_PREFIX . 'edit_published_exhibits' );
	$editor_role->add_cap( WPM_PREFIX . 'read_private_exhibits' );

	$author_role = get_role( 'author' );
	$author_role->add_cap( WPM_PREFIX . 'edit_objects' );
	$author_role->add_cap( WPM_PREFIX . 'edit_others_objects' );
	$author_role->add_cap( WPM_PREFIX . 'edit_published_objects' );
	$author_role->add_cap( WPM_PREFIX . 'edit_collections' );
	$author_role->add_cap( WPM_PREFIX . 'edit_others_collections' );
	$author_role->add_cap( WPM_PREFIX . 'edit_published_collections' );
	$author_role->add_cap( WPM_PREFIX . 'edit_exhibits' );
	$author_role->add_cap( WPM_PREFIX . 'edit_others_exhibits' );
	$author_role->add_cap( WPM_PREFIX . 'edit_published_exhibits' );
}


/**
 * Callback to remove capabilities. Called on plugin deactivation.
 */
function remove_museum_capabilities() {
	$administrator_role = get_role( 'administrator' );
	$administrator_role->remove_cap( WPM_PREFIX . 'edit_objects' );
	$administrator_role->remove_cap( WPM_PREFIX . 'publish_objects' );
	$administrator_role->remove_cap( WPM_PREFIX . 'delete_objects' );
	$administrator_role->remove_cap( WPM_PREFIX . 'edit_others_objects' );
	$administrator_role->remove_cap( WPM_PREFIX . 'edit_published_objects' );
	$administrator_role->remove_cap( WPM_PREFIX . 'read_private_objects' );
	$administrator_role->remove_cap( WPM_PREFIX . 'edit_collections' );
	$administrator_role->remove_cap( WPM_PREFIX . 'publish_collections' );
	$administrator_role->remove_cap( WPM_PREFIX . 'delete_collections' );
	$administrator_role->remove_cap( WPM_PREFIX . 'edit_others_collections' );
	$administrator_role->remove_cap( WPM_PREFIX . 'edit_published_collections' );
	$administrator_role->remove_cap( WPM_PREFIX . 'read_private_collections' );
	$administrator_role->remove_cap( WPM_PREFIX . 'edit_exhibits' );
	$administrator_role->remove_cap( WPM_PREFIX . 'publish_exhibits' );
	$administrator_role->remove_cap( WPM_PREFIX . 'delete_exhibits' );
	$administrator_role->remove_cap( WPM_PREFIX . 'edit_others_exhibits' );
	$administrator_role->remove_cap( WPM_PREFIX . 'edit_published_exhibits' );
	$administrator_role->remove_cap( WPM_PREFIX . 'read_private_exhibits' );

	$editor_role = get_role( 'editor' );
	$editor_role->remove_cap( WPM_PREFIX . 'edit_objects' );
	$editor_role->remove_cap( WPM_PREFIX . 'publish_objects' );
	$editor_role->remove_cap( WPM_PREFIX . 'delete_objects' );
	$editor_role->remove_cap( WPM_PREFIX . 'edit_others_objects' );
	$editor_role->remove_cap( WPM_PREFIX . 'edit_published_objects' );
	$editor_role->remove_cap( WPM_PREFIX . 'read_private_objects' );
	$editor_role->remove_cap( WPM_PREFIX . 'edit_collections' );
	$editor_role->remove_cap( WPM_PREFIX . 'publish_collections' );
	$editor_role->remove_cap( WPM_PREFIX . 'delete_collections' );
	$editor_role->remove_cap( WPM_PREFIX . 'edit_others_collections' );
	$editor_role->remove_cap( WPM_PREFIX . 'edit_published_collections' );
	$editor_role->remove_cap( WPM_PREFIX . 'read_private_collections' );
	$editor_role->remove_cap( WPM_PREFIX . 'edit_exhibits' );
	$editor_role->remove_cap( WPM_PREFIX . 'publish_exhibits' );
	$editor_role->remove_cap( WPM_PREFIX . 'delete_exhibits' );
	$editor_role->remove_cap( WPM_PREFIX . 'edit_others_exhibits' );
	$editor_role->remove_cap( WPM_PREFIX . 'edit_published_exhibits' );
	$editor_role->remove_cap( WPM_PREFIX . 'read_private_exhibits' );

	$author_role = get_role( 'author' );
	$author_role->remove_cap( WPM_PREFIX . 'edit_objects' );
	$author_role->remove_cap( WPM_PREFIX . 'edit_others_objects' );
	$author_role->remove_cap( WPM_PREFIX . 'edit_published_objects' );
	$author_role->remove_cap( WPM_PREFIX . 'edit_collections' );
	$author_role->remove_cap( WPM_PREFIX . 'edit_others_collections' );
	$author_role->remove_cap( WPM_PREFIX . 'edit_published_collections' );
	$author_role->remove_cap( WPM_PREFIX . 'edit_exhibits' );
	$author_role->remove_cap( WPM_PREFIX . 'edit_others_exhibits' );
	$author_role->remove_cap( WPM_PREFIX . 'edit_published_exhibits' );
}
