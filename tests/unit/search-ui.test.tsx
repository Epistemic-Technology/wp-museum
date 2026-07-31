/**
 * Regression tests for the advanced-search UI and the search modal.
 *
 * Two pre-existing bugs are covered here:
 *
 * 1. AdvancedSearchUI looked its selected kind up with
 *    `kindItem.kind_id === selectedKind`. kind_id is an integer (see the
 *    'kind_id' schema entry in src/rest/class-kinds-controller.php) while
 *    SelectControl's onChange always hands back a string, so the lookup found
 *    nothing after the user picked a kind and the following non-null
 *    assertion threw — the field list never updated.
 *
 * 2. SearchBox called fetchSearchResults with two arguments in the delayed
 *    (setTimeout) path, while both implementations dereference the
 *    updateLastRefresh and updateResults callbacks, so the debounced search
 *    threw a TypeError and results never arrived.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/147
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/148
 */
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import AdvancedSearchUI from '../../src/components/advanced-search-ui/advanced-search-ui';
import { SearchBox } from '../../src/components/search-modal/search-modal';

import type { ObjectKind } from '../../src/types';

jest.mock( '@wordpress/api-fetch', () => ( {
	__esModule: true,
	default: jest.fn( () => new Promise( () => undefined ) ),
} ) );

// SelectControl and ToggleControl emit deprecation notices for their default
// sizing props, which @wordpress/jest-console turns into test failures.
jest.mock( '@wordpress/deprecated', () => ( {
	__esModule: true,
	default: jest.fn(),
} ) );

( global as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean } ).IS_REACT_ACT_ENVIRONMENT =
	true;

const kind = ( kindId: number, typeName: string, label: string ): ObjectKind =>
	( {
		kind_id: kindId,
		type_name: typeName,
		label,
		label_plural: label + 's',
	} as unknown as ObjectKind );

/** Set an input/select value the way a user would, so React sees the change. */
const setNativeValue = ( element: HTMLElement, value: string ) => {
	const prototype =
		element instanceof HTMLSelectElement
			? HTMLSelectElement.prototype
			: HTMLInputElement.prototype;
	const setter = Object.getOwnPropertyDescriptor( prototype, 'value' )?.set;
	setter?.call( element, value );
};

let container: HTMLDivElement;
let root: Root;

beforeEach( () => {
	container = document.createElement( 'div' );
	document.body.appendChild( container );
	root = createRoot( container );
} );

afterEach( () => {
	act( () => root.unmount() );
	container.remove();
} );

describe( 'AdvancedSearchUI kind selection', () => {
	const kindsData = [
		kind( 1, 'wpm_instrument', 'Instrument' ),
		kind( 2, 'wpm_book', 'Book' ),
	];

	const renderUI = ( getFieldData: jest.Mock ) =>
		act( async () => {
			root.render(
				<AdvancedSearchUI
					showObjectType={ true }
					getFieldData={ getFieldData }
					kindsData={ kindsData }
					collectionData={ [] }
					onSearch={ () => undefined }
				/>
			);
		} );

	it( 'loads fields for the first kind before anything is selected', async () => {
		const getFieldData = jest.fn( () => Promise.resolve( {} ) );

		await renderUI( getFieldData );

		expect( getFieldData ).toHaveBeenCalledWith( 'wpm_instrument' );
	} );

	it( 'loads fields for a kind the user picks from the select', async () => {
		const getFieldData = jest.fn( () => Promise.resolve( {} ) );

		await renderUI( getFieldData );
		getFieldData.mockClear();

		const select = container.querySelector(
			'.advanced-search-object-type select'
		) as HTMLSelectElement;
		expect( select ).not.toBeNull();

		await act( async () => {
			setNativeValue( select, '2' );
			select.dispatchEvent( new Event( 'change', { bubbles: true } ) );
		} );

		// The select hands back the string '2'; the lookup must still find
		// kind_id 2 and fetch that kind's fields.
		expect( getFieldData ).toHaveBeenCalledWith( 'wpm_book' );
	} );
} );

describe( 'SearchBox debounced fetch', () => {
	beforeEach( () => {
		jest.useFakeTimers();
	} );

	afterEach( () => {
		jest.useRealTimers();
	} );

	it( 'passes the refresh and results callbacks on the delayed search', () => {
		const fetchSearchResults = jest.fn();

		act( () => {
			root.render(
				<SearchBox
					fetchSearchResults={ fetchSearchResults }
					close={ () => undefined }
					returnCallback={ () => undefined }
				/>
			);
		} );

		const input = document.body.querySelector(
			'#wpm-search-input'
		) as HTMLInputElement;
		expect( input ).not.toBeNull();

		act( () => {
			setNativeValue( input, 'tel' );
			input.dispatchEvent( new Event( 'change', { bubbles: true } ) );
		} );

		// Nothing fires immediately: the modal has just mounted, so the last
		// refresh is more recent than refreshInterval.
		expect( fetchSearchResults ).not.toHaveBeenCalled();

		act( () => {
			jest.advanceTimersByTime( 500 );
		} );

		expect( fetchSearchResults ).toHaveBeenCalledTimes( 1 );
		const [ searchText, onlyTitle, updateLastRefresh, updateResults ] =
			fetchSearchResults.mock.calls[ 0 ];
		expect( searchText ).toBe( 'tel' );
		expect( onlyTitle ).toBe( true );
		expect( typeof updateLastRefresh ).toBe( 'function' );
		expect( typeof updateResults ).toBe( 'function' );

		// The results callback the delayed search receives really does drive
		// the results list.
		act( () => {
			updateResults( [ { ID: 12, post_title: 'Telescope' } ] );
		} );

		expect( document.body.textContent ).toContain( 'Telescope' );
	} );

	it( 'refreshes results when the title-only toggle is flipped', () => {
		const fetchSearchResults = jest.fn();

		act( () => {
			root.render(
				<SearchBox
					fetchSearchResults={ fetchSearchResults }
					close={ () => undefined }
					returnCallback={ () => undefined }
				/>
			);
		} );

		const input = document.body.querySelector(
			'#wpm-search-input'
		) as HTMLInputElement;

		act( () => {
			setNativeValue( input, 'tel' );
			input.dispatchEvent( new Event( 'change', { bubbles: true } ) );
		} );
		fetchSearchResults.mockClear();

		const toggle = document.body.querySelector(
			'.toggle-control input[type="checkbox"]'
		) as HTMLInputElement;
		expect( toggle ).not.toBeNull();

		act( () => {
			toggle.click();
		} );

		expect( fetchSearchResults ).toHaveBeenCalledTimes( 1 );
		const call = fetchSearchResults.mock.calls[ 0 ];
		expect( call[ 0 ] ).toBe( 'tel' );
		expect( call[ 1 ] ).toBe( false );
		expect( typeof call[ 2 ] ).toBe( 'function' );
		expect( typeof call[ 3 ] ).toBe( 'function' );
	} );
} );
