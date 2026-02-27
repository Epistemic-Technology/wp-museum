<?php
/**
 * Tests for database functions.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum\Tests\Includes;

use MikeThicke\WPMuseum;
use MikeThicke\WPMuseum\WP_Museum_Test_Case;
use MikeThicke\WPMuseum\ObjectKind;

/**
 * Tests for database-functions.php.
 */
class DatabaseFunctionsTest extends WP_Museum_Test_Case {

	/**
	 * Kind IDs created during tests, for cleanup.
	 *
	 * @var array
	 */
	private $created_kind_ids = [];

	/**
	 * Set up before each test.
	 */
	public function setUp(): void {
		parent::setUp();

		WPMuseum\db_version_check();
		wp_cache_flush();
	}

	/**
	 * Tear down after each test.
	 */
	public function tearDown(): void {
		global $wpdb;
		foreach ( $this->created_kind_ids as $kind_id ) {
			$wpdb->delete(
				$wpdb->prefix . 'wpm_mobject_kinds',
				[ 'kind_id' => $kind_id ]
			);
			$wpdb->delete(
				$wpdb->prefix . 'wpm_mobject_fields',
				[ 'kind_id' => $kind_id ]
			);
		}
		wp_cache_flush();
		parent::tearDown();
	}

	/**
	 * Helper to create a kind and track it for cleanup.
	 *
	 * @param array $data Kind data.
	 * @return int The kind ID.
	 */
	private function create_tracked_kind( $data = [] ) {
		$defaults = [ 'label' => 'Test Kind' ];
		$data     = array_merge( $defaults, $data );
		$kind_id  = WPMuseum\new_kind( $data );
		if ( $kind_id > 0 ) {
			$this->created_kind_ids[] = $kind_id;
		}
		wp_cache_flush();
		return $kind_id;
	}

	/**
	 * Test new_kind creates a kind and returns a positive insert_id.
	 */
	public function test_new_kind_creates_kind() {
		$kind_id = $this->create_tracked_kind( [ 'label' => 'Artifact' ] );

		$this->assertGreaterThan( 0, $kind_id );
	}

	/**
	 * Test new_kind without label returns -1.
	 */
	public function test_new_kind_without_label_returns_negative_one() {
		$result = WPMuseum\new_kind( [] );

		$this->assertEquals( -1, $result );
	}

	/**
	 * Test new_kind with empty label returns -1.
	 */
	public function test_new_kind_empty_label_returns_negative_one() {
		$result = WPMuseum\new_kind( [ 'label' => '' ] );

		$this->assertEquals( -1, $result );
	}

	/**
	 * Test new_kind generates name from label.
	 */
	public function test_new_kind_generates_name_from_label() {
		$kind_id = $this->create_tracked_kind( [ 'label' => 'Test Artifact' ] );
		$kind    = WPMuseum\get_kind( $kind_id );

		$this->assertNotNull( $kind );
		$this->assertNotEmpty( $kind->name );
		// Name should be derived from label.
		$expected_name = ObjectKind::name_from_label( 'Test Artifact' );
		$this->assertEquals( $expected_name, $kind->name );
	}

	/**
	 * Test new_kind generates type_name with WPM_PREFIX.
	 */
	public function test_new_kind_generates_type_name() {
		$kind_id = $this->create_tracked_kind( [ 'label' => 'Specimen' ] );
		$kind    = WPMuseum\get_kind( $kind_id );

		$this->assertNotNull( $kind );
		$this->assertStringStartsWith( WPMuseum\WPM_PREFIX, $kind->type_name );
	}

	/**
	 * Test new_kind truncates type_name to 20 characters.
	 */
	public function test_new_kind_type_name_truncated_to_20() {
		$kind_id = $this->create_tracked_kind(
			[ 'label' => 'Very Long Object Kind Name That Should Be Truncated' ]
		);
		$kind = WPMuseum\get_kind( $kind_id );

		$this->assertNotNull( $kind );
		$this->assertLessThanOrEqual( 20, strlen( $kind->type_name ) );
	}

	/**
	 * Test new_kind handles collision by appending a number.
	 */
	public function test_new_kind_collision_handling() {
		$kind_id_1 = $this->create_tracked_kind( [ 'label' => 'Duplicate' ] );
		$kind_id_2 = $this->create_tracked_kind( [ 'label' => 'Duplicate' ] );

		$kind_1 = WPMuseum\get_kind( $kind_id_1 );
		$kind_2 = WPMuseum\get_kind( $kind_id_2 );

		$this->assertNotNull( $kind_1 );
		$this->assertNotNull( $kind_2 );
		$this->assertNotEquals( $kind_1->type_name, $kind_2->type_name );
	}

	/**
	 * Test get_kind returns an ObjectKind instance.
	 */
	public function test_get_kind_returns_objectkind() {
		$kind_id = $this->create_tracked_kind( [ 'label' => 'Fetched Kind' ] );
		$kind    = WPMuseum\get_kind( $kind_id );

		$this->assertInstanceOf( ObjectKind::class, $kind );
		$this->assertEquals( $kind_id, $kind->kind_id );
	}

	/**
	 * Test get_kind with null returns null.
	 */
	public function test_get_kind_null_returns_null() {
		$kind = WPMuseum\get_kind( null );

		$this->assertNull( $kind );
	}

	/**
	 * Test get_kind with nonexistent ID returns null.
	 */
	public function test_get_kind_nonexistent_returns_null() {
		$kind = WPMuseum\get_kind( 999999 );

		$this->assertNull( $kind );
	}

	/**
	 * Test get_kind_from_typename returns the correct kind.
	 */
	public function test_get_kind_from_typename() {
		$kind_id = $this->create_tracked_kind( [ 'label' => 'Typename Test' ] );
		$kind    = WPMuseum\get_kind( $kind_id );

		$fetched = WPMuseum\get_kind_from_typename( $kind->type_name );

		$this->assertNotNull( $fetched );
		$this->assertEquals( $kind_id, $fetched->kind_id );
	}

	/**
	 * Test get_mobject_kinds returns all created kinds.
	 */
	public function test_get_mobject_kinds_returns_all() {
		$kind_id_1 = $this->create_tracked_kind( [ 'label' => 'Kind Alpha' ] );
		$kind_id_2 = $this->create_tracked_kind( [ 'label' => 'Kind Beta' ] );

		$kinds    = WPMuseum\get_mobject_kinds();
		$kind_ids = array_map(
			function ( $k ) {
				return $k->kind_id;
			},
			$kinds
		);

		$this->assertContains( $kind_id_1, $kind_ids );
		$this->assertContains( $kind_id_2, $kind_ids );
	}

	/**
	 * Test update_kind updates label correctly.
	 */
	public function test_update_kind() {
		$kind_id = $this->create_tracked_kind( [ 'label' => 'Original Label' ] );

		WPMuseum\update_kind( $kind_id, [ 'label' => 'Updated Label' ] );
		wp_cache_flush();
		$kind = WPMuseum\get_kind( $kind_id );

		$this->assertEquals( 'Updated Label', $kind->label );
	}

	/**
	 * Test update_kind with -1 returns -1.
	 */
	public function test_update_kind_negative_one_returns_negative_one() {
		$result = WPMuseum\update_kind( -1, [ 'label' => 'Should Not Work' ] );

		$this->assertEquals( -1, $result );
	}

	/**
	 * Test delete_kind removes kind and associated fields.
	 */
	public function test_delete_kind_removes_kind_and_fields() {
		$kind_id = $this->create_tracked_kind( [ 'label' => 'To Be Deleted' ] );

		// Add a field to this kind.
		$this->create_test_field( $kind_id, [ 'name' => 'Delete Test Field' ] );
		wp_cache_flush();

		$result = WPMuseum\delete_kind( $kind_id );

		$this->assertTrue( $result );

		wp_cache_flush();
		$kind   = WPMuseum\get_kind( $kind_id );
		$fields = WPMuseum\get_mobject_fields( $kind_id );

		$this->assertNull( $kind );
		$this->assertEmpty( $fields );

		// Remove from tracking since already deleted.
		$this->created_kind_ids = array_diff( $this->created_kind_ids, [ $kind_id ] );
	}

	/**
	 * Test get_mobject_fields returns fields for a kind.
	 */
	public function test_get_mobject_fields() {
		$kind_id = $this->create_tracked_kind( [ 'label' => 'Fields Kind' ] );
		$this->create_test_field( $kind_id, [ 'name' => 'Field One', 'public' => 1 ] );
		$this->create_test_field( $kind_id, [ 'name' => 'Field Two', 'public' => 1 ] );
		wp_cache_flush();

		$fields = WPMuseum\get_mobject_fields( $kind_id );

		$this->assertIsArray( $fields );
		$this->assertCount( 2, $fields );
	}

	/**
	 * Test get_mobject_fields with only_public filters to public fields.
	 */
	public function test_get_mobject_fields_only_public() {
		$kind_id = $this->create_tracked_kind( [ 'label' => 'Public Fields Kind' ] );
		$this->create_test_field( $kind_id, [ 'name' => 'Public Field', 'public' => 1 ] );
		$this->create_test_field( $kind_id, [ 'name' => 'Private Field', 'public' => 0 ] );
		wp_cache_flush();

		$public_fields = WPMuseum\get_mobject_fields( $kind_id, true );

		$this->assertIsArray( $public_fields );
		$this->assertCount( 1, $public_fields );

		$field = reset( $public_fields );
		$this->assertEquals( 'Public Field', $field->name );
	}

	/**
	 * Test get_mobject_field returns a specific field.
	 */
	public function test_get_mobject_field_single() {
		$kind_id = $this->create_tracked_kind( [ 'label' => 'Single Field Kind' ] );
		$field   = $this->create_test_field( $kind_id, [ 'name' => 'Specific Field' ] );
		wp_cache_flush();

		$fetched = WPMuseum\get_mobject_field( $kind_id, $field->field_id );

		$this->assertNotNull( $fetched );
		$this->assertEquals( 'Specific Field', $fetched->name );
		$this->assertEquals( $kind_id, $fetched->kind_id );
	}
}
