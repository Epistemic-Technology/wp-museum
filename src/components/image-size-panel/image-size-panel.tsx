/**
 * Component to resize images in museum object embeds.
 */

 /**
  * WordPress dependencies
  */
import {
	PanelBody,
	TextControl,
	ButtonGroup,
	Button,
	Dashicon,
	SelectControl
} from '@wordpress/components';

import { __ } from "@wordpress/i18n";

/**
 * The width, height, and named size (thumbnail, medium, large, or '') of the
 * image, as stored in block attributes.
 */
export interface ImageDimensions {
	height: number;
	width: number;
	size: string;
}

interface ImageSizePanelProps {
	/** Function to set block attributes. */
	setAttributes: ( attributes: {
		imgDimensions?: ImageDimensions;
		imgAlignment?: string;
	} ) => void;
	/**
	 * The current width, height, or size (thumbnail, medium, large, full) of
	 * the image.
	 */
	imgDimensions: ImageDimensions;
	/** The current alignment of the image (left, center, right). */
	imgAlignment?: string;
	initialOpen?: boolean;
}

/**
 * Inspector panel component that allows user to select or adjust embedded
 * image sizes.
 *
 * @param {object}   props               Component properties.
 * @param {function} props.setAttributes Function to set block attributes.
 * @param {object}   props.imgDimensions The current width, height, or size (thumbnail, medium,
 *                                       large, full) of the image.
 * @param {string}   props.imgAlignment  The current alignment of the image (left, center, right).
 */
const ImageSizePanel = ( props: ImageSizePanelProps ) => {
	const {
		setAttributes,
		imgDimensions,
		imgAlignment,
		initialOpen,
	} = props;

	const { width, height, size } = imgDimensions;

	const imgSizes: Record<string, { height: number; width: number }> = {
		thumbnail: { height: 150,  width: 150  },
		medium:    { height: 300,  width: 300  },
		large:     { height: 1024, width: 1024 },
	}

	const imageSizeOptions = [
		{ value: '',          label: '' },
		{ value: 'thumbnail', label: __( 'Thumbnail' ) },
		{ value: 'medium',    label: __( 'Medium' ) },
		{ value: 'large',     label: __( 'Large' ) },
	];

	/**
	 * Resize the image to target size, preserving aspect ratio.
	 *
	 * @param {string} size New size of image, from imgSizes
	 */
	const updateImage = ( size: string ) => {
		setAttributes ( {
			imgDimensions: {
				height : imgSizes[ size ].height,
				width  : imgSizes[ size ].width,
				size   : size
			}
		} );
	}

	/**
	 * Resize the image to new height, maintaining aspect ratio.
	 *
	 * @param {number} newHeight New height of image, in pixels.
	 */
	const updateHeight = ( newHeight: string ) => {
		setAttributes ( {
			imgDimensions: {
				height : Number( newHeight ),
				width  : imgDimensions.width,
				size   : ''
			}
		} );
	}

	/**
	 * Resize the image to new width, maintaining aspect ratio.
	 *
	 * @param {number} newWidth New width of image, in pixels.
	 */
	const updateWidth = ( newWidth: string ) => {
		setAttributes ( {
			imgDimensions: {
				height : imgDimensions.height,
				width  : Number( newWidth ),
				size   : ''
			}
		} );
	}

	/**
	 * Changes the image alignment.
	 *
	 * @param {string} newAlignment New alignment for image.
	 */
	const updateimgAlignment = ( newAlignment: string ) => {
		setAttributes( { imgAlignment: newAlignment } );
	}

	return (
		<PanelBody
			title = { __( 'Image Settings' ) }
			initialOpen = { initialOpen }
		>
			<SelectControl
				label    = { __( 'Image Size' ) }
				value    = { size }
				options  = { imageSizeOptions }
				onChange = { updateImage }
			/>
			<div>
				<p>{ __( 'Image Dimensions' ) }</p>
				<TextControl
					type     = "number"
					label    = { __( 'Width' ) }
					value    = { width || '' }
					min      = { 1 }
					onChange = { updateWidth }
				/>
				<TextControl
					type     = "number"
					label    = { __( 'Height' ) }
					value    = { height || '' }
					min      = { 1 }
					onChange = { updateHeight }
				/>
			</div>
			{ imgAlignment &&
				<div>
					<p>{ __( 'Image Alignment' ) }</p>
					<ButtonGroup>
						<Button
							variant   = { imgAlignment === 'left' ? 'primary' : undefined }
							onClick   = { () => { updateimgAlignment( 'left' ) } }
						>
							<Dashicon icon = 'align-left'/>
						</Button>
						<Button
							variant   = { imgAlignment === 'center' ? 'primary' : undefined }
							onClick   = { () => { updateimgAlignment( 'center' ) } }
						>
							<Dashicon icon = 'align-center'/>
						</Button>
						<Button
							variant   = { imgAlignment === 'right' ? 'primary' : undefined }
							onClick   = { () => { updateimgAlignment( 'right' ) } }
						>
							<Dashicon icon = 'align-right'/>
						</Button>
					</ButtonGroup>
				</div>
			}
		</PanelBody>
	);
}

export default ImageSizePanel;
