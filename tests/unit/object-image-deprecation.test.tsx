/**
 * Regression tests for the object-image block's deprecation.
 *
 * save() built the image's class from an `imgAlignment` attribute that was
 * never registered, so every post saved by that version holds the literal
 * class `image-selector-image-undefined`. Registering the attribute changes
 * what save() emits, which would make all of that content fail validation and
 * show "This block contains unexpected or invalid content" in the editor —
 * hence the deprecation these tests cover.
 *
 * The fixture is a block taken out of the development database, with two
 * classes removed from the wrapper: `wp-block-wp-museum-object-image` and
 * `alignright`. Both are contributed by editor-side save filters that live in
 * @wordpress/block-editor, which cannot be imported here (it pulls in an
 * untransformed ES module). Neither is affected by this change — the wrapper
 * element is untouched — and stripping them lets the real block parser do the
 * work on the part that did change.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/128
 */
import {
	getBlockType,
	getCategories,
	parse,
	registerBlockType,
	setCategories,
	unregisterBlockType,
} from '@wordpress/blocks';

// edit.tsx and save.tsx reach for @wordpress/block-editor, which cannot load
// in this environment. RichText.Content is the only part of it that reaches
// saved markup, and it renders the caption as a styled <p>.
jest.mock( '@wordpress/block-editor', () => ( {
	InspectorControls: ( { children }: { children: React.ReactNode } ) => <>{ children }</>,
	useBlockProps: ( props: object ) => props,
	RichText: Object.assign(
		() => null,
		{
			Content: ( { value, ...props }: { value: string; [ key: string ]: unknown } ) => (
				<p { ...props }>{ value }</p>
			),
		}
	),
} ) );

const BLOCK = 'wp-museum/object-image';

const HOST = 'https://museum.test';

/** A post-content block exactly as the pre-imgAlignment editor wrote it. */
const legacyBlock = `<!-- wp:wp-museum/object-image {"align":"right","objectID":7523,"catID":"2015.ph.712.1-10","title":"Set of 8 Large Demonstration Tuning Forks","imgHeight":768,"imgWidth":626,"imgURL":"${ HOST }/wp-content/uploads/2017/09/forks-768x626.jpg","totalImages":3,"objectURL":"${ HOST }/wpm_instrument/tuning-forks/"} -->
<div class="image-selector"><a class="object-link" href="${ HOST }/wpm_instrument/tuning-forks/"><img class="image-selector-image-undefined" src="${ HOST }/wp-content/uploads/2017/09/forks-768x626.jpg" height="300" width="300"/><h6>Set of 8 Large Demonstration Tuning Forks</h6><div style="font-size:0.7em">2015.ph.712.1-10</div></a></div>
<!-- /wp:wp-museum/object-image -->`;

setCategories( [ ...getCategories(), { slug: 'wp-museum', title: 'Museum' } ] );

// Importing the block registers it. require() rather than a top-level import
// so that the category above is in place first.
require( '../../src/blocks/object-image' );

/**
 * WordPress announces a successful deprecation with "Block successfully
 * updated" on console.info. @wordpress/jest-console fails any test that writes
 * to the console without saying it will, so asserting it here does double duty:
 * it keeps the suite quiet and it is the parser stating outright that it fell
 * back to a deprecated version rather than accepting the block as it stands.
 */
const expectDeprecationApplied = () => {
	expect( console ).toHaveInformed();
};

/** A block that matches no version at all is reported on warn and error. */
const expectValidationFailure = () => {
	expect( console ).toHaveWarned();
	expect( console ).toHaveErrored();
};

describe( 'object-image deprecation', () => {
	it( 'registers imgAlignment with a default of left', () => {
		const blockType = getBlockType( BLOCK )!;

		expect( blockType.attributes.imgAlignment ).toEqual( {
			type: 'string',
			default: 'left',
		} );
	} );

	it( 'declares fontSize as a number rather than the invalid float type', () => {
		const blockType = getBlockType( BLOCK )!;

		expect( blockType.attributes.fontSize.type ).toBe( 'number' );
	} );

	it( 'still parses content saved before imgAlignment existed', () => {
		const [ block ] = parse( legacyBlock );

		expect( block.name ).toBe( BLOCK );
		expect( block.isValid ).toBe( true );
		expectDeprecationApplied();
	} );

	it( 'migrates legacy content to the left alignment', () => {
		const [ block ] = parse( legacyBlock );

		expect( block.attributes.imgAlignment ).toBe( 'left' );
		expectDeprecationApplied();
	} );

	it( 'keeps the rest of a legacy block\'s attributes intact', () => {
		const [ block ] = parse( legacyBlock );

		expect( block.attributes.objectID ).toBe( 7523 );
		expect( block.attributes.align ).toBe( 'right' );
		expect( block.attributes.catID ).toBe( '2015.ph.712.1-10' );
		expect( block.attributes.fontSize ).toBe( 0.7 );
		expectDeprecationApplied();
	} );

	// Without this, the tests above would pass just as well if the block had
	// never changed its save output at all.
	it( 'would reject that content without the deprecation', () => {
		const blockType = getBlockType( BLOCK )!;
		const { deprecated, ...withoutDeprecations } = blockType;
		unregisterBlockType( BLOCK );
		registerBlockType( BLOCK, withoutDeprecations as never );

		const [ block ] = parse( legacyBlock );

		expect( block.isValid ).toBe( false );
		expectValidationFailure();

		unregisterBlockType( BLOCK );
		registerBlockType( BLOCK, blockType as never );
	} );
} );
