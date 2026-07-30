/**
 * Regression tests for the object-image block's save() serialization.
 *
 * save() previously built its alt text from imgAlt and imgTitle, neither of
 * which is a registered attribute nor defined in the module. Both reached the
 * bundle as free identifiers, so serializing a block with an image selected
 * threw a ReferenceError — meaning the block could not be saved at all once
 * an image was chosen.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/128
 */
import { renderToStaticMarkup } from 'react-dom/server';

import save from '../../src/blocks/object-image/save';

import type { ObjectImageAttributes } from '../../src/blocks/object-image/edit';

// RichText.Content is the only @wordpress/block-editor surface save() uses.
// Mocking it keeps this a unit test of the serialization logic.
jest.mock( '@wordpress/block-editor', () => ( {
	RichText: {
		Content: ( { value, ...props }: { value: string; [ key: string ]: unknown } ) => (
			<p { ...props }>{ value }</p>
		),
	},
} ) );

const attributes = (
	overrides: Partial< ObjectImageAttributes > = {}
): ObjectImageAttributes => ( {
	align: 'left',
	objectID: 42,
	catID: 'CAT-1',
	title: 'Brass Sextant',
	captionText: null,
	imgHeight: 600,
	imgWidth: 800,
	imgURL: 'https://example.test/sextant.jpg',
	imgIndex: 0,
	totalImages: 1,
	objectURL: 'https://example.test/objects/42',
	displayTitle: true,
	displayCatID: true,
	displayCaption: false,
	linkToObject: false,
	imgDimensions: { height: 300, width: 300, size: 'medium' },
	fontSize: 0.7,
	titleTag: 'h6',
	...overrides,
} );

const render = ( attrs: ObjectImageAttributes ) =>
	renderToStaticMarkup( save( { attributes: attrs } ) as React.ReactElement );

describe( 'object-image save()', () => {
	it( 'serializes without throwing when an image is selected', () => {
		expect( () => render( attributes() ) ).not.toThrow();
	} );

	it( 'uses the object title as the image alt text', () => {
		expect( render( attributes() ) ).toContain( 'alt="Brass Sextant"' );
	} );

	it( 'falls back to a generic alt when the title is empty', () => {
		expect( render( attributes( { title: '' } ) ) ).toContain(
			'alt="Museum object image"'
		);
	} );

	it( 'emits no <img> when there is no image URL', () => {
		const markup = render( attributes( { imgURL: null } ) );
		expect( markup ).not.toContain( '<img' );
	} );

	it( 'still renders the title and catalogue ID', () => {
		const markup = render( attributes() );
		expect( markup ).toContain( 'Brass Sextant' );
		expect( markup ).toContain( 'CAT-1' );
	} );

	it( 'wraps the body in an object link when linkToObject is set', () => {
		const markup = render( attributes( { linkToObject: true } ) );
		expect( markup ).toContain( 'href="https://example.test/objects/42"' );
	} );
} );
