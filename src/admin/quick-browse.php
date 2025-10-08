<?php
/**
 * Adds quick browse tables to all museum object types. Quick browse tables allow administrators
 * to quickly see all objects of a particular type along with publication status and summary
 * data. The quick browse page is accessed through the <Object Type>|Quick Browse menu.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

/**
 * Adds quick browse page to all object types.
 *
 * @return void
 */
function add_quick_browse(): void
{
    $mobject_kinds = get_mobject_kinds();

    foreach ($mobject_kinds as $object_type) {
        $type_name = $object_type->type_name;
        add_submenu_page(
            "edit.php?post_type=$type_name",
            "Quick Browse",
            "Quick Browse",
            WPM_PREFIX . "edit_others_objects",
            $object_type->name . "-quick-browse",
            __NAMESPACE__ . "\quick_browse"
        );
    }
}

/**
 * Display the quick browse table.
 *
 * @return void
 */
function quick_browse(): void
{
    global $wpdb;
    if (!isset($_SERVER["PHP_SELF"])) {
        wp_die(esc_html__("quick_browse: PHP_SELF not set.", "wp-museum"));
    }
    if (!isset($_GET["post_type"])) {
        wp_die(
            esc_html__(
                "quick_browse: post_type needs to be set to display Quick Browse table.",
                "wp-museum"
            )
        );
    }
    $type_name = sanitize_key($_GET["post_type"]);
    $object_type = kind_from_type($type_name);
    $self_url =
        sanitize_url(wp_unslash($_SERVER["PHP_SELF"])) .
        "?post_type=$type_name&page={$object_type->name}-quick-browse";
    $csv_url = add_query_arg(
        [
            "post_type" => $type_name,
            "page" => $object_type->name . "-quick-browse",
            "action" => "csv_upload",
            "qb-nonce" => wp_create_nonce("VQsJrvZ6V2rPjLM^4m>m"),
        ],
        sanitize_url(wp_unslash($_SERVER["PHP_SELF"]))
    );

    display_csv_upload_form($csv_url);

    if (isset($_GET["action"])) {
        if (!check_admin_referer("VQsJrvZ6V2rPjLM^4m>m", "qb-nonce")) {
            wp_die(esc_html__("Failed nonce check.", "wp-museum"));
        }
        process_uploaded_csv();
    }

    $fields = get_mobject_fields($object_type->kind_id);
    if (!count($fields)) {
        esc_html_e(
            "No fields selected for quick browse in object admin.",
            "wp-museum"
        );
        return;
    }

    echo "<div class='wrap'><table class='widefat'>
            <thead><tr>";

    if (isset($_GET["sort_col"])) {
        $sort_col = sanitize_key($_GET["sort_col"]);
    } else {
        $sort_col = reset($fields)->slug;
    }

    if (isset($_GET["sort_dir"])) {
        $sort_dir = sanitize_key($_GET["sort_dir"]);
    } else {
        $sort_dir = "asc";
    }

    echo "<th>";
    if ("post_title" === $sort_col) {
        if ("asc" === $sort_dir) {
            echo "<a href='" .
                esc_html($self_url) .
                "&sort_col=post_title&sort_dir=desc'>Name<span class='dashicons dashicons-arrow-down'></span>";
        } else {
            echo "<a href='" .
                esc_html($self_url) .
                "&sort_col=post_title&sort_dir=asc'>Name<span class='dashicons dashicons-arrow-up'></span>";
        }
    } else {
        echo "<a href='" .
            esc_html($self_url) .
            "&sort_col=post_title&sort_dir=asc'>Name";
    }
    echo "</a></th>";

    foreach ($fields as $field) {
        if ($field->quick_browse) {
            echo "<th>";
            if ($sort_col === $field->slug) {
                if ("asc" === $sort_dir) {
                    echo "<a href='" .
                        esc_html($self_url) .
                        "&sort_col=" .
                        esc_html($sort_col) .
                        "&sort_dir=desc'>" .
                        esc_html($field->name) .
                        "<span class='dashicons dashicons-arrow-down'></span>";
                } else {
                    echo "<a href='" .
                        esc_html($self_url) .
                        "&sort_col=" .
                        esc_html($sort_col) .
                        "&sort_dir=asc'>" .
                        esc_html($field->name) .
                        "<span class='dashicons dashicons-arrow-up'></span>";
                }
            } else {
                $col = $field->slug;
                echo "<a href='" .
                    esc_html($self_url) .
                    "&sort_col=" .
                    esc_html($col) .
                    "&sort_dir=asc'>" .
                    esc_html($field->name);
            }
            echo "</a></th>";
        }
    }

    // export_csv_button() and import_csv_buton() escape output.
    echo "<th>";
    export_csv_button($object_type->kind_id, $sort_col, $sort_dir);
    echo " ";
    import_csv_button($object_type->kind_id);
    echo "</th><th></th><th></th>";
    echo "</tr></thead><tbody>";

    $args = [
        "posts_per_page" => 50,
        "post_type" => $type_name,
        "post_status" => "any",
        "paged" => 1,
    ];

    try {
        $objects = [];
        $page = 1;
        do {
            $args["paged"] = $page;
            $batch = get_posts($args);
            $objects = array_merge($objects, $batch);
            $page++;
        } while (count($batch) === 50);
    } catch (\Exception $e) {
        trigger_error($e->getMessage(), E_USER_ERROR);
        wp_die(
            sprintf(
                esc_html__("Error retrieving museum objects: %s", "wp-museum"),
                esc_html($e->getMessage())
            ),
            esc_html__("Database Error", "wp-museum"),
            ["response" => 500, "back_link" => true]
        );
    }
    wpm_sort_by_field($objects, $sort_col, $sort_dir);

    foreach ($objects as $object) {
        $custom = get_post_custom($object->ID);

        $edit_url = admin_url("post.php?post={$object->ID}&action=edit");
        $view_url = get_permalink($object->ID);
        $row_class = "wpm-quick-row-" . $object->post_status;
        echo "<tr class='" . esc_html($row_class) . "'>";
        echo "<td><a href='" .
            esc_html($edit_url) .
            "'>" .
            esc_html($object->post_title) .
            "</a></td>";
        foreach ($fields as $field) {
            if ($field->quick_browse) {
                if (isset($custom[$field->slug])) {
                    $field_value = $custom[$field->slug][0];
                } else {
                    $field_value = "(none)";
                }

                echo "<td><a href='" .
                    esc_html($edit_url) .
                    "'>" .
                    esc_html($field_value) .
                    "</a></td>";
            }
        }
        echo "<td><a href='" . esc_html($view_url) . "'>View</a><td>";
        echo "<td>";
        if (count(get_object_image_attachments($object->ID)) > 0) {
            echo '<span class="dashicons dashicons-format-gallery"></span>';
        }
        echo "</td>";
        echo "</tr>";
    }
    echo "</tbody></table></div>";
}
