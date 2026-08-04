/**
 * Tests for searchObjects, the shared /search caller.
 *
 * The search blocks used to look for pagination on the results themselves, in
 * a `query_data` property that the REST schema strips and that therefore
 * never arrives. Page counts always fell back to 1 / 0 and the pager never
 * rendered. The server reports paging in the X-WP-* response headers, which
 * only reach the client when apiFetch is told not to parse the response.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/135
 */
import apiFetch from '@wordpress/api-fetch';

import { searchObjects } from '../../src/javascript/util';

jest.mock( '@wordpress/api-fetch', () => ( {
	__esModule: true,
	default: jest.fn(),
} ) );

const mockedApiFetch = apiFetch as unknown as jest.Mock;

const response = ( {
	ok = true,
	status = 200,
	body = [] as unknown,
	headers = {} as Record< string, string >,
} = {} ) =>
	( {
		ok,
		status,
		json: async () => body,
		headers: { get: ( name: string ) => headers[ name ] ?? null },
	} ) as unknown as Response;

describe( 'searchObjects', () => {
	beforeEach( () => mockedApiFetch.mockReset() );

	it( 'requests the response unparsed so the headers survive', async () => {
		mockedApiFetch.mockResolvedValue( response() );

		await searchObjects( { searchText: 'telescope' } );

		expect( mockedApiFetch ).toHaveBeenCalledWith( {
			path: '/wp-museum/v1/search',
			method: 'POST',
			data: { searchText: 'telescope' },
			parse: false,
		} );
	} );

	it( 'reads the page and page count from the X-WP-* headers', async () => {
		mockedApiFetch.mockResolvedValue(
			response( {
				body: [ { ID: 1 }, { ID: 2 } ],
				headers: {
					'X-WP-Page': '3',
					'X-WP-Total': '47',
					'X-WP-TotalPages': '5',
				},
			} )
		);

		const results = await searchObjects( {} );

		expect( results.objects ).toHaveLength( 2 );
		expect( results.currentPage ).toBe( 3 );
		expect( results.totalPages ).toBe( 5 );
	} );

	it( 'falls back to page 1 of 0 when the headers are absent', async () => {
		mockedApiFetch.mockResolvedValue( response( { body: [] } ) );

		const results = await searchObjects( {} );

		expect( results.currentPage ).toBe( 1 );
		expect( results.totalPages ).toBe( 0 );
	} );

	it( 'rejects on an error response rather than reporting empty results', async () => {
		mockedApiFetch.mockResolvedValue(
			response( { ok: false, status: 400 } )
		);

		await expect( searchObjects( {} ) ).rejects.toThrow( '400' );
	} );
} );
