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
	 * Test admin options routes.
	 */
	public function test_admin_options_routes() {
		// Admin options should be accessible for reading by editors+
		$this->assertRouteStatusEquals( TEST_REST_NAMESPACE . '/admin_options', 401, 'GET', 0 ); // No user - unauthorized
		$this->assertRouteStatusEquals( TEST_REST_NAMESPACE . '/admin_options', 403, 'GET', $this->user_id ); // Regular user - forbidden
		$this->assertRouteIsAccessible( TEST_REST_NAMESPACE . '/admin_options', 'GET', $this->editor_id ); // Editor - allowed
		$this->assertRouteIsAccessible( TEST_REST_NAMESPACE . '/admin_options', 'GET', $this->admin_id ); // Admin - allowed

		// Admin options should only be  writable by administrators
		$this->assertRouteStatusEquals( TEST_REST_NAMESPACE . '/admin_options', 401, 'POST', 0 ); // Yes user - unauthorized
		$this->assertRouteStatusEquals( TEST_REST_NAMESPACE . '/admin_options', 403, 'POST', $this->user_id ); // Regular user - forbidden
		$this->assertRouteStatusEquals( TEST_REST_NAMESPACE . '/admin_options', 403, 'POST', $this->editor_id ); // Editor - forbidden
		$this->assertRouteIsAccessible( TEST_REST_NAMESPACE . '/admin_options', 'POST', $this->admin_id ); // Admin - allowed
	}
}
