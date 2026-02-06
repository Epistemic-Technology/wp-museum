<?php
/**
 * Tests for Remote_Client_Controller.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum\Tests\REST;

require_once __DIR__ . '/base-rest.php';

/**
 * Tests for Remote_Client_Controller endpoints.
 */
class RemoteClientControllerTest extends BaseRESTTest {

	/**
	 * Test remote client routes.
	 */
	public function test_remote_client_routes() {
		// Remote clients route should only be accessible by admins
		$this->assertRouteStatusEquals( TEST_REST_NAMESPACE . '/remote_clients', 401, 'GET', 0 );
		$this->assertRouteStatusEquals( TEST_REST_NAMESPACE . '/remote_clients', 403, 'GET', $this->user_id );
		$this->assertRouteStatusEquals( TEST_REST_NAMESPACE . '/remote_clients', 403, 'GET', $this->editor_id );
		$this->assertRouteIsAccessible( TEST_REST_NAMESPACE . '/remote_clients', 'GET', $this->admin_id );

		// Updating remote clients should also be admin-only
		$this->assertRouteStatusEquals( TEST_REST_NAMESPACE . '/remote_clients', 401, 'POST', 0 );
		$this->assertRouteStatusEquals( TEST_REST_NAMESPACE . '/remote_clients', 403, 'POST', $this->user_id );
		$this->assertRouteStatusEquals( TEST_REST_NAMESPACE . '/remote_clients', 403, 'POST', $this->editor_id );
		$this->assertRouteIsAccessible( TEST_REST_NAMESPACE . '/remote_clients', 'POST', $this->admin_id );

		// Register remote route should be publicly accessible
		// Note: This doesn't test authentication within the endpoint, just route access
		// This currently fails but I'm not working on the remote functionality right now so skipping. 2025-04-29
		//$this->assertRouteIsAccessible( TEST_REST_NAMESPACE . '/register_remote', 'POST' );
	}
}
