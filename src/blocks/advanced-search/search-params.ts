/**
 * Translation between the values AdvancedSearchUI collects and the parameters
 * the /search endpoint reads.
 *
 * Shared by the block's editor and front-end entry points, which previously
 * each declared their own copy of these shapes and only the front end did the
 * translation.
 */

import type { AdvancedSearchValues as SearchUIValues } from '../../components/advanced-search-ui/advanced-search-ui';

import type { MuseumObjectSearchParams } from '../../types';

/**
 * The values AdvancedSearchUI hands to its onSearch callback, plus the `page`
 * that withPagination sets on them.
 *
 * These are the block's own working values, not quite what goes over the
 * wire — `selectedFlags` and `searchFields` have no server-side meaning and
 * are translated away by toSearchRequest.
 */
export interface AdvancedSearchValues extends SearchUIValues {
	/** Set by withPagination when the user pages through results. */
	page?: number;
}

/**
 * Builds the request body for /search from a set of search values.
 *
 * The endpoint has no `searchFields` or `selectedFlags` parameter. A field
 * search is sent as a parameter named after the field's own slug — prefixed
 * with `~` for a LIKE match rather than an exact one — and a flag is the same
 * thing with a value of true.
 *
 * `selectedKind` is still sent and still ignored server-side. Teaching the
 * endpoint to filter on it would silently narrow every advanced search to one
 * object type, because AdvancedSearchUI seeds `selectedKind` with the first
 * kind and offers no "all types" choice. That needs a UI decision first.
 *
 * @param values         Values collected by AdvancedSearchUI.
 * @param resultsPerPage Results per page; -1 for unlimited. Omitted from the
 *                       request when undefined, leaving the server default.
 */
export const toSearchRequest = (
	values: AdvancedSearchValues,
	resultsPerPage?: number
): MuseumObjectSearchParams => {
	const { selectedFlags, selectedCollections, searchFields, ...rest } = values;

	const request: MuseumObjectSearchParams = { ...rest };

	if ( selectedCollections ) {
		request.selectedCollections = selectedCollections.map( Number );
	}

	if ( searchFields ) {
		for ( const { field, search } of searchFields ) {
			if ( ! field || ! search ) {
				continue;
			}
			request[ field ] = search.startsWith( '~' ) ? search : `~${search}`;
		}
	}

	if ( selectedFlags ) {
		for ( const flag of selectedFlags ) {
			request[ flag ] = true;
		}
	}

	if ( typeof resultsPerPage !== 'undefined' ) {
		request.per_page = resultsPerPage;
	}

	return request;
}
