<?php
/**
 * React for Museum Administration screens.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

/**
 * Enqueue script and style.
 *
 * @param string $hook_suffix The current admin page.
 */
function enqueue_admin_react($hook_suffix)
{
    if (!strpos($hook_suffix, "wpm-react-admin")) {
        return;
    }

    $asset_file = include WPM_BUILD_DIR . "admin-react.asset.php";
    $pu = WPM_BUILD_URL . "admin-react.js";
    wp_enqueue_script(
        WPM_PREFIX . "admin-react",
        WPM_BUILD_URL . "admin-react.js",
        $asset_file["dependencies"],
        $asset_file["version"],
        true
    );

    wp_localize_script(
        WPM_PREFIX . "admin-react",
        'wpmAdminData',
        array(
            'csvExportNonce' => wp_create_nonce('d78HG@YsELh2KByUgCTuDCepW'),
            'ajaxUrl' => admin_url('admin-ajax.php')
        )
    );

    wp_enqueue_style(
        WPM_PREFIX . "admin-react-style",
        WPM_BUILD_URL . "admin.css",
        [],
        filemtime(WPM_BUILD_DIR . "admin.css")
    );
}

/**
 * Create Admin pages with hooks for React apps.
 */
function create_admin_react_pages()
{
    add_menu_page(
        "Museum Administration",
        "Museum Administration",
        "manage_options",
        "wpm-react-admin",
        __NAMESPACE__ . '\react_admin_dashboard',
        museum_icon(),
        78
    );

    add_submenu_page(
        "wpm-react-admin",
        "Dashboard",
        "Dashboard",
        "manage_options",
        "wpm-react-admin",
        __NAMESPACE__ . '\react_admin_dashboard'
    );

    add_submenu_page(
        "wpm-react-admin",
        "General",
        "General",
        "manage_options",
        "wpm-react-admin-general",
        __NAMESPACE__ . '\react_admin_general'
    );

    add_submenu_page(
        "wpm-react-admin",
        "Objects",
        "Objects",
        "manage_options",
        "wpm-react-admin-objects",
        __NAMESPACE__ . '\react_admin_objects'
    );

    add_submenu_page(
        "wpm-react-admin",
        "Museum Remote",
        "Museum Remote",
        "manage_options",
        "wpm-react-admin-museum-remote",
        __NAMESPACE__ . '\react_admin_remote'
    );

    add_submenu_page(
        "wpm-react-admin",
        "OAI-PMH",
        "OAI-PMH",
        "manage_options",
        "wpm-react-admin-oai-pmh",
        __NAMESPACE__ . '\react_admin_omi_pmh'
    );
}

/**
 * Render the component for the admin dashboard.
 */
function react_admin_dashboard()
{
    echo "<div id='wpm-react-admin-app-container-dashboard'></div>";
}

/**
 * Render the component for the general admin page.
 */
function react_admin_general()
{
    echo "<div id='wpm-react-admin-app-container-general'></div>";
}

/**
 * Render the component for the objects admin page.
 */
function react_admin_objects()
{
    echo "<div id='wpm-react-admin-app-container-objects'></div>";
}

/**
 * Render the component for the museum remote admin page.
 */
function react_admin_remote()
{
    echo "<div id='wpm-react-admin-app-container-remote'></div>";
}

/**
 * Render the component for the OAI-PMH admin page.
 */
function react_admin_omi_pmh()
{
    echo "<div id='wpm-react-admin-app-container-oai-pmh'></div>";
}
