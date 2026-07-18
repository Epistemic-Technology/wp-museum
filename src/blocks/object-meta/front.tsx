import { ObjectPostImageGallery } from "../../components";

import {
	createRoot
} from '@wordpress/element';

const objectImageGalleryElements = document.getElementsByClassName('wpm-objectposttype-image-gallery');
if ( !! objectImageGalleryElements ) {
	for ( let i = 0; i < objectImageGalleryElements.length; i++ ) {
		const objectImageGalleryElement = objectImageGalleryElements[i] as HTMLElement;
		// TODO(strict): dataset.postId may be undefined at runtime if the data
		// attribute is missing (parseInt would yield NaN); cast preserves behavior.
		const postId = parseInt( objectImageGalleryElement.dataset.postId as string );
		const root = createRoot( objectImageGalleryElement );
		root.render (
			<ObjectPostImageGallery
				postId = { postId }
			/>
		);
	}
}
