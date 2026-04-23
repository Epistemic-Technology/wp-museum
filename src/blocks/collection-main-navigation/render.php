<?php

defined( 'ABSPATH' ) || exit;

$encoded_attributes = wp_json_encode( $attributes );

printf(
	'<div class="wpm-collection-main-navigation-front" data-attributes="%s"></div>',
	esc_attr( $encoded_attributes )
);
