/**
 * A block showing a collection along with some of its members.
 *
 * This block is dynamic, so attributes are defined server-side.
 * @see collection-block.php
 *
 * Attributes:
 *  - numObjects        {number}  The number of object images from collection to display.
 *  - columns           {number}  The max columns in object image grid.
 *  - collectionID      {number}  The WordPress post_id of the collection.
 *  - collectionURL     {string}  The permalink of the collection.
 *  - collectionObjects {array}   Data for objects contained in collection.
 *  - thumbnailURL      {string}  URL of the collection's thumbnail.
 *  - imgDimensions     {object}  Width, height, and size of collection's thumbnail.
 *  - title             {string}  Title of the collection.
 *  - excerpt           {string}  Excerpt of the collection description.
 *  - fontSize          {number}  Fontsize for excerpt (em).
 *  - titleTag          {string}  HTML element for displaying title (h1, h2, p, etc.)
 *  - imgAlignment      {string}  Alignment for thumbnail (left | center | right).
 *  - displayTitle      {booleam} Whether to display title.
 *  - linkToObjects     {boolean} Whether to link to collection objects.
 *  - displayExcerpt    {boolean} Whether to display excerpt.
 *  - displayObjects    {boolean} Whether to dispaly objects.
 *  - displayThumbnail  {boolean} Whether to display thumbnail.
 */

/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

/**
 * WP-Museum
 */
import museum from '../icons/museum';

/**
 * Internal dependencies
 */
import edit from './edit';
// TODO(ts-migration): save.ts is an intentionally empty module (the original
// save.js was an empty file), so it has no default export; this import has
// always been `undefined` at runtime and is unused — registration below uses
// `save: () => null`.
// @ts-expect-error
import save from './save';

registerBlockType( 'museum-remote/collection-block', {
	title: __( 'Museum Collection' ),
	icon: museum,
	category: 'embed',
	edit,
	save: () => null
} as any ); // NOTE(wp-types): @wordpress/blocks' BlockConfiguration requires an `attributes` key and a BlockEditProps-shaped edit component; this dynamic block defines attributes server-side, so cast to keep the existing registration unchanged.