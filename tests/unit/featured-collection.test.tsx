/**
 * Regression test for FeaturedCollection's hook imports.
 *
 * useState and useEffect were imported from @wordpress/components, which does
 * not export them. Both were undefined at runtime, so calling either threw a
 * TypeError the instant the component rendered.
 *
 * This is the one migration fix a browser test cannot reach: the component's
 * only render site, the feature-collection-widget block, always computes an
 * empty list of collection boxes (issue #138), so nothing ever mounts it.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/130
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import apiFetch from '@wordpress/api-fetch';

import FeaturedCollection from '../../src/components/featured-collection/featured-collection';

jest.mock( '@wordpress/api-fetch', () => ( {
	__esModule: true,
	default: jest.fn( () => new Promise( () => undefined ) ),
} ) );

const mockedApiFetch = apiFetch as unknown as jest.Mock;

// Tells React 18 that act() is supported here, which keeps it from warning
// on every state update flushed below.
( global as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean } )
	.IS_REACT_ACT_ENVIRONMENT = true;

beforeEach( () => {
	mockedApiFetch.mockReset();
	mockedApiFetch.mockImplementation(
		() => new Promise( () => undefined )
	);
} );

describe( 'FeaturedCollection', () => {
	it( 'renders without throwing', () => {
		expect( () =>
			renderToStaticMarkup(
				<FeaturedCollection
					showImage={ true }
					showDescription={ true }
					collectionID={ 7 }
				/>
			)
		).not.toThrow();
	} );

	it( 'renders its wrapper before collection data arrives', () => {
		const markup = renderToStaticMarkup(
			<FeaturedCollection
				showImage={ true }
				showDescription={ true }
				collectionID={ 7 }
			/>
		);
		expect( markup ).toContain( 'wpm-featured-collection' );
		// No data yet, so neither the image nor the description is emitted.
		expect( markup ).not.toContain( '<img' );
		expect( markup ).not.toContain( 'wpm-featured-collection-description' );
	} );

	/**
	 * The image alt text used to read `title`, which the collections REST
	 * route never returns (the wire property is `post_title`), so every
	 * featured image fell back to the generic 'Featured collection' string.
	 *
	 * @see https://github.com/Epistemic-Technology/wp-museum/issues/147
	 */
	describe( 'featured image alt text', () => {
		const renderWithCollection = async (
			collection: Record< string, unknown >
		) => {
			// A single stable object: setState bails out on an identical
			// value, so the dependency-less useEffect does not re-fetch
			// forever.
			const response = Promise.resolve( collection );
			mockedApiFetch.mockImplementation( () => response );

			const container = document.createElement( 'div' );
			document.body.appendChild( container );
			const root = createRoot( container );

			await act( async () => {
				root.render(
					<FeaturedCollection
						showImage={ true }
						showDescription={ true }
						collectionID={ 7 }
					/>
				);
			} );

			const alt = container
				.querySelector( 'img.wpm-featured-collection-image' )
				?.getAttribute( 'alt' );

			act( () => root.unmount() );
			container.remove();

			return alt;
		};

		it( "uses the collection's post_title", async () => {
			const alt = await renderWithCollection( {
				post_title: 'Fossil Casts',
				featured_image: [
					'https://example.test/fossils.jpg',
					300,
					200,
					true,
				],
			} );

			expect( alt ).toBe( 'Fossil Casts' );
		} );

		it( 'falls back to a generic alt when the title is empty', async () => {
			const alt = await renderWithCollection( {
				post_title: '',
				featured_image: [
					'https://example.test/fossils.jpg',
					300,
					200,
					true,
				],
			} );

			expect( alt ).toBe( 'Featured collection' );
		} );
	} );
} );
