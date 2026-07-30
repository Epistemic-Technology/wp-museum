/**
 * A block for running advanced searches of museum objects.
 *
 * This block is dynamic, so attributes are defined server-side.
 * @see src/blocks/advanced-search-block.php
 *
 * Attributes:
 *  - defaultSearch   {string}  JSON-encoded string of saved search defaults.
 *  - fixDefaults     {boolean} Whether the saved defaults should be fixed (and hidden from user.)
 *  - fixSearch       {boolean} Whether the entire search should be fixed (so just results will be
 *                              shown on frontend).
 *  - runOnLoad       {boolean} Whether to run the search immediately when page is loaded. Only
 *                              applies if fixDefaults or fixSearch is set.
 *  - showFlags       {boolean} Whether the flags section should be shown to user.
 *  - showCollections {boolean} Whether the collection selection section should be shown to user.
 *  - showFields      {boolean} Whether the search-by-field section should be shown to user.
 *  - startExpanded   {boolean} Whether the advanced options section should be visible by default.
 *  - resultsPerPage  {number}  How many search results to show per page.
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

registerMuseumBlock( 'wp-museum/advanced-search', {
	title    : __( 'Advanced Search' ),
	icon     : museum,
	category : 'wp-museum',
	edit     : edit,
	save     : () => null
} );
