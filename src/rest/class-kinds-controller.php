<?php
/**
 * Controller class for museum kinds.
 *
 * Registers the following routes:
 *
 * /mobject_kinds                  Object kinds
 * /mobject_kinds/<object type>    A specific kind with <object type>.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

/**
 * A singleton class for registering museum kind endpoints.
 */
class Kinds_Controller extends \WP_REST_Controller
{
    use Preparable_From_Schema;

    /**
     * The REST namespace (relavtive to /wp-json/)
     *
     * @var string $namespace
     */
    protected $namespace;

    /**
     * Cached public schema for museum kinds.
     *
     * @var Array $public_schema
     */
    protected $public_schema;

    /**
     * Cached private schema for museum kinds.
     *
     * @var Array $private_schema
     */
    protected $private_schema;

    /**
     * Default constructor
     */
    public function __construct()
    {
        $this->namespace = REST_NAMESPACE;
    }

    /**
     * Registers routes
     */
    public function register_routes()
    {
        $kinds = get_mobject_kinds();

        /**
         * /mobject_kinds                  Object kinds
         */
        register_rest_route($this->namespace, "/mobject_kinds/", [
            [
                "methods" => \WP_REST_Server::READABLE,
                "permission_callback" => [$this, "get_items_permission_check"],
                "callback" => [$this, "get_items"],
            ],
            [
                "methods" => \WP_REST_Server::EDITABLE,
                "permission_callback" => [
                    $this,
                    "update_item_permission_check",
                ],
                "callback" => [$this, "update_items"],
            ],
            "schema" => [$this, "get_item_schema"],
        ]);

        /**
         * /wp-json/wp-museum/v1/mobject_kinds/<object type> - Data for a specific kind with <object type>.
         */
        foreach ($kinds as $kind) {
            register_rest_route(
                $this->namespace,
                "/mobject_kinds/" . $kind->type_name,
                [
                    [
                        "methods" => \WP_REST_Server::READABLE,
                        "permission_callback" => [
                            $this,
                            "get_items_permission_check",
                        ],
                        "callback" => function ($request) use ($kind) {
                            return $this->get_item($request, $kind);
                        },
                    ],
                    "schema" => [$this, "get_item_schema"],
                ]
            );
        }
    }

    /**
     * Checks whether user has permission to get items from the API.
     *
     * Note: all read endpoints from the API are public, but private fields
     * will only be added to the response if user has appropriate permissions.
     *
     * @param WP_REST_Request $request The REST Request object.
     */
    public function get_items_permission_check($request)
    {
        return true;
    }

    /**
     * Checks whether user has permission to update items from the API.
     *
     * Currently only logged in users with Admin priviledges are allowed to
     * edit object kinds.
     *
     * @param WP_REST_Request $request The REST Request object.
     */
    public function update_item_permission_check($request = null)
    {
        return current_user_can("manage_options");
    }

    /**
     * Retreive museum object kinds.
     *
     * @param WP_REST_Request $request The REST Request object.
     * @param Object_Kind     $kind   If set, retrieve objects of only this kind.
     *
     * @return WP_REST_Response|WP_Error Response object on success, or WP_Error object on failure.
     */
    public function get_items($request, $kind = null)
    {
        $kinds_array = [];

        if (!$kind) {
            $kinds = get_mobject_kinds();
        } else {
            $kinds = [$kind];
        }

        foreach ($kinds as $kind) {
            if (current_user_can("edit_posts")) {
                $response_item = $this->prepare_item_for_response(
                    $kind->to_rest_array(),
                    $request
                );
            } else {
                $response_item = $this->prepare_item_for_response(
                    $kind->to_public_rest_array(),
                    $request
                );
            }
            $kinds_array[] = $this->prepare_response_for_collection(
                $response_item
            );
        }

        return $kinds_array;
    }

    /**
     * Retrieve specific museum object kind.
     *
     * @param WP_REST_Request $request The REST Request object.
     * @param Object_Kind     $kind    The kind to retreive.
     *
     * @return WP_REST_Response|WP_Error Response object on success, or WP_Error object on failure.
     */
    public function get_item($request, $kind = null)
    {
        if (!$kind) {
            return new \WP_Error(
                "wpm-rest-bad-request",
                "Requested kind item but no kind spefified"
            );
        }

        if (current_user_can("edit_posts")) {
            $response_item = $this->prepare_item_for_response(
                $kind->to_rest_array(),
                $request
            );
        } else {
            $response_item = $this->prepare_item_for_response(
                $kind->to_public_rest_array(),
                $request
            );
        }

        return $response_item;
    }

    /**
     * Update museum object kinds.
     *
     * TODO: Currently if there are multiple kinds to update and the first one
     * fails, the function bails and the others aren't updated. Not sure this
     * is the best result. 13/3/2021
     *
     * @param WP_REST_Request $request The REST Request object.
     * The body of the request should contain updated properties for the kind.
     *
     * @return WP_REST_Response|WP_Error Response object on success, or
     * WP_Error object on failure.
     */
    public function update_items($request): \WP_REST_Response|\WP_Error
    {
        $request_body = $request->get_body();
        if ($request_body) {
            $updated_kinds = json_decode($request_body, false);
        } else {
            $updated_kinds = [];
        }
        if ($updated_kinds) {
            foreach ($updated_kinds as $kind_data) {
                $kind = new ObjectKind($kind_data);
                if (!$kind || !$kind->is_valid()) {
                    return new \WP_Error(
                        "rest_invalid_kind",
                        __("Invalid object kind data."),
                        [
                            "status" => 400,
                            "data" => [
                                "kind" => $kind_data,
                            ],
                        ]
                    );
                }
                if (isset($kind_data->delete) && true === $kind_data->delete) {
                    $kind->delete_from_db();
                } elseif (false === $kind->save_to_db()) {
                    return new \WP_Error(
                        "rest_cannot_update",
                        __("There was an error updating the object kind.")
                    );
                }
            }
        }
        return rest_ensure_response(true);
    }

    /**
     * Returns JSON schema for a museum object kind response.
     *
     * @see https://developer.wordpress.org/rest-api/extending-the-rest-api/schema/
     * @see https://developer.wordpress.org/rest-api/extending-the-rest-api/controller-classes/
     *
     * @return Array Array respresentation of JSON schema.
     */
    public function get_item_schema()
    {
        $public = !$this->update_item_permission_check();

        if ($public && $this->public_schema) {
            return $this->public_schema;
        } elseif (!$public && $this->private_schema) {
            return $this->private_schema;
        }

        $this->public_schema = [
            '$schema' => "http://json-schema.org/draft-04/schema#",
            "title" => "museum-kind",
            "type" => "object",
            "properties" => [
                "kind_id" => [
                    "description" => __("Unique identifier for the kind."),
                    "type" => "integer",
                    "context" => ["view", "edit"],
                    "readonly" => true,
                ],
                "cat_field_id" => [
                    "description" => __(
                        "Unique identifier of field that is used as unique identifier by users for museum objects of this kind."
                    ),
                    "type" => "integer",
                    "context" => ["view", "edit"],
                    "readonly" => false,
                ],
                "name" => [
                    "description" => __(
                        "Machine-readable name of kind. Derrived from label."
                    ),
                    "type" => "string",
                    "context" => ["view", "edit"],
                    "readonly" => true,
                ],
                "type_name" => [
                    "description" => __(
                        "WordPress custom post type name for this kind. Derrived from name."
                    ),
                    "type" => "string",
                    "context" => ["view", "edit"],
                    "readonly" => true,
                ],
                "label" => [
                    "description" => __("Human-readable name of kind."),
                    "type" => "string",
                    "context" => ["view", "edit"],
                    "readonly" => false,
                ],
                "label_plural" => [
                    "description" => __(
                        "Human-readable plural name of kind. User generated."
                    ),
                    "type" => "string",
                    "context" => ["view", "edit"],
                    "readonly" => false,
                ],
                "description" => [
                    "description" => __(
                        "Short, human-readible description of the kind."
                    ),
                    "type" => "string",
                    "context" => ["view", "edit"],
                    "readonly" => false,
                ],
                "categorized" => [
                    "description" => __(
                        "Whether museum objects of this kind must be assigned a category before publication."
                    ),
                    "type" => "boolean",
                    "context" => ["view", "edit"],
                    "readonly" => false,
                ],
                "hierarchical" => [
                    "description" => __(
                        "Whether posts of this kind can be hierarchical"
                    ),
                    "type" => "boolean",
                    "context" => ["view", "edit"],
                    "readonly" => false,
                ],
                "parent_kind_id" => [
                    "description" => __(
                        "Kind_id of parent kind. Setting this makes this a child kind."
                    ),
                    "type" => "integer",
                    "context" => ["view", "edit"],
                    "readonly" => false,
                ],
                "children" => [
                    "description" => __("Data for child kinds."),
                    "type" => "array",
                    "items" => [
                        "type" => "object",
                    ],
                    "context" => ["view", "edit"],
                    "readonly" => true,
                ],
                "available_fields_for_oai_pmh" => [
                    "description" => __(
                        "Available fields for OAI-PMH mapping including WordPress post fields."
                    ),
                    "type" => "array",
                    "items" => [
                        "type" => "object",
                        "properties" => [
                            "id" => [
                                "type" => "string",
                            ],
                            "slug" => [
                                "type" => "string",
                            ],
                            "name" => [
                                "type" => "string",
                            ],
                            "type" => [
                                "type" => "string",
                            ],
                        ],
                    ],
                    "context" => ["view", "edit"],
                    "readonly" => true,
                ],
                "oai_pmh_mappings" => [
                    "description" => __(
                        "OAI-PMH Dublin Core metadata field mappings for this kind."
                    ),
                    "type" => "object",
                    "context" => ["view", "edit"],
                    "readonly" => false,
                ],
            ],
        ];

        if ($public) {
            return $this->public_schema;
        } else {
            $private_schema_properties = [
                "must_featured_image" => [
                    "description" => __(
                        "Whether objects of this kind must have a featured image to be published."
                    ),
                    "type" => "boolean",
                    "context" => ["view", "edit"],
                    "readonly" => false,
                ],
                "must_gallery" => [
                    "description" => __(
                        "Whether objects of this kind must have an image gallery to be published."
                    ),
                    "type" => "boolean",
                    "context" => ["view", "edit"],
                    "readonly" => false,
                ],
                "strict_checking" => [
                    "description" => __(
                        "Whether violated requirements will prevent publishing objects or just report warnings."
                    ),
                    "type" => "boolean",
                    "context" => ["view", "edit"],
                    "readonly" => false,
                ],
                "exclude_from_search" => [
                    "description" => __(
                        "Whether objects of this kind should be excluded from searches."
                    ),
                    "type" => "boolean",
                    "context" => ["view", "edit"],
                    "readonly" => false,
                ],
            ];
            $this->private_schema = $this->public_schema;
            $this->private_schema["properties"] = array_merge(
                $this->public_schema["properties"],
                $private_schema_properties
            );
        }

        return $this->private_schema;
    }
}
