/**
 * Render any blocks in frontend posts. Blocks are found by class name.
 */

import {
	createRoot
} from '@wordpress/element';

import CollectionBlockFront from './collection-block/front';
import { cleanAttributes } from './javascript/util';

import './style.scss';

const collectionElements = document.getElementsByClassName( 'wpm-remote-collection-block-front');
if ( !! collectionElements ) {
	for ( let i = 0; i < collectionElements.length; i++ ) {
		const collectionElement = collectionElements[i];
		const collectionId = collectionElement.id.substr( 'collection'.length );
		const attributes = window[`attributesCollection${collectionId}`] as Record<string, unknown>;
		cleanAttributes( attributes );
		const root = createRoot( collectionElement );
		root.render(
			<CollectionBlockFront
				attributes = { attributes }
			/>
		);
	}
}