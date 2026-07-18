import { ObjectPostImageGallery } from "../../components";

import {
	createRoot
} from '@wordpress/element';

const objectImageGalleryElements = document.getElementsByClassName('wpm-objectposttype-image-gallery');
if ( !! objectImageGalleryElements ) {
	for ( let i = 0; i < objectImageGalleryElements.length; i++ ) {
		const objectImageGalleryElement = objectImageGalleryElements[i] as HTMLElement;
		const postId = parseInt( objectImageGalleryElement.dataset.postId );
		const root = createRoot( objectImageGalleryElement );
		root.render (
			<ObjectPostImageGallery
				postId = { postId }
			/>
		);
	}
}
