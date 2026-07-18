/**
 * A block for Museum Object fields.
 *
 * @see blocks/objectposttype-block.php for attributes.
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
import './editor.scss';
import './style.scss';

registerBlockType( 'wp-museum/object-meta-block', {
	title : __( 'Object Fields' ),
	// TODO(ts-migration): registerBlockType's types only accept a dashicon
	// string or an icon descriptor object, but a plain JSX element works at
	// runtime; cast to keep behavior unchanged.
	icon : museum as any,
	category : 'wp-museum',
	// TODO(ts-migration): edit's typed props are narrower than the generic
	// BlockEditProps<Record<string, unknown>> the types expect; cast to keep
	// behavior unchanged.
	edit : edit as any,
	save : () => null
} );
