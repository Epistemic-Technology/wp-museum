/**
 * A grid of square images with a variable number of rows and columns.
 *
 * Attribues:
 *  - columns        {number}  Number of columns in the grid.
 *  - rows           {number}  Number of rows in the grid.
 *  - objectData     {array}   Array of data for each object in the grid.
 *  - title          {string}  A title for the block.
 *  - displayTitle   {boolean} Whether to display the title.
 *  - captionText    {string}  A caption for the block.
 *  - displayCaption {boolean} Whether to display the caption.
 *  - linkToObject   {boolean} Whether clicking on each image in the grid
 *                             should link to associated image.
 *  - imgDimensions  {object}  Dimensions for images in the grid. Because
 *                             images vary in size depending on page width,
 *                             this is just used for determining which image
 *                             file to use.
 *  - fontSize       {number}  Font size for caption text (em).
 *  - titleTag       {string}  Tag name for the title to use.
 */

/**
 * WordPress dependencies
 */
import { registerMuseumBlock } from "../register-museum-block";

/**
 * Internal dependencies
 */
import edit from './edit';
import save from './save';



registerMuseumBlock( 'wp-museum/object-grid', {
	edit,
	save
} );