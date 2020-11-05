/** 
 * Block for doing a basic search of the catalogue.
 */

/**
 * WordPress dependencies
 */
import {
	useState,
} from '@wordpress/element';

import {
	InspectorControls
} from '@wordpress/blockEditor';

import { 
	PanelBody,
	SelectControl
} from '@wordpress/components';

import apiFetch from '@wordpress/api-fetch';

/**
 * Internal dependencies
 */
import {
	baseRestPath
} from '../util';

import EmbeddedSearch from '../components/embedded-search';
import { PaginatedObjectList } from '../components/object-list';

/**
 * Basic search of the catalogue.
 *
 * This has a search box and displays results. Search text can also be passed
 * to a page containing this block through a GET request.
 * 
 * @param {Object} props The block's properties.
 */
const BasicSearchEdit = props => {
	const {
		attributes,
		setAttributes,
	} = props;

	const {
		searchText         = '',
		resultsPerPage     = 20,
		advancedSearchLink = '',
		acceptGETRequest   = true,
	} = attributes;

	const [ searchResults, setSearchResults ] = useState( [] );

	const onSearch = searchParams => {
		for ( const [ key, value ] of Object.entries( searchParams ) ) {
			if ( key != 'page' && value != currentSearchParams[key] ) {
				searchParams['page'] = 1;
				break;
			}
		}
		apiFetch( {
			path:   `${baseRestPath}/search`,
			method: 'POST',
			data:   searchParams
		} ).then( result => {
			setSearchResults( result );
		} );
	}

	return (
		<>
		<InspectorControls>
			<PanelBody
				title = 'Search Options'
			>
				<SelectControl
					label = 'Results per Page'
					value = { resultsPerPage }
					onChange = { val => setAttributes( { resultsPerPage: parseInt( val ) } ) }
					options = { [
						{ value: 20,  label: '20' },
						{ value: 40,  label: '40' },
						{ value: 60,  label: '60' },
						{ value: 80,  label: '80' },
						{ value: 100, label: '100' },
						{ value: -1,  label: 'Unlimited' }
					] }
				/>
				<label>
					Advanced Search Page URL:
					<input
						className = 'wpm-basic-search-advanced-search-url-input'
						type      = 'text'
						value     = { advancedSearchLink }
						onChange  = { event => setAttributes( { advancedSearchLink: event.target.value } ) }
					/>
				</label>
			</PanelBody>
		</InspectorControls>
		<EmbeddedSearch
			searchDefaults  = { { searchText: searchText } }
			runSearch       = { onSearch }
			showReset       = { false }
			showTitleToggle = { true }
		/>
		{ !! advancedSearchLink &&
			<a
				href = { advancedSearchLink }
			>
				Advanced Search
			</a>
		}
		{ searchResults &&
			<PaginatedObjectList
				objects       = { searchResults }
				displayImages = { true }
			/>
		}
		</>
	);
}

export default BasicSearchEdit;