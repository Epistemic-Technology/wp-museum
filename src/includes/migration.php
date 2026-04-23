<?php
/**
 * Migration script from categories to collections taxonomy.
 *
 * This script migrates from the old category-based collections to the new
 * collection taxonomy. It is triggered when an admin user visits a page with
 * the 'collection_migration' GET parameter set to 1.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

/**
 * Check if the migration should run.
 * 
 * @param bool $force Whether to force the migration to run regardless of completion status.
 * @return bool True if the migration should run.
 */
function should_run_collection_migration($force = false) {
    if ( ! current_user_can( 'manage_options' ) ) {
        return false;
    }
    if ( ! isset( $_GET['collection_migration'], $_GET['wpm_migration_nonce'] ) ) {
        return false;
    }
    $nonce = sanitize_text_field( wp_unslash( $_GET['wpm_migration_nonce'] ) );
    if ( ! wp_verify_nonce( $nonce, 'wp_museum_force_collection_migration' ) ) {
        return false;
    }
    if ( 1 !== absint( $_GET['collection_migration'] ) ) {
        return false;
    }
    if ( $force ) {
        return true;
    }
    return ! is_collection_migration_completed();
}

/**
 * Find the "Collections" category ID.
 * 
 * @return int|false The ID of the Collections category, or false if not found.
 */
function get_collections_category_id() {
    $collections_cat = get_term_by('name', 'Collections', 'category');
    if ($collections_cat) {
        return $collections_cat->term_id;
    }
    return false;
}

/**
 * Get all subcategories of a parent category.
 * 
 * @param int $parent_id The parent category ID.
 * @return array Array of category term objects.
 */
function get_subcategories($parent_id) {
    return get_terms([
        'taxonomy' => 'category',
        'hide_empty' => false,
        'parent' => $parent_id,
    ]);
}

/**
 * Get all objects in a category.
 * 
 * @param int $category_id The category ID.
 * @return array Array of post objects.
 */
function get_objects_in_category($category_id) {
    $object_types = get_object_type_names();
    
    // Make sure we're getting all posts, not just published ones
    return get_posts([
        'post_type' => $object_types,
        'numberposts' => -1,
        'post_status' => 'any', // Get all posts regardless of status
        'category' => $category_id,
        'fields' => 'all', // Make sure we get all post data
    ]);
}

/**
 * Create a collection term in the collection taxonomy.
 * 
 * @param string $name The name of the collection.
 * @param string $slug The slug of the collection.
 * @param int $parent_id The parent collection term ID (0 for top-level).
 * @return int|WP_Error The term ID on success, or WP_Error on failure.
 */
function create_collection_term($name, $slug, $parent_id = 0) {
    // Check if the term already exists
    $existing_term = get_term_by('slug', $slug, WPM_PREFIX . 'collection_tax');
    if ($existing_term) {
        return $existing_term->term_id;
    }
    
    return wp_insert_term(
        $name,
        WPM_PREFIX . 'collection_tax',
        [
            'slug' => $slug,
            'parent' => $parent_id,
        ]
    );
}

/**
 * Assign an object to a collection term.
 * 
 * @param int $object_id The object post ID.
 * @param int $collection_term_id The collection term ID.
 * @return bool|WP_Error True on success, WP_Error on failure.
 */
function assign_object_to_collection($object_id, $collection_term_id) {
    // Check if the object exists
    $object = get_post($object_id);
    if (!$object) {
        return new \WP_Error('invalid_object', "Object with ID $object_id does not exist");
    }
    
    // Check if the term exists
    $term = get_term($collection_term_id, WPM_PREFIX . 'collection_tax');
    if (!$term || is_wp_error($term)) {
        return new \WP_Error('invalid_term', "Collection term with ID $collection_term_id does not exist");
    }
    
    // Get current terms for the object
    $current_terms = wp_get_object_terms($object_id, WPM_PREFIX . 'collection_tax', ['fields' => 'ids']);
    
    // Check if the object is already assigned to this collection
    if (is_array($current_terms) && in_array($collection_term_id, $current_terms)) {
        return true; // Already assigned
    }
    
    return wp_set_object_terms(
        $object_id,
        $collection_term_id,
        WPM_PREFIX . 'collection_tax',
        true // Append to existing terms
    );
}

/**
 * Recursively migrate a category and its subcategories to collection terms.
 * 
 * @param int $category_id The category ID to migrate.
 * @param int $parent_term_id The parent collection term ID (0 for top-level).
 * @param array &$log Reference to the log array for recording progress.
 * @return array Array of [category_id => term_id] mappings.
 */
function migrate_category_to_collection($category_id, $parent_term_id = 0, &$log = []) {
    $category = get_term($category_id, 'category');
    $mappings = [];
    
    if (!$category || is_wp_error($category)) {
        if (is_wp_error($category)) {
            $log[] = 'Error getting category ' . $category_id . ': ' . $category->get_error_message();
        } else {
            $log[] = 'Category ' . $category_id . ' not found.';
        }
        return $mappings;
    }
    
    // Check if a collection with this slug already exists
    $existing_term = get_term_by('slug', $category->slug, WPM_PREFIX . 'collection_tax');
    if ($existing_term) {
        $log[] = 'Collection term already exists for category: ' . $category->name . ' (ID: ' . $existing_term->term_id . ')';
        $term_id = $existing_term->term_id;
        $mappings[$category_id] = $term_id;
    } else {
        // Create a collection term for this category
        $log[] = 'Creating collection term for category: ' . $category->name;
        $result = create_collection_term($category->name, $category->slug, $parent_term_id);
        
        if (is_wp_error($result)) {
            $log[] = 'Failed to create collection term for category: ' . $category->name . ' - ' . $result->get_error_message();
            return $mappings;
        }
        
        $term_id = is_array($result) ? $result['term_id'] : $result;
        $mappings[$category_id] = $term_id;
        $log[] = 'Created collection term: ' . $category->name . ' (ID: ' . $term_id . ')';
    }
    
    // Assign all objects in this category to the new collection term
    $objects = get_objects_in_category($category_id);
    $log[] = 'Found ' . count($objects) . ' objects in category: ' . $category->name;
    
    if (count($objects) === 0) {
        $log[] = 'WARNING: No objects found in category: ' . $category->name . ' (ID: ' . $category_id . ')';
        // Debug information about the category
        $log[] = 'Category details: ' . print_r($category, true);
    }
    
    $assigned_count = 0;
    foreach ($objects as $object) {
        $log[] = 'Attempting to assign object ' . $object->ID . ' (' . $object->post_title . ') to collection: ' . $category->name;
        $assign_result = assign_object_to_collection($object->ID, $term_id);
        if (!is_wp_error($assign_result)) {
            $assigned_count++;
            $log[] = 'Successfully assigned object ' . $object->ID . ' to collection: ' . $category->name;
        } else {
            $log[] = 'Error assigning object ' . $object->ID . ' to collection: ' . $assign_result->get_error_message();
        }
    }
    $log[] = 'Assigned ' . $assigned_count . ' objects to collection: ' . $category->name;
    
    // Process subcategories
    $subcategories = get_subcategories($category_id);
    $log[] = 'Found ' . count($subcategories) . ' subcategories under: ' . $category->name;
    
    foreach ($subcategories as $subcategory) {
        $log[] = 'Processing subcategory: ' . $subcategory->name;
        $sub_mappings = migrate_category_to_collection($subcategory->term_id, $term_id, $log);
        $mappings = array_merge($mappings, $sub_mappings);
    }
    
    return $mappings;
}

/**
 * Migrate existing collection posts to the new taxonomy system.
 * 
 * This function creates a taxonomy term for each collection post and
 * stores the term ID in the collection post meta.
 * 
 * @param array &$log Reference to the log array for recording progress.
 * @return array Array of [collection_id => term_id] mappings.
 */
function migrate_collections_to_terms(&$log = []) {
    $log[] = 'Starting migration of collection posts to taxonomy terms...';
    
    // Get all collection posts
    $collections = get_posts([
        'post_type' => WPM_PREFIX . 'collection',
        'numberposts' => -1,
        'post_status' => 'any',
    ]);
    
    $log[] = 'Found ' . count($collections) . ' collection posts to migrate.';
    $mappings = [];
    
    // First pass: create terms for all collections
    foreach ($collections as $collection) {
        // Check if this collection already has a term ID
        $existing_term_id = intval(get_post_meta($collection->ID, WPM_PREFIX . 'collection_term_id', true));
        
        if ($existing_term_id) {
            $log[] = 'Collection "' . $collection->post_title . '" (ID: ' . $collection->ID . ') already has a term ID: ' . $existing_term_id;
            $mappings[$collection->ID] = $existing_term_id;
            continue;
        }
        
        // Check if a term with this slug already exists
        $existing_term = get_term_by('slug', $collection->post_name, WPM_PREFIX . 'collection_tax');
        
        if ($existing_term) {
            $log[] = 'Term with slug "' . $collection->post_name . '" already exists (ID: ' . $existing_term->term_id . ') for collection: ' . $collection->post_title;
            $term_id = intval($existing_term->term_id);
            $mappings[$collection->ID] = $term_id;
            
            // Store the term ID in the collection post meta
            update_post_meta($collection->ID, WPM_PREFIX . 'collection_term_id', $term_id);
            continue;
        }
        
        // Create a term for this collection
        $log[] = 'Creating term for collection: ' . $collection->post_title . ' (ID: ' . $collection->ID . ')';
        
        $result = wp_insert_term(
            $collection->post_title,
            WPM_PREFIX . 'collection_tax',
            [
                'slug' => $collection->post_name,
            ]
        );
        
        if (is_wp_error($result)) {
            $log[] = 'Error creating term for collection "' . $collection->post_title . '": ' . $result->get_error_message();
            continue;
        }
        
        $term_id = intval($result['term_id']);
        $mappings[$collection->ID] = intval($term_id);
        
        // Store the term ID in the collection post meta
        update_post_meta($collection->ID, WPM_PREFIX . 'collection_term_id', $term_id);
        $log[] = 'Created term (ID: ' . $term_id . ') for collection: ' . $collection->post_title;
    }
    
    // Second pass: update term parents based on collection hierarchy
    foreach ($collections as $collection) {
        if ($collection->post_parent && isset($mappings[$collection->ID]) && isset($mappings[$collection->post_parent])) {
            $term_id = $mappings[$collection->ID];
            $parent_term_id = $mappings[$collection->post_parent];
            
            $log[] = 'Setting parent for term ' . $term_id . ' to ' . $parent_term_id;
            
            $result = wp_update_term(
                $term_id,
                WPM_PREFIX . 'collection_tax',
                [
                    'parent' => $parent_term_id,
                ]
            );
            
            if (is_wp_error($result)) {
                $log[] = 'Error setting parent for term ' . $term_id . ': ' . $result->get_error_message();
            }
        }
    }
    
    // Third pass: migrate objects from associated categories to collection terms
    foreach ($collections as $collection) {
        if (!isset($mappings[$collection->ID])) {
            continue;
        }
        
        $term_id = $mappings[$collection->ID];
        $associated_category = get_post_meta($collection->ID, 'associated_category', true);
        
        if (!$associated_category || $associated_category == -1) {
            $log[] = 'Collection "' . $collection->post_title . '" (ID: ' . $collection->ID . ') has no associated category.';
            continue;
        }
        
        $log[] = 'Migrating objects from category ' . $associated_category . ' to collection term ' . $term_id;
        
        // Get all objects in the associated category
        $objects = get_objects_in_category($associated_category);
        $log[] = 'Found ' . count($objects) . ' objects in category ' . $associated_category;
        
        $assigned_count = 0;
        foreach ($objects as $object) {
            $assign_result = assign_object_to_collection($object->ID, $term_id);
            if (!is_wp_error($assign_result)) {
                $assigned_count++;
            } else {
                $log[] = 'Error assigning object ' . $object->ID . ' to collection term: ' . $assign_result->get_error_message();
            }
        }
        
        $log[] = 'Assigned ' . $assigned_count . ' objects to collection term ' . $term_id;
        
        // Check if we should include child categories
        $include_child_categories = get_post_meta($collection->ID, WPM_PREFIX . 'include_child_categories', true);
        
        if ($include_child_categories) {
            $log[] = 'Including child categories for collection "' . $collection->post_title . '"';
            
            // Get all subcategories
            $subcategories = get_subcategories($associated_category);
            
            foreach ($subcategories as $subcategory) {
                $log[] = 'Processing subcategory: ' . $subcategory->name;
                
                // Get all objects in this subcategory
                $sub_objects = get_objects_in_category($subcategory->term_id);
                $log[] = 'Found ' . count($sub_objects) . ' objects in subcategory ' . $subcategory->name;
                
                $sub_assigned_count = 0;
                foreach ($sub_objects as $object) {
                    $assign_result = assign_object_to_collection($object->ID, $term_id);
                    if (!is_wp_error($assign_result)) {
                        $sub_assigned_count++;
                    } else {
                        $log[] = 'Error assigning object ' . $object->ID . ' from subcategory to collection term: ' . $assign_result->get_error_message();
                    }
                }
                
                $log[] = 'Assigned ' . $sub_assigned_count . ' objects from subcategory ' . $subcategory->name . ' to collection term ' . $term_id;
            }
        }
    }
    
    $log[] = 'Completed migration of collection posts to taxonomy terms.';
    return $mappings;
}

/**
 * Run the migration from categories to collections.
 * 
 * @param bool $force Whether to force the migration to run again even if it's already been completed.
 */
function run_collection_migration($force = false) {
    if (!should_run_collection_migration($force)) {
        return;
    }
    
    // Start logging
    $log = [];
    $log[] = 'Starting collection migration... ' . ($force ? '(forced)' : '');
    $log[] = 'Time: ' . date('Y-m-d H:i:s');
    
    // Find the Collections category
    $collections_cat_id = get_collections_category_id();
    if (!$collections_cat_id) {
        $log[] = 'Collections category not found.';
        update_option(WPM_PREFIX . 'collection_migration_log', $log);
        wp_die('Collections category not found.');
    }
    
    $log[] = 'Found Collections category with ID: ' . $collections_cat_id;
    
    // Get all subcategories of the Collections category
    $subcategories = get_subcategories($collections_cat_id);
    $log[] = 'Found ' . count($subcategories) . ' subcategories under Collections.';
    
    // Migrate each subcategory to a collection term
    $mappings = [];
    foreach ($subcategories as $subcategory) {
        $log[] = 'Migrating category: ' . $subcategory->name . ' (ID: ' . $subcategory->term_id . ')';
        $sub_mappings = migrate_category_to_collection($subcategory->term_id, 0, $log);
        $mappings = array_merge($mappings, $sub_mappings);
    }
    
    // Migrate existing collection posts to taxonomy terms
    $collection_mappings = migrate_collections_to_terms($log);
    
    // Mark migration as completed
    update_option(WPM_PREFIX . 'collection_migration_completed', true);
    update_option(WPM_PREFIX . 'collection_migration_log', $log);
    
    // Redirect to admin page with success message
    wp_safe_redirect(admin_url('admin.php?page=wp-museum-migration&migration_complete=1'));
    exit;
}

// Hook the migration function to init
add_action('init', __NAMESPACE__ . '\run_collection_migration');

/**
 * Add a button to force migration on the migration admin page.
 */
function add_force_migration_button() {
    if (!current_user_can('manage_options')) {
        return;
    }
    
    ?>
    <div class="wrap">
        <h1>WP Museum Collection Migration</h1>
        
        <h2>Category to Collection Migration</h2>
        <p>This will migrate your WordPress categories to collection taxonomy terms.</p>
        <p>This is useful if you have been using categories to organize your museum objects and want to switch to the collection taxonomy system.</p>
        
        <form method="get" action="<?php echo esc_url( admin_url( 'admin.php' ) ); ?>">
            <input type="hidden" name="page" value="collection-migration">
            <input type="hidden" name="collection_migration" value="1">
            <input type="hidden" name="force" value="1">
            <?php wp_nonce_field( 'wp_museum_force_collection_migration', 'wpm_migration_nonce' ); ?>
            <?php submit_button('Run Category to Collection Migration', 'primary', 'submit', false); ?>
        </form>

        <hr>

        <h2>Collection Post to Term Migration</h2>
        <p>This will create taxonomy terms for all your existing collection posts.</p>
        <p>This is useful if you have existing collections that need to be associated with taxonomy terms.</p>

        <form method="post" action="<?php echo esc_url( admin_url( 'admin.php' ) ); ?>">
            <input type="hidden" name="page" value="collection-migration">
            <input type="hidden" name="action" value="force_collection_term_migration">
            <?php wp_nonce_field('wp_museum_force_collection_term_migration'); ?>
            <?php submit_button('Run Collection Term Migration', 'primary', 'submit', false); ?>
        </form>
    </div>
    <?php
}

/**
 * Add a menu item for the migration tool.
 */
function add_migration_menu() {
    add_management_page(
        'Collection Migration',
        'Collection Migration',
        'manage_options',
        'collection-migration',
        __NAMESPACE__ . '\add_force_migration_button'
    );
}
add_action('admin_menu', __NAMESPACE__ . '\add_migration_menu');

/**
 * Check if we should force the migration.
 */
function check_force_migration() {
    if ( ! current_user_can( 'manage_options' ) ) {
        return;
    }
    if ( ! isset( $_GET['collection_migration'], $_GET['force'], $_GET['wpm_migration_nonce'] ) ) {
        return;
    }
    $nonce = sanitize_text_field( wp_unslash( $_GET['wpm_migration_nonce'] ) );
    if ( ! wp_verify_nonce( $nonce, 'wp_museum_force_collection_migration' ) ) {
        return;
    }
    if ( absint( $_GET['collection_migration'] ) !== 1 || absint( $_GET['force'] ) !== 1 ) {
        return;
    }
    run_collection_migration( true );
}
add_action('init', __NAMESPACE__ . '\check_force_migration', 9); // Run before the normal migration

/**
 * Display an admin notice after migration is complete.
 */
function migration_admin_notice() {
    if (!current_user_can('manage_options')) {
        return;
    }
    
    // Check for category to collection migration completion.
    $migration_complete = isset( $_GET['migration_complete'] ) ? absint( $_GET['migration_complete'] ) : 0;
    if ( 1 === $migration_complete ) {
        $log_url = wp_nonce_url(
            admin_url( 'admin.php?page=collection-migration&view_migration_log=1' ),
            'wp_museum_view_migration_log',
            'wpm_log_nonce'
        );
        ?>
        <div class="notice notice-success is-dismissible">
            <p><strong>Success!</strong> The category to collection migration has been completed.</p>
            <p><a href="<?php echo esc_url( $log_url ); ?>">View Migration Log</a></p>
        </div>
        <?php
    }

    // Check for collection term migration completion.
    $term_migration_complete = isset( $_GET['term_migration_complete'] ) ? absint( $_GET['term_migration_complete'] ) : 0;
    if ( 1 === $term_migration_complete ) {
        $log_url = wp_nonce_url(
            admin_url( 'admin.php?page=collection-migration&view_migration_log=1' ),
            'wp_museum_view_migration_log',
            'wpm_log_nonce'
        );
        ?>
        <div class="notice notice-success is-dismissible">
            <p><strong>Success!</strong> The collection term migration has been completed.</p>
            <p><a href="<?php echo esc_url( $log_url ); ?>">View Migration Log</a></p>
        </div>
        <?php
    }
}
add_action('admin_notices', __NAMESPACE__ . '\migration_admin_notice');

/**
 * Check if the collection migration has been completed.
 * 
 * @return bool True if the migration has been completed.
 */
function is_collection_migration_completed() {
    return (bool) get_option(WPM_PREFIX . 'collection_migration_completed', false);
}

/**
 * Display the migration log in the admin area.
 */
function display_migration_log() {
    if ( ! current_user_can( 'administrator' ) ) {
        return;
    }

    if ( ! isset( $_GET['view_migration_log'], $_GET['wpm_log_nonce'] ) ) {
        return;
    }

    $nonce = sanitize_text_field( wp_unslash( $_GET['wpm_log_nonce'] ) );
    if ( ! wp_verify_nonce( $nonce, 'wp_museum_view_migration_log' ) ) {
        return;
    }

    $log = get_option( WPM_PREFIX . 'collection_migration_log', [] );

    echo '<div class="wrap">';
    echo '<h1>' . esc_html__( 'Collection Migration Log', 'wp-museum' ) . '</h1>';

    if ( empty( $log ) ) {
        echo '<p>' . esc_html__( 'No migration log found.', 'wp-museum' ) . '</p>';
    } else {
        echo '<div style="background: #f8f8f8; padding: 15px; border: 1px solid #ddd; max-height: 500px; overflow-y: auto;">';
        echo '<ul>';
        foreach ( $log as $entry ) {
            echo '<li>' . esc_html( $entry ) . '</li>';
        }
        echo '</ul>';
        echo '</div>';
    }

    printf(
        '<p><a href="%s" class="button">%s</a></p>',
        esc_url( admin_url( 'index.php' ) ),
        esc_html__( 'Back to Dashboard', 'wp-museum' )
    );
    echo '</div>';
}
add_action('admin_notices', __NAMESPACE__ . '\display_migration_log');

/**
 * Force migration of all existing collections to the taxonomy system.
 * 
 * This function can be called programmatically to migrate all collections
 * without requiring the admin to visit a specific URL.
 * 
 * @return array Migration log.
 */
function force_collection_term_migration() {
    $log = [];
    $log[] = 'Starting forced migration of collections to taxonomy terms...';
    $log[] = 'Time: ' . date('Y-m-d H:i:s');
    
    $mappings = migrate_collections_to_terms($log);
    
    $log[] = 'Completed forced migration of collections to taxonomy terms.';
    $log[] = 'Time: ' . date('Y-m-d H:i:s');
    
    update_option(WPM_PREFIX . 'collection_migration_log', $log);
    
    return $log;
}

/**
 * Handle the collection term migration form submission.
 */
function handle_collection_term_migration() {
    if (!current_user_can('manage_options')) {
        return;
    }
    
    if (isset($_POST['action']) && $_POST['action'] === 'force_collection_term_migration') {
        check_admin_referer('wp_museum_force_collection_term_migration');
        
        $log = force_collection_term_migration();
        
        wp_safe_redirect(admin_url('admin.php?page=collection-migration&term_migration_complete=1'));
        exit;
    }
}
add_action('admin_init', __NAMESPACE__ . '\handle_collection_term_migration'); 