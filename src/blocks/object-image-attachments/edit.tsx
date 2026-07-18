import {
	useState,
	useEffect,
} from '@wordpress/element';
import {
	useSelect,
} from '@wordpress/data';
import {
	Button,
	PanelBody
} from '@wordpress/components'
import apiFetch from '@wordpress/api-fetch';
import {
	MediaUpload,
	MediaUploadCheck,
	InspectorControls,
	useBlockProps,
} from '@wordpress/block-editor';

import ImgItem from './img-item';

import type { ObjectImage, ObjectImagesResponse } from '../../types';

interface MediaSelection {
	id: number;
}

interface MediaUploadLauncherProps {
	renderCallback: ( props: { open: () => void } ) => JSX.Element;
	addNewMedia: ( media: MediaSelection[] ) => void;
}

const MediaUploadLauncher = ( props: MediaUploadLauncherProps ) => {
	const {
		renderCallback,
		addNewMedia
	} = props;

	return (
		<MediaUploadCheck>
			<MediaUpload
				onSelect     = { addNewMedia }
				multiple     = { true }
				allowedTypes = { [ 'image' ] }
				render       = { renderCallback }
				gallery      = { true }
			/>
		</MediaUploadCheck>
	)
}

interface ObjectImageAttachmentAttributes {
	imgAttach: number[];
	imgAttachStr: string;
}

interface ObjectImageAttachmentEditProps {
	attributes: ObjectImageAttachmentAttributes;
	setAttributes: ( attributes: Partial<ObjectImageAttachmentAttributes> ) => void;
	clientId: string;
}

const ObjectImageAttachmentEdit = ( props: ObjectImageAttachmentEditProps ) => {
	const { attributes, setAttributes, clientId } = props;
	const { imgAttach, imgAttachStr } = attributes;
	const blockProps = useBlockProps();

	const [ imgData, setImgData ] = useState<Record<string, ObjectImage> | null>( null );

	const { postType, postId, isSavingPost } = useSelect(
		( select ) => {
			const {
				getCurrentPostType,
				getCurrentPostId,
				isSavingPost,
			} = select( 'core/editor' ) as {
				getCurrentPostType: () => string;
				getCurrentPostId: () => number;
				isSavingPost: () => boolean;
			};
			return {
				postType          : getCurrentPostType(),
				postId            : getCurrentPostId(),
				isSavingPost      : isSavingPost(),
			}
		},
		[]
	);

	const baseRestPath = '/wp-museum/v1';

	useEffect( () => {
		if ( ! imgData ) {
			fetchImageData();
		}
	} );

	useEffect( () => {
		if ( isSavingPost && imgData ) {
			Object.entries( imgData ).forEach( ( [ itemId, itemData ] ) => {
				apiFetch( {
					path: `/wp/v2/media/${itemId}`,
					method: 'POST',
					data: {
						'title'       : itemData.title,
						'caption'     : itemData.caption,
						'alt_text'    : itemData.alt,
						'description' : itemData.description,
						'sort_order'  : itemData.sort_order,
					}
				} );
			} );
		}
	} );

	const updateImgData = ( imgId: number, title: string, caption: string, description: string, alt: string ) => {
		// TODO(strict): possible null at runtime
		imgData![imgId].title       = title;
		imgData![imgId].caption     = caption;
		imgData![imgId].description = description;
		imgData![imgId].alt         = alt;
	}

	const updateImgAttach = ( updatedImgAttach: number[] ) => {
		setAttributes( {
			imgAttach: updatedImgAttach,
			imgAttachStr: JSON.stringify( updatedImgAttach ),
		} );
		apiFetch( {
			path   : `${baseRestPath}/all/${postId}/images/`,
			method : 'POST',
			data   : {
				'images' : updatedImgAttach,
			}
		} ).then( fetchImageData );
	}

	const fetchImageData = () => {
		// The wire response is an empty JSON ARRAY `[]` (not `{}`) when the
		// object has no attached images; assertion preserves existing handling.
		apiFetch<ObjectImagesResponse>( { path: `${baseRestPath}/all/${postId}/images` } )
				.then( result => setImgData( result as Record<string, ObjectImage> ) );
	}

	const addNewImages = ( media: MediaSelection[] ) => {
		if ( Array.isArray( media ) && media.length > 0 ) {
			const updatedImgAttach = ( Array.isArray( imgAttach ) ? [ ...imgAttach ] : [] );
			let changes = false;
			media.forEach( mediaItem => {
				if ( updatedImgAttach.findIndex( item => item === mediaItem.id ) === -1 ) {
					updatedImgAttach.push( mediaItem.id );
					changes = true;
				}
			} );
			if ( changes ) {
				updateImgAttach( updatedImgAttach );
			}
		}
	}

	const removeItem = ( imgId: number ) => {
		const updatedImgAttach = ( Array.isArray( imgAttach ) ? [ ...imgAttach ] : [] );
		const removeIndex = updatedImgAttach.findIndex( item => item === imgId );
		if ( removeIndex > -1 ) {
			updatedImgAttach.splice( removeIndex, 1 );
			updateImgAttach( updatedImgAttach );
		}
	}

	const moveItem = ( imgId: number, move: number ) => {
		const imgIndex = imgAttach.findIndex( id => id === imgId );
		const otherId = imgAttach[ imgIndex + move ];
		const newIndex = imgIndex + move;
		if ( newIndex < 0 || newIndex >= imgAttach.length ) {
			return;
		}
		imgAttach[ imgIndex ] = imgAttach[ newIndex ];
		imgAttach[ newIndex ] = imgId;
		// TODO(strict): possible null at runtime
		imgData![ imgId ].sort_order = newIndex;
		imgData![ otherId ].sort_order = imgIndex;

		const updatedImgAttach = ( Array.isArray(imgAttach) ? [ ...imgAttach ] : [] );
		setAttributes( {
			imgAttach: updatedImgAttach,
			imgAttachStr: JSON.stringify( updatedImgAttach )
		} );

	}

	let imgItems: ( JSX.Element | null )[] | null = null;
	if ( imgData && imgAttach) {
		imgItems = Object.entries( imgAttach ).map( ( [index, imgId ] ) => {
			if ( ! ( ( typeof imgData[ imgId ] ) === 'undefined' ) ) {
				return (
					<ImgItem
						key      = { imgId }
						itemData = { imgData[ imgId ] }
						imgId    = { imgId }
						onUpdate = { updateImgData }
						clientId = { clientId }
						moveItem = { moveItem }
						removeItem = { removeItem }
						imgIndex = { imgData[ imgId ].sort_order }
					/>
				);
			} else {
				return null;
			}
		} );
	}

	const mediaOpenButton = ( { open }: { open: () => void } ) => (
			<Button
				onClick = { open }
				isPrimary
			>
				Add Image(s)
			</Button>
	);

	const addImageDiv = ( { open }: { open: () => void } ) => (
		<div
			className = 'add-image-div'
			onClick   = { open }
		>
			<div className = 'image-div-message'>Add Image(s)</div>
		</div>
	);

	return (
		<>
		<InspectorControls>
			<PanelBody>
				<MediaUploadLauncher
					renderCallback = { mediaOpenButton }
					addNewMedia = { addNewImages }
				/>
			</PanelBody>
		</InspectorControls>
		<div {...blockProps}>
			<h3>Images</h3>
			<div className = 'img-attach-img-wrapper'>
				{ imgItems }
				<MediaUploadLauncher
					renderCallback = { addImageDiv }
					addNewMedia = { addNewImages }
				/>
			</div>
		</div>
		</>
	);
}

export default ObjectImageAttachmentEdit;
