<?php
/**
 * Controller class for museum object image attachments.
 *
 * Registers the following routes:
 *
 * /<object type>/<post id>/images   Images associated with object.
 * /all/<post id>/images             Images associated with object.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

/**
 * A singleton class for registering museum object image attachment endpoints.
 */
class Object_Image_Controller extends \WP_REST_Controller {
	use With_ID_Arg;
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
		 * /<object type>/<post id>/images   Images associated with object.
		 */
		register_rest_route(
			$this->namespace,
			'/all/(?P<id>[\d]+)/images/',
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'permission_callback' => [ $this, 'get_items_permission_check' ],
					'args'                => [ 'id' => $this->get_id_arg() ],
					'callback'            => [ $this, 'get_items' ],
				],
				[
					'methods'             => \WP_REST_Server::EDITABLE,
					'permission_callback' => [ $this, 'edit_items_permission_check' ],
					'args'                => [ 'id' => $this->get_id_arg() ],
					'callback'            => [ $this, 'update_item' ],
				],
			]
		);

		/**
		 * Endpoints for specific museum object kinds.
		 */
		$kinds = get_mobject_kinds();

		foreach ( $kinds as $kind ) {
			/**
			 * /wp-json/wp-museum/v1/<object type>/<post id>/images Images associated with object.
			 */
			register_rest_route(
				$this->namespace,
				'/' . $kind->type_name . '/(?P<id>[\d]+)/images',
				[
					[
						'methods'             => \WP_REST_Server::READABLE,
						'permission_callback' => [ $this, 'get_items_permission_check' ],
						'args'                => [ 'id' => $this->get_id_arg() ],
						'callback'            => [ $this, 'get_items' ],
					],
					[
						'methods'             => \WP_REST_Server::EDITABLE,
						'permission_callback' => [ $this, 'edit_items_permission_check' ],
						'args'                => [ 'id' => $this->get_id_arg() ],
						'callback'            => [ $this, 'update_item' ],
					],
					'schema' => [ $this, 'get_public_item_schema' ],
				],
			);
		}
	}

	/**
	 * Checks whether visitor has permission to get items from the API.
	 *
	 * Note: all read endpoints from the API are public, but private fields
	 * will only be added to the response if user has appropriate permissions.
	 *
	 * @param WP_REST_Request $request The REST Request object.
	 */
	public function get_items_permission_check( $request ) {
		return true;
	}

	/**
	 * Checks whether visitor has permission to edit image attachments.
	 *
	 * Users that have permission to edit the associated museum object post can
	 * also edit the associated image attachments.
	 *
	 * @param WP_REST_Request $request The REST Request object.
	 * @return boolean True if the user has permission to edit image attachments.
	 */
	public function edit_items_permission_check( $request ) {
		return current_user_can( 'edit_post', $request['id'] );
	}

	/**
	 * Update image attachments for museum object.
	 *
	 * @param WP_REST_Request $request The REST Request object.
	 * @return WP_REST_Response|WP_Error Response object on success, or
	 * WP_Error object on failure.
	 */
	public function update_item( $request ) {
		$post         = get_post_for_rest( $request['id'] );
		$request_data = json_decode( $request->get_body(), false );

		if ( isset( $request_data->images ) ) {
			$updated_image_attachments = $request_data->images;
		} else {
			return new \WP_Error(
				'rest_cannot_update',
				__( 'Updating image attachments, images not set.' )
			);
		}

		$success = set_object_image_box_attachments(
			$updated_image_attachments,
			$post->ID
		);

		if ( $success ) {
			return rest_ensure_response( true );
		} else {
			return new \WP_Error(
				'rest_cannot_update',
				__( 'There was an error updating the object image attachments.' )
			);
		}
	}

	/**
	 * Retrieve images for museum object.
	 *
	 * @param WP_REST_Request $request The REST Request object.
	 */
	public function get_items( $request ) {
		$post = get_post_for_rest( $request['id'] );

		if ( is_wp_error( $post ) ) {
			return $post;
		}

		$images      = get_object_image_attachments( $post->ID );
		$image_sizes = get_intermediate_image_sizes();

		$associated_image_data = [];
		foreach ( $images as $image_id => $sort_order ) {
			$image_post = get_post( $image_id );
			$image_data = [];

			$image_data['title']       = $image_post->post_title;
			$image_data['caption']     = $image_post->post_excerpt;
			$image_data['description'] = $image_post->post_content;
			$image_data['alt']         = get_post_meta( $image_id, '_wp_attachment_image_alt', true );
			$image_data['sort_order']  = $sort_order;

			foreach ( $image_sizes as $size_slug ) {
				$image_data[ $size_slug ] = wp_get_attachment_image_src( $image_id, $size_slug );
			}
			$image_data['full'] = wp_get_attachment_image_src( $image_id, 'full' );

			$response_item                      = $this->prepare_item_for_response( $image_data, $request );
			$associated_image_data[ $image_id ] = $this->prepare_response_for_collection( $response_item );
		}

		return $associated_image_data;
	}

	/**
	 * Returns JSON schema for a image attachment item response.
	 *
	 * @return Array Array representation of JSON schema.
	 */
	public function get_item_schema() {
		if ( $this->schema ) {
			return $this->schema;
		}

		$this->schema = [
			'$schema'              => 'http://json-schema.org/draft-04/schema#',
			'title'                => 'object-image-attachment',
			'type'                 => 'object',
			'properties'           => [
				'title'       => [
					'description' => __( 'Title of the image.' ),
					'type'        => 'string',
					'context'     => [ 'view', 'edit', 'embed' ],
					'readonly'    => true,
				],
				'caption'     => [
					'description' => __( 'Caption for the image.' ),
					'type'        => 'string',
					'context'     => [ 'view', 'edit', 'embed' ],
					'readonly'    => true,
				],
				'description' => [
					'description' => __( 'Description of the image.' ),
					'type'        => 'string',
					'context'     => [ 'view', 'edit', 'embed' ],
					'readonly'    => true,
				],
				'alt'         => [
					'description' => __( 'Alternative text for the image.' ),
					'type'        => 'string',
					'context'     => [ 'view', 'edit', 'embed' ],
					'readonly'    => true,
				],
				'sort_order'  => [
					'description' => __( 'Order in which image will be dispayed or listed.' ),
					'type'        => 'integer',
					'context'     => [ 'view', 'edit', 'embed' ],
					'readonly'    => true,
				],
			],
			'additionalProperties' => [
				'type'     => 'array',
				'items'    => [
					[
						'description' => __( 'Image URL.' ),
						'type'        => 'string',
						'format'      => 'uri',
					],
					[
						'description' => __( 'Image width.' ),
						'type'        => 'number',
					],
					[
						'description' => __( 'Image height' ),
						'type'        => 'number',
					],
					[
						'description' => __( 'Is this version resized from original?' ),
						'type'        => 'boolean',
					],
				],
				'context'  => [ 'view', 'edit', 'embed' ],
				'readonly' => true,
			],
		];

		return $this->schema;
	}
}
