/**
 * Types mirroring the museum-object wire shape produced by
 * `Objects_Controller` (src/rest/class-objects-controller.php) via
 * `combine_post_data()` (src/rest/rest-helper-functions.php) and
 * `Preparable_From_Schema` (src/rest/trait-preparable-from-schema.php).
 * Namespace `wp-museum/v1`.
 */

import type { ImageSizeTuple } from './common';

/**
 * One entry of a `links`-type field value.
 * Source: per-field value schema in `Objects_Controller::get_item_schema()`.
 * Missing sub-properties serialize as null.
 */
export interface FieldLinkValue {
	type?: 'post' | 'url' | null;
	post_id?: number | null;
	url?: string | null;
	label?: string | null;
}

/**
 * Possible wire types of a kind-field property on a museum object, keyed by
 * the field's `type`:
 * - `plain` / `rich` / `date` / `measure` / `factor` → string
 *   (rich HTML is stripped; measure meta may arrive as a PHP-serialized
 *   string, e.g. `"a:2:{i:0;d:1.5;…}"`)
 * - `flag` → boolean
 * - `multiple` → string[] — but in practice usually `null` (serialized meta
 *   fails the array check in the sanitizer)
 * - `links` → FieldLinkValue[] — same caveat, usually `null` in practice
 * - any value failing its schema type check → null
 */
export type MuseumObjectFieldValue =
	| string
	| boolean
	| string[]
	| FieldLinkValue[]
	| null;

/**
 * A museum object as returned by every `Objects_Controller` route
 * (`/all`, `/{type_name}`, `/search`, `/all/{id}`, `/{type_name}/{id}`,
 * `/collections/{id}/objects`, children buckets, ...).
 * Source: `combine_post_data()` + schema sanitization.
 *
 * Kind-field properties are keyed by field slug and are ABSENT (not null)
 * when no meta value is stored or when the field is non-public and the
 * requester lacks `edit_posts`.
 */
export interface MuseumObject {
	ID: number;
	/** sanitize_text_field'd. */
	post_title: string;
	/** WP stores a numeric string; intval'd to a real number on the wire. */
	post_author: number;
	/** "YYYY-MM-DD HH:MM:SS" (site tz). Schema allows null. */
	post_date: string | null;
	/** May be "0000-00-00 00:00:00" for drafts. Schema allows null. */
	post_date_gmt: string | null;
	/**
	 * Rendered via the_content THEN sanitize_text_field: all HTML stripped,
	 * whitespace collapsed — plain text on the wire.
	 */
	post_content: string;
	/** Plain-text excerpt, "..." as the more-string, entities decoded. */
	excerpt: string;
	/** "publish" | "draft" | "pending" | "private" | "future" | ... */
	post_status: string;
	/** Slug. */
	post_name: string;
	post_modified: string;
	post_modified_gmt: string;
	/** The kind's type_name, e.g. "wpm_instrument". */
	post_type: string;
	/** Permalink URL. */
	link: string;
	/** null for requesters without edit rights. */
	edit_link: string | null;
	/**
	 * [url, width, height, isResized]; `[]` when the object has no image;
	 * `null` if an attachment exists but the src lookup fails.
	 */
	thumbnail: ImageSizeTuple | [] | null;
	/** Slug of the kind's catalogue-ID field, or null if the kind has none. */
	cat_field: string | null;
	/**
	 * Map of wpm_collection_tax term_id (numeric-string key) → term NAME.
	 * GOTCHA: serializes as JSON `[]` (array) when the object is in no
	 * collection.
	 */
	collections: Record<string, string> | [];
	/**
	 * Kind-field values keyed by field slug (see MuseumObjectFieldValue).
	 * `unknown` because arbitrary slugs share the namespace with the core
	 * properties above.
	 */
	[fieldSlug: string]: unknown;
}

/**
 * Response of GET `/all/{id}/children` and `/{type_name}/{id}/children`:
 * object keyed by kind_id (numeric-string keys) → arrays of child objects.
 * GOTCHA: bare `[]` when the object has no `wpm_child_objects` meta.
 */
export type MuseumObjectChildren = Record<string, MuseumObject[]> | [];

/**
 * Search / list parameters accepted by GET `/all`, GET `/{type_name}`, and
 * GET|POST `/search` (`Objects_Controller`). All params are read ad hoc via
 * `$request->get_param()` (query string, form body, or JSON body).
 */
export interface MuseumObjectSearchParams {
	/** Default 1. */
	page?: number;
	/** Default 50 (DEFAULT_NUMBERPOSTS). */
	per_page?: number;
	/** "any" honored only for users with `edit_posts` (then also the default). */
	status?: 'publish' | 'any';
	/** Full-text search over title/content plus object fields. */
	s?: string;
	/** Alias of `s`. */
	searchText?: string;
	/** Restrict search to post_title only; skips field filtering. */
	onlyTitle?: boolean;
	/** Title-only match. */
	post_title?: string;
	/** Ignored when onlyTitle is set. */
	post_content?: string;
	/** Collection POST IDs (not term IDs). */
	selectedCollections?: number[];
	/** Tag slugs (tag_slug__in). */
	selectedTags?: string[];
	/**
	 * Per-field match, keyed by field slug; prefix the value with `~` for a
	 * SQL LIKE match. Multiple field params are ANDed.
	 */
	[fieldSlug: string]:
		| string
		| number
		| boolean
		| number[]
		| string[]
		| undefined;
}
