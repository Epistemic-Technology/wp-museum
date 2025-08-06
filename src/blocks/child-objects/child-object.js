import {
	RichText
} from '@wordpress/block-editor';

import {
	Button
} from '@wordpress/components';

import {
	useState
} from '@wordpress/element';

import {
	trash
} from '../../icons';

const decodeHTMLEntities = text => {
	var textArea = document.createElement('textarea');
	textArea.innerHTML = text;
	return textArea.value;
}

const ChildObject = props => {
	const {
		objectData,
		updateTitle,
		deleteChildObject
	} = props;

	const {
		edit_link,
		link,
		post_title,
		ID,
		thumbnail
	} = objectData;

	const [ currentTitle, updateCurrentTitle ] = useState( post_title );

	const onTitleChange = newTitle => {
		updateTitle( objectData, newTitle );
		updateCurrentTitle( newTitle )
	}

	const deleteObject = () => {
		// TODO: Replace with accessible modal dialog for better accessibility
		const confirmDelete = confirm( `Are you sure you want to delete ${post_title}? This cannot be undone.`);
		if ( ! confirmDelete ) return;
		deleteChildObject( objectData );
	}

	return (
		<div className = 'child-object'>
			<Button
				className = 'child-object-remove-button'
				icon      = { trash }
				onClick   = { deleteObject }
				title     = 'Delete Object'
				aria-label = {`Delete ${decodedPostTitle} object`}
			/>
			<div className = 'child-object-image-div'>
				{ thumbnail && thumbnail[0] ?
					<img
						className = 'child-object-image'
						src       = { thumbnail[0] }
						alt       = { decodedPostTitle }
					/>
					:
					<div className = 'child-object-image-placeholder'></div>
				}
			</div>
			<div className = 'child-object-content'>
				<div className = 'child-object-info'>
					<RichText
						className      = 'child-object-title-input'
						value          = { currentTitle }
						onChange       = { onTitleChange }
						allowedFormats = { [] }
					/>
				</div>
				<div className = 'child-object-actions'>
					{ edit_link && 
						<Button
							href = { decodeHTMLEntities( edit_link ) }
							isLarge
							isSecondary
						>
							Edit
						</Button> 
					}
					{ link && 
						<Button
							href = { decodeHTMLEntities( link ) }
							isLarge
							isSecondary
						>
							View
						</Button> 
					}
				</div>
			</div>

		</div>
	);
}

export default ChildObject;