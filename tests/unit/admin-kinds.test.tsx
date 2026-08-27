/**
 * Tests for the admin kinds/fields screens' handling of kinds that have no
 * id yet.
 *
 * `ObjectKind.kind_id` is the database primary key, so it is always present
 * on a kind that came back from the REST API — but the wire type allows null
 * (an unsaved kind has no id), and both screens used to assume otherwise:
 *
 * - objects/edit.tsx built a new field with `kind_id: kindId as number`. An
 *   unsaved kind also has no `type_name`, and every fields request
 *   interpolates it into the path, so adding a field addressed
 *   `/wp-museum/v1/null/fields` instead of being rejected up front.
 * - oai-pmh/index.tsx auto-selected the first kind with
 *   `kind_id!.toString()`, which throws a TypeError on a null id.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/148
 */
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import apiFetch from '@wordpress/api-fetch';

import Edit from '../../src/admin-react/src/objects/edit';
import OaiPmhAdmin from '../../src/admin-react/src/oai-pmh';

import type { ObjectKind } from '../../src/types';

jest.mock( '@wordpress/api-fetch', () => ( {
	__esModule: true,
	default: jest.fn(),
} ) );

const mockedApiFetch = apiFetch as unknown as jest.Mock;

declare const global: { IS_REACT_ACT_ENVIRONMENT?: boolean };

const objectKind = ( overrides: Partial< ObjectKind > = {} ): ObjectKind =>
	( {
		kind_id: 5,
		cat_field_id: null,
		name: 'thing',
		type_name: 'wpm_thing',
		label: 'Thing',
		label_plural: 'Things',
		description: null,
		categorized: false,
		hierarchical: false,
		parent_kind_id: null,
		oai_pmh_mappings: {},
		available_fields_for_oai_pmh: [],
		children: [],
		...overrides,
	} as unknown as ObjectKind );

const render = async ( element: React.ReactElement ) => {
	const container = document.createElement( 'div' );
	document.body.appendChild( container );
	const root = createRoot( container );
	await act( async () => {
		root.render( element );
	} );
	return {
		container,
		unmount: () => act( () => root.unmount() ),
	};
};

const click = async ( container: HTMLElement, label: string ) => {
	const button = Array.from( container.querySelectorAll( 'button' ) ).find(
		( candidate ) => candidate.textContent?.trim() === label
	);
	if ( ! button ) {
		throw new Error( `No button labelled "${ label }"` );
	}
	await act( async () => {
		button.dispatchEvent( new MouseEvent( 'click', { bubbles: true } ) );
	} );
};

const postCalls = () =>
	mockedApiFetch.mock.calls
		.map( ( [ options ] ) => options )
		.filter( ( options ) => options?.method === 'POST' );

const editProps = {
	kinds: [],
	updateKind: () => undefined,
	saveKindData: () => undefined,
};

beforeEach( () => {
	global.IS_REACT_ACT_ENVIRONMENT = true;
	// jsdom does not implement scrollIntoView, which addField() calls on the
	// row it just inserted.
	Element.prototype.scrollIntoView = jest.fn();
	mockedApiFetch.mockReset();
	// GET fields responds with no fields; POSTs succeed.
	mockedApiFetch.mockImplementation( ( options: { method?: string } ) =>
		Promise.resolve( options?.method === 'POST' ? true : {} )
	);
} );

afterEach( () => {
	document.body.innerHTML = '';
} );

describe( 'Edit — adding a field', () => {
	it( 'stamps the new field with the kind it belongs to', async () => {
		const { container, unmount } = await render(
			<Edit kindItem={ objectKind() } { ...editProps } />
		);

		await click( container, 'Add New Field' );

		expect( postCalls() ).toHaveLength( 1 );
		const [ post ] = postCalls();
		expect( post.path ).toBe( '/wp-museum/v1/wpm_thing/fields' );
		const newFields = Object.values(
			post.data as Record< string, { kind_id: number } >
		);
		expect( newFields ).toHaveLength( 1 );
		expect( newFields[ 0 ].kind_id ).toBe( 5 );

		await unmount();
	} );

	it( 'refuses to add a field to a kind that has not been saved yet', async () => {
		const { container, unmount } = await render(
			<Edit
				kindItem={ objectKind( { kind_id: null, type_name: null } ) }
				{ ...editProps }
			/>
		);

		await click( container, 'Add New Field' );

		// Nothing is sent — without a type_name the request would be
		// addressed to `/null/fields`.
		expect( postCalls() ).toHaveLength( 0 );
		expect( container.textContent ).toContain(
			'Save this object type before adding fields'
		);

		await unmount();
	} );

	it( 'does not fetch fields for a kind with no post type', async () => {
		const { unmount } = await render(
			<Edit
				kindItem={ objectKind( { kind_id: null, type_name: null } ) }
				{ ...editProps }
			/>
		);

		expect( mockedApiFetch ).not.toHaveBeenCalled();

		await unmount();
	} );
} );

describe( 'OAI-PMH admin — kind selection', () => {
	it( 'auto-selects the first kind', async () => {
		mockedApiFetch.mockImplementation( () =>
			Promise.resolve( [ objectKind( { kind_id: 7 } ) ] )
		);

		const { container, unmount } = await render( <OaiPmhAdmin /> );

		const select = container.querySelector(
			'#kind-select'
		) as HTMLSelectElement;
		expect( select.value ).toBe( '7' );

		await unmount();
	} );

	it( 'selects nothing, and does not error, for a kind with no id', async () => {
		mockedApiFetch.mockImplementation( () =>
			Promise.resolve( [ objectKind( { kind_id: null } ) ] )
		);

		const { container, unmount } = await render( <OaiPmhAdmin /> );

		const select = container.querySelector(
			'#kind-select'
		) as HTMLSelectElement;
		expect( select.value ).toBe( '' );
		expect( container.textContent ).not.toContain( 'Failed to load kinds' );

		await unmount();
	} );
} );
