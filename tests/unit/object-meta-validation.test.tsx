/**
 * Tests for the object-meta block's field validation.
 *
 * The validate-everything pass iterated `Object.entries( fieldData )` and
 * handed each `[ key, value ]` tuple to a function that expected the field
 * object, so `slug`, `required`, `name` and `field_schema` were all undefined
 * and every check was a silent no-op: a required field left empty was never
 * flagged.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/133
 */
import { renderToStaticMarkup } from 'react-dom/server';

import {
	allFieldErrors,
	fieldError,
} from '../../src/blocks/object-meta/validation';

import type { MObjectField, ObjectFieldsResponse } from '../../src/types';

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
	} ) as MObjectField;

const textOf = ( error: ReturnType< typeof fieldError > ) =>
	error === null ? null : renderToStaticMarkup( <>{ error }</> );

describe( 'fieldError', () => {
	it( 'flags a required field with no value', () => {
		expect( textOf( fieldError( field( { required: true } ), '' ) ) ).toContain(
			'required'
		);
	} );

	it( 'flags a required field whose value is undefined', () => {
		expect(
			textOf( fieldError( field( { required: true } ), undefined ) )
		).toContain( 'required' );
	} );

	it( 'accepts a required field that has a value', () => {
		expect( fieldError( field( { required: true } ), 'Zeiss' ) ).toBeNull();
	} );

	it( 'accepts an optional field with no value', () => {
		expect( fieldError( field( { required: false } ), '' ) ).toBeNull();
	} );

	it( 'does not throw on a field_schema that is not a valid regex', () => {
		expect( () =>
			fieldError( field( { field_schema: '([unclosed' } ), 'anything' )
		).not.toThrow();
	} );
} );

describe( 'allFieldErrors', () => {
	const fieldData = {
		one: field( { slug: 'maker', name: 'Maker', required: true } ),
		two: field( { slug: 'year', name: 'Year', required: true } ),
		three: field( { slug: 'notes', name: 'Notes', required: false } ),
	} as unknown as ObjectFieldsResponse;

	it( 'keys its result by field slug, not by the fieldData key', () => {
		const errors = allFieldErrors( fieldData, {} );

		expect( Object.keys( errors ).sort() ).toEqual( [
			'maker',
			'notes',
			'year',
		] );
	} );

	it( 'reports every empty required field, not just one of them', () => {
		const errors = allFieldErrors( fieldData, {} );

		expect( textOf( errors.maker ) ).toContain( 'required' );
		expect( textOf( errors.year ) ).toContain( 'required' );
		expect( errors.notes ).toBeNull();
	} );

	it( 'clears the error for a required field once it has a value', () => {
		const errors = allFieldErrors( fieldData, { maker: 'Zeiss' } );

		expect( errors.maker ).toBeNull();
		expect( textOf( errors.year ) ).toContain( 'required' );
	} );

	it( 'reports nothing when every required field is filled in', () => {
		const errors = allFieldErrors( fieldData, {
			maker: 'Zeiss',
			year: 1923,
		} );

		expect( Object.values( errors ).every( ( e ) => e === null ) ).toBe( true );
	} );
} );
