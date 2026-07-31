/**
 * Tests for the collection blocks and the object table they render.
 *
 * Both cover bugs the TypeScript migration recorded rather than fixed:
 * the editor table read `post_status_label`, which the objects REST schema
 * strips, so the Status column was always blank; and the collection display
 * radio round-tripped its value through mismatched types.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/147
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import ObjectEditorTable from '../../src/components/object-editor-table/object-editor-table';

import type { MuseumObject } from '../../src/types';

const mockEditPost = jest.fn();

jest.mock( '@wordpress/edit-post', () => ( {
	__esModule: true,
	PluginDocumentSettingPanel: ( {
		children,
	}: {
		children: React.ReactNode;
	} ) => <div>{ children }</div>,
} ) );

// CheckboxControl warns about an upcoming margin change; that deprecation
// notice would otherwise fail the suite through @wordpress/jest-console.
jest.mock( '@wordpress/deprecated', () => ( {
	__esModule: true,
	default: () => undefined,
} ) );

let mockPostMeta: Record< string, unknown > = {};

// Only the two hooks the panel uses are replaced. @wordpress/components pulls
// in real @wordpress/data stores at import time, so everything else has to
// keep working — and it has to be delegated lazily, because the real module
// imports itself while loading.
jest.mock( '@wordpress/data', () => {
	const overrides: Record< string, unknown > = {
		useDispatch: () => ( { editPost: mockEditPost } ),
		useSelect: (
			mapSelect: ( select: ( store: string ) => unknown ) => unknown
		) =>
			mapSelect( ( store: string ) => {
				if ( store === 'core/editor' ) {
					return {
						getCurrentPostType: () => 'wpm_collection',
						getEditedPostAttribute: () => mockPostMeta,
					};
				}
				return { getEntityRecords: () => [] };
			} ),
	};

	return new Proxy(
		{},
		{
			get: ( target, property: string ) =>
				property in overrides
					? overrides[ property ]
					: ( jest.requireActual( '@wordpress/data' ) as Record<
							string,
							unknown
					  > )[ property ],
		}
	);
} );

// eslint-disable-next-line import/first
import CollectionSettingsPanel from '../../src/blocks/collection-objects/collection-options';

// React 18 only flushes updates quietly once it knows act() is supported.
( global as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean } )
	.IS_REACT_ACT_ENVIRONMENT = true;

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
		edit_link: 'https://example.test/wp-admin/post.php?post=1&action=edit',
		thumbnail: [ 'https://example.test/thumb.jpg', 200, 150, true ],
		cat_field: null,
		collections: [],
		...overrides,
	} as unknown as MuseumObject );

describe( 'ObjectEditorTable', () => {
	it( 'shows the status of each object', () => {
		const markup = renderToStaticMarkup(
			<ObjectEditorTable
				mObjects={ [
					museumObject( { ID: 1, post_title: 'Astrolabe' } ),
					museumObject( {
						ID: 2,
						post_title: 'Orrery',
						post_status: 'draft',
					} ),
				] }
			/>
		);

		// post_status_label never reaches the client (the REST schema strips
		// it), so the slug is mapped to a display label here.
		expect( markup ).toContain( '<td>Published</td>' );
		expect( markup ).toContain( '<td>Draft</td>' );
	} );

	it( 'falls back to the raw slug for an unrecognised status', () => {
		const markup = renderToStaticMarkup(
			<ObjectEditorTable
				mObjects={ [
					museumObject( {
						ID: 3,
						post_title: 'Sextant',
						post_status: 'wpm_on_loan',
					} ),
				] }
			/>
		);

		expect( markup ).toContain( '<td>wpm_on_loan</td>' );
	} );
} );

describe( 'CollectionSettingsPanel', () => {
	const renderPanel = ( meta: Record< string, unknown > ) => {
		mockPostMeta = meta;
		const container = document.createElement( 'div' );
		document.body.appendChild( container );
		const root = createRoot( container );
		act( () => root.render( <CollectionSettingsPanel /> ) );
		return {
			container,
			cleanup: () => {
				act( () => root.unmount() );
				container.remove();
			},
		};
	};

	const displayRadios = ( container: HTMLElement ) =>
		Array.from(
			container.querySelectorAll< HTMLInputElement >(
				'input[type="radio"]'
			)
		);

	beforeEach( () => {
		mockEditPost.mockClear();
	} );

	it( 'checks the radio matching the stored single_page meta', () => {
		const { container, cleanup } = renderPanel( { single_page: true } );

		const [ singlePage, toggle ] = displayRadios( container );
		expect( singlePage.checked ).toBe( true );
		expect( toggle.checked ).toBe( false );

		cleanup();
	} );

	it( 'stores single_page as a boolean when the selection changes', () => {
		const { container, cleanup } = renderPanel( { single_page: true } );

		const toggle = displayRadios( container )[ 1 ];
		act( () => {
			toggle.click();
		} );

		expect( mockEditPost ).toHaveBeenCalledWith( {
			meta: { single_page: false },
		} );

		cleanup();
	} );
} );
