<?php
/**
 * WP Config for local development.
 *
 * @codingStandardsIgnoreFile
 */

define("DB_NAME", "wordpress");
define("DB_USER", "wordpress");
define("DB_PASSWORD", "wordpress");
define("DB_HOST", "database");
define("DB_CHARSET", "utf8mb4");
define("DB_COLLATE", "");

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

$table_prefix = "wp_";

define("WP_DEBUG", true);
define("WP_DEBUG_LOG", false);
define("WP_DEBUG_DISPLAY", false);
define("SCRIPT_DEBUG", true);
define("SAVEQUERIES", true);
define("WP_CACHE", false);
define("WP_DISABLE_FATAL_ERROR_HANDLER", true);
define("WP_MEMORY_LIMIT", "128M");
define("WP_MAX_MEMORY_LIMIT", "128M");
require_once ABSPATH . "wp-settings.php";
