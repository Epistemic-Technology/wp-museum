<?php
/**
 * Test Suite for WP Museum Classes
 *
 * This file provides a comprehensive test suite configuration for all WP Museum classes.
 * It can be used to run all class tests together or individually.
 *
 * @package MikeThicke\WPMuseum
 */

/**
 * Test Suite Class for WP Museum Classes
 */
class WPMuseumClassesTestSuite {

	/**
	 * Create the test suite.
	 *
	 * @return PHPUnit\Framework\TestSuite
	 */
	public static function suite() {
		$suite = new PHPUnit\Framework\TestSuite( 'WP Museum Classes' );

		// Add all class test files
		$suite->addTestFile( __DIR__ . '/TestCustomPostType.php' );
		$suite->addTestFile( __DIR__ . '/TestMetaBox.php' );
		$suite->addTestFile( __DIR__ . '/TestMObjectField.php' );
		$suite->addTestFile( __DIR__ . '/TestObjectKind.php' );
		$suite->addTestFile( __DIR__ . '/TestObjectPostType.php' );
		$suite->addTestFile( __DIR__ . '/TestRemoteClient.php' );

		return $suite;
	}
}

/**
 * Helper functions for testing
 */
class WPMuseumTestHelpers {

	/**
	 * Create a mock database row object.
	 *
	 * @param array $data Array of key-value pairs for the row.
	 * @return stdClass Mock database row object.
	 */
	public static function create_mock_db_row( $data = [] ) {
		$row = new stdClass();
		foreach ( $data as $key => $value ) {
			$row->$key = $value;
		}
		return $row;
	}

	/**
	 * Create a mock ObjectKind for testing.
	 *
	 * @param array $data Optional data to override defaults.
	 * @return stdClass Mock ObjectKind data.
	 */
	public static function create_mock_object_kind_data( $data = [] ) {
		$defaults = [
			'kind_id'             => '1',
			'cat_field_id'        => null,
			'name'                => 'test-object',
			'type_name'           => 'wpm_test-object',
			'label'               => 'Test Object',
			'label_plural'        => 'Test Objects',
			'description'         => 'A test object type',
			'hierarchical'        => '0',
			'must_featured_image' => '0',
			'must_gallery'        => '0',
			'strict_checking'     => '0',
			'exclude_from_search' => '0',
			'parent_kind_id'      => null
		];

		return self::create_mock_db_row( array_merge( $defaults, $data ) );
	}

	/**
	 * Create a mock MObjectField for testing.
	 *
	 * @param array $data Optional data to override defaults.
	 * @return stdClass Mock MObjectField data.
	 */
	public static function create_mock_object_field_data( $data = [] ) {
		$defaults = [
			'field_id'              => '1',
			'kind_id'               => '1',
			'name'                  => 'Test Field',
			'type'                  => 'plain',
			'display_order'         => '1',
			'public'                => '1',
			'required'              => '0',
			'quick_browse'          => '0',
			'help_text'             => '',
			'detailed_instructions' => '',
			'public_description'    => '',
			'field_schema'          => '',
			'max_length'            => '0',
			'units'                 => '',
			'factors'               => null,
			'dimensions'            => null
		];

		return self::create_mock_db_row( array_merge( $defaults, $data ) );
	}

	/**
	 * Create a mock RemoteClient for testing.
	 *
	 * @param array $data Optional data to override defaults.
	 * @return stdClass Mock RemoteClient data.
	 */
	public static function create_mock_remote_client_data( $data = [] ) {
		$defaults = [
			'client_id'         => '1',
			'uuid'              => '550e8400-e29b-41d4-a716-446655440000',
			'title'             => 'Test Museum Site',
			'url'               => 'https://test.example.com',
			'blocked'           => '0',
			'registration_time' => '2023-01-01 12:00:00'
		];

		return self::create_mock_db_row( array_merge( $defaults, $data ) );
	}

	/**
	 * Generate a valid UUID v4.
	 *
	 * @return string A valid UUID v4 string.
	 */
	public static function generate_uuid() {
		return sprintf(
			'%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
			mt_rand( 0, 0xffff ),
			mt_rand( 0, 0xffff ),
			mt_rand( 0, 0xffff ),
			mt_rand( 0, 0x0fff ) | 0x4000,
			mt_rand( 0, 0x3fff ) | 0x8000,
			mt_rand( 0, 0xffff ),
			mt_rand( 0, 0xffff ),
			mt_rand( 0, 0xffff )
		);
	}

	/**
	 * Create multiple mock database rows.
	 *
	 * @param int   $count Number of rows to create.
	 * @param array $template Template data for each row.
	 * @param bool  $unique_ids Whether to generate unique IDs for each row.
	 * @return array Array of mock database row objects.
	 */
	public static function create_multiple_mock_rows( $count, $template = [], $unique_ids = true ) {
		$rows = [];
		for ( $i = 0; $i < $count; $i++ ) {
			$data = $template;
			if ( $unique_ids && isset( $template['id'] ) ) {
				$data['id'] = $i + 1;
			}
			if ( $unique_ids && isset( $template['field_id'] ) ) {
				$data['field_id'] = $i + 1;
			}
			if ( $unique_ids && isset( $template['kind_id'] ) && ! isset( $template['parent_kind_id'] ) ) {
				$data['kind_id'] = $i + 1;
			}
			if ( $unique_ids && isset( $template['client_id'] ) ) {
				$data['client_id'] = $i + 1;
			}
			if ( $unique_ids && isset( $template['uuid'] ) ) {
				$data['uuid'] = self::generate_uuid();
			}
			$rows[] = self::create_mock_db_row( $data );
		}
		return $rows;
	}

	/**
	 * Assert that an array contains all expected keys.
	 *
	 * @param array $expected_keys Array of expected keys.
	 * @param array $actual_array  The array to check.
	 * @param string $message      Optional failure message.
	 */
	public static function assertArrayHasKeys( $expected_keys, $actual_array, $message = '' ) {
		foreach ( $expected_keys as $key ) {
			PHPUnit\Framework\Assert::assertArrayHasKey( $key, $actual_array, $message );
		}
	}

	/**
	 * Assert that an object has all expected properties.
	 *
	 * @param array  $expected_properties Array of expected property names.
	 * @param object $actual_object       The object to check.
	 * @param string $message             Optional failure message.
	 */
	public static function assertObjectHasProperties( $expected_properties, $actual_object, $message = '' ) {
		foreach ( $expected_properties as $property ) {
			PHPUnit\Framework\Assert::assertObjectHasProperty( $property, $actual_object, $message );
		}
	}

	/**
	 * Create a mock WordPress post.
	 *
	 * @param array $data Post data.
	 * @return WP_Post Mock WordPress post object.
	 */
	public static function create_mock_wp_post( $data = [] ) {
		$defaults = [
			'ID'          => 1,
			'post_title'  => 'Test Post',
			'post_type'   => 'post',
			'post_status' => 'publish'
		];

		$post_data = array_merge( $defaults, $data );
		$post = new WP_Post( (object) $post_data );
		return $post;
	}

	/**
	 * Mock global WordPress functions for testing.
	 *
	 * This method sets up common WordPress function mocks that might be needed
	 * during testing when full WordPress environment is not available.
	 */
	public static function setup_wordpress_mocks() {
		// Mock wp_unslash if it doesn't exist
		if ( ! function_exists( 'wp_unslash' ) ) {
			function wp_unslash( $value ) {
				return is_string( $value ) ? stripslashes( $value ) : $value;
			}
		}

		// Mock esc_html if it doesn't exist
		if ( ! function_exists( 'esc_html' ) ) {
			function esc_html( $text ) {
				return htmlspecialchars( $text, ENT_QUOTES, 'UTF-8' );
			}
		}

		// Mock wp_json_encode if it doesn't exist
		if ( ! function_exists( 'wp_json_encode' ) ) {
			function wp_json_encode( $data, $options = 0, $depth = 512 ) {
				return json_encode( $data, $options, $depth );
			}
		}

		// Mock is_admin if it doesn't exist
		if ( ! function_exists( 'is_admin' ) ) {
			function is_admin() {
				return false;
			}
		}

		// Mock current_user_can if it doesn't exist
		if ( ! function_exists( 'current_user_can' ) ) {
			function current_user_can( $capability ) {
				return true; // Allow all capabilities in tests
			}
		}
	}

	/**
	 * Clean up test environment.
	 *
	 * This method can be called after tests to clean up any test artifacts.
	 */
	public static function cleanup_test_environment() {
		// Clean up global variables that might have been set during tests
		unset( $GLOBALS['current_screen'] );
		unset( $GLOBALS['post'] );

		// Clean up $_POST data that might have been set during tests
		$_POST = [];
	}
}

/**
 * Constants for testing
 */
if ( ! defined( 'WPM_PREFIX' ) ) {
	define( 'WPM_PREFIX', 'wpm_' );
}

if ( ! defined( 'CACHE_GROUP' ) ) {
	define( 'CACHE_GROUP', 'MikeThicke\WPMuseum' );
}

if ( ! defined( 'DB_SHOW_ERRORS' ) ) {
	define( 'DB_SHOW_ERRORS', false );
}

// Setup WordPress mocks
WPMuseumTestHelpers::setup_wordpress_mocks();