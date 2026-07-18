/**
 * WordPress dependencies
 */
import { registerBlockType } from "@wordpress/blocks";

import { __ } from "@wordpress/i18n";

/**
 * Internal dependencies
 */
import CollectionObjects from './collection-objects';
import { museum } from '../../icons';

registerBlockType( 'wp-museum/collection-objects', {
	title    : __( 'Collection Objects' ),
	// TODO(ts-migration): registerBlockType's types only accept a dashicon
	// string or an icon descriptor object, but a plain JSX element works at
	// runtime; cast to keep behavior unchanged.
	icon     : museum as any,
	category : 'wp-museum',
	// TODO(ts-migration): edit's typed props (attributes as
	// CollectionObjectsAttributes) are narrower than the generic
	// BlockEditProps<Record<string, unknown>> the types expect; cast to keep
	// behavior unchanged.
	edit     : CollectionObjects as any,
	save     : () => null
} );
