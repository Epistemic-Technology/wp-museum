/**
 * A block to display a single museum object image, with title and caption.
 * 
 * Attributes:
 *  - align          {string}  Alignment for the block on the page ( left | right | center ).
 *  - objectID       {number}  WordPress post_id for the object.
 *  - catID          {string}  The museum catalogue id for the object.
 *  - title          {string}  The object's title (name).
 *  - captionText    {string}  A caption for the image, entered by user.
 *  - imgHeight      {number}  Actual height of the image file.
 *  - imgWidth       {number}  Actual width of the image file.
 *  - imgURL         {string}  URL of the image file.
 *  - imgIndex       {number}  Array index of the image in the object's image gallery.
 *  - totalImages    {number}  The total number of images in the object's image gallery.
 *  - objectURL      {string}  The URL of the object (ie. a WordPress frontend page).
 *  - displayTitle   {boolean} Whether to display the object's title.
 *  - displayCatID   {boolean} Whether to display the object's catalogue ID.
 *  - displayCaption {boolean} Whether to display a caption for the object.
 *  - linkToObject   {boolean} Whether clicking on image should link to the object.
 *  - imgDimensions  {object}  The dimensions of the image for *display*.
 *  - fontSize       {string}  Font size for the image's caption and catalogue ID (em).
 *  - titleTag       {string}  Tag name for the title.
 *  - appearance     {object}  User-controllable styles for the block.
 */

/**
 * WordPress dependencies
 */
import { registerBlockType } from "@wordpress/blocks";

import { __ } from "@wordpress/i18n";

/**
 * Internal dependencies
 */
import edit from './edit';
import save from './save';

registerBlockType( 'wp-museum/object-image', {
	title      : __( 'Object Image'),
	icon       : 'archive',
	category   : 'wp-museum',
	supports    : {
		align: [ 'left', 'right', 'center' ]
	},
	attributes : {
		align: {
			type    : 'string',
			default : 'left'
		},
		objectID: {
			type    : 'number',
			default : null
		},
		catID: {
			type    : 'string',
			default : 'No Object Selected'
		},
		title: {
			type    : 'string',
			default : 'No Object Selected'
		},
		captionText: {
			type    : 'string',
			default : null
		},
		imgHeight: {
			type    : 'number',
			default : null
		},
		imgWidth: {
			type    : 'number',
			default : null
		},
		imgURL: {
			type    : 'string',
			default : null
		},
		imgIndex: {
			type    : 'number',
			default : 0
		},
		totalImages: {
			type    : 'number',
			default : 0
		},
		objectURL: {
			type    : 'string',
			default : null
		},
		displayTitle: {
			type    : 'boolean',
			default : true
		},
		displayCatID: {
			type    : 'boolean',
			default : true
		},
		displayCaption: {
			type    : 'boolean',
			default : true
		},
		linkToObject: {
			type    : 'boolean',
			default : true
		},
		imgDimensions: {
			type    : 'object',
			default : {
				width  : 300,
				height : 300,
				size   : 'medium' //options: thumbnail, medium, large, full
			}
		},
		fontSize: {
			type    : 'float',
			default : 0.7
		},
		titleTag: {
			type    : 'string',
			default : 'h6' //options: h2, h3, h, h5, h6, p
		},
		appearance: {
			type    : 'object',
			default : {
				borderWidth       : 0,
				borderColor       : '#000',
				backgroundColor   : '#fff',
				backgroundOpacity : 0
			}
		}
	},
	edit,
	save
} );