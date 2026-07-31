import { ObjectPostImageGallery } from "../../components";

import {
	createRoot
} from '@wordpress/element';

const objectImageGalleryElements = document.getElementsByClassName('wpm-objectposttype-image-gallery');
if ( !! objectImageGalleryElements ) {
	for ( let i = 0; i < objectImageGalleryElements.length; i++ ) {
		const objectImageGalleryElement = objectImageGalleryElements[i] as HTMLElement;
		// data-post-ID is written by object-meta/render.php, but the container
		// can also be hand-written into a template. Without a usable post id
		// the gallery has nothing to fetch, so leave the element alone.
		const postIdAttribute = objectImageGalleryElement.dataset.postId;
		const postId = postIdAttribute ? parseInt( postIdAttribute, 10 ) : NaN;
		if ( Number.isNaN( postId ) ) {
			continue;
		}
		const root = createRoot( objectImageGalleryElement );
		root.render (
			<ObjectPostImageGallery
				postId = { postId }
			/>
		);
	}
}
