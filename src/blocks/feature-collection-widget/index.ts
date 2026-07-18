/**
 * A block widget for displaying collections associated  with the current
 * museum object (primarily in sidebars).
 *
 * This block is dynamic, so attributes are defined server-side.
 *
 * @see src/blocks/feature-collection-widget-block.php
 *
 * Attributes:
 *  - showFeatureImage boolean Whether to show image in collection boxes.
 *  - showDescription  boolean Whether to show collection description in
 *    collection boxes.
 */

/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { museum } from '../../icons';
import edit from './edit';

/**
 * Registers the block.
 */
registerBlockType( 'wp-museum/feature-collection-widget', {
	title    : __( 'Featured Collection'),
	// TODO(ts-migration): registerBlockType's types only accept a dashicon
	// string or an icon descriptor object, but a plain JSX element works at
	// runtime; cast to keep behavior unchanged.
	icon     : museum as any,
	category : 'widgets',
	// TODO(ts-migration): edit's typed props (attributes as
	// FeaturedCollectionEditAttributes) are narrower than the generic
	// BlockEditProps<Record<string, unknown>> the types expect; cast to keep
	// behavior unchanged.
	edit     : edit as any,
	save     : () => null,
} );
