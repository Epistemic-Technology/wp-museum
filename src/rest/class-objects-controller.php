<?php
/**
 * Controller class for museum objects.
 *
 * Registers the following routes:
 *
 * /<object type>/[?s=|<field>=]     Objects with post type <object type>.
 * /<object type>/<post id>          Specific object.
 * /<object type>/<post id>/children Child objects of object.
 * /all/[?s=|<field>=]               All museum objects, regardless of type.
 * /all/<post id>                    Specific object.
 * /all/<post id>/children           Child objects of object.
 *
 * /search                           For advanced search of objects.
 *
 * /wp-json/wp-museum/v1/collections/<post id>/objects  Objects associated with a collection.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

/**
 * A singleton class for registering museum object endpoints.
 */
class Objects_Controller extends \WP_REST_Controller
{
    use Preparable_From_Schema {
        prepare_item_for_response as trait_prepare_item_for_response;
    }
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
    public function __construct()
    {
        $this->namespace = REST_NAMESPACE;
    }

    /**
     * Registers routes
     */
    public function register_routes()
    {
        /**
         * Endpoints for specific museum object kinds.
         */
        $kinds = get_mobject_kinds();

        foreach ($kinds as $kind) {
            /**
             * /<object type>/[?s=|<field>=]     Objects with post type <object type>.
             */
            register_rest_route($this->namespace, "/" . $kind->type_name, [
                [
                    "methods" => \WP_REST_Server::READABLE,
                    "permission_callback" => [
                        $this,
                        "get_items_permission_check",
                    ],
                    "callback" => function ($request) use ($kind) {
                        return $this->get_items($request, $kind);
                    },
                ],
                "schema" => function () use ($kind) {
                    return $this->get_item_schema_for_kind($kind);
                },
            ]);

            /**
             * /<object type>/<post id>          Specific object.
             */
            register_rest_route(
                $this->namespace,
                "/" . $kind->type_name . "/(?P<id>[\d]+)",
                [
                    [
                        "methods" => \WP_REST_Server::READABLE,
                        "permission_callback" => [
                            $this,
                            "get_items_permission_check",
                        ],
                        "args" => ["id" => $this->get_id_arg()],
                        "callback" => [$this, "get_item"],
                    ],
                    "schema" => [$this, "get_public_item_schema"],
                ]
            );

            /**
             * /<object type>/<post id>/children Child objects of object.
             */
            register_rest_route(
                $this->namespace,
                "/" . $kind->type_name . "/(?P<id>[\d]+)/children",
                [
                    [
                        "methods" => \WP_REST_Server::READABLE,
                        "permission_callback" => [
                            $this,
                            "get_items_permission_check",
                        ],
                        "args" => ["id" => $this->get_id_arg()],
                        "callback" => [$this, "get_object_children"],
                    ],
                    "schema" => [$this, "get_public_item_schema"],
                ]
            );
        }

        /**
         * Endpoints for all museum objects.
         */

        /**
         * /all/[?s=|<field>=]               All museum objects, regardless of type.
         */
        register_rest_route($this->namespace, "/all", [
            [
                "methods" => \WP_REST_Server::READABLE,
                "permission_callback" => [$this, "get_items_permission_check"],
                "callback" => [$this, "get_items"],
            ],
            "schema" => [$this, "get_public_item_schema"],
        ]);

        /**
         * /all/<post id>                    Specific object.
         */
        register_rest_route($this->namespace, "/all/(?P<id>[\d]+)", [
            [
                "methods" => \WP_REST_Server::READABLE,
                "permission_callback" => [$this, "get_items_permission_check"],
                "args" => ["id" => $this->get_id_arg()],
                "callback" => [$this, "get_item"],
            ],
            "schema" => [$this, "get_public_item_schema"],
        ]);

        /**
         * /all/<post id>/children           Child objects of object.
         */
        register_rest_route($this->namespace, "/all/(?P<id>[\d]+)/children", [
            [
                "methods" => \WP_REST_Server::READABLE,
                "permission_callback" => [$this, "get_items_permission_check"],
                "args" => ["id" => $this->get_id_arg()],
                "callback" => [$this, "get_object_children"],
            ],
            "schema" => [$this, "get_public_item_schema"],
        ]);

        /**
         * /search                           For advanced search of objects.
         *
         * Run an advanced search and return the result. Search parameters passed
         * through POST request.
         */
        register_rest_route($this->namespace, "/search", [
            [
                "methods" => [
                    \WP_REST_Server::READABLE,
                    \WP_REST_Server::CREATABLE,
                ],
                "permission_callback" => [$this, "get_items_permission_check"],
                "callback" => [$this, "get_items"],
            ],
            "schema" => [$this, "get_public_item_schema"],
        ]);

        /**
         * /wp-json/wp-museum/v1/collections/<post id>/objects  Objects associated with a collection.
         */
        register_rest_route(
            $this->namespace,
            "/collections/(?P<id>[\d]+)/objects",
            [
                [
                    "methods" => \WP_REST_Server::READABLE,
                    "permission_callback" => [
                        $this,
                        "get_items_permission_check",
                    ],
                    "args" => ["id" => $this->get_collection_id_arg()],
                    "callback" => [$this, "get_collection_items"],
                ],
                "schema" => [$this, "get_public_item_schema"],
            ]
        );
    }

    /**
     * Checks whether visitor has permission to get items from the API.
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
     * Arguments for Collection ID argument.
     */
    protected function get_collection_id_arg()
    {
        return $this->get_id_arg();
    }

    /**
     * Get the post, if the ID is valid.
     *
     * Copy-paste from @see class-wp-rest-posts-controller.php (4.7.2).
     *
     * @param int $id Supplied ID.
     * @return WP_Post|WP_Error Post object if ID is valid, WP_Error otherwise.
     */
    protected function get_post($id)
    {
        $error = new \WP_Error("rest_post_invalid_id", __("Invalid post ID."), [
            "status" => 404,
        ]);

        if ((int) $id <= 0) {
            return $error;
        }

        $post = get_post((int) $id);
        if (empty($post) || empty($post->ID)) {
            return $error;
        }

        return $post;
    }

    /**
     * Gets a single museum object post.
     *
     * @see WP_REST_Posts_Controller::get_item
     *
     * @param WP_REST_Request $request Full details about the request.
     * @return WP_REST_Response|WP_Error Response object on success, or WP_Error object on failure.
     */
    public function get_item($request)
    {
        $post = get_post_for_rest($request["id"]);

        if (is_wp_error($post)) {
            return $post;
        }

        $data = combine_post_data($post);
        $post_kind = get_kind_from_typename($post->post_type);
        $response = $this->prepare_item_for_response(
            $data,
            $request,
            $post_kind
        );

        return $response;
    }

    /**
     * Gets children of a child object.
     *
     * @param WP_REST_Request $request Full details about the request.
     * @return WP_REST_Response|WP_Error Response object on success, or WP_Error object on failure.
     */
    public function get_object_children($request)
    {
        $meta = get_post_meta(
            $request["id"],
            WPM_PREFIX . "child_objects",
            true
        );
        $data_array = [];
        if ($meta) {
            foreach ($meta as $kind_id => $object_ids) {
                $data_array[$kind_id] = [];
                if ($object_ids) {
                    foreach ($object_ids as $object_id) {
                        $data = combine_post_data($object_id);
                        $post_kind = get_kind_from_typename($data["post_type"]);
                        $response_item = $this->prepare_item_for_response(
                            $data,
                            $request,
                            $post_kind
                        );

                        $data_array[
                            $kind_id
                        ][] = $this->prepare_response_for_collection(
                            $response_item
                        );
                    }
                }
            }
        }
        return $data_array;
    }

    /**
     * Retrieve museum objects.
     *
     * @param WP_REST_Request $request The REST Request object.
     * @param Object_Kind     $kinds   If set, retrieve objects of only this kind.
     *
     * $request GET parameters:
     *  - s            Search title, content, fields for s.
     *  - post_title   Search just post title.
     *  - post_content Search just main post content.
     *  - <field>      Search a specific object field.
     */
    public function get_items($request, $kinds = null)
    {
        if (is_null($kinds)) {
            $kinds = get_mobject_kinds();
        } else {
            $kinds = [$kinds];
        }
        if (empty($kinds)) {
            return [];
        }

        $kind_type_list = array_map(function ($x) {
            return $x->type_name;
        }, $kinds);

        $paged = intval($request->get_param("page"));
        if (empty($paged)) {
            $paged = 1;
        }
        $per_page = intval($request->get_param("per_page"));
        if (empty($per_page)) {
            $per_page = DEFAULT_NUMBERPOSTS;
        }

        if (current_user_can("edit_posts")) {
            $post_status = "any";
            $public_fields_only = false;
        } else {
            $post_status = "publish";
            $public_fields_only = true;
        }
        $requested_status = sanitize_text_field($request->get_param("status"));
        if ($requested_status) {
            if ("any" === $requested_status && current_user_can("edit_posts")) {
                $post_status = "any";
            } elseif ("publish" === $requested_status) {
                $post_status = "publish";
            }
        }

        $query_args = [
            "post_type" => $kind_type_list,
            "post_status" => $post_status,
            "paged" => $paged,
            "posts_per_page" => $per_page,
            "suppress_filters" => false,
        ];
        if (!$request->get_param("onlyTitle", false)) {
            $kinds_field_slugs = [];
            foreach ($kinds as $kind) {
                $kind_fields = get_mobject_fields(
                    $kind->kind_id,
                    $public_fields_only
                );
                $field_slugs = array_map(function ($x) {
                    return $x->slug;
                }, $kind_fields);

                $kinds_field_slugs = array_merge(
                    $kinds_field_slugs,
                    $field_slugs
                );
            }
            $meta_query = ["relation" => "AND"];
            foreach ($kinds_field_slugs as $slug) {
                $field_query = sanitize_text_field($request->get_param($slug));
                if (substr($field_query, 0, 1) === "~") {
                    $comparator = "LIKE";
                    $field_query = substr($field_query, 1);
                } else {
                    $comparator = "=";
                }
                if (!empty($field_query)) {
                    $meta_query[] = [
                        "key" => $slug,
                        "value" => $field_query,
                        "compare" => $comparator,
                    ];
                }
            }
            if (count($meta_query) > 1) {
                //phpcs:ignore WordPress.DB.SlowDBQuery --Slow query is not avoidable.
                $query_args["meta_query"] = $meta_query;
            }
        }
        $search_string = sanitize_text_field($request->get_param("searchText"));
        if (!$search_string) {
            $search_string = sanitize_text_field($request->get_param("s"));
        }
        if ($search_string) {
            $query_args["s"] = $search_string;
            add_object_meta_query_filter(
                ["searchText" => $search_string],
                $kinds
            );
        }
        if ($request->get_param("onlyTitle", false)) {
            $query_args["search_columns"] = ["post_title"];
            $query_args["suppress_filters"] = true;
        }
        $title_query = sanitize_text_field($request->get_param("post_title"));
        if (!empty($title_query)) {
            $query_args["post_title"] = $title_query;
        }
        $content_query = sanitize_text_field(
            $request->get_param("post_content")
        );
        if (!empty($content_query) && !$request->get_param("onlyTitle")) {
            $query_args["post_content"] = $content_query;
        }

        // Filter by collection.
        $selected_collections = $request->get_param("selectedCollections");
        $tax_query = false;
        if (!empty($selected_collections) && is_array($selected_collections)) {
            // For collections that include sub-collections, we'll track them separately
            $include_children_terms = [];
            $regular_terms = [];

            foreach ($selected_collections as $collection_id) {
                $collection_id = intval($collection_id);
                $term_id = get_collection_term_id($collection_id);

                if ($term_id) {
                    // Check if this collection includes sub-collections
                    $include_sub_collections = get_post_meta(
                        $collection_id,
                        "include_sub_collections",
                        true
                    );

                    if ($include_sub_collections) {
                        $include_children_terms[] = intval($term_id);
                    } else {
                        $regular_terms[] = intval($term_id);
                    }
                }
            }

            // Build the tax query based on the two types of collections
            if (!empty($include_children_terms) || !empty($regular_terms)) {
                if (!empty($include_children_terms) && !empty($regular_terms)) {
                    // If we have both types, create a tax_query with two conditions
                    $tax_query = [
                        "relation" => "OR",
                        [
                            "taxonomy" => WPM_PREFIX . "collection_tax",
                            "field" => "term_id",
                            "terms" => $include_children_terms,
                            "include_children" => true,
                        ],
                        [
                            "taxonomy" => WPM_PREFIX . "collection_tax",
                            "field" => "term_id",
                            "terms" => $regular_terms,
                            "include_children" => false,
                        ],
                    ];
                } elseif (!empty($include_children_terms)) {
                    // Only collections that include children
                    $tax_query = [
                        "taxonomy" => WPM_PREFIX . "collection_tax",
                        "field" => "term_id",
                        "terms" => $include_children_terms,
                        "include_children" => true,
                    ];
                } else {
                    // Only regular collections
                    $tax_query = [
                        "taxonomy" => WPM_PREFIX . "collection_tax",
                        "field" => "term_id",
                        "terms" => $regular_terms,
                        "include_children" => false,
                    ];
                }
            }
        }

        if ($tax_query) {
            if (isset($query_args["tax_query"])) {
                $query_args["tax_query"][] = $tax_query;
            } else {
                $query_args["tax_query"] = [$tax_query];
            }
        }

        // Search by tag
        $tags = $request->get_param("selectedTags");
        if (!empty($tags) && is_array($tags)) {
            $query_args["tag_slug__in"] = $tags;
        }

        $posts_query = new \WP_Query();
        $query_result = $posts_query->query($query_args);
        $post_data = [];

        foreach ($query_result as $post) {
            $data = combine_post_data($post);
            $post_kind = get_kind_from_typename($post->post_type);
            $response_item = $this->prepare_item_for_response(
                $data,
                $request,
                $post_kind
            );
            $post_data[] = $this->prepare_response_for_collection(
                $response_item
            );
        }

        /**
         * Paging for response.
         *
         * @see WP_REST_Posts_Controller::get_items()
         */
        $page = (int) $query_args["paged"];
        $total_posts = $posts_query->found_posts;

        $max_pages = ceil(
            $total_posts / (int) $posts_query->query_vars["posts_per_page"]
        );

        if ($page > $max_pages && $total_posts > 0) {
            return new \WP_Error(
                "rest_post_invalid_page_number",
                __(
                    "The page number requested is larger than the number of pages available."
                ),
                ["status" => 400]
            );
        }

        $response = rest_ensure_response($post_data);

        $response->header("X-WP-Page", (int) $page);
        $response->header("X-WP-Total", (int) $total_posts);
        $response->header("X-WP-TotalPages", (int) $max_pages);

        return $response;
    }

    /**
     * Retrieve museum objects associated with a collection.
     *
     * @param WP_REST_Request $request The REST Request object.
     * @return WP_REST_Response|WP_Error Response object on success, or WP_Error object on failure.
     */
    public function get_collection_items($request)
    {
        if (current_user_can("edit_posts")) {
            $associated_objects = get_associated_objects("any", $request["id"]);
        } else {
            $associated_objects = get_associated_objects(
                "publish",
                $request["id"]
            );
        }

        $object_data = [];
        foreach ($associated_objects as $post) {
            $data = combine_post_data($post);
            $post_kind = get_kind_from_typename($post->post_type);
            $response_item = $this->prepare_item_for_response(
                $data,
                $request,
                $post_kind
            );
            $object_data[] = $this->prepare_response_for_collection(
                $response_item
            );
        }

        $response = rest_ensure_response($object_data);

        return $response;
    }

    /**
     * Returns JSON schema for all museum objects.
     *
     * @return Array The schema.
     */
    public function get_item_schema()
    {
        return $this->get_item_schema_for_kind();
    }

    /**
     * Returns JSON schema for a museum object response.
     *
     * @see https://developer.wordpress.org/rest-api/extending-the-rest-api/schema/
     * @see https://developer.wordpress.org/rest-api/extending-the-rest-api/controller-classes/
     *
     * @param Object_Kind $kind    Kind for fields schema, or null for combined.
     * @return Array Array respresentation of JSON schema.
     */
    protected function get_item_schema_for_kind($kind = null)
    {
        if ($this->schema) {
            return $this->schema;
        }

        if ($kind) {
            $kinds = [$kind];
        } else {
            $kinds = get_mobject_kinds();
        }

        /**
         * For properties that are part of regular posts (ID, post_author, content, etc.), schema is
         * cut-and-pasted from WordPress core (@see class-wp-rest-posts-controller.php).
         */
        $this->schema = [
            '$schema' => "http://json-schema.org/draft-04/schema#",
            "title" => "museum-object",
            "type" => "object",
            "properties" => [
                "ID" => [
                    "description" => __("Unique identifier for the object."),
                    "type" => "integer",
                    "context" => ["view", "edit", "embed"],
                    "readonly" => true,
                ],
                "post_title" => [
                    "description" => __("Title of the object."),
                    "type" => "string",
                    "context" => ["view", "edit", "embed"],
                ],
                "post_author" => [
                    "description" => __("The ID for the author of the object."),
                    "type" => "integer",
                    "context" => ["view", "edit", "embed"],
                ],
                "post_date" => [
                    "description" => __(
                        "The date the object was published, in the site's timezone."
                    ),
                    "type" => ["string", "null"],
                    "format" => "date-time",
                    "context" => ["view", "edit", "embed"],
                ],
                "post_date_gmt" => [
                    "description" => __(
                        "The date the object was published, as GMT."
                    ),
                    "type" => ["string", "null"],
                    "format" => "date-time",
                    "context" => ["view", "edit"],
                ],
                "post_content" => [
                    "description" => __("The rendered content for the object."),
                    "type" => "string",
                    "context" => ["view", "edit"],
                ],
                "excerpt" => [
                    "description" => __("The excerpt for the object."),
                    "type" => "string",
                    "context" => ["view", "edit", "embed"],
                ],
                "post_status" => [
                    "description" => __("A named status for the object."),
                    "type" => "string",
                    "enum" => array_keys(get_post_stati(["internal" => false])),
                    "context" => ["view", "edit"],
                ],
                "post_name" => [
                    "description" => __(
                        "An alphanumeric identifier for the object unique to its type."
                    ),
                    "type" => "string",
                    "context" => ["view", "edit", "embed"],
                    "readonly" => true,
                ],
                "post_modified" => [
                    "description" => __(
                        "The date the object was last modified, in the site's timezone."
                    ),
                    "type" => "string",
                    "format" => "date-time",
                    "context" => ["view", "edit"],
                    "readonly" => true,
                ],
                "post_modified_gmt" => [
                    "description" => __(
                        "The date the object was last modified, as GMT."
                    ),
                    "type" => "string",
                    "format" => "date-time",
                    "context" => ["view", "edit"],
                    "readonly" => true,
                ],
                "post_type" => [
                    "description" => __("Type of Post for the object."),
                    "type" => "string",
                    "context" => ["view", "edit", "embed"],
                    "readonly" => true,
                ],
                "link" => [
                    "description" => __("URL to the object."),
                    "type" => "string",
                    "format" => "uri",
                    "context" => ["view", "edit", "embed"],
                    "readonly" => true,
                ],
                "edit_link" => [
                    "description" => __("URL to the object edit page."),
                    "type" => ["string", "null"],
                    "format" => "uri",
                    "context" => ["view", "edit", "embed"],
                    "readonly" => true,
                ],
                "thumbnail" => [
                    "description" => __(
                        "Data for thumbnail image of object: [URL, W, H, Resized?]"
                    ),
                    "type" => "array",
                    "context" => ["view", "edit", "embed"],
                    "readonly" => true,
                    "items" => [
                        [
                            "description" => __("Image URL."),
                            "type" => "string",
                            "format" => "uri",
                        ],
                        [
                            "description" => __("Image width."),
                            "type" => "number",
                        ],
                        [
                            "description" => __("Image height"),
                            "type" => "number",
                        ],
                        [
                            "description" => __(
                                "Is this version resized from original?"
                            ),
                            "type" => "boolean",
                        ],
                    ],
                ],
                "cat_field" => [
                    "description" => __(
                        "Slug for museum object field that is used as unique identifier for the object."
                    ),
                    "type" => "string",
                    "context" => ["view", "edit", "embed"],
                ],
                "collections" => [
                    "description" => __(
                        "Collection terms associated with this object."
                    ),
                    "type" => "object",
                    "context" => ["view", "edit", "embed"],
                    "readonly" => true,
                    "additionalProperties" => [
                        "type" => "string",
                    ],
                ],
            ],
        ];

        $merged_kind_properties = [];
        foreach ($kinds as $the_kind) {
            $kind_properties = $this->get_schema_properties_for_kind($the_kind);
            if (!$merged_kind_properties) {
                $merged_kind_properties = $kind_properties;
            } else {
                foreach ($kind_properties as $slug => $property_array) {
                    if (array_key_exists($slug, $merged_kind_properties)) {
                        if (
                            array_key_exists(
                                "anyOf",
                                $merged_kind_properties[$slug]
                            )
                        ) {
                            $merged_kind_properties[$slug][
                                "anyOf"
                            ][] = $property_array;
                        } else {
                            $merged_kind_properties[$slug]["anyOf"] = [
                                $merged_kind_properties[$slug],
                                $property_array,
                            ];
                        }
                    } else {
                        $merged_kind_properties[$slug] = $property_array;
                    }
                }
            }
        }
        $this->schema["properties"] = array_merge(
            $this->schema["properties"],
            $merged_kind_properties
        );

        return $this->schema;
    }

    /**
     * Gets JSON schema properties for a specific kind.
     *
     * @param Object_Kind $kind The kind.
     */
    protected function get_schema_properties_for_kind($kind)
    {
        $mobject_fields = $kind->get_fields();

        $properties = [];
        foreach ($mobject_fields as $field) {
            $properties[$field->slug] = [
                "description" => $field->public_description,
                "context" => ["view", "edit", "embed"],
            ];

            switch ($field->type) {
                case "plain":
                case "rich":
                case "measure":
                    $properties[$field->slug]["type"] = "string";
                    break;
                case "date":
                    $properties[$field->slug]["type"] = "string";
                    $properties[$field->slug]["format"] = "date-time";
                    break;
                case "factor":
                    $properties[$field->slug]["type"] = "string";
                    $properties[$field->slug]["enum"] = $field->factors;
                    break;
                case "multiple":
                    $properties[$field->slug]["type"] = "array";
                    $properties[$field->slug]["items"] = [
                        "type" => "string",
                        "enum" => $field->factors,
                    ];
                    break;
                case "flag":
                    $properties[$field->slug]["type"] = "boolean";
                    break;
            }
        }

        return $properties;
    }

    /**
     * Prepares a museum object for response.
     *
     * @param WP_Post         $post    Post object.
     * @param WP_REST_Request $request Request object.
     * @param Object_Kind     $kind    Kind for fields schema, or null for combined.
     * @return WP_REST_Response Response object.
     */
    public function prepare_item_for_response($post, $request, $kind = null)
    {
        if (!$kind) {
            return $this->trait_prepare_item_for_response($post, $request);
        } else {
            $schema = $this->get_item_schema_for_kind($kind);
            return $this->trait_prepare_item_for_response(
                $post,
                $request,
                $schema
            );
        }
    }
}
