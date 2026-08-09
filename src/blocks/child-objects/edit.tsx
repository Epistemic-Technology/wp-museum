import {
	useState,
	useEffect
} from '@wordpress/element';

import {
	useSelect,
	useDispatch
} from '@wordpress/data';

import {
	serialize,
	synchronizeBlocksWithTemplate
} from '@wordpress/blocks';

import apiFetch from '@wordpress/api-fetch';
import ChildKind from './child-kind';

import {
	addChild,
	newChildRecord,
	removeChild
} from './child-object-state';

import type {
	ChildObjectIds,
	ChildObjectRecord,
	ChildObjectRecords,
	WPCorePostResponse
} from './child-object-state';

import type { ObjectKind, ObjectKindChild } from '../../types';

interface ChildObjectsBlockAttributes {
	/** Map of kind_id → array of child post IDs. */
	childObjects?: ChildObjectIds;
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
	// (empty-PHP-array quirk); the state helpers normalize that away.
	const [ childObjectData, setChildObjectData] = useState<ChildObjectRecords | null>( null );
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
		apiFetch<ChildObjectRecords>( { path: `${baseRestPath}/all/${postId}/children` } ).then( setChildObjectData );
	}

	/**
	 * Persist the child ID map. `childObjectsStr` has no reader anywhere in the
	 * plugin, but it is registered meta, so keep it a faithful serialization of
	 * the same map rather than of whichever map the calling path had to hand.
	 */
	const saveChildObjects = ( ids: ChildObjectIds ) => {
		setAttributes( {
			childObjects    : ids,
			childObjectsStr : JSON.stringify( ids )
		} );
	}

	const addChildObject = ( child: WPCorePostResponse, kind: ObjectKindChild ) => {
		if ( kind.kind_id === null ) return;

		const { ids, records } = addChild(
			childObjects,
			childObjectData,
			kind.kind_id,
			newChildRecord( child )
		);

		setChildObjectData( records );
		saveChildObjects( ids );
	}

	const deleteChildObject = ( child: ChildObjectRecord, kind: ObjectKindChild ) => {
		if ( kind.kind_id === null ) return;

		const updated = removeChild(
			childObjects,
			childObjectData,
			kind.kind_id,
			child.ID
		);
		if ( ! updated ) return;

		setChildObjectData( updated.records );
		saveChildObjects( updated.ids );

		apiFetch( {
			path    :  `${wordpressRestPath}/${kind.type_name}/${child.ID}`,
			method  : 'DELETE'
		} ).then( result => console.log(result) );
	}

	const updateChildObject = ( child: ChildObjectRecord, kind: ObjectKindChild, data: { title: string } ) => {
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
		} = kind;

		// Children are created through the REST API rather than by opening a
		// new post in the editor, so WordPress never applies the post type's
		// template itself — and with `template_lock: 'all'` an empty child
		// gives the editor nothing to work with. Seed the content with the
		// same blocks the editor would have inserted.
		const postContent = block_template
			? serialize( synchronizeBlocksWithTemplate( [], block_template ) )
			: '';

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
			kindObjects       = { kind.kind_id !== null && childObjectData?.[ kind.kind_id ] ?
				childObjectData[ kind.kind_id ] :
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
