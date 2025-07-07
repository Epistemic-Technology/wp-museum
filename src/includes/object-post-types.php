<?php
/**
 * Creates museum object post types.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

/**
 * Creates the custom museum object post types.
 *
 * Iterates through the user-created museum objects and creates a custom post type
 * for each. Each object has a table of custom fields that are presented to users
 * on the edit post screen. The bulk of this function is devoted to creating and
 * saving that form. Object posts are hierarchical--users can create child objects
 * from the edit post page. Objects and their custom fields are accessible to the
 * WordPress REST api if they are marked as 'public' in the object admin page.
 * Objects have image galleries using ajax to add and manipulate image attachments.
 *
 * @see object_admin.php
 */
function create_mobject_post_types()
{
    global $wpdb;
    $kind_kinds_table = $wpdb->prefix . WPM_PREFIX . "mobject_kinds";
    $kind_rows = $wpdb->get_results("SELECT * FROM $kind_kinds_table"); //phpcs:ignore

    $kind_type_list = [];

    foreach ($kind_rows as $kind_row) {
        $new_object_post_type = new ObjectPostType(new ObjectKind($kind_row));
        $new_object_post_type->register();
        $kind_type_list[] = $new_object_post_type->kind->type_name;
    }
}

/**
 * Adds a link to the parent post for child posts.
 *
 * @param \WP_POST $post A post of some museum object post type.
 */
function add_object_parent_link(\WP_POST $post)
{
    if (substr($post->post_type, 0, strlen(WPM_PREFIX)) !== WPM_PREFIX) {
        return;
    }
    $parent_id = wp_get_post_parent_id($post->ID);
    if (!$parent_id) {
        return;
    }
    $parent = get_post($parent_id);
    if (isset($parent)) {
        echo "<div class='postbox' style='font-size:1.2em; padding:10px; margin-bottom:10px;'>Parent Object: " .
            esc_html($parent->post_title) .
            "(<a href='post.php?post=" .
            esc_html($parent->ID) .
            "&action=edit'>Edit</a>)</div>";
    }
}

/**
 * Adds a div to top of object edit pages for the reporting of problems, and
 * report problems based on SESSION variable.
 *
 * Called at admin_notices.
 */
function add_object_problem_div()
{
    global $post;
    if (
        !empty($post) &&
        in_array($post->post_type, get_object_type_names(), true)
    ) {
        echo "<div id='wpm-post-check' class='error'";
        if (!empty($_SESSION[WPM_PREFIX . "object_problems"])) {
            echo ">";
            echo esc_html(
                \wp_kses($_SESSION[WPM_PREFIX . "object_problems"], "post")
            );
        } else {
            echo "style='display:none'>";
        }
        echo "</div>";
    }
}

/**
 * Filter to add link text to content containing text patterns matching
 * schema of object's id field.
 *
 * @param string $content The content to filter.
 * @return string The content with links added.
 *
 * @see class-objectkind::ObjectKind::cat_field_id
 */
function link_objects_by_id($content)
{
    global $post;
    if (is_null($post)) {
        return $content;
    }

    $kinds = get_mobject_kinds();
    $content_array = wp_html_split($content);
    $count_content_items = count($content_array);
    $changed = false;

    foreach ($kinds as $kind) {
        if (empty($kind->cat_field_id)) {
            break;
        }
        $id_field = get_mobject_field($kind->kind_id, $kind->cat_field_id);
        if (empty($id_field->field_schema)) {
            break;
        }

        // The pattern is based on user-inputtted regular expression with some
        // special syntax for group ordering in sort. We convert that into an
        // expression that will match correctly.
        $pattern = "/" . $id_field->field_schema . "/";
        $pattern = preg_replace("/<.*?>/", ":", $pattern);
        $matches = [];

        // Make sure that we're not adding a link inside another link, which breaks the DOM.
        $inside_link_element = false;

        // wp_html_split makes it so that tags are on odd indexes and content
        // is on event indexes.
        // See: wp-includes/formatting.php::wp_replace_in_html_tags().
        for ($index = 0; $index < $count_content_items; $index++) {
            if (0 === $index % 2 && !$inside_link_element) {
                preg_match_all($pattern, $content_array[$index], $matches);
                foreach ($matches[0] as $match) {
                    $args = [
                        "post_type" => $kind->type_name,
                        "post_status" => "publish",
                        "meta_key" => $id_field->slug,
                        "meta_value" => $match,
                    ];
                    $posts = get_posts($args);
                    if (!empty($posts) && $posts[0]->ID !== $post->ID) {
                        $changed = true;
                        $post_url = get_permalink($posts[0]);
                        $post_title = $posts[0]->post_title;
                        $link = "<a href='$post_url' title='$post_title'>{$match}</a>";

                        $content_array[$index] = str_replace(
                            $match,
                            $link,
                            $content_array[$index]
                        );
                    }
                }
            } elseif ("</a>" === substr($content_array[$index], 0, 4)) {
                $inside_link_element = false;
            } elseif ("<a " === substr($content_array[$index], 0, 3)) {
                $inside_link_element = true;
            }
        }
    }

    if ($changed) {
        $content = implode($content_array);
    }

    return $content;
}

/**
 * Filters the thumbnail ID for object post types.
 *
 * The main use case of this is to have thumbnails for oembeds.
 *
 * @param int $thumbnail_id The thumbnail ID.
 * @param \WP_Post $post The post object.
 * @return int The filtered thumbnail ID.
 */
function filter_object_thumbnail_id(int $thumbnail_id, \WP_Post $post): int
{
    if (!in_array($post->post_type, get_object_type_names(), true)) {
        return $thumbnail_id;
    }

    $thumbnail_id = get_object_thumbnail_id($post->ID);
    return $thumbnail_id;
}
