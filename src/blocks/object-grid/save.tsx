/**
 * Returns static HTML for frontend display of block.
 */

/**
 * WordPress dependencies
 */
import { RichText } from '@wordpress/block-editor';

/**
 * Internal dependencies
 */
import type { ObjectGridAttributes } from './edit';

interface SaveProps {
	/** The block's attributes. */
	attributes: ObjectGridAttributes;
}

export default function save ( { attributes }: SaveProps ) {
	const {
		columns,
		rows,
		objectData,
		title,
		displayTitle,
		captionText,
		displayCaption,
		linkToObject,
		fontSize,
		titleTag
	} = attributes;

	const TitleTag = titleTag as keyof HTMLElementTagNameMap;

	const imageGrid = [];
	for ( let row = 0; row < rows; row++ ) {
		let imageRow = [];
		for ( let column = 0; column < columns; column++ ) {
			const gridIndex = column + row * columns;
			const {
				imgURL,
				objectURL,
				objectTitle
			} = objectData[ gridIndex ];
			let gridImage;

			if ( imgURL ) {
				gridImage = (
					<div
						className = 'grid-image-container'
					>
						<div
							className = 'grid-image-image'
							role      = 'img'
							title     = { objectTitle }
							style     = { { backgroundImage: `url('${imgURL}')` } }
						>
						</div>
					</div>
				);
			} else {
				gridImage = (
					<div
						className = 'grid-image-placeholder'
					>
					</div>
				);
			}
			if ( objectURL && linkToObject ) {
				gridImage = (
					<a
						href = { objectURL }
					>
						{ gridImage }
					</a>
				);
			}
			gridImage = (
				<td
					key = { 'cell-' + gridIndex }
				>
					{ gridImage }
				</td>
			);
			imageRow.push( gridImage );
		}
		imageGrid.push( 
			<tr
				key = { 'row-' + row }
			>
				{ imageRow }
			</tr>
		);
	}

	const imageTable = (
		<table>
			<tbody>
				{ imageGrid }
			</tbody>
		</table>
	);

	return (
		<div
			className = 'object-grid-container'
		>
			{ displayTitle && title &&
				<RichText.Content
					className = 'title-text-field'
					tagName   = { TitleTag }
					value     = { title }
				/>
			}
			{ imageTable }
			{ displayCaption && captionText &&
				<RichText.Content
					className = 'caption-text-field'
					style     = { { fontSize: fontSize + 'em' } }
					tagName   = 'p'
					value     = { captionText }
				/>
			}
		</div>
	);

}