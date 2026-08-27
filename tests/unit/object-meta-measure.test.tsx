/**
 * Tests for the object-meta block's measure field.
 *
 * A measure field's shape comes from its `dimensions` record, which is null
 * on the wire when the stored JSON could not be decoded. The editor read
 * `dimensions.n` unguarded, so such a field threw while rendering the block
 * rather than falling back to a single measurement.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/148
 */
import { renderToStaticMarkup } from 'react-dom/server';

// The block editor package pulls an ESM-only dependency in at import time, and
// none of it is reachable from the field component under test.
jest.mock( '@wordpress/block-editor', () => ( {
	__esModule: true,
	InspectorControls: ( { children }: { children: React.ReactNode } ) => (
		<div>{ children }</div>
	),
	RichText: () => null,
	useBlockProps: () => ( {} ),
} ) );

// eslint-disable-next-line import/first
import { ObjectMetaField } from '../../src/blocks/object-meta/edit';

import type { MObjectField } from '../../src/types';

const measureField = ( overrides: Partial< MObjectField > = {} ): MObjectField =>
	( {
		field_id: 1,
		slug: 'length',
		kind_id: 1,
		name: 'Length',
		type: 'measure',
		display_order: 0,
		public: true,
		required: false,
		quick_browse: false,
		help_text: '',
		detailed_instructions: '',
		public_description: '',
		field_schema: '',
		max_length: 0,
		dimensions: { n: 1, labels: [ '', '', '' ] },
		units: 'cm',
		factors: [],
		...overrides,
	} ) as MObjectField;

const renderField = ( fieldData: MObjectField, fieldValue: any ) =>
	renderToStaticMarkup(
		<ObjectMetaField
			fieldData={ fieldData }
			fieldValue={ fieldValue }
			errorText={ null }
			onChange={ () => undefined }
			onFocus={ () => undefined }
			onBlur={ () => undefined }
		/>
	);

const inputCount = ( markup: string ) =>
	( markup.match( /<input/g ) ?? [] ).length;

describe( 'ObjectMetaField — measure', () => {
	it( 'renders one input per dimension', () => {
		const markup = renderField(
			measureField( { dimensions: { n: 2, labels: [ 'Width', 'Height' ] } } ),
			[ 3, 4 ]
		);

		expect( inputCount( markup ) ).toBe( 2 );
		expect( markup ).toContain( 'Width' );
		expect( markup ).toContain( 'Height' );
	} );

	it( 'falls back to a single measurement when dimensions are missing', () => {
		const markup = renderField( measureField( { dimensions: null } ), [ 3 ] );

		expect( inputCount( markup ) ).toBe( 1 );
		expect( markup ).toContain( 'value="3"' );
	} );

	it( 'renders an unset value as an empty input', () => {
		const markup = renderField( measureField(), undefined );

		expect( inputCount( markup ) ).toBe( 1 );
		expect( markup ).toContain( 'value=""' );
	} );
} );
