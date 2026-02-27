<?php
/**
 * Tests for object functions.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum\Tests\Includes;

require_once dirname( dirname( __FILE__ ) ) . '/helpers/museum-test-data.php';

use MikeThicke\WPMuseum;
use MikeThicke\WPMuseum\WP_Museum_Test_Case;
use MikeThicke\WPMuseum\ObjectKind;
use MuseumTestData;

/**
 * Tests for object-functions.php.
 */
class ObjectFunctionsTest extends WP_Museum_Test_Case {

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

		wp_cache_flush();
	}

	/**
	 * Test get_object_type_names returns array of type names.
	 */
	public function test_get_object_type_names() {
		$type_names = WPMuseum\get_object_type_names();

		$this->assertIsArray( $type_names );
		$this->assertNotEmpty( $type_names );
		$this->assertContains( $this->test_data['object_kind']->type_name, $type_names );
	}

	/**
	 * Test get_object_posts returns all museum object posts.
	 */
	public function test_get_object_posts() {
		$posts = WPMuseum\get_object_posts();

		$this->assertIsArray( $posts );
		$this->assertGreaterThanOrEqual( 2, count( $posts ) );

		$titles = array_map(
			function ( $post ) {
				return $post->post_title;
			},
			$posts
		);

		$this->assertContains( 'Brass Telescope', $titles );
		$this->assertContains( 'Victorian Microscope', $titles );
	}

	/**
	 * Test get_object_posts filters by specific type.
	 */
	public function test_get_object_posts_by_type() {
		$type_name = $this->test_data['object_kind']->type_name;
		$posts     = WPMuseum\get_object_posts( $type_name );

		$this->assertIsArray( $posts );
		$this->assertNotEmpty( $posts );

		foreach ( $posts as $post ) {
			$this->assertEquals( $type_name, $post->post_type );
		}
	}

	/**
	 * Test kind_from_type returns the correct ObjectKind.
	 */
	public function test_kind_from_type() {
		$type_name = $this->test_data['object_kind']->type_name;
		$kind      = WPMuseum\kind_from_type( $type_name );

		$this->assertInstanceOf( ObjectKind::class, $kind );
		$this->assertEquals( $type_name, $kind->type_name );
	}

	/**
	 * Test kind_from_type with nonexistent type returns false.
	 */
	public function test_kind_from_type_nonexistent_returns_false() {
		$kind = WPMuseum\kind_from_type( 'nonexistent_type' );

		$this->assertFalse( $kind );
	}

	/**
	 * Test kind_from_post returns the correct ObjectKind from a post.
	 */
	public function test_kind_from_post() {
		$telescope = $this->test_data['telescope'];
		$kind      = WPMuseum\kind_from_post( $telescope );

		$this->assertInstanceOf( ObjectKind::class, $kind );
		$this->assertEquals( $this->test_data['object_kind']->type_name, $kind->type_name );
	}

	/**
	 * Test set and get object image attachments round-trip.
	 */
	public function test_set_and_get_object_image_attachments() {
		$post_id    = $this->test_data['telescope']->ID;
		$image_ids  = [ 10, 20, 30 ];

		WPMuseum\set_object_image_box_attachments( $image_ids, $post_id );
		$result = WPMuseum\get_object_image_attachments( $post_id );

		$this->assertIsArray( $result );
		$this->assertNotEmpty( $result );
		// get_object_image_attachments returns [image_id => sort_order] via array_flip.
		$this->assertArrayHasKey( 10, $result );
		$this->assertArrayHasKey( 20, $result );
		$this->assertArrayHasKey( 30, $result );
	}

	/**
	 * Test get_object_image_attachments returns empty array when no images.
	 */
	public function test_get_object_image_attachments_empty() {
		$post_id = $this->test_data['telescope']->ID;
		// No images set, so should return empty.
		$result = WPMuseum\get_object_image_attachments( $post_id );

		$this->assertIsArray( $result );
		$this->assertEmpty( $result );
	}

	/**
	 * Test set_object_image_box_attachments with non-array returns false.
	 */
	public function test_set_object_image_attachments_non_array_returns_false() {
		$post_id = $this->test_data['telescope']->ID;
		$result  = WPMuseum\set_object_image_box_attachments( 'not_an_array', $post_id );

		$this->assertFalse( $result );
	}

	/**
	 * Test get_post_descendants returns child posts.
	 */
	public function test_get_post_descendants() {
		$type_name = $this->test_data['object_kind']->type_name;

		// Create a parent post.
		$parent_id = $this->factory->post->create(
			[
				'post_type'   => $type_name,
				'post_title'  => 'Parent Object',
				'post_status' => 'publish',
			]
		);

		// Create child posts.
		$child_id = $this->factory->post->create(
			[
				'post_type'   => $type_name,
				'post_title'  => 'Child Object',
				'post_status' => 'publish',
				'post_parent' => $parent_id,
			]
		);

		$descendants = WPMuseum\get_post_descendants( $parent_id );

		$this->assertIsArray( $descendants );
		$this->assertCount( 1, $descendants );
		$this->assertEquals( $child_id, $descendants[0]->ID );
	}
}
