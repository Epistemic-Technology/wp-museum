/**
 * Frontend display of embedded search block.
 */

import { createRoot } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { EmbeddedSearch } from '../../components';
import { attributesFromJSON } from '../../javascript/util';
import type { EmbeddedSearchBlockAttributes } from './edit';

interface EmbeddedSearchFrontProps {
	attributes: EmbeddedSearchBlockAttributes;
}

const EmbeddedSearchFront = ( props: EmbeddedSearchFrontProps ) => {
	const {
		attributes
	} = props;

	const {
		searchPageURL,
		headerText,
		align,
		maxWidth,
		showTitleToggle,
		advancedSearchURL
	} = attributes;

	return (
		<div
			className = { `wpm-embedded-search-block align${align}`}
			style = { { maxWidth: `${maxWidth}%` } }
		>
			{ !! headerText &&
				<h2>
					{ headerText }
				</h2>
			}
			<EmbeddedSearch
				showTitleToggle   = { showTitleToggle }
				searchPageURL     = { searchPageURL }
				showReset         = { false }
				advancedSearchURL = { advancedSearchURL }
			/>
		</div>
	)
}

const embeddedSearchElements = document.getElementsByClassName('wpm-embedded-search-block-frontend');
if ( !! embeddedSearchElements ) {
	for ( let i = 0; i < embeddedSearchElements.length; i++ ) {
		const embeddedElement = embeddedSearchElements[i] as HTMLElement;
		// The data attribute is missing (or empty) if render.php could not
		// encode the block attributes; fall back to an empty set so the block
		// still mounts with its defaults rather than throwing out of JSON.parse.
		const attributes = attributesFromJSON( embeddedElement.dataset.attributes || '{}' ) as unknown as EmbeddedSearchBlockAttributes;
		const root = createRoot( embeddedElement );
		root.render (
			<EmbeddedSearchFront
				attributes = { attributes }
			/>
		);
	}
}
