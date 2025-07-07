<?php
/**
 * Functions for interfacing with object post types.
 *
 * @package MikeThicke\WPMuseum
 * @see object_post_types.php
 */

namespace MikeThicke\WPMuseum;

/**
 * List of WordPress type names for all objects in database.
 *
 * @return Array List of WordPress custom post type names.
 */
function get_object_type_names(): array
{
    $mobject_kinds = get_mobject_kinds();
    $type_names = [];
    foreach ($mobject_kinds as $kind) {
        $type_names[] = $kind->type_name;
    }
    return $type_names;
}

/**
 * Get all Museum Object posts.
 *
 * @param string|null $type Retrieve objects of a specific type.
 * @param string      $post_status Publication status of posts to retrieve.
 *
 * @return [WP_POST] Array of posts with object post types.
 */
function get_object_posts($type = null, $post_status = "any")
{
    if ($type) {
        $post_types = [$type];
    } else {
        $post_types = get_object_type_names();
    }
    return get_posts([
        "numberposts" => -1,
        "post_type" => $post_types,
        "post_status" => $post_status,
    ]);
}

/**
 * Finds custom post object for a WordPress custom post type name.
 *
 * @param string $type_name The WordPress custom post type name.
 *
 * @return ObjectKind An object representing the museum object kind.
 */
function kind_from_type($type_name)
{
    $mobject_kinds = get_mobject_kinds();
    foreach ($mobject_kinds as $object_kind) {
        if ($object_kind->type_name === $type_name) {
            return $object_kind;
        }
    }
    return false;
}

/**
 * Finds museum object kind from a particular post.
 *
 * @param WP_Post $post_type A WordPress post with a custom post type.
 *
 * @return ObjectKind The kind of that object.
 */
function kind_from_post($post_type)
{
    return kind_from_type($post_type->post_type);
}

/**
 * Save object image gallery array.
 *
 * This function used to take an associative array of image_id => sort_order
 * but now just takes a simple ordered array.
 *
 * @param array $attached_image_array Ordered array of image ids.
 * @param int   $post_id The id of post containing the image gallery.
 *
 * @return bool  True if successful.
 */
function set_object_image_box_attachments($attached_image_array, $post_id)
{
    if (!is_array($attached_image_array)) {
        return false;
    }
    update_post_meta($post_id, "wpm_gallery_attach_ids", $attached_image_array);

    return true;
}

/**
 * Get image gallery array for an object.
 *
 * @param int $post_id The id of the post containing the image gallery.
 *
 * @return [int=>int] An array of image_id => sort_order
 */
function get_object_image_attachments($post_id)
{
    $attached_image_array = [];
    $attach_ids = get_post_meta($post_id, "wpm_gallery_attach_ids", true);
    if (!is_array($attach_ids)) {
        return [];
    }
    $attach_ids = array_map(function ($item) {
        return intval($item);
    }, $attach_ids);
    return array_flip($attach_ids);
}

/**
 * Displays fancybox thumbnails for all image attachments of a post.
 *
 * @param int $post_id The id of the post.
 */
function object_image_box_contents($post_id = null)
{
    global $post;
    if (is_null($post_id)) {
        if (is_null($post)) {
            return false;
        }
        $post_id = $post->ID;
    }

    $image_box_contents = get_object_image_attachments($post_id);
    if (!empty($image_box_contents)) {
        asort($image_box_contents);
        foreach ($image_box_contents as $image_id => $sort_order) {
            $image_thumbnail = wp_get_attachment_image_src(
                $image_id,
                "thumbnail"
            );
            $image_full = wp_get_attachment_image_src($image_id, "large");
            echo "<div id='image-div-" .
                esc_html($image_id) .
                "' class='inline-image-box'>";
            echo "<a data-fancybox='fbgallery' href='" .
                esc_html($image_full[0]) .
                "'><img src='" .
                esc_html($image_thumbnail[0]) .
                "' width=' " .
                esc_html($image_thumbnail[1]) .
                "' height='" .
                esc_html($image_thumbnail[2]) .
                "'></a>";
            echo "<a id='delete-" .
                esc_html($image_id) .
                "' class='wpm-image-delete' onclick='remove_image_attachment(" .
                esc_html($image_id) .
                "," .
                esc_html($post_id) .
                ")'>[x]</a>";
            echo "<a id='moveup-" .
                esc_html($image_id) .
                "' class='wpm-image-moveup' onclick='wpm_image_move(" .
                esc_html($image_id) .
                ", -1)'><span class='dashicons dashicons-arrow-left'></span></a>";
            echo "<a id='movedown-" .
                esc_html($image_id) .
                "' class='wpm-image-movedown' onclick='wpm_image_move(" .
                esc_html($image_id) .
                ", +1)'><span class='dashicons dashicons-arrow-right'></span></a>";
            echo "</div>";
        }
    }
}

/**
 * Gets all descendent posts (recursive children) of a post.
 *
 * @param int    $post_id        A post.
 * @param string $post_status    The publication status of descendent posts to retrieve.
 *
 * @return [WP_Post] Array of descendent posts.
 */
function get_post_descendants($post_id, $post_status = "publish")
{
    $parent_post = get_post($post_id);
    $descendants = [];
    $children = get_posts([
        "numberposts" => -1,
        "post_status" => $post_status,
        "post_type" => $parent_post->post_type,
        "post_parent" => $post_id,
    ]);
    foreach ($children as $child) {
        $grand_children = get_post_descendants($child->ID, $post_status);
        $descendants = array_merge($descendants, $grand_children);
    }
    $descendants = array_merge($descendants, $children);
    return $descendants;
}

/**
 * Returns the id of an object's thumbnail.
 *
 * @param integer $post_id ID of the current post.
 * @return integer the ID of the thumbnail or the first image.
 */
function object_thumbnail_id($post_id)
{
    if (has_post_thumbnail($post_id)) {
        $attach_id = get_post_thumbnail_id($post_id);
    } else {
        $attachments = get_attached_media("image", $post_id);
        if ($attachments) {
            $attachment = reset($attachments);
            $attach_id = $attachment->ID;
        }
    }

    if (isset($attach_id)) {
        return $attach_id;
    } else {
        return false;
    }
}

/**
 * Returns an object post from cat_id.
 *
 * @param ObjectKind / int $kind    Kind or kind id corresponding to the object.
 * @param string           $cat_id  The post's catalog id field.
 *
 * @return WP_POST A WordPress post matching that id, or null.
 */
function get_object_post_from_id($kind, $cat_id)
{
    if (is_int($kind)) {
        $kind = get_kind($kind);
    }
    $id_field = get_mobject_field($kind->kind_id, $kind->cat_field_id);

    $args = [
        "post_type" => $kind->type_name,
        "post_status" => "any",
        "meta_key" => $id_field->slug,
        "meta_value" => $cat_id,
    ];
    $posts = get_posts($args);
    if (1 === count($posts)) {
        return $posts[0];
    } else {
        return null;
    }
}

/**
 * Builds a meta query for a kind from a REST request.
 *
 * @param int    $kind_id Kind id corresponding to the object.
 * @param Object $request  A REST request object.
 *
 * @return Array Meta query that can be added to a WordPress query in the meta_query field.
 */
function build_meta($kind_id, $request)
{
    $mobject_fields = get_mobject_fields($kind_id);
    $meta_query = ["relation" => "AND"];
    foreach ($mobject_fields as $field) {
        $field_query = $request->get_param($field->slug);
        if (!empty($field_query) && $field->public) {
            $meta_query[] = [
                "key" => $field->slug,
                "value" => $field_query,
                "compare" => "LIKE",
            ];
        }
    }
    if (count($meta_query) > 1) {
        return $meta_query;
    } else {
        return [];
    }
}

/**
 * Gets thumbnail for object if there is one, or first image if not.
 *
 * @param int $post_id WordPress post_id of object.
 *
 * @return Array Array of image data [url, height, width] or [] if none.
 */
function get_object_thumbnail(int $post_id): array
{
    $attach_id = get_object_thumbnail_id($post_id);

    if ($attach_id !== false) {
        $img_data = wp_get_attachment_image_src($attach_id, "thumbnail");
    } else {
        $img_data = [];
    }

    return $img_data;
}

/**
 * Gets thumbnail ID for object if there is one, or first image ID if not.
 *
 * @param int $post_id WordPress post_id of object.
 *
 * @return int Thumbnail ID or 0 if none.
 */
function get_object_thumbnail_id(int $post_id): int|false
{
    $attach_id = false;

    $thumbnail_id = (int) get_post_meta($post_id, "_thumbnail_id", true);
    if ($thumbnail_id !== 0) {
        $attach_id = $thumbnail_id;
    } else {
        $attachments = get_object_image_attachments($post_id);
        if (count($attachments) > 0) {
            reset($attachments);
            $attach_id = key($attachments);
        }
    }

    return $attach_id;
}

/**
 * Do an advanced search of objects and return results.
 *
 * @param WP_REST_Request $request A REST POST request json encoded.
 */
function do_advanced_search($request)
{
    global $wpdb;

    $search_terms = $request->get_json_params();
    $post_status = "publish";

    if (isset($search_terms["page"])) {
        $paged = $search_terms["page"];
    } else {
        $paged = 1;
    }

    if (isset($search_terms["numberposts"])) {
        $number_posts = $search_terms["numberposts"];
    } elseif (isset($search_terms["posts_per_page"])) {
        $number_posts = $search_terms["posts_per_page"];
    } else {
        $number_posts = DEFAULT_NUMBERPOSTS;
    }

    if (isset($search_terms["selectedKind"])) {
        $kind = get_kind($search_terms["selectedKind"]);
    } else {
        $kinds = get_mobject_kinds();
        if (empty($kinds)) {
            return [];
        }
        $kind = $kinds[0];
    }

    $query_args = [
        "post_status" => $post_status,
        "paged" => $paged,
        "post_type" => $kind->type_name,
        "posts_per_page" => $number_posts,
        "suppress_filters" => false,
    ];

    if (!empty($search_terms["searchText"])) {
        if (empty($search_terms["onlyTitle"])) {
            $query_args["s"] = $search_terms["searchText"];
        } else {
            $query_args["post_title"] = $search_terms["searchText"];
        }
    }

    $included_categories = [];
    if (!empty($search_terms["selectedCollections"])) {
        foreach ($search_terms["selectedCollections"] as $collection_id) {
            $post_custom = get_post_custom($collection_id);
            if (!empty($post_custom["associated_category"])) {
                $included_categories = array_merge(
                    $included_categories,
                    $post_custom["associated_category"]
                );
            }
            if (
                isset($post_custom["include_sub_collections"]) &&
                "1" === $post_custom["include_sub_collections"][0]
            ) {
                $descendants = get_post_descendants(
                    $collection_id,
                    $post_status
                );
                foreach ($descendants as $descendant) {
                    $d_custom = get_post_custom($descendant->ID);
                    $included_categories = array_merge(
                        $included_categories,
                        $d_custom["associated_category"]
                    );
                }
            }
        }
    }
    if (!empty($included_categories)) {
        if (
            isset($post_custom["include_child_categories"]) &&
            "1" === $post_custom["include_child_categories"][0]
        ) {
            $query_args["cat"] = implode(",", $included_categories);
        } else {
            $query_args["category__in"] = $included_categories;
        }
    }

    add_object_meta_query_filter($search_terms, $kind);
    $search_query = new \WP_Query($query_args);
    $found_posts = $search_query->posts;
    $query_data = [
        "num_pages" => $search_query->max_num_pages,
        "current_page" => $search_query->get("paged", 1),
    ];
    return combine_post_data_array($found_posts, $query_data);
}

/**
 * Adds filters that alter the WordPress query to search meta fields.
 *
 * Search has do deal with post meta in three ways:
 *     (1) If not searching just the title, does meta value match search text?
 *     (2) Filter against checked flags.
 *     (3) Filter against search fields.
 *
 * The standard meta_query parameter only filters results, so it cannot
 * handle (1). Therefore we use WP_Meta_Query to generate the WHERE and
 * JOIN clauses for the meta query and then add them to the final query
 * using filters.
 *
 * First, if ! only_title, we construct (1), OR it to the existing WHERE clause,
 * and put parentheses around it.
 *
 * Then, we construct (2) and (3) with a different WP_Meta_Query object, and
 * AND that to the WHERE clause.
 *
 * Finally, we add the postmeta table to the JOIN clause.
 *
 * @param Array       $search_terms     Associative array of search terms.
 *        boolean     ['onlyTitle']     If true, don't search fields for main search text.
 *                                      (But will search boolean search terms.)
 *        string      ['searchText']    The main search text.
 *        [string]    ['selectedFlags'] Array of keys of meta fields that must be true.
 *        Array       ['searchFields']  Associative array of fields and values that filter search
 *                                      results.
 * @param Object_Kind $kind             Museum object kind to be searched, or array of kinds.
 *        [Object_Kind]
 *
 * Note: this function adds filters that alter the WordPress query, so it
 * shouldn't be called on any page that queries standard WordPress posts. It is
 * intended to support REST requests and should only be used in that context.
 */
function add_object_meta_query_filter($search_terms, $kind)
{
    return;
    global $wpdb;

    $search_all_fields_sql = [];
    $meta_fields_sql = [];
    if (current_user_can("edit_posts")) {
        $public_fields_only = false;
    } else {
        $public_fields_only = true;
    }
    if (
        empty($search_terms["onlyTitle"]) &&
        !empty($search_terms["searchText"])
    ) {
        $search_all_fields_args = [
            "relation" => "OR",
        ];

        if (is_array($kind)) {
            $mobject_fields = [];
            foreach ($kind as $single_kind) {
                $mobject_fields = array_merge(
                    $mobject_fields,
                    get_mobject_fields(
                        $single_kind->kind_id,
                        $public_fields_only
                    )
                );
            }
        } else {
            $mobject_fields = get_mobject_fields($kind->kind_id);
        }
        foreach ($mobject_fields as $field) {
            $search_all_fields_args[] = [
                "key" => $field->slug,
                "value" => $search_terms["searchText"],
                "compare" => "LIKE",
            ];
        }
        $search_all_fields_query = new \WP_Meta_Query($search_all_fields_args);
        $search_all_fields_sql = $search_all_fields_query->get_sql(
            "post",
            $wpdb->posts,
            "ID",
            null
        );
        $join_clause = $search_all_fields_sql["join"];
    }
    $meta_filter_args = [
        "relation" => "AND",
    ];
    if (!empty($search_terms["selectedFlags"])) {
        foreach ($search_terms["selectedFlags"] as $set_flag) {
            $meta_filter_args[] = [
                "key" => $set_flag,
                "value" => "1",
                "compare" => "=",
            ];
        }
    }
    if (!empty($search_terms["searchFields"])) {
        foreach ($search_terms["searchFields"] as $search_field) {
            $meta_filter_args[] = [
                "key" => $search_field["field"],
                "value" => $search_field["search"],
                "compare" => "LIKE",
            ];
        }
    }
    if (count($meta_filter_args) > 1) {
        $meta_filter_query = new \WP_Meta_Query($meta_filter_args);
        $meta_fields_sql = $meta_filter_query->get_sql(
            "post",
            $wpdb->posts,
            "ID",
            null
        );
        $join_clause = $meta_fields_sql["join"];
    }
    if (isset($join_clause)) {
        add_filter(
            "posts_where",
            function ($where, $query) use (
                $search_all_fields_sql,
                $meta_fields_sql
            ) {
                $type = $query->query_vars["post_type"];
                if (!in_array($type, get_object_type_names(), true)) {
                    return $where;
                }
                global $wpdb;
                $new_where = "";
                if (!empty($search_all_fields_sql)) {
                    $start_index = strpos($where, $wpdb->posts . ".post_title");
                    if (false === $start_index) {
                        return $where;
                    }
                    $where_first_part = substr($where, 0, $start_index);
                    $where_last_part = substr($where, $start_index);
                    $where_middle_part = substr(
                        $search_all_fields_sql["where"],
                        7
                    );
                    $where_middle_part = substr($where_middle_part, 0, -2);
                    $new_where =
                        $where_first_part .
                        $where_middle_part .
                        " OR " .
                        $where_last_part;
                }
                if ("" === $new_where) {
                    $new_where = $where;
                }
                if (!empty($meta_fields_sql)) {
                    $new_where .= $meta_fields_sql["where"];
                }
                return $new_where;
            },
            10,
            2
        );
        add_filter(
            "posts_join",
            function ($join, $query) use ($join_clause) {
                $type = $query->query_vars["post_type"];
                if (!in_array($type, get_object_type_names(), true)) {
                    return $join;
                }
                return $join . $join_clause;
            },
            10,
            2
        );
        add_filter(
            "posts_distinct",
            function ($distinct, $query) {
                $type = $query->query_vars["post_type"];
                if (!in_array($type, get_object_type_names(), true)) {
                    return $distinct;
                }
                return " DISTINCT ";
            },
            10,
            2
        );
    }
}
