import { 
	useState,
	useEffect
} from '@wordpress/element';

import {
	RichText
} from '@wordpress/block-editor';

import {
	chevronUp,
	chevronDown,
	dragHandle,
	trash
} from '../../icons';

import {
	Toolbar,
	ToolbarButton,
	Draggable,
	Button
} from '@wordpress/components';


const MoveToolbar = ( props ) => {
	const {
		dragId,
		moveUp,
		moveDown,
		transferData,
	} = props;

	return (
		<Toolbar
			className = 'image-item-move-toolbar'
		>
			<ToolbarButton
				icon    = { chevronUp }
				onClick = { moveUp }
			/>
			<Draggable
				elementId = { dragId }
				transferData = { transferData }
			>
				{
					( { onDraggableStart, onDraggableEnd } ) => {
						return (
							<div
								draggable   = { true }
								onDragStart = { onDraggableStart }
								onDragEnd = { onDraggableEnd }
							>
								<ToolbarButton
									className   = 'img-drag-handle'
									icon        = { dragHandle }
								/>
							</div>
						);
					}
				}
			</Draggable>
			<ToolbarButton
				icon    = { chevronDown }
				onClick = { moveDown }
			/>
		</Toolbar>
	);
}

const ImgItem = ( props ) => {
	const { 
		itemData, 
		imgId,
		onUpdate,
		clientId,
		moveItem,
		removeItem,
		imgIndex,
	} = props;
	
	const {
		title,
		caption,
		description,
		alt,
		thumbnail,
	} = itemData;

	const dragId = `drag-${imgId}-${clientId}`;

	const [ titleVal, updateTitleVal ] = useState( title );
	const [ captionVal, updateCaptionVal ] = useState( caption );
	const [ descriptionVal, updateDescriptionVal ] = useState( description );
	const [ altVal, updateAltVal ] = useState( alt );

	const transferData = {
		type: 'div',
		srcIndex: imgIndex
	}

	const moveUp = () => {
		moveItem( imgId, -1 );
	}

	const moveDown = () => {
		moveItem( imgId, +1 );
	}

	useEffect( () => {
		onUpdate( imgId, titleVal, captionVal, descriptionVal, altVal );
	} );

	return (
		<div 
			className = 'img-attach-img-edit'
			id        = { dragId }
		>
			<Button
				className = 'img-remove-button'
				icon = { trash }
				onClick = { () => removeItem( imgId ) }
				title = 'Remove Image'
			/>
			<div className = 'img-attach-thumbnail'>
				<img src = { thumbnail[0] } alt = { alt || title || 'Image attachment' } />
			</div>
			<div className = 'img-attach-fields'>
				<div>
					<div className = 'img-attach-field-label'>Title</div>
					<RichText
						tagName = 'p'
						className = 'img-attach-field-input'
						value = { titleVal }
						allowedFormats  = { [ ] } 
						onChange = { val => updateTitleVal( val ) }
					/>
				</div>
				<div>
					<div className = 'img-attach-field-label'>Alt</div>
					<RichText
						tagName = 'p'
						className = 'img-attach-field-input'
						value = { altVal }
						allowedFormats  = { [ ] } 
						onChange = { val => updateAltVal( val ) }
					/>
				</div>
				<div>
					<div className = 'img-attach-field-label'>Caption</div>
					<RichText
						tagName = 'p'
						className = 'img-attach-field-input'
						value = { captionVal }
						onChange = { val => updateCaptionVal( val ) }
					/>
				</div>
				<div>
					<div className = 'img-attach-field-label'>Description</div>
					<RichText
						tagName = 'p'
						className = 'img-attach-field-input'
						value = { descriptionVal }
						onChange = { val => updateDescriptionVal( val ) }
					/>
				</div>
			</div>
			<MoveToolbar
				dragId   = { dragId }
				moveUp   = { moveUp }
				moveDown = { moveDown }
			/>
		</div>
	);
}

export default ImgItem;