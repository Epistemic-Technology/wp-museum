/**
 * Types mirroring the `Site_Data_Controller` REST route
 * (src/rest/class-site-data-controller.php), namespace `wp-museum/v1`.
 * Route: GET `/site_data` (public). Also the success payload of
 * POST `/register_remote` (Remote_Client_Controller).
 */

/**
 * Response of GET `/wp-museum/v1/site_data`. All five properties are always
 * present and never null.
 */
export interface SiteData {
	/** Site title (get_bloginfo('name')), entity-decoded; may be `""`. */
	title: string;
	/** Site tagline; may be `""`. */
	description: string;
	/** Site base URL. */
	url: string;
	/**
	 * Titles of ALL `wpm_collection` posts regardless of status (includes
	 * drafts/private); `[]` when none. Always a plain JSON array of strings.
	 */
	collections: string[];
	/** Count of published museum-object posts across all kinds; an integer. */
	object_count: number;
}
