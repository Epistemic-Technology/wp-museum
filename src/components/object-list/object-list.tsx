import type { ImageSizeTuple, MuseumObject } from '../../types';

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

	return (
		<div className = 'object-row'>
			<a href = { link }><h2>{ post_title }</h2></a>
			<div className = 'object-row-content'>
				{ displayImage &&
					<div className = 'object-row-image'>
						{ /* TODO(strict): thumbnail can be `[]` or null on the wire
						   (object without an image); the cast preserves the existing
						   unguarded index access, which yields an undefined src for
						   `[]` and throws for null. Tracked in #148. */ }
						<a href = { link }><img src={( thumbnail as ImageSizeTuple )[0]} alt={decodedPostTitle} /></a>
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
