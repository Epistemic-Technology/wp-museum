<?php
/**
 * Collection main navigation block: an indented list of collections, each
 * linking to its page, with a button that reveals the collection's excerpt.
 *
 * Rendered in PHP so the collection links are in the HTML. A small view
 * script (front.ts) handles the excerpt toggle.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

$tags = isset( $attributes['tags'] ) && is_array( $attributes['tags'] )
	? array_map( 'sanitize_title', $attributes['tags'] )
	: [ '_all' ];

$sort_by    = isset( $attributes['sortBy'] ) ? (string) $attributes['sortBy'] : 'Alphabetical';
$sort_order = isset( $attributes['sortOrder'] ) ? (string) $attributes['sortOrder'] : 'Descending';

$collections = sort_collections_for_navigation( get_collections_by_tags( $tags ), $sort_by, $sort_order );

$font_size             = isset( $attributes['fontSize'] ) ? (float) $attributes['fontSize'] : 1;
$font_color            = isset( $attributes['fontColor'] ) ? (string) $attributes['fontColor'] : 'initial';
$background_color      = isset( $attributes['backgroundColor'] ) ? (string) $attributes['backgroundColor'] : 'initial';
$border_color          = isset( $attributes['borderColor'] ) ? (string) $attributes['borderColor'] : 'inherit';
$border_width          = isset( $attributes['borderWidth'] ) ? (float) $attributes['borderWidth'] : 0;
$vertical_spacing      = isset( $attributes['verticalSpacing'] ) ? (float) $attributes['verticalSpacing'] : 0;
$sub_collection_indent = isset( $attributes['subCollectionIndent'] ) ? (float) $attributes['subCollectionIndent'] : 3;

$use_default = fn( string $key ) => ! isset( $attributes[ $key ] ) || (bool) $attributes[ $key ];

$title_style = [];
if ( ! $use_default( 'useDefaultFontSize' ) ) {
	$title_style[] = 'font-size:' . $font_size . 'em';
}
if ( ! $use_default( 'useDefaultFontColor' ) ) {
	$title_style[] = 'color:' . $font_color;
}
if ( ! $use_default( 'useDefaultBackgroundColor' ) ) {
	$title_style[] = 'background-color:' . $background_color;
}
if ( ! $use_default( 'useDefaultBorderColor' ) ) {
	$title_style[] = 'border-color:' . $border_color;
}
if ( ! $use_default( 'useDefaultBorderWidth' ) ) {
	$title_style[] = 'border-width:' . $border_width . 'px';
	if ( $border_width > 0 ) {
		$title_style[] = 'border-style:solid';
	}
}
$title_style_attr = safecss_filter_attr( implode( ';', $title_style ) );

add_filter( 'excerpt_more', __NAMESPACE__ . '\rest_excerpt_filter', 10, 0 );
?>
<div <?php echo get_block_wrapper_attributes(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped by get_block_wrapper_attributes(). ?>>
	<nav aria-label="<?php esc_attr_e( 'Collection navigation', 'wp-museum' ); ?>">
		<?php foreach ( $collections as $item ) : ?>
			<?php
			$collection       = $item['post'];
			$indent_level     = (int) $item['indent_level'];
			$collection_title = get_the_title( $collection );
			$collection_link  = get_permalink( $collection );
			$excerpt          = wp_strip_all_tags( get_the_excerpt( $collection ) );
			$excerpt_id       = wp_unique_id( 'wpm-collection-excerpt-' );

			$box_style = [ 'margin-left:' . ( $indent_level * $sub_collection_indent ) . 'em' ];
			if ( ! $use_default( 'useDefaultFontSize' ) ) {
				$box_style[] = 'font-size:' . $font_size . 'em';
			}
			if ( ! $use_default( 'useDefaultVerticalSpacing' ) ) {
				$box_style[] = 'margin-bottom:' . $vertical_spacing . 'em';
			}
			$box_style_attr = safecss_filter_attr( implode( ';', $box_style ) );

			/* translators: %s: collection title */
			$show_label = sprintf( __( 'Show information about %s collection', 'wp-museum' ), $collection_title );
			/* translators: %s: collection title */
			$hide_label = sprintf( __( 'Hide information about %s collection', 'wp-museum' ), $collection_title );
			?>
			<div
				class="wpm-collection-main-navigation-collection-box indent-<?php echo (int) $indent_level; ?>"
				style="<?php echo esc_attr( $box_style_attr ); ?>"
			>
				<div
					class="wpm-collection-main-navigation-collection-box-title-wrapper"
					<?php if ( '' !== $title_style_attr ) : ?>
						style="<?php echo esc_attr( $title_style_attr ); ?>"
					<?php endif; ?>
				>
					<span class="wpm-collection-main-navigation-collection-box-title">
						<a
							href="<?php echo esc_url( $collection_link ); ?>"
							<?php /* translators: %s: collection title */ ?>
							aria-label="<?php echo esc_attr( sprintf( __( 'View %s collection', 'wp-museum' ), $collection_title ) ); ?>"
						><?php echo esc_html( $collection_title ); ?></a>
					</span>
					<span>
						<button
							type="button"
							class="wpm-collection-main-navigation-collection-box-info-button"
							aria-label="<?php echo esc_attr( $show_label ); ?>"
							aria-expanded="false"
							aria-controls="<?php echo esc_attr( $excerpt_id ); ?>"
							data-show-label="<?php echo esc_attr( $show_label ); ?>"
							data-hide-label="<?php echo esc_attr( $hide_label ); ?>"
						>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3.2c-4.8 0-8.8 3.9-8.8 8.8 0 4.8 3.9 8.8 8.8 8.8 4.8 0 8.8-3.9 8.8-8.8 0-4.8-4-8.8-8.8-8.8zm0 16c-4 0-7.2-3.3-7.2-7.2C4.8 8 8 4.8 12 4.8s7.2 3.3 7.2 7.2c0 4-3.2 7.2-7.2 7.2zM11 17h2v-6h-2v6zm0-8h2V7h-2v2z"></path></svg>
						</button>
					</span>
				</div>
				<div
					id="<?php echo esc_attr( $excerpt_id ); ?>"
					class="wpm-collection-main-navigation-collection-box-excerpt closed"
					aria-hidden="true"
				>
					<?php echo esc_html( $excerpt ); ?>
					<div class="wpm-collection-main-navigation-collection-box-excerpt-more">
						<a href="<?php echo esc_url( $collection_link ); ?>">
							<?php
							/* translators: %s: collection title */
							echo esc_html( sprintf( __( 'More about the %s Collection...', 'wp-museum' ), $collection_title ) );
							?>
						</a>
					</div>
				</div>
			</div>
		<?php endforeach; ?>
	</nav>
</div>
<?php
remove_filter( 'excerpt_more', __NAMESPACE__ . '\rest_excerpt_filter', 10 );
