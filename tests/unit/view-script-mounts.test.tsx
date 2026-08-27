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

describe( 'collection-objects view script', () => {
	it( 'mounts the search for the collection named in the data attribute', () => {
		markup(
			`<div class="wpm-collection-objects-block" data-post-ID="8" data-results-per-page="5"></div>`
		);

		loadViewScript( '../../src/blocks/collection-objects/front' );

		expect( mockRenders ).toHaveLength( 1 );
		const { props } = mockRenders[ 0 ].node as any;
		expect( props.postID ).toBe( 8 );
		expect( props.resultsPerPage ).toBe( 5 );
	} );

	it( 'leaves a container with no collection id alone', () => {
		markup( `<div class="wpm-collection-objects-block"></div>` );

		loadViewScript( '../../src/blocks/collection-objects/front' );

		expect( mockRenders ).toHaveLength( 0 );
	} );

	it( 'falls back to the default page size', () => {
		markup(
			`<div class="wpm-collection-objects-block" data-post-ID="8"></div>`
		);

		loadViewScript( '../../src/blocks/collection-objects/front' );

		expect( ( mockRenders[ 0 ].node as any ).props.resultsPerPage ).toBe(
			20
		);
	} );
} );

describe.each( [
	[
		'basic-search',
		'../../src/blocks/basic-search/front',
		'wpm-basic-search-block-frontend',
	],
	[
		'embedded-search',
		'../../src/blocks/embedded-search/front',
		'wpm-embedded-search-block-frontend',
	],
] )( '%s view script', ( _name, modulePath, className ) => {
	it( 'reads the block attributes off the data attribute', () => {
		markup(
			`<div class="${ className }" data-attributes='{"headerText":"Find","onlyTitle":"true"}'></div>`
		);

		loadViewScript( modulePath );

		expect( mockRenders ).toHaveLength( 1 );
		const { attributes } = ( mockRenders[ 0 ].node as any ).props;
		expect( attributes.headerText ).toBe( 'Find' );
		// attributesFromJSON turns the stringified booleans back into booleans.
		expect( attributes.onlyTitle ).toBe( true );
	} );

	it( 'mounts a block with no attributes, and the ones after it', () => {
		markup(
			`<div class="${ className }"></div>` +
				`<div class="${ className }" data-attributes='{"headerText":"Find"}'></div>`
		);

		loadViewScript( modulePath );

		// A JSON.parse throw here used to abandon the rest of the page.
		expect( mockRenders ).toHaveLength( 2 );
		expect( ( mockRenders[ 0 ].node as any ).props.attributes ).toEqual(
			{}
		);
	} );
} );
