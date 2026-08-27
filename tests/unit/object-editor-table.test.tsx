/**
 * Tests for ObjectEditorTable's Status column.
 *
 * The defect behind these was server-side: post_status_label was computed by
 * combine_post_data but left out of the REST schema, and Preparable_From_Schema
 * drops whatever the schema does not name, so the column rendered undefined.
 * That half is covered in tests/phpunit/rest/ObjectsControllerTest.php, which
 * is where a regression would actually show up. These pin the other end of the
 * contract: the table reads the field the schema now sends, under that name.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/140
 */
import { renderToStaticMarkup } from 'react-dom/server';

import ObjectEditorTable from '../../src/components/object-editor-table/object-editor-table';

import type { MuseumObject } from '../../src/types';

const museumObject = (
	overrides: Partial< MuseumObject > & { ID: number }
): MuseumObject =>
	( {
		post_title: 'Brass Telescope',
		post_status: 'publish',
		post_status_label: 'Published',
		link: 'https://example.test/objects/1',
		edit_link: 'https://example.test/wp-admin/post.php?post=1&action=edit',
		...overrides,
	} as unknown as MuseumObject );

const render = ( mObjects: MuseumObject[] ) =>
	renderToStaticMarkup( <ObjectEditorTable mObjects={ mObjects } /> );

describe( 'ObjectEditorTable', () => {
	it( 'shows the status label in the Status column', () => {
		const markup = render( [ museumObject( { ID: 1 } ) ] );

		expect( markup ).toContain( '<td>Published</td>' );
	} );

	it( 'shows each object its own status', () => {
		const markup = render( [
			museumObject( { ID: 1 } ),
			museumObject( {
				ID: 2,
				post_title: 'Unfinished Orrery',
				post_status: 'draft',
				post_status_label: 'Draft',
			} ),
		] );

		expect( markup ).toContain( '<td>Published</td>' );
		expect( markup ).toContain( '<td>Draft</td>' );
	} );

	it( 'renders a row per object, with edit and view links', () => {
		const markup = render( [ museumObject( { ID: 1 } ) ] );

		expect( markup ).toContain( 'aria-label="Edit Brass Telescope"' );
		expect( markup ).toContain( 'aria-label="View Brass Telescope"' );
	} );
} );
