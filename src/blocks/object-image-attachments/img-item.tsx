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

import type { ImageSizeTuple, ObjectImage } from '../../types';

interface MoveToolbarProps {
	dragId: string;
	moveUp: () => void;
	moveDown: () => void;
	transferData?: { type: string; srcIndex: number };
}

const MoveToolbar = ( props: MoveToolbarProps ) => {
	const {
		dragId,
		moveUp,
		moveDown,
		transferData,
	} = props;

	return (
		// NOTE(wp-types): @wordpress/components' ToolbarProps requires a
		// `label` prop (the accessible toolbar variant), but this legacy
		// label-less usage works at runtime (renders as a ToolbarGroup).
		// Props cast to keep current behavior compiling.
		<Toolbar
			{ ...( { className: 'image-item-move-toolbar' } as any ) }
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

interface ImgItemProps {
	itemData: ObjectImage;
	imgId: number;
	onUpdate: ( imgId: number, title: string, caption: string, description: string, alt: string ) => void;
	clientId: string;
	moveItem: ( imgId: number, move: number ) => void;
	removeItem: ( imgId: number ) => void;
	imgIndex: number;
}

const ImgItem = ( props: ImgItemProps ) => {
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
				<img src = { ( thumbnail as ImageSizeTuple )[0] } alt = { alt || title || 'Image attachment' } />
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
