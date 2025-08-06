const ObjectEditorTableRow = props => {
	const {
		mObject
	} = props;
	
	const {
		link,
		edit_link         : editLink,
		post_title        : postTitle,
		post_status_label : postStatus
	} = mObject;

	return (
		<tr>
			<th scope="row">{ postTitle }</th>
			<td><a href = { editLink } aria-label={`Edit ${postTitle}`}>Edit</a></td>
			<td><a href = { link } aria-label={`View ${postTitle}`}>View</a></td>
			<td>{ postStatus }</td>
		</tr>
	);
}

const ObjectEditorTable = props => {
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