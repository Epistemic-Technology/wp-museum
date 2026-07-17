/**
 * A box featuring a collection, with title, image, and description.
 */

import apiFetch from '@wordpress/api-fetch';
import {
	// TODO(ts-migration): useState/useEffect are NOT exported by
	// @wordpress/components (they are undefined at runtime, so this component
	// crashes when rendered) — they should come from @wordpress/element.
	// Pre-existing bug preserved; @ts-expect-error keeps the import compiling.
	// @ts-expect-error -- see TODO(ts-migration) above
	useState,
	// @ts-expect-error -- see TODO(ts-migration) above
	useEffect
} from '@wordpress/components';

import {
	baseRestPath,
} from '../../javascript/util';

import type { Collection } from '../../types';

interface FeaturedCollectionProps {
	showImage: boolean;
	showDescription: boolean;
	collectionID: number;
}

const FeaturedCollection = ( props: FeaturedCollectionProps ) => {
	const {
		showImage,
		showDescription,
		collectionID,
	} = props;

	const [ collectionData, setCollectionData ] = useState( {} as Partial<Collection> );

	useEffect( () => {
		apiFetch<Collection>( { path: `${baseRestPath}/collections/${collectionID}` } )
			.then( result => setCollectionData( result ) );
	} );

	return (
		<div className = 'wpm-featured-collection'>
			{ showImage && !! collectionData.featured_image &&
				<img
					className = 'wpm-featured-collection-image'
					src       = { collectionData.featured_image[0] }
					// TODO(ts-migration): `title` never exists on the wire (only
					// `post_title`), so the fallback string is always used —
					// pre-existing bug preserved via type assertion.
					alt       = { ( collectionData as { title?: string } ).title || 'Featured collection' }
				/>
			}
			<h2>
				{ !! collectionData.post_title && collectionData.post_title }
			</h2>
			{ showDescription && !! collectionData.excerpt &&
				<div className = 'wpm-featured-collection-description'>
					{ collectionData.excerpt }
				</div>
			}
		</div>
	);
}

export default FeaturedCollection;
