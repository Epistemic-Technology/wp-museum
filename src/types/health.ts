/**
 * Types mirroring the `Dashboard_Health_Controller` REST route
 * (src/rest/class-dashboard-health-controller.php), namespace `wp-museum/v1`.
 * Route: GET `/dashboard_health` (requires `manage_options`).
 * Query param: `refresh` (boolean; bypasses the 10-minute transient cache).
 */

/** Severity of a health check item — exactly these two values. */
export type HealthSeverity = 'error' | 'warning';

/**
 * One element of `DashboardHealthResponse.checks`. All five properties are
 * always present (never absent).
 *
 * `id` patterns: `missing-table-{table_name}`, `db-version-mismatch`,
 * `kind-no-fields-{kind_id}`, `kind-no-cat-field-{kind_id}`,
 * `kind-oai-pmh-{kind_id}`, `remote-unregistered-allowed`,
 * `objects-missing-required-{kind_id}`, `objects-missing-image-{kind_id}`,
 * `objects-missing-gallery-{kind_id}`, `objects-empty-cat-id-{kind_id}`,
 * `objects-duplicate-cat-id-{kind_id}`.
 */
export interface HealthCheckItem {
	/** Stable identifier (always a string). */
	id: string;
	severity: HealthSeverity;
	/** True JSON integer (never a numeric string), or null for count-less checks. */
	count: number | null;
	/** Human-readable, translated. */
	message: string;
	/** Admin-relative URL (e.g. "admin.php?page=..."), or null. */
	link: string | null;
}

/**
 * Response of GET `/wp-museum/v1/dashboard_health`.
 * Source: literal arrays built in `Dashboard_Health_Controller` (no schema
 * sanitization involved).
 */
export interface DashboardHealthResponse {
	/** Always a JSON array; `[]` when no problems found. */
	checks: HealthCheckItem[];
	/**
	 * MySQL datetime "YYYY-MM-DD HH:MM:SS" (site-local). On a cached
	 * response this is the original computation time.
	 */
	generated: string;
	/** true when served from the transient cache. */
	cached: boolean;
}
