import { __ } from '@wordpress/i18n';

import type { MuseumObject } from '../../types';

/**
 * `post_status_label` is computed server-side but stripped by the REST
 * schema, so the label has to be derived from the slug here. Anything not
 * listed (a custom status) falls back to the slug itself.
 */
const POST_STATUS_LABELS: Record<string, string> = {
	publish : __( 'Published' ),
	draft   : __( 'Draft' ),
	pending : __( 'Pending Review' ),
	private : __( 'Private' ),
	future  : __( 'Scheduled' ),
	trash   : __( 'Trash' ),
};

interface ObjectEditorTableRowProps {
	mObject: MuseumObject;
}

const ObjectEditorTableRow = ( props: ObjectEditorTableRowProps ) => {
	const {
		mObject
	} = props;

	const {
		link,
		edit_link         : editLink,
		post_title        : postTitle,
		post_status       : postStatus
	} = mObject;

	return (
		<tr>
			<th scope="row">{ postTitle }</th>
			<td><a href = { editLink as string } aria-label={`Edit ${postTitle}`}>Edit</a></td>
			<td><a href = { link } aria-label={`View ${postTitle}`}>View</a></td>
			<td>{ POST_STATUS_LABELS[ postStatus ] ?? postStatus }</td>
		</tr>
	);
}

interface ObjectEditorTableProps {
	mObjects: MuseumObject[];
}

const ObjectEditorTable = ( props: ObjectEditorTableProps ) => {
	const {
		mObjects
	} = props;

	const mObjectRows = mObjects.map( mObject =>
		<ObjectEditorTableRow key={mObject.ID || mObject.post_title} mObject = { mObject } /> );

	return (
		<table className='wp-list-table widefat' role='table' aria-label='Museum objects list'>
			<thead>
				<tr>
					<th scope='col'>Object Title</th>
					<th scope='col'>Edit</th>
					<th scope='col'>View</th>
					<th scope='col'>Status</th>
				</tr>
			</thead>
			<tbody>
				{ mObjectRows }
			</tbody>
		</table>
	);
}

export default ObjectEditorTable;
