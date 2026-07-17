/**
 * Types mirroring the `Object_Image_Controller` REST routes
 * (src/rest/class-object-image-controller.php), namespace `wp-museum/v1`.
 * Routes: GET|POST|PUT|PATCH `/all/{id}/images/` and
 * `/{type_name}/{id}/images` (both variants behave identically).
 */

import type { ImageSizeTuple } from './common';

/**
 * One attached image record in the images response.
 * Source: `Object_Image_Controller::get_items()` sanitized through
 * `Preparable_From_Schema`.
 *
 * Besides the five scalar metadata keys, the record carries one key per
 * registered intermediate image size (typically `thumbnail`, `medium`,
 * `medium_large`, `large`, `1536x1536`, `2048x2048`, plus theme/plugin sizes
 * — the set is dynamic, from `get_intermediate_image_sizes()`) plus `full`.
 * Each size key is always present; its value is `null` when
 * `wp_get_attachment_image_src` fails for that size.
 */
export interface ObjectImage {
	/** Attachment post_title; may be `""`. */
	title: string;
	/** Attachment post_excerpt; may be `""`. */
	caption: string;
	/** Attachment post_content; may be `""`. */
	description: string;
	/** `_wp_attachment_image_alt` meta; `""` when absent. */
	alt: string;
	/** 0-based position in the gallery; a true JSON number. */
	sort_order: number;
	/** Full-size image tuple; null if the src lookup fails. */
	full: ImageSizeTuple | null;
	/** Dynamic size-slug keys → [url, width, height, isIntermediate] tuples. */
	[sizeSlug: string]: ImageSizeTuple | string | number | null;
}

/**
 * Response of GET `/all/{id}/images/`: map keyed by image attachment ID
 * (numeric-string keys) → image record. GOTCHA: an object with zero attached
 * images returns an empty JSON ARRAY `[]`, not `{}`.
 */
export type ObjectImagesResponse = Record<string, ObjectImage> | [];

/**
 * Request body of POST|PUT|PATCH `/all/{id}/images/`.
 * Source: `Object_Image_Controller::update_item()`.
 *
 * REPLACES the entire gallery (`wpm_gallery_attach_ids` post meta); array
 * order defines `sort_order`; an empty array clears the gallery. Success
 * response is the JSON literal `true`. Missing/non-array `images` →
 * `rest_cannot_update` (500).
 */
export interface ObjectImagesUpdateRequest {
	/** Ordered attachment IDs (numeric strings tolerated — intval'd). */
	images: Array<number | string>;
}
