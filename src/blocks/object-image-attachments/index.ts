/**
 * A block for Museum Object image attachments.
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


registerMuseumBlock( 'wp-museum/object-image-attachments-block', {
	title : __( 'Object Image Attachments' ),
	icon : museum,
	category : 'wp-museum',
	edit : edit,
	save : () => null
} );
