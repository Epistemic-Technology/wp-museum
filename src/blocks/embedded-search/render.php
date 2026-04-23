<?php
/**
 * Embedded search block that redirects to search page on submit.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

$encoded_attributes = wp_json_encode( $attributes );

printf(
	'<div class="wpm-embedded-search-block-frontend" data-attributes="%s"></div>',
	esc_attr( $encoded_attributes )
);
