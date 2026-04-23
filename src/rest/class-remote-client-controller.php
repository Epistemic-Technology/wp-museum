<?php
/**
 * Controller class for remote museum client data and registration.
 *
 * Registers the following routes:
 * /remote_clients                All remote clients.
 * /register_remote               Register a remote client.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

use WP_REST_Response;

/**
 * A singleton class for remote museum client data and registration.
 */
class Remote_Client_Controller extends \WP_REST_Controller {
	use Preparable_From_Schema;

	/**
	 * The REST namespace (relavtive to /wp-json/)
	 *
	 * @var string $namespace
	 */
	protected $namespace;

	/**
	 * Cached schema for Museum object images.
	 *
	 * @var Array $schema
	 */
	protected $schema;

	/**
	 * Default constructor
	 */
	public function __construct() {
		$this->namespace = REST_NAMESPACE;
	}

	/**
	 * Registers routes.
	 */
	public function register_routes() {
		/**
		 * /register_remote
		 *
		 * @return Array | WP_ERROR Array of site data or error if registration unsuccessful.
		 */
		register_rest_route(
			$this->namespace,
			'/register_remote',
			[
				[
					'methods'             => 'POST',
					'permission_callback' => [ $this, 'register_remote_permissions_check' ],
					'callback'            => [ $this, 'register_remote_client' ],
				],
			]
		);

		/**
		 * /remote_clients                All remote clients
		 */
		register_rest_route(
			REST_NAMESPACE,
			'/remote_clients',
			[
				[
					'methods'             => 'GET',
					'permission_callback' => [ $this, 'get_remote_clients_permission_check' ],
					'callback'            => [ $this, 'get_items' ],
				],
				[
					'methods'             => 'POST',
					'permission_callback' => [ $this, 'update_remote_clients_permission_check' ],
					'callback'            => [ $this, 'update_items' ],
				],
				'schema' => [ $this, 'get_item_schema' ],
			]
		);
	}

	/**
	 * Checks whether visitor has permission to register clients through the
	 * API.
	 *
	 * Currently the registration callback checks for authorization, rather
	 * than blocking unauthroized requests through the permissions callback.
	 *
	 * @param WP_REST_Request $request The REST Request object.
	 * @return boolean True if the user is permitted to view site options.
	 */
	public function register_remote_permissions_check( $request ) {
		return true;
	}

	/**
	 * Checks whether visitor is authorized to retrieve data about authorized
	 * remote clients.
	 *
	 * Only administrators have access to this data.
	 *
	 * @param WP_REST_Request $request The REST Request object.
	 * @return boolean True if the user is permitted to view site options.
	 */
	public function get_remote_clients_permission_check( $request ) {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Chekcs whether visitor is authorized to update data about authorized
	 * remote clients.
	 *
	 * Only administrators are permitted to update this data.
	 *
	 * @param WP_REST_Request $request The REST Request object.
	 * @return boolean True if the user is permitted to view site options.
	 */
	public function update_remote_clients_permission_check( $request ) {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Callback to register a remote client from a REST request to /register_remote
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return @return WP_REST_Response|WP_Error Array of site data or error if registration unsuccessful.
	 */
	public function register_remote_client( $request ) {
		if ( ! origin_authorized() ) {
			return new \WP_Error(
				'origin-blocked',
				'Remote site has been blocked from connecting.',
				[ 'status' => 403 ]
			);
		}
		$remote_client = RemoteClient::from_rest( $request->get_json_params() );
		if ( $remote_client->blocked ) {
			return new WP_Error(
				'remote-blocked',
				'Remote site has been blocked from connecting.',
				[ 'status' => 403 ]
			);
		}
		if ( is_null( $remote_client->blocked ) ) {
			$remote_client->blocked = false;
		}
		if ( empty( $remote_client->uuid ) || ! $remote_client->uuid_is_valid() ) {
			return new WP_Error(
				'invalid-uuid',
				'Missing or invalid uuid in registration data.',
				[ 'status' => 400 ]
			);
		}
		if ( empty( $remote_client->registration_time ) ) {
			$remote_client->registration_time = current_time( 'mysql' );
		}
		$remote_client->url = $request->get_headers()['origin'][0];
		if ( $remote_client->save_to_db() !== false ) {
			$site_data_controller = new Site_Data_Controller();
			$response             = $site_data_controller->get_item( $request );
			return $response;
		}
		return new WP_Error(
			'database-error',
			'Error registering remote site.',
			[ 'status' => 500 ]
		);
	}

	/**
	 * Retrieves registered client data.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response Response containing data for registered clients.
	 */
	public function get_items( $request ) {
		$client_array = RemoteClient::get_all_clients_assoc_array();

		$client_data = [];
		$response_collection = [];

		foreach ( $client_array as $client_data ) {
			$response_item         = $this->prepare_item_for_response( $client_data, $request );
			$response_collection[] = $this->prepare_response_for_collection( $response_item );
		}

		return rest_ensure_response( $response_collection );
	}

	/**
	 * Update client data from REST POST request.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response True on success.
	 */
	public function update_items( $request ) {
		$updated_client_data = $request->get_json_params();
		if ( ! $updated_client_data ) {
			return rest_ensure_response( true );
		}
		foreach ( $updated_client_data as $updated_client ) {
			$client_object = RemoteClient::from_rest( $updated_client );
			if ( true === $updated_client['delete'] ) {
				$success = $client_object->delete_from_db();
			} else {
				$success = $client_object->save_to_db();
			}
		}
		return rest_ensure_response( $success );
	}

	/**
	 * JSON schema for remote client item.
	 *
	 * @return Array Array representation of JSON schema.
	 */
	public function get_item_schema() {
		if ( $this->schema ) {
			return $this->schema;
		}

		$this->schema = [
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'museum-remote-clients',
			'type'       => 'object',
			'properties' => [
				'client_id'         => [
					'description' => __( 'Unique database identifier for client.' ),
					'type'        => [ 'integer', 'null' ],
					'context'     => [ 'view', 'edit', 'embed' ],
					'readonly'    => true,
				],
				'uuid'              => [
					'description' => __( 'Unique external identifier for client.' ),
					'type'        => [ 'string', 'null' ],
					'context'     => [ 'view', 'edit', 'embed' ],
					'format'      => 'uuid',
				],
				'title'             => [
					'description' => __( 'Title of the remote client WordPress site.' ),
					'type'        => [ 'string', 'null' ],
					'context'     => [ 'view', 'edit', 'embed' ],
				],
				'url'               => [
					'description' => __( 'URL of the remote client WordPress site.' ),
					'type'        => [ 'string', 'null' ],
					'context'     => [ 'view', 'edit', 'embed' ],
					'format'      => 'uri',
				],
				'blocked'           => [
					'description' => __( 'Whether requests from the remote client should be blocked.' ),
					'type'        => [ 'boolean', 'null' ],
					'context'     => [ 'view', 'edit', 'embed' ],
				],
				'registration_time' => [
					'description' => __( 'When the remote client was first registered.' ),
					'type'        => [ 'string', 'null' ],
					'context'     => [ 'view', 'edit', 'embed' ],
					'format'      => 'date-time',
				],
			],
		];

		return $this->schema;
	}
}
