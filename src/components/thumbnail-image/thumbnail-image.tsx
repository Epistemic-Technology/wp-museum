

import type { ImageDimensions } from '../image-size-panel/image-size-panel';

// TODO(ts-migration): `alt` and `title` are referenced below but never declared or
// destructured from props — evaluating the <img> branch throws a ReferenceError at
// runtime. Preserving that behavior: `declare const` satisfies the compiler while
// emitting no code, so the identifiers remain undeclared at runtime.
declare const alt: any;
declare const title: any;

interface ThumbnailImageProps {
	/** URL of the thumbnail image to display. */
	thumbnailURL?: string | null;
	/** Dimensions for the placeholder when there is no thumbnail. */
	imgDimensions: ImageDimensions;
	/** Opens the search modal when the placeholder is clicked. */
	setSearchModalOpen: ( isOpen: boolean ) => void;
}

const ThumbnailImage = ( props: ThumbnailImageProps ) => {
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
