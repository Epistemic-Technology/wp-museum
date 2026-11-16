/**
 * Tests for the block view scripts' handling of missing data attributes.
 *
 * Each of these modules runs on import: it walks the elements its block
 * rendered and mounts a React root on each one, reading the block's data out
 * of `dataset`. The attributes are written by the block's render.php, but the
 * container can also be hand-written into a theme template or survive in
 * cached markup from an older version — in which case the scripts used to
 * mount a component around `NaN`, or throw out of `JSON.parse` and abandon
 * every remaining block on the page.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/148
 */
const mockRenders: { element: Element; node: unknown }[] = [];

jest.mock( '@wordpress/element', () => {
	const actual = jest.requireActual( '@wordpress/element' );
	return {
		...actual,
		createRoot: ( element: Element ) => ( {
			render: ( node: unknown ) => {
				mockRenders.push( { element, node } );
			},
			unmount: () => undefined,
		} ),
	};
} );

const loadViewScript = ( modulePath: string ) => {
	jest.isolateModules( () => {
		require( modulePath );
	} );
};

const markup = ( html: string ) => {
	document.body.innerHTML = html;
};

beforeEach( () => {
	mockRenders.length = 0;
	document.body.innerHTML = '';
} );

describe( 'object-meta view script', () => {
	it( 'mounts the gallery for the post named in the data attribute', () => {
		markup(
			`<div class="wpm-objectposttype-image-gallery" data-post-ID="12"></div>`
		);

		loadViewScript( '../../src/blocks/object-meta/front' );

		expect( mockRenders ).toHaveLength( 1 );
		expect( ( mockRenders[ 0 ].node as any ).props.postId ).toBe( 12 );
	} );

	it( 'leaves a container with no post id alone', () => {
		markup( `<div class="wpm-objectposttype-image-gallery"></div>` );

		loadViewScript( '../../src/blocks/object-meta/front' );

		// Mounting would have asked the REST API for post NaN.
		expect( mockRenders ).toHaveLength( 0 );
	} );
} );
