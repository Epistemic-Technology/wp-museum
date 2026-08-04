import apiFetch from "@wordpress/api-fetch";

import type { ReactNode, MouseEventHandler } from "react";

import type {
	Collection,
	ImageSizeTuple,
	MuseumObject,
	MuseumObjectSearchParams,
	ObjectImage,
	ObjectImagesResponse,
} from "../types";

/**
 * Base path for Museum REST API.
 */
export const baseRestPath = '/wp-museum/v1';

/**
 * Base path for WordPress REST API.
 */
export const wordPressRestBase = '/wp/v2'

/**
 * RGB triple returned by hexToRgb.
 */
export interface RgbColor {
	r: number;
	g: number;
	b: number;
}

// https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
export function hexToRgb(hex: string): RgbColor | null {
	// Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
	var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
	hex = hex.replace(shorthandRegex, function(m, r, g, b) {
	  return r + r + g + g + b + b;
	});

	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? {
	  r: parseInt(result[1], 16),
	  g: parseInt(result[2], 16),
	  b: parseInt(result[3], 16)
	} : null;
  }

/**
 * Best-fit image data returned by getBestImage.
 */
export interface BestFitImage {
	URL: string | null;
	height: number;
	width: number;
}

export function getBestImage( imgData: ObjectImage, imgDimensions: { height: number; width: number } ): BestFitImage {
	const bestFitImage: BestFitImage = {
		'URL'    : null,
		'height' : 99999999,
		'width'  : 99999999
	};

	for ( let [ sizeSlug, dataArray ] of Object.entries( imgData ) ) {
		if ( ! Array.isArray( dataArray ) || dataArray.length < 4 ) {
			continue;
		}

		// TODO(ts-migration): the wire tuple order is [url, width, height,
		// isResized] (see ImageSizeTuple), but this destructuring transposes
		// width/height. Pre-existing bug preserved for zero behavior change.
		let [
			URL,
			height,
			width,
			isIntermediate
		] = dataArray as ImageSizeTuple;

		if ( height >= imgDimensions.height &&
			 height <  bestFitImage.height &&
			 width  >= imgDimensions.width &&
			 width  <  bestFitImage.width
		   ) {
				bestFitImage.URL    = URL;
			 	bestFitImage.height = height;
			 	bestFitImage.width  = width;
		}
	}

	if ( bestFitImage.URL === null ) {
		// TODO(ts-migration): same width/height transposition as above; also
		// imgData['full'] can be null on the wire, so the cast preserves the
		// existing (crash-prone) runtime behavior.
		const [
			URL,
			height,
			width,
			isIntermediate
		] = imgData['full'] as ImageSizeTuple;
		bestFitImage.URL    = URL;
		bestFitImage.height = height;
		bestFitImage.width  = width
	}

	return bestFitImage;
}

export function getFirstObjectImage( imgData: ObjectImagesResponse ): ObjectImage | null {
	if ( isEmpty( imgData ) ) {
		return null;
	}
	const imgDataArray: ObjectImage[] = Object.values( imgData );
	imgDataArray.sort( (a, b ) => a['sort_order'] - b['sort_order'] );
	return imgDataArray[0];
}

/**
 * Decode HTML entities in a string.
 *
 * Post titles and excerpts arrive from the REST API with entities encoded
 * (`&amp;`, `&#8217;`, …). Round-tripping them through a detached textarea
 * lets the browser do the decoding.
 *
 * @param {string} text Text possibly containing HTML entities.
 */
export function decodeHtmlEntities( text: string ): string {
	const textArea = document.createElement( 'textarea' );
	textArea.innerHTML = text;
	return textArea.value;
}

/**
 * Javascript implementation of php's stripslashes.
 *
 * @link https://github.com/kvz/locutus/blob/master/src/php/strings/stripslashes.js
 * @param {string} str String to be unslashed.
 */
export function stripslashes (str: string): string {
	//       discuss at: https://locutus.io/php/stripslashes/
	//      original by: Kevin van Zonneveld (https://kvz.io)
	//      improved by: Ates Goral (https://magnetiq.com)
	//      improved by: marrtins
	//      improved by: rezna
	//         fixed by: Mick@el
	//      bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
	//      bugfixed by: Brett Zamir (https://brett-zamir.me)
	//         input by: Rick Waldron
	//         input by: Brant Messenger (https://www.brantmessenger.com/)
	// reimplemented by: Brett Zamir (https://brett-zamir.me)
	//        example 1: stripslashes('Kevin\'s code')
	//        returns 1: "Kevin's code"
	//        example 2: stripslashes('Kevin\\\'s code')
	//        returns 2: "Kevin\'s code"
	return (str + '')
	  .replace(/\\(.?)/g, function (s, n1) {
		switch (n1) {
		  case '\\':
			return '\\'
		  case '0':
			return '\u0000'
		  case '':
			return ''
		  default:
			return n1
		}
	  })
}

/**
 * Generates a UUID to uniquely identify remote site to central site.
 *
 * @see https://stackoverflow.com/questions/105034/how-to-create-guid-uuid/2117523#2117523
 */
export function generateUUID(): string {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	  var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
	  return v.toString(16);
	});
}

/**
 * Efficient test if an object is empty (ie. {} ).
 *
 * @see https://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object
 * @param {Object} obj Object to test for being empty
 */
export function isEmpty(obj: object | null): boolean {
	if ( obj === null ) {
		return true;
	}

	for( let prop in obj ) {
        if( obj.hasOwnProperty( prop ) )
            return false;
    }
    return true;
}

/**
 * Takes attributes passed from wp_localize_script to frontend scripts and
 * parses and recasts them to match the format of attributes in the editor.
 *
 * @param {Object} attributes Attributes of a block, passed from
 *                            wp_localize_script.
 */
export function cleanAttributes( attributes: Record<string, unknown> ): null {
	for ( const [ key, value ] of Object.entries( attributes) ) {
		if ( ! isNaN( value as number ) ) {
			let newValue: unknown = value;
			if ( newValue === '' ) {
				newValue = null;
			} else {
				newValue = parseInt( value as string );
				if ( newValue === 0 ) {
					newValue = false;
				}
			}
			attributes[key] = newValue;
		}
	}
	return null;
}

/**
 * Parses attributes passed as JSON (json encoded php associative array).
 *
 * @todo: Use a schema to check datatypes, so that we know whether to cast
 * strings as booleans, etc. Currently an attribute with value 'true' is
 * converted to boolean regardless of the attribute's type.
 *
 * @param {*} attributeJSON
 * @return {Object} Attributes object in same format as WordPress attributes
 * objects.
 */
export function attributesFromJSON( attributeJSON: string ): Record<string, unknown> {
	const attributes = JSON.parse( attributeJSON ) as Record<string, unknown>;
	for ( const [ key, value ] of Object.entries( attributes ) ) {
		if ( value === 'false' ) {
			attributes[key] = false;
		}
		if ( value === 'true' ) {
			attributes[key] = true;
		}
	}
	return attributes;
}

/**
 * Props for the MaybeLink component.
 */
export interface MaybeLinkProps {
	href?: string;
	onClickCallback?: MouseEventHandler<HTMLAnchorElement>;
	children?: ReactNode;
	doLink?: boolean;
}

/**
 * Optionally links to or calls onClick callback when clicked on.
 *
 * @param {*} props The component's properties
 */
export const MaybeLink = (props: MaybeLinkProps) => {
	const {
		href,
		onClickCallback,
		children,
		doLink
	} = props

	if ( doLink ) {
		return (
			<a href = { href }>{ children }</a>
		)
	}
	if ( !! onClickCallback ) {
		return (
			<a onClick = { onClickCallback }>{ children }</a>
		)
	}
	return ( <>{ children }</> );
}

/**
 * Returns a promise that returns image data for a museum object.
 */
export const fetchObjectImages = ( objectID: number | string ): Promise<ObjectImagesResponse> => {
	return apiFetch<ObjectImagesResponse>( { path: `${baseRestPath}/all/${objectID}/images` } );
}

/**
 * A page of search results together with the paging the server reported.
 */
export interface ObjectSearchResults {
	objects: MuseumObject[];
	/** 1-based. Falls back to 1 when the server reports no page. */
	currentPage: number;
	/** Falls back to 0 when the server reports no page count. */
	totalPages: number;
}

/**
 * Runs a search against the /search endpoint and returns the results with
 * their pagination.
 *
 * Paging arrives in the X-WP-Page and X-WP-TotalPages response headers, so
 * the response has to be read unparsed: apiFetch's default `parse: true`
 * resolves to the JSON body alone and discards the headers.
 */
export const searchObjects = async (
	searchParams: MuseumObjectSearchParams
): Promise<ObjectSearchResults> => {
	// No type argument: apiFetch infers `parse: false` and resolves to the
	// unparsed Response, which is what carries the pagination headers.
	const response = await apiFetch( {
		path   : `${baseRestPath}/search`,
		method : 'POST',
		data   : searchParams,
		parse  : false
	} );

	if ( ! response.ok ) {
		throw new Error( `Search request failed with status ${response.status}` );
	}

	return {
		objects     : await response.json() as MuseumObject[],
		currentPage : parseInt( response.headers.get( 'X-WP-Page' ) ?? '' ) || 1,
		totalPages  : parseInt( response.headers.get( 'X-WP-TotalPages' ) ?? '' ) || 0
	};
}

/**
 * Collection augmented with the tree-layout bookkeeping properties that
 * sortCollections adds in place.
 */
export interface SortableCollection extends Collection {
	indentLevel?: number;
	foundParent?: boolean;
}

const sortCollectionsHelper = ( collectionData: Collection[], sortBy: string, sortOrder: string ): SortableCollection[] => {
	const sortedCollections: SortableCollection[] = [ ...collectionData ];

	const sortMultiplier = sortOrder == 'Descending' ? -1 : 1;

	sortedCollections.sort( ( a, b ) => {
		if ( a.menu_order !== b.menu_order ) {
			return sortMultiplier * ( a.menu_order < b.menu_order ? -1 : 1 );
		}
		switch( sortBy ) {
			case 'Alphabetical' :
				return sortMultiplier * ( a.post_title < b.post_title ? -1 : 1 );
			case 'Date Created' : {
				// post_date_gmt is nullable on the wire; a missing date sorts
				// as the epoch rather than producing an Invalid Date.
				const aDate = new Date( a.post_date_gmt ?? 0 );
				const bDate = new Date( b.post_date_gmt ?? 0 );
				return sortMultiplier * ( aDate < bDate ? -1 : 1 );
			}
			case 'Date Updated' : {
				const aDate = new Date( a.post_modified_gmt );
				const bDate = new Date( b.post_modified_gmt );
				return sortMultiplier * ( aDate < bDate ? -1 : 1 );
			}
			default :
				return 0;
		}
	} );

	return sortedCollections;
}

export const sortCollections = ( collectionData: Collection[], sortBy: string, sortOrder: string ): SortableCollection[] => {
	const allCollections = sortCollectionsHelper( collectionData, sortBy, sortOrder );
	const topCollections = allCollections.filter( a => a.post_parent == 0 );
	let subCollections = allCollections.filter( a => a.post_parent != 0 );

	// Deal with the case that a collection's parent was not retrieved, probably
	// because it didn't match the tag criteria.
	//
	// TODO: There is probably a more efficient way to do this as it is redundant with
	// the forEach loop below.

	subCollections.forEach( subCollection => {
		const parentIndex = allCollections.findIndex(
			parentCollection => parentCollection.ID == subCollection.post_parent
		);
		if ( parentIndex == -1 ) {
			subCollection.post_parent = 0;
		}
	});


	topCollections.forEach( a => a.indentLevel = 0 );

	let foundParent = true;
	while ( foundParent && subCollections.length > 0 ) {
		foundParent = false;
		subCollections.forEach( subCollection => {
			subCollection.foundParent = false;
			const parentIndex = topCollections.findIndex(
				parentCollection => parentCollection.ID == subCollection.post_parent
			);
			if ( parentIndex > -1 ) {
				foundParent = true;
				subCollection.foundParent = true;
				// indentLevel is initialized to 0 for all topCollections above and
				// set before any subCollection is spliced in, so it is always defined.
				subCollection.indentLevel = topCollections[parentIndex].indentLevel! + 1;
				topCollections.splice( parentIndex + 1, 0, subCollection );
			}
		} );
		subCollections = subCollections.filter( subCollection => ! subCollection.foundParent );
	}

	return topCollections;
}
