<?php
/**
 * Controller class for site data.
 *
 * Registers the following route:
 * /site_data                        Overview data for the site.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

use WP_REST_Response;

/**
 * A singleton class for registering site data endpoint.
 */
class Site_Data_Controller extends \WP_REST_Controller {
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
	 * Registers route.
	 */
	public function register_routes() {
		/**
		 * /site_data                        Overview data for the site.
		 */
		register_rest_route(
			$this->namespace,
			'/site_data',
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'permission_callback' => [ $this, 'get_items_permissions_check' ],
					'callback'            => [ $this, 'get_item' ],
				],
				'schema' => [ $this, 'get_item_schema' ],
			]
		);
	}

	/**
	 * Checks whether visitor has permission to update items through the API.
	 *
	 * Basic site data is public.
	 *
	 * @param WP_REST_Request $request The REST Request object.
	 * @return boolean True if the user is permitted to view site data.
	 */
	public function get_items_permissions_check( $request ) {
		return true;
	}

	/**
	 * Retrieves the site data exposed by the API.
	 *
	 * @param WP_REST_Request $request The REST Request object.
	 * @return WP_REST_Response Response containing site data.
	 */
	public function get_item( $request ) {
		$collections = get_collections();

		$collection_names = array_map(
			function ( $collection ) {
				return $collection->post_title;
			},
			$collections
		);

		$object_posts = get_object_posts( null, 'publish' );

		$site_data                 = [];
		$site_data['title']        = html_entity_decode(
			get_bloginfo( 'name' ),
			ENT_QUOTES | ENT_XML1,
			'UTF-8'
		);
		$site_data['description']  = html_entity_decode(
			get_bloginfo( 'description' ),
			ENT_QUOTES | ENT_XML1,
			'UTF-8'
		);
		$site_data['url']          = get_bloginfo( 'url' );
		$site_data['collections']  = $collection_names;
		$site_data['object_count'] = count( $object_posts );

		$response = $this->prepare_item_for_response( $site_data, $request );

		return $response;
	}

	/**
	 * JSON schema for site data response.
	 *
	 * @return Array Array representation of JSON schema.
	 */
	public function get_item_schema() {
		if ( $this->schema ) {
			return $this->schema;
		}

		$this->schema = [
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'museum-site-data',
			'type'       => 'object',
			'properties' => [
				'title'        => [
					'description' => __( 'Site title.' ),
					'type'        => 'string',
					'context'     => [ 'view', 'edit', 'embed' ],
					'readonly'    => true,
				],
				'description'  => [
					'description' => __( 'Site description.' ),
					'type'        => 'string',
					'context'     => [ 'view', 'edit', 'embed' ],
					'readonly'    => true,
				],
				'url'          => [
					'description' => __( 'Base url of the site.' ),
					'type'        => 'string',
					'format'      => 'url',
					'context'     => [ 'view', 'edit', 'embed' ],
					'readonly'    => true,
				],
				'collections'  => [
					'description' => __( 'List of museum collections on the site.' ),
					'type'        => 'array',
					'items'       => [
						'type' => 'string',
					],
					'context'     => [ 'view', 'edit', 'embed' ],
					'readonly'    => true,
				],
				'object_count' => [
					'description' => __( 'Number of (published) musuem objects on the site.' ),
					'type'        => 'integer',
					'context'     => [ 'view', 'edit', 'embed' ],
					'readonly'    => true,
				],
			],
		];

		return $this->schema;
	}
}
