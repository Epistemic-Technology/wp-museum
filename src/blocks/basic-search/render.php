<?php
/**
 * Block for creating a basic search page.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;


if ( is_admin() ) {
	return;
}

if ( isset( $_GET['searchText'] ) ) {
	$attributes['searchText'] = sanitize_text_field( wp_unslash( $_GET['searchText'] ) );
}
if ( isset( $_GET['onlyTitle'] ) ) {
	$attributes['onlyTitle'] = sanitize_text_field( wp_unslash( $_GET['onlyTitle'] ) );
}

$encoded_attributes = wp_json_encode( $attributes );

?>
<div class="wpm-basic-search-block-frontend" data-attributes="<?php echo esc_attr( $encoded_attributes ); ?>"></div>


