<?php
/**
 * Embedded search block: a plain GET form that submits to the configured
 * search page.
 *
 * Rendered entirely in PHP. The form sends `searchText` and `onlyTitle`,
 * which the basic-search and advanced-search blocks read off the query
 * string, so no view script is needed.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

$search_page_url     = isset( $attributes['searchPageURL'] ) ? trim( (string) $attributes['searchPageURL'] ) : '';
$advanced_search_url = isset( $attributes['advancedSearchURL'] ) ? trim( (string) $attributes['advancedSearchURL'] ) : '';
$show_title_toggle   = ! empty( $attributes['showTitleToggle'] );
$header_text         = isset( $attributes['headerText'] ) ? (string) $attributes['headerText'] : '';
$max_width           = isset( $attributes['maxWidth'] ) ? (float) $attributes['maxWidth'] : 100;

$wrapper_attributes = get_block_wrapper_attributes(
	[
		'class' => 'wpm-embedded-search-block',
		'style' => 'max-width:' . $max_width . '%',
	]
);
?>
<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped by get_block_wrapper_attributes(). ?>>
	<?php if ( '' !== trim( wp_strip_all_tags( $header_text ) ) ) : ?>
		<h2><?php echo wp_kses_post( $header_text ); ?></h2>
	<?php endif; ?>
	<?php
	echo render_search_form( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped within.
		[
			'action'              => $search_page_url,
			'show_title_toggle'   => $show_title_toggle,
			'only_title'          => true,
			'advanced_search_url' => $advanced_search_url,
		]
	);
	?>
</div>
