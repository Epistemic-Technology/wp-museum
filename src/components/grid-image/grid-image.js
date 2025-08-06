/**
 * Single image box for an image grid.
 */

/**
 * WordPress dependencies
 */
import {
	useState
} from '@wordpress/element';

/**
  * Internal dependencies
  */
import ImageSelector from '../image-selector/image-selector';

import {
	ObjectSearchBox,
} from '../search-modal/search-modal';



/**
 * A single museum object image in an <ObjectGrid> component. This component only 
 * knows about itself, not about its context in the grid. It uses the
 * <ImageSelector> component to allow the user to select a particlular image from
 * an object's image gallery.
 * 
 * @param {object}   props                        The component's properties.
 * @param {number}   props.objectID               The WordPress post_id of the object.
 * @param {object}   props.imgDimensions          The *displayed* dimensions of the image 
 *                                                (width & height).
 * @param {string}   props.imgURL                 The URL of the image.
 * @param {number}   props.imgIndex               The index of the image in the array of the 
 *                                                object's image gallery.
 * @param {function} props.updateImgCallback      A callback function accepting an object { imgURL, 
 *                                                imgIndex}.
 * @param {function} props.updateObjectIDCallback A callback function accepting a WordPress post_id 
 *                                                (number or null).
 */
const GridImage = ( props ) => {
	const {
		objectID,
		imgDimensions,
		imgURL,
		imgIndex,
		updateImgCallback,
		updateObjectIDCallback,
	} = props;

	const [ imgData, updateImgData ] = useState( {
		imgHeight   : null,
		imgWidth    : null,
		totalImages : 0
	} );

	const [ modalOpen, setModalOpen ] = useState( false );

	/**
	 * Callback function passed to <ImageSelector> component. Properties that
	 * don't matter to ObjectGrid are tracked using internal state. Properties
	 * that do matter are passed along to parent.
	 * 
	 * @param {object} attrs The callback's attributes. 
	 */
	const setImgData = ( attrs ) => {
		const {
			imgURL,
			imgHeight,
			imgWidth,
			imgIndex,
			totalImages
		} = attrs;

		const newImgData = Object.assign( {}, imgData );
		let imgDataChanged = false;
		if ( typeof imgHeight !== 'undefined' && imgHeight != imgData.imgHeight ) {
			imgDataChanged = true;
			newImgData.imgHeight = imgHeight;
		}
		if ( typeof imgWidth !== 'undefined' && imgWidth != imgData.imgWidth ) {
			imgDataChanged = true;
			newImgData.imgWidth = imgWidth;
		}
		if ( typeof totalImages !== 'undefined' && totalImages != imgData.totalImages ) {
			imgDataChanged = true;
			newImgData.totalImages = totalImages;
		}
		if ( imgDataChanged ) {
			updateImgData( newImgData );
		}

		if (
			( typeof imgURL != 'undefined'   && imgURL != props.imgURL ) || 
			( typeof imgIndex != 'undefined' && imgIndex != props.imgIndex ) 
		) {
			updateImgCallback( {
				imgURL   : imgURL,
				imgIndex : imgIndex
			} );
		}
	}

	return (
		<div
			className = 'grid-image-container'
		>
			{ objectID ? 
				<div
					className = 'grid-image-image'
				>
					<ImageSelector
						objectID      = { objectID }
						imgIndex      = { imgIndex }
						totalImages   = { imgData.totalImages }
						imgDimensions = { imgDimensions }
						setImageSize  = { false }
						imgURL        = { imgURL }
						setImgData    = { setImgData }
					/>
					<button
						type      = 'button'
						className = 'removeImageLink'
						aria-label = 'Remove image from grid'
						onClick   = { () => updateObjectIDCallback( null ) }
					>
						[X]
					</button>
				</div>
				:
				<>
				<button
					type      = 'button'
					className = 'grid-image-placeholder'
					aria-label = 'Add image to grid'
					onClick   = { () => setModalOpen( true ) } 
				>
					<div
						className = 'grid-image-placeholder-plus'
					>
						+
					</div>
				</button>
				{ modalOpen &&
					<ObjectSearchBox
						close          = { () => setModalOpen( false ) }
						returnCallback = { newObjectID => updateObjectIDCallback( newObjectID ) }
					/>
				}
				</>
			}
		</div>
	);
}

export default GridImage;