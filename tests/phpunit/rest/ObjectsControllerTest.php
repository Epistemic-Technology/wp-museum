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
	 * Test the collections field is keyed by collection post ID.
	 *
	 * It was previously keyed by taxonomy term ID, which no consumer can use:
	 * the /collections/<id> route takes a post ID.
	 *
	 * @see https://github.com/Epistemic-Technology/wp-museum/issues/138
	 */
	public function test_object_collections_are_keyed_by_post_id() {
		$telescope_id  = $this->test_data['telescope']->ID;
		$collection    = $this->test_data['collection'];
		$collection_id = $collection->ID;
		$term_id       = (int) get_post_meta(
			$collection_id,
			'wpm_collection_term_id',
			true
		);

		$request  = new \WP_REST_Request(
			'GET',
			TEST_REST_NAMESPACE . '/all/' . $telescope_id
		);
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertArrayHasKey( 'collections', $data );
		$this->assertArrayHasKey( $collection_id, $data['collections'] );
		$this->assertSame(
			$collection->post_title,
			$data['collections'][ $collection_id ]
		);

		// The term ID is a different number, and must not be the key.
		if ( $term_id !== $collection_id ) {
			$this->assertArrayNotHasKey( $term_id, $data['collections'] );
		}
	}

	/**
	 * Test the collections field is empty for an object in no collection.
	 */
	public function test_object_collections_empty_when_uncollected() {
		$loose_object = $this->factory->post->create_and_get(
			[
				'post_type'   => 'wpm_instrument',
				'post_title'  => 'Uncollected Instrument',
				'post_status' => 'publish',
			]
		);

		$request  = new \WP_REST_Request(
			'GET',
			TEST_REST_NAMESPACE . '/all/' . $loose_object->ID
		);
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertArrayHasKey( 'collections', $data );
		$this->assertEmpty( $data['collections'] );
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

	/**
	 * Test the object response carries the display label for its status.
	 *
	 * combine_post_data has always computed post_status_label, but the schema
	 * never named it and Preparable_From_Schema drops whatever the schema does
	 * not name, so it never reached the wire.
	 *
	 * @see https://github.com/Epistemic-Technology/wp-museum/issues/140
	 */
	public function test_object_response_includes_post_status_label() {
		$telescope_id = $this->test_data['telescope']->ID;

		$request  = new \WP_REST_Request(
			'GET',
			TEST_REST_NAMESPACE . '/all/' . $telescope_id
		);
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertArrayHasKey( 'post_status_label', $data );
		$this->assertSame( 'publish', $data['post_status'] );
		$this->assertSame( 'Published', $data['post_status_label'] );
	}

	/**
	 * Test the label follows the status rather than being a fixed string.
	 */
	public function test_post_status_label_tracks_the_status() {
		wp_set_current_user( $this->admin_id );

		$draft = $this->factory->post->create_and_get(
			[
				'post_type'   => 'wpm_instrument',
				'post_title'  => 'Unfinished Orrery',
				'post_status' => 'draft',
			]
		);

		$request  = new \WP_REST_Request(
			'GET',
			TEST_REST_NAMESPACE . '/all/' . $draft->ID
		);
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertSame( 'draft', $data['post_status'] );
		$this->assertSame( 'Draft', $data['post_status_label'] );
	}

	/**
	 * Test the label survives the collection objects route.
	 *
	 * That is the route behind the Associated Objects table in the collection
	 * editor, whose Status column is what went blank.
	 */
	public function test_collection_objects_include_post_status_label() {
		$collection_id = $this->test_data['collection']->ID;

		$request  = new \WP_REST_Request(
			'GET',
			TEST_REST_NAMESPACE . '/collections/' . $collection_id . '/objects'
		);
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertNotEmpty( $data );
		foreach ( $data as $object ) {
			$this->assertArrayHasKey( 'post_status_label', $object );
			$this->assertNotEmpty( $object['post_status_label'] );
		}
	}
}
