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

import FeaturedCollection from '../../src/components/featured-collection/featured-collection';

jest.mock( '@wordpress/api-fetch', () => ( {
	__esModule: true,
	default: jest.fn( () => new Promise( () => undefined ) ),
} ) );

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
} );
