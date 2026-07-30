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
import { registerMuseumBlock } from '../register-museum-block';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { museum } from '../../icons';
import edit from './edit';

/**
 * Registers the block.
 */
registerMuseumBlock( 'wp-museum/feature-collection-widget', {
	title    : __( 'Featured Collection'),
	icon     : museum,
	category : 'widgets',
	edit     : edit,
	save     : () => null,
} );
