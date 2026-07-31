import type { MuseumObject } from '../../types';

import withPagination from '../with-pagination/with-pagination';

import { decodeHtmlEntities } from '../../javascript/util';

interface ObjectRowProps {
	objectData: MuseumObject;
	displayImage: boolean;
}

const ObjectRow = ( props: ObjectRowProps ) => {
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

	const decodedPostTitle = decodeHtmlEntities( post_title );

	// thumbnail is `[]` for an object with no image, and null when the src
	// lookup failed; either way there is nothing to display.
	const thumbnailURL =
		Array.isArray( thumbnail ) && thumbnail.length > 0 ? thumbnail[ 0 ] : null;

	return (
		<div className = 'object-row'>
			<a href = { link }><h2>{ post_title }</h2></a>
			<div className = 'object-row-content'>
				{ displayImage &&
					<div className = 'object-row-image'>
						{ !! thumbnailURL &&
							<a href = { link }><img src={ thumbnailURL } alt={decodedPostTitle} /></a>
						}
					</div>
				}
				<div className = 'object-info'>
					<p>{ excerpt }</p>
				</div>
			</div>
		</div>
	);
}

interface ObjectListProps {
	mObjects: MuseumObject[];
	displayImages: boolean;
}

export const ObjectList = ( props: ObjectListProps ) => {
	const {
		mObjects,
		displayImages
	} = props;

	const ObjectRows = !! mObjects &&
		mObjects.map( result =>
			<ObjectRow
				key          = { result.ID }
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

export const PaginatedObjectList = withPagination( ObjectList );
