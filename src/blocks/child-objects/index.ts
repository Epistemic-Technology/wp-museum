/**
 * A block for Museum Object children.
 *
 * @see blocks/child-objects-block.php for attributes.
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


registerMuseumBlock( 'wp-museum/child-objects-block', {
	title : __( 'Object Fields' ),
	icon : museum,
	category : 'wp-museum',
	edit,
	save : () => null
} );
