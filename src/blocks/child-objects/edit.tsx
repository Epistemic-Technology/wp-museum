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
		// NOTE(wp-types): kind_id is number | null on the wire; a null here would
		// index the "null" key at runtime. Asserted to preserve behavior.
		const kind_id = kind.kind_id as number;

		const updatedChildObjectData: Record<string, MuseumObject[]> = childObjectData ? Object.assign( {}, childObjectData ) : {};
		if ( typeof updatedChildObjectData[ kind_id ] === 'undefined' ) {
			updatedChildObjectData[ kind_id ] = [];
		}
		// NOTE(wp-types): mixes shapes — `child` is a WP core REST response
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
		// The attribute holds plain post IDs (see the child_objects meta schema
		// in class-objectposttype.php). `child` is museum-shaped (`ID`) when it
		// came from the REST refresh, but is still the WP core create response
		// (`id`) when it was added in this editing session.
		const childRecord = child as unknown as { ID?: number; id?: number };
		const childId = childRecord.ID ?? childRecord.id;
		if ( ! childId ) return;

		// NOTE(wp-types): kind_id is number | null on the wire; asserted to
		// preserve the existing index behavior.
		const kindId = kind.kind_id as number;
		const updatedChildObjects: Record<string, number[]> = Object.assign( {}, childObjects );
		const kindObjects = updatedChildObjects[ kindId ];
		const index = Array.isArray( kindObjects ) ?
			kindObjects.findIndex( objectId => objectId === childId ) :
			-1;
		if ( index !== -1 ) {
			// Object.assign only shallow-copies, so the per-kind array is still
			// the one held in the current attribute value — copy it before
			// splicing rather than mutating the attribute in place.
			updatedChildObjects[ kindId ] = kindObjects.filter(
				( _objectId, objectIndex ) => objectIndex !== index
			);
			setAttributes( {
				childObjects : updatedChildObjects,
				childObjectsStr : JSON.stringify( updatedChildObjects )
			} );
		}

		// The object is deleted whether or not the attribute knew about it: a
		// bookkeeping mismatch must not leave the user unable to remove a
		// child they can see.
		apiFetch( {
			path    :  `${wordpressRestPath}/${kind.type_name}/${childId}`,
			method  : 'DELETE'
		} ).catch( error => {
			console.error( `Failed to delete child object ${childId}`, error );
		} );
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
		} = kind;

		// New children are created with empty content. This used to serialize
		// the kind's `block_template` into the post content, but child kinds are
		// serialized with ObjectKind::to_array() (class-objectkind.php), which
		// has no `block_template` key — and the Kinds_Controller schema strips
		// it from full kinds too — so that code could never run. Restoring it
		// requires putting block_template on the wire first.
		const postContent = '';

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
			kindObjects       = { childObjectData && childObjectData[ kind.kind_id as number ] ?
				childObjectData[ kind.kind_id as number ] :
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
