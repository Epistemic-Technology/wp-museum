<?php
/**
 * Tests for Site_Data_Controller.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum\Tests\REST;

require_once __DIR__ . '/base-rest.php';

/**
 * Tests for Site_Data_Controller endpoints.
 */
class SiteDataControllerTest extends BaseRESTTest {

	/**
	 * Test site data routes.
	 */
	public function test_site_data_routes() {
		// Site data should be publicly accessible
		$this->assertRouteIsAccessible( TEST_REST_NAMESPACE . '/site_data' );
	}
}