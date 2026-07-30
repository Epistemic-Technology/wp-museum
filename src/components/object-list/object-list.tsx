import type { ImageSizeTuple, MuseumObject } from '../../types';

import withPagination from '../with-pagination/with-pagination';

// TODO(ts-migration): `decodedPostTitle` is referenced in ObjectRow's JSX but
// is never defined anywhere — pre-existing bug: rendering with
// displayImage=true throws a ReferenceError at runtime. This ambient
// declaration is type-only (emits no code) so tsc compiles without changing
// that behavior.
declare const decodedPostTitle: string;

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

	return (
		<div className = 'object-row'>
			<a href = { link }><h2>{ post_title }</h2></a>
			<div className = 'object-row-content'>
				{ displayImage &&
					<div className = 'object-row-image'>
						{ /* NOTE(wp-types): thumbnail can be `[]` or null on the
						   wire (object without an image); cast preserves the existing
						   unguarded index access. */ }
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
