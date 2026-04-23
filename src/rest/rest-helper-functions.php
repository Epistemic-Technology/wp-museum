<?php
/**
 * Helper functions for REST request processing.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

/**
 * Filter to change the "Read More..." text into "..." for REST requests.
 */
function rest_excerpt_filter() {
	return '...';
}

/**
 * Combine custom post data with standard post data and return as array.
 *
 * @param WP_POST | int $post Post object or post id.
 */
function combine_post_data( $post ) {
	if ( is_numeric( $post ) ) {
		$post = get_post( $post );
	}

	$custom = array_map(
		function ( $i ) {
			return $i[0];
		},
		get_post_custom( $post->ID )
	);

	$kind = get_kind_from_typename( $post->post_type );
	if ( ! empty( $kind ) ) {
		$filtered_custom = [];
		$fields          = get_mobject_fields( $kind->kind_id );
		foreach ( $custom as $field_slug => $field_data ) {
			if (
				isset( $fields[ $field_slug ] ) &&
				( $fields[ $field_slug ]->public || current_user_can( 'edit_posts' ) )
			) {
				$filtered_custom[ $field_slug ] = $field_data;
			}
		}
		$custom = $filtered_custom;

		$cat_field = get_mobject_field( $kind->kind_id, $kind->cat_field_id );
	}

	if ( ! empty( $cat_field ) ) {
		$cat_field_slug = $cat_field->slug;
	} else {
		$cat_field_slug = null;
	}

	$img_data = get_object_thumbnail( $post->ID );

	$object_taxonomies = get_object_taxonomies( $post, 'names' );
	$taxonomy_data     = [];
	foreach ( $object_taxonomies as $tax ) {
		$terms_data = get_the_terms( $post, $tax );
		if ( $terms_data ) {
			foreach ( $terms_data as $term ) {
				$taxonomy_data[ $tax ][ $term->slug ] = $term->name;
			}
		}
	}

	$object_collections    = get_object_collections( $post->ID );
	$object_collection_ids = array_map(
		function ( $collection_post ) {
			return $collection_post->ID;
		},
		$object_collections
	);

	add_filter( 'excerpt_more', __NAMESPACE__ . '\rest_excerpt_filter', 10, 0 );
	$filtered_excerpt =
		html_entity_decode(
			wp_strip_all_tags(
				get_the_excerpt( $post )
			)
		);
	remove_filter( 'excerpt_more', __NAMESPACE__ . '\rest_excerpt_filter', 10, 0 );

	$additional_fields = [
		'link'        => get_permalink( $post ),
		'edit_link'   => get_edit_post_link( $post, 'link' ),
		'excerpt'     => $filtered_excerpt,
		'thumbnail'   => $img_data,
		'cat_field'   => $cat_field_slug,
		'taxonomies'  => $taxonomy_data,
		'collections' => $object_collection_ids,
	];

	$default_post_data                      = $post->to_array();
	$default_post_data['post_content']      =
		apply_filters( 'the_content', get_the_content( null, false, $post ) );
	$default_post_data['post_status_label'] =
		get_post_status_object( $default_post_data['post_status'] )->label;

	$post_data = array_merge(
		$default_post_data,
		$custom,
		$additional_fields
	);
	return $post_data;
}

/**
 * Combine post data for array of posts.
 *
 * @param Array $posts      Array of WP_Post objects.
 * @param Array $query_data Associative array of extra data to add to first post.
 */
function combine_post_data_array( $posts, $query_data = null ) {
	$post_data = array_map( __NAMESPACE__ . '\combine_post_data', $posts );
	if ( ! empty( $query_data ) && count( $post_data ) > 0 ) {
		$post_data[0]['query_data'] = $query_data;
	}
	return $post_data;
}

/**
 * Get data for images assoicated with a post and return as an array.
 *
 * @param WP_POST | int $post The post.
 */
function object_image_data( $post ) {
	if ( is_numeric( $post ) ) {
		$post = get_post( $post );
	}

	$images      = get_object_image_attachments( $post->ID );
	$image_sizes = get_intermediate_image_sizes();

	$associated_image_data = [];
	foreach ( $images as $image_id => $sort_order ) {
		$image_post = get_post( $image_id );
		$image_data = [];

		$image_data['title']       = $image_post->post_title;
		$image_data['caption']     = $image_post->post_excerpt;
		$image_data['description'] = $image_post->post_content;
		$image_data['alt']         = get_post_meta( $image_id, '_wp_attachment_image_alt', true );
		$image_data['sort_order']  = $sort_order;

		foreach ( $image_sizes as $size_slug ) {
			$image_data[ $size_slug ] = wp_get_attachment_image_src( $image_id, $size_slug );
		}
		$image_data['full']                 = wp_get_attachment_image_src( $image_id, 'full' );
		$associated_image_data[ $image_id ] = $image_data;
	}

	return $associated_image_data;
}

/**
 * Get the post, if the ID is valid.
 *
 * Copy-paste from @see class-wp-rest-posts-controller.php (4.7.2).
 *
 * @param int $id Supplied ID.
 * @return WP_Post|WP_Error Post object if ID is valid, WP_Error otherwise.
 */
function get_post_for_rest( $id ) {
	$error = new \WP_Error(
		'rest_post_invalid_id',
		__( 'Invalid post ID.' ),
		array( 'status' => 404 )
	);

	if ( (int) $id <= 0 ) {
		return $error;
	}

	$post = get_post( (int) $id );
	if ( empty( $post ) || empty( $post->ID ) ) {
		return $error;
	}
	return $post;
}
