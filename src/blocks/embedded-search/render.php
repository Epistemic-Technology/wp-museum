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

// A GET form replaces the action URL's query string with its own fields, so
// any existing parameters (eg. `?page_id=5` under plain permalinks) have to
// be carried as hidden inputs or the destination page would be lost.
$carried_params = [];
if ( '' !== $search_page_url ) {
	$query_string = wp_parse_url( $search_page_url, PHP_URL_QUERY );
	if ( $query_string ) {
		parse_str( $query_string, $carried_params );
	}
}

$input_id = wp_unique_id( 'wpm-embedded-search-input-' );

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
	<form
		class="wpm-embedded-search wpm-embedded-search-form"
		role="search"
		method="get"
		<?php if ( '' !== $search_page_url ) : ?>
			action="<?php echo esc_url( $search_page_url ); ?>"
		<?php endif; ?>
	>
		<?php foreach ( $carried_params as $param_name => $param_value ) : ?>
			<?php if ( is_scalar( $param_value ) && ! in_array( $param_name, [ 'searchText', 'onlyTitle' ], true ) ) : ?>
				<input type="hidden" name="<?php echo esc_attr( $param_name ); ?>" value="<?php echo esc_attr( $param_value ); ?>" />
			<?php endif; ?>
		<?php endforeach; ?>
		<div class="embedded-search-input">
			<div class="main-input-area">
				<label for="<?php echo esc_attr( $input_id ); ?>" class="screen-reader-text"><?php esc_html_e( 'Search', 'wp-museum' ); ?></label>
				<input
					id="<?php echo esc_attr( $input_id ); ?>"
					type="text"
					name="searchText"
					value=""
					aria-label="<?php esc_attr_e( 'Search', 'wp-museum' ); ?>"
				/>
				<div class="wpm-embedded-search-controls">
					<?php if ( $show_title_toggle ) : ?>
						<div class="wpm-embedded-search-title-toggle">
							<?php // The hidden field is what gets sent when the box is unchecked. ?>
							<input type="hidden" name="onlyTitle" value="0" />
							<label>
								<input type="checkbox" name="onlyTitle" value="1" checked />
								<?php esc_html_e( 'Only search titles', 'wp-museum' ); ?>
							</label>
						</div>
					<?php else : ?>
						<input type="hidden" name="onlyTitle" value="1" />
					<?php endif; ?>
					<?php if ( '' !== $advanced_search_url ) : ?>
						<div class="wpm-embedded-search-advanced-search-link">
							<a href="<?php echo esc_url( $advanced_search_url ); ?>" aria-label="<?php esc_attr_e( 'Go to advanced search page', 'wp-museum' ); ?>"><?php esc_html_e( 'Advanced Search', 'wp-museum' ); ?></a>
						</div>
					<?php endif; ?>
				</div>
			</div>
			<button
				type="submit"
				class="wpm-embedded-search-button is-primary"
				aria-label="<?php esc_attr_e( 'Search museum objects', 'wp-museum' ); ?>"
			><?php esc_html_e( 'Search', 'wp-museum' ); ?></button>
		</div>
	</form>
</div>
