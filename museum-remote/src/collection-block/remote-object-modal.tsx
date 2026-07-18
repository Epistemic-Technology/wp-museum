import {
	useState,
	useEffect,
} from '@wordpress/element';

import { ObjectModal } from '../components';
import { isEmpty } from '../javascript/util';

import type { MuseumObject, ObjectImagesResponse } from '../types';
import type { RemoteData } from './remote-collection-grid';

interface RemoteObjectModalProps {
	remoteData: RemoteData;
	wpmRestBase: string;
	objectID: number | null;
	modalOpen: boolean;
	closeModal: () => void;
}

const RemoteObjectModal = ( props: RemoteObjectModalProps ) => {
	const {
		remoteData,
		wpmRestBase,
		objectID,
		modalOpen,
		closeModal
	} = props;

	const [ objectData, setObjectData ] = useState<Partial<MuseumObject>>( {} );
	const [ imageData, setImageData ] = useState<ObjectImagesResponse>( {} );

	useEffect( () => {
		if ( objectID ) {
			fetchObjectData();
			fetchImageData();
		}
	}, [ objectID ] );

	const doClose = () => {
		setImageData( {} );
		closeModal();
	}

	const fetchObjectData = () => {
		fetch( `${remoteData.url}${wpmRestBase}/all/${objectID}?uuid=${remoteData.uuid}` )
			.then( response => {
				if ( ! response.ok ) {
					console.log( response.statusText );
					return;
				}
				response.json().then( result => setObjectData( result ) );
			} );
	}

	const fetchImageData = () => {
		fetch( `${remoteData.url}${wpmRestBase}/all/${objectID}/images?uuid=${remoteData.uuid}` )
			.then( response => {
				if ( ! response.ok ) {
					console.log( response.statusText );
					return;
				}
				response.json().then( result => setImageData( result ) );
			} );
	}

	if ( isEmpty( objectData ) || isEmpty( imageData ) ) {
		return null;
	}

	const {
		post_title,
		excerpt,
		link
	} = objectData;

	return (
		<>
		{ modalOpen &&
			// TODO(ts-migration): `images` receives the Object.values() ARRAY
			// although ObjectModal types the prop as the keyed
			// ObjectImagesResponse map; ObjectModal immediately calls
			// Object.values() on it again (a no-op on an array), so runtime
			// behavior is identical. Cast preserves the existing call.
			<ObjectModal
				title    = { post_title }
				content  = { excerpt }
				url      = { link }
				linkText = { `View the full entry at ${remoteData.host_title}` }
				images   = { Object.values( imageData ) as ObjectImagesResponse }
				close    = { doClose }
			/>
		}
		</>
	);
}

export default RemoteObjectModal;