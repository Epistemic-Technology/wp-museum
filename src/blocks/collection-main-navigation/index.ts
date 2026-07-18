/**
 * A block showing a list of collections in the main post area.
 *
 * This block is dynamic, so attributes are defined server-side.
 * @see src/blocks/collection-main-navigation-block.php
 *
 * Attributes:
 */

/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import edit from './edit';
import { museum } from '../../icons';

registerBlockType( 'wp-museum/collection-main-navigation-block', {
	title    : __( 'Collection Main Navigation' ),
	// TODO(ts-migration): @wordpress/blocks types expect a BlockTypeIconDescriptor
	// ({ src: ... }) here, but passing a plain JSX element works at runtime.
	icon     : museum as any,
	category : 'wp-museum',
	// TODO(ts-migration): @wordpress/blocks types expect edit to accept
	// BlockEditProps<Record<string, unknown>>; the component types its
	// attributes precisely instead. Cast to keep the current registration.
	edit     : edit as any,
	save      : () => null
} );
