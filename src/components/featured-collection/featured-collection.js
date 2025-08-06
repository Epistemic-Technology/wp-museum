/**
 * A box featuring a collection, with title, image, and description.
 */

import apiFetch from '@wordpress/api-fetch';
import {
	useState,
	useEffect
} from '@wordpress/components';

import {
	baseRestPath,
} from '../../javascript/util';

const FeaturedCollection = props => {
	const {
		showImage,
		showDescription,
		collectionID,
	} = props;

	const [ collectionData, setCollectionData ] = useState( {} );

	useEffect( () => {
		apiFetch( { path: `${baseRestPath}/collections/${collectionID}` } )
			.then( result => setCollectionData( result ) );
	} );

	return (
		<div className = 'wpm-featured-collection'>
			{ showImage && !! collectionData.featured_image &&
				<img
					className = 'wpm-featured-collection-image'
					src       = { collectionData.featured_image[0] }
					alt       = { collectionData.title || 'Featured collection' }
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