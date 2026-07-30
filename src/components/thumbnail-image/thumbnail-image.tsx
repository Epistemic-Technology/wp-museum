

import type { ImageDimensions } from '../image-size-panel/image-size-panel';

interface ThumbnailImageProps {
	/** URL of the thumbnail image to display. */
	thumbnailURL?: string | null;
	/** Dimensions for the placeholder when there is no thumbnail. */
	imgDimensions: ImageDimensions;
	/** Opens the search modal when the placeholder is clicked. */
	setSearchModalOpen: ( isOpen: boolean ) => void;
	/** Alt text for the thumbnail, falling back to `title`. */
	alt?: string;
	/** Title used as alt text when `alt` is not supplied. */
	title?: string;
}

const ThumbnailImage = ( props: ThumbnailImageProps ) => {
	const {
		thumbnailURL,
		imgDimensions,
		setSearchModalOpen,
		alt,
		title,
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
