<?php
/**
 * Render the Object Infobox block on the frontend.
 *
 * @see blocks/src/object-infobox
 *
 *  Attribues:
 *  - align          {string}  The alignment of the block on the page { left | right | center }
 *  - objectID       {number}  The WordPress post_id of the object.
 *  - catID          {string}  The museum catalogue ID of the object.
 *  - title          {string}  The title (name) of the object.
 *  - excerpt        {string}  An excerpt of the description of the object.
 *  - imgURL         {string}  The URL of the image.
 *  - imgIndex       {number}  The array index of the image in the object's gallery.
 *  - totalImages    {number}  The total number of images in the object's gallery.
 *  - imgHeight      {number}  The actual height of the image file.
 *  - imgWidth       {number}  The actual width of the image file.
 *  - objectURL      {string}  The URL of the object page (ie. WordPress page).
 *  - displayTitle   {boolean} Whether to display the object's title.
 *  - displayExcerpt {boolean} Whether to display the object's description.
 *  - displayImage   {boolean} Whether to display the image.
 *  - linkToObject   {boolean} Whether to link to the object page by clicking on the infobox.
 *  - fields         {object}  List of fields and whether they are to be displayed.
 *  - fieldData      {object}  Data for each field to be displayed in the box.
 *  - imgDimensions  {object}  The *displayed* dimensions of the image.
 *  - imgAlignment   {string}  Alignment of the image within the infobox ( left | right | center ).
 *  - fontSize       {number}  Font size of description & field text (em).
 *  - titleTag       {string}  HTML tag for title (h1, h2, p, etc).
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

$title          = $attributes['title'];
$excerpt        = $attributes['excerpt'];
$objectURL      = $attributes['objectURL'];
$displayTitle   = $attributes['displayTitle'];
$displayExcerpt = $attributes['displayExcerpt'];
$imgURL         = $attributes['imgURL'];
$displayImage   = $attributes['displayImage'];
$linkToObject   = $attributes['linkToObject'];
$fields         = $attributes['fields'];
$fieldData      = $attributes['fieldData'];
$imgDimensions  = $attributes['imgDimensions'];
$imgAlignment   = $attributes['imgAlignment'];
$fontSize       = $attributes['fontSize'];
$titleTag       = $attributes['titleTag'];
xdebug_break();

$width  = $imgDimensions['width'];
$height = $imgDimensions['height'];

$fieldList = [];
if ( count( $fields ) === count( $fieldData ) ) {
	$fieldList = array_keys( $fields );
	$fieldList = array_filter(
		$fieldList,
		function ( $key ) use ( $fields ) {
			return ( $fields[ $key ] );
		}
	);
	$fieldList = array_map(
		function ( $key ) use ( $fontSize, $fieldData ) {
			ob_start();
			?>
			<li key="<?php echo esc_attr( $key ); ?>" style="font-size: <?php echo esc_attr( (float) $fontSize ); ?>em">
				<span class="field-name"><?php echo esc_html( $fieldData[ $key ]['name'] ); ?>: </span>
				<span class="field-data"><?php echo esc_html( $fieldData[ $key ]['content'] ?? '' ); ?> </span>
			</li>
			<?php
			$output = ob_get_contents();
			ob_end_clean();
			return $output;
		},
		$fieldList
	);
}
$fieldListHTML = '';
foreach ( $fieldList as $field ) {
	$fieldListHTML .= $field;
}

$title_tag = tag_escape( $titleTag );
$img_align = sanitize_html_class( $imgAlignment );
$font_size = (float) $fontSize;
?>
<div class="info-outer-div">
	<div class="infobox-body-wrapper img-<?php echo esc_attr( $img_align ); ?>">
		<?php if ( $linkToObject ) : ?>
			<a class="object-link" href="<?php echo esc_url( $objectURL ); ?>">Hidden Link Text</a>
		<?php endif; ?>
		<?php if ( ! is_null( $imgURL ) && $displayImage ) : ?>
			<div class="infobox-img-wrapper">
				<img
					src="<?php echo esc_url( $imgURL ); ?>"
					height="<?php echo esc_attr( (int) $height ); ?>"
					width="<?php echo esc_attr( (int) $width ); ?>"
					alt="<?php echo esc_attr( isset( $post_title ) ? $post_title : '' ); ?>"
				/>
			</div>
		<?php endif; ?>
		<div class="infobox-content-wrapper">
			<?php if ( null !== $title && $displayTitle ) : ?>
				<<?php echo esc_html( $title_tag ); ?>><?php echo esc_html( $title ); ?></<?php echo esc_html( $title_tag ); ?>>
			<?php endif; ?>
			<?php if ( null !== $excerpt && $displayExcerpt ) : ?>
				<p style="font-size:<?php echo esc_attr( $font_size ); ?>em"><?php echo esc_html( $excerpt ); ?></p>
			<?php endif; ?>
			<?php if ( count( $fieldList ) > 0 ) : ?>
				<ul>
					<?php echo wp_kses_post( $fieldListHTML ); ?>
				</ul>
			<?php endif; ?>
		</div>
	</div>
</div>
<?php
