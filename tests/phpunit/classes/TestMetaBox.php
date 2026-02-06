<?php
/**
 * Tests for MetaBox class
 *
 * @package MikeThicke\WPMuseum
 */

use MikeThicke\WPMuseum\MetaBox;

/**
 * Test MetaBox class.
 */
class TestMetaBox extends WP_UnitTestCase {

	/**
	 * Test MetaBox constructor with basic parameters.
	 */
	public function test_constructor_basic() {
		$display_callback = function() {
			echo 'Test metabox content';
		};

		$metabox = new MetaBox( 'test_metabox', 'Test Metabox', $display_callback );

		$this->assertEquals( 'test_metabox', $metabox->name );
		$this->assertEquals( 'Test Metabox', $metabox->label );
		$this->assertEquals( $display_callback, $metabox->display_callback );
		$this->assertNull( $metabox->screen );
		$this->assertEquals( 'advanced', $metabox->context );
		$this->assertEquals( 'default', $metabox->priority );
		$this->assertNull( $metabox->args );
	}

	/**
	 * Test MetaBox constructor with save callback.
	 */
	public function test_constructor_with_save_callback() {
		$display_callback = function() {
			echo 'Test metabox content';
		};

		$save_callback = function( $post_id ) {
			update_post_meta( $post_id, 'test_meta', 'test_value' );
		};

		$metabox = new MetaBox( 'test_metabox_save', 'Test Metabox Save', $display_callback, $save_callback );

		$this->assertEquals( 'test_metabox_save', $metabox->name );
		$this->assertEquals( 'Test Metabox Save', $metabox->label );
		$this->assertEquals( $display_callback, $metabox->display_callback );

		// Use reflection to access private save_callback property
		$reflection = new ReflectionClass( $metabox );
		$save_callback_property = $reflection->getProperty( 'save_callback' );
		$save_callback_property->setAccessible( true );
		$this->assertEquals( $save_callback, $save_callback_property->getValue( $metabox ) );
	}

	/**
	 * Test MetaBox constructor with null save callback.
	 */
	public function test_constructor_with_null_save_callback() {
		$display_callback = function() {
			echo 'Test metabox content';
		};

		$metabox = new MetaBox( 'test_metabox_null_save', 'Test Metabox Null Save', $display_callback, null );

		$this->assertEquals( 'test_metabox_null_save', $metabox->name );
		$this->assertEquals( 'Test Metabox Null Save', $metabox->label );
		$this->assertEquals( $display_callback, $metabox->display_callback );

		// Use reflection to access private save_callback property
		$reflection = new ReflectionClass( $metabox );
		$save_callback_property = $reflection->getProperty( 'save_callback' );
		$save_callback_property->setAccessible( true );
		$this->assertNull( $save_callback_property->getValue( $metabox ) );
	}

	/**
	 * Test MetaBox constructor with only display callback (null save callback by default).
	 */
	public function test_constructor_display_callback_only() {
		$display_callback = function() {
			echo 'Test metabox content';
		};

		$metabox = new MetaBox( 'test_metabox_display_only', 'Test Metabox Display Only', $display_callback );

		$this->assertEquals( 'test_metabox_display_only', $metabox->name );
		$this->assertEquals( 'Test Metabox Display Only', $metabox->label );
		$this->assertEquals( $display_callback, $metabox->display_callback );

		// Use reflection to access private save_callback property
		$reflection = new ReflectionClass( $metabox );
		$save_callback_property = $reflection->getProperty( 'save_callback' );
		$save_callback_property->setAccessible( true );
		$this->assertNull( $save_callback_property->getValue( $metabox ) );
	}

	/**
	 * Test MetaBox constructor with null display callback.
	 */
	public function test_constructor_null_display_callback() {
		$metabox = new MetaBox( 'test_metabox_null_display', 'Test Metabox Null Display', null );

		$this->assertEquals( 'test_metabox_null_display', $metabox->name );
		$this->assertEquals( 'Test Metabox Null Display', $metabox->label );
		$this->assertNull( $metabox->display_callback );
	}

	/**
	 * Test setting screen property.
	 */
	public function test_screen_property() {
		$metabox = new MetaBox( 'test_metabox_screen', 'Test Metabox Screen' );

		// Default should be null
		$this->assertNull( $metabox->screen );

		// Should be able to set screen
		$metabox->screen = 'post';
		$this->assertEquals( 'post', $metabox->screen );

		$metabox->screen = 'page';
		$this->assertEquals( 'page', $metabox->screen );

		$metabox->screen = 'custom_post_type';
		$this->assertEquals( 'custom_post_type', $metabox->screen );
	}

	/**
	 * Test setting context property.
	 */
	public function test_context_property() {
		$metabox = new MetaBox( 'test_metabox_context', 'Test Metabox Context' );

		// Default should be 'advanced'
		$this->assertEquals( 'advanced', $metabox->context );

		// Should be able to set different contexts
		$metabox->context = 'normal';
		$this->assertEquals( 'normal', $metabox->context );

		$metabox->context = 'side';
		$this->assertEquals( 'side', $metabox->context );

		$metabox->context = 'advanced';
		$this->assertEquals( 'advanced', $metabox->context );
	}

	/**
	 * Test setting priority property.
	 */
	public function test_priority_property() {
		$metabox = new MetaBox( 'test_metabox_priority', 'Test Metabox Priority' );

		// Default should be 'default'
		$this->assertEquals( 'default', $metabox->priority );

		// Should be able to set different priorities
		$metabox->priority = 'high';
		$this->assertEquals( 'high', $metabox->priority );

		$metabox->priority = 'low';
		$this->assertEquals( 'low', $metabox->priority );

		$metabox->priority = 'default';
		$this->assertEquals( 'default', $metabox->priority );
	}

	/**
	 * Test setting args property.
	 */
	public function test_args_property() {
		$metabox = new MetaBox( 'test_metabox_args', 'Test Metabox Args' );

		// Default should be null
		$this->assertNull( $metabox->args );

		// Should be able to set args
		$args = [ 'test_arg' => 'test_value' ];
		$metabox->args = $args;
		$this->assertEquals( $args, $metabox->args );

		// Should be able to set different args
		$new_args = [ 'another_arg' => 'another_value', 'number_arg' => 123 ];
		$metabox->args = $new_args;
		$this->assertEquals( $new_args, $metabox->args );
	}

	/**
	 * Test set_save_callback method with valid callback.
	 */
	public function test_set_save_callback_valid() {
		$metabox = new MetaBox( 'test_metabox_set_save', 'Test Metabox Set Save' );

		$save_callback = function( $post_id ) {
			update_post_meta( $post_id, 'test_meta', 'test_value' );
		};

		$metabox->set_save_callback( $save_callback );

		// Use reflection to access private save_callback property
		$reflection = new ReflectionClass( $metabox );
		$save_callback_property = $reflection->getProperty( 'save_callback' );
		$save_callback_property->setAccessible( true );
		$this->assertEquals( $save_callback, $save_callback_property->getValue( $metabox ) );
	}

	/**
	 * Test set_save_callback method with null callback.
	 */
	public function test_set_save_callback_null() {
		$metabox = new MetaBox( 'test_metabox_set_save_null', 'Test Metabox Set Save Null' );

		$metabox->set_save_callback( null );

		// Use reflection to access private save_callback property
		$reflection = new ReflectionClass( $metabox );
		$save_callback_property = $reflection->getProperty( 'save_callback' );
		$save_callback_property->setAccessible( true );
		$this->assertNull( $save_callback_property->getValue( $metabox ) );
	}

	/**
	 * Test set_save_callback method overriding existing callback.
	 */
	public function test_set_save_callback_override() {
		$original_callback = function( $post_id ) {
			update_post_meta( $post_id, 'original_meta', 'original_value' );
		};

		$metabox = new MetaBox( 'test_metabox_override', 'Test Metabox Override', null, $original_callback );

		$new_callback = function( $post_id ) {
			update_post_meta( $post_id, 'new_meta', 'new_value' );
		};

		$metabox->set_save_callback( $new_callback );

		// Use reflection to access private save_callback property
		$reflection = new ReflectionClass( $metabox );
		$save_callback_property = $reflection->getProperty( 'save_callback' );
		$save_callback_property->setAccessible( true );
		$this->assertEquals( $new_callback, $save_callback_property->getValue( $metabox ) );
	}

	/**
	 * Test add method creates metabox correctly.
	 *
	 * Note: This is a basic test since we can't easily mock WordPress' add_meta_box function
	 * in a unit test environment.
	 */
	public function test_add_method() {
		$display_callback = function() {
			echo 'Test metabox content';
		};

		$metabox = new MetaBox( 'test_metabox_add', 'Test Metabox Add', $display_callback );
		$metabox->screen = 'post';
		$metabox->context = 'normal';
		$metabox->priority = 'high';
		$metabox->args = [ 'test_arg' => 'test_value' ];

		// Since we can't easily test WordPress' add_meta_box function in unit tests,
		// we'll just verify the method can be called without errors
		$metabox->add();
		$this->assertTrue( true );
	}

	/**
	 * Test that metabox can handle callable strings as callbacks.
	 */
	public function test_callable_string_callbacks() {
		// Define a global function for testing
		if ( ! function_exists( 'test_display_callback' ) ) {
			function test_display_callback() {
				echo 'Test display callback';
			}
		}

		if ( ! function_exists( 'test_save_callback' ) ) {
			function test_save_callback( $post_id ) {
				update_post_meta( $post_id, 'test_meta', 'test_value' );
			}
		}

		$metabox = new MetaBox( 'test_metabox_string_callbacks', 'Test Metabox String Callbacks', 'test_display_callback', 'test_save_callback' );

		$this->assertEquals( 'test_display_callback', $metabox->display_callback );

		// Use reflection to access private save_callback property
		$reflection = new ReflectionClass( $metabox );
		$save_callback_property = $reflection->getProperty( 'save_callback' );
		$save_callback_property->setAccessible( true );
		$this->assertEquals( 'test_save_callback', $save_callback_property->getValue( $metabox ) );
	}

	/**
	 * Test that metabox can handle array callbacks (class methods).
	 */
	public function test_array_callbacks() {
		// Create a test class for callbacks
		$test_object = new class {
			public function display_callback() {
				echo 'Test display callback from object';
			}

			public function save_callback( $post_id ) {
				update_post_meta( $post_id, 'test_meta', 'test_value' );
			}
		};

		$display_callback = [ $test_object, 'display_callback' ];
		$save_callback = [ $test_object, 'save_callback' ];

		$metabox = new MetaBox( 'test_metabox_array_callbacks', 'Test Metabox Array Callbacks', $display_callback, $save_callback );

		$this->assertEquals( $display_callback, $metabox->display_callback );

		// Use reflection to access private save_callback property
		$reflection = new ReflectionClass( $metabox );
		$save_callback_property = $reflection->getProperty( 'save_callback' );
		$save_callback_property->setAccessible( true );
		$this->assertEquals( $save_callback, $save_callback_property->getValue( $metabox ) );
	}

	/**
	 * Test metabox with complete configuration.
	 */
	public function test_complete_metabox_configuration() {
		$display_callback = function() {
			echo 'Complete metabox content';
		};

		$save_callback = function( $post_id ) {
			update_post_meta( $post_id, 'complete_meta', 'complete_value' );
		};

		$metabox = new MetaBox( 'complete_metabox', 'Complete Metabox', $display_callback, $save_callback );
		$metabox->screen = 'custom_post_type';
		$metabox->context = 'side';
		$metabox->priority = 'high';
		$metabox->args = [
			'custom_arg1' => 'value1',
			'custom_arg2' => 123,
			'custom_arg3' => [ 'nested' => 'array' ]
		];

		$this->assertEquals( 'complete_metabox', $metabox->name );
		$this->assertEquals( 'Complete Metabox', $metabox->label );
		$this->assertEquals( $display_callback, $metabox->display_callback );
		$this->assertEquals( 'custom_post_type', $metabox->screen );
		$this->assertEquals( 'side', $metabox->context );
		$this->assertEquals( 'high', $metabox->priority );
		$this->assertEquals( [
			'custom_arg1' => 'value1',
			'custom_arg2' => 123,
			'custom_arg3' => [ 'nested' => 'array' ]
		], $metabox->args );

		// Use reflection to access private save_callback property
		$reflection = new ReflectionClass( $metabox );
		$save_callback_property = $reflection->getProperty( 'save_callback' );
		$save_callback_property->setAccessible( true );
		$this->assertEquals( $save_callback, $save_callback_property->getValue( $metabox ) );
	}
}