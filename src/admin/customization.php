<?php
/**
 * Interfaces with the WordPress customization API.
 *
 * @link https://developer.wordpress.org/themes/customize-api/customizer-objects/
 * @link https://maddisondesigns.com/2017/05/the-wordpress-customizer-a-developers-guide-part-1/
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

global $style_defaults;

$style_defaults = [
	WPM_PREFIX . 'customization_general' => [
		'using_template' => false,
	],
	WPM_PREFIX . 'mobject_style'         => [
		'collections_breadcrumbs'      => true,
		'collections_separator'        => ' &middot; ',
		'field_label_font_weight'      => 'bold',           // Can be bold|normal.
		'field_label_color'            => '',
		'field_text_color'             => '',
		'short_description_max_length' => 100,
		'yes_no_display'               => 'list',           // Can be list|normal.
		'display_image_gallery'        => true,
		'image_gallery_position'       => 'right',          // Can be top|bottom|left|right.
		'image_gallery_margin'         => 20,
		'image_margin'                 => 10,
		'image_border_width'           => 10,
		'image_border_color'           => '',
		'image_max_width'              => 200,
		'image_max_height'             => 200,
	],
	WPM_PREFIX . 'collection_style'      => [
		'collection_description'  => 'always',        // Can be always|toggle.
		'alternate_list_color'    => false,
		'list_color_1'            => '',
		'list_color_2'            => '',
		'list_show_thumbnail'     => true,
		'list_thumbnail_position' => 'left',
		'list_image_max_height'   => 150,
		'list_image_max_width'    => 150,
		'excerpt_max_length'      => 0,
		'excerpt_line_height'     => 0.0,
		'excerpt_font_size'       => 0.0,
		'posts_per_page'          => 50,
	],
];

/**
 * Retrieves customizer settings if existing. Missing values are filled in from
 * $style_defaults.
 *
 * @return [string=>[string=>bool|int|string]] Array in same format as $style_defaults.
 */
function get_customizer_settings() {
	global $style_defaults;
	$styles = [];
	$styles[ WPM_PREFIX . 'customization_general' ] = get_option(
		WPM_PREFIX . 'customization_general',
		$style_defaults[ WPM_PREFIX . 'customization_general' ]
	);
	$styles [ WPM_PREFIX . 'mobject_style' ]        = get_option(
		WPM_PREFIX . 'mobject_style',
		$style_defaults[ WPM_PREFIX . 'mobject_style' ]
	);
	$styles [ WPM_PREFIX . 'collection_style' ]     = get_option(
		WPM_PREFIX . 'collection_style',
		$style_defaults[ WPM_PREFIX . 'collection_style' ]
	);

	foreach ( $style_defaults as $group_name => $group ) {
		foreach ( $group as $setting => $default ) {
			if ( ! isset( $styles[ $group_name ][ $setting ] ) ) {
				$styles[ $group_name ][ $setting ] = $style_defaults[ $group_name ][ $setting ];
			}
		}
	}

	return $styles;
}

/**
 * Add customizer settings as options.
 *
 * @param WP_CUSTOMIZE_MANAGER $wp_customize The customizer manager.
 */
function add_settings( $wp_customize ) {
	global $style_defaults;
	foreach ( $style_defaults as $style_setting_group_name => $style_setting_group ) {
		foreach ( $style_setting_group as $style_setting_name => $style_setting_default ) {
			switch ( gettype( $style_setting_default ) ) {
				case 'boolean':
					$sanitizer = function ( $x ) {
						return (bool) intval( $x );
					};
					break;
				case 'integer':
					$sanitizer = function ( $x ) {
						return intval( $x );
					};
					break;
				case 'string':
					$sanitizer = 'sanitize_text_field';
					break;
				case 'double':
					$sanitizer = function ( $x ) {
						if ( is_numeric( $x ) ) {
							return $x;
						}
						return 0.0;
					};
					break;
			}
			$wp_customize->add_setting(
				$style_setting_group_name . '[' . $style_setting_name . ']',
				[
					'type'              => 'option',
					'default'           => $style_setting_default,
					'sanitize_callback' => $sanitizer,
				]
			);
		}
	}
}

/**
 * Add customizer sections.
 *
 * @param WP_CUSTOMIZE_MANAGER $wp_customize The customizer manager.
 */
function add_sections( $wp_customize ) {
	$wp_customize->add_panel(
		WPM_PREFIX . 'customization_panel',
		[
			'title' => 'WP Museum',
		]
	);
	$wp_customize->add_section(
		WPM_PREFIX . 'customization_general_section',
		[
			'title' => 'General',
			'panel' => WPM_PREFIX . 'customization_panel',
		]
	);
	$wp_customize->add_section(
		WPM_PREFIX . 'mobject_style_section',
		[
			'title' => 'Museum Objects',
			'panel' => WPM_PREFIX . 'customization_panel',
		]
	);
	$wp_customize->add_section(
		WPM_PREFIX . 'collection_style_section',
		[
			'title' => 'Collections',
			'panel' => WPM_PREFIX . 'customization_panel',
		]
	);
}

/**
 * Add customizer controls.
 *
 * @param WP_CUSTOMIZE_MANAGER $wp_customize The customizer manager.
 */
function add_controls( $wp_customize ) {
	/*
	 * General
	 */
	$wp_customize->add_control(
		WPM_PREFIX . 'customization_general[using_template]',
		[
			'label'   => __( 'Use Template?', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'customization_general[using_template]',
			'section' => WPM_PREFIX . 'customization_general_section',
			'type'    => 'checkbox',
		]
	);

	/*
	 * Museum Objects
	 */
	$wp_customize->add_control(
		WPM_PREFIX . 'mobject_style[collections_breadcrumbs]',
		[
			'label'   => __( 'Show collections breadcrumbs', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'mobject_style[collections_breadcrumbs]',
			'section' => WPM_PREFIX . 'mobject_style_section',
			'type'    => 'checkbox',
		]
	);
	$wp_customize->add_control(
		WPM_PREFIX . 'mobject_style[collections_separator]',
		[
			'label'   => __( 'Collections separator', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'mobject_style[collections_separator]',
			'section' => WPM_PREFIX . 'mobject_style_section',
			'type'    => 'select',
			'choices' =>
				[
					'&nbsp;'               => ' ',
					'&nbsp;&middot;&nbsp;' => '&middot;',
					'&nbsp;&bull;&nbsp;'   => '&bull;',
					'&nbsp;|&nbsp;'        => '|',
					'&nbsp;-&nbsp;'        => '-',
				],
		]
	);
	$wp_customize->add_control(
		WPM_PREFIX . 'mobject_style[field_label_font_weight]',
		[
			'label'   => __( 'Field label font weight', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'mobject_style[field_label_font_weight]',
			'section' => WPM_PREFIX . 'mobject_style_section',
			'type'    => 'radio',
			'choices' =>
				[
					'bold'   => __( 'Bold', 'wp-museum' ),
					'normal' => __( 'Normal', 'wp-museum' ),
				],
		]
	);
	$wp_customize->add_control(
		WPM_PREFIX . 'mobject_style[field_label_color]',
		[
			'label'   => __( 'Field label color', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'mobject_style[field_label_color]',
			'section' => WPM_PREFIX . 'mobject_style_section',
			'type'    => 'color',
		]
	);
	$wp_customize->add_control(
		WPM_PREFIX . 'mobject_style[field_text_color]',
		[
			'label'   => __( 'Field text color', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'mobject_style[field_text_color]',
			'section' => WPM_PREFIX . 'mobject_style_section',
			'type'    => 'color',
		]
	);
	$wp_customize->add_control(
		WPM_PREFIX . 'mobject_style[short_description_max_length]',
		[
			'label'   => __( 'Short description field max length', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'mobject_style[short_description_max_length]',
			'section' => WPM_PREFIX . 'mobject_style_section',
			'type'    => 'number',
		]
	);
	$wp_customize->add_control(
		WPM_PREFIX . 'mobject_style[yes_no_display]',
		[
			'label'   => __( 'Display yes/no fields as', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'mobject_style[yes_no_display]',
			'section' => WPM_PREFIX . 'mobject_style_section',
			'type'    => 'radio',
			'choices' =>
				[
					'list'   => __( 'List', 'wp-museum' ),
					'normal' => __( 'Normal', 'wp-museum' ),
				],
		]
	);
	$wp_customize->add_control(
		WPM_PREFIX . 'mobject_style[display_image_gallery]',
		[
			'label'   => __( 'Display image gallery', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'mobject_style[display_image_gallery]',
			'section' => WPM_PREFIX . 'mobject_style_section',
			'type'    => 'checkbox',
		]
	);
	$wp_customize->add_control(
		WPM_PREFIX . 'mobject_style[image_gallery_position]',
		[
			'label'   => __( 'Image gallery position', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'mobject_style[image_gallery_position]',
			'section' => WPM_PREFIX . 'mobject_style_section',
			'type'    => 'select',
			'choices' =>
				[
					'top'    => __( 'Top', 'wp-museum' ),
					'bottom' => __( 'Bottom', 'wp-museum' ),
					'left'   => __( 'Left', 'wp-museum' ),
					'right'  => __( 'Right', 'wp-museum' ),
				],
		]
	);
	$wp_customize->add_control(
		WPM_PREFIX . 'mobject_style[image_gallery_margin]',
		[
			'label'   => __( 'Image gallery margin (px)', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'mobject_style[image_gallery_margin]',
			'section' => WPM_PREFIX . 'mobject_style_section',
			'type'    => 'number',
		]
	);
	$wp_customize->add_control(
		WPM_PREFIX . 'mobject_style[image_margin]',
		[
			'label'   => __( 'Image margin (px)', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'mobject_style[image_margin]',
			'section' => WPM_PREFIX . 'mobject_style_section',
			'type'    => 'number',
		]
	);
	$wp_customize->add_control(
		WPM_PREFIX . 'mobject_style[image_border_width]',
		[
			'label'   => __( 'Image border width (px)', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'mobject_style[image_border_width]',
			'section' => WPM_PREFIX . 'mobject_style_section',
			'type'    => 'number',
		]
	);
	$wp_customize->add_control(
		WPM_PREFIX . 'mobject_style[image_border_color]',
		[
			'label'   => __( 'Image border color', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'mobject_style[image_border_color]',
			'section' => WPM_PREFIX . 'mobject_style_section',
			'type'    => 'color',
		]
	);
	$wp_customize->add_control(
		WPM_PREFIX . 'mobject_style[image_max_width]',
		[
			'label'   => __( 'Image maximum width (px)', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'mobject_style[image_max_width]',
			'section' => WPM_PREFIX . 'mobject_style_section',
			'type'    => 'number',
		]
	);
	$wp_customize->add_control(
		WPM_PREFIX . 'mobject_style[image_max_height]',
		[
			'label'   => __( 'Image maximum height (px)', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'mobject_style[image_max_height]',
			'section' => WPM_PREFIX . 'mobject_style_section',
			'type'    => 'number',
		]
	);

	/*
	 * Collections
	 */
	$wp_customize->add_control(
		WPM_PREFIX . 'collection_style[collection_description]',
		[
			'label'   => __( 'View collection description', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'collection_style[collection_description]',
			'section' => WPM_PREFIX . 'collection_style_section',
			'type'    => 'radio',
			'choices' =>
				[
					'always' => __( 'Always', 'wp-museum' ),
					'toggle' => __( 'Toggle', 'wp-museum' ),
				],
		]
	);
	$wp_customize->add_control(
		WPM_PREFIX . 'collection_style[alternate_list_color]',
		[
			'label'   => __( 'Alternate list background color', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'collection_style[alternate_list_color]',
			'section' => WPM_PREFIX . 'collection_style_section',
			'type'    => 'checkbox',
		]
	);
	$wp_customize->add_control(
		WPM_PREFIX . 'collection_style[list_color_1]',
		[
			'label'   => __( 'List background color #1', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'collection_style[list_color_1]',
			'section' => WPM_PREFIX . 'collection_style_section',
			'type'    => 'color',
		]
	);
	$wp_customize->add_control(
		WPM_PREFIX . 'collection_style[list_color_2]',
		[
			'label'   => __( 'List background color #2', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'collection_style[list_color_2]',
			'section' => WPM_PREFIX . 'collection_style_section',
			'type'    => 'color',
		]
	);
	$wp_customize->add_control(
		WPM_PREFIX . 'collection_style[list_thumbnail_position]',
		[
			'label'   => __( 'Thumbnail position', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'collection_style[list_thumbnail_position]',
			'section' => WPM_PREFIX . 'collection_style_section',
			'type'    => 'radio',
			'choices' =>
				[
					'left'  => __( 'Left', 'wp-museum' ),
					'right' => __( 'Right', 'wp-museum' ),
				],
		]
	);
	$wp_customize->add_control(
		WPM_PREFIX . 'collection_style[list_show_thumbnail]',
		[
			'label'   => __( 'Show thumbnails for list images', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'collection_style[list_show_thumbnail]',
			'section' => WPM_PREFIX . 'collection_style_section',
			'type'    => 'checkbox',
		]
	);
	$wp_customize->add_control(
		WPM_PREFIX . 'collection_style[list_image_max_height]',
		[
			'label'   => __( 'List thumbnail max height', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'collection_style[list_image_max_height]',
			'section' => WPM_PREFIX . 'collection_style_section',
			'type'    => 'number',
		]
	);
	$wp_customize->add_control(
		WPM_PREFIX . 'collection_style[list_image_max_width]',
		[
			'label'   => __( 'List thumbnail max width', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'collection_style[list_image_max_width]',
			'section' => WPM_PREFIX . 'collection_style_section',
			'type'    => 'number',
		]
	);
	$wp_customize->add_control(
		WPM_PREFIX . 'collection_style[excerpt_max_length]',
		[
			'label'   => __( 'Excerpt max length', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'collection_style[excerpt_max_length]',
			'section' => WPM_PREFIX . 'collection_style_section',
			'type'    => 'number',
		]
	);
	$wp_customize->add_control(
		WPM_PREFIX . 'collection_style[excerpt_font_size]',
		[
			'label'   => __( 'Excerpt font size (em)', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'collection_style[excerpt_font_size]',
			'section' => WPM_PREFIX . 'collection_style_section',
			'type'    => 'number',
		]
	);
	$wp_customize->add_control(
		WPM_PREFIX . 'collection_style[excerpt_line_height]',
		[
			'label'   => __( 'Excerpt line height (em)', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'collection_style[excerpt_line_height]',
			'section' => WPM_PREFIX . 'collection_style_section',
			'type'    => 'number',
		]
	);
	$wp_customize->add_control(
		WPM_PREFIX . 'collection_style[posts_per_page]',
		[
			'label'   => __( 'Object excerpts to display per page', 'wp-museum' ),
			'setting' => WPM_PREFIX . 'collection_style[posts_per_page]',
			'section' => WPM_PREFIX . 'collection_style_section',
			'type'    => 'number',
		]
	);
}

/**
 * Callback to register all customization settings.
 *
 * @param WP_CUSTOMIZE_MANAGER $wp_customize The customizer manager.
 */
function register_customization( $wp_customize ) {
	add_settings( $wp_customize );
	add_sections( $wp_customize );
	add_controls( $wp_customize );
}
