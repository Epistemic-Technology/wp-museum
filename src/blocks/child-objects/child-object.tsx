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

import { decodeHtmlEntities } from '../../javascript/util';

import type { ChildObjectRecord } from './child-object-state';
import type { ImageSizeTuple } from '../../types';

interface ChildObjectProps {
	objectData: ChildObjectRecord;
	updateTitle: ( child: ChildObjectRecord, newTitle: string ) => void;
	deleteChildObject: ( child: ChildObjectRecord ) => void;
}

const ChildObject = ( props: ChildObjectProps ) => {
	const {
		objectData,
		updateTitle,
		deleteChildObject
	} = props;

	const {
		edit_link,
		link,
		post_title,
		thumbnail
	} = objectData;

	const decodedPostTitle = decodeHtmlEntities( post_title );

	const [ currentTitle, updateCurrentTitle ] = useState( post_title );

	const onTitleChange = ( newTitle: string ) => {
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
				{ thumbnail && ( thumbnail as ImageSizeTuple )[0] ?
					<img
						className = 'child-object-image'
						src       = { ( thumbnail as ImageSizeTuple )[0] }
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
							href    = { decodeHtmlEntities( edit_link ) }
							variant = 'secondary'
						>
							Edit
						</Button>
					}
					{ link &&
						<Button
							href    = { decodeHtmlEntities( link ) }
							variant = 'secondary'
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
