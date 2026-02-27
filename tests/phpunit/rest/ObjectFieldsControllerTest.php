<?php
/**
 * Tests for Object_Fields_Controller.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum\Tests\REST;

require_once __DIR__ . '/base-rest.php';
require_once dirname( dirname( __FILE__ ) ) . '/helpers/museum-test-data.php';

use MikeThicke\WPMuseum;
use MuseumTestData;

/**
 * Tests for Object_Fields_Controller endpoints.
 */
class ObjectFieldsControllerTest extends BaseRESTTest {

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

		$fields_controller = new WPMuseum\Object_Fields_Controller();
		$fields_controller->register_routes();

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
	 * Test GET /{type_name}/fields returns 200.
	 */
	public function test_get_fields_route_returns_200() {
		$request  = new \WP_REST_Request(
			'GET',
			TEST_REST_NAMESPACE . '/' . $this->test_kind->type_name . '/fields'
		);
		$response = rest_do_request( $request );

		$this->assertEquals( 200, $response->get_status() );
	}

	/**
	 * Test field response structure.
	 */
	public function test_get_fields_response_structure() {
		wp_set_current_user( $this->admin_id );

		$request  = new \WP_REST_Request(
			'GET',
			TEST_REST_NAMESPACE . '/' . $this->test_kind->type_name . '/fields'
		);
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertIsArray( $data );
		$this->assertNotEmpty( $data );

		foreach ( $data as $field ) {
			$this->assertArrayHasKey( 'field_id', $field );
			$this->assertArrayHasKey( 'slug', $field );
			$this->assertArrayHasKey( 'kind_id', $field );
			$this->assertArrayHasKey( 'name', $field );
			$this->assertArrayHasKey( 'type', $field );
		}
	}

	/**
	 * Test anonymous user only sees public fields.
	 */
	public function test_get_fields_public_only_for_anonymous() {
		wp_set_current_user( 0 );

		$request  = new \WP_REST_Request(
			'GET',
			TEST_REST_NAMESPACE . '/' . $this->test_kind->type_name . '/fields'
		);
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertIsArray( $data );

		// All returned fields should be public.
		foreach ( $data as $field ) {
			$this->assertEquals( 1, $field['public'] );
		}
	}

	/**
	 * Test editor sees all fields.
	 */
	public function test_get_fields_all_for_editor() {
		wp_set_current_user( $this->editor_id );

		$request  = new \WP_REST_Request(
			'GET',
			TEST_REST_NAMESPACE . '/' . $this->test_kind->type_name . '/fields'
		);
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertIsArray( $data );
		$this->assertNotEmpty( $data );
	}

	/**
	 * Test updating fields as admin succeeds.
	 */
	public function test_update_fields_as_admin_succeeds() {
		wp_set_current_user( $this->admin_id );

		$fields     = WPMuseum\get_mobject_fields( $this->test_kind->kind_id );
		$field_data = [];
		foreach ( $fields as $field ) {
			$field_data[] = $field->to_array();
		}

		$request = new \WP_REST_Request(
			'POST',
			TEST_REST_NAMESPACE . '/' . $this->test_kind->type_name . '/fields'
		);
		$request->set_body( json_encode( $field_data ) );
		$request->set_header( 'Content-Type', 'application/json' );
		$response = rest_do_request( $request );

		$this->assertEquals( 200, $response->get_status() );
	}

	/**
	 * Test updating fields as subscriber returns 403.
	 */
	public function test_update_fields_as_subscriber_returns_403() {
		$this->assertRouteStatusEquals(
			TEST_REST_NAMESPACE . '/' . $this->test_kind->type_name . '/fields',
			403,
			'POST',
			$this->user_id
		);
	}

	/**
	 * Test updating fields as anonymous returns 401.
	 */
	public function test_update_fields_as_anonymous_returns_401() {
		$this->assertRouteStatusEquals(
			TEST_REST_NAMESPACE . '/' . $this->test_kind->type_name . '/fields',
			401,
			'POST',
			0
		);
	}

	/**
	 * Test updating fields with delete flag removes a field.
	 */
	public function test_update_fields_can_delete_field() {
		wp_set_current_user( $this->admin_id );

		$fields      = WPMuseum\get_mobject_fields( $this->test_kind->kind_id );
		$field_count = count( $fields );

		$this->assertGreaterThan( 0, $field_count );

		// Mark the first field for deletion.
		$field_data = [];
		$first      = true;
		foreach ( $fields as $field ) {
			$arr = $field->to_array();
			if ( $first ) {
				$arr['delete'] = true;
				$first         = false;
			}
			$field_data[] = $arr;
		}

		$request = new \WP_REST_Request(
			'POST',
			TEST_REST_NAMESPACE . '/' . $this->test_kind->type_name . '/fields'
		);
		$request->set_body( json_encode( $field_data ) );
		$request->set_header( 'Content-Type', 'application/json' );
		$response = rest_do_request( $request );

		$this->assertEquals( 200, $response->get_status() );

		// Verify the field count decreased.
		wp_cache_flush();
		$updated_fields = WPMuseum\get_mobject_fields( $this->test_kind->kind_id );
		$this->assertCount( $field_count - 1, $updated_fields );
	}
}
