
/**
 * Returns static HTML for frontend display of block.
 */

/**
 * WordPress dependencies
 */
import { hexToRgb } from '../../javascript/util';
import { RichText } from '@wordpress/block-editor';

/**
 * Internal dependencies
 */
import type { ObjectImageAttributes } from './edit';

export default function save ( { attributes }: { attributes: ObjectImageAttributes } ) {
	const {
		title,
		catID,
		captionText,
		imgURL,
		objectURL,
		displayTitle,
		displayCatID,
		displayCaption,
		linkToObject,
		imgDimensions,
		imgAlignment,
		fontSize,
		titleTag,
	} = attributes;

	const TitleTag = titleTag as keyof JSX.IntrinsicElements;


	const body = (
		<>
			{ imgURL && imgDimensions.height && imgDimensions.width &&
				<img
					className = { 'image-selector-image-' + imgAlignment }
					src       = { imgURL }
					height    = { imgDimensions.height }
					width     = { imgDimensions.width }
					alt       = { title || 'Museum object image' }
				/>
			}
			{ displayTitle && title &&
				<TitleTag>
					{ title }
				</TitleTag>
			}
			{ displayCatID && catID &&
				<div
					style     = { { fontSize: fontSize + 'em' } }
				>
					{ catID }
				</div>
			}
			{ displayCaption && captionText &&
				<RichText.Content
					className = 'caption-text-field'
					style     = { { fontSize: fontSize + 'em' } }
					tagName   = 'p'
					value     = { captionText }
				/>
			}
		</>
	);

	const linkedBody = ( linkToObject && objectURL ) ? <a className='object-link' href={ objectURL }>{ body }</a> : body;

	return (
		<div 
			className = 'image-selector'
		>
			{ linkedBody }
		</div>
	);
}