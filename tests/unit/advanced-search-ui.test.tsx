/**
 * Regression tests for AdvancedSearchUI.
 *
 * The object-type selector: `selectedKind` was seeded from `kind_id` (a
 * number) but SelectControl hands its onChange a string, so after the user
 * picked a type the strict lookup
 * `kindsData.find( item => item.kind_id === selectedKind )` matched nothing.
 * The effect then dereferenced the undefined result as
 * `selectedKindData!.type_name!` and threw a TypeError, taking the whole
 * search UI down instead of loading the chosen type's fields.
 *
 * The date field and the Set Defaults button: a stored search of null parsed
 * to null and was then destructured, and the button called an optional prop
 * that the block does not have to supply.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/134
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/148
 */
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import AdvancedSearchUI from '../../src/components/advanced-search-ui/advanced-search-ui';

import type {
	MObjectField,
	ObjectFieldsResponse,
	ObjectKind,
} from '../../src/types';

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

const field = ( overrides: Partial< MObjectField > ): MObjectField =>
	( {
		field_id: 1,
		slug: 'a_field',
		kind_id: 3,
		name: 'A Field',
		type: 'plain',
		display_order: 0,
		public: true,
		required: false,
		quick_browse: false,
		help_text: '',
		detailed_instructions: '',
		public_description: '',
		field_schema: '',
		max_length: 0,
		dimensions: null,
		units: '',
		factors: [],
		...overrides,
	} ) as unknown as MObjectField;

const fieldData = {
	1: field( { field_id: 1, slug: 'maker', name: 'Maker' } ),
	2: field( { field_id: 2, slug: 'made', name: 'Date Made', type: 'date' } ),
} as unknown as ObjectFieldsResponse;

describe( 'AdvancedSearchUI date field', () => {
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
		window.history.pushState( {}, '', '/' );
	} );

	// A field row's search is null until something is typed into it, and
	// JSON.parse( null ) returns null rather than throwing, so destructuring
	// the parsed value took the whole search UI down the moment the row's
	// field was switched to a date.
	it( 'renders a date row whose search is null', async () => {
		await act( async () => {
			root.render(
				<AdvancedSearchUI
					kindsData={ kindsData }
					collectionData={ [] }
					getFieldData={ jest.fn( () => Promise.resolve( fieldData ) ) }
					onSearch={ jest.fn() }
					showFields={ true }
				/>
			);
		} );

		const fieldSelect = container.querySelector(
			'.field-search-element select'
		) as HTMLSelectElement;
		expect( fieldSelect ).not.toBeNull();

		await act( async () => selectOption( fieldSelect, 'made' ) );

		// The row now offers an empty from/to pair instead of throwing.
		const dateInputs = Array.from(
			container.querySelectorAll< HTMLInputElement >(
				'.field-search-element input[type="date"]'
			)
		);
		expect( dateInputs ).toHaveLength( 2 );
		dateInputs.forEach( ( input ) => expect( input.value ).toBe( '' ) );
	} );
} );

describe( 'AdvancedSearchUI editor controls', () => {
	let container: HTMLDivElement;
	let root: ReturnType< typeof createRoot >;

	const renderInEditor = async (
		setAttributes?: ( attributes: { defaultSearch: string } ) => void
	) =>
		await act( async () => {
			root.render(
				<AdvancedSearchUI
					kindsData={ kindsData }
					collectionData={ [] }
					getFieldData={ jest.fn( () => Promise.resolve( {} ) ) }
					onSearch={ jest.fn() }
					inEditor={ true }
					setAttributes={ setAttributes }
				/>
			);
		} );

	const buttonLabelled = ( label: string ) =>
		Array.from( container.querySelectorAll( 'button' ) ).find(
			( button ) => button.textContent?.trim() === label
		);

	beforeEach( () => {
		container = document.createElement( 'div' );
		document.body.appendChild( container );
		root = createRoot( container );
	} );

	afterEach( async () => {
		await act( async () => root.unmount() );
		container.remove();
		window.history.pushState( {}, '', '/' );
	} );

	it( 'saves the current search as the block default', async () => {
		const setAttributes = jest.fn();
		await renderInEditor( setAttributes );

		await act( async () =>
			buttonLabelled( 'Set Defaults' )!.dispatchEvent(
				new MouseEvent( 'click', { bubbles: true } )
			)
		);

		expect( setAttributes ).toHaveBeenCalledWith( {
			defaultSearch: expect.any( String ),
		} );
	} );

	it( 'offers no Set Defaults button when there is nothing to set', async () => {
		await renderInEditor( undefined );

		expect( buttonLabelled( 'Set Defaults' ) ).toBeUndefined();
		// The rest of the editor controls still render.
		expect( buttonLabelled( 'Reset Search' ) ).toBeDefined();
	} );
} );
