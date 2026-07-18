import {
	useState,
	useEffect
} from '@wordpress/element';

import {
	useSelect,
	useDispatch
} from '@wordpress/data';

import apiFetch from '@wordpress/api-fetch';
import ChildKind from './child-kind';

import type { MuseumObject, ObjectKind, ObjectKindChild } from '../../types';

/**
 * Minimal shape of a WP core REST (`/wp/v2`) create-post response, as used
 * here. Not a wp-museum/v1 wire shape, so defined locally rather than in
 * src/types.
 */
interface WPCorePostResponse {
	id: number;
	[key: string]: unknown;
}

interface ChildObjectsBlockAttributes {
	/** Map of kind_id → array of child post IDs. */
	childObjects?: Record<string, number[]>;
	childObjectsStr?: string;
}

interface ChildObjectsEditProps {
	attributes: ChildObjectsBlockAttributes;
	setAttributes: ( attributes: Partial<ChildObjectsBlockAttributes> ) => void;
}

const ChildObjectsEdit = ( props: ChildObjectsEditProps ) => {
	const { attributes, setAttributes } = props;
	const { childObjects } = attributes;

	const [ kindData, setKindData ] = useState<ObjectKind | null>( null );
	// The wire type is MuseumObjectChildren, which may be a bare `[]`
	// (empty-PHP-array quirk); the existing code treats it as the keyed-object
	// shape throughout.
	const [ childObjectData, setChildObjectData] = useState<Record<string, MuseumObject[]> | null>( null );
	const [ wasSaving, setWasSaving ] = useState( false );

	const baseRestPath = '/wp-museum/v1';
	const wordpressRestPath = '/wp/v2';

	const { postType, postId, isSavingPost, currentPostStatus } = useSelect(
		( select ) => {
			const {
				getCurrentPostType,
				getCurrentPostId,
				isSavingPost,
				getEditedPostAttribute,
			} = select( 'core/editor' ) as {
				getCurrentPostType: () => string;
				getCurrentPostId: () => number;
				isSavingPost: () => boolean;
				getEditedPostAttribute: ( attribute: string ) => string;
			};
			return {
				postType          : getCurrentPostType(),
				postId            : getCurrentPostId(),
				isSavingPost      : isSavingPost(),
				currentPostStatus : getEditedPostAttribute( 'status' )
			}
		},
		[]
	);

	const { savePost } = useDispatch( 'core/editor' ) as {
		savePost: () => void;
	};

	useEffect( () => {
		if ( kindData === null ) {
			refreshKindData();
		}
	} );

	useEffect( () => {
		if ( childObjectData === null ) {
			refreshChildObjectData();
		}
	} );

	useEffect( () => {
		if ( childObjects ) {
			savePost();
		}
	}, [ childObjects ] );

	useEffect( () => {
		if ( isSavingPost && ! wasSaving ) {
			setWasSaving( true );
		} else if ( ! isSavingPost && wasSaving ) {
			setWasSaving( false );
			refreshChildObjectData();
		}
	} );

	const refreshKindData = () => {
		apiFetch<ObjectKind>( { path: `${baseRestPath}/mobject_kinds/${postType}`} ).then( setKindData );
	}

	const refreshChildObjectData = () => {
		apiFetch<Record<string, MuseumObject[]>>( { path: `${baseRestPath}/all/${postId}/children` } ).then( setChildObjectData );
	}

	const addChildObject = ( child: WPCorePostResponse, kind: ObjectKindChild ) => {
		const {
			kind_id
		} = kind;

		const updatedChildObjectData: Record<string, MuseumObject[]> = childObjectData ? Object.assign( {}, childObjectData ) : {};
		if ( typeof updatedChildObjectData[ kind_id ] === 'undefined' ) {
			updatedChildObjectData[ kind_id ] = [];
		}
		// TODO(ts-migration): mixes shapes — `child` is a WP core REST response
		// (lowercase `id`), pushed into a list of museum-shaped objects
		// (uppercase `ID`) consumed by ChildObject.
		updatedChildObjectData[ kind_id ].push( child as unknown as MuseumObject );
		setChildObjectData( updatedChildObjectData );

		const updatedChildObjects: Record<string, number[]> = childObjects ? Object.assign( {}, childObjects ) : {};
		if ( typeof updatedChildObjects[ kind_id ] === 'undefined' ) {
			updatedChildObjects[ kind_id ] = [];
		}
		updatedChildObjects[ kind_id ].push( child.id );
		setAttributes( {
			childObjects : updatedChildObjects,
			childObjectsStr : JSON.stringify( updatedChildObjectData )
		} );
	}

	const deleteChildObject = ( child: MuseumObject, kind: ObjectKindChild ) => {
		if ( ! childObjects ) return;
		const updatedChildObjects: Record<string, number[]> = Object.assign( {}, childObjects );
		if ( typeof updatedChildObjects[ kind.kind_id ] === 'undefined' ) {
			return;
		}
		// TODO(ts-migration): mixes shapes — the array elements are numeric
		// post IDs (no `.id` property) and `child` is museum-shaped (uppercase
		// `ID`, no `.id`), so this compares undefined === undefined and always
		// matches index 0. Pre-existing behavior preserved.
		const index = updatedChildObjects[ kind.kind_id ].findIndex( object => ( object as any ).id === ( child as any ).id );
		if ( index === -1 ) return;
		updatedChildObjects[ kind.kind_id ].splice( index, 1 );
		setAttributes( {
			childObjects : updatedChildObjects,
			childObjectsStr : JSON.stringify( updatedChildObjects )
		} );
		apiFetch( {
			path    :  `${wordpressRestPath}/${kind.type_name}/${child.ID}`,
			method  : 'DELETE'
		} ).then( result => console.log(result) );
	}

	const updateChildObject = ( child: MuseumObject, kind: ObjectKindChild, data: { title: string } ) => {
		apiFetch( {
			path   : `${wordpressRestPath}/${kind.type_name}/${child.ID}`,
			method : 'POST',
			data   : data
		} ).then( result => console.log( result ) );
	}

	const newChildObject = ( kind: ObjectKindChild ) => {
		const {
			type_name,
			label,
			block_template
		// TODO(ts-migration): `block_template` is never present on child kinds
		// on the wire (schema-stripped server-side), so this template-insertion
		// path always operates on undefined. Asserted here to preserve the
		// existing behavior.
		} = kind as ObjectKindChild & {
			block_template?: [ string, Record<string, unknown>? ][];
		};

		let postContent = '';
		if ( block_template ) {
			block_template.forEach( templateItem => {
				postContent += '<!-- wp:' + templateItem[0];
				if ( templateItem.length > 1 ) {
					postContent += ' {'
					Object.entries( templateItem[1] ).forEach( ( [ key, value ] ) => {
						postContent += `"${key}": "${value}", `
					} );
					postContent = postContent.slice(0, -2 );
					postContent += '}';
				}
				postContent += " /-->\n\n"
			} );
		}

		apiFetch<WPCorePostResponse>( {
			path: `${wordpressRestPath}/${type_name}/`,
			method: 'POST',
			data: {
				'title'   : label,
				'status'  : currentPostStatus,
				'meta'    : { 'wpm_parent_object': postId },
				'content' : postContent
			}
		} ).then( result => {
			addChildObject( result, kind );
		} );
	}

	const kindSections = kindData ? kindData.children.map( kind => (
		<ChildKind
			key               = { kind.kind_id }
			kind              = { kind }
			kindObjects       = { childObjectData && childObjectData[ kind.kind_id ] ?
				childObjectData[ kind.kind_id] :
				[]
			}
			newChildObject    = { newChildObject }
			deleteChildObject = { deleteChildObject }
			updateChildObject = { updateChildObject }
		/>
	) ) : [];

	return (
		<div className = 'child-objects-block'>
			{ kindSections }
		</div>
	)

}

export default ChildObjectsEdit;
