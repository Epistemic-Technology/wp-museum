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
import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import { museum } from '../../icons';

/**
 * Internal dependencies
 */
import edit from './edit';



registerBlockType( 'wp-museum/embedded-search', {
	title    : __( 'Embedded Search' ),
	// TODO(ts-migration): registerBlockType's types only accept a dashicon
	// string or an icon descriptor object, but a plain JSX element works at
	// runtime; cast to keep behavior unchanged.
	icon     : museum as any,
	category : 'wp-museum',
	supports : {
		align: [ 'left', 'right', 'center' ]
	},
	// TODO(ts-migration): edit's typed props (attributes as
	// EmbeddedSearchBlockAttributes) are narrower than the generic
	// BlockEditProps<Record<string, unknown>> the types expect; cast to keep
	// behavior unchanged.
	edit     : edit as any,
	save     : () => null,
} );
