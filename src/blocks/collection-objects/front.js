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

const PaginatedObjectGrid = withPagination( ObjectGrid );

const CollectionObjectsFront = props => {
	const {
		postID,
		resultsPerPage = 20,
	} = props;

	const searchDefaults = {
		selectedCollections : [ postID ],
		per_page            : resultsPerPage,
		status              : 'publish',
	}
	
	const [ mObjects, setMObjects ] = useState( [] );
	const [ currentPage, setCurrentPage ] = useState( 1 );
	const [ totalPages, setTotalPages ] = useState( 0 );
	const [ currentSearchParams, setCurrentSearchParams ] = useState( searchDefaults );

	useEffect( () => {
		const initialSearchValues = {
			...searchDefaults,
			page   : 1,
		}
		runSearch( initialSearchValues );
	}, [] );

	const runSearch = ( searchValues ) => {
		setCurrentSearchParams( searchValues );
		apiFetch( {
			path   : `${baseRestPath}/search`,
			method : 'POST',
			data   : searchValues,
			parse  : false,
		} )
			.then( response => {
				setCurrentPage( response.headers.get( 'X-WP-Page' ) || 1 );
				setTotalPages( response.headers.get( 'X-WP-TotalPages' || 0 ) );
				return response.json();
			} )
			.then ( result => {
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
		const collectionObjectsBlockElement = collectionObjectsBlockElements[i];
		const postID = parseInt( collectionObjectsBlockElement.dataset.postId );
		const parsedResultsPerPage = parseInt( collectionObjectsBlockElement.dataset.resultsPerPage );
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