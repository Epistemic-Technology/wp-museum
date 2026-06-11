<?php
/**
 * Filters museum object admin list tables by dashboard health check results.
 *
 * The dashboard's Health panel links to object list pages with a wpm_health
 * query parameter so users see only the objects with the reported problem:
 *
 * edit.php?post_type=<type>&wpm_health=missing-required
 * edit.php?post_type=<type>&wpm_health=missing-image
 * edit.php?post_type=<type>&wpm_health=missing-gallery
 * edit.php?post_type=<type>&wpm_health=empty-cat-id
 * edit.php?post_type=<type>&wpm_health=duplicate-cat-id
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

/**
 * Health filters supported on object list pages.
 */
const HEALTH_LIST_FILTERS = [
	'missing-required',
	'missing-image',
	'missing-gallery',
	'empty-cat-id',
	'duplicate-cat-id',
];

/**
 * Returns the requested health filter for the current admin request, if valid.
 *
 * @return string|null The filter name, or null if absent or invalid.
 */
function current_health_list_filter() {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	if ( ! isset( $_GET['wpm_health'] ) ) {
		return null;
	}
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$filter = sanitize_key( wp_unslash( $_GET['wpm_health'] ) );
	if ( ! in_array( $filter, HEALTH_LIST_FILTERS, true ) ) {
		return null;
	}
	return $filter;
}

/**
 * Restricts the admin object list query to posts matching a health filter.
 *
 * Hooked to posts_clauses.
 *
 * @param [string] $clauses The query's clauses (where, join, orderby, ...).
 * @param WP_Query $query   The query being built.
 * @return [string] Modified clauses.
 */
function filter_object_list_by_health( $clauses, $query ) {
	if ( ! is_admin() || ! $query->is_main_query() ) {
		return $clauses;
	}

	$filter = current_health_list_filter();
	if ( is_null( $filter ) ) {
		return $clauses;
	}

	$type_name = $query->get( 'post_type' );
	if ( ! is_string( $type_name ) || '' === $type_name ) {
		return $clauses;
	}

	$kind = get_kind_from_typename( $type_name );
	if ( is_null( $kind ) ) {
		return $clauses;
	}

	return health_filter_clauses( $clauses, $kind, $filter );
}

/**
 * Applies a health filter's conditions to query clauses.
 *
 * Conditions mirror the counting queries in Dashboard_Health_Controller so
 * the filtered list matches the dashboard's reported counts.
 *
 * @param [string]   $clauses The query's clauses (where, join, orderby, ...).
 * @param ObjectKind $kind    The object kind being listed.
 * @param string     $filter  One of HEALTH_LIST_FILTERS.
 * @return [string] Modified clauses.
 */
function health_filter_clauses( $clauses, $kind, $filter ) {
	global $wpdb;

	$fields    = $kind->get_fields();
	$cat_field = null;
	if ( ! empty( $kind->cat_field_id ) ) {
		foreach ( $fields as $field ) {
			if ( $field->field_id === $kind->cat_field_id ) {
				$cat_field = $field;
				break;
			}
		}
	}

	$missing_meta_where = function ( $meta_key, $empty_values ) use ( $wpdb ) {
		$placeholders = implode( ', ', array_fill( 0, count( $empty_values ), '%s' ) );
		$sql          =
			"NOT EXISTS (SELECT 1 FROM {$wpdb->postmeta} hm " .
			"WHERE hm.post_id = {$wpdb->posts}.ID AND hm.meta_key = %s " .
			"AND hm.meta_value NOT IN ( $placeholders ))";
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		return $wpdb->prepare( $sql, array_merge( [ $meta_key ], $empty_values ) );
	};

	switch ( $filter ) {
		case 'missing-required':
			$conditions = [];
			foreach ( $fields as $field ) {
				if (
					$field->required &&
					( is_null( $cat_field ) || $field->field_id !== $cat_field->field_id )
				) {
					$conditions[] = $missing_meta_where( $field->slug, [ '' ] );
				}
			}
			if ( 0 === count( $conditions ) ) {
				return $clauses;
			}
			$clauses['where'] .=
				" AND {$wpdb->posts}.post_status = 'publish' AND (" .
				implode( ' OR ', $conditions ) . ')';
			break;

		case 'missing-image':
			$clauses['where'] .=
				" AND {$wpdb->posts}.post_status = 'publish' AND " .
				$missing_meta_where( '_thumbnail_id', [ '', '0' ] );
			break;

		case 'missing-gallery':
			$clauses['where'] .=
				" AND {$wpdb->posts}.post_status = 'publish' AND " .
				$missing_meta_where( 'wpm_gallery_attach_ids', [ '', 'a:0:{}' ] );
			break;

		case 'empty-cat-id':
			if ( is_null( $cat_field ) ) {
				return $clauses;
			}
			$clauses['where'] .=
				" AND {$wpdb->posts}.post_status = 'publish' AND " .
				$missing_meta_where( $cat_field->slug, [ '' ] );
			break;

		case 'duplicate-cat-id':
			if ( is_null( $cat_field ) ) {
				return $clauses;
			}
			$clauses['where'] .= $wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				" AND {$wpdb->posts}.post_status NOT IN ( 'trash', 'auto-draft' )
				AND EXISTS (
					SELECT 1 FROM {$wpdb->postmeta} hm
					WHERE hm.post_id = {$wpdb->posts}.ID AND hm.meta_key = %s
					AND hm.meta_value <> ''
					AND hm.meta_value IN (
						SELECT meta_value FROM (
							SELECT pm2.meta_value FROM {$wpdb->postmeta} pm2
							INNER JOIN {$wpdb->posts} p2 ON p2.ID = pm2.post_id
							WHERE p2.post_type = %s
							AND p2.post_status NOT IN ( 'trash', 'auto-draft' )
							AND pm2.meta_key = %s AND pm2.meta_value <> ''
							GROUP BY pm2.meta_value HAVING COUNT(*) > 1
						) duplicate_values
					)
				)",
				$cat_field->slug,
				$kind->type_name,
				$cat_field->slug
			);
			// Sort by catalogue ID so duplicate pairs appear together.
			$clauses['orderby'] = $wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"(SELECT om.meta_value FROM {$wpdb->postmeta} om " .
				"WHERE om.post_id = {$wpdb->posts}.ID AND om.meta_key = %s LIMIT 1) ASC",
				$cat_field->slug
			);
			break;
	}

	return $clauses;
}

/**
 * Shows a notice on filtered object lists explaining the active filter.
 *
 * Hooked to admin_notices.
 */
function health_filter_admin_notice() {
	$filter = current_health_list_filter();
	if ( is_null( $filter ) ) {
		return;
	}

	$screen = get_current_screen();
	if ( ! $screen || 'edit' !== $screen->base ) {
		return;
	}

	$kind = get_kind_from_typename( $screen->post_type );
	if ( is_null( $kind ) ) {
		return;
	}

	$cat_field_name = __( 'catalogue ID', 'wp-museum' );
	if ( ! empty( $kind->cat_field_id ) ) {
		$cat_field = get_mobject_field( $kind->kind_id, $kind->cat_field_id );
		if ( ! is_null( $cat_field ) ) {
			$cat_field_name = $cat_field->name;
		}
	}

	$descriptions = [
		'missing-required' => __( 'published objects missing required field values', 'wp-museum' ),
		'missing-image'    => __( 'published objects without a featured image', 'wp-museum' ),
		'missing-gallery'  => __( 'published objects with an empty image gallery', 'wp-museum' ),
		'empty-cat-id'     => sprintf(
			/* translators: %s: catalogue ID field name */
			__( 'published objects with no %s', 'wp-museum' ),
			$cat_field_name
		),
		'duplicate-cat-id' => sprintf(
			/* translators: %s: catalogue ID field name */
			__( 'objects whose %s is shared with another object, sorted so duplicates are adjacent', 'wp-museum' ),
			$cat_field_name
		),
	];

	printf(
		'<div class="notice notice-info"><p>%s <a href="%s">%s</a></p></div>',
		esc_html(
			sprintf(
				/* translators: %s: description of the active health filter */
				__( 'Health filter active: showing only %s.', 'wp-museum' ),
				$descriptions[ $filter ]
			)
		),
		esc_url( remove_query_arg( 'wpm_health' ) ),
		esc_html__( 'Show all', 'wp-museum' )
	);
}
