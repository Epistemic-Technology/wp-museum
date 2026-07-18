/**
 * A block for Museum Object children.
 *
 * @see blocks/child-objects-block.php for attributes.
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


registerBlockType( 'wp-museum/child-objects-block', {
	title : __( 'Object Fields' ),
	// TODO(ts-migration): registerBlockType's types only accept a dashicon
	// string or an icon descriptor object, but a plain JSX element works at
	// runtime; cast to keep behavior unchanged.
	icon : museum as any,
	category : 'wp-museum',
	edit,
	save : () => null
} );
