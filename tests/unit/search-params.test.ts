/**
 * Regression tests for the search blocks' REST parameters and pagination.
 *
 * `Objects_Controller::get_items()` (the /search callback) reads `per_page`
 * for the page size and returns paging in the `X-WP-Page` /
 * `X-WP-TotalPages` response headers. The blocks used to send
 * `posts_per_page` / `numberposts` — which only the unused
 * `do_advanced_search()` helper ever read — and to look for a `query_data`
 * key on the first result, which the controller never emits. The results per
 * page setting was therefore inert and pagination controls never appeared.
 *
 * The bootstrap tests cover the other half: `data-attributes` is absent when
 * `wp_json_encode()` fails in render.php, and `JSON.parse( undefined )`
 * throws, which took the whole view script down with it.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/147
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/148
 */
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import apiFetch from '@wordpress/api-fetch';

import AdvancedSearchFront from '../../src/blocks/advanced-search/front';

// The mock is kept on globalThis so that the view scripts loaded through
// jest.isolateModules() below (a fresh module registry re-runs this factory)
// share the one jest.fn the assertions read.
jest.mock( '@wordpress/api-fetch', () => ( {
	__esModule: true,
	default: ( ( globalThis as Record< string, any > ).__wpmApiFetchMock ??=
		jest.fn() ),
} ) );

const mockApiFetch = apiFetch as unknown as jest.Mock;

/** Minimal stand-in for the `parse: false` fetch Response. */
const restResponse = ( headers: Record< string, string >, body: unknown ) => ( {
	ok: true,
	status: 200,
	headers: {
		get: ( name: string ) => ( name in headers ? headers[ name ] : null ),
	},
	json: () => Promise.resolve( body ),
} );

interface ApiFetchOptions {
	path: string;
	data?: Record< string, unknown >;
	parse?: boolean;
}

/** Every /search call apiFetch received, most recent last. */
const searchCalls = (): ApiFetchOptions[] =>
	mockApiFetch.mock.calls
		.map( ( call ) => call[ 0 ] as ApiFetchOptions )
		.filter( ( options ) => options.path.endsWith( '/search' ) );

let container: HTMLDivElement;

beforeEach( () => {
	mockApiFetch.mockReset();
	container = document.createElement( 'div' );
	document.body.appendChild( container );
} );

afterEach( () => {
	document.body.innerHTML = '';
} );

describe( 'advanced search block front end', () => {
	beforeEach( () => {
		( globalThis as Record< string, unknown > ).IS_REACT_ACT_ENVIRONMENT =
			true;
	} );

	afterEach( () => {
		delete ( globalThis as Record< string, unknown > )
			.IS_REACT_ACT_ENVIRONMENT;
	} );

	const render = async ( searchHeaders: Record< string, string > ) => {
		mockApiFetch.mockImplementation( ( options: ApiFetchOptions ) => {
			if ( options.path.endsWith( '/search' ) ) {
				return Promise.resolve( restResponse( searchHeaders, [] ) );
			}
			// /collections and /mobject_kinds.
			return Promise.resolve( [] );
		} );

		await act( async () => {
			createRoot( container ).render(
				createElement( AdvancedSearchFront, {
					attributes: {
						fixSearch: true,
						runOnLoad: true,
						defaultSearch: JSON.stringify( {
							searchText: 'astrolabe',
						} ),
						resultsPerPage: 40,
						columns: 3,
					},
				} )
			);
		} );
	};

	it( 'sends the results per page setting as per_page', async () => {
		await render( { 'X-WP-Page': '1', 'X-WP-TotalPages': '1' } );

		const [ search ] = searchCalls();
		expect( search ).toBeDefined();
		expect( search.data ).toMatchObject( {
			searchText: 'astrolabe',
			per_page: 40,
		} );
		expect( search.data ).not.toHaveProperty( 'posts_per_page' );
		expect( search.data ).not.toHaveProperty( 'numberposts' );
	} );

	it( 'reads the page count from the X-WP-TotalPages header', async () => {
		await render( { 'X-WP-Page': '2', 'X-WP-TotalPages': '7' } );

		// withPagination only renders controls when totalPages > 1, and only
		// emits a jump-to-last-page button when totalPages exceeds the five
		// pages it shows inline.
		expect( container.innerHTML ).toContain( 'Go to page 7' );
		expect( container.innerHTML ).toContain( 'aria-current="page"' );
	} );

	it( 'renders no pagination when the response carries no paging headers', async () => {
		await render( {} );

		expect( container.innerHTML ).not.toContain( 'Pagination Navigation' );
	} );
} );

/**
 * Load a view script in its own module registry (its work happens at import
 * time) and let React commit the root it mounts.
 */
const bootstrap = async ( modulePath: string ) => {
	jest.isolateModules( () => {
		require( modulePath );
	} );
	// One turn for the fetch promise, one for the commit it schedules.
	await new Promise( ( resolve ) => setTimeout( resolve, 0 ) );
	await new Promise( ( resolve ) => setTimeout( resolve, 0 ) );
};

describe( 'basic search block front end', () => {
	it( 'sends per_page and paginates from the response headers', async () => {
		mockApiFetch.mockImplementation( () =>
			Promise.resolve(
				restResponse( { 'X-WP-Page': '3', 'X-WP-TotalPages': '9' }, [] )
			)
		);

		const element = document.createElement( 'div' );
		element.className = 'wpm-basic-search-block-frontend';
		element.dataset.attributes = JSON.stringify( {
			searchText: 'astrolabe',
			resultsPerPage: 40,
			columns: 3,
		} );
		container.appendChild( element );

		await bootstrap( '../../src/blocks/basic-search/front' );

		const [ search ] = searchCalls();
		expect( search ).toBeDefined();
		expect( search.data ).toMatchObject( {
			searchText: 'astrolabe',
			per_page: 40,
		} );
		expect( search.data ).not.toHaveProperty( 'numberposts' );
		expect( element.innerHTML ).toContain( 'Go to page 9' );
		// EmbeddedSearch's title toggle renders a CheckboxControl, which emits
		// an upstream margin-bottom deprecation notice.
		expect( console ).toHaveWarned();
	} );

	// withPagination mutates and re-submits the object it is handed as
	// `searchParams`. EmbeddedSearch builds a *fresh* params object for every
	// search, so unless onSearch promotes what it searched to current state,
	// paging re-submits the mount-time object — whose searchText is '' — and
	// the block falls into the no-search branch that clears the results.
	it( 'pages a user-entered search instead of blanking it', async () => {
		mockApiFetch.mockImplementation( () =>
			Promise.resolve(
				restResponse( { 'X-WP-Page': '1', 'X-WP-TotalPages': '4' }, [] )
			)
		);

		const element = document.createElement( 'div' );
		element.className = 'wpm-basic-search-block-frontend';
		element.dataset.attributes = JSON.stringify( {
			searchText: '',
			resultsPerPage: 20,
			columns: 3,
		} );
		container.appendChild( element );

		// The view script mounts its own root, so drive it through the DOM and
		// let React commit between steps, as the bootstrap tests above do.
		await bootstrap( '../../src/blocks/basic-search/front' );
		expect( searchCalls() ).toHaveLength( 0 );

		const settle = async () => {
			await new Promise( ( resolve ) => setTimeout( resolve, 0 ) );
			await new Promise( ( resolve ) => setTimeout( resolve, 0 ) );
		};

		// Type into the box and search, the way a visitor does.
		const input = element.querySelector(
			'input[type="text"]'
		) as HTMLInputElement;
		const setValue = Object.getOwnPropertyDescriptor(
			window.HTMLInputElement.prototype,
			'value'
		)!.set!;
		setValue.call( input, 'astrolabe' );
		input.dispatchEvent( new Event( 'input', { bubbles: true } ) );
		await settle();

		(
			element.querySelector(
				'.wpm-embedded-search-button'
			) as HTMLButtonElement
		 ).click();
		await settle();

		expect( searchCalls() ).toHaveLength( 1 );
		expect( element.innerHTML ).toContain( 'Go to page 4' );

		const pageTwo = Array.from( element.querySelectorAll( 'button' ) ).find(
			( button ) =>
				button.getAttribute( 'aria-label' ) === 'Go to page 2'
		);
		expect( pageTwo ).toBeDefined();
		pageTwo!.click();
		await settle();

		const calls = searchCalls();
		expect( calls ).toHaveLength( 2 );
		expect( calls[ 1 ].data ).toMatchObject( {
			searchText: 'astrolabe',
			page: 2,
			per_page: 20,
		} );
		// The results (and therefore the controls) survive the page change.
		expect( element.innerHTML ).toContain( 'Go to page 4' );
		expect( console ).toHaveWarned();
	} );
} );

describe( 'view script bootstrap without data-attributes', () => {
	beforeEach( () => {
		mockApiFetch.mockImplementation( () => new Promise( () => undefined ) );
	} );

	it( 'mounts the basic search block', async () => {
		const element = document.createElement( 'div' );
		element.className = 'wpm-basic-search-block-frontend';
		container.appendChild( element );

		await bootstrap( '../../src/blocks/basic-search/front' );

		expect( element.innerHTML ).toContain( 'wpm-basic-search-block' );
		// EmbeddedSearch's title toggle renders a CheckboxControl, which emits
		// an upstream margin-bottom deprecation notice.
		expect( console ).toHaveWarned();
	} );

	it( 'mounts the embedded search block', async () => {
		const element = document.createElement( 'div' );
		element.className = 'wpm-embedded-search-block-frontend';
		container.appendChild( element );

		await bootstrap( '../../src/blocks/embedded-search/front' );

		expect( element.innerHTML ).toContain( 'wpm-embedded-search-block' );
	} );
} );
