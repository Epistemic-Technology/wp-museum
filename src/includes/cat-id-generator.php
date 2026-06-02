<?php
/**
 * Auto-generate catalogue ID values for museum objects whose kind has
 * the option enabled and whose cat field is left blank on save (#30).
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

/**
 * Generate the next catalogue ID string for a kind based on the highest
 * existing numeric suffix on its cat field, optionally formatted with
 * the kind's configured prefix and zero-padding.
 *
 * @param ObjectKind $kind The kind to compute the next ID for.
 * @return string The new catalogue ID.
 */
function compute_next_cat_id_for_kind( ObjectKind $kind ) {
	global $wpdb;

	$cat_field = get_mobject_field( $kind->kind_id, $kind->cat_field_id );
	if ( empty( $cat_field ) || empty( $cat_field->slug ) ) {
		return '';
	}

	$prefix     = (string) $kind->cat_id_prefix;
	$pad_length = max( 0, (int) $kind->cat_id_pad_length );

	// Look at the numeric suffix of every existing value on this kind's
	// cat field whose prefix matches. MAX() across the numeric part gives
	// the next sequence number.
	$prefix_len = strlen( $prefix );
	$max_n      = (int) $wpdb->get_var(
		$wpdb->prepare(
			"SELECT MAX(CAST(SUBSTRING(pm.meta_value, %d) AS UNSIGNED))
			 FROM {$wpdb->postmeta} pm
			 INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
			 WHERE pm.meta_key = %s
			   AND p.post_type = %s
			   AND pm.meta_value LIKE %s",
			$prefix_len + 1,
			$cat_field->slug,
			$kind->type_name,
			$wpdb->esc_like( $prefix ) . '%'
		)
	);

	$next = $max_n + 1;
	if ( $pad_length > 0 ) {
		$next = str_pad( (string) $next, $pad_length, '0', STR_PAD_LEFT );
	}
	return $prefix . $next;
}

/**
 * Fill in an empty catalogue ID for a single post if its kind has
 * auto-generation enabled. Idempotent: skips when the field is already
 * populated.
 *
 * @param int $post_id The post being saved.
 * @return void
 */
function maybe_auto_generate_cat_id( $post_id ) {
	if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
		return;
	}
	$post_type = get_post_type( $post_id );
	if ( ! $post_type || ! in_array( $post_type, get_object_type_names(), true ) ) {
		return;
	}
	$kind = get_kind_from_typename( $post_type );
	if ( empty( $kind ) || ! $kind->cat_id_auto_generate ) {
		return;
	}
	$cat_field = get_mobject_field( $kind->kind_id, $kind->cat_field_id );
	if ( empty( $cat_field ) || empty( $cat_field->slug ) ) {
		return;
	}
	$existing = get_post_meta( $post_id, $cat_field->slug, true );
	if ( ! empty( $existing ) ) {
		return;
	}
	$new_value = compute_next_cat_id_for_kind( $kind );
	if ( '' === $new_value ) {
		return;
	}
	update_post_meta( $post_id, $cat_field->slug, $new_value );
}

/**
 * Register save hooks for every kind's post type so empty cat IDs get
 * auto-filled. Runs late on init so kinds and post types are registered.
 *
 * - rest_after_insert_<post_type> covers Gutenberg/REST saves (the
 *   common path; fires after WP commits the meta values from the
 *   request, so we see whether the field is really empty).
 * - save_post_<post_type> at priority 99 is a defensive backup for any
 *   non-REST save flows (classic editor, programmatic wp_insert_post,
 *   etc.).
 */
function register_cat_id_auto_generation() {
	$post_types = get_object_type_names();
	foreach ( $post_types as $post_type ) {
		add_action(
			'rest_after_insert_' . $post_type,
			function ( $post ) {
				maybe_auto_generate_cat_id( $post->ID );
			}
		);
		add_action(
			'save_post_' . $post_type,
			__NAMESPACE__ . '\maybe_auto_generate_cat_id',
			99
		);
	}
}
add_action( 'init', __NAMESPACE__ . '\register_cat_id_auto_generation', 99 );
