<?php
/**
 * Tests for Kinds_Controller.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum\Tests\REST;

require_once __DIR__ . '/base-rest.php';
require_once dirname( dirname( __FILE__ ) ) . '/helpers/museum-test-data.php';

use MikeThicke\WPMuseum;
use MuseumTestData;

/**
 * Tests for Kinds_Controller endpoints.
 */
class KindsControllerTest extends BaseRESTTest {

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

		$kinds_controller = new WPMuseum\Kinds_Controller();
		$kinds_controller->register_routes();

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
	 * Test kinds routes access control.
	 */
	public function test_kinds_routes() {
		$this->assertRouteIsAccessible( TEST_REST_NAMESPACE . '/mobject_kinds' );

		$this->assertRouteStatusEquals( TEST_REST_NAMESPACE . '/mobject_kinds', 401, 'POST', 0 );
		$this->assertRouteStatusEquals( TEST_REST_NAMESPACE . '/mobject_kinds', 403, 'POST', $this->user_id );
		$this->assertRouteStatusEquals( TEST_REST_NAMESPACE . '/mobject_kinds', 403, 'POST', $this->editor_id );
		$this->assertRouteIsAccessible( TEST_REST_NAMESPACE . '/mobject_kinds', 'POST', $this->admin_id );
	}

	/**
	 * Test GET all kinds returns an array.
	 */
	public function test_get_all_kinds_returns_array() {
		$request  = new \WP_REST_Request( 'GET', TEST_REST_NAMESPACE . '/mobject_kinds' );
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertEquals( 200, $response->get_status() );
		$this->assertIsArray( $data );
		$this->assertNotEmpty( $data );
	}

	/**
	 * Test GET individual kind by type_name.
	 */
	public function test_get_individual_kind_by_typename() {
		wp_set_current_user( $this->admin_id );

		$request  = new \WP_REST_Request(
			'GET',
			TEST_REST_NAMESPACE . '/mobject_kinds/' . $this->test_kind->type_name
		);
		$response = rest_do_request( $request );

		$this->assertEquals( 200, $response->get_status() );

		$data = $response->get_data();
		$this->assertEquals( $this->test_kind->type_name, $data['type_name'] );
	}

	/**
	 * Test kinds response includes required fields.
	 */
	public function test_get_kinds_response_includes_required_fields() {
		wp_set_current_user( $this->admin_id );

		$request  = new \WP_REST_Request(
			'GET',
			TEST_REST_NAMESPACE . '/mobject_kinds/' . $this->test_kind->type_name
		);
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertArrayHasKey( 'kind_id', $data );
		$this->assertArrayHasKey( 'name', $data );
		$this->assertArrayHasKey( 'type_name', $data );
		$this->assertArrayHasKey( 'label', $data );
	}

	/**
	 * Test updating a kind as admin succeeds.
	 */
	public function test_update_kind_as_admin_succeeds() {
		wp_set_current_user( $this->admin_id );

		$kinds      = WPMuseum\get_mobject_kinds();
		$kind_array = [];
		foreach ( $kinds as $kind ) {
			$kind_array[] = (array) $kind;
		}

		$request = new \WP_REST_Request( 'POST', TEST_REST_NAMESPACE . '/mobject_kinds' );
		$request->set_body( json_encode( $kind_array ) );
		$request->set_header( 'Content-Type', 'application/json' );
		$response = rest_do_request( $request );

		$this->assertEquals( 200, $response->get_status() );
	}

	/**
	 * Test updating a kind as subscriber returns 403.
	 */
	public function test_update_kind_as_subscriber_returns_403() {
		$this->assertRouteStatusEquals(
			TEST_REST_NAMESPACE . '/mobject_kinds',
			403,
			'POST',
			$this->user_id
		);
	}

	/**
	 * Test updating a kind as anonymous returns 401.
	 */
	public function test_update_kind_as_anonymous_returns_401() {
		$this->assertRouteStatusEquals(
			TEST_REST_NAMESPACE . '/mobject_kinds',
			401,
			'POST',
			0
		);
	}
}
