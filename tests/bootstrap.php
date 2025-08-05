<?php
/**
 * PHPUnit bootstrap file.
 *
 * @package Wp_Museum
 */

// Use the WordPress installation from wp-test-server
$_tests_dir = "/app/wordpress-test";

// Set the config file path for WordPress test framework
define("WP_TESTS_CONFIG_FILE_PATH", dirname(__FILE__) . "/wp-tests-config.php");

// Forward custom PHPUnit Polyfills configuration to PHPUnit bootstrap file.
$_phpunit_polyfills_path = getenv("WP_TESTS_PHPUNIT_POLYFILLS_PATH");
if (false !== $_phpunit_polyfills_path) {
    define("WP_TESTS_PHPUNIT_POLYFILLS_PATH", $_phpunit_polyfills_path);
}

// Make sure WordPress is available
if (!file_exists("{$_tests_dir}/wp-config.php")) {
    echo "Could not find WordPress installation at {$_tests_dir}, is wp-test-server running?" .
        PHP_EOL;
    exit(1);
}

// Set ABSPATH for WordPress
if (!defined("ABSPATH")) {
    define("ABSPATH", $_tests_dir . "/");
}

// Give access to tests_add_filter() function.
require_once dirname(__FILE__) . "/includes/functions.php";

/**
 * Manually load the plugin being tested.
 */
function _manually_load_plugin()
{
    require dirname(dirname(__FILE__)) . "/wp-museum.php";
}

tests_add_filter("muplugins_loaded", "_manually_load_plugin");

// Start up the WP testing environment.
require dirname(__FILE__) . "/includes/bootstrap.php";

// Load the WP Museum test base class
require_once dirname(__FILE__) .
    "/phpunit/classes/class-wp-museum-test-case.php";
