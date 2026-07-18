/**
 * A block to display an infobox for a museum object.
 *
 * The block shows the title and description for the object, along with any
 * custom fields selected by the user. The user can select an image from the
 * object's image gallery to display.
 *
 * @see blocks/object-infobox-frontend.php for attributes.
 *
 * Attribues:
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
 */
import { registerBlockType } from "@wordpress/blocks";

import { __ } from "@wordpress/i18n";

import edit from './edit';
import { museum } from '../../icons';



registerBlockType('wp-museum/object-infobox', {
	title: __('Object Infobox'),
	// TODO(ts-migration): registerBlockType's types only accept a dashicon
	// string or an icon descriptor object, but a plain JSX element works at
	// runtime; cast to keep behavior unchanged.
	icon: museum as any,
	category: 'wp-museum',
	supports: {
		align: [ 'left', 'right', 'center' ]
	},
	// TODO(ts-migration): edit's typed props (attributes as
	// ObjectInfoboxAttributes) are narrower than the generic
	// BlockEditProps<Record<string, unknown>> the types expect; cast to keep
	// behavior unchanged.
	edit: edit as any,
	save       : ( ) => null
});
