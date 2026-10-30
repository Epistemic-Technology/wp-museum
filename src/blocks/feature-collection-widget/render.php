<?php
/**
 * Featured Collection block: the collections the current museum object
 * belongs to, each as a box with the collection's image, title and excerpt.
 *
 * This is the block form of the old Associated Collection Widget, meant for a
 * sidebar or template part on single object pages. Anywhere else there is no
 * object to look up, so it renders nothing.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

$queried = get_queried_object();
if (
	! $queried instanceof \WP_Post ||
	! is_singular() ||
	! in_array( $queried->post_type, get_object_type_names(), true )
) {
	return;
}

$show_image       = ! isset( $attributes['showFeatureImage'] ) || (bool) $attributes['showFeatureImage'];
$show_description = ! isset( $attributes['showDescription'] ) || (bool) $attributes['showDescription'];

$collections = get_object_collections( $queried->ID );
if ( empty( $collections ) ) {
	return;
}

add_filter( 'excerpt_more', __NAMESPACE__ . '\rest_excerpt_filter', 10, 0 );
?>
<div <?php echo get_block_wrapper_attributes( [ 'class' => 'wpm-feature-collection-widget' ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped by get_block_wrapper_attributes(). ?>>
	<?php foreach ( $collections as $collection ) : ?>
		<?php
		$collection_title = get_the_title( $collection );
		$collection_link  = get_permalink( $collection );
		$image            = $show_image ? get_collection_featured_image( $collection->ID ) : false;
		$excerpt          = $show_description ? wp_strip_all_tags( get_the_excerpt( $collection ) ) : '';
		?>
		<div class="wpm-featured-collection">
			<?php if ( is_array( $image ) && ! empty( $image[0] ) ) : ?>
				<a href="<?php echo esc_url( $collection_link ); ?>" tabindex="-1" aria-hidden="true">
					<img
						class="wpm-featured-collection-image"
						src="<?php echo esc_url( $image[0] ); ?>"
						<?php if ( ! empty( $image[1] ) && ! empty( $image[2] ) ) : ?>
							width="<?php echo (int) $image[1]; ?>"
							height="<?php echo (int) $image[2]; ?>"
						<?php endif; ?>
						alt=""
					/>
				</a>
			<?php endif; ?>
			<h2><a href="<?php echo esc_url( $collection_link ); ?>"><?php echo esc_html( $collection_title ); ?></a></h2>
			<?php if ( '' !== $excerpt ) : ?>
				<div class="wpm-featured-collection-description"><?php echo esc_html( $excerpt ); ?></div>
			<?php endif; ?>
		</div>
	<?php endforeach; ?>
</div>
<?php
remove_filter( 'excerpt_more', __NAMESPACE__ . '\rest_excerpt_filter', 10 );
