/**
 * Tests for how AdvancedSearchUI seeds `selectedKind`.
 *
 * The effect that picks the first kind spreads the render's `searchValues`
 * rather than updating from the current state. On mount that closure is the
 * initial `{}`, so if `kindsData` is already populated on the first render the
 * effect runs in the same commit as the one that restores the URL/default
 * search and overwrites everything it just set.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/153
 */
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import AdvancedSearchUI from '../../src/components/advanced-search-ui/advanced-search-ui';

import type { ObjectKind } from '../../src/types';

jest.mock( '@wordpress/api-fetch', () => ( {
	__esModule: true,
	default: jest.fn( () => Promise.resolve( [] ) ),
} ) );

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

describe( 'AdvancedSearchUI seeding selectedKind', () => {
	let container: HTMLDivElement;
	let root: ReturnType< typeof createRoot >;

	const render = async ( kinds: ObjectKind[] ) =>
		await act( async () => {
			root.render(
				<AdvancedSearchUI
					kindsData={ kinds }
					collectionData={ [] }
					getFieldData={ jest.fn( () => Promise.resolve( {} ) ) }
					onSearch={ jest.fn() }
					defaultSearch={ JSON.stringify( {
						searchText: 'astrolabe',
						onlyTitle: true,
					} ) }
				/>
			);
		} );

	const searchInputValue = () =>
		(
			container.querySelector(
				'.advanced-search-text-input input, input[type="text"]'
			) as HTMLInputElement | null
		 )?.value;

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

	// The real callers fetch kinds after mounting, which is what hides the
	// staleness: by the time the effect runs, its closure has the restored
	// search in it.
	it( 'keeps the default search when kinds arrive after mount', async () => {
		await render( [] );
		await render( kindsData );

		expect( searchInputValue() ).toBe( 'astrolabe' );
	} );

	it( 'keeps the default search when kinds are there on the first render', async () => {
		await render( kindsData );

		expect( searchInputValue() ).toBe( 'astrolabe' );
	} );
} );
