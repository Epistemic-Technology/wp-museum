/**
 * Regression test for the Featured Collection widget's editor.
 *
 * The editor treated `objectData.collections` as an array of collection IDs,
 * but the REST wire shape is a `{ id: name }` object — and `[]` rather than
 * `{}` when the object is in no collection, per PHP's empty-array quirk. The
 * `Array.isArray()` guard was therefore true only for the empty case, so the
 * widget never rendered a single collection box. The keys were also taxonomy
 * term IDs, while FeaturedCollection looks the collection up by post ID.
 *
 * FeaturedCollection was additionally handed `showFeatureImage` while it
 * reads `showImage`, so the image never rendered even once boxes appeared.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/138
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/130
 */
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import apiFetch from '@wordpress/api-fetch';
import { createReduxStore, register } from '@wordpress/data';

import FeaturedCollectionEdit from '../../src/blocks/feature-collection-widget/edit';

jest.mock( '@wordpress/api-fetch', () => ( {
	__esModule: true,
	default: jest.fn(),
} ) );

// CheckboxControl calls deprecated() for WP's bottom-margin opt-in. That
// notice goes through console.warn, which @wordpress/jest-console turns into
// a failure, and it is unrelated to what this file tests.
jest.mock( '@wordpress/deprecated', () => ( {
	__esModule: true,
	default: jest.fn(),
} ) );

const POST_ID = 42;

// The editor reads the current post ID off the core/editor store. Registering
// a real store against the default registry is sturdier than mocking
// @wordpress/data, which @wordpress/components also pulls its own internals
// from.
register(
	createReduxStore( 'core/editor', {
		reducer: ( state = {} ) => state,
		selectors: { getCurrentPostId: () => POST_ID },
	} )
);

// InspectorControls renders into an editor slot that does not exist here.
jest.mock( '@wordpress/block-editor', () => ( {
	__esModule: true,
	InspectorControls: ( { children }: { children: React.ReactNode } ) => (
		<div className="mock-inspector-controls">{ children }</div>
	),
} ) );

const mockedApiFetch = apiFetch as unknown as jest.Mock;

/** The subset of the object/collection wire shapes these paths return. */
const respondWith = ( collections: Record< string, string > | [] ) =>
	mockedApiFetch.mockImplementation( ( { path }: { path: string } ) => {
		if ( path.includes( '/collections/' ) ) {
			return Promise.resolve( {
				ID: 101,
				post_title: 'Fossils',
				excerpt: 'Things that were once alive.',
				featured_image: [ 'http://example.org/fossils.jpg', 300, 200, true ],
			} );
		}
		return Promise.resolve( { ID: 42, collections } );
	} );

describe( 'Featured Collection widget editor', () => {
	let container: HTMLDivElement;
	let root: ReturnType< typeof createRoot >;

	const renderEdit = async ( showFeatureImage = true ) =>
		await act( async () => {
			root.render(
				<FeaturedCollectionEdit
					attributes={ { showFeatureImage, showDescription: true } }
					setAttributes={ jest.fn() }
				/>
			);
		} );

	beforeEach( () => {
		container = document.createElement( 'div' );
		document.body.appendChild( container );
		root = createRoot( container );
		mockedApiFetch.mockReset();
	} );

	afterEach( async () => {
		await act( async () => root.unmount() );
		container.remove();
	} );

	it( 'renders a box for each collection in the { id: name } map', async () => {
		respondWith( { '101': 'Fossils', '205': 'Minerals' } );
		await renderEdit();

		expect(
			container.querySelectorAll( '.wpm-featured-collection' )
		).toHaveLength( 2 );
	} );

	it( 'looks each collection up by the key of the map', async () => {
		respondWith( { '101': 'Fossils', '205': 'Minerals' } );
		await renderEdit();

		const paths = mockedApiFetch.mock.calls.map( ( [ { path } ] ) => path );
		expect( paths ).toContain( '/wp-museum/v1/collections/101' );
		expect( paths ).toContain( '/wp-museum/v1/collections/205' );
	} );

	it( 'renders no boxes when the object is in no collection', async () => {
		// PHP serializes an empty associative array as JSON [].
		respondWith( [] );
		await renderEdit();

		expect(
			container.querySelectorAll( '.wpm-featured-collection' )
		).toHaveLength( 0 );
	} );

	it( 'passes showFeatureImage through as the showImage prop', async () => {
		respondWith( { '101': 'Fossils' } );
		await renderEdit( true );

		const image = container.querySelector(
			'.wpm-featured-collection-image'
		) as HTMLImageElement;
		expect( image ).not.toBeNull();
		// The alt text comes from post_title, not the never-present `title`.
		expect( image.getAttribute( 'alt' ) ).toBe( 'Fossils' );
	} );

	it( 'omits the image when showFeatureImage is off', async () => {
		respondWith( { '101': 'Fossils' } );
		await renderEdit( false );

		expect(
			container.querySelector( '.wpm-featured-collection-image' )
		).toBeNull();
	} );
} );
