import {
	useState,
	useEffect,
	useRef,
	createRoot
} from '@wordpress/element';
import {
	Button,
	Spinner
} from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';
import type { ChangeEvent, KeyboardEvent } from 'react';

import { generateUUID, isEmpty } from '../javascript/util';

import type { SiteData } from '../types';

/**
 * Shape of the `museum-remote-data` option served by GET/POST
 * `/museum-remote/v1/remote_data` (museum-remote/rest.php). Not part of the
 * wp-museum/v1 wire types in src/types, so defined locally.
 */
interface RemoteData {
	url?: string | null;
	uuid?: string | null;
	title?: string | null;
	host_title?: string | null;
}

interface SiteInfoProps {
	currentlyConnecting: boolean;
	connectionError: string | null;
	siteData: Partial<SiteData>;
}

const SiteInfo = ( props: SiteInfoProps ) => {
	const {
		currentlyConnecting,
		connectionError,
		siteData
	} = props;

	const {
		title,
		description,
		url,
		collections,
		object_count : objectCount
	} = siteData;

	const collectionCount = Array.isArray( collections ) ? collections.length : 0;

	if ( currentlyConnecting ) {
		return (
			<div className = 'site-info'>
				<div className = 'connection-status connecting'>
					<Spinner />Connecting...
				</div>
			</div>
		);
	}

	if ( connectionError ) {
		return (
			<div className = 'site-info'>
				<div className = 'connection-status error'>
					Connection error: { connectionError }
				</div>
			</div>
		);
	}

	return (
		<div className = 'site-info'>
			<div className = 'connection-status success'>
				Connected
			</div>
			<table>
				<tbody>
					<tr><td>Site:</td><td>{ title }</td></tr>
					<tr><td>URL:</td><td>{ url }</td></tr>
					<tr><td>Collection count:</td><td>{ collectionCount }</td></tr>
					<tr><td>Object count:</td><td>{ objectCount }</td></tr>
				</tbody>
			</table>

		</div>
	);
}

const RemoteAdminPage = () => {
	const wpmRestBase = '/wp-json/wp-museum/v1';
	const mrRestBase = '/museum-remote/v1';

	const [ remoteData, setRemoteData ] = useState<RemoteData>( {} );
	const [ siteData, setSiteData ] = useState<Partial<SiteData>>( {} );
	const [ currentlyConnecting, setCurrentlyConnecting ] = useState( false );
	const [ connectionError, setConnectionError ] = useState<string | null>( null );

	const textInput = useRef<HTMLInputElement>( null );
	useEffect( () => textInput.current!.focus(), [] );

	useEffect(
		() => {
			refreshRemoteData().then( result => doConnect( result ) );
		}, []
	);

	const refreshRemoteData = () => {
		return apiFetch<RemoteData | false>( { path: `${mrRestBase}/remote_data` } )
			.then( result => {
				if ( result ) {
					setRemoteData( result );
				}
				return result;
			} );
	}

	const updateRemoteDataOption = ( newData: RemoteData | null = null ) => {
		const data = newData != null ? newData : remoteData;
		if ( ! isEmpty( siteData ) ) {
			data.host_title = siteData.title;
		}
		return apiFetch<boolean>(
			{
				path   : `${mrRestBase}/remote_data`,
				method : 'POST',
				data   : data,
			}
		).then( result => console.log( result ) );
	}

	const onUrlChange = ( event: ChangeEvent<HTMLInputElement> ) => {
		setRemoteData( { ...remoteData, url: event.target.value } );
	}

	const onUrlBlur = () => {
		const newUrl = cleanUrl();
		updateRemoteDataOption( { ...remoteData, url: newUrl } );
	}

	const cleanUrl = ( newUrl: string | null = null ) => {
		// TODO(strict): possible null at runtime — remoteData.url may be
		// null/undefined before the option is first saved; .trim() would throw.
		let cleanedUrl = ( newUrl ? newUrl : remoteData.url ) as string;
		cleanedUrl = cleanedUrl.trim();
		cleanedUrl = cleanedUrl.endsWith('/') ? cleanedUrl.slice(0, -1 ) : cleanedUrl;
		cleanedUrl = cleanedUrl
			.startsWith('http://') || cleanedUrl.startsWith('https://' ) ?
			cleanedUrl :
			'https://' + cleanedUrl;
		setRemoteData( { ...remoteData, url: cleanedUrl } );
		return cleanedUrl;
	}

	const getUUID = ( newData: RemoteData | false | null = null ) => {
		// TODO(ts-migration): GET /remote_data returns `false` before the option
		// is first saved; that value flows through here and is dereferenced as an
		// object (yielding undefined properties). Cast preserves current behavior.
		const data = ( newData === null ? remoteData : newData ) as RemoteData;
		const oldUUID = data.uuid;
		if ( oldUUID ) {
			setRemoteData( { ...data, uuid: oldUUID } );
			return oldUUID;
		}

		const newUUID = generateUUID();
		setRemoteData( { ...data, uuid: newUUID } );
		return newUUID;
	}

	/**
	 * Connects to remote site, checks response, and if everything is ok update the site data.
	 *
	 * @see https://developers.google.com/web/ilt/pwa/working-with-the-fetch-api
	 */
	const doConnect = ( newData: RemoteData | false | null = null ) => {
		setCurrentlyConnecting( true );
		setConnectionError( null );
		// TODO(ts-migration): GET /remote_data returns `false` before the option
		// is first saved; doConnect is then called with `false` and reads
		// properties off it (yielding undefined). Cast preserves current behavior.
		const data = ( newData === null ? remoteData : newData ) as RemoteData;
		const cleanedUrl = cleanUrl( data.url );
		const uuid = getUUID( newData );

		const validateResponse = ( response: Response ) => {
			if ( ! response.ok ) {
				throw Error( response.statusText );
			}
			return response;
		}

		const readJSONResponse = ( response: Response ) => {
			response.json().then( ( data: SiteData ) => setSiteData( data ) );
		}

		const stopConnecting = () => {
			setCurrentlyConnecting( false );
		}

		const catchError = ( error: Error ) => {
			stopConnecting();
			setConnectionError( error.message );
		}

		fetch( `${cleanedUrl}${wpmRestBase}/register_remote`, {
			method: 'POST',
			headers: {
				'Accept': 'application/json, text/plain, */*',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify( {
				url   : cleanedUrl,
				uuid  : uuid,
				title : data.title
			} )
		} )
			.then( validateResponse )
			.then( readJSONResponse )
			.then( stopConnecting )
			.catch( catchError );
	}

	const maybeConnect = ( event: KeyboardEvent<HTMLInputElement> ) => {
		if ( event.key === 'Enter' ) {
			event.preventDefault();
        	event.stopPropagation();
			doConnect();
		}
	}

	return (
		<div className = 'remote-admin-page'>
			<h2>Museum Remote Configuration</h2>
			<label>
				Remote Museum URL:
				<input
					type = 'url'
					ref = { textInput }
					placeholder = 'https://example.com'
					pattern = "https?:\/\/.*"
					onChange = { onUrlChange }
					onBlur   = { onUrlBlur }
					onKeyDown = { maybeConnect }
					value = { remoteData.url as string }
				/>
			</label>
			<Button
				isPrimary
				onClick = { () => doConnect() }
			>
				Connect
			</Button>
			{ ( currentlyConnecting || connectionError || Object.keys( siteData ).length > 0 ) &&
				<SiteInfo
					currentlyConnecting = { currentlyConnecting }
					connectionError     = { connectionError }
					siteData            = { siteData }
				/>
			}
		</div>
	);
}

if ( !! document.getElementById( 'museum-remote-admin-container' ) ) {
	const root = createRoot( document.getElementById( 'museum-remote-admin-container' )! );
	root.render(
		<RemoteAdminPage />
	);
}
