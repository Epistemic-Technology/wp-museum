/**
 * Regression test for the object-type selector in AdvancedSearchUI.
 *
 * `selectedKind` was seeded from `kind_id` (a number) but SelectControl hands
 * its onChange a string, so after the user picked a type the strict lookup
 * `kindsData.find( item => item.kind_id === selectedKind )` matched nothing.
 * The effect then dereferenced the undefined result as
 * `selectedKindData!.type_name!` and threw a TypeError, taking the whole
 * search UI down instead of loading the chosen type's fields.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/134
 */
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import AdvancedSearchUI from '../../src/components/advanced-search-ui/advanced-search-ui';

import type { ObjectKind } from '../../src/types';

jest.mock( '@wordpress/api-fetch', () => ( {
	__esModule: true,
	default: jest.fn( () => Promise.resolve( [] ) ),
} ) );

// SelectControl calls deprecated() for WP's 36px-default-size and
// bottom-margin opt-ins. Those notices go through console.warn, which
// @wordpress/jest-console turns into a failure, and they are unrelated to
// what this file tests.
jest.mock( '@wordpress/deprecated', () => ( {
	__esModule: true,
	default: jest.fn(),
} ) );

const objectKind = ( kind_id: number, type_name: string, label: string ) =>
	( {
		kind_id,
		type_name,
		label,
		cat_field_id: null,
		name: label.toLowerCase(),
		label_plural: `${ label }s`,
		description: '',
		categorized: false,
		hierarchical: false,
		parent_kind_id: null,
		oai_pmh_mappings: {},
		available_fields_for_oai_pmh: [],
		children: [],
	} ) as unknown as ObjectKind;

const kindsData = [
	objectKind( 3, 'wpm_instrument', 'Instrument' ),
	objectKind( 7, 'wpm_painting', 'Painting' ),
];

/**
 * Set a <select>'s value the way a user would, so React's onChange fires.
 * Assigning `.value` directly is invisible to React's synthetic event system.
 */
const selectOption = ( element: HTMLSelectElement, value: string ) => {
	const valueSetter = Object.getOwnPropertyDescriptor(
		window.HTMLSelectElement.prototype,
		'value'
	)!.set!;
	valueSetter.call( element, value );
	element.dispatchEvent( new Event( 'change', { bubbles: true } ) );
};

describe( 'AdvancedSearchUI object type selector', () => {
	let container: HTMLDivElement;
	let root: ReturnType< typeof createRoot >;
	let getFieldData: jest.Mock;

	// Rendering kicks off the tags fetch and the field fetch, both of which
	// set state when they resolve; awaiting inside act() flushes them so the
	// updates are not reported as happening outside act.
	const renderUI = async ( kinds: ObjectKind[] = kindsData ) =>
		await act( async () => {
			root.render(
				<AdvancedSearchUI
					kindsData={ kinds }
					collectionData={ [] }
					getFieldData={ getFieldData }
					onSearch={ jest.fn() }
					showObjectType={ true }
				/>
			);
		} );

	beforeEach( () => {
		container = document.createElement( 'div' );
		document.body.appendChild( container );
		root = createRoot( container );
		getFieldData = jest.fn( () => Promise.resolve( {} ) );
	} );

	afterEach( async () => {
		await act( async () => root.unmount() );
		container.remove();
		window.history.pushState( {}, '', '/' );
	} );

	it( 'loads fields for the first kind on mount', async () => {
		await renderUI();
		expect( getFieldData ).toHaveBeenCalledWith( 'wpm_instrument' );
	} );

	it( 'loads fields for the kind the user picks', async () => {
		await renderUI();
		getFieldData.mockClear();

		const select = container.querySelector(
			'.advanced-search-object-type-select select'
		) as HTMLSelectElement;
		expect( select ).not.toBeNull();

		await act( async () => selectOption( select, '7' ) );

		expect( getFieldData ).toHaveBeenCalledWith( 'wpm_painting' );
	} );

	it( 'does not throw when the selected kind is not in kindsData', async () => {
		await renderUI();
		getFieldData.mockClear();

		// selectedKind stays 3 while kindsData no longer contains it —
		// previously a TypeError on `selectedKindData!.type_name!`.
		await expect(
			renderUI( [ objectKind( 99, 'wpm_ghost', 'Ghost' ) ] )
		).resolves.not.toThrow();
		expect( getFieldData ).not.toHaveBeenCalled();
	} );
} );
