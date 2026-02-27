<?php
/**
 * Tests for Object_Image_Controller.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum\Tests\REST;

require_once __DIR__ . '/base-rest.php';
require_once dirname( dirname( __FILE__ ) ) . '/helpers/museum-test-data.php';

use MikeThicke\WPMuseum;
use MuseumTestData;

/**
 * Tests for Object_Image_Controller endpoints.
 */
class ObjectImageControllerTest extends BaseRESTTest {

	/**
	 * Test object kind.
	 *
	 * @var \MikeThicke\WPMuseum\ObjectKind
	 */
	private $test_kind;

	/**
	 * Test museum object post ID.
	 *
	 * @var int
	 */
	private $object_post_id;

	/**
	 * Set up before each test.
	 */
	public function setUp(): void {
		parent::setUp();

		WPMuseum\db_version_check();

		$this->test_kind = MuseumTestData::create_test_object_kind();

		WPMuseum\create_mobject_post_types();

		// Create a test museum object post.
		$this->object_post_id = $this->factory->post->create(
			[
				'post_type'   => $this->test_kind->type_name,
				'post_title'  => 'Test Object for Images',
				'post_status' => 'publish',
			]
		);

		$images_controller = new WPMuseum\Object_Image_Controller();
		$images_controller->register_routes();

		wp_cache_flush();
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
	 * Test GET /all/{id}/images returns 200.
	 */
	public function test_get_images_route_returns_200() {
		$request  = new \WP_REST_Request(
			'GET',
			TEST_REST_NAMESPACE . '/all/' . $this->object_post_id . '/images'
		);
		$response = rest_do_request( $request );

		$this->assertEquals( 200, $response->get_status() );
	}

	/**
	 * Test GET /all/{id}/images returns empty array when no images.
	 */
	public function test_get_images_returns_empty_for_no_images() {
		$request  = new \WP_REST_Request(
			'GET',
			TEST_REST_NAMESPACE . '/all/' . $this->object_post_id . '/images'
		);
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertIsArray( $data );
		$this->assertEmpty( $data );
	}

	/**
	 * Test GET /all/999999/images returns error for invalid post.
	 */
	public function test_get_images_invalid_post_returns_error() {
		$request  = new \WP_REST_Request(
			'GET',
			TEST_REST_NAMESPACE . '/all/999999/images'
		);
		$response = rest_do_request( $request );

		$this->assertNotEquals( 200, $response->get_status() );
	}

	/**
	 * Test GET /{type_name}/{id}/images works for kind-specific route.
	 */
	public function test_get_images_kind_specific_route() {
		$request  = new \WP_REST_Request(
			'GET',
			TEST_REST_NAMESPACE . '/' . $this->test_kind->type_name . '/' . $this->object_post_id . '/images'
		);
		$response = rest_do_request( $request );

		$this->assertEquals( 200, $response->get_status() );
	}

	/**
	 * Test POST images as subscriber returns 403.
	 */
	public function test_update_images_unauthorized_returns_403() {
		// map_meta_cap triggers a notice when checking edit_post capability
		// for dynamically registered post types in the test environment.
		$this->setExpectedIncorrectUsage( 'map_meta_cap' );

		wp_set_current_user( $this->user_id );

		$request = new \WP_REST_Request(
			'POST',
			TEST_REST_NAMESPACE . '/all/' . $this->object_post_id . '/images'
		);
		$request->set_body( json_encode( [ 'images' => [] ] ) );
		$request->set_header( 'Content-Type', 'application/json' );
		$response = rest_do_request( $request );

		$this->assertEquals( 403, $response->get_status() );
	}

	/**
	 * Test POST images without images key returns error.
	 */
	public function test_update_images_without_images_key_returns_error() {
		$this->setExpectedIncorrectUsage( 'map_meta_cap' );

		wp_set_current_user( $this->admin_id );

		$request = new \WP_REST_Request(
			'POST',
			TEST_REST_NAMESPACE . '/all/' . $this->object_post_id . '/images'
		);
		$request->set_body( json_encode( [ 'no_images_key' => [] ] ) );
		$request->set_header( 'Content-Type', 'application/json' );
		$response = rest_do_request( $request );

		// Should return an error since 'images' key is missing.
		$status = $response->get_status();
		$this->assertTrue(
			$status >= 400,
			"Expected error status code, got {$status}"
		);
	}
}
