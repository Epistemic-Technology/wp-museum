/**
 * Types mirroring the `Collections_Controller` REST routes
 * (src/rest/class-collections-controller.php), namespace `wp-museum/v1`.
 */

import type { ImageSizeTuple } from './common';

/**
 * A museum collection as returned by GET `/wp-museum/v1/collections/` (array
 * elements) and GET `/wp-museum/v1/collections/{id}` (single object).
 * Source: `Collections_Controller` + `Preparable_From_Schema`.
 *
 * NOTE: the controller computes an `associated_objects` array of post IDs,
 * but the schema property is misspelled `associated_ojects`, so NEITHER key
 * ever appears on the wire. Do not model it.
 */
export interface Collection {
	ID: number;
	menu_order: number;
	/** Cast from WP's numeric string to a real number. */
	post_author: number;
	/** "YYYY-MM-DD HH:MM:SS"; null only when falsy. */
	post_date: string | null;
	post_date_gmt: string | null;
	/** Rendered content with HTML tags/newlines STRIPPED — plain text. */
	post_content: string;
	post_title: string;
	/** Tag-stripped, entity-decoded excerpt; "read more" replaced with "...". */
	excerpt: string;
	/** List route only returns "publish". */
	post_status: string;
	/** Slug. */
	post_name: string;
	post_modified: string;
	post_modified_gmt: string;
	/** 0 if no parent. */
	post_parent: number;
	post_type: 'wpm_collection';
	/** Permalink URI. */
	link: string;
	/** null when the requester lacks edit capability. */
	edit_link: string | null;
	/** [url, width, height, isResized]; `[]` when no image. */
	thumbnail: ImageSizeTuple | [];
	/**
	 * Featured image at `medium` size, else first image of an associated
	 * object; `null` when none (PHP false sanitized against array type).
	 */
	featured_image: ImageSizeTuple | null;
	/**
	 * taxonomy → (term slug → term name). GOTCHA: empty PHP array serializes
	 * as JSON `[]`.
	 */
	taxonomies: Record<string, Record<string, string>> | [];
}

/**
 * Query parameters of GET `/wp-museum/v1/collections/`.
 * Source: `Collections_Controller::get_items()`.
 */
export interface CollectionsQueryParams {
	/** Default 1; 400 `rest_post_invalid_page_number` past the last page. */
	page?: number;
	/** Default 50 (DEFAULT_NUMBERPOSTS). */
	per_page?: number;
	/** Full-text search. */
	s?: string;
	/** Title match. */
	post_title?: string;
	/**
	 * Comma-separated `collection_tag` slugs. Special values: `_all`
	 * (bypass tag filtering), `_untagged` (collections with no tags,
	 * OR-combined with other listed slugs).
	 */
	tags?: string;
	/** Effectively dead: a slug lookup runs but its result is discarded. */
	slug?: string;
}

/**
 * Parameters of GET `/wp-museum/v1/collections/{id}/objects`.
 * NOTE: `{id}` on this route is the `wpm_collection_tax` TERM id, not the
 * collection post ID. Response elements are MuseumObject records (see
 * object.ts).
 */
export interface CollectionObjectsParams {
	/**
	 * GOTCHA: validate_callback requires a real boolean, so this cannot be
	 * set via URL query string — only via a JSON request body. The server
	 * default is the STRING 'false', which is truthy in WP_Query, so the
	 * effective default behavior INCLUDES child-term objects.
	 */
	include_children?: boolean;
}
