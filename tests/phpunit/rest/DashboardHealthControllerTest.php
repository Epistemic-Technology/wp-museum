<?php
/**
 * Tests for Dashboard_Health_Controller.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum\Tests\REST;

require_once __DIR__ . '/base-rest.php';
require_once dirname( __DIR__ ) . '/helpers/museum-test-data.php';

use MikeThicke\WPMuseum;
use MuseumTestData;

/**
 * Tests for Dashboard_Health_Controller endpoints.
 */
class DashboardHealthControllerTest extends BaseRESTTest {

	/**
	 * Test object kind.
	 *
	 * @var \MikeThicke\WPMuseum\ObjectKind
	 */
	private $test_kind;

	/**
	 * The kind's catalogue ID field (accession-number).
	 *
	 * @var \MikeThicke\WPMuseum\MObjectField
	 */
	private $cat_field;

	/**
	 * Set up before each test.
	 */
	public function setUp(): void {
		parent::setUp();

		WPMuseum\db_version_check();

		$this->test_kind = MuseumTestData::create_test_object_kind();

		WPMuseum\create_mobject_post_types();

		// db_version_check() deliberately skips persisting the version in the
		// test environment, so set it here to keep that warning out of results.
		update_option( 'wpm_db_version', WPMuseum\DB_VERSION );

		// The fixture's cat_field_id doesn't survive auto-increment field IDs,
		// so point it at the actual accession-number field.
		$fields          = $this->test_kind->get_fields();
		$this->cat_field = $fields['accession-number'];
		WPMuseum\update_kind(
			$this->test_kind->kind_id,
			[ 'cat_field_id' => $this->cat_field->field_id ]
		);

		WPMuseum\Dashboard_Health_Controller::flush_cache();
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
		WPMuseum\Dashboard_Health_Controller::flush_cache();

		parent::tearDown();
	}

	/**
	 * Requests health checks as admin and returns the response data.
	 *
	 * @param array $params Query parameters for the request.
	 * @return array Response data.
	 */
	private function get_health( $params = [ 'refresh' => 1 ] ) {
		wp_set_current_user( $this->admin_id );
		$request = new \WP_REST_Request( 'GET', TEST_REST_NAMESPACE . '/dashboard_health' );
		$request->set_query_params( $params );
		$response = rest_do_request( $request );
		$this->assertEquals( 200, $response->get_status() );
		return $response->get_data();
	}

	/**
	 * Finds a check item whose id starts with the given prefix.
	 *
	 * @param array  $checks    Array of check items.
	 * @param string $id_prefix Prefix of the check id to find.
	 * @return array|null The check item, or null if not found.
	 */
	private function find_check( $checks, $id_prefix ) {
		foreach ( $checks as $check ) {
			if ( 0 === strpos( $check['id'], $id_prefix ) ) {
				return $check;
			}
		}
		return null;
	}

	/**
	 * Creates a published museum object with the given field values.
	 *
	 * @param array $meta Meta key => value pairs.
	 * @return int Post ID.
	 */
	private function create_object( $meta = [] ) {
		$post_id = $this->factory->post->create(
			[
				'post_type'   => $this->test_kind->type_name,
				'post_status' => 'publish',
			]
		);
		foreach ( $meta as $key => $value ) {
			add_post_meta( $post_id, $key, $value );
		}
		return $post_id;
	}

	/**
	 * Test health route access control: administrators only.
	 */
	public function test_health_route_permissions() {
		$route = TEST_REST_NAMESPACE . '/dashboard_health';

		$this->assertRouteStatusEquals( $route, 401, 'GET', 0 );
		$this->assertRouteStatusEquals( $route, 403, 'GET', $this->user_id );
		$this->assertRouteStatusEquals( $route, 403, 'GET', $this->editor_id );
		$this->assertRouteIsAccessible( $route, 'GET', $this->admin_id );
	}

	/**
	 * Test a correctly configured site with no objects passes all checks.
	 */
	public function test_healthy_site_has_no_checks() {
		$data = $this->get_health();

		$this->assertSame( [], $data['checks'] );
		$this->assertFalse( $data['cached'] );
	}

	/**
	 * Test a kind without fields is reported.
	 */
	public function test_kind_without_fields_reported() {
		$kind_id = WPMuseum\new_kind( [ 'label' => 'Fieldless Kind' ] );
		wp_cache_flush();

		$data  = $this->get_health();
		$check = $this->find_check( $data['checks'], 'kind-no-fields-' . $kind_id );

		$this->assertNotNull( $check );
		$this->assertEquals( 'warning', $check['severity'] );
	}

	/**
	 * Test a kind without a catalogue ID field is reported.
	 */
	public function test_kind_without_cat_field_reported() {
		WPMuseum\update_kind( $this->test_kind->kind_id, [ 'cat_field_id' => 0 ] );
		wp_cache_flush();

		$data  = $this->get_health();
		$check = $this->find_check(
			$data['checks'],
			'kind-no-cat-field-' . $this->test_kind->kind_id
		);

		$this->assertNotNull( $check );
	}

	/**
	 * Test risky remote settings are reported.
	 */
	public function test_unregistered_remote_requests_reported() {
		update_option( 'allow_remote_requests', 1 );
		update_option( 'allow_unregistered_requests', 1 );

		$data  = $this->get_health();
		$check = $this->find_check( $data['checks'], 'remote-unregistered-allowed' );

		$this->assertNotNull( $check );
		$this->assertEquals( 'warning', $check['severity'] );
	}

	/**
	 * Test published objects missing required field values are counted.
	 */
	public function test_objects_missing_required_fields_counted() {
		// Complete object: has the required name field and a catalogue ID.
		$this->create_object(
			[
				'name'             => 'Complete Object',
				'accession-number' => 'TST-1',
			]
		);
		// Incomplete object: missing the required name field.
		$this->create_object( [ 'accession-number' => 'TST-2' ] );

		$data  = $this->get_health();
		$check = $this->find_check(
			$data['checks'],
			'objects-missing-required-' . $this->test_kind->kind_id
		);

		$this->assertNotNull( $check );
		$this->assertEquals( 1, $check['count'] );
	}

	/**
	 * Test published objects without a catalogue ID are counted.
	 */
	public function test_objects_with_empty_cat_id_counted() {
		$this->create_object(
			[
				'name'             => 'Has Catalogue ID',
				'accession-number' => 'TST-1',
			]
		);
		$this->create_object( [ 'name' => 'No Catalogue ID' ] );

		$data  = $this->get_health();
		$check = $this->find_check(
			$data['checks'],
			'objects-empty-cat-id-' . $this->test_kind->kind_id
		);

		$this->assertNotNull( $check );
		$this->assertEquals( 1, $check['count'] );
	}

	/**
	 * Test duplicate catalogue IDs are reported as errors.
	 */
	public function test_duplicate_cat_ids_reported() {
		$this->create_object(
			[
				'name'             => 'First',
				'accession-number' => 'DUP-1',
			]
		);
		$this->create_object(
			[
				'name'             => 'Second',
				'accession-number' => 'DUP-1',
			]
		);

		$data  = $this->get_health();
		$check = $this->find_check(
			$data['checks'],
			'objects-duplicate-cat-id-' . $this->test_kind->kind_id
		);

		$this->assertNotNull( $check );
		$this->assertEquals( 'error', $check['severity'] );
		$this->assertEquals( 1, $check['count'] );
	}

	/**
	 * Test objects missing a featured image are counted when required.
	 */
	public function test_objects_missing_featured_image_counted() {
		WPMuseum\update_kind(
			$this->test_kind->kind_id,
			[ 'must_featured_image' => 1 ]
		);
		wp_cache_flush();

		$this->create_object(
			[
				'name'             => 'No Image',
				'accession-number' => 'TST-1',
			]
		);

		$data  = $this->get_health();
		$check = $this->find_check(
			$data['checks'],
			'objects-missing-image-' . $this->test_kind->kind_id
		);

		$this->assertNotNull( $check );
		$this->assertEquals( 1, $check['count'] );
	}

	/**
	 * Test results are cached and the refresh param bypasses the cache.
	 */
	public function test_results_are_cached() {
		$first = $this->get_health( [] );
		$this->assertFalse( $first['cached'] );

		$second = $this->get_health( [] );
		$this->assertTrue( $second['cached'] );

		$refreshed = $this->get_health( [ 'refresh' => 1 ] );
		$this->assertFalse( $refreshed['cached'] );
	}
}
