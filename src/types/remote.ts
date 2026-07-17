/**
 * Types mirroring the `Remote_Client_Controller` REST routes
 * (src/rest/class-remote-client-controller.php) and the `RemoteClient` class
 * (src/classes/class-remoteclient.php), namespace `wp-museum/v1`.
 */

/**
 * A remote client record as returned by GET `/wp-museum/v1/remote_clients`
 * (requires `manage_options`; response is a top-level JSON array).
 * Source: `RemoteClient::to_array()` sanitized through
 * `Preparable_From_Schema` — all schema types include 'null', so every falsy
 * value (empty string, false, 0) serializes as `null`.
 */
export interface RemoteClient {
	/** intval'd; in practice ≥ 1 (MySQL autoincrement) or null. */
	client_id: number | null;
	/** UUID string; empty string sanitizes to null. */
	uuid: string | null;
	title: string | null;
	url: string | null;
	/**
	 * GOTCHA: never `false` on the wire — the sanitizer converts false to
	 * null. `true` = blocked, `null` = not blocked (or unset).
	 */
	blocked: true | null;
	/** MySQL datetime "YYYY-MM-DD HH:MM:SS"; empty string sanitizes to null. */
	registration_time: string | null;
}

/**
 * One element of the POST `/wp-museum/v1/remote_clients` request body (the
 * body is a JSON ARRAY of these). Each element is merged with the existing
 * DB record matched by `uuid` (`RemoteClient::from_rest`); falsy/absent
 * values keep the existing DB value.
 *
 * Response is a raw JSON scalar reflecting only the LAST element's DB
 * operation: number (rows affected) | false (DB error) | true (unparseable
 * body no-op) | null (empty array body).
 */
export interface RemoteClientUpdate {
	client_id?: number | string;
	/** Used to look up the existing record; falsy/absent skips the lookup. */
	uuid?: string;
	title?: string;
	url?: string;
	registration_time?: string;
	/** Cast (bool); null/absent keeps the existing value. */
	blocked?: boolean | 0 | 1 | null;
	/** Must be strictly JSON `true` to delete; otherwise the record is saved. */
	delete?: boolean;
}

/** Request body of POST `/wp-museum/v1/remote_clients`. */
export type RemoteClientsUpdateRequest = RemoteClientUpdate[];

/**
 * Request body of POST `/wp-museum/v1/register_remote`.
 * Source: `Remote_Client_Controller::register_remote()`. The `Origin` header
 * is mandatory in practice; authorization runs inside the handler
 * (`origin_authorized()` in src/includes/remote.php).
 *
 * Success response is the `SiteData` payload (see site.ts), NOT the client
 * record. Errors: `origin-blocked` (403), `remote-blocked` (403),
 * `invalid-uuid` (400), `database-error` (500).
 */
export interface RegisterRemoteRequest {
	/** REQUIRED; must match the canonical 8-4-4-4-12 hex UUID pattern. */
	uuid: string;
	client_id?: number | string;
	title?: string;
	/** Accepted but IGNORED — overwritten with the request's Origin header. */
	url?: string;
	/** Defaults to current_time('mysql') server-side. */
	registration_time?: string;
	blocked?: boolean | 0 | 1;
}
