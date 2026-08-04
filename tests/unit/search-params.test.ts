/**
 * Tests for the advanced-search parameter translation.
 *
 * The block used to post its raw working values at the /search endpoint,
 * which reads none of `searchFields`, `selectedFlags` or `posts_per_page` —
 * so field searches, flag filters and the results-per-page setting all did
 * nothing. Only the front end did any translation at all; the editor preview
 * did none.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/136
 */
import { toSearchRequest } from '../../src/blocks/advanced-search/search-params';

describe( 'toSearchRequest', () => {
	it( 'sends the results-per-page setting as per_page', () => {
		expect( toSearchRequest( {}, 40 ) ).toEqual( { per_page: 40 } );
	} );

	it( 'passes -1 (unlimited) through as per_page', () => {
		expect( toSearchRequest( {}, -1 ) ).toEqual( { per_page: -1 } );
	} );

	it( 'leaves per_page off when no setting is given', () => {
		expect( toSearchRequest( {} ) ).not.toHaveProperty( 'per_page' );
	} );

	it( 'turns a field search into a tilde-prefixed field-slug param', () => {
		const request = toSearchRequest( {
			searchFields: [ { field: 'maker', search: 'Nikon' } ],
		} );

		expect( request.maker ).toBe( '~Nikon' );
		expect( request ).not.toHaveProperty( 'searchFields' );
	} );

	it( 'does not double-prefix a search the user already tilded', () => {
		const request = toSearchRequest( {
			searchFields: [ { field: 'maker', search: '~Nikon' } ],
		} );

		expect( request.maker ).toBe( '~Nikon' );
	} );

	it( 'skips field entries with no field or no search text', () => {
		const request = toSearchRequest( {
			searchFields: [
				{ field: 'maker', search: '' },
				{ field: null, search: 'orphaned' },
				{ field: 'model' },
			],
		} );

		expect( request ).toEqual( {} );
	} );

	it( 'turns each selected flag into a field-slug param set to true', () => {
		const request = toSearchRequest( {
			selectedFlags: [ 'on_display', 'is_fragile' ],
		} );

		expect( request.on_display ).toBe( true );
		expect( request.is_fragile ).toBe( true );
		expect( request ).not.toHaveProperty( 'selectedFlags' );
	} );

	it( 'coerces collection IDs to numbers', () => {
		const request = toSearchRequest( { selectedCollections: [ '12', '7' ] } );

		expect( request.selectedCollections ).toEqual( [ 12, 7 ] );
	} );

	it( 'passes the params the endpoint reads straight through', () => {
		const request = toSearchRequest( {
			page: 3,
			searchText: 'telescope',
			onlyTitle: true,
			selectedTags: [ 'optics' ],
		} );

		expect( request ).toEqual( {
			page: 3,
			searchText: 'telescope',
			onlyTitle: true,
			selectedTags: [ 'optics' ],
		} );
	} );

	it( 'does not mutate the values it is given', () => {
		const values = {
			searchFields: [ { field: 'maker', search: 'Nikon' } ],
			selectedFlags: [ 'on_display' ],
		};

		toSearchRequest( values, 20 );

		expect( values ).toEqual( {
			searchFields: [ { field: 'maker', search: 'Nikon' } ],
			selectedFlags: [ 'on_display' ],
		} );
	} );
} );
