/**
 * Tests for the image-sizing pipeline: picking a size tuple out of a wire
 * image record, and rendering thumbnails that may not exist.
 *
 * Size tuples come from `wp_get_attachment_image_src()` and are ordered
 * `[url, width, height, isResized]` (see the ImageSizeTuple docblock in
 * src/types/common.ts and the schema in
 * src/rest/class-object-image-controller.php). getBestImage used to read them
 * as `[url, height, width, …]`, which picked the wrong file whenever the
 * requested dimensions were not square.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/147
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/148
 */
import { renderToStaticMarkup } from 'react-dom/server';

import { getBestImage } from '../../src/javascript/util';
import { ObjectList } from '../../src/components/object-list/object-list';

import type { MuseumObject, ObjectImage } from '../../src/types';

/**
 * An image record as it arrives on the wire, for a landscape source image.
 * Intermediate sizes are bounding-box scaled, so they are landscape too.
 */
const objectImage = ( sizes: Partial< ObjectImage > ): ObjectImage =>
	( {
		title: 'An image',
		caption: '',
		description: '',
		alt: 'Alt text',
		sort_order: 0,
		full: null,
		...sizes,
	} as ObjectImage );

const museumObject = (
	overrides: Partial< MuseumObject > & { ID: number }
): MuseumObject =>
	( {
		post_title: 'An object',
		excerpt: 'An excerpt.',
		post_type: 'wpm_instrument',
		link: 'https://example.test/objects/1',
		edit_link: null,
		thumbnail: [ 'https://example.test/thumb.jpg', 150, 100, true ],
		cat_field: null,
		collections: [],
		...overrides,
	} as unknown as MuseumObject );

describe( 'getBestImage', () => {
	it( 'reads the tuple as [url, width, height]', () => {
		const imgData = objectImage( {
			medium: [ 'https://example.test/medium.jpg', 400, 200, true ],
			large: [ 'https://example.test/large.jpg', 1024, 512, true ],
			full: [ 'https://example.test/full.jpg', 2000, 1000, false ],
		} );

		const best = getBestImage( imgData, { height: 200, width: 200 } );

		expect( best.URL ).toBe( 'https://example.test/medium.jpg' );
		expect( best.width ).toBe( 400 );
		expect( best.height ).toBe( 200 );
	} );

	it( 'rejects a size that is wide enough but not tall enough', () => {
		const imgData = objectImage( {
			// 400 wide × 200 tall: too short for a 400px-tall request.
			medium: [ 'https://example.test/medium.jpg', 400, 200, true ],
			full: [ 'https://example.test/full.jpg', 2000, 1000, false ],
		} );

		const best = getBestImage( imgData, { height: 400, width: 200 } );

		expect( best.URL ).toBe( 'https://example.test/full.jpg' );
		expect( best.width ).toBe( 2000 );
		expect( best.height ).toBe( 1000 );
	} );

	it( 'falls back to the full size when nothing is large enough', () => {
		const imgData = objectImage( {
			thumbnail: [ 'https://example.test/thumb.jpg', 150, 150, true ],
			full: [ 'https://example.test/full.jpg', 800, 600, false ],
		} );

		const best = getBestImage( imgData, { height: 1024, width: 1024 } );

		expect( best.URL ).toBe( 'https://example.test/full.jpg' );
		expect( best.width ).toBe( 800 );
		expect( best.height ).toBe( 600 );
	} );

	it( 'returns no URL instead of throwing when the full size is null', () => {
		const imgData = objectImage( {
			thumbnail: null,
			full: null,
		} );

		const best = getBestImage( imgData, { height: 300, width: 300 } );

		expect( best.URL ).toBeNull();
		expect( best.width ).toBe( 0 );
		expect( best.height ).toBe( 0 );
	} );
} );

describe( 'ObjectList thumbnails', () => {
	it( 'renders the thumbnail URL when the object has an image', () => {
		const markup = renderToStaticMarkup(
			<ObjectList
				mObjects={ [ museumObject( { ID: 1 } ) ] }
				displayImages={ true }
			/>
		);
		expect( markup ).toContain( 'src="https://example.test/thumb.jpg"' );
	} );

	it( 'renders no image when the object has an empty thumbnail array', () => {
		const markup = renderToStaticMarkup(
			<ObjectList
				mObjects={ [ museumObject( { ID: 1, thumbnail: [] } ) ] }
				displayImages={ true }
			/>
		);
		expect( markup ).not.toContain( '<img' );
		expect( markup ).toContain( 'object-row-image' );
	} );

	it( 'renders no image, and does not throw, when the thumbnail is null', () => {
		let markup = '';
		expect( () => {
			markup = renderToStaticMarkup(
				<ObjectList
					mObjects={ [ museumObject( { ID: 1, thumbnail: null } ) ] }
					displayImages={ true }
				/>
			);
		} ).not.toThrow();
		expect( markup ).not.toContain( '<img' );
	} );
} );
