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
	InspectorControls,
	useBlockProps
} from '@wordpress/block-editor';

import {
	PanelBody,
	SelectControl
} from '@wordpress/components';

import apiFetch from '@wordpress/api-fetch';

import type { ComponentType, ChangeEvent } from 'react';

/**
 * Internal dependencies
 */
import {
	baseRestPath
} from '../../javascript/util';

import { EmbeddedSearch, PaginatedObjectList } from '../../components';

import type { MuseumObject, MuseumObjectSearchParams } from '../../types';

interface BasicSearchAttributes {
	searchText?: string;
	resultsPerPage?: number;
	advancedSearchLink?: string;
	acceptGETRequest?: boolean;
	columns?: number;
}

interface BasicSearchEditProps {
	attributes: BasicSearchAttributes;
	setAttributes: ( attributes: Partial<BasicSearchAttributes> ) => void;
}

// TODO(ts-migration): pre-existing bug — onSearch below reads
// `currentSearchParams`, which is never declared in this file (front.js has it
// as state; this editor component does not). At runtime any search with a
// changed non-page param throws a ReferenceError. This declaration is
// type-only (emits no code) so the compiler accepts the reference without
// changing behavior.
declare const currentSearchParams: MuseumObjectSearchParams;

// TODO(ts-migration): pre-existing prop mismatch — PaginatedObjectList expects
// `mObjects` plus pagination props (currentPage, totalPages, searchCallback,
// searchParams), but this block passes `objects`, `displayImages`, and
// `columns`, so the list receives undefined mObjects and renders nothing.
// Cast preserves current behavior.
const UntypedPaginatedObjectList = PaginatedObjectList as ComponentType<any>;

/**
 * Basic search of the catalogue.
 *
 * This has a search box and displays results. Search text can also be passed
 * to a page containing this block through a GET request.
 *
 * @param {Object} props The block's properties.
 */
const BasicSearchEdit = ( props: BasicSearchEditProps ) => {
	const {
		attributes,
		setAttributes,
	} = props;

	const {
		searchText         = '',
		resultsPerPage     = 20,
		advancedSearchLink = '',
		acceptGETRequest   = true,
		columns            = 4,
	} = attributes;

	const [ searchResults, setSearchResults ] = useState<MuseumObject[]>( [] );

	const onSearch = ( searchParams: MuseumObjectSearchParams ) => {
		for ( const [ key, value ] of Object.entries( searchParams ) ) {
			if ( key != 'page' && value != currentSearchParams[key] ) {
				searchParams['page'] = 1;
				break;
			}
		}
		apiFetch<MuseumObject[]>( {
			path:   `${baseRestPath}/search`,
			method: 'POST',
			data:   searchParams
		} ).then( result => {
			setSearchResults( result );
		} );
	}

	return (
		<div {...useBlockProps()}>
			<InspectorControls>
				<PanelBody
					title = 'Search Options'
				>
					{ /* NOTE(wp-types): SelectControl's types expect string
					   values, but these numeric option values (and numeric
					   value props) work at runtime; cast to keep behavior. */ }
					<SelectControl
						label = 'Results per Page'
						value = { resultsPerPage as any }
						onChange = { val => setAttributes( { resultsPerPage: parseInt( val ) } ) }
						options = { [
							{ value: 20,  label: '20' },
							{ value: 40,  label: '40' },
							{ value: 60,  label: '60' },
							{ value: 80,  label: '80' },
							{ value: 100, label: '100' },
							{ value: -1,  label: 'Unlimited' }
						] as any }
					/>
					<SelectControl
						label = 'Grid Columns'
						value = { columns as any }
						onChange = { val => setAttributes( { columns: parseInt( val ) } ) }
						options = { [
							{ value: 2, label: '2' },
							{ value: 3, label: '3' },
							{ value: 4, label: '4' },
							{ value: 5, label: '5' },
							{ value: 6, label: '6' }
						] as any }
					/>
					<label>
						Advanced Search Page URL:
						<input
							className = 'wpm-basic-search-advanced-search-url-input'
							type      = 'text'
							value     = { advancedSearchLink }
							onChange  = { ( event: ChangeEvent<HTMLInputElement> ) => setAttributes( { advancedSearchLink: event.target.value } ) }
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
				<UntypedPaginatedObjectList
					objects       = { searchResults }
					displayImages = { true }
					columns       = { columns }
				/>
			}
		</div>
	);
}

export default BasicSearchEdit;
