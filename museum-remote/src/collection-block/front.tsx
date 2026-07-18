import {
	useState
} from '@wordpress/element';

import RemoteCollectionGrid from './remote-collection-grid';

import type { RemoteCollectionAttributes, RemoteData } from './remote-collection-grid';

interface CollectionBlockFrontProps {
	/**
	 * Block attributes. frontend.tsx supplies these parsed from serialized
	 * JSON as Record<string, unknown>, hence the union.
	 */
	attributes: RemoteCollectionAttributes | Record<string, unknown>;
}

const CollectionBlockFront = ( props: CollectionBlockFrontProps ) => {
	const { attributes } = props;

	const wpmRestBase = '/wp-json/wp-museum/v1';
	const [ remoteData, setRemoteData ] = useState<RemoteData>( {} );

	return (
		<RemoteCollectionGrid
			attributes    = { attributes as RemoteCollectionAttributes }
			remoteData    = { remoteData }
			setRemoteData = { setRemoteData }
			wpmRestBase   = { wpmRestBase }
		/>
	);
}

export default CollectionBlockFront;