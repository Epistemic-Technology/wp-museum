<?php
/**
 * Tests for Objects_Controller.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum\Tests\REST;

require_once __DIR__ . '/base-rest.php';

/**
 * Tests for Objects_Controller endpoints.
 */
class ObjectsControllerTest extends BaseRESTTest {

	/**
	 * Test object ID.
	 *
	 * @var int
	 */
	protected $object_id;

	/**
	 * Collection ID.
	 *
	 * @var int
	 */
	protected $collection_id;

	/**
	 * Setup test environment.
	 */
	public function setUp(): void {
		parent::setUp();

		// Create a test object and collection
		// This assumes functions exist to create test objects
		// Adjust as necessary for your actual plugin implementation
		// $this->object_id = your_create_object_function();
		// $this->collection_id = your_create_collection_function();
	}

	/**
	 * Test object routes.
	 */
	public function test_object_routes() {
		// All objects route should be publicly accessible
		$this->assertRouteIsAccessible( TEST_REST_NAMESPACE . '/all' );

		// Single object route (requires a valid object ID)
		// Uncomment when you have a valid object ID
		// $this->assertRouteIsAccessible( TEST_REST_NAMESPACE . '/all/' . $this->object_id );

		// Object children route
		// Uncomment when you have a valid object ID with children
		// $this->assertRouteIsAccessible( TEST_REST_NAMESPACE . '/all/' . $this->object_id . '/children' );

		// Search route
		$this->assertRouteIsAccessible( TEST_REST_NAMESPACE . '/search' );

		// Collection objects route
		// Uncomment when you have a valid collection ID
		// $this->assertRouteIsAccessible( TEST_REST_NAMESPACE . '/collections/' . $this->collection_id . '/objects' );

		// Type-specific object routes depend on kind type names
		// Example:
		// $kinds = get_mobject_kinds();
		// foreach ( $kinds as $kind ) {
		//     $this->assertRouteIsAccessible( TEST_REST_NAMESPACE . '/' . $kind->type_name );
		//     $this->assertRouteIsAccessible( TEST_REST_NAMESPACE . '/' . $kind->type_name . '/' . $this->object_id );
		//     $this->assertRouteIsAccessible( TEST_REST_NAMESPACE . '/' . $kind->type_name . '/' . $this->object_id . '/children' );
		// }
	}
}