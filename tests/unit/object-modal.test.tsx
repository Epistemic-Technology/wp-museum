/**
 * Tests for the object modal's image scroller.
 *
 * ObjectGrid fetches an object's images after it mounts, so a visitor can
 * open the modal before the response arrives — and an object with no attached
 * images never gets one at all. The scroller ran `Object.values()` on the
 * prop and indexed the result regardless, so it threw in both cases.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/148
 */
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import ObjectModal from '../../src/components/object-modal/object-modal';

import type { ObjectImage, ObjectImagesResponse } from '../../src/types';

const objectImage = ( overrides: Partial< ObjectImage > = {} ): ObjectImage =>
	( {
		title: 'A photograph',
		caption: '',
		description: '',
		alt: '',
		sort_order: 0,
		full: [ 'https://example.test/full.jpg', 1200, 900, false ],
		thumbnail: [ 'https://example.test/thumb.jpg', 150, 150, true ],
		...overrides,
	} ) as unknown as ObjectImage;

const renderModal = ( images: ObjectImagesResponse | null ) => {
	const container = document.createElement( 'div' );
	document.body.appendChild( container );
	const root = createRoot( container );
	act( () => {
		root.render(
			<ObjectModal
				title="An object"
				content="An excerpt."
				url="https://example.test/objects/1"
				linkText="View full entry"
				images={ images }
				close={ () => undefined }
			/>
		);
	} );
	// The modal renders through a portal, so its markup lands on body.
	return {
		body: document.body,
		unmount: () => act( () => root.unmount() ),
	};
};

afterEach( () => {
	document.body.innerHTML = '';
} );

describe( 'ObjectModal', () => {
	it( 'shows the image once the images have arrived', () => {
		const { body, unmount } = renderModal( {
			12: objectImage(),
		} as unknown as ObjectImagesResponse );

		const image = body.querySelector( 'img' );
		expect( image ).not.toBeNull();
		expect( image?.getAttribute( 'src' ) ).toBe(
			'https://example.test/full.jpg'
		);

		unmount();
	} );

	it.each( [
		[ 'images that have not loaded yet', null ],
		[ 'an object with no images', {} as ObjectImagesResponse ],
	] )( 'opens with %s', ( _label, images ) => {
		const { body, unmount } = renderModal( images );

		// The entry is still worth showing without a gallery.
		expect( body.textContent ).toContain( 'An excerpt.' );
		expect( body.textContent ).toContain( 'View full entry' );
		expect( body.querySelector( 'img' ) ).toBeNull();

		unmount();
	} );
} );
