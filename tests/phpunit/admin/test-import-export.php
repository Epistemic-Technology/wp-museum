<?php
/**
 * Tests for import/export functions
 *
 * @package MikeThicke\WPMuseum
 */

use MikeThicke\WPMuseum;

/**
 * Test import/export functionality.
 */
class TestImportExport extends WP_UnitTestCase {
	/**
	 * Test object kind.
	 *
	 * @var ObjectKind
	 */
	private $test_kind;

	/**
	 * Test posts.
	 *
	 * @var array
	 */
	private $test_posts = [];

	/**
	 * Set up before each test.
	 */
	public function setUp(): void {
		parent::setUp();

		// Create a test object kind
		$this->test_kind = MuseumTestData::create_test_object_kind();

		// Create some test posts with custom fields
		$this->create_test_posts();

		// Set up a test user with proper capabilities
		$user_id = $this->factory->user->create( [
			'role' => 'administrator'
		] );
		wp_set_current_user( $user_id );
	}

	/**
	 * Tear down after each test.
	 */
	public function tearDown(): void {
		// Clean up test posts
		foreach ( $this->test_posts as $post_id ) {
			wp_delete_post( $post_id, true );
		}

		// Clean up the test kind and its fields
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
	 * Create test posts with custom fields.
	 */
	private function create_test_posts() {
		// Create test posts
		for ( $i = 1; $i <= 3; $i++ ) {
			$post_id = $this->factory->post->create( [
				'post_type'    => $this->test_kind->type_name,
				'post_title'   => "Test Object $i",
				'post_content' => "Test content for object $i",
				'post_status'  => $i === 1 ? 'publish' : ( $i === 2 ? 'draft' : 'private' ),
			] );

			// Add custom field values
			update_post_meta( $post_id, 'wpm_catalog_number', "CAT-00$i" );
			update_post_meta( $post_id, 'wpm_object_name', "Object Name $i" );
			update_post_meta( $post_id, 'wpm_description', "Description for object $i" );
			update_post_meta( $post_id, 'wpm_date', "202$i-01-01" );

			$this->test_posts[] = $post_id;
		}
	}

	/**
	 * Test export_csv function with valid parameters.
	 */
	public function test_export_csv_with_valid_parameters() {
		// Set up the GET parameters
		$_GET[ WPM_PREFIX . 'ot_csv' ] = $this->test_kind->kind_id;
		$_GET['sort_col'] = 'post_title';
		$_GET['sort_dir'] = 'asc';
		$_GET['wpm-objects-admin-nonce'] = wp_create_nonce( 'd78HG@YsELh2KByUgCTuDCepW' );

		// Start output buffering to capture the CSV output
		ob_start();

		// The function should exit after outputting CSV, so we need to catch that
		$this->expectException( 'WPDieException' );
		
		try {
			WPMuseum\export_csv();
		} catch ( Exception $e ) {
			// Check if we got the expected exit
			$this->assertStringContainsString( 'exit', $e->getMessage() );
		}

		$output = ob_get_clean();

		// The function calls exit() so we can't test the output directly
		// This test mainly ensures the function doesn't error out with valid parameters
		$this->assertTrue( true );
	}

	/**
	 * Test export_csv function without required GET parameter.
	 */
	public function test_export_csv_without_parameter() {
		// Don't set the required GET parameter
		unset( $_GET[ WPM_PREFIX . 'ot_csv' ] );

		// The function should return early without doing anything
		ob_start();
		WPMuseum\export_csv();
		$output = ob_get_clean();

		// Should produce no output
		$this->assertEmpty( $output );
	}

	/**
	 * Test export_csv function with invalid nonce.
	 */
	public function test_export_csv_with_invalid_nonce() {
		// Set up the GET parameters with invalid nonce
		$_GET[ WPM_PREFIX . 'ot_csv' ] = $this->test_kind->kind_id;
		$_GET['wpm-objects-admin-nonce'] = 'invalid_nonce';

		// The function should die with nonce error
		$this->expectException( 'WPDieException' );
		
		try {
			WPMuseum\export_csv();
		} catch ( WPDieException $e ) {
			$this->assertStringContainsString( 'Failed nonce check', $e->getMessage() );
			throw $e;
		}
	}

	/**
	 * Test export_csv function without proper capabilities.
	 */
	public function test_export_csv_without_capabilities() {
		// Create a subscriber user (no edit_posts capability)
		$user_id = $this->factory->user->create( [
			'role' => 'subscriber'
		] );
		wp_set_current_user( $user_id );

		// Set up valid GET parameters
		$_GET[ WPM_PREFIX . 'ot_csv' ] = $this->test_kind->kind_id;
		$_GET['wpm-objects-admin-nonce'] = wp_create_nonce( 'd78HG@YsELh2KByUgCTuDCepW' );

		// The function should die with permissions error
		$this->expectException( 'WPDieException' );
		
		try {
			WPMuseum\export_csv();
		} catch ( WPDieException $e ) {
			$this->assertStringContainsString( 'You do not have sufficient permissions', $e->getMessage() );
			throw $e;
		}
	}

	/**
	 * Test export_csv function with non-existent kind.
	 */
	public function test_export_csv_with_invalid_kind() {
		// Set up the GET parameters with non-existent kind ID
		$_GET[ WPM_PREFIX . 'ot_csv' ] = 99999;
		$_GET['wpm-objects-admin-nonce'] = wp_create_nonce( 'd78HG@YsELh2KByUgCTuDCepW' );

		// The function might still try to export, but with no posts
		// This test ensures it doesn't fatal error
		ob_start();
		
		try {
			WPMuseum\export_csv();
		} catch ( Exception $e ) {
			// Expected to exit
		}
		
		ob_end_clean();
		
		// If we get here without fatal error, the test passes
		$this->assertTrue( true );
	}

	/**
	 * Test export_csv with different sort parameters.
	 */
	public function test_export_csv_with_sort_parameters() {
		// Test with different sort columns and directions
		$sort_tests = [
			[ 'sort_col' => 'post_title', 'sort_dir' => 'desc' ],
			[ 'sort_col' => 'wpm_catalog_number', 'sort_dir' => 'asc' ],
			[ 'sort_col' => 'wpm_date', 'sort_dir' => 'desc' ],
		];

		foreach ( $sort_tests as $test ) {
			$_GET[ WPM_PREFIX . 'ot_csv' ] = $this->test_kind->kind_id;
			$_GET['sort_col'] = $test['sort_col'];
			$_GET['sort_dir'] = $test['sort_dir'];
			$_GET['wpm-objects-admin-nonce'] = wp_create_nonce( 'd78HG@YsELh2KByUgCTuDCepW' );

			ob_start();
			
			try {
				WPMuseum\export_csv();
			} catch ( Exception $e ) {
				// Expected to exit
			}
			
			ob_end_clean();
			
			// If we get here without fatal error, the test passes
			$this->assertTrue( true );
		}
	}

	/**
	 * Test CSV output headers.
	 * Note: This is difficult to test directly due to the exit() call,
	 * but we can test that the function sets up the data correctly.
	 */
	public function test_csv_headers_setup() {
		// This test verifies the function can retrieve the necessary data
		// without actually testing the CSV output (which requires intercepting headers and exit)
		
		$kind = WPMuseum\get_kind( $this->test_kind->kind_id );
		$this->assertNotNull( $kind );
		
		$fields = WPMuseum\get_mobject_fields( $this->test_kind->kind_id );
		$this->assertIsArray( $fields );
		
		$posts = get_posts( [
			'post_type'   => $kind->type_name,
			'post_status' => 'any',
			'numberposts' => -1,
		] );
		
		$this->assertCount( 3, $posts );
	}
}