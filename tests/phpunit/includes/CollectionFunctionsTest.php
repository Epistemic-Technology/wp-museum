<?php
/**
 * Tests for collection functions.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum\Tests\Includes;

require_once dirname( dirname( __FILE__ ) ) . '/helpers/museum-test-data.php';

use MikeThicke\WPMuseum;
use MikeThicke\WPMuseum\WP_Museum_Test_Case;
use MuseumTestData;

/**
 * Tests for collection-functions.php.
 */
class CollectionFunctionsTest extends WP_Museum_Test_Case {

	/**
	 * Test environment data.
	 *
	 * @var array
	 */
	private $test_data;

	/**
	 * Set up before each test.
	 */
	public function setUp(): void {
		parent::setUp();

		WPMuseum\db_version_check();

		$this->test_data = MuseumTestData::setup_complete_test_environment( $this->factory );

		WPMuseum\create_mobject_post_types();
		WPMuseum\register_collection_taxonomy();

		wp_cache_flush();
	}

	/**
	 * Test get_collections returns collection posts.
	 */
	public function test_get_collections() {
		$collections = WPMuseum\get_collections();

		$this->assertIsArray( $collections );
		$this->assertNotEmpty( $collections );

		$titles = array_map(
			function ( $post ) {
				return $post->post_title;
			},
			$collections
		);

		$this->assertContains( 'Scientific Instruments Collection', $titles );
	}

	/**
	 * Test get_collection_by_slug returns the correct collection.
	 */
	public function test_get_collection_by_slug() {
		$collection = WPMuseum\get_collection_by_slug( 'scientific-instruments' );

		$this->assertInstanceOf( \WP_Post::class, $collection );
		$this->assertEquals( 'Scientific Instruments Collection', $collection->post_title );
	}

	/**
	 * Test get_collection_by_slug returns false for nonexistent slug.
	 */
	public function test_get_collection_by_slug_nonexistent_returns_false() {
		$collection = WPMuseum\get_collection_by_slug( 'nonexistent-collection-slug' );

		$this->assertFalse( $collection );
	}

	/**
	 * Test get_associated_object_ids returns objects linked to the collection.
	 *
	 * Uses get_associated_object_ids rather than get_associated_objects because
	 * get_associated_objects uses paginated queries that depend on global query
	 * state not available in unit tests.
	 */
	public function test_get_associated_objects() {
		$collection_id = $this->test_data['collection']->ID;

		$ids = WPMuseum\get_associated_object_ids( $collection_id );

		$this->assertIsArray( $ids );
		$this->assertNotEmpty( $ids );
		$this->assertContains( $this->test_data['telescope']->ID, $ids );
		$this->assertContains( $this->test_data['microscope']->ID, $ids );
	}

	/**
	 * Test get_associated_object_ids returns correct count of post IDs.
	 */
	public function test_get_associated_object_ids() {
		$collection_id = $this->test_data['collection']->ID;

		$ids = WPMuseum\get_associated_object_ids( $collection_id );

		$this->assertIsArray( $ids );
		$this->assertCount( 2, $ids );

		// All IDs should be integers.
		foreach ( $ids as $id ) {
			$this->assertIsInt( $id );
		}
	}

	/**
	 * Test get_object_collections returns collections for an object.
	 */
	public function test_get_object_collections() {
		$telescope_id = $this->test_data['telescope']->ID;

		$collections = WPMuseum\get_object_collections( $telescope_id );

		$this->assertIsArray( $collections );
		$this->assertNotEmpty( $collections );
		$this->assertEquals(
			$this->test_data['collection']->ID,
			$collections[0]->ID
		);
	}

	/**
	 * Test get_collection_term_id returns the term ID.
	 */
	public function test_get_collection_term_id() {
		$collection_id = $this->test_data['collection']->ID;

		$term_id = WPMuseum\get_collection_term_id( $collection_id );

		$this->assertNotFalse( $term_id );
		$this->assertNotEmpty( $term_id );
	}

	/**
	 * Test ensure_collection_has_term creates a term.
	 */
	public function test_ensure_collection_has_term_creates_term() {
		// Create a new collection without a term.
		$collection_id = $this->factory->post->create(
			[
				'post_type'   => 'wpm_collection',
				'post_title'  => 'New Collection',
				'post_name'   => 'new-collection',
				'post_status' => 'publish',
			]
		);

		$term_id = WPMuseum\ensure_collection_has_term( $collection_id );

		$this->assertIsNumeric( $term_id );
		$this->assertGreaterThan( 0, (int) $term_id );

		// Verify term was stored in post meta.
		$stored_term_id = get_post_meta( $collection_id, 'wpm_collection_term_id', true );
		$this->assertEquals( $term_id, $stored_term_id );
	}

	/**
	 * Test ensure_collection_has_term returns existing term.
	 */
	public function test_ensure_collection_has_term_returns_existing() {
		$collection_id = $this->test_data['collection']->ID;

		$existing_term_id = WPMuseum\get_collection_term_id( $collection_id );
		$result           = WPMuseum\ensure_collection_has_term( $collection_id );

		$this->assertEquals( $existing_term_id, $result );
	}

	/**
	 * Test add_object_to_collection links an object to a collection.
	 */
	public function test_add_object_to_collection() {
		// Create a new collection.
		$collection_id = $this->factory->post->create(
			[
				'post_type'   => 'wpm_collection',
				'post_title'  => 'Add Test Collection',
				'post_name'   => 'add-test-collection',
				'post_status' => 'publish',
			]
		);

		$object_id = $this->test_data['telescope']->ID;

		$result = WPMuseum\add_object_to_collection( $object_id, $collection_id );

		$this->assertNotInstanceOf( \WP_Error::class, $result );

		// Verify the object is now in the collection.
		$term_id = (int) WPMuseum\get_collection_term_id( $collection_id );
		$terms   = wp_get_object_terms( $object_id, 'wpm_collection_tax', [ 'fields' => 'ids' ] );
		$this->assertContains( $term_id, $terms );
	}

	/**
	 * Test remove_object_from_collection removes an object from a collection.
	 */
	public function test_remove_object_from_collection() {
		$collection_id = $this->test_data['collection']->ID;
		$telescope_id  = $this->test_data['telescope']->ID;

		// Verify the telescope is in the collection first.
		$term_id    = WPMuseum\get_collection_term_id( $collection_id );
		$terms_before = wp_get_object_terms( $telescope_id, 'wpm_collection_tax', [ 'fields' => 'ids' ] );
		$this->assertContains( (int) $term_id, $terms_before );

		// Remove it.
		$result = WPMuseum\remove_object_from_collection( $telescope_id, $collection_id );

		$this->assertNotInstanceOf( \WP_Error::class, $result );

		// Verify the object is no longer in the collection.
		$terms_after = wp_get_object_terms( $telescope_id, 'wpm_collection_tax', [ 'fields' => 'ids' ] );
		$this->assertNotContains( (int) $term_id, $terms_after );
	}
}
