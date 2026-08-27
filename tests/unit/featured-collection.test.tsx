/**
 * Regression test for FeaturedCollection's hook imports.
 *
 * useState and useEffect were imported from @wordpress/components, which does
 * not export them. Both were undefined at runtime, so calling either threw a
 * TypeError the instant the component rendered.
 *
 * Also covers the image alt text, which read `title` — a key the collections
 * wire shape has never carried — so every collection image fell back to the
 * generic 'Featured collection' string.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/130
 */
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { renderToStaticMarkup } from 'react-dom/server';

import apiFetch from '@wordpress/api-fetch';

import FeaturedCollection from '../../src/components/featured-collection/featured-collection';

jest.mock( '@wordpress/api-fetch', () => ( {
	__esModule: true,
	default: jest.fn( () => new Promise( () => undefined ) ),
} ) );

const mockedApiFetch = apiFetch as unknown as jest.Mock;

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

	describe( 'once collection data arrives', () => {
		let container: HTMLDivElement;
		let root: ReturnType< typeof createRoot >;

		beforeEach( () => {
			container = document.createElement( 'div' );
			document.body.appendChild( container );
			root = createRoot( container );
		} );

		afterEach( async () => {
			await act( async () => root.unmount() );
			container.remove();
			mockedApiFetch.mockReset();
		} );

		const renderWith = async ( collection: Record< string, unknown > ) => {
			mockedApiFetch.mockImplementation( () =>
				Promise.resolve( collection )
			);
			await act( async () => {
				root.render(
					<FeaturedCollection
						showImage={ true }
						showDescription={ true }
						collectionID={ 7 }
					/>
				);
			} );
			return container.querySelector(
				'.wpm-featured-collection-image'
			) as HTMLImageElement;
		};

		it( 'takes the image alt from post_title', async () => {
			const image = await renderWith( {
				post_title: 'Fossils',
				featured_image: [ 'http://example.org/f.jpg', 300, 200, true ],
			} );

			expect( image ).not.toBeNull();
			expect( image.getAttribute( 'alt' ) ).toBe( 'Fossils' );
		} );

		it( 'falls back to a generic alt when there is no title', async () => {
			const image = await renderWith( {
				post_title: '',
				featured_image: [ 'http://example.org/f.jpg', 300, 200, true ],
			} );

			expect( image.getAttribute( 'alt' ) ).toBe( 'Featured collection' );
		} );

		it( 'fetches once per collection rather than on every render', async () => {
			mockedApiFetch.mockImplementation( () =>
				Promise.resolve( { post_title: 'Fossils' } )
			);
			const element = (
				<FeaturedCollection
					showImage={ true }
					showDescription={ true }
					collectionID={ 7 }
				/>
			);

			await act( async () => root.render( element ) );
			await act( async () => root.render( element ) );

			expect( mockedApiFetch ).toHaveBeenCalledTimes( 1 );
		} );
	} );
} );
