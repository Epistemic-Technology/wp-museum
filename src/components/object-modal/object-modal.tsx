import {
	useState
} from '@wordpress/element';

import {
	Modal,
	Button
} from '@wordpress/components';

import type { ReactNode } from 'react';

import {
	chevronLeft,
	chevronRight
} from '../../icons';
import { getBestImage } from '../../javascript/util';

import type { ObjectImage, ObjectImagesResponse } from '../../types';



interface ImageScrollProps {
	/**
	 * The object's images, or null while the fetch is still pending. An
	 * object with no attached images arrives as an empty array (see
	 * EmptyPhpArray), so neither case can be assumed away.
	 */
	images: ObjectImagesResponse | null;
}

const ImageScroll = ( props: ImageScrollProps ) => {
	const {
		images
	} = props;

	const imgArray: ObjectImage[] = !! images ? Object.values( images ) : [];
	imgArray.sort( (a, b) => a['sort_order'] - b['sort_order'] );

	const [ imgIndex, setImgIndex ] = useState( 0 );

	const imgDimensions = {
		height: 1024,
		width: 1024
	}

	const updateImgIndex = ( increment: number ) => {
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

	// Nothing to scroll through: the images are still loading, or the object
	// has none. The modal's title, excerpt and link are still worth showing,
	// so render the frame without an image rather than refusing to open.
	if ( imgArray.length === 0 ) {
		return (
			<div
				className  = 'object-modal-image-scroll'
				aria-label = 'Image gallery showing 0 images'
			/>
		);
	}

	const bestImage = getBestImage( imgArray[ imgIndex ], imgDimensions );

	return (
		<div className = 'object-modal-image-scroll' aria-label={`Image gallery showing ${imgArray.length} images`}>
			<Button
				className = 'image-scroll-button dec'
				icon      = { chevronLeft }
				label     = 'Previous image'
				aria-label = 'View previous image'
				onClick   = { () => updateImgIndex( -1 ) }
			/>
			<Button
				className = 'image-scroll-button inc'
				icon      = { chevronRight }
				label     = 'Next image'
				aria-label = 'View next image'
				onClick   = { () => updateImgIndex( 1 ) }
			/>
			<div className = 'img-wrapper' aria-live='polite' aria-atomic='true'>
				{ !! bestImage.URL &&
					<img
						src   = { bestImage.URL }
						title = { imgArray[imgIndex].title || '' }
						alt   = { imgArray[imgIndex].alt || imgArray[imgIndex].title || 'Museum object image' }
					/>
				}
			</div>
		</div>
	);
}

interface ObjectModalProps {
	title: string;
	content: ReactNode;
	url: string;
	linkText: ReactNode;
	images: ObjectImagesResponse | null;
	close: () => void;
}

const ObjectModal = ( props: ObjectModalProps ) => {
	const {
		title,
		content,
		url,
		linkText,
		images,
		close
	} = props;

	return (
		<Modal
			className = 'wpm-object-modal'
			title = { title }
			onRequestClose = { close }
		>
			<div className = 'object-modal-content-wrapper'>
				<div className = 'object-modal-content'>
					<div className = 'object-modal-image'>
						<ImageScroll
							images = { images }
						/>
					</div>
					<div className = 'object-modal-info'>
						<div className = 'read-more-link'>
								<a href = { url } aria-label={`View full details for ${title}`}>{ linkText }</a>
						</div>
						<div className = 'modal-content'>{ content }</div>
					</div>
				</div>
			</div>
		</Modal>
	);
}

export default ObjectModal;
