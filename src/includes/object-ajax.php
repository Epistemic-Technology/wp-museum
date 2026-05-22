<?php
/**
 * Ajax functions that add functionality to edit screens for object post types.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

/**
 * Creates a new post with same type as current post and sets current post as its parent.
 * Called via ajax.
 *
 * @see javascript/admin.js::new_obj()
 */
function create_new_obj_aj() {
	if ( ! check_ajax_referer( 'kcDbrTMMfFqh6jy8&LrCGoH7p', 'nonce' ) ) {
		wp_die( esc_html__( 'Failed nonce check.', 'wp-museum' ) );
	}
	if ( ! isset( $_POST['parent'] ) ) {
		wp_die( esc_html__( 'Tried to create child post but parent post not found.', 'wp-museum' ) );
	}
	$parent_id = intval( $_POST['parent'] );
	if ( ! current_user_can( 'edit_post', $parent_id ) ) {
		wp_send_json_error( [ 'message' => __( 'Insufficient permissions.', 'wp-museum' ) ], 403 );
	}
	$parent_post = get_post( $parent_id );
	$categories  = wp_get_post_categories( $parent_id );
	$args        = [
		'post_title'    => '',
		'post_content'  => '',
		'post_type'     => $parent_post->post_type,
		'post_parent'   => $parent_id,
		'post_category' => $categories,
	];
	$post_id     = wp_insert_post( $args );
	echo esc_html( $post_id );
	wp_die();
}

/**
 * Adds javascript to upload image attachments to object posts.
 */
function wpm_media_box_enqueue() {
	wp_enqueue_media();
	wp_enqueue_script(
		'media-upload',
		'',
		[],
		SCRIPT_VERSION,
		true
	);
}
