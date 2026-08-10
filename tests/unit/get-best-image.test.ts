/**
 * Tests for getBestImage.
 *
 * The wire tuple is `[url, width, height, isResized]`, but the function
 * destructured it as `[URL, height, width, ...]` and then compared the
 * (mislabelled) height against imgDimensions.height and the width against
 * imgDimensions.width. Each image's real width was therefore tested against
 * the requested height and vice versa, so any target that was not square
 * selected the wrong size — too large in one direction, too small in the
 * other — and the width and height it reported back were swapped.
 *
 * The `full` fallback repeated the transposition and indexed `imgData['full']`
 * unguarded, which throws whenever that size is null on the wire.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/125
 */
import { getBestImage } from '../../src/javascript/util';

import type { ObjectImage } from '../../src/types';

/** A landscape image with the usual WordPress intermediate sizes. */
const landscape = ( full: unknown = [ 'full.jpg', 2000, 1333, false ] ): ObjectImage =>
	( {
		title: 'Sextant',
		caption: '',
		description: '',
		alt: 'A sextant',
		sort_order: 0,
		thumbnail: [ 'thumb.jpg', 150, 150, true ],
		medium: [ 'medium.jpg', 300, 200, true ],
		large: [ 'large.jpg', 1024, 683, true ],
		full,
	} as unknown as ObjectImage );

describe( 'getBestImage', () => {
	it( 'reads the tuple as [url, width, height]', () => {
		const best = getBestImage( landscape(), { width: 1024, height: 683 } );

		expect( best ).toEqual( { URL: 'large.jpg', width: 1024, height: 683 } );
	} );

	it( 'does not jump to a larger size than a wide target needs', () => {
		// large (1024x683) covers 800x300. Transposed, its width was checked
		// against 800 as though it were 683, so large was rejected and the
		// 2000px full-size image served instead.
		const best = getBestImage( landscape(), { width: 800, height: 300 } );

		expect( best.URL ).toBe( 'large.jpg' );
	} );

	it( 'does not settle for a size too short for a tall target', () => {
		// Nothing but full (1333 tall) covers 200x900. Transposed, large's
		// width of 683 was checked against the 900 as though it were its
		// height, so a 683px-tall image was served for a 900px slot.
		const best = getBestImage( landscape(), { width: 200, height: 900 } );

		expect( best.URL ).toBe( 'full.jpg' );
	} );

	it( 'picks the smallest size that covers a square target', () => {
		const best = getBestImage( landscape(), { width: 150, height: 150 } );

		expect( best.URL ).toBe( 'thumb.jpg' );
	} );

	it( 'takes a size whose dimensions exactly match the target', () => {
		const best = getBestImage( landscape(), { width: 300, height: 200 } );

		expect( best.URL ).toBe( 'medium.jpg' );
	} );

	it( 'falls back to full when no intermediate size is large enough', () => {
		const best = getBestImage( landscape(), { width: 1800, height: 1200 } );

		expect( best ).toEqual( { URL: 'full.jpg', width: 2000, height: 1333 } );
	} );

	it( 'ignores the scalar metadata sharing the record', () => {
		// title/caption/description/alt/sort_order sit under the same index
		// signature as the size slugs.
		const best = getBestImage( landscape(), { width: 10, height: 10 } );

		expect( best.URL ).toBe( 'thumb.jpg' );
	} );

	it( 'skips sizes that failed to resolve', () => {
		const withNullSizes = {
			...landscape(),
			thumbnail: null,
			medium: null,
		} as unknown as ObjectImage;

		expect( getBestImage( withNullSizes, { width: 10, height: 10 } ).URL ).toBe(
			'large.jpg'
		);
	} );

	describe( 'when there is nothing usable to return', () => {
		it( 'reports no image rather than throwing when full is null', () => {
			const best = getBestImage( landscape( null ), { width: 4000, height: 4000 } );

			expect( best ).toEqual( { URL: null, width: 0, height: 0 } );
		} );

		it( 'reports no image rather than throwing when every size is null', () => {
			const noSizes = {
				title: '',
				caption: '',
				description: '',
				alt: '',
				sort_order: 0,
				thumbnail: null,
				medium: null,
				large: null,
				full: null,
			} as unknown as ObjectImage;

			expect( getBestImage( noSizes, { width: 10, height: 10 } ).URL ).toBeNull();
		} );

		it( 'reports no image rather than throwing when given no record at all', () => {
			// getFirstObjectImage returns null for an object with no attached
			// images, and two grid components passed that straight through.
			expect( getBestImage( null, { width: 300, height: 300 } ) ).toEqual( {
				URL: null,
				width: 0,
				height: 0,
			} );
		} );
	} );
} );
