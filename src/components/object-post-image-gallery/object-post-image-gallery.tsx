import {
	useState,
	useEffect
} from '@wordpress/element';

import {
	Button,
	Modal
} from '@wordpress/components';

import {
	fetchObjectImages,
	getBestImage
} from '../../javascript/util';

import {
	chevronLeft,
	chevronRight
} from '../../icons';

import type { ObjectImage, ObjectImagesResponse } from '../../types';

interface ImgDimensions {
	width: number;
	height: number;
}

interface ObjectPostImageSideBoxProps {
	imgData?: ObjectImage | null;
	imgIndex?: number;
	openModal: ( imgIndex: number ) => void;
	imgDimensions?: ImgDimensions;
}

const ObjectPostImageSideBox = ( props: ObjectPostImageSideBoxProps ) => {
	const {
		imgData       = null,
		imgIndex      = 0,
		openModal,
		imgDimensions = { width: 200, height: 200 }
	} = props

	const bestImage = !! imgData ? getBestImage( imgData, imgDimensions ) : null;
	const altText = !! imgData ? imgData.alt : '';
	const titleText = !! imgData ? imgData.title : '';

	return (
		<div className = 'wpm_obj-image'>
			{ !! imgData &&
				<img
					// Non-null: bestImage is computed whenever imgData is
					// truthy, which the surrounding guard ensures.
					src     = { bestImage!.URL as string }
					alt     = { altText }
					title   = { titleText }
					onClick = { () => openModal( imgIndex ) }
				/>
			}
		</div>
	);
}

interface ObjectPostImageModalProps {
	imgData?: Record<string, ObjectImage>;
	imgIndex?: number;
	displayCaption?: boolean;
	displayDescription?: boolean;
	updateImgIndex: ( increment: number ) => void;
	close: () => void;
}

const ObjectPostImageModal = ( props: ObjectPostImageModalProps ) => {
	const {
		imgData            = {},
		imgIndex           = 0,
		displayCaption     = true,
		displayDescription = false,
		updateImgIndex,
		close
	} = props;

	const imgArray = Object.values( imgData )
		.sort( (a, b ) => a['sort_order'] - b['sort_order'] );

	const {
		title       = null,
		caption     = null,
		description = null,
		alt         = null,
	} = imgArray[ imgIndex ];

	const imgDimensions = {
		height: 1024,
		width: 1024
	}

	const bestImage = imgArray.length > 0 ?
		getBestImage( imgArray[ imgIndex ], imgDimensions ) :
		null;

	return (
		<Modal
			className      = 'wpm-object-post-image-modal'
			title          = { title || '' }
			onRequestClose = { close }
		>
			<div className = 'image-modal-content-wrapper'>
				<div className = 'image-modal-content'>
					<Button
						className = 'image-modal-button dec'
						icon      = { chevronLeft }
						onClick   = { () => updateImgIndex( -1 ) }
					/>
					<Button
						className = 'image-modal-button inc'
						icon      = { chevronRight }
						onClick   = { () => updateImgIndex( 1 ) }
					/>
					<div className = 'image-modal-image'>
						{ !! bestImage &&
							<img
								src   = { bestImage.URL as string }
								title = { title || '' }
								alt   = { alt || '' }
							/>
						}
					</div>
					<div className = 'image-modal-image-link'>
						<a
							// TODO(strict): possible null at runtime — 'full'
							// can be null on the wire (see ImageSizeTuple).
							href = { imgArray[ imgIndex ]['full']![0] }
							target = '_blank'
						>
							View Full Image
						</a>
					</div>
					{ displayCaption &&
						<div className = 'image-modal-caption'>
							{ caption }
						</div>
					}
					{ displayDescription &&
						<div className = 'image-modal-description'>
							{ description }
						</div>
					}
				</div>
			</div>
		</Modal>
	);
}

interface ObjectPostImageGalleryProps {
	postId: number;
}

const ObjectPostImageGallery = ( props: ObjectPostImageGalleryProps ) => {
	const {
		postId
	} = props;

	const [ imgData, setImgData ] = useState<ObjectImagesResponse>( {} );
	const [ modalOpen, setModalOpen ] = useState( false );
	const [ imgIndex, setImgIndex ] = useState( 0 );

	// TODO(ts-migration): pre-existing quirk — updateImgData is invoked with
	// postId below but never took a parameter (it closes over postId);
	// optional unused param keeps the call site unchanged.
	const updateImgData = ( _postId?: number ) => {
		fetchObjectImages( postId ).then( images => setImgData( images as ObjectImagesResponse ) );
	}

	const openModal = ( newImgIndex: number ) => {
		setImgIndex( newImgIndex );
		setModalOpen( true );
	}

	const updateImgIndex = ( increment: number ) => {
		const imgArray = Object.values( imgData );
		let targetIndex = imgIndex + increment;
		if ( imgArray.length === 0 ) {
			return;
		}
		if ( targetIndex < 0 ) {
			targetIndex = imgArray.length - 1;
		} else if ( targetIndex >= imgArray.length ) {
			targetIndex = 0;
		}
		setImgIndex( targetIndex );
	}

	useEffect( () => {
		if ( !! postId ) {
			updateImgData( postId );
		}
	}, [ postId ] );

	const imageSideboxes = ( Object.values( imgData ) as ObjectImage[] )
		.sort( (a, b ) => a['sort_order'] - b['sort_order'] )
		.map( ( singleImgData, index ) => (
			<ObjectPostImageSideBox
				imgData   = { singleImgData }
				imgIndex  = { index }
				openModal = { openModal }
			/>
	) );

	return (
		<>
		{ modalOpen &&
			<ObjectPostImageModal
				imgData        = { imgData as Record<string, ObjectImage> }
				imgIndex       = { imgIndex }
				updateImgIndex = { updateImgIndex }
				close          = { () => setModalOpen( false ) }
			/>
		}
		<div id = 'wpm_obj-gallery'>
			{ imageSideboxes }
		</div>
		</>
	)


}

export default ObjectPostImageGallery;
