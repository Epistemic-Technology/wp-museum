<?php
/**
 * Functions for interfacing with the Collection post type.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

/**
 * Gets all posts of the Collection post type.
 *
 * @param string $post_status The post status of collections to retrieve.
 *
 * @return Array Array WP_Post.
 */
function get_collections($post_status = "any")
{
    $collections = get_posts([
        "numberposts" => -1,
        "post_status" => $post_status,
        "post_type" => WPM_PREFIX . "collection",
    ]);
    return $collections;
}

/**
 * Gets a collection by its slug.
 *
 * @param string $slug The slug of the collection to retrieve.
 *
 * @return \WP_Post|false The collection post or false if not found.
 */
function get_collection_by_slug(string $slug): \WP_Post|false
{
    $collections = get_posts([
        "numberposts" => 1,
        "post_status" => "publish",
        "post_type" => WPM_PREFIX . "collection",
        "name" => $slug,
    ]);
    if (count($collections) > 1) {
        trigger_error(
            "Multiple collections found with the same slug: " . $slug,
            E_USER_WARNING
        );
    }
    return $collections ? $collections[0] : false;
}

/**
 * Creates query containing all posts associated with the current collection.
 *
 * @param string $post_status    The the publication status of posts to retrieve.
 * @param int    $post_id        If set, retrieve posts associated with $post_id rather than the current $post.
 * @param bool   $show_all       If true, retrieve all posts rather than paged results.
 * @param int    $page_num       If set, retrieve specific page of results. Can also be set with $_GET['page'].
 *                               If not set, defaults to global query value.
 *
 * @return WP_Query              A WordPress query object containing the retrieved posts.
 *
 * @link https://developer.wordpress.org/reference/classes/wp_query/
 */
function query_associated_objects(
    $post_status = "publish",
    $post_id = null,
    $show_all = 0,
    $page_num = null
) {
    if (is_null($post_id)) {
        global $post;
        if (is_null($post)) {
            return null;
        }
        $post_id = $post->ID;
    }

    $mobject_kinds = get_object_type_names();
    if (empty($mobject_kinds)) {
        return null;
    }

    // Get the collection term ID associated with this collection post
    $collection_term_id = get_post_meta(
        $post_id,
        WPM_PREFIX . "collection_term_id",
        true
    );

    $auto_collection = get_post_meta($post_id, "auto_collection", true);
    if ($auto_collection) {
        $object_tags = get_post_meta($post_id, "object_tags", true);
        if (empty($object_tags)) {
            return null;
        }
        $tax_query = [
            [
                "taxonomy" => "post_tag",
                "field" => "slug",
                "terms" => $object_tags,
            ],
        ];
    } elseif (!$collection_term_id) {
        $associated_category = get_post_meta(
            $post_id,
            WPM_PREFIX . "associated_category",
            true
        );
        if (!$associated_category || -1 === $associated_category) {
            return null;
        }

        $include_child_categories = get_post_meta(
            $post_id,
            WPM_PREFIX . "include_child_categories",
            true
        );

        $tax_query = [
            [
                "taxonomy" => "category",
                "field" => "term_id",
                "terms" => $associated_category,
                "include_children" => $include_child_categories,
            ],
        ];
    } else {
        // Use the collection taxonomy
        $include_child_categories = get_post_meta(
            $post_id,
            WPM_PREFIX . "include_child_categories",
            true
        );

        $tax_query = [
            [
                "taxonomy" => WPM_PREFIX . "collection_tax",
                "field" => "term_id",
                "terms" => $collection_term_id,
                "include_children" => $include_child_categories,
            ],
        ];
    }

    $include_sub_collections = get_post_meta(
        $post_id,
        WPM_PREFIX . "include_sub_collections",
        true
    );
    if ($include_sub_collections) {
        $sub_collections = get_posts([
            "post_type" => WPM_PREFIX . "collection",
            "post_parent" => $post_id,
            "numberposts" => -1,
        ]);
        foreach ($sub_collections as $sub_collection) {
            $sub_query = query_associated_objects(
                $post_status,
                $sub_collection->ID,
                1
            );
            if (!is_null($sub_query)) {
                $sub_posts = $sub_query->posts;
                foreach ($sub_posts as $sub_post) {
                    $sub_post_ids[] = $sub_post->ID;
                }
            }
        }
    }

    $display_options = get_option(WPM_PREFIX . "display_options");
    if (1 === $show_all) {
        $collection_query = new \WP_Query([
            "tax_query" => $tax_query,
            "posts_per_page" => -1,
            "post_status" => $post_status,
            "post_type" => $mobject_kinds,
        ]);
    } else {
        if (is_null($page_num) && isset($_GET["page"])) {
            $page_num = intval($_GET["page"]);
        } else {
            $page_num = get_query_var("page");
        }
        if (isset($display_options["posts_per_page"])) {
            $posts_per_page = $display_options["posts_per_page"];
        } else {
            $posts_per_page = DEF_POSTS_PER_PAGE;
        }
        $collection_query = new \WP_Query([
            "tax_query" => $tax_query,
            "posts_per_page" => $posts_per_page,
            "paged" => $page_num,
            "post_status" => $post_status,
            "post_type" => $mobject_kinds,
        ]);
    }
    return $collection_query;
}

/**
 * Retrieves all posts associated with the current collection.
 *
 * @param string   $post_status The publication status of the posts to retrieve.
 * @param int|null $post_id     Collection's post_id.
 *
 * @return [Post]   Array of posts associated with the current collection.
 */
function get_associated_objects($post_status = "publish", $post_id = null)
{
    $query = query_associated_objects($post_status, $post_id);
    if (!is_null($query)) {
        return $query->posts;
    }
    return [];
}

/**
 * Retrieves post ids of all posts associated with a collection.
 *
 * @param int    $post_id        The post id of the collection.
 * @param string $post_status    The publication status of the posts to retrieve.
 *
 * @return [int]    Array of post ids associated with the collection.
 */
function get_associated_object_ids($post_id, $post_status = "publish")
{
    $query = query_associated_objects($post_status, $post_id, 1);
    if (!is_null($query)) {
        $post_ids = array_map(function ($element) {
            return $element->ID;
        }, $query->posts);
        return $post_ids;
    }
    return [];
}

/**
 * Retrieves all collections that a post is associated with.
 *
 * @param int $post_id    The id of the post.
 *
 * @return Array  Array of collection posts that the current post is associated with.
 */
function get_object_collections($post_id)
{
    // Get the collection terms associated with this object
    $collection_terms = get_object_collection_terms($post_id);
    if (empty($collection_terms)) {
        return [];
    }

    // Get the collection posts that correspond to these terms
    $collection_posts = [];
    foreach ($collection_terms as $term) {
        // Find the collection post that corresponds to this term
        $args = [
            "post_type" => WPM_PREFIX . "collection",
            "post_status" => "publish",
            "posts_per_page" => 1,
            "meta_query" => [
                [
                    "key" => WPM_PREFIX . "collection_term_id",
                    "value" => $term->term_id,
                ],
            ],
        ];

        $query = new \WP_Query($args);
        if ($query->have_posts()) {
            $collection_posts[] = $query->posts[0];
        }
    }

    return $collection_posts;
}

/**
 * Retrieves links to all collections that a post is associated with.
 *
 * @param int    $post_id        The id of the post.
 * @param string $separator      String separating each link.
 *
 * @return string   Html string containing links to each collection.
 */
function object_collections_string(int $post_id, string $separator = "")
{
    return object_collection_terms_string($post_id, $separator);
}

/**
 * Callback to redirect collection taxonomy term archives.
 *
 * If collection_override_taxonomy option is set, redirect collection taxonomy term
 * archives to the corresponding collection post instead.
 */
function collection_redirect()
{
    global $wp_query;

    // Check if we're on a collection taxonomy term archive
    if (
        is_null($wp_query->queried_object) ||
        WPM_PREFIX . "collection_tax" !== $wp_query->queried_object->taxonomy
    ) {
        return;
    }

    // Check if the option to override taxonomy archives is enabled
    if (!get_option(WPM_PREFIX . "collection_override_taxonomy", false)) {
        return;
    }

    // Get the term ID
    $term_id = $wp_query->queried_object->term_id;

    // Find the collection post that corresponds to this term
    $args = [
        "post_type" => WPM_PREFIX . "collection",
        "post_status" => "publish",
        "posts_per_page" => 1,
        "meta_query" => [
            [
                "key" => WPM_PREFIX . "collection_term_id",
                "value" => $term_id,
            ],
        ],
    ];

    $query = new \WP_Query($args);
    if ($query->have_posts()) {
        wp_safe_redirect(get_permalink($query->posts[0]->ID), 308);
        exit();
    }
}

/**
 * Get url of featured image for a collection.
 *
 * If the collection post has a featured image, return that. Otherwise, get an
 * image from one of the collection objects.
 *
 * @param int $post_id        The id of the post.
 *
 * @return Array Image data of featured image or image from collection object.
 */
function get_collection_featured_image($post_id)
{
    $image_id = get_post_thumbnail_id($post_id);
    if ($image_id) {
        return wp_get_attachment_image_src($image_id, "medium");
    }

    // Get the term ID that corresponds to this collection post
    $term_id = get_post_meta($post_id, WPM_PREFIX . "collection_term_id", true);
    if (empty($term_id)) {
        return false;
    }

    // Get objects associated with this collection term
    $associated_objects = get_collection_term_objects(
        $term_id,
        "publish",
        false
    );

    foreach ($associated_objects as $object) {
        $image_attachments = get_object_image_attachments($object->ID);
        if (count($image_attachments) > 0) {
            foreach ($image_attachments as $image_attach_id => $sort_order) {
                return wp_get_attachment_image_src($image_attach_id, "medium");
            }
        }
    }

    return false;
}

/**
 * Get the taxonomy term ID associated with a collection.
 *
 * @param int $collection_id The collection post ID.
 * @return int|false The term ID if found, false otherwise.
 */
function get_collection_term_id($collection_id)
{
    return get_post_meta(
        $collection_id,
        WPM_PREFIX . "collection_term_id",
        true
    );
}

/**
 * Create a taxonomy term for a collection if it doesn't exist.
 *
 * @param int $collection_id The collection post ID.
 * @return int|WP_Error The term ID on success, WP_Error on failure.
 */
function ensure_collection_has_term($collection_id)
{
    // Check if the collection already has a term
    $term_id = get_collection_term_id($collection_id);
    if ($term_id) {
        return $term_id;
    }

    // Get the collection post
    $collection = get_post($collection_id);
    if (!$collection || WPM_PREFIX . "collection" !== $collection->post_type) {
        return new \WP_Error("invalid_collection", "Invalid collection post.");
    }

    // Get parent term ID if the collection has a parent
    $parent_term_id = 0;
    if ($collection->post_parent) {
        $parent_term_id = get_collection_term_id($collection->post_parent);
    }

    // Create a term for this collection
    $result = wp_insert_term(
        $collection->post_title,
        WPM_PREFIX . "collection_tax",
        [
            "slug" => $collection->post_name,
            "parent" => $parent_term_id ? $parent_term_id : 0,
        ]
    );

    if (is_wp_error($result)) {
        return $result;
    }

    $term_id = $result["term_id"];

    // Store the term ID in the collection post meta
    update_post_meta(
        $collection_id,
        WPM_PREFIX . "collection_term_id",
        $term_id
    );

    return $term_id;
}

/**
 * Add an object to a collection.
 *
 * @param int $object_id The object post ID.
 * @param int $collection_id The collection post ID.
 * @return bool|WP_Error True on success, WP_Error on failure.
 */
function add_object_to_collection($object_id, $collection_id)
{
    // Ensure the collection has a term
    $term_id = ensure_collection_has_term($collection_id);
    if (is_wp_error($term_id)) {
        return $term_id;
    }

    // Add the object to the collection term
    return wp_set_object_terms(
        $object_id,
        $term_id,
        WPM_PREFIX . "collection_tax",
        true // Append to existing terms
    );
}

/**
 * Remove an object from a collection.
 *
 * @param int $object_id The object post ID.
 * @param int $collection_id The collection post ID.
 * @return bool|WP_Error True on success, WP_Error on failure.
 */
function remove_object_from_collection($object_id, $collection_id)
{
    // Get the collection term ID
    $term_id = get_collection_term_id($collection_id);
    if (!$term_id) {
        return new \WP_Error("no_term", "Collection has no associated term.");
    }

    // Get current terms
    $terms = wp_get_object_terms($object_id, WPM_PREFIX . "collection_tax", [
        "fields" => "ids",
    ]);
    if (is_wp_error($terms)) {
        return $terms;
    }

    // Remove the specified term
    $terms = array_diff($terms, [$term_id]);

    // Update the object's terms
    return wp_set_object_terms(
        $object_id,
        $terms,
        WPM_PREFIX . "collection_tax"
    );
}
