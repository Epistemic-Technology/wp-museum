/**
 * A block for Museum Object fields.
 *
 * @see blocks/objectposttype-block.php for attributes.
 */

/**
 * WordPress dependencies
 */
import { registerMuseumBlock } from '../register-museum-block';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import edit from './edit';
import { museum } from '../../icons';
import './editor.scss';
import './style.scss';

registerMuseumBlock( 'wp-museum/object-meta-block', {
	title : __( 'Object Fields' ),
	icon : museum,
	category : 'wp-museum',
	edit : edit,
	save : () => null
} );
