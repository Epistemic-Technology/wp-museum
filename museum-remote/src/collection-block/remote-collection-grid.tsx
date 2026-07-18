import {
	useState, useEffect
} from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

import { ObjectImageGrid, ThumbnailImage } from '../components';
import RemoteObjectModal from './remote-object-modal';

import {
	isEmpty
} from '../javascript/util';

import type { ObjectImagesResponse } from '../types';
import type { ImageDimensions } from '../components/image-size-panel/image-size-panel';

/**
 * Shape of the `museum-remote-data` option served by GET
 * `/museum-remote/v1/remote_data` (museum-remote/rest.php). Not part of the
 * wp-museum/v1 wire types in src/types, so defined locally.
 */
export interface RemoteData {
	url?: string | null;
	uuid?: string | null;
	title?: string | null;
	host_title?: string | null;
}

/**
 * Minimal object data mapped locally from remote MuseumObject wire data
 * (matches the GridObject shape consumed by ObjectImageGrid).
 */
interface RemoteCollectionObject {
	imgURL: string | null;
	title: string;
	URL: string;
	ID: number;
}

/**
 * Attributes for the remote collection block. This block is dynamic, so
 * attributes are defined server-side (see collection-block.php); on the
 * frontend they are parsed from serialized JSON, so all are optional.
 */
export type RemoteCollectionAttributes = {
	numObjects?: number;
	columns?: number;
	collectionID?: number | null;
	collectionSlug?: string;
	collectionURL?: string;
	collectionObjects?: RemoteCollectionObject[];
	thumbnailURL?: string | null;
	imgDimensions?: ImageDimensions;
	title?: string;
	excerpt?: string;
	fontSize?: number;
	titleTag?: string;
	imgAlignment?: string;
	displayTitle?: boolean;
	linkToObjects?: boolean;
	displayExcerpt?: boolean;
	displayObjects?: boolean;
	displayThumbnail?: boolean;
};

interface RemoteCollectionGridProps {
	attributes: RemoteCollectionAttributes;
	setSearchModalOpen?: ( isOpen: boolean ) => void;
	remoteData: RemoteData;
	setRemoteData: ( remoteData: RemoteData ) => void;
	wpmRestBase: string;
}

// TODO(ts-migration): the `fetchObjectImages` prop passed below has always
// been ignored by ObjectImageGrid (it imports fetchObjectImages from
// ../javascript/util directly), so it is not part of ObjectImageGridProps.
// Cast to keep passing the (dead) prop without behavior change.
const UntypedObjectImageGrid = ObjectImageGrid as any;

const RemoteCollectionGrid = ( props: RemoteCollectionGridProps ) => {

	const {
		attributes,
		setSearchModalOpen,
		remoteData,
		setRemoteData,
		wpmRestBase,
	} = props;

	const {
		displayThumbnail,
		imgDimensions,
		displayTitle,
		titleTag,
		displayExcerpt,
		fontSize,
		columns,
		collectionSlug,
		imgAlignment,
		displayObjects
	} = attributes;

	const [ selectedObjectID, setSelectedObjectID ] = useState<number | null>( null );
	const [ collectionObjects, setCollectionObjects ] = useState<RemoteCollectionObject[]>( [] );
	const [ title, setTitle ] = useState( '' );
	const [ excerpt, setExcerpt ] = useState( '' );
	const [ collectionURL, setCollectionURL ] = useState( '' );
	const [ thumbnailURL, setThumbnailURL ] = useState<string | null>( '' );
	const [ collectionID, setCollectionID ] = useState<number | string | null>( null );

	const mrRestBase = '/museum-remote/v1';

	useEffect( () => {
		refreshCollectionData();
	}, [ attributes, remoteData ] );

	useEffect( () => refreshRemoteData(), [] );

	if ( typeof attributes.collectionID !== 'undefined' &&
	     collectionID !== attributes.collectionID ) {
		setCollectionID( attributes.collectionID );
	}

	const refreshRemoteData = () => {
		apiFetch<RemoteData | false>( { path: `${mrRestBase}/remote_data` } )
			.then( result => {
					if ( result ) {
						setRemoteData( result );
					}
					return result;
				} );
	}

	const refreshObjectData = ( newCollectionID: number | string | null = null ) => {
		const cID = newCollectionID === null ? collectionID : newCollectionID;

		const objectsRestURL = `${remoteData.url}${wpmRestBase}/collections/${cID}/objects/?uuid=${remoteData.uuid}`;
		fetch( objectsRestURL ).then( response => {
			if ( ! response.ok ) {
				console.log( response.statusText );
				return;
			}
			response.json().then( result => {
				if ( Array.isArray( result ) && result.length > 0 ) {
					const newCollectionObjects = result.map( result => {
						const objImgURL = result['thumbnail'].length > 0 ? result['thumbnail'][0] : null;
						return ( {
							imgURL : objImgURL,
							title  : result['post_title'],
							URL    : result['link'],
							ID     : result['ID'],
						} );
					} );
					setCollectionObjects( newCollectionObjects );
				}
			} );
		} );
	}

	const refreshCollectionData = () => {
		if ( ! remoteData || isEmpty( remoteData ) ) {
			return;
		}

		let collectionRestURL;
		if ( collectionID ) {
			collectionRestURL = `${remoteData.url}${wpmRestBase}/collections/${collectionID}/?uuid=${remoteData.uuid}`;
		} else if ( collectionSlug ) {
			// TODO(ts-migration): pre-existing bug — this slug variant requests
			// the collections LIST endpoint but the response is treated below as
			// a single collection object, and the server-side `slug` param is
			// dead (ignored). Doubly broken; preserved as-is.
			collectionRestURL = `${remoteData.url}${wpmRestBase}/collections/?uuid=${remoteData.uuid}&slug=${collectionSlug}`;
		} else {
			return;
		}

		fetch( collectionRestURL ).then( response => {
			if ( ! response.ok ) {
				console.log( response.statusText );
				return;
			}
			response.json().then( result => {
				const newThumbnailURL = result['thumbnail'].length > 0 ? result['thumbnail'][0] : null;
				setTitle( result['post_title'] );
				setExcerpt( result['excerpt'] );
				setCollectionURL( result['link'] );
				setCollectionID( result['ID'] );
				setThumbnailURL( newThumbnailURL );
				if ( collectionID === null || collectionID === '' ) {
					refreshObjectData( result['ID'] );
				}
			} );
		} );

		if ( collectionID !== null && collectionID !== '' ) {
			refreshObjectData();
		} else if ( typeof attributes.collectionID !== 'undefined' ) {
			refreshObjectData( attributes.collectionID );
		}
	}

	const fetchObjectImages = ( objectID: number ): Promise<ObjectImagesResponse | false> => {
		if ( ! remoteData || isEmpty( remoteData ) ) {
			return Promise.resolve( false );
		}
		return fetch( `${remoteData.url}${wpmRestBase}/all/${objectID}/images`)
			.then( response => {
				if ( ! response.ok ) {
					console.log( response.statusText );
					return false;
				}
				return response.json().then( result => {
					return result;
				} );
			} );
	}

	const onClickCallback = ( objectID: number ) => {
		setSelectedObjectID( objectID );
	}

	const closeObjectModal = () => {
		setSelectedObjectID( null );
	}

	const TitleTag = titleTag as keyof JSX.IntrinsicElements;

	return (
		<div className = 'museum-collection-block' >
			<div className = { `collection-block-upper-content img-${imgAlignment}` } >
				{ displayThumbnail &&
					<div className = 'thumbnail-wrapper'>
							<ThumbnailImage
								thumbnailURL       = { thumbnailURL }
								// TODO(strict): possibly undefined at runtime —
								// imgDimensions is an optional attribute and
								// setSearchModalOpen is not passed on the
								// frontend; casts preserve current behavior.
								imgDimensions      = { imgDimensions as ImageDimensions }
								setSearchModalOpen = { setSearchModalOpen as ( isOpen: boolean ) => void }
							/>
					</div>
				}
				<div className = 'collection-info'>
					{ displayTitle && title &&
						<TitleTag className = 'remote-collection-title'>
							<a href = { collectionURL }> { title }</a>
						</TitleTag>
					}
					{ displayExcerpt && excerpt &&
						<div
							className = 'collection-excerpt'
							style     = { { fontSize: fontSize + 'em' } }
						>
							{ excerpt }
							{ collectionURL &&
								<span> (<a href = { collectionURL }>Read More</a>)</span>
							}
						</div>
					}
				</div>
			</div>
			<div className = 'collection-block-lower-content'>
					{ displayObjects &&
						<>
						<UntypedObjectImageGrid
							objects           = { collectionObjects }
							numObjects        = { collectionObjects.length }
							columns           = { columns }
							linkToObjects     = { false }
							fetchObjectImages = { fetchObjectImages }
							onClickCallback   = { onClickCallback }
						/>
						<RemoteObjectModal
							remoteData  = { remoteData }
							wpmRestBase = { wpmRestBase }
							objectID    = { selectedObjectID }
							modalOpen   = { selectedObjectID != null }
							closeModal  = { closeObjectModal }
						/>
						</>
					}
			</div>
		</div>
	);
}

export default RemoteCollectionGrid;