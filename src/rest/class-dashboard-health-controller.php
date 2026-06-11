<?php
/**
 * Controller class for dashboard health checks.
 *
 * Registers the following route:
 * /dashboard_health                 Health check results for the dashboard.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

/**
 * Computes health checks for the admin dashboard's Health panel.
 *
 * Results are cached in a transient because the content checks query
 * postmeta across every museum object.
 */
class Dashboard_Health_Controller extends \WP_REST_Controller {

	/**
	 * Transient key for cached health check results.
	 */
	const TRANSIENT_KEY = 'wpm_dashboard_health';

	/**
	 * How long to cache health check results, in seconds.
	 */
	const CACHE_TTL = 10 * MINUTE_IN_SECONDS;

	/**
	 * The REST namespace (relative to /wp-json/).
	 *
	 * @var string $namespace
	 */
	protected $namespace;

	/**
	 * Default constructor
	 */
	public function __construct() {
		$this->namespace = REST_NAMESPACE;
	}

	/**
	 * Registers routes.
	 */
	public function register_routes() {
		/**
		 * /dashboard_health                 Health check results.
		 */
		register_rest_route(
			$this->namespace,
			'/dashboard_health',
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'permission_callback' => [ $this, 'get_items_permission_check' ],
					'callback'            => [ $this, 'get_items' ],
					'args'                => [
						'refresh' => [
							'description' => __( 'Bypass the cached results and recompute.', 'wp-museum' ),
							'type'        => 'boolean',
							'default'     => false,
						],
					],
				],
			],
		);
	}

	/**
	 * Checks whether visitor has permission to get items from the API.
	 *
	 * Health checks expose site configuration, so they are restricted to
	 * administrators, matching the dashboard page's capability.
	 *
	 * @param WP_REST_Request $request The REST Request object.
	 * @return boolean True if the user is permitted to view health checks.
	 */
	public function get_items_permission_check( $request ) {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Retrieves health check results, from cache if available.
	 *
	 * Each check item has the shape:
	 * [
	 *   'id'       => string  Stable identifier for the check instance.
	 *   'severity' => string  'error' | 'warning'.
	 *   'message'  => string  Human-readable description.
	 *   'count'    => int     Number of affected items, or null.
	 *   'link'     => string  Admin-relative URL to address the issue, or null.
	 * ]
	 *
	 * @param WP_REST_Request $request The REST Request object.
	 * @return WP_REST_Response Health check results.
	 */
	public function get_items( $request ) {
		if ( ! $request->get_param( 'refresh' ) ) {
			$cached = get_transient( self::TRANSIENT_KEY );
			if ( is_array( $cached ) ) {
				$cached['cached'] = true;
				return rest_ensure_response( $cached );
			}
		}

		$checks = array_merge(
			$this->check_database(),
			$this->check_kind_configuration(),
			$this->check_remote_settings(),
			$this->check_object_content()
		);

		$result = [
			'checks'    => $checks,
			'generated' => current_time( 'mysql' ),
			'cached'    => false,
		];

		set_transient( self::TRANSIENT_KEY, $result, self::CACHE_TTL );

		return rest_ensure_response( $result );
	}

	/**
	 * Deletes cached health check results.
	 */
	public static function flush_cache() {
		delete_transient( self::TRANSIENT_KEY );
	}

	/**
	 * Checks that custom database tables exist and the schema is current.
	 *
	 * @return array Array of check items.
	 */
	private function check_database() {
		$items = [];

		foreach ( missing_museum_tables() as $table_name ) {
			$items[] = [
				'id'       => 'missing-table-' . $table_name,
				'severity' => 'error',
				'message'  => sprintf(
					/* translators: %s: database table name */
					__( 'Database table %s is missing. Try deactivating and reactivating the plugin.', 'wp-museum' ),
					$table_name
				),
				'count'    => null,
				'link'     => null,
			];
		}

		$db_version = get_site_option( 'wpm_db_version' );
		if ( DB_VERSION !== $db_version ) {
			$items[] = [
				'id'       => 'db-version-mismatch',
				'severity' => 'warning',
				'message'  => sprintf(
					/* translators: 1: stored database schema version 2: plugin's expected version */
					__( 'Database schema version (%1$s) does not match the plugin version (%2$s). Try deactivating and reactivating the plugin.', 'wp-museum' ),
					$db_version ? $db_version : __( 'unknown', 'wp-museum' ),
					DB_VERSION
				),
				'count'    => null,
				'link'     => null,
			];
		}

		return $items;
	}

	/**
	 * Checks each object kind for configuration problems.
	 *
	 * @return array Array of check items.
	 */
	private function check_kind_configuration() {
		$items = [];

		foreach ( get_mobject_kinds() as $kind ) {
			$fields    = $kind->get_fields();
			$kind_link = 'admin.php?page=wpm-react-admin-objects&view=edit&kind_id=' . $kind->kind_id;

			if ( 0 === count( $fields ) ) {
				$items[] = [
					'id'       => 'kind-no-fields-' . $kind->kind_id,
					'severity' => 'warning',
					'message'  => sprintf(
						/* translators: %s: object kind label */
						__( 'The kind %s has no fields defined.', 'wp-museum' ),
						$kind->label
					),
					'count'    => null,
					'link'     => $kind_link,
				];
				continue;
			}

			if ( is_null( $this->get_cat_field( $kind, $fields ) ) ) {
				$items[] = [
					'id'       => 'kind-no-cat-field-' . $kind->kind_id,
					'severity' => 'warning',
					'message'  => sprintf(
						/* translators: %s: object kind label */
						__( 'The kind %s has no catalogue ID field set.', 'wp-museum' ),
						$kind->label
					),
					'count'    => null,
					'link'     => $kind_link,
				];
			}

			$mapping_errors = $kind->validate_oai_pmh_mappings();
			if ( count( $mapping_errors ) > 0 ) {
				$items[] = [
					'id'       => 'kind-oai-pmh-' . $kind->kind_id,
					'severity' => 'warning',
					'message'  => sprintf(
						/* translators: 1: object kind label 2: number of mapping problems */
						__( 'The kind %1$s has %2$d invalid OAI-PMH mapping(s).', 'wp-museum' ),
						$kind->label,
						count( $mapping_errors )
					),
					'count'    => count( $mapping_errors ),
					'link'     => 'admin.php?page=wpm-react-admin-oai-pmh',
				];
			}
		}

		return $items;
	}

	/**
	 * Checks remote access settings for risky combinations.
	 *
	 * @return array Array of check items.
	 */
	private function check_remote_settings() {
		$items = [];

		if (
			get_option( 'allow_remote_requests' ) &&
			get_option( 'allow_unregistered_requests' )
		) {
			$items[] = [
				'id'       => 'remote-unregistered-allowed',
				'severity' => 'warning',
				'message'  => __( 'Remote requests are allowed from unregistered domains, so any site can read your collection data.', 'wp-museum' ),
				'count'    => null,
				'link'     => 'admin.php?page=wpm-react-admin-museum-remote',
			];
		}

		return $items;
	}

	/**
	 * Checks museum objects against their kind's requirements.
	 *
	 * @return array Array of check items.
	 */
	private function check_object_content() {
		$items = [];

		foreach ( get_mobject_kinds() as $kind ) {
			if ( empty( $kind->type_name ) ) {
				continue;
			}

			$fields    = $kind->get_fields();
			$cat_field = $this->get_cat_field( $kind, $fields );
			$edit_link = 'edit.php?post_type=' . $kind->type_name;

			$required_slugs = [];
			foreach ( $fields as $field ) {
				// The catalogue ID field gets its own more specific checks.
				if ( $field->required && ( is_null( $cat_field ) || $field->field_id !== $cat_field->field_id ) ) {
					$required_slugs[] = $field->slug;
				}
			}

			if ( count( $required_slugs ) > 0 ) {
				$count = $this->count_missing_required( $kind->type_name, $required_slugs );
				if ( $count > 0 ) {
					$items[] = [
						'id'       => 'objects-missing-required-' . $kind->kind_id,
						'severity' => 'warning',
						'message'  => sprintf(
							/* translators: 1: number of objects 2: object kind plural label */
							__( '%1$d published %2$s are missing required field values.', 'wp-museum' ),
							$count,
							$kind->label_plural
						),
						'count'    => $count,
						'link'     => $edit_link . '&wpm_health=missing-required',
					];
				}
			}

			if ( $kind->must_featured_image ) {
				$count = $this->count_missing_meta( $kind->type_name, '_thumbnail_id', [ '', '0' ] );
				if ( $count > 0 ) {
					$items[] = [
						'id'       => 'objects-missing-image-' . $kind->kind_id,
						'severity' => 'warning',
						'message'  => sprintf(
							/* translators: 1: number of objects 2: object kind plural label */
							__( '%1$d published %2$s are missing a featured image.', 'wp-museum' ),
							$count,
							$kind->label_plural
						),
						'count'    => $count,
						'link'     => $edit_link . '&wpm_health=missing-image',
					];
				}
			}

			if ( $kind->must_gallery ) {
				$count = $this->count_missing_meta( $kind->type_name, 'wpm_gallery_attach_ids', [ '', 'a:0:{}' ] );
				if ( $count > 0 ) {
					$items[] = [
						'id'       => 'objects-missing-gallery-' . $kind->kind_id,
						'severity' => 'warning',
						'message'  => sprintf(
							/* translators: 1: number of objects 2: object kind plural label */
							__( '%1$d published %2$s have an empty image gallery.', 'wp-museum' ),
							$count,
							$kind->label_plural
						),
						'count'    => $count,
						'link'     => $edit_link . '&wpm_health=missing-gallery',
					];
				}
			}

			if ( ! is_null( $cat_field ) ) {
				$count = $this->count_missing_meta( $kind->type_name, $cat_field->slug, [ '' ] );
				if ( $count > 0 ) {
					$items[] = [
						'id'       => 'objects-empty-cat-id-' . $kind->kind_id,
						'severity' => 'warning',
						'message'  => sprintf(
							/* translators: 1: number of objects 2: object kind plural label 3: catalogue field name */
							__( '%1$d published %2$s have no %3$s.', 'wp-museum' ),
							$count,
							$kind->label_plural,
							$cat_field->name
						),
						'count'    => $count,
						'link'     => $edit_link . '&wpm_health=empty-cat-id',
					];
				}

				$count = $this->count_duplicate_meta_values( $kind->type_name, $cat_field->slug );
				if ( $count > 0 ) {
					$items[] = [
						'id'       => 'objects-duplicate-cat-id-' . $kind->kind_id,
						'severity' => 'error',
						'message'  => sprintf(
							/* translators: 1: number of duplicated values 2: catalogue field name 3: object kind label */
							__( '%1$d %2$s value(s) are shared by more than one %3$s.', 'wp-museum' ),
							$count,
							$cat_field->name,
							$kind->label
						),
						'count'    => $count,
						'link'     => $edit_link . '&wpm_health=duplicate-cat-id',
					];
				}
			}
		}

		return $items;
	}

	/**
	 * Finds the catalogue ID field for a kind, if one is set and exists.
	 *
	 * @param ObjectKind     $kind   The object kind.
	 * @param [MObjectField] $fields The kind's fields, keyed by slug.
	 * @return MObjectField|null The catalogue ID field, or null.
	 */
	private function get_cat_field( $kind, $fields ) {
		if ( empty( $kind->cat_field_id ) ) {
			return null;
		}
		foreach ( $fields as $field ) {
			if ( $field->field_id === $kind->cat_field_id ) {
				return $field;
			}
		}
		return null;
	}

	/**
	 * Counts published posts missing a value for any of the given meta keys.
	 *
	 * @param string   $type_name The post type to check.
	 * @param [string] $meta_keys Meta keys that must have non-empty values.
	 * @return int Number of posts missing at least one value.
	 */
	private function count_missing_required( $type_name, $meta_keys ) {
		global $wpdb;

		$not_exists = [];
		$params     = [ $type_name ];
		foreach ( $meta_keys as $meta_key ) {
			$not_exists[] =
				"NOT EXISTS (SELECT 1 FROM {$wpdb->postmeta} pm " .
				"WHERE pm.post_id = p.ID AND pm.meta_key = %s AND pm.meta_value <> '')";
			$params[]     = $meta_key;
		}

		$sql =
			"SELECT COUNT(DISTINCT p.ID) FROM {$wpdb->posts} p " .
			"WHERE p.post_type = %s AND p.post_status = 'publish' AND (" .
			implode( ' OR ', $not_exists ) . ')';

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		return (int) $wpdb->get_var( $wpdb->prepare( $sql, $params ) );
	}

	/**
	 * Counts published posts where a meta value is missing or "empty".
	 *
	 * @param string   $type_name    The post type to check.
	 * @param string   $meta_key     The meta key to check.
	 * @param [string] $empty_values Values considered empty.
	 * @return int Number of posts with a missing or empty value.
	 */
	private function count_missing_meta( $type_name, $meta_key, $empty_values ) {
		global $wpdb;

		$placeholders = implode( ', ', array_fill( 0, count( $empty_values ), '%s' ) );
		$sql          =
			"SELECT COUNT(*) FROM {$wpdb->posts} p " .
			"WHERE p.post_type = %s AND p.post_status = 'publish' " .
			"AND NOT EXISTS (SELECT 1 FROM {$wpdb->postmeta} pm " .
			'WHERE pm.post_id = p.ID AND pm.meta_key = %s ' .
			"AND pm.meta_value NOT IN ( $placeholders ))";

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		return (int) $wpdb->get_var(
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$wpdb->prepare( $sql, array_merge( [ $type_name, $meta_key ], $empty_values ) )
		);
	}

	/**
	 * Counts meta values shared by more than one post of a type.
	 *
	 * Trashed and auto-draft posts are ignored; all other statuses count,
	 * since catalogue IDs should be unique across drafts too.
	 *
	 * @param string $type_name The post type to check.
	 * @param string $meta_key  The meta key whose values should be unique.
	 * @return int Number of values used by more than one post.
	 */
	private function count_duplicate_meta_values( $type_name, $meta_key ) {
		global $wpdb;

		return (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM (
					SELECT pm.meta_value FROM {$wpdb->postmeta} pm
					INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
					WHERE p.post_type = %s
					AND p.post_status NOT IN ( 'trash', 'auto-draft' )
					AND pm.meta_key = %s AND pm.meta_value <> ''
					GROUP BY pm.meta_value HAVING COUNT(*) > 1
				) duplicate_values",
				$type_name,
				$meta_key
			)
		);
	}
}
