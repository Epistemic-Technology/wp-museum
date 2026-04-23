<?php
/**
 * Functions for deleting user data and cleaning up WordPress database upon deleting or deactivating plugin.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

/**
 * Cleans up WP Museum options and tables on uninstall.
 *
 * @return true if data has been cleared.
 */
function do_cleanup() {
	if ( ! get_option( 'clear_data_on_uninstall', false ) ) {
		return false;
	}

	/**
	 * Options
	 */
	delete_option( WPM_PREFIX . 'collection_override_category' );
	delete_option( 'museum-remote-data' );
	delete_option( 'wpm_db_version' );
	delete_option( 'allow_remote_requests' );
	delete_option( 'allow_unregistered_requests' );
	delete_option( 'rest_authorized_domains' );
	delete_option( 'clear_data_on_uninstall' );

	/**
	 * Tables
	 */
	delete_mobject_kinds_table();
	delete_mobject_fields_table();
	delete_remote_clients_table();

	return true;
}
