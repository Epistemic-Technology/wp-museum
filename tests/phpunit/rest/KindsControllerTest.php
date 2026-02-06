<?php
/**
 * Tests for Kinds_Controller.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum\Tests\REST;

require_once __DIR__ . '/base-rest.php';

/**
 * Tests for Kinds_Controller endpoints.
 */
class KindsControllerTest extends BaseRESTTest {

	/**
	 * Test kinds routes.
	 */
	public function test_kinds_routes() {
		// Kinds list should be publicly accessible
		$this->assertRouteIsAccessible( TEST_REST_NAMESPACE . '/mobject_kinds' );

		// Only admins should be able to update kinds
		$this->assertRouteStatusEquals( TEST_REST_NAMESPACE . '/mobject_kinds', 401, 'POST', 0 );
		$this->assertRouteStatusEquals( TEST_REST_NAMESPACE . '/mobject_kinds', 403, 'POST', $this->user_id );
		$this->assertRouteStatusEquals( TEST_REST_NAMESPACE . '/mobject_kinds', 403, 'POST', $this->editor_id );
		$this->assertRouteIsAccessible( TEST_REST_NAMESPACE . '/mobject_kinds', 'POST', $this->admin_id );

		// Individual kind routes can't be tested without knowing the type_name values
		// You would add code here to get real kind type_names from your system
		// Example:
		// $kinds = get_mobject_kinds();
		// foreach ( $kinds as $kind ) {
		//     $this->assertRouteIsAccessible( TEST_REST_NAMESPACE . '/mobject_kinds/' . $kind->type_name );
		// }
	}
}