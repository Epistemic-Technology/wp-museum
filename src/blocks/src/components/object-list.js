const ObjectRow = props => {
	const {
		objectData,
		displayImage
	} = props;

	const {
		post_title,
		link,
		excerpt,
		thumbnail
	} = objectData;

	return (
		<div className = 'object-row'>
			<a href = { link }><h2>{ post_title }</h2></a>
			<div className = 'object-row-content'>
				{ displayImage && 
					<div className = 'object-row-image'>
						<a href = { link }><img src={thumbnail[0]} /></a>
					</div>
				}
				<div className = 'object-info'>
					<p>{ excerpt }</p>
				</div>
			</div>
		</div>
	);
}

const ObjectList = props => {
	const {
		objects,
		displayImages
	} = props;

	const ObjectRows = !! objects &&
		objects.map( result => 
			<ObjectRow
				objectData   = { result }
				displayImage = { displayImages }
			/>
		);
	
	return (
		<div className = 'search-results'>
			{ ObjectRows }
		</div>
	);
}

export default ObjectList;