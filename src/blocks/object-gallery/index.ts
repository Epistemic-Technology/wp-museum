/**
 * A grid of square images with a variable number of rows and columns showing
 * images for a particular museum object.
 *
 * @see blocks/object-gallery-frontend.php for attributes.
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
 */

/**
 * WordPress dependencies
 */
import { registerMuseumBlock } from '../register-museum-block';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import edit from './edit';
import { museum } from '../../icons';



registerMuseumBlock( 'wp-museum/object-gallery', {
	title      : __( 'Object Gallery' ),
	icon       : museum,
	category   : 'wp-museum',
	edit       : edit,
	save       : ( ) => null
} );