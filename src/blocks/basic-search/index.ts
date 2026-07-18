/**
 * A block for running basic searches of museum objects.
 *
 * This block is dynamic, so attributes are defined server-side.
 * @see src/blocks/basic-search-block.php
 *
 * Attributes:
 * 	- searchText         {string} Initial search text.
 *  - resultsPerPage     {number} Number of results per page to show.
 *  - advancedSearchLink {string} URL of advanced search page.
 */

/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import { museum } from '../../icons';

/**
 * Internal dependencies
 */
import edit from './edit';

registerBlockType( 'wp-museum/basic-search', {
	title    : __( 'Basic Search' ),
	// TODO(ts-migration): registerBlockType's types only accept a dashicon
	// string or an icon descriptor object, but a plain JSX element works at
	// runtime; cast to keep behavior unchanged.
	icon     : museum as any,
	category : 'wp-museum',
	// TODO(ts-migration): edit's typed props (attributes as
	// BasicSearchAttributes) are narrower than the generic
	// BlockEditProps<Record<string, unknown>> the types expect; cast to keep
	// behavior unchanged.
	edit     : edit as any,
	save     : () => null,
} );
