<?php
/**
 * Controller class for museum object fields.
 *
 * Registers the following route:
 * /<object type>/fields             All fields for <object type>.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

/**
 * A singleton class for registering museum object kind field endpoints.
 */
class Object_Fields_Controller extends \WP_REST_Controller {
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
		$kinds = get_mobject_kinds();
		foreach ( $kinds as $kind ) {
			/**
			 * /<object type>/fields             All fields for <object type>.
			 */
			register_rest_route(
				$this->namespace,
				$kind->type_name . '/fields',
				[
					[
						'methods'             => \WP_REST_Server::READABLE,
						'permission_callback' => [ $this, 'get_items_permission_check' ],
						'callback'            => function ( $request ) use ( $kind ) {
							return $this->get_items( $request, $kind );
						},
					],
					[
						'methods'             => \WP_REST_Server::EDITABLE,
						'permission_callback' => [ $this, 'edit_items_permission_check' ],
						'callback'            => [ $this, 'update_items' ],
					],
					'schema' => [ $this, 'get_item_schema' ],
				]
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
	 * Check whether visitor has permission to update items from the API. Only
	 * administrators should be able to update the structure of object fields.
	 *
	 * @param WP_REST_Request $request The REST Request object.
	 */
	public function edit_items_permission_check( $request ) {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Retrieves field data for an object type.
	 *
	 * @param WP_REST_Request $request The REST Request object.
	 * @param MObjectKind     $kind    The kind of object to retrieve fields for.
	 */
	public function get_items( $request, $kind = null ) {
		if ( ! $kind ) {
			return new \WP_Error(
				'rest-fields-no-kind',
				'Attempted to retrieve fields for null kind.'
			);
		}
		$fields          = get_mobject_fields( $kind->kind_id );
		$filtered_fields = [];
		foreach ( $fields as $field ) {
			if ( $field->public || current_user_can( 'edit_posts' ) ) {
				$response_item =
					$this->prepare_item_for_response( $field->to_array(), $request );

				$filtered_fields[ $field->field_id ] =
					$this->prepare_response_for_collection( $response_item );
			}
		}
		return rest_ensure_response( $filtered_fields );
	}

	/**
	 * Updates field data for an object type.
	 *
	 * We're going to get an array of fields to update. We instantiate each
	 * item as an MObjectField, and then update those fields in the database.
	 *
	 * TODO: return informative feedback when success is false.
	 *
	 * @param WP_REST_Request $request The REST Request object.
	 */
	public function update_items( $request ) {
		global $wpdb;
		$field_data     = json_decode( $request->get_body(), true );
		$success        = true;
		$failed_queries = [];
		foreach ( $field_data as $field_id => $field_object ) {
			$mobject_field = MObjectField::from_rest( $field_object );
			if ( isset( $field_object['delete'] ) && true === $field_object['delete'] ) {
				$mobject_field->delete_from_db();
			} elseif ( false === $mobject_field->save_to_db() ) {
				$success          = false;
				$failed_queries[] = $wpdb->last_query;
			}
		}
		return rest_ensure_response( $success );
	}

	/**
	 * Returns JSON schema for a museum object field.
	 */
	public function get_item_schema() {
		if ( $this->schema ) {
			return $this->schema;
		}

		$this->schema = [
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'museum-object-field',
			'type'       => 'object',
			'properties' => [
				'field_id'              => [
					'description' => __( 'Unique identifier for the field.' ),
					'type'        => 'integer',
					'context '    => [ 'view', 'edit' ],
					'readonly'    => true,
				],
				'slug'                  => [
					'description' => __( 'WordPress identifier for the field.' ),
					'type'        => 'string',
					'context '    => [ 'view', 'edit' ],
				],
				'kind_id'               => [
					'description' => __( 'Identifier of museum object kind associated with the field.' ),
					'type'        => 'integer',
					'context '    => [ 'view', 'edit' ],
				],
				'name'                  => [
					'description' => __( 'Label of this field for user display.' ),
					'type'        => 'string',
					'context '    => [ 'view', 'edit' ],
				],
				'type'                  => [
					'description' => __( 'Datatype of the field.' ),
					'type'        => 'string',
					'enum'        => [ 'plain', 'rich', 'date', 'factor', 'multiple', 'measure', 'flag' ],
					'context '    => [ 'view', 'edit' ],
				],
				'display_order'         => [
					'description' => __( 'Order in which to display this field in forms and the front end (ascending order).' ),
					'type'        => 'integer',
					'context '    => [ 'view', 'edit' ],
				],
				'public'                => [
					'description' => __( 'Whether this field is publicly-viewable on the front end.' ),
					'type'        => 'boolean',
					'context '    => [ 'view', 'edit' ],
				],
				'required'              => [
					'description' => __( 'Whether this field is required to be filled in when posts are published.' ),
					'type'        => 'boolean',
					'context '    => [ 'view', 'edit' ],
				],
				'quick_browse'          => [
					'description' => __( 'Whether this field is displayed in the Quick Browse table.' ),
					'type'        => 'boolean',
					'context '    => [ 'view', 'edit' ],
				],
				'help_text'             => [
					'description' => __( 'Help text for users filling in this field.' ),
					'type'        => 'string',
					'context '    => [ 'view', 'edit' ],
				],
				'detailed_instructions' => [
					'description' => __( 'Detailed instructions for editng the field.' ),
					'type'        => 'string',
					'context '    => [ 'view', 'edit' ],
				],
				'public_description'    => [
					'description' => __( 'Description of the field for visitors, to be displayed on the front end.' ),
					'type'        => 'string',
					'context '    => [ 'view', 'edit' ],
				],
				'field_schema'          => [
					'description' => __( 'Regular expression that this field must conform to. Also used for sorting.' ),
					'type'        => 'string',
					'format'      => 'regex',
					'context '    => [ 'view', 'edit' ],
				],
				'max_length'            => [
					'description' => __( 'Maximum length of field. Only applies to plain or rich type. 0 = no limit.' ),
					'type'        => 'integer',
					'context '    => [ 'view', 'edit' ],
				],
				'dimensions'            => [
					'description' => __( 'Number and labels for dimensions. Only applies to measure type.' ),
					'type'        => 'object',
					'properties'  => [
						'n'      => [
							'description' => __( 'Number of dimensions' ),
							'type'        => [ 'integer', 'null' ],
						],
						'labels' => [
							'description' => __( 'Labels for each dimension.' ),
							'type'        => 'array',
							'items'       => [
								'type' => 'string',
							],
						],
					],
					'context '    => [ 'view', 'edit' ],
				],
				'units'                 => [
					'description' => __( 'Measurement units (kg, cm, m, lbs, g, etc). Only applies to measure type.' ),
					'type'        => 'string',
					'context '    => [ 'view', 'edit' ],
				],
				'factors'               => [
					'description' => __( 'List of allowed factors for the field. Only applies to factor and multiple factor types.' ),
					'type'        => [ 'array' ],
					'items'       => [
						'type' => 'string',
					],
				],
			],
		];

		return $this->schema;
	}
}
