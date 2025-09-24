<?php
/**
 * Controller class for administration options.
 *
 * Registers the following route:
 * /admin_options                    Site-wide options.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

use WP_REST_Response;

/**
 * A singleton class for registering administration option endpoints.
 */
class Admin_Options_Controller extends \WP_REST_Controller {
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
	 *
	 * Get and set site-wide options for the museum plugin. Can be read by
	 * authors+ and changed by administrators.
	 */
	public function register_routes() {
		/**
		 * /admin_options                    Site-wide options.
		 */
		register_rest_route(
			$this->namespace,
			'/admin_options',
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'permission_callback' => [ $this, 'get_items_permission_check' ],
					'callback'            => [ $this, 'get_items' ],
				],
				[
					'methods'             => \WP_REST_Server::EDITABLE,
					'permission_callback' => [ $this, 'edit_items_permission_check' ],
					'callback'            => [ $this, 'update_items' ],
				],
				'schema' => [ $this, 'get_item_schema' ],
			],
		);
	}

	/**
	 * Checks whether visitor has permission to get items from the API.
	 *
	 * Editors have permission to view the admin options.
	 *
	 * @param WP_REST_Request $request The REST Request object.
	 * @return boolean True if the user is permitted to view site options.
	 */
	public function get_items_permission_check( $request ) {
		return current_user_can( 'edit_posts' );
	}

	/**
	 * Checks whether visitor has permission to update items through the API.
	 *
	 * Only administrators can update site options.
	 *
	 * @param WP_REST_Request $request The REST Request object.
	 * @return boolean True if the user is permitted to update site options.
	 */
	public function edit_items_permission_check( $request ) {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Retrieves site options exposed by the API.
	 *
	 * @param WP_REST_Request $request The REST Request object.
	 * @return WP_REST_Response Collection of response objects.
	 */
	public function get_items( $request ) {
		$admin_data        = [];
		$schema_properties = $this->get_item_schema()['properties'];
		foreach ( $schema_properties as $property => $property_schema ) {
			$admin_data[ $property ] = get_option( $property );
		}
		return rest_ensure_response(
			$this->prepare_item_for_response(
				$admin_data,
				$request
			)
		);
	}

	/**
	 * Updates site options from REST request.
	 *
	 * @param WP_REST_Request $request The REST Request object.
	 * @return boolean | WP_Error True on success, WP_Error on failure.
	 */
	public function update_items( $request ) {
		$option_values     = $request->get_json_params();
		$schema_properties = $this->get_item_schema()['properties'];

		foreach ( $schema_properties as $property => $property_schema ) {
			if (
				isset( $option_values[ $property ] ) &&
				! is_null( $option_values[ $property ] )
			) {
				switch ( $property_schema['type'] ) {
					case 'boolean':
						$sanitized_option_value = (bool) intval( $option_values[ $property ] );
						break;
					case 'string':
						$sanitized_option_value = sanitize_text_field( $option_values[ $property ] );
						break;
					default:
						return new \WP_Error(
							'bad-schema',
							'Unrecognized schema type.'
						);
				}
				update_option( $property, $sanitized_option_value );
			}
		}
	}

	/**
	 * Returns JSON schema for site options.
	 *
	 * @return Array Array representation of JSON schema for admin options.
	 */
	public function get_item_schema() {
		if ( $this->schema ) {
			return $this->schema;
		}

		$this->schema = [
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'museum-admin-options',
			'type'       => 'object',
			'properties' => [
				'allow_remote_requests'       => [
					'description' => __( 'Whether remote REST requests should be allowed.' ),
					'type'        => 'boolean',
					'context'     => [ 'view', 'edit' ],
				],
				'allow_unregistered_requests' => [
					'description' => __( 'Whether remote REST requests from unregistered domains should be allowed.' ),
					'type'        => 'boolean',
					'context'     => [ 'view', 'edit' ],
				],
				'rest_authorized_domains'     => [
					'description' => __( 'Comma-separated list of whitelisted domains.' ),
					'type'        => 'string',
					'context'     => [ 'view', 'edit' ],
				],
				'clear_data_on_uninstall'     => [
					'description' => __( 'Whether to delete all museum data on plugin uninstall.' ),
					'type'        => 'boolean',
					'context'     => [ 'view', 'edit' ],
				],
				'show_post_status'            => [
					'description' => __( 'Whether to show post status in admin bar.' ),
					'type'        => 'boolean',
					'context'     => [ 'view', 'edit' ],
				],
				'collection_override_taxonomy' => [
					'description' => __( 'Whether to redirect collection taxonomy archive pages to collection posts.' ),
					'type'        => 'boolean',
					'context'     => [ 'view', 'edit' ],
				],
			],
		];

		return $this->schema;
	}
}
