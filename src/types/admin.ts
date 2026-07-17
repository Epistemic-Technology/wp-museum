/**
 * Types mirroring the `Admin_Options_Controller` REST route
 * (src/rest/class-admin-options-controller.php), namespace `wp-museum/v1`.
 * Route: GET|POST|PUT|PATCH `/admin_options`.
 */

/**
 * Response of GET `/wp-museum/v1/admin_options` (requires `edit_posts`).
 * All six keys are always present. Boolean options are real JSON booleans
 * on the wire (never "0"/"1"); a never-set option serializes as `false`.
 */
export interface AdminOptions {
	allow_remote_requests: boolean;
	allow_unregistered_requests: boolean;
	clear_data_on_uninstall: boolean;
	show_post_status: boolean;
	collection_override_taxonomy: boolean;
	/**
	 * Comma-separated domain list. `null` when the option has never been set
	 * (get_option() returns false, which sanitizes to null).
	 */
	rest_authorized_domains: string | null;
}

/**
 * Request body of POST|PUT|PATCH `/wp-museum/v1/admin_options` (requires
 * `manage_options`). Any subset of the options; absent or `null` properties
 * are silently skipped. Success response body is the JSON literal `null`
 * (the endpoint does not echo the updated options).
 *
 * GOTCHA: boolean values are coerced server-side with `(bool) intval()`, so
 * the STRING "true" becomes false. Send real JSON booleans or 0/1.
 */
export interface AdminOptionsUpdateRequest {
	allow_remote_requests?: boolean | 0 | 1 | null;
	allow_unregistered_requests?: boolean | 0 | 1 | null;
	clear_data_on_uninstall?: boolean | 0 | 1 | null;
	show_post_status?: boolean | 0 | 1 | null;
	collection_override_taxonomy?: boolean | 0 | 1 | null;
	rest_authorized_domains?: string | null;
}
