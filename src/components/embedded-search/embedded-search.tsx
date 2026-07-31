/**
 * A minimal embedded search box.
 */

import {
	Button,
	CheckboxControl
} from '@wordpress/components';

import {
	useState,
	useEffect,
} from '@wordpress/element';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { isEmpty } from '../../javascript/util';
import type { MuseumObjectSearchParams } from '../../types';



interface EmbeddedSearchProps {
	searchDefaults?: MuseumObjectSearchParams;
	runSearch?: ( ( searchValues: MuseumObjectSearchParams ) => void ) | null;
	updateSearchText?: ( ( newSearchText: string ) => void ) | null;
	searchButtonText?: string;
	showTitleToggle?: boolean;
	onlyTitleDefault?: boolean;
	showReset?: boolean;
	autoFocus?: boolean;
	resetButtonText?: string;
	placeholderText?: string;
	searchPageURL?: string;
	advancedSearchURL?: string;
}

const EmbeddedSearch = ( props: EmbeddedSearchProps ) => {
	const {
		searchDefaults    = {},
		runSearch         = null,
		updateSearchText  = null,
		searchButtonText  = 'Search',
		showTitleToggle   = false,
		onlyTitleDefault  = true,
		showReset         = true,
		autoFocus         = false,
		resetButtonText   = 'Reset',
		placeholderText   = '',
		searchPageURL     = '',
		advancedSearchURL = '',
	} = props;

	const [ searchText, _setSearchText ] = useState( '' );
	const [ onlyTitle, setOnlyTitle ] = useState( onlyTitleDefault );

	useEffect( () => {
		if ( !! searchDefaults.searchText ) {
			setSearchText( searchDefaults.searchText );
		}
	}, [ searchDefaults ] );

	const setSearchText = ( newSearchText: string ) => {
		_setSearchText( newSearchText );
		if ( !!  updateSearchText ) {
			updateSearchText( newSearchText );
		}
	}

	const doSearch = ( newSearchValues: MuseumObjectSearchParams = {} ) => {
		const searchValues =
			! isEmpty( newSearchValues ) ? newSearchValues :
			{
				...searchDefaults,
				onlyTitle,
				searchText,
			};
		if ( runSearch ) {
			runSearch( searchValues );
		} else if ( searchPageURL ) {
			// NOTE(wp-types): URLSearchParams typing expects string values,
			// but search params can include numbers/booleans/arrays; they were
			// already coerced to strings at runtime, so cast to keep behavior.
			const queryString = new URLSearchParams( searchValues as Record<string, string> ).toString();
			window.open( `${searchPageURL}?${queryString}`, '_self' );
		}
	}

	const resetSearch = () => {
		setSearchText( '' );
		const searchValues = {
			...searchDefaults,
			onlyTitle,
			searchText : ''
		}
		doSearch( searchValues );
	}

	const handleKeyPress = ( event: KeyboardEvent<HTMLInputElement> ) => {
		if ( event.key === 'Enter' ) {
			event.stopPropagation();
			doSearch();
		}
	}

	return (
		<div className = 'wpm-embedded-search' role='search'>
			<div className = 'embedded-search-input'>
				<div className = 'main-input-area'>
					<label htmlFor="wpm-embedded-search-input" className="screen-reader-text">Search</label>
					<input
						id          = 'wpm-embedded-search-input'
						type        = 'text'
						placeholder = { placeholderText }
						aria-label  = { placeholderText || 'Search' }
						onKeyPress  = { handleKeyPress }
						value       = { searchText }
						onChange    = { ( event: ChangeEvent<HTMLInputElement> ) => setSearchText( event.target.value ) }
						autoFocus   = { autoFocus } // eslint-disable-line jsx-a11y/no-autofocus
						// Autofocus can be confusing for users with screen readers, and accessibility
						// guidelines generally recommend against using it in most circumstances. However,
						// there are cases where it is appropriate, such as when the main / sole purpose
						// of the page is to search. Since it is conceivable that this component would
						// be used in such cases, allow designer to choose whether to use it or not.
					/>
					<div className = 'wpm-embedded-search-controls'>
						{ showTitleToggle &&
							<div className = 'wpm-embedded-search-title-toggle'>
									<CheckboxControl
										label = 'Only search titles'
										checked = { onlyTitle }
										onChange = { setOnlyTitle }
									/>
							</div>
						}
						{ !! advancedSearchURL &&
							<div className = 'wpm-embedded-search-advanced-search-link'>
								<a href = { advancedSearchURL } aria-label="Go to advanced search page">Advanced Search</a>
							</div>
						}
					</div>
				</div>
				<Button
					variant   = 'primary'
					className = 'wpm-embedded-search-button'
					aria-label = { `${searchButtonText} museum objects` }
					onClick   = { () => doSearch() }
				>
					{ searchButtonText }
				</Button>
				{ showReset &&
					<Button
						variant   = 'secondary'
						className = 'wpm-embedded-search-button'
						aria-label = 'Clear search and reset results'
						onClick   = { resetSearch }
					>
						{ resetButtonText }
					</Button>
				}
			</div>
		</div>
	);
}

export default EmbeddedSearch;
