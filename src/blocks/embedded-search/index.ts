/**
 * An embedded search block that redirects to a search page on submit.
 *
 * This block is dynamic, so attributes are defined server-side.
 *
 * @see src/blocks/embedded-search-block.php
 *
 * Attributes:
 *  - searchPageURL {string} URL of search page.
 *  - headerText    {string} Header content for block, or '' for none
 *  - align         {string} Alignment of the block ( left | center | right )
 */

/**
 * WordPress dependencies
 */
import { registerMuseumBlock } from '../register-museum-block';
import { __ } from '@wordpress/i18n';
import { museum } from '../../icons';

/**
 * Internal dependencies
 */
import edit from './edit';



registerMuseumBlock( 'wp-museum/embedded-search', {
	title    : __( 'Embedded Search' ),
	icon     : museum,
	category : 'wp-museum',
	supports : {
		align: [ 'left', 'right', 'center' ]
	},
	edit     : edit,
	save     : () => null,
} );
