<?php
/**
 * Block for creating an advanced search page.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

if ( is_admin() ) {
	return null;
}

if ( isset( $_GET['searchText'] ) ) {
	$attributes['defaultSearch'] = [
		'searchText' => sanitize_text_field( wp_unslash( $_GET['searchText'] ) ),
	];
}

$encoded_attributes = wp_json_encode( $attributes );

?>
<div 
	class='wpm-advanced-search-block-frontend' 
	data-attributes='<?= $encoded_attributes //phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>'
>
</div>

