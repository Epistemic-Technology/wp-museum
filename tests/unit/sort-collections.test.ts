/**
 * Regression tests for the collection date comparators.
 *
 * Both date branches of sortCollections previously assigned to undeclared
 * aDate/bDate identifiers, which throws a ReferenceError in a strict-mode ES
 * module. These tests fail with that bug present.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/124
 */
import { sortCollections } from '../../src/javascript/util';

import type { Collection } from '../../src/types';

/**
 * Build a Collection fixture. Only the fields the comparators read are
 * meaningful; the rest satisfy the wire type.
 */
const collection = ( overrides: Partial< Collection > & { ID: number } ): Collection => ( {
	menu_order: 0,
	post_author: 1,
	post_date: '2020-01-01 00:00:00',
	post_date_gmt: '2020-01-01 00:00:00',
	post_content: '',
	post_title: 'Untitled',
	excerpt: '',
	post_status: 'publish',
	post_name: 'untitled',
	post_modified: '2020-01-01 00:00:00',
	post_modified_gmt: '2020-01-01 00:00:00',
	post_parent: 0,
	post_type: 'wpm_collection',
	link: 'https://example.test/c',
	edit_link: null,
	thumbnail: [],
	featured_image: null,
	taxonomies: [],
	...overrides,
} );

const titles = ( result: { post_title: string }[] ) => result.map( ( c ) => c.post_title );

describe( 'sortCollections', () => {
	describe( 'Date Created', () => {
		const unsorted = [
			collection( { ID: 1, post_title: 'middle', post_date_gmt: '2021-06-01 00:00:00' } ),
			collection( { ID: 2, post_title: 'oldest', post_date_gmt: '2020-01-01 00:00:00' } ),
			collection( { ID: 3, post_title: 'newest', post_date_gmt: '2022-12-31 00:00:00' } ),
		];

		it( 'sorts ascending without throwing', () => {
			expect( titles( sortCollections( unsorted, 'Date Created', 'Ascending' ) ) ).toEqual( [
				'oldest',
				'middle',
				'newest',
			] );
		} );

		it( 'sorts descending', () => {
			expect( titles( sortCollections( unsorted, 'Date Created', 'Descending' ) ) ).toEqual( [
				'newest',
				'middle',
				'oldest',
			] );
		} );

		it( 'treats a null post_date_gmt as the epoch rather than an Invalid Date', () => {
			const withNull = [
				collection( { ID: 1, post_title: 'dated', post_date_gmt: '2021-01-01 00:00:00' } ),
				collection( { ID: 2, post_title: 'undated', post_date_gmt: null } ),
			];
			// An Invalid Date compares false in both directions, which would
			// leave the input order untouched; the epoch sorts undated first.
			expect( titles( sortCollections( withNull, 'Date Created', 'Ascending' ) ) ).toEqual( [
				'undated',
				'dated',
			] );
		} );
	} );

	describe( 'Date Updated', () => {
		it( 'sorts by post_modified_gmt without throwing', () => {
			const unsorted = [
				collection( { ID: 1, post_title: 'b', post_modified_gmt: '2021-06-01 00:00:00' } ),
				collection( { ID: 2, post_title: 'a', post_modified_gmt: '2020-01-01 00:00:00' } ),
				collection( { ID: 3, post_title: 'c', post_modified_gmt: '2022-12-31 00:00:00' } ),
			];
			expect( titles( sortCollections( unsorted, 'Date Updated', 'Ascending' ) ) ).toEqual( [
				'a',
				'b',
				'c',
			] );
		} );
	} );

	it( 'still sorts alphabetically', () => {
		const unsorted = [
			collection( { ID: 1, post_title: 'Zebra' } ),
			collection( { ID: 2, post_title: 'Aardvark' } ),
		];
		expect( titles( sortCollections( unsorted, 'Alphabetical', 'Ascending' ) ) ).toEqual( [
			'Aardvark',
			'Zebra',
		] );
	} );
} );
