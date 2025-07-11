<?php

/* Path to the WordPress codebase you'd like to test. Add a forward slash in the end. */
if (!defined("ABSPATH")) {
    define("ABSPATH", "/app/wordpress-test/");
}

/*
 * Path to the theme to test with.
 *
 * The 'default' theme is symlinked from test/phpunit/data/themedir1/default into
 * the themes directory of the WordPress installation defined above.
 */
define("WP_DEFAULT_THEME", "default");

/*
 * Test with multisite enabled.
 * Alternatively, use the tests/phpunit/multisite.xml configuration file.
 */
// define( 'WP_TESTS_MULTISITE', true );

/*
 * Force known bugs to be run.
 * Tests with an associated Trac ticket that is still open are normally skipped.
 */
// define( 'WP_TESTS_FORCE_KNOWN_BUGS', true );

// Test with WordPress debug mode (default).
define("WP_DEBUG", true);

// ** Database settings ** //

/*
 * This configuration file will be used by the copy of WordPress being tested.
 * wordpress/wp-config.php will be ignored.
 *
 * WARNING WARNING WARNING!
 * These tests will DROP ALL TABLES in the database with the prefix named below.
 * DO NOT use a production database or one that is shared with something else.
 */

define("DB_NAME", getenv("TEST_DB_NAME") ?: "wptest");
define("DB_USER", getenv("TEST_DB_USER") ?: "wptest");
define("DB_PASSWORD", getenv("TEST_DB_PASS") ?: "wptest");
define("DB_HOST", getenv("TEST_DB_HOST") ?: "wp-test-database");
define("DB_CHARSET", "utf8");
define("DB_COLLATE", "");

/**#@+
 * Authentication Unique Keys and Salts.
 *
 * Change these to different unique phrases!
 * You can generate these using the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}
 */
define(
    "AUTH_KEY",
    'hG9|$IbK:#`>Fb_AMJWrP:={lMk7+||K_74grT/efca+U$SJ o3`.Bkrrq3$,+]T'
);
define(
    "SECURE_AUTH_KEY",
    "#q]~O VAch{>@+72&keKqZ0KhY`8.jtPDNy:.wdeHGL^mVsVUufh<Z1.?A-sr#<7"
);
define(
    "LOGGED_IN_KEY",
    "@a[!pog2GULV*-7TlypOJdSd#^U.3TS!bzRsYJ9r>A0 ^*#[,0:[stF=3_(O|W1n"
);
define(
    "NONCE_KEY",
    'hQBoAo/x|-OAB3YX%$/y~WPNe6n?=iF_$iXPIA0GPgR>_@OD/2.rz%<`YpedB+fU'
);
define(
    "AUTH_SALT",
    'Y,+!`X,Q#_$$R{;{6YUbX0FW6^&I:|O,`qaGi#-Iuy]p|dQbF1tmc2%|^fpNyxlO'
);
define(
    "SECURE_AUTH_SALT",
    "&7nRDp>Ld^tBr`_j0H%#kdFAEHe~R+&Q/W@IQ9,@!pj_|z%1r>+*-V+K;(rMmgTG"
);
define(
    "LOGGED_IN_SALT",
    '-I71]6ctD8/1vgtEB;)20}r1p4(>13+hmy!aEWvNKaK9h$31bDK-V4h6ji[J1?Pk'
);
define(
    "NONCE_SALT",
    "6=zv6&R#7}c_zt`7tdv^KmMN4}-D7DCmFvX+48`2,O|k2]#Wo2@xe^dw[pjiHF9!"
);

$table_prefix = "wptests_"; // Only numbers, letters, letters, and underscores please!

define("WP_TESTS_DOMAIN", "wp-test.lndo.site");
define("WP_TESTS_EMAIL", getenv("TEST_WP_ADMIN_EMAIL") ?: "admin@test.com");
define("WP_TESTS_TITLE", "Test Museum Site");

define("WP_PHP_BINARY", "php");

define("WPLANG", "");
