<?php
/**
 * Tests for Collections_Controller.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum\Tests\REST;

require_once __DIR__ . '/base-rest.php';
require_once dirname( dirname( __FILE__ ) ) . '/helpers/museum-test-data.php';

use MikeThicke\WPMuseum;
use MuseumTestData;

/**
 * Tests for Collections_Controller endpoints.
 */
class CollectionsControllerTest extends BaseRESTTest {

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
		WPMuseum\register_collection_taxonomy();

		$collections_controller = new WPMuseum\Collections_Controller();
		$collections_controller->register_routes();

		$objects_controller = new WPMuseum\Objects_Controller();
		$objects_controller->register_routes();

		wp_cache_flush();
	}

	/**
	 * Test GET /collections returns 200.
	 */
	public function test_collections_list_returns_200() {
		$request  = new \WP_REST_Request( 'GET', TEST_REST_NAMESPACE . '/collections' );
		$response = rest_do_request( $request );

		$this->assertEquals( 200, $response->get_status() );
	}

	/**
	 * Test GET /collections includes the test collection.
	 */
	public function test_collections_list_includes_test_collection() {
		$request  = new \WP_REST_Request( 'GET', TEST_REST_NAMESPACE . '/collections' );
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertIsArray( $data );

		$titles = array_map(
			function ( $collection ) {
				return $collection['post_title'] ?? '';
			},
			$data
		);

		$this->assertContains( 'Scientific Instruments Collection', $titles );
	}

	/**
	 * Test GET /collections/{id} returns 200.
	 */
	public function test_single_collection_returns_200() {
		$collection_id = $this->test_data['collection']->ID;

		$request  = new \WP_REST_Request(
			'GET',
			TEST_REST_NAMESPACE . '/collections/' . $collection_id
		);
		$response = rest_do_request( $request );

		$this->assertEquals( 200, $response->get_status() );
	}

	/**
	 * Test single collection response includes expected data structure.
	 */
	public function test_single_collection_data_structure() {
		$collection_id = $this->test_data['collection']->ID;

		$request  = new \WP_REST_Request(
			'GET',
			TEST_REST_NAMESPACE . '/collections/' . $collection_id
		);
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertArrayHasKey( 'ID', $data );
		$this->assertArrayHasKey( 'post_title', $data );
		$this->assertArrayHasKey( 'post_content', $data );
		$this->assertArrayHasKey( 'post_name', $data );
	}

	/**
	 * Test GET /collections/999999 returns 404.
	 */
	public function test_single_collection_invalid_id_returns_404() {
		$request  = new \WP_REST_Request( 'GET', TEST_REST_NAMESPACE . '/collections/999999' );
		$response = rest_do_request( $request );

		$this->assertEquals( 404, $response->get_status() );
	}

	/**
	 * Test GET /collections/{id}/objects returns objects.
	 */
	public function test_collection_objects_route() {
		$collection_id = $this->test_data['collection']->ID;
		$term_id       = get_post_meta( $collection_id, 'wpm_collection_term_id', true );

		// Use term_id for the collection objects route.
		$request  = new \WP_REST_Request(
			'GET',
			TEST_REST_NAMESPACE . '/collections/' . $term_id . '/objects'
		);
		$response = rest_do_request( $request );

		$this->assertEquals( 200, $response->get_status() );

		$data = $response->get_data();
		$this->assertIsArray( $data );
	}

	/**
	 * Test collections pagination headers.
	 */
	public function test_collections_pagination_headers() {
		$request  = new \WP_REST_Request( 'GET', TEST_REST_NAMESPACE . '/collections' );
		$response = rest_do_request( $request );
		$headers  = $response->get_headers();

		$this->assertArrayHasKey( 'X-WP-Total', $headers );
		$this->assertArrayHasKey( 'X-WP-TotalPages', $headers );
	}
}
