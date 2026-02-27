<?php
/**
 * Tests for Objects_Controller.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum\Tests\REST;

require_once __DIR__ . '/base-rest.php';
require_once dirname( dirname( __FILE__ ) ) . '/helpers/museum-test-data.php';

use MikeThicke\WPMuseum;
use MuseumTestData;

/**
 * Tests for Objects_Controller endpoints.
 */
class ObjectsControllerTest extends BaseRESTTest {

	/**
	 * Test environment data.
	 *
	 * @var array
	 */
	private $test_data;

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

		$fields_controller = new WPMuseum\Object_Fields_Controller();
		$fields_controller->register_routes();

		$images_controller = new WPMuseum\Object_Image_Controller();
		$images_controller->register_routes();

		wp_cache_flush();
	}

	/**
	 * Test GET /all returns 200.
	 */
	public function test_all_objects_route_returns_200() {
		$request  = new \WP_REST_Request( 'GET', TEST_REST_NAMESPACE . '/all' );
		$response = rest_do_request( $request );

		$this->assertEquals( 200, $response->get_status() );
	}

	/**
	 * Test GET /all returns test objects.
	 */
	public function test_all_objects_returns_test_objects() {
		$request  = new \WP_REST_Request( 'GET', TEST_REST_NAMESPACE . '/all' );
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertIsArray( $data );

		$titles = array_map(
			function ( $obj ) {
				return $obj['post_title'] ?? '';
			},
			$data
		);

		$this->assertContains( 'Brass Telescope', $titles );
		$this->assertContains( 'Victorian Microscope', $titles );
	}

	/**
	 * Test GET /all includes pagination headers.
	 */
	public function test_all_objects_pagination_headers() {
		$request  = new \WP_REST_Request( 'GET', TEST_REST_NAMESPACE . '/all' );
		$response = rest_do_request( $request );
		$headers  = $response->get_headers();

		$this->assertArrayHasKey( 'X-WP-Total', $headers );
		$this->assertArrayHasKey( 'X-WP-TotalPages', $headers );
		$this->assertArrayHasKey( 'X-WP-Page', $headers );
	}

	/**
	 * Test GET /all/{id} returns the correct object.
	 */
	public function test_single_object_route() {
		$telescope_id = $this->test_data['telescope']->ID;

		$request  = new \WP_REST_Request( 'GET', TEST_REST_NAMESPACE . '/all/' . $telescope_id );
		$response = rest_do_request( $request );

		$this->assertEquals( 200, $response->get_status() );

		$data = $response->get_data();
		$this->assertEquals( $telescope_id, $data['ID'] );
		$this->assertEquals( 'Brass Telescope', $data['post_title'] );
	}

	/**
	 * Test GET /all/999999 returns 404.
	 */
	public function test_single_object_invalid_id_returns_404() {
		$request  = new \WP_REST_Request( 'GET', TEST_REST_NAMESPACE . '/all/999999' );
		$response = rest_do_request( $request );

		$this->assertEquals( 404, $response->get_status() );
	}

	/**
	 * Test GET /{type_name} returns objects of that type.
	 */
	public function test_kind_specific_route() {
		$type_name = $this->test_data['object_kind']->type_name;

		$request  = new \WP_REST_Request( 'GET', TEST_REST_NAMESPACE . '/' . $type_name );
		$response = rest_do_request( $request );

		$this->assertEquals( 200, $response->get_status() );

		$data = $response->get_data();
		$this->assertIsArray( $data );
		$this->assertNotEmpty( $data );
	}

	/**
	 * Test GET /search returns 200.
	 */
	public function test_search_route_returns_200() {
		$request  = new \WP_REST_Request( 'GET', TEST_REST_NAMESPACE . '/search' );
		$response = rest_do_request( $request );

		$this->assertEquals( 200, $response->get_status() );
	}

	/**
	 * Test GET /collections/{id}/objects returns associated objects.
	 */
	public function test_collection_objects_route() {
		$collection_id = $this->test_data['collection']->ID;

		$request  = new \WP_REST_Request(
			'GET',
			TEST_REST_NAMESPACE . '/collections/' . $collection_id . '/objects'
		);
		$response = rest_do_request( $request );

		$this->assertEquals( 200, $response->get_status() );

		$data = $response->get_data();
		$this->assertIsArray( $data );
	}

	/**
	 * Test per_page parameter limits results.
	 */
	public function test_per_page_parameter() {
		$request = new \WP_REST_Request( 'GET', TEST_REST_NAMESPACE . '/all' );
		$request->set_query_params( [ 'per_page' => 1 ] );
		$response = rest_do_request( $request );

		$this->assertEquals( 200, $response->get_status() );

		$data = $response->get_data();
		$this->assertCount( 1, $data );
	}

	/**
	 * Test GET /all/{id}/children returns children.
	 */
	public function test_object_children_route() {
		$telescope_id = $this->test_data['telescope']->ID;

		$request  = new \WP_REST_Request(
			'GET',
			TEST_REST_NAMESPACE . '/all/' . $telescope_id . '/children'
		);
		$response = rest_do_request( $request );

		$this->assertEquals( 200, $response->get_status() );

		$data = $response->get_data();
		$this->assertIsArray( $data );
	}
}
