

const ThumbnailImage = props => {
	const {
		thumbnailURL,
		imgDimensions,
		setSearchModalOpen,
	} = props;

	const thumbnailImageOrPlaceholder = thumbnailURL ?
		<img src = { thumbnailURL } alt = { alt || title || 'Thumbnail image' } /> :
		<div
			className = 'thumbnail-placeholder'
			style     = { { height: imgDimensions.height, width: imgDimensions.width } }
			onClick   = { event => {
				event.stopPropagation();
				setSearchModalOpen( true )
			} }
		>
			<div className = 'thumbnail-placeholder-plus'>+</div>
		</div>
	
	return (
		<div className = 'thumbnail-wrapper'>
			{ thumbnailImageOrPlaceholder }
		</div>
	)
}

export default ThumbnailImage;