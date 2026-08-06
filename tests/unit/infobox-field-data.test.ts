/**
 * Tests for the object-infobox field formatting.
 *
 * Flag fields were formatted by a branch testing `type === 'tinyint'` against
 * a value of `1`. Neither is real: 'tinyint' was renamed to 'flag' by a
 * database upgrade (see database-upgrade.php), and flags arrive as JSON
 * booleans. The branch never matched, so the raw boolean was stored in the
 * block's fieldData attribute and the front end — which escapes and echoes
 * whatever is saved there — printed "1" for true and nothing at all for
 * false.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/143
 */
import { processFieldData } from '../../src/blocks/object-infobox/field-data';

import type { MObjectField, MuseumObject } from '../../src/types';

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

const object = ( values: Record< string, unknown > ) =>
	values as unknown as MuseumObject;

describe( 'processFieldData', () => {
	it( 'renders a set flag as Yes', () => {
		const result = processFieldData(
			object( { on_display: true } ),
			{ f1: field( { slug: 'on_display', name: 'On Display', type: 'flag' } ) },
			{}
		);

		expect( result.fieldData!.f1.content ).toBe( 'Yes' );
	} );

	it( 'renders an unset flag as No', () => {
		const result = processFieldData(
			object( { on_display: false } ),
			{ f1: field( { slug: 'on_display', name: 'On Display', type: 'flag' } ) },
			{}
		);

		expect( result.fieldData!.f1.content ).toBe( 'No' );
	} );

	it( 'renders a flag the object has no value for as No', () => {
		const result = processFieldData(
			object( {} ),
			{ f1: field( { slug: 'on_display', name: 'On Display', type: 'flag' } ) },
			{}
		);

		expect( result.fieldData!.f1.content ).toBe( 'No' );
	} );

	it( 'never stores a boolean, which the front end cannot print', () => {
		const result = processFieldData(
			object( { on_display: true, is_fragile: false } ),
			{
				f1: field( { slug: 'on_display', type: 'flag' } ),
				f2: field( { slug: 'is_fragile', type: 'flag' } ),
			},
			{}
		);

		for ( const entry of Object.values( result.fieldData! ) ) {
			expect( typeof entry.content ).not.toBe( 'boolean' );
		}
	} );

	it( 'passes non-flag values through untouched', () => {
		const result = processFieldData(
			object( { maker: 'Zeiss', year: 1923 } ),
			{
				f1: field( { slug: 'maker', name: 'Maker', type: 'plain' } ),
				f2: field( { slug: 'year', name: 'Year', type: 'plain' } ),
			},
			{}
		);

		expect( result.fieldData!.f1 ).toEqual( { name: 'Maker', content: 'Zeiss' } );
		expect( result.fieldData!.f2.content ).toBe( 1923 );
	} );

	it( 'preserves existing field selections and defaults the rest to false', () => {
		const result = processFieldData(
			object( { maker: 'Zeiss', year: 1923 } ),
			{
				f1: field( { slug: 'maker' } ),
				f2: field( { slug: 'year' } ),
			},
			{ f1: true }
		);

		expect( result.newFields ).toEqual( { f1: true, f2: false } );
	} );
} );
