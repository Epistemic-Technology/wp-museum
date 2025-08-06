<?php
/**
 * Render Object Gallery block on the frontend.
 *
 * @see blocks/src/object-gallery
 *
 * Attributes
 *  - columns        {number}  Number of columns in the grid.
 *  - objectID       {number}  WordPress post_id of the object.
 *  - objectURL      {string}  The URL of the object (ie. a WordPress frontend page).
 *  - imgData        {array}   Array of URLs of images in gallery.
 *  - imgDimensions  {object}  Dimensions for images in the grid. Because
 *                             images vary in size depending on page width,
 *                             this is just used for determining which image
 *                             file to use.
 *  - captionText    {string}  A caption for the block.
 *  - title          {string}  The object's title (name).
 *  - catID          {string}  The museum catalogue id for the object.
 *  - fontSize       {number}  Font size for caption text (em).
 *  - titleTag       {string}  Tag name for the title to use.
 *  - displayTitle   {boolean} Whether to display the title.
 *  - displayCaption {boolean} Whether to display the caption.
 *  - displayCatID   {boolean} Whether to display the object's catalogue ID.
 *  - linkToObject   {boolean} Whether clicking on each image in the grid
 *                             should link to associated image.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

//phpcs:disable
$columns        = $attributes['columns'];
$objectURL      = $attributes['objectURL'] ?? null;
$imgData        = $attributes['imgData'];
$captionText    = $attributes['captionText'] ?? null;
$title          = $attributes['title'];
$catID          = $attributes['catID'];
$fontSize       = $attributes['fontSize'];
$titleTag       = $attributes['titleTag'];
$displayTitle   = $attributes['displayTitle'];
$displayCaption = $attributes['displayCaption'];
$linkToObject   = $attributes['linkToObject'];
$displayCatID   = $attributes['displayCatID'];

$percentWidth = round( 1 / $columns * 100 ) . '%';

$grid = '';
foreach ( $imgData as $imgItem ) {
	ob_start();
	?>
	<div
		class = 'gallery-image-wrapper'
		style = 'flex-basis: <?= $percentWidth ?>'
	>
		<img src = '<?= $imgItem['imgURL'] ?>' alt = '<?= esc_attr( $imgItem['alt'] ?: $imgItem['title'] ?: 'Gallery image' ) ?>' />
	</div>
	<?php
	$grid .= ob_get_contents();
	ob_end_clean();
}

?>
<div class = 'object-gallery-block'>
	<?php if ( $linkToObject && null !== $objectURL ): ?>
		<a class = 'object-link' href = '<?= $objectURL ?>'>Hidden Link Text</a>
	<?php endif; ?>
	<?php if ( $displayTitle && null !== $title ): ?>
		<<?= $titleTag ?>>
			<?= $title ?>
		</<?= $titleTag ?>>
	<?php endif; ?>
	<div class = 'gallery-grid'>
		<?= $grid ?>
	</div>
	<div
		class = 'bottom-text-wrapper'
		style = 'font-size: <?= $fontSize ?>em'
	>
		<?php if ( $displayCatID && null !== $catID ) : ?>
			<div class = 'cat-id'>
				<?= $catID ?>
			</div>
		<?php endif; ?>
		<?php if ( $displayCaption && null !== $captionText ): ?>
			<p><?= $captionText ?></p>
		<?php endif; ?>
	</div>
</div>
<?php
