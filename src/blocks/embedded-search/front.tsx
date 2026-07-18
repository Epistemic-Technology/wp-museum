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
		// TODO(strict): dataset value may be undefined at runtime
		const attributes = attributesFromJSON( embeddedElement.dataset.attributes as string ) as unknown as EmbeddedSearchBlockAttributes;
		const root = createRoot( embeddedElement );
		root.render (
			<EmbeddedSearchFront
				attributes = { attributes }
			/>
		);
	}
}
