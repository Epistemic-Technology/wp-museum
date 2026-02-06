<?php
/**
 * Class PluginLoadedTest
 *
 * @package Wp_Museum
 */

/**
 * Test case to check if the plugin is loaded.
 */
class PluginLoadedTest extends WP_UnitTestCase {

    /**
     * Tests if the wp-museum plugin is loaded.
     */
    public function test_plugin_is_loaded() {
        // Check if the main plugin namespace exists.
        $this->assertTrue(
            class_exists('MikeThicke\WPMuseum\Plugin') || 
            function_exists('MikeThicke\WPMuseum\_manually_load_plugin') ||
            defined('MikeThicke\WPMuseum\WPM_PREFIX'),
            'The wp-museum plugin is not loaded'
        );
        
        // Check if the plugin's constants are defined.
        $this->assertTrue(
            defined('MikeThicke\WPMuseum\WPM_PREFIX'),
            'Plugin constant WPM_PREFIX is not defined'
        );
        
        $this->assertTrue(
            defined('MikeThicke\WPMuseum\REST_NAMESPACE'),
            'Plugin constant REST_NAMESPACE is not defined'
        );
    }
}