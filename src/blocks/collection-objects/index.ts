/**
 * WordPress dependencies
 */
import { registerMuseumBlock } from "../register-museum-block";

import { __ } from "@wordpress/i18n";

/**
 * Internal dependencies
 */
import CollectionObjects from './collection-objects';
import { museum } from '../../icons';

registerMuseumBlock( 'wp-museum/collection-objects', {
	title    : __( 'Collection Objects' ),
	icon     : museum,
	category : 'wp-museum',
	edit     : CollectionObjects,
	save     : () => null
} );
