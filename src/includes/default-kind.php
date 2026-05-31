<?php
/**
 * Installs a starter "Object" kind on first activation when the plugin
 * has no kinds yet (#4). The definition lives in data/default-kind.json
 * so it's version-controlled and can be edited without touching PHP.
 *
 * The installer also doubles as a building block for kind import (#6).
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

/**
 * Install the bundled default kind when no kinds exist yet.
 *
 * Idempotent: if any kind already exists (admin started building their
 * own, or this ran before), do nothing. Called from the activation hook
 * in wp-museum.php.
 */
function install_default_kind_if_empty() {
	// During activation, `plugins_loaded` has already fired for other
	// plugins; our db_version_check normally runs on that hook, so the
	// tables don't exist yet for the plugin being activated. Create
	// them defensively before querying.
	db_version_check();

	$existing = get_mobject_kinds();
	if ( ! empty( $existing ) ) {
		return;
	}

	$json_path = __DIR__ . '/../data/default-kind.json';
	if ( ! file_exists( $json_path ) ) {
		return;
	}

	$contents = file_get_contents( $json_path ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
	if ( false === $contents ) {
		return;
	}

	$data = json_decode( $contents, true );
	if ( ! is_array( $data ) ) {
		return;
	}

	install_kind_from_array( $data );
}

/**
 * Build and persist an ObjectKind (with its fields) from a parsed array.
 *
 * Useful both for the default-kind activation flow and as a building
 * block for future kind import.
 *
 * Shape expected:
 *   {
 *     label, label_plural, description, categorized, hierarchical,
 *     must_featured_image, strict_checking, exclude_from_search,
 *     cat_field_name,  // matches one of the field names below
 *     fields: [ { name, type, required, quick_browse, public,
 *                 help_text, public_description, ... type-specific } ]
 *   }
 *
 * @param array $data Parsed kind data.
 * @return ObjectKind|null The new kind, or null on failure.
 */
function install_kind_from_array( $data ) {
	global $wpdb;

	$kind_row = (object) [
		'label'               => $data['label'] ?? 'Object',
		'label_plural'        => $data['label_plural'] ?? ( ( $data['label'] ?? 'Object' ) . 's' ),
		'description'         => $data['description'] ?? '',
		'categorized'         => ! empty( $data['categorized'] ),
		'hierarchical'        => ! empty( $data['hierarchical'] ),
		'must_featured_image' => ! empty( $data['must_featured_image'] ),
		'strict_checking'     => ! empty( $data['strict_checking'] ),
		'exclude_from_search' => ! empty( $data['exclude_from_search'] ),
	];

	$kind = new ObjectKind( $kind_row );
	$kind->save_to_db();

	// save_to_db() doesn't populate $kind->kind_id on insert — grab it
	// from $wpdb->insert_id so we can hang fields off it.
	$new_kind_id = (int) $wpdb->insert_id;
	if ( $new_kind_id < 1 ) {
		return null;
	}
	$kind->kind_id = $new_kind_id;

	$cat_field_id   = null;
	$cat_field_name = $data['cat_field_name'] ?? null;
	$display_order  = 1;

	foreach ( $data['fields'] ?? [] as $field_data ) {
		$field_data['kind_id']       = $kind->kind_id;
		$field_data['display_order'] = $field_data['display_order'] ?? $display_order++;
		// Default public => true unless explicitly false.
		if ( ! isset( $field_data['public'] ) ) {
			$field_data['public'] = true;
		}
		$field = MObjectField::from_rest( $field_data );
		$field->save_to_db();
		$new_field_id    = (int) $wpdb->insert_id;
		$field->field_id = $new_field_id;

		if ( $cat_field_name && isset( $field_data['name'] ) && $field_data['name'] === $cat_field_name ) {
			$cat_field_id = $new_field_id;
		}
	}

	if ( $cat_field_id ) {
		$kind->cat_field_id = $cat_field_id;
		$kind->save_to_db();
	}

	return $kind;
}
