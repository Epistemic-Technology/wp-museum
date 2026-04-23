<?php
/**
 * Creates the collection post type, an instance of CustomPostType.
 *
 * Collections are associated with WordPress categories. They "contain"
 * museum objects in associated categories. They may optionally contain
 * objects of sub-categories and/or child collections.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

$collection_options   = [
	'type'         => WPM_PREFIX . 'collection',
	'label'        => 'Collection',
	'label_plural' => 'Collections',
	'description'  => 'Contains related museum objects.',
	'menu_icon'    => museum_icon(),
	'hierarchical' => true,
	'options'      => [
		'capabilities' => [
			'edit_posts'           => WPM_PREFIX . 'edit_collections',
			'edit_others_posts'    => WPM_PREFIX . 'edit_others_collections',
			'publish_posts'        => WPM_PREFIX . 'publish_collections',
			'read_private_posts'   => WPM_PREFIX . 'read_private_collections',
			'delete_posts'         => WPM_PREFIX . 'delete_collections',
			'edit_published_posts' => WPM_PREFIX . 'edit_published_collections',
		],
		'map_meta_cap' => true,
		'template'     => [
			[ 'core/paragraph', [ 'placeholder' => 'A general description of the collection...' ] ],
			[ 'wp-museum/collection-objects' ],
		],
	],
];
$collection_post_type = new CustomPostType( $collection_options );
$collection_post_type->add_support( [ 'thumbnail', 'custom-fields' ] );
$collection_post_type->add_taxonomy( 'collection_tag' );

/*
 * Custom Fields
 */
$categories       = get_categories( array( 'hide_empty' => false ) );
$category_options = [ -1 => '' ];
foreach ( $categories as $category ) {
	$category_options[ $category->cat_ID ] = $category->name;
}
$collection_post_type->register_post_meta( 'associated_category', 'string', 'Associated Category' );
$collection_post_type->register_post_meta( 'include_sub_collections', 'boolean', 'Include Sub Collections' );
$collection_post_type->register_post_meta( 'include_child_categories', 'boolean', 'Include Child Categories' );
$collection_post_type->register_post_meta( 'single_page', 'boolean', 'Single Page View', [ 'default' => true ] );
$collection_post_type->register_post_meta( 'collection_term_id', 'number', 'Associated Collection Term ID' );
$collection_post_type->register_post_meta( 'auto_collection', 'boolean', 'Automatically Add Objects to Collection', [ 'default' => false ] );
$collection_post_type->register_post_meta( 
	'object_tags', 
	'array', 
	'Object Tags', 
	[ 
		'default' => [], 
		'show_in_rest' => [
			'schema' => [
				'type' => 'array',
				'items' => [
					'type' => 'string'
				]
			]
		]
	] 
);
/*
 * Register the post type (CustomPostType)
 */
$collection_post_type->register();

/*
 * Collection Tag taxonomy ( separate from post tag taxonomy ).
 */
add_action(
	'init',
	function () {
		register_taxonomy(
			'collection_tag',
			WPM_PREFIX . 'collection',
			[
				'hierarchical' => false,
				'show_in_rest' => true,
			]
		);
	},
	0
);

/**
 * Handle automatic creation and association of taxonomy terms when a collection is saved.
 * This ensures that the collection taxonomy hierarchy mirrors the collection post type hierarchy.
 *
 * @param int     $post_id The post ID.
 * @param WP_Post $post    The post object.
 * @param bool    $update  Whether this is an existing post being updated.
 */
function handle_collection_term_association( $post_id, $post, $update ) {
	// Skip auto-saves and revisions
	if ( ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) || wp_is_post_revision( $post_id ) ) {
		return;
	}

	// Only process our collection post type
	if ( WPM_PREFIX . 'collection' !== $post->post_type ) {
		return;
	}

	// Check if this collection already has an associated term
	$existing_term_id = get_post_meta( $post_id, WPM_PREFIX . 'collection_term_id', true );
	
	// Get the parent term ID if the collection has a parent
	$parent_term_id = 0;
	if ( $post->post_parent ) {
		$parent_term_id = get_post_meta( $post->post_parent, WPM_PREFIX . 'collection_term_id', true );
	}
	
	if ( $existing_term_id ) {
		// Update the existing term to match the collection
		$term = get_term( $existing_term_id, WPM_PREFIX . 'collection_tax' );
		
		if ( $term && !is_wp_error( $term ) ) {
			$term_args = [];
			
			// Update the term name and slug if needed
			if ( $term->name !== $post->post_title || $term->slug !== $post->post_name ) {
				$term_args['name'] = $post->post_title;
				$term_args['slug'] = $post->post_name;
			}
			
			// Update parent if different from current parent
			if ( $term->parent != $parent_term_id ) {
				$term_args['parent'] = $parent_term_id;
			}
			
			// Only update if there are changes
			if ( !empty( $term_args ) ) {
				wp_update_term(
					$existing_term_id,
					WPM_PREFIX . 'collection_tax',
					$term_args
				);
			}
		} else {
			// Term doesn't exist anymore, create a new one
			$result = wp_insert_term(
				$post->post_title,
				WPM_PREFIX . 'collection_tax',
				[
					'slug' => $post->post_name,
					'parent' => $parent_term_id,
				]
			);
			
			if ( !is_wp_error( $result ) ) {
				update_post_meta( $post_id, WPM_PREFIX . 'collection_term_id', $result['term_id'] );
			}
		}
	} else {
		// Create a new term for this collection
		$result = wp_insert_term(
			$post->post_title,
			WPM_PREFIX . 'collection_tax',
			[
				'slug' => $post->post_name,
				'parent' => $parent_term_id,
			]
		);
		
		if ( !is_wp_error( $result ) ) {
			$term_id = $result['term_id'];
			// Store the term ID in the collection post meta
			update_post_meta( $post_id, WPM_PREFIX . 'collection_term_id', $term_id );
		}
	}
}
add_action( 'save_post', __NAMESPACE__ . '\handle_collection_term_association', 10, 3 );

/**
 * When a collection post is deleted, also delete its associated taxonomy term.
 *
 * @param int $post_id The ID of the post being deleted.
 */
function handle_collection_deletion( $post_id ) {
	// Only process our collection post type
	if ( WPM_PREFIX . 'collection' !== get_post_type( $post_id ) ) {
		return;
	}
	
	// Get the associated term ID
	$term_id = get_post_meta( $post_id, WPM_PREFIX . 'collection_term_id', true );
	
	if ( $term_id ) {
		// Delete the term
		wp_delete_term( $term_id, WPM_PREFIX . 'collection_tax' );
	}
}
add_action( 'before_delete_post', __NAMESPACE__ . '\handle_collection_deletion' );

/**
 * When a collection post's parent changes, update the hierarchy of its associated term
 * and all child terms to match the post hierarchy.
 *
 * @param int $post_id The ID of the post being updated.
 * @param int $parent_id The new parent ID.
 */
function handle_collection_hierarchy_change( $post_id, $parent_id ) {
	// Only process our collection post type
	if ( WPM_PREFIX . 'collection' !== get_post_type( $post_id ) ) {
		return;
	}
	
	// Get the associated term ID
	$term_id = get_post_meta( $post_id, WPM_PREFIX . 'collection_term_id', true );
	
	if ( !$term_id ) {
		return;
	}
	
	// Get the parent term ID
	$parent_term_id = 0;
	if ( $parent_id ) {
		$parent_term_id = get_post_meta( $parent_id, WPM_PREFIX . 'collection_term_id', true );
	}
	
	// Update the term's parent
	wp_update_term(
		$term_id,
		WPM_PREFIX . 'collection_tax',
		[
			'parent' => $parent_term_id,
		]
	);
	
	// Now recursively update all child collections
	$child_posts = get_posts([
		'post_type' => WPM_PREFIX . 'collection',
		'post_parent' => $post_id,
		'posts_per_page' => -1,
		'post_status' => 'any',
	]);
	
	foreach ( $child_posts as $child_post ) {
		handle_collection_hierarchy_change( $child_post->ID, $post_id );
	}
}
add_action( 'wp_insert_post', function( $post_id, $post, $update ) {
	if ( $update && WPM_PREFIX . 'collection' === $post->post_type ) {
		// Get the previous parent
		$previous_parent = wp_get_post_parent_id( $post_id );
		
		// If parent has changed, update the hierarchy
		if ( $previous_parent !== $post->post_parent ) {
			handle_collection_hierarchy_change( $post_id, $post->post_parent );
		}
	}
}, 20, 3 );
