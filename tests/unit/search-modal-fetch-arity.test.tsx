/**
 * Regression test for how SearchBox calls its fetchSearchResults prop.
 *
 * Both implementations of that callback take four arguments and immediately
 * call the third, `updateLastRefresh( new Date() )`. SearchBox invoked it with
 * only two from the debounced typing path and from the title toggle, so both
 * threw `updateLastRefresh is not a function`:
 *
 *   - typing: the first keystroke takes the immediate branch, but any
 *     keystroke landing within refreshInterval of the last request is
 *     debounced and took the two-argument path;
 *   - toggling "only search titles" took it unconditionally.
 *
 * The object picker behind the collection, object-image and object-gallery
 * blocks is this component.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/132
 */
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import apiFetch from '@wordpress/api-fetch';

import { ObjectSearchBox, SearchBox } from '../../src/components';

jest.mock( '@wordpress/api-fetch', () => ( {
	__esModule: true,
	default: jest.fn( () => Promise.resolve( [] ) ),
} ) );

// SelectControl/ToggleControl emit WP's size and margin deprecation notices
// through console.warn, which @wordpress/jest-console turns into failures.
jest.mock( '@wordpress/deprecated', () => ( {
	__esModule: true,
	default: jest.fn(),
} ) );

/** The real implementations do exactly this, hence the TypeError. */
const realisticFetch = jest.fn(
	(
		_searchText: string,
		_onlyTitle: boolean,
		updateLastRefresh: ( refreshTime: Date ) => void,
		updateResults: ( results: never[] ) => void
	) => {
		updateLastRefresh( new Date() );
		updateResults( [] );
	}
);

const typeInto = ( element: HTMLInputElement, value: string ) => {
	const valueSetter = Object.getOwnPropertyDescriptor(
		window.HTMLInputElement.prototype,
		'value'
	)!.set!;
	valueSetter.call( element, value );
	element.dispatchEvent( new Event( 'input', { bubbles: true } ) );
};

describe( 'SearchBox fetchSearchResults calls', () => {
	let container: HTMLDivElement;
	let root: ReturnType< typeof createRoot >;

	const renderBox = async () =>
		await act( async () => {
			root.render(
				<SearchBox
					fetchSearchResults={ realisticFetch }
					close={ jest.fn() }
					returnCallback={ jest.fn() }
				/>
			);
		} );

	// Modal renders through a portal onto document.body, not into container.
	const searchInput = () =>
		document.querySelector( '#wpm-search-input' ) as HTMLInputElement;

	const titleToggle = () =>
		document.querySelector(
			'.wpm-search-box input[type="checkbox"]'
		) as HTMLInputElement;

	beforeEach( () => {
		jest.useFakeTimers();
		realisticFetch.mockClear();
		container = document.createElement( 'div' );
		document.body.appendChild( container );
		root = createRoot( container );
	} );

	afterEach( async () => {
		await act( async () => root.unmount() );
		container.remove();
		jest.useRealTimers();
	} );

	/**
	 * Fake timers freeze the clock, so lastRefresh is zero milliseconds old
	 * the instant the box mounts and even the first keystroke would debounce.
	 * Move past the interval to reach the immediate branch.
	 */
	const settle = async () =>
		await act( async () => {
			jest.advanceTimersByTime( 500 );
		} );

	it( 'passes all four arguments when searching immediately', async () => {
		await renderBox();
		await settle();

		await act( async () => typeInto( searchInput(), 'telescope' ) );

		expect( realisticFetch ).toHaveBeenCalled();
		expect( realisticFetch.mock.calls[ 0 ] ).toHaveLength( 4 );
		expect( typeof realisticFetch.mock.calls[ 0 ][ 2 ] ).toBe( 'function' );
		expect( typeof realisticFetch.mock.calls[ 0 ][ 3 ] ).toBe( 'function' );
	} );

	it( 'passes all four arguments from the debounced path', async () => {
		await renderBox();
		await settle();

		// This one goes out immediately and records a refresh time; the next
		// lands inside refreshInterval and is debounced.
		await act( async () => typeInto( searchInput(), 'tele' ) );
		realisticFetch.mockClear();
		await act( async () => typeInto( searchInput(), 'telescope' ) );

		expect( realisticFetch ).not.toHaveBeenCalled();

		await settle();

		expect( realisticFetch ).toHaveBeenCalledTimes( 1 );
		expect( realisticFetch.mock.calls[ 0 ] ).toHaveLength( 4 );
		expect( typeof realisticFetch.mock.calls[ 0 ][ 2 ] ).toBe( 'function' );
	} );

	it( 'does not throw when the debounced search fires', async () => {
		await renderBox();
		await settle();

		await act( async () => typeInto( searchInput(), 'tele' ) );
		await act( async () => typeInto( searchInput(), 'telescope' ) );

		expect( () =>
			act( () => {
				jest.advanceTimersByTime( 500 );
			} )
		).not.toThrow();
	} );

	it( 'passes all four arguments when the title toggle is flipped', async () => {
		await renderBox();
		await settle();

		await act( async () => typeInto( searchInput(), 'telescope' ) );
		realisticFetch.mockClear();

		const toggle = titleToggle();
		expect( toggle ).not.toBeNull();

		await act( async () => toggle.click() );

		expect( realisticFetch ).toHaveBeenCalledTimes( 1 );
		expect( realisticFetch.mock.calls[ 0 ] ).toHaveLength( 4 );
		expect( typeof realisticFetch.mock.calls[ 0 ][ 2 ] ).toBe( 'function' );
	} );

	it( 'does not search on a title toggle before anything has been typed', async () => {
		await renderBox();

		await act( async () => titleToggle().click() );

		// Previously this fired a request for the literal string "null".
		expect( realisticFetch ).not.toHaveBeenCalled();
	} );

	it( 'does not search for input below the minimum length', async () => {
		await renderBox();
		await settle();

		await act( async () => typeInto( searchInput(), 'te' ) );
		await settle();

		expect( realisticFetch ).not.toHaveBeenCalled();
	} );
} );

/**
 * The suite above supplies a stand-in for fetchSearchResults. This one wires
 * up the real ObjectSearchBox implementation — the one the blocks actually
 * use — with only apiFetch mocked, so the arity contract is checked end to
 * end rather than against a test double.
 */
describe( 'ObjectSearchBox', () => {
	let container: HTMLDivElement;
	let root: ReturnType< typeof createRoot >;

	const mockedApiFetch = apiFetch as unknown as jest.Mock;

	const searchInput = () =>
		document.querySelector( '#wpm-search-input' ) as HTMLInputElement;

	const titleToggle = () =>
		document.querySelector(
			'.wpm-search-box input[type="checkbox"]'
		) as HTMLInputElement;

	const settle = async () =>
		await act( async () => {
			jest.advanceTimersByTime( 500 );
		} );

	beforeEach( async () => {
		jest.useFakeTimers();
		mockedApiFetch.mockClear();
		mockedApiFetch.mockResolvedValue( [] );
		container = document.createElement( 'div' );
		document.body.appendChild( container );
		root = createRoot( container );
		await act( async () => {
			root.render(
				<ObjectSearchBox
					close={ jest.fn() }
					returnCallback={ jest.fn() }
				/>
			);
		} );
	} );

	afterEach( async () => {
		await act( async () => root.unmount() );
		container.remove();
		jest.useRealTimers();
	} );

	it( 'searches without throwing on the debounced path', async () => {
		await settle();
		await act( async () => typeInto( searchInput(), 'tele' ) );
		mockedApiFetch.mockClear();

		await act( async () => typeInto( searchInput(), 'telescope' ) );
		await settle();

		expect( mockedApiFetch ).toHaveBeenCalledTimes( 1 );
		expect( mockedApiFetch.mock.calls[ 0 ][ 0 ].path ).toContain(
			'telescope'
		);
	} );

	it( 'searches without throwing when the title toggle is flipped', async () => {
		await settle();
		await act( async () => typeInto( searchInput(), 'telescope' ) );
		mockedApiFetch.mockClear();

		await act( async () => titleToggle().click() );

		expect( mockedApiFetch ).toHaveBeenCalledTimes( 1 );
		// Toggling off "only title" switches from post_title to a full search.
		expect( mockedApiFetch.mock.calls[ 0 ][ 0 ].path ).toContain(
			's=telescope'
		);
	} );
} );
