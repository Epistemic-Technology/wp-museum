<?php

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;
	
$numObjects       = $attributes['numObjects'] ?? 4;
$columns          = $attributes['columns'] ?? 2;
$collectionID     = $attributes['collectionID'] ?? null;
$displayTitle     = $attributes['displayTitle'] ?? true;
$titleTag         = $attributes['titleTag'] ?? 'h2';
$imgAlignment     = $attributes['imgAlignment'] ?? 'left';
$displayThumbnail = $attributes['displayThumbnail'] ?? true;
$thumbnailURL     = $attributes['thumbnailURL'] ?? null;
$displayExcerpt   = $attributes['displayExcerpt'] ?? true;
$fontSize         = $attributes['fontSize'] ?? 1;
$displayObjects   = $attributes['displayObjects'] ?? true;
$linkToObjects    = $attributes['linkToObjects'] ?? true;

$collection_post = get_post( $collectionID );
$title           = $collection_post->post_title;

add_filter( 'excerpt_more', __NAMESPACE__ . '\rest_excerpt_filter', 10, 0 );
$excerpt =
	html_entity_decode(
		wp_strip_all_tags(
			get_the_excerpt( $collectionID )
		)
	);
remove_filter( 'excerpt_more', __NAMESPACE__ . '\rest_excerpt_filter', 10, 0 );

$collection_objects = get_associated_objects( 'publish', $collectionID );
$collection_object_data  = array_map(
	function( $object ) {
		$object_data = [];
		$object_data['title'] = $object->post_title;
		$object_data['URL'] = get_permalink( $object );
		$img_data = get_object_thumbnail( $object->ID );
		if ( count( $img_data ) > 0 ) {
			$object_data['imgURL'] = $img_data[0];
		} else {
			$object_data['imgURL'] =  null;
		}
		return $object_data;
	},
	$collection_objects
);
$collection_object_data = array_filter(
	$collection_object_data,
	function( $object ) {
		return ( ! is_null( $object['imgURL'] ) );
	}
);
$collection_object_data = array_slice( $collection_object_data, 0, $numObjects );

$percent_width = round( 1 / $columns * 100 );

$title_tag    = tag_escape( $titleTag );
$img_align    = sanitize_html_class( $imgAlignment );
$font_size_em = (float) $fontSize;
$col_count    = max( 1, (int) $columns );
?>
<div class="museum-collection-block">
	<div class="collection-block-upper-content img-<?php echo esc_attr( $img_align ); ?>">
		<?php if ( $displayThumbnail && ! is_null( $thumbnailURL ) ) : ?>
			<div class="thumbnail-wrapper">
				<img src="<?php echo esc_url( $thumbnailURL ); ?>" alt="<?php echo esc_attr( isset( $collection ) ? $collection->post_title : '' ); ?>"/>
			</div>
		<?php endif; ?>
		<div class="collection-info">
			<?php if ( $displayTitle && ! is_null( $title ) ) : ?>
				<<?php echo esc_html( $title_tag ); ?>>
					<?php echo esc_html( $title ); ?>
				</<?php echo esc_html( $title_tag ); ?>>
			<?php endif; ?>
			<?php if ( $displayExcerpt && ! is_null( $excerpt ) ) : ?>
				<div class="collection-excerpt" style="font-size: <?php echo esc_attr( $font_size_em ); ?>em">
					<?php echo esc_html( $excerpt ); ?>
				</div>
			<?php endif; ?>
		</div>
	</div>
	<div class="collection-block-lower-content" style="display: grid; grid-template-columns: repeat(<?php echo esc_attr( $col_count ); ?>, 1fr); gap: 1rem;">
		<?php if ( $displayObjects && count( $collection_object_data ) > 0 ) : ?>
			<?php foreach ( $collection_object_data as $object_data ) : ?>
				<div class="collection-object-image-wrapper">
					<?php if ( $linkToObjects ) : ?>
						<a href="<?php echo esc_url( $object_data['URL'] ); ?>">
					<?php endif; ?>
					<img
						src="<?php echo esc_url( $object_data['imgURL'] ); ?>"
						title="<?php echo esc_attr( $object_data['title'] ); ?>"
						alt="<?php echo esc_attr( $object_data['title'] ); ?>"
					/>
					<?php if ( $linkToObjects ) : ?>
						</a>
					<?php endif; ?>
				</div>
			<?php endforeach; ?>
		<?php endif; ?>
	</div>
</div>
<?php
