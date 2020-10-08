/**
 * Displays a grid of objects with captions.
 */

 import {
	 useState,
	 useEffect
 } from '@wordpress/element';

import {
	MaybeLink,
	fetchObjectImages,
	getBestImage,
	getFirstObjectImage
} from '../util';

import ObjectModal from '../components/object-modal';

const ObjectGridBox = props => {
	const {
		mObject,
		imgStyle           = '',
		displayTitle       = true,
		displayDate        = false,
		displayExcerpt     = false,
		linkToObject       = true,
		onClickCallback    = null,
		imgURL             = null,
	} = props;

	const {
		post_title : postTitle,
		post_date  : postDate,
		excerpt,
		link,
		thumbnail,
	} = mObject;

	let useImgURL;
	if ( imgURL ) {
		useImgURL = imgURL;
	} else {
		useImgURL = null;
	}

	return (
		<div
			className = 'object-grid-box-wrapper'
			style     = { imgStyle }
		>
			<MaybeLink
				href            = { link }
				doLink          = { linkToObject }
				onClickCallback = { onClickCallback }
			>
				<div 
					className = 'object-grid-box'
				>
					<div className = 'object-grid-thumbnail-div'>
						{ !! useImgURL &&
							<img 
								src   = { useImgURL }
								title = { postTitle }
								alt   = { postTitle }
							/>
						}
					</div>
					<div className = 'object-grid-caption-div'>
						{ displayDate && !! postDate &&
							<div className = 'ogc-date'>{ postDate }</div>
						}
						{ displayTitle && !! postTitle &&
							<h3>{ postTitle }</h3>
						}
						{ displayExcerpt && !! excerpt &&
							<div className = 'ogc-excerpt'>{ excerpt }</div>
						}
					</div>
				</div>
			</MaybeLink>
		</div>
	);
}

const ObjectGridBoxDynamicImage = props => {
	const {
		mObject,
		displayTitle,
		displayDate,
		displayExcerpt,
		linkToObject,
		imgStyle,
		targetWidthHeight = 300,
		doObjectModal     = false,
	} = props;

	const {
		post_title : postTitle,
		post_date  : postDate,
		excerpt,
		link,
		thumbnail,
	} = mObject;

	const [ imgData, setImgData ] = useState( null );
	const [ modalOpen, setModalOpen ] = useState( false );

	useEffect( () => {
		setImgData( null );
		fetchObjectImages( mObject.ID ).then( result => {
			if ( result ) {
				setImgData( result );
			}
		} );
	}, [ mObject ] );

	let bestImage = null;
	if ( imgData != null && Object.entries(imgData).length > 0 ) {
		bestImage = getBestImage(
			getFirstObjectImage( imgData ),
			{ width: targetWidthHeight, height: targetWidthHeight }
		);
	}

	return (
		<>
			<ObjectGridBox
				mObject         = { mObject }
				imgStyle        = { imgStyle }
				displayTitle    = { displayTitle }
				displayDate     = { displayDate }
				displayExcerpt  = { displayExcerpt }
				linkToObject    = { linkToObject }
				onClickCallback = { () => setModalOpen( true ) }
				imgURL          = { !! bestImage ? bestImage.URL : null }
			/>
			{ doObjectModal && modalOpen && 
				<ObjectModal
					title     = { postTitle }
					content   = { excerpt }
					url       = { link }
					linkText  = 'View full entry'
					images    = { imgData }
					close     = { () => setModalOpen( false ) }
				/>
			}
		</>
	);
}

const ObjectGrid = props => {
	const {
		mObjects,
		columns        = 3,
		displayTitle   = true,
		displayDate    = false,
		displayExcerpt = false,
		linkToObjects  = false,
		doObjectModal  = true,
	} = props;

	if ( ! mObjects || mObjects.length == 0 ) {
		return null;
	}

	const percentWidth = Math.round( 1 / columns * 100 ) + '%';
	const imgStyle = {
		flexBasis: `calc(${percentWidth} - 10px)`
	}

	const gridObjects = mObjects.map( mObject => (
		<ObjectGridBoxDynamicImage
			mObject        = { mObject }
			imgStyle       = { imgStyle }
			displayTitle   = { displayTitle } 
			displayDate    = { displayDate }
			displayExcerpt = { displayExcerpt }
			linkToObject   = { linkToObjects }
			doObjectModal  = { doObjectModal }
		/>
	) );

	return (
		<div className = 'wpm-object-grid'>
			{ gridObjects }
		</div>
	);
}

export default ObjectGrid;