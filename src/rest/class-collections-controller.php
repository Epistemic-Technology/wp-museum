<?php
/**
 * Controller class for museum collections.
 *
 * Registers the following routes:
 *
 * /collections/[?s=]              All museum collections.
 * /collections/<post id>          A specific collection.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

/**
 * A singleton class for registering museum collection endpoints.
 */
class Collections_Controller extends \WP_REST_Controller {
	use Preparable_From_Schema;
	use With_ID_Arg;

	/**
	 * The REST namespace (relavtive to /wp-json/)
	 *
	 * @var string $namespace
	 */
	protected $namespace;

	/**
	 * Cached schema for Museum objects.
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
	 * Registers routes
	 */
	public function register_routes() {
		/**
		 * /wp-json/wp-museum/v1/collections - Data for all museum collections.
		 */
		register_rest_route(
			$this->namespace,
			'/collections/',
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'permission_callback' => [ $this, 'get_items_permissions_check' ],
					'callback'            => [ $this, 'get_items' ],
				],
				'schema' => [ $this, 'get_public_item_schema' ],
			]
		);

		/**
		 * /wp-json/wp-museum/v1/collections/<post id> - Data for a specific collection.
		 */
		register_rest_route(
			$this->namespace,
			'/collections/(?P<id>[\d]+)',
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'permission_callback' => [ $this, 'get_items_permissions_check' ],
					'args'                => [ 'id' => $this->get_id_arg() ],
					'callback'            => [ $this, 'get_item' ],
				],
				'schema' => [ $this, 'get_public_item_schema' ],
			]
		);

		/**
		 * /wp-json/wp-museum/v1/collections/<term id>/objects - Retrieve museum objects associated with a collection term.
		 */
		register_rest_route(
			$this->namespace,
			'/collections/(?P<id>[\d]+)/objects',
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'permission_callback' => [ $this, 'get_items_permissions_check' ],
					'args'                => [
						'id'            => $this->get_id_arg(),
						'include_children' => [
							'default' => 'false',
							'validate_callback' => function( $value ) {
								return is_bool( $value );
							},
						],
					],
					'callback'            => [ $this, 'get_collection_term_items' ],
				],
				'schema' => [ $this, 'get_public_item_schema' ],
			]
		);
	}

	/**
	 * Checks whether user has permission to get items from the API.
	 *
	 * Note: all read endpoints from the API are public, but private fields
	 * will only be added to the response if user has appropriate permissions.
	 *
	 * @param WP_REST_Request $request The REST Request object.
	 */
	public function get_items_permissions_check( $request ) {
		return true;
	}

	/**
	 * Get the post, if the ID is valid.
	 *
	 * Copy-paste from @see class-wp-rest-posts-controller.php (4.7.2).
	 *
	 * @param int $id Supplied ID.
	 * @return WP_Post|WP_Error Post object if ID is valid, WP_Error otherwise.
	 */
	protected function get_post( $id ) {
		$error = new \WP_Error(
			'rest_post_invalid_id',
			__( 'Invalid post ID.' ),
			array( 'status' => 404 )
		);

		if ( (int) $id <= 0 ) {
			return $error;
		}

		$post = get_post( (int) $id );
		if ( empty( $post ) || empty( $post->ID ) ) {
			return $error;
		}

		return $post;
	}

	/**
	 * Get data for a specific collection given collection slug.
	 *
	 * @param WP_REST_Request $request REST request.
	 */
	protected function get_collection_posts_by_slug( $request ) {
		if ( ! isset( $request['id'] ) ) {
			$slug = $request->get_param( 'slug' );
			if ( $slug ) {
				$posts = get_posts(
					[
						'numberposts' => 1,
						'post_type'   => WPM_PREFIX . 'collection',
						'post_status' => 'publish',
						'name'        => sanitize_text_field( $slug ),
					]
				);
				if ( 1 === count( $posts ) ) {
					$post_id = $posts[0]->ID;
				} else {
					return null;
				}
			} else {
				return null;
			}
		} else {
			$post_id = $request['id'];
		}

		return $this->get_post( $post_id );
	}

	/**
	 * Get data for a specific collection.
	 *
	 * @param WP_Post $post A collection post.
	 */
	protected function get_collection_data( $post ) {
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		$post_data                       = combine_post_data( $post->ID );
		$associated_objects              = get_associated_object_ids( $post->ID );
		$post_data['associated_objects'] = $associated_objects;
		$post_data['featured_image']     = get_collection_featured_image( $post->ID );

		return $post_data;
	}

	/**
	 * Gets a single museum collection.
	 *
	 * @see WP_REST_Posts_Controller::get_item
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 * @return WP_REST_Response|WP_Error Response object on success, or WP_Error object on failure.
	 */
	public function get_item( $request ) {
		$post = $this->get_post( $request['id'] );

		if ( is_wp_error( $post ) ) {
			return $post;
		}

		$data     = $this->get_collection_data( $post );
		$response = $this->prepare_item_for_response( $data, $request );
		return $response;
	}

	/**
	 * Retrieve collections.
	 *
	 * @param WP_REST_Request $request The REST Request object.
	 * @return WP_REST_Response|WP_Error Response object on success, or WP_Error object on failure.
	 */
	public function get_items( $request ) {
		if ( ! empty( $request->get_param( 'slug' ) ) ) {
			$query_result = $this->get_collection_posts_by_slug( $request );
		}

		$paged = $request->get_param( 'page' );
		if ( empty( $paged ) ) {
			$paged = 1;
		}

		$per_page = $request->get_param( 'per_page' );
		if ( empty( $per_page ) ) {
			$per_page = DEFAULT_NUMBERPOSTS;
		}

		$args = [
			'post_status'      => 'publish',
			'paged'            => $paged,
			'post_type'        => WPM_PREFIX . 'collection',
			'suppress_filters' => false,
			'posts_per_page'   => $per_page,
		];

		$search_string = $request->get_param( 's' );
		if ( ! empty( $search_string ) ) {
			$args['s'] = $search_string;
		}
		$title_search = $request->get_param( 'post_title' );
		if ( ! empty( $title_search ) ) {
			$args['post_title'] = $title_search;
		}

		// If tags param is set, do a taxonomy query that finds collections with
		// the corresponding tags. There are two special tags: _all, which when
		// set matches all tags (bypassing the tax query); and _untagged, which
		// matches collections that have no tags set.
		$tag_list = $request->get_param( 'tags' );
		if ( ! empty( $tag_list ) ) {
			$tag_array = explode( ',', $tag_list );
			if ( ! in_array( '_all', $tag_array, true ) ) {
				if ( in_array( '_untagged', $tag_array, true ) ) {
					unset( $tag_array['_untagged'] );
					$all_terms = get_terms(
						[
							'taxonomy'   => 'collection_tag',
							'hide_empty' => false,
						]
					);

					$all_tags = array_map(
						function ( $a ) {
							return $a->slug;
						},
						$all_terms
					);

					if ( count( $tag_array ) > 1 ) {
						//phpcs:ignore WordPress.DB.SlowDBQuery
						$args['tax_query'] = [
							'relation' => 'OR',
							[
								'taxonomy' => 'collection_tag',
								'field'    => 'slug',
								'terms'    => $tag_array,
							],
							[
								'taxonomy' => 'collection_tag',
								'field'    => 'slug',
								'terms'    => $all_tags,
								'operator' => 'NOT IN',
							],
						];
					} else {
						//phpcs:ignore WordPress.DB.SlowDBQuery
						$args['tax_query'] = [
							[
								'taxonomy' => 'collection_tag',
								'field'    => 'slug',
								'terms'    => $all_tags,
								'operator' => 'NOT IN',
							],
						];
					}
				} else {
					//phpcs:ignore WordPress.DB.SlowDBQuery
					$args['tax_query'] = [
						[
							'taxonomy' => 'collection_tag',
							'field'    => 'slug',
							'terms'    => $tag_array,
						],
					];
				}
			}
		}

		$posts_query  = new \WP_Query();
		$query_result = $posts_query->query( $args );
		$post_data    = [];

		foreach ( $query_result as $post ) {
			$data          = $this->get_collection_data( $post );
			$post_kind     = get_kind_from_typename( $post->post_type );
			$response_item = $this->prepare_item_for_response( $data, $request, $post_kind );
			$post_data[]   = $this->prepare_response_for_collection( $response_item );
		}

		/**
		 * Paging for response.
		 *
		 * @see WP_REST_Posts_Controller::get_items()
		 */
		$page        = (int) $args['paged'];
		$total_posts = $posts_query->found_posts;

		$max_pages = ceil( $total_posts / (int) $posts_query->query_vars['posts_per_page'] );

		if ( $page > $max_pages && $total_posts > 0 ) {
			return new \WP_Error(
				'rest_post_invalid_page_number',
				__( 'The page number requested is larger than the number of pages available.' ),
				array( 'status' => 400 )
			);
		}

		$response = rest_ensure_response( $post_data );

		$response->header( 'X-WP-Total', (int) $total_posts );
		$response->header( 'X-WP-TotalPages', (int) $max_pages );

		return $response;
	}

	/**
	 * Returns the public schema for collections.
	 *
	 * @return array The schema.
	 */
	public function get_public_item_schema() {
		return $this->get_item_schema();
	}

	/**
	 * Returns JSON schema for all museum collections.
	 *
	 * @return Array The schema.
	 */
	public function get_item_schema() {
		if ( $this->schema ) {
			return $this->schema;
		}

		$this->schema = [
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'museum-object',
			'type'       => 'object',
			'properties' => [
				'ID'                => [
					'description' => __( 'Unique identifier for the collection.' ),
					'type'        => 'integer',
					'context'     => [ 'view', 'edit', 'embed' ],
					'readonly'    => true,
				],
				'menu_order'        => [
					'description' => __( 'Order to display in menus.' ),
					'type'        => 'integer',
					'context'     => [ 'view', 'edit', 'embed' ],
					'readonly'    => false,
				],
				'post_author'       => [
					'description' => __( 'The ID for the author of the collection.' ),
					'type'        => 'integer',
					'context'     => [ 'view', 'edit', 'embed' ],
				],
				'post_date'         => [
					'description' => __( "The date the collection was published, in the site's timezone." ),
					'type'        => [ 'string', 'null' ],
					'format'      => 'date-time',
					'context'     => [ 'view', 'edit', 'embed' ],
				],
				'post_date_gmt'     => [
					'description' => __( 'The date the collection was published, as GMT.' ),
					'type'        => [ 'string', 'null' ],
					'format'      => 'date-time',
					'context'     => [ 'view', 'edit' ],
				],
				'post_content'      => [
					'description' => __( 'The rendered content for the collection.' ),
					'type'        => 'string',
					'context'     => [ 'view', 'edit' ],
				],
				'post_title'        => [
					'description' => __( 'The title of the collectiton.' ),
					'type'        => 'string',
					'context'     => [ 'view', 'edit', 'embed' ],
				],
				'excerpt'           => [
					'description' => __( 'The excerpt for the collection.' ),
					'type'        => 'string',
					'context'     => [ 'view', 'edit', 'embed' ],
				],
				'post_status'       => [
					'description' => __( 'A named status for the collectionn.' ),
					'type'        => 'string',
					'enum'        => array_keys( get_post_stati( [ 'internal' => false ] ) ),
					'context'     => [ 'view', 'edit' ],
				],
				'post_name'         => [
					'description' => __( 'An alphanumeric identifier for the object unique to its type.' ),
					'type'        => 'string',
					'context'     => [ 'view', 'edit', 'embed' ],
					'readonly'    => true,
				],
				'post_modified'     => [
					'description' => __( "The date the object was last modified, in the site's timezone." ),
					'type'        => 'string',
					'format'      => 'date-time',
					'context'     => [ 'view', 'edit' ],
					'readonly'    => true,
				],
				'post_modified_gmt' => [
					'description' => __( 'The date the object was last modified, as GMT.' ),
					'type'        => 'string',
					'format'      => 'date-time',
					'context'     => [ 'view', 'edit' ],
					'readonly'    => true,
				],
				'post_parent'       => [
					'description' => __( 'Post ID of parent post, if one exists.' ),
					'type'        => 'integer',
					'context'     => [ 'view', 'edit', 'embed' ],
					'readonly'    => true,
				],
				'post_type'         => [
					'description' => __( 'Type of Post for the object.' ),
					'type'        => 'string',
					'context'     => [ 'view', 'edit', 'embed' ],
					'readonly'    => true,
				],
				'link'              => [
					'description' => __( 'URL to the object.' ),
					'type'        => 'string',
					'format'      => 'uri',
					'context'     => [ 'view', 'edit', 'embed' ],
					'readonly'    => true,
				],
				'edit_link'         => [
					'description' => __( 'URL to the object edit page.' ),
					'type'        => [ 'string', 'null' ],
					'format'      => 'uri',
					'context'     => [ 'view', 'edit', 'embed' ],
					'readonly'    => true,
				],
				'thumbnail'         => [
					'description' => __( 'Data for thumbnail image of object: [URL, W, H, Resized?]' ),
					'type'        => 'array',
					'context'     => [ 'view', 'edit', 'embed' ],
					'readonly'    => true,
					'items'       => [
						[
							'type'   => 'string',
							'format' => 'uri',
						],
						[
							'type' => 'number',
						],
						[
							'type' => 'number',
						],
						[
							'type' => 'boolean',
						],
					],
				],
				'featured_image'    => [
					'description' => __( 'Data for featured image of collection, or of an object in the collection.' ),
					'type'        => 'array',
					'context'     => [ 'view', 'edit', 'embed' ],
					'readonly'    => true,
					'items'       => [
						[
							'type'   => 'string',
							'format' => 'uri',
						],
						[
							'type' => 'number',
						],
						[
							'type' => 'number',
						],
						[
							'type' => 'boolean',
						],
					],
				],
				'associated_ojects' => [
					'description' => __( 'List of IDs of museum objects associated with this collection.' ),
					'type'        => 'array',
					'context'     => [ 'view', 'edit', 'embed' ],
					'readonly'    => true,
					'items'       => [
						'type' => 'number',
					],
				],
				'taxonomies'        => [
					'description'          => __( 'Taxonomy terms associated with the collection.' ),
					'type'                 => 'object',
					'context'              => [ 'view', 'edit', 'embed' ],
					'readonly'             => true,
					'additionalProperties' => [
						'type'                 => 'object',
						'additionalProperties' => [
							'type' => 'string',
						],
					],
				],
			],
		];

		return $this->schema;
	}

	/**
	 * Retrieve museum objects associated with a collection term.
	 *
	 * @param WP_REST_Request $request The REST Request object.
	 * @return WP_REST_Response|WP_Error Response object on success, or WP_Error object on failure.
	 */
	public function get_collection_term_items( $request ) {
		$term_id = $request['id'];

		if ( current_user_can( 'edit_posts' ) ) {
			$associated_objects = get_collection_term_objects( $term_id, 'any', $request['include_children'] );
		} else {
			$associated_objects = get_collection_term_objects( $term_id, 'publish', $request['include_children'] );
		}

		$object_data = [];
		$objects_controller = new Objects_Controller();

		foreach ( $associated_objects as $post ) {
			$data          = combine_post_data( $post );
			$post_kind     = get_kind_from_typename( $post->post_type );
			$response_item = $objects_controller->prepare_item_for_response( $data, $request, $post_kind );
			$object_data[] = $objects_controller->prepare_response_for_collection( $response_item );
		}

		$response = rest_ensure_response( $object_data );

		return $response;
	}
}
