/**
 * Tests for field validation in the object-meta block.
 *
 * checkAllFields() iterated Object.entries() of the fields response and passed
 * each [ field_id, field ] tuple to checkField(), which destructures `slug`,
 * `required` and `field_schema` off it — so every property was undefined and
 * no field was ever validated on load. These tests cover the per-field rule
 * and the fact that every field in the response is now checked.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/147
 */
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { renderToStaticMarkup } from 'react-dom/server';

import ObjectMetaEdit, { getFieldError } from '../../src/blocks/object-meta/edit';

import type { MObjectField } from '../../src/types';

const postId = 12;

const field = ( overrides: Partial< MObjectField > ): MObjectField =>
	( {
		field_id: 1,
		slug: 'a_field',
		kind_id: 1,
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
	} as MObjectField );

// The fields the mocked REST endpoint returns, keyed by field_id the way
// Object_Fields_Controller serializes them.
const mockFieldsResponse = {
	'1': field( {
		field_id: 1,
		slug: 'accession_number',
		name: 'Accession Number',
		required: true,
	} ),
	'2': field( {
		field_id: 2,
		slug: 'description',
		name: 'Description',
		required: false,
	} ),
	'3': field( { field_id: 3, slug: 'maker', name: 'Maker', required: true } ),
};

const mockObjectResponse = {
	ID: postId,
	post_title: 'An Object',
	post_type: 'wpm_instrument',
	// No catalogue-ID field, so the uniqueness request is not made.
	cat_field: null,
};

jest.mock( '@wordpress/api-fetch', () => ( {
	__esModule: true,
	default: jest.fn( ( { path }: { path: string } ) => {
		if ( path.endsWith( '/fields' ) ) {
			return Promise.resolve( mockFieldsResponse );
		}
		if ( path.includes( '/all/' ) ) {
			return Promise.resolve( mockObjectResponse );
		}
		return Promise.resolve( [] );
	} ),
} ) );

jest.mock( '@wordpress/data', () => ( {
	__esModule: true,
	useSelect: ( mapSelect: ( select: ( store: string ) => unknown ) => unknown ) =>
		mapSelect( () => ( {
			getCurrentPostType: () => 'wpm_instrument',
			getCurrentPostId: () => postId,
			isSavingPost: () => false,
			getEditedPostAttribute: () => 'draft',
		} ) ),
	useDispatch: () => ( {
		createErrorNotice: jest.fn(),
		lockPostSaving: jest.fn(),
		unlockPostSaving: jest.fn(),
	} ),
} ) );

jest.mock( '@wordpress/block-editor', () => {
	const react = require( 'react' );
	return {
		__esModule: true,
		useBlockProps: () => ( { className: 'object-meta-block' } ),
		InspectorControls: ( { children }: { children?: unknown } ) =>
			react.createElement( 'div', null, children ),
		RichText: ( { value }: { value?: string } ) =>
			react.createElement( 'div', { contentEditable: true }, value ),
		__experimentalLinkControl: () => null,
	};
} );

jest.mock( '@wordpress/components', () => {
	const react = require( 'react' );
	const passthrough =
		( tag: string ) =>
		( { children }: { children?: unknown } ) =>
			react.createElement( tag, null, children );
	return {
		__esModule: true,
		PanelBody: passthrough( 'div' ),
		Popover: passthrough( 'div' ),
		Button: passthrough( 'button' ),
		CheckboxControl: () => react.createElement( 'input', { type: 'checkbox' } ),
		SelectControl: () => react.createElement( 'select' ),
		TextControl: () => react.createElement( 'input' ),
	};
} );

describe( 'getFieldError', () => {
	it( 'reports a required field that has no value', () => {
		const error = getFieldError( field( { required: true } ), '' );
		expect( error ).not.toBeNull();
		expect(
			renderToStaticMarkup( error as React.ReactElement )
		).toContain( 'Field is required but empty' );
	} );

	it( 'accepts a required field that has a value', () => {
		expect( getFieldError( field( { required: true } ), 'A value' ) ).toBeNull();
	} );

	it( 'accepts an optional field that is empty', () => {
		expect( getFieldError( field( { required: false } ), '' ) ).toBeNull();
		expect(
			getFieldError( field( { required: false } ), undefined )
		).toBeNull();
	} );

	it( 'does not throw on a field whose stored schema is not a valid regex', () => {
		expect( () =>
			getFieldError( field( { field_schema: '[0-9' } ), 'anything' )
		).not.toThrow();
	} );
} );

describe( 'ObjectMetaEdit field validation on load', () => {
	let container: HTMLDivElement;

	beforeEach( () => {
		( global as any ).IS_REACT_ACT_ENVIRONMENT = true;
		container = document.createElement( 'div' );
		document.body.appendChild( container );
	} );

	afterEach( () => {
		container.remove();
	} );

	const rowFor = ( label: string ) =>
		Array.from(
			container.querySelectorAll< HTMLElement >( '.object-meta-row' )
		).find( ( row ) =>
			row
				.querySelector( '.object-meta-label' )
				?.textContent?.startsWith( label )
		);

	const mount = async ( attributes: Record< string, unknown > ) => {
		await act( async () => {
			createRoot( container ).render(
				<ObjectMetaEdit
					attributes={ attributes }
					setAttributes={ () => undefined }
				/>
			);
		} );
		// Let the fields and object requests resolve.
		await act( async () => undefined );
	};

	it( 'flags every required field that is empty, not just the first', async () => {
		await mount( {
			accession_number: '',
			description: '',
			maker: '',
		} );

		expect( rowFor( 'Accession Number' )?.textContent ).toContain(
			'Field is required but empty'
		);
		expect( rowFor( 'Maker' )?.textContent ).toContain(
			'Field is required but empty'
		);
	} );

	it( 'leaves optional and filled-in fields alone', async () => {
		await mount( {
			accession_number: 'X.1',
			description: '',
			maker: 'Negretti & Zambra',
		} );

		expect( container.textContent ).not.toContain(
			'Field is required but empty'
		);
		expect( container.querySelectorAll( '.has-error' ) ).toHaveLength( 0 );
	} );
} );
