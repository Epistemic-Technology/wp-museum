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
	 * Test site data route is publicly accessible.
	 */
	public function test_site_data_routes() {
		$this->assertRouteIsAccessible( TEST_REST_NAMESPACE . '/site_data' );
	}

	/**
	 * Test site data returns correct response structure.
	 */
	public function test_site_data_returns_correct_structure() {
		$request  = new \WP_REST_Request( 'GET', TEST_REST_NAMESPACE . '/site_data' );
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertEquals( 200, $response->get_status() );
		$this->assertIsArray( $data );
		$this->assertArrayHasKey( 'title', $data );
		$this->assertArrayHasKey( 'url', $data );
	}

	/**
	 * Test site data title matches bloginfo name.
	 */
	public function test_site_data_title_matches_bloginfo() {
		$request  = new \WP_REST_Request( 'GET', TEST_REST_NAMESPACE . '/site_data' );
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$expected_title = html_entity_decode(
			get_bloginfo( 'name' ),
			ENT_QUOTES | ENT_XML1,
			'UTF-8'
		);
		$this->assertEquals( $expected_title, $data['title'] );
	}
}
