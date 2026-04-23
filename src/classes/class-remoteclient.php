<?php
/**
 * Class representing a remote museum client.
 *
 * @package MikeThicke\WPMuseum
 *
 * phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
 *      -- prepare not able to handle variable table names.
 * phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery
 *      -- querying custom museum clients table.
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

/**
 * Class representing a remote museum client.
 */
class RemoteClient {
	/**
	 * Database primary key.
	 *
	 * @var int $client_id
	 */
	public $client_id = null;

	/**
	 * Unique identifier for the client.
	 *
	 * @var string $uuid
	 */
	public $uuid = null;

	/**
	 * Title of the remote client WordPress site.
	 *
	 * @var string $title
	 */
	public $title = null;

	/**
	 * URL of the remote client WordPress site.
	 *
	 * @var string $url
	 */
	public $url = null;

	/**
	 * Whether requests from the remote client should be blocked.
	 *
	 * @var bool $blocked
	 */
	public $blocked = null;

	/**
	 * When the remote client was first registered.
	 *
	 * @var string $registration_time
	 */
	public $registration_time = null;

	/**
	 * Create instance from database row.
	 *
	 * @param StdObj $row A row from the remote_clients table.
	 *
	 * @return RemoteClient A new instance.
	 */
	public static function from_database( $row ) {
		$instance                    = new self();
		$instance->client_id         = isset( $row->client_id ) ? intval( $row->client_id ) : null;
		$instance->uuid              = isset( $row->uuid ) ? trim( wp_unslash( $row->uuid ) ) : '';
		$instance->title             = isset( $row->title ) ? trim( wp_unslash( $row->title ) ) : '';
		$instance->url               = isset( $row->url ) ? trim( wp_unslash( $row->url ) ) : '';
		$instance->blocked           = isset( $row->blocked ) ? (bool) intval( $row->blocked ) : false;
		$instance->registration_time = isset( $row->registration_time ) ? trim( wp_unslash( $row->registration_time ) ) : '';

		return $instance;
	}

	/**
	 * Get all client records from database and return as array.
	 *
	 * @return [RemoteClients] All remote clients.
	 */
	public static function get_all_clients() {
		global $wpdb;

		$client_array = wp_cache_get( 'all_museum_remote_clients', CACHE_GROUP );
		if ( $client_array ) {
			return $client_array;
		}
		$client_array = [];

		$wpdb->show_errors = DB_SHOW_ERRORS;
		$table_name        = $wpdb->prefix . WPM_PREFIX . 'remote_clients';

		$results = $wpdb->get_results( "SELECT * FROM $table_name WHERE 1" );

		if ( ! is_null( $results ) && count( $results ) > 0 ) {
			foreach ( $results as $result ) {
				$client_array[] = self::from_database( $result );
			}
		}
		wp_cache_add( 'all_museum_remote_clients', $client_array, CACHE_GROUP );
		return $client_array;
	}

	/**
	 * Get all client records and return as array of associative arrays.
	 *
	 * @return [[ field => value ]] Array of associative arrays.
	 */
	public static function get_all_clients_assoc_array() {
		$client_objects = self::get_all_clients();
		$client_array   = [];
		foreach ( $client_objects as $client_object ) {
			$client_array[] = $client_object->to_array();
		}
		return $client_array;
	}

	/**
	 * Get client record from database based on client_id.
	 *
	 * @param int $client_id Primary key of the client in database.
	 * @return RemoteClient | false The remote client or false if not found.
	 */
	public static function from_client_id( $client_id ) {
		global $wpdb;

		$instance = wp_cache_get( 'remote_client_from_client_id_' . $client_id, CACHE_GROUP );
		if ( $instance ) {
			return $instance;
		}

		$wpdb->show_errors = DB_SHOW_ERRORS;
		$table_name        = $wpdb->prefix . WPM_PREFIX . 'remote_clients';

		$results = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM $table_name WHERE client_id=%s",
				$client_id
			)
		);
		if ( ! is_null( $results ) && count( $results ) === 1 ) {
			$instance = self::from_database( $results[0] );
			wp_cache_add( 'remote_client_from_client_id_' . $client_id, $instance, CACHE_GROUP );
			return $instance;
		}
		return false;
	}

	/**
	 * Get client record from database or create new record if none exsits
	 * based on uuid.
	 *
	 * @param string $uuid Identifier for the remote client.
	 * @return RemoteClient A new instance of RemoteClient.
	 */
	public static function from_uuid( $uuid ) {
		global $wpdb;

		$instance = wp_cache_get( 'remote_client_from_uuid_' . $uuid, CACHE_GROUP );
		if ( $instance ) {
			return $instance;
		}

		$wpdb->show_errors = DB_SHOW_ERRORS;
		$table_name        = $wpdb->prefix . WPM_PREFIX . 'remote_clients';

		$results = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM $table_name WHERE uuid=%s",
				$uuid
			)
		);
		if ( ! is_null( $results ) && count( $results ) === 1 ) {
			$instance = self::from_database( $results[0] );
		} else {
			$instance       = new self();
			$instance->uuid = $uuid;
		}

		wp_cache_add( 'remote_client_from_uuid_' . $uuid, $instance, CACHE_GROUP );
		return $instance;
	}

	/**
	 * Create instance from REST request, merging with database record if one exists.
	 *
	 * Note: Call json_decode with assoc parameter set to true.
	 *
	 * @param Array $rest_data Data from REST request as associative array.
	 * @return RemoteClient A new instance of RemoteClient.
	 */
	public static function from_rest( $rest_data ) {
		if ( ! empty( $rest_data['uuid'] ) ) {
			$instance = self::from_uuid( $rest_data['uuid'] );
		} else {
			$instance = new self();
		}

		$instance->client_id = empty( $rest_data['client_id'] ) ?
			$instance->client_id :
			intval( $rest_data['client_id'] );

		$instance->uuid = empty( $rest_data['uuid'] ) ?
			$instance->uuid :
			trim( wp_unslash( $rest_data['uuid'] ) );

		$instance->title = empty( $rest_data['title'] ) ?
			$instance->title :
			trim( wp_unslash( $rest_data['title'] ) );

		$instance->url = empty( $rest_data['url'] ) ?
			$instance->url :
			trim( wp_unslash( $rest_data['url'] ) );

		$instance->registration_time = empty( $rest_data['registration_time'] ) ?
			$instance->registration_time :
			trim( wp_unslash( $rest_data['registration_time'] ) );

		$instance->blocked = ! isset( $rest_data['blocked'] ) || is_null( $rest_data['blocked'] ) ?
			$instance->blocked :
			(bool) $rest_data['blocked'];

		return $instance;
	}

	/**
	 * Checks that the uuid is a valid uuid.
	 *
	 * @return bool True if the uuid is set and valid. False otherwise.
	 */
	public function uuid_is_valid() {
		if ( is_null( $this->uuid ) ) {
			return false;
		}
		$regex = '/^[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}$/';
		if ( 1 === preg_match( $regex, $this->uuid ) ) {
			return true;
		}
		return false;
	}

	/**
	 * Return properties as associative array.
	 */
	public function to_array() {
		$arr                      = [];
		$arr['client_id']         = $this->client_id;
		$arr['uuid']              = $this->uuid;
		$arr['title']             = $this->title;
		$arr['url']               = $this->url;
		$arr['registration_time'] = $this->registration_time;
		$arr['blocked']           = $this->blocked;
		return $arr;
	}

	/**
	 * Save this object to the database.
	 *
	 * @return bool True on successful save.
	 */
	public function save_to_db() {
		global $wpdb;
		$wpdb->show_errors = DB_SHOW_ERRORS;
		$table_name        = $wpdb->prefix . WPM_PREFIX . 'remote_clients';
		$data_array        = $this->to_array();

		unset( $data_array['client_id'] );
		if ( is_null( $this->client_id ) ) {
			return $wpdb->insert( $table_name, $data_array );
		} else {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.NoCaching --should always run query when save function called.
			return $wpdb->update( $table_name, $data_array, [ 'client_id' => $this->client_id ] );
		}
	}

	/**
	 * Delete this object from the database.
	 *
	 * Finds an object in the database that has either the same client_id or
	 * same uuid as this object, and then deletes it.
	 *
	 * @return bool True on successful delete.
	 */
	public function delete_from_db() {
		global $wpdb;
		$wpdb->show_errors = DB_SHOW_ERRORS;
		$table_name        = $wpdb->prefix . WPM_PREFIX . 'remote_clients';
		if ( is_null( $this->client_id ) ) {
			if ( is_null( $this->uuid ) ) {
				return false;
			}
			$saved_instance = self::from_uuid( $this->uuid );
			if ( is_null( $saved_instance->client_id ) ) {
				return false;
			}
			$delete_client_id = $saved_instance->client_id;
		} else {
			$delete_client_id = $this->client_id;
		}
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.NoCaching --should always run query when delete function called.
		return $wpdb->delete( $table_name, [ 'client_id' => $delete_client_id ] );
	}
}
