/**
 * Shared wire-format primitives for the wp-museum/v1 REST API.
 *
 * Mirrors serialization behavior in
 * `src/rest/trait-preparable-from-schema.php` (schema-driven sanitization)
 * and the standard WordPress `WP_Error` JSON envelope.
 */

/**
 * Standard WordPress REST error envelope, as serialized from `WP_Error`.
 *
 * Codes used by plugin controllers include: `rest_post_invalid_id` (404),
 * `rest_post_invalid_page_number` (400), `rest_invalid_kind` (400),
 * `rest_kind_has_posts` (409), `rest_cannot_update` (500),
 * `origin-blocked` (403), `remote-blocked` (403), `invalid-uuid` (400),
 * `database-error` (500), `rest_forbidden` (403).
 */
export interface WPRestError {
	code: string;
	message: string;
	/**
	 * Usually `{ status: number }`; some errors carry extra keys
	 * (e.g. `rest_kind_has_posts` adds `kind_id` and `post_count`) and
	 * `rest_cannot_update` may serialize `data` as `null`.
	 */
	data: {
		status?: number;
		[key: string]: unknown;
	} | null;
}

/**
 * WordPress attachment image tuple, from `wp_get_attachment_image_src()`:
 * `[url, width, height, is_resized]`.
 *
 * NOTE: the wire order is url, WIDTH, HEIGHT, boolean. Several JS consumers
 * (`getBestImage` in `src/javascript/util.js`) destructure it as
 * `[URL, height, width, isIntermediate]` — a pre-existing width/height swap.
 */
export type ImageSizeTuple = [
	url: string,
	width: number,
	height: number,
	isResized: boolean,
];

/**
 * PHP-serialization gotcha: an empty PHP associative array serializes as a
 * JSON array `[]`, not `{}`. Map-shaped responses therefore union with this.
 */
export type EmptyPhpArray = [];
