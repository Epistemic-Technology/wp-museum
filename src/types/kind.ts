/**
 * Types mirroring `ObjectKind` (src/classes/class-objectkind.php),
 * `OaiPmhMappings` (src/classes/class-oai-pmh-mappings.php), and the
 * `Kinds_Controller` REST routes (src/rest/class-kinds-controller.php).
 * Namespace `wp-museum/v1`.
 */

/**
 * A single Dublin Core mapping entry in `oai_pmh_mappings`.
 * Source: `OaiPmhMappings::get_all_mappings()`.
 *
 * `field` is a field slug (`wp_post_title`, `wp_post_author`,
 * `wp_post_excerpt`, `wp_post_date`, `wp_post_permalink`, `wp_post_id`, or a
 * kind-field slug) or `""`. `staticValue` is a literal fallback or `""`.
 */
export interface OaiPmhFieldMapping {
	field: string;
	staticValue: string;
}

/**
 * The full OAI-PMH mapping set attached to a kind. Always exactly these 16
 * keys; passed through the REST schema UNSANITIZED (bare `type: object`).
 * Source: `OaiPmhMappings::get_all_mappings()`.
 */
export interface OaiPmhMappings {
	title: OaiPmhFieldMapping;
	creator: OaiPmhFieldMapping;
	subject: OaiPmhFieldMapping;
	description: OaiPmhFieldMapping;
	publisher: OaiPmhFieldMapping;
	contributor: OaiPmhFieldMapping;
	date: OaiPmhFieldMapping;
	type: OaiPmhFieldMapping;
	format: OaiPmhFieldMapping;
	identifier: OaiPmhFieldMapping;
	source: OaiPmhFieldMapping;
	language: OaiPmhFieldMapping;
	relation: OaiPmhFieldMapping;
	coverage: OaiPmhFieldMapping;
	rights: OaiPmhFieldMapping;
	identifier_prefix: string;
}

/**
 * One entry of `available_fields_for_oai_pmh`.
 * Source: `ObjectKind::to_rest_array()`. `id` is `"wp_post_*"` or
 * `"field_<n>"` (a string, not a number).
 */
export interface OaiPmhAvailableField {
	id: string;
	slug: string;
	name: string;
	type: 'wordpress_post_field' | 'kind_field';
}

/**
 * One entry of a post type's block template: `[ blockName, attributes?,
 * innerBlocks? ]`. Mirrors the `template` post type argument registered in
 * `ObjectPostType` and the `TemplateItem` type `@wordpress/blocks` uses (which
 * it does not export).
 */
export type BlockTemplateItem = [
	string,
	Record< string, unknown >?,
	BlockTemplateItem[]?
];

/**
 * A child kind inside `ObjectKind.children`.
 * GOTCHA: children use the raw DB-row serialization
 * (`ObjectKind::to_array()`, plus `block_template`) and skip schema
 * sanitization entirely — so `oai_pmh_mappings` is a JSON-encoded STRING and
 * `cat_id_auto_generate` is 0|1, and the private boolean flags ARE exposed
 * even to public users. Child items never include
 * `available_fields_for_oai_pmh` or `children`.
 */
export interface ObjectKindChild {
	kind_id: number | null;
	cat_field_id: number | null;
	name: string | null;
	type_name: string | null;
	label: string | null;
	label_plural: string | null;
	description: string | null;
	categorized: boolean | null;
	hierarchical: boolean | null;
	must_featured_image: boolean | null;
	must_gallery: boolean | null;
	strict_checking: boolean | null;
	exclude_from_search: boolean | null;
	parent_kind_id: number | null;
	/** JSON-encoded string of the OaiPmhMappings shape — NOT an object here. */
	oai_pmh_mappings: string;
	/** 0 | 1 — NOT a boolean here. */
	cat_id_auto_generate: 0 | 1;
	cat_id_prefix: string;
	cat_id_pad_length: number;
	/**
	 * The post type's registered block template. Added by
	 * `ObjectKind::get_children_array()` rather than `to_array()`, and — unlike
	 * on the parent `ObjectKind` — it survives to the wire because child items
	 * are not schema-filtered. `null` if the post type is not registered.
	 */
	block_template: BlockTemplateItem[] | null;
}

/**
 * A museum-object kind as returned by GET `/wp-museum/v1/mobject_kinds/` and
 * GET `/wp-museum/v1/mobject_kinds/{type_name}`.
 * Source: `ObjectKind::to_rest_array()` / `to_public_rest_array()` sanitized
 * through `Preparable_From_Schema` in `Kinds_Controller`.
 *
 * Property visibility:
 * - Base properties: all users.
 * - `cat_id_auto_generate`, `cat_id_prefix`, `cat_id_pad_length`: present
 *   only for users with `edit_posts` (absent — not null — otherwise).
 * - `must_featured_image`, `must_gallery`, `strict_checking`,
 *   `exclude_from_search`: effectively admin-only (require `edit_posts` for
 *   the data AND `manage_options` for the schema).
 * - `block_template` is built server-side but ALWAYS stripped by the schema
 *   whitelist — never on the wire at this level. It IS on the wire for the
 *   entries of `children` (see ObjectKindChild), which skip schema filtering.
 */
export interface ObjectKind {
	/** In practice always a number for DB-loaded kinds. */
	kind_id: number | null;
	/** FK to MObjectField.field_id used as the catalogue ID; null if none. */
	cat_field_id: number | null;
	/** Machine name derived from label. */
	name: string | null;
	/** WP post type name, e.g. "wpm_instrument"; practically always a string. */
	type_name: string | null;
	label: string | null;
	label_plural: string | null;
	description: string | null;
	/** Never null on the wire ((bool) cast; null ⇒ false). */
	categorized: boolean;
	/** Never null on the wire. */
	hierarchical: boolean;
	/** null for top-level kinds. */
	parent_kind_id: number | null;
	/** Always present, never null; passed through unsanitized. */
	oai_pmh_mappings: OaiPmhMappings;
	/** Always present (min 6 entries: the fixed wp_post_* fields). */
	available_fields_for_oai_pmh: OaiPmhAvailableField[];
	/** Always present; `[]` if no child kinds. */
	children: ObjectKindChild[];
	/** Present only with `edit_posts`. */
	cat_id_auto_generate?: boolean;
	/** Present only with `edit_posts`; defaults `""`, never null. */
	cat_id_prefix?: string;
	/** Present only with `edit_posts`; ≥ 0, defaults 0. */
	cat_id_pad_length?: number;
	/** Admin-only (`manage_options` schema + `edit_posts` data). */
	must_featured_image?: boolean;
	/** Admin-only. */
	must_gallery?: boolean;
	/** Admin-only. */
	strict_checking?: boolean;
	/** Admin-only. */
	exclude_from_search?: boolean;
}

/**
 * One element of the POST|PUT|PATCH `/wp-museum/v1/mobject_kinds/` request
 * body (the body is a raw JSON ARRAY of these).
 * Source: `Kinds_Controller::update_items()` + `ObjectKind::from_json()`.
 *
 * Success response is the JSON literal `true`. A kind with a falsy `label`
 * fails the whole request with `rest_invalid_kind` (400); deleting a kind
 * that still has posts fails with `rest_kind_has_posts` (409).
 */
export interface ObjectKindUpdate {
	/**
	 * Required in practice to update/delete an existing kind. Absent/null
	 * (or a negative client-side placeholder) ⇒ INSERT as a new kind.
	 */
	kind_id?: number | null;
	/** Required for validity — falsy label rejects the request. */
	label?: string | null;
	/** Auto-derived as label + "s" if empty. */
	label_plural?: string | null;
	cat_field_id?: number | null;
	/** Accepted but recomputed server-side from `label` on save. */
	name?: string | null;
	/** Accepted but recomputed server-side from `label` on save. */
	type_name?: string | null;
	description?: string | null;
	categorized?: boolean | 0 | 1 | null;
	hierarchical?: boolean | 0 | 1 | null;
	must_featured_image?: boolean | 0 | 1 | null;
	must_gallery?: boolean | 0 | 1 | null;
	strict_checking?: boolean | 0 | 1 | null;
	exclude_from_search?: boolean | 0 | 1 | null;
	parent_kind_id?: number | null;
	/** Object shape or a JSON string of the same. */
	oai_pmh_mappings?: OaiPmhMappings | string;
	cat_id_auto_generate?: boolean | 0 | 1;
	cat_id_prefix?: string;
	/** Clamped to ≥ 0 server-side. */
	cat_id_pad_length?: number;
	/** Strictly `true` ⇒ delete the kind (and its fields) instead of saving. */
	delete?: boolean;
}

/** Request body of POST|PUT|PATCH `/wp-museum/v1/mobject_kinds/`. */
export type ObjectKindsUpdateRequest = ObjectKindUpdate[];
