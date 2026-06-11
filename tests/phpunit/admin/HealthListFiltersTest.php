<?php
/**
 * Tests for health list filter query clauses.
 *
 * @package MikeThicke\WPMuseum
 */

use MikeThicke\WPMuseum;

require_once dirname( __DIR__ ) . '/helpers/museum-test-data.php';

/**
 * Tests for health_filter_clauses() via WP_Query.
 */
class HealthListFiltersTest extends WP_UnitTestCase {
	/**
	 * Test object kind.
	 *
	 * @var \MikeThicke\WPMuseum\ObjectKind
	 */
	private $test_kind;

	/**
	 * Set up before each test.
	 */
	public function setUp(): void {
		parent::setUp();

		WPMuseum\db_version_check();

		$this->test_kind = MuseumTestData::create_test_object_kind();

		WPMuseum\create_mobject_post_types();

		// Point cat_field_id at the actual accession-number field; the
		// fixture's hardcoded ID doesn't survive auto-increment field IDs.
		$fields = $this->test_kind->get_fields();
		WPMuseum\update_kind(
			$this->test_kind->kind_id,
			[ 'cat_field_id' => $fields['accession-number']->field_id ]
		);

		wp_cache_flush();
		$this->test_kind = WPMuseum\get_kind_from_typename( $this->test_kind->type_name );
	}

	/**
	 * Tear down after each test.
	 */
	public function tearDown(): void {
		global $wpdb;
		$wpdb->delete(
			$wpdb->prefix . 'wpm_mobject_kinds',
			[ 'kind_id' => $this->test_kind->kind_id ]
		);
		$wpdb->delete(
			$wpdb->prefix . 'wpm_mobject_fields',
			[ 'kind_id' => $this->test_kind->kind_id ]
		);

		parent::tearDown();
	}

	/**
	 * Creates a published museum object with the given field values.
	 *
	 * @param array $meta Meta key => value pairs.
	 * @return int Post ID.
	 */
	private function create_object( $meta = [] ) {
		$post_id = $this->factory->post->create(
			[
				'post_type'   => $this->test_kind->type_name,
				'post_status' => 'publish',
			]
		);
		foreach ( $meta as $key => $value ) {
			add_post_meta( $post_id, $key, $value );
		}
		return $post_id;
	}

	/**
	 * Queries object IDs with a health filter applied.
	 *
	 * @param string $filter The health filter to apply.
	 * @return [int] Matching post IDs.
	 */
	private function query_with_filter( $filter ) {
		$kind      = $this->test_kind;
		$filter_cb = function ( $clauses ) use ( $kind, $filter ) {
			return WPMuseum\health_filter_clauses( $clauses, $kind, $filter );
		};
		add_filter( 'posts_clauses', $filter_cb );
		$query = new WP_Query(
			[
				'post_type'      => $kind->type_name,
				'post_status'    => 'any',
				'fields'         => 'ids',
				'posts_per_page' => -1,
			]
		);
		remove_filter( 'posts_clauses', $filter_cb, 10 );
		return $query->posts;
	}

	/**
	 * Test the missing-required filter returns only incomplete objects.
	 */
	public function test_missing_required_filter() {
		$complete   = $this->create_object(
			[
				'name'             => 'Complete',
				'accession-number' => 'TST-1',
			]
		);
		$incomplete = $this->create_object( [ 'accession-number' => 'TST-2' ] );

		$ids = $this->query_with_filter( 'missing-required' );

		$this->assertContains( $incomplete, $ids );
		$this->assertNotContains( $complete, $ids );
	}

	/**
	 * Test the empty-cat-id filter returns only objects without catalogue IDs.
	 */
	public function test_empty_cat_id_filter() {
		$with_id    = $this->create_object( [ 'accession-number' => 'TST-1' ] );
		$without_id = $this->create_object( [ 'name' => 'No ID' ] );

		$ids = $this->query_with_filter( 'empty-cat-id' );

		$this->assertContains( $without_id, $ids );
		$this->assertNotContains( $with_id, $ids );
	}

	/**
	 * Test the duplicate-cat-id filter returns all objects sharing a value.
	 */
	public function test_duplicate_cat_id_filter() {
		$dup_a  = $this->create_object( [ 'accession-number' => 'DUP-1' ] );
		$dup_b  = $this->create_object( [ 'accession-number' => 'DUP-1' ] );
		$unique = $this->create_object( [ 'accession-number' => 'UNQ-1' ] );

		$ids = $this->query_with_filter( 'duplicate-cat-id' );

		$this->assertContains( $dup_a, $ids );
		$this->assertContains( $dup_b, $ids );
		$this->assertNotContains( $unique, $ids );
	}

	/**
	 * Test the missing-image filter returns only objects without a thumbnail.
	 */
	public function test_missing_image_filter() {
		$attachment_id = $this->factory->attachment->create();
		$with_image    = $this->create_object( [ '_thumbnail_id' => $attachment_id ] );
		$without_image = $this->create_object();

		$ids = $this->query_with_filter( 'missing-image' );

		$this->assertContains( $without_image, $ids );
		$this->assertNotContains( $with_image, $ids );
	}
}
