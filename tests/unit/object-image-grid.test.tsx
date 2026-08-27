/**
 * Regression tests for ObjectImageGrid.
 *
 * Three defects, all surfaced by the TypeScript migration:
 *
 * 1. `title` and `alt` were read off the whole images response — a map keyed
 *    by attachment ID — rather than off an individual image record, so both
 *    were always undefined and fell through to "".
 * 2. An object with no gallery image produced a null best-fit URL, which was
 *    asserted to be a string and rendered as an <img> with no src. (This used
 *    to throw instead; that half was fixed in fc68b7e.)
 * 3. `onClickCallback` is an optional prop but was invoked through a non-null
 *    assertion, so clicking an image in a grid rendered without one — which is
 *    how the collection block's editor renders it — threw a TypeError.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/141
 */
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import apiFetch from '@wordpress/api-fetch';

import ObjectImageGrid from '../../src/components/object-image-grid/object-image-grid';

import type { ObjectImage, ObjectImagesResponse } from '../../src/types';

jest.mock( '@wordpress/api-fetch', () => ( {
	__esModule: true,
	default: jest.fn( () => Promise.resolve( [] ) ),
} ) );

const mockedApiFetch = apiFetch as unknown as jest.Mock;

const image = (
	sort_order: number,
	title: string,
	alt: string
): ObjectImage =>
	( {
		title,
		caption: '',
		description: '',
		alt,
		sort_order,
		thumbnail: [ 'thumb.jpg', 150, 150, true ],
		medium: [ `medium-${ sort_order }.jpg`, 300, 300, true ],
		full: [ 'full.jpg', 2000, 1333, false ],
	} as unknown as ObjectImage );

/**
 * Two attached images, keyed by attachment ID as the wire keys them, and
 * deliberately out of sort order so that reading the first image means
 * reading the one with sort_order 0 rather than the first key.
 */
const gallery: ObjectImagesResponse = {
	'908': image( 1, 'Back of the sextant', 'The reverse side' ),
	'417': image( 0, 'Sextant', 'A brass sextant on a table' ),
};

const gridObject = {
	ID: 42,
	title: 'Sextant',
	URL: 'https://example.org/objects/sextant',
	imgURL: 'thumb.jpg',
};

describe( 'ObjectImageGrid', () => {
	let container: HTMLDivElement;
	let root: ReturnType< typeof createRoot >;

	// Rendering kicks off the image fetch, which sets state when it resolves;
	// awaiting inside act() flushes it so the update is not reported as
	// happening outside act.
	const renderGrid = async ( props: Record< string, unknown > = {} ) =>
		await act( async () => {
			root.render(
				<ObjectImageGrid
					objects={ [ gridObject ] }
					numObjects={ 4 }
					columns={ 2 }
					linkToObjects={ false }
					{ ...props }
				/>
			);
		} );

	const clickImage = async () =>
		await act( async () => {
			container
				.querySelector( 'img' )!
				.dispatchEvent( new MouseEvent( 'click', { bubbles: true } ) );
		} );

	beforeEach( () => {
		container = document.createElement( 'div' );
		document.body.appendChild( container );
		root = createRoot( container );
		mockedApiFetch.mockImplementation( () => Promise.resolve( gallery ) );
	} );

	afterEach( async () => {
		await act( async () => root.unmount() );
		container.remove();
		mockedApiFetch.mockReset();
	} );

	it( 'takes title and alt from the first image, not from the images map', async () => {
		await renderGrid();

		const img = container.querySelector( 'img' )!;
		expect( img.getAttribute( 'title' ) ).toBe( 'Sextant' );
		expect( img.getAttribute( 'alt' ) ).toBe( 'A brass sextant on a table' );
		expect( img.getAttribute( 'src' ) ).toBe( 'medium-0.jpg' );
	} );

	it( 'holds the slot with a placeholder when the object has no images', async () => {
		mockedApiFetch.mockImplementation( () => Promise.resolve( [] ) );

		await renderGrid();

		expect( container.querySelector( 'img' ) ).toBeNull();
		expect( container.querySelector( '.placeholder-box' ) ).not.toBeNull();
	} );

	it( 'does not throw when an image is clicked with no callback given', async () => {
		await renderGrid();

		await expect( clickImage() ).resolves.not.toThrow();
	} );

	it( 'passes the clicked object to the callback when one is given', async () => {
		const onClickCallback = jest.fn();

		await renderGrid( { onClickCallback } );
		await clickImage();

		expect( onClickCallback ).toHaveBeenCalledWith( 42 );
	} );
} );
