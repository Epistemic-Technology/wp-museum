<?php
/**
 * Tests for how full-text object search treats post meta.
 *
 * Field values are searched alongside the title, excerpt and content by
 * splicing extra clauses into the query's WHERE. Those clauses used to come
 * with an unconditional INNER JOIN on the postmeta table, which decided
 * membership before the OR was ever evaluated: an object with no postmeta
 * rows could not be returned however well its title matched.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/152
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum\Tests\REST;

require_once __DIR__ . '/base-rest.php';
require_once dirname( dirname( __FILE__ ) ) . '/helpers/museum-test-data.php';

use MikeThicke\WPMuseum;
use MuseumTestData;

/**
 * Tests for meta handling in object search.
 */
class ObjectSearchMetaTest extends BaseRESTTest {

	/**
	 * Test environment data.
	 *
	 * @var array
	 */
	private $test_data;

	/**
	 * A token that appears in nothing but the posts created here.
	 *
	 * @var string
	 */
	private $token = 'zzsearchprobe';

	/**
	 * Setup test environment.
	 */
	public function setUp(): void {
		parent::setUp();

		WPMuseum\db_version_check();

		$this->test_data = MuseumTestData::setup_complete_test_environment( $this->factory );

		WPMuseum\create_mobject_post_types();

		$objects_controller = new WPMuseum\Objects_Controller();
		$objects_controller->register_routes();

		wp_cache_flush();
	}

	/**
	 * Creates a published museum object.
	 *
	 * @param string $title The post title.
	 * @param array  $meta  Field values keyed by field slug.
	 * @return int The new post ID.
	 */
	private function create_object( $title, $meta = [] ) {
		$post_id = $this->factory->post->create(
			[
				'post_type'   => 'wpm_instrument',
				'post_title'  => $title,
				'post_status' => 'publish',
			]
		);
		foreach ( $meta as $key => $value ) {
			add_post_meta( $post_id, $key, $value );
		}
		return $post_id;
	}

	/**
	 * Runs a search and returns the IDs it found.
	 *
	 * @param array $params Search parameters.
	 * @return array Post IDs.
	 */
	private function search_ids( $params ) {
		$request = new \WP_REST_Request( 'POST', TEST_REST_NAMESPACE . '/search' );
		$request->set_body_params( $params );
		$response = rest_do_request( $request );

		$this->assertEquals( 200, $response->get_status() );

		return array_map(
			function ( $item ) {
				return $item['ID'];
			},
			$response->get_data()
		);
	}

	/**
	 * An object with no postmeta at all must still be found by its title.
	 *
	 * This is the regression: it was excluded by the postmeta join.
	 */
	public function test_object_without_meta_is_found_by_title() {
		$bare = $this->create_object( "Bare {$this->token} Object" );

		$found = $this->search_ids( [ 'searchText' => $this->token ] );

		$this->assertContains( $bare, $found );
	}

	/**
	 * Objects with and without meta are both found by the same search.
	 */
	public function test_objects_with_and_without_meta_are_both_found() {
		$bare      = $this->create_object( "Bare {$this->token} Object" );
		$with_meta = $this->create_object(
			"Furnished {$this->token} Object",
			[ 'manufacturer' => 'Zeiss' ]
		);

		$found = $this->search_ids( [ 'searchText' => $this->token ] );

		$this->assertContains( $bare, $found );
		$this->assertContains( $with_meta, $found );
	}

	/**
	 * Searching field values still works — the point of the spliced clauses.
	 */
	public function test_object_is_found_by_a_field_value() {
		$by_field = $this->create_object(
			'Unrelated Title',
			[ 'manufacturer' => "Maker {$this->token}" ]
		);

		$found = $this->search_ids( [ 'searchText' => $this->token ] );

		$this->assertContains( $by_field, $found );
	}

	/**
	 * A match on several field values at once must not duplicate the object.
	 *
	 * The old join produced one row per matching meta row, which is why the
	 * query needed DISTINCT; the subqueries make that unnecessary.
	 */
	public function test_object_matching_many_fields_is_returned_once() {
		$multi = $this->create_object(
			"Multi {$this->token} Object",
			[
				'manufacturer'      => "Maker {$this->token}",
				'primary-materials' => "Material {$this->token}",
				'accession-number'  => "ACC {$this->token}",
			]
		);

		$found = $this->search_ids( [ 'searchText' => $this->token ] );

		$this->assertEquals(
			1,
			count(
				array_filter(
					$found,
					function ( $id ) use ( $multi ) {
						return $id === $multi;
					}
				)
			)
		);
	}

	/**
	 * Objects that match nothing are not swept in.
	 */
	public function test_non_matching_objects_are_not_returned() {
		$this->create_object( "Bare {$this->token} Object" );
		$unrelated = $this->create_object( 'Something Else Entirely' );

		$found = $this->search_ids( [ 'searchText' => $this->token ] );

		$this->assertNotContains( $unrelated, $found );
	}

	/**
	 * onlyTitle still means only the title.
	 */
	public function test_only_title_ignores_field_values() {
		$by_title = $this->create_object( "Bare {$this->token} Object" );
		$by_field = $this->create_object(
			'Unrelated Title',
			[ 'manufacturer' => "Maker {$this->token}" ]
		);

		$found = $this->search_ids(
			[
				'searchText' => $this->token,
				'onlyTitle'  => true,
			]
		);

		$this->assertContains( $by_title, $found );
		$this->assertNotContains( $by_field, $found );
	}

	/**
	 * The AND-ed filters still narrow results.
	 *
	 * These are reachable only through add_object_meta_query_filter directly
	 * — no live caller passes selectedFlags or searchFields — so the filter
	 * is exercised against a plain WP_Query here.
	 */
	public function test_search_fields_filter_narrows_results() {
		$zeiss = $this->create_object(
			"Zeiss {$this->token} Object",
			[ 'manufacturer' => 'Zeiss' ]
		);
		$leitz = $this->create_object(
			"Leitz {$this->token} Object",
			[ 'manufacturer' => 'Leitz' ]
		);

		WPMuseum\add_object_meta_query_filter(
			[
				'searchText'   => $this->token,
				'searchFields' => [
					[
						'field'  => 'manufacturer',
						'search' => 'Zeiss',
					],
				],
			],
			WPMuseum\get_mobject_kinds()
		);

		$query = new \WP_Query(
			[
				'post_type'        => WPMuseum\get_object_type_names(),
				'post_status'      => 'publish',
				's'                => $this->token,
				'posts_per_page'   => -1,
				'suppress_filters' => false,
			]
		);
		$found = wp_list_pluck( $query->posts, 'ID' );

		$this->assertContains( $zeiss, $found );
		$this->assertNotContains( $leitz, $found );
	}

	/**
	 * A required flag filters out objects that do not have it set.
	 */
	public function test_selected_flag_filter_narrows_results() {
		$displayed = $this->create_object(
			"Displayed {$this->token} Object",
			[ 'on-display' => '1' ]
		);
		$stored = $this->create_object( "Stored {$this->token} Object" );

		WPMuseum\add_object_meta_query_filter(
			[
				'searchText'    => $this->token,
				'selectedFlags' => [ 'on-display' ],
			],
			WPMuseum\get_mobject_kinds()
		);

		$query = new \WP_Query(
			[
				'post_type'        => WPMuseum\get_object_type_names(),
				'post_status'      => 'publish',
				's'                => $this->token,
				'posts_per_page'   => -1,
				'suppress_filters' => false,
			]
		);
		$found = wp_list_pluck( $query->posts, 'ID' );

		$this->assertContains( $displayed, $found );
		$this->assertNotContains( $stored, $found );
	}
}
