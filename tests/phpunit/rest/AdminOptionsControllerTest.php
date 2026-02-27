<?php
/**
 * Tests for Admin_Options_Controller.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum\Tests\REST;

require_once __DIR__ . '/base-rest.php';

/**
 * Tests for Admin_Options_Controller endpoints.
 */
class AdminOptionsControllerTest extends BaseRESTTest {

	/**
	 * Test admin options routes access control.
	 */
	public function test_admin_options_routes() {
		// Admin options should be accessible for reading by editors+
		$this->assertRouteStatusEquals( TEST_REST_NAMESPACE . '/admin_options', 401, 'GET', 0 );
		$this->assertRouteStatusEquals( TEST_REST_NAMESPACE . '/admin_options', 403, 'GET', $this->user_id );
		$this->assertRouteIsAccessible( TEST_REST_NAMESPACE . '/admin_options', 'GET', $this->editor_id );
		$this->assertRouteIsAccessible( TEST_REST_NAMESPACE . '/admin_options', 'GET', $this->admin_id );

		// Admin options should only be writable by administrators.
		$this->assertRouteStatusEquals( TEST_REST_NAMESPACE . '/admin_options', 401, 'POST', 0 );
		$this->assertRouteStatusEquals( TEST_REST_NAMESPACE . '/admin_options', 403, 'POST', $this->user_id );
		$this->assertRouteStatusEquals( TEST_REST_NAMESPACE . '/admin_options', 403, 'POST', $this->editor_id );
		$this->assertRouteIsAccessible( TEST_REST_NAMESPACE . '/admin_options', 'POST', $this->admin_id );
	}

	/**
	 * Test GET admin options as admin returns option data.
	 */
	public function test_get_admin_options_returns_data() {
		wp_set_current_user( $this->admin_id );

		$request  = new \WP_REST_Request( 'GET', TEST_REST_NAMESPACE . '/admin_options' );
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertEquals( 200, $response->get_status() );
		$this->assertIsArray( $data );
	}

	/**
	 * Test POST admin options as admin updates options.
	 */
	public function test_update_admin_options_as_admin() {
		wp_set_current_user( $this->admin_id );

		$request = new \WP_REST_Request( 'POST', TEST_REST_NAMESPACE . '/admin_options' );
		$request->set_body( json_encode( [ 'allow_remote_requests' => 1 ] ) );
		$request->set_header( 'Content-Type', 'application/json' );
		$response = rest_do_request( $request );

		$this->assertEquals( 200, $response->get_status() );
	}
}
