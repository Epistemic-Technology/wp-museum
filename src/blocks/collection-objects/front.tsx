import apiFetch from '@wordpress/api-fetch';
import {
	useState,
	useEffect,
	createRoot
} from '@wordpress/element';

import {
	withPagination,
	EmbeddedSearch,
	ObjectGrid
} from '../../components';

import {
	baseRestPath
} from '../../javascript/util';

import type { MuseumObject, MuseumObjectSearchParams } from '../../types';

const PaginatedObjectGrid = withPagination( ObjectGrid );

interface CollectionObjectsFrontProps {
	postID: number;
	resultsPerPage?: number;
}

const CollectionObjectsFront = ( props: CollectionObjectsFrontProps ) => {
	const {
		postID,
		resultsPerPage = 20,
	} = props;

	const searchDefaults: MuseumObjectSearchParams = {
		selectedCollections : [ postID ],
		per_page            : resultsPerPage,
		status              : 'publish',
	}

	const [ mObjects, setMObjects ] = useState<MuseumObject[]>( [] );
	const [ currentPage, setCurrentPage ] = useState<number>( 1 );
	const [ totalPages, setTotalPages ] = useState<number>( 0 );
	const [ currentSearchParams, setCurrentSearchParams ] = useState<MuseumObjectSearchParams>( searchDefaults );

	useEffect( () => {
		const initialSearchValues = {
			...searchDefaults,
			page   : 1,
		}
		runSearch( initialSearchValues );
	}, [] );

	const runSearch = ( searchValues: MuseumObjectSearchParams ) => {
		setCurrentSearchParams( searchValues );
		apiFetch( {
			path   : `${baseRestPath}/search`,
			method : 'POST',
			data   : searchValues,
			parse  : false,
		} )
			.then( ( response: Response ) => {
				// TODO(ts-migration): headers.get() returns string | null, so these
				// states hold strings at runtime despite being typed number; also the
				// `|| 0` is mistakenly inside the get() argument (pre-existing bug).
				// Preserved as-is; @ts-expect-error because no cast silences TS2872.
				setCurrentPage( ( response.headers.get( 'X-WP-Page' ) || 1 ) as unknown as number );
				// @ts-expect-error -- see TODO(ts-migration) above
				setTotalPages( response.headers.get( 'X-WP-TotalPages' || 0 ) as unknown as number );
				return response.json();
			} )
			.then ( ( result: MuseumObject[] ) => {
				setMObjects( result );
			});
	}

	return (
		<div>
			<EmbeddedSearch
				searchDefaults = { searchDefaults }
				runSearch      = { runSearch }
			/>
			{ mObjects.length > 0 &&
				<PaginatedObjectGrid
					currentPage    = { currentPage }
					totalPages     = { totalPages }
					searchCallback = { runSearch }
					searchParams   = { currentSearchParams }
					mObjects       = { mObjects }
					doObjectModal  = { false }
				/>
			}
		</div>
	);
}

const collectionObjectsBlockElements = document.getElementsByClassName('wpm-collection-objects-block');
if ( !! collectionObjectsBlockElements ) {
	for ( let i = 0; i < collectionObjectsBlockElements.length; i++ ) {
		const collectionObjectsBlockElement = collectionObjectsBlockElements[i] as HTMLElement;
		// TODO(strict): dataset values may be undefined at runtime
		const postID = parseInt( collectionObjectsBlockElement.dataset.postId as string );
		const parsedResultsPerPage = parseInt( collectionObjectsBlockElement.dataset.resultsPerPage as string );
		const resultsPerPage = Number.isFinite( parsedResultsPerPage ) ? parsedResultsPerPage : 20;
		const root = createRoot( collectionObjectsBlockElement );
		root.render (
			<CollectionObjectsFront
				postID         = { postID }
				resultsPerPage = { resultsPerPage }
			/>
		);
	}
}
