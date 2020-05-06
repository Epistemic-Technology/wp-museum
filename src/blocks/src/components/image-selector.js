/**
 * A component that allows the user to select a particular image from a museum
 * object's image gallery.
 */

/**
 * WordPress dependencies
 */
import {
	useState,
	useEffect
} from '@wordpress/element';

import apiFetch from "@wordpress/api-fetch";

import {
	IconButton,
} from '@wordpress/components'
import { getBestImage } from '../util';

/**
 * A component used by various blocks that allows the user to select a
 * particular image from a museum object's image gallery. Left and right arrows
 * allow the user to scroll through the object's images, and the component
 * updates the imgURL of its parent.
 *
 * WordPress stores multiple image files of different sizes. This component
 * uses the smallest image equal to or larger than the desired image
 * dimensions.
 * 
 * @see <ObjectGrid> and <ObjectImage> for examples of use.
 * 
 * @param {object}   props               The component's properties.
 * @param {number}   props.objectID      The object's WordPress post_id.
 * @param {number}   props.imgIndex      The array index of the image in the object's gallery.
 * @param {number}   props.totalImages   The total number of images in the object's gallery.
 * @param {object}   props.imgDimensions The *displayed* size of the image {width, height}.
 * @param {function} props.setImgData    Callback function for setting image data.
 * @param {string}   props.imgURL        The URL of the currently selected image.
 * @param {boolean}  props.setImageSize  Whether component should specify height and width of image
 *                                       when displaying it.
 */
const ImageSelector = ( props ) => {
	const {
		objectID,
		imgIndex,
		totalImages,
		imgDimensions,
		setImgData,
		imgURL,
		setImageSize,
	} = props;

	const [ imageData,       updateImageData       ] = useState( null );
	const [ fetchedObjectID, updateFetchedObjectID ] = useState( null );
	const [ currentImgD,     updateCurrentImgD     ] = useState( null );
	const [ imageChanged,    updateImageChanged    ] = useState( false );

	const rest_path = `/wp-museum/v1/all/${objectID}/images`;

	/**
	 * Changes the array index of the image to be displayed by +1 or -1 and
	 * wraps around appropriately.
	 * 
	 * @param {number} increment Change to the image index ( +1 | -1 ). 
	 */
	const updateImageIndex = ( increment ) => {
		let newImgIndex = imgIndex + increment;
		if ( totalImages === 0 ) {
			newImgIndex = 0
		} else if ( newImgIndex < 0 ) {
			newImgIndex = totalImages - 1;
		} else if ( newImgIndex >= totalImages ) {
			newImgIndex = 0
		}

		setImgData( { imgIndex: newImgIndex } );
	}

	/**
	 * Updates image data from the WordPress REST api.
	 *
	 * If objectID has been updated, then reset the image data. If the image
	 * data is not set, then fetch it from the REST api. The REST request
	 * returns an array of image data for each object image. Find the best fit
	 * image for the selected image and set that using the setImgData callback.
	 */
	useEffect( () => {
		if ( objectID !== null ) {
			if ( objectID !== fetchedObjectID ) {
				updateFetchedObjectID( objectID );
				updateImageData( null );
			} else if  ( currentImgD === null || ( currentImgD.height != imgDimensions.height || currentImgD.width != imgDimensions.width ) ) {
				updateImageData( null );
				updateCurrentImgD( {
					height: imgDimensions.height,
					width:  imgDimensions.width
				} );
			} else if ( imageData === null ) {
				apiFetch( { path: rest_path } ).then( result => updateImageData( result ) );
				updateImageChanged( true );
			} else if ( imageData.length > 0 && ( imageChanged || imgURL === null || totalImages === 0 ) ) {
				updateCurrentImgD( {
					height: imgDimensions.height,
					width:  imgDimensions.width
				} );
				updateImageChanged( false );
				const bestFitImage = getBestImage( imageData[ imgIndex ], imgDimensions );
				setImgData ( {
					imgURL      : bestFitImage.URL,
					imgHeight   : bestFitImage.height,
					imgWidth    : bestFitImage.width,
					totalImages : imageData.length,
				} );
			}
		}
	} );

	// Using background image propery of <div> rather than an <img> tag in
	// order to make a square images. This isn't ideal, but seems to be the
	// best way of achieving a flexible square grid without resorting to
	// javascript or something. Ultimately the save function of the block might
	// do something different.
	const selectorStyle = {
		backgroundImage: `url('${imgURL}')`
	}

	const placeHolderStyle = {}

	if ( setImageSize && imgDimensions ) {
		selectorStyle.height    = imgDimensions.height;
		selectorStyle.width     = imgDimensions.width;
		placeHolderStyle.height = imgDimensions.height;
		placeHolderStyle.width  = imgDimensions.width;
	}

	return (
		( imgURL ) ?
			<div
				className = 'image-selector-container'
				style     = { selectorStyle }
			>
				<IconButton
					className = 'left-arrow selector-button'
					icon      = 'arrow-left-alt2'
					onClick   = { () => updateImageIndex( -1 ) }
				/>
				<IconButton
					className = 'right-arrow selector-button'
					icon      = 'arrow-right-alt2'
					onClick   = { () => updateImageIndex( 1 ) }
				/>
			</div>
		:
			<div 
				className = 'img-placeholder'
				style     = { placeHolderStyle }
			></div>	
	);

	
}

// setImage size really only needs to be set by components that want to do
// something special with the image layout, such as <ObjectGrid>.
ImageSelector.defaultProps = {
	setImageSize: true,
}

export default ImageSelector;