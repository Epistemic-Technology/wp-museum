<?php

namespace MikeThicke\WPMuseum;
	
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

?>
<div class = 'museum-collection-block'>
	<div class = 'collection-block-upper-content img-<?= $imgAlignment ?>'>
		<?php if ( $displayThumbnail && ! is_null( $thumbnailURL ) ): ?>
			<div class = 'thumbnail-wrapper'>
				<img src = '<?= $thumbnailURL ?>' alt='<?= esc_attr( $collection->post_title ) ?>'/>
			</div>
		<?php endif; ?>
		<div class = 'collection-info'>
			<?php if ( $displayTitle && ! is_null( $title ) ) : ?>
				<<?= $titleTag; ?>>
					<?= $title; ?>
				</<?= $titleTag; ?>>
			<?php endif; ?>
			<?php if ( $displayExcerpt && ! is_null( $excerpt ) ): ?>
				<div
					class = 'collection-excerpt'
					style = 'font-size: <?= $fontSize ?>em'
				>
					<?= $excerpt ?>
				</div>
			<?php endif; ?>
		</div>
	</div>
	<div 
		class = 'collection-block-lower-content'
		style = 'display: grid; grid-template-columns: repeat(<?= $columns ?>, 1fr); gap: 1rem;'
	>
		<?php if ( $displayObjects && count( $collection_object_data ) > 0 ): ?>
			<?php foreach( $collection_object_data as $object_data ): ?>
				<div class = 'collection-object-image-wrapper'>
					<?php if ( $linkToObjects ): ?>
						<a href = '<?= $object_data['URL'] ?>'>
					<?php endif; ?>
					<img
						src   = '<?= $object_data['imgURL'] ?>'
						title = '<?= $object_data['title'] ?>'
						alt   = '<?= esc_attr( $object_data['title'] ) ?>'
					/>
					<?php if ( $linkToObjects ): ?>
						</a>
					<?php endif; ?>
				</div>
			<?php endforeach; ?>
		<?php endif; ?>
	</div>
</div>
<?php
