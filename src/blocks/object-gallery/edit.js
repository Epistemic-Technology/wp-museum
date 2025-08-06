/**
 * Gutenberg editor view of for Object Gallery block. Creates <ObjectGallery>
 * component.
 */

/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	RichText,
	useBlockProps
} from '@wordpress/block-editor'

import { 
	PanelBody,
	RangeControl,
} from '@wordpress/components';

import { __ } from "@wordpress/i18n";
import apiFetch from '@wordpress/api-fetch';

import {
	useState
} from '@wordpress/element';

/**
 * Internal dependencies
 */
import {
	GridOptionsPanel,
	FontSizePanel,
	ObjectEmbedPanel,
	ObjectSearchBox
} from '../../components';

import { getBestImage } from '../../javascript/util';

/**
 * 
 * @param {object} props Component's properties
 */
const ColumnsPanel = ( props ) => {
	const {
		initialOpen,
		columns,
		updateColumns
	} = props;

	return (
		<PanelBody
			initialOpen = { initialOpen }
		>
			<RangeControl
				label    = 'Columns'
				value    = { columns }
				onChange = { columns => updateColumns( columns ) }
				min      = { 1 }
				max      = { 8 }
			/>
		</PanelBody>
	);
}


const GalleryGrid = ( props ) => {
	const {
		imgData,
		columns,
		onSearchModalReturn,
	} = props;

	const [ modalOpen, setModalOpen ] = useState( false );

	const percentWidth = Math.round( 1 / columns * 100 ) + '%';
	const imgStyle = {
		flexBasis: percentWidth
	}
	const placeholderStyle = {
		flexBasis: `calc( ${percentWidth} - 6px)`
	}

	let grid;
	if ( imgData.length > 0 ) {
		grid = imgData.map( ( imgItem, index ) =>
			<div
				className = 'gallery-image-wrapper'
				style     = { imgStyle }
				key       = { `image-${index}` }
			>
				<img
					src = { imgItem.imgURL }
					alt = { imgItem.alt || imgItem.title || 'Gallery image' }
				/>
			</div>
		);
	} else {
		grid = [];
		for ( let column = 0; column < columns; column++ ) {
			grid[ column ] = (
				<div
					className = 'gallery-image-placeholder'
					style     = { placeholderStyle }
					key       = { `image-${column}` }
					onClick   = { () => setModalOpen( true ) }
				>
						<div className = 'gallery-image-placeholder-plus'>
							+
						</div>
				</div>
			);
		}
	}
	

	return (
		<>
			<div
				className = 'gallery-grid'
			>
				{ grid }
			</div>
			{ modalOpen &&
				<ObjectSearchBox
					close          = { () => setModalOpen( false ) }
					returnCallback = { onSearchModalReturn }
				/>
			}
		</>
	);
}

const ObjectGallery = ( props ) => {

	const {
		attributes,
		setAttributes
	} = props;

	const {
		columns,
		titleTag,
		captionText,
		title,
		catID,
		displayCaption,
		displayTitle,
		displayCatID,
		objectID,
		objectURL,
		linkToObject,
		fontSize,
		imgData,
		imgDimensions,
	} = attributes;

	const TitleTag = titleTag;

	const onSearchModalReturn = ( newObjectID ) => {

		const base_rest_path = '/wp-museum/v1/';

		if ( newObjectID ) {
			setAttributes ( {
				objectID : newObjectID,
				imgData  : [],
				title    : null,
				catID    : null
			} );

			const object_path = base_rest_path + 'all/' + newObjectID;
			apiFetch( { path: object_path } ).then( result => {
				setAttributes( {
					title     : result[ 'post_title' ],
					objectURL : result[ 'link' ],
					catID     : result[ result[ 'cat_field' ] ],
				} );
			} );

			apiFetch( { path: `${object_path}/images`} ).then( result => {
				const newImgData = [];
				const images = Object.values( result );
				for ( let index = 0; index < images.length; index++) {
					let bestFitImage = getBestImage( images[ index ], imgDimensions );
					newImgData[ index ] = { imgURL: bestFitImage.URL };
				}
				setAttributes( {
					imgData: newImgData
				} );
			} );
		}
	}

	const blockProps = useBlockProps();
	
	return (
		<div { ...blockProps }>
			<InspectorControls>
				<ObjectEmbedPanel
					onSearchModalReturn = { onSearchModalReturn }
					title               = { title }
					catID               = { catID }
					objectID            = { objectID }
					objectURL           = { objectURL }
					initialOpen         = { true }
				/>
				<ColumnsPanel
					initialOpen = { true }
					columns     = { columns }
					updateColumns = { val => setAttributes( { columns: val } ) }
				/>
				<GridOptionsPanel
					initialOpen    = { true }
					displayTitle   = { displayTitle }
					displayCaption = { displayCaption }
					linkToObject   = { linkToObject }
					displayCatID   = { displayCatID }
					setAttributes  = { setAttributes }
				/>
				<FontSizePanel
					setAttributes = { setAttributes }
					titleTag      = { titleTag }
					fontSize      = { fontSize }
					initialOpen   = { false }
				/>
			</InspectorControls>
			<div
				className = 'object-gallery-block'
			>
				{ displayTitle &&
					<TitleTag>
						{ title }
					</TitleTag>
				}
				<GalleryGrid
					imgData             = { imgData }
					columns             = { columns }
					onSearchModalReturn = { onSearchModalReturn}
				/>
				<div
					className = 'bottom-text-wrapper'
					style     = { { fontSize: fontSize + 'em' } }
				>
					{ displayCatID && 
						<div
							className = 'cat-id'
						>
							{ catID }
						</div>
					}
					{ displayCaption &&
						<RichText
							tagName            = 'p'
							className          = 'caption-text-field'
							value              = { captionText } 
							allowedFormats     = { [ 'core/bold', 'core/italic', 'core/link' ] } 
							onChange           = { ( content ) => setAttributes( { captionText : content } ) } 
							placeholder        = { __( 'Enter caption...' ) } 
						/>
					}
				</div>
			</div>
		</div>
	);
}

export default ObjectGallery;