<?php
/**
 * Helper functions for setting up museum test data.
 *
 * @package Wp_Museum
 */

/**
 * Helper class for setting up museum test data.
 */
class MuseumTestData
{
    /**
     * Create a test object kind with OAI-PMH mappings.
     *
     * @return ObjectKind The object kind instance.
     */
    public static function create_test_object_kind()
    {
        $kind_data = json_decode(
            file_get_contents(
                plugin_dir_path(__FILE__) .
                    "../../data/museum/instrument-simplified.json"
            ),
            true
        );

        $kind = MikeThicke\WPMuseum\ObjectKind::from_json($kind_data);
        $existing_kind = MikeThicke\WPMuseum\get_kind_from_typename(
            $kind->type_name
        );
        if (!$existing_kind) {
            $kind->save_to_db();
            
            // After saving, get the kind from DB to ensure we have the correct ID
            $saved_kind = MikeThicke\WPMuseum\get_kind_from_typename($kind->type_name);
            if ($saved_kind) {
                $kind = $saved_kind;
            }

            // Create and save the associated fields
            if (isset($kind_data["fields"]) && is_array($kind_data["fields"])) {
                foreach ($kind_data["fields"] as $field_id => $field_data) {
                    // Convert field_data to the format expected by from_rest
                    $field_data["kind_id"] = $kind->kind_id;
                    $field = MikeThicke\WPMuseum\MObjectField::from_rest(
                        $field_data
                    );
                    $field->save_to_db();
                }
            }
        } else {
            $kind = $existing_kind;
        }

        return $kind;
    }

    /**
     * Create a test museum object post with metadata.
     *
     * @param array $factory WordPress factory instance.
     * @param array $object_data Object data from JSON.
     * @return WP_Post The created post.
     */
    public static function create_test_museum_object(
        $factory,
        $object_data = null
    ) {
        if (is_null($object_data)) {
            $object_data = json_decode(
                file_get_contents(
                    plugin_dir_path(__FILE__) .
                        "../../data/museum/sample-instrument.json"
                ),
                true
            );
        }

        // Create the post
        $post_id = $factory->post->create([
            "post_type" => "wpm_instrument",
            "post_title" => $object_data["title"],
            "post_name" => $object_data["slug"],
            "post_status" => "publish",
            "post_date" => $object_data["created_date"],
            "post_modified" => $object_data["modified_date"],
        ]);

        // Add field metadata
        foreach ($object_data["fields"] as $field_id => $field_data) {
            $meta_key = $field_data["slug"];
            add_post_meta($post_id, $meta_key, $field_data["value"]);
        }

        // Add tags if present
        if (isset($object_data["tags"]) && !empty($object_data["tags"])) {
            wp_set_post_tags($post_id, $object_data["tags"]);
        }

        return get_post($post_id);
    }

    /**
     * Create a test collection post.
     *
     * @param array $factory WordPress factory instance.
     * @param array $collection_data Collection data from JSON.
     * @return WP_Post The created collection post.
     */
    public static function create_test_collection(
        $factory,
        $collection_data = null
    ) {
        if (is_null($collection_data)) {
            $collection_data = json_decode(
                file_get_contents(
                    plugin_dir_path(__FILE__) .
                        "../../data/museum/sample-collection.json"
                ),
                true
            );
        }

        // Create the collection post
        $post_id = $factory->post->create([
            "post_type" => "wpm_collection",
            "post_title" => $collection_data["title"],
            "post_name" => $collection_data["slug"],
            "post_status" => "publish",
            "post_content" => $collection_data["description"],
            "post_date" => $collection_data["created_date"],
            "post_modified" => $collection_data["modified_date"],
        ]);

        // Add collection metadata
        foreach ($collection_data["post_meta"] as $meta_key => $meta_value) {
            add_post_meta($post_id, $meta_key, $meta_value);
        }

        // Create the collection taxonomy term
        $term_result = wp_insert_term(
            $collection_data["taxonomy_term"]["name"],
            "wpm_collection_tax",
            [
                "slug" => $collection_data["taxonomy_term"]["slug"],
                "description" =>
                    $collection_data["taxonomy_term"]["description"],
                "parent" => $collection_data["taxonomy_term"]["parent"],
            ]
        );

        if (!is_wp_error($term_result)) {
            $term_id = $term_result["term_id"];
            update_post_meta($post_id, "wpm_collection_term_id", $term_id);
        }

        return get_post($post_id);
    }

    /**
     * Add an object to a collection.
     *
     * @param int $object_id The object post ID.
     * @param int $collection_id The collection post ID.
     * @return bool Success status.
     */
    public static function add_object_to_collection($object_id, $collection_id)
    {
        $term_id = get_post_meta(
            $collection_id,
            "wpm_collection_term_id",
            true
        );
        if (!$term_id) {
            return false;
        }

        $result = wp_set_object_terms(
            $object_id,
            $term_id,
            "wpm_collection_tax",
            true
        );
        return !is_wp_error($result);
    }

    /**
     * Mock the get_object_type_names function for testing.
     *
     * @return array Array of object type names.
     */
    public static function mock_get_object_type_names()
    {
        return ["wpm_object", "wpm_instrument"];
    }

    /**
     * Get test object kinds for testing.
     *
     * @return array Array of ObjectKind instances.
     */
    public static function get_test_object_kinds()
    {
        $object_kind = self::create_test_object_kind();
        return [1 => $object_kind];
    }

    /**
     * Mock the get_mobject_kinds function for testing.
     *
     * @deprecated Use get_test_object_kinds() instead.
     * @return array Array of ObjectKind instances.
     */
    public static function mock_get_mobject_kinds()
    {
        return self::get_test_object_kinds();
    }

    /**
     * Set up complete test environment with objects and collections.
     *
     * @param array $factory WordPress factory instance.
     * @return array Array containing created posts and data.
     */
    public static function setup_complete_test_environment($factory)
    {
        // Clean up database before setting up test environment
        self::cleanup_test_data();

        // Drop all data from museum-specific tables
        global $wpdb;

        // Drop kinds table data
        $wpdb->query("DELETE FROM {$wpdb->prefix}wpm_mobject_kinds");

        // Drop fields table data
        $wpdb->query("DELETE FROM {$wpdb->prefix}wpm_mobject_fields");

        // Drop remote clients table data
        $wpdb->query("DELETE FROM {$wpdb->prefix}wpm_remote_clients");

        // Reset auto-increment counters
        $wpdb->query(
            "ALTER TABLE {$wpdb->prefix}wpm_mobject_kinds AUTO_INCREMENT = 1"
        );
        $wpdb->query(
            "ALTER TABLE {$wpdb->prefix}wpm_mobject_fields AUTO_INCREMENT = 1"
        );
        $wpdb->query(
            "ALTER TABLE {$wpdb->prefix}wpm_remote_clients AUTO_INCREMENT = 1"
        );

        // Create object kind for testing
        $object_kind = self::create_test_object_kind();

        // Create collection
        $collection = self::create_test_collection($factory);

        // Create telescope object
        $telescope_data = json_decode(
            file_get_contents(
                plugin_dir_path(__FILE__) .
                    "../../data/museum/sample-instrument.json"
            ),
            true
        );
        $telescope = self::create_test_museum_object($factory, $telescope_data);

        // Create microscope object
        $microscope_data = json_decode(
            file_get_contents(
                plugin_dir_path(__FILE__) .
                    "../../data/museum/sample-microscope.json"
            ),
            true
        );
        $microscope = self::create_test_museum_object(
            $factory,
            $microscope_data
        );

        // Add objects to collection
        self::add_object_to_collection($telescope->ID, $collection->ID);
        self::add_object_to_collection($microscope->ID, $collection->ID);

        return [
            "collection" => $collection,
            "telescope" => $telescope,
            "microscope" => $microscope,
            "object_kind" => $object_kind,
        ];
    }

    /**
     * Create OAI-PMH identifier for a post.
     *
     * @param WP_Post $post The post object.
     * @return string The OAI identifier.
     */
    public static function create_oai_identifier($post)
    {
        $site_url = get_site_url();
        $domain = parse_url($site_url, PHP_URL_HOST);
        return "oai:{$domain}:object:{$post->ID}";
    }

    /**
     * Clean up test data.
     */
    public static function cleanup_test_data()
    {
        // Remove all test posts
        $test_posts = get_posts([
            "post_type" => ["wpm_object", "wpm_collection", "wpm_instrument"],
            "post_status" => "any",
            "numberposts" => -1,
        ]);

        foreach ($test_posts as $post) {
            wp_delete_post($post->ID, true);
        }

        // Remove test terms
        $test_terms = get_terms([
            "taxonomy" => "wpm_collection_tax",
            "hide_empty" => false,
        ]);

        foreach ($test_terms as $term) {
            wp_delete_term($term->term_id, "wpm_collection_tax");
        }
    }
}
