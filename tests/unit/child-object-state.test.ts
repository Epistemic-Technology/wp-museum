/**
 * Tests for the child objects block's state helpers.
 *
 * The block used to look a child up with
 * `findIndex( object => object.id === child.id )`, comparing a property that
 * exists on neither side — the array holds bare post IDs and the child is
 * museum-shaped (`ID`). Every delete therefore matched index 0 and spliced out
 * whichever child happened to be first, while the DELETE request correctly
 * removed the child the user actually clicked. The persisted `childObjects`
 * meta — which both `/all/{id}/children` and object-meta/render.php read back —
 * was left pointing at a trashed post and missing a live one.
 *
 * Freshly created children were also pushed in raw, as WordPress core REST
 * create-post responses (lowercase `id`, no `post_title`), so a newly added
 * child rendered blank until the next save-driven refetch.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/142
 */
import {
	addChild,
	newChildRecord,
	removeChild,
} from '../../src/blocks/child-objects/child-object-state';

import type { ChildObjectRecord } from '../../src/blocks/child-objects/child-object-state';

const record = ( ID: number, post_title: string ): ChildObjectRecord => ( {
	ID,
	post_title,
	link: `https://example.org/?p=${ ID }`,
	edit_link: null,
	thumbnail: null,
} );

describe( 'removeChild', () => {
	const ids = { '3': [ 11, 22, 33 ] };
	const records = {
		'3': [ record( 11, 'First' ), record( 22, 'Second' ), record( 33, 'Third' ) ],
	};

	it( 'removes the child that was asked for, not the first one', () => {
		const updated = removeChild( ids, records, 3, 33 );

		expect( updated?.ids[ 3 ] ).toEqual( [ 11, 22 ] );
		expect( updated?.records[ 3 ].map( ( r ) => r.ID ) ).toEqual( [ 11, 22 ] );
	} );

	it( 'removes a child from the middle of the list', () => {
		const updated = removeChild( ids, records, 3, 22 );

		expect( updated?.ids[ 3 ] ).toEqual( [ 11, 33 ] );
		expect( updated?.records[ 3 ].map( ( r ) => r.ID ) ).toEqual( [ 11, 33 ] );
	} );

	it( 'removes the only child of a kind', () => {
		const updated = removeChild( { '3': [ 11 ] }, { '3': [ record( 11, 'Only' ) ] }, 3, 11 );

		expect( updated?.ids[ 3 ] ).toEqual( [] );
		expect( updated?.records[ 3 ] ).toEqual( [] );
	} );

	it( 'leaves other kinds untouched', () => {
		const updated = removeChild(
			{ '3': [ 11, 22 ], '4': [ 44 ] },
			{ '3': [ record( 11, 'First' ), record( 22, 'Second' ) ], '4': [ record( 44, 'Other' ) ] },
			3,
			11
		);

		expect( updated?.ids[ 4 ] ).toEqual( [ 44 ] );
		expect( updated?.records[ 4 ].map( ( r ) => r.ID ) ).toEqual( [ 44 ] );
	} );

	it( 'does not mutate the maps it was given', () => {
		removeChild( ids, records, 3, 11 );

		expect( ids[ 3 ] ).toEqual( [ 11, 22, 33 ] );
		expect( records[ 3 ] ).toHaveLength( 3 );
	} );

	it( 'returns null for a child that is not in the map', () => {
		expect( removeChild( ids, records, 3, 99 ) ).toBeNull();
	} );

	it( 'returns null for a kind that has no entry', () => {
		expect( removeChild( ids, records, 7, 11 ) ).toBeNull();
	} );

	it( 'tolerates the empty-PHP-array shape', () => {
		expect( removeChild( [], [], 3, 11 ) ).toBeNull();
	} );
} );

describe( 'addChild', () => {
	it( 'appends to both maps', () => {
		const { ids, records } = addChild(
			{ '3': [ 11 ] },
			{ '3': [ record( 11, 'First' ) ] },
			3,
			record( 22, 'Second' )
		);

		expect( ids[ 3 ] ).toEqual( [ 11, 22 ] );
		expect( records[ 3 ].map( ( r ) => r.ID ) ).toEqual( [ 11, 22 ] );
	} );

	it( 'creates the kind entry when it is the first child of that kind', () => {
		const { ids, records } = addChild( {}, {}, 3, record( 11, 'First' ) );

		expect( ids[ 3 ] ).toEqual( [ 11 ] );
		expect( records[ 3 ] ).toHaveLength( 1 );
	} );

	it( 'tolerates the empty-PHP-array shape', () => {
		const { ids, records } = addChild( [], [], 3, record( 11, 'First' ) );

		expect( ids[ 3 ] ).toEqual( [ 11 ] );
		expect( records[ 3 ] ).toHaveLength( 1 );
	} );

	it( 'does not mutate the maps it was given', () => {
		const ids = { '3': [ 11 ] };
		const records = { '3': [ record( 11, 'First' ) ] };

		addChild( ids, records, 3, record( 22, 'Second' ) );

		expect( ids[ 3 ] ).toEqual( [ 11 ] );
		expect( records[ 3 ] ).toHaveLength( 1 );
	} );

	it( 'adds a child that can then be removed again by ID', () => {
		const added = addChild( { '3': [ 11 ] }, { '3': [ record( 11, 'First' ) ] }, 3, record( 22, 'Second' ) );
		const removed = removeChild( added.ids, added.records, 3, 22 );

		expect( removed?.ids[ 3 ] ).toEqual( [ 11 ] );
		expect( removed?.records[ 3 ].map( ( r ) => r.ID ) ).toEqual( [ 11 ] );
	} );
} );

describe( 'newChildRecord', () => {
	it( 'maps the core response id to ID and the raw title to post_title', () => {
		const created = newChildRecord( {
			id: 42,
			link: 'https://example.org/?p=42',
			title: { raw: 'Specimen', rendered: 'Specimen' },
		} );

		expect( created ).toEqual( {
			ID: 42,
			post_title: 'Specimen',
			link: 'https://example.org/?p=42',
			edit_link: null,
			thumbnail: null,
		} );
	} );

	it( 'falls back to the rendered title when raw is absent', () => {
		expect( newChildRecord( { id: 42, title: { rendered: 'Specimen' } } ).post_title ).toBe(
			'Specimen'
		);
	} );

	it( 'gives an empty title rather than undefined when the response has none', () => {
		expect( newChildRecord( { id: 42 } ).post_title ).toBe( '' );
	} );

	it( 'produces a record whose ID matches what addChild stores', () => {
		const created = newChildRecord( { id: 42, title: { raw: 'Specimen' } } );
		const { ids, records } = addChild( {}, {}, 3, created );

		expect( ids[ 3 ] ).toEqual( [ 42 ] );
		expect( records[ 3 ][ 0 ].ID ).toBe( 42 );
	} );
} );
