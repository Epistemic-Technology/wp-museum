<?php
/**
 * Creates the collection taxonomy for museum objects.
 *
 * This taxonomy replaces the previous dependency on WordPress categories
 * for associating objects with collections.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

/**
 * Register the collection taxonomy for museum objects.
 */
function register_collection_taxonomy() {
	$object_types = get_object_type_names();
	
	$labels = array(
		'name'                       => _x( 'Collections', 'taxonomy general name', 'wp-museum' ),
		'singular_name'              => _x( 'Collection', 'taxonomy singular name', 'wp-museum' ),
		'search_items'               => __( 'Search Collections', 'wp-museum' ),
		'popular_items'              => __( 'Popular Collections', 'wp-museum' ),
		'all_items'                  => __( 'All Collections', 'wp-museum' ),
		'parent_item'                => __( 'Parent Collection', 'wp-museum' ),
		'parent_item_colon'          => __( 'Parent Collection:', 'wp-museum' ),
		'edit_item'                  => __( 'Edit Collection', 'wp-museum' ),
		'update_item'                => __( 'Update Collection', 'wp-museum' ),
		'add_new_item'               => __( 'Add New Collection', 'wp-museum' ),
		'new_item_name'              => __( 'New Collection Name', 'wp-museum' ),
		'separate_items_with_commas' => __( 'Separate collections with commas', 'wp-museum' ),
		'add_or_remove_items'        => __( 'Add or remove collections', 'wp-museum' ),
		'choose_from_most_used'      => __( 'Choose from the most used collections', 'wp-museum' ),
		'menu_name'                  => __( 'Collections', 'wp-museum' ),
	);

	$args = array(
		'labels'            => $labels,
		'hierarchical'      => true,
		'public'            => true,
		'show_ui'           => true,
		'show_admin_column' => true,
		'show_in_nav_menus' => true,
		'show_tagcloud'     => false,
		'show_in_rest'      => true,
		'capabilities'      => array(
			'manage_terms' => WPM_PREFIX . 'edit_collections',
			'edit_terms'   => WPM_PREFIX . 'edit_collections',
			'delete_terms' => WPM_PREFIX . 'edit_collections',
			'assign_terms' => WPM_PREFIX . 'edit_objects',
		),
	);

	register_taxonomy( WPM_PREFIX . 'collection_tax', $object_types, $args );
}
add_action( 'init', __NAMESPACE__ . '\register_collection_taxonomy', 0 );

/**
 * Get collections for a museum object.
 *
 * @param int $post_id The ID of the museum object post.
 * @return array Array of collection term objects.
 */
function get_object_collection_terms( $post_id ) {
	$terms = wp_get_object_terms( $post_id, WPM_PREFIX . 'collection_tax' );
	return $terms;
}

/**
 * Get collection term links for a museum object.
 *
 * @param int    $post_id   The ID of the museum object post.
 * @param string $separator String separating each link.
 * @return string HTML string containing links to each collection.
 */
function object_collection_terms_string( $post_id, $separator = '' ) {
	$terms = get_object_collection_terms( $post_id );
	$return_string = '';
	
	foreach ( $terms as $term ) {
		if ( '' !== $return_string ) {
			$return_string .= $separator;
		}
		$permalink = get_term_link( $term );
		$return_string .= "<a href='" . esc_url( $permalink ) . "'>" . esc_html( $term->name ) . '</a>';
	}
	
	return $return_string;
}

/**
 * Get museum objects associated with a collection term.
 *
 * @param int    $term_id     The ID of the collection term.
 * @param string $post_status The publication status of the posts to retrieve.
 * @param bool   $include_children Whether to include objects from child collections.
 * @return array Array of WP_Post objects.
 */
function get_collection_term_objects( $term_id, $post_status = 'publish', $include_children = false ) {
	$mobject_kinds = get_object_type_names();
	
	$args = array(
		'post_type'      => $mobject_kinds,
		'post_status'    => $post_status,
		'posts_per_page' => -1,
		'tax_query'      => array(
			array(
				'taxonomy'         => WPM_PREFIX . 'collection_tax',
				'field'            => 'term_id',
				'terms'            => $term_id,
				'include_children' => $include_children,
			),
		),
	);
	
	$query = new \WP_Query( $args );
	return $query->posts;
} 