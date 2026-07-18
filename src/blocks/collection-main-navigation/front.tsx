/**
 * WordPress dependencies
 */
import {
	useState,
	useEffect,
	createRoot
} from '@wordpress/element';

import apiFetch from '@wordpress/api-fetch';

/**
 * Internal dependencies
 */
import {
	baseRestPath,
	attributesFromJSON
} from '../../javascript/util';

import { CollectionMainNavigation } from '../../components';

import type { Collection } from '../../types';
import type { CollectionMainNavigationBlockAttributes } from './edit';

interface CollectionMainNavigationFrontProps {
	attributes: CollectionMainNavigationBlockAttributes;
}

const CollectionMainNavigationFront = ( props: CollectionMainNavigationFrontProps ) => {
	const {
		attributes
	} = props;

	const {
		tags,
	} = attributes;

	// State is initialized to an empty object placeholder (not an array);
	// CollectionMainNavigation's isEmpty() check handles it at runtime.
	const [ collectionData, setCollectionData ] = useState< Collection[] >( {} as unknown as Collection[] );

	const updateCollectionData = () => {
		let collectionPath = `${baseRestPath}/collections`;
		if ( tags.length > 0 ) {
			const tagsString = tags.join();
			collectionPath += `/?tags=${tagsString}`
		}
		apiFetch<Collection[]>( { path: collectionPath } ).then( result => setCollectionData( result ) );
	}

	useEffect( () => {
		updateCollectionData();
	}, [] );

	return (
		<div>
			<CollectionMainNavigation
				attributes     = { attributes }
				collectionData = { collectionData }
			/>
		</div>
	);

}

const collectionMainNavigationElements = document.getElementsByClassName('wpm-collection-main-navigation-front');
if ( collectionMainNavigationElements ) {
	for ( let i = 0; i < collectionMainNavigationElements.length; i++ ) {
		const collectionMainNavigationElement = collectionMainNavigationElements[i] as HTMLElement;
		const attributes = attributesFromJSON(
			collectionMainNavigationElement.dataset.attributes as string
		) as unknown as CollectionMainNavigationBlockAttributes;
		const root = createRoot( collectionMainNavigationElement );
		root.render (
			<CollectionMainNavigationFront
				attributes = { attributes }
			/>
		);
	}
}
