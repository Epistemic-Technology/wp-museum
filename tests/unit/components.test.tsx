/**
 * Regression tests for components that threw ReferenceErrors on render.
 *
 * Each of these read a bare identifier that was never declared, so the
 * component crashed the moment its branch was reached. The tests render each
 * one and assert the value that identifier was meant to carry.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/126
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/129
 */
import { renderToStaticMarkup } from 'react-dom/server';

import ThumbnailImage from '../../src/components/thumbnail-image/thumbnail-image';
import { ObjectList } from '../../src/components/object-list/object-list';

import type { MuseumObject } from '../../src/types';

const imgDimensions = { height: 300, width: 300, size: 'medium' };

const museumObject = (
	overrides: Partial< MuseumObject > & { ID: number }
): MuseumObject =>
	( {
		post_title: 'Untitled',
		post_author: 1,
		post_date: '2020-01-01 00:00:00',
		post_date_gmt: '2020-01-01 00:00:00',
		post_content: '',
		excerpt: 'An excerpt.',
		post_status: 'publish',
		post_name: 'untitled',
		post_modified: '2020-01-01 00:00:00',
		post_modified_gmt: '2020-01-01 00:00:00',
		post_type: 'wpm_instrument',
		link: 'https://example.test/objects/1',
		edit_link: null,
		thumbnail: [ 'https://example.test/thumb.jpg', 200, 150, true ],
		cat_field: null,
		collections: [],
		...overrides,
	} as unknown as MuseumObject );

describe( 'ThumbnailImage', () => {
	it( 'renders an image without throwing when a thumbnail URL is given', () => {
		expect( () =>
			renderToStaticMarkup(
				<ThumbnailImage
					thumbnailURL="https://example.test/thumb.jpg"
					imgDimensions={ imgDimensions }
					setSearchModalOpen={ () => undefined }
				/>
			)
		).not.toThrow();
	} );

	it( 'falls back to generic alt text when neither alt nor title is given', () => {
		const markup = renderToStaticMarkup(
			<ThumbnailImage
				thumbnailURL="https://example.test/thumb.jpg"
				imgDimensions={ imgDimensions }
				setSearchModalOpen={ () => undefined }
			/>
		);
		expect( markup ).toContain( 'alt="Thumbnail image"' );
	} );

	it( 'prefers alt over title', () => {
		const markup = renderToStaticMarkup(
			<ThumbnailImage
				thumbnailURL="https://example.test/thumb.jpg"
				imgDimensions={ imgDimensions }
				setSearchModalOpen={ () => undefined }
				alt="Alt text"
				title="Title text"
			/>
		);
		expect( markup ).toContain( 'alt="Alt text"' );
	} );

	it( 'uses title when alt is absent', () => {
		const markup = renderToStaticMarkup(
			<ThumbnailImage
				thumbnailURL="https://example.test/thumb.jpg"
				imgDimensions={ imgDimensions }
				setSearchModalOpen={ () => undefined }
				title="Title text"
			/>
		);
		expect( markup ).toContain( 'alt="Title text"' );
	} );

	it( 'renders the placeholder when there is no thumbnail', () => {
		const markup = renderToStaticMarkup(
			<ThumbnailImage
				thumbnailURL={ null }
				imgDimensions={ imgDimensions }
				setSearchModalOpen={ () => undefined }
			/>
		);
		expect( markup ).toContain( 'thumbnail-placeholder' );
		expect( markup ).not.toContain( '<img' );
	} );
} );

describe( 'ObjectList', () => {
	const objects = [
		museumObject( { ID: 1, post_title: 'Fish &amp; Chips' } ),
	];

	it( 'renders rows with images without throwing', () => {
		expect( () =>
			renderToStaticMarkup(
				<ObjectList mObjects={ objects } displayImages={ true } />
			)
		).not.toThrow();
	} );

	it( 'uses the decoded post title as the thumbnail alt text', () => {
		const markup = renderToStaticMarkup(
			<ObjectList mObjects={ objects } displayImages={ true } />
		);
		expect( markup ).toContain( 'alt="Fish &amp; Chips"' );
		// The raw entity form must not survive into the attribute.
		expect( markup ).not.toContain( 'alt="Fish &amp;amp; Chips"' );
	} );

	it( 'renders rows without images when displayImages is false', () => {
		const markup = renderToStaticMarkup(
			<ObjectList mObjects={ objects } displayImages={ false } />
		);
		expect( markup ).not.toContain( '<img' );
		expect( markup ).toContain( 'An excerpt.' );
	} );
} );
