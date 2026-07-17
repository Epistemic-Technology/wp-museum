import type { MuseumObject } from '../../types';

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
		// TODO(ts-migration): post_status_label is stripped by the REST
		// schema and never exists on the wire — always undefined. Preserving
		// existing (buggy) behavior.
		post_status_label : postStatus
	} = mObject as MuseumObject & { post_status_label?: string };

	return (
		<tr>
			<th scope="row">{ postTitle }</th>
			<td><a href = { editLink } aria-label={`Edit ${postTitle}`}>Edit</a></td>
			<td><a href = { link } aria-label={`View ${postTitle}`}>View</a></td>
			<td>{ postStatus }</td>
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
